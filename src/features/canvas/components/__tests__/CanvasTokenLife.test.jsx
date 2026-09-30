import React from 'react';
import { act, render, screen } from '@testing-library/react';
import CanvasTokenLife, { getCanvasTokenLifeGeometry } from '../CanvasTokenLife';
import TokenHUD from '../../../../components/TokenHUD';

const props = { name: 'Bárbaro', stats: { vida: { current: 5, max: 8 } }, width: 60, height: 60, zoom: 1, isSelected: true };

test('Vitalidad adds two gold blocks with valid geometry and delays loss until the damage phase', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<CanvasTokenLife {...props} />);
    const stats = { ...props.stats, vidaTemporal: { current: 2, max: 2 } };
    rerender(<CanvasTokenLife {...props} stats={stats} />);
    expect(container.querySelectorAll('[data-life-block]')).toHaveLength(10);
    const temporary = [...container.querySelectorAll('[data-temporary="true"]')];
    expect(temporary).toHaveLength(2);
    temporary.forEach(block => {
        expect(block.querySelector('.noma-token-life-piece')).toHaveAttribute('stroke', '#dfc885');
        expect(block.querySelector('path').getAttribute('d')).toContain(' A ');
    });
    rerender(<CanvasTokenLife {...props} stats={{ ...stats, vidaTemporal: { current: 1, max: 2 } }}
        damageEffect={{ id: 'temp-hit', previousLife: 5, nextLife: 5, previousTemporaryLife: 2, nextTemporaryLife: 1, revealAt: Date.now() + 1500 }} />);
    expect(container.querySelectorAll('[data-temporary="true"][data-filled="true"]')).toHaveLength(2);
    act(() => jest.advanceTimersByTime(1501));
    expect(container.querySelectorAll('[data-temporary="true"][data-filled="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-temporary="true"][data-change="damage"]')).toHaveLength(1);
    expect(screen.getByLabelText('Vida: 5 de 8')).toBeInTheDocument();
    jest.useRealTimers();
});

test('Vitalidad lights its blocks at the potion reveal, not on the first snapshot', () => {
    jest.useFakeTimers();
    const { container } = render(<CanvasTokenLife {...props} stats={{ ...props.stats, vidaTemporal: { current: 2, max: 2 } }}
        healingEffect={{ id: 'vitality-use', startedAt: Date.now(), effect: 'temporary-life', previousTemporaryLife: 0, nextTemporaryLife: 2 }} />);
    expect(container.querySelectorAll('[data-temporary="true"][data-filled="true"]')).toHaveLength(0);
    act(() => jest.advanceTimersByTime(1301));
    expect(container.querySelectorAll('[data-temporary="true"][data-filled="true"]')).toHaveLength(2);
    jest.useRealTimers();
});

test('represents every Life block separately, including empty blocks', () => {
    const { container } = render(<CanvasTokenLife {...props} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 5 de 8')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-life-block]')).toHaveLength(8);
    expect(container.querySelectorAll('[data-life-block][data-filled="true"]')).toHaveLength(5);
    expect(container.querySelectorAll('button')).toHaveLength(0);
});

test('marks the Life crown for a restrained smoke veil while preserving its readable state', () => {
    const { container, rerender } = render(<CanvasTokenLife {...props} smokeVeil={0.65} />);
    expect(container.firstChild).toHaveAttribute('data-smoke-veil', 'dense');
    expect(screen.getByLabelText('Bárbaro · Vida: 5 de 8')).toBeInTheDocument();
    rerender(<CanvasTokenLife {...props} smokeVeil={0.2} />);
    expect(container.firstChild).toHaveAttribute('data-smoke-veil', 'soft');
    rerender(<CanvasTokenLife {...props} smokeVeil={0} />);
    expect(container.firstChild).toHaveAttribute('data-smoke-veil', 'none');
});

test('keeps the crown attached when zooming out and counter-rotates the readout', () => {
    const { container } = render(<CanvasTokenLife {...props} zoom={.3} rotation={90} />);
    const width = parseFloat(container.querySelector('.noma-token-life-crown').style.width);
    expect(width * .3).toBeLessThan(36);
    expect(container.firstChild.style.transform).toBe('rotate(-90deg)');
    expect(container.querySelector('.noma-token-life-readout').style.transform).toContain('scale(3.333');
});

