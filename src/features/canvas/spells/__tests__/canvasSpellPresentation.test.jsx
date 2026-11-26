import { act, renderHook } from '@testing-library/react';
import { FIREBALL_DURATION_MS, FIREBALL_RESOLVE_MS, isSpellResolutionDeferred, useCanvasSpellPresentation } from '../canvasSpellPresentation';
import { getFireballGeometry } from '../fireballRenderer';

let mockReduced = false;
jest.mock('framer-motion', () => ({ useReducedMotion: () => mockReduced }));
const cast = (id = 'cast', age = 0) => ({ id, spellId: 'fireball', startedAt: Date.now() - age,
  sourcePosition: { x: 0, y: 0, width: 50, height: 50 }, placement: { x: 200, y: 0, width: 100, height: 100 } });
const pending = { spellId: 'fireball', blastId: 'cast' };
const setup = (effect = null) => renderHook(({ sceneId, effect }) => useCanvasSpellPresentation(sceneId, effect),
  { initialProps: { sceneId: 'scene', effect } });

beforeEach(() => { mockReduced = false; jest.useFakeTimers(); jest.setSystemTime(100000); });
afterEach(() => jest.useRealTimers());

test.each(['arcane-mist', 'runic-barrier'])('%s plays once on receipt without delaying an attack resolution and is not replayed when loading a scene', spellId => {
  const effect = { ...cast(), spellId };
  const current = setup();
  current.rerender({ sceneId: 'scene', effect });
  expect(current.result.current.effect.spellId).toBe(spellId);
  expect(isSpellResolutionDeferred(current.result.current, { spellId, blastId: effect.id })).toBe(false);
  act(() => jest.advanceTimersByTime(FIREBALL_DURATION_MS));
  expect(current.result.current.effect).toBeNull();
  expect(setup(effect).result.current.effect).toBeNull();
});

test('a defender receiving the cast late sees the full launch before resolving; observers keep its tail', () => {
  const caster = setup(), defender = setup(), spectator = setup();
  const effect = cast();
  caster.rerender({ sceneId: 'scene', effect });
  act(() => jest.advanceTimersByTime(2200));
  defender.rerender({ sceneId: 'scene', effect });
  spectator.rerender({ sceneId: 'scene', effect });
  expect(isSpellResolutionDeferred(defender.result.current, pending)).toBe(true);
  act(() => jest.advanceTimersByTime(800));
  expect(isSpellResolutionDeferred(caster.result.current, pending)).toBe(false);
  expect(isSpellResolutionDeferred(defender.result.current, pending)).toBe(true);
  act(() => jest.advanceTimersByTime(FIREBALL_RESOLVE_MS - 801));
  expect(isSpellResolutionDeferred(defender.result.current, pending)).toBe(true);
  act(() => jest.advanceTimersByTime(1));
  expect(isSpellResolutionDeferred(defender.result.current, pending)).toBe(false);
  expect(spectator.result.current.effect.id).toBe('cast');
  act(() => jest.advanceTimersByTime(FIREBALL_DURATION_MS - FIREBALL_RESOLVE_MS));
  expect(defender.result.current.effect).toBeNull();
  expect(spectator.result.current.effect).toBeNull();
});

test('duplicate snapshots and subsequent targets never restart the launch or hide unrelated attacks', () => {
  const h = setup(), effect = cast();
  h.rerender({ sceneId: 'scene', effect });
  const start = h.result.current.effect.presentationStartedAt;
  act(() => jest.advanceTimersByTime(FIREBALL_RESOLVE_MS));
  h.rerender({ sceneId: 'scene', effect: { ...effect } });
  expect(h.result.current.effect.presentationStartedAt).toBe(start);
  expect(isSpellResolutionDeferred(h.result.current, pending)).toBe(false);
  expect(isSpellResolutionDeferred({ ...h.result.current, resolvingDeferred: true }, { ...pending, blastId: 'other' })).toBe(false);
  expect(isSpellResolutionDeferred({ ...h.result.current, resolvingDeferred: true }, { blastId: 'cast' })).toBe(false);
  h.rerender({ sceneId: 'scene', effect: null });
  h.rerender({ sceneId: 'scene', effect });
  expect(h.result.current.effect).toBeNull();
});

