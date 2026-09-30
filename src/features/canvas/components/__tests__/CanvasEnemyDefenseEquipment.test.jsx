import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CanvasCombatActionModal from '../CanvasCombatActionModal';
import { DefenseRollSummary } from '../CanvasCombatDetails';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => null, getCustomImage: () => null,
}));

const dagger = { id: 'dagger', runItemId: 'dagger-1', name: 'Daga', type: 'weapon', dano: '1d4', handsRequired: 1 };
const second = { ...dagger, runItemId: 'dagger-2' };
const shield = { id: 'shield', name: 'Escudo', type: 'weapon', dano: '2d8', rasgos: ['Crítico'], handsRequired: 1 };
const greatsword = { id: 'greatsword', name: 'Mandoble', type: 'weapon', dano: '2d8', handsRequired: 2 };
const hero = { id: 'hero', name: 'Héroe', profileType: 'rogueliteClass' };
const enemy = { id: 'enemy', name: 'Duende', profileType: 'rogueliteEnemy', inventory: [dagger, second, shield, greatsword],
  stats: { cd: { current: 4 }, vida: { current: 5 } } };

function setup({ spent = false, pendingFields = {}, playerView = false } = {}) {
  const rollEnemyDefense = jest.fn();
  const resolvePendingAttack = jest.fn();
  const runtime = {
    pendingAttack: { id: 'incoming', attackerId: 'hero', targetId: 'enemy', weapon: {}, weaponName: 'Espada',
      pressure: { total: 8 }, status: 'awaiting-defense', ...pendingFields },
    combatState: { participants: { enemy: { side: 'enemies', enemyActions: [{ id: 'attack', status: spent ? 'spent' : 'available' }] } } },
    controlledTokenIds: ['enemy'], rollEnemyDefense, resolvePendingAttack,
  };
  const view = render(<CanvasCombatActionModal activeScenario={{ items: [hero, enemy] }} combatRuntime={runtime} isPlayerView={playerView} />);
  return { ...view, rollEnemyDefense, resolvePendingAttack };
}
const firstChoice = () => screen.getByRole('button', { name: /Daga Ejemplar 1/ });
const secondChoice = () => screen.getByRole('button', { name: /Daga Ejemplar 2/ });
const shieldChoice = () => screen.getByRole('button', { name: /Escudo Protección/ });

test('selects a shield by default, adds its CD and ignores its configured damage and offensive traits', () => {
  const { rollEnemyDefense } = setup();
  expect(firstChoice()).toHaveAttribute('aria-pressed', 'true');
  expect(shieldChoice()).toHaveAttribute('aria-pressed', 'true');
  expect(within(shieldChoice()).getByText('+1 CD')).toBeInTheDocument();
  expect(shieldChoice()).not.toHaveTextContent('d8');
  expect(shieldChoice()).not.toHaveTextContent('Crítico');
  expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 5' })).toHaveTextContent('CD base 4 · Escudo +1');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar defensa' }));
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['shield', 'dagger-1'], threatSelection: { useStored: false, customDice: [] } });
});

test('selects two distinct daggers for one action and exchanges the shield without three-handed combinations', () => {
  const { rollEnemyDefense } = setup();
  fireEvent.click(secondChoice());
  expect(firstChoice()).toHaveAttribute('aria-pressed', 'true');
  expect(secondChoice()).toHaveAttribute('aria-pressed', 'true');
  expect(shieldChoice()).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 4' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar defensa' }));
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['dagger-1', 'dagger-2'], threatSelection: { useStored: false, customDice: [] } });
  fireEvent.click(shieldChoice());
  expect(firstChoice()).toHaveAttribute('aria-pressed', 'true');
  expect(secondChoice()).toHaveAttribute('aria-pressed', 'false');
  expect(shieldChoice()).toHaveAttribute('aria-pressed', 'true');
});

test('a two-handed weapon replaces both occupied hands and retains its full profile', () => {
  const { rollEnemyDefense } = setup();
  const greatswordChoice = screen.getByRole('button', { name: /Mandoble/ });
  fireEvent.click(greatswordChoice);
  expect(greatswordChoice).toHaveTextContent('d8 + d8');
  expect(firstChoice()).toHaveAttribute('aria-pressed', 'false');
  expect(shieldChoice()).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar defensa' }));
  expect(rollEnemyDefense).toHaveBeenCalledWith({ equipmentIds: ['greatsword'], threatSelection: { useStored: false, customDice: [] } });
});

test('receiving with only a shield retains passive protection without a roll or Threat', () => {
  const { rollEnemyDefense, resolvePendingAttack } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Dado puntual d8, por tirar' }));
  fireEvent.click(firstChoice());
  expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 5' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dado puntual d8, por tirar' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Recibir ataque' }));
  expect(resolvePendingAttack).toHaveBeenCalledWith([], { equipmentIds: ['shield'] });
  expect(rollEnemyDefense).not.toHaveBeenCalled();
});

test('a spent main action does not disable the passive shield or offer active dice', () => {
  const { resolvePendingAttack } = setup({ spent: true });
  expect(firstChoice()).toBeDisabled();
  expect(shieldChoice()).toBeEnabled();
  expect(screen.queryByRole('region', { name: 'Dados de Amenaza' })).not.toBeInTheDocument();
  fireEvent.click(shieldChoice());
  expect(screen.getByRole('region', { name: 'Defensa del enemigo, CD 4' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Recibir ataque' }));
  expect(resolvePendingAttack).toHaveBeenCalledWith([], { equipmentIds: [] });
});

test('rolled equipment and shield stay frozen and enemy CD remains private in player view', () => {
  setup({ playerView: true, pendingFields: { status: 'defense-rolled', defenseItems: [dagger], defenseItem: dagger,
    defenseShield: shield, defenseCdBonus: 1, defenseDice: [{ id: 'guard', sides: 4, value: 2, weaponId: 'dagger-1' }] } });
  expect(screen.getByRole('region', { name: 'Defensa del enemigo', exact: true })).not.toHaveTextContent('CD');
  expect(screen.queryByText('CD base 4 · Escudo +1')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Escudo Protección/ })).not.toBeInTheDocument();
  expect(screen.getByText('Escudo · Protección pasiva')).toBeInTheDocument();
});

test('the two weapon profiles remain attributable in the defensive roll summary', () => {
  render(<DefenseRollSummary pending={{ defenseItems: [dagger, second], defenseDice: [
    { id: 'first', sides: 4, value: 2, weaponId: 'dagger-1' },
    { id: 'second', sides: 4, value: 3, weaponId: 'dagger-2' },
  ] }} />);
  expect(screen.getByText('Daga · 1')).toBeInTheDocument();
  expect(screen.getByText('Daga · 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Defensa: 2 en d4')).toBeInTheDocument();
  expect(screen.getByLabelText('Defensa: 3 en d4')).toBeInTheDocument();
});
