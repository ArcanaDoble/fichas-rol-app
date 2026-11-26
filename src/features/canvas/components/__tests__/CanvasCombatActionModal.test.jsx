import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import CanvasCombatActionModal from '../CanvasCombatActionModal';
import { combineCanvasWeapons, resolveCanvasAttackSelection } from '../../combat/canvasAttackSelection';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => {
  const actual = jest.requireActual('../../../../hooks/useCustomEquipmentImages');
  const images = new Map();
  return { ...actual, useCustomEquipmentImages: () => images };
});

const hero = {
  id: 'hero',
  name: 'Bárbaro',
  profileType: 'rogueliteClass',
  stats: {
    vida: { current: 8, max: 8 },
    cd: { current: 6, max: 6 },
  },
};

const enemy = {
  id: 'enemy',
  name: 'Duende',
  portrait: '/enemy-portrait.webp',
  profileType: 'rogueliteEnemy',
  controlledBy: ['master'],
  stats: {
    vida: { current: 3, max: 3 },
    cd: { current: 5, max: 5 },
  },
};

const actionDice = [
  { id: 'hero-d8', die: 'd8', sides: 8, value: 6, status: 'available' },
  { id: 'hero-d6', die: 'd6', sides: 6, value: 4, status: 'available' },
  { id: 'hero-d4', die: 'd4', sides: 4, value: 2, status: 'available' },
];

