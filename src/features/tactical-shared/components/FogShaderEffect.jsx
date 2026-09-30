import React, { useLayoutEffect, useRef } from 'react';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';
import { innerFog as ORIGINAL_FRAGMENT_SHADER } from '../../../vendor/tokenmagic/fog';

// Preserve TokenMagic's shader, using high precision where mobile GPUs offer it.
// mediump alone can lose the detail of its layered noise on mobile hardware.
const FRAGMENT_SHADER = ORIGINAL_FRAGMENT_SHADER.replace(
    'precision mediump float;',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif',
);

export const FOG_SHADER_DEFAULTS = Object.freeze({
    color: [0, 0, 0],
    density: 0.65,
    time: 0,
    dimX: 1,
    dimY: 1,
    speed: 0.75,
});

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vTextureCoord;
varying vec2 vFilterCoord;

void main() {
    vec2 textureCoord = aPosition * 0.5 + 0.5;
    vTextureCoord = textureCoord;
    vFilterCoord = textureCoord;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const compileShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const createProgram = (gl) => {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
        return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    return program;
};

// One bounded procedural texture for the whole workspace, independent of the
// number of smoke zones and tokens. Consumers only copy the current frame.
const subscribers = new Set();
let renderer = null;
let rendererUnavailable = false;
let frameId = null;
let lastFrame = -Infinity;
const TEXTURE_SIZE = 128;
const FRAME_INTERVAL = 1000 / 24;

const showCapturedShader = (sub) => {
    try { sub.context?.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE); } catch (_) { /* CSS frames remain visible. */ }
    delete sub.canvas.dataset.fogRendered;
    sub.canvas.dataset.fogFallback = 'true';
};

const getRenderer = () => {
    if (rendererUnavailable) return null;
    if (renderer) return renderer;
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    let gl;
    try {
        gl = canvas.getContext('webgl', {
            alpha: true, antialias: false, depth: false,
            premultipliedAlpha: true, preserveDrawingBuffer: true,
        });
    } catch (_) {
        rendererUnavailable = true;
        return null;
    }
    if (!gl) {
        rendererUnavailable = true;
        return null;
    }
    let program;
    try { program = createProgram(gl); } catch (_) { program = null; }
    if (!program) {
        rendererUnavailable = true;
        return null;
    }
    let buffer;
    let uniforms;
    let texture;
    try {
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
        ]), gl.STATIC_DRAW);
        gl.useProgram(program);
        const position = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        uniforms = Object.fromEntries(['time', 'color', 'density', 'dimensions', 'uSampler']
            .map(name => [name, gl.getUniformLocation(program, name)]));
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([11, 17, 32, 255]));
        gl.uniform1i(uniforms.uSampler, 0);
        gl.viewport(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    } catch (_) {
        rendererUnavailable = true;
        return null;
    }
    // Keep each preset's last frame so newly mounted tokens never flash a
    // different density or wait for the next animation frame.
    renderer = { canvas, gl, uniforms, snapshots: new Map() };
    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        rendererUnavailable = true;
        subscribers.forEach(showCapturedShader);
    });
    canvas.addEventListener('webglcontextrestored', () => {
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        renderer = null;
        rendererUnavailable = false;
        lastFrame = -Infinity;
        startFrames();
    });
    return renderer;
};

const paint = (sub, snapshot) => {
    try {
        sub.context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
        sub.context.drawImage(snapshot, 0, 0);
        sub.canvas.dataset.fogRendered = 'true';
        delete sub.canvas.dataset.fogFallback;
    } catch (_) {
        showCapturedShader(sub);
    }
};

const saveSnapshot = (shared, key) => {
    if (!shared.snapshots.has(key)) {
        if (shared.snapshots.size >= 8) shared.snapshots.clear();
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;
        shared.snapshots.set(key, { canvas, context: canvas.getContext('2d') });
    }
    const snapshot = shared.snapshots.get(key);
    try {
        snapshot.context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
        snapshot.context.drawImage(shared.canvas, 0, 0);
        if (snapshot.context.getImageData(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, 1, 1).data[3] === 0) {
            shared.snapshots.delete(key);
            return null;
        }
    } catch (_) {
        shared.snapshots.delete(key);
        return null;
    }
    return snapshot.canvas;
};