test('only newly restored or lost blocks animate and initial render is quiet', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<CanvasTokenLife {...props} />);
    expect(container.querySelectorAll('[data-change]')).toHaveLength(0);
    rerender(<CanvasTokenLife {...props} stats={{ vida: { current: 7, max: 8 } }} />);
    expect(container.querySelectorAll('[data-change="heal"]')).toHaveLength(2);
    act(() => jest.advanceTimersByTime(2400));
    expect(container.querySelectorAll('[data-change]')).toHaveLength(0);
    rerender(<CanvasTokenLife {...props} stats={{ vida: { current: 4, max: 8 } }} />);
    expect(container.querySelectorAll('[data-change="damage"]')).toHaveLength(3);
    jest.useRealTimers();
});

test('combat Life stays at its prior value until the damage number begins', () => {
    jest.useFakeTimers();
    const now = Date.now();
    const damageEffect = { id: 'attack-1', previousLife: 5, nextLife: 3, revealAt: now + 1500, deadlineAt: now + 4000 };
    const { container, rerender } = render(<CanvasTokenLife {...props} />);
    rerender(<CanvasTokenLife {...props} stats={{ vida: { current: 3, max: 8 } }} damageEffect={damageEffect} />);
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(5);
    act(() => jest.advanceTimersByTime(1501));
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-change="damage"]')).toHaveLength(2);
    jest.useRealTimers();
});

test('noncircular portraits use discrete blocks and the legacy HUD stays available', () => {
    const { container, rerender } = render(<CanvasTokenLife {...props} isCircular={false} />);
    expect(container.querySelector('.noma-token-life-ribbon')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-life-block]')).toHaveLength(8);
    rerender(<TokenHUD stats={props.stats} width={50} height={50} />);
    expect(container.querySelector('.noma-token-life')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(8);
});

const readArc = path => {
    const parts = path.split(' ');
    return { start: [Number(parts[1]), Number(parts[2])], radius: [Number(parts[4]), Number(parts[5])], end: [Number(parts[9]), Number(parts[10])] };
};

test.each([
    [50, 1], [50, 4], [100, 1], [100, 4], [30, 1], [50, .1], [100, .25], [768, .3], [768, 4.6],
])('the crown follows the exact portrait center and stays outside at %spx, zoom %s', (size, zoom) => {
    const geometry = getCanvasTokenLifeGeometry({ width: size, height: size, zoom, maximum: 8 });
    const center = [geometry.width / 2, geometry.height / 2];
    expect(geometry.paths).toHaveLength(8);
    geometry.paths.forEach(path => {
        const { start, radius, end } = readArc(path);
        expect(radius[0]).toEqual(radius[1]);
        // Both ends must lie on the same concentric circle, not a translated lower crop.
        [start, end].forEach(([x, y]) => {
            expect(Math.hypot(x - center[0], y - center[1])).toBeCloseTo(radius[0], 8);
        });
        expect(radius[0] - geometry.socketWidth / 2 - size * zoom / 2).toBeGreaterThan(0);
        const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0]);
        const endAngle = Math.atan2(end[1] - center[1], end[0] - center[0]);
        const length = (startAngle - endAngle) * radius[0];
        expect(length).toBeGreaterThan(0);
        expect(radius[0] / (size * zoom / 2)).toBeLessThan(1.7);
    });
});

test('the approved crown proportions persist from 30% to a close view of a large token', () => {
    const ratios = [.3, .5, 1, 4.6].map(zoom => {
        const geometry = getCanvasTokenLifeGeometry({ width: 768, height: 768, zoom, maximum: 8 });
        const center = [geometry.width / 2, geometry.height / 2];
        const angle = ([x, y]) => Math.atan2(y - center[1], x - center[0]);
        const arcs = geometry.paths.map(readArc);
        arcs.slice(1).forEach((arc, index) => {
            const gap = (angle(arcs[index].end) - angle(arc.start)) * arc.radius[0];
            expect(gap).toBeGreaterThan(0);
        });
        const sweep = angle(arcs[0].start) - angle(arcs[arcs.length - 1].end);
        expect(sweep).toBeCloseTo(2 * Math.PI / 3, 8);
        return geometry.pieceWidth / (768 * zoom);
    });
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeLessThan(1.01);
});

