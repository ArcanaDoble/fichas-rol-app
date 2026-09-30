import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CombatHUD, { resolveCombatHudObjects } from '../CombatHUD';
import { getCanvasAttackOptions } from '../../features/canvas/combat/canvasAttackSelection';

jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  getCustomImage: () => null,
  useCustomEquipmentImages: () => ({}),
}));

test('the belt keeps its exact potion copy without hiding a second copy from the HUD', () => {
  const first = { instanceId: 'first', id: 'potion', name: 'Poción de curación', itemType: 'object' };
  const second = { ...first, instanceId: 'second' };
  const objects = resolveCombatHudObjects({ inventory: [first, second], equipmentLoadout: { belt_1: second } });
  expect(objects.map(item => item.instanceId)).toEqual(['second', 'first']);
  expect(objects[0].canvasSlot).toBe('belt_1');
});

describe('CombatHUD movement flow', () => {
  test('shows belt and live Canvas objects with the same slot height as combat actions', () => {
    const onAction = jest.fn();
    const baseToken = {
      id: 'barbaro-1',
      name: 'Bárbaro',
      status: [],
      inventory: [],
      equippedItems: [{ id: 'axe', name: 'Hacha', type: 'weapon', canvasSlot: 'mainHand' }],
      equipmentLoadout: {
        activeWeaponSet: 0,
        weaponSets: [{ mainHand: null, offHand: null }],
        belt_0: {
          templateId: 'object:bomb',
          name: 'Bomba explosiva',
          itemType: 'object',
          image: '/objetos/bomba.webp',
        },
      },
    };
    const { rerender } = render(
      <CombatHUD
        token={baseToken}
        onAction={onAction}
        onEndTurn={jest.fn()}
        mode="canvas"
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Objetos' }));
    const beltButton = screen.getByRole('button', { name: 'Usar Bomba explosiva' });
    expect(beltButton).toHaveClass('h-16', 'md:h-24');
    fireEvent.click(beltButton);
    expect(onAction).toHaveBeenCalledWith('use_item', expect.objectContaining({
      name: 'Bomba explosiva',
      canvasSlot: 'belt_0',
    }));

    rerender(
      <CombatHUD
        token={{
          ...baseToken,
          equipmentLoadout: { ...baseToken.equipmentLoadout, belt_0: null },
          inventory: [{ runItemId: 'loot-1', name: 'Elixir lunar', itemType: 'object' }],
          runtimeDirty: true,
        }}
        onAction={onAction}
        onEndTurn={jest.fn()}
        mode="canvas"
        isActive
      />,
    );
    expect(screen.queryByRole('button', { name: 'Usar Bomba explosiva' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar Elixir lunar' })).toBeInTheDocument();

    rerender(
      <CombatHUD
        token={{
          ...baseToken,
          equipmentLoadout: { ...baseToken.equipmentLoadout, belt_0: null },
          inventory: [],
          runtimeDirty: true,
        }}
        onAction={onAction}
        onEndTurn={jest.fn()}
        mode="canvas"
        isActive
      />,
    );
    expect(screen.queryByRole('button', { name: 'Usar Elixir lunar' })).not.toBeInTheDocument();
    expect(screen.getByText('Mochila Vacía')).toBeInTheDocument();
  });

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

  test('uses the generic item flow to select a die without changing action button size', () => {
    const smokeBomb = { runItemId: 'smoke-1', name: 'Bomba de humo', itemType: 'object' };
    const onAction = jest.fn(() => true);
    const onSelectItemUseResource = jest.fn();
    const token = {
      id: 'barbaro-1',
      name: 'Bárbaro',
      status: [],
      inventory: [smokeBomb],
      equippedItems: [],
    };
    const { rerender } = render(
      <CombatHUD token={token} onAction={onAction} mode="canvas" isActive />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Objetos' }));
    const itemButton = screen.getByRole('button', { name: 'Usar Bomba de humo' });
    expect(itemButton).toHaveClass('h-16', 'md:h-24');
    fireEvent.click(itemButton);
    expect(onAction).toHaveBeenCalledWith('use_item', smokeBomb);

    rerender(
      <CombatHUD
        token={token}
        onAction={onAction}
        mode="canvas"
        isActive
        itemUseSession={{
          sourceTokenId: token.id,
          phase: 'select-die',
          item: smokeBomb,
        }}
        itemUseResources={[
          { id: 'action-d8', die: 'd8', sides: 8, value: 6, status: 'available' },
          { id: 'action-d6', die: 'd6', sides: 6, value: 2, status: 'spent' },
        ]}
        onSelectItemUseResource={onSelectItemUseResource}
      />,
    );

    expect(screen.getByText('Elige alcance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'd6 de valor 2 agotado' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'd8 de valor 6' }));
    expect(onSelectItemUseResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'action-d8', value: 6 }));
  });

  test('summarizes attack options with action dice cost, damage and weapon traits', () => {
    render(
      <CombatHUD
        token={{
          id: 'rogue-1',
          name: 'Pícaro',
          status: [],
          equippedItems: [{
            id: 'stiletto',
            name: 'Estilete',
            type: 'weapon',
            consumo: 1,
            dano: '1d4 Físico',
            rasgos: 'Crítico, Destreza, Perforante',
          }],
        }}
        onAction={jest.fn()}
        mode="canvas"
        forceWeaponMenu
        isActive
      />,
    );

    const option = screen.getByTestId('attack-option');
    expect(option).toHaveTextContent('Estilete');
    expect(option).toHaveTextContent('1d4 Físico');
    expect(option).toHaveTextContent('Crítico · Destreza · Perforante');
    expect(screen.getByLabelText('Coste: 1 dado de acción')).toBeInTheDocument();
    expect(screen.getByLabelText('Daño: 1d4 Físico')).toBeInTheDocument();
    expect(screen.getByLabelText('Rasgos: Crítico, Destreza, Perforante')).toBeInTheDocument();
  });
});


test('ignores persisted weapon-set metadata masquerading as an attack', () => {
  render(<CombatHUD token={{ id: 'hero', equippedItems: [
    { type: 'weapon', 0: { mainHand: null, offHand: null }, 1: { mainHand: null, offHand: null } },
    { type: 'weapon' },
    { type: 'weapon', name: 'Hacha', damage: '1d8', consumption: '🟡' },
  ] }} onAction={jest.fn()} mode="canvas" forceWeaponMenu isActive />);
  expect(screen.getAllByTestId('attack-option')).toHaveLength(1);
  expect(screen.getByTestId('attack-option')).toHaveTextContent('Hacha');
  expect(screen.queryByLabelText('Coste: 0 dados de acción')).not.toBeInTheDocument();
});


test('Canvas knockdown leaves attacks and objects enabled and offers the actual stand-up resources', async () => {
  const onAction = jest.fn(() => true);
  const dice = [{ id: 'die', die: 'd8', sides: 8, value: 6, status: 'available' }];
  render(<CombatHUD mode="canvas" isActive token={{ id: 'hero', name: 'Hero', status: ['derribado'] }} onAction={onAction} onEndTurn={jest.fn()} actionDice={dice} />);
  expect(screen.getByRole('button', { name: 'Atacar', exact: true })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Objetos', exact: true })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Correr', exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Levantarse', exact: true }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Gastar todo el Movimiento básico' })).toBeVisible());
  fireEvent.click(screen.getByRole('button', { name: 'Levantarse con d8 de valor 6' }));
  expect(onAction).toHaveBeenCalledWith('stand_up', dice[0]);
});

test('prepares the selected dual attack once while preserving both physical weapon copies', () => {
  const onAction = jest.fn();
  const dagger = { id: 'dagger', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', handsRequired: 1 };
  const weapons = [
    { ...dagger, runItemId: 'dagger-main', canvasSlot: 'mainHand' },
    { ...dagger, runItemId: 'dagger-off', canvasSlot: 'offHand' },
  ];
  const attacker = { id: 'hero', name: 'Pícaro', profileType: 'rogueliteClass', controlledBy: ['Ada'], equippedItems: weapons, x: 0, y: 0, width: 25, height: 25 };
  const target = { id: 'enemy', profileType: 'rogueliteEnemy', controlledBy: ['master'], x: 50, y: 0, width: 25, height: 25 };
  const canvasAttackOptions = getCanvasAttackOptions({ attacker, target, items: [attacker, target], gridConfig: { cellWidth: 50, cellHeight: 50 } });
  render(<CombatHUD token={attacker} canvasAttackOptions={canvasAttackOptions} onAction={onAction} mode="canvas" forceWeaponMenu isActive />);

  expect(screen.getAllByTestId('attack-option')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: /Ataque dual/ }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /^Confirmar Ataque$/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Preparar ataque$/i }));

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onAction).toHaveBeenCalledWith('attack', expect.objectContaining({
    attackMode: 'dual',
    actionCost: 2,
    attackWeapons: [
      expect.objectContaining({ runItemId: 'dagger-main', canvasSlot: 'mainHand' }),
      expect.objectContaining({ runItemId: 'dagger-off', canvasSlot: 'offHand' }),
    ],
  }));
});

test('keeps the Board hand separate from Canvas attack preparation', () => {
  const onAction = jest.fn();
  const { container } = render(<CombatHUD token={{ id: 'hero', name: 'Pícaro', equippedItems: [{ id: 'dagger', name: 'Daga', type: 'weapon', dano: '1d4' }] }} onAction={onAction} mode="board" forceWeaponMenu isActive />);

  expect(container.querySelector('[data-board-hand-drop-zone="true"]')).toBeInTheDocument();
  expect(screen.queryByTestId('attack-option')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Preparar ataque$/i })).not.toBeInTheDocument();
  expect(onAction).not.toHaveBeenCalled();
});
