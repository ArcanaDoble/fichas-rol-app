const {
  EQUIPMENT,
  children,
  getSlots,
  getWorldPosition,
  parentMat,
  placeIn,
  placeOnTable,
} = require('./gamePieces.cjs');
const { insideMap, makeSight } = require('./gameVision.cjs');

const actorTypes = ['token', 'enemy'];
const currentSeat = (state, piece) =>
  state.seats[
    (piece?.assignedTo && piece.controllerSeat) ||
      parentMat(state, piece)?.seatId ||
      piece?.controllerSeat ||
      piece?.seatId
  ];
const incoming = (state, target) =>
  state.attacks.find(
    (a) =>
      a.sceneId === state.sceneId &&
      a.targetId === target?.id &&
      a.status === 'defending'
  );
const declared = (state, id, targetId) =>
  state.attacks.find(
    (a) =>
      a.sceneId === state.sceneId &&
      a.attackerId === id &&
      a.status !== 'resolved' &&
      (!targetId || a.targetId === targetId)
  );
const sum = (dice) => dice.reduce((value, die) => value + (die.value || 0), 0);
const result = (text, refs = [], warning = false) => ({ text, refs, warning });
const requirePiece = (p, kind) => {
  if (!p || (kind && p.kind !== kind))
    throw new Error('Elige una pieza válida de la mesa.');
  return p;
};

function cellDistance(state, a, b) {
  const p = getWorldPosition(state, a),
    q = getWorldPosition(state, b);
  if (!p || !q) return Infinity;
  const x = Math.abs(Math.floor(p.x) - Math.floor(q.x));
  const z = Math.abs(Math.floor(p.z) - Math.floor(q.z));
  const dx = Math.max(
    0,
    Math.floor((a.width || 1) / 2) + Math.floor((b.width || 1) / 2)
  );
  const dz = Math.max(
    0,
    Math.floor((a.depth || 1) / 2) + Math.floor((b.depth || 1) / 2)
  );
  return Math.max(0, x - dx, z - dz);
}

