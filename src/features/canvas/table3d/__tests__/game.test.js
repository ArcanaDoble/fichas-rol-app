const {
  createGame,
  applyGameCommand,
  projectGame,
  getWorldPosition,
  getSlots,
} = require('../game.cjs');

const master = { role: 'master', name: 'Arcana' };
const player = (n) => ({
  role: 'player',
  seatId: 'puesto' + n,
  name: 'Jugador ' + n,
});
const barbarian = {
  id: 'barbaro',
  name: 'Bran',
  className: 'Bárbaro',
  isBarbarian: true,
  life: 8,
  defense: 5,
  actionDice: [8, 6, 4],
  pool: [
    {
      id: 'hacha',
      name: 'Hacha',
      kind: 'weapon',
      dice: [6],
      hands: 1,
      thrown: true,
      range: 1,
      image: '/hacha.webp',
    },
    {
      id: 'mandoble',
      name: 'Mandoble',
      kind: 'weapon',
      dice: [8, 8],
      hands: 2,
      heavy: true,
    },
    { id: 'escudo', name: 'Escudo', kind: 'shield' },
    { id: 'pocion', name: 'Poción', kind: 'item' },
  ],
};
const rogue = {
  ...barbarian,
  id: 'picaro',
  name: 'Mella',
  className: 'Pícaro',
  isBarbarian: false,
};
const goblin = 'patio:enemy:duende';
const base = {
  id: 'patio',
  name: 'Patio de Ceniza',
  cols: 8,
  rows: 6,
  enemies: [
    {
      id: 'duende',
      name: 'Duende',
      x: 4.5,
      z: 2.5,
      life: 5,
      defense: 5,
      offense: 3,
      dice: [6],
    },
  ],
};
const piece = (n, s) => 'puesto' + n + ':' + s;
function table(scene = base) {
  let state = createGame({ id: 'expedicion', title: 'Ensayo', scene });
  const run = (c, a = master) => (state = applyGameCommand(state, c, a));
  const join = (n, character = n === 2 ? rogue : barbarian) =>
    run(
      { type: 'seat', seatId: 'puesto' + n, name: 'Jugador ' + n, character },
      player(n)
    );
  const drop = (id, extra, a = master) =>
    run({ type: 'drop', pieceId: id, ...extra }, a);
  const roll = (id, value, a = master) =>
    run({ type: 'roll', pieceId: id, value, x: 2, z: 4 }, a);
  const dock = (id, parentId, slot, a = master) =>
    drop(id, { parentId, slot }, a);
  return {
    get state() {
      return state;
    },
    run,
    join,
    drop,
    roll,
    dock,
  };
}
const poised = (t) => {
  t.join(1);
  t.join(2);
  t.drop(piece(1, 'peana'), { x: 3.5, z: 2.5 });
  t.drop(piece(2, 'peana'), { x: 0.5, z: 5.5 });
  t.dock(piece(1, 'equipo1'), piece(1, 'mat'), 'hand1');
  t.roll(piece(1, 'accion1'), 6);
  t.drop(piece(1, 'accion1'), { targetId: goblin });
};

test('cuatro puestos conservan ejemplares independientes aunque coincida la clase', () => {
  const t = table();
  for (let n = 1; n <= 4; n++) t.join(n, barbarian);
  expect(Object.keys(t.state.seats)).toHaveLength(4);
  const ids = Object.values(t.state.pieces)
    .filter((p) => p.catalogId === 'hacha')
    .map((p) => p.id);
  expect(new Set(ids).size).toBe(4);
  t.drop(piece(1, 'vida1'), { x: 0.5, z: 0.5 }, player(3));
  expect(t.state.seats.puesto1.life).toBe(7);
  expect(t.state.seats.puesto3.life).toBe(8);
  expect(() => t.join(5)).toThrow();
  expect(() =>
    t.run({ type: 'seat', seatId: 'puesto4', character: rogue }, player(1))
  ).toThrow();
});

