import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BLOCK_COLORS = {
    postura: '#34d399',
    vida: '#f87171',
    ingenio: '#60a5fa',
    voluntad: '#a78bfa',
    cordura: '#a78bfa',
    armadura: '#9ca3af'
};

const BLOCK_LABELS = {
    postura: 'Postura',
    vida: 'Vida',
    ingenio: 'Ingenio',
    voluntad: 'Voluntad',
    cordura: 'Cordura',
    armadura: 'Armadura',
};

const BLOCK_RENDER_ORDER = ['postura', 'armadura', 'vida', 'ingenio', 'voluntad', 'cordura'];
const DAMAGE_BLOCK_STAGGER_SECONDS = 1.5;
const COMBAT_RESULT_INTRO_DELAY_SECONDS = 1.5;
const DAMAGE_BLOCK_HORIZONTAL_OFFSET = 28;
const FLYOFF_DURATION_SECONDS = 4.0;
const HIGHLIGHT_DURATION_SECONDS = 2.5;
const STATE_EFFECT_DELAY_SECONDS = 1.6;
const STATE_EFFECT_STAGGER_SECONDS = 1.5;
const EFFECT_LIFETIME_SAFETY_BUFFER_SECONDS = 1.75;
const STATUS_EFFECT_PRIORITY = {
    conmocionado: 0,
    derribado: 0,
    sangrado: 1,
};

const NON_STATUS_COMBAT_EFFECT_IDS = new Set(['ralentizado', 'empuje']);

const STATUS_SOURCE_COLORS = {
    sangrado: '#b91c1c',
};

const TRAIT_EFFECT_COLORS = {
    hendir: {
        armadura: '#cbd5e1',
        default: '#cbd5e1',
    },
    perforante: {
        armadura: '#f59e0b',
        vida: '#fb7185',
        default: '#fbbf24',
    },
    penetrante: {
        armadura: '#f59e0b',
        vida: '#fb7185',
        default: '#fbbf24',
    },
};

const SPEED_EFFECT_COLORS = {
    ralentizado: '#fcd34d',
    default: '#fde68a',
};

const PUSH_EFFECT_COLORS = {
    empuje: '#38bdf8',
    default: '#7dd3fc',
};

const hashString = (value) => {
    const text = String(value || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const stableOffset = (seed, range) => {
    const normalized = (hashString(seed) % 1000) / 999;
    return (normalized * 2 - 1) * range;
};

const samePosition = (a, b) => (
    (a?.x ?? null) === (b?.x ?? null) &&
    (a?.y ?? null) === (b?.y ?? null) &&
    (a?.width ?? null) === (b?.width ?? null) &&
    (a?.height ?? null) === (b?.height ?? null)
);

const getLostBlocks = (blocksLost) => {
    if (!blocksLost) return [];

    return BLOCK_RENDER_ORDER.reduce((acc, tipo) => {
        if (blocksLost[tipo] && blocksLost[tipo] > 0) {
            acc.push({ tipo, cantidad: blocksLost[tipo] });
        }
        return acc;
    }, []);
};

const getDamageFlyoffCount = ({ finalDamage, blocks, resistedTargetHit = false }) => {
    if (blocks.length > 0) return blocks.length;
    if (finalDamage > 0 && !resistedTargetHit) return 1;
    return 0;
};

const getDelayedSequenceLastStart = (count, baseDelay = 0) => {
    if (!count) return 0;
    return baseDelay + ((count - 1) * DAMAGE_BLOCK_STAGGER_SECONDS);
};

const getStaggeredSequenceLastStart = (count, baseDelay = 0, stagger = STATE_EFFECT_STAGGER_SECONDS) => {
    if (!count) return 0;
    return baseDelay + ((count - 1) * stagger);
};

const getStatusSequenceDelay = (lastSequenceStart = 0, hasSequence = false) => {
    if (!hasSequence) return 0;
    return lastSequenceStart + STATE_EFFECT_DELAY_SECONDS;
};

const sortStatusEffects = (statusEffects = []) => (
    [...statusEffects]
        .filter((statusEffect) => !NON_STATUS_COMBAT_EFFECT_IDS.has(statusEffect?.id))
        .sort((a, b) => {
            const priorityA = STATUS_EFFECT_PRIORITY[a?.id] ?? 10;
            const priorityB = STATUS_EFFECT_PRIORITY[b?.id] ?? 10;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || ''));
        })
);

const normalizeTraitEffects = (traitEffects = []) => (
    Array.isArray(traitEffects)
        ? traitEffects
            .map((traitEffect) => ({
                ...traitEffect,
                blocks: Math.max(0, Number(traitEffect?.blocks) || 0),
                layer: typeof traitEffect?.layer === 'string' ? traitEffect.layer.toLowerCase() : traitEffect?.layer,
                id: traitEffect?.id || 'trait',
            }))
            .filter((traitEffect) => traitEffect.blocks > 0)
        : []
);