describe('CanvasCombatActionModal', () => {
  it('only asks the attacker for action dice and confirms the already selected weapon', () => {
    const confirmAttack = jest.fn();
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [hero, enemy] }}
        isPlayerView
        combatRuntime={{
          attackDraft: {
            attackerId: hero.id,
            targetId: enemy.id,
            weapon: { id: 'sword', name: 'Espada' },
            actionCost: 1,
            weaponDiceProfile: [{ id: 'weapon-die', die: 'd8', sides: 8 }],
            range: { rangeName: 'cercano', distance: 1 },
          },
          pendingAttack: null,
          combatState: { participants: { [hero.id]: { actionDice } } },
          confirmAttack,
          cancelAttackDraft: jest.fn(),
          controlledTokenIds: [hero.id],
        }}
      />,
    );

    expect(screen.getByTestId('canvas-combat-action-modal')).toBeInTheDocument();
    expect(screen.getByText('Espada')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Espada' })).toHaveAttribute('src', '/armas/espada_de_acero.webp');
    expect(screen.queryByText('Tirar')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /d8/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));

    expect(confirmAttack).toHaveBeenCalledWith({
      actionDieIds: ['hero-d8'],
      threatMode: 'none',
      customThreatSides: 6,
    });
  });

  it('lets an enemy add a custom Threat die while preparing an attack without a reserve', () => {
    const confirmAttack = jest.fn();
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [hero, enemy] }}
        isPlayerView={false}
        combatRuntime={{
          attackDraft: {
            attackerId: enemy.id,
            targetId: hero.id,
            weapon: { id: 'club', name: 'Garrote', dano: '1d8' },
            actionCost: 0,
            weaponDiceProfile: [{ id: 'weapon-die', die: 'd8', sides: 8 }],
            range: { rangeName: 'cercano', distance: 1 },
          },
          pendingAttack: null,
          combatState: {
            participants: {
              [enemy.id]: { side: 'enemies', threatDie: null, threatValue: null },
            },
          },
          confirmAttack,
          cancelAttackDraft: jest.fn(),
          controlledTokenIds: [enemy.id],
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /Reserva/i })).not.toBeInTheDocument();
    const threatDice = within(screen.getByRole('region', { name: 'Dados de Amenaza' }));
    expect(threatDice.getAllByRole('button')).toHaveLength(6);
    expect(threatDice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    fireEvent.click(threatDice.getByRole('button', { name: 'Dado puntual d20, por tirar' }));
    expect(threatDice.getByText('En ataque')).toBeInTheDocument();
    expect(threatDice.queryByText('En defensa')).not.toBeInTheDocument();
    expect(confirmAttack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));

    expect(confirmAttack).toHaveBeenCalledWith({
      actionDieIds: [],
      threatSelection: { useStored: false, customDice: [20] },
    });
  });

  it('shows the rolled attack to the defender before resolving it', () => {
    const resolvePendingAttack = jest.fn();
    const armoredHero = {
      ...hero,
      equippedItems: [{
        id: 'leather-armor',
        name: 'Armadura de cuero',
        type: 'armor',
        canvasSlot: 'body',
      }],
    };
    const reservedActionDice = actionDice.map((die, index) => ({
      ...die,
      status: index === 1 ? 'committed' : die.status,
    }));
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [armoredHero, enemy] }}
        isPlayerView
        combatRuntime={{
          attackDraft: null,
          pendingAttack: {
            id: 'attack-1',
            attackerId: enemy.id,
            targetId: hero.id,
            attackerName: enemy.name,
            targetName: hero.name,
            weaponName: 'Estilete',
            weapon: {},
            actionDice: [],
            weaponDiceProfile: [{ die: 'd4', sides: 4 }],
            weaponResults: [3],
            pressure: { total: 7, actionPressure: 4, threatPressure: 0 },
            range: {},
          },
          combatState: { participants: { [hero.id]: { actionDice: reservedActionDice } } },
          controlledTokenIds: [hero.id],
          resolvePendingAttack,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ataque inminente' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Dados del atacante' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resultado de la defensa' })).toHaveTextContent('Pierdes 1 bloque de Vida');
    expect(screen.getByRole('region', { name: 'Defensa actual, CD 6' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Defensa actual, CD 6' }).querySelector('.combat-defense-art')).toHaveAttribute('src', '/armaduras/armadura_de_cuero.webp');
    expect(screen.getByText('Armadura de cuero')).toBeInTheDocument();
    expect(screen.getByText('1 bloque de Vida por cada 6 de Presión restante')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /d6/i }));
    expect(screen.getByText('En defensa')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resultado de la defensa' })).toHaveTextContent('Sin pérdida de Vida');
    fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));

    expect(resolvePendingAttack).toHaveBeenCalledWith(['hero-d6']);
  });

  it('lets the master resolve an attack aimed at a master-controlled enemy', () => {
    const resolvePendingAttack = jest.fn();
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [hero, enemy] }}
        isPlayerView={false}
        combatRuntime={{
          attackDraft: null,
          pendingAttack: {
            id: 'attack-against-enemy',
            attackerId: hero.id,
            targetId: enemy.id,
            attackerName: hero.name,
            targetName: enemy.name,
            weaponName: 'Hacha',
            weapon: {},
            actionDice: [{ id: 'attack-die', die: 'd8', sides: 8, value: 5 }],
            weaponDiceProfile: [{ die: 'd6', sides: 6 }],
            weaponResults: [4],
            pressure: { total: 9, actionPressure: 5, threatPressure: 0 },
            range: {},
          },
          combatState: { participants: { [enemy.id]: { side: 'enemies', actionDice: [] } } },
          controlledTokenIds: [hero.id, enemy.id],
          resolvePendingAttack,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ataque inminente' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Defensa del enemigo/ }).querySelector('img')).toHaveAttribute('src', enemy.portrait);
    fireEvent.click(screen.getByRole('button', { name: /recibir ataque/i }));
    expect(resolvePendingAttack).toHaveBeenCalledWith([], { equipmentIds: [] });
  });

  it('offers active enemy defense with equipped profile and a custom threat die', () => {
    const rollEnemyDefense = jest.fn();
    const armedEnemy = {
      ...enemy,
      equippedItems: [{ id: 'club', name: 'Garrote', type: 'weapon', dano: '2d8' }],
    };
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [hero, armedEnemy] }}
        isPlayerView={false}
        combatRuntime={{
          attackDraft: null,
          pendingAttack: {
            id: 'attack-defense-choice', attackerId: hero.id, targetId: enemy.id,
            attackerName: hero.name, targetName: enemy.name, weaponName: 'Hacha', weapon: {},
            actionDice: [], weaponDiceProfile: [{ die: 'd6', sides: 6 }], weaponResults: [4],
            pressure: { total: 9 }, range: {}, status: 'awaiting-defense',
          },
          combatState: {
            participants: {
              [enemy.id]: {
                side: 'enemies',
                threatDie: 'd8',
                threatValue: 6,
                actionDice: [],
                enemyActions: [{ id: 'attack', status: 'available' }],
              },
            },
          },
          controlledTokenIds: [hero.id, enemy.id],
          resolvePendingAttack: jest.fn(),
          rollEnemyDefense,
        }}
      />,
    );

    expect(screen.queryByText(/descartar ataque/i)).not.toBeInTheDocument();
    expect(screen.getByText('d8 + d8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dado puntual d12, por tirar' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));

    expect(rollEnemyDefense).toHaveBeenCalledWith({
      equipmentIds: ['club'],
      threatSelection: { useStored: false, customDice: [12] },
    });
  });
});

