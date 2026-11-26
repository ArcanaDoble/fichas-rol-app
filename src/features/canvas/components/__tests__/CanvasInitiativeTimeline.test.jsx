import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasInitiativeTimeline from '../CanvasInitiativeTimeline';

describe('CanvasInitiativeTimeline', () => {
  test('stays between the corner controls on mobile and keeps blocks scrollable', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <CanvasInitiativeTimeline
        tokens={[
          {
            id: 'hero',
            name: 'Heroína',
            initiative: 8,
            initiativeBlockId: 'players-8',
            initiativeBlockIndex: 0,
            initiativeSide: 'players',
            isInitiativeActive: true,
          },
          {
            id: 'enemy',
            name: 'Enemigo',
            initiative: 5,
            initiativeBlockId: 'enemies-5',
            initiativeBlockIndex: 1,
            initiativeSide: 'enemies',
            isInitiativeActive: false,
          },
        ]}
        selectedId="hero"
        onSelect={onSelect}
      />
    );

    const timeline = screen.getByRole('region', { name: 'Orden de iniciativa' });
    expect(timeline.parentElement.parentElement).toHaveClass('left-20', 'right-20', 'top-10');
    expect(timeline.parentElement.parentElement).toHaveClass('md:left-1/2');
    expect(timeline).toHaveClass('max-w-full', 'overflow-x-auto');
    expect(container.querySelector('[aria-label="Bloque de iniciativa 8"]')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Enemigo · iniciativa 5'));
    expect(onSelect).toHaveBeenCalledWith('enemy');
  });

  test('overflow supports controls, wheel and keyboard without sending gestures to the map', () => {
    render(<CanvasInitiativeTimeline tokens={Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, name: `Token ${i}`,
      initiative: 12 - i, initiativeBlockIndex: i, initiativeBlockId: `b${i}` }))} onSelect={jest.fn()} />);
    const rail = screen.getByRole('region', { name: 'Orden de iniciativa' });
    Object.defineProperties(rail, { scrollWidth: { value: 1200 }, clientWidth: { value: 300 } });
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('button', { name: 'Ver iniciativas anteriores' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver iniciativas siguientes' }));
    expect(rail.scrollLeft).toBe(240);
    const mapWheel = jest.fn();
    rail.parentElement.addEventListener('wheel', mapWheel);
    fireEvent.wheel(rail, { deltaY: 120 });
    expect(rail.scrollLeft).toBe(360);
    expect(mapWheel).not.toHaveBeenCalled();
    fireEvent.keyDown(rail, { key: 'End' });
    expect(rail.scrollLeft).toBe(1200);
    expect(screen.getByRole('button', { name: 'Ver iniciativas siguientes' })).toBeDisabled();
    fireEvent.keyDown(rail, { key: 'Home' });
    expect(rail.scrollLeft).toBe(0);
    expect(rail.style.touchAction).toBe('pan-x');
  });
});
