import { useEffect, useState } from 'react';
import { getCombatStatusRevealDelayMs, getCombatBlockStaggerMs } from '../../components/FloatingCombatEffects';
import { isCanvasPoisoned } from './poisonRules';
import { isCanvasBleeding } from './bleedingRules';

export const isPresentedPoisoned = (token, presentation) => isCanvasPoisoned(token)
    && !(presentation?.poisonApplied && Date.now() < (presentation.poisonRevealAt ?? presentation.deadlineAt));
export const isPresentedBleeding = (token, presentation) => isCanvasBleeding(token)
    && !(presentation?.bleedingApplied && Date.now() < (presentation.bleedingRevealAt ?? presentation.deadlineAt));

export const CANVAS_DAMAGE_WAIT_MS = 4000;
export const CANVAS_DAMAGE_IMPACT_MS = 1450;

export const getCanvasCombatDamageDelayMs = (effect, tokenId) => {
    if (!effect?.canvasRoguelite) return 0;
    if (tokenId === effect.attackerId && (Number(effect.attackerBlocksLost?.vida) > 0 || Number(effect.attackerBlocksLost?.vidaTemporal) > 0)) {
        return effect.reactionType === 'parar' && Number(effect.counterDamage) > 0 ? 1500 : 0;
    }
    if (tokenId === effect.targetId && (Number(effect.blocksLost?.vida) > 0 || Number(effect.blocksLost?.vidaTemporal) > 0)) {
        return ['parar', 'evadir'].includes(effect.reactionType) ? 1500 : 0;
    }
    return 0;
};

const metadataId = token => token?.canvasDamageEffect?.id;
const baseline = scenario => ({
    scenarioId: scenario?.id,
    snapshot: scenario,
    seen: new Set((scenario?.items || []).filter(metadataId).map(token => `${token.id}:${metadataId(token)}`)),
    pending: {},
    animationStarts: {},
    tick: 0,
});

/** The scene change holds the old crown until the matching combat result arrives. */
export const useCanvasDamagePresentation = (scenario, animations = []) => {
    const [stored, setStored] = useState(() => baseline(scenario));
    const [clock, setClock] = useState(0);
    const now = Date.now();
    let state = stored;
    if (stored.scenarioId !== scenario?.id) {
        state = baseline(scenario);
        setStored(state);
    } else if (stored.snapshot !== scenario || stored.tick !== clock || animations.some(({ id, effect }) => effect?.canvasRoguelite && !stored.animationStarts[id])) {
        const seen = new Set(stored.seen);
        const pending = { ...stored.pending };
        const animationStarts = { ...stored.animationStarts };
        animations.forEach(({ id, effect }) => { if (effect?.canvasRoguelite && !animationStarts[id]) animationStarts[id] = now; });
        Object.keys(animationStarts).forEach(id => { if (now - animationStarts[id] > 30000) delete animationStarts[id]; });
        (scenario?.items || []).forEach(token => {
            const metadata = token.canvasDamageEffect;
            const key = `${token.id}:${metadata?.id}`;
            if (!metadata?.id || seen.has(key) || (Number(metadata.nextLife) >= Number(metadata.previousLife) && !(Number(metadata.nextTemporaryLife) < Number(metadata.previousTemporaryLife)))) return;
            seen.add(key);
            if (seen.size > 1000) seen.delete(seen.values().next().value);
            pending[token.id] = { ...metadata, deadlineAt: now + CANVAS_DAMAGE_WAIT_MS };
        });
        Object.keys(pending).forEach(tokenId => {
            const entry = pending[tokenId];
            const match = animations.find(({ effect }) => effect?.canvasRoguelite
                && effect.sourceEventId === entry.id
                && (effect.targetId === tokenId || effect.attackerId === tokenId));
            if (match && !entry.revealAt) {
                const poisonDelay = entry.poisonApplied
                    ? getCombatStatusRevealDelayMs(match.effect, tokenId, 'envenenado') : null;
                const bleedingDelay = entry.bleedingApplied
                    ? getCombatStatusRevealDelayMs(match.effect, tokenId, 'sangrado') : null;
                const firstDamageAt = animationStarts[match.id] + getCanvasCombatDamageDelayMs(match.effect, tokenId);
                const blocks = tokenId === match.effect.targetId ? match.effect.blocksLost : match.effect.attackerBlocksLost;
                pending[tokenId] = { ...entry,
                    bleedingRevealAt: entry.bleedingApplied
                        ? (bleedingDelay == null ? entry.deadlineAt : animationStarts[match.id] + bleedingDelay) : undefined,
                    poisonRevealAt: entry.poisonApplied
                        ? (poisonDelay == null ? entry.deadlineAt : animationStarts[match.id] + poisonDelay) : undefined,
                    normalLifeRevealAt: firstDamageAt + getCombatBlockStaggerMs(blocks, 'vida'),
                    revealAt: firstDamageAt };
            }
            // If the log fails, resolve the held crown once rather than leaving it stale.
            if (!match && !entry.revealAt && now >= entry.deadlineAt) {
                pending[tokenId] = { ...entry, revealAt: entry.deadlineAt };
            }
            const current = pending[tokenId];
            if (now > Math.max(current.deadlineAt, Number(current.normalLifeRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0, Number(current.poisonRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0, Number(current.bleedingRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0, Number(current.revealAt) + CANVAS_DAMAGE_IMPACT_MS || 0)) delete pending[tokenId];
        });
        state = { scenarioId: scenario?.id, snapshot: scenario, seen, pending, animationStarts, tick: clock };
        setStored(state);
    }
    useEffect(() => {
        const deadlines = Object.values(state.pending).flatMap(entry => [
            entry.bleedingRevealAt ?? entry.deadlineAt,
            entry.poisonRevealAt ?? entry.deadlineAt,
            Math.max(entry.deadlineAt, Number(entry.normalLifeRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0, Number(entry.poisonRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0, Number(entry.bleedingRevealAt) + CANVAS_DAMAGE_IMPACT_MS || 0,
                Number(entry.revealAt) + CANVAS_DAMAGE_IMPACT_MS || 0),
        ]);
        if (!deadlines.length) return undefined;
        const next = Math.min(...deadlines.filter(deadline => deadline > Date.now()));
        if (!Number.isFinite(next)) return undefined;
        const timer = setTimeout(() => setClock(value => value + 1), Math.max(0, next - Date.now()) + 1);
        return () => clearTimeout(timer);
    }, [state.pending, clock]);
    return state.pending;
};