const renderEnemyThreatPreparation = (threatValue = 6) => {
  const confirmAttack = jest.fn();
  const participant = { side: 'enemies', threatDie: 'd8', threatValue };
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} isPlayerView={false} combatRuntime={{
    attackDraft: {
      attackerId: enemy.id, targetId: hero.id, weapon: { id: 'club', name: 'Garrote', dano: '1d8' },
      actionCost: 0, weaponDiceProfile: [{ id: 'weapon-die', die: 'd8', sides: 8 }],
      range: { rangeName: 'cercano', distance: 1 },
    },
    pendingAttack: null, combatState: { participants: { [enemy.id]: participant } },
    controlledTokenIds: [enemy.id], confirmAttack, cancelAttackDraft: jest.fn(),
  }} />);
  return { confirmAttack, participant, dice: within(screen.getByRole('region', { name: 'Dados de Amenaza' })) };
};

test('enemy attack preparation combines its unchanged reserve with repeated punctual dice', () => {
  const { dice, confirmAttack, participant } = renderEnemyThreatPreparation();
  const reserve = dice.getByRole('button', { name: 'Reserva de Amenaza d8 · 6' });
  expect(dice.queryByRole('button', { name: 'Sin amenaza' })).not.toBeInTheDocument();
  expect(dice.getAllByRole('button')).toHaveLength(7);
  expect(dice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  fireEvent.click(reserve);
  expect(reserve).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getByText('En ataque')).toBeInTheDocument();
  fireEvent.click(dice.getByRole('button', { name: 'Dado puntual d6, por tirar' }));
  expect(reserve).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getAllByRole('button', { pressed: true })).toHaveLength(2);
  fireEvent.click(dice.getByRole('button', { name: 'Añadir dado d6 de Amenaza' }));
  fireEvent.click(dice.getByRole('button', { name: 'Dado puntual d4, por tirar' }));
  expect(dice.getAllByRole('button', { pressed: true })).toHaveLength(3);
  expect(dice.getByText('4 dados')).toBeInTheDocument();
  expect(within(dice.getByRole('group', { name: 'Cantidad de d6 de Amenaza' })).getByRole('status')).toHaveTextContent('2');
  expect(dice.queryByText('En defensa')).not.toBeInTheDocument();
  expect(reserve.querySelector('svg text')).toHaveTextContent('6');
  expect(participant.threatValue).toBe(6);
  expect(confirmAttack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));
  expect(confirmAttack).toHaveBeenCalledTimes(1);
  expect(confirmAttack).toHaveBeenCalledWith({ actionDieIds: [], threatSelection: { useStored: true, customDice: [6, 6, 4] } });
});

