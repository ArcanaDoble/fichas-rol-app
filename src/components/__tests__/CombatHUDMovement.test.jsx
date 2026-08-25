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

    fireEvent.click(screen.getByTitle('Finalizar turno y confirmar el movimiento'));
    expect(onEndTurn).toHaveBeenCalledTimes(1);
  });

  test('offers Correr and spends the selected available action die', () => {
    const onSprint = jest.fn(() => true);

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
        onSprint={onSprint}
        actionDice={[
          { id: 'action-d8', die: 'd8', value: 7, status: 'available' },
          { id: 'action-d6', die: 'd6', value: 4, status: 'spent' },
        ]}
        mode="canvas"
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Correr' }));
    expect(screen.getByText('Dado para correr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /d6 de valor 4 agotado/i })).toBeDisabled();
    expect(screen.getByText('Agotado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Correr con d8 de valor 7/i }));
    expect(onSprint).toHaveBeenCalledWith('action-d8');
  });

  test('keeps Correr available after a previous sprint while action dice remain', () => {
    const onSprint = jest.fn(() => true);
    render(
      <CombatHUD
        token={{ id: 'barbaro-1', name: 'Bárbaro', status: [], equippedItems: [] }}
        onAction={jest.fn()}
        onSprint={onSprint}
        sprintBonus={7}
        actionDice={[{ id: 'action-d6', die: 'd6', sides: 6, value: 4, status: 'available' }]}
        mode="canvas"
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Correr +7' }));
    fireEvent.click(screen.getByRole('button', { name: /Correr con d6 de valor 4/i }));
    expect(onSprint).toHaveBeenCalledWith('action-d6');
  });

  test('allows opening Correr to inspect dice when every action die is exhausted', () => {
    render(
      <CombatHUD
        token={{ id: 'barbaro-1', name: 'Bárbaro', status: [], equippedItems: [] }}
        onAction={jest.fn()}
        onSprint={jest.fn()}
        actionDice={[
          { id: 'action-d8', die: 'd8', value: 7, status: 'spent' },
          { id: 'action-d6', die: 'd6', value: 4, status: 'spent' },
        ]}
        mode="canvas"
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Correr' }));

    expect(screen.getByText('Todos los dados están agotados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /d8 de valor 7 agotado/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /d6 de valor 4 agotado/i })).toBeDisabled();
  });

  test('lets a master enemy spend Ataque to recharge its base movement', () => {
    const onEnemySprint = jest.fn();
    render(
      <CombatHUD
        token={{
          id: 'goblin-1',
          name: 'Duende',
          profileType: 'rogueliteEnemy',
          status: [],
          equippedItems: [],
        }}
        onAction={jest.fn()}
        onEnemySprint={onEnemySprint}
        enemyActions={[
          { id: 'movement', status: 'spent' },
          { id: 'attack', status: 'available' },
        ]}
        movementAvailable={1}
        movementBase={3}
        mode="canvas"
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Correr (Ataque)' }));

    expect(onEnemySprint).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dado para correr')).not.toBeInTheDocument();
  });
});