test('una pieza encajada acompaña a la tablilla y puede pasar a otro puesto con sus dados', () => {
  const t = table();
  t.join(1);
  t.join(2);
  const card = piece(1, 'equipo1'),
    die = card + ':die1';
  t.dock(card, piece(1, 'mat'), 'hand1');
  const first = getWorldPosition(t.state, die),
    old = getWorldPosition(t.state, piece(1, 'mat'));
  t.drop(piece(1, 'mat'), { x: old.x + 3, z: old.z - 2 }, player(2));
  expect(getWorldPosition(t.state, die).x - first.x).toBeCloseTo(3);
  t.dock(card, piece(2, 'mat'), 'hand1', player(2));
  expect(t.state.pieces[die].parentId).toBe(card);
  expect(t.state.pieces[card].parentId).toBe(piece(2, 'mat'));
  expect(t.state.pieces[card].width).toBe(0.84);
  expect(t.state.pieces[card].controllerSeat).toBe('puesto2');
  const hp = piece(1, 'vida1');
  t.drop(hp, { x: -2, z: 1 });
  const loose = getWorldPosition(t.state, hp);
  t.drop(piece(1, 'mat'), { x: 10, z: 10, yaw: 0.6 });
  expect(getWorldPosition(t.state, hp)).toEqual(loose);
});

test('dos manos ocupan dos huecos; el descarte y las bolsas siguen siendo recuperables', () => {
  const t = table();
  t.join(1);
  t.join(2);
  const mat = piece(1, 'mat'),
    long = piece(1, 'equipo2');
  t.dock(long, mat, 'hand2');
  expect(t.state.pieces[long].slot).toBe('hand1');
  expect(() => t.dock(piece(1, 'equipo3'), mat, 'hand2')).toThrow(
    /dos huecos|ocupado/
  );
  t.dock(long, 'caja');
  t.dock(piece(1, 'equipo4'), piece(2, 'bolsa'));
  t.run({ type: 'bag', pieceId: piece(2, 'bolsa') }, player(1));
  expect(t.state.pieces[piece(2, 'bolsa')].open).toBe(true);
  expect(
    projectGame(t.state, 'puesto1').pieces[piece(1, 'equipo4')].parentId
  ).toBe(piece(2, 'bolsa'));
  expect(
    getSlots(t.state.pieces[mat]).filter((s) => s.id.startsWith('reserve'))
  ).toHaveLength(3);
});

test('el golpe normal conserva el hacha equipada y la cara de los dados al moverlos', () => {
  const t = table();
  poised(t);
  const die = piece(1, 'equipo1:die1');
  t.roll(die, 4, player(2));
  expect(t.state.pieces[piece(1, 'equipo1')].slot).toBe('hand1');
  expect(t.state.attacks[0].pressure).toBe(10);
  const rollId = t.state.pieces[die].rollId;
  t.drop(die, { x: 2, z: 4 }, player(2));
  expect(t.state.pieces[die].rollId).toBe(rollId);
  expect(t.state.pieces[die].value).toBe(4);
  t.run({ type: 'resolve', targetId: goblin });
  expect(t.state.pieces[goblin].life).toBe(3);
  expect(() => t.run({ type: 'resolve', targetId: goblin })).toThrow();
});

test('arrojadiza aterriza en la casilla y otro jugador se la equipa aun fuera de alcance', () => {
  const t = table();
  poised(t);
  const axe = piece(1, 'equipo1');
  t.drop(axe, { targetId: goblin, values: [4] }, player(1));
  expect(t.state.pieces[axe]).toMatchObject({
    slot: null,
    sceneId: 'patio',
  });
  const impact = t.state.pieces[axe];
  expect([Math.floor(impact.x), Math.floor(impact.z)]).toEqual([4, 2]);
  expect(Math.hypot(impact.x - 4.5, impact.z - 2.5)).toBeGreaterThan(0.4);
  expect(t.state.attacks[0]).toMatchObject({ pressure: 9, penalty: 1 });
  t.run({ type: 'resolve', targetId: goblin });
  t.dock(axe, piece(2, 'mat'), 'hand1', player(2));
  expect(t.state.pieces[axe]).toMatchObject({
    parentId: piece(2, 'mat'),
    controllerSeat: 'puesto2',
  });
  expect(t.state.log[t.state.log.length - 1]).toMatchObject({
    actor: 'Jugador 2',
    warning: true,
  });
  expect(t.state.pieces[axe].image).toBe('/hacha.webp');
  expect(t.state.pieces[goblin].life).toBe(4);
});

