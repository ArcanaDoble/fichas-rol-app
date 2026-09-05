import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import CanvasCombatActionModal from '../CanvasCombatActionModal';

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
    fireEvent.click(screen.getByRole('button', { name: /añadir dado puntual/i }));
    fireEvent.click(screen.getByRole('button', { name: /amenaza personalizada d20/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));

    expect(confirmAttack).toHaveBeenCalledWith({
      actionDieIds: [],
      threatMode: 'custom',
      customThreatSides: 20,
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

    expect(screen.getByText('¡Ataque inminente!')).toBeInTheDocument();
    expect(screen.getByText('Dados del atacante')).toBeInTheDocument();
    expect(screen.getAllByText('7')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Defensa actual, CD 6' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Defensa actual, CD 6' }).querySelector('.combat-defense-art')).toHaveAttribute('src', '/armaduras/armadura_de_cuero.webp');
    expect(screen.getByText('Armadura de cuero')).toBeInTheDocument();
    expect(screen.getByText('Armadura equipada')).toBeInTheDocument();
    expect(screen.getByText('Cada 6 puntos de Presión restante cuestan 1 bloque de Vida.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /d6/i }));
    expect(screen.getByText('En defensa')).toBeInTheDocument();
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

    expect(screen.getByText('¡Ataque inminente!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /recibir ataque/i }));
    expect(resolvePendingAttack).toHaveBeenCalledWith([]);
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
    fireEvent.click(screen.getByRole('button', { name: /añadir dado puntual/i }));
    fireEvent.click(screen.getByRole('button', { name: /amenaza personalizada d12/i }));
    fireEvent.click(screen.getByRole('button', { name: /^defender$/i }));

    expect(rollEnemyDefense).toHaveBeenCalledWith({
      equipmentId: 'club',
      threatMode: 'custom',
      customThreatSides: 12,
    });
  });
});