function rollFace(ctx, die, selected) {
  if (
    selected != null &&
    (!Number.isInteger(selected) || selected < 1 || selected > die.sides)
  )
    throw new Error('La cara de la tirada no pertenece a ese dado.');
  const id = ctx.newId(ctx.state, 'tirada');
  let seed = 2166136261;
  for (const ch of ctx.state.id + ':' + id + ':' + die.id)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const value = selected ?? ((seed >>> 0) % die.sides) + 1;
  Object.assign(die, { value, rolled: true, rollId: id });
  if (die.role === 'action') {
    const state = ctx.state,
      seat = currentSeat(state, die),
      encounter = state.encounters[state.sceneId];
    if (seat && encounter && encounter.scores[seat.tokenId] == null) {
      const opening =
        encounter.opening[seat.id] || (encounter.opening[seat.id] = {});
      if (opening[die.id] == null) opening[die.id] = value;
      if (Object.keys(opening).length === 3) {
        encounter.scores[seat.tokenId] =
          (seat.initiativeBase ?? 3) + Math.max(...Object.values(opening));
        if (
          !encounter.started &&
          Object.values(state.seats).every(
            (s) => encounter.scores[s.tokenId] != null
          )
        ) {
          state.turnId = activationOrder(state)[0]?.id || null;
        }
      }
    }
  }
  return value;
}
function newAttack(ctx, attacker, target) {
  if (
    !target ||
    !actorTypes.includes(target.kind) ||
    !attacker ||
    target.id === attacker.id
  )
    throw new Error('Elige una peana distinta para el ataque.');
  const attack = {
    id: ctx.newId(ctx.state, 'ataque'),
    sceneId: ctx.state.sceneId,
    attackerId: attacker.id,
    targetId: target.id,
    round: ctx.state.round,
    status: 'declared',
    pressure: 0,
    base: 0,
    penalty: 0,
    dice: [],
    defenseDice: [],
    weaponIds: [],
    warnings: [],
    damage: 0,
    exposed: false,
    critical: false,
  };
  ctx.state.attacks.push(attack);
  if (ctx.state.attacks.length > 50) {
    const old = ctx.state.attacks.findIndex((a) => a.status === 'resolved');
    if (old >= 0) ctx.state.attacks.splice(old, 1);
  }
  return attack;
}
function parkDie(state, die, target, attack, defending = false) {
  const row = defending ? attack.defenseDice : attack.dice;
  const index = row.length;
  die.parentId = target.id;
  die.sceneId = null;
  die.slot = (defending ? 'defense' : 'attack') + index;
  die.x = (defending ? -1 : 1) * (0.33 + (target.width || 1) / 2);
  die.z = ((index % 5) - 1) * 0.32;
  die.yaw = 0;
  die.assignedTo = target.id;
  row.push({
    id: die.id,
    sides: die.sides,
    value: die.value,
    role: die.role,
    rollId: die.rollId,
  });
  attack.pressure = Math.max(
    0,
    attack.base + sum(attack.dice) - attack.penalty
  );
}
function putDown(ctx, piece, x = ctx.c.x, z = ctx.c.z) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.max(Math.abs(x), Math.abs(z)) > 1000
  )
    throw new Error('Suelta la pieza sobre la mesa.');
  const angle = Number.isFinite(ctx.c.yaw) ? ctx.c.yaw : piece.yaw || 0;
  if (actorTypes.includes(piece.kind) && insideMap({ x, z }, ctx.scene)) {
    x = Math.floor(x) + 0.5;
    z = Math.floor(z) + 0.5;
  }
  placeOnTable(
    piece,
    piece.kind === 'mat' || piece.kind === 'box' ? null : ctx.state.sceneId,
    x,
    z,
    angle
  );
  if (piece.kind === 'coin') {
    piece.stackOrder = ++ctx.state.sequence;
    if (!piece.collected) {
      piece.collected = true;
      ctx.state.gold += piece.amount;
    }
  }
}
function actionOnTarget(ctx, die, target) {
  const { state } = ctx;
  const seat = currentSeat(state, die);
  if (!seat) throw new Error('El dado de acción necesita un puesto.');
  if (die.used || die.assignedTo)
    return result('El dado conserva su resultado.', [die.id]);
  if (!die.rolled) rollFace(ctx, die, ctx.c.value);
  if (target.id === seat.tokenId) {
    const attack = incoming(state, target);
    if (!attack) {
      putDown(ctx, die, target.x + 0.6, target.z);
      return result('Dado junto a ' + target.name + '.', [die.id, target.id]);
    }
    const reserved = die.slot?.startsWith('reserve') || die.reserved;
    parkDie(state, die, target, attack, true);
    die.used = true;
    die.reserved = false;
    return result(
      'Defensa de ' +
        target.name +
        ' · ' +
        sum(attack.defenseDice) +
        (reserved ? '' : ' · se ha usado un dado sin reservar.'),
      [die.id, target.id],
      !reserved
    );
  }
  const attacker = state.pieces[seat.tokenId];
  const attack =
    declared(state, attacker.id, target.id) || newAttack(ctx, attacker, target);
  die.controllerSeat = seat.id;
  parkDie(state, die, target, attack);
  return result(
    attacker.name +
      ' declara ataque a ' +
      target.name +
      ' con ' +
      die.value +
      '.',
    [attacker.id, target.id, die.id]
  );
}
function addWeaponDie(ctx, die, attack, gear, thrown = false) {
  if (attack.dice.some((d) => d.id === die.id))
    return result('El dado ya forma parte del ataque.', [die.id]);
  const { state } = ctx,
    attacker = state.pieces[attack.attackerId],
    target = state.pieces[attack.targetId];
  const distance = cellDistance(state, attacker, target);
  const actionDice = attack.dice.filter((d) => d.role === 'action');
  const reach = thrown
    ? Math.max(0, ...actionDice.map((d) => d.value))
    : gear.range;
  const adjacentTouch =
    !thrown &&
    reach === 0 &&
    distance === 1 &&
    (gear.hands === 1 || target.inDuel || attacker.inDuel);
  if (
    distance > reach &&
    !adjacentTouch &&
    !attack.warnings.includes('alcance')
  )
    attack.warnings.push('alcance');
  const suppressTraits =
    adjacentTouch &&
    !target.inDuel &&
    !/p[ií]caro/i.test(state.seats[attacker.seatId]?.className || '');
  if (
    !makeSight(state, attacker.seatId).visiblePiece(target) &&
    !attack.warnings.includes('visión')
  )
    attack.warnings.push('visión');
  const mat = parentMat(state, gear);
  if (
    (!mat || !gear.slot?.startsWith('hand')) &&
    !attack.warnings.includes('arma en la mano')
  )
    attack.warnings.push('arma en la mano');
  if (!attack.weaponIds.includes(gear.id)) attack.weaponIds.push(gear.id);
  const cost = attack.weaponIds.reduce(
    (n, id) => n + (state.pieces[id]?.heavy ? 2 : 1),
    0
  );
  if (
    actionDice.length < cost &&
    !attack.warnings.includes('coste de dados de acción')
  )
    attack.warnings.push('coste de dados de acción');
  if (gear.perforating && !suppressTraits) attack.perforating = true;
  if (
    die.role === 'fury' ||
    children(state, gear.id).some((p) => p.role === 'fury')
  )
    attack.empowered = true;
  if (thrown) attack.penalty = distance;
  attack.status = 'defending';
  parkDie(state, die, target, attack);
  if (die.value === die.sides) {
    attack.naturalMax = true;
    if (
      ((gear.critical && !suppressTraits) ||
        die.role === 'fury' ||
        die.role === 'critical' ||
        attack.empowered) &&
      die.explodedRollId !== die.rollId
    ) {
      const at = getWorldPosition(state, die);
      ctx.addDie(state, {
        id: ctx.newId(state, 'critico'),
        role: 'critical',
        name: 'Fractura · ' + gear.name,
        sides: die.sides,
        seatId: attacker.seatId || null,
        sourceId: gear.id,
        critical: true,
        attackId: attack.id,
        width: 0.39,
        depth: 0.39,
        x: at.x + 0.42,
        z: at.z + 0.22,
        sceneId: state.sceneId,
      });
      attack.critical = true;
      die.explodedRollId = die.rollId;
    }
  }
  return result(
    gear.name +
      ' · ' +
      die.value +
      ' · Presión ' +
      attack.pressure +
      (attack.warnings.length
        ? ' · revisar ' + attack.warnings.join(', ') + '.'
        : '.'),
    [attacker.id, target.id, gear.id],
    attack.warnings.length > 0
  );
}
function throwWeapon(ctx, gear, target, attack) {
  if (!gear.thrown) return null;
  const { state } = ctx;
  const dice = Object.values(state.pieces).filter(
    (p) => p.kind === 'die' && p.sourceId === gear.id && p.role === 'weapon'
  );
  if (!dice.length) throw new Error('Falta el dado de esta arma.');
  if (
    dice.some(
      (d) => d.assignedTo && !attack.dice.some((ref) => ref.id === d.id)
    )
  )
    throw new Error('El dado del arma todavía se está resolviendo.');
  const attacker = state.pieces[attack.attackerId];
  for (let i = 0; i < dice.length; i++) {
    if (attack.dice.some((d) => d.id === dice[i].id)) continue;
    rollFace(ctx, dice[i], ctx.c.values?.[i]);
    addWeaponDie(ctx, dice[i], attack, gear, true);
  }
  const at = getWorldPosition(state, target);
  const selected =
    Number.isFinite(ctx.c.x) &&
    Number.isFinite(ctx.c.z) &&
    Math.abs(ctx.c.x - at.x) <= (target.width || 1) / 2 &&
    Math.abs(ctx.c.z - at.z) <= (target.depth || 1) / 2;
  // Keep the centre in the chosen cell while leaving a grabbable corner beyond the base.
  function restingAxis(center, size, point, cells) {
    const edge = size / 2 - 0.001;
    const hit = selected
      ? Math.max(center - edge, Math.min(center + edge, point))
      : center;
    const cell = Math.floor(hit),
      middle = cell + 0.5;
    const direction =
      Math.sign(middle - center) || (cell === cells - 1 ? -1 : 1);
    return middle + direction * 0.34;
  }
  const x = restingAxis(at.x, target.width || 1, ctx.c.x, ctx.scene.cols);
  const z = restingAxis(at.z, target.depth || 1, ctx.c.z, ctx.scene.rows);
  placeOnTable(gear, state.sceneId, x, z, 0.15);
  gear.lastThrownBy = attacker.id;
  gear.controllerSeat = attacker.seatId || null;
  return result(
    attacker.name +
      ' arroja ' +
      gear.name +
      ' · Presión ' +
      attack.pressure +
      (attack.warnings.length
        ? ' · revisar ' + attack.warnings.join(', ') + '.'
        : '.'),
    [gear.id, target.id, attacker.id],
    attack.warnings.length > 0
  );
}
function expose(ctx, die, target) {
  const { state } = ctx,
    seat = currentSeat(state, die);
  if (!seat || !seat.isBarbarian)
    throw new Error('Exponerse requiere un bárbaro.');
  const attack = state.attacks.find(
    (a) =>
      a.sceneId === state.sceneId &&
      a.status === 'defending' &&
      a.targetId === seat.tokenId &&
      (target.id === a.attackerId || target.id === a.targetId)
  );
  if (!attack) throw new Error('Todavía no hay un ataque contra este bárbaro.');
  if (
    attack.exposed ||
    seat.exposedRound === state.round ||
    attack.defenseDice.length
  )
    throw new Error(
      'Exponerse se declara una vez por ronda, antes de gastar defensa.'
    );
  rollFace(ctx, die, ctx.c.value);
  parkDie(state, die, state.pieces[attack.attackerId], attack);
  attack.exposed = true;
  seat.exposedRound = state.round;
  die.used = true;
  return result('Exponerse · +' + die.value + ' a la Presión enemiga.', [
    die.id,
    seat.tokenId,
  ]);
}
function addFury(ctx, seat, n) {
  if (!seat?.isBarbarian) return;
  const { state } = ctx,
    mat = state.pieces[seat.matId];
  const count = children(state, mat.id).filter(
    (p) => p.kind === 'ember'
  ).length;
  const added = Math.max(0, Math.min(n, 3 - count, 2 - seat.furyGained));
  for (let i = 0; i < added; i++) {
    const free = getSlots(mat).find(
      (s) =>
        s.id.startsWith('ember') &&
        !children(state, mat.id).some((p) => p.slot === s.id)
    );
    if (!free) break;
    const ember = ctx.addPiece(state, {
      id: ctx.newId(state, 'furia'),
      kind: 'ember',
      name: 'Furia de ' + seat.characterName,
      seatId: seat.id,
      width: 0.25,
      depth: 0.25,
    });
    placeIn(state, ember, mat, free.id);
    seat.furyGained++;
  }
}
function empower(ctx, ember, gear) {
  if (!gear.dice?.length)
    throw new Error('El arma necesita un perfil de dados.');
  const { state } = ctx,
    sides = gear.dice[0];
  const extra = ctx.addDie(state, {
    id: ctx.newId(state, 'dado-furia'),
    role: 'fury',
    name: 'Furia · ' + gear.name,
    sides,
    sourceId: gear.id,
    seatId: currentSeat(state, gear)?.id || ember.seatId,
    width: 0.35,
    depth: 0.35,
    parentId: gear.id,
    slot: 'fury' + ctx.state.sequence,
    x: (gear.width || 0.8) / 2 - 0.15,
    z: -0.32,
  });
  delete state.pieces[ember.id];
  const seat = currentSeat(state, gear),
    attack = seat && declared(state, seat.tokenId);
  if (attack) attack.empowered = true;
  return result('Furia aporta un d' + extra.sides + ' a ' + gear.name + '.', [
    gear.id,
  ]);
}
function enemyAttack(ctx) {
  const { state, piece: enemy, target } = ctx;
  if (enemy?.kind !== 'enemy' || target?.kind !== 'token')
    throw new Error('Elige la criatura y la peana atacada.');
  const attack = newAttack(ctx, enemy, target);
  attack.base = enemy.offense || 0;
  attack.status = 'defending';
  const dice = Object.values(state.pieces).filter(
    (p) => p.sourceId === enemy.id && p.role === 'enemy'
  );
  dice.forEach((d, i) => {
    rollFace(ctx, d, ctx.c.values?.[i]);
    parkDie(state, d, target, attack);
  });
  attack.pressure = attack.base + sum(attack.dice);
  const dist = cellDistance(state, enemy, target);
  if (dist > enemy.range) attack.warnings.push('alcance');
  if (enemy.actionRound === state.round)
    attack.warnings.push('acción ya gastada');
  enemy.actionRound = state.round;
  return result(
    enemy.name +
      ' ataca a ' +
      target.name +
      ' · Presión ' +
      attack.pressure +
      (attack.warnings.length
        ? ' · revisar ' + attack.warnings.join(', ') + '.'
        : '.'),
    [enemy.id, target.id],
    !!attack.warnings.length
  );
}

