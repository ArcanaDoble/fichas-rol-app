import React from 'react';
import { DEFAULT_STATUS_EFFECTS, PRONE_STATUS_IDS } from '../../utils/statusEffects';
import {
    getSpeedConsumption,
    hasCombatTrait,
    hasManualCombatTrait,
    hasNativeCombatTrait,
    normalizeCombatTraitId,
    parseDamage,
} from '../../utils/combatSystem';
import { getItemTraits } from '../../utils/armorSystem';
import { isCardContainerItem, isCardItem } from '../../utils/cardBoard';
import { DEFAULT_GRID_CONFIG, DEFAULT_TOKEN_CELL_SCALE, roundGridValue } from './grid';
import { getGridWorldRect, lineRectIntersect, linesIntersect } from './spatial';

// Frozen legacy rules. New Roguelite combat rules belong exclusively in features/canvas.

export const fixMojibakeText = (value = '') => {
    if (value === null || value === undefined) return '';
    let current = String(value);
    if (!/[\u00c3\u00c2\u00e2]/.test(current)) return current;

    for (let i = 0; i < 6; i += 1) {
        try {
            const bytes = Uint8Array.from([...current].map((char) => char.charCodeAt(0) & 0xff));
            const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (decoded === current) break;
            current = decoded;
        } catch {
            break;
        }
    }
    return current;
};

export const formatCombatTraitLabel = (trait = '') => {
    const cleanTrait = fixMojibakeText(trait).trim();
    const normalized = cleanTrait.toLowerCase();
    if (normalized === 'derribado' || normalized === 'derribar' || normalized === 'derribo') return 'Derribo';
    if (normalized === 'conmocionante') return 'Conmocionante';
    if (normalized === 'fluida') return 'Fluida';
    if (normalized === 'sangrado') return 'Sangrado';
    if (normalized === 'ralentizado' || normalized === 'ralentizar') return 'Ralentizado';
    if (normalized === 'penetrante' || normalized === 'perforante') return 'Perforante';
    if (normalized === 'empuje' || normalized === 'empujar') return 'Empuje';
    if (normalized === 'elusion' || normalized === 'elusión') return 'Elusión';
    if (normalized === 'balistico' || normalized === 'balístico' || normalized === 'balistica' || normalized === 'balística') return 'Balístico';
    if (normalized === 'distancia') return 'Distancia';
    if (normalized === 'bloqueo' || normalized === 'bloquear') return 'Bloqueo';
    if (normalized === 'guardia') return 'Guardia';
    if (normalized === 'sin guardia' || normalized === 'singuardia' || normalized === 'sin_guardia') return 'Sin guardia';
    return cleanTrait;
};

export const COMBAT_RANGE_MAP = {
    toque: 0,
    cercano: 1,
    intermedio: 2,
    lejano: 3,
    extremo: 999
};

export const getCombatRangeData = (item) => {
    const rawRange =
        item?.alc ??
        item?.alcance ??
        item?.range ??
        item?.Alcance ??
        item?.Range ??
        item?.payload?.range ??
        item?.payload?.alcance ??
        item?.payload?.alc;

    if (rawRange === undefined || rawRange === null || rawRange === '') {
        return { value: COMBAT_RANGE_MAP.toque, label: 'Toque' };
    }

    const label = rawRange.toString().trim();
    const normalized = label.toLowerCase();

    if (normalized.includes('toque')) return { value: COMBAT_RANGE_MAP.toque, label };
    if (normalized.includes('cercano')) return { value: COMBAT_RANGE_MAP.cercano, label };
    if (normalized.includes('intermedio')) return { value: COMBAT_RANGE_MAP.intermedio, label };
    if (normalized.includes('lejano')) return { value: COMBAT_RANGE_MAP.lejano, label };
    if (normalized.includes('extremo')) return { value: COMBAT_RANGE_MAP.extremo, label };

    const digitMatch = normalized.match(/\d+/);
    if (digitMatch) {
        return { value: parseInt(digitMatch[0], 10), label };
    }

    return { value: COMBAT_RANGE_MAP.toque, label };
};

export const isBoardMarkerItem = (item) => item?.type === 'boardMarker';
export const isBoardDieItem = (item) => item?.type === 'boardDie';
export const isCombatTokenItem = (item) => !!item && item.type !== 'light' && item.type !== 'wall' && item.type !== 'geometry' && !isCardItem(item) && !isCardContainerItem(item) && !isBoardMarkerItem(item) && !isBoardDieItem(item);
export const isMobileTacticalMoveToken = (item) => (
    isCombatTokenItem(item) &&
    !!(
        item.stats ||
        item.linkedCharacterId ||
        (Array.isArray(item.equippedItems) && item.equippedItems.length > 0) ||
        (Array.isArray(item.inventory) && item.inventory.length > 0)
    )
);
export const getCombatSpeedTokens = (items = []) => (
    (items || []).filter(item => isCombatTokenItem(item) && (item.isCircular || item.stats))
);
export const isMasterControlledCombatToken = (token) => {
    const controlledBy = Array.isArray(token?.controlledBy)
        ? token.controlledBy.filter(Boolean)
        : [];
    return controlledBy.length === 0 || controlledBy.includes('master') || controlledBy.includes('Master');
};
export const getCombatTokenSpeed = (token) => Math.max(0, Number(token?.velocidad) || 0);
export const getActiveCombatTurnInfo = (items = []) => {
    const combatTokens = getCombatSpeedTokens(items);
    if (combatTokens.length === 0) {
        return { activeSpeed: 0, hasMasterAtActiveSpeed: false };
    }

    const activeSpeed = Math.min(...combatTokens.map(getCombatTokenSpeed));
    const hasMasterAtActiveSpeed = combatTokens.some(token => (
        getCombatTokenSpeed(token) === activeSpeed && isMasterControlledCombatToken(token)
    ));

    return { activeSpeed, hasMasterAtActiveSpeed };
};
export const canCombatTokenActNow = (token, items = []) => {
    if (!token) return false;
    const { activeSpeed, hasMasterAtActiveSpeed } = getActiveCombatTurnInfo(items);
    if (getCombatTokenSpeed(token) !== activeSpeed) return false;
    return !hasMasterAtActiveSpeed || isMasterControlledCombatToken(token);
};
export const sanitizeForFirestore = (value) => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [key, sanitizeForFirestore(entryValue)])
        );
    }
    return value;
};
export const getItemOverlapRatio = (a = {}, b = {}) => {
    const left = Math.max(Number(a.x) || 0, Number(b.x) || 0);
    const top = Math.max(Number(a.y) || 0, Number(b.y) || 0);
    const right = Math.min((Number(a.x) || 0) + (Number(a.width) || 0), (Number(b.x) || 0) + (Number(b.width) || 0));
    const bottom = Math.min((Number(a.y) || 0) + (Number(a.height) || 0), (Number(b.y) || 0) + (Number(b.height) || 0));
    const overlapWidth = Math.max(0, right - left);
    const overlapHeight = Math.max(0, bottom - top);
    const overlapArea = overlapWidth * overlapHeight;
    const minArea = Math.max(1, Math.min(
        (Number(a.width) || 0) * (Number(a.height) || 0),
        (Number(b.width) || 0) * (Number(b.height) || 0)
    ));
    return overlapArea / minArea;
};

