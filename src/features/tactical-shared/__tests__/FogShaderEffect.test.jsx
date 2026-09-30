import React from 'react';
import { act, render } from '@testing-library/react';
import FogShaderEffect from '../components/FogShaderEffect';

test('uses captured frames from the same shader when WebGL is unavailable', () => {
    const callbacks = [];
    const context = {
        clearRect: jest.fn(),
    };
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockImplementation(type => type === '2d' ? context : null);
    const requestFrame = jest.spyOn(window, 'requestAnimationFrame')
        .mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    const cancelFrame = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
        const { container, unmount } = render(<FogShaderEffect />);
        const canvas = container.querySelector('canvas');
        expect(canvas.dataset.fogRendered).toBeUndefined();
        act(() => callbacks.shift()(500));
        expect(context.clearRect).toHaveBeenCalled();
        expect(canvas.dataset.fogFallback).toBe('true');
        expect(canvas.dataset.fogRendered).toBeUndefined();
        expect(canvas.dataset.fogPreset).toBe('zone');
        unmount();
    } finally {
        getContext.mockRestore();
        requestFrame.mockRestore();
        cancelFrame.mockRestore();
    }
});

test('keeps the CSS veil when canvas 2D is unavailable too', () => {
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
        const { container } = render(<FogShaderEffect source="/portrait.webp" />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toHaveClass('canvas-fog-shader');
        expect(canvas.dataset.fogPreset).toBe('portrait');
        expect(canvas.dataset.fogFallback).toBe('true');
        expect(canvas.dataset.fogRendered).toBeUndefined();
    } finally {
        getContext.mockRestore();
    }
});