function defendEnemy(ctx, enemy, attack) {
  const { state } = ctx;
  const dice = Object.values(state.pieces).filter(
    (p) => p.role === 'enemy' && p.sourceId === enemy.id
  );
  if (attack.defenseDice.some((d) => dice.some((p) => p.id === d.id)))
    return result('La defensa ya está en la mesa.', [enemy.id]);
  const spent = enemy.actionRound === state.round;
  dice.forEach((die, i) => {
    rollFace(
      ctx,
      die,
      ctx.c.values?.[i] ?? (i === 0 ? ctx.c.value : undefined)
    );
    parkDie(state, die, enemy, attack, true);
  });
  enemy.actionRound = state.round;
  return result(
    enemy.name +
      ' se defiende con ' +
      sum(attack.defenseDice) +
      (spent ? ' · acción ya gastada.' : '.'),
    [enemy.id, attack.attackerId],
    spent
  );
}

function roll(ctx) {
  const die = requirePiece(ctx.piece, 'die'),
    { state, c } = ctx;
  if (die.assignedTo || die.used)
    return result('La tirada conserva su ' + die.value + '.', [die.id]);
  const seat = currentSeat(state, die),
    gear = state.pieces[die.sourceId];
  if (Number.isFinite(c.x) && Number.isFinite(c.z)) putDown(ctx, die);
  if (die.role === 'action' && seat) die.controllerSeat = seat.id;
  rollFace(ctx, die, c.value);
  if (['weapon', 'fury', 'critical'].includes(die.role) && gear) {
    const wielder = currentSeat(state, gear);
    const attack =
      (die.role === 'critical'
        ? state.attacks.find(
            (a) => a.id === die.attackId && a.status !== 'resolved'
          )
        : null) ||
      (wielder && declared(state, wielder.tokenId, c.targetId));
    if (attack) return addWeaponDie(ctx, die, attack, gear);
  }
  return result(die.name + ' · ' + die.value + '.', [die.id]);
}

