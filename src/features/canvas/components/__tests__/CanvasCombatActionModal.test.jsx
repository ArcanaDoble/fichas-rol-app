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
    expect(screen.queryByText('Tirar')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /d8/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar ataque/i }));

    expect(confirmAttack).toHaveBeenCalledWith({ actionDieIds: ['hero-d8'], useThreat: false });
  });

  it('shows the rolled attack to the defender before resolving it', () => {
    const resolvePendingAttack = jest.fn();
    render(
      <CanvasCombatActionModal
        activeScenario={{ items: [hero, enemy] }}
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
          combatState: { participants: { [hero.id]: { actionDice } } },
          controlledTokenIds: [hero.id],
          resolvePendingAttack,
        }}
      />,
    );

    expect(screen.getByText('¡Ataque inminente!')).toBeInTheDocument();
    expect(screen.getByText('Dados del atacante')).toBeInTheDocument();
    expect(screen.getAllByText('7')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /d6/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar defensa/i }));

    expect(resolvePendingAttack).toHaveBeenCalledWith(['hero-d6']);
  });
});
