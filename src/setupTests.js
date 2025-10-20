// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally to avoid network calls in tests
global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve('') }));

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    constructor(callback = () => {}) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  };
}

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
  class MockTicker {
    add() {}
    remove() {}
  }

  class MockRenderer {
    constructor() {
      this.events = {};
    }
    resize() {}
  }

  class MockContainer {
    constructor() {
      this.children = [];
      this.eventMode = 'none';
      this.sortableChildren = false;
      this.visible = true;
      this.zIndex = 0;
      this.cursor = 'default';
    }
    addChild(...children) {
      this.children.push(...children);
    }
    removeChildren() {
      this.children = [];
    }
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
    }
    destroy() {}
    on() {}
    off() {}
    emit() {}
    toLocal(point) {
      return point;
    }
  }

  class MockGraphics extends MockContainer {
    clear() {}
    lineStyle() {}
    moveTo() {}
    lineTo() {}
    drawCircle() {}
  }

  class MockSprite extends MockContainer {
    constructor(texture = {}) {
      super();
      this.texture = texture;
      this.anchor = { set: () => {} };
      this.position = {
        set: (x = 0, y = 0) => {
          this.x = x;
          this.y = y;
        },
      };
      this.width = 0;
      this.height = 0;
      this.alpha = 1;
    }
    static from() {
      return new MockSprite();
    }
  }

  class MockRectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
  }

  class MockPoint {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
  }

  const Texture = {
    WHITE: {},
    from: jest.fn(() => ({})),
  };

  const Assets = {
    load: jest.fn(() => Promise.resolve({ texture: Texture.WHITE })),
  };

  const Color = {
    shared: {
      _value: 0xffffff,
      setValue(value) {
        this._value = value ?? 0xffffff;
        return this;
      },
      toNumber() {
        return this._value;
      },
    },
  };

  class MockApplication {
    constructor() {
      this.stage = new MockContainer();
      this.ticker = new MockTicker();
      this.renderer = new MockRenderer();
      this.canvas = { style: {}, parentNode: null };
    }
    async init() {}
    destroy() {}
  }

  return {
    __esModule: true,
    Application: MockApplication,
    Assets,
    Color,
    Container: MockContainer,
    Graphics: MockGraphics,
    Point: MockPoint,
    Rectangle: MockRectangle,
    Sprite: MockSprite,
    Texture,
  };
});

jest.mock('pixi-viewport', () => {
  class MockViewport {
    constructor() {
      this.plugins = {
        pause: jest.fn(),
        resume: jest.fn(),
      };
      this.sortableChildren = false;
      this.eventMode = 'static';
      this.visible = true;
      this._worldWidth = 0;
      this._worldHeight = 0;
    }
    drag() {
      return this;
    }
    pinch() {
      return this;
    }
    wheel() {
      return this;
    }
    decelerate() {
      return this;
    }
    clampZoom() {
      return this;
    }
    addChild() {}
    on() {}
    off() {}
    emit() {}
    moveCenter() {}
    fitWorld() {}
    clamp() {
      return this;
    }
    resize(_width, _height, worldWidth, worldHeight) {
      if (typeof worldWidth === 'number') {
        this._worldWidth = worldWidth;
      }
      if (typeof worldHeight === 'number') {
        this._worldHeight = worldHeight;
      }
      return this;
    }
    destroy() {}
    toLocal(point) {
      return point;
    }
    get center() {
      return { x: this._worldWidth / 2, y: this._worldHeight / 2 };
    }
    set worldWidth(value) {
      this._worldWidth = value;
    }
    get worldWidth() {
      return this._worldWidth;
    }
    set worldHeight(value) {
      this._worldHeight = value;
    }
    get worldHeight() {
      return this._worldHeight;
    }
  }

  return {
    __esModule: true,
    Viewport: MockViewport,
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