test.each([
  'Reserva de Amenaza d8 · 6',
  'Dado puntual d12, por tirar',
])('enemy attack preparation toggles %s back to no Threat', label => {
  const { dice, confirmAttack, participant } = renderEnemyThreatPreparation();
  const chosenDie = dice.getByRole('button', { name: label });
  fireEvent.click(chosenDie);
  expect(chosenDie).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getByText('En ataque')).toBeInTheDocument();
  fireEvent.click(chosenDie);
  expect(dice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  expect(dice.queryByText('En ataque')).not.toBeInTheDocument();
  expect(dice.queryByText('En defensa')).not.toBeInTheDocument();
  expect(participant.threatValue).toBe(6);
  expect(confirmAttack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));
  expect(confirmAttack).toHaveBeenCalledTimes(1);
  expect(confirmAttack).toHaveBeenCalledWith({ actionDieIds: [], threatSelection: { useStored: false, customDice: [] } });
});

test('enemy attack preparation preserves a valid zero-valued Threat reserve', () => {
  const { dice, confirmAttack } = renderEnemyThreatPreparation(0);
  fireEvent.click(dice.getByRole('button', { name: 'Reserva de Amenaza d8 · 0' }));
  expect(dice.getByText('En ataque')).toBeInTheDocument();
  expect(dice.queryByText('En defensa')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));
  expect(confirmAttack).toHaveBeenCalledWith({ actionDieIds: [], threatSelection: { useStored: true, customDice: [] } });
});

const renderEnemyThreatDefense = (threatValue = 6) => {
  const rollEnemyDefense = jest.fn();
  const resolvePendingAttack = jest.fn();
  const armedEnemy = { ...enemy, equippedItems: [{ id: 'club', name: 'Garrote', type: 'weapon', dano: '1d8' }] };
  const participant = { side: 'enemies', threatDie: 'd8', threatValue, enemyActions: [{ id: 'attack', status: 'available' }] };
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, armedEnemy] }} isPlayerView={false} combatRuntime={{
    pendingAttack: { id: 'threat-defense', attackerId: hero.id, targetId: enemy.id, weaponName: 'Hacha', weapon: {}, pressure: { total: 11 }, status: 'awaiting-defense' },
    combatState: { participants: { [enemy.id]: participant } }, controlledTokenIds: [enemy.id], rollEnemyDefense, resolvePendingAttack,
  }} />);
  return { rollEnemyDefense, resolvePendingAttack, participant, dice: within(screen.getByRole('region', { name: 'Dados de Amenaza' })) };
};

test('combines Threat in defense and reduces a type to zero without removing other dice', () => {
  const { dice, rollEnemyDefense, participant } = renderEnemyThreatDefense();
  expect(dice.queryByRole('button', { name: 'Sin amenaza' })).not.toBeInTheDocument();
  expect(dice.getAllByRole('button')).toHaveLength(7);
  expect(dice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  const reserve = dice.getByRole('button', { name: 'Reserva de Amenaza d8 · 6' });
  expect(reserve.querySelector('svg text')).toHaveTextContent('6');
  fireEvent.click(reserve);
  expect(reserve).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getAllByRole('button', { pressed: true })).toHaveLength(1);
  fireEvent.click(dice.getByRole('button', { name: 'Dado puntual d12, por tirar' }));
  fireEvent.click(dice.getByRole('button', { name: 'Añadir dado d12 de Amenaza' }));
  fireEvent.click(dice.getByRole('button', { name: 'Dado puntual d4, por tirar' }));
  expect(reserve).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getByText('4 dados')).toBeInTheDocument();
  fireEvent.click(dice.getByRole('button', { name: 'Quitar dado d12 de Amenaza' }));
  fireEvent.click(dice.getByRole('button', { name: 'Quitar dado d12 de Amenaza' }));
  expect(dice.queryByRole('group', { name: 'Cantidad de d12 de Amenaza' })).not.toBeInTheDocument();
  expect(dice.getByRole('button', { name: 'Dado puntual d12, por tirar' })).toHaveAttribute('aria-pressed', 'false');
  expect(dice.getAllByRole('button', { pressed: true })).toHaveLength(2);
  expect(dice.getByText('Se tira 1d4 al confirmar; añade 6 de la reserva y la consume.')).toBeInTheDocument();
  expect(participant.threatValue).toBe(6);
  expect(rollEnemyDefense).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));
  expect(rollEnemyDefense).toHaveBeenCalledTimes(1);
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['club'], threatSelection: { useStored: true, customDice: [4] } });
});

