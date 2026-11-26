import { classFittings } from './patioClassFittings';
import * as THREE from 'three';
import { addTerrainSurface } from './tableAtmosphere';
import { buildDie } from './rendererDice';
import { paintFrame } from './patioInlay';
import { medallionMesh, pawnRings } from './patioMedallions';
import { mapSkin, pieceSkin, tableWood } from './rendererSurfaces';

const { getSlots } = require('./gamePieces.js');

const equipment = ['weapon', 'shield', 'armor', 'accessory', 'item'];
export const isEquipment = (p) => equipment.includes(p.kind);
const roundKinds = ['token', 'enemy', 'coin'];
export const pieceHeight = (p) =>
  ({
    mat: 0.16,
    token: 0.17,
    enemy: 0.18,
    coin: 0.06,
    health: 0.079,
    bag: 0.17,
    box: 0.27,
    ember: 0.095,
    trait: 0.09,
  })[p.kind] || 0.1;

export function geometrySlab(w, d, h, round = false, wells = []) {
  const xs = w * 0.5,
    zs = d * 0.5,
    points = [];
  if (round) {
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      points.push([xs * Math.cos(angle), zs * Math.sin(angle)]);
    }
  } else {
    const k = Math.min(0.087, xs * 0.16, zs * 0.16);
    points.push(
      [-xs + k, -zs],
      [xs - k, -zs],
      [xs, -zs + k],
      [xs, zs - k],
      [xs - k, zs],
      [-xs + k, zs],
      [-xs, zs - k],
      [-xs, -zs + k]
    );
  }
  const pos = [],
    uv = [],
    indices = [];
  const ring = (scale, y) => {
    for (const [x, z] of points) {
      pos.push(x * scale, y, z * scale);
      uv.push(x / w + 0.5, 0.5 - z / d);
    }
  };
  const n = points.length;
  const bevel = 1 - Math.min(0.03, 0.023 / Math.max(xs, zs));
  ring(bevel, -h / 2);
  ring(1, -h * 0.3);
  ring(1, h * 0.27);
  ring(bevel, h / 2);
  for (let layer = 0; layer < 3; layer++)
    for (let i = 0; i < n; i++) {
      const a = layer * n + i,
        b = layer * n + ((i + 1) % n);
      indices.push(a, a + n, b, b, a + n, b + n);
    }
  const exteriorCount = indices.length;
  const holes = [],
    floorLoops = [];
  const addPoint = (x, y, z) => {
    const i = pos.length / 3;
    pos.push(x, y, z);
    uv.push(x / w + 0.5, 0.5 - z / d);
    return i;
  };
  for (const s of wells) {
    const a = s.width * 0.47,
      b = s.depth * 0.47,
      c = Math.min(a, b) * 0.27;
    const octagon = [
      [-a + c, -b],
      [a - c, -b],
      [a, -b + c],
      [a, b - c],
      [a - c, b],
      [-a + c, b],
      [-a, b - c],
      [-a, -b + c],
    ];
    const rim = [],
      floor = [];
    for (const [dx, dz] of octagon) {
      rim.push(addPoint(s.x + dx, h / 2, s.z + dz));
      floor.push(addPoint(s.x + dx * 0.85, h * 0.12, s.z + dz * 0.85));
    }
    for (let i = 0; i < rim.length; i++) {
      const j = (i + 1) % rim.length;
      indices.push(rim[i], floor[i], rim[j], floor[i], floor[j], rim[j]);
    }
    holes.push({
      indices: rim,
      points: octagon.map(([dx, dz]) => new THREE.Vector2(s.x + dx, s.z + dz)),
    });
    floorLoops.push(floor);
  }
  const sideCount = indices.length;
  if (holes.length) {
    const outline = points.map(
      ([x, z]) => new THREE.Vector2(x * bevel, z * bevel)
    );
    const mapping = points
      .map((_, i) => 3 * n + i)
      .concat(...holes.map((o) => o.indices));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
      outline,
      holes.map((o) => o.points)
    ))
      indices.push(mapping[a], mapping[c], mapping[b]);
    for (const loop of floorLoops)
      for (let i = 1; i < loop.length - 1; i++)
        indices.push(loop[0], loop[i + 1], loop[i]);
  } else
    for (let i = 1; i < n - 1; i++)
      indices.push(3 * n, 3 * n + i + 1, 3 * n + i);
  const topCount = indices.length - sideCount;
  for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geom.setIndex(indices);
  geom.addGroup(0, exteriorCount, 0);
  if (wells.length) geom.addGroup(exteriorCount, sideCount - exteriorCount, 2);
  geom.addGroup(sideCount, topCount, 1);
  geom.addGroup(sideCount + topCount, indices.length - sideCount - topCount, 0);
  geom.computeVertexNormals();
  return geom;
}

