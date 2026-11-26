// The moulds and engraving from Patio de Ceniza (formas.js, poliedros.js,
// talla.js, fisica-dados.js). The source uses X/Y on the table and Z up.
// The Three adapter converts those coordinates only at the mesh boundary.
import * as C from 'cannon-es';
const mix = (a, b, t) => a + (b - a) * t;
const tau = Math.PI * 2;
const faceSize = 256;
// La malla que toca el suelo también determina la lectura del dado.
const vec = (x, y, z) => new C.Vec3(x, y, z);
const up = vec(0, 0, 1);
const dieShapes = new Map();
function buildDie(sides, coordinates, faces, values) {
  const radius = Math.max(...coordinates.map((p) => Math.hypot(...p)));
  const vertices = coordinates.map((p) => vec(...p).scale(1 / radius));
  const normals = faces.map((f) => {
    const a = vertices[f[0]],
      b = vertices[f[1]],
      c = vertices[f[2]];
    const n = b.vsub(a).cross(c.vsub(a));
    n.normalize();
    if (n.dot(a) < 0) {
      f.reverse();
      n.negate(n);
    }
    return n;
  });
  dieShapes.set(sides, { vertices, faces, normals, values });
}
// El troquel se construye en el plano real de la cara. Su orientación pertenece
// al sólido y se conserva al girarlo, también en las caras que quedan detrás.
function faceCoordinates(mesh, face, tip) {
  const vertices = mesh.faces[face].map((id) => mesh.vertices[id]);
  const center = faceCenter(mesh, face);
  const down = unit(center.vsub(mesh.vertices[tip]));
  const right = unit(down.cross(mesh.normals[face]));
  const plane = vertices.map((v) => ({ x: v.dot(right), y: v.dot(down) }));
  const xs = plane.map((p) => p.x),
    ys = plane.map((p) => p.y);
  const left = Math.min(...xs),
    top = Math.min(...ys),
    width = Math.max(...xs) - left,
    height = Math.max(...ys) - top;
  return {
    uv: plane.map((p) => ({
      x: (p.x - left) / width,
      y: (p.y - top) / height,
    })),
    aspect: width / height,
  };
}
function faceCenter(mesh, face) {
  const ids = mesh.faces[face];
  return ids
    .reduce((sum, id) => sum.vadd(mesh.vertices[id]), vec(0, 0, 0))
    .scale(1 / ids.length);
}
buildDie(
  4,
  [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ],
  [
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
    [1, 2, 3],
  ],
  [1, 2, 3, 4]
);
buildDie(
  6,
  [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 2, 6, 7],
    [0, 3, 7, 4],
    [1, 2, 6, 5],
  ],
  [6, 1, 2, 5, 3, 4]
);
buildDie(
  8,
  [
    [1, 0, 0],
    [0, 1, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
  [
    [4, 0, 1],
    [4, 1, 2],
    [4, 2, 3],
    [4, 3, 0],
    [5, 0, 1],
    [5, 1, 2],
    [5, 2, 3],
    [5, 3, 0],
  ],
  [1, 3, 5, 7, 4, 2, 8, 6]
);
// D8 Chessex fotografiado en https://aleakybos.ch/Configurations.htm (D8).
// Los pares rodean un polo y los impares el otro. Los pies de cada cifra
// descansan en la arista del ecuador que comparte con la pirámide opuesta.
const octahedron = dieShapes.get(8);
octahedron.layouts = octahedron.faces.map((ids, face) =>
  faceCoordinates(
    octahedron,
    face,
    ids.find((id) => id >= 4)
  )
);

function unit(v) {
  const result = v.clone();
  result.normalize();
  return result;
}
function roundedHull(mesh, sides) {
  const bevel = sides === 6 ? 0.138 : sides === 4 ? 0.1 : 0.102,
    core = 1 - bevel,
    patches = [],
    edges = new Map();
  const rim = mesh.vertices.map(() => []);
  function shell(id, n) {
    return mesh.vertices[id].scale(core).vadd(n.scale(bevel));
  }
  function patch(ids, n, face = -1) {
    patches.push({ points: ids, n, face });
  }
  mesh.faces.forEach((ids, i) => {
    const n = mesh.normals[i];
    patch(
      ids.map((id) => shell(id, n)),
      n,
      i
    );
    ids.forEach((a, j) => {
      const b = ids[(j + 1) % ids.length],
        key = [Math.min(a, b), Math.max(a, b)].join('/');
      if (!edges.has(key)) edges.set(key, { a, b, normals: [] });
      edges.get(key).normals.push(n);
    });
  });
  for (const {
    a,
    b,
    normals: [left, right],
  } of edges.values()) {
    let prev = left;
    for (let j = 0; j <= 4; j++) {
      const t = j / 4,
        n = unit(left.scale(1 - t).vadd(right.scale(t)));
      rim[a].push(n);
      rim[b].push(n);
      if (j)
        patch(
          [shell(a, prev), shell(b, prev), shell(b, n), shell(a, n)],
          unit(prev.vadd(n))
        );
      prev = n;
    }
  }
  rim.forEach((normals, i) => {
    const pole = unit(mesh.vertices[i]),
      u = unit(pole.cross(Math.abs(pole.z) < 0.85 ? up : vec(0, 1, 0))),
      v = pole.cross(u);
    const sorted = normals
      .filter(
        (n, j) => normals.findIndex((k) => k.almostEquals(n, 0.0001)) === j
      )
      .sort(
        (a, b) =>
          Math.atan2(a.dot(v), a.dot(u)) - Math.atan2(b.dot(v), b.dot(u))
      );
    sorted.forEach((n, j) => {
      const next = sorted[(j + 1) % sorted.length];
      patch(
        [shell(i, pole), shell(i, n), shell(i, next)],
        unit(pole.vadd(n).vadd(next))
      );
    });
  });
  return patches;
}
function trace(g, points) {
  g.beginPath();
  points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
}
function inkNumber(g, label, x, y, size) {
  g.save();
  g.translate(x, y);
  g.font = 'bold ' + size + 'px Cambria, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const y0 = size * 0.055;
  g.fillStyle = '#ebcf98';
  g.fillText(label, 0, y0 + 2);
  g.lineWidth = Math.max(2, size * 0.065);
  g.strokeStyle = '#302318';
  g.strokeText(label, 0, y0);
  const metal = g.createLinearGradient(0, -size * 0.45, 0, size * 0.47);
  metal.addColorStop(0, '#fff6dd');
  metal.addColorStop(0.55, '#f9e0aa');
  metal.addColorStop(1, '#ebc482');
  g.fillStyle = metal;
  g.fillText(label, 0, y0);
  if (label === '6' || label === '9') {
    const text = g.measureText(label),
      underlineX = (g.measureText(label[0]).width - text.width) / 2;
    const y = y0 + text.actualBoundingBoxDescent + size * 0.085;
    g.beginPath();
    g.moveTo(underlineX - size * 0.14, y);
    g.lineTo(underlineX + size * 0.14, y);
    g.lineCap = 'round';
    g.strokeStyle = '#302318';
    g.lineWidth = size * 0.069;
    g.stroke();
    g.strokeStyle = '#ffdf9c';
    g.lineWidth = size * 0.041;
    g.stroke();
  }
  g.restore();
}
const pips = [
  [],
  [[0, 0]],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 1],
    [0, 0],
    [1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
];
function pip(g, x, y, r, gilded = false) {
  const lip = g.createLinearGradient(x - r, y - r, x + r, y + r);
  lip.addColorStop(0, '#9f8053');
  lip.addColorStop(0.5, '#907348');
  lip.addColorStop(1, '#fff3ce');
  g.fillStyle = lip;
  g.beginPath();
  g.arc(x, y, r + 2.1, 0, tau);
  g.fill();
  const well = g.createRadialGradient(x - r * 0.34, y - r * 0.42, 0, x, y, r);
  well.addColorStop(0, gilded ? '#fff2cc' : '#271e19');
  well.addColorStop(0.66, gilded ? '#e9c286' : '#36291e');
  well.addColorStop(1, gilded ? '#a67445' : '#5b432c');
  g.fillStyle = well;
  g.beginPath();
  g.arc(x, y, r, 0, tau);
  g.fill();
}
const triangleUV = [
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: 0.5, y: 0 },
];
const squareUV = [
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
];
function faceUV(mesh, face) {
  return (
    mesh.layouts?.[face].uv ||
    (mesh.faces[face].length === 4 ? squareUV : triangleUV)
  );
}
const meanVertex = (vs) =>
  vs.reduce((sum, v) => sum.vadd(v), vec(0, 0, 0)).scale(1 / vs.length);
// Desarrollo numerado de Panda Game Manufacturing, contrastado con las fotos
// de ambas mitades de Alea Kybos. Cada pareja identifica valor y vértice hacia
// el que apunta la cabeza del número, en el orden de caras de cada sólido.
// https://pandagm.com/wp-content/uploads/2022/07/PandaGM-PolyhedralDice-Templates-v4.pdf
function applyEngravings(mesh, engravings) {
  mesh.values = engravings.map(([value]) => value);
  mesh.layouts = engravings.map(([, tip], face) =>
    faceCoordinates(mesh, face, tip)
  );
}
function prepareMoreShapes() {
  const phi = (1 + Math.sqrt(5)) / 2,
    ico = [];
  for (const a of [-1, 1])
    for (const b of [-phi, phi])
      ico.push(vec(0, a, b), vec(a, b, 0), vec(b, 0, a));
  const triangles = [];
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      for (let k = j + 1; k < 12; k++) {
        if (
          [
            ico[i].distanceTo(ico[j]),
            ico[i].distanceTo(ico[k]),
            ico[j].distanceTo(ico[k]),
          ].every((d) => Math.abs(d - 2) < 1e-7)
        )
          triangles.push([i, j, k]);
      }
  buildDie(
    20,
    ico.map((v) => v.toArray()),
    triangles,
    []
  );
  const icoMesh = dieShapes.get(20);
  applyEngravings(icoMesh, [
    [20, 0],
    [14, 0],
    [2, 0],
    [18, 0],
    [4, 0],
    [8, 8],
    [6, 3],
    [16, 1],
    [12, 4],
    [10, 2],
    [9, 7],
    [3, 9],
    [19, 9],
    [15, 6],
    [17, 9],
    [7, 9],
    [5, 10],
    [11, 11],
    [13, 5],
    [1, 9],
  ]);
  const dual = icoMesh.faces.map((f) => unit(meanVertex(f.map((i) => ico[i]))));
  const pentagons = ico.map((vertex, i) => {
    const n = unit(vertex),
      u = unit(n.cross(Math.abs(n.z) < 0.85 ? up : vec(0, 1, 0))),
      v = n.cross(u);
    const ids = icoMesh.faces
      .map((f, j) => (f.includes(i) ? j : -1))
      .filter((j) => j >= 0);
    return ids.sort(
      (a, b) =>
        Math.atan2(dual[a].dot(v), dual[a].dot(u)) -
        Math.atan2(dual[b].dot(v), dual[b].dot(u))
    );
  });
  buildDie(
    12,
    dual.map((v) => v.toArray()),
    pentagons,
    []
  );
  applyEngravings(dieShapes.get(12), [
    [12, 3],
    [9, 7],
    [11, 9],
    [10, 6],
    [6, 8],
    [8, 18],
    [3, 13],
    [7, 10],
    [5, 5],
    [1, 11],
    [4, 16],
    [2, 17],
  ]);
  const height = 1.19,
    cos = Math.cos(Math.PI / 5),
    offset = (height * (1 - cos)) / (1 + cos);
  const coords = [
      [0, 0, height],
      [0, 0, -height],
    ],
    kites = [];
  for (let i = 0; i < 10; i++)
    coords.push([
      Math.cos((i * Math.PI) / 5),
      Math.sin((i * Math.PI) / 5),
      i % 2 ? -offset : offset,
    ]);
  for (let i = 0; i < 10; i++)
    kites.push([i % 2, 2 + i, 2 + ((i + 1) % 10), 2 + ((i + 2) % 10)]);
  // Chessex: 9,1,7,3,5 en sentido antihorario alrededor del polo impar.
  buildDie(10, coords, kites, [9, 2, 5, 8, 3, 0, 7, 4, 1, 6]);
  const d10 = dieShapes.get(10);
  d10.layouts = d10.faces.map((ids, face) =>
    faceCoordinates(
      d10,
      face,
      ids.find((id) => id < 2)
    )
  );
}

prepareMoreShapes();
export function engraveFace(g, sides, face, finish, marks, surfaces) {
  const T = faceSize,
    img = surfaces[finish],
    critical = finish === 'critical';
  if (!img) return;
  if (critical) {
    g.save();
    g.translate(T / 2, T / 2);
    g.rotate(((face % 4) * Math.PI) / 2);
    g.drawImage(img, -T / 2, -T / 2, T, T);
    g.restore();
  } else
    g.drawImage(
      img,
      (face * 47) % 128,
      (face * 31) % 112,
      img.width - 140,
      img.height - 130,
      0,
      0,
      T,
      T
    );
  const mesh = dieShapes.get(sides),
    val = mesh.values[face],
    c = T / 2;
  if (critical) {
    mesh.garnetCuts ??= [];
    mesh.garnetCuts[face] ??= garnetCrown(mesh, face);
  }
  if (marks === 'presion') {
    g.fillStyle = finish === 'jade' ? '#243a2f66' : '#68281a8c';
    g.fillRect(0, 0, T, T);
    g.strokeStyle = '#c39e69';
    g.lineWidth = 4;
    g.strokeRect(11, 11, T - 22, T - 22);
    g.strokeStyle = '#33291e';
    g.lineWidth = 2;
    g.strokeRect(17, 17, T - 34, T - 34);
    for (const x of [25, T - 25])
      for (const y of [25, T - 25]) {
        g.fillStyle = '#e4c18c';
        g.beginPath();
        g.arc(x, y, 3, 0, tau);
        g.fill();
      }
  } else {
    const pts = faceUV(mesh, face).map((p) => ({ x: p.x * T, y: p.y * T }));
    const cy = pts.reduce((sum, v) => sum + v.y, 0) / pts.length;
    if (critical) {
      if (sides === 8 && surfaces.garnetFracture)
        g.drawImage(surfaces.garnetFracture, 0, 0);
    } else if (sides === 6) {
      g.strokeStyle = '#ac88554f';
      g.lineWidth = 1.7;
      g.strokeRect(8, 8, T - 16, T - 16);
    } else {
      for (const [k, col, w] of [
        [0.9, '#2f3228', 3],
        [0.87, '#e0bf7d', 1.9],
      ]) {
        trace(
          g,
          pts.map((v) => ({ x: mix(c, v.x, k), y: mix(cy, v.y, k) }))
        );
        g.strokeStyle = col;
        g.lineWidth = w;
        g.stroke();
      }
      if (sides !== 4) {
        for (const p of pts) {
          const x = mix(c, p.x, 0.69),
            y = mix(cy, p.y, 0.69);
          g.fillStyle = '#e9ce8c';
          g.beginPath();
          g.arc(x, y, 2.6, 0, tau);
          g.fill();
        }
      }
    }
    if (sides === 6) {
      for (const [x, y] of pips[val])
        pip(g, c + x * 65, c + y * 65, val === 1 ? 28 : 19, critical);
    } else faceNumerals(g, sides, mesh, face, marks, pts, { x: c, y: cy });
  }
}
function faceMatrix(points, uv) {
  const [a, b, c] = points,
    [u, v, w] = uv;
  const ux = v.x - u.x,
    uy = v.y - u.y,
    vx = w.x - u.x,
    vy = w.y - u.y,
    det = ux * vy - vx * uy;
  const ex = {
    x: ((b.x - a.x) * vy - (c.x - a.x) * uy) / det,
    y: ((b.y - a.y) * vy - (c.y - a.y) * uy) / det,
  };
  const ey = {
    x: ((c.x - a.x) * ux - (b.x - a.x) * vx) / det,
    y: ((c.y - a.y) * ux - (b.y - a.y) * vx) / det,
  };
  return {
    ex,
    ey,
    top: { x: a.x - u.x * ex.x - u.y * ey.x, y: a.y - u.x * ex.y - u.y * ey.y },
  };
}
const numeralStamps = new Map();
function numeralStamp(label) {
  if (numeralStamps.has(label)) return numeralStamps.get(label);
  const tile = document.createElement('canvas');
  tile.width = label.length === 1 ? 110 : 192;
  tile.height = 154;
  const ctx = tile.getContext('2d', { willReadFrequently: true });
  inkNumber(ctx, label, tile.width / 2, tile.height / 2, 128);
  const pixels = ctx.getImageData(0, 0, tile.width, tile.height).data;
  let left = tile.width,
    right = 0,
    top = tile.height,
    bottom = 0;
  for (let y = 0; y < tile.height; y++)
    for (let x = 0; x < tile.width; x++) {
      if (!pixels[(y * tile.width + x) * 4 + 3]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
  const stamp = {
    tile,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    hw: (right - left) / 2,
    hh: (bottom - top) / 2,
  };
  numeralStamps.set(label, stamp);
  return stamp;
}
function engravingArea(polygon, anchor) {
  const edges = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length],
      nx = a.y - b.y,
      ny = b.x - a.x;
    const gap = Math.abs(nx * (anchor.x - a.x) + ny * (anchor.y - a.y));
    return { nx, ny, gap };
  });
  return { anchor, edges };
}
function faceAreas(poly, center, sides) {
  const towards = (a, b, k) => ({ x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) });
  const inset = poly.map((p) => towards(center, p, 0.85));
  return sides === 4
    ? inset.map((p, i) => {
        const cell = [
          p,
          towards(p, inset[(i + 1) % 3], 0.5),
          center,
          towards(p, inset[(i + 2) % 3], 0.5),
        ];
        return engravingArea(cell, towards(center, poly[i], 0.43));
      })
    : [engravingArea(inset, center)];
}
function stampNumeral(g, label, area, em, radians, aspect) {
  const c = Math.cos(radians),
    s = Math.sin(radians);
  const axes = [c, s * aspect, -s, c * aspect];
  const { tile, cx, cy, hw, hh } = numeralStamp(label);
  let scale = em / 128;
  for (const { nx, ny, gap } of area.edges) {
    const extent =
      hw * Math.abs(nx * axes[0] + ny * axes[1]) +
      hh * Math.abs(nx * axes[2] + ny * axes[3]);
    if (extent > 0) scale = Math.min(scale, gap / extent);
  }
  g.save();
  g.transform(...axes, area.anchor.x, area.anchor.y);
  g.drawImage(
    tile,
    -cx * scale,
    -cy * scale,
    tile.width * scale,
    tile.height * scale
  );
  g.restore();
}
function faceNumerals(g, sides, mesh, face, marks, poly, center) {
  const ids = mesh.faces[face],
    areas = faceAreas(poly, center, sides),
    aspect = mesh.layouts?.[face].aspect || 2 / Math.sqrt(3);
  if (sides === 4) {
    areas.forEach((area, i) => {
      const vertex = poly[i],
        angle = Math.atan2(vertex.x - center.x, (center.y - vertex.y) / aspect);
      stampNumeral(g, String(ids[i] + 1), area, 84, angle, aspect);
    });
    return;
  }
  const value = mesh.values[face],
    label =
      marks === 'tens' ? String(value * 10).padStart(2, '0') : String(value);
  const em =
    sides === 10
      ? label.length === 2
        ? 118
        : 140
      : sides === 12
        ? 154
        : label.length === 2
          ? 126
          : 173;
  // En el dado de decenas de Chessex Germany el cero final mira al polo.
  // La pareja de cifras ocupa la diagonal larga de la cometa.
  stampNumeral(
    g,
    label,
    areas[0],
    em,
    marks === 'tens' ? -Math.PI / 2 : 0,
    aspect
  );
}
function garnetCrown(mesh, face) {
  const uv = faceUV(mesh, face),
    vertices = mesh.faces[face].map((id) => mesh.vertices[id]);
  const center = { x: 0.5, y: uv.reduce((sum, p) => sum + p.y, 0) / uv.length },
    middle = faceCenter(mesh, face);
  const inset = uv.length === 4 ? 0.8 : 0.87,
    cut = 0.14;
  const between = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
  const edges = uv.map((a, i) => {
    const b = uv[(i + 1) % uv.length];
    return {
      a,
      b,
      mid: between(a, b, 0.5),
      left: between(center, between(a, b, cut), inset),
      right: between(center, between(a, b, 1 - cut), inset),
    };
  });
  const facets = [];
  function facet(a, b, c, tilt) {
    facets.push({ uv: [a, b, c], normal: unit(mesh.normals[face].vadd(tilt)) });
  }
  edges.forEach((e, i) => {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length];
    const outward = unit(a.vadd(b).scale(0.5).vsub(middle)),
      along = unit(b.vsub(a)).scale(0.34);
    facet(e.a, e.mid, e.left, outward.scale(0.54).vsub(along));
    facet(e.mid, e.right, e.left, outward.scale(0.31));
    facet(e.mid, e.b, e.right, outward.scale(0.54).vadd(along));
    facet(
      e.a,
      e.left,
      edges[(i + edges.length - 1) % edges.length].right,
      unit(a.vsub(middle)).scale(0.48)
    );
  });
  return facets;
}
const collisionGeometry = new Map();
function collisionHull(sides) {
  if (collisionGeometry.has(sides)) return collisionGeometry.get(sides);
  const mesh = dieShapes.get(sides),
    bevel = sides === 6 ? 0.138 : sides === 4 ? 0.1 : 0.102;
  const vertices = [],
    faces = [],
    edges = new Map(),
    corners = mesh.vertices.map(() => []);
  function addFace(ids) {
    const [a, b, c] = ids.map((i) => vertices[i]);
    if (b.vsub(a).cross(c.vsub(a)).dot(a) < 0) ids.reverse();
    faces.push(ids);
  }
  // Una cara plana por bisel. Los vértices de unión siguen el tallado visible.
  mesh.faces.forEach((loop, i) => {
    const ids = loop.map((id) => {
      const j = vertices.length;
      vertices.push(
        mesh.vertices[id].scale(1 - bevel).vadd(mesh.normals[i].scale(bevel))
      );
      corners[id].push(j);
      return j;
    });
    addFace(ids);
    loop.forEach((id, j) => {
      const k = (j + 1) % ids.length,
        key = [Math.min(id, loop[k]), Math.max(id, loop[k])].join('/');
      const prior = edges.get(key);
      if (prior) addFace([prior[0], prior[1], ids[j], ids[k]]);
      else edges.set(key, [ids[j], ids[k]]);
    });
  });
  corners.forEach((ring, i) => {
    const n = mesh.vertices[i],
      u = unit(n.cross(Math.abs(n.z) < 0.8 ? up : vec(0, 1, 0))),
      v = n.cross(u);
    const angle = (j) => Math.atan2(vertices[j].dot(v), vertices[j].dot(u));
    addFace(ring.sort((a, b) => angle(a) - angle(b)));
  });
  // Integramos los tetraedros con origen en el centro. Los moldes son simétricos
  // en sus ejes principales, así que basta con la diagonal de la inercia.
  let volume = 0;
  const second = vec(0, 0, 0);
  for (const face of faces)
    for (let i = 1; i < face.length - 1; i++) {
      const a = vertices[face[0]],
        b = vertices[face[i]],
        c = vertices[face[i + 1]],
        dv = a.dot(b.cross(c)) / 6;
      volume += dv;
      for (const k of ['x', 'y', 'z'])
        second[k] +=
          (dv *
            (a[k] ** 2 +
              b[k] ** 2 +
              c[k] ** 2 +
              a[k] * b[k] +
              b[k] * c[k] +
              c[k] * a[k])) /
          10;
    }
  const inertia = vec(
    second.y + second.z,
    second.x + second.z,
    second.x + second.y
  ).scale(1 / volume);
  const hull = { vertices, faces, volume, inertia };
  collisionGeometry.set(sides, hull);
  return hull;
}
const dockedPoses = new Map();
function dockedAttitude(sides, value, marks = 'normal') {
  const key = [sides, value, marks].join('/');
  if (dockedPoses.has(key)) return dockedPoses.get(key);
  const mesh = dieShapes.get(sides),
    face = mesh.values.indexOf(value);
  const axis = sides === 4 ? mesh.vertices[value - 1] : mesh.normals[face];
  const level = new C.Quaternion().setFromVectors(axis, up);
  let yaw;
  if (sides === 4) {
    // El resultado del tetraedro está en la cúspide. Una arista de la base
    // mira al jugador y deja el número del vértice en el centro de la cara frontal.
    const base = mesh.faces
      .find((ids) => ids.includes(value - 1))
      .filter((id) => id !== value - 1);
    const forward = level.vmult(
      mesh.vertices[base[0]].vadd(mesh.vertices[base[1]])
    );
    yaw = Math.PI / 2 - Math.atan2(forward.y, forward.x);
  } else {
    // La horizontal del propio grabado determina cómo entra la pieza en su hueco.
    const coords = mesh.faces[face].map((i) => level.vmult(mesh.vertices[i]));
    const { ex, ey } = faceMatrix(coords, faceUV(mesh, face));
    yaw =
      marks === 'tens' ? -Math.atan2(-ey.y, -ey.x) : -Math.atan2(ex.y, ex.x);
  }
  const twist = new C.Quaternion().setFromAxisAngle(up, yaw);
  const pose = twist.mult(level);
  dockedPoses.set(key, pose);
  return pose;
}

export function patioMould(sides) {
  const mesh = dieShapes.get(sides) || dieShapes.get(6);
  mesh.skin ||= roundedHull(mesh, sides);
  return mesh;
}
export { faceUV, collisionHull, dockedAttitude, garnetCrown };
