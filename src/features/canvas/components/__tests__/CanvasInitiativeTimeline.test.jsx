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
    expect(timeline.parentElement).toHaveClass('left-20', 'right-20', 'top-8');
    expect(timeline.parentElement).toHaveClass('md:left-1/2', 'md:top-10');
    expect(timeline).toHaveClass('max-w-full', 'overflow-x-auto');
    expect(container.querySelector('[aria-label="Bloque de iniciativa 8"]')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Enemigo · iniciativa 5'));
    expect(onSelect).toHaveBeenCalledWith('enemy');
  });
});