function moveInto(ctx, piece, parent) {
  const { state, c } = ctx;
  let ancestor = parent;
  while (ancestor) {
    if (ancestor.id === piece.id)
      throw new Error('Una pieza no puede contenerse a sí misma.');
    ancestor = state.pieces[ancestor.parentId];
  }
  if (piece.kind === 'ember' && parent.kind === 'weapon')
    return empower(ctx, piece, parent);
  if (
    piece.kind === 'die' &&
    actorTypes.includes(parent.kind) &&
    !(
      parent.kind === 'enemy' &&
      piece.role === 'enemy' &&
      c.slot?.startsWith('die')
    )
  )
    return onTarget(ctx, piece, parent);
  if (
    piece.kind === 'token' &&
    parent.kind === 'mat' &&
    c.slot === 'portrait' &&
    children(state, parent.id).some(
      (p) => p.slot === 'portrait' && p.id !== piece.id
    )
  )
    throw new Error('Ya hay una peana en ese hueco.');
  const wasThrown = piece.lastThrownBy;
  const oldAt = getWorldPosition(state, piece);
  const holder = parentMat(state, parent);
  const seat = holder && state.seats[holder.seatId];
  const recovering = wasThrown && seat && EQUIPMENT.includes(piece.kind);
  const carrier = seat && state.pieces[seat.tokenId];
  const distance = recovering
    ? cellDistance(state, { ...oldAt, width: 0.1, depth: 0.1 }, carrier)
    : 0;
  let warning = '';
  if (recovering) {
    if (distance > 1) warning = 'fuera de alcance (' + distance + ' casillas)';
    if (carrier.inDuel || seat.recoveryRound === state.round) {
      const pay = state.pieces[c.interactionDieId];
      if (
        pay?.kind === 'die' &&
        pay.role === 'action' &&
        !pay.used &&
        !pay.assignedTo &&
        currentSeat(state, pay)?.id === seat.id
      ) {
        pay.used = true;
        placeIn(state, pay, holder, 'spent');
      } else
        warning +=
          (warning ? ' · ' : '') +
          'recogida pendiente de un dado de interacción';
    }
    seat.recoveryRound = state.round;
  }
  placeIn(state, piece, parent, c.slot);
  if (seat) piece.controllerSeat = seat.id;
  if (recovering) delete piece.lastThrownBy;
  if (piece.kind === 'coin' && !piece.collected) {
    piece.collected = true;
    state.gold += piece.amount;
  }
  if (piece.kind === 'die') {
    if (EQUIPMENT.includes(parent.kind)) {
      piece.sourceId = parent.id;
      piece.role = 'weapon';
      piece.homeSlot = piece.slot;
    }
    if (!piece.assignedTo && piece.role === 'action') {
      piece.reserved = piece.slot.startsWith('reserve');
      if (piece.slot === 'spent') piece.used = true;
    }
  }
  return result(
    piece.name + ' en ' + parent.name + (warning ? ' · ' + warning : '') + '.',
    [piece.id, parent.id],
    Boolean(warning)
  );
}

