import React from 'react';
import { render, screen } from '@testing-library/react';
import CanvasPotionBuffEffect from '../CanvasPotionBuffEffect';
import { subscribePotionField } from '../potionBuffShader';

jest.mock('../potionBuffShader', () => ({ subscribePotionField: jest.fn(() => jest.fn()) }));
beforeEach(() => subscribePotionField.mockImplementation(() => jest.fn()));

test.each(['haste', 'temporary-life', 'remove-bleeding'])('%s binds its own timed field and cleans up when the event ends', effectType => {
    const effect = { id: 'dose', effect: effectType, startedAt: Date.now() - 200 };
    const props = { effect, targetPos: { x: 10, y: 20, width: 100, height: 100 }, zoom: 2 };
    const { container, rerender, unmount } = render(<CanvasPotionBuffEffect {...props} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-effect', effectType);
    expect(container.querySelector('img')).toBeNull();
    expect(subscribePotionField).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), expect.objectContaining({ effect: effectType, startedAt: effect.startedAt }));
    const delay = container.firstChild.style.getPropertyValue('--potion-elapsed');
    rerender(<CanvasPotionBuffEffect {...props} zoom={1} />);
    expect(container.firstChild.style.getPropertyValue('--potion-elapsed')).toBe(delay);
    const cleanup = subscribePotionField.mock.results.at(-1).value;
    unmount();
    expect(cleanup).toHaveBeenCalled();
});

test('bandaging a cutout clips its field and only connects to a visible source', () => {
    const effect = { id: 'dressing', effect: 'remove-bleeding', startedAt: Date.now(), actorId: 'ally', targetId: 'hero' };
    const props = { effect, targetPos: { x: 60, y: 0, width: 50, height: 70, isCircular: false, img: '/figure.png', rotation: 20 } };
    const { container, rerender } = render(<CanvasPotionBuffEffect {...props} sourcePos={{x:0,y:0,width:50,height:50}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Sangrado detenido');
    expect(container.querySelector('.noma-potion-buff-field').parentElement.style.maskImage).toBe('url("/figure.png")');
    expect(container.querySelector('.noma-bandage-transfer')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    rerender(<CanvasPotionBuffEffect {...props} />);
    expect(container.querySelector('.noma-bandage-transfer')).toBeNull();
});
