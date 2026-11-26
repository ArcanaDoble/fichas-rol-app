import { arcaneProjectileFragmentShader, arcaneProjectileVertexShader } from './arcaneProjectileShader';

export const getArcaneProjectileGeometry = effect => {
  const source = effect.sourcePosition, target = effect.placement;
  const route = target.route?.length > 1 ? target.route : [
    { x: source.x + (source.width || 50) / 2, y: source.y + (source.height || 50) / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  ];
  const radius = Math.max(24, Math.min(target.width, target.height) * .7);
  const padding = radius * 2.4;
  const x = Math.min(...route.map(point => point.x)) - padding, y = Math.min(...route.map(point => point.y)) - padding;
  return { x, y, width: Math.max(...route.map(point => point.x)) - x + padding,
    height: Math.max(...route.map(point => point.y)) - y + padding, route, radius,
    path: route.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') };
};

const clamp = value => Math.max(0, Math.min(1, value));
const TRAIL_POINTS = 20;

// Keep every corner of the validated route. A smooth shortcut could cross a wall.
export const createArcaneProjectilePath = (route, radius) => {
  const distances = [0];
  route.slice(1).forEach((point, index) => distances.push(distances[index] + Math.hypot(point.x - route[index].x, point.y - route[index].y)));
  const length = distances[distances.length - 1];
  const at = distance => {
    for (let index = 1; index < route.length; index += 1) {
      if (distance <= distances[index] || index === route.length - 1) {
        const t = clamp((distance - distances[index - 1]) / (distances[index] - distances[index - 1] || 1));
        return { x: route[index - 1].x + (route[index].x - route[index - 1].x) * t,
          y: route[index - 1].y + (route[index].y - route[index - 1].y) * t };
      }
    }
    return route[0];
  };
  const trail = new Float32Array(TRAIL_POINTS * 4);
  return { sample(progress) {
    const distance = length * clamp(progress);
    const start = Math.max(0, distance - Math.min(radius * 4, length * .8));
    const corners = distances.filter(value => value > start && value < distance);
    const samples = [start, ...corners, distance].slice(-TRAIL_POINTS);
    const slots = TRAIL_POINTS - samples.length;
    for (let index = 1; index <= slots; index += 1) samples.push(start + (distance - start) * index / (slots + 1));
    samples.sort((a, b) => a - b);
    samples.forEach((value, index) => {
      const point = at(value);
      trail.set([point.x, point.y, value / radius, clamp(1 - (distance - value) / (radius * 4))], index * 4);
    });
    const head = at(distance), behind = at(Math.max(0, distance - 1));
    return { head, angle: Math.atan2(head.y - behind.y, head.x - behind.x), trail };
  } };
};

// One local, texture-free surface: bounded resolution, cached path lengths and
// uniforms, no full-map redraw. CanvasSpellEffect owns the 30 fps event clock.
export const createArcaneProjectileRenderer = (canvas, geometry, zoom = 1) => {
  const gl = canvas?.getContext('webgl', { alpha: true, antialias: false, depth: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, disposed = false;
  const destroy = () => {
    disposed = true;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.width = 1; canvas.height = 1;
  };
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Arcane shader unavailable');
    return shader;
  };
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, arcaneProjectileVertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, arcaneProjectileFragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Arcane program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const scale = Math.min(Math.max(.3, Number(zoom) || 1) * Math.min(2, globalThis.devicePixelRatio || 1),
      896 / Math.max(geometry.width, geometry.height));
    canvas.width = Math.max(1, Math.ceil(geometry.width * scale));
    canvas.height = Math.max(1, Math.ceil(geometry.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const uniform = name => gl.getUniformLocation(program, name);
    const vec = (name, point) => gl.uniform2f(uniform(name), point.x, point.y);
    vec('origin', geometry); vec('size', { x: geometry.width, y: geometry.height });
    vec('source', geometry.route[0]); vec('destination', geometry.route[geometry.route.length - 1]);
    gl.uniform1f(uniform('radius'), geometry.radius);
    const clock = uniform('elapsed'), head = uniform('head'), angle = uniform('heading'), trail = uniform('trail[0]');
    const path = createArcaneProjectilePath(geometry.route, geometry.radius);
    return { draw(milliseconds) {
      if (disposed || gl.isContextLost()) return false;
      const sample = path.sample((milliseconds - 420) / 1000);
      gl.uniform1f(clock, milliseconds / 1000);
      gl.uniform2f(head, sample.head.x, sample.head.y);
      gl.uniform1f(angle, sample.angle); gl.uniform4fv(trail, sample.trail);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    }, destroy };
  } catch (_) {
    destroy();
    return null;
  }
};