export const getCardCenter = (item) => ({
    x: (Number(item?.x) || 0) + ((Number(item?.width) || 0) / 2),
    y: (Number(item?.y) || 0) + ((Number(item?.height) || 0) / 2),
});

export const isPointInsideExpandedItem = (point, item, expandRatio = 0.18) => {
    if (!point || !item) return false;
    const width = Number(item.width) || 0;
    const height = Number(item.height) || 0;
    const expandX = width * expandRatio;
    const expandY = height * expandRatio;
    return (
        point.x >= item.x - expandX &&
        point.x <= item.x + width + expandX &&
        point.y >= item.y - expandY &&
        point.y <= item.y + height + expandY
    );
};

export const normalizeCombatSideKey = (value = '') => value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getTokenCombatSideKeys = (token) => {
    const sideKeys = new Set();
    const teamId = normalizeCombatSideKey(token?.teamId || '');
    if (teamId) {
        sideKeys.add(`team:${teamId}`);
    }

    const controlledBy = Array.isArray(token?.controlledBy) ? token.controlledBy : [];
    controlledBy
        .map((entry) => normalizeCombatSideKey(entry))
        .filter(Boolean)
        .forEach((entry) => {
            sideKeys.add(`control:${entry}`);
        });

    if (!teamId && controlledBy.length === 0) {
        sideKeys.add('control:master');
    }

    return sideKeys;
};

export const areTokensAllied = (tokenA, tokenB) => {
    if (!isCombatTokenItem(tokenA) || !isCombatTokenItem(tokenB)) return false;

    const teamIdA = normalizeCombatSideKey(tokenA?.teamId || '');
    const teamIdB = normalizeCombatSideKey(tokenB?.teamId || '');

    if (teamIdA || teamIdB) {
        return !!teamIdA && teamIdA === teamIdB;
    }

    const sideKeysA = getTokenCombatSideKeys(tokenA);
    const sideKeysB = getTokenCombatSideKeys(tokenB);

    for (const key of sideKeysA) {
        if (sideKeysB.has(key)) return true;
    }

    return false;
};

export const getDefaultTokenDimensions = (config = {}) => {
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    return {
        width: roundGridValue(cellW * DEFAULT_TOKEN_CELL_SCALE),
        height: roundGridValue(cellH * DEFAULT_TOKEN_CELL_SCALE),
    };
};

export const canTokenShareCombatCell = (token, config = {}) => {
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const width = Number(token?.width) || cellW;
    const height = Number(token?.height) || cellH;

    return width <= (cellW * 0.55) && height <= (cellH * 0.55);
};

export const isSmallCombatToken = (token, config = {}) => {
    if (!isCombatTokenItem(token)) return false;
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const width = Number(token?.width) || cellW;
    const height = Number(token?.height) || cellH;

    return width < (cellW * DEFAULT_TOKEN_CELL_SCALE) && height < (cellH * DEFAULT_TOKEN_CELL_SCALE);
};

export const isLockedCombatToken = (token, config = {}) => {
    if (!isCombatTokenItem(token)) return false;
    return !canTokenShareCombatCell(token, config);
};

export const getTokenDistanceInCells = (t1, t2, gridConfig = {}) => {
    if (!t1 || !t2) return 0;

    const cellW = gridConfig.cellWidth || 50;
    const cellH = gridConfig.cellHeight || 50;
    const gridRect = getGridWorldRect(gridConfig);

    const t1x = Math.round(((t1.x || 0) - gridRect.x) / cellW);
    const t1y = Math.round(((t1.y || 0) - gridRect.y) / cellH);
    const t1w = Math.max(1, Math.round((t1.width || cellW) / cellW));
    const t1h = Math.max(1, Math.round((t1.height || cellH) / cellH));

    const t2x = Math.round(((t2.x || 0) - gridRect.x) / cellW);
    const t2y = Math.round(((t2.y || 0) - gridRect.y) / cellH);
    const t2w = Math.max(1, Math.round((t2.width || cellW) / cellW));
    const t2h = Math.max(1, Math.round((t2.height || cellH) / cellH));

    const distX = Math.max(0, t2x - (t1x + t1w - 1), t1x - (t2x + t2w - 1));
    const distY = Math.max(0, t2y - (t1y + t1h - 1), t1y - (t2y + t2h - 1));

    return Math.max(distX, distY);
};