// This relief only lifts out during a declared throw. The engraved item and
// the weapon have one piece ID, including after landing or returning to hand.
function hatchetModel() {
  const axe = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({
    color: '#91603a',
    roughness: 0.66,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#9da8a5',
    roughness: 0.36,
    metalness: 0.64,
    flatShading: true,
  });
  const h = new THREE.CylinderGeometry(0.052, 0.037, 0.81, 10).rotateX(
    Math.PI * 0.5
  );
  axe.add(new THREE.Mesh(h, wood));
  const head = new THREE.Shape();
  head.moveTo(-0.082, 0.265);
  head.lineTo(-0.062, 0.405);
  head.lineTo(0.105, 0.421);
  head.quadraticCurveTo(0.205, 0.413, 0.343, 0.486);
  head.quadraticCurveTo(0.39, 0.328, 0.302, 0.166);
  head.quadraticCurveTo(0.159, 0.23, 0.077, 0.223);
  head.closePath();
  const blade = new THREE.ExtrudeGeometry(head, {
    depth: 0.068,
    bevelEnabled: true,
    steps: 1,
    bevelSegments: 1,
    bevelThickness: 0.012,
    bevelSize: 0.014,
    curveSegments: 8,
  });
  blade.rotateX(-Math.PI * 0.5);
  blade.translate(0, -0.034, 0);
  axe.add(new THREE.Mesh(blade, steel));
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), wood);
  pommel.position.z = 0.39;
  axe.add(pommel);
  axe.rotation.y = -0.44;
  axe.visible = false;
  axe.position.y = 0.06;
  return axe;
}

export function makePiece(lib, p) {
  const node = new THREE.Group(),
    w = p.width || 1,
    d = p.depth || w,
    h = pieceHeight(p);
  node.userData.pieceId = p.id;
  if (p.kind === 'die') {
    const radius = Math.max(w, d) * 0.62;
    const mesh = buildDie(lib, p, radius);
    node.add(mesh);
    node.userData.die = mesh.userData.die;
    node.userData.radius = radius;
    if (mesh.userData.dicePair) node.userData.pair = mesh.children;
  } else if (p.kind === 'token' || p.kind === 'enemy') {
    const texture = pieceSkin(lib, p, []);
    const mesh = medallionMesh(w, d, h, p.kind === 'enemy', texture);
    node.userData.rings = pawnRings(lib, w, d, h);
    node.add(mesh, node.userData.rings);
    node.userData.plate = mesh;
    node.userData.texture = texture;
  } else {
    const slots = getSlots(p),
      texture = pieceSkin(lib, p, slots);
    const isRound = roundKinds.includes(p.kind),
      brass = isRound;
    const edge = new THREE.MeshStandardMaterial({
      color: brass
        ? p.kind === 'enemy'
          ? 0x875840
          : 0xa38957
        : p.kind === 'health'
          ? 0x763a2a
          : 0x65442e,
      metalness: brass ? 0.41 : 0.035,
      roughness: brass ? 0.51 : 0.79,
      flatShading: true,
    });
    const top = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: p.kind === 'coin' ? 0.52 : 0.86,
      metalness: p.kind === 'coin' ? 0.27 : 0.035,
      transparent: p.kind === 'bag',
      alphaTest: p.kind === 'bag' ? 0.025 : 0,
    });
    const wells = isEquipment(p)
      ? slots
      : p.kind === 'mat'
        ? slots
            .filter((s) => /^action\d+$/.test(s.id))
            .map((s) => ({
              ...s,
              z: (0.317 - 0.5) * d,
              width: s.width * 0.94,
              depth: s.depth * 0.94,
            }))
        : [];
    const faceMaterials = [edge, top];
    if (wells.length)
      faceMaterials.push(
        new THREE.MeshStandardMaterial({
          color: p.kind === 'mat' ? '#30372c' : '#392c21',
          roughness: 0.94,
        })
      );
    const mesh = new THREE.Mesh(
      geometrySlab(w, d, h, isRound, wells),
      faceMaterials
    );
    node.add(mesh);
    node.userData.plate = mesh;
    if (p.kind === 'mat') {
      classFittings(lib, node, p, h);
    }
    if (p.kind === 'weapon' && p.thrown && /hacha/i.test(p.name)) {
      node.userData.projectile = hatchetModel();
      node.add(node.userData.projectile);
    }
    node.userData.texture = texture;
    // A bag has a soft silhouette printed on transparent leather. Avoid a
    // rectangular block poking out behind its illustrated flap and gussets.
    if (p.kind === 'bag') edge.visible = false;
  }
  const pickShape = roundKinds.includes(p.kind)
    ? new THREE.CylinderGeometry(0.5, 0.5, Math.max(0.12, h), 32).scale(w, 1, d)
    : new THREE.BoxGeometry(w, Math.max(0.12, p.kind === 'die' ? w : h), d);
  const pick = new THREE.Mesh(
    pickShape,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pick.userData.pieceId = p.id;
  node.add(pick);
  node.userData.pick = pick;
  return node;
}

