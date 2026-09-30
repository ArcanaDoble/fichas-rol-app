export const ITEM_USE_PHASES = Object.freeze({
    SELECT_DIE: 'select-die',
    SELECT_TARGET: 'select-target',
    PLACE_AREA: 'place-area',
    CONFIRM: 'confirm',
    CONSUME_RESOURCES: 'consume-resources',
    RESOLVE_EFFECTS: 'resolve-effects',
});

const normalizePhase = (phase) => (
    typeof phase === 'string' ? { id: phase } : phase
);

export const createItemUseSession = ({ definition, sourceToken, item, context = {} } = {}) => {
    const phases = (definition?.phases || []).map(normalizePhase).filter((phase) => phase?.id);
    if (!definition?.id || phases.length === 0 || !sourceToken?.id || !item) return null;
    return {
        id: `item-use-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        definitionId: definition.id,
        sourceTokenId: sourceToken.id,
        item,
        phases,
        phaseIndex: 0,
        phase: phases[0].id,
        context: { ...context },
        status: 'active',
    };
};

export const advanceItemUseSession = (session, payload) => {
    if (!session || session.status !== 'active') return session;
    const phase = session.phases?.[session.phaseIndex];
    if (!phase) return { ...session, status: 'complete', phase: null };
    const validation = typeof phase.validate === 'function'
        ? phase.validate(payload, session.context)
        : true;
    if (validation !== true && validation !== undefined) {
        return {
            ...session,
            error: typeof validation === 'string' ? validation : 'invalid-phase-result',
        };
    }
    const nextContext = phase.storeAs
        ? { ...session.context, [phase.storeAs]: payload }
        : { ...session.context };
    const nextIndex = session.phaseIndex + 1;
    const nextPhase = session.phases[nextIndex];
    return {
        ...session,
        phaseIndex: nextIndex,
        phase: nextPhase?.id || null,
        context: nextContext,
        error: null,
        status: nextPhase ? 'active' : 'complete',
    };
};

export const cancelItemUseSession = (session) => (
    session ? { ...session, status: 'cancelled', phase: null } : null
);

export const ItemUseSystem = {
    createSession: createItemUseSession,
    advance: advanceItemUseSession,
    cancel: cancelItemUseSession,
};

export default ItemUseSystem;
