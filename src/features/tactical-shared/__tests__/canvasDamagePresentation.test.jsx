import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { getCanvasCombatDamageDelayMs, useCanvasDamagePresentation, isPresentedPoisoned, isPresentedBleeding } from '../canvasDamagePresentation';

test('a counterattack uses the same delayed reveal as its floating damage number', () => {
    const effect = { canvasRoguelite: true, reactionType: 'parar', attackerId: 'hero', targetId: 'foe',
        counterDamage: 6, attackerBlocksLost: { vida: 2 }, blocksLost: { vida: 0 } };
    expect(getCanvasCombatDamageDelayMs(effect, 'hero')).toBe(1500);
    expect(getCanvasCombatDamageDelayMs(effect, 'foe')).toBe(0);
});

test('holds a new combat Life change until its matching result arrives', () => {
    jest.useFakeTimers();
    const before = { id: 'scene', items: [{ id: 'hero', stats: { vida: { current: 8 } } }] };
    const after = { ...before, items: [{ id: 'hero', stats: { vida: { current: 6 } },
        canvasDamageEffect: { id: 'attack-1', previousLife: 8, nextLife: 6 } }] };
    const { result, rerender } = renderHook(({ scene, animations }) => useCanvasDamagePresentation(scene, animations),
        { initialProps: { scene: before, animations: [] } });
    rerender({ scene: after, animations: [] });
    expect(result.current.hero).toMatchObject({ previousLife: 8, nextLife: 6 });
    expect(result.current.hero.revealAt).toBeUndefined();
    const effect = { canvasRoguelite: true, sourceEventId: 'attack-1', reactionType: 'parar',
        attackerId: 'foe', targetId: 'hero', blocksLost: { vida: 2 } };
    const receivedAt = Date.now();
    rerender({ scene: after, animations: [{ id: 'log-1', effect }] });
    expect(result.current.hero.revealAt).toBe(receivedAt + 1500);
    act(() => jest.advanceTimersByTime(1600));
    expect(result.current.hero.revealAt).toBe(receivedAt + 1500);
    jest.useRealTimers();
});


test.each([false, true])('poison waits for its actual floating phase, log first=%s', logFirst => {
    jest.useFakeTimers();
    const before = { id: 'scene', items: [{ id: 'hero', status: [] }] };
    const token = { id: 'hero', status: ['envenenado'], canvasDamageEffect: {
        id: 'poison-1', previousLife: 8, nextLife: 5, poisonApplied: true,
    } };
    const after = { ...before, items: [token] };
    const effect = { canvasRoguelite: true, sourceEventId: 'poison-1', reactionType: 'parar',
        attackerId: 'foe', targetId: 'hero', finalDamage: 12, blocksLost: { vida: 3 },
        statusEffectsApplied: { target: ['envenenado'] } };
    const animations = [{ id: 'log-poison', effect }];
    const { result, rerender } = renderHook(({ scene, animations }) => useCanvasDamagePresentation(scene, animations),
        { initialProps: { scene: before, animations: [] } });
    if (logFirst) rerender({ scene: before, animations });
    else {
        rerender({ scene: after, animations: [] });
        expect(isPresentedPoisoned(token, result.current.hero)).toBe(false);
    }
    rerender({ scene: after, animations });
    const delay = result.current.hero.poisonRevealAt - Date.now();
    expect(delay).toBeGreaterThan(result.current.hero.revealAt - Date.now());
    act(() => jest.advanceTimersByTime(delay - 1));
    expect(isPresentedPoisoned(token, result.current.hero)).toBe(false);
    act(() => jest.advanceTimersByTime(2));
    expect(isPresentedPoisoned(token, result.current.hero)).toBe(true);
    // Removing the condition always wins over the presentation of a past attack.
    expect(isPresentedPoisoned({ ...token, status: [] }, result.current.hero)).toBe(false);
    jest.useRealTimers();
});

test('poison already present on entering the scene is not hidden or replayed', () => {
    const token = { id: 'hero', status: ['envenenado'], canvasDamageEffect: {
        id: 'old', previousLife: 8, nextLife: 7, poisonApplied: true,
    } };
    const scene = { id: 'scene', items: [token] };
    const { result } = renderHook(() => useCanvasDamagePresentation(scene));
    expect(result.current).toEqual({});
    expect(isPresentedPoisoned(token, result.current.hero)).toBe(true);
});

test('Sangrado waits for its own status phase after damage and poison', () => {
    jest.useFakeTimers();
    const before = { id: 'scene', items: [] };
    const token = { id: 'hero', status: ['envenenado', 'sangrado'], canvasDamageEffect: {
        id: 'bleed-1', previousLife: 8, nextLife: 5, poisonApplied: true, bleedingApplied: true,
    } };
    const after = { ...before, items: [token] };
    const { result, rerender } = renderHook(({ scene, animations }) => useCanvasDamagePresentation(scene, animations),
        { initialProps: { scene: before, animations: [] } });
    rerender({ scene: after, animations: [] });
    expect(isPresentedBleeding(token, result.current.hero)).toBe(false);
    rerender({ scene: after, animations: [{ id: 'log', effect: { canvasRoguelite: true, sourceEventId: 'bleed-1',
        reactionType: 'parar', attackerId: 'foe', targetId: 'hero', blocksLost: { vida: 3 },
        statusEffectsApplied: { target: ['envenenado', 'sangrado'] } } }] });
    const delay = result.current.hero.bleedingRevealAt - Date.now();
    expect(delay).toBeGreaterThan(result.current.hero.revealAt - Date.now());
    act(() => jest.advanceTimersByTime(delay - 1));
    expect(isPresentedBleeding(token, result.current.hero)).toBe(false);
    act(() => jest.advanceTimersByTime(2));
    expect(isPresentedBleeding(token, result.current.hero)).toBe(true);
    jest.useRealTimers();
});


test('a missing result cannot leave newly applied poison hidden indefinitely', () => {
    jest.useFakeTimers();
    const before = { id: 'scene', items: [] };
    const token = { id: 'hero', status: ['envenenado'], canvasDamageEffect: {
        id: 'missing', previousLife: 8, nextLife: 7, poisonApplied: true,
    } };
    const { result, rerender } = renderHook(({ scene }) => useCanvasDamagePresentation(scene),
        { initialProps: { scene: before } });
    rerender({ scene: { ...before, items: [token] } });
    expect(isPresentedPoisoned(token, result.current.hero)).toBe(false);
    act(() => jest.advanceTimersByTime(4001));
    expect(isPresentedPoisoned(token, result.current.hero)).toBe(true);
    jest.useRealTimers();
});


test('temporary blocks reveal first and real Life waits for its following floating result', () => {
    jest.useFakeTimers();
    const before = { id: 'scene', items: [] };
    const after = { ...before, items: [{ id: 'hero', canvasDamageEffect: { id: 'vitality-hit',
        previousLife: 8, nextLife: 7, previousTemporaryLife: 2, nextTemporaryLife: 0 } }] };
    const { result, rerender } = renderHook(({ scene, animations }) => useCanvasDamagePresentation(scene, animations),
        { initialProps: { scene: before, animations: [] } });
    const effect = { canvasRoguelite: true, sourceEventId: 'vitality-hit', reactionType: 'parar',
        attackerId: 'foe', targetId: 'hero', blocksLost: { vidaTemporal: 2, vida: 1 } };
    rerender({ scene: after, animations: [{ id: 'hit', effect }] });
    expect(result.current.hero.revealAt).toBe(Date.now() + 1500);
    expect(result.current.hero.normalLifeRevealAt).toBe(Date.now() + 3000);
    jest.useRealTimers();
});