export const canUseTouchAgainstAdjacentLockedTarget = (attacker, target, gridConfig = {}) => {
    if (!attacker || !target) return false;
    const actualDistance = getTokenDistanceInCells(attacker, target, gridConfig);
    if (actualDistance !== 1) return false;
    return isLockedCombatToken(attacker, gridConfig) || isLockedCombatToken(target, gridConfig);
};

export const isWeaponWithinCombatRange = (weapon, attacker, target, gridConfig = {}, precomputedDistance = null) => {
    if (!weapon || !attacker || !target) return false;
    const rangeData = getCombatRangeData(weapon);
    const actualDistance = Number.isFinite(Number(precomputedDistance))
        ? Number(precomputedDistance)
        : getTokenDistanceInCells(attacker, target, gridConfig);

    if (rangeData.value >= actualDistance) return true;

    return rangeData.value === COMBAT_RANGE_MAP.toque &&
        actualDistance === 1 &&
        canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig);
};

export const getTokenProneStatusId = (token) => {
    const statuses = Array.isArray(token?.status) ? token.status : [];
    return PRONE_STATUS_IDS.find((statusId) => statuses.includes(statusId)) || null;
};

export const getTokenProneStatusMeta = (token) => {
    const proneStatusId = getTokenProneStatusId(token);
    if (!proneStatusId) return null;
    return {
        id: proneStatusId,
        ...(DEFAULT_STATUS_EFFECTS[proneStatusId] || DEFAULT_STATUS_EFFECTS.derribado)
    };
};

export const isTokenDerribado = (token) => !!getTokenProneStatusId(token);

export const getStandUpSpeedCost = (token) => {
    const proneStatusId = getTokenProneStatusId(token);
    return proneStatusId === 'conmocionado' ? 2 : 1;
};

export const getCombatWeaponName = (weapon) =>
    String(weapon?.nombre || weapon?.name || '').trim().toLowerCase();

export const normalizeFluidaState = (state) => {
    if (!state || !state.targetId) return null;

    const updatedAt = Number(state.updatedAt);

    return {
        targetId: state.targetId,
        weaponName: state.weaponName || '',
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        source: state.source || 'attack'
    };
};

export const getTokenFluidaState = (token) => normalizeFluidaState(token?.fluidaState);

export const createFluidaState = (targetId, weapon, source = 'attack') => {
    if (!targetId) return null;
    return {
        targetId,
        weaponName: getCombatWeaponName(weapon),
        updatedAt: Date.now(),
        source
    };
};

export const getQueuedFluidaState = (token, pendingState) => {
    let nextState = getTokenFluidaState(token);

    if (!pendingState || pendingState.tokenId !== token?.id) {
        return nextState;
    }

    (pendingState.actions || []).forEach((action) => {
        if (action.actionId !== 'attack') {
            nextState = null;
            return;
        }

        if (!hasNativeCombatTrait(action.weapon, 'fluida') || !action.targetId) {
            nextState = null;
            return;
        }

        nextState = createFluidaState(action.targetId, action.weapon, 'attack');
    });

    return nextState;
};

export const getAttackSpeedCostMeta = ({ attackerToken, targetId, weapon, pendingState }) => {
    const baseCost = Math.max(1, weapon ? getSpeedConsumption(weapon) : 2);
    const hasNativeFluidaTrait = hasNativeCombatTrait(weapon, 'fluida');
    const hasManualFluidaTrait = !hasNativeFluidaTrait && hasManualCombatTrait(weapon, 'fluida');
    const queuedFluidaState = getQueuedFluidaState(attackerToken, pendingState);
    const weaponName = getCombatWeaponName(weapon);
    const automaticFluidaDiscountApplied =
        hasNativeFluidaTrait &&
        queuedFluidaState?.targetId &&
        queuedFluidaState.targetId === targetId &&
        queuedFluidaState?.weaponName &&
        queuedFluidaState.weaponName === weaponName &&
        baseCost > 1;
    const manualFluidaDiscountApplied = hasManualFluidaTrait && baseCost > 1;
    const fluidaDiscountApplied = automaticFluidaDiscountApplied || manualFluidaDiscountApplied;

    return {
        baseCost,
        cost: fluidaDiscountApplied ? Math.max(1, baseCost - 1) : baseCost,
        hasFluidaTrait: hasNativeFluidaTrait || hasManualFluidaTrait,
        hasNativeFluidaTrait,
        hasManualFluidaTrait,
        fluidaDiscountApplied,
        fluidaDiscountMode: manualFluidaDiscountApplied ? 'manual' : automaticFluidaDiscountApplied ? 'native' : null
    };
};

export const getReactionBudgetForEvent = (event) => {
    const explicitBudget = Number(event?.reactionBudget);
    if (Number.isFinite(explicitBudget) && explicitBudget >= 0) {
        return Math.max(0, Math.round(explicitBudget));
    }

    const fluidaBaseCost = Number(event?.fluidaMeta?.baseCost);
    if (Number.isFinite(fluidaBaseCost) && fluidaBaseCost > 0) {
        return Math.max(1, Math.round(event?.fluidaMeta?.discountApplied ? fluidaBaseCost - 1 : fluidaBaseCost));
    }

    return Math.max(1, getSpeedConsumption(event?.weapon));
};

export const getReactionSpeedSpentByEvent = (event) => {
    if (!event || event.status === 'esperando_reaccion') return 0;
    const explicitCost = Number(event.reactionData?.yellowCost);
    if (Number.isFinite(explicitCost) && explicitCost > 0) {
        return Math.max(0, Math.round(explicitCost));
    }
    if (event.reactionType === 'parar') {
        return buildLegacyParrySteps(event.reactionData)
            .reduce((sum, step) => sum + Math.max(0, Number(step?.yellowCost) || 0), 0);
    }
    if (event.reactionType === 'evadir') {
        return Array.isArray(event.reactionData?.evadedDiceIds)
            ? event.reactionData.evadedDiceIds.length
            : 0;
    }
    return 0;
};

