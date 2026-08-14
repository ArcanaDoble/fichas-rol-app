import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LoadoutView from '../LoadoutView';
import { resolveEquippedSkillIds } from '../../features/roguelite/talents';

describe('Equipped Skills and Initial Equipment Pool Filtering', () => {
  const sampleEquipment = [
    { id: 'sword-1', name: 'Espada Larga', _category: 'weapons', itemType: 'weapon' },
    { id: 'axe-1', name: 'Hacha de Guerra', _category: 'weapons', itemType: 'weapon' },
    { id: 'plate-1', name: 'Armadura de Placas', _category: 'armor', itemType: 'armor' },
    { id: 'fireball-1', name: 'Bola de Fuego', _category: 'abilities', itemType: 'ability' },
    { id: 'lightning-1', name: 'Rayo Eléctrico', _category: 'abilities', itemType: 'ability' },
    { id: 'potion-1', name: 'Poción de Vida', _category: 'objects', itemType: 'object' },
  ];

  test('resolveEquippedSkillIds initializes empty slots and supports equipped skills', () => {
    const slots = resolveEquippedSkillIds({}, sampleEquipment.filter(i => i._category === 'abilities'));
    expect(slots).toEqual([null, null, null]);

    const equipped = resolveEquippedSkillIds(
      { equippedSkillIds: ['fireball-1', 'fireball-1', 'lightning-1'] },
      sampleEquipment
    );
    expect(equipped).toEqual(['fireball-1', 'fireball-1', 'lightning-1']);
  });

  test('shows full pool when adventure has not started (hasActiveRun false)', () => {
    const dndClass = {
      id: 'warrior',
      name: 'Guerrero',
      equipment: sampleEquipment,
      equippedItems: { mainHand: sampleEquipment[0], offHand: null, body: null },
      equippedSkillIds: [null, null, null],
      hasActiveRun: false,
    };

    render(
      <LoadoutView
        dndClass={dndClass}
        rogueliteRole="player"
      />
    );

    // Switch to Inventario tab
    fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));

    // Out of adventure, all items from initial pool should be visible
    expect(screen.getByText('Espada Larga')).toBeInTheDocument();
    expect(screen.getByText('Hacha de Guerra')).toBeInTheDocument();
    expect(screen.getByText('Armadura de Placas')).toBeInTheDocument();
    expect(screen.getAllByText('Bola de Fuego').length).toBeGreaterThan(0);
    expect(screen.getByText('Rayo Eléctrico')).toBeInTheDocument();
    expect(screen.getByText('Poción de Vida')).toBeInTheDocument();
  });

  test('hides unequipped pool items when adventure is active (hasActiveRun true)', () => {
    const dndClass = {
      id: 'warrior',
      name: 'Guerrero',
      equippedItems: { mainHand: sampleEquipment[0], offHand: null, body: null }, // Espada Larga equipped
      equippedSkillIds: ['fireball-1', null, null], // Bola de Fuego equipped
      hasActiveRun: true,
      activeRun: { status: 'active' },
      equipment: [sampleEquipment[0], sampleEquipment[3]],
    };

    render(
      <LoadoutView
        dndClass={dndClass}
        rogueliteRole="player"
      />
    );

    // Switch to Inventario tab
    fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));

    // Equipped items & skills remain in inventory
    expect(screen.getByText('Espada Larga')).toBeInTheDocument();
    expect(screen.getAllByText('Bola de Fuego').length).toBeGreaterThan(0);

    // Non-equipped items from GM pool should disappear / be hidden
    expect(screen.queryByText('Hacha de Guerra')).not.toBeInTheDocument();
    expect(screen.queryByText('Armadura de Placas')).not.toBeInTheDocument();
    expect(screen.queryByText('Rayo Eléctrico')).not.toBeInTheDocument();
    expect(screen.queryByText('Poción de Vida')).not.toBeInTheDocument();
  });

  test('hides unequipped items when matched by templateId or name', () => {
    const equipmentWithNames = [
      { id: 'w1', templateId: 'tpl_sword', name: 'Espada de Acero', _category: 'weapons' },
      { id: 'w2', templateId: 'tpl_bow', name: 'Arco Corto', _category: 'weapons' },
    ];
    const dndClass = {
      id: 'hunter',
      name: 'Cazador',
      equippedItems: { mainHand: { templateId: 'tpl_bow', name: 'Arco Corto' }, offHand: null },
      equippedSkillIds: [null, null, null],
      hasActiveRun: true,
      activeRun: { status: 'active' },
      equipment: [equipmentWithNames[1]],
    };

    render(
      <LoadoutView
        dndClass={dndClass}
        rogueliteRole="player"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));

    // Equipped Arco Corto is present
    expect(screen.getByText('Arco Corto')).toBeInTheDocument();
    // Unequipped Espada de Acero is hidden
    expect(screen.queryByText('Espada de Acero')).not.toBeInTheDocument();
  });
});