test('Exponerse y la reserva se resuelven sobre la mesa; las brasas se convierten en dados de arma', () => {
  const t = table();
  t.join(1);
  const token = piece(1, 'peana'),
    mat = piece(1, 'mat');
  t.drop(token, { x: 4.5, z: 3.5 });
  t.dock(piece(1, 'equipo1'), mat, 'hand1');
  t.roll(piece(1, 'accion2'), 4);
  t.dock(piece(1, 'accion2'), mat, 'reserve2');
  t.run({ type: 'enemyAttack', pieceId: goblin, targetId: token, values: [6] });
  t.drop(piece(1, 'exponerse'), { targetId: goblin, value: 5 }, player(1));
  t.drop(piece(1, 'accion2'), { targetId: token }, player(1));
  expect(t.state.attacks[0]).toMatchObject({ pressure: 14, exposed: true });
  t.run({ type: 'resolve', targetId: token });
  expect(t.state.seats.puesto1).toMatchObject({ life: 6, fury: 2 });
  const ember = Object.values(t.state.pieces).find((p) => p.kind === 'ember');
  t.drop(ember.id, { targetId: piece(1, 'equipo1') }, player(1));
  expect(t.state.seats.puesto1.fury).toBe(1);
  expect(
    Object.values(t.state.pieces).find((p) => p.role === 'fury')
  ).toMatchObject({ sides: 6, parentId: piece(1, 'equipo1') });
});

test('una moneda sigue en el fondo común aunque varios jugadores la muevan', () => {
  const t = table();
  t.join(1);
  t.join(2);
  t.run({ type: 'supply', kind: 'coin', x: 1, z: 4, amount: 2 });
  const id = Object.values(t.state.pieces).find((p) => p.kind === 'coin').id;
  t.dock(id, piece(1, 'bolsa'), undefined, player(1));
  t.dock(id, piece(2, 'bolsa'), undefined, player(2));
  expect(t.state.gold).toBe(2);
});

test('la última moneda depositada en un montón queda arriba en todas las perspectivas', () => {
  const t = table();
  t.join(1);
  t.join(2);
  for (let i = 0; i < 2; i++)
    t.run({ type: 'supply', kind: 'coin', x: 2, z: 4 });
  const [first, second] = Object.values(t.state.pieces).filter(
    (p) => p.kind === 'coin'
  );
  const spot = { x: 2.5, z: 3.5 };
  t.drop(first.id, spot, player(1));
  t.drop(second.id, spot, player(2));
  expect(t.state.pieces[second.id].stackOrder).toBeGreaterThan(
    t.state.pieces[first.id].stackOrder
  );
  t.drop(first.id, spot, player(2));
  const other = projectGame(t.state, 'puesto1');
  expect(other.pieces[first.id].stackOrder).toBeGreaterThan(
    other.pieces[second.id].stackOrder
  );
  expect(t.state.gold).toBe(2);
});

test('el carril de gasto deja espacio al d6 de Exponerse y presenta tres dados diferentes', () => {
  const t = table();
  t.join(1);
  const mat = piece(1, 'mat'),
    slots = getSlots(t.state.pieces[mat]);
  const spent = slots.find((s) => s.id === 'spent'),
    expose = slots.find((s) => s.id === 'expose');
  expect(
    spent.x - spent.width / 2 - (expose.x + expose.width / 2)
  ).toBeGreaterThan(0.1);
  const dice = [3, 1, 2].map((n) => piece(1, 'accion' + n));
  dice.forEach((id) => t.dock(id, mat, 'spent'));
  const snapshot = projectGame(t.state, 'master');
  const xs = dice.map((id) => snapshot.pieces[id].x).sort((a, b) => a - b);
  expect(xs[1] - xs[0]).toBeGreaterThan(0.48);
  expect(xs[2] - xs[1]).toBeGreaterThan(0.48);
  expect(xs[0] - 0.275).toBeGreaterThanOrEqual(
    spent.x - spent.width / 2 - 0.001
  );
  expect(xs[2] + 0.275).toBeLessThanOrEqual(spent.x + spent.width / 2 + 0.001);
});

test('arrojar junto al borde de una peana 2 × 2 respeta la última casilla del mapa', () => {
  const t = table({
    ...base,
    enemies: [{ ...base.enemies[0], width: 2, depth: 2, x: 7, z: 5 }],
  });
  t.join(1);
  t.drop(piece(1, 'peana'), { x: 6.5, z: 4.5 });
  t.dock(piece(1, 'equipo1'), piece(1, 'mat'), 'hand1');
  t.roll(piece(1, 'accion1'), 8);
  t.drop(piece(1, 'accion1'), { targetId: goblin });
  t.drop(piece(1, 'equipo1'), { targetId: goblin, x: 8, z: 6, values: [5] });
  const landed = t.state.pieces[piece(1, 'equipo1')];
  expect([Math.floor(landed.x), Math.floor(landed.z)]).toEqual([7, 5]);
  expect(landed.x).toBeGreaterThan(7.5);
  expect(landed.z).toBeGreaterThan(5.5);
});