export const buildLegacyParrySteps = (reactionData) => {
    if (!reactionData) return [];
    if (Array.isArray(reactionData.parrySteps) && reactionData.parrySteps.length > 0) {
        return reactionData.parrySteps;
    }

    if (!reactionData.weapon) return [];

    const yellowCost = Math.max(
        1,
        Number(reactionData.yellowCost) ||
        Number(reactionData.baseYellowCost) ||
        getSpeedConsumption(reactionData.weapon)
    );

    return [{
        id: 'legacy-parry-step',
        weapon: reactionData.weapon,
        yellowCost,
        baseYellowCost: Math.max(1, Number(reactionData.baseYellowCost) || yellowCost),
        fluidaDiscountApplied: !!reactionData.fluidaDiscountApplied,
    }];
};

export const extractCombatRollDice = (rollResult, idPrefix = 'roll') => {
    const dice = [];
    (rollResult?.details || []).forEach((detail, dIdx) => {
        if (detail.type === 'dice') {
            const match = detail.formula?.match(/d(\d+)/i);
            const faces = match ? parseInt(match[1], 10) : 20;

            detail.rolls.forEach((r, rIdx) => {
                dice.push({
                    value: typeof r === 'object' ? r.value : r,
                    critical: typeof r === 'object' ? r.critical : false,
                    matchedAttr: detail.matchedAttr || null,
                    id: `${idPrefix}-${dIdx}-${rIdx}`,
                    faces
                });
            });
        } else if (detail.matchedAttr && (detail.type === 'calc' || detail.type === 'modifier')) {
            dice.push({
                value: detail.value || detail.total || 0,
                matchedAttr: detail.matchedAttr,
                critical: false,
                id: `${idPrefix}-${dIdx}-0`,
                faces: 6
            });
        }
    });

    return dice.sort((a, b) => {
        const rankA = a.critical ? 1 : a.matchedAttr ? 2 : 0;
        const rankB = b.critical ? 1 : b.matchedAttr ? 2 : 0;
        return rankA - rankB;
    });
};

export const isValidSelectionBoxPoint = (point) => (
    Number.isFinite(point?.x) && Number.isFinite(point?.y)
);

export const isValidSelectionBox = (box) => (
    isValidSelectionBoxPoint(box?.start) && isValidSelectionBoxPoint(box?.current)
);

export const isCombatDieEvaded = (die, evadedIds = []) => {
    const ids = Array.isArray(evadedIds) ? evadedIds : [];
    const rawDieId = typeof die?.id === 'string' ? die.id : '';
    const unprefixedDieId = rawDieId.startsWith('att-') || rawDieId.startsWith('atk-') || rawDieId.startsWith('roll-')
        ? rawDieId.replace(/^[^-]+-/, '')
        : rawDieId;
    return ids.includes(rawDieId) || ids.includes(unprefixedDieId);
};

export const getCombatRollValue = (rollValue) => (
    typeof rollValue === 'object' && rollValue !== null
        ? Number(rollValue.value) || 0
        : Number(rollValue) || 0
);

export const getBallisticWeaponDamageFromRoll = (rollResult, evadedIds = []) => {
    const safeEvadedIds = Array.isArray(evadedIds) ? evadedIds : [];
    return (rollResult?.details || []).reduce((total, detail, dIdx) => {
        if (detail?.type !== 'dice' || !detail.ballisticEligible) return total;

        const rolls = Array.isArray(detail.rolls) ? detail.rolls : [];
        return total + rolls.reduce((sum, rollValue, rIdx) => {
            const rawId = `${dIdx}-${rIdx}`;
            if (
                safeEvadedIds.includes(rawId) ||
                safeEvadedIds.includes(`att-${rawId}`) ||
                safeEvadedIds.includes(`atk-${rawId}`) ||
                safeEvadedIds.includes(`roll-${rawId}`)
            ) {
                return sum;
            }

            return sum + getCombatRollValue(rollValue);
        }, 0);
    }, 0);
};

export const getBaseWeaponDamageFormula = (weapon) => {
    const itemDamage = weapon?.dano ?? weapon?.poder ?? weapon?.damage ?? '';
    const baseFormula = parseDamage(itemDamage);
    const hasExplicitZeroBase = baseFormula === '0' || /^(\d*)d0$/i.test(baseFormula);
    if (!baseFormula || hasExplicitZeroBase) return '';
    return baseFormula;
};

export const buildGuardiaParryRollWeapon = (weapon) => {
    if (!weapon || !hasCombatTrait(weapon, 'guardia')) return weapon;

    const guardiaDieFormula = getBaseWeaponDamageFormula(weapon);
    if (!guardiaDieFormula) return weapon;

    return {
        ...weapon,
        extraDamageString: weapon.extraDamageString
            ? `${weapon.extraDamageString} + ${guardiaDieFormula}`
            : guardiaDieFormula,
    };
};

export const buildParryWeaponSummaryLabel = (steps = []) => {
    const counts = new globalThis.Map();
    steps.forEach((step) => {
        const name = step?.weaponName || step?.weapon?.nombre || step?.weapon?.name;
        if (!name) return;
        counts.set(name, (counts.get(name) || 0) + 1);
    });

    if (counts.size === 0) return null;

    return Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
        .join(' · ');
};

export const GLOBAL_PARRY_TRAIT_IDS = new Set([
    'agudeza',
    'derribo',
    'hendir',
    'conmocionante',
    'sangrado',
    'ralentizado',
    'perforante',
    'empuje',
    'balistico'
]);

export const NON_STATUS_COMBAT_EFFECT_IDS = new Set(['ralentizado', 'empuje']);
export const RALENTIZADO_EFFECT_LABEL = 'Ralentizado';
export const RALENTIZADO_EFFECT_HEX = '#fcd34d';
export const EMPUJE_EFFECT_LABEL = 'Empuje';
export const EMPUJE_EFFECT_HEX = '#38bdf8';

