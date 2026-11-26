import {
    ARCANE_BARRIER_STATUS_ID,
    applyArcaneBarrier,
    clearArcaneBarrier,
    getArcaneBarrierBonus,
    getArcaneBarrierProtections,
    hasArcaneBarrier,
    reconcileArcaneBarrierUpdate,
} from '../arcaneBarrierStatus';

const token = { id: 'ally', name: 'Guerrero', status: ['oculto', 'envenenado'],
    stats: { cd: { current: 4, max: 6 }, vida: { current: 7, max: 8 } } };
const cast = { castId: 'cast', sourceTokenId: 'mage', catalystId: 'staff',
    protections: ['critico', 'venenosa', 'critico'], now: 123 };
const legacyBarrier = { id: 'legacy-cast', spellId: 'runic-barrier', expires: 'combat-end',
    negatedTraits: ['critico', 'venenosa'] };

test('the canonical state and legacy scene metadata both grant one temporary CD', () => {
    expect(ARCANE_BARRIER_STATUS_ID).toBe('barrera');
    expect(hasArcaneBarrier(token)).toBe(false);
    const manual = { ...token, status: [...token.status, 'barrera'] };
    expect(hasArcaneBarrier(manual)).toBe(true);
    expect(getArcaneBarrierBonus(manual)).toBe(1);
    expect(getArcaneBarrierProtections(manual)).toEqual([]);
    const legacy = { ...token, arcaneBarrier: legacyBarrier };
    expect(hasArcaneBarrier(legacy)).toBe(true);
    expect(getArcaneBarrierBonus(legacy)).toBe(1);
    expect(getArcaneBarrierProtections(legacy)).toEqual(['critico', 'venenosa']);
    expect(hasArcaneBarrier({ ...token, arcaneBarrier: { ...legacyBarrier, expires: 'expired' } })).toBe(false);
});

test('applying the spell records one state, keeps unrelated conditions and preserves base stats', () => {
    const protectedToken = applyArcaneBarrier(token, cast);
    expect(protectedToken.status).toEqual(['oculto', 'envenenado', 'barrera']);
    expect(protectedToken.arcaneBarrier).toMatchObject({ id: 'cast', sourceTokenId: 'mage',
        catalystId: 'staff', spellId: 'runic-barrier', expires: 'combat-end',
        negatedTraits: ['critico', 'venenosa'], createdAt: 123 });
    expect(protectedToken.stats).toBe(token.stats);
    const repeated = applyArcaneBarrier(protectedToken, cast);
    expect(repeated.status.filter(id => id === 'barrera')).toHaveLength(1);
    expect(getArcaneBarrierBonus(repeated)).toBe(1);
    expect(token.status).toEqual(['oculto', 'envenenado']);
    expect(token.arcaneBarrier).toBeUndefined();
});

test.each(['spell', 'manual', 'legacy'])('clearing %s protection removes the state and metadata without losing other conditions', kind => {
    const protectedToken = kind === 'spell' ? applyArcaneBarrier(token, cast)
        : kind === 'manual' ? { ...token, status: [...token.status, 'barrera'] }
            : { ...token, arcaneBarrier: legacyBarrier };
    const cleared = clearArcaneBarrier(protectedToken);
    expect(cleared.status).toEqual(token.status);
    expect(cleared.arcaneBarrier).toBeUndefined();
    expect(cleared.stats).toBe(token.stats);
    expect(getArcaneBarrierBonus(cleared)).toBe(0);
    expect(getArcaneBarrierProtections(cleared)).toEqual([]);
    expect(hasArcaneBarrier(protectedToken)).toBe(true);
});

test('removing Barrera through the status editor also removes its spell protections', () => {
    const protectedToken = applyArcaneBarrier(token, cast);
    const updates = { status: ['oculto', 'envenenado'], name: 'Guerrero protegido' };
    const patch = reconcileArcaneBarrierUpdate(protectedToken, updates, 456);
    const cleared = { ...protectedToken, ...patch };
    expect(patch.status).toEqual(updates.status);
    expect(patch.name).toBe(updates.name);
    expect(cleared.arcaneBarrier).toBeFalsy();
    expect(hasArcaneBarrier(cleared)).toBe(false);
    expect(getArcaneBarrierProtections(cleared)).toEqual([]);
    expect(cleared.stats).toBe(token.stats);
    expect(protectedToken.arcaneBarrier.negatedTraits).toEqual(['critico', 'venenosa']);
});

test('manually selecting Barrera produces a removable temporary record with no spell-only protections', () => {
    const updates = { status: [...token.status, 'barrera'] };
    const patch = reconcileArcaneBarrierUpdate(token, updates, 456);
    expect(patch.status).toEqual(updates.status);
    expect(patch.arcaneBarrier).toMatchObject({ spellId: 'runic-barrier', expires: 'combat-end',
        negatedTraits: [], createdAt: 456 });
    expect(hasArcaneBarrier({ ...token, ...patch })).toBe(true);
    expect(getArcaneBarrierBonus({ ...token, ...patch })).toBe(1);
    expect(token.status).toEqual(['oculto', 'envenenado']);
    expect(updates).toEqual({ status: ['oculto', 'envenenado', 'barrera'] });
});

test('editing unrelated fields leaves protection and its recorded cast unchanged', () => {
    const protectedToken = applyArcaneBarrier(token, cast);
    const updates = { rotation: 45, stats: { ...token.stats, vida: { current: 6, max: 8 } } };
    expect(reconcileArcaneBarrierUpdate(protectedToken, updates, 456)).toEqual(updates);
    expect(reconcileArcaneBarrierUpdate(token, updates, 456)).toEqual(updates);
    const renamed = { ...protectedToken, ...reconcileArcaneBarrierUpdate(protectedToken, { name: 'Ada' }, 456) };
    expect(renamed.arcaneBarrier).toEqual(protectedToken.arcaneBarrier);
    expect(renamed.status).toEqual(protectedToken.status);
});

test('editing a condition migrates a legacy barrier instead of silently removing it', () => {
    const legacy = { ...token, arcaneBarrier: legacyBarrier };
    const next = { ...legacy, ...reconcileArcaneBarrierUpdate(legacy, { status: ['oculto', 'sangrado'] }, 456) };
    expect(next.status).toEqual(['oculto', 'sangrado', 'barrera']);
    expect(next.arcaneBarrier).toBe(legacyBarrier);
    expect(getArcaneBarrierBonus(next)).toBe(1);
    const removed = { ...legacy, ...reconcileArcaneBarrierUpdate(legacy, { arcaneBarrier: null }) };
    expect(removed.status).toEqual(token.status);
    expect(hasArcaneBarrier(removed)).toBe(false);
    const unprotected = { status: ['oculto'] };
    const update = { status: ['sangrado'] };
    expect(reconcileArcaneBarrierUpdate(unprotected, update)).toBe(update);
});

test('an explicit protection record synchronizes its state without duplicating or replacing other conditions', () => {
    const patch = reconcileArcaneBarrierUpdate(token, { arcaneBarrier: legacyBarrier }, 456);
    const protectedToken = { ...token, ...patch };
    expect(protectedToken.status).toEqual(['oculto', 'envenenado', 'barrera']);
    expect(protectedToken.arcaneBarrier).toEqual(legacyBarrier);
    const repeated = reconcileArcaneBarrierUpdate(protectedToken, { arcaneBarrier: { ...legacyBarrier } }, 456);
    const savedAgain = { ...protectedToken, ...repeated };
    expect(savedAgain.status.filter(id => id === 'barrera')).toHaveLength(1);
    expect(getArcaneBarrierBonus(savedAgain)).toBe(1);
});