test('la perspectiva oculta identidad, dados, registro y arte original de una criatura secreta', () => {
  const t = table({
    ...base,
    image: 'https://images.test/secreto.webp',
    enemies: [
      {
        id: 'privado',
        name: 'Guardián secreto',
        x: 4.5,
        z: 2.5,
        hidden: true,
        dice: [6],
      },
    ],
  });
  t.join(1);
  t.drop(piece(1, 'peana'), { x: 4.5, z: 3.5 });
  t.run({
    type: 'enemyAttack',
    pieceId: 'patio:enemy:privado',
    targetId: piece(1, 'peana'),
    values: [3],
  });
  const projected = projectGame(t.state, 'puesto1');
  expect(projected.scenes.patio.mapProtected).toBe(true);
  expect(JSON.stringify(projected)).not.toMatch(
    /privado|Guardián secreto|images\.test|secreto\.webp/
  );
  expect(() =>
    t.drop('patio:enemy:privado', { x: 0, z: 0 }, player(1))
  ).toThrow();
  t.run({ type: 'reveal', pieceId: 'patio:enemy:privado' });
  expect(
    projectGame(t.state, 'puesto1').pieces['patio:enemy:privado']
  ).toBeDefined();
});

test('la copa produce sombra y se funde para el observador bajo ella, con visión separada por puesto', () => {
  const tree = {
    id: 'arbol',
    kind: 'tree',
    x: 3,
    z: 2.5,
    width: 2,
    depth: 2,
    visionMode: 'canopy',
    trunkRatio: 0.25,
  };
  const t = table({ ...base, terrain: [tree], fogOfWar: true });
  t.join(1);
  t.join(2);
  t.drop(piece(1, 'peana'), { x: 1.5, z: 2.5 });
  t.drop(piece(2, 'peana'), { x: 4.5, z: 3.5 });
  expect(projectGame(t.state, 'puesto1').pieces[goblin]).toBeUndefined();
  expect(projectGame(t.state, 'puesto2').pieces[goblin]).toBeDefined();
  t.drop(piece(1, 'peana'), { x: 3.5, z: 2.5 });
  const updated = projectGame(t.state, 'puesto1');
  expect(updated.scenes.patio.terrain[0].faded).toBe(true);
  expect(updated.pieces[goblin]).toBeDefined();
});

test('la niebla pintada, el humo y la oscuridad siguen reglas distintas', () => {
  const t = table({ ...base, darkness: 1 });
  t.join(1);
  t.drop(piece(1, 'peana'), { x: 2.5, z: 2.5 });
  expect(projectGame(t.state, 'puesto1').pieces[goblin]).toBeUndefined();
  t.run({ type: 'supply', kind: 'trait', radius: 4, x: 2.5, z: 2.5 });
  const trait = Object.values(t.state.pieces).find((p) => p.kind === 'trait');
  t.dock(trait.id, piece(1, 'mat'), 'vision');
  expect(projectGame(t.state, 'puesto1').pieces[goblin]).toBeDefined();
  t.run({
    type: 'terrain',
    terrain: {
      id: 'nube',
      kind: 'smoke',
      x: 4.5,
      z: 2.5,
      width: 1.8,
      depth: 1.8,
    },
  });
  expect(projectGame(t.state, 'puesto1').pieces[goblin]).toBeUndefined();
  t.run({ type: 'terrain', removeId: 'nube' });
  t.run({
    type: 'terrain',
    terrain: { id: 'niebla', kind: 'fog', x: 4.5, z: 2.5, width: 1, depth: 1 },
  });
  expect(projectGame(t.state, 'puesto1').pieces[goblin]).toBeUndefined();
  expect(() => t.run({ type: 'darkness', value: 0 }, player(1))).toThrow();
});

