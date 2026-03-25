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

const getStatusSequenceDelay = (lastSequenceStart = 0, hasSequence = false) => {
    if (!hasSequence) return 0;
    return lastSequenceStart + STATE_EFFECT_DELAY_SECONDS;
};

export function getCombatEffectLifetimeMs(effect) {
    if (!effect) return 5500;

    const {
        reactionType,
        finalDamage = 0,
        counterDamage = 0,
        blocksLost,
        statusEffectsApplied
    } = effect;

    const blocks = getLostBlocks(blocksLost);
    const hasBlocksLost = blocks.length > 0;
    const resistedTargetHit = finalDamage > 0 && !hasBlocksLost;
    const hasCounterIntro = reactionType === 'parar' && counterDamage > 0;
    const hasResistIntro = reactionType === 'parar' && finalDamage > 0;
    const targetIntroCount = (
        (reactionType === 'parar') ||
        (reactionType === 'evadir') ||
        ((!reactionType || reactionType === 'recibir') && resistedTargetHit)
    ) ? 1 : 0;
    const targetIntroEnd = targetIntroCount ? FLYOFF_DURATION_SECONDS : 0;
    const targetDamageDelay = hasResistIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
    const targetDamageLastStart = getDelayedSequenceLastStart(
        getDamageFlyoffCount({ finalDamage, blocks, resistedTargetHit }),
        targetDamageDelay
    );
    const attackerDamageDelay = hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
    const attackerDamageLastStart = getDelayedSequenceLastStart(
        getDamageFlyoffCount({ finalDamage: counterDamage, blocks, resistedTargetHit: false }),
        attackerDamageDelay
    );

    const targetStateDelay = Array.isArray(statusEffectsApplied?.target) && statusEffectsApplied.target.length > 0
        ? getStatusSequenceDelay(
            Math.max(targetDamageLastStart, hasResistIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            targetIntroCount > 0 || getDamageFlyoffCount({ finalDamage, blocks, resistedTargetHit }) > 0
        )
        : 0;
    const attackerStateDelay = Array.isArray(statusEffectsApplied?.attacker) && statusEffectsApplied.attacker.length > 0
        ? getStatusSequenceDelay(
            Math.max(attackerDamageLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
            hasCounterIntro || getDamageFlyoffCount({ finalDamage: counterDamage, blocks, resistedTargetHit: false }) > 0
        )
        : 0;
    const latestEffectEnd = Math.max(
        targetIntroEnd,
        targetDamageLastStart ? targetDamageLastStart + FLYOFF_DURATION_SECONDS : 0,
        attackerDamageLastStart ? attackerDamageLastStart + FLYOFF_DURATION_SECONDS : 0,
        targetStateDelay ? targetStateDelay + FLYOFF_DURATION_SECONDS : 0,
        attackerStateDelay ? attackerStateDelay + FLYOFF_DURATION_SECONDS : 0,
        hasBlocksLost ? targetDamageDelay + HIGHLIGHT_DURATION_SECONDS : 0,
        counterDamage > 0 && hasBlocksLost ? attackerDamageDelay + HIGHLIGHT_DURATION_SECONDS : 0
    );

    return Math.max(5500, Math.ceil((latestEffectEnd + 0.3) * 1000));
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
        statusEffectsApplied,
        attackerId,
        targetId,
        sourceEventId,
        timestamp
    } = effect;

    const effectKey = sourceEventId || `${timestamp || 'no-ts'}-${attackerId || 'no-att'}-${targetId || 'no-target'}-${reactionType || 'none'}`;
    const flyoffs = [];
    const highlights = [];
    const blocks = getLostBlocks(blocksLost);
    const hasBlocksLost = blocks.length > 0;
    const targetAppliedStatusEffects = Array.isArray(statusEffectsApplied?.target) ? statusEffectsApplied.target : [];
    const attackerAppliedStatusEffects = Array.isArray(statusEffectsApplied?.attacker) ? statusEffectsApplied.attacker : [];

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
            rotate: flyoffType === 'damage' ? stableOffset(`${effectKey}-${id}-r`, 10) : 0
        });
    };

    const addDamageFlyoff = (id, position, fallbackValue, baseDelay = 0) => {
        if (!position) return;

        const centerX = position.x + position.width / 2;
        const baseY = position.y - 10;

        if (blocks.length > 1) {
            blocks.forEach((block, idx) => {
                addFlyoff(`${id}-${idx}`, {
                    x: centerX + (idx * DAMAGE_BLOCK_HORIZONTAL_OFFSET - ((blocks.length - 1) * DAMAGE_BLOCK_HORIZONTAL_OFFSET) / 2),
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

        if (blocks.length === 1) {
            const [block] = blocks;
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

    const resistedTargetHit = finalDamage > 0 && !hasBlocksLost;
    const hasCounterIntro = reactionType === 'parar' && counterDamage > 0 && !!targetPos;
    const hasResistIntro = reactionType === 'parar' && finalDamage > 0 && !!targetPos;
    const targetDamageFlyoffCount = getDamageFlyoffCount({ finalDamage, blocks, resistedTargetHit });
    const targetDamageLastStart = getDelayedSequenceLastStart(targetDamageFlyoffCount, hasResistIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0);
    const hasTargetIntro = (
        (reactionType === 'parar' && !!targetPos) ||
        (reactionType === 'evadir' && !!targetPos) ||
        ((!reactionType || reactionType === 'recibir') && !!targetPos && resistedTargetHit)
    );
    const attackerDamageFlyoffCount = getDamageFlyoffCount({ finalDamage: counterDamage, blocks, resistedTargetHit: false });
    const attackerDamageLastStart = getDelayedSequenceLastStart(
        attackerDamageFlyoffCount,
        hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0
    );

    if (finalDamage > 0 && targetPos) {
        const targetDamageDelay = hasResistIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0;
        if (hasBlocksLost) {
            addHighlight('target-highlight', targetPos, targetDamageDelay);
        }

        if (!resistedTargetHit || hasBlocksLost) {
            addDamageFlyoff('target-dmg', targetPos, finalDamage, targetDamageDelay);
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
        if (hasBlocksLost) {
            addHighlight('att-highlight', attackerPos, counterDamageDelay);
        }

        addDamageFlyoff('att-dmg', attackerPos, counterDamage, counterDamageDelay);
    }

    targetAppliedStatusEffects.forEach((statusEffect, idx) => {
        if (!targetPos) return;

        addFlyoff(`target-status-${statusEffect.id || idx}`, {
            x: targetPos.x + targetPos.width / 2,
            y: targetPos.y - 40,
            text: `¡${statusEffect.label || 'Estado'}!`,
            color: statusEffect.hex || '#818cf8',
            type: 'state',
            delay: getStatusSequenceDelay(
                Math.max(targetDamageLastStart, hasResistIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
                hasTargetIntro || targetDamageFlyoffCount > 0
            ) + (idx * 0.2)
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
                Math.max(attackerDamageLastStart, hasCounterIntro ? COMBAT_RESULT_INTRO_DELAY_SECONDS : 0),
                hasCounterIntro || attackerDamageFlyoffCount > 0
            ) + (idx * 0.2)
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
                                fontSize: flyoff.type === 'damage' ? '48px' : (flyoff.type === 'state' ? '34px' : '32px'),
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
