import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { visual } from './rendererSurfaces';
import {
  patioMould,
  collisionHull,
  dockedAttitude,
  faceUV,
  engraveFace,
  garnetCrown,
} from './patioDiceMoulds';

const sideCounts = [4, 6, 8, 10, 12, 20];
const sideCount = (n) => (sideCounts.includes(Number(n)) ? Number(n) : 6);
const regular = {
  4: 'rust',
  6: 'ivory',
  8: 'jade',
  10: 'amber',
  12: 'lapis',
  20: 'obsidian',
};
const stone = {
  rust: 'cobre',
  ivory: 'hueso',
  jade: 'jade',
  amber: 'ambar',
  lapis: 'lapis',
  obsidian: 'obsidiana',
  steel: 'acero',
  carnelian: 'cornalina',
  critical: 'critico',
};
const rim = {
  ivory: [222, 201, 159],
  jade: [107, 169, 137],
  steel: [163, 179, 186],
  rust: [194, 126, 85],
  amber: [222, 151, 68],
  lapis: [98, 135, 167],
  obsidian: [113, 102, 116],
  carnelian: [190, 96, 65],
  critical: [162, 47, 38],
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const models = new Map();
// The original projected X east, Y south and Z high. Flipping the axis order
// here keeps its left and right faces in the photographed order, on every die.
const onTable = (v) => new THREE.Vector3(v.x, v.z, v.y);
const cell = 256,
  padding = 2,
  stride = cell + 2 * padding;

function modelFor(sides) {
  const n = sideCount(sides);
  if (models.has(n)) return models.get(n);
  const mould = patioMould(n),
    vertices = mould.vertices.map(onTable);
  const faces = mould.faces.map((v, i) => ({
    v,
    value: mould.values[i],
    normal: onTable(mould.normals[i]),
    xy: faceUV(mould, i).map((p) => [p.x, p.y]),
  }));
  const surface = mould.skin.map((p) => ({
    points: p.points.map(onTable),
    normal: onTable(p.n),
    face: p.face,
  }));
  const contact = collisionHull(n);
  const m = {
    n,
    mould,
    vertices,
    faces,
    surface,
    axes: n === 4 ? vertices : faces.map((f) => f.normal),
    geometries: new Map(),
    support: contact.vertices.map(onTable),
  };
  models.set(n, m);
  return m;
}

function finishOf(p) {
  if (p.role === 'critical' || p.critical) return 'critical';
  if (p.role === 'weapon' || p.role === 'fury') return 'steel';
  if (p.role === 'enemy') return 'rust';
  return regular[p.sides] || 'ivory';
}

function makeAtlas(lib, model, finish, marks) {
  const cols = Math.ceil(Math.sqrt(model.n)),
    rows = Math.ceil(model.n / cols);
  const texture = lib.texture(
    'patio:dice:' + model.n + '/' + finish + '/' + marks,
    cols * stride,
    rows * stride,
    (g, W, H, get) => {
      const art = get(visual('dado-' + stone[finish] + '.webp'));
      const fracture =
        finish === 'critical' && model.n === 8
          ? get(visual('fractura-granate.webp'))
          : null;
      const surfaces = { [finish]: art, garnetFracture: fracture };
      g.fillStyle = 'rgb(' + rim[finish].join(',') + ')';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < model.faces.length; i++) {
        g.save();
        g.translate(
          (i % cols) * stride + padding,
          Math.floor(i / cols) * stride + padding
        );
        g.beginPath();
        g.rect(0, 0, cell, cell);
        g.clip();
        engraveFace(g, model.n, i, finish, marks, surfaces);
        g.restore();
      }
    }
  );
  // The Patio painter mixes its shadows, gilding and gleam in display sRGB.
  // Its shaders below work in those same units in both rendering paths.
  texture.colorSpace = THREE.NoColorSpace;
  return { texture, cols, rows };
}

