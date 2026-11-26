import { getWeaponForms, hasWeaponTrick, resolveWeaponForm, setWeaponForm, updateWeaponForm } from '../weaponForms';
import { weaponCatalogItemToForm, weaponCatalogItemToStorage } from '../catalogItem';
import { refreshForgeEquipment } from '../../../utils/forgeEquipmentSync';

export const trickCane = {
  id: 'cane', name: 'Bastón enroscado', nombre: 'Bastón enroscado', itemType: 'weapon', rasgos: ['Truco'],
  trickForms: [
    { id: 'primary', label: 'Estoque', dano: '1d12', alcance: 'Cercano', handsRequired: 1, actionCost: 1,
      rasgos: ['Perforante', 'Torso', 'Crítico'], image: '/cane.png', campaignPenetration: 2 },
    { id: 'secondary', label: 'Látigo', dano: '2d4', alcance: 'Intermedio', handsRequired: 1, actionCost: 1,
      rasgos: ['Crítico', 'Sangrado', 'Barrido', 'Sin guardia'], image: '/whip.png' },
  ],
};

test('Truco is an explicit trait, not a name or a prose substring', () => {
  expect(hasWeaponTrick({ rasgos: 'TRUCO, Crítico' })).toBe(true);
  expect(hasWeaponTrick({ name: 'Truco', description: 'Truco', rasgos: ['Sin truco'] })).toBe(false);
  const normal = { name: 'Espada', dano: 'd8' };
  expect(resolveWeaponForm(normal)).toBe(normal);
});

test('forms replace every mechanical alias and preserve physical identity', () => {
  const primary = resolveWeaponForm({ ...trickCane, instanceId: 'owned-one' });
  const whip = setWeaponForm(primary, 'secondary');
  expect(whip).toMatchObject({ id: 'cane', instanceId: 'owned-one', name: trickCane.name,
    dano: '2d4', damage: '2d4', alcance: 'Intermedio', range: 'Intermedio', image: '/whip.png', img: '/whip.png' });
  expect(whip.rasgos).not.toContain('Perforante');
  expect(whip.campaignPenetration).toBeUndefined();
  expect(setWeaponForm(whip, 'primary')).toMatchObject({ dano: '1d12', image: '/cane.png', campaignPenetration: 2 });
  expect(primary.activeFormId).toBe('primary');
});

test('editing secondary leaves primary intact and catalog round trips both profiles', () => {
  const edited = updateWeaponForm(weaponCatalogItemToForm(trickCane), 1, { dano: '2d6' });
  const stored = weaponCatalogItemToStorage(edited);
  expect(getWeaponForms(stored).map(form => form.dano)).toEqual(['1d12', '2d6']);
  expect(stored.activeFormId).toBeUndefined();
  expect(stored.trickForms[1].image).toBe('/whip.png');
});

test('catalog refresh updates definitions but preserves each copy active form', () => {
  const first = setWeaponForm({ ...trickCane, instanceId: 'one' }, 'secondary');
  const second = resolveWeaponForm({ ...trickCane, instanceId: 'two' });
  const updated = updateWeaponForm(trickCane, 1, { dano: '2d6' });
  const next = refreshForgeEquipment({ equipment: { weapons: [first, second] } }, { weapons: [updated] });
  expect(next.equipment.weapons[0]).toMatchObject({ instanceId: 'one', activeFormId: 'secondary', dano: '2d6' });
  expect(next.equipment.weapons[1]).toMatchObject({ instanceId: 'two', activeFormId: 'primary', dano: '1d12' });
});

test('an intentionally empty form image does not inherit legacy artwork', () => {
  const weapon = { ...trickCane, trickForms: trickCane.trickForms.map(form => ({ ...form, image: '', img: '/old.png' })) };
  expect(resolveWeaponForm(weapon).image).toBe('');
  expect(weaponCatalogItemToStorage(weapon).trickForms[1].image).toBe('');
});

test('wrapped owned copies retain their form while receiving fresh catalog profiles', () => {
  const owned = resolveWeaponForm({ ...trickCane, activeFormId: 'secondary', payload: { ...trickCane, instanceId: 'wrapped-one' } });
  const definition = updateWeaponForm(trickCane, 1, { dano: '2d6', image: '/updated.png' });
  const next = refreshForgeEquipment({ equipment: { weapons: [owned] } }, { weapons: [definition] }).equipment.weapons[0];
  expect(next).toMatchObject({ activeFormId: 'secondary', dano: '2d6', image: '/updated.png', payload: { activeFormId: 'secondary', dano: '2d6' } });
});
