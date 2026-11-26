import { subscribeBarrierField, setBarrierFieldImpact } from '../components/arcaneBarrierField';

test('shared animation suspends when hidden and releases its loop after the last token', () => {
  const ctx = { clearRect: jest.fn(), drawImage: jest.fn() };
  const gl = Object.fromEntries(['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'useProgram',
    'bindBuffer', 'bufferData', 'enableVertexAttribArray', 'vertexAttribPointer', 'viewport', 'uniform3f',
    'uniform1f', 'drawArrays', 'deleteProgram', 'deleteBuffer', 'deleteShader'].map(name => [name, jest.fn()]));
  gl.createProgram = gl.createBuffer = gl.createShader = () => ({});
  gl.getShaderParameter = gl.getProgramParameter = () => true;
  gl.getAttribLocation = () => 0;
  gl.getUniformLocation = (_program, name) => name;
  gl.isContextLost = jest.fn(() => false);
  const context = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(kind => kind === 'webgl' ? gl : ctx);
  const request = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const removeA = subscribeBarrierField(document.createElement('canvas'));
  const removeB = subscribeBarrierField(document.createElement('canvas'));
  expect(request).toHaveBeenCalledTimes(1);
  expect(context.mock.calls.filter(([kind]) => kind === 'webgl')).toHaveLength(1);
  hidden.mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(cancel).toHaveBeenCalledWith(42);
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(request).toHaveBeenCalledTimes(2);
  removeA();
  cancel.mockClear();
  removeB();
  expect(cancel).toHaveBeenCalledWith(42);
  expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
  request.mockClear();
  const staticCanvas = document.createElement('canvas');
  const removeStatic = subscribeBarrierField(staticCanvas, { reduced: true });
  expect(request).not.toHaveBeenCalled();
  setBarrierFieldImpact(staticCanvas, true);
  expect(gl.uniform1f).toHaveBeenCalledWith('impactAge', .18);
  setBarrierFieldImpact(staticCanvas, false);
  expect(gl.uniform1f).toHaveBeenLastCalledWith('impactAge', -1);
  removeStatic();
  hidden.mockRestore(); request.mockRestore(); cancel.mockRestore(); context.mockRestore();
});

test('unavailable WebGL leaves the fallback visible and does not schedule a loop', () => {
  const ctx = { clearRect: jest.fn(), drawImage: jest.fn() };
  const context = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(kind => kind === 'webgl' ? null : ctx);
  const request = jest.spyOn(window, 'requestAnimationFrame');
  const canvas = document.createElement('canvas');
  const remove = subscribeBarrierField(canvas);
  expect(canvas.dataset.barrierShader).toBe('fallback');
  expect(request).not.toHaveBeenCalled();
  remove();
  request.mockRestore(); context.mockRestore();
});