function surfacePoint(points, uv, p) {
  const [a, b, c] = points,
    [u, v, w] = uv;
  const ex = v[0] - u[0],
    ey = v[1] - u[1],
    fx = w[0] - u[0],
    fy = w[1] - u[1];
  const dx = p.x - u[0],
    dy = p.y - u[1],
    det = ex * fy - ey * fx;
  return a
    .clone()
    .addScaledVector(b.clone().sub(a), (dx * fy - dy * fx) / det)
    .addScaledVector(c.clone().sub(a), (dy * ex - dx * ey) / det);
}
function makeGeometry(model, cols, rows, critical) {
  const points = [],
    normals = [],
    cuts = [],
    uv = [],
    bevel = [];
  function polygon(vertices, n, facet, coords, face) {
    const c = face % cols,
      r = Math.floor(face / cols);
    for (let j = 1; j < vertices.length - 1; j++) {
      const ids = [0, j, j + 1],
        a = vertices[0],
        b = vertices[j],
        d = vertices[j + 1];
      if (b.clone().sub(a).cross(d.clone().sub(a)).dot(n) < 0) ids.reverse();
      for (const i of ids) {
        points.push(...vertices[i].toArray());
        normals.push(...n.toArray());
        cuts.push(...facet.toArray());
        bevel.push(face < 0 ? 1 : 0);
        const [x, y] = coords?.[i] || [0, 0];
        uv.push(
          (c * stride + padding + x * cell) / (cols * stride),
          1 - (r * stride + padding + y * cell) / (rows * stride)
        );
      }
    }
  }
  for (const p of model.surface) {
    const f = model.faces[p.face];
    polygon(p.points, p.normal, p.normal, f?.xy, p.face);
    if (critical && f) {
      // The crown is cut around the glyph, just ahead of the planar surface.
      // Its tiny triangular facets catch the light independently as it rolls.
      for (const cut of garnetCrown(model.mould, p.face)) {
        const vs = cut.uv.map((u) =>
          surfacePoint(p.points, f.xy, u).addScaledVector(p.normal, 0.00012)
        );
        polygon(
          vs,
          p.normal,
          onTable(cut.normal),
          cut.uv.map((v) => [v.x, v.y]),
          p.face
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [key, data, size] of [
    ['position', points, 3],
    ['normal', normals, 3],
    ['cutNormal', cuts, 3],
    ['uv', uv, 2],
    ['isBevel', bevel, 1],
  ])
    g.setAttribute(key, new THREE.Float32BufferAttribute(data, size));
  return g;
}

const vertexShader = `
attribute float isBevel;
attribute vec3 cutNormal;
varying vec2 imprint;
varying vec3 outward;
varying vec3 facet;
varying float edge;
void main(){
  imprint=uv;edge=isBevel;
  outward=normalize(mat3(modelMatrix)*normal);
  facet=normalize(mat3(modelMatrix)*cutNormal);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const fragmentShader = `
uniform sampler2D ink;
uniform vec3 metal;
uniform float ivory;
uniform float garnet;
varying vec2 imprint;
varying vec3 outward;
varying vec3 facet;
varying float edge;
void main(){
  vec3 eye=normalize(vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]));
  vec3 key=normalize(vec3(-.51,.94,0.)+.08*eye);
  vec3 halfLight=normalize(key+eye);
  float lambert=dot(outward,key),spec=max(0.,dot(outward,halfLight));
  vec3 col;
  if(edge>.5){
    float level=.36+max(0.,lambert)*.62+max(0.,-lambert)*.12;
    vec3 glint=mix(vec3(112.),vec3(144.,78.,61.),garnet)/255.;
    col=metal*level+glint*pow(spec,15.);
  }else{
    col=texture2D(ink,imprint).rgb;
    if(garnet>.5){
      float delta=(dot(facet,key)-lambert)*.57
        +(pow(max(0.,dot(facet,halfLight)),13.)-pow(spec,13.))*.48;
      if(delta>.018)col=mix(col,vec3(1.,116./255.,69./255.),min(.48,delta));
      if(delta<-.018)col=mix(col,vec3(48.,2.,15.)/255.,min(.65,-delta));
    }
    col=mix(col,vec3(16.,22.,19.)/255.,clamp(.39-.35*lambert,.025,.51));
    float gloss=pow(spec,mix(20.,10.,ivory))*mix(.28,.14,ivory);
    col=mix(col,vec3(1.,246./255.,210./255.),gloss);
  }
  gl_FragColor=vec4(min(vec3(1.),col),1.);
}`;

function singleDie(lib, p, radius, finish, marks = 'normal') {
  const model = modelFor(p.sides),
    { texture, cols, rows } = makeAtlas(lib, model, finish, marks);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ink: { value: texture },
      metal: {
        value: new THREE.Vector3(...rim[finish]).multiplyScalar(1 / 255),
      },
      ivory: { value: Number(finish === 'ivory') },
      garnet: { value: Number(finish === 'critical') },
    },
    vertexShader,
    fragmentShader,
    toneMapped: false,
  });
  const cut = finish === 'critical';
  let moulding = model.geometries.get(cut);
  if (!moulding) {
    moulding = { shape: makeGeometry(model, cols, rows, cut), users: 0 };
    model.geometries.set(cut, moulding);
  }
  const mesh = new THREE.Mesh(moulding.shape, material);
  moulding.users++;
  let released = false;
  mesh.userData.releaseMould = () => {
    if (released) return;
    released = true;
    if (--moulding.users === 0) {
      model.geometries.delete(cut);
      moulding.shape.dispose();
    }
  };
  mesh.scale.setScalar(radius);
  mesh.userData.die = { model, texture, cols, rows, radius, finish };
  return mesh;
}
export function buildDie(lib, piece, radius) {
  if (Number(piece.sides) !== 100)
    return singleDie(lib, piece, radius, finishOf(piece));
  const pair = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const die = singleDie(
      lib,
      { ...piece, sides: 10 },
      radius * 0.52,
      i ? 'amber' : 'carnelian',
      i ? 'normal' : 'tens'
    );
    die.position.x = radius * (i ? 0.48 : -0.48);
    pair.add(die);
  }
  pair.userData.dicePair = true;
  return pair;
}

export function dieShape(sides, radius) {
  if (Number(sides) === 100)
    return new CANNON.Box(
      new CANNON.Vec3(radius, radius * 0.34, radius * 0.46)
    );
  const geometry = collisionHull(sideCount(sides));
  return new CANNON.ConvexPolyhedron({
    vertices: geometry.vertices.map(
      (v) => new CANNON.Vec3(v.x * radius, v.z * radius, v.y * radius)
    ),
    faces: geometry.faces.map((f) => f.slice().reverse()),
  });
}
export function dieAttitude(sides, value, marks = 'normal') {
  if (Number(sides) === 100) return new THREE.Quaternion();
  const n = sideCount(sides),
    face =
      n === 10 && Number(value) === 10 ? 0 : clamp(Number(value) || n, 1, n);
  const q = dockedAttitude(n, face, marks);
  return new THREE.Quaternion(-q.x, -q.z, -q.y, q.w);
}
export function dieResult(sides, q) {
  const model = modelFor(sides);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q.clone().invert());
  let high = -Infinity,
    value = 1;
  model.axes.forEach((axis, i) => {
    const alignment = axis.dot(up);
    if (alignment > high) {
      high = alignment;
      value = model.n === 4 ? i + 1 : model.faces[i].value || 10;
    }
  });
  return value;
}
export function dieSupport(sides, q, radius) {
  if (Number(sides) === 100) return radius * 0.34;
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q.clone().invert());
  let low = 0;
  for (const v of modelFor(sides).support) low = Math.min(low, v.dot(up));
  return -low * radius;
}

// The software renderer uses the same rounded polygons and punched faces as
// WebGL, including the light on the small cuts around the critical die.
export function paintPatioDie(ctx, part, project, eye) {
  const { model, texture, cols, finish } = part.userData.die;
  const q = part.getWorldQuaternion(new THREE.Quaternion());
  const light = new THREE.Vector3(-0.51, 0.94, 0)
    .addScaledVector(eye, 0.08)
    .normalize();
  const half = eye.clone().add(light).normalize(),
    critical = finish === 'critical';
  const trace = (points) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++)
      ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  for (const patch of model.surface) {
    const normal = patch.normal.clone().applyQuaternion(q);
    if (normal.dot(eye) < 0.006) continue;
    const points = patch.points.map((v) =>
      project(v.clone().applyMatrix4(part.matrixWorld))
    );
    const lambert = normal.dot(light),
      spec = Math.max(0, normal.dot(half));
    trace(points);
    if (patch.face < 0) {
      const level =
        0.36 + Math.max(0, lambert) * 0.62 + Math.max(0, -lambert) * 0.12;
      const glint = critical ? [144, 78, 61] : [112, 112, 112],
        shine = spec ** 15;
      ctx.fillStyle =
        'rgb(' +
        rim[finish]
          .map((v, i) =>
            Math.min(255, Math.round(v * level + glint[i] * shine))
          )
          .join(',') +
        ')';
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.4;
      ctx.stroke();
      continue;
    }
    const [[u, v], [w, x], [y, z]] = model.faces[patch.face].xy;
    const [a, b, c] = points,
      du = w - u,
      dv = x - v,
      eu = y - u,
      ev = z - v,
      det = du * ev - dv * eu;
    const xx = ((b.x - a.x) * ev - (c.x - a.x) * dv) / det,
      yx = ((b.y - a.y) * ev - (c.y - a.y) * dv) / det;
    const xy = (du * (c.x - a.x) - eu * (b.x - a.x)) / det,
      yy = (du * (c.y - a.y) - eu * (b.y - a.y)) / det;
    ctx.save();
    ctx.clip();
    ctx.transform(xx, yx, xy, yy, a.x - u * xx - v * xy, a.y - u * yx - v * yy);
    ctx.drawImage(
      texture.image,
      (patch.face % cols) * stride + padding,
      Math.floor(patch.face / cols) * stride + padding,
      cell,
      cell,
      0,
      0,
      1,
      1
    );
    if (critical) {
      const cuts = model.mould.garnetCuts?.[patch.face];
      for (const cut of cuts || []) {
        const n = onTable(cut.normal).applyQuaternion(q);
        const delta =
          (n.dot(light) - lambert) * 0.57 +
          (Math.max(0, n.dot(half)) ** 13 - spec ** 13) * 0.48;
        if (Math.abs(delta) < 0.018) continue;
        trace(cut.uv);
        ctx.fillStyle =
          delta > 0
            ? 'rgba(255,116,69,' + Math.min(0.48, delta) + ')'
            : 'rgba(48,2,15,' + Math.min(0.65, -delta) + ')';
        ctx.fill();
      }
    }
    ctx.fillStyle =
      'rgba(16,22,19,' + clamp(0.39 - 0.35 * lambert, 0.025, 0.51) + ')';
    ctx.fillRect(0, 0, 1, 1);
    const gloss =
      spec ** (finish === 'ivory' ? 10 : 20) *
      (finish === 'ivory' ? 0.14 : 0.28);
    if (gloss > 0.002) {
      ctx.fillStyle = 'rgba(255,246,210,' + gloss + ')';
      ctx.fillRect(0, 0, 1, 1);
    }
    ctx.restore();
  }
  ctx.restore();
}

// In rooms saved with the first native renderer, south was negated at the
// mould boundary. Move that face into its recorded pose without changing its
// value. A pose already expressed in Patio coordinates passes through verbatim.
export function savedDiePose(sides, value, raw) {
  const q = new THREE.Quaternion().fromArray(raw).normalize();
  if (!value || Number(sides) === 100 || dieResult(sides, q) === Number(value))
    return q;
  const m = modelFor(sides);
  const i =
    m.n === 4
      ? Number(value) - 1
      : m.faces.findIndex((f) => (f.value || 10) === Number(value));
  const normal = m.n === 4 ? m.vertices[i] : m.faces[i]?.normal;
  if (!normal) return q;
  const old = normal.clone();
  old.z = -old.z;
  return q.multiply(
    new THREE.Quaternion().setFromUnitVectors(
      normal.clone().normalize(),
      old.normalize()
    )
  );
}
