import {
  DOCUMENTED_BARBARIAN_LEVELS,
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
});

