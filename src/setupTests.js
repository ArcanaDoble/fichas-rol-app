// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally to avoid network calls in tests
global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve('') }));

// Polyfill setImmediate for environments like Jest + jsdom on Node 20
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => global.setTimeout(fn, 0, ...args);
}
