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

jest.mock('@pixi/react', () => {
  const React = require('react');
  const make = (tag) => {
    const Component = React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(tag, { ref, ...props }, children),
    );
    Component.displayName = `Mock${tag}`;
    return Component;
  };

  return {
    __esModule: true,
    Application: make('canvas'),
    extend: jest.fn(),
    useApplication: () => ({
      renderer: {
        background: { color: 0x000000 },
      },
    }),
    useTick: jest.fn(),
  };
});

jest.mock('pixi.js', () => {
  const createMockClass = (name) => {
    const Mock = function MockPixiClass() {
      this.__mockName = name;
    };
    return Mock;
  };

  const Texture = {
    WHITE: {},
    from: () => ({}),
  };

  return {
    __esModule: true,
    Container: createMockClass('Container'),
    Graphics: createMockClass('Graphics'),
    Sprite: createMockClass('Sprite'),
    Text: createMockClass('Text'),
    Texture,
    TextStyle: function () {},
    utils: {
      string2hex: () => 0,
    },
  };
});

jest.mock('@tiptap/react', () => {
  const React = require('react');
  return {
    __esModule: true,
    useEditor: () => null,
    EditorContent: ({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'mock-editor', ...props }, children),
  };
});

jest.mock('@tiptap/starter-kit', () => ({}));
jest.mock('@tiptap/extension-underline', () => ({}));
jest.mock('@tiptap/extension-text-style', () => ({ TextStyle: {} }));
jest.mock('@tiptap/extension-color', () => ({}));
jest.mock('@tiptap/extension-text-align', () => ({}));
jest.mock('@tiptap/core', () => ({
  Extension: {
    create: (config) => config,
  },
}));

afterEach(() => {
  jest.clearAllTimers();
});