test('la perspectiva parte de la entrada y conserva la última casilla del aventurero al recoger su peana', () => {
  const tree = {
    id: 'olmo',
    kind: 'tree',
    x: 3,
    z: 2.5,
    width: 2,
    depth: 2,
    visionMode: 'canopy',
  };
  const left = { x: 1.5, z: 2.5 },
    right = { x: 4.5, z: 3.5 };
  const t = table({ ...base, entrance: left, terrain: [tree] });
  t.join(1);
  t.join(2);
  const one = piece(1, 'peana'),
    two = piece(2, 'peana');
  const view = (n, id = goblin) =>
    projectGame(t.state, 'puesto' + n).pieces[id];
  expect(view(1)).toBeUndefined();
  t.drop(two, right, player(2));
  expect(view(2)).toBeDefined();
  t.drop(one, right, player(2));
  t.dock(one, piece(1, 'mat'), 'portrait', player(2));
  expect(view(1)).toBeDefined();
  t.drop(one, left, player(2));
  t.dock(one, piece(1, 'mat'), 'portrait');
  expect(view(1)).toBeUndefined();
  expect(view(2)).toBeDefined();
  t.run({
    type: 'scene',
    scene: { ...base, id: 'cripta', entrance: right, terrain: [tree] },
  });
  expect(view(1, 'cripta:enemy:duende')).toBeDefined();
  t.run({ type: 'scene', sceneId: 'patio' });
  expect(view(1)).toBeUndefined();
});

test('viajar conserva las posiciones, el material abandonado y la información de otras escenas en la sesión del máster', () => {
  const t = table();
  t.join(1);
  const id = piece(1, 'equipo1');
  t.drop(id, { x: 3.25, z: 4.2 });
  t.dock(piece(1, 'equipo3'), piece(1, 'mat'), 'hand1');
  t.run({
    type: 'scene',
    scene: { id: 'cripta', name: 'Cripta privada', cols: 7, rows: 3 },
  });
  expect(projectGame(t.state, 'puesto1').pieces[id]).toBeUndefined();
  expect(
    projectGame(t.state, 'puesto1').pieces[piece(1, 'equipo3')]
  ).toBeDefined();
  t.run({ type: 'scene', sceneId: 'patio' });
  expect(projectGame(t.state, 'puesto1').pieces[id]).toMatchObject({
    x: 3.25,
    z: 4.2,
  });
  expect(JSON.stringify(projectGame(t.state, 'puesto1'))).not.toMatch(
    /Cripta privada/
  );
  expect(projectGame(t.state, 'master').scenes.cripta).toBeDefined();
});

test('la orientación física y la cara sobreviven al recogerse y el dado se endereza en su hueco', () => {
  const t = table();
  t.join(1);
  const id = piece(1, 'accion2');
  t.run({
    type: 'roll',
    pieceId: id,
    value: 3,
    x: 1,
    z: 2,
    orientation: [0, 0.6, 0, 0.8],
  });
  t.drop(id, { x: 2, z: 3 }, player(1));
  expect(t.state.pieces[id]).toMatchObject({
    value: 3,
    orientation: [0, 0.6, 0, 0.8],
  });
  t.dock(id, piece(1, 'mat'), 'reserve1');
  expect(t.state.pieces[id].orientation).toBeUndefined();
  expect(t.state.pieces[id].value).toBe(3);
});

test('el máster puede oponer el perfil defensivo de una criatura sin sumar su Base ofensiva', () => {
  const t = table();
  poised(t);
  t.roll(piece(1, 'equipo1:die1'), 4);
  t.drop(goblin + ':die1', { targetId: goblin, value: 6 });
  expect(t.state.attacks[0].defenseDice.map((d) => d.value)).toEqual([6]);
  t.run({ type: 'resolve', targetId: goblin });
  expect(t.state.pieces[goblin].life).toBe(5);
  expect(t.state.attacks[0].finalPressure).toBe(4);
});

test('un crítico máximo engendra un dado físico de Fractura que puede encadenar', () => {
  const t = table();
  const criticalClass = {
    ...barbarian,
    pool: [{ ...barbarian.pool[0], critical: true }],
  };
  t.join(1, criticalClass);
  t.drop(piece(1, 'peana'), { x: 3.5, z: 2.5 });
  t.dock(piece(1, 'equipo1'), piece(1, 'mat'), 'hand1');
  t.roll(piece(1, 'accion1'), 5);
  t.drop(piece(1, 'accion1'), { targetId: goblin });
  t.roll(piece(1, 'equipo1:die1'), 6);
  const fracture = Object.values(t.state.pieces).find(
    (p) => p.role === 'critical'
  );
  expect(fracture).toMatchObject({
    sides: 6,
    rolled: false,
    sourceId: piece(1, 'equipo1'),
  });
  t.roll(fracture.id, 6);
  const chain = Object.values(t.state.pieces).filter(
    (p) => p.role === 'critical'
  );
  expect(chain).toHaveLength(2);
  expect(t.state.attacks[0].pressure).toBe(17);
  t.drop(fracture.id, { targetId: goblin });
  expect(
    Object.values(t.state.pieces).filter((p) => p.role === 'critical')
  ).toHaveLength(2);
});