test('offers no invented reserve when empty and toggles a punctual die back to no Threat', () => {
  const { dice, rollEnemyDefense } = renderEnemyThreatDefense(null);
  expect(dice.queryByRole('group', { name: 'Reserva de Amenaza' })).not.toBeInTheDocument();
  expect(dice.getAllByRole('button')).toHaveLength(6);
  const punctual = dice.getByRole('button', { name: 'Dado puntual d20, por tirar' });
  expect(punctual.querySelector('svg text')).toHaveTextContent('20');
  expect(punctual.querySelector('.combat-die-type')).not.toBeInTheDocument();
  fireEvent.click(punctual);
  expect(punctual).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(punctual);
  expect(dice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  expect(rollEnemyDefense).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['club'], threatSelection: { useStored: false, customDice: [] } });
});

test('keeps an existing zero-valued Threat reserve valid and lets it be deselected', () => {
  const { dice, rollEnemyDefense } = renderEnemyThreatDefense(0);
  const reserve = dice.getByRole('button', { name: 'Reserva de Amenaza d8 · 0' });
  fireEvent.click(reserve);
  expect(reserve).toHaveAttribute('aria-pressed', 'true');
  expect(dice.getByText('Añade 0 a la defensa y consume la reserva.')).toBeInTheDocument();
  fireEvent.click(reserve);
  expect(dice.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['club'], threatSelection: { useStored: false, customDice: [] } });
});

test('cannot spend selected Threat after choosing to receive without defensive equipment', () => {
  const { dice, rollEnemyDefense, resolvePendingAttack, participant } = renderEnemyThreatDefense();
  fireEvent.click(dice.getByRole('button', { name: 'Reserva de Amenaza d8 · 6' }));
  fireEvent.click(screen.getByRole('button', { name: /Garrote/i }));
  for (const die of dice.getAllByRole('button')) expect(die).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /recibir ataque/i }));
  expect(resolvePendingAttack).toHaveBeenCalledWith([], { equipmentIds: [] });
  expect(rollEnemyDefense).not.toHaveBeenCalled();
  expect(participant.threatValue).toBe(6);
});

test('allows toggling the selected defensive weapon before confirming', () => {
  const rollEnemyDefense = jest.fn();
  const resolvePendingAttack = jest.fn();
  const weapons = [
    { id: 'club', name: 'Garrote', type: 'weapon', dano: '2d8' },
    { id: 'blade', name: 'Estilete', type: 'weapon', dano: '1d4' },
  ];
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, { ...enemy, equippedItems: weapons }] }} isPlayerView={false} combatRuntime={{
    pendingAttack: { id: 'toggle-defense', attackerId: hero.id, targetId: enemy.id, attackerName: hero.name, targetName: enemy.name, weaponName: 'Hacha', weapon: {}, pressure: { total: 11 }, status: 'awaiting-defense' },
    combatState: { participants: { [enemy.id]: { side: 'enemies', enemyActions: [{ id: 'attack', status: 'available' }] } } },
    controlledTokenIds: [enemy.id], rollEnemyDefense, resolvePendingAttack,
  }} />);

  const garrote = screen.getByRole('button', { name: /Garrote/i });
  const estilete = screen.getByRole('button', { name: /Estilete/i });
  const result = screen.getByRole('region', { name: 'Resultado de la defensa' });
  expect(result).toHaveTextContent('Defensa pendiente de tirar');
  expect(result).toHaveTextContent('Sin defensa: perderías 2 bloques de Vida');
  expect(result).not.toHaveTextContent('Pierdes 2 bloques de Vida');
  expect(screen.queryByRole('button', { name: /recibir ataque/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /confirmar defensa/i })).toBeInTheDocument();
  fireEvent.click(garrote);
  expect(result).not.toHaveTextContent('Defensa pendiente de tirar');
  expect(result).not.toHaveTextContent('Sin defensa:');
  expect(result).toHaveTextContent('Pierdes 2 bloques de Vida');
  expect(screen.getByRole('button', { name: /recibir ataque/i })).toBeInTheDocument();
  fireEvent.click(estilete);
  expect(result).toHaveTextContent('Defensa pendiente de tirar');
  expect(screen.getByRole('button', { name: /confirmar defensa/i })).toBeInTheDocument();
  expect(rollEnemyDefense).not.toHaveBeenCalled();
  expect(resolvePendingAttack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));
  expect(rollEnemyDefense).toHaveBeenCalledWith(expect.objectContaining({ equipmentIds: ['blade'] }));
  expect(resolvePendingAttack).not.toHaveBeenCalled();
});