const drawFrame = now => {
    frameId = null;
    if (document.hidden || subscribers.size === 0) return;
    const active = [...subscribers].filter(sub => sub.visible);
    const shared = active.length ? getRenderer() : null;
    if (active.length && (!shared || shared.gl.isContextLost())) {
        active.forEach(showCapturedShader);
        return;
    }
    if (active.length && now - lastFrame >= FRAME_INTERVAL) {
        // Zones and portraits share their presets regardless of instance count.
        const groups = new Map();
        active.forEach(sub => {
            const key = sub.key;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(sub);
        });
        groups.forEach((group, key) => {
            if (rendererUnavailable) {
                group.forEach(showCapturedShader);
                return;
            }
            const { gl, uniforms } = shared;
            const { color, density, time, dimX, dimY, speed } = group[0].options;
            const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            let snapshot;
            try {
                gl.uniform3fv(uniforms.color, color);
                gl.uniform1f(uniforms.density, density);
                gl.uniform2f(uniforms.dimensions, dimX, dimY);
                gl.uniform1f(uniforms.time, time + (reduceMotion ? 0 : now * speed));
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                snapshot = saveSnapshot(shared, key);
            } catch (_) {
                snapshot = null;
            }
            if (snapshot) group.forEach(sub => paint(sub, snapshot));
            else {
                rendererUnavailable = true;
                group.forEach(showCapturedShader);
            }
        });
        lastFrame = now;
    }
    if (active.length && !rendererUnavailable && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        frameId = requestAnimationFrame(drawFrame);
    }
};

const startFrames = () => {
    if (frameId === null && !document.hidden && subscribers.size) {
        frameId = requestAnimationFrame(drawFrame);
    }
};
const visibilityChanged = () => {
    if (document.hidden && frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
    } else startFrames();
};

export const warmFogRenderer = () => {
    const warm = () => {
        const shared = getRenderer();
        if (!shared || shared.gl.isContextLost()) return;
        const { gl, uniforms } = shared;
        gl.uniform3fv(uniforms.color, FOG_SHADER_DEFAULTS.color);
        gl.uniform2f(uniforms.dimensions, 1, 1);
        gl.uniform1f(uniforms.time, performance.now() * FOG_SHADER_DEFAULTS.speed);
        [FOG_SHADER_DEFAULTS.density, 1].forEach(density => {
            const options = { ...FOG_SHADER_DEFAULTS, density };
            gl.uniform1f(uniforms.density, density);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            saveSnapshot(shared, JSON.stringify(options));
        });
    };
    if (window.requestIdleCallback) {
        const id = window.requestIdleCallback(warm);
        return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 200);
    return () => window.clearTimeout(id);
};

export default function FogShaderEffect({
    source = null,
    maskSource = true,
    color = FOG_SHADER_DEFAULTS.color,
    density = FOG_SHADER_DEFAULTS.density,
    time = FOG_SHADER_DEFAULTS.time,
    dimX = FOG_SHADER_DEFAULTS.dimX,
    dimY = FOG_SHADER_DEFAULTS.dimY,
    speed = FOG_SHADER_DEFAULTS.speed,
}) {
    const canvasRef = useRef(null);
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        let context;
        try { context = canvas.getContext('2d'); } catch (_) { context = null; }
        if (!context) {
            canvas.dataset.fogFallback = 'true';
            return undefined;
        }
        // Portraits already exist underneath: composite the fog without loading,
        // decoding or uploading their image again when a token enters smoke.
        const sub = { canvas, context, visible: true,
            options: { color, density: source ? 1 : density, time, dimX, dimY, speed } };
        sub.key = JSON.stringify(sub.options);
        subscribers.add(sub);
        if (subscribers.size === 1) document.addEventListener('visibilitychange', visibilityChanged);
        if (renderer?.snapshots.has(sub.key)) paint(sub, renderer.snapshots.get(sub.key).canvas);
        else canvas.dataset.fogFallback = 'true';
        const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
            sub.visible = entries[0].isIntersecting;
            startFrames();
        }) : null;
        observer?.observe(canvas);
        lastFrame = -Infinity;
        startFrames();
        return () => {
            observer?.disconnect();
            subscribers.delete(sub);
            if (!subscribers.size) {
                if (frameId !== null) cancelAnimationFrame(frameId);
                frameId = null;
                document.removeEventListener('visibilitychange', visibilityChanged);
            }
        };
    }, [color, density, dimX, dimY, source, speed, time]);
    return <canvas ref={canvasRef} width={TEXTURE_SIZE} height={TEXTURE_SIZE}
        className="canvas-fog-shader" data-fog-preset={source ? 'portrait' : 'zone'} aria-hidden="true"
        style={source ? {
            opacity: density,
            ...(maskSource ? getTokenSilhouetteStyle(source, false) : {}),
        } : undefined} />;
}
