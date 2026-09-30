import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CanvasAttackPreparation from '../CanvasAttackPreparation';
import { AttackModifiers, IncomingAttackDice } from '../CanvasCombatDetails';
import { resolveCanvasAttackSelection } from '../../combat/canvasAttackSelection';

jest.mock('../../../../utils/equipmentImages', () => ({ resolveEquipmentImage: () => null }));

const sword = { id: 'sword', name: 'Espada', type: 'weapon', dano: '1d8', alcance: 'Cercano', rasgos: ['Destreza'] };
const attacker = { id: 'enemy', name: 'Duende', profileType: 'rogueliteEnemy', controlledBy: ['master'], inventory: [sword],
  x: 0, y: 0, width: 25, height: 25, offenseBase: 3 };
const target = { id: 'hero', name: 'Guerrero', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 50, y: 0, width: 25, height: 25 };
const glossary = [{ word: 'Crítico', color: '#cf4444' }, { word: 'Perforante', color: '#caab72' }];
const modifierDice = [0, 1].map(index => ({ id: `modifier-${index}`, die: 'd6', sides: 6, source: 'Modificador', noCritical: true }));

test('mana is an optional one-point enhancement; a depleted live reserve requires deselecting it', () => {
  const mage = { ...target, classIdentity: 'Mago', stats: { recurso: { label: 'Maná', current: 1 } } };
  const wand = { ...sword, rasgos: ['Catalizador'] };
  const confirmAttack = jest.fn();
  const props = { attacker: mage, target: attacker, draft: { attackerId: mage.id, targetId: attacker.id,
    weapon: wand, weaponDiceProfile: [{ die: 'd8', sides: 8 }], actionCost: 1, range: { rangeName: 'Intermedio' } },
    combatRuntime: { confirmAttack }, availableActionDice: [], selectedActionDice: ['one'], canSubmit: true };
  const { rerender } = render(<CanvasAttackPreparation {...props} />);
  const toggle = screen.getByRole('button', { name: /Potenciar · 1 Maná/ });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(toggle);
  expect(confirmAttack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }));
  expect(confirmAttack).toHaveBeenCalledWith(expect.objectContaining({ manaSpend: 1 }));
  rerender(<CanvasAttackPreparation {...props} attacker={{ ...mage, stats: { recurso: { current: 0, label: 'Maná' } } }} />);
  expect(screen.getByRole('button', { name: 'Confirmar ataque' })).toBeDisabled();
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Confirmar ataque' })).toBeEnabled();
  expect(toggle).toBeDisabled();
});
test('mana dice have an arcane source color and stay separate from modifiers and catalyst dice', () => {
  render(<IncomingAttackDice pending={{ manaSpent: 1, weaponDiceProfile: [
    { id: 'base', sides: 6, weaponId: 'wand' }, { id: 'mana', sides: 6, source: 'Maná' },
  ], weaponResults: [3, 5] }} />);
  expect(screen.getByLabelText('Maná: 5 en d6').querySelector('svg')).toHaveAttribute('data-die-accent', 'arcane');
  expect(screen.queryByLabelText('Arma: 5 en d6')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Modificador: 5 en d6')).not.toBeInTheDocument();
});

test('Fury selector respects the live reserve and only forwards a cost on confirmation', () => {
  const barbarian = { ...target, classIdentity: 'Bárbaro', stats: { recurso: { label: 'Furia', current: 2 } } };
  const confirmAttack = jest.fn(), cancelAttackDraft = jest.fn();
  render(<CanvasAttackPreparation attacker={barbarian} target={attacker} draft={{ attackerId: barbarian.id, targetId: attacker.id,
    weapon: sword, weaponDiceProfile: [{ die: 'd8', sides: 8 }], actionCost: 1, range: { rangeName: 'Cercano' } }}
    combatRuntime={{ confirmAttack, cancelAttackDraft }} availableActionDice={[]} selectedActionDice={['one']} canSubmit />);
  expect(screen.getByRole('button', { name: 'Gastar menos Furia' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Gastar más Furia' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gastar más Furia' }));
  expect(screen.getByRole('button', { name: 'Gastar más Furia' })).toBeDisabled();
  expect(confirmAttack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }));
  expect(confirmAttack).toHaveBeenCalledWith(expect.objectContaining({ furySpend: 2 }));
});