const normalizeSpeedEffects = (speedEffects = []) => (
    Array.isArray(speedEffects)
        ? speedEffects
            .map((speedEffect) => ({
                ...speedEffect,
                id: speedEffect?.id || 'speed',
                delta: Math.max(0, Number(speedEffect?.delta) || 0),
                label: speedEffect?.label || 'Velocidad',
            }))
            .filter((speedEffect) => speedEffect.delta > 0)
        : []
);

const normalizePushEffects = (pushEffects = []) => (
    Array.isArray(pushEffects)
        ? pushEffects
            .map((pushEffect) => ({
                ...pushEffect,
                id: pushEffect?.id || 'push',
                label: pushEffect?.label || 'Empuje',
                applied: pushEffect?.applied !== false,
            }))
            .filter((pushEffect) => pushEffect.applied)
        : []
);

const normalizeRecoveryEffects = (recoveryEffects = []) => (
    Array.isArray(recoveryEffects)
        ? recoveryEffects
            .map((recoveryEffect) => ({
                ...recoveryEffect,
                id: recoveryEffect?.id || 'recovery',
                amount: Math.max(0, Number(recoveryEffect?.amount) || 0),
                resource: typeof recoveryEffect?.resource === 'string' ? recoveryEffect.resource.toLowerCase() : recoveryEffect?.resource,
                label: recoveryEffect?.label || 'Recuperación',
            }))
            .filter((recoveryEffect) => recoveryEffect.amount > 0)
        : []
);

const getBlocksLostWithoutTraitEffects = (blocksLost, traitEffects = []) => {
    if (!blocksLost || traitEffects.length === 0) return blocksLost;

    const adjustedBlocks = { ...blocksLost };
    traitEffects.forEach((traitEffect) => {
        const layer = traitEffect?.layer;
        if (!layer || adjustedBlocks[layer] == null) return;
        adjustedBlocks[layer] = Math.max(
            0,
            (Number(adjustedBlocks[layer]) || 0) - (Number(traitEffect.blocks) || 0)
        );
    });

    return adjustedBlocks;
};

const getTraitEffectColor = (traitEffect) => {
    if (traitEffect?.hex) return traitEffect.hex;

    const traitId = traitEffect?.id || 'trait';
    const layer = traitEffect?.layer || 'default';
    return TRAIT_EFFECT_COLORS[traitId]?.[layer]
        || TRAIT_EFFECT_COLORS[traitId]?.default
        || '#fbbf24';
};

const getTraitEffectLabel = (traitEffect) => {
    const traitLabel = traitEffect?.label || 'Rasgo';
    const layerLabel = BLOCK_LABELS[traitEffect?.layer] || traitEffect?.layer;
    return layerLabel ? `${traitLabel} · ${layerLabel}` : traitLabel;
};

const getSpeedEffectColor = (speedEffect) => (
    speedEffect?.hex
    || SPEED_EFFECT_COLORS[speedEffect?.id]
    || SPEED_EFFECT_COLORS.default
);

const getPushEffectColor = (pushEffect) => (
    pushEffect?.hex
    || PUSH_EFFECT_COLORS[pushEffect?.id]
    || PUSH_EFFECT_COLORS.default
);

