// Contact and launch from Patio de Ceniza/fuente/fisica-dados.js. World units
// are grid cells. Height is Y in the shared Three/Cannon room.
import * as C from 'cannon-es';
import { collisionHull } from './patioDiceMoulds';

const densities = {
  ivory: 0.92,
  jade: 1.19,
  steel: 1.62,
  rust: 1.52,
  amber: 0.82,
  lapis: 1.15,
  obsidian: 1.08,
  carnelian: 1.13,
  critical: 1.13,
};
const die = new C.Material('dado'),
  table = new C.Material('mesa');

class DiceContactSolver extends C.GSSolver {
  solve(dt, world) {
    const gravity = world.gravity.length(),
      loads = new Map();
    const involvesDie = (e) => e.bi.material === die || e.bj.material === die;
    const pair = (e) =>
      e.bi.id < e.bj.id ? e.bi.id + '/' + e.bj.id : e.bj.id + '/' + e.bi.id;
    for (const contact of world.contacts) {
      if (!involvesDie(contact)) continue;
      const key = pair(contact),
        speed = Math.max(0, contact.getImpactVelocityAlongNormal());
      if (speed < gravity * dt * 2.4) contact.restitution = 0;
      const support = dt * Math.abs(contact.ni.y),
        impact = gravity ? (speed * (1 + contact.restitution)) / gravity : 0;
      const load = loads.get(key) || { points: 0, interval: 0 };
      load.points++;
      load.interval = Math.max(load.interval, support + impact);
      loads.set(key, load);
    }
    for (const friction of world.frictionEquations) {
      const load = loads.get(pair(friction));
      if (!load) continue;
      friction.maxForce *= load.interval / load.points;
      friction.minForce = -friction.maxForce;
    }
    return super.solve(dt, world);
  }
}

export function patioWorld() {
  const world = new C.World({
    gravity: new C.Vec3(0, -22, 0),
    allowSleep: true,
    solver: new DiceContactSolver(),
  });
  world.solver.iterations = 22;
  world.solver.tolerance = 0.0001;
  world.broadphase = new C.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.44;
  world.defaultContactMaterial.restitution = 0.28;
  for (const [other, friction, restitution] of [
    [die, 0.2, 0.44],
    [table, 0.23, 0.23],
  ]) {
    world.addContactMaterial(
      new C.ContactMaterial(die, other, {
        friction,
        restitution,
        contactEquationRelaxation: 3,
      })
    );
  }
  const floor = new C.Body({ mass: 0, shape: new C.Plane(), material: table });
  floor.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(floor);
  return world;
}
export function tableMaterial(isDie) {
  return isDie ? die : table;
}

export function weighDie(body, sides, finish, radius) {
  const hull = collisionHull(Number(sides) === 100 ? 10 : sides);
  // Common conversion to the mass scale of NOMA's other freely movable pieces.
  const mass =
    0.14 * hull.volume * (densities[finish] || 1) * (radius / 0.34) ** 3;
  body.mass = mass;
  body.updateMassProperties();
  body.material = die;
  body.linearDamping = 0.19;
  body.angularDamping = 0.25;
  body.sleepTimeLimit = 0.24;
  body.sleepSpeedLimit = 0.12 * 0.34;
  const scale = mass * radius * radius;
  body.inertia.set(
    hull.inertia.x * scale,
    hull.inertia.z * scale,
    hull.inertia.y * scale
  );
  body.invInertia.set(
    1 / body.inertia.x,
    1 / body.inertia.y,
    1 / body.inertia.z
  );
  body.updateInertiaWorld(true);
}
const swipeWindow = 70;
export function recordDiePoint(samples, p, t) {
  const last = samples.at(-1);
  if (last) {
    if (t < last.t || (p.x === last.x && p.z === last.z)) return;
    if (t - last.t > swipeWindow) last.t = t - swipeWindow;
  }
  samples.push({ x: p.x, z: p.z, t });
  while (samples.length > 2 && samples[1].t <= t - swipeWindow) samples.shift();
}
export function dieSwipe(samples, now) {
  const last = samples.at(-1),
    first = samples[0];
  if (samples.length < 2 || now - last.t >= 100) return { x: 0, z: 0 };
  const start = Math.max(first.t, last.t - swipeWindow),
    next = samples[1];
  const t = (start - first.t) / Math.max(1, next.t - first.t);
  const gain =
    (Math.max(0, Math.min(1, (100 - Math.max(0, now - last.t)) / 70)) * 1000) /
    Math.max(14, last.t - start);
  const vx = (last.x - first.x - (next.x - first.x) * t) * gain,
    vz = (last.z - first.z - (next.z - first.z) * t) * gain;
  const input = Math.hypot(vx, vz),
    limit = 8.8,
    speed = limit * Math.tanh((1.25 * input) / limit);
  return input > 0
    ? { x: (vx * speed) / input, z: (vz * speed) / input }
    : { x: 0, z: 0 };
}
export function spinDie(body, velocity) {
  body.angularFactor.set(1, 1, 1);
  body.velocity.set(
    velocity.x,
    1.45 + Math.hypot(velocity.x, velocity.z) * 0.12,
    velocity.z
  );
  body.angularVelocity.set(
    (Math.random() - 0.5) * 13 + velocity.z * 0.45,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 13 - velocity.x * 0.45
  );
}