test('Fury results have their own group, separate from weapon and manual modifiers', () => {
  render(<IncomingAttackDice pending={{ furySpent: 1, weaponDiceProfile: [
    { id: 'base', sides: 8, weaponId: 'sword' }, { id: 'extra', sides: 6, source: 'Modificador' }, { id: 'fury', sides: 8, source: 'Furia' },
  ], weaponResults: [3, 2, 7] }} />);
  expect(screen.getByLabelText('Furia: 7 en d8')).toBeInTheDocument();
  expect(screen.queryByLabelText('Modificador: 7 en d8')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Arma: 7 en d8')).not.toBeInTheDocument();
});

test('preparation keeps the base damage and traits separate from added dice and manual traits', () => {
  const resolved = resolveCanvasAttackSelection({ attacker, target,
    selection: { ...sword, extraDamageString: '2d6', manualCombatTraits: ['critico', 'perforante'] },
    items: [attacker, target], gridConfig: { cellWidth: 50, cellHeight: 50 } });
  expect(resolved.legal).toBe(true);
  const { container } = render(<CanvasAttackPreparation attacker={attacker} target={target} isEnemy
    draft={{ weapon: resolved.weapon, attackParts: resolved.parts, weaponDiceProfile: resolved.profile, range: resolved.range, actionCost: 0 }}
    glossary={glossary} combatRuntime={{}} availableActionDice={[]} selectedActionDice={[]}
    enemyWeaponOptions={[]} setAttackThreatSelection={jest.fn()} canSubmit />);
  const weapon = screen.getByRole('region', { name: 'Arma seleccionada' });
  expect(weapon).toHaveTextContent('1d8');
  expect(weapon).not.toHaveTextContent('d6');
  expect(weapon).not.toHaveTextContent('Crítico');
  expect(weapon).toHaveTextContent(/destreza/i);
  const modifiers = screen.getByRole('region', { name: 'Modificadores del ataque' });
  expect(within(modifiers).getAllByLabelText('Modificador d6, por tirar')).toHaveLength(2);
  expect(within(modifiers).getByText('Crítico')).toHaveStyle({ color: '#cf4444' });
  expect(within(modifiers).getByText('Perforante')).toHaveStyle({ color: '#caab72' });
  expect(container.querySelector('.attack-preparation-preview')).toHaveTextContent('2d6 de modificadores');
});

test('single attacks show every additional die as a modifier, never as weapon damage or Threat', () => {
  const { container } = render(<IncomingAttackDice pending={{ attackParts: [{ weaponId: 'sword', weapon: sword }],
    weaponDiceProfile: [{ sides: 8, die: 'd8', weaponId: 'sword' }, ...modifierDice], weaponResults: [7, 2, 5],
    actionDice: [{ id: 'action', sides: 4, value: 3 }],
    attackThreatDice: [{ id: 'threat', sides: 6, value: 4, source: 'custom' }], criticalResults: [{ sides: 8, value: 6 }],
  }} />);
  expect(screen.getByLabelText('Arma: 7 en d8')).toBeInTheDocument();
  expect(screen.getByLabelText('Modificador: 2 en d6')).toBeInTheDocument();
  expect(screen.getByLabelText('Modificador: 5 en d6')).toBeInTheDocument();
  expect(screen.getByLabelText('Amenaza: 4 en d6')).toBeInTheDocument();
  expect(screen.queryByLabelText('Arma: 5 en d6')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.combat-roll-die')).toHaveLength(6);
});

test('combined attacks preserve one modifier group without repeating it for each weapon', () => {
  const { container } = render(<IncomingAttackDice pending={{
    attackParts: [{ weaponId: 'sword', weapon: sword }, { weaponId: 'dagger', weapon: { name: 'Daga' } }],
    weaponDiceProfile: [{ sides: 8, weaponId: 'sword' }, { sides: 4, weaponId: 'dagger' }, ...modifierDice],
    weaponResults: [3, 1, 4, 4],
  }} />);
  expect(screen.getByLabelText('Espada: 3 en d8')).toBeInTheDocument();
  expect(screen.getByLabelText('Daga: 1 en d4')).toBeInTheDocument();
  expect(screen.getAllByLabelText('Modificador: 4 en d6')).toHaveLength(2);
  expect(screen.getAllByText('Modificador')).toHaveLength(1);
  expect(container.querySelectorAll('.combat-roll-die')).toHaveLength(4);
});

test('suppressed manual traits are identified as inactive, and obsolete manual traits are not offered', () => {
  render(<AttackModifiers showDice={false} glossary={glossary}
    weapon={{ manualCombatTraits: ['Crítico', 'Perforante', 'Vampírico'], rasgos: ['Perforante'] }} />);
  expect(screen.getByText('Rasgos añadidos')).toBeInTheDocument();
  expect(screen.getByText('Sin efecto · Crítico')).toBeInTheDocument();
  expect(screen.getByText('Perforante')).toHaveStyle({ color: '#caab72' });
  expect(screen.queryByText(/Vampírico/)).not.toBeInTheDocument();
  expect(screen.queryByText('Se tiran al confirmar')).not.toBeInTheDocument();
});

test('attacks without modifiers retain their original presentation, including legacy profiles without sources', () => {
  const { container } = render(<><AttackModifiers weapon={{ rasgos: ['Crítico'] }} profile={[{ sides: 8 }]} />
    <IncomingAttackDice pending={{ weaponDiceProfile: [{ sides: 8 }], weaponResults: [5] }} /></>);
  expect(screen.queryByRole('region', { name: 'Modificadores del ataque' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Arma: 5 en d8')).toBeInTheDocument();
  expect(container.querySelectorAll('.combat-roll-die')).toHaveLength(1);
});
