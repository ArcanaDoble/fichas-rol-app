import { barrierFieldFragment, barrierFieldVertex } from './arcaneBarrierFieldShader';
import { BARRIER_HIT_MS } from '../arcaneBarrierTimeline';

export const BARRIER_FIELD_SIZE = 320;
const subscribers = new Map();
let renderer, attempted = false, frame = 0, last = -Infinity;

const createRenderer = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = BARRIER_FIELD_SIZE;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false,
    premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  let program, buffer;
  const shaders = [];
  const destroy = () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.width = canvas.height = 1;
  };
  const lost = event => {
    event.preventDefault();
    subscribers.forEach(sub => { sub.canvas.dataset.barrierShader = 'fallback'; sub.context.clearRect(0, 0, BARRIER_FIELD_SIZE, BARRIER_FIELD_SIZE); });
    cancelAnimationFrame(frame); frame = 0;
  };
  const restored = () => {
    destroy(); renderer = null; attempted = false;
    subscribers.forEach(sub => { sub.painted = false; });
    paint(performance.now()); resume();
  };
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, barrierFieldVertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, barrierFieldFragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, BARRIER_FIELD_SIZE, BARRIER_FIELD_SIZE);
    const uniforms = Object.fromEntries(['time', 'silhouette', 'impactAge', 'color'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform3f(uniforms.color, 1., .73, .32);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return { canvas, gl, destroy, draw(time, circular, impactAge) {
      if (gl.isContextLost()) return false;
      gl.uniform1f(uniforms.time, time / 1000 * 1.6);
      gl.uniform1f(uniforms.silhouette, Number(!circular));
      gl.uniform1f(uniforms.impactAge, impactAge);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    } };
  } catch (_) { destroy(); return null; }
};

const ensureRenderer = () => {
  if (!attempted) { attempted = true; renderer = createRenderer(); }
  return renderer;
};
const copy = sub => {
  sub.context.clearRect(0, 0, BARRIER_FIELD_SIZE, BARRIER_FIELD_SIZE);
  sub.context.drawImage(renderer.canvas, 0, 0);
  sub.canvas.dataset.barrierShader = 'ready';
  sub.painted = true;
};
const paint = now => {
  if (!ensureRenderer() || renderer.gl.isContextLost()) return;
  // Resting tokens share one GPU draw per shape and motion preference. A hit
  // gets its own displaced field for less than a second; no per-token contexts.
  const groups = new Map();
  subscribers.forEach(sub => {
    if (sub.reduced && sub.painted) return;
    const hit = sub.impactAt != null && now - sub.impactAt < BARRIER_HIT_MS;
    if (hit) {
      renderer.draw(sub.reduced ? 2300 : now, sub.circular, sub.reduced ? .18 : (now - sub.impactAt) / 1000);
      copy(sub);
    } else {
      const key = `${sub.circular}-${sub.reduced}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(sub);
    }
  });
  groups.forEach(group => {
    const first = group[0];
    if (renderer.draw(first.reduced ? 2300 : now, first.circular, -1)) group.forEach(copy);
  });
};
const moving = () => [...subscribers.values()].some(sub => !sub.reduced);
const tick = time => {
  frame = 0;
  if (document.hidden || !moving() || !renderer || renderer.gl.isContextLost()) return;
  if (time - last >= 1000 / 24) { paint(time); last = time; }
  frame = requestAnimationFrame(tick);
};
const resume = () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else if (!frame && moving() && renderer && !renderer.gl.isContextLost()) frame = requestAnimationFrame(tick);
};

export const setBarrierFieldImpact = (canvas, active) => {
  const sub = subscribers.get(canvas);
  if (!sub) return;
  sub.impactAt = active ? performance.now() : null;
  sub.painted = false;
  paint(performance.now());
};
export const subscribeBarrierField = (canvas, { circular = true, reduced = false } = {}) => {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  canvas.width = canvas.height = BARRIER_FIELD_SIZE;
  canvas.dataset.barrierShader = 'fallback';
  const sub = { canvas, context, circular, reduced, painted: false, impactAt: null };
  if (!subscribers.size) document.addEventListener('visibilitychange', resume);
  subscribers.set(canvas, sub);
  paint(performance.now()); resume();
  return () => {
    subscribers.delete(canvas);
    if (!moving()) { cancelAnimationFrame(frame); frame = 0; }
    if (!subscribers.size) {
      document.removeEventListener('visibilitychange', resume);
      renderer?.destroy(); renderer = null; attempted = false; last = -Infinity;
    }
  };
};
