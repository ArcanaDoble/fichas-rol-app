import { createArcaneMistRenderer, getArcaneMistGeometry } from '../arcaneMistRenderer';

const effect = { sourcePosition: { x: -50, y: -100, width: 100, height: 50 },
  placement: { x: 200, y: 50, width: 120, height: 180, columns: 3, rows: 3 } };

test('gathering, flight and the entire rectangular cloud fit in the local surface', () => {
  const geometry = getArcaneMistGeometry(effect);
  expect(geometry.source).toEqual({ x: 0, y: -75 });
  expect(geometry.destination).toEqual({ x: 260, y: 140 });
  [geometry.source, geometry.control, { x: 200, y: 50 }, { x: 320, y: 230 }].forEach(point => {
    expect(point.x).toBeGreaterThan(geometry.x);
    expect(point.y).toBeGreaterThan(geometry.y);
    expect(point.x).toBeLessThan(geometry.x + geometry.width);
    expect(point.y).toBeLessThan(geometry.y + geometry.height);
  });
});

test('a hidden caster does not contribute coordinates to the surface or fallback path', () => {
  const near = getArcaneMistGeometry(effect, false);
  const remote = getArcaneMistGeometry({ ...effect, sourcePosition: { x: 90000, y: -50000 } }, false);
  expect(remote).toEqual(near);
  expect(near.source).toEqual(near.destination);
});

test('overlapping origin and cloud keep finite geometry', () => {
  const geometry = getArcaneMistGeometry({ ...effect, sourcePosition: effect.placement });
  expect([geometry.x, geometry.y, geometry.width, geometry.height, geometry.cell].every(Number.isFinite)).toBe(true);
});

test('GPU surfaces stay bounded and release resources even after context loss', () => {
  let lost = false;
  const gl = Object.fromEntries(['createShader', 'createProgram', 'createBuffer', 'shaderSource', 'compileShader',
    'attachShader', 'linkProgram', 'useProgram', 'bindBuffer', 'bufferData', 'enableVertexAttribArray', 'vertexAttribPointer',
    'viewport', 'uniform2f', 'uniform1f', 'drawArrays', 'deleteBuffer', 'deleteShader', 'deleteProgram'].map(name => [name, jest.fn(() => ({}))]));
  Object.assign(gl, { getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: (_program, name) => name, isContextLost: () => lost });
  const canvas = { getContext: () => gl };
  const renderer = createArcaneMistRenderer(canvas, getArcaneMistGeometry(effect), 30);
  expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(896);
  expect(renderer.draw(600)).toBe(true);
  lost = true;
  expect(renderer.draw(1200)).toBe(false);
  renderer.destroy(); renderer.destroy();
  expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
  expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  expect(canvas).toMatchObject({ width: 1, height: 1 });
  expect(renderer.draw(1500)).toBe(false);
});

test('unavailable GPU and shader failure fall back without leaking partial resources', () => {
  expect(createArcaneMistRenderer({ getContext: () => null }, getArcaneMistGeometry(effect))).toBeNull();
  const gl = { createProgram: jest.fn(() => ({})), createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(), compileShader: jest.fn(), getShaderParameter: () => false,
    deleteShader: jest.fn(), deleteProgram: jest.fn() };
  expect(createArcaneMistRenderer({ getContext: () => gl }, getArcaneMistGeometry(effect))).toBeNull();
  expect(gl.deleteShader).toHaveBeenCalledTimes(1);
  expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
});
