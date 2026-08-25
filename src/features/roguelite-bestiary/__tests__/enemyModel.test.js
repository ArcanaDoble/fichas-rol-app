import {
  createEmptyRogueliteEnemy,
  createRogueliteEnemyTokenPayload,
  mergeRogueliteEnemySnapshot,
  normalizeRogueliteEnemy,
  normalizeRogueliteEnemyAbility,
  prepareRogueliteEnemyForFirestore,
  reorderRogueliteEnemies,
  sortRogueliteEnemies,
} from '../enemyModel';

describe('bestiario Roguelite', () => {
  test('normaliza estadísticas y mantiene entre una y cuatro ranuras', () => {
    const enemy = normalizeRogueliteEnemy({
      name: 'Acechador',
      equipmentSlotCount: 9,
      abilitySlotCount: 0,
      stats: {
        vida: { current: 12, max: 8 },
        ofensiva: { current: 5, max: 5 },
      },
    });

    expect(enemy.equipmentSlots).toHaveLength(4);
    expect(enemy.abilitySlots).toHaveLength(1);
    expect(enemy.stats.vida).toEqual({ current: 8, max: 8 });
    expect(enemy.stats.ofensiva.max).toBe(5);
  });

  test('limita a veinte todos los bloques de estadísticas', () => {
    const enemy = normalizeRogueliteEnemy({
      stats: {
        vida: { current: 80, max: 99 },
        cd: { current: 22, max: 45 },
        movimiento: { current: 30, max: 30 },
        iniciativa: { current: 21, max: 21 },
        ofensiva: { current: 200, max: 200 },
      },
    });

    Object.values(enemy.stats).forEach((stat) => expect(stat).toEqual({ current: 20, max: 20 }));
  });

  test('reordena tarjetas y genera posiciones persistibles', () => {
    const enemies = [
      { id: 'uno', sortOrder: 0 },
      { id: 'dos', sortOrder: 1 },
      { id: 'tres', sortOrder: 2 },
    ];
    const reordered = reorderRogueliteEnemies(enemies, 'tres', 'uno');

    expect(reordered.map((enemy) => enemy.id)).toEqual(['tres', 'uno', 'dos']);
    expect(reordered.map((enemy) => enemy.sortOrder)).toEqual([0, 1, 2]);
    expect(sortRogueliteEnemies([...reordered].reverse()).map((enemy) => enemy.id)).toEqual(['tres', 'uno', 'dos']);
  });

  test('crea un token enemigo aislado del perfil de clase', () => {
    const base = createEmptyRogueliteEnemy();
    const payload = createRogueliteEnemyTokenPayload({
      ...base,
      id: 'enemy-1',
      name: 'Guardia de ceniza',
      image: 'guardia-retrato.webp',
      imageSource: 'guardia-original.webp',
      threatDie: 'd8',
      equipmentSlots: [{ id: 'sword-1', name: 'Mandoble', type: 'weapon' }, null, null],
      abilitySlots: [{ id: 'skill-1', name: 'Carga', description: 'Avanza.' }, null, null],
    });

    expect(payload).toEqual(expect.objectContaining({
      profileType: 'rogueliteEnemy',
      linkedEnemyId: 'enemy-1',
      controlledBy: ['master'],
      teamId: 'enemies',
      threatDie: 'd8',
      portrait: 'guardia-retrato.webp',
      img: 'guardia-original.webp',
      tokenImageSource: 'guardia-original.webp',
      tokenImageFit: 'contain',
    }));
    expect(payload.equippedItems).toHaveLength(1);
    expect(payload.enemyAbilities).toHaveLength(1);
    expect(payload.inventory).toHaveLength(2);
    expect(payload.inventory.some((item) => Object.prototype.hasOwnProperty.call(item, 'payload'))).toBe(false);
  });

  test('elimina valores undefined antes de escribir enemigos y tokens', () => {
    expect(prepareRogueliteEnemyForFirestore({ name: 'Lobo', missing: undefined, slots: [undefined] }))
      .toEqual({ name: 'Lobo', slots: [null] });
  });

  test('normaliza las reglas reutilizables de una habilidad enemiga', () => {
    expect(normalizeRogueliteEnemyAbility({
      name: 'Barrido',
      dano: '1d6',
      alcance: 'Arma',
      rasgos: 'Derribo, Empuje',
    })).toEqual(expect.objectContaining({
      name: 'Barrido',
      damage: '1d6',
      range: 'Arma',
      traits: ['Derribo', 'Empuje'],
    }));
  });

  test('conserva el arte de cabecera y sanea su encuadre persistido', () => {
    expect(normalizeRogueliteEnemy({
      headerImage: 'cabecera.webp',
      imageCrop: { x: 8, y: 12, width: 84, height: 42 },
      imageFocus: { x: 34, y: 29 },
      headerFocus: { x: 68, y: 38 },
    })).toEqual(expect.objectContaining({
      headerImage: 'cabecera.webp',
      imageCrop: { x: 8, y: 12, width: 84, height: 42 },
      imageFocus: { x: 0.34, y: 0.29 },
      headerFocus: { x: 0.68, y: 0.38 },
    }));
  });

  test('no duplica una tarjeta local cuando aparece su primer snapshot remoto', () => {
    const localDraft = {
      ...createEmptyRogueliteEnemy(),
      id: 'enemy-new',
      name: 'Acechador local',
      _localOnly: true,
      _dirty: true,
    };
    const remote = normalizeRogueliteEnemy({ id: 'enemy-new', name: 'Acechador remoto' });

    expect(mergeRogueliteEnemySnapshot([localDraft], [remote])).toEqual([localDraft]);
  });

  test('conserva otros borradores locales mientras incorpora el snapshot', () => {
    const localOnly = { ...createEmptyRogueliteEnemy(), id: 'enemy-pending', _localOnly: true, _dirty: true };
    const remote = normalizeRogueliteEnemy({ id: 'enemy-saved', name: 'Guardia' });

    expect(mergeRogueliteEnemySnapshot([localOnly], [remote]).map((enemy) => enemy.id))
      .toEqual(['enemy-saved', 'enemy-pending']);
  });
});