export function getCombatEffectLifetimeMs(effect) {
    if (!effect) return 5500;

    const {
        reactionType,
        finalDamage = 0,
        counterDamage = 0,
        blocksLost,
        traitEffectsApplied,
        statusEffectsApplied,
        speedEffectsApplied,
        pushEffectsApplied,
        recoveryEffectsApplied,
        postReactionSpeedLoss
    } = effect;

    const targetAppliedTraitEffects = normalizeTraitEffects(
        Array.isArray(traitEffectsApplied?.target) ? traitEffectsApplied.target : []
    );
    const attackerAppliedTraitEffects = normalizeTraitEffects(
        Array.isArray(traitEffectsApplied?.attacker) ? traitEffectsApplied.attacker : []
    );
    const targetBlocks = getLostBlocks(
        reactionType === 'parar' && counterDamage > 0
            ? null
            : getBlocksLostWithoutTraitEffects(blocksLost, targetAppliedTraitEffects)
    );
    const attackerBlocks = getLostBlocks(
        reactionType === 'parar' && counterDamage > 0
            ? getBlocksLostWithoutTraitEffects(blocksLost, attackerAppliedTraitEffects)
            : null
    );
    const targetAppliedStatusEffects = sortStatusEffects(
        Array.isArray(statusEffectsApplied?.target) ? statusEffectsApplied.target : []
    );
    const attackerAppliedStatusEffects = sortStatusEffects(
        Array.isArray(statusEffectsApplied?.attacker) ? statusEffectsApplied.attacker : []
    );
    const targetAppliedSpeedEffects = normalizeSpeedEffects(
        Array.isArray(speedEffectsApplied?.target) ? speedEffectsApplied.target : []
    );
    const attackerAppliedSpeedEffects = normalizeSpeedEffects(
        Array.isArray(speedEffectsApplied?.attacker) ? speedEffectsApplied.attacker : []
    );
    const targetAppliedPushEffects = normalizePushEffects(
        Array.isArray(pushEffectsApplied?.target) ? pushEffectsApplied.target : []
    );
    const attackerAppliedPushEffects = normalizePushEffects(
        Array.isArray(pushEffectsApplied?.attacker) ? pushEffectsApplied.attacker : []
    );
    const targetAppliedRecoveryEffects = normalizeRecoveryEffects(
        Array.isArray(recoveryEffectsApplied?.target) ? recoveryEffectsApplied.target : []
    );
    const hasTargetBlocksLost = targetBlocks.length > 0;
    const resistedTargetHit = finalDamage > 0 && !hasTargetBlocksLost;
    const hasCounterIntro = reactionType === 'parar' && counterDamage > 0;
    const hasTargetIntro = (
        (reactionType === 'parar') ||
        (reactionType === 'evadir') ||
        ((!reactionType || reactionType === 'recibir') && resistedTargetHit)
    );
    const targetIntroCount = hasTargetIntro ? 1 : 0;
    const targetIntroEnd = targetIntroCount ? FLYOFF_DURATION_SECONDS : 0;
    const targetDamageDelay = hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
    const targetDamageLastStart = getDelayedSequenceLastStart(
        getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }),
        targetDamageDelay
    );
    const attackerDamageDelay = hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
    const attackerDamageLastStart = getDelayedSequenceLastStart(
        getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }),
        attackerDamageDelay
    );
    const targetTraitDelay = targetAppliedTraitEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(targetDamageLastStart, hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            targetIntroCount > 0 ||
            getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }) > 0
        )
        : 0;
    const attackerTraitDelay = attackerAppliedTraitEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(attackerDamageLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            hasCounterIntro ||
            getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }) > 0
        )
        : 0;
    const targetTraitLastStart = getStaggeredSequenceLastStart(
        targetAppliedTraitEffects.length,
        targetTraitDelay
    );
    const attackerTraitLastStart = getStaggeredSequenceLastStart(
        attackerAppliedTraitEffects.length,
        attackerTraitDelay
    );
    const postReactionTargetBlocks = getLostBlocks(postReactionSpeedLoss?.target?.blocksLost);
    const postReactionTargetDelay = postReactionTargetBlocks.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                attackerDamageLastStart,
                targetTraitLastStart,
                attackerTraitLastStart,
                hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0,
                hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            targetIntroCount > 0 ||
            getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }) > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            attackerAppliedTraitEffects.length > 0 ||
            hasCounterIntro ||
            getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }) > 0
        )
        : 0;
    const postReactionTargetLastStart = getDelayedSequenceLastStart(
        postReactionTargetBlocks.length,
        postReactionTargetDelay
    );
    const targetPushDelay = targetAppliedPushEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                targetTraitLastStart,
                postReactionTargetLastStart,
                hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            targetIntroCount > 0 ||
            getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }) > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            postReactionTargetBlocks.length > 0
        )
        : 0;
    const attackerPushDelay = attackerAppliedPushEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(attackerDamageLastStart, attackerTraitLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            hasCounterIntro ||
            attackerAppliedTraitEffects.length > 0 ||
            getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }) > 0
        )
        : 0;
    const targetPushLastStart = getStaggeredSequenceLastStart(
        targetAppliedPushEffects.length,
        targetPushDelay
    );
    const attackerPushLastStart = getStaggeredSequenceLastStart(
        attackerAppliedPushEffects.length,
        attackerPushDelay
    );
    const targetSpeedDelay = targetAppliedSpeedEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                targetTraitLastStart,
                postReactionTargetLastStart,
                targetPushLastStart,
                hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            targetIntroCount > 0 ||
            getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }) > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            postReactionTargetBlocks.length > 0 ||
            targetAppliedPushEffects.length > 0
        )
        : 0;
    const attackerSpeedDelay = attackerAppliedSpeedEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(attackerDamageLastStart, attackerTraitLastStart, attackerPushLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            hasCounterIntro ||
            attackerAppliedTraitEffects.length > 0 ||
            getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }) > 0 ||
            attackerAppliedPushEffects.length > 0
        )
        : 0;
    const targetSpeedLastStart = getStaggeredSequenceLastStart(
        targetAppliedSpeedEffects.length,
        targetSpeedDelay
    );
    const attackerSpeedLastStart = getStaggeredSequenceLastStart(
        attackerAppliedSpeedEffects.length,
        attackerSpeedDelay
    );

    const targetStateDelay = targetAppliedStatusEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                targetTraitLastStart,
                postReactionTargetLastStart,
                targetPushLastStart,
                targetSpeedLastStart,
                hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            targetIntroCount > 0 ||
            getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit }) > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            postReactionTargetBlocks.length > 0 ||
            targetAppliedPushEffects.length > 0 ||
            targetAppliedSpeedEffects.length > 0
        )
        : 0;
    const attackerStateDelay = attackerAppliedStatusEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(attackerDamageLastStart, attackerTraitLastStart, attackerPushLastStart, attackerSpeedLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            hasCounterIntro ||
            attackerAppliedTraitEffects.length > 0 ||
            getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false }) > 0 ||
            attackerAppliedPushEffects.length > 0 ||
            attackerAppliedSpeedEffects.length > 0
        )
        : 0;
    const targetStateLastStart = getStaggeredSequenceLastStart(
        targetAppliedStatusEffects.length,
        targetStateDelay
    );
    const attackerStateLastStart = getStaggeredSequenceLastStart(
        attackerAppliedStatusEffects.length,
        attackerStateDelay
    );
    const latestEffectEnd = Math.max(
        targetIntroEnd,
        targetDamageLastStart ? targetDamageLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerDamageLastStart ? attackerDamageLastStart + FLYOFF_DURATION_SECONDS : 0,
        targetTraitLastStart ? targetTraitLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerTraitLastStart ? attackerTraitLastStart + FLYOFF_DURATION_SECONDS : 0,
        postReactionTargetLastStart ? postReactionTargetLastStart + FLYOFF_DURATION_SECONDS : 0,
        targetPushLastStart ? targetPushLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerPushLastStart ? attackerPushLastStart + FLYOFF_DURATION_SECONDS : 0,
        targetSpeedLastStart ? targetSpeedLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerSpeedLastStart ? attackerSpeedLastStart + FLYOFF_DURATION_SECONDS : 0,
        targetAppliedRecoveryEffects.length > 0 ? FLYOFF_DURATION_SECONDS : 0,
        targetStateLastStart ? targetStateLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerStateLastStart ? attackerStateLastStart + FLYOFF_DURATION_SECONDS : 0,
        hasTargetBlocksLost ? targetDamageDelay + HIGHLIGHT_DURATION_SECONDS : 0,
        counterDamage > 0 && attackerBlocks.length > 0 ? attackerDamageDelay + HIGHLIGHT_DURATION_SECONDS : 0
    );

    return Math.max(6500, Math.ceil((latestEffectEnd + EFFECT_LIFETIME_SAFETY_BUFFER_SECONDS) * 1000));
}

