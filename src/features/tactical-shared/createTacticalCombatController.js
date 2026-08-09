import { nanoid } from 'nanoid';
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query,
    serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { DEFAULT_STATUS_EFFECTS, PRONE_STATUS_IDS } from '../../utils/statusEffects';
import {
    getSpeedConsumption, hasCombatTrait, hasNativeCombatTrait,
    normalizeCombatTraitId, rollAttack,
} from '../../utils/combatSystem';
import {
    applyNegatedTraitsToItem, getArmorCdAttribute, getArmorProtection, getItemTraits,
} from '../../utils/armorSystem';
import { parseDieValue } from '../../utils/damage';
import { getCombatEffectLifetimeMs } from '../../components/FloatingCombatEffects';
import {
    EMPUJE_EFFECT_HEX, EMPUJE_EFFECT_LABEL, RALENTIZADO_EFFECT_HEX,
    RALENTIZADO_EFFECT_LABEL, buildAggregateAttackWeapon,
    buildAggregateCombatWeapon, buildGuardiaParryRollWeapon,
    buildLegacyParrySteps, buildParryWeaponSummaryLabel, buildSweepWeapon,
    combineAttackRollResults, createFluidaState, extractCombatRollDice,
    getAttackSpeedCostMeta, getBallisticWeaponDamageFromRoll,
    getCombatRangeData, getCombatTokenSpeed, getCombatWeaponName,
    getReactionBudgetForEvent, getStandUpSpeedCost, getSweepAreaCells,
    getSweepTargetsForCells, getTokenDistanceInCells,
    getTokenDuelContextAgainstAttacker, getTokenFluidaState,
    getTokenProneStatusMeta, isSmallCombatToken, isSweepEligibleWeapon,
    isTokenDerribado, isWeaponWithinCombatRange, normalizeFluidaState,
    normalizeTokenStatusIds, resolveEmpujeMovement, sanitizeForFirestore,
} from '../canvas/combatRules';

/**
 * Current shared baseline for tactical combat command handlers. Canvas and board
 * expose separate adapters so either ruleset can diverge without changing its
 * public section or the shared session engine.
 */