test('receives the exact undefended attack after deselecting enemy equipment without rolling or spending defense', () => {
  const rollEnemyDefense = jest.fn();
  const resolvePendingAttack = jest.fn();
  const equippedEnemy = { ...enemy, equippedItems: [{ id: 'club', name: 'Garrote', type: 'weapon', dano: '2d8' }] };
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, equippedEnemy] }} isPlayerView={false} combatRuntime={{
    pendingAttack: { id: 'receive-without-equipment', attackerId: hero.id, targetId: enemy.id, weaponName: 'Hacha', weapon: {}, pressure: { total: 11 }, status: 'awaiting-defense' },
    combatState: { participants: { [enemy.id]: { side: 'enemies', enemyActions: [{ id: 'attack', status: 'available' }] } } },
    controlledTokenIds: [enemy.id], rollEnemyDefense, resolvePendingAttack,
  }} />);

  expect(screen.getByText('Defensa pendiente de tirar')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Garrote/i }));
  expect(screen.queryByText('Defensa pendiente de tirar')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Resultado de la defensa' })).toHaveTextContent('Pierdes 2 bloques de Vida');
  fireEvent.click(screen.getByRole('button', { name: /recibir ataque/i }));
  expect(resolvePendingAttack).toHaveBeenCalledTimes(1);
  expect(resolvePendingAttack).toHaveBeenCalledWith([], { equipmentIds: [] });
  expect(rollEnemyDefense).not.toHaveBeenCalled();
});

test.each([true, false])('player target surplus is prepared before its final confirmation by player view=%s', async isPlayerView => {
  const resolve = jest.fn();
  const blade = { id: 'blade', name: 'Estilete' };
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} isPlayerView={isPlayerView} combatRuntime={{
    pendingAttack: { id: 'surplus', attackerId: enemy.id, targetId: hero.id, weaponName: 'Garrote', weapon: {}, pressure: { total: 2 } },
    combatState: { participants: { hero: { side: 'players', actionDice: [{ id: 'def', sides: 8, value: 6, status: 'committed' }] } } },
    controlledTokenIds: [hero.id], resolvePendingAttack: resolve, getCounterattackWeapons: () => [blade],
  }} />);
  fireEvent.click(screen.getByRole('button', { name: /d8/ }));
  expect(screen.getByRole('region', { name: 'Resultado de la defensa' })).toHaveTextContent('Ataque anulado');
  expect(screen.getByRole('region', { name: 'Resultado de la defensa' })).toHaveTextContent('Excedente 4');
  expect(screen.queryByRole('button', { name: 'Confirmar defensa' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Contraatacar · 4/ }));
  expect(resolve).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar contraataque' })); });
  expect(resolve).toHaveBeenCalledWith(['def'], { excessChoice: 'counterattack', counterWeapon: blade });
});

test('surplus permits preparing reposition but disables a counter without legal weapons', async () => {
  const resolve = jest.fn();
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} isPlayerView combatRuntime={{
    pendingAttack: { id: 'surplus', attackerId: enemy.id, targetId: hero.id, weaponName: 'Garrote', weapon: {}, pressure: { total: 2 } },
    combatState: { participants: { hero: { actionDice: [{ id: 'def', sides: 8, value: 6, status: 'committed' }] } } },
    controlledTokenIds: [hero.id], resolvePendingAttack: resolve, getCounterattackWeapons: () => [],
  }} />);
  fireEvent.click(screen.getByRole('button', { name: /d8/ }));
  expect(screen.getByRole('button', { name: /Contraatacar · 4/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Reposicionarse · 4/ }));
  expect(resolve).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar reposicionamiento' })); });
  expect(resolve).toHaveBeenCalledWith(['def'], { excessChoice: 'reposition' });
});

