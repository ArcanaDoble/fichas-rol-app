import React, { useState, useMemo, useEffect } from 'react';
import { Shield, FastForward, Sword, Swords, Zap, X, Check } from 'lucide-react';
import { getCombatTraitIds, getSpeedConsumption, hasCombatTrait, hasManualCombatTrait, hasNativeCombatTrait, rollAttack } from '../utils/combatSystem';
import CombatModifiersPanel, { applyModifiersToWeapon } from './CombatModifiersPanel';
import DiceSvg from './DiceSvg';
import { useCustomEquipmentImages, getCustomImage } from '../hooks/useCustomEquipmentImages';
import { DEFAULT_STATUS_EFFECTS, PRONE_STATUS_IDS } from '../utils/statusEffects';

const normalizeKey = (name) => (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
const getCombatWeaponName = (weapon) => String(weapon?.nombre || weapon?.name || '').trim().toLowerCase();
const getEventReactionBudget = (event) => {
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

const buildLegacyParrySteps = (reactionData) => {
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
const formatCombatTraitLabel = (trait = '') => {
    const normalized = trait.toString().trim().toLowerCase();
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
    return trait;
};

const createEmptyCombatModifiers = () => ({ extraDice: {}, activeTraits: [] });

const cloneCombatModifiers = (modifiers = {}) => ({
    extraDice: Object.fromEntries(
        Object.entries(modifiers.extraDice || {})
            .map(([die, count]) => [die, Math.max(0, Number(count) || 0)])
            .filter(([, count]) => count > 0)
    ),
    activeTraits: Array.isArray(modifiers.activeTraits)
        ? Array.from(new Set(modifiers.activeTraits.filter(Boolean)))
        : [],
});

const hasCombatModifiers = (modifiers = {}) => (
    Object.values(modifiers.extraDice || {}).some((count) => Number(count) > 0) ||
    (Array.isArray(modifiers.activeTraits) && modifiers.activeTraits.length > 0)
);

const summarizeCombatModifiers = (modifiers = {}) => {
    const normalizedModifiers = cloneCombatModifiers(modifiers);
    return [
        ...Object.entries(normalizedModifiers.extraDice).map(([die, count]) => `+${count}${die}`),
        ...normalizedModifiers.activeTraits.map((trait) => formatCombatTraitLabel(trait)),
    ];
};

const getParryBaseWeapon = (step) => step?.baseWeapon || step?.weapon || null;

const shouldApplyModifiersToStep = (step, scope, selectedBaseWeapon) => {
    if (!step || scope === 'single') return false;
    if (scope === 'all') return true;
    if (scope !== 'sameWeapon') return false;

    return getCombatWeaponName(getParryBaseWeapon(step)) === getCombatWeaponName(selectedBaseWeapon);
};

const applyParryModifiersToStep = (step, modifiers) => {
    const baseWeapon = JSON.parse(JSON.stringify(getParryBaseWeapon(step) || {}));
    const cleanModifiers = cloneCombatModifiers(modifiers);
    const weapon = applyModifiersToWeapon(baseWeapon, cleanModifiers);
    return {
        ...step,
        baseWeapon,
        weapon,
        weaponName: weapon?.nombre || weapon?.name || step.weaponName || 'Arma',
        modifiers: cleanModifiers,
    };
};

const MODIFIER_SCOPE_OPTIONS = [
    { id: 'single', label: 'Esta', helper: 'Se limpia al añadir la parada.' },
    { id: 'all', label: 'Todas', helper: 'Actualiza las paradas añadidas y mantiene el borrador.' },
    { id: 'sameWeapon', label: 'Mismo arma', helper: 'Actualiza solo las paradas añadidas con esta arma.' },
];

const getArmorProtectionMeta = (payload) => ({
    traits: payload?.negatedTraits || payload?.blockedTraits || [],
    source: payload?.armorProtectionSource || null,
});

const ArmorProtectionBanner = ({ source, traits = [] }) => {
    if (!traits.length) return null;

    return (
        <div className="border-y border-slate-800/70 bg-black/10 px-2 py-2 text-center">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#c8aa6e] font-bold">
                Armadura activa
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {source ? <span className="font-semibold text-[#f0e6d2]">{source}</span> : 'La armadura equipada'} anula{' '}
                <span className="font-semibold text-[#f0e6d2]">{traits.map((trait) => formatCombatTraitLabel(trait)).join(', ')}</span>
            </p>
        </div>
    );
};

const ProneDefenseBanner = ({ statusLabel = 'Derribado', standUpCost = 1 }) => (
    <div className="border-y border-slate-800/70 bg-black/10 px-2 py-2 text-center">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#c8aa6e] font-bold">
            {statusLabel}
        </p>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Estás {statusLabel.toLowerCase()} y no puedes evadir ni parar. Solo puedes recibir el golpe.
            {standUpCost > 1 ? ` Levantarte costará ${standUpCost} de velocidad.` : ''}
        </p>
    </div>
);

const DuelDefenseBanner = ({ canEvade = false }) => (
    <div className="border-y border-slate-800/70 bg-black/10 px-2 py-2 text-center">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#c8aa6e] font-bold">
            Duelo
        </p>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {canEvade
                ? <>Estás en duelo, pero puedes evadir por ser <strong className="font-semibold text-[#f0e6d2]">pequeño</strong>.</>
                : 'Estás en duelo y no puedes evadir. Solo puedes parar o recibir el golpe.'}
        </p>
    </div>
);

const CombatTraitRow = ({ label, traits = [], accent = 'slate' }) => {
    if (!Array.isArray(traits) || traits.length === 0) return null;

    const accentStyles = {
        slate: {
            label: 'text-slate-500/80',
            pill: 'border-slate-700/80 bg-slate-900/50 text-slate-300',
        },
        red: {
            label: 'text-red-400/70',
            pill: 'border-red-900/50 bg-red-950/30 text-red-200/90',
        },
        blue: {
            label: 'text-blue-400/70',
            pill: 'border-blue-900/50 bg-blue-950/30 text-blue-200/90',
        },
    };

    const palette = accentStyles[accent] || accentStyles.slate;

    return (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {label && (
                <span className={`text-[8px] uppercase tracking-[0.22em] font-bold ${palette.label}`}>
                    {label}
                </span>
            )}
            {traits.map((trait, index) => (
                <span
                    key={`${label || 'trait'}-${trait}-${index}`}
                    className={`rounded border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] ${palette.pill}`}
                >
                    {formatCombatTraitLabel(trait)}
                </span>
            ))}
        </div>
    );
};

const CombatReactionModal = ({ event, targetToken, targetCombatMode = 'solo', targetCanEvadeInDuel = false, onReact, onSelectQueueIndex, queueTotal = 1, queueResolved = 0, queueCurrent = 0 }) => {
    const customEquipmentImages = useCustomEquipmentImages();
    const [selectedDiceIndices, setSelectedDiceIndices] = useState([]);
    const [reactionType, setReactionType] = useState(null); // 'evadir', 'parar', 'recibir'
    const [selectedWeapon, setSelectedWeapon] = useState('');
    const [parrySteps, setParrySteps] = useState([]);
    const [customModifiers, setCustomModifiers] = useState(createEmptyCombatModifiers);
    const [modifierScope, setModifierScope] = useState('single');
    const [modifiersExpanded, setModifiersExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const proneStatusId = useMemo(() => {
        const statuses = Array.isArray(targetToken?.status) ? targetToken.status : [];
        return PRONE_STATUS_IDS.find((statusId) => statuses.includes(statusId)) || null;
    }, [targetToken]);
    const isTargetProne = useMemo(() => {
        return !!proneStatusId;
    }, [proneStatusId]);
    const reactionBudget = useMemo(() => getEventReactionBudget(event), [event]);
    const proneStatusLabel = DEFAULT_STATUS_EFFECTS[proneStatusId]?.label || 'Derribado';
    const standUpCost = proneStatusId === 'conmocionado' ? 2 : 1;
    const isTargetInDuel = targetCombatMode === 'duel';
    const isDuelEvadeBlocked = isTargetInDuel && !targetCanEvadeInDuel;
    const attackHasDistancia = useMemo(() => (
        getCombatTraitIds(event?.weapon).includes('distancia')
    ), [event?.weapon]);

    // Extraer dados del atacante (manteniendo individualidad de los críticos)
    const attackerDice = useMemo(() => {
        if (!event?.attackerRollResult?.details) return [];
        const dice = [];
        event.attackerRollResult.details.forEach((detail, detailIdx) => {
            if (detail.type === 'dice') {
                const match = detail.formula?.match(/d(\d+)/i);
                const faces = match ? parseInt(match[1]) : 20;

                detail.rolls.forEach((r, idx) => {
                    const isCrit = typeof r === 'object' && r.critical;
                    dice.push({
                        value: typeof r === 'object' ? r.value : r,
                        matchedAttr: detail.matchedAttr || null,
                        detailIdx,
                        rollIdx: idx,
                        isCrit,
                        id: `${detailIdx}-${idx}`,
                        faces
                    });
                });
            } else if (detail.matchedAttr && (detail.type === 'calc' || detail.type === 'modifier')) {
                // Attribute dice that arrived as calc/modifier (legacy "d6" → 6 issue)
                dice.push({
                    value: detail.value || detail.total || 0,
                    matchedAttr: detail.matchedAttr,
                    detailIdx,
                    rollIdx: 0,
                    isCrit: false,
                    id: `${detailIdx}-0`,
                    faces: 6
                });
            }
        });

        // Ordenar: 1º Arma Base, 2º Críticos, 3º Atributos
        return dice.sort((a, b) => {
            const rankA = a.isCrit ? 1 : a.matchedAttr ? 2 : 0;
            const rankB = b.isCrit ? 1 : b.matchedAttr ? 2 : 0;
            return rankA - rankB;
        });
    }, [event]);

    const canReactWithBudget = reactionBudget > 0 && !isTargetProne;
    const canEvade = canReactWithBudget && !isDuelEvadeBlocked;
    const canParryByBudget = canReactWithBudget;

    const weapons = useMemo(() => {
        return (targetToken?.equippedItems || []).filter(i => i.type === 'weapon');
    }, [targetToken]);

    const getWeaponId = (w, idx) => `${w.nombre || w.name || 'Arma'}-${idx}`;
    const getParryWeaponCostMeta = (weapon, sourceWeapon = weapon) => {
        if (!weapon) {
            return {
                baseCost: 0,
                yellowCost: 0,
                hasFluidaTrait: false,
                fluidaDiscountApplied: false
            };
        }

        const baseCost = Math.max(1, getSpeedConsumption(sourceWeapon || weapon));
        const hasNativeFluidaTrait = hasNativeCombatTrait(weapon, 'fluida');
        const hasManualFluidaTrait = !hasNativeFluidaTrait && hasManualCombatTrait(weapon, 'fluida');
        const weaponName = getCombatWeaponName(sourceWeapon || weapon);
        const canApplyAutomaticFluidaDiscount =
            hasNativeFluidaTrait &&
            targetToken?.fluidaState?.targetId &&
            targetToken.fluidaState.targetId === event?.attackerId &&
            targetToken?.fluidaState?.weaponName &&
            targetToken.fluidaState.weaponName === weaponName &&
            baseCost > 1;
        const canApplyManualFluidaDiscount = hasManualFluidaTrait && baseCost > 1;
        const canApplyFluidaDiscount = canApplyAutomaticFluidaDiscount || canApplyManualFluidaDiscount;

        return {
            baseCost,
            yellowCost: canApplyFluidaDiscount ? Math.max(1, baseCost - 1) : baseCost,
            hasFluidaTrait: hasNativeFluidaTrait || hasManualFluidaTrait,
            fluidaDiscountApplied: canApplyFluidaDiscount
        };
    };

    const selectedWeaponData = useMemo(() => {
        return weapons.find((weapon, idx) => getWeaponId(weapon, idx) === selectedWeapon) || null;
    }, [weapons, selectedWeapon]);

    const modifiedParryWeapon = useMemo(() => {
        if (!selectedWeaponData) return null;
        return applyModifiersToWeapon(selectedWeaponData, customModifiers);
    }, [selectedWeaponData, customModifiers]);

    const selectedWeaponBlockedByNoGuard = useMemo(() => {
        if (!modifiedParryWeapon) return false;
        return hasCombatTrait(modifiedParryWeapon, 'sin guardia');
    }, [modifiedParryWeapon]);
    const selectedWeaponBlockedByDistance = useMemo(() => {
        if (!attackHasDistancia || !modifiedParryWeapon) return false;
        return !hasCombatTrait(modifiedParryWeapon, 'bloqueo');
    }, [attackHasDistancia, modifiedParryWeapon]);

    const parryCostMeta = useMemo(() => {
        if (!modifiedParryWeapon) {
            return {
                baseCost: 0,
                yellowCost: 0,
                hasFluidaTrait: false,
                fluidaDiscountApplied: false
            };
        }

        return getParryWeaponCostMeta(modifiedParryWeapon, selectedWeaponData || modifiedParryWeapon);
    }, [modifiedParryWeapon, selectedWeaponData, targetToken, event]);

    const totalParryCost = useMemo(() => (
        parrySteps.reduce((sum, step) => sum + Math.max(0, Number(step.yellowCost) || 0), 0)
    ), [parrySteps]);
    const evadeCost = selectedDiceIndices.length;
    const currentReactionCost = totalParryCost + evadeCost;
    const remainingReactionBudget = Math.max(0, reactionBudget - currentReactionCost);
    const maxEvadeDice = Math.max(0, reactionBudget - totalParryCost);

    const weaponSelectionMeta = useMemo(() => {
        return weapons.map((weapon, idx) => {
            const costMeta = getParryWeaponCostMeta(weapon, weapon);
            const blockedByNoGuard = hasCombatTrait(weapon, 'sin guardia');
            const blockedByBudget = costMeta.yellowCost > remainingReactionBudget;
            const needsBloqueoForDistance = attackHasDistancia && !hasCombatTrait(weapon, 'bloqueo');

            return {
                id: getWeaponId(weapon, idx),
                weapon,
                blockedByNoGuard,
                blockedByBudget,
                needsBloqueoForDistance,
                costMeta,
            };
        });
    }, [weapons, targetToken, event, remainingReactionBudget, attackHasDistancia]);

    const defaultParryWeaponId = useMemo(() => {
        return weaponSelectionMeta.find((entry) => !entry.blockedByNoGuard && !entry.blockedByBudget)?.id || '';
    }, [weaponSelectionMeta]);

    const hasAnyParryWeapon = weaponSelectionMeta.some((entry) => !entry.blockedByNoGuard);
    const canParry = canParryByBudget && hasAnyParryWeapon;

    const canAddCurrentParryStep =
        reactionType === 'parar' &&
        !!modifiedParryWeapon &&
        !selectedWeaponBlockedByNoGuard &&
        !selectedWeaponBlockedByDistance &&
        parryCostMeta.yellowCost > 0 &&
        parryCostMeta.yellowCost <= remainingReactionBudget;
    const hasCurrentModifiers = hasCombatModifiers(customModifiers);
    const currentModifierSummary = useMemo(() => summarizeCombatModifiers(customModifiers), [customModifiers]);

    const toggleDie = (dieId) => {
        setSelectedDiceIndices(prev => {
            if (prev.includes(dieId)) {
                return prev.filter(id => id !== dieId);
            }
            if (prev.length >= maxEvadeDice) {
                return prev;
            }
            return [...prev, dieId];
        });
    };

    useEffect(() => {
        setIsSubmitting(false);
    }, [event?.id, event?.status]);

    useEffect(() => {
        setSelectedDiceIndices([]);
        setSelectedWeapon('');
        setParrySteps([]);
        setCustomModifiers(createEmptyCombatModifiers());
        setModifierScope('single');
        setModifiersExpanded(false);
        setReactionType(isTargetProne ? 'recibir' : null);
    }, [event?.id, event?.status, isTargetProne]);

    useEffect(() => {
        if (reactionType === 'evadir' && !canEvade) {
            setReactionType(null);
            setSelectedDiceIndices([]);
        }
        if (reactionType === 'parar' && !canParry) {
            setReactionType(null);
            setSelectedWeapon('');
            setParrySteps([]);
        }
    }, [reactionType, canEvade, canParry]);

    useEffect(() => {
        if (reactionType !== 'parar') return;
        const selectedEntry = weaponSelectionMeta.find((entry) => entry.id === selectedWeapon);
        if (selectedEntry && (selectedEntry.blockedByNoGuard || selectedEntry.blockedByBudget)) {
            setSelectedWeapon(defaultParryWeaponId || '');
            return;
        }
        if (!selectedWeapon && defaultParryWeaponId) {
            setSelectedWeapon(defaultParryWeaponId);
        }
    }, [reactionType, selectedWeapon, defaultParryWeaponId, weaponSelectionMeta]);

    useEffect(() => {
        if (selectedDiceIndices.length > maxEvadeDice) {
            setSelectedDiceIndices(prev => prev.slice(0, maxEvadeDice));
        }
    }, [selectedDiceIndices.length, maxEvadeDice]);

    const handleAddParryStep = () => {
        if (!canAddCurrentParryStep || !modifiedParryWeapon) return;

        const selectedBaseWeapon = JSON.parse(JSON.stringify(selectedWeaponData || modifiedParryWeapon));
        const stepModifiers = cloneCombatModifiers(customModifiers);
        const stepWeapon = JSON.parse(JSON.stringify(applyModifiersToWeapon(selectedBaseWeapon, stepModifiers)));
        const nextStep = {
            id: `parry-step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            weapon: stepWeapon,
            baseWeapon: selectedBaseWeapon,
            modifiers: stepModifiers,
            weaponName: stepWeapon?.nombre || stepWeapon?.name || selectedWeaponData?.nombre || selectedWeaponData?.name || 'Arma',
            yellowCost: parryCostMeta.yellowCost,
            baseYellowCost: parryCostMeta.baseCost,
            fluidaDiscountApplied: parryCostMeta.fluidaDiscountApplied
        };

        setParrySteps(prev => {
            const shouldUpdateExisting = hasCombatModifiers(stepModifiers) && modifierScope !== 'single';
            const updatedPrev = shouldUpdateExisting
                ? prev.map((step) => {
                    if (!shouldApplyModifiersToStep(step, modifierScope, selectedBaseWeapon)) {
                        return step;
                    }
                    const updatedStep = applyParryModifiersToStep(step, stepModifiers);
                    const updatedCostMeta = getParryWeaponCostMeta(updatedStep.weapon, updatedStep.baseWeapon || updatedStep.weapon);
                    return {
                        ...updatedStep,
                        yellowCost: updatedCostMeta.yellowCost,
                        baseYellowCost: updatedCostMeta.baseCost,
                        fluidaDiscountApplied: updatedCostMeta.fluidaDiscountApplied
                    };
                })
                : prev;
            return [...updatedPrev, nextStep];
        });

        if (modifierScope === 'single') {
            setCustomModifiers(createEmptyCombatModifiers());
            setModifiersExpanded(false);
        }
    };

    const removeParryStep = (stepId) => {
        setParrySteps(prev => prev.filter((step) => step.id !== stepId));
    };

    const handleSelectParryWeapon = (weaponId) => {
        setSelectedWeapon(weaponId);
        if (modifierScope === 'single') {
            setCustomModifiers(createEmptyCombatModifiers());
            setModifiersExpanded(false);
        }
    };

    const handleConfirm = async () => {
        if (isSubmitting) return;

        let payload;
        if (reactionType === 'recibir') {
            payload = { type: 'recibir', data: null };
        } else if (totalParryCost > 0) {
            if (!canParryByBudget) return;
            if (parrySteps.length === 0) return;
            payload = {
                type: 'parar',
                data: {
                    weapon: parrySteps[0]?.weapon || null,
                    parrySteps,
                    evadedDiceIds: selectedDiceIndices,
                    yellowCost: currentReactionCost,
                    parryCost: totalParryCost,
                    evadeCost,
                    reactionBudget
                }
            };
        } else if (selectedDiceIndices.length > 0) {
            if (!canEvade) return;
            payload = { type: 'evadir', data: { evadedDiceIds: selectedDiceIndices, yellowCost: evadeCost } };
        } else {
            return;
        }

        setIsSubmitting(true);
        try {
            await Promise.resolve(onReact(payload));
        } catch (error) {
            setIsSubmitting(false);
            throw error;
        }
    };

    const handleCloseResolved = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await Promise.resolve(onReact({ type: 'cerrar' }));
        } catch (error) {
            setIsSubmitting(false);
            throw error;
        }
    };

    if (!event) return null;

    const showQueue = queueTotal > 1;
    const isResolving = event.status && event.status.endsWith('_pendiente');
    const isResolved = event.status === 'resuelto';
    const hasDefenseActions = selectedDiceIndices.length > 0 || parrySteps.length > 0;
    const canConfirmReaction = reactionType === 'recibir' || hasDefenseActions;
    const pendingProtection = getArmorProtectionMeta(event);
    const resolvedProtection = getArmorProtectionMeta(event.result);
    const attackLabel = event.attackMode === 'barrido'
        ? `${event.abilityName || 'Barrido'}${event.sweepMeta?.sourceWeaponName ? ` con ${event.sweepMeta.sourceWeaponName}` : ''}`
        : (event.weapon?.nombre || event.weapon?.name || 'su arma');
    const attackSequence = Array.isArray(event?.attackSequence) ? event.attackSequence : [];
    const resolvedParrySteps = Array.isArray(event?.result?.defenderSteps) && event.result.defenderSteps.length > 0
        ? event.result.defenderSteps
        : buildLegacyParrySteps(event?.result);
    const renderResultDice = (diceList, evadedIds = [], eludedIds = []) => {
        if (!diceList || diceList.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 justify-center my-3 relative z-10">
                {diceList.map((die) => {
                    const rawDieId = typeof die.id === 'string' ? die.id : '';
                    const unprefixedDieId = rawDieId.startsWith('att-') || rawDieId.startsWith('atk-') || rawDieId.startsWith('roll-')
                        ? rawDieId.replace(/^[^-]+-/, '')
                        : rawDieId;
                    const isEvaded = evadedIds.includes(rawDieId) || evadedIds.includes(unprefixedDieId);
                    const isEluded = !!die.eludedByElusion
                        || !!die.elusionRemoved
                        || eludedIds.includes(rawDieId)
                        || eludedIds.includes(unprefixedDieId);
                    const isRemoved = isEvaded || isEluded;
                    const isCrit = die.isCrit || die.critical;
                    const matchedAttr = die.matchedAttr ? die.matchedAttr.trim().toLowerCase() : null;

                    const attrColorMap = {
                        destreza: { color: '#4ade80' },
                        intelecto: { color: '#60a5fa' },
                        voluntad: { color: '#c084fc' },
                        vigor: { color: '#f87171' },
                    };
                    const attrStyle = (matchedAttr && attrColorMap[matchedAttr]) ? attrColorMap[matchedAttr] : null;

                    const baseStyle = isCrit ? {
                        backgroundColor: 'rgba(234, 88, 12, 0.15)',
                        borderColor: '#ea580c',
                        color: '#ea580c',
                        boxShadow: '0 0 10px rgba(234,88,12,0.3)',
                    } : attrStyle ? {
                        backgroundColor: 'transparent',
                        borderColor: attrStyle.color,
                        color: attrStyle.color,
                        boxShadow: 'none',
                    } : {
                        backgroundColor: '#c8aa6e',
                        borderColor: '#f0e6d2',
                        color: '#0b1120',
                    };

                    return (
                        <div key={die.id} className={`relative transition-all duration-300 ${isRemoved ? 'opacity-40 grayscale scale-95' : 'hover:scale-110'}`}>
                            <DiceSvg
                                faces={die.faces}
                                value={die.value}
                                className="w-8 h-8 md:w-10 md:h-10"
                                style={baseStyle}
                                title={isEluded ? `Dado retirado por Elusión (${die.value})` : isCrit ? "Dado Crítico" : matchedAttr ? `Dado de ${matchedAttr}` : "Dado Arma"}
                            />
                            {isCrit && <span className="absolute -top-2 -right-2 text-[#ea580c] text-[8px] font-sans font-bold bg-black/80 px-1 rounded border border-[#ea580c]/50 z-20">CRIT</span>}
                            {isRemoved && (
                                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                    <div className={`w-[120%] h-0.5 ${isEluded ? 'bg-cyan-300 shadow-[0_0_5px_rgba(103,232,249,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'} rotate-45 absolute`}></div>
                                    <div className={`w-[120%] h-0.5 ${isEluded ? 'bg-cyan-300 shadow-[0_0_5px_rgba(103,232,249,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'} -rotate-45 absolute`}></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-stretch justify-center overflow-y-auto p-2 sm:items-center sm:p-4">
            <div
                data-testid="combat-reaction-modal-card"
                className="bg-[#1a1b26] border-2 border-red-900/50 rounded-lg p-4 sm:p-6 max-w-lg w-full shadow-2xl shadow-red-900/20 relative overflow-hidden my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] flex flex-col"
            >
                {/* Fondo decorativo */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-1 min-h-0 flex-col">

                    {/* === COLA DE ATAQUES (Progress Tracker) === */}
                    {showQueue && (
                        <div className="mb-4 pb-4 border-b border-red-900/30 shrink-0">
                            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold text-center mb-2.5">
                                Ataques Pendientes — {queueCurrent + 1} de {queueTotal}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {Array.from({ length: queueTotal }, (_, i) => {
                                    const isCurrent = i === queueCurrent;
                                    const isMarkerResolved = i < queueResolved || (isCurrent && isResolved);
                                    const canSelect = !isMarkerResolved && typeof onSelectQueueIndex === 'function';

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                if (canSelect) onSelectQueueIndex(i - queueResolved);
                                            }}
                                            disabled={!canSelect}
                                            className={`
                                                w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300
                                                ${isMarkerResolved
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                                    : isCurrent
                                                        ? 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse'
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-600'
                                                }
                                                ${canSelect ? 'cursor-pointer hover:border-[#c8aa6e] hover:text-[#c8aa6e]' : 'cursor-default'}
                                            `}
                                            title={isMarkerResolved ? `Ataque ${i + 1} — Resuelto` : isCurrent ? `Ataque ${i + 1} — Actual` : `Ataque ${i + 1} — Pendiente`}
                                        >
                                            {isMarkerResolved ? <Check size={13} strokeWidth={3} /> : i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-1 min-h-0 flex-col">
                        {isResolving && (
                            <div className="flex flex-1 min-h-0 flex-col items-center justify-center py-12 space-y-6">
                                <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                <p className="text-red-400 font-fantasy text-xl uppercase tracking-widest animate-pulse">
                                    Calculando Resultado...
                                </p>
                            </div>
                        )}

                        {isResolved && (
                            <div className="flex flex-1 min-h-0 flex-col animate-in fade-in zoom-in-95 duration-300">
                                <div className="shrink-0">
                                    <h2 className="text-2xl sm:text-3xl font-fantasy text-red-500 text-center mb-2 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                        Resultado del Combate
                                    </h2>
                                    <p className="text-center text-slate-300 mb-6">
                                        Mira lo que ha sucedido y cierra para continuar.
                                    </p>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 mb-4 space-y-6">
                                    {event.result && (
                                        <div className="bg-black/40 border border-[#c8aa6e]/20 rounded-lg p-4 sm:p-5">
                                            <div className="space-y-4 text-center">
                                                <div className="flex justify-center items-center gap-3 sm:gap-4 text-base sm:text-lg">
                                                    <span className="text-red-400 font-fantasy uppercase tracking-wide break-words">{event.result.attackerName}</span>
                                                    <Swords className="w-5 h-5 text-slate-500" />
                                                    <span className="text-blue-400 font-fantasy uppercase tracking-wide break-words">{event.result.targetName}</span>
                                                </div>
                                                {event.result.attackMode === 'barrido' && (
                                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#c8aa6e] font-bold">
                                                        {event.result.abilityName || 'Barrido'}{event.result.attackSourceLabel ? ` con ${event.result.attackSourceLabel}` : ''}
                                                    </p>
                                                )}

                                                <ArmorProtectionBanner
                                                    source={resolvedProtection.source}
                                                    traits={resolvedProtection.traits}
                                                />

                                                <div className="py-3 border-y border-slate-700/50">
                                                    {event.result.reactionType === 'evadir' && (
                                                        <div className="space-y-3">
                                                            <p className="text-slate-300 leading-relaxed font-bold">
                                                                ¡<span className="text-blue-400">{event.result.targetName}</span> evadió <span className="text-yellow-500">{event.result.evadedDiceIds?.length || 0}</span> dados!
                                                            </p>
                                                            {renderResultDice(event.result.attackerDice, event.result.evadedDiceIds)}
                                                            <CombatTraitRow
                                                                label="Ataque"
                                                                traits={event.result.attackTraits}
                                                                accent="red"
                                                            />
                                                        </div>
                                                    )}
                                                    {event.result.reactionType === 'parar' && (
                                                        <div className="space-y-3">
                                                            <p className="text-slate-300 leading-relaxed font-bold">
                                                                ¡<span className="text-blue-400">{event.result.targetName}</span> intentó parar con <span className="text-blue-300">{event.result.defenderWeapon || 'su arma'}</span>!
                                                            </p>
                                                            
                                                            <div className="bg-black/20 p-2 rounded-lg border border-slate-700/30">
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                                                                    Ataque ({event.result.effectiveAttackTotal ?? event.result.attackTotal})
                                                                </div>
                                                                {(event.result.evadedDiceIds || []).length > 0 && (
                                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-500/80">
                                                                        Evasión: {(event.result.evadedDiceIds || []).length} dado{(event.result.evadedDiceIds || []).length === 1 ? '' : 's'} anulado{(event.result.evadedDiceIds || []).length === 1 ? '' : 's'}
                                                                    </div>
                                                                )}
                                                                {event.result.elusionEffect && (
                                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300/85">
                                                                        Elusión: dado de parada retirado (-{event.result.elusionEffect.value})
                                                                    </div>
                                                                )}
                                                                {renderResultDice(event.result.attackerDice, event.result.evadedDiceIds)}
                                                                <CombatTraitRow
                                                                    label="Rasgos"
                                                                    traits={event.result.attackTraits}
                                                                    accent="red"
                                                                />
                                                            </div>

                                                            {resolvedParrySteps.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {resolvedParrySteps.map((step, stepIndex) => (
                                                                        <div key={step.id || `${step.weaponName || 'step'}-${stepIndex}`} className="bg-black/20 p-2 rounded-lg border border-slate-700/30">
                                                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                                                    Parada {stepIndex + 1} · {step.weaponName || 'Arma'}
                                                                                </div>
                                                                                <div className="text-[10px] font-bold text-yellow-400">
                                                                                    -{Math.max(0, Number(step.yellowCost) || 0)} 🟡
                                                                                </div>
                                                                            </div>
                                                                            {renderResultDice(step.dice)}
                                                                            <CombatTraitRow
                                                                                label="Rasgos"
                                                                                traits={step.traits}
                                                                                accent="blue"
                                                                            />
                                                                            <div className="mt-2 flex items-center justify-center gap-1.5">
                                                                                <span className="text-[10px] uppercase tracking-[0.18em] text-blue-500/70 font-bold">Resultado</span>
                                                                                <span className="text-sm font-bold text-blue-300">{step.total}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <div className="bg-black/20 p-2 rounded-lg border border-blue-500/20">
                                                                        <div className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest mb-1 text-center">
                                                                            Defensa acumulada
                                                                        </div>
                                                                        <div className="text-center text-lg font-bold text-blue-300">{event.result.defenderTotal}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-black/20 p-2 rounded-lg border border-slate-700/30">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Defensa ({event.result.defenderTotal})</div>
                                                                    {renderResultDice(event.result.defenderDice)}
                                                                    <CombatTraitRow
                                                                        label="Rasgos"
                                                                        traits={event.result.defenderTraits}
                                                                        accent="blue"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="text-sm flex justify-center items-center gap-4 mt-2 mb-1">
                                                                <div><span className="text-slate-400 uppercase tracking-widest text-[10px] mr-1">Atq:</span><span className="text-red-400 font-bold">{event.result.effectiveAttackTotal ?? event.result.attackTotal}</span></div>
                                                                <div><span className="text-slate-400 uppercase tracking-widest text-[10px] mr-1">Def:</span><span className="text-blue-400 font-bold">{event.result.defenderTotal}</span></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {event.result.reactionType === 'recibir' && (
                                                        <div className="space-y-3">
                                                            <p className="text-slate-300 leading-relaxed font-bold">
                                                                <span className="text-blue-400">{event.result.targetName}</span> recibió el golpe.
                                                            </p>
                                                            {renderResultDice(event.result.attackerDice)}
                                                            <CombatTraitRow
                                                                label="Ataque"
                                                                traits={event.result.attackTraits}
                                                                accent="red"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    {event.result.damage > 0 ? (
                                                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded">
                                                            <p className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">
                                                                Daño Recibido: {event.result.damage}
                                                            </p>
                                                            <p className="text-xs text-slate-300">
                                                                Bloques perdidos: 
                                                                Postura <span className="text-white font-bold">{event.result.blocksLost?.postura || 0}</span> | 
                                                                Armadura <span className="text-white font-bold">{event.result.blocksLost?.armadura || 0}</span> | 
                                                                Vida <span className="text-red-400 font-bold">{event.result.blocksLost?.vida || 0}</span>
                                                            </p>
                                                        </div>
                                                    ) : event.result.reactionType === 'parar' && event.result.counterDamage > 0 ? (
                                                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
                                                            <p className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-1">
                                                                ¡Contraataque Exitoso!
                                                            </p>
                                                            <p className="text-xs text-slate-300">
                                                                <span className="text-red-400">{event.result.attackerName}</span> recibe <span className="text-white font-bold">{event.result.counterDamage}</span> de daño.
                                                            </p>
                                                        </div>
                                                    ) : event.result.reactionType === 'parar' && event.result.counterPreventedByRange ? (
                                                        <div className="bg-blue-950/20 border border-blue-500/30 p-3 rounded">
                                                            <p className="text-blue-300 font-bold uppercase tracking-wider text-sm mb-1">
                                                                ¡Parada sin contraataque!
                                                            </p>
                                                            <p className="text-xs text-slate-300">
                                                                El arma defensiva no alcanza al atacante a esta distancia.
                                                                {event.result.distanceBetweenTokens && event.result.defenderRangeLabel
                                                                    ? ` Distancia ${event.result.distanceBetweenTokens}, defensa ${event.result.defenderRangeLabel}.`
                                                                    : event.result.defenderRangeLabel
                                                                        ? ` Defensa ${event.result.defenderRangeLabel}.`
                                                                        : ''}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded">
                                                            <p className="text-emerald-400 font-bold uppercase tracking-wider text-sm">
                                                                ¡Ataque anulado por completo!
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 flex justify-center pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] border-t border-red-900/30 bg-[#1a1b26]">
                                    <button
                                        onClick={handleCloseResolved}
                                        disabled={isSubmitting}
                                        className="px-12 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-fantasy text-sm uppercase tracking-[0.2em] rounded shadow-lg hover:shadow-red-600/20 active:scale-95 transition-all w-full disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isResolving && !isResolved && (
                            <>
                                {/* ZONA SUPERIOR (ESTÁTICA) */}
                                <div className="shrink-0">
                                    <h2 className="text-2xl sm:text-3xl font-fantasy text-red-500 text-center mb-2 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                        ¡Ataque Inminente!
                                    </h2>
                                    <p className="text-center text-slate-300 mb-6">
                                        <strong className="text-white">{event.attackerName}</strong> te está atacando con <strong className="text-red-400">{attackLabel}</strong>.
                                    </p>
                                    {attackSequence.length > 1 && (
                                        <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[#c8aa6e] -mt-4 mb-5 font-bold">
                                            {attackSequence.length} ataques acumulados
                                        </p>
                                    )}
                                    <div className="mb-4 space-y-3">
                                        <ArmorProtectionBanner
                                            source={pendingProtection.source}
                                            traits={pendingProtection.traits}
                                        />
                        {isTargetProne && <ProneDefenseBanner statusLabel={proneStatusLabel} standUpCost={standUpCost} />}
                    {!isTargetProne && isTargetInDuel && <DuelDefenseBanner canEvade={targetCanEvadeInDuel} />}
                                    </div>
                                </div>

                                {/* ZONA SCROLLABLE (DADOS Y BOTONES DE REACCIÓN) */}
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 mb-4 space-y-6">
                            <div className="bg-black/40 border border-[#c8aa6e]/20 rounded-lg p-4">
                                <p className="text-sm text-[#c8aa6e] uppercase tracking-widest mb-3 text-center">Dados del Atacante</p>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {attackerDice.map((die) => {
                                        const isSelected = selectedDiceIndices.includes(die.id);

                                        // Use inline styles to avoid Tailwind purging dynamic classes
                                        const attrColorMap = {
                                            destreza: { color: '#4ade80' },
                                            intelecto: { color: '#60a5fa' },
                                            voluntad: { color: '#c084fc' },
                                            vigor: { color: '#f87171' },
                                        };

                                        const matchedAttr = die.matchedAttr ? die.matchedAttr.trim().toLowerCase() : null;
                                        const attrStyle = (matchedAttr && attrColorMap[matchedAttr]) ? attrColorMap[matchedAttr] : null;

                                        const baseStyle = die.isCrit ? {
                                            backgroundColor: 'rgba(234, 88, 12, 0.15)', // Dorado rojizo (#ea580c)
                                            borderColor: '#ea580c',
                                            color: '#ea580c',
                                            boxShadow: '0 0 10px rgba(234,88,12,0.3)',
                                        } : attrStyle ? {
                                            backgroundColor: 'transparent',
                                            borderColor: attrStyle.color,
                                            color: attrStyle.color,
                                            boxShadow: 'none',
                                        } : {
                                            backgroundColor: '#c8aa6e',
                                            borderColor: '#f0e6d2',
                                            color: '#0b1120',
                                        };

                                        const selectedStyle = {
                                            backgroundColor: 'rgba(127,29,29,0.8)',
                                            borderColor: '#ef4444',
                                            color: '#fecaca',
                                            opacity: 0.5,
                                            boxShadow: 'none',
                                        };

                                        return (
                                            <div
                                                key={die.id}
                                                onClick={() => reactionType === 'evadir' && toggleDie(die.id)}
                                                className={`relative transition-all ${reactionType === 'evadir' ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                                            >
                                                <DiceSvg
                                                    faces={die.faces}
                                                    value={die.value}
                                                    className="w-12 h-12"
                                                    style={isSelected ? selectedStyle : baseStyle}
                                                    title={die.isCrit ? "Dado Crítico" : matchedAttr ? `Dado de ${matchedAttr.charAt(0).toUpperCase() + matchedAttr.slice(1)}` : "Dado de Arma"}
                                                />
                                                {die.isCrit && <span className="absolute -top-3 -right-2 text-[#ea580c] text-[10px] font-sans tracking-tight font-bold drop-shadow-md pointer-events-none uppercase bg-black/60 px-1 z-20 rounded border border-[#ea580c]/50">CRIT</span>}
                                                {isSelected && <X className="absolute inset-0 m-auto text-red-500 w-8 h-8 pointer-events-none z-20" />}
                                            </div>
                                        )
                                    })}
                                </div>
                                {reactionType === 'evadir' && (
                                    <p className="text-center text-xs text-slate-400 mt-3">
                                        Toca los dados que quieras eludir. Disponible: {remainingReactionBudget} de {reactionBudget}.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-y border-slate-800/70 bg-black/10 px-1 py-2">
                                <div className="min-w-0">
                                    <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500 font-bold">
                                        Reacción
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                        {reactionBudget > 0 ? (
                                            <>Puedes gastar hasta <span className="font-semibold text-[#f0e6d2]">{reactionBudget}</span> de velocidad sin superar al atacante.</>
                                        ) : (
                                            'Ya igualas o superas la velocidad final del atacante.'
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-lg font-fantasy text-yellow-500 leading-none">{remainingReactionBudget}</div>
                                    <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-bold mt-1">
                                        rest.
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {/* BOTÓN EVADIR */}
                                <button
                                    onClick={() => {
                                        setReactionType('evadir');
                                        setSelectedWeapon('');
                                    }}
                                    disabled={!canEvade}
                                    className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${reactionType === 'evadir' || selectedDiceIndices.length > 0 ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]' : 'bg-black/40 border-slate-700 hover:border-slate-500'
                                        } ${!canEvade ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
                                >
                                    <div className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-wider">
                                        <FastForward size={18} /> Evadir
                                    </div>
                                    <span className="text-xs text-slate-400 mt-1">
                                        {selectedDiceIndices.length > 0 ? `${selectedDiceIndices.length} dado${selectedDiceIndices.length === 1 ? '' : 's'} seleccionado${selectedDiceIndices.length === 1 ? '' : 's'}` : 'Elige dados del ataque'}
                                    </span>
                                </button>

                                {/* BOTÓN PARAR */}
                                <button
                                    onClick={() => {
                                        if (reactionType !== 'parar') {
                                            setCustomModifiers(createEmptyCombatModifiers());
                                            setModifierScope('single');
                                            setModifiersExpanded(false);
                                        }
                                        setReactionType('parar');
                                        setSelectedWeapon(defaultParryWeaponId);
                                    }}
                                    disabled={!canParry}
                                    className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${reactionType === 'parar' || parrySteps.length > 0 ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]' : 'bg-black/40 border-slate-700 hover:border-slate-500'
                                        } ${!canParryByBudget ? 'opacity-50 cursor-not-allowed hidden' : ''} ${!canParry ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-wider">
                                        <Sword size={18} /> Parar
                                    </div>
                                    <span className="text-xs text-slate-400 mt-1">
                                        {!canParryByBudget ? 'Sin reacción disponible' : !canParry ? 'Ningún arma apta para parar' : parrySteps.length > 0 ? `${parrySteps.length} parada${parrySteps.length === 1 ? '' : 's'} añadida${parrySteps.length === 1 ? '' : 's'}` : 'Añade una o varias paradas'}
                                    </span>
                                </button>

                                {/* BOTÓN RECIBIR */}
                                <button
                                    onClick={() => {
                                        setReactionType('recibir');
                                        setSelectedWeapon('');
                                        setSelectedDiceIndices([]);
                                        setParrySteps([]);
                                        setCustomModifiers(createEmptyCombatModifiers());
                                        setModifierScope('single');
                                        setModifiersExpanded(false);
                                    }}
                                    className={`flex items-center justify-center gap-2 p-3 rounded border transition-all ${reactionType === 'recibir' ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-black/40 border-slate-700 hover:border-slate-500 text-slate-300'
                                        }`}
                                >
                                    <Shield size={18} /> Recibir Golpe
                                </button>
                            </div>

                            {/* SELECTOR DE ARMA (Si es Parar) */}
                            {reactionType === 'parar' && weapons.length > 0 && canParryByBudget && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="block text-[10px] text-[#c8aa6e] font-bold uppercase tracking-[0.2em] mb-3">
                                            Selecciona el arma para parar:
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            {weaponSelectionMeta.map(({ weapon, id, blockedByNoGuard, blockedByBudget, needsBloqueoForDistance, costMeta }) => {
                                                const helperText = blockedByNoGuard
                                                    ? 'Sin guardia: no puedes parar con esta arma.'
                                                    : blockedByBudget
                                                        ? `Esta arma cuesta ${costMeta.yellowCost} de velocidad y supera la reacción disponible.`
                                                        : needsBloqueoForDistance
                                                            ? 'Distancia: necesitas Bloqueo en el arma o añadirlo como modificador para parar.'
                                                        : '';

                                                return (
                                                    <WeaponCard
                                                        key={id}
                                                        weapon={weapon}
                                                        isSelected={selectedWeapon === id}
                                                        onSelect={() => handleSelectParryWeapon(id)}
                                                        disabled={blockedByNoGuard || blockedByBudget}
                                                        helperText={helperText}
                                                        customEquipmentImages={customEquipmentImages}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {parrySteps.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold">
                                                    Paradas añadidas
                                                </p>
                                                <p className="text-[9px] uppercase tracking-[0.18em] text-[#c8aa6e] font-bold">
                                                    {totalParryCost} parada · {evadeCost} evasión
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {parrySteps.map((step, stepIndex) => {
                                                    const stepModifierSummary = summarizeCombatModifiers(step.modifiers);
                                                    return (
                                                        <div key={step.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-700/80 bg-black/25 px-2.5 py-1 text-[10px] text-slate-300">
                                                            <span className="shrink-0 text-slate-500">#{stepIndex + 1}</span>
                                                            <span className="max-w-[7rem] truncate font-semibold text-slate-200 sm:max-w-[9rem]">{step.weaponName || 'Arma'}</span>
                                                            {stepModifierSummary.length > 0 && (
                                                                <span className="shrink-0 rounded-full border border-[#c8aa6e]/25 bg-[#c8aa6e]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#c8aa6e]">
                                                                    {stepModifierSummary.slice(0, 2).join(' · ')}{stepModifierSummary.length > 2 ? ` +${stepModifierSummary.length - 2}` : ''}
                                                                </span>
                                                            )}
                                                            <span className="shrink-0 font-bold text-yellow-400">-{step.yellowCost} 🟡</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeParryStep(step.id)}
                                                                className="ml-0.5 rounded-full text-slate-500 hover:text-red-200 transition-all"
                                                                title="Quitar parada"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {selectedWeaponBlockedByNoGuard && (
                                        <div className="rounded-lg border border-rose-500/30 bg-rose-900/20 px-3 py-2 text-center">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold">
                                                Sin guardia
                                            </p>
                                            <p className="text-xs text-rose-100 mt-1">
                                                Esta arma no puede usarse para parar.
                                            </p>
                                        </div>
                                    )}

                                    {selectedWeaponBlockedByDistance && (
                                        <div className="rounded-lg border border-violet-400/30 bg-violet-950/25 px-3 py-2 text-center">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-200 font-bold">
                                                Ataque a distancia
                                            </p>
                                            <p className="text-xs text-violet-100/90 mt-1">
                                                Esta parada necesita el rasgo Bloqueo. Puedes añadirlo desde modificadores.
                                            </p>
                                        </div>
                                    )}

                                    {/* Panel de Modificadores Creativos / DM */}
                                    {selectedWeapon && (
                                        <>
                                            <CombatModifiersPanel
                                                modifiers={customModifiers}
                                                onChange={setCustomModifiers}
                                                isExpanded={modifiersExpanded}
                                                onToggleExpand={() => setModifiersExpanded(!modifiersExpanded)}
                                                currentWeapon={selectedWeaponData}
                                                disabledTraitIds={['elusion']}
                                                disabledTraitReasons={{
                                                    elusion: 'Elusión solo se aplica en ataques, no en paradas.',
                                                }}
                                            />
                                            <div className="rounded-lg border border-slate-800/80 bg-black/25 p-2.5 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                                                        Aplicar modificadores a
                                                    </p>
                                                    {hasCurrentModifiers && (
                                                        <div className="flex min-w-0 flex-wrap justify-end gap-1">
                                                            {currentModifierSummary.slice(0, 4).map((label, index) => (
                                                                <span key={`${label}-${index}`} className="rounded-full border border-[#c8aa6e]/25 bg-[#c8aa6e]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c8aa6e]">
                                                                    {label}
                                                                </span>
                                                            ))}
                                                            {currentModifierSummary.length > 4 && (
                                                                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                                                    +{currentModifierSummary.length - 4}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {MODIFIER_SCOPE_OPTIONS.map((option) => {
                                                        const isActive = modifierScope === option.id;
                                                        return (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => setModifierScope(option.id)}
                                                                className={`min-h-9 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${isActive
                                                                    ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2] shadow-[0_0_10px_rgba(200,170,110,0.12)]'
                                                                    : 'border-slate-700 bg-slate-900/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                                                    }`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-center text-[10px] leading-relaxed text-slate-500">
                                                    {MODIFIER_SCOPE_OPTIONS.find((option) => option.id === modifierScope)?.helper}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={handleAddParryStep}
                                                    disabled={!canAddCurrentParryStep}
                                                    className="w-full rounded-full border border-slate-700 bg-slate-900/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300 transition-all hover:border-[#c8aa6e]/70 hover:text-[#c8aa6e] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:text-slate-300"
                                                >
                                                    Añadir parada · -{parryCostMeta.yellowCost} 🟡
                                                </button>
                                                {reactionType === 'parar' && remainingReactionBudget <= 0 && (
                                                    <p className="text-center text-[11px] text-slate-500">
                                                        Ya has agotado toda tu reacción disponible.
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ZONA INFERIOR (ESTÁTICA Y SIEMPRE VISIBLE) */}
                        <div className="shrink-0 flex justify-between items-center pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] border-t border-red-900/30 bg-[#1a1b26]">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Costo de Reacción</span>
                                <div className="text-lg font-fantasy text-yellow-500 flex items-center gap-1.5 leading-none">
                                    {`-${currentReactionCost}`}
                                    <span className="text-base">🟡</span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.18em] mt-1">
                                    Limite: {reactionBudget} de velocidad
                                </span>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting || !canConfirmReaction}
                                className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white font-fantasy text-sm uppercase tracking-[0.2em] rounded shadow-lg hover:shadow-red-600/20 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                        </>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const WeaponCard = ({ weapon, isSelected, onSelect, customEquipmentImages, disabled = false, helperText = '' }) => {
    const [imgError, setImgError] = useState(false);

    // Reset imgError when the resolved image URL changes (e.g., custom image loads from Firestore)
    const resolvedImg = useMemo(() => {
        const customImg = getCustomImage(weapon, customEquipmentImages);
        if (customImg) return customImg;
        if (weapon.img && (weapon.img.startsWith('data:') || weapon.img.startsWith('http') || weapon.img.startsWith('/'))) return weapon.img;
        if (weapon.icon && (weapon.icon.startsWith('data:') || weapon.icon.startsWith('http') || weapon.icon.startsWith('/'))) return weapon.icon;
        return null;
    }, [weapon, customEquipmentImages]);

    useEffect(() => {
        setImgError(false);
    }, [resolvedImg]);

    const damage = weapon.dano || weapon.damage || '';
    const range = weapon.alcance || weapon.range || weapon.alc || '';

    const parryCost = getSpeedConsumption(weapon);

    const costDisplay = weapon.consumo || weapon.consumption || parryCost;
    const power = weapon.poder || '';
    const traits = (weapon.rasgos || weapon.traits || weapon.trait || '').toString();

    const getRarityColors = (r = '') => {
        const rareza = r.toLowerCase();
        if (rareza.includes('legendari')) return { border: 'border-orange-500', glow: 'from-orange-900/80', stripe: 'bg-orange-500', text: 'text-orange-400' };
        if (rareza.includes('épic') || rareza.includes('epic')) return { border: 'border-purple-500', glow: 'from-purple-900/80', stripe: 'bg-purple-500', text: 'text-purple-400' };
        if (rareza.includes('rar')) return { border: 'border-blue-500', glow: 'from-blue-900/80', stripe: 'bg-blue-500', text: 'text-blue-400' };
        if (rareza.includes('poco com')) return { border: 'border-green-500', glow: 'from-green-900/80', stripe: 'bg-green-500', text: 'text-green-400' };
        return { border: 'border-slate-600', glow: 'from-slate-800', stripe: 'bg-slate-600', text: 'text-slate-400' };
    };

    const rarity = getRarityColors(weapon.rareza);

    const getItemImage = (i) => {
        // Prioridad 0: imagen custom de Firestore (Equipment Manager)
        const customImg = getCustomImage(i, customEquipmentImages);
        if (customImg) return customImg;

        // Prioridad 1: imagen explícita del item (icon custom o img con URL válida)
        if (i.img && (i.img.startsWith('data:') || i.img.startsWith('http') || i.img.startsWith('/'))) return i.img;
        if (i.icon && (i.icon.startsWith('data:') || i.icon.startsWith('http') || i.icon.startsWith('/'))) return i.icon;

        // Prioridad 2: resolver por nombre
        const name = (i.name || i.nombre || '').toLowerCase();

        if (name.includes('llave inglesa')) return '/armas/llave_inglesa.png';
        if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.png';
        if (name.includes('antorcha')) return '/armas/antorcha.png';
        if (name.includes('porra de jade')) return '/armas/Porra de jade.png';
        if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.png';
        if (name.includes('mazo glacial')) return '/armas/mazo_glacial.png';
        if (name.includes('mordisco') || name.includes('fauces')) return '/armas/fauces.png';
        if (name.includes('garras')) return '/armas/garras.png';
        if (name.includes('cuchillo')) return '/armas/cuchillo.png';
        if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.png';
        if (name.includes('revolver') || name.includes('revólver')) return '/armas/revolver.png';
        if (name.includes('pistola')) return '/armas/pistola.png';
        if (name.includes('rifle')) return '/armas/rifle.png';
        if (name.includes('escopeta')) return '/armas/escopeta.png';
        if (name.includes('granarco')) return '/armas/arco_largo.png';
        if (name.includes('arco')) return '/armas/arco_corto.png';
        if (name.includes('gran clava') || name.includes('granclava')) return '/armas/gran_clava.png';
        if (name.includes('clava')) return '/armas/clava.png';
        if (name.includes('jabalina')) return '/armas/jabalina.png';
        if (name.includes('lanza')) return '/armas/lanza.png';
        if (name.includes('daga')) return '/armas/daga.png';
        if (name.includes('hacha de mano')) return '/armas/hacha_de_mano.png';
        if (name.includes('hacha')) return '/armas/hacha_de_mano.png';
        if (name.includes('honda')) return '/armas/honda.png';
        if (name.includes('tirachinas')) return '/armas/tirachinas.png';
        if (name.includes('estoque')) return '/armas/estoque.png';
        if (name.includes('alabarda')) return '/armas/alabarda.png';
        if (name.includes('ballesta pesada') || name.includes('granballesta')) return '/armas/ballesta_pesada.png';
        if (name.includes('ultraballesta')) return '/armas/ultraballesta.jpg';
        if (name.includes('ballesta de mano')) return '/armas/ballesta_de_mano.png';
        if (name.includes('ballesta')) return '/armas/ballesta_ligera.png';
        if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.png';
        if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.png';
        if (name.includes('gran martillo')) return '/armas/gran_martillo.png';
        if (name.includes('ultramartillo')) return '/armas/ultramartillo.png';
        if (name.includes('espada bastarda')) return '/armas/espada_bastarda.png';
        if (name.includes('espada larga')) return '/armas/espada_larga.png';
        if (name.includes('espada corta')) return '/armas/espada_corta.png';
        if (name.includes('mandoble')) return '/armas/mandoble.png';
        if (name.includes('cimitarra')) return '/armas/cimitarra.png';
        if (name.includes('espada')) return '/armas/espada_de_acero.png';
        if (name.includes('escudo')) return '/armas/escudo.png';

        return null;
    };

    const itemImg = getItemImage(weapon);
    const borderColor = isSelected ? 'border-[#c8aa6e]' : rarity.border;
    const textColor = isSelected ? 'text-[#c8aa6e]' : rarity.text;

    return (
        <button
            onClick={onSelect}
            disabled={disabled}
            title={helperText || undefined}
            className={`relative bg-[#161f32] border ${borderColor} rounded-lg overflow-hidden group transition-all duration-300 w-full text-left p-0 m-0 ${disabled ? 'opacity-55 cursor-not-allowed' : 'hover:border-[#c8aa6e]/60'} ${isSelected ? 'shadow-[0_0_15px_rgba(200,170,110,0.3)] ring-1 ring-[#c8aa6e]' : ''}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${isSelected ? 'from-[#c8aa6e]/20' : rarity.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} transition-opacity duration-500 z-0`}></div>
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isSelected ? 'bg-[#c8aa6e]' : rarity.stripe} z-10`} />

            <div className="flex z-20 relative min-h-[4.5rem]">
                <div className="w-16 bg-black/50 relative shrink-0 ml-[3px] flex flex-col z-10 overflow-hidden">
                    {itemImg && !imgError ? (
                        <>
                            <img
                                src={itemImg}
                                alt={weapon.nombre || weapon.name}
                                onError={() => setImgError(true)}
                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative z-20 py-2">
                            <Sword className={`w-7 h-7 ${rarity.text} opacity-60 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`} />
                        </div>
                    )}
                    {weapon.rareza && weapon.rareza.toLowerCase() !== 'común' && (
                        <span className={`text-[8px] uppercase font-bold ${rarity.text} text-center leading-tight px-1 drop-shadow-md mt-auto pt-1 relative z-30 mb-1`}>
                            {weapon.rareza}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 p-2 pl-2.5 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                        <span className={`text-[11px] font-['Cinzel'] uppercase tracking-wider font-bold truncate leading-tight ${textColor}`}>
                            {weapon.nombre || weapon.name}
                        </span>
                        {isSelected && <Zap size={12} className="text-[#c8aa6e] animate-pulse shrink-0" />}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[9px]">
                        {damage && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Daño:</span>{' '}
                                <span className="text-red-300 font-mono">{damage}</span>
                            </div>
                        )}
                        {range && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Alc:</span>{' '}
                                <span className="text-slate-300">{range}</span>
                            </div>
                        )}
                        {costDisplay && (
                            <div className="flex items-center gap-1">
                                <span className="text-slate-500 uppercase font-bold">Coste:</span>{' '}
                                <span className="text-yellow-500 font-bold">{costDisplay}{!isNaN(costDisplay) && ' 🟡'}</span>
                            </div>
                        )}
                        {power && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Poder:</span>{' '}
                                <span className="text-purple-300 font-mono">{power}</span>
                            </div>
                        )}
                    </div>

                    {traits && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {traits.split(',').map((t, idx) => {
                                const tTrim = t.trim();
                                if (!tTrim) return null;
                                return (
                                    <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 uppercase">
                                        {formatCombatTraitLabel(tTrim)}
                                    </span>
                                )
                            })}
                        </div>
                    )}

                    {helperText && (
                        <p className="mt-1.5 text-[9px] text-rose-300/85">
                            {helperText}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );
};

export default CombatReactionModal;