export function buildCombatEffectVisuals({ effect, targetPos, attackerPos }) {
    if (!effect) {
        return { highlights: [], flyoffs: [] };
    }

    const {
        reactionType,
        finalDamage,
        counterDamage,
        counterPreventedByRange,
        blocksLost,
        traitEffectsApplied,
        statusEffectsApplied,
        speedEffectsApplied,
        pushEffectsApplied,
        recoveryEffectsApplied,
        postReactionSpeedLoss,
        attackerId,
        targetId,
        sourceEventId,
        timestamp
    } = effect;

    const effectKey = sourceEventId || `${timestamp || 'no-ts'}-${attackerId || 'no-att'}-${targetId || 'no-target'}-${reactionType || 'none'}`;
    const flyoffs = [];
    const highlights = [];
    const targetAppliedTraitEffects = normalizeTraitEffects(
        Array.isArray(traitEffectsApplied?.target) ? traitEffectsApplied.target : []
    );
    const attackerAppliedTraitEffects = normalizeTraitEffects(
        Array.isArray(traitEffectsApplied?.attacker) ? traitEffectsApplied.attacker : []
    );
    const targetBlocks = getLostBlocks(
        reactionType === 'parar' && counterDamage > 0
            ? null
            : getBlocksLostWithoutTraitEffects(blocksLost, targetAppliedTraitEffects)
    );
    const attackerBlocks = getLostBlocks(
        reactionType === 'parar' && counterDamage > 0
            ? getBlocksLostWithoutTraitEffects(blocksLost, attackerAppliedTraitEffects)
            : null
    );
    const hasTargetBlocksLost = targetBlocks.length > 0;
    const targetAppliedStatusEffects = sortStatusEffects(
        Array.isArray(statusEffectsApplied?.target) ? statusEffectsApplied.target : []
    );
    const attackerAppliedStatusEffects = sortStatusEffects(
        Array.isArray(statusEffectsApplied?.attacker) ? statusEffectsApplied.attacker : []
    );
    const targetAppliedSpeedEffects = normalizeSpeedEffects(
        Array.isArray(speedEffectsApplied?.target) ? speedEffectsApplied.target : []
    );
    const attackerAppliedSpeedEffects = normalizeSpeedEffects(
        Array.isArray(speedEffectsApplied?.attacker) ? speedEffectsApplied.attacker : []
    );
    const targetAppliedPushEffects = normalizePushEffects(
        Array.isArray(pushEffectsApplied?.target) ? pushEffectsApplied.target : []
    );
    const attackerAppliedPushEffects = normalizePushEffects(
        Array.isArray(pushEffectsApplied?.attacker) ? pushEffectsApplied.attacker : []
    );
    const targetAppliedRecoveryEffects = normalizeRecoveryEffects(
        Array.isArray(recoveryEffectsApplied?.target) ? recoveryEffectsApplied.target : []
    );

    const addHighlight = (id, position, delay = 0) => {
        if (!position) return;

        highlights.push({
            id: `${effectKey}-${id}`,
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
            delay
        });
    };

    const addFlyoff = (id, data) => {
        const flyoffType = data.type || 'info';
        flyoffs.push({
            ...data,
            id: `${effectKey}-${id}`,
            driftX: stableOffset(`${effectKey}-${id}-x`, 20),
            rotate: ['damage', 'trait'].includes(flyoffType)
                ? stableOffset(`${effectKey}-${id}-r`, 10)
                : 0
        });
    };

    const addDamageFlyoff = (id, position, fallbackValue, baseDelay = 0, damageBlocks = targetBlocks) => {
        if (!position) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 10;

        if (damageBlocks.length > 1) {
            damageBlocks.forEach((block, idx) => {
                addFlyoff(`${id}-${idx}`, {
                    x: centerX + (idx * DAMAGE_BLOCK_HORIZONTAL_OFFSET - ((damageBlocks.length - 1) * DAMAGE_BLOCK_HORIZONTAL_OFFSET) / 2),
                    y: baseY - (idx * 6),
                    text: `-${block.cantidad}`,
                    color: BLOCK_COLORS[block.tipo] || '#fff',
                    label: BLOCK_LABELS[block.tipo],
                    type: 'damage',
                    delay: baseDelay + (idx * DAMAGE_BLOCK_STAGGER_SECONDS)
                });
            });
            return;
        }

        if (damageBlocks.length === 1) {
            const [block] = damageBlocks;
            addFlyoff(id, {
                x: centerX,
                y: baseY,
                text: `-${block.cantidad}`,
                color: BLOCK_COLORS[block.tipo] || '#fff',
                label: BLOCK_LABELS[block.tipo],
                type: 'damage',
                delay: baseDelay
            });
            return;
        }

        addFlyoff(id, {
            x: centerX,
            y: baseY,
            text: `-${fallbackValue}`,
            color: '#ef4444',
            label: 'Daño',
            type: 'damage',
            delay: baseDelay
        });
    };

    const addTraitEffectFlyoffs = (id, position, traitEffects, baseDelay = 0) => {
        if (!position || traitEffects.length === 0) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 28;

        traitEffects.forEach((traitEffect, idx) => {
            addFlyoff(`${id}-${traitEffect.id || 'trait'}-${traitEffect.layer || idx}`, {
                x: centerX + stableOffset(`${effectKey}-${id}-${idx}-trait-x`, 16),
                y: baseY - (idx * 8),
                text: `-${traitEffect.blocks}`,
                color: getTraitEffectColor(traitEffect),
                label: getTraitEffectLabel(traitEffect),
                type: 'trait',
                delay: baseDelay + (idx * STATE_EFFECT_STAGGER_SECONDS)
            });
        });
    };

    const addSpeedEffectFlyoffs = (id, position, speedEffects, baseDelay = 0) => {
        if (!position || speedEffects.length === 0) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 54;

        speedEffects.forEach((speedEffect, idx) => {
            addFlyoff(`${id}-${speedEffect.id || 'speed'}-${idx}`, {
                x: centerX + stableOffset(`${effectKey}-${id}-${idx}-speed-x`, 14),
                y: baseY - (idx * 8),
                text: `+${speedEffect.delta} Velocidad`,
                color: getSpeedEffectColor(speedEffect),
                label: speedEffect.label || 'Ralentizado',
                type: 'speed',
                delay: baseDelay + (idx * STATE_EFFECT_STAGGER_SECONDS)
            });
        });
    };

    const getPushEffectLabel = (pushEffect) => {
        if (pushEffect?.sharedMode === 'duelo') return 'Duelo';
        if (pushEffect?.sharedMode === 'formacion') return 'Formación';
        return '1 casilla';
    };

    const addPushEffectFlyoffs = (id, position, pushEffects, baseDelay = 0) => {
        if (!position || pushEffects.length === 0) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 66;

        pushEffects.forEach((pushEffect, idx) => {
            addFlyoff(`${id}-${pushEffect.id || 'push'}-${idx}`, {
                x: centerX + stableOffset(`${effectKey}-${id}-${idx}-push-x`, 14),
                y: baseY - (idx * 8),
                text: `¡${pushEffect.label || 'Empuje'}!`,
                color: getPushEffectColor(pushEffect),
                label: getPushEffectLabel(pushEffect),
                type: 'push',
                delay: baseDelay + (idx * STATE_EFFECT_STAGGER_SECONDS)
            });
        });
    };

    const addRecoveryEffectFlyoffs = (id, position, recoveryEffects, baseDelay = 0) => {
        if (!position || recoveryEffects.length === 0) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 42;

        recoveryEffects.forEach((recoveryEffect, idx) => {
            const resourceLabel = BLOCK_LABELS[recoveryEffect.resource] || recoveryEffect.resource || 'Recurso';
            addFlyoff(`${id}-${recoveryEffect.id || 'recovery'}-${idx}`, {
                x: centerX + stableOffset(`${effectKey}-${id}-${idx}-recovery-x`, 12),
                y: baseY - (idx * 8),
                text: `+${recoveryEffect.amount}`,
                color: recoveryEffect.hex || BLOCK_COLORS[recoveryEffect.resource] || '#34d399',
                label: recoveryEffect.label || resourceLabel,
                type: 'recovery',
                delay: baseDelay + (idx * STATE_EFFECT_STAGGER_SECONDS)
            });
        });
    };

    const resistedTargetHit = finalDamage > 0 && !hasTargetBlocksLost;
    const hasCounterIntro = reactionType === 'parar' && counterDamage > 0 && !!targetPos;
    const hasTargetIntro = (
        (reactionType === 'parar' && !!targetPos) ||
        (reactionType === 'evadir' && !!targetPos) ||
        ((!reactionType || reactionType === 'recibir') && !!targetPos && resistedTargetHit)
    );
    const targetIntroDelay = hasTargetIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
    const targetDamageFlyoffCount = getDamageFlyoffCount({ finalDamage, blocks: targetBlocks, resistedTargetHit });
    const targetDamageLastStart = getDelayedSequenceLastStart(targetDamageFlyoffCount, targetIntroDelay);
    const attackerDamageFlyoffCount = getDamageFlyoffCount({ finalDamage: counterDamage, blocks: attackerBlocks, resistedTargetHit: false });
    const attackerDamageLastStart = getDelayedSequenceLastStart(
        attackerDamageFlyoffCount,
        hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
    );
    const targetTraitDelay = targetAppliedTraitEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(targetDamageLastStart, targetIntroDelay),
            hasTargetIntro || targetDamageFlyoffCount > 0
        )
        : 0;
    const attackerTraitDelay = attackerAppliedTraitEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                attackerDamageLastStart,
                hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            hasCounterIntro || attackerDamageFlyoffCount > 0
        )
        : 0;
    const targetTraitLastStart = getStaggeredSequenceLastStart(
        targetAppliedTraitEffects.length,
        targetTraitDelay
    );
    const attackerTraitLastStart = getStaggeredSequenceLastStart(
        attackerAppliedTraitEffects.length,
        attackerTraitDelay
    );
    const postReactionTargetBlocks = getLostBlocks(postReactionSpeedLoss?.target?.blocksLost);
    const postReactionTargetDelay = postReactionTargetBlocks.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                attackerDamageLastStart,
                targetTraitLastStart,
                attackerTraitLastStart,
                targetIntroDelay,
                hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            hasTargetIntro ||
            targetDamageFlyoffCount > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            hasCounterIntro ||
            attackerDamageFlyoffCount > 0 ||
            attackerAppliedTraitEffects.length > 0
        )
        : 0;
    const postReactionTargetLastStart = getDelayedSequenceLastStart(
        postReactionTargetBlocks.length,
        postReactionTargetDelay
    );
    const targetPushDelay = targetAppliedPushEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                targetTraitLastStart,
                postReactionTargetLastStart,
                targetIntroDelay
            ),
            hasTargetIntro ||
            targetDamageFlyoffCount > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            postReactionTargetBlocks.length > 0
        )
        : 0;
    const attackerPushDelay = attackerAppliedPushEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                attackerDamageLastStart,
                attackerTraitLastStart,
                hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            hasCounterIntro ||
            attackerDamageFlyoffCount > 0 ||
            attackerAppliedTraitEffects.length > 0
        )
        : 0;
    const targetPushLastStart = getStaggeredSequenceLastStart(
        targetAppliedPushEffects.length,
        targetPushDelay
    );
    const attackerPushLastStart = getStaggeredSequenceLastStart(
        attackerAppliedPushEffects.length,
        attackerPushDelay
    );
    const targetSpeedDelay = targetAppliedSpeedEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                targetDamageLastStart,
                targetTraitLastStart,
                postReactionTargetLastStart,
                targetPushLastStart,
                targetIntroDelay
            ),
            hasTargetIntro ||
            targetDamageFlyoffCount > 0 ||
            targetAppliedTraitEffects.length > 0 ||
            postReactionTargetBlocks.length > 0 ||
            targetAppliedPushEffects.length > 0
        )
        : 0;
    const attackerSpeedDelay = attackerAppliedSpeedEffects.length > 0
        ? getStatusSequenceDelay(
            Math.max(
                attackerDamageLastStart,
                attackerTraitLastStart,
                attackerPushLastStart,
                hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
            ),
            hasCounterIntro ||
            attackerDamageFlyoffCount > 0 ||
            attackerAppliedTraitEffects.length > 0 ||
            attackerAppliedPushEffects.length > 0
        )
        : 0;
    const targetSpeedLastStart = getStaggeredSequenceLastStart(
        targetAppliedSpeedEffects.length,
        targetSpeedDelay
    );
    const attackerSpeedLastStart = getStaggeredSequenceLastStart(
        attackerAppliedSpeedEffects.length,
        attackerSpeedDelay
    );

    if ((finalDamage > 0 || hasTargetBlocksLost) && targetPos) {
        const targetDamageDelay = targetIntroDelay;
        if (hasTargetBlocksLost) {
            addHighlight('target-highlight', targetPos, targetDamageDelay);
        }

        if (!resistedTargetHit || hasTargetBlocksLost) {
            addDamageFlyoff('target-dmg', targetPos, finalDamage, targetDamageDelay, targetBlocks);
        }
    }

    if (reactionType === 'parar' && targetPos) {
        if (counterDamage > 0) {
            addFlyoff('target-counter', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Contraataque!',
                color: '#f97316',
                type: 'special'
            });
        } else if (counterPreventedByRange) {
            addFlyoff('target-parry-no-counter', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Parada sin contraataque!',
                color: '#60a5fa',
                type: 'info'
            });
        } else if (finalDamage === 0) {
            addFlyoff('target-perfect', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Bloqueo Perfecto!',
                color: '#eab308',
                type: 'info'
            });
        } else {
            addFlyoff('target-resist', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Resiste!',
                color: '#94a3b8',
                type: 'info'
            });
        }
    } else if (reactionType === 'evadir' && targetPos) {
        const evadedAll = effect.evadedAll || finalDamage === 0;
        if (evadedAll) {
            addFlyoff('target-evade-perfect', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Evasión Perfecta!',
                color: '#34d399',
                type: 'info'
            });
        } else {
            addFlyoff('target-evade-partial', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Evasión Parcial!',
                color: '#6ee7b7',
                type: 'info'
            });
        }
    } else if ((!reactionType || reactionType === 'recibir') && targetPos && resistedTargetHit) {
        addFlyoff('target-resist', {
            x: targetPos.x + targetPos.width / 2,
            y: targetPos.y - 30,
            text: '¡Resiste!',
            color: '#60a5fa',
            type: 'info'
        });
    }

    if (counterDamage > 0 && attackerPos) {
        const counterDamageDelay = hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
        if (attackerBlocks.length > 0) {
            addHighlight('att-highlight', attackerPos, counterDamageDelay);
        }

        addDamageFlyoff('att-dmg', attackerPos, counterDamage, counterDamageDelay, attackerBlocks);
    }

    addTraitEffectFlyoffs('target-trait', targetPos, targetAppliedTraitEffects, targetTraitDelay);
    addTraitEffectFlyoffs('attacker-trait', attackerPos, attackerAppliedTraitEffects, attackerTraitDelay);

    if (targetPos && postReactionTargetBlocks.length > 0) {
        const postReactionSource = postReactionSpeedLoss?.target?.source;
        const postReactionValue = postReactionSpeedLoss?.target?.vida || postReactionTargetBlocks.reduce((sum, block) => sum + (block.cantidad || 0), 0);

        if (postReactionSource === 'sangrado') {
            addFlyoff('target-post-reaction-sangrado', {
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 10,
                text: `-${postReactionValue}`,
                color: STATUS_SOURCE_COLORS.sangrado,
                label: 'Sangrado',
                type: 'damage',
                delay: postReactionTargetDelay
            });
        } else {
            addDamageFlyoff(
                'target-post-reaction-speed-loss',
                targetPos,
                postReactionValue,
                postReactionTargetDelay,
                postReactionTargetBlocks
            );
        }
    }

    addPushEffectFlyoffs('target-push', targetPos, targetAppliedPushEffects, targetPushDelay);
    addPushEffectFlyoffs('attacker-push', attackerPos, attackerAppliedPushEffects, attackerPushDelay);

    addSpeedEffectFlyoffs('target-speed', targetPos, targetAppliedSpeedEffects, targetSpeedDelay);
    addSpeedEffectFlyoffs('attacker-speed', attackerPos, attackerAppliedSpeedEffects, attackerSpeedDelay);
    addRecoveryEffectFlyoffs('target-recovery', targetPos, targetAppliedRecoveryEffects, 0);

    targetAppliedStatusEffects.forEach((statusEffect, idx) => {
        if (!targetPos) return;

        addFlyoff(`target-status-${statusEffect.id || idx}`, {
            x: targetPos.x + targetPos.width / 2,
            y: targetPos.y - 40,
            text: `¡${statusEffect.label || 'Estado'}!`,
            color: statusEffect.hex || '#818cf8',
            type: 'state',
            delay: getStatusSequenceDelay(
                Math.max(
                    targetDamageLastStart,
                    targetTraitLastStart,
                    postReactionTargetLastStart,
                    targetPushLastStart,
                    targetSpeedLastStart,
                    targetIntroDelay
                ),
                hasTargetIntro ||
                targetDamageFlyoffCount > 0 ||
                targetAppliedTraitEffects.length > 0 ||
                postReactionTargetBlocks.length > 0 ||
                targetAppliedPushEffects.length > 0 ||
                targetAppliedSpeedEffects.length > 0
            ) + (idx * STATE_EFFECT_STAGGER_SECONDS)
        });
    });

    attackerAppliedStatusEffects.forEach((statusEffect, idx) => {
        if (!attackerPos) return;

        addFlyoff(`attacker-status-${statusEffect.id || idx}`, {
                x: attackerPos.x + attackerPos.width / 2,
                y: attackerPos.y - 40,
                text: `¡${statusEffect.label || 'Estado'}!`,
                color: statusEffect.hex || '#818cf8',
                type: 'state',
                delay: getStatusSequenceDelay(
                Math.max(attackerDamageLastStart, attackerTraitLastStart, attackerPushLastStart, attackerSpeedLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
                hasCounterIntro ||
                attackerDamageFlyoffCount > 0 ||
                attackerAppliedTraitEffects.length > 0 ||
                attackerAppliedPushEffects.length > 0 ||
                attackerAppliedSpeedEffects.length > 0
            ) + (idx * STATE_EFFECT_STAGGER_SECONDS)
        });
    });

    return { highlights, flyoffs };
}

