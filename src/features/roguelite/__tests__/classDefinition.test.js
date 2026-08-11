import {
  mergeRogueliteClassCatalogs,
  normalizeRogueliteClass,
} from '../classDefinition';

describe('roguelite class definitions', () => {
  test('normalizes an existing class with safe roguelite defaults', () => {
    expect(normalizeRogueliteClass({ id: 'old-mage', name: 'Maga' })).toMatchObject({
      id: 'old-mage',
      name: 'Maga',
      level: 1,
      actionDice: [],
      lifeInitial: 0,
      maxLife: 0,
      defenseClass: 0,
      maxDefenseClass: 0,
      movement: 0,
      maxMovement: 0,
      initiativeBase: 0,
      maxInitiative: 0,
    });
  });

  test('includes legacy classes and sorts the combined catalog by name', () => {
    const catalog = mergeRogueliteClassCatalogs(
      [
        { id: 'wizard', name: 'Maga' },
        { id: 'barbarian', name: 'Bárbaro' },
      ],
      [],
    );

    expect(catalog.map((classItem) => classItem.id)).toEqual(['barbarian', 'wizard']);
  });

  test('lets a dedicated roguelite definition extend a legacy class with the same id', () => {
    const [classDefinition] = mergeRogueliteClassCatalogs(
      [{ id: 'barbarian', name: 'Bárbaro antiguo', image: 'legacy.webp' }],
      [{
        id: 'barbarian',
        name: 'Bárbaro',
        roguelite: { maxLife: 10, actionDice: ['d8', 'd6', 'd4'] },
      }],
    );

    expect(classDefinition).toMatchObject({
      id: 'barbarian',
      name: 'Bárbaro',
      image: 'legacy.webp',
      maxLife: 10,
      actionDice: ['d8', 'd6', 'd4'],
    });
  });

  test('keeps the master-defined initial value of the class resource', () => {
    const normalized = normalizeRogueliteClass({
      id: 'mage',
      roguelite: {
        resource: { name: 'Maná', maximum: 3, initial: 1 },
      },
    });

    expect(normalized.resource).toMatchObject({
      name: 'Maná',
      maximum: 3,
      initial: 1,
    });
  });

  test('keeps a top-level resource when the dedicated rules do not override it', () => {
    const [normalized] = mergeRogueliteClassCatalogs([], [{
      id: 'mage',
      name: 'Maga',
      resource: { name: 'Maná', maximum: 5, initial: 2 },
    }]);

    expect(normalized.resource).toMatchObject({
      name: 'Maná',
      maximum: 5,
      initial: 2,
    });
  });

  test('uses the dedicated talent catalog when it extends a legacy class', () => {
    const [normalized] = mergeRogueliteClassCatalogs(
      [{
        id: 'barbarian',
        name: 'Bárbaro',
        talentCatalog: [{ id: 'legacy', name: 'Talento antiguo' }],
      }],
      [{
        id: 'barbarian',
        roguelite: {
          talentCatalog: [{ id: 'athletics', name: 'Atletismo' }],
        },
      }],
    );

    expect(normalized.talentCatalog).toEqual([
      expect.objectContaining({ id: 'athletics', name: 'Atletismo' }),
    ]);
  });

  test('normalizes initial and maximum values for every class statistic', () => {
    const normalized = normalizeRogueliteClass({
      id: 'barbarian',
      roguelite: {
        lifeInitial: 6,
        maxLife: 8,
        defenseClass: 2,
        maxDefenseClass: 4,
        movement: 2,
        maxMovement: 3,
        initiativeBase: 1,
        maxInitiative: 5,
      },
    });

    expect(normalized).toMatchObject({
      lifeInitial: 6,
      maxLife: 8,
      defenseClass: 2,
      maxDefenseClass: 4,
      movement: 2,
      maxMovement: 3,
      initiativeBase: 1,
      maxInitiative: 5,
    });
  });

  test('normalizes the documented Barbarian progression into the catalog', () => {
    const normalized = normalizeRogueliteClass({ id: 'barbarian', name: 'Bárbaro' });

    expect(normalized.classLevels).toHaveLength(10);
    expect(normalized.classLevels[3]).toMatchObject({
      title: 'Mejora de vida',
      maxLife: 9,
      movement: 3,
      resourceMaximum: 3,
    });
  });

});