export const normalizeTokenStatusIds = (statuses = []) => (
    Array.isArray(statuses)
        ? statuses.filter((statusId) => !NON_STATUS_COMBAT_EFFECT_IDS.has(normalizeCombatTraitId(statusId)))
        : []
);

export const buildAggregateCombatWeapon = (steps = []) => {
    const firstWeapon = steps.find((step) => step?.weapon)?.weapon;
    if (!firstWeapon) return null;

    const mergedTraits = Array.from(new Set(
        steps
            .flatMap((step) => getItemTraits(step?.weapon))
            .filter((traitId) => GLOBAL_PARRY_TRAIT_IDS.has(normalizeCombatTraitId(traitId)))
    ));
    const summaryName = buildParryWeaponSummaryLabel(steps) || firstWeapon?.nombre || firstWeapon?.name || 'Parada';

    return {
        ...firstWeapon,
        nombre: summaryName,
        name: summaryName,
        rasgos: mergedTraits,
        traits: mergedTraits,
        trait: mergedTraits,
        properties: mergedTraits,
    };
};

export const buildAggregateAttackWeapon = (steps = []) => {
    const firstWeapon = steps.find((step) => step?.weapon)?.weapon;
    if (!firstWeapon) return null;

    const mergedTraits = Array.from(new Set(
        steps.flatMap((step) => getItemTraits(step?.weapon))
    ));
    const summaryName = buildParryWeaponSummaryLabel(steps) || firstWeapon?.nombre || firstWeapon?.name || 'Ataque';

    return {
        ...firstWeapon,
        nombre: summaryName,
        name: summaryName,
        rasgos: mergedTraits,
        traits: mergedTraits,
        trait: mergedTraits,
        properties: mergedTraits,
    };
};

export const combineAttackRollResults = (steps = []) => {
    const rollResults = steps.map((step) => step?.rollResult).filter(Boolean);

    return {
        formula: rollResults.map((roll) => roll.formula).filter(Boolean).join(' + '),
        total: rollResults.reduce((sum, roll) => sum + (Number(roll.total) || 0), 0),
        details: rollResults.flatMap((roll, attackIndex) => (
            (roll.details || []).map((detail) => ({
                ...detail,
                rolls: Array.isArray(detail.rolls)
                    ? detail.rolls.map((rollValue) => (
                        typeof rollValue === 'object' && rollValue !== null
                            ? { ...rollValue }
                            : rollValue
                    ))
                    : [],
                attackIndex,
            }))
        )),
    };
};

export const isAttributeCombatTrait = (trait = '') => /(vigor|destreza|intelecto|voluntad)\s*(?:\(x?\d+\))?/i.test(String(trait || ''));

export const buildSweepWeapon = (weapon) => {
    if (!weapon) return null;

    const rawTraits =
        weapon.rasgos ||
        weapon.traits ||
        weapon.trait ||
        weapon.properties ||
        [];

    const traitList = Array.isArray(rawTraits)
        ? rawTraits
        : String(rawTraits || '').split(',');

    const preservedTraits = traitList.filter((trait) => isAttributeCombatTrait(trait));
    const sanitizedWeapon = {
        ...weapon,
        rasgos: preservedTraits,
        traits: preservedTraits,
        trait: preservedTraits,
        properties: preservedTraits,
        manualCombatTraits: [],
        _manualCombatTraits: [],
        sweepSourceWeaponName: weapon?.nombre || weapon?.name || null,
        sweepMode: true,
    };

    if ('extraDamageString' in sanitizedWeapon) {
        delete sanitizedWeapon.extraDamageString;
    }

    return sanitizedWeapon;
};

export const isSweepEligibleWeapon = (weapon) => {
    if (!weapon || weapon.type !== 'weapon') return false;
    const rangeData = getCombatRangeData(weapon);
    return rangeData.value <= 1 && getSpeedConsumption(weapon) >= 2;
};

export const getTokenGridBounds = (token, config = {}) => {
    const cellW = config.cellWidth || 50;
    const cellH = config.cellHeight || 50;
    const gridRect = getGridWorldRect(config);

    return {
        x: Math.round(((token?.x || 0) - gridRect.x) / cellW),
        y: Math.round(((token?.y || 0) - gridRect.y) / cellH),
        w: Math.max(1, Math.round((token?.width || cellW) / cellW)),
        h: Math.max(1, Math.round((token?.height || cellH) / cellH)),
    };
};

export const getTokenOccupiedGridCells = (token, config = {}) => {
    const bounds = getTokenGridBounds(token, config);
    const cells = [];

    for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
        for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
            cells.push({ x, y });
        }
    }

    return cells;
};

export const getTokenPrimaryGridCell = (token, config = {}) => {
    const bounds = getTokenGridBounds(token, config);
    return {
        x: bounds.x,
        y: bounds.y,
    };
};

export const getCellOccupants = (items = [], cell, config = {}, excludeIds = []) => {
    const excluded = new Set(excludeIds);
    return (items || []).filter((item) => {
        if (!isCombatTokenItem(item) || excluded.has(item.id)) return false;
        const occupiedCells = getTokenOccupiedGridCells(item, config);
        return occupiedCells.some((occupiedCell) => occupiedCell.x === cell.x && occupiedCell.y === cell.y);
    });
};