function FloatingCombatEffectsComponent({ effect, targetPos, attackerPos }) {
    const visuals = useMemo(() => buildCombatEffectVisuals({ effect, targetPos, attackerPos }), [
        attackerPos?.height,
        attackerPos?.width,
        attackerPos?.x,
        attackerPos?.y,
        effect,
        targetPos?.height,
        targetPos?.width,
        targetPos?.x,
        targetPos?.y
    ]);

    if (!effect) return null;

    return (
        <AnimatePresence>
            {visuals.highlights.map((highlight) => (
                <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: [0, 0.4, 0.6, 0.4, 0],
                        scale: [0.8, 1, 1.05, 1, 0.9]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: highlight.delay || 0, duration: 2.5, ease: 'easeInOut' }}
                    className="absolute pointer-events-none z-[190] bg-red-600 rounded-full mix-blend-overlay blur-sm"
                    style={{
                        left: highlight.x,
                        top: highlight.y,
                        width: highlight.width,
                        height: highlight.height,
                        boxShadow: '0 0 40px rgba(220, 38, 38, 0.8)'
                    }}
                />
            ))}
            {visuals.flyoffs.map((flyoff) => (
                <motion.div
                    key={flyoff.id}
                    initial={{ opacity: 0, y: flyoff.y + 20, x: flyoff.x, scale: 0.2 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        y: flyoff.y - 120,
                        x: flyoff.x + flyoff.driftX,
                        scale: [0.2, 1.5, 1, 0.8],
                        rotate: [0, flyoff.rotate, 0]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        delay: flyoff.delay || 0,
                        duration: FLYOFF_DURATION_SECONDS,
                        times: [0, 0.15, 0.85, 1],
                        ease: 'easeOut'
                    }}
                    className="absolute pointer-events-none z-[200] flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                >
                    <div className="relative flex flex-col items-center">
                        <span
                            className="font-fantasy font-black italic tracking-tighter"
                            style={{
                                color: flyoff.color,
                                fontSize: ['damage', 'trait'].includes(flyoff.type) ? '48px' : (['state', 'speed', 'push'].includes(flyoff.type) ? '34px' : '32px'),
                                textShadow: `
                                    0 0 10px ${flyoff.color}80,
                                    0 0 20px #000,
                                    -2px -2px 0 #000,
                                    2px -2px 0 #000,
                                    -2px 2px 0 #000,
                                    2px 2px 0 #000,
                                    0 4px 10px rgba(0,0,0,0.8)
                                `,
                                filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))'
                            }}
                        >
                            {flyoff.text}
                        </span>
                        {flyoff.label && (
                            <span
                                className="text-[10px] font-bold uppercase tracking-[0.3em] text-white whitespace-nowrap px-2 py-0.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 mt-[-8px]"
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                            >
                                {flyoff.label}
                            </span>
                        )}
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}

export default React.memo(FloatingCombatEffectsComponent, (prevProps, nextProps) => (
    prevProps.effect === nextProps.effect &&
    samePosition(prevProps.targetPos, nextProps.targetPos) &&
    samePosition(prevProps.attackerPos, nextProps.attackerPos)
));
