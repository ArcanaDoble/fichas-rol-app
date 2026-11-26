import * as THREE from 'three';

// The four bands, alternating reeds and side lighting follow metal-fichas.js.
const segments = 64;
const circle = Array.from({ length: segments + 1 }, (_, i) => [
  Math.cos((i * Math.PI * 2) / segments),
  Math.sin((i * Math.PI * 2) / segments),
]);
const bands = [
  [0.005, 0.03, 0.94, 1, 0.66],
  [0.03, 0.1, 1, 1, 1],
  [0.1, 0.122, 1, 1.018, 0.8],
  [0.122, 0.155, 1.018, 0.99, 1.4],
];
function bandColour(i, low, material, enemy) {
  const nx = (circle[i][0] + circle[i + 1][0]) / 2,
    ny = (circle[i][1] + circle[i + 1][1]) / 2;
  let lit =
    (0.68 - 0.31 * nx - 0.16 * ny + 0.24 * Math.max(0, -nx) ** 7) * material;
  if (low > 0.02 && low < 0.09) lit *= i % 2 ? 1.12 : 0.75;
  return (enemy ? [139, 79, 62] : [166, 130, 75]).map((v) =>
    Math.min(255, Math.round(v * lit))
  );
}
function bandQuads(w, d, h, enemy, draw) {
  const point = (i, r, y) => [
    (circle[i][0] * r * w) / 2,
    (y / 0.155 - 0.5) * h,
    (circle[i][1] * r * d) / 2,
  ];
  for (const [low, high, r1, r2, material] of bands) {
    for (let i = 0; i < segments; i++)
      draw(
        [
          point(i, r1, low),
          point(i + 1, r1, low),
          point(i + 1, r2, high),
          point(i, r2, high),
        ],
        bandColour(i, low, material, enemy)
      );
  }
}
export function medallionMesh(w, d, h, enemy, texture) {
  const vertices = [],
    uv = [],
    colors = [],
    indices = [];
  function vertex(p, color) {
    const i = vertices.length / 3;
    vertices.push(...p);
    colors.push(color.r, color.g, color.b);
    uv.push(p[0] / w + 0.5, 0.5 - p[2] / d);
    return i;
  }
  bandQuads(w, d, h, enemy, (points, rgb) => {
    const color = new THREE.Color().setRGB(
      rgb[0] / 255,
      rgb[1] / 255,
      rgb[2] / 255,
      THREE.SRGBColorSpace
    );
    const [a, b, c, e] = points.map((p) => vertex(p, color));
    indices.push(a, e, c, a, c, b);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.addGroup(0, indices.length, 0);
  const white = new THREE.Color(0xffffff);
  // The texture already includes the terminal .99 cut and machined bevel.
  const center = vertex([0, h / 2, 0], white),
    first = center + 1;
  for (let i = 0; i < segments; i++)
    vertex([w * 0.5 * circle[i][0], h / 2, d * 0.5 * circle[i][1]], white);
  const start = indices.length;
  for (let i = 0; i < segments; i++)
    indices.push(center, first + ((i + 1) % segments), first + i);
  geometry.addGroup(start, indices.length - start, 1);
  const base = indices.length,
    bottom = new THREE.Color(enemy ? '#50362d' : '#57452d'),
    next = vertices.length / 3;
  vertex([0, -h / 2, 0], bottom);
  for (let i = 0; i < segments; i++)
    vertex([w * 0.47 * circle[i][0], -h / 2, d * 0.47 * circle[i][1]], bottom);
  for (let i = 0; i < segments; i++)
    indices.push(next, next + 1 + i, next + 1 + ((i + 1) % segments));
  geometry.addGroup(base, indices.length - base, 0);
  geometry.setIndex(indices);
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, [
    new THREE.MeshBasicMaterial({ vertexColors: true }),
    new THREE.MeshBasicMaterial({ map: texture }),
  ]);
}
// Four projected basis points suffice under the orthographic camera. Share
// each ring of endpoints across its adjacent strips, also on software-only GPUs.
export function paintMedallionWall(ctx, w, d, h, enemy, project) {
  const origin = project([0, -h / 2, 0]),
    x = project([w / 2, -h / 2, 0]),
    z = project([0, -h / 2, d / 2]),
    up = project([0, h / 2, 0]);
  const outline = (radius, level) =>
    circle.map(([cx, cz]) => ({
      x:
        origin.x +
        (x.x - origin.x) * cx * radius +
        (z.x - origin.x) * cz * radius +
        ((up.x - origin.x) * level) / 0.155,
      y:
        origin.y +
        (x.y - origin.y) * cx * radius +
        (z.y - origin.y) * cz * radius +
        ((up.y - origin.y) * level) / 0.155,
    }));
  let bottom = outline(0.94, 0.005);
  for (const [low, high, , r2, material] of bands) {
    const top = outline(r2, high);
    for (let i = 0; i < segments; i++) {
      const p = bottom[i],
        q = bottom[i + 1],
        r = top[i + 1],
        s = top[i];
      if ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) < 0) continue;
      ctx.fillStyle =
        'rgb(' + bandColour(i, low, material, enemy).join(',') + ')';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.lineTo(r.x, r.y);
      ctx.lineTo(s.x, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
    bottom = top;
  }
}

export function pawnRings(lib, w, d, h) {
  const group = new THREE.Group();
  const size = 1.19;
  for (const hidden of [false, true]) {
    const tex = lib.texture(
      'patio:peana:' + (hidden ? 'secreta' : 'turno'),
      244,
      244,
      (g, W, H) => {
        const s = W / size;
        g.translate(W / 2, H / 2);
        g.lineWidth = 0.017 * s;
        g.strokeStyle = hidden ? '#d1c6a1' : '#d9bb76';
        if (hidden) g.setLineDash([s * 0.055, s * 0.042]);
        g.beginPath();
        g.arc(
          0,
          0,
          s * 0.54,
          hidden ? 0 : 0.27 * Math.PI,
          hidden ? 2 * Math.PI : 0.73 * Math.PI
        );
        g.stroke();
      }
    );
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * size, d * size).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      })
    );
    mesh.position.y = -h / 2 + 0.011;
    mesh.visible = false;
    group.add(mesh);
  }
  group.userData.scale = size;
  return group;
}

export function updatePawnMark(node, hidden, turn) {
  const ring = node.userData.rings;
  if (!ring) return;
  ring.children[0].visible = !hidden && turn;
  ring.children[1].visible = Boolean(hidden);
  if (ring.userData.hidden !== Boolean(hidden)) {
    ring.userData.hidden = Boolean(hidden);
    for (const material of node.userData.plate.material) {
      material.transparent = Boolean(hidden);
      material.opacity = hidden ? 0.58 : 1;
      material.depthWrite = !hidden;
      material.needsUpdate = true;
    }
  }
}
