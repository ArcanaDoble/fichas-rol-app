import {
  createRogueliteProfileClass,
  normalizeRogueliteProfileLevel,
} from '../profileClass';

describe('personal roguelite class configuration', () => {
  const definition = {
    id: 'barbarian',
    name: 'Bárbaro',
    level: 9,
    rating: 5,
    attributes: { destreza: 'd12' },
    equipment: { weapons: [{ name: 'Hacha antigua' }] },
    equippedItems: { mainHand: { name: 'Hacha antigua' } },
    money: 400,
    tags: ['sangrado'],
    classLevels: [{ title: 'Furia', acquired: true, completed: true }],
  };

  test('starts a newly unlocked class at level one with clean player state', () => {
    const profileClass = createRogueliteProfileClass(definition, undefined, 'Ada');

    expect(profileClass).toMatchObject({
      id: 'barbarian',
      templateId: 'barbarian',
      owner: 'Ada',
      profileType: 'rogueliteClass',
      level: 1,
      rating: 1,
      attributes: {
        destreza: 'd4',
        vigor: 'd4',
        intelecto: 'd4',
        voluntad: 'd4',
      },
      equipment: { weapons: [], armor: [], abilities: [], objects: [], accessories: [] },
      equippedItems: { mainHand: null, offHand: null, body: null },
      money: 0,
      tags: [],
      classLevels: [{ title: 'Furia', acquired: false, completed: false }],
    });
  });

  test('restores one profile configuration without affecting the global definition', () => {
    const profileClass = createRogueliteProfileClass(
      definition,
      { level: 4, attributes: { destreza: 'd8' }, money: 12 },
      'Bran',
    );

    expect(profileClass.level).toBe(4);
    expect(profileClass.attributes).toEqual({ destreza: 'd8' });
    expect(profileClass.money).toBe(12);
    expect(definition.level).toBe(9);
    expect(definition.attributes.destreza).toBe('d12');
  });

  test('keeps master-owned class presentation and combat data read-only for player profiles', () => {
    const masterDefinition = {
      ...definition,
      subtitle: 'Furia desatada',
      description: 'Convierte el riesgo en fuerza.',
      image: 'master.webp',
      actionDice: ['d8', 'd6', 'd4'],
      lifeInitial: 6,
      maxLife: 8,
      defenseClass: 7,
      maxDefenseClass: 9,
      movement: 2,
      maxMovement: 4,
      initiativeBase: 2,
      maxInitiative: 5,
      resource: { name: 'Furia', maximum: 3, initial: 0 },
    };
    const profileClass = createRogueliteProfileClass(
      masterDefinition,
      {
        name: 'Nombre del jugador',
        subtitle: 'Subtítulo del jugador',
        description: 'Leyenda del jugador',
        image: 'player.webp',
        actionDice: ['d20', 'd20', 'd20'],
        maxLife: 99,
        resource: { name: 'Otro recurso', maximum: 99 },
        classLevels: [{ title: 'Progresión del jugador' }],
        level: 4,
      },
      'Bran',
    );

    expect(profileClass).toMatchObject({
      name: 'Bárbaro',
      subtitle: 'Furia desatada',
      description: 'Convierte el riesgo en fuerza.',
      image: 'master.webp',
      actionDice: ['d8', 'd6', 'd4'],
      lifeInitial: 6,
      maxLife: 8,
      defenseClass: 7,
      maxDefenseClass: 9,
      movement: 2,
      maxMovement: 4,
      initiativeBase: 2,
      maxInitiative: 5,
      resource: { name: 'Furia', maximum: 3, initial: 0 },
      classLevels: [{ title: 'Furia', acquired: false, completed: false }],
      level: 4,
    });
  });

  test('keeps personal levels inside the ten-level range', () => {
    expect(normalizeRogueliteProfileLevel(0)).toBe(1);
    expect(normalizeRogueliteProfileLevel(7.9)).toBe(7);
    expect(normalizeRogueliteProfileLevel(40)).toBe(10);
  });

  test('clamps a profile when the master shortens a configured progression', () => {
    const profileClass = createRogueliteProfileClass(
      {
        ...definition,
        rogueliteProgressionConfigured: true,
        classLevels: [{ title: 'Uno' }, { title: 'Dos' }, { title: 'Tres' }],
      },
      { level: 8 },
      'Ada',
    );

    expect(profileClass.level).toBe(3);
  });

  test('derives effective statistics from the personal level without changing the template', () => {
    const masterDefinition = {
      ...definition,
      maxLife: 8,
      maxMovement: 2,
      resource: { name: 'Furia', maximum: 3 },
      classLevels: [
        { title: 'Inicio', effects: [] },
        { title: 'Vitalidad', effects: [{ target: 'life.max', operation: 'add', value: 1 }] },
        { title: 'Reserva', effects: [{ target: 'resource.max', operation: 'add', value: 2 }] },
      ],
    };

    const levelTwo = createRogueliteProfileClass(masterDefinition, { level: 2 }, 'Ada');
    const levelThree = createRogueliteProfileClass(masterDefinition, { level: 3 }, 'Bran');

    expect(levelTwo).toMatchObject({ level: 2, maxLife: 9, resource: { maximum: 3 } });
    expect(levelThree).toMatchObject({ level: 3, maxLife: 9, resource: { maximum: 5 } });
    expect(masterDefinition).toMatchObject({ maxLife: 8, resource: { maximum: 3 } });
  });
});