test('enemy defense shows its CD and damage from remaining pressure', () => {
  render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} isPlayerView={false} combatRuntime={{
    pendingAttack: { id: 'cd-preview', attackerId: hero.id, targetId: enemy.id, weaponName: 'Espada corta', weapon: {},
      pressure: { total: 13 }, status: 'defense-rolled', defenseDice: [{ id: 'guard', sides: 4, value: 2 }],
      totalDefense: 2, remainingPressure: 11, defensiveExcess: 0 },
    combatState: { participants: { enemy: { side: 'enemies' } } }, controlledTokenIds: [enemy.id],
  }} />);
  expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 5' })).toBeInTheDocument();
  const equation = screen.getByRole('region', { name: 'Resultado de la defensa' }).querySelector('.attack-defense-equation');
  expect(equation).toHaveTextContent('Ataque13');
  expect(equation).toHaveTextContent('Defensa2');
  expect(equation).toHaveTextContent('Presión11');
  expect(equation).not.toHaveTextContent('CD');
  expect(screen.getByText('Pierdes 2 bloques de Vida')).toBeInTheDocument();
  expect(screen.getByText('11')).toBeInTheDocument();
});

test.each([true, false])('enemy protection visibility respects player view=%s without changing resolution', isPlayerView => {
  const resolvePendingAttack = jest.fn();
  const privateEnemy = { ...enemy, stats: { ...enemy.stats, cd: { current: 17, max: 17 } } };
  const { container } = render(<CanvasCombatActionModal activeScenario={{ items: [hero, privateEnemy] }} isPlayerView={isPlayerView} combatRuntime={{
    pendingAttack: { id: 'private-protection', attackerId: hero.id, targetId: enemy.id, weaponName: 'Espada corta', weapon: {},
      pressure: { total: 39 }, status: 'defense-rolled', defenseDice: [{ id: 'guard', sides: 4, value: 2 }],
      totalDefense: 2, remainingPressure: 37, defensiveExcess: 0 },
    combatState: { participants: { enemy: { side: 'enemies' } } }, controlledTokenIds: [enemy.id], resolvePendingAttack,
  }} />);

  expect(screen.getByText('Pierdes 2 bloques de Vida')).toBeInTheDocument();
  if (isPlayerView) {
    expect(screen.getByRole('region', { name: 'Defensa del enemigo', exact: true })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/\bCD\b|por cada 17|CD 17/);
  } else {
    expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 17' })).toBeInTheDocument();
    expect(screen.getByText('1 bloque de Vida por cada 17 de Presión restante')).toBeInTheDocument();
    expect(screen.getByText('CD', { exact: true })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: /aplicar ataque/i }));
  expect(resolvePendingAttack).toHaveBeenCalledTimes(1);
  expect(resolvePendingAttack).toHaveBeenCalledWith([]);
});