function onTarget(ctx, piece, target) {
  if (piece.kind === 'die') {
    if (piece.role === 'expose') return expose(ctx, piece, target);
    if (piece.role === 'action') return actionOnTarget(ctx, piece, target);
    if (piece.role === 'critical') {
      const { state } = ctx;
      const origin = state.attacks.find(
        (a) => a.id === piece.attackId && a.sceneId === state.sceneId
      );
      const gear = state.pieces[piece.sourceId];
      if (origin && origin.status !== 'resolved' && gear) {
        if (
          origin.targetId === target.id &&
          origin.dice.some((d) => d.id === piece.id)
        )
          return result('Fractura conserva su ' + piece.value + '.', [
            piece.id,
          ]);
        origin.dice = origin.dice.filter((d) => d.id !== piece.id);
        origin.pressure = Math.max(
          0,
          origin.base + sum(origin.dice) - origin.penalty
        );
        const chosen =
          declared(state, origin.attackerId, target.id) ||
          newAttack(ctx, state.pieces[origin.attackerId], target);
        piece.attackId = chosen.id;
        if (!piece.rolled) rollFace(ctx, piece, ctx.c.value);
        return addWeaponDie(ctx, piece, chosen, gear);
      }
    }
    if (
      piece.role === 'enemy' &&
      ctx.actor.role === 'master' &&
      target.id === piece.sourceId
    ) {
      const attack = incoming(ctx.state, target);
      if (attack) return defendEnemy(ctx, target, attack);
    }
    if (
      piece.role === 'enemy' &&
      ctx.actor.role === 'master' &&
      target.kind === 'token'
    ) {
      return enemyAttack({
        ...ctx,
        piece: ctx.state.pieces[piece.sourceId],
        target,
      });
    }
    if (['weapon', 'fury', 'critical'].includes(piece.role)) {
      const gear = ctx.state.pieces[piece.sourceId],
        seat = gear && currentSeat(ctx.state, gear);
      const attack = seat && declared(ctx.state, seat.tokenId, target.id);
      if (attack && !piece.assignedTo) {
        if (!piece.rolled) rollFace(ctx, piece, ctx.c.value);
        return addWeaponDie(ctx, piece, attack, gear);
      }
    }
  }
  if (piece.kind === 'weapon' && piece.thrown) {
    const seat = currentSeat(ctx.state, piece),
      attack = seat && declared(ctx.state, seat.tokenId, target.id);
    if (attack) return throwWeapon(ctx, piece, target, attack);
  }
  const pos = getWorldPosition(ctx.state, target);
  putDown(ctx, piece, ctx.c.x ?? pos.x, ctx.c.z ?? pos.z);
  return result(piece.name + ' junto a ' + target.name + '.', [
    piece.id,
    target.id,
  ]);
}

