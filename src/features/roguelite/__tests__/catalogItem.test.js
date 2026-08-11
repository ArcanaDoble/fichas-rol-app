import {
  abilityCatalogItemToStorage,
  armorCatalogItemToForm,
  armorCatalogItemToStorage,
  parseActionDiceCost,
  weaponCatalogItemToForm,
  weaponCatalogItemToStorage,
} from '../catalogItem';

describe('roguelite catalog item migration', () => {
  test('reads legacy action costs and clamps them to the three dice reserve', () => {
    expect(parseActionDiceCost('🟡🟡')).toBe(2);
    expect(parseActionDiceCost('Coste: 7')).toBe(3);
    expect(parseActionDiceCost('')).toBe(0);
  });

  test('migrates an old weapon to explicit cost, competence and hands', () => {
    const form = weaponCatalogItemToForm({
      id: 'mandoble',
      nombre: 'Mandoble',
      consumo: '🟡🟡',
      manos: 2,
      rasgos: ['Pesada', 'Barrido'],
      cargaFisica: '🔲🔲',
      tipoDano: 'Físico',
    });

    expect(form.actionCost).toBe(2);
    expect(form.handsRequired).toBe(2);
    expect(form.rasgos).toBe('Pesada, Barrido');

    const stored = weaponCatalogItemToStorage(form);
    expect(stored).toEqual(expect.objectContaining({
      actionCost: 2,
      consumo: '🟡🟡',
      handsRequired: 2,
      competence: 'Simple',
      rasgos: ['Pesada', 'Barrido'],
    }));
    expect(stored).not.toHaveProperty('cargaFisica');
    expect(stored).not.toHaveProperty('tipoDano');
  });

  test('stores armor CD and removes every obsolete action-cost field', () => {
    const form = armorCatalogItemToForm({
      nombre: 'Placas',
      defensa: 8,
      tipo: 'Pesada',
      actionCost: 2,
      consumo: '🔷🔷🔷🔷🔷🔷',
      consumption: '6',
      coste: '6',
    });
    const stored = armorCatalogItemToStorage(form);

    expect(stored.defenseClass).toBe('8');
    expect(stored.defensa).toBe('8');
    expect(stored.competence).toBe('Pesada');
    expect(form).not.toHaveProperty('actionCost');
    expect(form).not.toHaveProperty('consumo');
    expect(stored).not.toHaveProperty('actionCost');
    expect(stored).not.toHaveProperty('consumo');
    expect(stored).not.toHaveProperty('consumption');
    expect(stored).not.toHaveProperty('coste');
  });

  test('allows an ability without action-die cost and removes old loads', () => {
    const stored = abilityCatalogItemToStorage({
      nombre: 'Reacción',
      actionCost: 0,
      cuerpo: '1',
      mente: '2',
      rasgos: 'Reacción',
    });

    expect(stored.actionCost).toBe(0);
    expect(stored.consumo).toBe('');
    expect(stored).not.toHaveProperty('cuerpo');
    expect(stored).not.toHaveProperty('mente');
  });
});