export const getTokenCombatCellContext = (token, items = [], config = {}) => {
    if (!isCombatTokenItem(token)) {
        return { mode: 'solo', cell: null, occupants: [], pairedOccupants: [] };
    }

    const bounds = getTokenGridBounds(token, config);
    if (!canTokenShareCombatCell(token, config) || bounds.w !== 1 || bounds.h !== 1) {
        return { mode: 'solo', cell: getTokenPrimaryGridCell(token, config), occupants: [token], pairedOccupants: [] };
    }

    const cell = getTokenPrimaryGridCell(token, config);
    const occupants = getCellOccupants(items, cell, config);
    const pairedOccupants = occupants.filter((occupant) => occupant.id !== token.id);

    if (pairedOccupants.length === 0) {
        return { mode: 'solo', cell, occupants, pairedOccupants };
    }

    const hasEnemy = pairedOccupants.some((occupant) => !areTokensAllied(token, occupant));
    const mode = hasEnemy ? 'duel' : 'formation';

    return { mode, cell, occupants, pairedOccupants };
};

export const getTokenDuelContextAgainstAttacker = (targetToken, attackerToken, items = [], config = {}) => {
    if (!targetToken || !attackerToken) {
        return { mode: 'solo', cell: null, occupants: [], pairedOccupants: [], isDuelWithAttacker: false };
    }

    const targetContext = getTokenCombatCellContext(targetToken, items, config);
    const attackerInTargetCell = targetContext.pairedOccupants.some((occupant) => occupant.id === attackerToken.id);
    const isDuelWithAttacker =
        targetContext.mode === 'duel' &&
        attackerInTargetCell &&
        !areTokensAllied(targetToken, attackerToken);

    return {
        ...targetContext,
        mode: isDuelWithAttacker ? 'duel' : 'solo',
        isDuelWithAttacker,
    };
};

export const getCombatRenderPlacement = (token, items = [], config = {}) => {
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const width = Number(token?.width) || cellW;
    const height = Number(token?.height) || cellH;
    const bounds = getTokenGridBounds(token, config);
    const cell = getTokenPrimaryGridCell(token, config);
    const cellRect = getGridCellWorldRect(cell, config);
    const occupiesSingleCell = bounds.w === 1 && bounds.h === 1;
    const basePlacement = occupiesSingleCell
        ? {
            x: cellRect.x + ((cellW - width) / 2),
            y: cellRect.y + ((cellH - height) / 2),
        }
        : {
            x: cellRect.x,
            y: cellRect.y,
        };

    if (!canTokenShareCombatCell(token, config) || !occupiesSingleCell) {
        return basePlacement;
    }

    const context = getTokenCombatCellContext(token, items, config);
    if (context.occupants.length !== 2) {
        return basePlacement;
    }

    const orderedOccupants = [...context.occupants].sort((a, b) => {
        const sideA = Array.from(getTokenCombatSideKeys(a)).sort().join('|');
        const sideB = Array.from(getTokenCombatSideKeys(b)).sort().join('|');
        const sideDelta = sideA.localeCompare(sideB);
        if (sideDelta !== 0) return sideDelta;
        return String(a.id).localeCompare(String(b.id));
    });
    const slotIndex = orderedOccupants.findIndex((occupant) => occupant.id === token.id);

    if (slotIndex < 0) {
        return basePlacement;
    }

    return {
        x: cellRect.x + (slotIndex === 0 ? (cellW - width) : 0),
        y: cellRect.y + ((cellH - height) / 2),
    };
};

export const getCombatRenderPlacementAtPosition = (token, position = {}, items = [], config = {}) => {
    if (!isCombatTokenItem(token) || !config?.isCombatActive) {
        return {
            x: Number(position.x) || 0,
            y: Number(position.y) || 0,
        };
    }

    const simulatedToken = {
        ...token,
        x: Number(position.x),
        y: Number(position.y),
    };
    const simulatedItems = (items || []).map((item) => (item.id === token.id ? simulatedToken : item));
    return getCombatRenderPlacement(simulatedToken, simulatedItems, config);
};

export const getCombatCellOccupancyIssue = ({ movingToken, nextX, nextY, items = [], config = {}, excludeIds = [], allowInactiveCombat = false }) => {
    if ((!config?.isCombatActive && !allowInactiveCombat) || !isCombatTokenItem(movingToken)) return null;

    const movedToken = { ...movingToken, x: nextX, y: nextY };
    const movedBounds = getTokenGridBounds(movedToken, config);
    const movedCells = [];
    for (let x = movedBounds.x; x < movedBounds.x + movedBounds.w; x += 1) {
        for (let y = movedBounds.y; y < movedBounds.y + movedBounds.h; y += 1) {
            movedCells.push({ x, y });
        }
    }

    const excluded = new Set([movingToken.id, ...excludeIds]);
    const movingCanShare = canTokenShareCombatCell(movedToken, config) && movedBounds.w === 1 && movedBounds.h === 1;

    for (const cell of movedCells) {
        const occupants = getCellOccupants(items, cell, config, Array.from(excluded));

        if (occupants.length === 0) continue;

        if (occupants.length >= 2) {
            return { cell, reason: 'Casilla ocupada' };
        }

        if (!movingCanShare) {
            return { cell, reason: 'No cabe en duelo' };
        }

        if (occupants.length === 1) {
            const other = occupants[0];
            const otherBounds = getTokenGridBounds(other, config);
            const otherCanShare = canTokenShareCombatCell(other, config) && otherBounds.w === 1 && otherBounds.h === 1;
            if (!otherCanShare) {
                return { cell, reason: 'Ficha grande bloquea' };
            }
        }
    }

    return null;
};

export const canOccupyCombatCell = (params) => !getCombatCellOccupancyIssue(params);

export const MOBILE_TACTICAL_MOVE_RANGE = 2;

export const getCombatGridCenter = (token, config = {}) => {
    const bounds = getTokenGridBounds(token, config);
    return {
        x: bounds.x + ((bounds.w - 1) / 2),
        y: bounds.y + ((bounds.h - 1) / 2),
    };
};

export const getWorldCenter = (token) => ({
    x: (Number(token?.x) || 0) + ((Number(token?.width) || 0) / 2),
    y: (Number(token?.y) || 0) + ((Number(token?.height) || 0) / 2),
});

