import * as C from 'cannon-es';
import * as THREE from 'three';
import {
  dieAttitude,
  dieResult,
  dieShape,
  dieSupport,
  savedDiePose,
} from '../rendererDice';
import {
  patioWorld,
  weighDie,
  dieSwipe,
  recordDiePoint,
} from '../patioDiceDynamics';
import { patioMould, faceUV } from '../patioDiceMoulds';
import legacyMoulds from '../rendererDiceModels.json';

const up = new THREE.Vector3(0, 1, 0);
const allSides = [4, 6, 8, 10, 12, 20];

test.each(allSides)(
  'el d%i apoya cada resultado de su molde en la mesa y el encaje conserva esa cara',
  (sides) => {
    const shape = dieShape(sides, 0.34);
    for (let value = 1; value <= sides; value++) {
      const q = dieAttitude(sides, value);
      expect(dieResult(sides, q)).toBe(value);
      expect(savedDiePose(sides, value, q.toArray()).angleTo(q)).toBeLessThan(
        0.00001
      );
      const projected = shape.vertices.map(
        (v) => new THREE.Vector3(v.x, v.y, v.z).applyQuaternion(q).y
      );
      expect(dieSupport(sides, q, 0.34)).toBeCloseTo(
        -Math.min(...projected),
        6
      );
    }
    shape.faces.forEach((face, i) =>
      expect(shape.faceNormals[i].dot(shape.vertices[face[0]])).toBeGreaterThan(
        0
      )
    );
  }
);

test.each(allSides)(
  'las tiradas guardadas con el anterior d%i siguen mostrando su valor',
  (sides) => {
    const old = legacyMoulds[sides];
    const vertices = old.vertices.map((v) => new THREE.Vector3(...v));
    for (let i = 0; i < sides; i++) {
      const face = old.faces[i],
        points = face.v.map((v) => vertices[v]);
      const value = sides === 4 ? i + 1 : face.value || 10;
      const normal =
        sides === 4
          ? vertices[i].clone()
          : points[1]
              .clone()
              .sub(points[0])
              .cross(points[2].clone().sub(points[0]));
      if (normal.dot(points[0]) < 0 && sides !== 4) normal.negate();
      const q = new THREE.Quaternion().setFromUnitVectors(
        normal.normalize(),
        up
      );
      expect(dieResult(sides, savedDiePose(sides, value, q.toArray()))).toBe(
        value
      );
    }
  }
);

test('el pie del grabado del d8 sigue su arista ecuatorial y el d100 conserva sus dos ceros', () => {
  const d8 = patioMould(8);
  for (let f = 0; f < 8; f++) {
    const uv = faceUV(d8, f),
      tip = d8.faces[f].findIndex((id) => id >= 4);
    expect(uv[tip].y).toBeCloseTo(0, 6);
    uv.filter((_, i) => i !== tip).forEach((v) =>
      expect(v.y).toBeCloseTo(1, 6)
    );
  }
  for (const mark of ['normal', 'tens'])
    expect(dieResult(10, dieAttitude(10, 10, mark))).toBe(10);
  expect(
    dieAttitude(10, 10, 'tens').angleTo(dieAttitude(10, 10))
  ).toBeGreaterThan(1);
});

test('el choque de dados transmite impulso y ambos acaban apoyados en la mesa', () => {
  const world = patioWorld();
  const make = (x, finish) => {
    const body = new C.Body({ mass: 1, shape: dieShape(6, 0.34) });
    weighDie(body, 6, finish, 0.34);
    const q = dieAttitude(6, 5);
    body.quaternion.copy(q);
    body.position.set(x, dieSupport(6, q, 0.34) + 0.001, 0);
    world.addBody(body);
    return body;
  };
  const first = make(0, 'steel'),
    second = make(0.49, 'ivory');
  expect(first.mass).toBeGreaterThan(second.mass);
  first.velocity.x = 3;
  for (let i = 0; i < 450; i++) world.step(1 / 90);
  expect(second.position.x).toBeGreaterThan(0.55);
  for (const b of [first, second]) {
    expect(b.position.y).toBeGreaterThan(0.12);
    expect(b.sleepState).toBe(C.Body.SLEEPING);
  }
});

test('el lanzamiento mide el último tramo del dedo y distingue una parada', () => {
  const samples = [];
  for (const [x, t] of [
    [0, 0],
    [0.04, 18],
    [0.08, 35],
    [0.12, 53],
    [0.16, 71],
  ])
    recordDiePoint(samples, { x, z: 0 }, t);
  expect(dieSwipe(samples, 71).x).toBeGreaterThan(2);
  expect(dieSwipe(samples, 191)).toEqual({ x: 0, z: 0 });
  expect(
    dieSwipe(
      [
        { x: 0, z: 0, t: 0 },
        { x: 19, z: 0, t: 30 },
      ],
      30
    ).x
  ).toBeLessThanOrEqual(8.8);
});
