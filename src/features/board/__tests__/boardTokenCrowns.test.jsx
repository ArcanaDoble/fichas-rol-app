import React from 'react';
import { render } from '@testing-library/react';
import TokenHUD from '../../../components/TokenHUD';

const props = { variant: 'board', name: 'Guardián', width: 50, height: 50, isCircular: true, zoom: .5,
    stats: { vida: { current: 4, max: 6 }, postura: { current: 2, max: 5 } } };

test('board shares the Life crown and shows a separate green crown with one name readout', () => {
    const { container, getByLabelText } = render(<TokenHUD {...props} />);
    expect(getByLabelText('Guardián · Vida: 4 de 6')).toHaveAttribute('data-position', 'bottom');
    expect(getByLabelText('Guardián · Postura: 2 de 5')).toHaveAttribute('data-position', 'top');
    expect(container.querySelectorAll('[data-resource="vida"] [data-filled="true"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-resource="postura"] [data-filled="true"]')).toHaveLength(2);
    expect(container.querySelectorAll('.noma-token-life-readout')).toHaveLength(1);
    expect(container.querySelectorAll('.noma-token-life-name')).toHaveLength(1);
});

test('green resource edits change their own blocks without recoloring or animating Life', () => {
    const { container, rerender } = render(<TokenHUD {...props} />);
    rerender(<TokenHUD {...props} stats={{ ...props.stats, postura: { current: 0, max: 5 } }} />);
    expect(container.querySelectorAll('[data-resource="postura"] [data-change="damage"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-resource="vida"] [data-change]')).toHaveLength(0);
    expect(container.querySelector('[data-resource="postura"]')).toHaveAttribute('data-depleted', 'true');
});

test('Hunger uses the green crown, including tokens with no Life resource', () => {
    const { container, getByLabelText } = render(<TokenHUD {...props} stats={{ hambre: { current: 3, max: 4 } }} />);
    expect(getByLabelText('Guardián · Hambre: 3 de 4')).toHaveAttribute('data-position', 'top');
    expect(container.querySelector('[data-resource="vida"]')).toBeNull();
    expect(container.querySelectorAll('.noma-token-life-readout')).toHaveLength(1);
});

test('rectangular tokens retain separate ribbons and both resources follow smoke and rotation', () => {
    const { container } = render(<TokenHUD {...props} isCircular={false} rotation={90} smokeVeil={.65} />);
    expect(container.querySelectorAll('.noma-token-life-ribbon')).toHaveLength(2);
    container.querySelectorAll('[data-resource]').forEach(crown => {
        expect(crown).toHaveAttribute('data-smoke-veil', 'dense');
        expect(crown.style.transform).toBe('rotate(-90deg)');
    });
    const topRibbon = container.querySelector('[data-resource="postura"] .noma-token-life-crown');
    const bottomRibbon = container.querySelector('[data-resource="vida"] .noma-token-life-crown');
    // At 90 degrees the top/bottom borders become the right/left edges.
    expect(Number.parseFloat(topRibbon.style.left)).toBeCloseTo(53);
    expect(Number.parseFloat(bottomRibbon.style.left)).toBeCloseTo(-3);
    expect(Number.parseFloat(topRibbon.style.top)).toBeCloseTo(25);
    expect(Number.parseFloat(bottomRibbon.style.top)).toBeCloseTo(25);
    expect(topRibbon.style.transform).toBe('translate(-50%, -50%) rotate(90deg)');
    expect(bottomRibbon.style.transform).toBe(topRibbon.style.transform);
});
