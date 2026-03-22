import { getCombatQueueDisplayState } from '../combatQueue';

describe('getCombatQueueDisplayState', () => {
  it('prioritizes the next waiting reaction and marks previous handled attacks as completed', () => {
    const queue = [
      { event: { id: 'event-1', status: 'parar_pendiente' } },
      { event: { id: 'event-2', status: 'esperando_reaccion' } },
    ];

    const result = getCombatQueueDisplayState({ queue, resolvedCount: 0 });

    expect(result.activeEntry).toBe(queue[1]);
    expect(result.activeIndex).toBe(1);
    expect(result.queueTotal).toBe(2);
    expect(result.queueResolved).toBe(1);
    expect(result.queueCurrent).toBe(1);
  });

  it('keeps closed results counted when moving to the next combat result', () => {
    const queue = [
      { event: { id: 'event-2', status: 'resuelto' } },
    ];

    const result = getCombatQueueDisplayState({ queue, resolvedCount: 1 });

    expect(result.activeEntry).toBe(queue[0]);
    expect(result.activeIndex).toBe(0);
    expect(result.queueTotal).toBe(2);
    expect(result.queueResolved).toBe(1);
    expect(result.queueCurrent).toBe(1);
  });

  it('falls back to the first pending result when no reactions remain to choose', () => {
    const queue = [
      { event: { id: 'event-1', status: 'evadir_pendiente' } },
      { event: { id: 'event-2', status: 'resuelto' } },
    ];

    const result = getCombatQueueDisplayState({ queue, resolvedCount: 0 });

    expect(result.activeEntry).toBe(queue[0]);
    expect(result.activeIndex).toBe(0);
    expect(result.queueResolved).toBe(0);
    expect(result.queueCurrent).toBe(0);
  });

  it('keeps the original attack order using timestamps even if firestore reorders the queue', () => {
    const queue = [
      { event: { id: 'event-2', status: 'esperando_reaccion', clientTimestamp: 200 } },
      { event: { id: 'event-1', status: 'parar_pendiente', clientTimestamp: 100 } },
    ];

    const result = getCombatQueueDisplayState({ queue, resolvedCount: 0 });

    expect(result.activeEntry).toBe(queue[0]);
    expect(result.activeIndex).toBe(1);
    expect(result.queueResolved).toBe(1);
    expect(result.queueCurrent).toBe(1);
  });
});
