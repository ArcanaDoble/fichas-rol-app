import React from 'react';
import { render, screen } from '@testing-library/react';
import TokenHUD from '../../../components/TokenHUD';
import TokenPoisonEffect from '../components/TokenPoisonEffect';
import TokenTarStain from '../components/TokenTarStain';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';

test('alpha masks preserve intrinsic aspect ratio and do not repeat', () => {
    expect(getTokenSilhouetteStyle('/figure.png', false)).toMatchObject({ maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', maskMode: 'alpha' });
    expect(getTokenSilhouetteStyle('/portrait.png', true)).toEqual({});
    expect(getTokenSilhouetteStyle(null, false)).toEqual({});
});

test('poison and tar clip to the same full image box, including when its source changes', () => {
    const Scene = ({source}) => <><TokenPoisonEffect source={source} circular={false} /><TokenTarStain source={source} isCircular={false} coverage={1} /></>;
    const { container, rerender } = render(<Scene source="/a.png" />);
    for (const node of container.children) expect(node.style.maskImage).toBe('url("/a.png")');
    rerender(<Scene source="/b.png" />);
    for (const node of container.children) {
        expect(node.style.maskImage).toBe('url("/b.png")');
        expect(node.style.inset).toBe('0');
    }
});

test('a standard cutout token has segmented Life and Posture with one shared nameplate', () => {
    const { container } = render(<TokenHUD stats={{ vida: {current:3,max:5},postura:{current:2,max:4},vidaTemporal:{current:1,max:2} }} name="Guerrero" isCircular={false} isSelected width={100} height={150} zoom={.5} poisoned />);
    expect(screen.getAllByText('Guerrero')).toHaveLength(1);
    expect(container.querySelectorAll('.noma-token-life-arc')).toHaveLength(0);
    expect(container.querySelectorAll('[data-resource="vida"] [data-life-block]')).toHaveLength(7);
    expect(container.querySelectorAll('[data-resource="vida"] [data-temporary="true"][data-filled="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-resource="vida"]')).toHaveAttribute('data-poisoned','true');
    expect(container.querySelector('[data-resource="postura"]')).toHaveAttribute('data-position','top');
    expect(container.querySelectorAll('[data-resource="postura"] [data-filled="true"]')).toHaveLength(2);
});