function drop(ctx) {
  const { state, c, piece, target } = ctx;
  requirePiece(piece);
  if (piece.kind === 'die' && piece.role === 'action' && !piece.controllerSeat)
    piece.controllerSeat = currentSeat(state, piece)?.id || null;
  if (c.parentId) return moveInto(ctx, piece, state.pieces[c.parentId]);
  if (target && actorTypes.includes(target.kind))
    return onTarget(ctx, piece, target);
  if (target && piece.kind === 'ember' && target.kind === 'weapon')
    return empower(ctx, piece, target);
  if (target && ['bag', 'box'].includes(target.kind))
    return moveInto(ctx, piece, target);
  putDown(ctx, piece);
  return result(piece.name + ' sobre la mesa.', [piece.id]);
}

function releaseAttackDice(ctx, attack) {
  const { state } = ctx;
  for (const ref of [...attack.dice, ...attack.defenseDice]) {
    const die = state.pieces[ref.id];
    if (!die || die.rollId !== ref.rollId) continue;
    const seat = currentSeat(state, die);
    die.assignedTo = null;
    if (die.role === 'action' && seat) {
      die.used = true;
      die.reserved = false;
      placeIn(state, die, state.pieces[seat.matId], 'spent');
    } else if (die.role === 'expose' && seat) {
      die.used = true;
      const mat = state.pieces[seat.matId];
      if (
        !children(state, mat.id).some(
          (p) => p.slot === 'expose' && p.id !== die.id
        )
      )
        placeIn(state, die, mat, 'expose');
    } else if (die.role === 'fury') {
      delete state.pieces[die.id];
    } else if (die.role === 'enemy') {
      const source = state.pieces[die.sourceId];
      if (source) {
        const index = Object.values(state.pieces)
          .filter((p) => p.sourceId === source.id && p.role === 'enemy')
          .findIndex((p) => p.id === die.id);
        Object.assign(die, {
          parentId: source.id,
          slot: 'die' + (index + 1),
          x: (index - (source.dice.length - 1) / 2) * 0.33,
          z: source.width * 0.59,
        });
      }
    } else if (
      die.parentId &&
      actorTypes.includes(state.pieces[die.parentId]?.kind)
    ) {
      const pos = getWorldPosition(state, die);
      placeOnTable(die, state.sceneId, pos.x, pos.z, die.yaw);
    }
  }
}
function resolve(ctx) {
  const { state, c } = ctx;
  const attack = state.attacks.find(
    (a) =>
      a.sceneId === state.sceneId &&
      a.status === 'defending' &&
      (!c.targetId || a.targetId === c.targetId) &&
      (!c.attackId || a.id === c.attackId)
  );
  if (!attack) throw new Error('No hay un ataque listo para resolver.');
  const attacker = state.pieces[attack.attackerId],
    target = state.pieces[attack.targetId];
  if (ctx.actor.role !== 'master') {
    const sight = makeSight(state, ctx.actor.seatId);
    if (!sight.visiblePiece(attacker) || !sight.visiblePiece(target))
      throw new Error('El ataque no está disponible.');
  }
  const defense = sum(attack.defenseDice);
  attack.surplus = Math.max(0, defense - attack.pressure);
  const net = Math.max(0, attack.pressure - defense);
  const effectiveDefense = Math.max(
    1,
    target.defense - (attack.perforating ? 1 : 0)
  );
  const damage = Math.min(target.life, Math.floor(net / effectiveDefense));
  attack.damage = damage;
  attack.finalPressure = net;
  attack.status = 'resolved';
  if (target.kind === 'token') {
    const seat = state.seats[target.seatId],
      mat = state.pieces[seat.matId],
      pos = getWorldPosition(state, mat);
    const life = children(state, mat.id)
      .filter((p) => p.kind === 'health' && p.slot.startsWith('hp'))
      .sort((a, b) => Number(b.slot.slice(2)) - Number(a.slot.slice(2)));
    life
      .slice(0, damage)
      .forEach((tile, i) =>
        placeOnTable(
          tile,
          state.sceneId,
          pos.x - mat.width / 2 - 0.4,
          pos.z + Math.min(i, 7) * 0.33
        )
      );
    addFury(ctx, seat, (damage ? 1 : 0) + (attack.exposed ? 1 : 0));
  } else {
    target.life = Math.max(0, target.life - damage);
    if (target.life === 0 && !target.defeated) {
      target.defeated = true;
      const encounter = state.encounters[state.sceneId];
      const enemiesRemain = Object.values(state.pieces).some(
        (p) =>
          p.kind === 'enemy' &&
          p.sceneId === state.sceneId &&
          !p.hidden &&
          p.life > 0
      );
      if (encounter && !encounter.rewarded && !enemiesRemain) {
        const pos = getWorldPosition(state, target),
          reward = Object.keys(state.seats).length * 2;
        for (let i = 0; i < reward; i++) {
          const angle = (2 * Math.PI * i) / reward;
          const coin = ctx.addSupply(state, {
            kind: 'coin',
            amount: 1,
            x: pos.x + 0.53 * Math.cos(angle),
            z: pos.z + 0.53 * Math.sin(angle),
          });
          coin.collected = true;
        }
        state.gold += reward;
        encounter.rewarded = true;
      }
    }
  }
  if (attack.naturalMax) addFury(ctx, state.seats[attacker.seatId], 1);
  releaseAttackDice(ctx, attack);
  return result(
    target.name +
      ' pierde ' +
      damage +
      ' de vida · Presión ' +
      attack.pressure +
      ' − Defensa ' +
      defense +
      ' · CD ' +
      effectiveDefense +
      '.',
    [attacker.id, target.id]
  );
}