const renderDualPreparation = () => {
  const weapons = [
    { id: 'sword', runItemId: 'sword-copy', name: 'Espada corta', type: 'weapon', dano: '1d8', alcance: 'Cercano', canvasSlot: 'mainHand', handsRequired: 1 },
    { id: 'dagger', runItemId: 'dagger-copy', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', canvasSlot: 'offHand', handsRequired: 1 },
  ];
  const attacker = { ...hero, controlledBy: ['Ada'], equippedItems: weapons, x: 0, y: 0, width: 25, height: 25 };
  const target = { ...enemy, x: 50, y: 0, width: 25, height: 25 };
  const selection = resolveCanvasAttackSelection({ attacker, target, selection: combineCanvasWeapons(weapons, 'dual'), items: [attacker, target], gridConfig: { cellWidth: 50, cellHeight: 50 } });
  const runtime = {
    attackDraft: {
      attackerId: attacker.id, targetId: target.id, weapon: selection.weapon,
      attackParts: selection.parts, weaponDiceProfile: selection.profile,
      actionCost: selection.actionCost, range: selection.range,
    },
    combatState: { participants: { [hero.id]: { side: 'players', actionDice } } },
    controlledTokenIds: [hero.id], confirmAttack: jest.fn(), cancelAttackDraft: jest.fn(),
    setAttackWeapons: jest.fn(),
  };
  render(<CanvasCombatActionModal activeScenario={{ items: [attacker, target] }} combatRuntime={runtime} isPlayerView />);
  return runtime;
};

test('prepares both already selected dual weapons with exactly two action dice and one confirmation', () => {
  const runtime = renderDualPreparation();
  expect(screen.getAllByText('Espada corta').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Daga').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /Espada corta|Daga/ })).not.toBeInTheDocument();
  expect(runtime.setAttackWeapons).not.toHaveBeenCalled();

  const confirm = screen.getByRole('button', { name: /^Confirmar ataque$/i });
  const firstDie = screen.getByRole('button', { name: 'd8 · 6' });
  const secondDie = screen.getByRole('button', { name: 'd6 · 4' });
  const spareDie = screen.getByRole('button', { name: 'd4 · 2' });
  expect(confirm).toBeDisabled();
  fireEvent.click(firstDie);
  expect(confirm).toBeDisabled();
  fireEvent.click(secondDie);
  expect(confirm).toBeEnabled();
  expect(spareDie).toBeDisabled();

  fireEvent.click(firstDie);
  expect(confirm).toBeDisabled();
  expect(spareDie).toBeEnabled();
  fireEvent.click(spareDie);
  fireEvent.click(confirm);

  expect(runtime.confirmAttack).toHaveBeenCalledTimes(1);
  expect(runtime.confirmAttack).toHaveBeenCalledWith({ actionDieIds: ['hero-d6', 'hero-d4'], threatMode: 'none', customThreatSides: 6 });
  expect(runtime.setAttackWeapons).not.toHaveBeenCalled();
});

test('cancels the dual preparation without confirming or changing its weapons', () => {
  const runtime = renderDualPreparation();
  fireEvent.click(screen.getByRole('button', { name: 'd8 · 6' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar ataque' }));

  expect(runtime.cancelAttackDraft).toHaveBeenCalledTimes(1);
  expect(runtime.confirmAttack).not.toHaveBeenCalled();
  expect(runtime.setAttackWeapons).not.toHaveBeenCalled();
});

test.each([
  ['master', false, []],
  ['player', true, [hero.id]],
  ['spectator', true, []],
])('the %s sees the fireball before any permitted defense panel', (_role, isPlayerView, controlledTokenIds) => {
  const pending = { id: 'cast-target', blastId: 'cast', spellId: 'fireball', status: 'awaiting-defense',
    attackerId: enemy.id, targetId: hero.id, weaponName: 'Bola de fuego',
    weapon: { name: 'Bola de fuego', spellId: 'fireball' }, pressure: { total: 8 },
    weaponDiceProfile: [{ die: 'd8', sides: 8 }], weaponResults: [4], actionDice: [], range: {} };
  const runtime = { pendingAttack: pending, controlledTokenIds, resolvePendingAttack: jest.fn(),
    combatState: { participants: { [hero.id]: { actionDice: [] } } },
    spellPresentation: { effect: { id: 'cast' }, resolvingDeferred: true } };
  const view = render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }}
    combatRuntime={runtime} isPlayerView={isPlayerView} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  view.rerender(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} isPlayerView={isPlayerView}
    combatRuntime={{ ...runtime, spellPresentation: { ...runtime.spellPresentation, resolvingDeferred: false } }} />);
  if (!isPlayerView || controlledTokenIds.includes(hero.id)) {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recibir ataque' }));
    expect(runtime.resolvePendingAttack).toHaveBeenCalledTimes(1);
  } else expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