test('mounting, switching scenes and old events never replay a persisted effect', () => {
  const effect = cast();
  const h = setup(effect);
  expect(h.result.current.effect).toBeNull();
  h.rerender({ sceneId: 'other', effect: cast('second') });
  expect(h.result.current.effect).toBeNull();
  h.rerender({ sceneId: 'other', effect: cast('old', 31000) });
  expect(h.result.current.effect).toBeNull();
  h.rerender({ sceneId: 'other', effect: cast('fresh') });
  expect(h.result.current.effect.id).toBe('fresh');
});

test('projectile and its chained impact each give late clients a full presentation before resolving', () => {
  const h = setup();
  const first = { ...cast('projectile', 2000), spellId: 'arcane-projectile' };
  h.rerender({ sceneId: 'scene', effect: first });
  expect(isSpellResolutionDeferred(h.result.current, { spellId: 'arcane-projectile', blastId: first.id })).toBe(true);
  act(() => jest.advanceTimersByTime(FIREBALL_RESOLVE_MS));
  expect(h.result.current.resolvingDeferred).toBe(false);
  const second = { ...cast('projectile-chain'), spellId: 'arcane-projectile' };
  h.rerender({ sceneId: 'scene', effect: second });
  expect(h.result.current.effect.id).toBe(second.id);
  expect(isSpellResolutionDeferred(h.result.current, { spellId: 'arcane-projectile', blastId: second.id })).toBe(true);
  expect(setup(second).result.current.effect).toBeNull();
});

test('reconnecting ends presentation and releases resolution without replaying the saved cast', () => {
  const h = setup(), effect = cast();
  h.rerender({ sceneId: 'scene', effect });
  act(() => window.dispatchEvent(new Event('online')));
  h.rerender({ sceneId: 'scene', effect: { ...effect } });
  expect(h.result.current.effect).toBeNull();
  expect(h.result.current.resolvingDeferred).toBe(false);
});

test('reduced motion uses a short static cue and releases the defender promptly', () => {
  mockReduced = true;
  const h = setup();
  h.rerender({ sceneId: 'scene', effect: cast() });
  expect(h.result.current.reducedMotion).toBe(true);
  expect(isSpellResolutionDeferred(h.result.current, pending)).toBe(true);
  act(() => jest.advanceTimersByTime(600));
  expect(isSpellResolutionDeferred(h.result.current, pending)).toBe(false);
  expect(h.result.current.effect).not.toBeNull();
  act(() => jest.advanceTimersByTime(1200));
  expect(h.result.current.effect).toBeNull();
});

test('a new cast supersedes the first; unmount clears presentation timers', () => {
  const h = setup();
  h.rerender({ sceneId: 'scene', effect: cast() });
  act(() => jest.advanceTimersByTime(1500));
  h.rerender({ sceneId: 'scene', effect: cast('second') });
  expect(h.result.current.effect.id).toBe('second');
  expect(isSpellResolutionDeferred(h.result.current, { ...pending, blastId: 'second' })).toBe(true);
  h.unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('geometry ends at the center of the actual 2×2 area and bounds the launch across zoom levels', () => {
  const effect = cast();
  [0.3, 1, 4].forEach(zoom => {
    const geometry = getFireballGeometry(effect, zoom);
    expect(geometry.destination).toEqual({ x: 250, y: 50 });
    ['start', 'control', 'destination'].forEach(name => {
      expect(geometry[name].x).toBeGreaterThanOrEqual(geometry.x);
      expect(geometry[name].x).toBeLessThanOrEqual(geometry.x + geometry.width);
      expect(geometry[name].y).toBeGreaterThanOrEqual(geometry.y);
      expect(geometry[name].y).toBeLessThanOrEqual(geometry.y + geometry.height);
    });
  });
});