function activationOrder(state) {
  const encounter = state.encounters[state.sceneId];
  const actors = [
    ...Object.values(state.seats).map((s) => state.pieces[s.tokenId]),
    ...Object.values(state.pieces).filter(
      (p) => p.kind === 'enemy' && p.sceneId === state.sceneId && !p.hidden
    ),
  ].filter((p) => p.life > 0);
  if (
    !Object.values(state.seats).every(
      (s) => encounter.scores[s.tokenId] != null
    )
  )
    return actors;
  const initiative = (p) =>
    p.kind === 'enemy' ? (p.initiative ?? 7) : encounter.scores[p.id];
  return actors.sort(
    (a, b) =>
      initiative(b) - initiative(a) ||
      Number(a.kind === 'enemy') - Number(b.kind === 'enemy')
  );
}
function newRound(ctx) {
  const { state } = ctx;
  state.encounters[state.sceneId].started = true;
  const actors = activationOrder(state);
  const start = actors.findIndex((p) => p.id === state.turnId);
  const next = start < 0 ? 1 : start + 1;
  const wrapped = next >= actors.length;
  state.turnId = actors.length ? actors[next % actors.length].id : null;
  if (wrapped) {
    state.round++;
    for (const seat of Object.values(state.seats)) {
      seat.furyGained = 0;
      const mat = state.pieces[seat.matId];
      for (const die of Object.values(state.pieces).filter(
        (p) =>
          p.kind === 'die' &&
          p.seatId === seat.id &&
          ['action', 'expose'].includes(p.role)
      )) {
        if (die.assignedTo) continue;
        die.used = false;
        die.rolled = false;
        die.value = null;
        die.reserved = false;
        if (
          (die.slot === 'spent' || die.slot?.startsWith('reserve')) &&
          !children(state, mat.id).some((p) => p.slot === die.homeSlot)
        )
          placeIn(state, die, mat, die.homeSlot);
      }
    }
  }
  const nextActor = state.pieces[state.turnId];
  return result(
    'Ronda ' + state.round + (nextActor ? ' · ' + nextActor.name : '') + '.',
    nextActor ? [nextActor.id] : []
  );
}

module.exports = { drop, roll, resolve, enemyAttack, newRound };
