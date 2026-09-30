import { potionFieldNoise } from '../vendor/tokenmagic/potionFields';

// The fields are drawn as light over the portrait; no image download is needed.
const vertex = `attribute vec2 aPosition; varying vec2 vUv;
void main() { vUv = aPosition * .5 + .5; gl_Position = vec4(aPosition, 0., 1.); }`;
const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float time;
uniform float progress;
uniform float mode;
uniform float silhouette;
uniform vec3 color;
varying vec2 vUv;
${potionFieldNoise}
void main() {
    vec2 p = (vUv - .5) * 2.;
    float r = length(p);
    float angle = atan(p.y, p.x);
    float envelope = smoothstep(.02, .20, progress) * (1. - smoothstep(.66, 1., progress));
    float edge = 1. - smoothstep(.87, .99, r);
    float luminance;
    float alpha;
    if (mode < .5) {
        // Air Field: advected 4D turbulence, pulled into circling wind ribbons.
        float a = time * .24 + r * 2.;
        mat2 rotation = mat2(cos(a), -sin(a), sin(a), cos(a));
        vec2 flow = rotation * p;
        float wind = surface4d(flow * .85 + vec2(time * .025, 0.)).r / max(color.r, .01);
        float ribbon = pow(max(0., sin(angle * 3. - time * 1.7 + r * 13. + wind * 3.)), 12.);
        float belt = smoothstep(.36, .65, r) * (1. - smoothstep(.79, .94, r));
        belt = mix(belt, 1., silhouette);
        luminance = ribbon * (.7 + wind) * belt + pow(wind, 2.) * belt * .45;
        alpha = clamp(luminance, 0., .85) * envelope * edge;
    } else if (mode < 1.5) {
        // Magic Field: warm, irregular light grows outwards and settles at the crown.
        vec2 uv = p / (1. + sqrt(max(.01, 1. - min(dot(p,p), .99))));
        float magic = noisy(uv * 13.).r / max(color.r, .01);
        float boundary = mix(.14, .73, smoothstep(.03, .43, progress));
        float front = exp(-pow((r - boundary) * 19., 2.));
        float mantle = smoothstep(.34, .66, r) * (1. - smoothstep(.74, .9, r));
        luminance = front * (.4 + magic) + mantle * pow(magic, 3.) * 1.7;
        luminance += silhouette * pow(magic, 2.) * .65;
        alpha = clamp(luminance, 0., .85) * envelope * edge;
    } else {
        // Dressing: interlaced linen light winds around the figure, then seals.
        float grain = noisy(p * 10.).r / max(color.r, .01);
        float frontY = mix(-.95, .95, smoothstep(.05, .66, progress));
        float wrap = sin(p.y * 21. + p.x * 6. - time * 2.1);
        float weave = .8 + .2 * sin(p.x * 150.) * sin(p.y * 150.);
        float bands = smoothstep(.60, .90, wrap) * exp(-pow((p.y - frontY) * 2.8, 2.));
        float crossing = smoothstep(.91, .99, sin(p.y * 25. - p.x * 9. + time));
        float body = 1. - smoothstep(.63, .93, r);
        float seam = exp(-pow((r - .69) * 28., 2.));
        luminance = bands * weave * body * (.48 + grain * .4)
            + crossing * body * .12 + seam * grain * .42;
        alpha = clamp(luminance, 0., .78) * envelope * edge;
    }
    vec3 light = mix(color, vec3(1., .97, .86), clamp(luminance * .5, 0., .65));
    gl_FragColor = vec4(light * alpha, alpha);
}`;

let renderer;
const subscribers = new Set();
let frame = 0;
let lastFrame = 0;
const SIZE = 320;

const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const reason = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(reason);
    }
    return shader;
};
const createRenderer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) return null;
    const program = gl.createProgram();
    const shaders = [compile(gl, gl.VERTEX_SHADER, vertex), compile(gl, gl.FRAGMENT_SHADER, fragment)];
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, SIZE, SIZE);
    const uniforms = Object.fromEntries(['time', 'progress', 'mode', 'color', 'silhouette'].map(name => [name, gl.getUniformLocation(program, name)]));
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); });
    canvas.addEventListener('webglcontextrestored', () => {
        gl.deleteProgram(program); gl.deleteBuffer(buffer); renderer = null;
        if (subscribers.size && !frame) frame = requestAnimationFrame(tick);
    });
    return { canvas, gl, uniforms };
};
const paint = sub => {
    renderer ||= createRenderer();
    if (!renderer || renderer.gl.isContextLost()) return;
    const { gl, uniforms, canvas } = renderer;
    const elapsed = sub.reduced ? 1350 : Math.max(0, Date.now() - sub.startedAt);
    const vitality = sub.effect === 'temporary-life';
    const bandage = sub.effect === 'remove-bleeding';
    gl.uniform1f(uniforms.time, elapsed * (bandage ? .002 : vitality ? .0024 : .006));
    gl.uniform1f(uniforms.progress, Math.min(1, elapsed / 3200));
    gl.uniform1f(uniforms.mode, bandage ? 2 : vitality ? 1 : 0);
    gl.uniform1f(uniforms.silhouette, sub.silhouette ? 1 : 0);
    gl.uniform3f(uniforms.color, ...(bandage ? [.89, .78, .57] : vitality ? [1., .72, .28] : [.58, .78, .88]));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    sub.context.clearRect(0, 0, SIZE, SIZE);
    sub.context.drawImage(canvas, 0, 0);
    sub.canvas.dataset.potionShader = 'ready';
};
function tick(time) {
    frame = 0;
    if (!subscribers.size) return;
    if (!document.hidden && time - lastFrame >= 1000 / 30) {
        subscribers.forEach(sub => { if (!sub.reduced) paint(sub); });
        lastFrame = time;
    }
    if ([...subscribers].some(sub => !sub.reduced && Date.now() - sub.startedAt < 3200)) frame = requestAnimationFrame(tick);
}
export const subscribePotionField = (canvas, options) => {
    if (!canvas || /jsdom/i.test(navigator.userAgent)) return () => {};
    canvas.width = canvas.height = SIZE;
    const context = canvas.getContext('2d');
    if (!context) return () => {};
    const sub = { ...options, canvas, context };
    try { paint(sub); } catch (error) { console.warn('Potion field could not initialize:', error); return () => {}; }
    subscribers.add(sub);
    if (!frame && !sub.reduced) frame = requestAnimationFrame(tick);
    return () => {
        subscribers.delete(sub);
        if (!subscribers.size) { cancelAnimationFrame(frame); frame = 0; }
    };
};