export const getPlacementCenter = (token, placement = {}) => ({
    x: (Number(placement?.x) || 0) + ((Number(token?.width) || 0) / 2),
    y: (Number(placement?.y) || 0) + ((Number(token?.height) || 0) / 2),
});

export const getCombatTokenPositionForPrimaryCell = (token, cell, config = {}) => {
    const cellRect = getGridCellWorldRect(cell, config);
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const width = Number(token?.width) || cellW;
    const height = Number(token?.height) || cellH;
    const bounds = getTokenGridBounds(token, config);
    const occupiesSingleCell = bounds.w === 1 && bounds.h === 1;

    return occupiesSingleCell
        ? {
            x: cellRect.x + ((cellW - width) / 2),
            y: cellRect.y + ((cellH - height) / 2),
        }
        : {
            x: cellRect.x,
            y: cellRect.y,
        };
};

export const getTokenOccupiedCellsAtPosition = (token, position = {}, config = {}) => (
    getTokenOccupiedGridCells({
        ...token,
        x: Number(position?.x) || 0,
        y: Number(position?.y) || 0,
    }, config)
);

export const isCombatMoveBlockedByWall = (token, nextPosition, items = [], config = {}) => {
    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const tokenWidth = Number(token?.width) || cellW;
    const tokenHeight = Number(token?.height) || cellH;
    const startCenter = {
        x: (Number(token?.x) || 0) + (tokenWidth / 2),
        y: (Number(token?.y) || 0) + (tokenHeight / 2),
    };
    const endCenter = {
        x: (Number(nextPosition?.x) || 0) + (tokenWidth / 2),
        y: (Number(nextPosition?.y) || 0) + (tokenHeight / 2),
    };

    return (items || [])
        .filter(item => item.type === 'wall' && !(item.wallType === 'door' && item.isOpen))
        .some(wall => (
            linesIntersect(startCenter.x, startCenter.y, endCenter.x, endCenter.y, wall.x1, wall.y1, wall.x2, wall.y2) ||
            lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2, nextPosition.x + 2, nextPosition.y + 2, tokenWidth - 4, tokenHeight - 4)
        ));
};

export const getMobileTacticalMoveOptions = (token, items = [], config = {}, range = MOBILE_TACTICAL_MOVE_RANGE, options = {}) => {
    const {
        requireCombatActive = true,
        validateOccupancy = true,
        validateWalls = true,
        allowInactiveOccupancy = false,
    } = options || {};

    if ((requireCombatActive && !config?.isCombatActive) || !isMobileTacticalMoveToken(token)) return [];

    const originCell = getTokenPrimaryGridCell(token, config);
    const moveOptions = [];

    for (let dx = -range; dx <= range; dx += 1) {
        for (let dy = -range; dy <= range; dy += 1) {
            const cost = Math.max(Math.abs(dx), Math.abs(dy));
            if (cost <= 0 || cost > range) continue;

            const cell = { x: originCell.x + dx, y: originCell.y + dy };
            if (!isGridCellInsideBounds(cell, config)) continue;

            const nextPosition = getCombatTokenPositionForPrimaryCell(token, cell, config);
            const occupiedCells = getTokenOccupiedCellsAtPosition(token, nextPosition, config);
            if (occupiedCells.some((occupiedCell) => !isGridCellInsideBounds(occupiedCell, config))) continue;

            if (validateOccupancy && !canOccupyCombatCell({
                movingToken: token,
                nextX: nextPosition.x,
                nextY: nextPosition.y,
                items,
                config,
                excludeIds: [token.id],
                allowInactiveCombat: allowInactiveOccupancy,
            })) {
                continue;
            }

            if (validateWalls && isCombatMoveBlockedByWall(token, nextPosition, items, config)) continue;

            moveOptions.push({ cell, cost, nextPosition, occupiedCells });
        }
    }

    return moveOptions.sort((a, b) => a.cost - b.cost || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
};

export const getEmpujeDirection = (sourceToken, pushedToken, config = {}, items = []) => {
    if (!sourceToken || !pushedToken) return null;

    const sourceCenter = getCombatGridCenter(sourceToken, config);
    const pushedCenter = getCombatGridCenter(pushedToken, config);
    let dx = Math.sign(pushedCenter.x - sourceCenter.x);
    let dy = Math.sign(pushedCenter.y - sourceCenter.y);

    if (dx === 0 && dy === 0) {
        const sourceWorld = getWorldCenter(sourceToken);
        const pushedWorld = getWorldCenter(pushedToken);
        dx = Math.sign(pushedWorld.x - sourceWorld.x);
        dy = Math.sign(pushedWorld.y - sourceWorld.y);
    }

    if (dx === 0 && dy === 0 && Array.isArray(items) && items.length > 0) {
        const sourcePlacement = getPlacementCenter(sourceToken, getCombatRenderPlacement(sourceToken, items, config));
        const pushedPlacement = getPlacementCenter(pushedToken, getCombatRenderPlacement(pushedToken, items, config));
        dx = Math.sign(pushedPlacement.x - sourcePlacement.x);
        dy = Math.sign(pushedPlacement.y - sourcePlacement.y);
    }

    if (dx === 0 && dy === 0) return null;
    return { dx, dy };
};

export const resolveEmpujeMovement = ({ sourceToken, pushedToken, items = [], config = {} }) => {
    if (!sourceToken || !pushedToken || !isCombatTokenItem(pushedToken)) {
        return { applied: false, reason: 'Objetivo inválido' };
    }

    const direction = getEmpujeDirection(sourceToken, pushedToken, config, items);
    if (!direction) {
        return { applied: false, reason: 'Sin dirección clara' };
    }

    const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const nextX = roundGridValue((Number(pushedToken.x) || 0) + (direction.dx * cellW));
    const nextY = roundGridValue((Number(pushedToken.y) || 0) + (direction.dy * cellH));
    const movedToken = { ...pushedToken, x: nextX, y: nextY };
    const movedCells = getTokenOccupiedGridCells(movedToken, config);

    if (movedCells.some((cell) => !isGridCellInsideBounds(cell, config))) {
        return { applied: false, reason: 'Borde del mapa', direction };
    }

    const occupancyIssue = getCombatCellOccupancyIssue({
        movingToken: pushedToken,
        nextX,
        nextY,
        items,
        config,
    });

    if (occupancyIssue) {
        return { applied: false, reason: occupancyIssue.reason || 'Casilla bloqueada', direction };
    }

    const walls = (items || []).filter((item) => item.type === 'wall' && !(item.wallType === 'door' && item.isOpen));
    const startCenter = getWorldCenter(pushedToken);
    const endCenter = getWorldCenter(movedToken);
    const pathBlocked = walls.some((wall) =>
        linesIntersect(startCenter.x, startCenter.y, endCenter.x, endCenter.y, wall.x1, wall.y1, wall.x2, wall.y2)
    );
    const overlapBlocked = walls.some((wall) =>
        lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2, nextX + 2, nextY + 2, (pushedToken.width || cellW) - 4, (pushedToken.height || cellH) - 4)
    );

    if (pathBlocked || overlapBlocked) {
        return { applied: false, reason: 'Muro bloquea', direction };
    }

    const fromCell = getTokenPrimaryGridCell(pushedToken, config);
    const toCell = getTokenPrimaryGridCell(movedToken, config);
    const destinationOccupants = getCellOccupants(items, toCell, config, [pushedToken.id]);
    const sharedMode = destinationOccupants.length === 1
        ? (areTokensAllied(pushedToken, destinationOccupants[0]) ? 'formacion' : 'duelo')
        : null;

    return {
        applied: true,
        x: nextX,
        y: nextY,
        fromCell,
        toCell,
        direction,
        sharedMode,
        sharedWith: destinationOccupants.map((occupant) => ({
            id: occupant.id,
            name: occupant.name || 'Token',
        })),
    };
};

