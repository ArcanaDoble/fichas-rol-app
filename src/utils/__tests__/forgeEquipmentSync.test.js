import { refreshForgeEquipment } from '../forgeEquipmentSync';

test('updates owned and equipped definitions while preserving copy identity and quantities', () => {
    const copy = { templateId: 'blade', instanceId: 'copy-1', name: 'Old blade', damage: 'd4', quantity: 2, notes: 'Mine' };
    const sheet = { equipment: { weapons: [copy] }, equippedItems: { mainHand: copy, weaponSets: [{ mainHand: copy }] } };
    const catalog = { weapons: [{ id: 'blade', name: 'New blade', payload: { templateId: 'blade', name: 'New blade', damage: '2d8', traits: 'Venenosa', image: '/blade.webp', quantity: 1 } }] };
    const next = refreshForgeEquipment(sheet, catalog);
    expect(next.equipment.weapons[0]).toMatchObject({ name: 'New blade', damage: '2d8', instanceId: 'copy-1', quantity: 2, notes: 'Mine', image: '/blade.webp' });
    expect(next.equippedItems.mainHand).toEqual(next.equipment.weapons[0]);
    expect(next.equippedItems.weaponSets[0].mainHand).toEqual(next.equipment.weapons[0]);
    expect(refreshForgeEquipment(next, catalog)).toBe(next);
    expect(sheet.equipment.weapons[0].damage).toBe('d4');
});

test('updates wrapped objects and leaves unmatched possessions intact', () => {
    const sheet = { equipment: [{ id: 'copy', payload: { name: 'Antidote', quantity: 3, description: 'Old' } }, { name: 'Personal item' }] };
    const next = refreshForgeEquipment(sheet, { objects: [{ id: 'antidote', name: 'Antidote', payload: { name: 'Antidote', description: 'New', image: '/new.webp' } }] });
    expect(next.equipment[0]).toMatchObject({ id: 'copy', payload: { quantity: 3, description: 'New', image: '/new.webp' } });
    expect(next.equipment[1]).toEqual(sheet.equipment[1]);
    expect(next.equipment).toHaveLength(2);
});

test('removed definitions do not delete owned items and ambiguous names are not guessed', () => {
    const sheet = { equipment: [{ name: 'Dagger', damage: 'd4' }] };
    expect(refreshForgeEquipment(sheet, { weapons: [{ name: 'Dagger', deleted: true }] })).toBe(sheet);
    expect(refreshForgeEquipment(sheet, { weapons: [{ name: 'Dagger', id: 'a' }, { name: 'Dagger', id: 'b' }] })).toBe(sheet);
});
