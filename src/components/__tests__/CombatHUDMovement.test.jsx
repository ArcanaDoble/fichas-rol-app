import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CombatHUD from '../CombatHUD';

jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  getCustomImage: () => null,
  useCustomEquipmentImages: () => ({}),
}));

describe('CombatHUD movement flow', () => {
  test('keeps movement out of the action menu and confirms it through Fin Turno', () => {
    const onEndTurn = jest.fn();

    render(
      <CombatHUD
        token={{
          id: 'barbaro-1',
          name: 'Bárbaro',
          status: [],
          inventory: [],
          equippedItems: [],
        }}
        onAction={jest.fn()}
        onEndTurn={onEndTurn}
        mode="canvas"
        isActive
      />,
    );

    expect(screen.queryByRole('button', { name: /mover/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/desplazamiento excepcional/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Finalizar activación y confirmar el movimiento'));
    expect(onEndTurn).toHaveBeenCalledTimes(1);
  });
});
