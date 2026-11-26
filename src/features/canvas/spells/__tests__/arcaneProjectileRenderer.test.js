import { createArcaneProjectilePath, getArcaneProjectileGeometry } from '../arcaneProjectileRenderer';

const points = sample => Array.from({ length: 20 }, (_, index) => ({ x: sample.trail[index * 4], y: sample.trail[index * 4 + 1] }));

test('flight and its luminous trail retain the corners of a route around a wall', () => {
  const route = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 100 }];
  const path = createArcaneProjectilePath(route, 35);
  expect(path.sample(0).head).toEqual(route[0]);
  expect(path.sample(.5).head).toEqual({ x: 50, y: 50 });
  expect(path.sample(1).head).toEqual(route[3]);
  const trail = points(path.sample(.85));
  expect(trail).toContainEqual(route[1]);
  expect(trail).toContainEqual(route[2]);
  trail.slice(1).forEach((point, index) => {
    const previous = trail[index];
    expect(point.x === previous.x || point.y === previous.y).toBe(true);
  });
});

test('dense routes shorten the tail instead of cutting across omitted corners', () => {
  const route = [{ x: 0, y: 0 }];
  for (let index = 1; index < 36; index += 1) route.push({ x: Math.ceil(index / 2) * 2, y: Math.floor(index / 2) * 2 });
  const sample = createArcaneProjectilePath(route, 35).sample(1), trail = points(sample);
  expect(sample.head).toEqual(route[route.length - 1]);
  trail.slice(1).forEach((point, index) => {
    const previous = trail[index];
    expect(point.x === previous.x || point.y === previous.y).toBe(true);
  });
});

test('short and coincident endpoints produce finite bounded samples', () => {
  const origin = { x: 23, y: -51 };
  const path = createArcaneProjectilePath([origin, origin], 24);
  [-1, 0, .5, 1, 2].forEach(progress => {
    const sample = path.sample(progress);
    expect(sample.head).toEqual(origin);
    expect([...sample.trail].every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(sample.angle)).toBe(true);
  });
});

test('the entire winding route and impact halo fit inside the local surface', () => {
  const route = [{ x: 200, y: 300 }, { x: 100, y: 100 }, { x: -100, y: 250 }];
  const geometry = getArcaneProjectileGeometry({ sourcePosition: { x: 175, y: 275 }, placement: { x: -125, y: 225, width: 50, height: 50, route } });
  route.forEach(point => {
    expect(point.x - geometry.radius * 2.3).toBeGreaterThan(geometry.x);
    expect(point.y - geometry.radius * 2.3).toBeGreaterThan(geometry.y);
    expect(point.x + geometry.radius * 2.3).toBeLessThan(geometry.x + geometry.width);
    expect(point.y + geometry.radius * 2.3).toBeLessThan(geometry.y + geometry.height);
  });
  expect(geometry.path).toBe('M 200 300 L 100 100 L -100 250');
});