test('selecting a token changes neither the crown center nor its radius or segment geometry', () => {
    const { container, rerender } = render(<CanvasTokenLife {...props} width={100} height={100} zoom={3} isSelected={false} />);
    const crown = container.querySelector('.noma-token-life-crown');
    const initial = { position: crown.getAttribute('style'), paths: Array.from(container.querySelectorAll('path')).map(path => path.getAttribute('d')) };
    expect(crown.style.top).toBe('50px');
    rerender(<CanvasTokenLife {...props} width={100} height={100} zoom={3} isSelected />);
    expect(crown.getAttribute('style')).toBe(initial.position);
    expect(Array.from(container.querySelectorAll('path')).map(path => path.getAttribute('d'))).toEqual(initial.paths);
    // Regular SVG strokes scale inversely with the viewport, then back with the map.
    expect(container.querySelector('[vector-effect="non-scaling-stroke"]')).not.toBeInTheDocument();
});

test('many Life blocks preserve their count without detaching into an oversized ring at distant zoom', () => {
    const geometry = getCanvasTokenLifeGeometry({ width: 30, height: 30, zoom: .2, maximum: 24 });
    expect(geometry.paths).toHaveLength(24);
    const center = [geometry.width / 2, geometry.height / 2];
    geometry.paths.map(readArc).forEach(({ start, end, radius }) => {
        const length = (Math.atan2(start[1] - center[1], start[0] - center[0]) - Math.atan2(end[1] - center[1], end[0] - center[0])) * radius[0];
        expect(length).toBeGreaterThan(0);
        expect(radius[0]).toBeLessThan(6);
    });
});

test.each([.1, .3, 1])('half and quarter-cell tokens keep readable Life at zoom %s without changing a full cell', zoom => {
    const cellSize = 384;
    const full = getCanvasTokenLifeGeometry({ width: cellSize, height: cellSize, cellSize, zoom, maximum: 8 });
    expect(full).toEqual(getCanvasTokenLifeGeometry({ width: cellSize, height: cellSize, zoom, maximum: 8 }));
    [.5, .25].forEach(size => {
        const width = cellSize * size;
        const small = getCanvasTokenLifeGeometry({ width, height: width, cellSize, zoom, maximum: 8 });
        const prior = getCanvasTokenLifeGeometry({ width, height: width, zoom, maximum: 8 });
        expect(small.pieceWidth).toBeGreaterThan(prior.pieceWidth);
        expect(small.pieceWidth / full.pieceWidth).toBeGreaterThanOrEqual(.69);
        small.paths.map(readArc).forEach(arc => {
            expect(arc.radius[0] - small.socketWidth / 2 - width * zoom / 2).toBeGreaterThan(0);
            expect(arc.radius[0] / (width * zoom / 2)).toBeLessThan(1.5);
        });
    });
    const large = getCanvasTokenLifeGeometry({ width: cellSize * 2, height: cellSize * 2, cellSize, zoom, maximum: 8 });
    expect(large).toEqual(getCanvasTokenLifeGeometry({ width: cellSize * 2, height: cellSize * 2, zoom, maximum: 8 }));
});


test('poison changes only the crown palette and keeps missing Life blocks empty', () => {
    const { container, rerender } = render(<CanvasTokenLife {...props} />);
    const root = container.firstChild;
    const before = container.querySelector('stop').getAttribute('stop-color');
    rerender(<CanvasTokenLife {...props} poisoned />);
    expect(root).toHaveAttribute('data-poisoned', 'true');
    expect(container.querySelector('stop').getAttribute('stop-color')).not.toBe(before);
    expect(container.querySelectorAll('[data-filled="false"]')).toHaveLength(3);
    rerender(<CanvasTokenLife {...props} poisoned={false} />);
    expect(container.querySelector('stop').getAttribute('stop-color')).toBe(before);
    expect(root).toHaveAttribute('data-poisoned', 'false');
});
