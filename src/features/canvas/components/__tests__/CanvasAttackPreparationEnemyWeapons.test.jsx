import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CanvasAttackPreparation from '../CanvasAttackPreparation';
import { combineCanvasWeapons, getCanvasAttackOptions, resolveCanvasAttackSelection } from '../../combat/canvasAttackSelection';
import { getCanvasWeaponIdentity } from '../../combat/canvasAttackRules';

const weapons = [
  { id: 'dagger-catalog', runItemId: 'dagger-copy-one', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano' },
  { id: 'dagger-catalog', runItemId: 'dagger-copy-two', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano' },
  { id: 'sword-catalog', runItemId: 'sword-copy', name: 'Espada', type: 'weapon', dano: '1d8', alcance: 'Cercano' },
];
const attacker = {
  id: 'enemy-arsenal', name: 'Duende', profileType: 'rogueliteEnemy', controlledBy: ['master'],
  x: 0, y: 0, width: 25, height: 25, offenseBase: 3, inventory: weapons, equippedItems: [],
};
const target = { id: 'hero-target', name: 'Guerrero', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 50, y: 0, width: 25, height: 25 };
const items = [attacker, target];
const gridConfig = { cellWidth: 50, cellHeight: 50 };
const resolveSelection = selection => resolveCanvasAttackSelection({ attacker, target, selection, items, gridConfig });
const toDraft = selection => ({
  attackerId: attacker.id, targetId: target.id,
  weapon: selection.weapon, attackParts: selection.parts, range: selection.range,
  weaponDiceProfile: selection.profile, actionCost: 0,
});

const renderPreparation = () => {
  const setAttackWeapons = jest.fn();
  const confirmAttack = jest.fn();
  const confirmedWeapons = jest.fn();
  const cancelAttackDraft = jest.fn();
  const Harness = ({ busy = false }) => {
    const [draft, setDraft] = useState(() => toDraft(resolveSelection(weapons[0])));
    const [threatSelection, setThreatSelection] = useState({ useStored: false, customDice: [] });
    return <CanvasAttackPreparation
      attacker={attacker} target={target} draft={draft} isEnemy customImages={new Map()}
      glossary={[]} availableActionDice={[]} selectedActionDice={[]} setSelectedActionDice={jest.fn()}
      canSubmit={!busy} canChooseEnemyWeapons
      enemyWeaponOptions={getCanvasAttackOptions({ attacker, target, items, gridConfig })}
      attackThreatSelection={threatSelection} setAttackThreatSelection={setThreatSelection}
      attackStoredThreatValue={6} attackStoredThreatDie="d8"
      combatRuntime={{
        isConfirmingAttack: busy,
        cancelAttackDraft,
        setAttackWeapons: chosen => {
          setAttackWeapons(chosen.map(getCanvasWeaponIdentity));
          const selection = resolveSelection(combineCanvasWeapons(chosen, 'multiweapon'));
          if (selection.legal) setDraft(toDraft(selection));
        },
        confirmAttack: payload => {
          confirmAttack(payload);
          confirmedWeapons(draft.attackParts.map(part => part.weaponId));
        },
      }}
    />;
  };
  const rendered = render(<Harness />);
  return { ...rendered, setAttackWeapons, confirmAttack, confirmedWeapons, setBusy: () => rendered.rerender(<Harness busy />) };
};

test('prepares any number of distinct enemy weapon copies and keeps Threat through folding and reselection', () => {
  const { container, setAttackWeapons, confirmAttack, confirmedWeapons } = renderPreparation();
  const toggle = screen.getByRole('button', { name: 'Elegir armas' });
  const threat = screen.getByRole('button', { name: 'Dado puntual d12, por tirar' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: 'Armas disponibles' })).not.toBeInTheDocument();
  fireEvent.click(threat);
  fireEvent.click(toggle);

  const choices = () => within(screen.getByRole('group', { name: 'Armas disponibles' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const controlledPanel = document.getElementById(toggle.getAttribute('aria-controls'));
  expect(controlledPanel).toContainElement(screen.getByRole('group', { name: 'Armas disponibles' }));
  expect(choices().getByRole('button', { name: 'Daga, ejemplar 1' })).toBeDisabled();
  expect(choices().getByRole('button', { name: 'Daga, ejemplar 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(choices().getByRole('button', { name: 'Daga, ejemplar 2' })).toHaveAttribute('aria-pressed', 'false');
  expect(choices().getByText('Al menos un arma')).toBeInTheDocument();

  fireEvent.click(choices().getByRole('button', { name: 'Daga, ejemplar 2' }));
  expect(setAttackWeapons).toHaveBeenLastCalledWith(['dagger-copy-one', 'dagger-copy-two']);
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(container.querySelector('.attack-preparation-pair')).toBeInTheDocument();
  expect(container.querySelectorAll('.combat-dual-weapon-art img')).toHaveLength(2);

  fireEvent.click(choices().getByRole('button', { name: 'Espada' }));
  expect(setAttackWeapons).toHaveBeenLastCalledWith(['dagger-copy-one', 'dagger-copy-two', 'sword-copy']);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(choices().getAllByRole('button', { pressed: true })).toHaveLength(3);
  expect(threat).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: 'Armas disponibles' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
  fireEvent.click(toggle);
  expect(choices().getAllByRole('button', { pressed: true })).toHaveLength(3);

  fireEvent.click(choices().getByRole('button', { name: 'Daga, ejemplar 1' }));
  expect(setAttackWeapons).toHaveBeenLastCalledWith(['dagger-copy-two', 'sword-copy']);
  fireEvent.click(choices().getByRole('button', { name: 'Espada' }));
  expect(setAttackWeapons).toHaveBeenLastCalledWith(['dagger-copy-two']);
  const lastWeapon = choices().getByRole('button', { name: 'Daga, ejemplar 2' });
  expect(lastWeapon).toBeDisabled();
  const changes = setAttackWeapons.mock.calls.length;
  fireEvent.click(lastWeapon);
  expect(setAttackWeapons).toHaveBeenCalledTimes(changes);
  expect(threat).toHaveAttribute('aria-pressed', 'true');
  expect(confirmAttack).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }));
  expect(confirmAttack).toHaveBeenCalledTimes(1);
  expect(confirmAttack).toHaveBeenCalledWith({ actionDieIds: [], threatSelection: { useStored: false, customDice: [12] } });
  expect(confirmedWeapons).toHaveBeenCalledWith(['dagger-copy-two']);
});

test('locks the enemy arsenal while its confirmation is in progress', () => {
  const { setBusy, setAttackWeapons, confirmAttack } = renderPreparation();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir armas' }));
  setBusy();
  expect(screen.getByRole('button', { name: 'Elegir armas' })).toBeDisabled();
  const choices = within(screen.getByRole('group', { name: 'Armas disponibles' }));
  choices.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Dado puntual d12, por tirar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
  fireEvent.click(choices.getByRole('button', { name: 'Daga, ejemplar 2' }));
  expect(setAttackWeapons).not.toHaveBeenCalled();
  expect(confirmAttack).not.toHaveBeenCalled();
});