export function clearGroup(group) {
  group.traverse((obj) => {
    for (const texture of obj.userData.ownTextures || []) texture.dispose();
    if (obj.userData.releaseMould) obj.userData.releaseMould();
    else if (obj.geometry && !obj.isSprite) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      materials.forEach((m) => m.dispose());
    }
  });
  group.removeFromParent();
}

// Each fracture keeps the UVs of the original portrait and its metal rim.
export function tokenFragments(piece, texture) {
  const group = new THREE.Group(),
    w = piece.width,
    d = piece.depth,
    h = pieceHeight(piece);
  const divisions = [0.09, 1.04, 1.95, 3.28, 4.18, 5.39, Math.PI * 2 + 0.09];
  for (let i = 0; i < divisions.length - 1; i++) {
    const start = divisions[i],
      end = divisions[i + 1],
      mid = (start + end) / 2;
    const loop = [[-w * 0.043, d * 0.021]];
    for (let j = 0; j <= 7; j++) {
      const angle = start + ((end - start) * j) / 7;
      loop.push([w * 0.48 * Math.cos(angle), d * 0.48 * Math.sin(angle)]);
    }
    const centerX = w * 0.22 * Math.cos(mid),
      centerZ = d * 0.22 * Math.sin(mid),
      pos = [],
      uv = [],
      indices = [];
    for (const y of [-h * 0.5, h * 0.5])
      for (const [x, z] of loop) {
        pos.push(x - centerX, y, z - centerZ);
        uv.push(x / w + 0.5, 0.5 - z / d);
      }
    const n = loop.length;
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      indices.push(j, j + n, k, k, j + n, k + n);
    }
    const sides = indices.length;
    for (let j = 1; j < n - 1; j++) indices.push(n, n + j + 1, n + j);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.addGroup(0, sides, 0);
    geometry.addGroup(sides, indices.length - sides, 1);
    geometry.computeVertexNormals();
    const shard = new THREE.Mesh(geometry, [
      new THREE.MeshStandardMaterial({
        color: '#98755b',
        flatShading: true,
        roughness: 0.72,
        transparent: true,
      }),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.73,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    ]);
    shard.userData = { centerX, centerZ, mid, index: i };
    group.add(shard);
  }
  return group;
}

export function makeImpact(lib, text, parried) {
  const texture = lib.texture('impact:' + text, 320, 144, (ctx, w, h) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font =
      (parried ? '600 52px ' : '700 96px ') + 'NomaMesa, Georgia, serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#30221c';
    ctx.strokeText(text, w / 2, h / 2);
    const ink = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    ink.addColorStop(0, parried ? '#fff7d5' : '#ffe5b2');
    ink.addColorStop(1, parried ? '#b9c7b0' : '#e38c65');
    ctx.fillStyle = ink;
    ctx.fillText(text, w / 2, h / 2);
  });
  const mesh = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  mesh.scale.set(parried ? 1.24 : 1.1, 0.52, 1);
  mesh.renderOrder = 12;
  return mesh;
}

