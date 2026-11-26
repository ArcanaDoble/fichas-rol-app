import { fireballFragmentShader, fireballVertexShader } from './fireballShader';

export const getFireballGeometry = (effect, zoom = 1) => {
  const area = effect.placement;
  const source = effect.sourcePosition;
  const scale = Math.max(.1, Number(zoom) || 1);
  const destination = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const sourceWidth = Number(source?.width) || 50;
  const sourceHeight = Number(source?.height) || 50;
  const center = source ? { x: (Number(source.x) || 0) + sourceWidth / 2,
    y: (Number(source.y) || 0) + sourceHeight / 2 } : destination;
  const distance = Math.hypot(destination.x - center.x, destination.y - center.y);
  const lift = Math.min(75 / scale, distance * .2);
  const control = { x: (center.x + destination.x) / 2, y: Math.min(center.y, destination.y) - lift };
  const direction = Math.atan2(control.y - center.y, control.x - center.x);
  const radius = source ? Math.min(sourceWidth, sourceHeight) * .42 : 0;
  const start = { x: center.x + Math.cos(direction) * Math.min(radius, distance * .35),
    y: center.y + Math.sin(direction) * Math.min(radius, distance * .35) };
  const margin = Math.max(area.width, area.height) * 1.1;
  const x = Math.min(start.x, control.x, destination.x) - margin;
  const y = Math.min(start.y, control.y, destination.y) - margin;
  const width = Math.max(start.x, control.x, destination.x) + margin - x;
  const height = Math.max(start.y, control.y, destination.y) + margin - y;
  return { start, control, destination, x, y, width, height,
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${destination.x} ${destination.y}` };
};

// Only the launch's bounding rectangle is rendered, at most 896 px per axis.
// No texture download, full-map redraw, persistent WebGL context or React ticks.
export const createFireballRenderer = (canvas, geometry, effect, zoom) => {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const shaders = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Fireball shader unavailable');
    return shader;
  };
  let program, buffer;
  const destroy = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
  };
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, fireballVertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fireballFragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Fireball program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const density = Math.min(2, window.devicePixelRatio || 1) * Math.max(.1, Number(zoom) || 1);
    const ratio = Math.min(density, 896 / Math.max(geometry.width, geometry.height));
    canvas.width = Math.max(1, Math.ceil(geometry.width * ratio));
    canvas.height = Math.max(1, Math.ceil(geometry.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const vec = (name, x, y) => gl.uniform2f(gl.getUniformLocation(program, name), x, y);
    vec('origin', geometry.x, geometry.y);
    vec('size', geometry.width, geometry.height);
    ['start', 'control', 'destination'].forEach(name => vec(name, geometry[name].x, geometry[name].y));
    vec('area', effect.placement.width, effect.placement.height);
    const seed = [...effect.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 997, 0);
    gl.uniform1f(gl.getUniformLocation(program, 'seed'), seed / 97);
    const elapsed = gl.getUniformLocation(program, 'elapsed');
    return { draw: milliseconds => {
      if (gl.isContextLost()) return false;
      gl.uniform1f(elapsed, milliseconds / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    }, destroy };
  } catch (_) {
    destroy();
    return null;
  }
};
