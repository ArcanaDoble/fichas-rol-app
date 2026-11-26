import { arcaneBarrierFragmentShader, arcaneBarrierVertexShader } from './arcaneBarrierShader';

export const getArcaneBarrierGeometry = (effect, sourceVisible = true) => {
  const area = effect.placement, token = effect.sourcePosition || area;
  const destination = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const source = sourceVisible ? { x: token.x + (token.width || 50) / 2, y: token.y + (token.height || 50) / 2 } : destination;
  const cell = Math.min(area.width, area.height);
  const control = { x: (source.x + destination.x) / 2, y: Math.min(source.y, destination.y) - cell * .5 };
  const padding = cell * 1.25;
  const x = Math.min(source.x, area.x, control.x) - padding, y = Math.min(source.y, area.y, control.y) - padding;
  return { x, y, width: Math.max(source.x, area.x + area.width, control.x) - x + padding,
    height: Math.max(source.y, area.y + area.height, control.y) - y + padding, source, control, destination,
    area, cell, sourceVisible, path: `M ${source.x} ${source.y} Q ${control.x} ${control.y} ${destination.x} ${destination.y}` };
};

// Texture-free, local surface. No buffers, uniforms or paths allocated per frame.
export const createArcaneBarrierRenderer = (canvas, geometry, zoom = 1) => {
  const gl = canvas?.getContext('webgl', { alpha: true, antialias: false, depth: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, disposed = false;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.width = 1; canvas.height = 1;
  };
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Barrier shader unavailable');
    return shader;
  };
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, arcaneBarrierVertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, arcaneBarrierFragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Barrier program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const scale = Math.min(Math.max(.3, Number(zoom) || 1) * Math.min(2, globalThis.devicePixelRatio || 1),
      896 / Math.max(geometry.width, geometry.height));
    canvas.width = Math.max(1, Math.floor(geometry.width * scale));
    canvas.height = Math.max(1, Math.floor(geometry.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const uniform = name => gl.getUniformLocation(program, name);
    const vec = (name, point) => gl.uniform2f(uniform(name), point.x, point.y);
    vec('origin', geometry); vec('size', { x: geometry.width, y: geometry.height });
    vec('source', geometry.source); vec('control', geometry.control); vec('destination', geometry.destination);
    vec('area', { x: geometry.area.width, y: geometry.area.height });
    gl.uniform1f(uniform('cell'), geometry.cell);
    gl.uniform1f(uniform('showSource'), Number(geometry.sourceVisible));
    const clock = uniform('elapsed');
    return { draw(milliseconds) {
      if (disposed || gl.isContextLost()) return false;
      gl.uniform1f(clock, Math.max(0, milliseconds) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    }, destroy };
  } catch (_) { destroy(); return null; }
};
