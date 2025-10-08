// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally to avoid network calls in tests
global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve('') }));

jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ className = '', ...props }) =>
      React.createElement('div', {
        className: `mock-react-easy-crop ${className}`.trim(),
        'data-testid': 'mock-react-easy-crop',
        ...props,
      }),
  };
});

afterEach(() => {
  jest.clearAllTimers();
});