export const areCombatOccupancyFeedbacksEqual = (a, b) => (
    (a?.tokenId || null) === (b?.tokenId || null) &&
    (a?.reason || null) === (b?.reason || null) &&
    (a?.cell?.x ?? null) === (b?.cell?.x ?? null) &&
    (a?.cell?.y ?? null) === (b?.cell?.y ?? null) &&
    (a?.targetX ?? null) === (b?.targetX ?? null) &&
    (a?.targetY ?? null) === (b?.targetY ?? null)
);

export const getCombatOccupancyFeedbackForMove = ({ tokenId, movingToken, nextX, nextY, items = [], config = {}, excludeIds = [] }) => {
    const issue = getCombatCellOccupancyIssue({ movingToken, nextX, nextY, items, config, excludeIds });
    if (!issue) return null;

    return {
        tokenId,
        cell: issue.cell,
        reason: issue.reason,
        targetX: nextX,
        targetY: nextY,
    };
};

export const isGridCellInsideBounds = (cell, config = {}) => {
    if (config.isInfinite) return true;
    const columns = Math.max(1, Math.round(Number(config.columns) || 1));
    const rows = Math.max(1, Math.round(Number(config.rows) || 1));
    return cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows;
};

export const getSweepAreaCells = (token, side, config = {}) => {
    if (!token || !side) return [];

    const bounds = getTokenGridBounds(token, config);
    const centerX = Math.round(bounds.x + ((bounds.w - 1) / 2));
    const centerY = Math.round(bounds.y + ((bounds.h - 1) / 2));

    let cells = [];

    if (side === 'north' || side === 'south') {
        const rowY = side === 'north' ? bounds.y - 1 : bounds.y + bounds.h;
        const startX = centerX - 1;
        cells = Array.from({ length: 3 }, (_, index) => ({
            x: startX + index,
            y: rowY
        }));
    } else if (side === 'west' || side === 'east') {
        const colX = side === 'west' ? bounds.x - 1 : bounds.x + bounds.w;
        const startY = centerY - 1;
        cells = Array.from({ length: 3 }, (_, index) => ({
            x: colX,
            y: startY + index
        }));
    }

    return cells.filter((cell) => isGridCellInsideBounds(cell, config));
};

export const getGridCellWorldRect = (cell, config = {}) => {
    const cellW = config.cellWidth || 50;
    const cellH = config.cellHeight || 50;
    const gridRect = getGridWorldRect(config);
    return {
        x: gridRect.x + (cell.x * cellW),
        y: gridRect.y + (cell.y * cellH),
        width: cellW,
        height: cellH,
    };
};

export const getSweepTargetsForCells = (items = [], attackerId, cells = [], config = {}) => {
    if (!Array.isArray(items) || cells.length === 0) return [];

    const cellKeys = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
    const attacker = items.find((item) => item?.id === attackerId) || null;

    return items.filter((item) => {
        if (!item || item.id === attackerId) return false;
        if (item.type === 'light' || item.type === 'wall' || item.type === 'geometry') return false;
        if (!(item.isCircular || item.stats || item.name)) return false;
        if (attacker && areTokensAllied(attacker, item)) return false;

        const bounds = getTokenGridBounds(item, config);
        for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
            for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
                if (cellKeys.has(`${x}:${y}`)) {
                    return true;
                }
            }
        }

        return false;
    });
};

export const CombatTraitLine = ({ label, traits = [], accent = 'slate' }) => {
    if (!Array.isArray(traits) || traits.length === 0) return null;
    void label;
    void accent;

    return (
        <div className="flex items-center gap-2">
            <div className="w-3 h-[1px] bg-slate-800 shrink-0" />
            <span className="text-[9px] text-slate-500 italic tracking-wider">
                {traits.map((trait) => formatCombatTraitLabel(trait)).join(' · ')}
            </span>
        </div>
    );
};