test('el estado anterior, la escena de origen y la autorización de máster permanecen independientes', () => {
  const t = table({ ...base, terrain: [] });
  t.join(1);
  const previous = t.state;
  t.run({
    type: 'terrain',
    terrain: { id: 'vela', kind: 'light', x: 1, z: 1, radius: 3 },
  });
  t.drop(piece(1, 'vida1'), { x: 0, z: 0 });
  expect(previous.scenes.patio.terrain).toEqual([]);
  expect(previous.seats.puesto1.life).toBe(8);
  expect(() => t.run({ type: 'scene', sceneId: 'patio' }, player(1))).toThrow(
    /máster/
  );
  expect(() =>
    t.run({ type: 'scene', scene: { id: 'gigante', cols: 101, rows: 3 } })
  ).toThrow(/100/);
  expect(() =>
    t.run({ type: 'scene', scene: { id: '__proto__', cols: 4, rows: 4 } })
  ).toThrow();
});

test('las tres tiradas iniciales fijan iniciativa y la siguiente ronda vuelve a ofrecer todos los dados', () => {
  const t = table();
  t.join(1);
  t.join(2);
  for (const [n, faces] of [
    [1, [8, 2, 1]],
    [2, [6, 2, 1]],
  ]) {
    faces.forEach((value, index) =>
      t.roll(piece(n, 'accion' + (index + 1)), value, player(n))
    );
  }
  expect(t.state.seats.puesto1.initiative).toBe(10);
  expect(t.state.seats.puesto2.initiative).toBe(10);
  t.dock(piece(2, 'accion2'), piece(2, 'mat'), 'reserve1');
  for (let i = 0; i < 3; i++) t.run({ type: 'turn' });
  expect(t.state.round).toBe(2);
  expect(t.state.pieces[piece(2, 'accion2')]).toMatchObject({
    rolled: false,
    slot: 'action2',
    reserved: false,
  });
  expect(t.state.seats.puesto2.initiative).toBe(10);
});

test('la recompensa de la sala es de dos monedas por jugador y se contabiliza una sola vez', () => {
  const t = table({ ...base, enemies: [{ ...base.enemies[0], life: 1 }] });
  poised(t);
  t.roll(piece(1, 'equipo1:die1'), 6);
  t.run({ type: 'resolve', targetId: goblin });
  const coins = Object.values(t.state.pieces).filter((p) => p.kind === 'coin');
  expect(coins).toHaveLength(4);
  expect(t.state.gold).toBe(4);
  t.dock(coins[0].id, piece(2, 'bolsa'));
  expect(t.state.gold).toBe(4);
});

test('las peanas pequeñas entran en duelo también al mover el enemigo y una criatura grande conserva su tamaño', () => {
  const t = table();
  t.join(1);
  t.join(2, { ...rogue, size: 2 });
  t.drop(piece(1, 'peana'), { x: 2.5, z: 2.5 });
  t.drop(goblin, { x: 2.5, z: 2.5 });
  expect(t.state.pieces[piece(1, 'peana')].inDuel).toBe(true);
  t.drop(goblin, { x: 5.5, z: 1.5 });
  expect(t.state.pieces[piece(1, 'peana')].inDuel).toBe(false);
  t.drop(piece(2, 'peana'), { x: 5.5, z: 1.5 });
  expect(t.state.pieces[piece(2, 'peana')]).toMatchObject({
    width: 2,
    depth: 2,
    inDuel: false,
  });
});

test('ambos cuerpos de un dado percentil conservan la pose hasta volver a su ranura', () => {
  const t = table();
  t.join(1, { ...barbarian, actionDice: [100, 6, 4] });
  const id = piece(1, 'accion1'),
    pair = [
      [0, 0, 0, 1],
      [0.6, 0, 0.8, 0],
    ];
  t.run({
    type: 'roll',
    pieceId: id,
    x: 0.5,
    z: 0.5,
    value: 100,
    orientation: [0, 0, 0, 1],
    percentileOrientation: pair,
  });
  expect(projectGame(t.state, 'puesto1').pieces[id]).toMatchObject({
    value: 100,
    percentileOrientation: pair,
  });
  t.dock(id, piece(1, 'mat'), 'action1');
  expect(t.state.pieces[id].percentileOrientation).toBeUndefined();
});
