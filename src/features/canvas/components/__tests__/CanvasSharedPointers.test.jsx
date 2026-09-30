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
