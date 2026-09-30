import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { preloadAntidoteArt } from './preloadAntidoteArt';

export const CANVAS_HEALING_REVEAL_AT = 1300;
export const CANVAS_HEALING_DURATION = 3200;
const DIE_STEPS = [0, 50, 110, 180, 265, 365, 490, 650, 840, 1060];

export const getCanvasHealingStartedAt = effect => Number(effect?.startedAt?.toMillis?.()
    || (Number(effect?.startedAt?.seconds) * 1000) || effect?.startedAt) || 0;
export const getCanvasHealingPresentationStart = effect => Number(effect?.presentationStartedAt) || getCanvasHealingStartedAt(effect);

export const getCanvasHealingTimeline = ({ startedAt, now = Date.now(), reducedMotion = false }) => {
    const elapsed = Math.max(0, now - startedAt);
    const revealed = reducedMotion || elapsed >= CANVAS_HEALING_REVEAL_AT;
    return {
        elapsed,
        started: now >= startedAt,
        revealed,
        finished: elapsed >= CANVAS_HEALING_DURATION,
        frame: revealed ? -1 : DIE_STEPS.reduce((frame, at, index) => at <= elapsed ? index : frame, 0),
    };
};

/** Absolute time lets a delayed snapshot join the same saved roll, rather than restart it. */
export const useCanvasHealingTimeline = ({ id, startedAt, active = true, reducedMotion = false, animateDie = false }) => {
    const [, tick] = useState(0);
    useEffect(() => {
        if (!active || !startedAt || reducedMotion) return undefined;
        const elapsed = Date.now() - startedAt;
        const points = [...(animateDie ? DIE_STEPS : []), CANVAS_HEALING_REVEAL_AT, CANVAS_HEALING_DURATION];
        const timers = points.filter(at => at > elapsed)
            .map(at => setTimeout(() => tick(value => value + 1), at - elapsed));
        return () => timers.forEach(clearTimeout);
    }, [id, startedAt, active, reducedMotion, animateDie]);
    return getCanvasHealingTimeline({ startedAt, reducedMotion });
};

const eventId = effect => effect?.id || effect?.useId;
const baseline = (scenario, epoch) => ({
    scenarioId: scenario?.id, snapshot: scenario, epoch, since: Date.now(), events: [], tails: {},
    seen: new Set((scenario?.items || []).map(token => eventId(token.canvasHealingEffect)).filter(Boolean)),
});

/** One gate supplies both the die and the Life readout in the first snapshot render. */
export const useCanvasHealingPresentationEvents = activeScenario => {
    useEffect(() => { preloadAntidoteArt(activeScenario?.items); }, [activeScenario?.items]);
    const reducedMotion = useReducedMotion();
    const [epoch, setEpoch] = useState(0);
    const [stored, setStored] = useState(() => baseline(activeScenario, epoch));
    let state = stored;
    if (stored.scenarioId !== activeScenario?.id || stored.epoch !== epoch) {
        state = baseline(activeScenario, epoch);
        setStored(state);
    } else if (stored.snapshot !== activeScenario) {
        const now = Date.now();
        const seen = new Set(stored.seen);
        let events = stored.events.filter(({ effect }) => now - getCanvasHealingPresentationStart(effect) < CANVAS_HEALING_DURATION);
        const tails = { ...stored.tails };
        (activeScenario?.items || []).forEach(token => {
            const metadata = token.canvasHealingEffect;
            const id = eventId(metadata);
            const startedAt = getCanvasHealingStartedAt(metadata);
            if (!id || seen.has(id) || !startedAt) return;
            seen.add(id);
            if (seen.size > 1000) seen.delete(seen.values().next().value);
            if ((typeof document !== 'undefined' && document.hidden) || startedAt <= stored.since
                || startedAt > now + 1000 || now - startedAt >= CANVAS_HEALING_DURATION) return;
            if (['remove-poison', 'remove-bleeding', 'haste', 'temporary-life'].includes(metadata.effect)) {
                events.push({ id: `antidote_${id}`, effect: { ...metadata, sourceEventId: id,
                    presentationStartedAt: startedAt } });
                return;
            }
            const roll = Number(metadata.roll);
            if (!Number.isInteger(roll) || roll < 1 || roll > 4) return;
            if (reducedMotion) events = events.filter(({ effect }) => effect.targetId !== token.id);
            const presentationStartedAt = reducedMotion ? startedAt : Math.max(startedAt, tails[token.id] || 0);
            const effect = { ...metadata, id, sourceEventId: id, startedAt, presentationStartedAt,
                eventType: 'item-use', effect: 'heal', actorId: token.id, targetId: token.id,
                dice: [{ id: `${id}-healing`, faces: 4, value: roll, source: 'Curación' }] };
            events.push({ id: `healing_${id}`, effect });
            tails[token.id] = presentationStartedAt + CANVAS_HEALING_DURATION;
        });
        state = { ...stored, snapshot: activeScenario, seen, events, tails };
        setStored(state);
    }

    useEffect(() => {
        const reset = () => setEpoch(value => value + 1);
        window.addEventListener('online', reset);
        window.addEventListener('offline', reset);
        document.addEventListener('visibilitychange', reset);
        return () => {
            window.removeEventListener('online', reset);
            window.removeEventListener('offline', reset);
            document.removeEventListener('visibilitychange', reset);
        };
    }, []);
    useEffect(() => {
        if (!state.events.length) return undefined;
        const nextEnd = Math.min(...state.events.map(({ effect }) => getCanvasHealingPresentationStart(effect) + CANVAS_HEALING_DURATION));
        const timer = setTimeout(() => setStored(previous => ({ ...previous,
            events: previous.events.filter(({ effect }) => Date.now() < getCanvasHealingPresentationStart(effect) + CANVAS_HEALING_DURATION),
        })), Math.max(0, nextEnd - Date.now()));
        return () => clearTimeout(timer);
    }, [state.events]);
    const byToken = useMemo(() => {
        const grouped = {};
        state.events.forEach(({ effect }) => {
            if (effect.effect === 'temporary-life' || effect.effect === 'remove-bleeding') {
                grouped[effect.targetId] = effect;
                return;
            }
            if (effect.effect !== 'heal') return;
            const previous = grouped[effect.targetId];
            // Damage or another edit between uses starts a new Life sequence.
            const sequence = previous && Number(previous.nextLife) === Number(effect.previousLife)
                ? [...previous.sequence, effect] : [effect];
            grouped[effect.targetId] = { ...effect, sequence };
        });
        return grouped;
    }, [state.events]);
    return { events: state.events, byToken };
};