export function horizontal(w, d, material, y, x = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

export function makeMap(lib, scene) {
  const node = new THREE.Group(),
    w = scene.cols,
    d = scene.rows;
  const tex = mapSkin(lib, scene);
  const frame = lib.texture(
    'map-edge:' + w + ':' + d,
    Math.min(2048, (w + 0.3) * 160),
    Math.min(2048, (d + 0.3) * 160),
    (ctx, W, H, get) => paintFrame(ctx, W, H, w, d, get)
  );
  const plate = new THREE.Mesh(geometrySlab(w + 0.3, d + 0.3, 0.16), [
    new THREE.MeshStandardMaterial({
      color: '#544331',
      roughness: 0.63,
      metalness: 0.27,
      flatShading: true,
    }),
    new THREE.MeshBasicMaterial({ map: frame }),
  ]);
  plate.position.set(w / 2, -0.079, d / 2);
  node.add(plate);
  const ground = horizontal(
    w,
    d,
    new THREE.MeshBasicMaterial({ map: tex }),
    0.012,
    w / 2,
    d / 2
  );
  node.add(ground);
  const pad = 0.42,
    width = w + 2 * pad,
    depth = d + 2 * pad;
  const shade = lib.texture(
    'patio:map-shadow:' + w + ':' + d,
    Math.min(960, width * 53),
    Math.min(960, depth * 53),
    (ctx, W, H) => {
      const sx = W / width,
        sz = H / depth;
      ctx.shadowColor = '#090b09';
      ctx.shadowBlur = Math.max(1, sx * 0.12);
      ctx.shadowOffsetY = sz * 0.09;
      ctx.fillStyle = '#191813';
      ctx.fillRect(
        (pad - 0.15) * sx,
        (pad - 0.15) * sz,
        (w + 0.3) * sx,
        (d + 0.3) * sz
      );
    }
  );
  const shadow = horizontal(
    width,
    depth,
    new THREE.MeshBasicMaterial({
      map: shade,
      transparent: true,
      depthWrite: false,
    }),
    -0.151,
    w / 2,
    d / 2
  );
  node.add(shadow);
  node.userData.shadow = { texture: shade, pad };
  return node;
}

export function makeTable(lib) {
  const base = tableWood(lib);
  base.repeat.set(15, 22);
  return horizontal(
    300,
    300,
    new THREE.MeshBasicMaterial({ map: base }),
    -0.165,
    0,
    0
  );
}

function radial(lib, kind) {
  return lib.texture('radial:' + kind, 160, 160, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    if (kind === 'light') {
      g.addColorStop(0, 'rgba(255,217,143,.78)');
      g.addColorStop(0.31, 'rgba(240,185,106,.50)');
      g.addColorStop(1, 'rgba(226,167,84,0)');
    } else if (kind === 'shadow') {
      g.addColorStop(0, 'rgba(0,0,0,.69)');
      g.addColorStop(0.45, 'rgba(0,0,0,.53)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      g.addColorStop(0, 'rgba(182,185,176,.73)');
      g.addColorStop(0.52, 'rgba(141,153,143,.65)');
      g.addColorStop(1, 'rgba(150,161,151,0)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeShadow(lib, w, d) {
  return horizontal(
    w * 1.33,
    d * 1.32,
    new THREE.MeshBasicMaterial({
      map: radial(lib, 'shadow'),
      transparent: true,
      depthWrite: false,
      opacity: 0.63,
    }),
    0
  );
}

export function makeTerrain(lib, t, master, scene, smoke) {
  const g = new THREE.Group(),
    w = t.width || 1,
    d = t.depth || w;
  g.position.set(t.x || 0, 0, t.z || 0);
  g.rotation.y = t.yaw || 0;
  g.userData.terrain = t;
  const material = (color, other = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...other });
  if (t.kind === 'tree') {
    const r = Math.max(0.06, Math.min(w, d) * (t.trunkRatio || 0.28) * 0.5),
      h = Math.min(1.3, 0.24 + Math.min(w, d) * 0.31);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.78, r, h, 9),
      material('#664c33', { flatShading: true })
    );
    trunk.position.y = h / 2;
    g.add(trunk);
    const url = t.image || '/scenery/trees/fa-01-arbol-verde-a1.webp';
    const texture = lib.texture('tree:' + url, 512, 512, (ctx, tw, th, get) => {
      const art = get(url);
      if (art) ctx.drawImage(art, 0, 0, tw, th);
    });
    const crown = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.065,
      opacity: t.faded ? 0.38 : 1,
      depthWrite: !t.faded,
    });
    const layer = horizontal(w, d, crown, h + 0.14);
    g.add(layer);
    const under = horizontal(
      w * 0.9,
      d * 0.92,
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        color: '#617557',
        transparent: true,
        alphaTest: 0.1,
        opacity: t.faded ? 0.115 : 0.74,
        depthWrite: !t.faded,
      }),
      h * 0.7
    );
    g.add(under);
    g.userData.top = layer;
    g.userData.under = under;
    const shadow = makeShadow(lib, w, d);
    shadow.position.set(0.08, 0.035, 0.11);
    g.add(shadow);
  } else {
    addTerrainSurface(lib, g, t, scene, master, smoke);
  }
  return g;
}
