import {
  applyRogueliteLevelEffects,
  describeRogueliteLevelEffect,
  DOCUMENTED_BARBARIAN_LEVELS,
  normalizeRogueliteLevelEffect,
  resolveRogueliteClassLevels,
} from '../progression';

describe('roguelite class progression', () => {
  test('provides the ten Barbarian levels defined in the master document', () => {
    const levels = resolveRogueliteClassLevels({ id: 'barbarian', name: 'Bárbaro' });

    expect(levels).toHaveLength(10);
    expect(levels[0]).toMatchObject({
      title: 'Furia',
      maxLife: 8,
      movement: 2,
      resourceMaximum: 3,
    });
    expect(levels[9]).toMatchObject({
      title: 'Último aliento',
      maxLife: 9,
      movement: 3,
      resourceMaximum: 4,
    });
    expect(levels[3].effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'life.max', operation: 'add', value: 1 }),
      expect.objectContaining({ target: 'movement.max', operation: 'add', value: 1 }),
    ]));
    expect(levels[4].effects).toEqual([
      expect.objectContaining({ target: 'resource.max', operation: 'add', value: 1 }),
    ]);
  });

  test('uses the custom master progression after it has been configured', () => {
    const levels = resolveRogueliteClassLevels({
      id: 'barbarian',
      name: 'Bárbaro',
      rogueliteProgressionConfigured: true,
      classLevels: [{ title: 'Nivel personalizado', description: 'Cambio del máster.' }],
    });

    expect(levels).toHaveLength(1);
    expect(levels[0]).toMatchObject({
      title: 'Nivel personalizado',
      description: 'Cambio del máster.',
    });
    expect(DOCUMENTED_BARBARIAN_LEVELS).toHaveLength(10);
  });

  test('applies only the flexible effects acquired by the personal level', () => {
    const classDefinition = {
      maxLife: 8,
      maxDefenseClass: 2,
      maxMovement: 2,
      maxInitiative: 2,
      resource: { name: 'Furia', maximum: 3 },
      classLevels: [
        { title: 'Inicio', effects: [] },
        { title: 'Resistencia', effects: [{ target: 'life.max', operation: 'add', value: 1 }] },
        { title: 'Arrebato', effects: [{ target: 'resource.max', operation: 'set', value: 5 }] },
      ],
    };

    expect(applyRogueliteLevelEffects(classDefinition, 2)).toMatchObject({
      maxLife: 9,
      maxMovement: 2,
      resource: { name: 'Furia', maximum: 3 },
    });
    expect(applyRogueliteLevelEffects(classDefinition, 3)).toMatchObject({
      maxLife: 9,
      resource: { name: 'Furia', maximum: 5 },
    });
    expect(describeRogueliteLevelEffect(
      { target: 'resource.max', operation: 'add', value: 1 },
      'Furia',
    )).toBe('Furia máximo: +1');
  });

  test('preserves a safe custom color only for personalized effects', () => {
    expect(normalizeRogueliteLevelEffect({
      target: 'custom',
      label: 'Maná',
      color: '#38BDF8',
      value: 1,
    })).toMatchObject({
      target: 'custom',
      label: 'Maná',
      color: '#38bdf8',
    });
    expect(normalizeRogueliteLevelEffect({
      target: 'custom',
      label: 'Maná',
      color: 'red',
      value: 1,
    }).color).toBe('');
  });
});