export const createTacticalCombatController = ({
    activeCombatQueueEntry,
    activeScenario,
    activeScenarioRef,
    armaduras,
    effectiveCombatEventQueue,
    enrichTokenWithCharacterData,
    focusedTargetId,
    gridConfig,
    locallyResolvedEventsRef,
    pendingTurnState,
    pendingTurnStateRef,
    resolvingCombatEventsRef,
    safePersistItems,
    scenarioCollectionName,
    setActiveCombatAnimations,
    setActiveCombatEventId,
    setActiveScenario,
    setCombatEventQueue,
    setFocusedTargetId,
    setPendingTurnState,
    setResolvedEventCount,
    setSweepHoverSide,
    setTargetingState,
    targetingState,
    triggerToast,
}) => {
const resetAllSpeed = () => {
        if (!activeScenarioRef.current) return;
        const currentScenario = activeScenarioRef.current;
        const newItems = currentScenario.items.map(i =>
            (i.type !== 'wall' && i.type !== 'light') ? { ...i, velocidad: 0 } : i
        );
        setActiveScenario(prev => ({ ...prev, items: newItems }));

        // Persistir a Firebase
        safePersistItems(currentScenario.id, newItems, currentScenario.items);
        triggerToast("Velocidad Reiniciada", "Todos los contadores han vuelto a 0", 'info');
    };

    const handleCombatAction = (tokenId, actionId, data = null) => {
        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario) return;

        const token = scenario.items.find(i => i.id === tokenId);
        if (!token) return;
        const tokenIsProne = isTokenDerribado(token);
        const proneStatusMeta = getTokenProneStatusMeta(token);

        // --- LÓGICA DE TARGETING / CANCELACIÓN ---
        if (actionId === 'cancel_targeting') {
            setTargetingState(null);
            setFocusedTargetId(null);
            setSweepHoverSide(null);
            return;
        }

        if (tokenIsProne && actionId !== 'stand_up') {
            if (targetingState?.attackerId === tokenId) {
                setTargetingState(null);
                setFocusedTargetId(null);
            }
            triggerToast(
                proneStatusMeta?.label || "Derribado",
                `Mientras estés ${proneStatusMeta?.label?.toLowerCase() || 'derribado'} solo puedes levantarte`,
                'warning'
            );
            return;
        }

        if (actionId === 'stand_up') {
            if (!tokenIsProne) return;

            const pendingActions = pendingTurnStateRef.current?.tokenId === tokenId
                ? (pendingTurnStateRef.current.actions || [])
                : [];

            if (pendingActions.some(action => action.actionId === 'stand_up')) {
                triggerToast("Levantarse pendiente", "Ya has preparado la acción de levantarte para este turno", 'info');
                return;
            }

            const standUpCost = getStandUpSpeedCost(token);
            updatePendingTurnActions(tokenId, token, "Levantarse", standUpCost, { actionId: 'stand_up' });
            triggerToast("Levantarse", `${token.name} se preparará para incorporarse al final del turno (${standUpCost} de velocidad)`, 'info');
            return;
        }

        if (actionId === 'control_status') {
            const tokenStatuses = Array.isArray(token.status) ? token.status : [];
            if (!tokenStatuses.includes('sangrado')) {
                triggerToast("Sin control posible", "Ahora mismo no tienes ningun estado basico que controlar", 'info');
                return;
            }

            updatePendingTurnActions(tokenId, token, "Controlar Sangrado", 1, {
                actionId: 'control_status',
                controlledStatusId: 'sangrado'
            });
            triggerToast("Controlar", `${token.name} controlará el sangrado al final del turno (1 de velocidad)`, 'info');
            return;
        }

        if (actionId === 'attack') {
            // Fase 1: Iniciar targeting si no hay nada en marcha
            if (!targetingState) {
                setTargetingState({ attackerId: tokenId, actionId, phase: 'targeting' });
                triggerToast("Busca Objetivo", "Selecciona una ficha para atacar", 'info');
                return;
            }

            // Fase 2: Si ya teníamos un objetivo fijado y ahora elegimos el arma (esto vendrá del Combat HUD)
            if (targetingState.phase === 'weapon_selection') {
                // Si data es null, es un ataque genérico (sin arma específica elegida)
                completeCombatAction(tokenId, actionId, scenario.items.find(i => i.id === focusedTargetId), data);
                setTargetingState(null);
                setFocusedTargetId(null);
                return;
            }
        }

        if (actionId === 'sweep') {
            if (!isSweepEligibleWeapon(data)) {
                triggerToast("Barrido no disponible", "Necesitas un arma a toque de coste 2 o más para usar Barrido", 'warning');
                return;
            }

            setFocusedTargetId(null);
            setSweepHoverSide(null);
            setTargetingState({
                attackerId: tokenId,
                actionId,
                phase: 'sweep_selection',
                weapon: data
            });
            triggerToast("Barrido", "Elige el frente del barrido alrededor de la ficha", 'info');
            return;
        }

        let cost = 0;
        let actionName = "";

        if (actionId === 'help') {
            cost = 1;
            actionName = "Ayudar";
        }

        if (cost > 0) {
            updatePendingTurnActions(tokenId, token, actionName, cost);
        }
    };

    const completeCombatAction = (attackerId, actionId, targetToken, data = null) => {
        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario) return;

        const attackerToken = scenario.items.find(i => i.id === attackerId);
        if (!attackerToken) return;

        let cost = 0;
        let actionName = "";

        if (actionId === 'attack') {
            const weapon = data || (attackerToken.equippedItems || []).find(i => i.type === 'weapon');
            const costMeta = getAttackSpeedCostMeta({
                attackerToken,
                targetId: targetToken?.id,
                weapon,
                pendingState: pendingTurnStateRef.current
            });
            cost = costMeta.cost;
            actionName = `Ataque a ${targetToken.name} (${weapon?.nombre || weapon?.name || 'Arma'})`;

            // Aquí podríamos disparar efectos visuales, tirar dados, etc.
            triggerToast("¡Ataque!", `${attackerToken.name} ataca a ${targetToken.name} con ${weapon?.nombre || 'arma'}`, 'success');

            if (cost > 0) {
                updatePendingTurnActions(attackerId, attackerToken, actionName, cost, {
                    targetId: targetToken.id,
                    actionId,
                    weapon,
                    baseCost: costMeta.baseCost,
                    fluidaDiscountApplied: costMeta.fluidaDiscountApplied,
                    hasFluidaTrait: costMeta.hasFluidaTrait,
                    hasNativeFluidaTrait: costMeta.hasNativeFluidaTrait,
                    hasManualFluidaTrait: costMeta.hasManualFluidaTrait,
                    fluidaDiscountMode: costMeta.fluidaDiscountMode
                });
            }

            return;
        }

        if (actionId === 'sweep') {
            const weapon = data?.weapon || data;
            const targetIds = Array.isArray(data?.targetIds) ? data.targetIds.filter(Boolean) : [];
            if (!weapon || targetIds.length === 0) {
                triggerToast("Barrido incompleto", "Debes elegir un frente con al menos un objetivo para preparar Barrido", 'warning');
                return;
            }

            cost = Math.max(1, getSpeedConsumption(weapon)) + 1;
            actionName = `Barrido (${weapon?.nombre || weapon?.name || 'Arma'})`;

            triggerToast(
                "¡Barrido!",
                `${attackerToken.name} prepara un barrido sobre ${targetIds.length} objetivo${targetIds.length !== 1 ? 's' : ''}`,
                'success'
            );

            updatePendingTurnActions(attackerId, attackerToken, actionName, cost, {
                actionId: 'sweep',
                weapon,
                targetIds,
                sweepSide: data?.side || null,
                sweepCells: Array.isArray(data?.sweepCells) ? data.sweepCells : [],
                abilityName: 'Barrido',
                baseCost: Math.max(1, getSpeedConsumption(weapon)),
                yellowSurcharge: 1
            });

            return;
        }

        if (cost > 0) {
            updatePendingTurnActions(attackerId, attackerToken, actionName, cost, { targetId: targetToken.id, actionId, weapon: actionId === 'attack' ? (data || (attackerToken.equippedItems || []).find(i => i.type === 'weapon')) : null });
        }
    };

    const confirmSweepSelection = (attackerId, side) => {
        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario || !targetingState?.weapon) return;

        const attackerToken = scenario.items.find((item) => item.id === attackerId);
        if (!attackerToken) return;

        const sweepCells = getSweepAreaCells(attackerToken, side, gridConfig);
        const targetIds = getSweepTargetsForCells(scenario.items, attackerId, sweepCells, gridConfig)
            .slice(0, 3)
            .map((target) => target.id);

        if (targetIds.length === 0) {
            triggerToast("Barrido sin objetivos", "No hay objetivos a toque en ese frente", 'warning');
            return;
        }

        completeCombatAction(attackerId, 'sweep', null, {
            weapon: targetingState.weapon,
            side,
            sweepCells,
            targetIds
        });
        setTargetingState(null);
        setFocusedTargetId(null);
        setSweepHoverSide(null);
    };

    const consumeSweepTemplateEvent = (event) => {
        if (!event) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.nativeEvent?.stopImmediatePropagation === 'function') {
            event.nativeEvent.stopImmediatePropagation();
        }
    };

    const handleSweepTemplateCancel = (event) => {
        consumeSweepTemplateEvent(event);
        setTargetingState(null);
        setSweepHoverSide(null);
    };

    const handleSweepTemplateClick = (event, attackerId, side) => {
        consumeSweepTemplateEvent(event);
        confirmSweepSelection(attackerId, side);
    };

    const updatePendingTurnActions = (tokenId, token, actionName, cost, metadata = {}) => {
        setPendingTurnState(prev => {
            const base = prev && prev.tokenId === tokenId ? prev : {
                tokenId: tokenId,
                startX: token.x,
                startY: token.y,
                x: token.x,
                y: token.y,
                moveCost: 0,
                actionCost: 0,
                actions: []
            };

            const newActions = [...(base.actions || []), { name: actionName, cost, ...metadata }];

            return {
                ...base,
                actionCost: base.actionCost + cost,
                actions: newActions
            };
        });
    };

    const handleCancelAction = (tokenId, index) => {
        setPendingTurnState(prev => {
            if (!prev || prev.tokenId !== tokenId) return prev;

            const actions = [...(prev.actions || [])];
            if (index < 0 || index >= actions.length) return prev;

            const removedAction = actions[index];
            actions.splice(index, 1);

            return {
                ...prev,
                actionCost: prev.actionCost - removedAction.cost,
                actions: actions
            };
        });
    };

    const getPendingSangradoControlCount = (pendingState) => {
        const actions = Array.isArray(pendingState?.actions) ? pendingState.actions : [];
        return actions.reduce((total, action) => (
            action?.actionId === 'control_status' && action?.controlledStatusId === 'sangrado'
                ? total + 1
                : total
        ), 0);
    };

    const getPendingSangradoControlSpeedCost = (pendingState) => {
        const actions = Array.isArray(pendingState?.actions) ? pendingState.actions : [];
        return actions.reduce((total, action) => (
            action?.actionId === 'control_status' && action?.controlledStatusId === 'sangrado'
                ? total + Math.max(0, Number(action?.cost) || 0)
                : total
        ), 0);
    };

    const applySangradoSpeedPenalty = (tokenLike, spentSpeed = 0, options = {}) => {
        const normalizedSpentSpeed = Math.max(0, Math.floor(Number(spentSpeed) || 0));
        if (!tokenLike || normalizedSpentSpeed <= 0) {
            return { token: tokenLike, lostVida: 0, preventedVida: 0 };
        }

        const statuses = Array.isArray(tokenLike.status) ? tokenLike.status : [];
        if (!statuses.includes('sangrado')) {
            return { token: tokenLike, lostVida: 0, preventedVida: 0 };
        }

        const mitigation = Math.max(0, Math.floor(Number(options?.sangradoMitigation) || 0));
        const effectiveSpentSpeed = Math.max(0, normalizedSpentSpeed - mitigation);
        const currentVida = Math.max(0, Number(tokenLike?.stats?.vida?.current ?? 0));
        const lostVida = Math.min(currentVida, effectiveSpentSpeed);
        if (lostVida <= 0) {
            return {
                token: tokenLike,
                lostVida: 0,
                preventedVida: Math.min(normalizedSpentSpeed, mitigation)
            };
        }

        return {
            token: {
                ...tokenLike,
                stats: {
                    ...tokenLike.stats,
                    vida: {
                        ...(tokenLike?.stats?.vida || {}),
                        current: currentVida - lostVida
                    }
                }
            },
            lostVida,
            preventedVida: Math.min(normalizedSpentSpeed, mitigation)
        };
    };

    const queueLocalCombatAnimation = (effect, delayMs = 0) => {
        if (!effect) return;

        const normalizedDelay = Math.max(0, Number(delayMs) || 0);
        const enqueue = () => {
            const animId = `local_anim_${nanoid(8)}`;
            setActiveCombatAnimations(prev => [...prev, { id: animId, effect }]);

            const lifetimeMs = getCombatEffectLifetimeMs(effect);
            setTimeout(() => {
                setActiveCombatAnimations(prev => prev.filter(a => a.id !== animId));
            }, lifetimeMs);
        };

        if (normalizedDelay > 0) {
            setTimeout(enqueue, normalizedDelay);
            return;
        }

        enqueue();
    };

    const buildSangradoSpeedEffect = (tokenLike, lostVida) => ({
        scenarioId: activeScenarioRef.current?.id || activeScenario?.id || null,
        attackerId: null,
        attackerName: null,
        targetId: tokenLike.id,
        targetName: tokenLike.name || 'Token',
        weaponName: null,
        reactionType: 'status_tick',
        finalDamage: 0,
        counterDamage: 0,
        blocksLost: { postura: 0, armadura: 0, vida: lostVida },
        baseBlocksLost: { postura: 0, armadura: 0, vida: lostVida },
        traitBonuses: { postura: null, armadura: null, vida: null },
        traitEffectsApplied: { target: [], attacker: [] },
        statusEffectsApplied: { target: [], attacker: [] },
        damage: 0,
        statusTickSource: 'sangrado',
        clientTimestamp: Date.now()
    });

    const buildPosturaRecoveryEffect = (tokenLike, recoveredPostura) => ({
        scenarioId: activeScenarioRef.current?.id || activeScenario?.id || null,
        attackerId: null,
        attackerName: null,
        targetId: tokenLike.id,
        targetName: tokenLike.name || 'Token',
        weaponName: null,
        reactionType: 'turn_recovery',
        finalDamage: 0,
        counterDamage: 0,
        blocksLost: { postura: 0, armadura: 0, vida: 0 },
        baseBlocksLost: { postura: 0, armadura: 0, vida: 0 },
        traitBonuses: { postura: null, armadura: null, vida: null },
        traitEffectsApplied: { target: [], attacker: [] },
        statusEffectsApplied: { target: [], attacker: [] },
        speedEffectsApplied: { target: [], attacker: [] },
        pushEffectsApplied: { target: [], attacker: [] },
        recoveryEffectsApplied: {
            target: [{
                id: 'postura_recovery',
                label: 'Reposo · Postura',
                resource: 'postura',
                amount: recoveredPostura,
                hex: '#34d399'
            }],
            attacker: []
        },
        damage: 0,
        recoverySource: 'end_turn_idle',
        clientTimestamp: Date.now()
    });

    const publishSyncedCombatEffect = async (effect) => {
        if (!effect?.scenarioId) {
            queueLocalCombatAnimation(effect);
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'combat_effects'), {
                ...effect,
                timestamp: serverTimestamp()
            });

            setTimeout(() => {
                deleteDoc(doc(db, 'combat_effects', docRef.id)).catch(() => {});
            }, 12000);
        } catch (err) {
            console.warn('Error publicando efecto visual compartido:', err);
            queueLocalCombatAnimation(effect);
        }
    };

    const queueSangradoSpeedAnimation = (tokenLike, lostVida, options = {}) => {
        if (!tokenLike?.id || lostVida <= 0) return;

        const effect = buildSangradoSpeedEffect(tokenLike, lostVida);
        const normalizedDelay = Math.max(0, Number(options.delayMs) || 0);
        const enqueue = () => {
            if (options.shared) {
                publishSyncedCombatEffect(effect);
                return;
            }
            queueLocalCombatAnimation(effect);
        };

        if (normalizedDelay > 0) {
            setTimeout(enqueue, normalizedDelay);
            return;
        }

        enqueue();
    };

    const queuePosturaRecoveryAnimation = (tokenLike, recoveredPostura, options = {}) => {
        if (!tokenLike?.id || recoveredPostura <= 0) return;

        const effect = buildPosturaRecoveryEffect(tokenLike, recoveredPostura);
        const normalizedDelay = Math.max(0, Number(options.delayMs) || 0);
        const enqueue = () => {
            if (options.shared) {
                publishSyncedCombatEffect(effect);
                return;
            }
            queueLocalCombatAnimation(effect);
        };

        if (normalizedDelay > 0) {
            setTimeout(enqueue, normalizedDelay);
            return;
        }

        enqueue();
    };

    const normalizeCombatResourceStat = (stats, resourceId) => {
        const resource = stats?.[resourceId] || {};
        const rawMax = resource.max ?? resource.total ?? resource.base ?? resource.current ?? resource.actual ?? 0;
        const max = Math.max(0, Number(rawMax) || 0);
        const rawCurrent = resource.current ?? resource.actual ?? max;
        const current = Math.max(0, Math.min(max, Number(rawCurrent) || 0));

        return {
            ...resource,
            current,
            max,
        };
    };

    const normalizeCombatStats = (tokenLike) => {
        const stats = tokenLike?.stats || {};
        return {
            ...stats,
            postura: normalizeCombatResourceStat(stats, 'postura'),
            armadura: normalizeCombatResourceStat(stats, 'armadura'),
            vida: normalizeCombatResourceStat(stats, 'vida'),
        };
    };

    const applyCombatCalculations = (token, damage, weapon, options = {}) => {
        const combatStats = normalizeCombatStats(token);
        const attributeDice = {
            destreza: token.attributes?.destreza || 'd6',
            vigor: token.attributes?.vigor || 'd6',
            intelecto: token.attributes?.intelecto || 'd6',
            voluntad: token.attributes?.voluntad || 'd6',
        };

        // Reducir grado del dado si el arma tiene Agudeza
        const traits = weapon?.rasgos || weapon?.traits || weapon?.trait || weapon?.properties || [];
        const traitsArray = Array.isArray(traits) ? traits : traits.toString().split(',');
        const normalizedTraits = traitsArray
            .filter((t) => typeof t === 'string')
            .map((t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        const hasAgudeza = normalizedTraits.some((t) => t.includes('agudeza'));
        const hasDerribado = normalizedTraits.some((t) => t.includes('derribado') || t.includes('derribar') || t.includes('derribo'));
        const hasHendir = normalizedTraits.some((t) => t.includes('hendir'));
        const hasConmocionante = normalizedTraits.some((t) => t.includes('conmocionante'));
        const hasSangrado = normalizedTraits.some((t) => t.includes('sangrado'));
        const hasRalentizado = normalizedTraits.some((t) => t.includes('ralentizado') || t.includes('ralentizar'));
        const hasPerforante = normalizedTraits.some((t) => t.includes('penetrante') || t.includes('perforante'));
        const hasEmpuje = normalizedTraits.some((t) => t.includes('empuje') || t.includes('empujar'));
        const hasBalistico = normalizedTraits.some((t) => t.includes('balistico') || t.includes('balistica'));

        const reduceDieStep = (dieStr) => {
            if (!dieStr || typeof dieStr !== 'string') return dieStr;
            const match = dieStr.toLowerCase().match(/d(\d+)/);
            if (!match) return dieStr;
            let faces = parseInt(match[1]);

            if (faces > 12) faces = 12;
            else if (faces > 10) faces = 10;
            else if (faces > 8) faces = 8;
            else if (faces > 6) faces = 6;
            else if (faces <= 6) faces = 4;

            return `d${faces}`;
        };

        if (hasAgudeza) {
            Object.keys(attributeDice).forEach((attrId) => {
                attributeDice[attrId] = reduceDieStep(attributeDice[attrId]);
            });
        }

        const armorAttr = getArmorCdAttribute(token, { armaduras });
        const posturaUmbral = parseDieValue(attributeDice.destreza) || 1;
        const armaduraUmbral =
            parseDieValue(attributeDice[armorAttr] || attributeDice.vigor) || 1;
        const vidaUmbral = parseDieValue(attributeDice.vigor) || 1;

        let lostPostura = 0;
        let lostArmadura = 0;
        let lostVida = 0;
        let extraPosturaFromTrait = 0;
        let extraArmaduraFromTrait = 0;
        let extraArmaduraFromPerforante = 0;
        let extraVidaFromPerforante = 0;
        let baseLostPostura = 0;
        let baseLostArmadura = 0;
        let baseLostVida = 0;
        const appliedStatusEffects = [];
        const appliedTraitEffects = [];

        let currentPostura = combatStats.postura.current || 0;
        let currentArmadura = combatStats.armadura.current || 0;
        let currentVida = combatStats.vida.current || 0;
        const posturaInicial = currentPostura;
        const currentLayerBeforeDamage =
            currentPostura > 0 ? 'postura' :
                currentArmadura > 0 ? 'armadura' :
                    currentVida > 0 ? 'vida' :
                        null;
        const totalDamage = Math.max(0, Number(damage) || 0);
        let ballisticDamage = hasBalistico
            ? Math.min(totalDamage, Math.max(0, Math.floor(Number(options.ballisticDamage) || 0)))
            : 0;
        let remainingDamage = Math.max(0, totalDamage - ballisticDamage);

        const consumeBallisticBlocks = (availableBlocks) => {
            if (availableBlocks <= 0 || ballisticDamage <= 0) return 0;
            const lostBlocks = Math.min(availableBlocks, ballisticDamage);
            ballisticDamage -= lostBlocks;
            return lostBlocks;
        };

        const consumeDamageBlocks = (availableBlocks, threshold) => {
            if (availableBlocks <= 0 || threshold <= 0 || remainingDamage < threshold) {
                return 0;
            }

            const lostBlocks = Math.min(
                Math.floor(remainingDamage / threshold),
                availableBlocks
            );

            remainingDamage -= lostBlocks * threshold;
            return lostBlocks;
        };

        const ballisticPosturaLost = consumeBallisticBlocks(currentPostura);
        if (ballisticPosturaLost > 0) {
            lostPostura += ballisticPosturaLost;
            baseLostPostura += ballisticPosturaLost;
            currentPostura -= ballisticPosturaLost;
            appliedTraitEffects.push({
                id: 'balistico',
                label: 'Balístico',
                layer: 'postura',
                blocks: ballisticPosturaLost,
                hex: '#facc15'
            });
        }

        const ballisticVidaLost = consumeBallisticBlocks(currentVida);
        if (ballisticVidaLost > 0) {
            lostVida += ballisticVidaLost;
            baseLostVida += ballisticVidaLost;
            currentVida -= ballisticVidaLost;
            appliedTraitEffects.push({
                id: 'balistico',
                label: 'Balístico',
                layer: 'vida',
                blocks: ballisticVidaLost,
                hex: '#fb7185'
            });
        }

        const normalPosturaLost = consumeDamageBlocks(currentPostura, posturaUmbral);
        lostPostura += normalPosturaLost;
        baseLostPostura += normalPosturaLost;
        currentPostura -= normalPosturaLost;

        if (hasDerribado && lostPostura > 0 && currentPostura > 0) {
            lostPostura += 1;
            currentPostura -= 1;
            extraPosturaFromTrait = 1;
        }

        const normalArmaduraLost = consumeDamageBlocks(currentArmadura, armaduraUmbral);
        lostArmadura += normalArmaduraLost;
        baseLostArmadura += normalArmaduraLost;
        currentArmadura -= normalArmaduraLost;

        if (hasHendir && (lostPostura > 0 || lostArmadura > 0) && currentArmadura > 0) {
            lostArmadura += 1;
            currentArmadura -= 1;
            extraArmaduraFromTrait = 1;
            appliedTraitEffects.push({
                id: 'hendir',
                label: 'Hendir',
                layer: 'armadura',
                blocks: 1,
                hex: '#cbd5e1'
            });
        }

        const normalVidaLost = consumeDamageBlocks(currentVida, vidaUmbral);
        lostVida += normalVidaLost;
        baseLostVida += normalVidaLost;
        currentVida -= normalVidaLost;

        const addPerforanteBlock = (preferredLayer) => {
            if (preferredLayer === 'armadura' && currentArmadura > 0) {
                currentArmadura -= 1;
                lostArmadura += 1;
                extraArmaduraFromPerforante += 1;
                appliedTraitEffects.push({
                    id: 'perforante',
                    label: 'Perforante',
                    layer: 'armadura',
                    blocks: 1,
                    hex: '#f59e0b'
                });
                return true;
            }

            if (currentVida > 0) {
                currentVida -= 1;
                lostVida += 1;
                extraVidaFromPerforante += 1;
                appliedTraitEffects.push({
                    id: 'perforante',
                    label: 'Perforante',
                    layer: 'vida',
                    blocks: 1,
                    hex: '#fb7185'
                });
                return true;
            }

            return false;
        };

        if (hasPerforante) {
            const penetratedCurrentLayer =
                (currentLayerBeforeDamage === 'postura' && lostPostura > 0) ||
                (currentLayerBeforeDamage === 'armadura' && lostArmadura > 0) ||
                (currentLayerBeforeDamage === 'vida' && lostVida > 0);

            if (penetratedCurrentLayer) {
                if (currentLayerBeforeDamage === 'postura') {
                    addPerforanteBlock('armadura');
                } else {
                    addPerforanteBlock('vida');
                }
            }
        }

        const newStatus = normalizeTokenStatusIds(token.status || []);
        const totalBlocksLost = lostPostura + lostArmadura + lostVida;
        if (hasSangrado && lostVida > 0 && !newStatus.includes('sangrado')) {
            newStatus.push('sangrado');
            appliedStatusEffects.push({
                id: 'sangrado',
                label: DEFAULT_STATUS_EFFECTS.sangrado?.label || 'Sangrado',
                hex: DEFAULT_STATUS_EFFECTS.sangrado?.hex || '#b91c1c'
            });
        }
        const speedDeltaFromCombatEffects = totalBlocksLost > 0 && hasRalentizado
            ? 1
            : 0;
        const pushTriggered = totalBlocksLost > 0 && hasEmpuje;

        const wasAlreadyProne = PRONE_STATUS_IDS.some((statusId) => newStatus.includes(statusId));
        const fellProneByPostureBreak = posturaInicial > 0 && currentPostura === 0;
        const fellProneByBodyDamageWithoutPosture = posturaInicial === 0 && (lostArmadura > 0 || lostVida > 0);

        const appliedProneNow = !wasAlreadyProne && (fellProneByPostureBreak || fellProneByBodyDamageWithoutPosture);
        const proneStatusId = hasConmocionante ? 'conmocionado' : 'derribado';
        if (appliedProneNow && !newStatus.includes(proneStatusId)) {
            newStatus.push(proneStatusId);
            appliedStatusEffects.push({
                id: proneStatusId,
                label: DEFAULT_STATUS_EFFECTS[proneStatusId]?.label || 'Derribado',
                hex: DEFAULT_STATUS_EFFECTS[proneStatusId]?.hex || '#818cf8'
            });
        }

        return {
            stats: {
                ...combatStats,
                postura: { ...combatStats.postura, current: currentPostura },
                armadura: { ...combatStats.armadura, current: currentArmadura },
                vida: { ...combatStats.vida, current: currentVida },
            },
            status: newStatus,
            lost: { postura: lostPostura, armadura: lostArmadura, vida: lostVida },
            baseLost: { postura: baseLostPostura, armadura: baseLostArmadura, vida: baseLostVida },
            traitBonuses: {
                postura: extraPosturaFromTrait ? { name: 'Derribo', blocks: extraPosturaFromTrait } : null,
                armadura: (extraArmaduraFromTrait + extraArmaduraFromPerforante) > 0
                    ? {
                        name: [
                            extraArmaduraFromTrait ? 'Hendir' : null,
                            extraArmaduraFromPerforante ? 'Perforante' : null
                        ].filter(Boolean).join(' + '),
                        blocks: extraArmaduraFromTrait + extraArmaduraFromPerforante
                    }
                    : null,
                vida: extraVidaFromPerforante ? { name: 'Perforante', blocks: extraVidaFromPerforante } : null,
            },
            appliedStatusEffects,
            appliedTraitEffects,
            speedDeltaFromCombatEffects,
            pushTriggered
        };
    };

    const resolveCombatEvent = async (event) => {
        if (event.status === 'resolviendo' || resolvingCombatEventsRef.current.has(event.id)) return;

        resolvingCombatEventsRef.current.add(event.id);

        try {
            await updateDoc(doc(db, 'combat_events', event.id), { status: 'resolviendo' });
        } catch (error) {
            // Si el documento ya no existe (porque otro cliente o pestaña ya lo resolvió y borró), 
            // ignoramos el error en vez de colapsar la app.
            resolvingCombatEventsRef.current.delete(event.id);
            console.warn("Se intentó resolver un evento ya procesado o borrado:", event.id);
            return;
        }

        try {
            const scenario = activeScenarioRef.current || activeScenario;
            const attackerTokenBase = scenario.items.find(i => i.id === event.attackerId);
            const targetTokenBase = scenario.items.find(i => i.id === event.targetId);

            if (!attackerTokenBase || !targetTokenBase) {
                await deleteDoc(doc(db, 'combat_events', event.id));
                return;
            }

            const attackerToken = enrichTokenWithCharacterData(attackerTokenBase);
            const targetToken = enrichTokenWithCharacterData(targetTokenBase);
            const getTargetVelocityAfterReaction = (reactionCost = 0) => {
                const committedBaseVelocity = Number(event.reactionData?.effectiveTargetVelBeforeReaction);
                const baseVelocity = Number.isFinite(committedBaseVelocity)
                    ? committedBaseVelocity
                    : (targetTokenBase.velocidad || 0);
                return baseVelocity + Math.max(0, Number(reactionCost) || 0);
            };

            // Extraer dados individuales del atacante para el log visual
            const attackerDice = extractCombatRollDice(event.attackerRollResult, 'atk');

            let logText = "";
            let finalItems = scenario.items.map((item) => (
                Array.isArray(item.status)
                    ? { ...item, status: normalizeTokenStatusIds(item.status) }
                    : item
            ));
            const updateTokenInList = (id, updates) => {
                finalItems = finalItems.map(item => item.id === id ? { ...item, ...updates } : item);
            };

        // Variables para el log rico
        let finalDamage = 0;
        let counterDamage = 0;
        let blocksLost = { postura: 0, armadura: 0, vida: 0 };
        let baseBlocksLost = { postura: 0, armadura: 0, vida: 0 };
        let traitBonuses = { postura: null, armadura: null, vida: null };
        let evadedDiceIds = [];
        let defenderDice = [];
        let defenderSteps = [];
        let defenderTotal = 0;
        let counterPreventedByRange = false;
        let attackerRangeLabel = null;
        let defenderRangeLabel = null;
        let distanceBetweenTokens = null;
        const attackTraits = getItemTraits(event.weapon);
        const isSweepAttack = event.attackMode === 'barrido';
        const attackModeLabel = isSweepAttack ? (event.abilityName || 'Barrido') : null;
        const attackSourceLabel = isSweepAttack
            ? (event.sweepMeta?.sourceWeaponName || event.weapon?.sweepSourceWeaponName || event.weapon?.nombre || event.weapon?.name || null)
            : null;
        const attackHasFluida = !!event.fluidaMeta?.hasNativeTrait || hasNativeCombatTrait(event.weapon, 'fluida');
        const laterActionBreaksAttackerFluida =
            !!event.fluidaMeta?.laterActionBreaksChain ||
            !!event.fluidaMeta?.laterNonAttackBreaksChain;
        let defenderTraits = [];
        let defenderWeaponSummary = null;
        let statusEffectsApplied = { target: [], attacker: [] };
        let traitEffectsApplied = { target: [], attacker: [] };
        let speedEffectsApplied = { target: [], attacker: [] };
        let pushEffectsApplied = { target: [], attacker: [] };
        let elusionEffect = null;
        let nextAttackerFluidaState = getTokenFluidaState(attackerTokenBase);
        let nextTargetFluidaState = getTokenFluidaState(targetTokenBase);

        const getRalentizadoSpeedDelta = (result) => Math.max(0, Number(result?.speedDeltaFromCombatEffects) || 0);
        const buildRalentizadoSpeedEffect = (result, tokenLike) => {
            const delta = getRalentizadoSpeedDelta(result);
            if (delta <= 0) return null;
            return {
                id: 'ralentizado',
                label: RALENTIZADO_EFFECT_LABEL,
                hex: RALENTIZADO_EFFECT_HEX,
                delta,
                tokenId: tokenLike?.id || null,
                tokenName: tokenLike?.name || 'Token'
            };
        };
        const appendRalentizadoLog = (text, result, tokenLike) => {
            const delta = getRalentizadoSpeedDelta(result);
            if (delta <= 0) return text;
            return `${text} ${RALENTIZADO_EFFECT_LABEL} aumenta la velocidad de ${tokenLike?.name || 'el objetivo'} en ${delta}.`;
        };
        const applyEmpujeEffect = (result, sourceTokenLike, pushedTokenLike) => {
            if (!result?.pushTriggered || !sourceTokenLike?.id || !pushedTokenLike?.id) return null;

            const currentSource = finalItems.find((item) => item.id === sourceTokenLike.id) || sourceTokenLike;
            const currentPushed = finalItems.find((item) => item.id === pushedTokenLike.id) || pushedTokenLike;
            const outcome = resolveEmpujeMovement({
                sourceToken: currentSource,
                pushedToken: currentPushed,
                items: finalItems,
                config: gridConfig,
            });

            if (outcome.applied) {
                updateTokenInList(pushedTokenLike.id, {
                    x: outcome.x,
                    y: outcome.y,
                });
            }

            return {
                id: 'empuje',
                label: EMPUJE_EFFECT_LABEL,
                hex: EMPUJE_EFFECT_HEX,
                applied: !!outcome.applied,
                reason: outcome.reason || null,
                tokenId: pushedTokenLike.id,
                tokenName: pushedTokenLike.name || 'Token',
                fromCell: outcome.fromCell || null,
                toCell: outcome.toCell || null,
                direction: outcome.direction || null,
                sharedMode: outcome.sharedMode || null,
                sharedWith: outcome.sharedWith || [],
            };
        };
        const appendEmpujeLog = (text, pushEffect) => {
            if (!pushEffect) return text;
            if (pushEffect.applied) {
                const sharedText = pushEffect.sharedMode === 'duelo'
                    ? ' y entra en duelo'
                    : pushEffect.sharedMode === 'formacion'
                        ? ' y entra en formación'
                        : '';
                return `${text} ${EMPUJE_EFFECT_LABEL} desplaza a ${pushEffect.tokenName || 'el objetivo'} 1 casilla${sharedText}.`;
            }

            return `${text} ${EMPUJE_EFFECT_LABEL} no desplaza a ${pushEffect.tokenName || 'el objetivo'}: ${pushEffect.reason || 'bloqueado'}.`;
        };

        const setAttackerFluidaState = (state) => {
            nextAttackerFluidaState = laterActionBreaksAttackerFluida ? null : normalizeFluidaState(state);
        };

        const setTargetFluidaState = (state) => {
            nextTargetFluidaState = normalizeFluidaState(state);
        };

        const getAttackTotalAfterEvasion = (evadedIds = []) => {
            const safeEvadedIds = Array.isArray(evadedIds) ? evadedIds : [];
            if (safeEvadedIds.length === 0) {
                return Number(event.attackerRollResult?.total) || 0;
            }

            let newTotal = 0;
            const details = JSON.parse(JSON.stringify(event.attackerRollResult?.details || []));
            details.forEach((detail, dIdx) => {
                if (detail.type === 'dice') {
                    const filteredRolls = (detail.rolls || []).filter((_, rIdx) => !safeEvadedIds.includes(`${dIdx}-${rIdx}`));
                    newTotal += filteredRolls.reduce((sum, r) => sum + (typeof r === 'object' ? Number(r.value) || 0 : Number(r) || 0), 0);
                } else if (detail.type === 'modifier' || detail.type === 'calc') {
                    if (!safeEvadedIds.includes(`${dIdx}-0`)) {
                        newTotal += Number(detail.value ?? detail.total ?? detail.subtotal) || 0;
                    }
                }
            });
            return newTotal;
        };

        let effectiveAttackTotal = Number(event.attackerRollResult?.total) || 0;

        if (event.reactionType === 'evadir') {
            evadedDiceIds = event.reactionData.evadedDiceIds || [];
            const newTotal = getAttackTotalAfterEvasion(evadedDiceIds);

            finalDamage = newTotal;
            effectiveAttackTotal = newTotal;
            const evadedAll = newTotal <= 0; // Todos los dados evadidos
            const res = applyCombatCalculations(targetToken, newTotal, event.weapon, {
                ballisticDamage: Math.min(newTotal, getBallisticWeaponDamageFromRoll(event.attackerRollResult, evadedDiceIds)),
            });
            blocksLost = res.lost;
            baseBlocksLost = res.baseLost || baseBlocksLost;
            traitBonuses = res.traitBonuses || traitBonuses;
            statusEffectsApplied.target = res.appliedStatusEffects || [];
            traitEffectsApplied.target = res.appliedTraitEffects || [];
            speedEffectsApplied.target = [buildRalentizadoSpeedEffect(res, targetToken)].filter(Boolean);
            updateTokenInList(targetTokenBase.id, {
                stats: res.stats,
                status: res.status,
                velocidad: getTargetVelocityAfterReaction(event.reactionData.yellowCost || 0) + getRalentizadoSpeedDelta(res)
            });
            const pushEffect = applyEmpujeEffect(res, attackerTokenBase, targetTokenBase);
            pushEffectsApplied.target = [pushEffect].filter(Boolean);
            if (evadedAll) {
                logText = `¡${targetToken.name} evadió completamente ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'}` : `el ataque de ${attackerToken.name}`}!`;
            } else {
                logText = `${targetToken.name} evadió parcialmente ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'} de ${attackerToken.name}` : `a ${attackerToken.name}`} y recibió ${newTotal} de daño (${res.lost.postura + res.lost.armadura + res.lost.vida} bloques).`;
            }
            logText = appendEmpujeLog(logText, pushEffect);
            logText = appendRalentizadoLog(logText, res, targetToken);
            setAttackerFluidaState(attackHasFluida ? createFluidaState(targetToken.id, event.fluidaMeta?.sourceWeapon || event.weapon, 'attack') : null);
            setTargetFluidaState(null);
        } else if (event.reactionType === 'parar') {
            const defenderAttrs = targetToken.attributes || targetToken.atributos || {};
            evadedDiceIds = event.reactionData?.evadedDiceIds || [];
            effectiveAttackTotal = getAttackTotalAfterEvasion(evadedDiceIds);
            const rawParryStepsData = buildLegacyParrySteps(event.reactionData);
            const attackHasDistancia = attackTraits.some((traitId) => normalizeCombatTraitId(traitId) === 'distancia')
                || hasCombatTrait(event.weapon, 'distancia');
            const parryStepsData = attackHasDistancia
                ? rawParryStepsData.filter((step) => hasCombatTrait(step.weapon, 'bloqueo'))
                : rawParryStepsData;
            const blockedByDistanciaCount = Math.max(0, rawParryStepsData.length - parryStepsData.length);
            const attackerRange = getCombatRangeData(event.weapon);
            const storedDistance = Number(event.distanceBetweenTokens);
            distanceBetweenTokens = Number.isFinite(storedDistance)
                ? storedDistance
                : getTokenDistanceInCells(attackerTokenBase, targetTokenBase, gridConfig);
            attackerRangeLabel = attackerRange.label;

            defenderSteps = parryStepsData.map((step, stepIndex) => {
                const counterArmorProtection = getArmorProtection(attackerToken, step.weapon, { armaduras });
                const defenderWeapon = applyNegatedTraitsToItem(
                    step.weapon,
                    counterArmorProtection.negatedTraits
                );
                const stepTraits = getItemTraits(defenderWeapon)
                    .filter((traitId) => normalizeCombatTraitId(traitId) !== 'elusion');
                const parryRollWeapon = buildGuardiaParryRollWeapon(defenderWeapon);
                const defenderRoll = rollAttack(parryRollWeapon, defenderAttrs);
                const stepDice = extractCombatRollDice(defenderRoll, `def-${stepIndex}`);
                const defenderRange = getCombatRangeData(defenderWeapon);
                const reachesAttacker = isWeaponWithinCombatRange(
                    defenderWeapon,
                    targetTokenBase,
                    attackerTokenBase,
                    gridConfig,
                    distanceBetweenTokens
                );

                defenderDice.push(...stepDice);
                defenderTotal += defenderRoll.total;

                return {
                    ...step,
                    weapon: defenderWeapon,
                    weaponName: defenderWeapon?.nombre || defenderWeapon?.name || step.weaponName || 'Arma',
                    total: defenderRoll.total,
                    rollResult: defenderRoll,
                    dice: stepDice,
                    traits: stepTraits,
                    rangeLabel: defenderRange.label,
                    reachesAttacker,
                };
            });

            defenderTraits = Array.from(new Set(defenderSteps.flatMap((step) => step.traits || [])));
            defenderWeaponSummary = buildParryWeaponSummaryLabel(defenderSteps)
                || event.reactionData?.weapon?.nombre
                || event.reactionData?.weapon?.name
                || 'su arma';
            defenderRangeLabel = Array.from(new Set(defenderSteps.map((step) => step.rangeLabel).filter(Boolean))).join(' · ') || null;

            const attackHasElusion = attackTraits.some((traitId) => normalizeCombatTraitId(traitId) === 'elusion')
                || hasCombatTrait(event.weapon, 'elusion');
            if (attackHasElusion && defenderDice.length > 0) {
                let highestParryDie = null;
                defenderSteps.forEach((step, stepIndex) => {
                    (step.dice || []).forEach((die, dieIndex) => {
                        const dieValue = Number(die?.value) || 0;
                        if (!highestParryDie || dieValue > highestParryDie.value) {
                            highestParryDie = {
                                die,
                                dieIndex,
                                stepIndex,
                                stepId: step.id || `parry-step-${stepIndex + 1}`,
                                value: dieValue,
                            };
                        }
                    });
                });

                if (highestParryDie && highestParryDie.value > 0) {
                    const originalDefenderTotal = defenderTotal;
                    const removedDieId = highestParryDie.die?.id || null;
                    defenderTotal = Math.max(0, defenderTotal - highestParryDie.value);
                    defenderSteps = defenderSteps.map((step, stepIndex) => {
                        if (stepIndex !== highestParryDie.stepIndex) return step;

                        return {
                            ...step,
                            total: Math.max(0, (Number(step.total) || 0) - highestParryDie.value),
                            dice: (step.dice || []).map((die, dieIndex) => {
                                if (dieIndex !== highestParryDie.dieIndex) return die;
                                return {
                                    ...die,
                                    eludedByElusion: true,
                                    elusionRemoved: true,
                                };
                            }),
                        };
                    });
                    defenderDice = defenderDice.map((die) => (
                        die?.id === removedDieId
                            ? { ...die, eludedByElusion: true, elusionRemoved: true }
                            : die
                    ));
                    elusionEffect = {
                        id: 'elusion',
                        label: 'Elusión',
                        dieId: removedDieId,
                        value: highestParryDie.value,
                        stepId: highestParryDie.stepId,
                        stepIndex: highestParryDie.stepIndex,
                        weaponName: event.weapon?.nombre || event.weapon?.name || null,
                        originalDefenderTotal,
                        defenderTotal,
                    };
                }
            }

            const reachableCounterSteps = defenderSteps.filter((step) => step.reachesAttacker);
            const counterWeapon = buildAggregateCombatWeapon(reachableCounterSteps);
            const reachableDefenderTotal = reachableCounterSteps.reduce(
                (sum, step) => sum + Math.max(0, Number(step.total) || 0),
                0
            );
            const lastNativeFluidaStep = [...defenderSteps].reverse().find((step) => hasNativeCombatTrait(step.weapon, 'fluida'));
            const diff = effectiveAttackTotal - defenderTotal;
            const evasionCost = Number(event.reactionData?.evadeCost);
            const yellowCost = Math.max(
                0,
                (Number.isFinite(evasionCost) ? evasionCost : evadedDiceIds.length) +
                defenderSteps.reduce((sum, step) => sum + Math.max(0, Number(step.yellowCost) || 0), 0)
            );
            const evasionLogPrefix = evadedDiceIds.length > 0
                ? `evadió ${evadedDiceIds.length} dado${evadedDiceIds.length === 1 ? '' : 's'} y `
                : '';
            const distanciaLogPrefix = blockedByDistanciaCount > 0
                ? `Distancia anuló ${blockedByDistanciaCount} parada${blockedByDistanciaCount === 1 ? '' : 's'} sin Bloqueo. `
                : '';
            const elusionLogPrefix = elusionEffect
                ? `Elusión retiró un dado de parada (${elusionEffect.value}). `
                : '';
            const traitLogPrefix = `${distanciaLogPrefix}${elusionLogPrefix}`;

            if (diff === 0) {
                finalDamage = 0;
                updateTokenInList(targetTokenBase.id, { velocidad: getTargetVelocityAfterReaction(yellowCost) });
                const defWeaponName = defenderWeaponSummary || 'su arma';
                logText = `${traitLogPrefix}${targetToken.name} ${evasionLogPrefix}realizó una parada perfecta ${isSweepAttack ? `contra ${attackModeLabel?.toLowerCase() || 'el barrido'}` : ''} con ${defWeaponName}.`;
                setAttackerFluidaState(null);
                setTargetFluidaState(lastNativeFluidaStep ? createFluidaState(attackerToken.id, lastNativeFluidaStep.weapon, 'parry') : null);
            } else if (diff > 0) {
                finalDamage = diff;
                const res = applyCombatCalculations(targetToken, diff, event.weapon, {
                    ballisticDamage: Math.min(diff, getBallisticWeaponDamageFromRoll(event.attackerRollResult, evadedDiceIds)),
                });
                blocksLost = res.lost;
                baseBlocksLost = res.baseLost || baseBlocksLost;
                traitBonuses = res.traitBonuses || traitBonuses;
                statusEffectsApplied.target = res.appliedStatusEffects || [];
                traitEffectsApplied.target = res.appliedTraitEffects || [];
                speedEffectsApplied.target = [buildRalentizadoSpeedEffect(res, targetToken)].filter(Boolean);
                updateTokenInList(targetTokenBase.id, {
                    stats: res.stats,
                    status: res.status,
                    velocidad: getTargetVelocityAfterReaction(yellowCost) + getRalentizadoSpeedDelta(res)
                });
                const pushEffect = applyEmpujeEffect(res, attackerTokenBase, targetTokenBase);
                pushEffectsApplied.target = [pushEffect].filter(Boolean);
                const defWeaponName = defenderWeaponSummary || 'su arma';
                logText = defenderSteps.length > 0
                    ? `${traitLogPrefix}${targetToken.name} ${evasionLogPrefix}paró ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'}` : ''} con ${defWeaponName} pero recibió ${diff} de daño (${res.lost.postura + res.lost.armadura + res.lost.vida} bloques).`
                    : `${traitLogPrefix}${targetToken.name} ${evasionLogPrefix}no pudo parar ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'}` : `el ataque de ${attackerToken.name}`} y recibió ${diff} de daño (${res.lost.postura + res.lost.armadura + res.lost.vida} bloques).`;
                logText = appendEmpujeLog(logText, pushEffect);
                logText = appendRalentizadoLog(logText, res, targetToken);
                setAttackerFluidaState(attackHasFluida ? createFluidaState(targetToken.id, event.fluidaMeta?.sourceWeapon || event.weapon, 'attack') : null);
                setTargetFluidaState(lastNativeFluidaStep ? createFluidaState(attackerToken.id, lastNativeFluidaStep.weapon, 'parry') : null);
            } else {
                const defWeaponName = defenderWeaponSummary || 'su arma';
                const reachableCounterDamage = Math.max(0, reachableDefenderTotal - effectiveAttackTotal);
                if (!counterWeapon || reachableCounterSteps.length === 0 || reachableCounterDamage <= 0) {
                    counterPreventedByRange = true;
                    finalDamage = 0;
                    updateTokenInList(targetTokenBase.id, { velocidad: getTargetVelocityAfterReaction(yellowCost) });
                    logText = `${traitLogPrefix}${targetToken.name} ${evasionLogPrefix}paró ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'}` : ''} con ${defWeaponName}, pero no pudo contraatacar porque solo las paradas con alcance suficiente pueden devolver daño (distancia real: ${distanceBetweenTokens}).`;
                } else {
                    counterDamage = reachableCounterDamage;
                    const counterBallisticDamage = reachableCounterSteps.reduce(
                        (sum, step) => sum + getBallisticWeaponDamageFromRoll(step.rollResult),
                        0
                    );
                    const res = applyCombatCalculations(attackerToken, counterDamage, counterWeapon, {
                        ballisticDamage: Math.min(counterDamage, counterBallisticDamage),
                    });
                    blocksLost = res.lost;
                    baseBlocksLost = res.baseLost || baseBlocksLost;
                    traitBonuses = res.traitBonuses || traitBonuses;
                    statusEffectsApplied.attacker = res.appliedStatusEffects || [];
                    traitEffectsApplied.attacker = res.appliedTraitEffects || [];
                    speedEffectsApplied.attacker = [buildRalentizadoSpeedEffect(res, attackerToken)].filter(Boolean);
                    updateTokenInList(attackerTokenBase.id, {
                        stats: res.stats,
                        status: res.status,
                        velocidad: (attackerTokenBase.velocidad || 0) + getRalentizadoSpeedDelta(res)
                    });
                    const pushEffect = applyEmpujeEffect(res, targetTokenBase, attackerTokenBase);
                    pushEffectsApplied.attacker = [pushEffect].filter(Boolean);
                    updateTokenInList(targetTokenBase.id, { velocidad: getTargetVelocityAfterReaction(yellowCost) });
                    logText = `${traitLogPrefix}¡${targetToken.name} ${evasionLogPrefix}paró ${isSweepAttack ? `el ${attackModeLabel?.toLowerCase() || 'barrido'}` : ''} con ${defWeaponName} y contraatacó a ${attackerToken.name} por ${counterDamage} daño (${res.lost.postura + res.lost.armadura + res.lost.vida} bloques)!`;
                    logText = appendEmpujeLog(logText, pushEffect);
                    logText = appendRalentizadoLog(logText, res, attackerToken);
                }
                setAttackerFluidaState(null);
                setTargetFluidaState(lastNativeFluidaStep ? createFluidaState(attackerToken.id, lastNativeFluidaStep.weapon, 'parry') : null);
            }
        } else {
            finalDamage = event.attackerRollResult.total;
            const res = applyCombatCalculations(targetToken, event.attackerRollResult.total, event.weapon, {
                ballisticDamage: Math.min(
                    Number(event.attackerRollResult?.total) || 0,
                    getBallisticWeaponDamageFromRoll(event.attackerRollResult)
                ),
            });
            blocksLost = res.lost;
            baseBlocksLost = res.baseLost || baseBlocksLost;
            traitBonuses = res.traitBonuses || traitBonuses;
            statusEffectsApplied.target = res.appliedStatusEffects || [];
            traitEffectsApplied.target = res.appliedTraitEffects || [];
            speedEffectsApplied.target = [buildRalentizadoSpeedEffect(res, targetToken)].filter(Boolean);
            updateTokenInList(targetTokenBase.id, {
                stats: res.stats,
                status: res.status,
                velocidad: (targetTokenBase.velocidad || 0) + getRalentizadoSpeedDelta(res)
            });
            const pushEffect = applyEmpujeEffect(res, attackerTokenBase, targetTokenBase);
            pushEffectsApplied.target = [pushEffect].filter(Boolean);
            logText = `${targetToken.name} recibió ${isSweepAttack ? `${attackModeLabel?.toLowerCase() || 'el barrido'} de ${attackerToken.name}` : `el golpe directo de ${attackerToken.name}`} por ${event.attackerRollResult.total} daño (${res.lost.postura + res.lost.armadura + res.lost.vida} bloques).`;
            logText = appendEmpujeLog(logText, pushEffect);
            logText = appendRalentizadoLog(logText, res, targetToken);
            setAttackerFluidaState(attackHasFluida ? createFluidaState(targetToken.id, event.fluidaMeta?.sourceWeapon || event.weapon, 'attack') : null);
            setTargetFluidaState(null);
        }

        updateTokenInList(attackerTokenBase.id, { fluidaState: nextAttackerFluidaState });
        updateTokenInList(targetTokenBase.id, { fluidaState: nextTargetFluidaState });

        const combatLogEntry = {
            sourceEventId: event.id,
            scenarioId: scenario.id,
            attackerId: attackerToken.id,
            targetId: targetToken.id,
            attackerName: attackerToken.name,
            targetName: targetToken.name,
            weaponName: event.weapon?.nombre || event.weapon?.name || null,
            attackMode: event.attackMode || null,
            abilityName: attackModeLabel,
            attackSourceLabel,
            attackSequence: Array.isArray(event.attackSequence) ? event.attackSequence : [],
            attackTotal: event.attackerRollResult.total,
            effectiveAttackTotal,
            attackTraits,
            attackerDice,
            defenderDice,
            defenderSteps: defenderSteps.map((step, stepIndex) => ({
                id: step.id || `parry-step-${stepIndex + 1}`,
                weaponName: step.weaponName || step.weapon?.nombre || step.weapon?.name || 'Arma',
                yellowCost: Math.max(0, Number(step.yellowCost) || 0),
                baseYellowCost: Math.max(0, Number(step.baseYellowCost) || Number(step.yellowCost) || 0),
                fluidaDiscountApplied: !!step.fluidaDiscountApplied,
                total: step.total || 0,
                dice: step.dice || [],
                traits: step.traits || [],
                rangeLabel: step.rangeLabel || null,
                reachesAttacker: !!step.reachesAttacker
            })),
            defenderTotal,
            defenderTraits,
            reactionType: event.reactionType || 'recibir',
            evadedDiceIds,
            evadedAll: event.reactionType === 'evadir' && finalDamage <= 0, // Flag para animación
            counterPreventedByRange,
            attackerRangeLabel,
            defenderRangeLabel,
            distanceBetweenTokens,
            elusionEffect,
            finalDamage,
            counterDamage,
            defenderWeapon: defenderWeaponSummary || event.reactionData?.weapon?.nombre || event.reactionData?.weapon?.name || null,
            blocksLost,
            baseBlocksLost,
            traitBonuses,
            traitEffectsApplied,
            statusEffectsApplied,
            speedEffectsApplied,
            pushEffectsApplied,
            damage: finalDamage,
            negatedTraits: event.negatedTraits || [],
            armorProtectionSource: event.armorProtectionSource || null,
            logText, // deferred for chat
            clientTimestamp: Date.now()
        };

        const updatedTarget = finalItems.find(i => i.id === targetTokenBase.id);
        const updatedAttacker = finalItems.find(i => i.id === attackerTokenBase.id);
        const buildCombatTokenUpdate = (baseToken, updatedToken) => {
            if (!updatedToken) return null;
            return {
                id: baseToken.id,
                stats: normalizeCombatStats(updatedToken),
                status: Array.isArray(updatedToken.status) ? normalizeTokenStatusIds(updatedToken.status) : [],
                velocidad: getCombatTokenSpeed(updatedToken),
                x: Number.isFinite(Number(updatedToken.x)) ? Number(updatedToken.x) : Number(baseToken.x) || 0,
                y: Number.isFinite(Number(updatedToken.y)) ? Number(updatedToken.y) : Number(baseToken.y) || 0,
                fluidaState: updatedToken.fluidaState ?? null
            };
        };

            await updateDoc(doc(db, 'combat_events', event.id), sanitizeForFirestore({
                status: 'resuelto',
                result: combatLogEntry,
                tokenUpdates: {
                    target: buildCombatTokenUpdate(targetToken, updatedTarget),
                    attacker: buildCombatTokenUpdate(attackerToken, updatedAttacker)
                }
            }));
        } catch (error) {
            console.error('Error resolviendo evento de combate:', error, event);
            try {
                await updateDoc(doc(db, 'combat_events', event.id), {
                    status: `${event.reactionType || 'recibir'}_pendiente`,
                    resolutionError: error?.message || 'Error desconocido al resolver el evento'
                });
            } catch (revertError) {
                console.error('No se pudo restaurar el estado pendiente del evento de combate:', revertError, event);
            }
        } finally {
            resolvingCombatEventsRef.current.delete(event.id);
        }
    };

    const handleSelectCombatQueueIndex = (queueIndex) => {
        const numericIndex = Number(queueIndex);
        if (!Number.isInteger(numericIndex) || numericIndex < 0) return;
        const nextEntry = effectiveCombatEventQueue[numericIndex];
        if (!nextEntry?.event?.id) return;
        setActiveCombatEventId(nextEntry.event.id);
    };

    const handleReaction = async (reaction) => {
        if (!activeCombatQueueEntry) return;
        const currentEvent = activeCombatQueueEntry;

        if (reaction.type === 'cerrar') {
            try {
                const ev = currentEvent.event;
                
                // 1. APLICAR CAMBIOS DIFERIDOS DE TOKENS (Stats, Velocidad, etc)
                let postReactionSpeedLoss = null;
                if (ev.tokenUpdates) {
                    const snap = await getDoc(doc(db, scenarioCollectionName, activeScenarioRef.current?.id || ev.scenarioId));
                    if (snap.exists()) {
                        let currentItems = snap.data().items || [];
                        let changed = false;
                        const reactionSpeedCost = Math.max(0, Number(ev.reactionData?.yellowCost) || 0);

                        if (ev.tokenUpdates.target) {
                            const sangradoPenalty = applySangradoSpeedPenalty(ev.tokenUpdates.target, reactionSpeedCost);
                            const targetUpdate = {
                                ...sangradoPenalty.token,
                                fluidaState: sangradoPenalty.token?.fluidaState ?? null
                            };

                            currentItems = currentItems.map(item => item.id === ev.tokenUpdates.target.id ? {
                                ...item,
                                stats: targetUpdate.stats,
                                status: targetUpdate.status,
                                velocidad: Math.max(Number(item.velocidad) || 0, Number(targetUpdate.velocidad) || 0),
                                x: Number.isFinite(Number(targetUpdate.x)) ? Number(targetUpdate.x) : item.x,
                                y: Number.isFinite(Number(targetUpdate.y)) ? Number(targetUpdate.y) : item.y,
                                fluidaState: targetUpdate.fluidaState ?? null
                            } : item);
                            changed = true;

                            if (sangradoPenalty.lostVida > 0) {
                                postReactionSpeedLoss = {
                                    target: {
                                        id: ev.tokenUpdates.target.id,
                                        source: 'sangrado',
                                        vida: sangradoPenalty.lostVida,
                                        blocksLost: {
                                            postura: 0,
                                            armadura: 0,
                                            vida: sangradoPenalty.lostVida
                                        }
                                    }
                                };
                            }
                        }

                        if (ev.tokenUpdates.attacker) {
                            currentItems = currentItems.map(item => item.id === ev.tokenUpdates.attacker.id ? {
                                ...item,
                                stats: ev.tokenUpdates.attacker.stats,
                                status: ev.tokenUpdates.attacker.status,
                                velocidad: ev.tokenUpdates.attacker.velocidad,
                                x: Number.isFinite(Number(ev.tokenUpdates.attacker.x)) ? Number(ev.tokenUpdates.attacker.x) : item.x,
                                y: Number.isFinite(Number(ev.tokenUpdates.attacker.y)) ? Number(ev.tokenUpdates.attacker.y) : item.y,
                                fluidaState: ev.tokenUpdates.attacker.fluidaState ?? null
                            } : item);
                            changed = true;
                        }

                        if (changed) {
                            await safePersistItems(snap.id, currentItems, snap.data().items);
                        }
                    }
                }

                // 2. APLICAR CHAT Y LOGS DIFERIDOS
                if (ev.result) {
                    const chatRef = doc(db, 'assetSidebar', 'chat');
                    const chatSnap = await getDoc(chatRef);
                    if (chatSnap.exists() && ev.result.logText) {
                        const messages = chatSnap.data().messages || [];
                        messages.push({ id: nanoid(), author: "Combate", text: ev.result.logText, timestamp: Date.now() });
                        await updateDoc(chatRef, { messages });
                    }

                    // Escribir en combat_log para el sistema (también gatillará animaciones HTML)
                    const logEntryToWrite = {
                        ...ev.result,
                        postReactionSpeedLoss,
                        clientTimestamp: Date.now(),
                    };
                    delete logEntryToWrite.logText; // no es necesario guardar esto permanente
                    await addDoc(collection(db, 'combat_log'), {
                        ...sanitizeForFirestore(logEntryToWrite),
                        timestamp: serverTimestamp()
                    });

                    // Limpieza opcional de logs
                    try {
                        const allLogsQuery = query(collection(db, 'combat_log'), orderBy('timestamp', 'desc'));
                        const allSnap = await getDocs(allLogsQuery);
                        const docsToDelete = allSnap.docs.slice(3);
                        for (const d of docsToDelete) {
                            await deleteDoc(doc(db, 'combat_log', d.id));
                        }
                    } catch (err) {
                        console.warn('Error limpiando combat_log antiguo:', err);
                    }
                }

                // Locally mark as resolved to ignore the 'removed' event logic
                locallyResolvedEventsRef.current.add(ev.id);
                setResolvedEventCount(prev => prev + 1);
                setCombatEventQueue(prev => prev.filter(e => e.event.id !== ev.id));
                await deleteDoc(doc(db, 'combat_events', ev.id));
            } catch (err) {
                console.warn('Error al borrar el evento resuelto:', err);
            }
            return;
        }

        try {
            const reactionBudget = getReactionBudgetForEvent(currentEvent.event);

            if (reaction.type === 'parar') {
                const parrySteps = buildLegacyParrySteps(reaction.data);
                const totalParryCost = parrySteps.reduce((sum, step) => sum + Math.max(0, Number(step?.yellowCost) || 0), 0);
                const evadedDiceIds = Array.isArray(reaction.data?.evadedDiceIds) ? reaction.data.evadedDiceIds : [];
                const totalReactionCost = totalParryCost + evadedDiceIds.length;

                if (reactionBudget <= 0) {
                    triggerToast("Sin reacción", "Ya igualas o superas la velocidad final del atacante.", 'warning');
                    return;
                }

                if (parrySteps.length === 0) {
                    triggerToast("Parada", "Debes añadir al menos una parada antes de confirmar.", 'warning');
                    return;
                }

                if (parrySteps.some((step) => hasCombatTrait(step?.weapon, 'sin guardia'))) {
                    triggerToast("Sin guardia", "Esa arma no puede usarse para parar.", 'warning');
                    return;
                }

                if (totalReactionCost > reactionBudget) {
                    triggerToast("Reacción insuficiente", `Solo puedes gastar hasta ${reactionBudget} de velocidad en esta reacción.`, 'warning');
                    return;
                }

                if (evadedDiceIds.length > 0) {
                    const scenarioItems = activeScenarioRef.current?.items || activeScenario?.items || [];
                    const liveTargetToken = scenarioItems.find((item) => item.id === currentEvent.event.targetId) || currentEvent.targetToken;
                    const liveAttackerToken = scenarioItems.find((item) => item.id === currentEvent.event.attackerId);
                    const targetCombatContext = getTokenDuelContextAgainstAttacker(liveTargetToken, liveAttackerToken, scenarioItems, gridConfig);
                    if (targetCombatContext.isDuelWithAttacker && !isSmallCombatToken(liveTargetToken, gridConfig)) {
                        triggerToast("Duelo", "No puedes evadir contra el atacante con el que estás en duelo.", 'warning');
                        return;
                    }
                }
            }

            if (reaction.type === 'evadir') {
                const evadedDiceIds = Array.isArray(reaction.data?.evadedDiceIds) ? reaction.data.evadedDiceIds : [];
                if (reactionBudget <= 0) {
                    triggerToast("Sin reacción", "Ya igualas o superas la velocidad final del atacante.", 'warning');
                    return;
                }

                if (evadedDiceIds.length > reactionBudget) {
                    triggerToast("Reacción insuficiente", `Solo puedes evadir hasta ${reactionBudget} dados en esta reacción.`, 'warning');
                    return;
                }

                const scenarioItems = activeScenarioRef.current?.items || activeScenario?.items || [];
                const liveTargetToken = scenarioItems.find((item) => item.id === currentEvent.event.targetId) || currentEvent.targetToken;
                const liveAttackerToken = scenarioItems.find((item) => item.id === currentEvent.event.attackerId);
                const targetCombatContext = getTokenDuelContextAgainstAttacker(liveTargetToken, liveAttackerToken, scenarioItems, gridConfig);
                if (targetCombatContext.isDuelWithAttacker && !isSmallCombatToken(liveTargetToken, gridConfig)) {
                    triggerToast("Duelo", "No puedes evadir contra el atacante con el que estás en duelo.", 'warning');
                    return;
                }
            }

            const safeReactionData =
                reaction.data == null
                    ? null
                    : JSON.parse(JSON.stringify(reaction.data));
            const scenarioItems = activeScenarioRef.current?.items || activeScenario?.items || [];
            const liveTargetToken = scenarioItems.find((item) => item.id === currentEvent.event.targetId) || currentEvent.targetToken;
            const reactionSpeedAlreadyCommitted = Math.max(0, Number(currentEvent.event.reactionSpeedAlreadyCommitted) || 0);
            const effectiveTargetVelBeforeReaction = (liveTargetToken?.velocidad || 0) + reactionSpeedAlreadyCommitted;

            await updateDoc(doc(db, 'combat_events', currentEvent.event.id), {
                status: `${reaction.type}_pendiente`,
                reactionType: reaction.type,
                reactionData: safeReactionData
                    ? {
                        ...safeReactionData,
                        effectiveTargetVelBeforeReaction,
                        reactionSpeedAlreadyCommitted,
                    }
                    : {
                        effectiveTargetVelBeforeReaction,
                        reactionSpeedAlreadyCommitted,
                    }
            });
        } catch (err) {
            console.error('Error al guardar la reacción de combate:', err, currentEvent.event.id, reaction);
            throw err;
        }

        // Ya NO quitamos el evento de la cola. Simplemente marcamos algo localmente si es necesario.
        // The modal will respond to the `status` change.
    };

    const handleEndTurn = async (tokenId) => {
        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario) return;

        const token = scenario.items.find(i => i.id === tokenId);
        if (!token) return;

        const pending = pendingTurnState && pendingTurnState.tokenId === tokenId ? pendingTurnState : null;
        const moveCost = pending ? pending.moveCost : 0;
        const actionCost = pending ? pending.actionCost : 0;
        const pendingActions = Array.isArray(pending?.actions) ? pending.actions : [];
        const didNothingThisTurn = !pending || (
            Math.max(0, Number(moveCost) || 0) <= 0 &&
            Math.max(0, Number(actionCost) || 0) <= 0 &&
            pendingActions.length === 0
        );
        const isStandingUp = !!pending?.actions?.some(action => action.actionId === 'stand_up');
        const pendingSangradoControl = getPendingSangradoControlCount(pending);
        const pendingSangradoControlSpeedCost = getPendingSangradoControlSpeedCost(pending);
        const currentFluidaState = getTokenFluidaState(token);
        const shouldClearFluidaOnCommit = !!pending?.actions?.some((action) => {
            if (action.actionId !== 'attack') return true;
            if (!hasNativeCombatTrait(action.weapon, 'fluida')) return true;
            if (!currentFluidaState) return false;
            return (
                action.targetId !== currentFluidaState.targetId ||
                getCombatWeaponName(action.weapon) !== currentFluidaState.weaponName
            );
        });

        const finalCost = (moveCost + actionCost) || 1;
        const finalX = pending ? pending.x : token.x;
        const finalY = pending ? pending.y : token.y;

        // Crear eventos de combate
        if (pending && pending.actions) {
            const groupedAttackEvents = new globalThis.Map();

            for (const [actionIndex, action] of pending.actions.entries()) {
                const speedSpentThroughAction = moveCost + pending.actions
                    .slice(0, actionIndex + 1)
                    .reduce((sum, queuedAction) => sum + Math.max(0, Number(queuedAction?.cost) || 0), 0);
                const attackerFinalVelForAction = (token.velocidad || 0) + speedSpentThroughAction;

                if (action.actionId === 'attack' && action.targetId) {
                    const targetToken = scenario.items.find(i => i.id === action.targetId);
                    if (targetToken) {
                        const attackerToken = enrichTokenWithCharacterData(token);
                        const targetCombatToken = enrichTokenWithCharacterData(targetToken);
                        const armorProtection = getArmorProtection(
                            targetCombatToken,
                            action.weapon,
                            { armaduras }
                        );
                        const effectiveWeapon = applyNegatedTraitsToItem(
                            action.weapon,
                            armorProtection.negatedTraits
                        );
                        const attackerAttrs =
                            attackerToken.attributes || attackerToken.atributos || {};
                        const attackerRollResult = rollAttack(
                            effectiveWeapon,
                            attackerAttrs
                        );
                        const actualDistance = getTokenDistanceInCells(token, targetToken, gridConfig);
                        const targetCurrentVel = targetToken.velocidad || 0;
                        const reactionBudget = Math.max(0, Math.round(attackerFinalVelForAction - targetCurrentVel));
                        const currentActionWeaponName = getCombatWeaponName(action.weapon);
                        const laterActionBreaksChain = pending.actions
                            .slice(actionIndex + 1)
                            .some((queuedAction) =>
                                queuedAction.actionId !== 'attack' ||
                                !hasNativeCombatTrait(queuedAction.weapon, 'fluida') ||
                                queuedAction.targetId !== action.targetId ||
                                getCombatWeaponName(queuedAction.weapon) !== currentActionWeaponName
                            );

                        const groupKey = `${token.id}:${targetToken.id}`;
                        const previousGroup = groupedAttackEvents.get(groupKey);
                        const attackStep = {
                            id: `attack-step-${actionIndex + 1}`,
                            weapon: effectiveWeapon || null,
                            weaponName: effectiveWeapon?.nombre || effectiveWeapon?.name || action.weapon?.nombre || action.weapon?.name || 'Arma',
                            rollResult: attackerRollResult,
                            cost: Math.max(0, Number(action.cost) || 0),
                            negatedTraits: armorProtection.negatedTraits || [],
                            armorProtectionSource: armorProtection.armorProtectionSource || null,
                            fluidaMeta: {
                                hasTrait: !!action.hasFluidaTrait,
                                hasNativeTrait: !!action.hasNativeFluidaTrait,
                                hasManualTrait: !!action.hasManualFluidaTrait,
                                sourceWeapon: action.weapon || null,
                                baseCost: action.baseCost ?? Math.max(1, getSpeedConsumption(action.weapon)),
                                discountApplied: !!action.fluidaDiscountApplied,
                                discountMode: action.fluidaDiscountMode || null,
                                laterActionBreaksChain
                            }
                        };

                        if (previousGroup) {
                            previousGroup.attackSteps.push(attackStep);
                            previousGroup.attackerFinalVel = attackerFinalVelForAction;
                            previousGroup.diffVelocidad = Math.abs(attackerFinalVelForAction - targetCurrentVel);
                            previousGroup.reactionBudget = reactionBudget;
                            previousGroup.distanceBetweenTokens = actualDistance;
                            previousGroup.fluidaMeta = attackStep.fluidaMeta;
                        } else {
                            groupedAttackEvents.set(groupKey, {
                                attackerId: token.id,
                                attackerName: token.name,
                                targetId: targetToken.id,
                                targetName: targetToken.name,
                                scenarioId: scenario.id,
                                attackerVel: token.velocidad || 0,
                                targetVel: targetCurrentVel,
                                attackerFinalVel: attackerFinalVelForAction,
                                diffVelocidad: Math.abs(attackerFinalVelForAction - targetCurrentVel),
                                reactionBudget,
                                distanceBetweenTokens: actualDistance,
                                fluidaMeta: attackStep.fluidaMeta,
                                attackSteps: [attackStep],
                            });
                        }
                    }
                }

                if (action.actionId === 'sweep' && Array.isArray(action.targetIds) && action.targetIds.length > 0) {
                    const attackerToken = enrichTokenWithCharacterData(token);
                    const attackerAttrs =
                        attackerToken.attributes || attackerToken.atributos || {};
                    const sweepWeapon = buildSweepWeapon(action.weapon);
                    const sweepId = nanoid();

                    for (const targetId of action.targetIds.slice(0, 3)) {
                        const targetToken = scenario.items.find((item) => item.id === targetId);
                        if (!targetToken) continue;

                        const targetCombatToken = enrichTokenWithCharacterData(targetToken);
                        const armorProtection = getArmorProtection(
                            targetCombatToken,
                            sweepWeapon,
                            { armaduras }
                        );
                        const effectiveSweepWeapon = applyNegatedTraitsToItem(
                            sweepWeapon,
                            armorProtection.negatedTraits
                        );
                        const attackerRollResult = rollAttack(
                            effectiveSweepWeapon,
                            attackerAttrs
                        );
                        const actualDistance = getTokenDistanceInCells(token, targetToken, gridConfig);
                        const targetCurrentVel = targetToken.velocidad || 0;
                        const reactionBudget = Math.max(0, Math.round(attackerFinalVelForAction - targetCurrentVel));

                        await addDoc(collection(db, 'combat_events'), {
                            ...sanitizeForFirestore({
                                attackerId: token.id,
                                attackerName: token.name,
                                targetId: targetToken.id,
                                targetName: targetToken.name,
                                attackerRollResult,
                                weapon: effectiveSweepWeapon || null,
                                negatedTraits: armorProtection.negatedTraits || [],
                                armorProtectionSource: armorProtection.armorProtectionSource || null,
                                status: 'esperando_reaccion',
                                scenarioId: scenario.id,
                                clientTimestamp: Date.now(),
                                attackerVel: token.velocidad || 0,
                                targetVel: targetToken.velocidad || 0,
                                attackerFinalVel: attackerFinalVelForAction,
                                diffVelocidad: Math.abs(attackerFinalVelForAction - targetCurrentVel),
                                reactionBudget,
                                distanceBetweenTokens: actualDistance,
                                attackMode: 'barrido',
                                abilityName: 'Barrido',
                                sweepMeta: {
                                    sweepId,
                                    side: action.sweepSide || null,
                                    areaCells: Array.isArray(action.sweepCells) ? action.sweepCells : [],
                                    sourceWeaponName: action.weapon?.nombre || action.weapon?.name || null,
                                    targetIds: action.targetIds.slice(0, 3)
                                },
                                fluidaMeta: null
                            }),
                            timestamp: serverTimestamp(),
                        });
                    }
                }
            }

            for (const groupedAttack of groupedAttackEvents.values()) {
                const attackSteps = groupedAttack.attackSteps || [];
                const aggregateWeapon = buildAggregateAttackWeapon(attackSteps);
                const attackerRollResult = combineAttackRollResults(attackSteps);
                const negatedTraits = Array.from(new Set(attackSteps.flatMap((step) => step.negatedTraits || [])));
                const armorProtectionSource = attackSteps
                    .map((step) => step.armorProtectionSource)
                    .filter(Boolean)
                    .join(' · ') || null;

                await addDoc(collection(db, 'combat_events'), {
                    ...sanitizeForFirestore({
                        attackerId: groupedAttack.attackerId,
                        attackerName: groupedAttack.attackerName,
                        targetId: groupedAttack.targetId,
                        targetName: groupedAttack.targetName,
                        attackerRollResult,
                        weapon: aggregateWeapon || null,
                        negatedTraits,
                        armorProtectionSource,
                        status: 'esperando_reaccion',
                        scenarioId: groupedAttack.scenarioId,
                        clientTimestamp: Date.now(),
                        attackerVel: groupedAttack.attackerVel,
                        targetVel: groupedAttack.targetVel,
                        attackerFinalVel: groupedAttack.attackerFinalVel,
                        diffVelocidad: groupedAttack.diffVelocidad,
                        reactionBudget: groupedAttack.reactionBudget,
                        distanceBetweenTokens: groupedAttack.distanceBetweenTokens,
                        attackSequence: attackSteps.map((step) => ({
                            id: step.id,
                            weaponName: step.weaponName,
                            cost: step.cost,
                            total: step.rollResult?.total || 0,
                            traits: getItemTraits(step.weapon),
                        })),
                        fluidaMeta: groupedAttack.fluidaMeta,
                    }),
                    timestamp: serverTimestamp(),
                });
            }
        }

        let endTurnSangradoAnimation = null;
        let endTurnPosturaRecoveryAnimation = null;
        const newItems = scenario.items.map(i => {
            if (i.id !== tokenId) return i;

            let nextItem = { ...i, x: finalX, y: finalY, velocidad: (token.velocidad || 0) + finalCost };

             if (shouldClearFluidaOnCommit) {
                nextItem = {
                    ...nextItem,
                    fluidaState: null
                };
            }

            if (isStandingUp) {
                const posturaMax = Number(i?.stats?.postura?.max ?? i?.stats?.postura?.current ?? 0);
                nextItem = {
                    ...nextItem,
                    status: (Array.isArray(i.status) ? i.status : []).filter(statusId => !PRONE_STATUS_IDS.includes(statusId)),
                    stats: {
                        ...i.stats,
                        postura: {
                            ...(i.stats?.postura || {}),
                            current: posturaMax
                        }
                    }
                };
            }

            if (didNothingThisTurn && !isStandingUp) {
                const posturaCurrent = Math.max(0, Number(nextItem?.stats?.postura?.current ?? 0));
                const posturaMax = Math.max(posturaCurrent, Number(nextItem?.stats?.postura?.max ?? posturaCurrent));
                const recoveredPostura = posturaMax > posturaCurrent ? 1 : 0;
                if (recoveredPostura > 0) {
                    nextItem = {
                        ...nextItem,
                        stats: {
                            ...nextItem.stats,
                            postura: {
                                ...(nextItem.stats?.postura || {}),
                                current: Math.min(posturaMax, posturaCurrent + recoveredPostura)
                            }
                        }
                    };
                    endTurnPosturaRecoveryAnimation = {
                        token: {
                            ...nextItem,
                            name: i.name
                        },
                        recoveredPostura
                    };
                }
            }

            const effectiveSangradoSpentSpeed = Math.max(0, finalCost - pendingSangradoControlSpeedCost);
            const sangradoPenalty = applySangradoSpeedPenalty(nextItem, effectiveSangradoSpentSpeed, {
                sangradoMitigation: pendingSangradoControl
            });
            if (sangradoPenalty.lostVida > 0) {
                endTurnSangradoAnimation = {
                    token: {
                        ...sangradoPenalty.token,
                        name: i.name
                    },
                    lostVida: sangradoPenalty.lostVida
                };
            }
            return sangradoPenalty.token;
        });

        setActiveScenario(prev => ({ ...prev, items: newItems }));
        setPendingTurnState(null);

        try {
            await safePersistItems(scenario.id, newItems, scenario.items);
            if (endTurnSangradoAnimation) {
                queueSangradoSpeedAnimation(endTurnSangradoAnimation.token, endTurnSangradoAnimation.lostVida, { shared: true });
            }
            if (endTurnPosturaRecoveryAnimation) {
                queuePosturaRecoveryAnimation(
                    endTurnPosturaRecoveryAnimation.token,
                    endTurnPosturaRecoveryAnimation.recoveredPostura,
                    { shared: true }
                );
            }
            const recoveryText = endTurnPosturaRecoveryAnimation ? ' · +1 Postura' : '';
            triggerToast("Turno Finalizado", `Total: +${finalCost} 🟡${recoveryText}`, 'success');
        } catch (error) {
            console.error("Error ending turn:", error);
        }
    };

    return {
        resetAllSpeed,
        handleCombatAction,
        consumeSweepTemplateEvent,
        handleSweepTemplateCancel,
        handleSweepTemplateClick,
        handleCancelAction,
        applySangradoSpeedPenalty,
        queueSangradoSpeedAnimation,
        resolveCombatEvent,
        handleSelectCombatQueueIndex,
        handleReaction,
        handleEndTurn,
    };
};
