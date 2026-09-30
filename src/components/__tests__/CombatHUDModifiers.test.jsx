import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CombatHUD from '../CombatHUD';
import CombatModifiersPanel from '../CombatModifiersPanel';
import { getCanvasAttackOptions, resolveCanvasAttackSelection } from '../../features/canvas/combat/canvasAttackSelection';

jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  getCustomImage: () => null,
  useCustomEquipmentImages: () => ({}),
}));

const weapons = [
  { id: 'sword', name: 'Espada', type: 'weapon', dano: '1d8', alcance: 'Cercano', canvasSlot: 'mainHand', rasgos: ['Crítico'] },
  { id: 'dagger', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', canvasSlot: 'offHand' },
];
const gridConfig = { cellWidth: 50, cellHeight: 50 };

test.each([false, true])('Canvas HUD passes repeated extra dice and both manual traits to %s enemy attack', enemy => {
  const attacker = { id: 'actor', name: 'Actor', profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass', controlledBy: ['Ada'],
    x: 0, y: 0, width: 25, height: 25, status: [], equippedItems: enemy ? [] : weapons, inventory: enemy ? weapons : [] };
  const target = { id: 'target', profileType: 'rogueliteEnemy', controlledBy: ['master'], x: 50, y: 0, width: 25, height: 25 };
  const items = [attacker, target];
  const canvasAttackOptions = getCanvasAttackOptions({ attacker, target, items, gridConfig });
  const onAction = jest.fn();
  render(<CombatHUD token={attacker} onAction={onAction} mode="canvas" forceWeaponMenu isActive canvasAttackOptions={canvasAttackOptions} />);
  const options = screen.getAllByTestId('attack-option');
  fireEvent.click(enemy ? options[0] : options.at(-1));
  fireEvent.click(screen.getByRole('button', { name: 'Modificadores' }));
  expect(screen.queryByRole('button', { name: 'Agudeza' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+d6' }));
  fireEvent.click(screen.getByRole('button', { name: '+d6' }));
  fireEvent.click(screen.getByRole('button', { name: '+d4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Crítico' }));
  fireEvent.click(screen.getByRole('button', { name: 'Perforante' }));
  fireEvent.click(screen.getByRole('button', { name: 'Venenosa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sangrado' }));
  expect(screen.getByRole('button', { name: 'Crítico' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Preparar ataque' }));
  const [action, weapon] = onAction.mock.calls.at(-1);
  expect(action).toBe('attack');
  expect(weapon.extraDamageString).toBe('1d6 + 1d6 + 1d4');
  expect(weapon.manualCombatTraits).toEqual(['critico', 'perforante', 'venenosa', 'sangrado']);
  const resolved = resolveCanvasAttackSelection({ attacker, target, items, gridConfig, selection: weapon });
  expect(resolved.legal).toBe(true);
  expect(resolved.profile.filter(die => die.source === 'Modificador').map(die => die.sides)).toEqual([6, 6, 4]);
  expect(resolved.parts).toHaveLength(enemy ? 1 : 2);
  resolved.parts.forEach(part => expect(part.traits).toEqual(expect.arrayContaining(['critico', 'perforante', 'venenosa', 'sangrado'])));
});

test('other modes retain the unrestricted trait picker', () => {
  render(<CombatModifiersPanel modifiers={{ extraDice: {}, activeTraits: [] }} onChange={jest.fn()} isExpanded onToggleExpand={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Agudeza' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
  expect(screen.getByRole('button', { name: 'Sangrado' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Empuje' })).toBeInTheDocument();
});
