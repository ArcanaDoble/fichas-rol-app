import React from 'react';
import { render } from '@testing-library/react';
import CanvasSharedPointers from '../CanvasSharedPointers';

test('renders three staggered waves for a Canvas ping', () => {
    const now = 10_000;
    const { container } = render(
        <CanvasSharedPointers
            now={now}
            pointers={[{
                id: 'ada',
                name: 'Ada',
                color: '#22d3ee',
                x: 100,
                y: 120,
                ping: { id: 'ping-1', x: 80, y: 90, createdAt: now },
            }]}
            zoom={1}
        />,
    );

    expect(container.querySelectorAll('[data-canvas-ping-wave]')).toHaveLength(3);
    expect(container.querySelector('[data-canvas-pointer-label]')).toHaveTextContent('Ada');
});

test('keeps the waves from consecutive Canvas pings visible independently', () => {
    const now = 10_000;
    const { container } = render(
        <CanvasSharedPointers
            now={now}
            pointers={[{
                id: 'ada',
                name: 'Ada',
                color: '#22d3ee',
                x: 100,
                y: 120,
                pings: [
                    { id: 'ping-1', x: 80, y: 90, createdAt: now - 100 },
                    { id: 'ping-2', x: 140, y: 150, createdAt: now },
                ],
            }]}
            zoom={1}
        />,
    );

    expect(container.querySelectorAll('[data-canvas-ping-wave]')).toHaveLength(6);
});

test('keeps active ping waves after the shared cursor is hidden', () => {
    const now = 10_000;
    const { container } = render(
        <CanvasSharedPointers
            now={now}
            pointers={[{
                id: 'ada',
                name: 'Ada',
                color: '#22d3ee',
                x: 100,
                y: 120,
                visible: false,
                pings: [{ id: 'ping-1', x: 80, y: 90, createdAt: now - 100 }],
            }]}
            zoom={1}
        />,
    );

    expect(container.querySelectorAll('[data-canvas-ping-wave]')).toHaveLength(3);
    expect(container.querySelector('[data-canvas-shared-pointer]')).not.toBeInTheDocument();
});

test('keeps cursor and ping dimensions constant at different map zooms without replaying late pings', () => {
    const pointers = [{ id: 'ada', name: 'Ada', color: '#60d5ef', x: 100, y: 120, isLocal: true,
        pings: [{ id: 'late', x: 80, y: 90, createdAt: 9_000 }] }];
    const { container, rerender } = render(<CanvasSharedPointers pointers={pointers} now={10_000} zoom={.25} />);
    expect(container.querySelector('.canvas-signal-pointer__scale').style.transform).toBe('scale(4)');
    expect(container.querySelector('[data-canvas-ping]').style.transform).toBe('scale(4)');
    expect(container.querySelector('[data-canvas-ping-wave="1"]').style.animationDelay).toBe('-1000ms');
    expect(container.querySelector('[data-canvas-shared-pointer]').style.transition).toBe('none');
    rerender(<CanvasSharedPointers pointers={pointers} now={10_250} zoom={2} />);
    expect(container.querySelector('[data-canvas-ping-wave="1"]').style.animationDelay).toBe('-1000ms');
    expect(container.querySelector('[data-canvas-ping]').style.transform).toBe('scale(0.5)');
    expect(container.querySelector('.canvas-signal-ping__name')).toHaveTextContent('Ada');
    rerender(<CanvasSharedPointers pointers={pointers} now={11_250} zoom={2} />);
    expect(container.querySelector('[data-canvas-ping]')).not.toBeInTheDocument();
});
