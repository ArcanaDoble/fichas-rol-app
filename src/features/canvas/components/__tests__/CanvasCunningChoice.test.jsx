import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CanvasCombatActionModal from '../CanvasCombatActionModal';
import { resolveCanvasAttackSelection } from '../../combat/canvasAttackSelection';
import { getCanvasCunningOption } from '../../combat/canvasCunning';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({ useCustomEquipmentImages: () => ({}), getCustomImage: () => null }));
const weapon = { id: 'rapier', name: 'Estoque', type: 'weapon', canvasSlot: 'mainHand', dano: 'd6', alcance: 'Cercano', rasgos: ['Duelista', 'Perforante'] };
const rogue = { id: 'hero', controlledBy: ['Ada'], name: 'Pícaro', classIdentity: 'Pícaro', profileType: 'rogueliteClass', x: 0, y: 0, width: 25, height: 25, equippedItems: [weapon], stats: { recurso: { current: 1, label: 'Astucia' } } };
const enemy = { id: 'enemy', controlledBy: ['master'], name: 'Duende', x: 50, y: 0, width: 25, height: 25, profileType: 'rogueliteEnemy' };
const selection = resolveCanvasAttackSelection({ attacker: rogue, target: enemy, selection: weapon, items: [rogue, enemy], gridConfig: { cellWidth: 50, cellHeight: 50 } });
const pending = { id: 'attack', attackerId: rogue.id, targetId: enemy.id, attackerName: rogue.name, targetName: enemy.name, status: 'awaiting-cunning', weapon: selection.weapon, weaponName: 'Estoque', attackParts: selection.parts, weaponDiceProfile: selection.profile, weaponResults: [2], actionDice: [{ id: 'action', sides: 6, value: 3 }], pressure: { total: 5 } };
const props = { activeScenario: { items: [rogue, enemy] }, isPlayerView: true };
const runtime = overrides => ({ pendingAttack: pending, controlledTokenIds: ['hero'], combatState: { participants: {} }, resolveCunning: jest.fn(), ...overrides });

test('attacker gets the optional Astucia decision after rolling, defender gets no reaction yet', () => {
  expect(selection).toMatchObject({ legal: true });
  expect(getCanvasCunningOption(rogue, pending).eligible).toBe(true);
  const combatRuntime = runtime();
  const view = render(<CanvasCombatActionModal {...props} combatRuntime={combatRuntime} />);
  expect(screen.getByRole('heading', { name: 'Golpe sucio' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Repetir dado · 1 Astucia' }));
  expect(combatRuntime.resolveCunning).toHaveBeenCalledWith({ dieIndex: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar sin gastar Astucia' }));
  expect(combatRuntime.resolveCunning).toHaveBeenCalledWith({ choice: 'skip' });
  view.rerender(<CanvasCombatActionModal {...props} combatRuntime={runtime({ controlledTokenIds: ['enemy'] })} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('reconnected choice shows both saved rolls, including criticals, without rerolling or needing more Astucia', () => {
  const choosing = { ...pending, status: 'awaiting-cunning-choice', cunningSpent: 1,
    cunning: { dieIndex: 0, originalValue: 2, value: 6, criticalResults: [{ value: 3 }], originalCriticalResults: [] } };
  const combatRuntime = runtime({ pendingAttack: choosing });
  const empty = { ...props, activeScenario: { items: [{ ...rogue, stats: { recurso: { current: 0, label: 'Astucia' } } }, enemy] } };
  const view = render(<CanvasCombatActionModal {...empty} combatRuntime={combatRuntime} />);
  expect(combatRuntime.resolveCunning).not.toHaveBeenCalled();
  expect(screen.getByText('Crítico +3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conservar nueva tirada: 6' }));
  expect(combatRuntime.resolveCunning).toHaveBeenCalledWith({ choice: 'rerolled' });
  expect(screen.queryByRole('button', { name: /Continuar sin/ })).not.toBeInTheDocument();
  view.rerender(<CanvasCombatActionModal {...empty} combatRuntime={{ ...combatRuntime, isResolvingCunning: true }} />);
  expect(screen.getByRole('button', { name: 'Conservar original: 2' })).toBeDisabled();
});

test('loss of Astucia before rolling disables spending but still permits continuing', () => {
  render(<CanvasCombatActionModal {...props} activeScenario={{ items: [{ ...rogue, stats: { recurso: { current: 0, label: 'Astucia' } } }, enemy] }} combatRuntime={runtime()} />);
  expect(screen.getByRole('button', { name: 'Repetir dado · 1 Astucia' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Continuar sin gastar Astucia' })).toBeEnabled();
});
