import * as THREE from 'three';
import { patioArt } from './patioClassSkins';
const { MAT_WIDTH: W, MAT_DEPTH: D } = require('./gamePieces.js');

// Normalized pivots measured from the closed Patio frame. The drawer travels
// beneath the felt. Its leaf, pockets, feet and handle all use the same pivot.
export const drawerTravel = 0.7319 * D;
const point = (u, v) => [(u - 0.5) * W, (v - 0.5) * D];
const clamp = (n) => Math.max(0, Math.min(1, n));

function impression(lib, asset, width, depth, segments = 1) {
  const texture = lib.texture(
    'patio:fixture:' + asset,
    ...{
      leaf: [1392, 411],
      front: [1392, 87],
      turn: [277, 176],
      'pasador-de-turno': [160, 120],
      feet: [220, 55],
      strap: [220, 55],
    }[asset],
    (g, w, h, get) => {
      const image = get(patioArt(asset));
      if (image) g.drawImage(image, 0, 0, w, h);
      if (asset === 'front') {
        g.fillStyle = '#f0d7a9';
        g.textBaseline = 'middle';
        g.font = '600 26px PatioClase, Georgia, serif';
        g.fillText('Equipo', w * 0.502, h * 0.53, w * 0.092);
      }
    }
  );
  const plane = new THREE.PlaneGeometry(width, depth, segments, 1).rotateX(
    -Math.PI / 2
  );
  const node = new THREE.Mesh(
    plane,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.035,
      depthWrite: true,
      side: THREE.DoubleSide,
    })
  );
  node.userData.fixturePrint = { width, depth, texture };
  return node;
}
function placed(parent, node, u, v, height) {
  const [x, z] = point(u, v);
  node.position.set(x, height, z);
  parent.add(node);
  return node;
}
function grip(lib, parent, u, v, height, width, depth) {
  placed(parent, impression(lib, 'feet', width, depth), u, v, height);
  const strap = placed(
    parent,
    impression(lib, 'strap', width, depth, 16),
    u,
    v,
    height + 0.002
  );
  const verts = strap.geometry.attributes.position;
  strap.userData.setLift = (value) => {
    for (let i = 0; i < verts.count; i++) {
      const t = clamp(verts.getX(i) / width + 0.5);
      const bow = Math.sin(t * Math.PI);
      verts.setY(i, (0.007 + value * width * 0.123) * bow);
    }
    verts.needsUpdate = true;
    strap.geometry.computeBoundingSphere();
  };
  strap.userData.setLift(0);
  return strap;
}
function target(parent, pid, kind, u, v, width, depth, y) {
  const mesh = placed(
    parent,
    new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.034, depth),
      new THREE.MeshBasicMaterial({ visible: false })
    ),
    u,
    v,
    y
  );
  mesh.userData.pieceId = pid;
  mesh.userData.fixtureAction = kind;
  return mesh;
}
export function classFittings(lib, node, p, h) {
  const leaf = new THREE.Group();
  node.add(leaf);
  const surface = placed(
    leaf,
    impression(lib, 'leaf', 0.6426 * W, 0.7319 * D),
    0.5812,
    0.3915,
    h * 0.5 - 0.046
  );
  placed(
    leaf,
    impression(lib, 'front', 0.6426 * W, 0.1541 * D),
    0.5812,
    -0.0514,
    h * 0.5 - 0.011
  );
  const pull = grip(lib, leaf, 0.556, -0.05, h * 0.5, 0.07 * W, 0.098 * D);
  const carry = grip(
    lib,
    node,
    0.077,
    -0.012,
    h * 0.5 + 0.008,
    0.107 * W,
    0.147 * D
  );
  placed(
    node,
    impression(lib, 'turn', 0.128 * W, 0.314 * D),
    0.919,
    0.636,
    h * 0.5 + 0.003
  );
  const bolt = placed(
    node,
    impression(lib, 'pasador-de-turno', 0.036 * W, 0.097 * D),
    0.887,
    0.604,
    h * 0.5 + 0.011
  );
  const drawer = target(
    leaf,
    p.id,
    'drawer',
    0.582,
    -0.054,
    0.164 * W,
    0.18 * D,
    h * 0.5 + 0.02
  );
  const turn = target(
    node,
    p.id,
    'turn',
    0.919,
    0.636,
    0.128 * W,
    0.314 * D,
    h * 0.5 + 0.02
  );
  const body = target(
    leaf,
    p.id,
    'leaf',
    0.5812,
    0.3915,
    0.6426 * W,
    0.7319 * D,
    h * 0.5 - 0.035
  );
  const handle = target(
    node,
    p.id,
    'carry',
    0.077,
    -0.012,
    0.115 * W,
    0.164 * D,
    h * 0.5 + 0.03
  );
  node.userData.grip = carry;
  const fittings = {
    leaf,
    pull,
    surface,
    bolt,
    boltFraction: 0,
    picks: [drawer, turn, body, handle],
    progress: p.drawerOpen ? 1 : 0,
    hand: null,
    tension: 0,
  };
  node.userData.fittings = fittings;
  leaf.position.z = -drawerTravel * fittings.progress;
  return fittings;
}
export function advanceDrawer(o, dt, reduced) {
  const f = o.node.userData.fittings;
  if (!f) return false;
  const target = f.hand?.value ?? f.pending ?? (o.p.drawerOpen ? 1 : 0);
  const boltTarget = f.turnHand ?? Number(Boolean(f.turnAway));
  const boltDelta = boltTarget - f.boltFraction;
  const next = target - f.progress;
  const lift = (f.hand ? 1 : 0) - f.tension;
  if (
    Math.abs(lift) < 0.001 &&
    Math.abs(next) < 0.0001 &&
    Math.abs(boltDelta) < 0.001
  )
    return false;
  const gain = reduced
    ? 1
    : 1 - Math.exp(-Math.min(0.05, dt || 0.016) * (f.hand ? 32 : 16));
  f.progress = Math.abs(next) < 0.005 ? target : f.progress + next * gain;
  f.tension =
    Math.abs(lift) < 0.008 ? Number(Boolean(f.hand)) : f.tension + lift * gain;
  f.leaf.position.z = -drawerTravel * f.progress;
  f.pull.userData.setLift(f.tension);
  f.boltFraction =
    Math.abs(boltDelta) < 0.007
      ? boltTarget
      : f.boltFraction + boltDelta * gain;
  f.bolt.position.x = (0.887 - 0.5 + 0.061 * f.boltFraction) * W;
  return true;
}
export function fittingHit(table, p) {
  const hits = [];
  for (const item of table.objects.values()) {
    if (!item.node.visible) continue;
    hits.push(item.node.userData.pick);
    for (const hit of item.node.userData.fittings?.picks || [])
      if (
        hit.userData.fixtureAction !== 'leaf' ||
        item.node.userData.fittings.progress > 0.05
      )
        hits.push(hit);
  }
  const first = table.rayAt(p.x, p.y).intersectObjects(hits, false)[0];
  const kind = first?.object.userData.fixtureAction;
  if (!['drawer', 'turn'].includes(kind)) return null;
  return { kind, o: table.objects.get(first.object.userData.pieceId) };
}
export function graspFixture(table, fixture, point) {
  const { o, kind } = fixture,
    f = o.node.userData.fittings;
  const local = (p) => {
    const at = table.worldAt(p.x, p.y, o.node.position.y + o.h / 2);
    return o.node.worldToLocal(
      new THREE.Vector3(at.x, o.node.position.y + o.h / 2, at.z)
    );
  };
  const from = local(point),
    start = f.progress,
    boltStart = f.boltFraction;
  if (kind === 'drawer') {
    f.hand = { value: start };
    table.audio.play('rub', 0.23);
  } else f.turnHand = boltStart;
  table.invalidate();
  return {
    move(p) {
      if (kind === 'drawer') {
        f.hand.value = clamp(start + (from.z - local(p).z) / drawerTravel);
        table.invalidate();
      } else {
        f.turnHand = clamp(boltStart + (local(p).x - from.x) / (0.061 * W));
        table.invalidate();
      }
    },
    end(p, cancelled = false) {
      const open = f.hand?.value;
      f.hand = null;
      const turnGesture = f.turnHand;
      f.turnHand = null;
      if (!cancelled) {
        if (kind === 'drawer') {
          const wants =
            Math.abs(open - start) > 0.12 ? open > 0.5 : !o.p.drawerOpen;
          if (wants !== Boolean(o.p.drawerOpen)) {
            table.audio.play('wood', 0.32);
            f.pending = Number(wants);
            table
              .send({ type: 'drawer', pieceId: o.p.id, open: wants })
              .finally(() => {
                f.pending = null;
                table.invalidate();
              });
          }
        } else if (Math.abs(local(p).x - from.x) > 0.1 && turnGesture < 0.55) {
          return;
        } else if (
          !table.game.turnId ||
          table.props.role === 'master' ||
          table.game.seats[o.p.seatId]?.tokenId === table.game.turnId
        ) {
          table.audio.play('wood', 0.36);
          table.send({ type: 'turn' });
        } else table.announce('Es el turno de otra peana.');
      }
      table.invalidate();
    },
  };
}
