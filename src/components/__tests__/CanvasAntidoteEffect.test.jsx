import React from 'react';
import { render, screen } from '@testing-library/react';
import CanvasAntidoteEffect from '../CanvasAntidoteEffect';
import { preloadImage } from '../LoadingImage';

test('another creature receives a connecting trail; an unseen source reveals no position', () => {
    const effect = { actorId: 'ally', targetId: 'hero', startedAt: Date.now() };
    const targetPos = { x: 60, y: 0, width: 40, height: 40 };
    const sourcePos = { x: 0, y: 0, width: 40, height: 40 };
    const { container, rerender } = render(<CanvasAntidoteEffect {...{ effect, targetPos, sourcePos }} />);
    expect(container.querySelector('.noma-antidote-effect__trail')).toHaveAttribute('d', 'M 20 20 Q 50 -5 80 20');
    expect(screen.getByRole('status')).toHaveTextContent('Veneno eliminado');
    rerender(<CanvasAntidoteEffect {...{ effect, targetPos }} />);
    expect(container.querySelector('.noma-antidote-effect__trail')).toBeNull();
    expect(container.querySelector('.noma-antidote-effect__pulse')).toBeInTheDocument();
    rerender(<CanvasAntidoteEffect {...{ effect, sourcePos }} />);
    expect(container).toBeEmptyDOMElement();
});

test('decoded artwork is displayed immediately without the temporary flask', async () => {
    const constructor = jest.spyOn(window, 'Image').mockImplementation(() => ({
        complete: true, naturalWidth: 100, decode: async () => {},
    }));
    try {
        await preloadImage('/warm-antidote.webp');
        const { container } = render(<CanvasAntidoteEffect
            effect={{ actorId: 'hero', targetId: 'hero', startedAt: Date.now(), itemImage: '/warm-antidote.webp' }}
            targetPos={{ x: 0, y: 0, width: 40, height: 40 }} />);
        expect(container.querySelector('.noma-antidote-effect__bottle img')).toBeVisible();
        expect(container.querySelector('.noma-antidote-effect__bottle svg')).toBeNull();
        expect(constructor).toHaveBeenCalledTimes(1);
    } finally {
        constructor.mockRestore();
    }
});
