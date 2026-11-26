import { createGame, applyGameCommand, projectGame } from '../game.cjs';
import {
  lineBetween,
  translatedLine,
  surveySnap,
  surveyKind,
} from '../surveyGeometry';

const scene = { id: 'patio', cols: 8, rows: 6, entrance: { x: 1.5, z: 1.5 } };
const gm = { role: 'master' },
  player = { role: 'player', seatId: 'puesto1' };
const wall = lineBetween(
  { id: 'w', kind: 'wall' },
  { x: 3, z: 0 },
  { x: 3, z: 4 }
);
const opts = { scene, sx: 80, sz: 70, grid: true };

test('los extremos del Canvas atraen antes de la rejilla y se pueden separar de su posición anterior', () => {
  const diagonal = lineBetween(wall, { x: 2.9, z: 0.2 }, { x: 4, z: 4 });
  expect(surveySnap({ x: 2.81, z: 0.16 }, [diagonal], opts)).toEqual({
    x: 2.9,
    z: 0.2,
  });
  expect(
    surveySnap({ x: 2.81, z: 0.16 }, [diagonal], {
      ...opts,
      exclude: diagonal.id,
    })
  ).toEqual({ x: 3, z: 0 });
  expect(
    surveySnap({ x: 2.81, z: 0.16 }, [diagonal], {
      ...opts,
      grid: false,
      exclude: diagonal.id,
    })
  ).toEqual({ x: 2.81, z: 0.16 });
  expect(
    surveySnap({ x: 2.71, z: 0.2 }, [diagonal], {
      ...opts,
      grid: false,
      touch: true,
    })
  ).toEqual({ x: 2.9, z: 0.2 });
});
test('la empuñadura central desplaza ambos extremos con la misma distancia y respeta los bordes', () => {
  expect(translatedLine(wall, { x: 7, z: 10 }, scene)).toMatchObject({
    x: 8,
    z: 4,
    x1: 8,
    z1: 2,
    x2: 8,
    z2: 6,
  });
  expect(surveyKind({ ...wall, transparent: true })).toBe('window');
});
test('la ventana deja ver; la puerta secreta cerrada bloquea y su posición no se envía al jugador', () => {
  let game = createGame({ id: 'sala', scene });
  const change = (c) => {
    game = applyGameCommand(game, c, gm);
  };
  const visible = () => projectGame(game, 'puesto1').scenes.patio;
  change({ type: 'terrain', terrain: { ...wall, kind: 'door', secret: true } });
  expect(visible().visibility.rowsMask[1][5]).toBe('0');
  expect(visible().terrain).toHaveLength(0);
  change({
    type: 'terrain',
    terrain: { ...wall, kind: 'door', secret: true, open: true },
  });
  expect(visible().visibility.rowsMask[1][5]).toBe('1');
  expect(visible().terrain[0].open).toBe(true);
  change({ type: 'terrain', terrain: { ...wall, kind: 'window' } });
  expect(visible().visibility.rowsMask[1][5]).toBe('1');
  expect(visible().terrain[0].kind).toBe('window');
  const prior = game;
  change({ type: 'fogOfWar', enabled: true });
  expect(prior.scenes.patio.fogOfWar).toBe(false);
  expect(visible().fogOfWar).toBe(true);
  expect(() =>
    applyGameCommand(game, { type: 'fogOfWar', enabled: false }, player)
  ).toThrow();
  expect(() =>
    applyGameCommand(game, { type: 'terrain', removeId: 'w' }, player)
  ).toThrow();
});
