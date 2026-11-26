import { applyHastePotion, applyVitalityPotion, clearPotionBuffs, getBuffPotionBlockReason, describeLifeLoss } from '../../tactical-shared/potionBuffs';
import { getCanvasCunningOption, isCanvasCunningPending, rollCanvasCunningDie, finishCanvasCunning } from './canvasCunning';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getCanvasSystem } from '../campaignSystem';
import { useCampaignAttackRuntime } from './useCampaignAttackRuntime';
import { applyAttackPoison, setCanvasPoison, isCanvasPoisoned } from '../../tactical-shared/poisonRules';
import { applyAttackBleeding, setCanvasBleeding, isCanvasBleeding, needsBleedingChoice, resolveBleedingChoice, bleedingActivationKey } from '../../tactical-shared/bleedingRules';
import { getAntidoteBlockReason } from '../item-use/antidoteRules';
import { presentTarIgnition, isTarIgnition, ignitionHasExpired, TAR_IGNITION_DURATION } from '../../tactical-shared/tarIgnitionPresentation';
import { attachTarIgnition, expandFireArea } from './canvasTarIgnition';
import { createAreaSceneItem } from '../../tactical-shared/areaPlacementSystem';
import { getTerrainMovementCost, getTerrainCells, resolveTarIgnition, isTarZone } from '../../tactical-shared/tarTerrain';
import { CANVAS_MUTABLE_PROTECTIONS, hasCanvasMutableArmor } from './canvasArmorRules';
import { standUpCanvasToken } from './canvasStandUp';
import { adjustCanvasPendingAttack, hasCanvasAttackAdjustment } from './canvasAttackAdjustment';
import { combineCanvasWeapons, getCanvasAttackOptions, resolveCanvasAttackSelection } from './canvasAttackSelection';
import { buildCanvasCombatLog, buildCanvasHealingPotionLog, buildCanvasArcaneMistLog, buildCanvasArcaneBarrierLog } from './canvasCombatLog';
import { getItemUseDefinition } from '../item-use/itemUseDefinitions';
import { calculateExplosiveBombPressure, getExplosiveBombDistance, getExplosiveBombMaxRange, getExplosiveBombTargets, resolveExplosiveBombAreaPlacements } from '../item-use/explosiveBombRules';
import { continueCanvasExplosiveBlast, startCanvasExplosiveBlast } from './canvasExplosiveBlast';
import { getCanvasPreparedSpells, getCanvasSpellTurnReason, isCanvasMage, isCanvasSpellPractice, resolveCanvasFireballTargetAttack, updateCanvasMageMana, validateCanvasFireball } from '../spells/canvasSpells';
import { resolveItemIdentityKeys } from '../../roguelite/featureSlots';
import { useCanvasSpellPresentation } from '../spells/canvasSpellPresentation';
import { canShowCanvasItemEffect } from '../../tactical-shared/canvasItemEffects';
import { resolveArcaneProjectileTarget, validateCanvasArcaneProjectile } from '../spells/arcaneProjectileRules';
import { createArcaneMistAreas, isCombatEndArcaneMist, validateCanvasArcaneMist } from '../spells/arcaneMistRules';
import { validateCanvasArcaneBarrier } from '../spells/arcaneBarrierRules';
import { applyArcaneBarrier, clearArcaneBarrier, hasArcaneBarrier, presentArcaneBarrierImpact } from '../spells/arcaneBarrierState';
import { consumeHealingPotionItem, getHealingPotionBlockReason, resolveHealingPotionItem } from '../item-use/healingPotionRules';
import { canRogueliteTokenClaimRun, createRogueliteActiveRunFromToken } from '../../roguelite/activeRun';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '../../../firebase';
import sanitize from '../../../utils/sanitize';
import { buildScenarioItemChanges, mergeScenarioItemsForPersist } from '../../../utils/scenarioSync';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import {
  cancelQueuedCanvasAttack,
  canAdvanceCanvasRound,
  consumeItemUseResource,
  createCanvasCombatState,
  finishCanvasCombat,
  getAvailableMovement,
  getMovementAllowance,
  getMovementBase,
  markParticipantActed,
  normalizeActionDiceProfile,
  pruneCombatState,
  queueCanvasAttack,
  rechargeEnemyMovementWithAttack,
  recordParticipantMovement,
  resolveQueuedCanvasAttack,
  rollDiceProfile,
  rollParticipantActionDice,
  setActionDieStatus,
  setEnemyActionStatus,
  setParticipantMovementModifier,
  setParticipantMovementResource,
  spendActionDieForSprint,
  startPreparedCanvasCombat,
  startNextRound,
  submitActionDice,
  supportsCanvasInitiative,
  undoLastActivation,
  undoParticipantActivation,
  undoParticipantMovement,
  updateCanvasCombatMembership,
} from './canvasCombatState';
import {
  isCanvasProne,
  calculateCanvasAttackPressure,
  getCanvasCounterattackWeapons,
  getPreferredCanvasCounterattackWeapon,
  getCanvasDefenseThreatDice,
  getCanvasDefensiveEquipment,
  getDefaultCanvasEnemyDefenseSelection,
  getEnemyActiveDefenseEligibility,
  isCanvasShield,
  hasCanvasWeaponTrait,
  getCanvasWeaponActionCost,
  getCanvasWeaponAvailability,
  getCanvasWeaponIdentity,
  evaluateCanvasThrownRange,
  getUsableDefenseDice,
  parseWeaponDiceProfile,
  normalizeCanvasThreatSelection,
  resolveCanvasAttackDamage,
  resolveCanvasEnemyDefenseSelection,
  rollCanvasEnemyDefense,
  rollCanvasThreatDice,
  rollCriticalWeaponDice,
  rollWeaponDice,
} from './canvasAttackRules';

import { rollDicePool, toggleRollDieExcluded } from '../dice/canvasDiceEngine';
import { canTokenSeeThroughSmoke, removeHiddenStatusFromToken, tokenHasHiddenStatus } from '../../tactical-shared/tokenVisibilityAccess';
import { areTokensAllied, getCombatRenderPlacement } from '../../tactical-shared/legacyCombatRules';
import {
  canvasInventoryItemsMatch,
  detachCanvasInventoryItem,
} from '../canvasInventoryTransfer';

const STATUS_ORDER = ['available', 'committed', 'spent'];
const isOpenCombat = combat => ['setup', 'active'].includes(combat?.status);
const isSameRound = (left, right) => left?.startedAt === right?.startedAt && left?.round === right?.round;
const isSameCombatPhase = (left, right) => isSameRound(left, right) && left?.status === right?.status
  && left?.roundPhase === right?.roundPhase
  && left?.pendingAttack?.id === right?.pendingAttack?.id && left?.pendingAttack?.status === right?.pendingAttack?.status;
const isSameCombatWrite = (left, right) => isSameCombatPhase(left, right)
  && (left?.writeRevision || 0) === (right?.writeRevision || 0);
const isItemUsePractice = (combat) => !['setup', 'active'].includes(combat?.status);
const isHealingPotion = item => getItemUseDefinition(item)?.id === 'healing-potion';
const isAntidote = item => getItemUseDefinition(item)?.id === 'antidote';
const isPreparedConsumable = item => ['heal', 'remove-poison', 'remove-bleeding', 'haste', 'temporary-life'].includes(getItemUseDefinition(item)?.effect?.type);
const isExplosiveBomb = item => getItemUseDefinition(item)?.id === 'explosive-bomb';
const canUseHealingPotionInCombat = (tokenId, combat) => {
  const block = combat?.blocks?.[combat.activeBlockIndex];
  return combat?.status === 'active' && combat.roundPhase === 'turns' && !combat.pendingAttack && !combat.arcaneChain
    && (block?.memberIds || block?.tokenIds || []).includes(tokenId)
    && !(block?.actedIds || block?.completedTokenIds || []).includes(tokenId);
};
const healingPotionResources = (token, combat, practice) => {
  if (isItemUsePractice(combat)) return practice ? healingPotionResources(token, practice.combat)
    .map(resource => ({ ...resource, practice: true, practiceId: practice.id })) : [];
  if (!canUseHealingPotionInCombat(token?.id, combat)) return [];
  const participant = combat.participants?.[token?.id];
  if (!participant) return [];
  const context = { combatStartedAt: combat.startedAt, combatRound: combat.round };
  if (participant.side === 'enemies') {
    const action = participant.enemyActions?.find(candidate => candidate.id === 'attack');
    const movement = participant.enemyActions?.find(candidate => candidate.id === 'movement');
    const prefix = `item-${token.id}-${combat.startedAt}-${combat.round}`;
    return [
      ...(action ? [{ ...context, id: `${prefix}-action`, kind: 'enemy-action', actionId: 'attack',
        status: action.status, label: 'Acción principal', value: 0 }] : []),
      ...(movement ? [{ ...context, id: `${prefix}-movement`, kind: 'enemy-movement', actionId: 'movement',
        status: getMovementAllowance(participant) > Number(participant.movementRuntime?.spent || 0) ? movement.status : 'spent',
        label: 'Movimiento', value: 0 }] : []),
      ...(participant.threatDie ? [{ ...context, id: `${prefix}-reserve`, kind: 'threat-die', die: participant.threatDie,
        sides: Number(participant.threatDie.slice(1)), value: participant.threatValue,
        status: participant.threatValue == null ? 'spent' : 'available', label: 'Reserva de Amenaza' }] : []),
      ...[4, 6, 8, 10, 12, 20].map(sides => ({ ...context, id: `${prefix}-manual-d${sides}`,
        kind: 'manual-threat', die: `d${sides}`, sides, value: 0, status: 'available', label: 'Amenaza puntual' })),
    ];
  }
  return (participant.actionDice || []).map(die => ({ ...die, ...context, kind: 'action-die' }));
};
const matchesHealingResource = (candidate, selected) => candidate.id === selected?.id
  && candidate.kind === selected?.kind && candidate.value === selected?.value && candidate.status === 'available'
  && candidate.sides === selected?.sides && Boolean(candidate.practice) === Boolean(selected?.practice)
  && candidate.practiceId === selected?.practiceId
  && candidate.combatStartedAt === selected?.combatStartedAt && candidate.combatRound === selected?.combatRound;

const getExplosiveResource = (combat, tokenId, selected, practiceResources = null) => {
  if (practiceResources) return practiceResources.find(candidate => candidate.id === selected?.id
    && candidate.kind === selected?.kind && candidate.value === selected?.value
    && candidate.status === 'available' && selected?.practice) || null;
  const participant = combat?.participants?.[tokenId];
  if (!participant) return null;
  if (participant.side === 'players' && selected?.kind === 'action-die') {
    const die = participant.actionDice?.find(candidate => candidate.id === selected.id
      && candidate.value === selected.value && candidate.status === 'available');
    return die ? { ...die, kind: 'action-die' } : null;
  }
  if (participant.side === 'enemies' && selected?.kind === 'threat-die'
    && participant.threatValue === selected.value
    && participant.threatValue != null
    && participant.enemyActions?.some(action => action.id === 'attack' && action.status === 'available')) {
    return { ...selected, status: 'available' };
  }
  return null;
};

const createExplosivePracticeCombat = (items, sourceId, resources, now, rollDefenses = true) => {
  const base = createCanvasCombatState(items, { now, includeNonParticipants: true });
  const participants = Object.fromEntries(Object.entries(base.participants).map(([id, participant]) => {
    if (participant.side === 'enemies') return [id, {
      ...participant,
      ...(id === sourceId && resources[0]?.kind === 'threat-die'
        ? { threatValue: resources[0].value } : {}),
    }];
    const token = items.find(item => item.id === id);
    const profile = normalizeActionDiceProfile(token?.actionDice);
    const dice = id === sourceId
      ? resources.map(resource => ({ ...resource, practice: undefined, status: 'available' }))
      : (rollDefenses ? (profile.length ? profile : ['d6', 'd6', 'd6']) : []).map((die, index) => ({
        id: `blast-practice-${now}-${id}-${index}`, die, sides: Number(die.slice(1)),
        value: rollDiceProfile([die])[0], status: 'committed',
      }));
    return [id, { ...participant, actionDice: dice, awaitingRoll: false }];
  }));
  return { ...base, status: 'active', roundPhase: 'turns', participants,
    blocks: [{ id: `blast-practice-${now}`, memberIds: [sourceId], actedIds: [] }], activeBlockIndex: 0 };
};

const canControlToken = (token, isPlayerView, playerName) => {
  if (!isPlayerView) return true;
  if (!token) return false;
  return (Array.isArray(token.controlledBy) && token.controlledBy.includes(playerName))
    || token.linkedClassOwner === playerName;
};

const defenseSelectionSignature = selection => JSON.stringify(selection.items.map(item => ({
  id: getCanvasWeaponIdentity(item),
  hands: resolveEquipmentHandsRequired(item),
  shield: isCanvasShield(item),
  profile: isCanvasShield(item) ? [] : parseWeaponDiceProfile(item),
})));

const defaultEnemyShieldSelection = token => {
  const defaults = resolveCanvasEnemyDefenseSelection({ token, equipmentIds: getDefaultCanvasEnemyDefenseSelection(token) });
  return resolveCanvasEnemyDefenseSelection({ token, equipmentIds: defaults.shield ? [getCanvasWeaponIdentity(defaults.shield)] : [] });
};

// A shield can remain passive on the counterattack only if the triggering attack
// left a hand free. The token's stored CD remains the unmodified base value.
const counterattackShieldBonus = (token, pending) => {
  if (token?.profileType !== 'rogueliteEnemy') return 0;
  const passive = defaultEnemyShieldSelection(token);
  if (!passive.shield) return 0;
  const attackWeapons = pending.attackParts?.length
    ? pending.attackParts.map(part => part.weapon)
    : pending.weapon?.attackWeapons || (pending.weapon ? [pending.weapon] : []);
  const selection = resolveCanvasEnemyDefenseSelection({ token,
    equipmentIds: [...attackWeapons.map(getCanvasWeaponIdentity), getCanvasWeaponIdentity(passive.shield)],
  });
  return selection.legal ? selection.cdBonus : 0;
};

const saveCombatDoc = async (scenarioRef, nextCombat) => {
  try {
    await updateDoc(scenarioRef, {
      canvasCombat: sanitize(nextCombat),
      combatModifiedAt: Date.now(),
    });
  } catch (_error) {
    await setDoc(scenarioRef, {
      canvasCombat: sanitize(nextCombat),
      combatModifiedAt: Date.now(),
    }, { merge: true });
  }
};

const savePracticeCombatDoc = async (scenarioRef, nextCombat) => {
  const payload = {
    canvasPracticeCombat: sanitize(nextCombat),
    practiceCombatModifiedAt: Date.now(),
  };
  try {
    await updateDoc(scenarioRef, payload);
  } catch (_error) {
    await setDoc(scenarioRef, payload, { merge: true });
  }
};

const publishSprintAnimation = async ({ scenarioId, token, movement, mode }) => {
  if (!scenarioId || !token?.id) return;
  const clientTimestamp = Date.now();
  try {
    const effectRef = await addDoc(collection(db, 'combat_effects'), {
      scenarioId,
      sourceEventId: `canvas-sprint-${token.id}-${clientTimestamp}`,
      reactionType: 'sprint',
      targetId: token.id,
      targetName: token.name || 'Token',
      attackerId: null,
      sprintMovement: Math.max(0, Number(movement) || 0),
      sprintMode: mode === 'recharge' ? 'recharge' : 'additional',
      clientTimestamp,
      timestamp: serverTimestamp(),
    });
    if (effectRef?.id) {
      setTimeout(() => {
        deleteDoc(doc(db, 'combat_effects', effectRef.id)).catch(() => {});
      }, 12000);
    }
  } catch (error) {
    console.warn('No se pudo publicar la animación de Correr:', error);
  }
};

const syncMovementCharacteristic = (token, participant, { reset = false } = {}) => {
  if (!token || !participant?.movementRuntime) return token;
  const runtime = participant.movementRuntime;
  const base = Math.max(0, Number(runtime.base) || 0);
  const originalMax = Math.max(0, Number(runtime.statMax) || base);
  const current = reset ? base : getAvailableMovement(participant);
  const max = reset ? Math.max(originalMax, base) : Math.max(originalMax, getMovementAllowance(participant));

  return {
    ...token,
    stats: {
      ...(token.stats || {}),
      movimiento: {
        ...(token.stats?.movimiento || {}),
        label: token.stats?.movimiento?.label || 'Movimiento',
        current,
        max,
      },
    },
  };
};

const useRogueliteCombatRuntime = ({
  activeScenario,
  activeScenarioRef,
  currentUserId,
  isPlayerView,
  playerName,
  gridConfig,
  selectedTokenIds = [],
  showHiddenTokens = false,
  safePersistItems,
  scenarioCollectionName,
  setActiveScenario,
  triggerToast,
}) => {
  const spellPresentation = useCanvasSpellPresentation(activeScenario?.id, activeScenario?.canvasSpellEffect);
  const trackedSpellEffect = useMemo(() => {
    const effect = spellPresentation.effect;
    if (effect?.spellId !== 'runic-barrier') return effect;
    const target = activeScenario?.items?.find(item => item.id === effect.targetId);
    if (!target) return null;
    const position = getCombatRenderPlacement(target, activeScenario.items, gridConfig);
    const width = target.width || 50, height = target.height || 50;
    if (position.x === effect.placement.x && position.y === effect.placement.y
      && width === effect.placement.width && height === effect.placement.height) return effect;
    return { ...effect, placement: { ...effect.placement, ...position, width, height } };
  }, [activeScenario?.items, gridConfig, spellPresentation.effect]);
  const [attackDraft, setAttackDraft] = useState(null);
  const [practiceCombat, setPracticeCombat] = useState(null);
  const resolvingAttackRef = useRef(null);
  const confirmingAttackRef = useRef(false);
  const attackRollAttemptRef = useRef(null);
  const cunningBusyRef = useRef(false);
  const cunningRollRef = useRef(null);
  const [isResolvingCunning, setIsResolvingCunning] = useState(false);
  const bleedingBusyRef = useRef(false);
  const [isResolvingBleeding, setIsResolvingBleeding] = useState(false);
  const rollingDefenseRef = useRef(null);
  const defenseRollAttemptRef = useRef(null);
  const [isRollingEnemyDefense, setIsRollingEnemyDefense] = useState(false);
  const [isConfirmingAttack, setIsConfirmingAttack] = useState(false);
  const localCombatRef = useRef(activeScenario?.canvasCombat || null);
  const localItemsRef = useRef(activeScenario?.items || []);
  const itemPracticeRef = useRef(null);
  const itemPracticeSequenceRef = useRef(0);
  const potionPracticeRef = useRef(null);
  const potionUseAttemptsRef = useRef(new Map());
  const potionUseBusyRef = useRef(new Set());
  const explosiveUseAttemptsRef = useRef(new Map());
  const explosiveUseBusyRef = useRef(new Set());
  const spellCastAttemptsRef = useRef(new Map());
  const spellPracticeRef = useRef(null);
  const spellCastBusyRef = useRef(false);
  const [isCastingSpell, setIsCastingSpell] = useState(false);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    setAttackDraft(null);
    itemPracticeRef.current = null;
    potionPracticeRef.current = null;
    spellPracticeRef.current = null;
  }, [activeScenario?.id, activeScenario?.rulesSystem]);

  useEffect(() => {
    itemPracticeRef.current = null;
    potionPracticeRef.current = null;
    spellPracticeRef.current = null;
  }, [activeScenario?.id, activeScenario?.canvasCombat?.status]);

  useEffect(() => {
    localItemsRef.current = activeScenario?.items || [];
  }, [activeScenario?.items]);

  useEffect(() => {
    const remoteCombat = activeScenario?.canvasCombat;
    if (!remoteCombat) {
      localCombatRef.current = null;
      return;
    }
    const pruned = pruneCombatState(remoteCombat, activeScenario?.items || []);
    localCombatRef.current = pruned;
    if (pruned !== remoteCombat) setActiveScenario(current => current?.canvasCombat === remoteCombat
      ? { ...current, canvasCombat: pruned } : current);
  }, [activeScenario?.canvasCombat, activeScenario?.items, setActiveScenario]);

  useEffect(() => {
    const remotePractice = activeScenario?.canvasPracticeCombat;
    setPracticeCombat(remotePractice
      ? pruneCombatState(remotePractice, activeScenario?.items || [])
      : null);
  }, [activeScenario?.canvasPracticeCombat, activeScenario?.items]);

  useEffect(() => {
    if (isPlayerView || !activeScenario?.id) return undefined;
    const effects = (activeScenario.items || []).filter(isTarIgnition);
    if (!effects.length) return undefined;
    const scenarioId = activeScenario.id;
    const deadline = Math.min(...effects.map(item => item.areaEffect.startedAt + TAR_IGNITION_DURATION));
    const timer = setTimeout(async () => {
      try {
        await writeQueueRef.current;
        const expiredIds = await runTransaction(db, async transaction => {
          const ref = doc(db, scenarioCollectionName, scenarioId);
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) return [];
          const items = snapshot.data().items || [];
          const expired = items.filter(item => ignitionHasExpired(item)).map(item => item.id);
          if (expired.length) transaction.update(ref, { items: sanitize(items.filter(item => !expired.includes(item.id))) });
          return expired;
        });
        if (expiredIds.length) setActiveScenario(current => current?.id === scenarioId
          ? { ...current, items: current.items.filter(item => !expiredIds.includes(item.id)) } : current);
      } catch (error) {
        // Already invisible on every client; a later scene update retries cleanup.
        console.warn('No se pudo limpiar la presentación de brea', error);
      }
    }, Math.max(50, deadline - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [activeScenario?.id, activeScenario?.items, isPlayerView, scenarioCollectionName, setActiveScenario]);

  const rawCombatState = activeScenario?.canvasCombat || null;
  const combatState = useMemo(() => {
    if (!rawCombatState) return null;
    return pruneCombatState(rawCombatState, activeScenario?.items || []);
  }, [rawCombatState, activeScenario?.items]);

  const persistCombat = useCallback(async (nextCombat) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;

    localCombatRef.current = nextCombat;
    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
    ));

    try {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await saveCombatDoc(scenarioRef, nextCombat);
      return true;
    } catch (error) {
      console.error('No se pudo guardar el combate del Canvas:', error);
      triggerToast('No se pudo sincronizar la ronda', error.message || 'Reinténtalo', 'error');
      return false;
    }
  }, [
    activeScenario,
    activeScenarioRef,
    scenarioCollectionName,
    setActiveScenario,
    triggerToast,
  ]);

  const persistPracticeCombat = useCallback((nextCombat) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;

    setPracticeCombat(nextCombat);
    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasPracticeCombat: nextCombat } : current
    ));
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      await savePracticeCombatDoc(doc(db, scenarioCollectionName, scenario.id), nextCombat);
    }).catch((error) => {
      console.error('No se pudo sincronizar el ataque de prueba:', error);
      triggerToast('No se pudo sincronizar el ataque', error?.message || 'Reinténtalo', 'error');
    });
    return true;
  }, [activeScenario, activeScenarioRef, scenarioCollectionName, setActiveScenario, triggerToast]);

  const editCampaignCombat = useCallback((scenario, edit, errorTitle = 'No se pudo sincronizar la ronda') => {
    const operation = writeQueueRef.current.then(async () => {
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists() || getCanvasSystem(snapshot.data()) !== 'campaign') return null;
        const fresh = snapshot.data();
        const items = fresh.items || [];
        const current = pruneCombatState(fresh.canvasCombat, items);
        const change = edit(current, items);
        if (!change) return null;
        const patch = {};
        if (change.combat && change.combat !== current) {
          patch.canvasCombat = { ...change.combat, writeRevision: (current?.writeRevision || 0) + 1 };
          patch.combatModifiedAt = Math.max(Date.now(), Number(fresh.combatModifiedAt || 0) + 1);
        }
        let itemChanges = null;
        if (change.items && change.items !== items) {
          itemChanges = buildScenarioItemChanges(change.items, items);
        }
        if (itemChanges && (itemChanges.modifiedOrAdded.length || itemChanges.deletedIds.length)) {
          patch.items = change.items;
        }
        if (!Object.keys(patch).length) return null;
        patch.lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
        patch.lastModifiedBy = isPlayerView
          ? `player:${playerName || currentUserId || 'unknown'}` : `master:${currentUserId || 'master'}`;
        patch.lastModifiedByRole = isPlayerView ? 'player' : 'master';
        patch.lastModifiedItemIds = itemChanges
          ? [...itemChanges.modifiedOrAdded.map(item => item.id), ...itemChanges.deletedIds] : [];
        transaction.update(ref, sanitize(patch));
        return { patch, combat: patch.canvasCombat || current, previousItems: items, itemChanges };
      });
      if (!saved) return false;
      if (activeScenarioRef.current?.id === scenario.id
        && Number(activeScenarioRef.current?.lastModified || 0) <= saved.patch.lastModified) {
        localCombatRef.current = saved.combat || null;
        setActiveScenario(active => {
          if (active?.id !== scenario.id || getCanvasSystem(active) !== 'campaign') return active;
          const { patch, combat, previousItems, itemChanges } = saved;
          if (Number(active.lastModified || 0) > patch.lastModified) return active;
          if (!patch.items) return { ...active, ...patch, canvasCombat: combat };
          const { modifiedOrAdded, deletedIds } = itemChanges;
          const items = mergeScenarioItemsForPersist(active.items || [], modifiedOrAdded, deletedIds, previousItems);
          localItemsRef.current = items;
          return { ...active, ...patch, items, canvasCombat: combat };
        });
      }
      return true;
    }).catch(error => {
      triggerToast(errorTitle, error?.message || 'Reinténtalo', 'warning');
      return false;
    });
    writeQueueRef.current = operation;
    return operation;
  }, [activeScenarioRef, currentUserId, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const updateCombat = useCallback((updater) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    const current = localCombatRef.current || scenario?.canvasCombat;
    if (!current) return false;
    if (getCanvasSystem(scenario) === 'campaign') {
      return editCampaignCombat(scenario, (fresh, items) => {
        if (!isSameRound(current, fresh) || !isOpenCombat(fresh)) return null;
        return { combat: updater(fresh, items) };
      });
    }
    const next = updater(current);
    if (!next || next === current) return false;

    localCombatRef.current = next;
    setActiveScenario((active) => (
      active?.id === scenario.id ? { ...active, canvasCombat: next } : active
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      if (getCanvasSystem(activeScenarioRef.current) !== getCanvasSystem(scenario)) return;
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await saveCombatDoc(scenarioRef, next);
    }).catch((error) => {
      console.error('No se pudo actualizar la ronda del Canvas:', error);
      triggerToast('No se pudo sincronizar la ronda', error?.message || 'Reinténtalo', 'error');
    });

    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    editCampaignCombat,
    scenarioCollectionName,
    setActiveScenario,
    triggerToast,
  ]);

  const persistCombatAndItems = useCallback((scenario, nextCombat, nextItems, errorTitle = 'No se pudo sincronizar la ronda', options = {}) => {
    if (!scenario?.id || !nextCombat) return false;
    if (getCanvasSystem(scenario) === 'campaign') {
      const current = localCombatRef.current || scenario.canvasCombat;
      const baseItems = options.baseItems || localItemsRef.current || scenario.items || [];
      const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(nextItems, baseItems);
      const saved = editCampaignCombat(scenario, (fresh, items) => {
        if (!isSameCombatWrite(current, fresh)) throw new Error('La ronda se ha actualizado. Vuelve a intentar la acción.');
        return { combat: nextCombat, items: mergeScenarioItemsForPersist(items, modifiedOrAdded, deletedIds, baseItems) };
      }, errorTitle);
      if (!options.persistRuntime) return saved;
      return saved.then(async committed => {
        if (committed) await safePersistItems(scenario.id, nextItems, scenario.items || [],
          options.modifiedIds || [], { persistRuntime: true });
        return committed;
      });
    }
    localCombatRef.current = nextCombat;
    localItemsRef.current = nextItems;
    setActiveScenario((active) => (
      active?.id === scenario.id
        ? { ...active, items: nextItems, canvasCombat: nextCombat }
        : active
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      if (getCanvasSystem(activeScenarioRef.current) !== getCanvasSystem(scenario)) return;
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await updateDoc(scenarioRef, {
        items: nextItems,
        canvasCombat: nextCombat,
        combatModifiedAt: Date.now(),
      });
      if (options.persistRuntime) {
        await safePersistItems(
          scenario.id,
          nextItems,
          scenario.items || [],
          options.modifiedIds || [],
          { persistRuntime: true },
        );
      }
    }).catch((error) => {
      console.error(`${errorTitle}:`, error);
      triggerToast(errorTitle, error?.message || 'Reinténtalo', 'error');
    });
    return true;
  }, [activeScenarioRef, editCampaignCombat, safePersistItems, scenarioCollectionName, setActiveScenario, triggerToast]);

  const startCombat = useCallback(() => {
    if (isPlayerView) return;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return;
    if (isOpenCombat(localCombatRef.current || scenario.canvasCombat)) return false;
    if (getCanvasSystem(scenario) === 'campaign') {
      return editCampaignCombat(scenario, (current, items) => {
        if (isOpenCombat(current)) return null;
        const combat = createCanvasCombatState(items, { rulesSystem: 'campaign', requiresStart: true });
        if (!Object.keys(combat.participants).length) throw new Error('Habilita al menos una ficha para la iniciativa.');
        const prepared = items.map(item => combat.participants[item.id] && hasCanvasMutableArmor(item)
          ? { ...item, armorProtectionChoice: null } : item);
        return { combat, items: prepared };
      }, 'No se pudo preparar la iniciativa');
    }
    const next = createCanvasCombatState(scenario.items || [], { rulesSystem: getCanvasSystem(scenario) });
    const items = (scenario.items || []).map(item => updateCanvasMageMana(hasCanvasMutableArmor(item)
      ? { ...item, armorProtectionChoice: null } : item, 'start'));
    persistCombatAndItems(scenario, next, items, 'No se pudo iniciar el combate', {
      persistRuntime: true, modifiedIds: items.filter(isCanvasMage).map(item => item.id),
    });
    triggerToast(
      'Combate preparado',
      next.roundPhase === 'rolling' ? 'Esperando las tiradas iniciales' : 'Orden de iniciativa listo',
      'success',
    );
  }, [activeScenario, activeScenarioRef, editCampaignCombat, isPlayerView, persistCombatAndItems, triggerToast]);

  const startPreparedCombat = useCallback(() => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (isPlayerView || !scenario?.id) return false;
    const expected = localCombatRef.current || scenario.canvasCombat;
    return editCampaignCombat(scenario, (current, items) => (
      isSameRound(expected, current) ? { combat: startPreparedCanvasCombat(current, items) } : null
    ));
  }, [activeScenario, activeScenarioRef, editCampaignCombat, isPlayerView]);

  const setCombatParticipation = useCallback((tokenId, enabled, { joinNow = false } = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (isPlayerView || !scenario?.id) return false;
    const expected = localCombatRef.current || scenario.canvasCombat;
    return editCampaignCombat(scenario, (combat, items) => {
      const token = items.find(item => item.id === tokenId);
      if (!supportsCanvasInitiative(token, 'campaign')) return null;
      if (joinNow && (!isOpenCombat(combat) || !isSameRound(expected, combat))) {
        throw new Error('La ronda ha cambiado. Comprueba la iniciativa y vuelve a intentarlo.');
      }
      const preference = (token.participatesInCombat !== false) === enabled ? token : { ...token, participatesInCombat: enabled };
      const next = updateCanvasCombatMembership(combat, preference, { joinNow });
      const entrant = !combat?.participants?.[tokenId] && next?.participants?.[tokenId];
      const updated = entrant ? syncMovementCharacteristic(preference, entrant, { reset: true }) : preference;
      return { combat: next, items: updated === token ? items : items.map(item => item.id === tokenId ? updated : item) };
    }, 'No se pudo cambiar la participación');
  }, [activeScenario, activeScenarioRef, editCampaignCombat, isPlayerView]);

  const chooseBleeding = useCallback(async (tokenId, choice) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id || bleedingBusyRef.current) return false;
    const expectedActivation = bleedingActivationKey(localCombatRef.current || scenario.canvasCombat);
    bleedingBusyRef.current = true;
    setIsResolvingBleeding(true);
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        const fresh = snapshot.data();
        const token = fresh?.items?.find(item => item.id === tokenId);
        if (!canControlToken(token, isPlayerView, playerName) || fresh.canvasCombat?.pendingAttack
          || bleedingActivationKey(fresh.canvasCombat) !== expectedActivation) return null;
        const result = resolveBleedingChoice(token, fresh.canvasCombat, choice);
        if (!result) return null;
        let nextToken = syncMovementCharacteristic(result.token, result.combat.participants[tokenId]);
        const profileRef = token.profileType === 'rogueliteClass' && token.linkedClassOwner && token.linkedClassId && token.runId
          ? doc(db, 'players', token.linkedClassOwner, 'rogueliteClasses', token.linkedClassId) : null;
        const profile = profileRef ? await transaction.get(profileRef) : null;
        const run = profile?.exists() ? profile.data().activeRun : null;
        if (run && (!canRogueliteTokenClaimRun(token, run, scenario.id) || Number(run.revision || 0) > Number(token.runRevision || 0)))
          throw new Error('La aventura está sincronizándose. Inténtalo de nuevo.');
        const id = `bleeding-${tokenId}-${expectedActivation}`;
        nextToken = { ...nextToken, canvasRuntimeRevision: (Number(token.canvasRuntimeRevision) || 0) + 1,
          runtimeDirty: token.profileType === 'rogueliteClass' || Boolean(token.runtimeDirty),
          ...(choice === 'life' ? { canvasDamageEffect: { id, previousLife: token.stats.vida.current,
            nextLife: nextToken.stats.vida.current, previousTemporaryLife: Number(token.stats.vidaTemporal?.current) || 0,
            nextTemporaryLife: Number(nextToken.stats.vidaTemporal?.current) || 0 } } : {}),
        };
        if (profileRef) {
          const revision = Math.max(Number(run?.revision) || 0, Number(token.runRevision) || 0) + 1;
          nextToken = { ...nextToken, runRevision: revision };
          transaction.set(profileRef, sanitize({ activeRun: {
            ...createRogueliteActiveRunFromToken(nextToken, run, { scenarioId: scenario.id, revision, now: Date.now() }),
            sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision,
          } }), { merge: true });
        }
        const items = fresh.items.map(item => item.id === tokenId ? nextToken : item);
        const lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
        transaction.update(ref, sanitize({ items, canvasCombat: result.combat, lastModified }));
        transaction.set(doc(db, 'combat_log', id), sanitize({ scenarioId: scenario.id, sourceEventId: id,
          attackerId: tokenId, targetId: tokenId, attackerName: token.name, targetName: token.name,
          weaponName: 'Sangrado', canvasRoguelite: true, reactionType: 'recibir',
          attackTraits: [], attackerDice: [], defenderDice: [], damage: choice === 'life' ? 1 : 0,
          finalDamage: choice === 'life' ? 1 : 0, blocksLost: { vida: result.lifeLost, vidaTemporal: result.temporaryLifeLost },
          bleedingChoice: choice, clientTimestamp: Date.now(), timestamp: serverTimestamp(),
        }));
        return { items, combat: result.combat, lastModified };
      });
      if (!saved) return false;
      const currentScene = activeScenarioRef.current;
      if (currentScene?.id === scenario.id && Number(saved.lastModified || 0) >= Number(currentScene.lastModified || 0)) {
        localItemsRef.current = saved.items;
        localCombatRef.current = saved.combat;
        setActiveScenario(current => current?.id === scenario.id && Number(saved.lastModified || 0) >= Number(current.lastModified || 0)
          ? { ...current, items: saved.items, canvasCombat: saved.combat, lastModified: saved.lastModified } : current);
      }
      return true;
    } catch (error) {
      triggerToast('No se pudo resolver Sangrado', error.message, 'warning');
      return false;
    } finally { bleedingBusyRef.current = false; setIsResolvingBleeding(false); }
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const chooseArmorProtection = useCallback(async (tokenId, choice) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id || !CANVAS_MUTABLE_PROTECTIONS.includes(choice)) return false;
    try {
      const items = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        const fresh = snapshot.data();
        const token = fresh?.items?.find(item => item.id === tokenId);
        if (!hasCanvasMutableArmor(token) || !canControlToken(token, isPlayerView, playerName) || token.armorProtectionChoice) return null;
        const next = fresh.items.map(item => item.id === tokenId ? { ...item, armorProtectionChoice: choice } : item);
        transaction.update(ref, { items: sanitize(next) });
        return next;
      });
      if (!items) return false;
      localItemsRef.current = items;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, items } : current);
      return true;
    } catch (error) {
      triggerToast('No se pudo elegir protección', error.message, 'error');
      return false;
    }
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const submitRoll = useCallback((tokenId, values, source = 'manual') => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) {
      triggerToast('Tirada no permitida', 'No controlas esta ficha', 'warning');
      return false;
    }
    try {
      return updateCombat((current, items) => items && !canControlToken(items.find(item => item.id === tokenId), isPlayerView, playerName)
        ? current : submitActionDice(current, tokenId, values, { source }));
    } catch (error) {
      triggerToast('Resultado no válido', error.message, 'warning');
      return false;
    }
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, triggerToast, updateCombat]);

  const rollActionDice = useCallback((tokenId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) {
      triggerToast('Tirada no permitida', 'No controlas esta ficha', 'warning');
      return false;
    }
    const participant = (localCombatRef.current || scenario?.canvasCombat)?.participants?.[tokenId];
    if (!participant) return false;
    const values = rollDiceProfile(participant.actionDiceProfile);
    return updateCombat((current, items) => items && !canControlToken(items.find(item => item.id === tokenId), isPlayerView, playerName)
      ? current : submitActionDice(current, tokenId, values, { source: 'digital' }));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, triggerToast, updateCombat]);

  const rollAllPending = useCallback(() => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    return updateCombat((current) => {
      let nextState = current;
      Object.values(current?.participants || {}).forEach((p) => {
        if (p.side === 'players' && p.awaitingRoll && p.actionDiceProfile?.length > 0) {
          const values = rollDiceProfile(p.actionDiceProfile);
          nextState = submitActionDice(nextState, p.tokenId, values, { source: 'digital' });
        }
      });
      return nextState;
    });
  }, [activeScenario, activeScenarioRef, isPlayerView, updateCombat]);

  const updateDieStatus = useCallback((tokenId, dieId, explicitStatus) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => {
      const participant = current?.participants?.[tokenId];
      const die = participant?.actionDice?.find((d) => d.id === dieId);
      const targetStatus = explicitStatus
        || (die ? STATUS_ORDER[(STATUS_ORDER.indexOf(die.status) + 1) % STATUS_ORDER.length] : 'available');
      return setActionDieStatus(current, tokenId, dieId, targetStatus);
    });
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const updateEnemyActionStatus = useCallback((tokenId, actionId, explicitStatus) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => {
      const participant = current?.participants?.[tokenId];
      const action = (participant?.enemyActions || []).find((a) => a.id === actionId);
      const targetStatus = explicitStatus
        || (action ? STATUS_ORDER[(STATUS_ORDER.indexOf(action.status) + 1) % STATUS_ORDER.length] : 'available');
      return setEnemyActionStatus(current, tokenId, actionId, targetStatus);
    });
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const getItemUseResources = useCallback((tokenId, item) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (needsBleedingChoice((localItemsRef.current || scenario?.items || []).find(item => item.id === tokenId), localCombatRef.current || scenario?.canvasCombat)) return [];
    const liveCombat = localCombatRef.current || scenario?.canvasCombat;
    if (isPreparedConsumable(item)) {
      const token = (localItemsRef.current || scenario?.items || []).find(candidate => candidate.id === tokenId);
      const practice = potionPracticeRef.current;
      return healingPotionResources(token, liveCombat,
        practice?.scenarioId === scenario?.id && practice.tokenId === tokenId ? practice : null);
    }
    if (isItemUsePractice(liveCombat)) {
      const practice = itemPracticeRef.current;
      return practice?.scenarioId === scenario?.id && practice?.tokenId === tokenId
        ? practice.resources : [];
    }
    const participant = liveCombat.participants?.[tokenId];
    if (!participant) return [];
    if (participant.side === 'enemies') {
      return participant.threatDie ? [{
        id: `threat-${tokenId}`,
        kind: 'threat-die',
        die: participant.threatDie,
        sides: Number(String(participant.threatDie).replace(/\D/g, '')) || 6,
        value: participant.threatValue,
        status: participant.threatValue === null || participant.threatValue === undefined ? 'spent' : 'available',
        label: 'Dado de amenaza',
      }] : [];
    }
    return (participant.actionDice || []).map((die) => ({ ...die, kind: 'action-die' }));
  }, [activeScenario, activeScenarioRef]);

  const prepareItemUseResources = useCallback((tokenId, item) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (getCanvasSystem(scenario) === 'campaign') {
      triggerToast('Objeto de Campaña', 'Resuelve su efecto en mesa y ajusta los recursos desde el inspector.', 'info');
      return [];
    }
    const token = (localItemsRef.current || scenario?.items || []).find((candidate) => candidate.id === tokenId);
    if (!scenario?.id || !token || !canControlToken(token, isPlayerView, playerName)) return [];
    if (isPreparedConsumable(item)) {
      if (isHealingPotion(item) && getHealingPotionBlockReason(token)) return [];
      const combat = localCombatRef.current || scenario.canvasCombat;
      if (isItemUsePractice(combat)) {
        const id = `potion-practice-${tokenId}-${++itemPracticeSequenceRef.current}`;
        const enemy = token.profileType === 'rogueliteEnemy';
        const configured = normalizeActionDiceProfile(token.actionDice);
        const profile = configured.length ? configured : ['d6', 'd6', 'd6'];
        const practiceCombat = createCanvasCombatState([{ ...token, actionDice: profile }], { now: id, includeNonParticipants: true });
        const participant = practiceCombat.participants[tokenId];
        if (!participant) return [];
        if (!enemy) participant.actionDice = profile.map((die, index) => ({ id: `${id}-${index}`, die,
          sides: Number(die.slice(1)), value: rollDiceProfile([die])[0], status: 'available' }));
        participant.awaitingRoll = false;
        Object.assign(practiceCombat, { status: 'active', roundPhase: 'turns',
          blocks: [{ memberIds: [tokenId], actedIds: [] }], activeBlockIndex: 0 });
        potionPracticeRef.current = { id, scenarioId: scenario.id, tokenId, combat: practiceCombat };
      }
      return getItemUseResources(tokenId, item);
    }
    if (!isItemUsePractice(localCombatRef.current || scenario.canvasCombat)) {
      itemPracticeRef.current = null;
      return getItemUseResources(tokenId);
    }
    const enemy = token.profileType === 'rogueliteEnemy';
    const configuredProfile = normalizeActionDiceProfile(enemy ? [token.threatDie || 'd6'] : token.actionDice);
    const profile = configuredProfile.length ? configuredProfile : ['d6', 'd6', 'd6'];
    const values = rollDiceProfile(profile);
    const sequence = ++itemPracticeSequenceRef.current;
    const resources = profile.map((die, index) => ({
      id: `item-practice-${tokenId}-${sequence}-${index}`,
      kind: enemy ? 'threat-die' : 'action-die',
      die,
      sides: Number(die.slice(1)),
      value: values[index],
      status: 'available',
      practice: true,
    }));
    itemPracticeRef.current = { scenarioId: scenario.id, tokenId, resources };
    return resources;
  }, [activeScenario, activeScenarioRef, getItemUseResources, isPlayerView, playerName, triggerToast]);

  const commitHealingPotionUse = useCallback(({ useId, tokenId, item, resource, targetId = tokenId }) => {
    const bandage = getItemUseDefinition(item)?.id === 'bandage';
    const antidote = isAntidote(item) || bandage;
    const clearCondition = bandage ? setCanvasBleeding : setCanvasPoison;
    const effect = getItemUseDefinition(item)?.effect?.type;
    const buff = ['haste', 'temporary-life'].includes(effect);
    if (!antidote) targetId = tokenId;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id || typeof useId !== 'string' || !useId || useId.length > 200) return false;
    const token = (localItemsRef.current || scenario.items || []).find(candidate => candidate.id === tokenId);
    if (!token || !canControlToken(token, isPlayerView, playerName)) return false;
    const key = `${scenario.id}:${useId}`;
    const attempts = potionUseAttemptsRef.current;
    const previousAttempt = attempts.get(key);
    if (previousAttempt && (previousAttempt.tokenId !== tokenId || previousAttempt.targetId !== targetId || previousAttempt.effect !== effect)) return false;
    if (previousAttempt?.promise) return previousAttempt.promise;
    if (previousAttempt?.result) return Promise.resolve(previousAttempt.result);
    const busyKey = `${scenario.id}:${tokenId}`;
    if (potionUseBusyRef.current.has(busyKey)) return false;
    const currentCombat = localCombatRef.current || scenario.canvasCombat;
    const isPractice = isItemUsePractice(currentCombat);
    const practice = potionPracticeRef.current;
    try {
      if (!token || !canControlToken(token, isPlayerView, playerName)) throw new Error('No controlas esta ficha.');
      const blocked = antidote ? getAntidoteBlockReason(token, scenario.items?.find(candidate => candidate.id === targetId), scenario.items, gridConfig, { isPlayerView, playerName }, bandage) : buff ? getBuffPotionBlockReason(token) : getHealingPotionBlockReason(token);
      if (blocked) throw new Error(blocked);
      if (!isPractice && !canUseHealingPotionInCombat(tokenId, currentCombat)) throw new Error('Solo puedes usar el consumible durante tu turno, sin un ataque pendiente.');
      const located = resolveHealingPotionItem(token, item);
      if (getItemUseDefinition(located.item)?.effect?.type !== effect) throw new Error('Este objeto no corresponde al efecto seleccionado.');
      consumeHealingPotionItem(located);
      const valid = getItemUseResources(tokenId, located.item).some(candidate => matchesHealingResource(candidate, resource));
      if (!valid) throw new Error('La acción seleccionada ya no está disponible.');
    } catch (error) {
      triggerToast(antidote ? `No puedes usar el ${bandage ? 'Vendaje' : 'Antídoto'}` : 'No puedes beber la poción', error.message, 'warning');
      return false;
    }
    const attempt = previousAttempt || { tokenId, targetId, effect, now: Date.now(), roll: null };
    attempts.set(key, attempt);
    potionUseBusyRef.current.add(busyKey);
    const pendingWrites = writeQueueRef.current;
    const promise = (async () => {
      try {
        await pendingWrites;
        const saved = await runTransaction(db, async transaction => {
          const sceneRef = doc(db, scenarioCollectionName, scenario.id);
          const receiptRef = doc(db, scenarioCollectionName, scenario.id, 'itemUses', encodeURIComponent(useId));
          const sceneSnapshot = await transaction.get(sceneRef);
          const receiptSnapshot = await transaction.get(receiptRef);
          if (!sceneSnapshot.exists()) throw new Error('La escena ya no existe.');
          const fresh = sceneSnapshot.data();
          const freshToken = fresh.items?.find(candidate => candidate.id === tokenId);
          if (!freshToken || !canControlToken(freshToken, isPlayerView, playerName)) throw new Error('No controlas esta ficha.');
          if (receiptSnapshot.exists()) {
            const receipt = receiptSnapshot.data();
            if (receipt.tokenId !== tokenId || (receipt.effect !== effect || (antidote && receipt.result.targetId !== targetId))) throw new Error('Esta confirmación pertenece a otro uso.');
            return { items: fresh.items, combat: fresh.canvasCombat, lastModified: fresh.lastModified,
              result: receipt.result, repeated: true };
          }
          if (needsBleedingChoice(freshToken, fresh.canvasCombat)) throw new Error('Resuelve Sangrado antes de actuar.');
          const freshTarget = antidote ? fresh.items?.find(candidate => candidate.id === targetId) : freshToken;
          if (isPractice && (fresh.canvasPracticeCombat?.pendingAttack || fresh.canvasPracticeCombat?.explosiveBlast || fresh.canvasPracticeCombat?.arcaneChain)) throw new Error('Resuelve el ataque pendiente antes de usar el consumible.');
          const blocked = antidote ? getAntidoteBlockReason(freshToken, freshTarget, fresh.items, gridConfig, { isPlayerView, playerName }, bandage) : buff ? getBuffPotionBlockReason(freshToken) : getHealingPotionBlockReason(freshToken);
          if (blocked) throw new Error(blocked);
          const located = resolveHealingPotionItem(freshToken, item);
          if (getItemUseDefinition(located.item)?.effect?.type !== effect) throw new Error('El consumible ha cambiado o ya no está disponible.');
          if (isItemUsePractice(fresh.canvasCombat) !== isPractice
            || (!isPractice && (fresh.canvasCombat.startedAt !== currentCombat.startedAt || fresh.canvasCombat.round !== currentCombat.round))) {
            throw new Error('El combate ha cambiado. Vuelve a preparar el uso del consumible.');
          }
          if (!isPractice && !canUseHealingPotionInCombat(tokenId, fresh.canvasCombat)) throw new Error('Solo puedes usar el consumible durante tu turno, sin un ataque pendiente.');
          if (isPractice && (potionPracticeRef.current !== practice || practice?.id !== resource?.practiceId)) {
            throw new Error('La práctica ha cambiado. Vuelve a preparar el uso del consumible.');
          }
          const available = healingPotionResources(freshToken, fresh.canvasCombat, isPractice ? practice : null)
            .find(candidate => matchesHealingResource(candidate, resource));
          if (!available) throw new Error('La acción seleccionada ya no está disponible.');
          const resourceCombat = isPractice ? practice.combat : fresh.canvasCombat;
          let paidCombat = consumeItemUseResource(resourceCombat, tokenId, available, { now: attempt.now });
          if (paidCombat === resourceCombat) throw new Error('La acción seleccionada ya no está disponible.');
          let nextCombat = isPractice ? null : paidCombat;
          let nextToken = consumeHealingPotionItem(located);
          const linkedRun = freshToken.profileType === 'rogueliteClass' && freshToken.linkedClassOwner && freshToken.linkedClassId && freshToken.runId;
          const profileRef = linkedRun ? doc(db, 'players', freshToken.linkedClassOwner, 'rogueliteClasses', freshToken.linkedClassId) : null;
          const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
          const profileData = profileSnapshot?.exists() ? profileSnapshot.data() : {};
          const currentRun = profileData.activeRun || null;
          if (currentRun && !canRogueliteTokenClaimRun(freshToken, currentRun, scenario.id)) throw new Error('La aventura ha cambiado de escena.');
          if (currentRun && Number(currentRun.revision || 0) > Number(freshToken.runRevision || 0)) {
            throw new Error('La ficha está recibiendo cambios de la aventura. Espera a que se sincronice antes de usar el consumible.');
          }
          if (effect === 'heal' && attempt.roll === null) attempt.roll = Math.floor(Math.random() * 4) + 1;
          const previousLife = Number(freshToken.stats?.vida?.current), maxLife = Number(freshToken.stats?.vida?.max);
          const healed = Math.min(attempt.roll, Math.max(0, maxLife - previousLife));
          const result = (antidote || buff) ? { ok: true, effect, useId, targetId, targetName: freshTarget.name } : { ok: true, effect: 'heal', useId, roll: attempt.roll, healed, previousLife,
            nextLife: previousLife + healed, maxLife };
          const effectId = `canvas-item-${encodeURIComponent(scenario.id)}-${encodeURIComponent(useId)}`;
          const lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
          if (effect === 'heal') nextToken = { ...nextToken, stats: { ...freshToken.stats, vida: { ...freshToken.stats.vida, current: result.nextLife } },
            canvasRuntimeRevision: (Number(freshToken.canvasRuntimeRevision) || 0) + 1,
            canvasHealingEffect: { id: effectId, useId, previousLife: result.previousLife, nextLife: result.nextLife,
              roll: result.roll, healed: result.healed, startedAt: Date.now(), eventType: 'item-use', effect: 'heal',
              actorId: tokenId, targetId: tokenId,
              dice: [{ id: `${useId}-healing`, faces: 4, value: result.roll, source: 'Curación' }] },
            runtimeDirty: freshToken.profileType === 'rogueliteClass' || Boolean(freshToken.runtimeDirty) };
          if (antidote) nextToken = { ...(targetId === tokenId ? clearCondition(nextToken, false) : nextToken),
            canvasRuntimeRevision: (Number(freshToken.canvasRuntimeRevision) || 0) + 1,
            runtimeDirty: freshToken.profileType === 'rogueliteClass' || Boolean(freshToken.runtimeDirty) };
          let nextTarget = antidote && targetId !== tokenId ? { ...clearCondition(freshTarget, false),
            canvasRuntimeRevision: (Number(freshTarget.canvasRuntimeRevision) || 0) + 1,
            runtimeDirty: freshTarget.profileType === 'rogueliteClass' || Boolean(freshTarget.runtimeDirty) } : null;
          if (antidote) {
            const canvasHealingEffect = { id: effectId, useId, startedAt: Date.now(),
              eventType: 'item-use', effect, actorId: tokenId, targetId,
              itemImage: resolveEquipmentImage(located.item) || null };
            if (nextTarget) nextTarget = { ...nextTarget, canvasHealingEffect };
            else nextToken = { ...nextToken, canvasHealingEffect };
          }
          if (buff) {
            if (effect === 'haste') {
              const applied = applyHastePotion(nextToken, paidCombat);
              nextToken = applied.token;
              paidCombat = applied.combat;
              nextCombat = isPractice ? null : paidCombat;
            } else nextToken = applyVitalityPotion(nextToken);
            nextToken = { ...nextToken, canvasRuntimeRevision: (Number(freshToken.canvasRuntimeRevision) || 0) + 1,
              runtimeDirty: freshToken.profileType === 'rogueliteClass' || Boolean(freshToken.runtimeDirty),
              canvasHealingEffect: { id: effectId, useId, startedAt: Date.now(), eventType: 'item-use', effect,
                ...(effect === 'temporary-life' ? { previousTemporaryLife: Number(freshToken.stats?.vidaTemporal?.current) || 0,
                  nextTemporaryLife: 2 } : {}),
                actorId: tokenId, targetId: tokenId, itemImage: resolveEquipmentImage(located.item) || null } };
          }
          const targetProfileRef = nextTarget?.profileType === 'rogueliteClass' && nextTarget.linkedClassOwner && nextTarget.linkedClassId && nextTarget.runId
            ? doc(db, 'players', nextTarget.linkedClassOwner, 'rogueliteClasses', nextTarget.linkedClassId) : null;
          const targetProfileSnapshot = targetProfileRef ? await transaction.get(targetProfileRef) : null;
          const targetRun = targetProfileSnapshot?.exists() ? targetProfileSnapshot.data().activeRun : null;
          if (targetRun && (!canRogueliteTokenClaimRun(freshTarget, targetRun, scenario.id)
            || Number(targetRun.revision || 0) > Number(freshTarget.runRevision || 0))) throw new Error('La criatura está sincronizando su aventura. Inténtalo de nuevo.');
          if (available.kind === 'enemy-movement') nextToken = syncMovementCharacteristic(nextToken, paidCombat.participants[tokenId]);
          if (profileRef) {
            const revision = Math.max(Number(currentRun?.revision) || 0, Number(freshToken.runRevision) || 0) + 1;
            const activeRun = { ...createRogueliteActiveRunFromToken(nextToken, currentRun, { scenarioId: scenario.id, revision, now: attempt.now }),
              sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision };
            nextToken = { ...nextToken, runRevision: revision };
            transaction.set(profileRef, sanitize({ id: freshToken.linkedClassId, templateId: freshToken.linkedClassId,
              owner: freshToken.linkedClassOwner, profileType: 'rogueliteClass', activeRun }), { merge: true });
          }
          if (targetProfileRef) {
            const revision = Math.max(Number(targetRun?.revision) || 0, Number(freshTarget.runRevision) || 0) + 1;
            const activeRun = { ...createRogueliteActiveRunFromToken(nextTarget, targetRun, { scenarioId: scenario.id, revision, now: attempt.now }),
              sourceCanvasRuntimeRevision: nextTarget.canvasRuntimeRevision };
            nextTarget = { ...nextTarget, runRevision: revision };
            transaction.set(targetProfileRef, sanitize({ activeRun }), { merge: true });
          }
          const nextItems = fresh.items.map(candidate => candidate.id === tokenId ? nextToken
            : nextTarget && candidate.id === targetId ? nextTarget : candidate);
          transaction.update(sceneRef, sanitize({ items: nextItems, ...(nextCombat ? { canvasCombat: nextCombat } : {}), lastModified }));
          transaction.set(receiptRef, sanitize({ tokenId, effect, result, createdAt: attempt.now }));
          transaction.set(doc(db, 'combat_log', effectId), {
            ...sanitize(buildCanvasHealingPotionLog({ scenarioId: scenario.id, useId, token: freshToken, item: located.item,
              result: (antidote || buff) ? { healed: 0, roll: 0 } : result, resource: available, now: attempt.now })),
            ...((antidote || buff) ? { effect, targetId, targetName: freshTarget.name, dice: [], healed: 0 } : {}), timestamp: serverTimestamp(),
          });
          return { items: nextItems, combat: nextCombat || fresh.canvasCombat, lastModified, result,
            practiceCombat: isPractice ? paidCombat : null };
        });
        attempt.result = saved.result;
        const currentScene = activeScenarioRef.current || activeScenario;
        if (currentScene?.id === scenario.id && saved.practiceCombat && potionPracticeRef.current === practice) {
          potionPracticeRef.current = { ...practice, combat: saved.practiceCombat };
        }
        if (currentScene?.id === scenario.id && Number(saved.lastModified || 0) >= Number(currentScene.lastModified || 0)) {
          localItemsRef.current = saved.items;
          localCombatRef.current = saved.combat || null;
          setActiveScenario(active => active?.id === scenario.id && Number(saved.lastModified || 0) >= Number(active.lastModified || 0)
            ? { ...active, items: saved.items, lastModified: saved.lastModified,
            ...(saved.combat ? { canvasCombat: saved.combat } : {}) } : active);
        }
        return saved.result;
      } catch (error) {
        triggerToast(antidote ? `No se pudo usar el ${bandage ? 'Vendaje' : 'Antídoto'}` : 'No se pudo beber la poción', error.message || 'Reinténtalo.', 'warning');
        return false;
      } finally {
        attempt.promise = null;
        potionUseBusyRef.current.delete(busyKey);
      }
    })();
    attempt.promise = promise;
    writeQueueRef.current = promise.then(() => undefined);
    return promise;
  }, [activeScenario, activeScenarioRef, getItemUseResources, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  // The impact commits the cost and the two dice before an orientation is
  // offered. Closing the selector cannot turn an unfavourable roll into a free
  // retry; the saved blast can be resumed from another client or after reload.
  const commitExplosiveBombImpact = useCallback(({ useId, tokenId, item, resource, impactCell } = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id || typeof useId !== 'string' || !useId || useId.length > 200 || !isExplosiveBomb(item)) return false;
    const key = `${scenario.id}:${useId}`;
    const previous = explosiveUseAttemptsRef.current.get(key);
    if (previous?.promise) return previous.promise;
    if (previous?.result) return Promise.resolve(previous.result);
    const busyKey = `${scenario.id}:${tokenId}`;
    if (explosiveUseBusyRef.current.has(busyKey)) return false;
    const previewToken = (localItemsRef.current || scenario.items || []).find(candidate => candidate.id === tokenId);
    if (!canControlToken(previewToken, isPlayerView, playerName)) return false;
    const liveCombat = localCombatRef.current || scenario.canvasCombat;
    const isPractice = isItemUsePractice(liveCombat);
    const practice = itemPracticeRef.current;
    if ((isPractice && (scenario.canvasPracticeCombat?.pendingAttack || scenario.canvasPracticeCombat?.explosiveBlast || scenario.canvasPracticeCombat?.arcaneChain))
      || (!isPractice && (!canUseHealingPotionInCombat(tokenId, liveCombat) || liveCombat.explosiveBlast))) {
      triggerToast('Lanzamiento pendiente', 'Resuelve la acción actual antes de usar la bomba.', 'warning');
      return false;
    }
    const available = getExplosiveResource(liveCombat, tokenId, resource,
      isPractice && practice?.scenarioId === scenario.id && practice.tokenId === tokenId ? practice.resources : null);
    if (!available) return false;
    const previewRange = getExplosiveBombMaxRange({ source: previewToken, resourceValue: available.value });
    const previewPlaces = resolveExplosiveBombAreaPlacements({ impactCell, gridConfig, source: previewToken, maxRange: previewRange });
    if (!previewPlaces.length) return false;
    const attempt = previous || { tokenId, rolls: null, now: Date.now() };
    explosiveUseAttemptsRef.current.set(key, attempt);
    explosiveUseBusyRef.current.add(busyKey);
    const promise = (async () => {
      try {
        await writeQueueRef.current;
        const saved = await runTransaction(db, async transaction => {
          const sceneRef = doc(db, scenarioCollectionName, scenario.id);
          const receiptRef = doc(db, scenarioCollectionName, scenario.id, 'itemUses', encodeURIComponent(useId));
          const snapshot = await transaction.get(sceneRef);
          const receiptSnapshot = await transaction.get(receiptRef);
          if (!snapshot.exists()) throw new Error('La escena ya no existe.');
          const fresh = snapshot.data();
          const freshToken = fresh.items?.find(candidate => candidate.id === tokenId);
          if (!canControlToken(freshToken, isPlayerView, playerName)) throw new Error('No controlas esta ficha.');
          if (receiptSnapshot.exists()) {
            const receipt = receiptSnapshot.data();
            if (receipt.tokenId !== tokenId || receipt.effect !== 'explosive-impact') throw new Error('Esta confirmación pertenece a otro uso.');
            const existingBlast = fresh.canvasCombat?.explosiveBlast || fresh.canvasPracticeCombat?.explosiveBlast;
            return { items: fresh.items, combat: fresh.canvasCombat,
              practiceCombat: fresh.canvasPracticeCombat, lastModified: fresh.lastModified,
              result: { ok: true, ...receipt.result, blast: existingBlast?.id === useId ? existingBlast : null } };
          }
          if (isItemUsePractice(fresh.canvasCombat) !== isPractice
            || (!isPractice && (fresh.canvasCombat.startedAt !== liveCombat.startedAt || fresh.canvasCombat.round !== liveCombat.round))) {
            throw new Error('El combate ha cambiado. Vuelve a preparar el lanzamiento.');
          }
          if (isPractice) {
            if (itemPracticeRef.current !== practice || !practice?.resources?.some(candidate => candidate.id === resource.id)) {
              throw new Error('Los dados de prueba han cambiado.');
            }
            if (fresh.canvasPracticeCombat?.pendingAttack || fresh.canvasPracticeCombat?.explosiveBlast || fresh.canvasPracticeCombat?.arcaneChain) throw new Error('Hay una resolución pendiente.');
          } else if (!canUseHealingPotionInCombat(tokenId, fresh.canvasCombat) || fresh.canvasCombat.explosiveBlast) {
            throw new Error('Solo puedes lanzar la bomba durante tu turno, sin otra resolución pendiente.');
          }
          if (needsBleedingChoice(freshToken, fresh.canvasCombat)) throw new Error('Resuelve primero Sangrado.');
          const active = isPractice ? createExplosivePracticeCombat(fresh.items, tokenId, practice.resources, attempt.now) : fresh.canvasCombat;
          const selected = getExplosiveResource(active, tokenId, resource,
            isPractice ? practice.resources : null);
          if (!selected) throw new Error('El dado seleccionado ya no está disponible.');
          const maxRange = getExplosiveBombMaxRange({ source: freshToken, resourceValue: selected.value });
          const freshPlaces = resolveExplosiveBombAreaPlacements({ impactCell, gridConfig, source: freshToken, maxRange });
          if (!freshPlaces.length) throw new Error('La casilla de impacto está fuera de alcance o del tablero.');
          const inventory = Array.isArray(freshToken.inventory) ? freshToken.inventory : [];
          const itemIndex = inventory.findIndex(candidate => canvasInventoryItemsMatch(candidate, item));
          const equipped = (Array.isArray(freshToken.equippedItems) ? freshToken.equippedItems : [])
            .find(candidate => canvasInventoryItemsMatch(candidate, item));
          if (itemIndex < 0 && !equipped) throw new Error('La bomba ya no está disponible.');
          const detachable = itemIndex >= 0 ? freshToken : { ...freshToken, inventory: [...inventory, equipped] };
          const detached = detachCanvasInventoryItem(detachable,
            itemIndex >= 0 ? itemIndex : detachable.inventory.length - 1);
          if (!detached || !isExplosiveBomb(detached.item)) throw new Error('La bomba ya no está disponible.');
          let nextToken = { ...freshToken, ...detached.updates,
            canvasRuntimeRevision: (Number(freshToken.canvasRuntimeRevision) || 0) + 1,
            runtimeDirty: freshToken.profileType === 'rogueliteClass' || Boolean(freshToken.runtimeDirty) };
          attempt.rolls ||= rollDiceProfile(['d8', 'd8']);
          let paidCombat = consumeItemUseResource(active, tokenId, { ...selected, practice: undefined }, { now: attempt.now });
          if (paidCombat === active) throw new Error('El dado seleccionado ya no está disponible.');
          if (active.participants?.[tokenId]?.side === 'enemies') {
            const afterAction = setEnemyActionStatus(paidCombat, tokenId, 'attack', 'spent', { now: attempt.now });
            if (afterAction === paidCombat) throw new Error('La acción principal ya no está disponible.');
            paidCombat = afterAction;
          }
          if (isPractice) {
            paidCombat = { ...paidCombat, participants: Object.fromEntries(Object.entries(paidCombat.participants).map(([id, participant]) => [id,
              participant.side === 'players' ? { ...participant, actionDice: (participant.actionDice || []).map(die =>
                die.status === 'available' ? { ...die, status: 'committed' } : die) } : participant,
            ])) };
          }
          const distance = getExplosiveBombDistance({ source: freshToken, impactCell, gridConfig });
          const pressure = calculateExplosiveBombPressure({ resourceValue: selected.value, rolls: attempt.rolls, distance, maxRange });
          const blast = { id: useId, useId, phase: 'choose-area', sourceTokenId: tokenId, tokenId,
            sourceName: freshToken.name || 'Atacante', item: detached.item, resource: selected,
            sourcePosition: { x: freshToken.x, y: freshToken.y,
              width: freshToken.width, height: freshToken.height },
            impactCell, distance, maxRange, rolls: attempt.rolls, pressure, createdAt: attempt.now, targetIds: [] };
          paidCombat = { ...paidCombat, explosiveBlast: blast, updatedAt: attempt.now };
          const profileRef = freshToken.profileType === 'rogueliteClass' && freshToken.linkedClassOwner
            && freshToken.linkedClassId && freshToken.runId
            ? doc(db, 'players', freshToken.linkedClassOwner, 'rogueliteClasses', freshToken.linkedClassId) : null;
          const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
          const currentRun = profileSnapshot?.exists() ? profileSnapshot.data()?.activeRun : null;
          if (currentRun && !canRogueliteTokenClaimRun(freshToken, currentRun, scenario.id)) throw new Error('La aventura ha cambiado de escena.');
          if (currentRun && Number(currentRun.revision || 0) > Number(freshToken.runRevision || 0)) throw new Error('La ficha se está sincronizando.');
          if (profileRef) {
            const revision = Math.max(Number(currentRun?.revision) || 0, Number(freshToken.runRevision) || 0) + 1;
            nextToken = { ...nextToken, runRevision: revision };
            transaction.set(profileRef, sanitize({ id: freshToken.linkedClassId, templateId: freshToken.linkedClassId,
              owner: freshToken.linkedClassOwner, profileType: 'rogueliteClass',
              activeRun: { ...createRogueliteActiveRunFromToken(nextToken, currentRun,
                { scenarioId: scenario.id, revision, now: attempt.now }), sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision },
            }), { merge: true });
          }
          const nextItems = fresh.items.map(candidate => candidate.id === tokenId ? nextToken : candidate);
          const field = isPractice ? 'canvasPracticeCombat' : 'canvasCombat';
          const lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
          transaction.update(sceneRef, sanitize({ items: nextItems, [field]: paidCombat, lastModified }));
          const result = { ok: true, useId, rolls: attempt.rolls, distance, pressure };
          transaction.set(receiptRef, sanitize({ tokenId, effect: 'explosive-impact', result, createdAt: attempt.now }));
          return { items: nextItems, combat: isPractice ? fresh.canvasCombat : paidCombat,
            practiceCombat: isPractice ? paidCombat : fresh.canvasPracticeCombat,
            lastModified, result: { ...result, blast } };
        });
        attempt.result = saved.result;
        const current = activeScenarioRef.current || activeScenario;
        if (current?.id === scenario.id && Number(saved.lastModified || 0) >= Number(current.lastModified || 0)) {
          localItemsRef.current = saved.items;
          if (isPractice) setPracticeCombat(saved.practiceCombat);
          else localCombatRef.current = saved.combat;
          setActiveScenario(scene => scene?.id === scenario.id && Number(saved.lastModified || 0) >= Number(scene.lastModified || 0)
            ? { ...scene, items: saved.items, lastModified: saved.lastModified,
              ...(isPractice ? { canvasPracticeCombat: saved.practiceCombat } : { canvasCombat: saved.combat }) } : scene);
        }
        if (isPractice) itemPracticeRef.current = null;
        return saved.result;
      } catch (error) {
        triggerToast('No se pudo lanzar la bomba', error.message || 'Reinténtalo.', 'warning');
        return false;
      } finally {
        attempt.promise = null;
        explosiveUseBusyRef.current.delete(busyKey);
      }
    })();
    attempt.promise = promise;
    writeQueueRef.current = promise.then(() => undefined);
    return promise;
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const commitExplosiveBombUse = useCallback(async ({ useId, tokenId, impactCell, placement } = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id || !useId) return false;
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const sceneRef = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(sceneRef);
        if (!snapshot.exists()) throw new Error('La escena ya no existe.');
        const fresh = snapshot.data();
        const practice = fresh.canvasPracticeCombat?.explosiveBlast?.id === useId;
        const field = practice ? 'canvasPracticeCombat' : 'canvasCombat';
        const current = fresh[field];
        const blast = current?.explosiveBlast;
        if (blast?.id !== useId || blast.phase !== 'choose-area' || current.pendingAttack
          || blast.sourceTokenId !== tokenId) throw new Error('El lanzamiento ya no está pendiente.');
        const token = fresh.items?.find(candidate => candidate.id === tokenId);
        if (!token || !canControlToken(token, isPlayerView, playerName)) throw new Error('No controlas esta ficha.');
        if (impactCell?.column !== blast.impactCell.column || impactCell?.row !== blast.impactCell.row) throw new Error('La casilla de impacto ha cambiado.');
        const options = resolveExplosiveBombAreaPlacements({ impactCell: blast.impactCell, gridConfig, source: token });
        const selected = options.find(candidate => candidate.orientation === placement?.orientation
          && candidate.x === placement.x && candidate.y === placement.y);
        if (!selected) throw new Error('Elige una orientación válida para el área.');
        const ignition = expandFireArea({ weapon: blast.item, cells: selected.cells, items: fresh.items, gridConfig });
        const targets = getExplosiveBombTargets({ items: fresh.items, placement: { ...selected, cells: ignition.cells }, gridConfig });
        const resolvingBlast = { ...blast, phase: 'resolving', placement: selected, tarZoneIds: ignition.zoneIds,
          targetIds: targets.map(target => target.id),
          targetNames: Object.fromEntries(targets.map(target => [target.id, target.name || 'Objetivo'])) };
        const nextCombat = startCanvasExplosiveBlast(current, resolvingBlast);
        const nextItems = !targets.length ? presentTarIgnition(fresh.items, ignition.zoneIds) : fresh.items;
        transaction.update(sceneRef, sanitize({ [field]: nextCombat, items: nextItems }));
        return { items: nextItems, combat: nextCombat, practice, targets: targets.map(target => ({ id: target.id, name: target.name })) ,
          blast: resolvingBlast };
      });
      if (saved.practice) setPracticeCombat(saved.combat);
      else localCombatRef.current = saved.combat;
      setActiveScenario(current => current?.id === scenario.id
        ? { ...current, items: saved.items, [saved.practice ? 'canvasPracticeCombat' : 'canvasCombat']: saved.combat } : current);
      triggerToast('Bomba explosiva', `${saved.blast.pressure} de Presión · ${saved.targets.length} ${saved.targets.length === 1 ? 'criatura alcanzada' : 'criaturas alcanzadas'}`, 'warning');
      return { ok: true, pressure: saved.blast.pressure, rolls: saved.blast.rolls, targets: saved.targets };
    } catch (error) {
      triggerToast('No se pudo resolver la explosión', error.message || 'Reinténtalo.', 'warning');
      return false;
    }
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const commitTarBombUse = useCallback(async ({ useId, tokenId, item, resource, placement, impactCell }) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const definition = getItemUseDefinition(item);
    if (!scenario?.id || definition?.id !== 'tar-bomb' || !useId) return { ok: false };
    const available = getItemUseResources(tokenId, item).find(candidate => candidate.id === resource?.id
      && candidate.kind === resource?.kind && candidate.value === resource?.value && candidate.status === 'available');
    if (!available) return { ok: false };
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('La escena ya no existe.');
        const fresh = snapshot.data();
        const existing = fresh.items?.find(candidate => candidate.id === `tar-${useId}`);
        if (existing) return { items: fresh.items, combat: fresh.canvasCombat, lastModified: fresh.lastModified };
        const token = fresh.items?.find(candidate => candidate.id === tokenId);
        if (!canControlToken(token, isPlayerView, playerName)) throw new Error('No controlas esta ficha.');
        const practice = isItemUsePractice(fresh.canvasCombat);
        if (practice !== Boolean(resource.practice)) throw new Error('El combate ha cambiado. Prepara de nuevo el lanzamiento.');
        if (fresh.canvasCombat?.pendingAttack || fresh.canvasCombat?.explosiveBlast || fresh.canvasCombat?.arcaneChain
          || fresh.canvasPracticeCombat?.pendingAttack || fresh.canvasPracticeCombat?.explosiveBlast || fresh.canvasPracticeCombat?.arcaneChain) throw new Error('Hay una resolución pendiente.');
        if (!practice) {
          if (needsBleedingChoice(token, fresh.canvasCombat)) throw new Error('Resuelve primero Sangrado.');
          if (!canUseHealingPotionInCombat(tokenId, fresh.canvasCombat)) throw new Error('Solo puedes lanzar la bomba durante tu turno.');
          const participant = fresh.canvasCombat?.participants?.[tokenId];
          const current = resource.kind === 'threat-die'
            ? participant?.threatValue === resource.value
            : participant?.actionDice?.some(die => die.id === resource.id && die.value === resource.value && die.status === 'available');
          if (!current) throw new Error('Ese dado ya no está disponible.');
        }
        const maxRange = getExplosiveBombMaxRange({ source: token, resourceValue: resource.value });
        const selected = resolveExplosiveBombAreaPlacements({ source: token, impactCell, gridConfig, maxRange })
          .find(candidate => candidate.orientation === placement?.orientation);
        if (!selected) throw new Error('El impacto está fuera de alcance o del tablero.');
        const inventory = token.inventory || [];
        const index = inventory.findIndex(candidate => canvasInventoryItemsMatch(candidate, item));
        const equipped = (token.equippedItems || []).find(candidate => canvasInventoryItemsMatch(candidate, item));
        const detachable = index >= 0 ? token : { ...token, inventory: [...inventory, equipped].filter(Boolean) };
        const detached = index >= 0 || equipped ? detachCanvasInventoryItem(detachable, index >= 0 ? index : detachable.inventory.length - 1) : null;
        if (!detached || getItemUseDefinition(detached.item)?.id !== 'tar-bomb') throw new Error('La bomba ya no está en tu inventario.');
        const area = createAreaSceneItem({ id: `tar-${useId}`, placement: selected, ...definition.effect,
          metadata: { createdByTokenId: tokenId, itemUseDefinitionId: definition.id, deletableBy: ['master'] } });
        let nextToken = { ...token, ...detached.updates,
          canvasRuntimeRevision: (Number(token.canvasRuntimeRevision) || 0) + 1,
          runtimeDirty: token.profileType === 'rogueliteClass' || Boolean(token.runtimeDirty) };
        let combat = practice ? fresh.canvasCombat : consumeItemUseResource(fresh.canvasCombat, tokenId, resource);
        if (!practice && combat === fresh.canvasCombat) throw new Error('No se pudo gastar el dado.');
        if (!practice && token.profileType === 'rogueliteEnemy') {
          const action = fresh.canvasCombat.participants?.[tokenId]?.enemyActions?.find(candidate => candidate.id === 'attack');
          if (action?.status !== 'available') throw new Error('La acción principal ya no está disponible.');
          combat = setEnemyActionStatus(combat, tokenId, 'attack', 'spent');
        }
        const profileRef = token.profileType === 'rogueliteClass' && token.linkedClassOwner && token.linkedClassId && token.runId
          ? doc(db, 'players', token.linkedClassOwner, 'rogueliteClasses', token.linkedClassId) : null;
        const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
        const currentRun = profileSnapshot?.exists() ? profileSnapshot.data()?.activeRun : null;
        if (currentRun && !canRogueliteTokenClaimRun(token, currentRun, scenario.id)) throw new Error('La aventura ha cambiado de escena.');
        if (currentRun && Number(currentRun.revision || 0) > Number(token.runRevision || 0)) throw new Error('La ficha se está sincronizando.');
        if (profileRef) {
          const revision = Math.max(Number(currentRun?.revision) || 0, Number(token.runRevision) || 0) + 1;
          nextToken = { ...nextToken, runRevision: revision };
          transaction.set(profileRef, sanitize({ id: token.linkedClassId, templateId: token.linkedClassId,
            owner: token.linkedClassOwner, profileType: 'rogueliteClass',
            activeRun: { ...createRogueliteActiveRunFromToken(nextToken, currentRun,
              { scenarioId: scenario.id, revision, now: Date.now() }), sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision },
          }), { merge: true });
        }
        const items = fresh.items.map(candidate => candidate.id === tokenId ? nextToken : candidate).concat(area);
        const lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
        transaction.update(ref, sanitize({ items, lastModified, ...(!practice ? { canvasCombat: combat } : {}) }));
        return { items, combat, lastModified };
      });
      localItemsRef.current = saved.items;
      if (saved.combat) localCombatRef.current = saved.combat;
      itemPracticeRef.current = null;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, items: saved.items, lastModified: saved.lastModified,
        ...(saved.combat ? { canvasCombat: saved.combat } : {}) } : current);
      triggerToast('Brea desplegada', 'Terreno difícil 2×2 · Inflamable', 'success');
      return { ok: true };
    } catch (error) {
      triggerToast('No se pudo lanzar la brea', error.message, 'warning');
      return { ok: false };
    }
  }, [activeScenario, activeScenarioRef, getItemUseResources, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const commitItemUse = useCallback(({ useId, tokenId, item, resource, targetId, resolvedItems = [], placement, impactCell } = {}) => {
    if (getCanvasSystem(activeScenarioRef.current || activeScenario) === 'campaign') return false;
    if (getItemUseDefinition(item)?.id === 'tar-bomb') return commitTarBombUse({ useId, tokenId, item, resource, placement, impactCell });
    if (isPreparedConsumable(item)) return commitHealingPotionUse({ useId, tokenId, item, resource, targetId });
    const scenario = activeScenarioRef.current || activeScenario;
    const currentItems = localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((candidate) => candidate.id === tokenId);
    if (!token || !canControlToken(token, isPlayerView, playerName)) {
      triggerToast('No puedes usar el objeto', 'No controlas esta ficha.', 'warning');
      return false;
    }
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const isPractice = isItemUsePractice(currentCombat);
    const availableResource = getItemUseResources(tokenId).find((candidate) => (
      candidate.id === resource?.id && candidate.kind === resource?.kind
      && candidate.value === resource?.value && candidate.status === 'available'
      && Boolean(candidate.practice) === Boolean(resource?.practice)
    ));
    const nextCombat = !isPractice && availableResource
      ? consumeItemUseResource(currentCombat, tokenId, availableResource) : null;
    if (!availableResource || (!isPractice && (!nextCombat || nextCombat === currentCombat))) {
      triggerToast('No puedes usar el objeto', 'Ese dado ya no está disponible.', 'warning');
      return false;
    }

    const inventory = Array.isArray(token?.inventory) ? token.inventory : [];
    const itemIndex = inventory.findIndex((candidate) => canvasInventoryItemsMatch(candidate, item));
    if (itemIndex < 0 && !(Array.isArray(token.equippedItems) ? token.equippedItems : [])
      .some((candidate) => canvasInventoryItemsMatch(candidate, item))) {
      triggerToast('Objeto no disponible', 'El objeto ya no está en el inventario de la ficha.', 'warning');
      return false;
    }
    const detachableToken = itemIndex >= 0
      ? token
      : { ...token, inventory: [...inventory, item] };
    const detached = detachCanvasInventoryItem(
      detachableToken,
      itemIndex >= 0 ? itemIndex : detachableToken.inventory.length - 1,
    );
    if (!detached) {
      triggerToast('Objeto no disponible', 'El objeto ya no está en el inventario de la ficha.', 'warning');
      return false;
    }
    const nextToken = { ...token, ...detached.updates };
    const additions = (Array.isArray(resolvedItems) ? resolvedItems : []).filter(Boolean);
    const nextItems = currentItems
      .map((candidate) => (candidate.id === tokenId ? nextToken : candidate))
      .concat(additions);
    const modifiedIds = [tokenId, ...additions.map(({ id }) => id)];
    let didCommit;
    if (isPractice) {
      if (!scenario?.id) return false;
      itemPracticeRef.current = null;
      localItemsRef.current = nextItems;
      setActiveScenario((active) => active?.id === scenario.id ? { ...active, items: nextItems } : active);
      writeQueueRef.current = writeQueueRef.current.then(() => (
        safePersistItems(scenario.id, nextItems, currentItems, modifiedIds, { persistRuntime: true })
      )).catch((error) => {
        triggerToast('No se pudo resolver el uso del objeto', error?.message || 'Reinténtalo', 'error');
      });
      didCommit = true;
    } else {
      didCommit = persistCombatAndItems(
        scenario,
        nextCombat,
        nextItems,
        'No se pudo resolver el uso del objeto',
        { persistRuntime: true, modifiedIds },
      );
    }
    if (didCommit) {
      triggerToast(
        detached.item.name || detached.item.nombre || 'Objeto usado',
        additions.length > 0 ? 'El efecto permanece en el mapa.' : 'El objeto se ha consumido.',
        'success',
      );
    }
    return didCommit;
  }, [
    activeScenario,
    activeScenarioRef,
    getItemUseResources,
    commitHealingPotionUse,
    commitTarBombUse,
    isPlayerView,
    persistCombatAndItems,
    playerName,
    safePersistItems,
    setActiveScenario,
    triggerToast,
  ]);

  const completeActivation = useCallback((tokenId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (needsBleedingChoice((localItemsRef.current || scenario?.items || []).find(item => item.id === tokenId), localCombatRef.current || scenario?.canvasCombat)) return false;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    if (currentCombat?.participants?.[tokenId]?.hasteTurnBonus) {
      const nextCombat = markParticipantActed(currentCombat, tokenId);
      if (nextCombat === currentCombat) return false;
      const nextItems = (localItemsRef.current || scenario.items || []).map(item => item.id === tokenId
        ? syncMovementCharacteristic(item, nextCombat.participants[tokenId]) : item);
      return persistCombatAndItems(scenario, nextCombat, nextItems);
    }
    return updateCombat((current, items) => items && (!canControlToken(items.find(item => item.id === tokenId), isPlayerView, playerName)
      || current.pendingAttack || current.explosiveBlast) ? current : markParticipantActed(current, tokenId));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat, persistCombatAndItems]);

  const setMovementModifier = useCallback((tokenId, modifier) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentItems = localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const nextCombat = setParticipantMovementModifier(currentCombat, tokenId, modifier);
    if (!nextCombat || nextCombat === currentCombat) return false;
    const nextParticipant = nextCombat.participants?.[tokenId];
    const nextItems = currentItems.map((item) => (
      item.id === tokenId ? syncMovementCharacteristic(item, nextParticipant) : item
    ));
    return persistCombatAndItems(scenario, nextCombat, nextItems);
  }, [activeScenario, activeScenarioRef, isPlayerView, persistCombatAndItems, playerName]);

  const reconcileMovementResource = useCallback((tokenId, updates, meta = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentItems = localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const participant = currentCombat?.participants?.[tokenId];
    const requestedMovement = updates?.stats?.movimiento;
    if (currentCombat?.status !== 'active' || !participant || !requestedMovement) return false;

    const previousRemaining = getAvailableMovement(participant);
    const nextCombat = setParticipantMovementResource(currentCombat, tokenId, {
      current: requestedMovement.current,
      max: requestedMovement.max,
      field: meta.field,
    }, {
      actor: isPlayerView ? (token.name || playerName || 'Jugador') : 'Master',
    });
    if (!nextCombat || nextCombat === currentCombat) return true;

    const nextParticipant = nextCombat.participants[tokenId];
    const editedToken = { ...token, ...updates };
    const nextToken = syncMovementCharacteristic(editedToken, nextParticipant);
    const nextItems = currentItems.map((item) => (item.id === tokenId ? nextToken : item));
    persistCombatAndItems(scenario, nextCombat, nextItems, 'No se pudo ajustar el movimiento');

    const nextRemaining = getAvailableMovement(nextParticipant);
    triggerToast(
      nextRemaining > previousRemaining ? 'Movimiento recargado' : 'Movimiento ajustado',
      `${token.name || 'La ficha'} dispone ahora de ${nextRemaining} casillas.`,
      nextRemaining > previousRemaining ? 'success' : 'info',
    );
    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    persistCombatAndItems,
    playerName,
    triggerToast,
  ]);

  const standUp = useCallback((tokenId, dieId = null) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (needsBleedingChoice((localItemsRef.current || scenario?.items || []).find(item => item.id === tokenId), localCombatRef.current || scenario?.canvasCombat)) return false;
    const items = localItemsRef.current || scenario?.items || [];
    const token = items.find(item => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    const current = localCombatRef.current || scenario?.canvasCombat;
    const result = standUpCanvasToken(current, token, dieId);
    if (!result) {
      triggerToast('No puedes levantarte', 'Durante tu activación, gasta todo el Movimiento básico sin usar o un dado disponible.', 'warning');
      return false;
    }
    const standing = result.combat?.participants?.[tokenId]
      ? syncMovementCharacteristic(result.token, result.combat.participants[tokenId]) : result.token;
    const nextItems = items.map(item => item.id === tokenId ? standing : item);
    if (!result.combat) {
      localItemsRef.current = nextItems;
      setActiveScenario(current => ({ ...current, items: nextItems }));
      void safePersistItems(scenario.id, nextItems, items, [tokenId], { persistRuntime: true });
      return true;
    }
    return persistCombatAndItems(scenario, result.combat, nextItems);
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, persistCombatAndItems, triggerToast, setActiveScenario, safePersistItems]);

  const activateSprint = useCallback((tokenId, dieId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (needsBleedingChoice((localItemsRef.current || scenario?.items || []).find(item => item.id === tokenId), localCombatRef.current || scenario?.canvasCombat)) return false;
    const currentItems = localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((item) => item.id === tokenId);
    if (isCanvasProne(token) || !canControlToken(token, isPlayerView, playerName)) {
      triggerToast('No puedes correr', 'Debes controlar la ficha y estar de pie.', 'warning');
      return false;
    }

    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const participant = currentCombat?.participants?.[tokenId];
    const die = participant?.actionDice?.find((candidate) => candidate.id === dieId);
    if (!participant || !die || die.status !== 'available') {
      triggerToast('No puedes correr', 'Ese dado de acción ya no está disponible.', 'warning');
      return false;
    }
    if ((participant.movementRuntime?.sprintDieIds || [participant.movementRuntime?.sprintDieId]).includes(dieId)) {
      triggerToast('Correr ya aplicado', 'Ese dado ya aportó su movimiento esta ronda. Reabrir el turno conserva las casillas restantes; no vuelve a sumar el mismo dado.', 'warning');
      return false;
    }
    const nextCombat = spendActionDieForSprint(currentCombat, tokenId, dieId);
    if (nextCombat === currentCombat) {
      triggerToast('No puedes correr', 'La ficha no está en su activación.', 'warning');
      return false;
    }
    const nextParticipant = nextCombat.participants[tokenId];
    const nextItems = currentItems.map((item) => (
      item.id === tokenId ? syncMovementCharacteristic(item, nextParticipant) : item
    ));
    persistCombatAndItems(scenario, nextCombat, nextItems, 'No se pudo activar Correr');
    publishSprintAnimation({
      scenarioId: scenario?.id,
      token,
      movement: die.value,
      mode: 'additional',
    });
    triggerToast(
      'Correr activado',
      `El ${die.die.toUpperCase()} aporta ${die.value} casillas adicionales${nextParticipant.movementRuntime?.sprintBonus > die.value ? ` (${nextParticipant.movementRuntime.sprintBonus} acumuladas)` : ''}.`,
      'success',
    );
    return true;
  }, [activeScenario, activeScenarioRef, isPlayerView, persistCombatAndItems, playerName, triggerToast]);

  const activateEnemySprint = useCallback((tokenId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (needsBleedingChoice((localItemsRef.current || scenario?.items || []).find(item => item.id === tokenId), localCombatRef.current || scenario?.canvasCombat)) return false;
    const currentItems = localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((item) => item.id === tokenId);
    if (!token || isCanvasProne(token) || token.profileType !== 'rogueliteEnemy' || !canControlToken(token, isPlayerView, playerName)) return false;

    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const participant = currentCombat?.participants?.[tokenId];
    const attackAction = (participant?.enemyActions || []).find((action) => action.id === 'attack');
    const baseAllowance = participant?.movementRuntime
      ? Math.max(
        0,
        (Number(participant.movementRuntime.base) || 0)
          + (Number(participant.movementRuntime.modifier) || 0),
      )
      : 0;

    if (!participant || attackAction?.status === 'spent') {
      triggerToast('Ataque agotado', 'El enemigo ya no puede gastar Ataque para correr esta ronda.', 'warning');
      return false;
    }
    if (getAvailableMovement(participant) >= baseAllowance) {
      triggerToast('Movimiento completo', 'El enemigo todavía dispone de todo su movimiento base.', 'info');
      return false;
    }

    const nextCombat = rechargeEnemyMovementWithAttack(currentCombat, tokenId, { actor: 'Master' });
    if (!nextCombat || nextCombat === currentCombat) return false;
    const nextParticipant = nextCombat.participants?.[tokenId];
    const nextItems = currentItems.map((item) => (
      item.id === tokenId ? syncMovementCharacteristic(item, nextParticipant) : item
    ));
    persistCombatAndItems(scenario, nextCombat, nextItems, 'No se pudo activar Correr');
    publishSprintAnimation({
      scenarioId: scenario?.id,
      token,
      movement: baseAllowance,
      mode: 'recharge',
    });
    triggerToast(
      'El enemigo corre',
      `${token.name || 'El enemigo'} recupera ${baseAllowance} casillas y gasta su acción de Ataque.`,
      'success',
    );
    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    persistCombatAndItems,
    playerName,
    triggerToast,
  ]);

  const confirmMovement = useCallback(async (tokenId, {
    from,
    to,
    cost = 0,
    isExceptional = false,
    itemsOverride = null,
    revealedTokenIds = [],
  }) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentItems = itemsOverride || localItemsRef.current || scenario?.items || [];
    const token = currentItems.find((item) => item.id === tokenId);
    if (!token || !canControlToken(token, isPlayerView, playerName)) return false;

    if (isCanvasProne(token) && !isExceptional) return false;
    const isPracticeMovement = Number(practiceCombat?.participants?.[tokenId]?.defensiveReposition?.remaining) > 0;
    const currentCombat = isPracticeMovement ? practiceCombat : (localCombatRef.current || scenario.canvasCombat);
    const participant = currentCombat?.participants?.[tokenId];
    const movementCost = (movingToken, items) => Math.max(0, Number(cost) || 0,
      getTerrainMovementCost({ token: movingToken, from, to, items, config: gridConfig, exceptional: isExceptional }));
    const numericCost = movementCost(token, currentItems);
    if (needsBleedingChoice(token, currentCombat)) return false;
    const availableMovement = getAvailableMovement(participant);
    if (!isExceptional && participant && numericCost > availableMovement) {
      triggerToast(
        'Movimiento agotado',
        token.profileType === 'rogueliteEnemy'
          ? `Solo quedan ${availableMovement} casillas. Usa Correr para gastar Ataque y recargar el movimiento base.`
          : `Solo quedan ${availableMovement} casillas. Usa Correr y elige un dado de acción para avanzar más.`,
        'warning',
      );
      return false;
    }

    const applyMovement = (combat, items, chargedCost) => {
      const nextCombat = combat ? recordParticipantMovement(combat, tokenId, {
        from, to, cost: chargedCost, isExceptional, actor: isPlayerView ? (token.name || playerName) : 'Master',
      }) : null;
      const nextItems = items.map(item => {
        const visible = revealedTokenIds.includes(item.id) ? removeHiddenStatusFromToken(item) : item;
        if (item.id !== tokenId) return visible;
        return syncMovementCharacteristic({ ...visible, x: to.x, y: to.y }, nextCombat?.participants?.[tokenId]);
      });
      return { combat: nextCombat, items: nextItems };
    };

    if (!isPlayerView && !isPracticeMovement && isOpenCombat(currentCombat) && getCanvasSystem(scenario) === 'campaign') {
      // Another drop may already be in flight. Price each move against its actual starting square and budget.
      const hasActed = combat => combat.blocks?.[combat.activeBlockIndex]?.actedIds?.includes(tokenId) || false;
      return editCampaignCombat(scenario, (fresh, items) => {
        if (!isSameCombatPhase(currentCombat, fresh) || fresh.activeBlockIndex !== currentCombat.activeBlockIndex
          || hasActed(currentCombat) !== hasActed(fresh) || !fresh.participants?.[tokenId]) {
          throw new Error('El turno ha cambiado. Comprueba la posición de la ficha.');
        }
        const liveToken = items.find(item => item.id === tokenId);
        if (!liveToken || liveToken.x !== from.x || liveToken.y !== from.y) {
          throw new Error('La posición de la ficha ha cambiado.');
        }
        if ((!isExceptional && isCanvasProne(liveToken)) || needsBleedingChoice(liveToken, fresh)) {
          throw new Error('El estado actual de la ficha impide este movimiento.');
        }
        const liveCost = movementCost(liveToken, items);
        const remaining = getAvailableMovement(fresh.participants[tokenId]);
        if (!isExceptional && liveCost > remaining) throw new Error(`Movimiento disponible: ${remaining}.`);
        return applyMovement(fresh, items, liveCost);
      }, 'Error al confirmar movimiento');
    }

    const { combat: nextCombat, items: nextItems } = applyMovement(currentCombat, currentItems, numericCost);
    if (isPracticeMovement) {
      persistPracticeCombat(nextCombat);
      localItemsRef.current = nextItems;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, items: nextItems } : current);
      await safePersistItems?.(scenario.id, nextItems, currentItems, [tokenId], { persistRuntime: false });
    } else if (nextCombat) {
      const baseItems = (localItemsRef.current || scenario.items || []).map(item => (
        item.id === tokenId ? { ...item, x: from.x, y: from.y } : item
      ));
      return await persistCombatAndItems(scenario, nextCombat, nextItems, 'Error al confirmar movimiento', { baseItems });
    } else {
      localItemsRef.current = nextItems;
      setActiveScenario((active) => (
        active?.id === scenario.id ? { ...active, items: nextItems } : active
      ));
      safePersistItems?.(scenario.id, nextItems, currentItems, [tokenId], { persistRuntime: false });
    }

    return true;
  }, [
    practiceCombat,
    persistPracticeCombat,
    gridConfig,
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    editCampaignCombat,
    persistCombatAndItems,
    playerName,
    safePersistItems,
    setActiveScenario,
    triggerToast,
  ]);

  const undoMovement = useCallback(async (tokenId) => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    const currentCombat = localCombatRef.current || scenario.canvasCombat;
    if (!currentCombat) return false;

    const { state: nextCombat, undoneEntry } = undoParticipantMovement(currentCombat, tokenId);
    if (!undoneEntry) {
      triggerToast('Sin movimientos previos', 'No hay movimientos para deshacer en esta ronda.', 'info');
      return false;
    }

    const currentItems = localItemsRef.current || scenario.items || [];
    const nextParticipant = nextCombat.participants?.[tokenId];
    const nextItems = currentItems.map((item) => {
      if (item.id !== tokenId) return item;
      return syncMovementCharacteristic({
        ...item,
        x: undoneEntry.from.x,
        y: undoneEntry.from.y,
      }, nextParticipant);
    });

    persistCombatAndItems(scenario, nextCombat, nextItems, 'Error al deshacer movimiento');
    triggerToast(
      'Movimiento deshecho',
      `Restaurada posición de ${undoneEntry.actor || 'token'}${undoneEntry.cost > 0 ? ` (+${undoneEntry.cost} mov devuelto)` : ''}`,
      'info',
    );

    return true;
  }, [activeScenario, activeScenarioRef, isPlayerView, persistCombatAndItems, triggerToast]);

  const nextRound = useCallback(() => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    if (!scenario?.id || currentCombat?.status !== 'active' || currentCombat.pendingAttack || currentCombat.explosiveBlast || currentCombat.arcaneChain) return false;
    if (getCanvasSystem(scenario) === 'campaign') {
      return editCampaignCombat(scenario, (current, items) => {
        if (!isSameRound(currentCombat, current) || !canAdvanceCanvasRound(current)) return null;
        const combat = startNextRound(current, { tokens: items });
        return { combat, items: items.map(item => combat.participants[item.id]
          ? syncMovementCharacteristic(item, combat.participants[item.id], { reset: true }) : item) };
      }, 'No se pudo avanzar la ronda');
    }
    const nextCombat = startNextRound(currentCombat);
    const currentItems = localItemsRef.current || scenario.items || [];
    const nextItems = currentItems.map((item) => {
      const participant = nextCombat.participants?.[item.id];
      return participant ? updateCanvasMageMana(syncMovementCharacteristic(item, participant, { reset: true }), 'round') : item;
    });
    return persistCombatAndItems(scenario, nextCombat, nextItems, 'No se pudo avanzar la ronda', {
      persistRuntime: true, modifiedIds: nextItems.filter(isCanvasMage).map(item => item.id),
    });
  }, [activeScenario, activeScenarioRef, editCampaignCombat, isPlayerView, persistCombatAndItems]);

  const undoActivation = useCallback(async (tokenId = null) => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    try {
      await writeQueueRef.current;
      const reopened = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return null;
        const latest = snapshot.data();
        if (getCanvasSystem(latest) !== getCanvasSystem(scenario)) return null;
        const current = pruneCombatState(latest.canvasCombat, latest.items || []);
        if (!current || current.status !== 'active' || current.roundPhase !== 'turns'
          || current.pendingAttack || current.explosiveBlast || current.arcaneChain) return null;
        const next = tokenId ? undoParticipantActivation(current, tokenId) : undoLastActivation(current);
        if (next === current) return null;
        transaction.update(ref, { canvasCombat: sanitize(next), combatModifiedAt: Date.now() });
        return next;
      });
      if (!reopened) return false;
      if (activeScenarioRef.current?.id === scenario.id) {
        localCombatRef.current = reopened;
        setActiveScenario(current => current?.id === scenario.id ? { ...current, canvasCombat: reopened } : current);
      }
      return true;
    } catch (error) {
      triggerToast('No se pudo reabrir el turno', error?.message || 'Reinténtalo', 'error');
      return false;
    }
  }, [isPlayerView, activeScenario, activeScenarioRef, scenarioCollectionName, setActiveScenario, triggerToast]);

  const igniteTarZone = useCallback(async zoneId => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    try {
      await writeQueueRef.current;
      const items = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        const fresh = snapshot.data();
        if (fresh?.canvasCombat?.pendingAttack || fresh?.canvasPracticeCombat?.pendingAttack) throw new Error('Resuelve primero el ataque pendiente.');
        const zone = fresh?.items?.find(item => item.id === zoneId && isTarZone(item));
        if (!zone) throw new Error('La brea ya no está en el mapa.');
        const ignition = resolveTarIgnition({ items: fresh.items, fireCells: getTerrainCells(zone, gridConfig), config: gridConfig });
        const nextItems = presentTarIgnition(fresh.items, ignition.zoneIds);
        transaction.update(ref, { items: sanitize(nextItems) });
        return nextItems;
      });
      localItemsRef.current = items;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, items } : current);
      triggerToast('Brea consumida por el Fuego', 'Fuente sin Presión: no genera daño adicional.', 'info');
      return true;
    } catch (error) { triggerToast('No se pudo prender la brea', error.message, 'warning'); return false; }
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, scenarioCollectionName, setActiveScenario, triggerToast]);

  const finishCombat = useCallback(() => {
    if (isPlayerView) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    if (!scenario?.id || !isOpenCombat(currentCombat)) return false;
    if (getCanvasSystem(scenario) === 'campaign') {
      return editCampaignCombat(scenario, (current, items) => {
        if (!isSameRound(currentCombat, current) || !isOpenCombat(current)) return null;
        const combat = finishCanvasCombat(current);
        return { combat, items: items.filter(item => !isTarZone(item) && !isCombatEndArcaneMist(item)).map(item => (
          combat.participants[item.id] ? syncMovementCharacteristic(item, combat.participants[item.id], { reset: true }) : item
        )) };
      }, 'No se pudo finalizar el combate');
    }
    if (currentCombat.status !== 'active') return false;
    const nextCombat = finishCanvasCombat(currentCombat);
    const currentItems = localItemsRef.current || scenario.items || [];
    const nextItems = currentItems.filter(item => !isTarZone(item) && !isCombatEndArcaneMist(item)).map((item) => {
      if (isCanvasBleeding(item)) item = { ...setCanvasBleeding(item, false), runtimeDirty: item.profileType === 'rogueliteClass' || Boolean(item.runtimeDirty) };
      if (isCanvasPoisoned(item)) item = { ...setCanvasPoison(item, false), runtimeDirty: item.profileType === 'rogueliteClass' || Boolean(item.runtimeDirty) };
      const participant = nextCombat.participants?.[item.id];
      const restored = participant ? syncMovementCharacteristic(item, participant, { reset: true }) : item;
      return updateCanvasMageMana(clearArcaneBarrier(clearPotionBuffs(restored)), 'end');
    });
    return persistCombatAndItems(scenario, nextCombat, nextItems, 'No se pudo finalizar el combate', {
      persistRuntime: true, modifiedIds: currentItems.filter(item => hasArcaneBarrier(item) || isCanvasMage(item) || isCanvasPoisoned(item) || isCanvasBleeding(item) || item.stats?.vidaTemporal || item.stats?.movimiento?.potionBonus).map(item => item.id),
    });
  }, [activeScenario, activeScenarioRef, editCampaignCombat, isPlayerView, persistCombatAndItems]);

  const prepareSpellUseResources = useCallback(tokenId => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (getCanvasSystem(scenario) === 'campaign') {
      triggerToast('Habilidad de Campaña', 'Resuelve su efecto en mesa y ajusta los recursos desde el inspector.', 'info');
      return null;
    }
    const token = scenario?.items?.find(item => item.id === tokenId);
    if (!scenario?.id || !canControlToken(token, isPlayerView, playerName) || !isCanvasSpellPractice(scenario.canvasCombat)) return null;
    const reason = getCanvasSpellTurnReason(token, scenario.canvasCombat,
      { practice: true, practiceCombat: scenario.canvasPracticeCombat || practiceCombat });
    if (reason) { triggerToast('Conjuro no disponible', reason, 'warning'); return null; }
    const id = `spell-practice-${tokenId}-${++itemPracticeSequenceRef.current}`;
    const configured = normalizeActionDiceProfile(token.actionDice);
    const profile = configured.length ? configured : ['d6', 'd6', 'd6'];
    const resources = profile.map((die, index) => ({ id: `${id}-${index}`, die, sides: Number(die.slice(1)),
      value: rollDiceProfile([die])[0], status: 'available' }));
    spellPracticeRef.current = { id, scenarioId: scenario.id, tokenId, resources };
    return spellPracticeRef.current;
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, practiceCombat, triggerToast]);

  const castPreparedSpell = useCallback(async ({ castId, tokenId, slotIndex, catalystId, actionDieId,
    manaSpend = 0, conserve = false, point, targetId, spellId = 'fireball', chainId, finishChain = false,
    combatStartedAt, combatRound, practice = false, practiceId } = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (getCanvasSystem(scenario) === 'campaign') return { ok: false };
    if (!scenario?.id || !castId || spellCastBusyRef.current) return { ok: false };
    const key = `${scenario.id}:${castId}`;
    const signature = JSON.stringify({ tokenId, slotIndex, catalystId, actionDieId, manaSpend, conserve, point,
      targetId, spellId, chainId, finishChain, combatStartedAt, combatRound, practice, practiceId });
    const combatField = practice ? 'canvasPracticeCombat' : 'canvasCombat';
    const previous = spellCastAttemptsRef.current.get(key);
    if (previous && previous.signature !== signature) return { ok: false };
    if (previous?.result) return previous.result;
    const attempt = previous || { signature, now: Date.now(), roll: null };
    spellCastAttemptsRef.current.set(key, attempt);
    spellCastBusyRef.current = true;
    setIsCastingSpell(true);
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const receiptRef = doc(db, scenarioCollectionName, scenario.id, 'spell_casts', castId);
        const snapshot = await transaction.get(ref);
        const receipt = await transaction.get(receiptRef);
        if (!snapshot.exists()) throw new Error('La escena ya no existe.');
        const fresh = snapshot.data();
        const token = fresh.items?.find(item => item.id === tokenId);
        if (!canControlToken(token, isPlayerView, playerName)) throw new Error('No controlas este Mago.');
        if (receipt.exists()) {
          if (receipt.data().signature !== signature) throw new Error('La confirmación pertenece a otro lanzamiento.');
          return { result: receipt.data().result, combat: fresh[combatField], items: fresh.items,
            lastModified: fresh.lastModified, effect: fresh.canvasSpellEffect };
        }
        const liveCombat = fresh.canvasCombat;
        if (liveCombat?.startedAt !== combatStartedAt || liveCombat?.round !== combatRound)
          throw new Error('La ronda ha cambiado. Prepara de nuevo el conjuro.');
        let combat = chainId ? fresh[combatField] : liveCombat;
        const chain = chainId ? combat?.arcaneChain : null;
        if (chainId && (chain?.id !== chainId || chain.sourceTokenId !== tokenId || chain.phase !== 'choose-target'
          || combat.pendingAttack || combat.explosiveBlast || (practice && !isCanvasSpellPractice(liveCombat))))
          throw new Error('La Cadena arcana ya no está disponible.');
        if (chainId && finishChain) {
          const nextCombat = { ...combat, arcaneChain: null, updatedAt: attempt.now };
          const result = { ok: true, castId, finished: true };
          transaction.update(ref, sanitize({ [combatField]: nextCombat }));
          transaction.set(receiptRef, sanitize({ signature, result, createdAt: attempt.now }));
          return { result, combat: nextCombat, items: fresh.items, lastModified: fresh.lastModified };
        }
        if (practice && !chainId) {
          const prepared = spellPracticeRef.current;
          if (!isCanvasSpellPractice(liveCombat) || prepared?.id !== practiceId
            || prepared?.scenarioId !== scenario.id || prepared?.tokenId !== tokenId)
            throw new Error('El modo de prueba ha cambiado. Prepara de nuevo el conjuro.');
          const reason = getCanvasSpellTurnReason(token, liveCombat, { practice: true, practiceCombat: fresh.canvasPracticeCombat });
          if (reason) throw new Error(reason);
          combat = createExplosivePracticeCombat(fresh.items, tokenId, prepared.resources, attempt.now, false);
          combat.participants[tokenId].arcaneConservationUsed = Boolean(
            fresh.canvasPracticeCombat?.participants?.[tokenId]?.arcaneConservationUsed);
        } else if (!practice && isCanvasSpellPractice(liveCombat)) {
          throw new Error('El combate ha cambiado. Prepara de nuevo el conjuro.');
        }
        if (needsBleedingChoice(token, combat)) throw new Error('Resuelve Sangrado antes de lanzar.');
        const mist = spellId === 'arcane-mist';
        const barrier = spellId === 'runic-barrier';
        const support = mist || barrier;
        const targetingGrid = spellId === 'arcane-projectile' || support ? { ...gridConfig, ...fresh.config } : gridConfig;
        let selected;
        if (chainId) {
          const origin = fresh.items.find(item => item.id === chain.firstTargetId) || chain.origin;
          const target = fresh.items.find(item => item.id === targetId);
          const placement = resolveArcaneProjectileTarget({ source: token, origin, target,
            catalyst: chain.catalyst, items: fresh.items, gridConfig: targetingGrid, excludeId: chain.firstTargetId });
          selected = placement.valid ? { legal: true, spell: { item: chain.weapon }, catalyst: chain.catalyst,
            profile: chain.profile, die: chain.actionDie, weapon: chain.weapon, placement, target, manaCost: 0 }
            : { legal: false, reason: placement.reason };
        } else {
          const validate = barrier ? validateCanvasArcaneBarrier : mist ? validateCanvasArcaneMist : spellId === 'arcane-projectile' ? validateCanvasArcaneProjectile : validateCanvasFireball;
          selected = validate({ token, combat, slotIndex, catalystId, actionDieId,
            manaSpend, conserve, point, targetId, gridConfig: targetingGrid, items: fresh.items });
        }
        if (!selected.legal) throw new Error(selected.reason);
        let ignition = { zoneIds: [] }, targets = [], pressure, blast;
        if (!support) {
          ignition = expandFireArea({ weapon: selected.weapon, cells: selected.placement.cells, items: fresh.items, gridConfig });
          targets = spellId === 'arcane-projectile' && !ignition.zoneIds.length ? [selected.target]
            : getExplosiveBombTargets({ items: fresh.items, gridConfig, placement: { ...selected.placement, cells: ignition.cells } });
          if (selected.target) targets.sort((a, b) => Number(b.id === targetId) - Number(a.id === targetId));
          if (targets.some(item => hasCanvasMutableArmor(item) && !item.armorProtectionChoice))
            throw new Error('Una criatura del área debe elegir la protección de su Túnica antes de recibir el conjuro.');
          if (practice && !chainId) {
            // Keep defense rolls stable across Firestore retries and failed confirmations.
            const participantSignature = JSON.stringify(fresh.items.map(item => [item.id, item.profileType, item.actionDice]));
            if (attempt.practiceSignature && attempt.practiceSignature !== participantSignature)
              throw new Error('Los dados de las criaturas han cambiado. Prepara de nuevo el conjuro.');
            if (!attempt.practiceCombat) {
              attempt.practiceSignature = participantSignature;
              attempt.practiceCombat = createExplosivePracticeCombat(fresh.items, tokenId, spellPracticeRef.current.resources, attempt.now);
              attempt.practiceCombat.participants[tokenId].arcaneConservationUsed = combat.participants[tokenId].arcaneConservationUsed;
            }
            combat = attempt.practiceCombat;
          }
          const rollSignature = JSON.stringify([selected.catalyst, selected.profile, selected.die]);
          if (attempt.roll && attempt.roll.signature !== rollSignature) throw new Error('El Catalizador o el dado han cambiado. Prepara de nuevo el conjuro.');
          if (!attempt.roll) {
            const results = rollWeaponDice(selected.profile);
            attempt.roll = { signature: rollSignature, results,
              criticalResults: rollCriticalWeaponDice(selected.profile, results, selected.weapon) };
          }
          pressure = calculateCanvasAttackPressure({ attacker: token, actionDice: [selected.die],
            weapon: selected.weapon, weaponResults: attempt.roll.results, criticalResults: attempt.roll.criticalResults });
          const attack = { id: castId, attackerId: tokenId, attackerName: token.name || 'Mago',
            weapon: selected.weapon, weaponName: selected.weapon.name, spellId,
            weaponDiceProfile: selected.profile, weaponResults: attempt.roll.results, criticalResults: attempt.roll.criticalResults,
            actionDice: [selected.die], actionDieIds: [], attackThreatDice: [], manaSpent: selected.manaCost,
            conserved: conserve, pressure, range: { distance: selected.placement.distance, suppressTraits: false },
            ...(chainId ? { chainId, spellCostPaid: true } : {}),
            source: 'digital', createdAt: attempt.now };
          blast = { id: castId, spellId, phase: 'resolving', sourceTokenId: tokenId,
            targetIds: targets.map(item => item.id), targetNames: Object.fromEntries(targets.map(item => [item.id, item.name || 'Objetivo'])),
            attackTemplate: attack, targetAttackTemplates: Object.fromEntries(targets.map(item => {
              const targetAttack = resolveCanvasFireballTargetAttack(attack, item);
              return [item.id, spellId === 'arcane-projectile' && item.id !== targetId
                ? { ...targetAttack, weapon: { ...targetAttack.weapon, preventsActiveDefense: false, ignoresCover: false } } : targetAttack];
            })),
            placement: selected.placement, tarZoneIds: ignition.zoneIds, createdAt: attempt.now };
        }
        let paid = chainId ? combat : consumeItemUseResource(combat, tokenId, { ...selected.die, kind: 'action-die' }, { now: attempt.now });
        if (!chainId && paid === combat) throw new Error('El dado ya no está disponible.');
        if (!chainId && conserve) paid = { ...paid, participants: { ...paid.participants, [tokenId]: { ...paid.participants[tokenId], arcaneConservationUsed: true } } };
        if (spellId === 'arcane-projectile') paid = { ...paid, arcaneChain: !chainId && manaSpend ? {
          id: castId, phase: 'awaiting-impact', sourceTokenId: tokenId, firstTargetId: targetId,
          origin: { id: targetId, x: selected.target.x, y: selected.target.y, width: selected.target.width, height: selected.target.height },
          catalyst: selected.catalyst, profile: selected.profile, weapon: selected.weapon, actionDie: selected.die,
          practice, combatStartedAt, combatRound,
        } : null };
        const nextCombat = support ? paid : startCanvasExplosiveBlast(paid, blast);
        const slots = getCanvasPreparedSpells(token);
        let nextToken = { ...token,
          usedSkillSlots: slots.map(spell => Boolean(spell?.used) || (!chainId && !conserve && spell?.slotIndex === slotIndex)),
          usedSkillSlotIds: slots.map(spell => spell ? resolveItemIdentityKeys(spell.item)[0] || null : null),
          stats: { ...token.stats, recurso: { ...token.stats?.recurso, current: Number(token.stats?.recurso?.current || 0) - selected.manaCost } },
          runtimeDirty: true, canvasRuntimeRevision: Number(token.canvasRuntimeRevision || 0) + 1 };
        if (!support) nextToken = removeHiddenStatusFromToken(nextToken);
        const profileRef = token.linkedClassOwner && token.linkedClassId && token.runId
          ? doc(db, 'players', token.linkedClassOwner, 'rogueliteClasses', token.linkedClassId) : null;
        const profile = profileRef ? await transaction.get(profileRef) : null;
        const run = profile?.exists() ? profile.data().activeRun : null;
        if (run && (!canRogueliteTokenClaimRun(token, run, scenario.id) || Number(run.revision || 0) > Number(token.runRevision || 0)))
          throw new Error('La aventura está sincronizándose. Inténtalo de nuevo.');
        if (profileRef) {
          const revision = Math.max(Number(run?.revision) || 0, Number(token.runRevision) || 0) + 1;
          nextToken = { ...nextToken, runRevision: revision };
          transaction.set(profileRef, sanitize({ activeRun: { ...createRogueliteActiveRunFromToken(nextToken, run,
            { scenarioId: scenario.id, revision, now: attempt.now }), sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision } }), { merge: true });
        }
        let items = (support || targets.length ? fresh.items : presentTarIgnition(fresh.items, ignition.zoneIds))
          .map(item => item.id === tokenId ? nextToken : item);
        const committedAt = Date.now();
        if (mist) items = [...items, ...createArcaneMistAreas({ placement: selected.placement, castId, tokenId, now: committedAt })];
        if (barrier) items = items.map(item => item.id === targetId ? applyArcaneBarrier(item,
          { castId, sourceTokenId: tokenId, catalystId, protections: selected.protections, now: committedAt }) : item);
        const lastModified = Math.max(committedAt, Number(fresh.lastModified || 0) + 1);
        const result = { ok: true, castId, ...(barrier ? { targetId, targetName: selected.target.name, protections: selected.protections }
          : mist ? { cells: selected.placement.cells.length } : { pressure: pressure.total }) };
        const origin = chainId ? fresh.items.find(item => item.id === chain.firstTargetId) || chain.origin : token;
        const effect = { id: castId, spellId, sourceTokenId: tokenId,
          sourcePosition: { x: origin.x, y: origin.y, width: origin.width, height: origin.height,
            ...getCombatRenderPlacement(origin, fresh.items, gridConfig) },
          placement: selected.placement, ...(barrier ? { targetId } : {}), startedAt: committedAt };
        transaction.update(ref, sanitize({ items, [combatField]: nextCombat, lastModified,
          canvasSpellEffect: effect }));
        transaction.set(receiptRef, sanitize({ signature, result, createdAt: attempt.now }));
        if (mist) transaction.set(doc(db, 'combat_log', `mist-${scenario.id}-${castId}`), {
          ...sanitize(buildCanvasArcaneMistLog({ scenarioId: scenario.id, castId, token, spell: selected.spell.item,
            actionDie: selected.die, manaCost: selected.manaCost, conserve, placement: selected.placement, now: committedAt })),
          timestamp: serverTimestamp(),
        });
        if (barrier) transaction.set(doc(db, 'combat_log', `barrier-${scenario.id}-${castId}`), {
          ...sanitize(buildCanvasArcaneBarrierLog({ scenarioId: scenario.id, castId, token, target: selected.target,
            actionDie: selected.die, manaCost: selected.manaCost, conserve, protections: selected.protections, now: committedAt })),
          timestamp: serverTimestamp(),
        });
        return { result, combat: nextCombat, items, lastModified, effect };
      });
      if (practice) { setPracticeCombat(saved.combat); spellPracticeRef.current = null; }
      else localCombatRef.current = saved.combat;
      localItemsRef.current = saved.items;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, items: saved.items,
        [combatField]: saved.combat, lastModified: saved.lastModified,
        ...(saved.effect ? { canvasSpellEffect: saved.effect } : {}) } : current);
      attempt.result = saved.result;
      triggerToast(spellId === 'runic-barrier' ? 'Barrera rúnica' : spellId === 'arcane-mist' ? 'Niebla arcana' : spellId === 'fireball' ? 'Bola de fuego' : 'Proyectil arcano', saved.result.finished
        ? 'Cadena terminada.' : spellId === 'arcane-mist' ? `Humo en un área ${saved.result.cells === 9 ? '3×3' : '2×2'} hasta el final del combate.`
          : spellId === 'runic-barrier' ? `${saved.result.targetName || 'Objetivo'} · +1 CD hasta el final del combate.`
          : `${saved.result.pressure} de Presión${spellId === 'arcane-projectile' ? ' · Sin defensa activa.' : ' · Cada criatura resuelve su defensa.'}`, 'success');
      return saved.result;
    } catch (error) {
      if (!attempt.roll) spellCastAttemptsRef.current.delete(key);
      triggerToast('Conjuro no lanzado', error.message || 'Inténtalo de nuevo.', 'warning');
      return { ok: false };
    } finally { spellCastBusyRef.current = false; setIsCastingSpell(false); }
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const castFireball = useCallback(options => castPreparedSpell({ ...options, spellId: 'fireball' }), [castPreparedSpell]);
  const castArcaneProjectile = useCallback(options => castPreparedSpell({ ...options, spellId: 'arcane-projectile' }), [castPreparedSpell]);
  const castArcaneMist = useCallback(options => castPreparedSpell({ ...options, spellId: 'arcane-mist' }), [castPreparedSpell]);
  const castArcaneBarrier = useCallback(options => castPreparedSpell({ ...options, spellId: 'runic-barrier' }), [castPreparedSpell]);

  const beginAttackDraft = useCallback(({ attackerId, targetId, weapon }) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const attacker = (scenario?.items || []).find((item) => item.id === attackerId);
    const target = (scenario?.items || []).find((item) => item.id === targetId);
    const liveCombat = localCombatRef.current || scenario?.canvasCombat;
    const isPractice = !liveCombat || liveCombat.status !== 'active';
    const unresolvedPractice = practiceCombat || scenario?.canvasPracticeCombat;
    if (isPractice && (unresolvedPractice?.pendingAttack || unresolvedPractice?.explosiveBlast || unresolvedPractice?.arcaneChain)) {
      triggerToast('Resolución pendiente', 'Resuelve la explosión o la defensa antes de preparar otro ataque.', 'warning');
      return false;
    }
    if (needsBleedingChoice(attacker, liveCombat)) return false;
    let currentCombat = liveCombat;
    if (isPractice) {
      currentCombat = createCanvasCombatState(scenario?.items || [], { now: Date.now(), includeNonParticipants: true });
      Object.values(currentCombat.participants || {}).forEach((candidate) => {
        if (candidate.side !== 'players' || !candidate.awaitingRoll) return;
        currentCombat = rollParticipantActionDice(currentCombat, candidate.tokenId);
      });
      const targetParticipant = currentCombat.participants?.[targetId];
      if (targetParticipant?.side === 'players') {
        currentCombat = {
          ...currentCombat,
          participants: {
            ...currentCombat.participants,
            [targetId]: {
              ...targetParticipant,
              actionDice: (targetParticipant.actionDice || []).map((die) => ({ ...die, status: 'committed' })),
            },
          },
        };
      }
      setPracticeCombat(currentCombat);
    }
    const participant = currentCombat?.participants?.[attackerId];

    if (currentCombat.pendingAttack || currentCombat.explosiveBlast || currentCombat.arcaneChain) {
      triggerToast('Ataque pendiente', 'Resuelve la defensa anterior antes de iniciar otro ataque.', 'warning');
      return false;
    }
    if (!canControlToken(attacker, isPlayerView, playerName)) {
      triggerToast('Ataque no permitido', 'No controlas esta ficha.', 'warning');
      return false;
    }
    if (!canTokenSeeThroughSmoke(attacker, target, scenario?.items || [])) {
      triggerToast('Objetivo no visible', 'El humo impide ver al objetivo desde esta ficha.', 'warning');
      return false;
    }
    if (tokenHasHiddenStatus(target) && !areTokensAllied(attacker, target)) {
      triggerToast('Objetivo no detectado', 'No puedes seleccionar directamente un token Oculto enemigo.', 'warning');
      return false;
    }

    const selection = resolveCanvasAttackSelection({ attacker, target, selection: weapon, items: scenario?.items || [], gridConfig });
    if (!selection.legal) {
      triggerToast('Ataque no disponible', selection.reason, 'warning');
      return false;
    }
    const range = selection.range;
    weapon = selection.weapon;
    const availability = getCanvasWeaponAvailability({ token: attacker, participant, weapon });
    if (!availability.available) {
      triggerToast('No puedes usar esa arma', availability.reason, 'warning');
      return false;
    }

    const weaponDiceProfile = selection.profile;
    if (weaponDiceProfile.length === 0) {
      triggerToast('Arma sin perfil de daño', 'Configura su dado de arma antes de utilizarla.', 'warning');
      return false;
    }

    attackRollAttemptRef.current = null;
    setAttackDraft({
      attackerId,
      targetId,
      weapon,
      attackParts: selection.parts,
      range,
      actionCost: getCanvasWeaponActionCost(weapon, attacker),
      weaponDiceProfile,
      practice: isPractice,
    });
    return true;
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, playerName, practiceCombat, triggerToast]);

  const getAttackOptions = useCallback((token, targetId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const attacker = scenario?.items?.find(item => item.id === token?.id) || token;
    const target = scenario?.items?.find(item => item.id === targetId);
    return getCanvasAttackOptions({ attacker, target, items: scenario?.items || [], gridConfig });
  }, [activeScenario, activeScenarioRef, gridConfig]);

  const setAttackWeapons = useCallback((weapons) => {
    if (!attackDraft || confirmingAttackRef.current) return;
    const scenario = activeScenarioRef.current || activeScenario;
    const attacker = scenario?.items?.find(item => item.id === attackDraft.attackerId);
    const target = scenario?.items?.find(item => item.id === attackDraft.targetId);
    if (attacker?.profileType !== 'rogueliteEnemy' || !weapons.length) return;
    const selection = resolveCanvasAttackSelection({ attacker, target, items: scenario.items, gridConfig,
      selection: { ...combineCanvasWeapons(weapons, 'multiweapon'), manualCombatTraits: attackDraft.weapon.manualCombatTraits, extraDamageString: attackDraft.weapon.extraDamageString } });
    if (!selection.legal) return;
    setAttackDraft({ ...attackDraft, weapon: selection.weapon, attackParts: selection.parts, weaponDiceProfile: selection.profile, range: selection.range });
  }, [activeScenario, activeScenarioRef, attackDraft, gridConfig]);

  const cancelAttackDraft = useCallback(() => {
    if (!confirmingAttackRef.current) {
      attackRollAttemptRef.current = null;
      setAttackDraft(null);
    }
  }, []);

  const getWeaponAvailability = useCallback((token, weapon) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const participant = (localCombatRef.current || scenario?.canvasCombat)?.participants?.[token?.id];
    if (!participant) {
      if (token?.profileType === 'rogueliteEnemy') return { available: true, cost: 0, reason: '' };
      const cost = getCanvasWeaponActionCost(weapon, token);
      const profileSize = Array.isArray(token?.actionDice) ? token.actionDice.length : 0;
      return profileSize >= cost
        ? { available: true, cost, reason: '' }
        : { available: false, cost, reason: `Necesitas ${cost} dados de acción en el perfil de la clase.` };
    }
    return getCanvasWeaponAvailability({ token, participant, weapon });
  }, [activeScenario, activeScenarioRef]);

  const confirmAttack = useCallback(({
    actionDieIds = [],
    furySpend = 0,
    manaSpend = 0,
    threatSelection,
    threatMode = 'none',
    customThreatSides = 6,
    useThreat = false,
  } = {}) => {
    if (confirmingAttackRef.current) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = attackDraft?.practice
      ? practiceCombat
      : (localCombatRef.current || scenario?.canvasCombat);
    if (!attackDraft || !currentCombat || currentCombat.pendingAttack || currentCombat.arcaneChain) return false;
    if (!attackDraft.practice && needsBleedingChoice((localItemsRef.current || scenario.items || []).find(item => item.id === attackDraft.attackerId), currentCombat)) return false;

    const attacker = (scenario?.items || []).find((item) => item.id === attackDraft.attackerId);
    const target = (scenario?.items || []).find((item) => item.id === attackDraft.targetId);
    const participant = currentCombat.participants?.[attackDraft.attackerId];
    if (!attacker || !target || !participant) return false;

    if (!canControlToken(attacker, isPlayerView, playerName)
      || !canTokenSeeThroughSmoke(attacker, target, scenario.items || []) || tokenHasHiddenStatus(target)
      || attacker.preventAttack || attacker.cannotAttack) return false;
    const selection = resolveCanvasAttackSelection({ attacker, target, selection: { ...attackDraft.weapon, furySpend, manaSpend }, items: scenario.items, gridConfig });
    if (!selection.legal) { triggerToast('Ataque no disponible', selection.reason, 'warning'); return false; }
    const classResourceSpend = furySpend + manaSpend;
    const availability = getCanvasWeaponAvailability({ token: attacker, participant, weapon: selection.weapon });
    if (!availability.available) { triggerToast('Ataque no disponible', availability.reason, 'warning'); return false; }
    const liveDraft = { ...attackDraft, weapon: selection.weapon, weaponDiceProfile: selection.profile,
      attackParts: selection.parts, range: selection.range, actionCost: getCanvasWeaponActionCost(selection.weapon, attacker) };
    const selectedIds = new Set(attacker.profileType === 'rogueliteEnemy' ? [] : actionDieIds);
    const selectedDice = (participant.actionDice || []).filter((die) => selectedIds.has(die.id));
    if (attacker.profileType !== 'rogueliteEnemy' && (
      selectedIds.size !== actionDieIds.length || selectedIds.size !== liveDraft.actionCost
      || selectedDice.length !== liveDraft.actionCost
      || selectedDice.some((die) => die.status !== 'available')
    )) {
      triggerToast('Dados de acción incompletos', `Selecciona exactamente ${liveDraft.actionCost}.`, 'warning');
      return false;
    }
    const selectedThreat = normalizeCanvasThreatSelection({ threatSelection, threatMode, customThreatSides, useThreat });
    if (attacker.profileType === 'rogueliteEnemy' && selectedThreat.useStored
      && (participant.threatValue === null || participant.threatValue === undefined || !Number.isFinite(Number(participant.threatValue)))) {
      triggerToast('Amenaza no disponible', 'La reserva de Amenaza ya no está disponible.', 'warning');
      return false;
    }
    const thrownRange = evaluateCanvasThrownRange({ attacker, weapon: liveDraft.weapon,
      actionDice: selectedDice, distance: liveDraft.range.distance,
      suppressTraits: liveDraft.range.suppressTraits });
    if (!thrownRange.legal) {
      triggerToast('Fuera de alcance', thrownRange.reason, 'warning');
      return false;
    }
    const rollKey = JSON.stringify([scenario.id, liveDraft, selectedDice, selectedThreat,
      selectedThreat.useStored ? [participant.threatValue, participant.threatDie] : null]);
    const previousRoll = attackRollAttemptRef.current?.key === rollKey ? attackRollAttemptRef.current : null;
    const weaponResults = previousRoll?.weaponResults || rollWeaponDice(liveDraft.weaponDiceProfile);
    const attackThreatDice = previousRoll?.attackThreatDice || (attacker.profileType === 'rogueliteEnemy'
      ? rollCanvasThreatDice({
        threatSelection: selectedThreat,
        storedThreatValue: participant.threatValue,
        storedThreatDie: participant.threatDie,
      })
      : []);
    const threatUsed = attackThreatDice.length === 1 ? attackThreatDice[0] : null;
    const storedThreat = attackThreatDice.find(die => die.source === 'stored');

    const criticalResults = previousRoll?.criticalResults || rollCriticalWeaponDice(
      liveDraft.weaponDiceProfile,
      weaponResults,
      liveDraft.weapon,
      liveDraft.range.suppressTraits,
    );

    const pressure = calculateCanvasAttackPressure({
      attacker,
      actionDice: selectedDice,
      weaponResults,
      criticalResults,
      threatDice: attackThreatDice,
      distance: liveDraft.range.distance,
      weapon: liveDraft.weapon,
      suppressTraits: liveDraft.range.suppressTraits,
    });
    const now = previousRoll?.now || Date.now();
    const attackId = previousRoll?.id || globalThis.crypto?.randomUUID?.() || `canvas-attack-${now}-${liveDraft.attackerId}`;
    attackRollAttemptRef.current = { key: rollKey, weaponResults, attackThreatDice, criticalResults, now, id: attackId };
    const attack = {
      id: attackId,
      attackerId: liveDraft.attackerId,
      targetId: liveDraft.targetId,
      attackerName: attacker.name || 'Atacante',
      targetName: target.name || 'Objetivo',
      weapon: liveDraft.weapon,
      attackMode: selection.mode,
      furySpent: furySpend,
      manaSpent: manaSpend,
      needsAdjustment: hasCanvasAttackAdjustment(attacker) && selectedDice.length > 0,
      attackParts: selection.parts,
      weaponName: liveDraft.weapon.name || liveDraft.weapon.nombre || 'Arma',
      weaponDiceProfile: liveDraft.weaponDiceProfile,
      weaponResults: weaponResults.map(Number),
      criticalResults,
      actionDieIds: [...selectedIds],
      actionDice: selectedDice,
      usedThreat: Boolean(storedThreat),
      attackThreatDice,
      threatUsed,
      attackThreatUsed: threatUsed,
      ...(threatUsed ? { threatDieSides: threatUsed.sides } : {}),
      pressure,
      range: liveDraft.range,
      source: 'digital',
      createdAt: now,
    };
    const cunningOption = getCanvasCunningOption(attacker, attack);
    attack.needsCunning = cunningOption.eligible && cunningOption.available > 0;
    const next = queueCanvasAttack(currentCombat, attack, { now });
    if (next === currentCombat) return false;
    confirmingAttackRef.current = true;
    setIsConfirmingAttack(true);
    const publish = async () => {
      try {
        await writeQueueRef.current;
        const field = liveDraft.practice ? 'canvasPracticeCombat' : 'canvasCombat';
        const saved = await runTransaction(db, async transaction => {
          const ref = doc(db, scenarioCollectionName, scenario.id);
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) throw new Error('La escena ya no existe.');
          const fresh = snapshot.data();
          const freshCombat = fresh[field] || (liveDraft.practice ? currentCombat : null);
          if (needsBleedingChoice(fresh.items?.find(item => item.id === attack.attackerId), freshCombat)) throw new Error('Resuelve Sangrado antes de atacar.');
          if (freshCombat?.pendingAttack?.id === attack.id) return { combat: freshCombat, items: fresh.items, lastModified: fresh.lastModified };
          if (!freshCombat || freshCombat.pendingAttack || freshCombat.explosiveBlast) {
            throw new Error('Hay una resolución pendiente.');
          }
          const freshAttacker = fresh.items?.find(item => item.id === attacker.id);
          const freshTarget = fresh.items?.find(item => item.id === target.id);
          const freshSelection = resolveCanvasAttackSelection({ attacker: freshAttacker, target: freshTarget, selection: liveDraft.weapon, items: fresh.items, gridConfig });
          if (!canControlToken(freshAttacker, isPlayerView, playerName) || !freshSelection.legal
            || !canTokenSeeThroughSmoke(freshAttacker, freshTarget, fresh.items) || tokenHasHiddenStatus(freshTarget)
            || freshAttacker.preventAttack || freshAttacker.cannotAttack
            || JSON.stringify(freshSelection.parts.map(part => [part.weaponId, part.profile.map(die => die.sides), [...part.traits].sort(), part.range.distance, part.range.suppressTraits])) !== JSON.stringify(selection.parts.map(part => [part.weaponId, part.profile.map(die => die.sides), [...part.traits].sort(), part.range.distance, part.range.suppressTraits]))
            || getCanvasWeaponActionCost(freshSelection.weapon, freshAttacker) !== liveDraft.actionCost
            || !getCanvasWeaponAvailability({ token: freshAttacker, participant: freshCombat.participants?.[attacker.id], weapon: selection.weapon }).available) {
            throw new Error('La situación o el equipo ha cambiado. Vuelve a preparar el ataque.');
          }
          if (attack.usedThreat && (freshCombat.participants?.[attacker.id]?.threatValue !== participant.threatValue
            || freshCombat.participants?.[attacker.id]?.threatDie !== participant.threatDie)) throw new Error('La reserva de Amenaza ha cambiado.');
          if (Number(freshAttacker.offenseBase ?? freshAttacker.stats?.ofensiva?.current ?? 0) !== Number(attacker.offenseBase ?? attacker.stats?.ofensiva?.current ?? 0)) throw new Error('La Base ofensiva ha cambiado.');
          const freshDice = freshCombat.participants?.[attacker.id]?.actionDice || [];
          if (selectedDice.some(die => !freshDice.some(candidate => candidate.id === die.id && candidate.value === die.value && candidate.status === 'available'))) throw new Error('Los dados seleccionados ya no están disponibles.');
          const freshThrownRange = evaluateCanvasThrownRange({ attacker: freshAttacker, weapon: freshSelection.weapon,
            actionDice: selectedDice, distance: freshSelection.range.distance,
            suppressTraits: freshSelection.range.suppressTraits });
          if (!freshThrownRange.legal) throw new Error(freshThrownRange.reason);
          const freshCunning = getCanvasCunningOption(freshAttacker, attack);
          let queued = queueCanvasAttack(freshCombat, { ...attack,
            needsCunning: freshCunning.eligible && freshCunning.available > 0 }, { now });
          if (!isCanvasCunningPending(queued.pendingAttack)) queued = attachTarIgnition(queued, fresh.items || [], gridConfig);
          if (queued === freshCombat) throw new Error('No se ha podido comprometer el ataque.');
          let nextItems = fresh.items;
          const lastModified = Math.max(now, Number(fresh.lastModified || 0) + 1);
          if (classResourceSpend) {
            // Read and validate the linked run before any writes: both documents
            // must advance together or a sheet snapshot could restore the resource.
            const linked = freshAttacker.linkedClassOwner && freshAttacker.linkedClassId && freshAttacker.runId;
            const profileRef = linked ? doc(db, 'players', freshAttacker.linkedClassOwner, 'rogueliteClasses', freshAttacker.linkedClassId) : null;
            const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
            const currentRun = profileSnapshot?.exists() ? profileSnapshot.data().activeRun : null;
            if (currentRun && (!canRogueliteTokenClaimRun(freshAttacker, currentRun, scenario.id)
              || Number(currentRun.revision || 0) > Number(freshAttacker.runRevision || 0))) throw new Error('La aventura ha cambiado. Espera a que la ficha se sincronice.');
            let nextToken = { ...freshAttacker,
              canvasRuntimeRevision: Number(freshAttacker.canvasRuntimeRevision || 0) + 1,
              stats: { ...freshAttacker.stats, recurso: { ...freshAttacker.stats.recurso, current: Number(freshAttacker.stats.recurso.current) - classResourceSpend } } };
            if (profileRef) {
              const revision = Math.max(Number(currentRun?.revision) || 0, Number(freshAttacker.runRevision) || 0) + 1;
              const activeRun = { ...createRogueliteActiveRunFromToken(nextToken, currentRun, { scenarioId: scenario.id, revision, now }),
                sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision };
              nextToken = { ...nextToken, runRevision: revision };
              transaction.set(profileRef, sanitize({ activeRun }), { merge: true });
            }
            nextItems = fresh.items.map(item => item.id === nextToken.id ? nextToken : item);
          }
          transaction.update(ref, sanitize({ [field]: queued, ...(classResourceSpend ? { items: nextItems, lastModified } : {}) }));
          return { combat: queued, items: nextItems, lastModified: classResourceSpend ? lastModified : fresh.lastModified };
        });
        if (liveDraft.practice) setPracticeCombat(saved.combat);
        else localCombatRef.current = saved.combat;
        if (classResourceSpend) localItemsRef.current = saved.items;
        setActiveScenario(current => current?.id === scenario.id ? { ...current, [field]: saved.combat,
          ...(classResourceSpend ? { items: saved.items, lastModified: saved.lastModified } : {}) } : current);
        attackRollAttemptRef.current = null;
        setAttackDraft(null);
        triggerToast(isCanvasCunningPending(saved.combat.pendingAttack) ? 'Tirada realizada' : 'Ataque lanzado', `${attack.weaponName}: ${pressure.total} de Presión`, 'success');
        return true;
      } catch (error) {
        triggerToast('Ataque no confirmado', error.message, 'warning');
        return false;
      } finally { confirmingAttackRef.current = false; setIsConfirmingAttack(false); }
    };
    return publish();
  }, [activeScenario, activeScenarioRef, attackDraft, practiceCombat, triggerToast, gridConfig, isPlayerView, playerName, scenarioCollectionName, setActiveScenario]);

  const resolveCunning = useCallback(async ({ dieIndex, choice } = {}) => {
    if (cunningBusyRef.current) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const practice = Boolean(scenario?.canvasPracticeCombat?.pendingAttack);
    const field = practice ? 'canvasPracticeCombat' : 'canvasCombat';
    const pending = scenario?.[field]?.pendingAttack;
    if (!isCanvasCunningPending(pending)) return false;
    cunningBusyRef.current = true;
    setIsResolvingCunning(true);
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('La escena ya no existe.');
        const fresh = snapshot.data();
        const current = fresh[field];
        const attack = current?.pendingAttack;
        const token = fresh.items?.find(item => item.id === attack?.attackerId);
        if (attack?.id !== pending.id || !isCanvasCunningPending(attack)
          || !canControlToken(token, isPlayerView, playerName)) throw new Error('Este ataque ya ha cambiado o no te pertenece.');
        let nextAttack;
        let nextItems = fresh.items;
        const spending = Number.isInteger(dieIndex) && choice === undefined;
        const now = Date.now();
        if (spending) {
          const option = getCanvasCunningOption(token, attack);
          if (attack.status !== 'awaiting-cunning' || !option.eligible || option.available < 1
            || !option.dice.some(die => die.index === dieIndex)) throw new Error('Golpe sucio necesita 1 de Astucia y un dado de arma válido.');
          const linked = token.linkedClassOwner && token.linkedClassId && token.runId;
          const profileRef = linked ? doc(db, 'players', token.linkedClassOwner, 'rogueliteClasses', token.linkedClassId) : null;
          const profileSnapshot = profileRef ? await transaction.get(profileRef) : null;
          const currentRun = profileSnapshot?.exists() ? profileSnapshot.data().activeRun : null;
          if (currentRun && (!canRogueliteTokenClaimRun(token, currentRun, scenario.id)
            || Number(currentRun.revision || 0) > Number(token.runRevision || 0))) throw new Error('Espera a que la aventura se sincronice.');
          const key = `${attack.id}:${dieIndex}`;
          // Stable through transaction retries and network retries: never reroll
          // a second time just because Firestore repeats the callback.
          if (cunningRollRef.current?.key !== key) cunningRollRef.current = { key, result: rollCanvasCunningDie(attack, dieIndex) };
          nextAttack = { ...attack, status: 'awaiting-cunning-choice', cunningSpent: 1, cunning: cunningRollRef.current.result };
          let nextToken = { ...token, canvasRuntimeRevision: Number(token.canvasRuntimeRevision || 0) + 1,
            stats: { ...token.stats, recurso: { ...token.stats.recurso, current: Number(token.stats.recurso.current) - 1 } } };
          if (profileRef) {
            const revision = Math.max(Number(currentRun?.revision) || 0, Number(token.runRevision) || 0) + 1;
            const activeRun = { ...createRogueliteActiveRunFromToken(nextToken, currentRun, { scenarioId: scenario.id, revision, now }),
              sourceCanvasRuntimeRevision: nextToken.canvasRuntimeRevision };
            nextToken = { ...nextToken, runRevision: revision };
            transaction.set(profileRef, sanitize({ activeRun }), { merge: true });
          }
          nextItems = fresh.items.map(item => item.id === nextToken.id ? nextToken : item);
        } else {
          nextAttack = finishCanvasCunning(attack, token, choice);
          if (!nextAttack) throw new Error('Elige el resultado original o la nueva tirada.');
        }
        let combat = { ...current, pendingAttack: nextAttack, updatedAt: now };
        if (!isCanvasCunningPending(nextAttack)) combat = attachTarIgnition(combat, nextItems || [], gridConfig);
        const lastModified = Math.max(now, Number(fresh.lastModified || 0) + 1);
        transaction.update(ref, sanitize({ [field]: combat, ...(spending ? { items: nextItems, lastModified } : {}) }));
        return { combat, items: nextItems, lastModified: spending ? lastModified : fresh.lastModified };
      });
      if (practice) setPracticeCombat(saved.combat); else localCombatRef.current = saved.combat;
      localItemsRef.current = saved.items;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, [field]: saved.combat, items: saved.items,
        ...(saved.lastModified !== undefined ? { lastModified: saved.lastModified } : {}) } : current);
      return true;
    } catch (error) {
      triggerToast('No se pudo aplicar Golpe sucio', error.message, 'warning');
      return false;
    } finally { cunningBusyRef.current = false; setIsResolvingCunning(false); }
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast, gridConfig]);

  const finishAttackAdjustment = useCallback(async (choice = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const practice = Boolean(scenario?.canvasPracticeCombat?.pendingAttack);
    const field = practice ? 'canvasPracticeCombat' : 'canvasCombat';
    const attackId = scenario?.[field]?.pendingAttack?.id;
    if (!attackId) return false;
    try {
      await writeQueueRef.current;
      const saved = await runTransaction(db, async transaction => {
        const ref = doc(db, scenarioCollectionName, scenario.id);
        const snapshot = await transaction.get(ref);
        const fresh = snapshot.data();
        const current = fresh?.[field];
        const pending = current?.pendingAttack;
        const token = fresh?.items?.find(item => item.id === pending?.attackerId);
        if (pending?.id !== attackId || !canControlToken(token, isPlayerView, playerName)) throw new Error('No puedes ajustar este ataque.');
        if (choice.replaceDieId && choice.withDieId) {
          const replacement = current.participants?.[pending.attackerId]?.actionDice?.find(die => die.id === choice.withDieId);
          if (replacement?.status === 'available' && pending.actionDieIds?.includes(choice.replaceDieId)) {
            const adjustedDice = pending.actionDice.map(die => die.id === choice.replaceDieId ? replacement : die);
            const reach = evaluateCanvasThrownRange({ attacker: token, weapon: pending.weapon,
              actionDice: adjustedDice, distance: pending.range?.distance,
              suppressTraits: pending.range?.suppressTraits });
            if (!reach.legal) throw new Error(reach.reason);
          }
        }
        const next = adjustCanvasPendingAttack(current, choice);
        if (next === current) return current;
        transaction.update(ref, { [field]: sanitize(next) });
        return next;
      });
      if (practice) setPracticeCombat(saved); else localCombatRef.current = saved;
      setActiveScenario(current => current?.id === scenario.id ? { ...current, [field]: saved } : current);
      return true;
    } catch (error) { triggerToast('No se pudo aplicar Ajuste', error.message, 'warning'); return false; }
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

  const rollEnemyDefense = useCallback(({ equipmentIds, equipmentId, threatSelection, threatMode = 'none', customThreatSides = 6, useThreat = false } = {}) => {
    if (rollingDefenseRef.current) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const isPractice = Boolean(practiceCombat?.pendingAttack);
    const currentCombat = isPractice
      ? practiceCombat
      : (localCombatRef.current || scenario?.canvasCombat);
    const pending = currentCombat?.pendingAttack;
    const target = (scenario?.items || []).find((item) => item.id === pending?.targetId);
    const participant = currentCombat?.participants?.[pending?.targetId];
    if (!scenario?.id || !pending || !target || isCanvasCunningPending(pending) || pending.status === 'defense-rolled' || pending.status === 'awaiting-adjustment'
      || !canControlToken(target, isPlayerView, playerName)) return false;
    if (pending.weapon?.preventsActiveDefense) {
      triggerToast('Sin defensa activa', 'Proyectil arcano no permite gastar acciones ni Amenaza para defenderse.', 'warning');
      return false;
    }

    const eligibility = getEnemyActiveDefenseEligibility({ token: target, participant });
    if (!eligibility.eligible) {
      triggerToast('Defensa no disponible', eligibility.reason, 'warning');
      return false;
    }
    let requestedIds = equipmentIds;
    if (!Array.isArray(requestedIds)) {
      const exact = getCanvasDefensiveEquipment(target).find(item => getCanvasWeaponIdentity(item) === String(equipmentId));
      const legacyMatches = exact ? [exact] : getCanvasDefensiveEquipment(target).filter(item => (
        String(item.id || item.catalogId || item.name || item.nombre) === String(equipmentId)
      ));
      requestedIds = legacyMatches.length === 1 ? [getCanvasWeaponIdentity(legacyMatches[0])] : [];
    }
    const selection = resolveCanvasEnemyDefenseSelection({ token: target, equipmentIds: requestedIds });
    if (!selection.legal || !selection.weapons.length) {
      triggerToast('Defensa no válida', selection.reason || 'Elige al menos un arma para tirar defensa activa.', 'warning');
      return false;
    }
    const selectionSignature = defenseSelectionSignature(selection);

    const selectedThreat = normalizeCanvasThreatSelection({ threatSelection, threatMode, customThreatSides, useThreat });
    if (selectedThreat.useStored && (participant.threatValue === null || participant.threatValue === undefined
      || !Number.isFinite(Number(participant.threatValue)))) {
      triggerToast('Amenaza no disponible', 'La reserva de Amenaza ya no está disponible.', 'warning');
      return false;
    }
    const rollKey = JSON.stringify([scenario.id, pending.id, selectionSignature, selectedThreat,
      selectedThreat.useStored ? [participant.threatValue, participant.threatDie] : null]);
    const previousRoll = defenseRollAttemptRef.current?.key === rollKey ? defenseRollAttemptRef.current : null;
    const rolledDefense = previousRoll?.rolledDefense || rollCanvasEnemyDefense({
      equipments: selection.items,
      threatSelection: selectedThreat,
      storedThreatValue: participant.threatValue,
      storedThreatDie: participant.threatDie,
    });
    const defenseRollId = previousRoll?.id || globalThis.crypto?.randomUUID?.() || `defense-${pending.id}-${Date.now()}`;
    defenseRollAttemptRef.current = { key: rollKey, rolledDefense, id: defenseRollId };
    const defenseDice = rolledDefense.defenseDice.map((die, index) => ({ ...die, id: `enemy-defense-${pending.id}-${index}` }));
    const defenseThreatDice = rolledDefense.defenseThreatDice.map(die => ({ ...die, id: `enemy-defense-${pending.id}-${die.id}` }));
    const threatDie = defenseThreatDice.length === 1 ? defenseThreatDice[0] : null;
    const totalDefense = rolledDefense.totalDefense;
    rollingDefenseRef.current = pending.id;
    setIsRollingEnemyDefense(true);
    const publish = async () => {
      try {
        await writeQueueRef.current;
        const field = isPractice ? 'canvasPracticeCombat' : 'canvasCombat';
        const saved = await runTransaction(db, async transaction => {
          const ref = doc(db, scenarioCollectionName, scenario.id);
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) throw new Error('La escena ya no existe.');
          const fresh = snapshot.data();
          const freshCombat = pruneCombatState(fresh[field], fresh.items || []);
          const freshPending = freshCombat?.pendingAttack;
          if (freshPending?.id === pending.id && freshPending.defenseRollId === defenseRollId) return freshCombat;
          if (freshPending?.id !== pending.id || isCanvasCunningPending(freshPending) || freshPending.status === 'defense-rolled'
            || freshPending.status === 'awaiting-adjustment') throw new Error('La defensa de este ataque ya ha cambiado.');
          const freshTarget = fresh.items?.find(item => item.id === pending.targetId);
          const freshParticipant = freshCombat.participants?.[pending.targetId];
          const freshEligibility = getEnemyActiveDefenseEligibility({ token: freshTarget, participant: freshParticipant });
          const freshSelection = resolveCanvasEnemyDefenseSelection({ token: freshTarget, equipmentIds: requestedIds });
          if (!canControlToken(freshTarget, isPlayerView, playerName) || !freshEligibility.eligible || !freshSelection.legal
            || defenseSelectionSignature(freshSelection) !== selectionSignature) {
            throw new Error('La situación o el equipo defensivo ha cambiado.');
          }
          if (rolledDefense.consumedStoredThreat && (freshParticipant.threatValue !== participant.threatValue
            || freshParticipant.threatDie !== participant.threatDie)) throw new Error('La reserva de Amenaza ha cambiado.');
          const incomingPressure = Math.max(0, Number(freshPending.pressure?.total) || 0);
          const nextCombat = {
            ...freshCombat,
            participants: {
              ...freshCombat.participants,
              [pending.targetId]: {
                ...freshParticipant,
                threatValue: rolledDefense.consumedStoredThreat ? null : freshParticipant.threatValue,
                enemyActions: (freshParticipant.enemyActions || []).map(action => (
                  action.id === 'attack' ? { ...action, status: 'spent' } : action
                )),
              },
            },
            pendingAttack: {
              ...freshPending,
              status: 'defense-rolled', defenseRollId,
              defenseItems: freshSelection.weapons, defenseItem: freshSelection.weapons[0] || null,
              defenseShield: freshSelection.shield || null, defenseCdBonus: freshSelection.cdBonus,
              defenseDice, defenseThreatDice,
              threatUsed: threatDie, totalDefense,
              remainingPressure: Math.max(0, incomingPressure - totalDefense),
              defensiveExcess: Math.max(0, totalDefense - incomingPressure),
            },
            updatedAt: Date.now(),
          };
          transaction.update(ref, { [field]: sanitize(nextCombat) });
          return nextCombat;
        });
        if (isPractice) setPracticeCombat(saved); else localCombatRef.current = saved;
        setActiveScenario(current => current?.id === scenario.id ? { ...current, [field]: saved } : current);
        defenseRollAttemptRef.current = null;
        return true;
      } catch (error) {
        triggerToast('Defensa no confirmada', error.message, 'warning');
        return false;
      } finally {
        rollingDefenseRef.current = null;
        setIsRollingEnemyDefense(false);
      }
    };
    return publish();
  }, [activeScenario, activeScenarioRef, practiceCombat, triggerToast, isPlayerView, playerName, scenarioCollectionName, setActiveScenario]);

  const cancelPendingAttack = useCallback(async () => {
    const scenario = activeScenarioRef.current || activeScenario;
    const isPractice = Boolean(practiceCombat?.pendingAttack);
    const currentCombat = isPractice
      ? practiceCombat
      : (localCombatRef.current || scenario?.canvasCombat);
    if (!currentCombat?.pendingAttack || !scenario?.id || currentCombat.pendingAttack.source === 'digital') return false;

    const nextCombat = cancelQueuedCanvasAttack(currentCombat);
    if (isPractice) persistPracticeCombat(null);
    else localCombatRef.current = nextCombat;
    if (!isPractice) {
      setActiveScenario((current) => (
        current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
      ));
      updateCombat(() => nextCombat);
    }
    triggerToast('Ataque descartado', 'Se ha cancelado el ataque pendiente.', 'info');
    return true;
  }, [activeScenario, activeScenarioRef, persistPracticeCombat, practiceCombat, setActiveScenario, triggerToast, updateCombat]);

  const resolvePendingAttack = useCallback(async (defenseDieIds = [], options = {}) => {
    if (rollingDefenseRef.current) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    const isPractice = Boolean(practiceCombat?.pendingAttack);
    const currentCombat = isPractice
      ? practiceCombat
      : (localCombatRef.current || scenario?.canvasCombat);
    const pending = currentCombat?.pendingAttack;
    if (!pending || !scenario?.id || isCanvasCunningPending(pending) || pending.status === 'awaiting-adjustment') return false;
    if (pending.weapon?.preventsActiveDefense && (defenseDieIds.length || pending.status === 'defense-rolled')) {
      triggerToast('Sin defensa activa', 'Proyectil arcano se resuelve contra la CD y la protección pasiva.', 'warning');
      return false;
    }

    if (resolvingAttackRef.current === pending.id) return false;
    const attacker = (scenario.items || []).find((item) => item.id === pending.attackerId);
    const target = (scenario.items || []).find((item) => item.id === pending.targetId);
    if (!target) {
      // Si desaparece un blanco de una explosión, los demás aún deben defenderse.
      const nextCombat = continueCanvasExplosiveBlast(
        cancelQueuedCanvasAttack(currentCombat), pending, scenario.items || [],
      );
      const burned = nextCombat.explosiveBlast?.id !== currentCombat.explosiveBlast?.id ? currentCombat.explosiveBlast?.tarZoneIds || [] : [];
      if (burned.length) {
        const items = presentTarIgnition(scenario.items || [], burned);
        localItemsRef.current = items;
        setActiveScenario(current => current?.id === scenario.id ? { ...current, items } : current);
        await safePersistItems?.(scenario.id, items, scenario.items, burned, { persistRuntime: false });
      }
      if (isPractice) persistPracticeCombat(nextCombat.explosiveBlast ? nextCombat : null);
      else {
        setActiveScenario((current) => (
          current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
        ));
        updateCombat(() => nextCombat);
      }
      triggerToast('Objetivo ausente', 'La explosión continúa con las demás criaturas.', 'info');
      return true;
    }

    if (!canControlToken(target, isPlayerView, playerName) && isPlayerView) {
      triggerToast('Defensa no permitida', 'No controlas el objetivo de este ataque.', 'warning');
      return false;
    }

    const targetParticipant = currentCombat.participants?.[pending.targetId];
    const usableDefenseDice = getUsableDefenseDice(targetParticipant);
    const selectedIds = new Set(defenseDieIds);
    const isEnemyTarget = target.profileType === 'rogueliteEnemy';
    const isEnemyDefense = isEnemyTarget && pending.status === 'defense-rolled';
    let resolvedPending = pending;
    let defenseCdBonus = isEnemyDefense ? Number(pending.defenseCdBonus) || 0 : 0;
    if (isEnemyTarget && !isEnemyDefense) {
      const passiveSelection = Array.isArray(options.equipmentIds)
        ? resolveCanvasEnemyDefenseSelection({ token: target, equipmentIds: options.equipmentIds })
        : defaultEnemyShieldSelection(target);
      if (!passiveSelection.legal || passiveSelection.weapons.length) {
        triggerToast('Defensa no válida', passiveSelection.reason || 'Tira primero la defensa de las armas seleccionadas.', 'warning');
        return false;
      }
      defenseCdBonus = passiveSelection.cdBonus;
      resolvedPending = { ...pending, defenseItems: [], defenseItem: null,
        defenseShield: passiveSelection.shield || null, defenseCdBonus,
      };
    }
    const defenseDice = isEnemyDefense
      ? [...(pending.defenseDice || []), ...getCanvasDefenseThreatDice(pending)]
      : isEnemyTarget ? [] : usableDefenseDice.filter((die) => selectedIds.has(die.id));
    if (!isEnemyDefense && defenseDice.length !== selectedIds.size) {
      triggerToast('Defensa no válida', 'Alguno de esos dados ya no está disponible.', 'warning');
      return false;
    }

    const resolution = resolveCanvasAttackDamage({
      attackPressure: pending.pressure?.total || 0,
      defenseDice,
      target,
      defenseCdBonus,
      weapon: pending.weapon,
      suppressTraits: pending.range?.suppressTraits,
    });
    if (resolution.surplus > 0 && !['reposition', 'counterattack', 'discard'].includes(options.excessChoice)) {
      triggerToast('Elige el Excedente', 'Usa todo el Excedente para reposicionarte o contraatacar.', 'warning');
      return false;
    }
    if (options.excessChoice === 'reposition' && isCanvasProne(target)) {
      triggerToast('Derribado', 'No puedes realizar movimientos reactivos hasta levantarte.', 'warning');
      return false;
    }
    const now = Date.now();
    const nextCombat = resolveQueuedCanvasAttack(currentCombat, {
      attackId: pending.id,
      defenseDieIds: [...selectedIds],
      ...resolution,
    }, { now });
    if (nextCombat === currentCombat) return false;

    let resolvedCombat = nextCombat;
    if (options.excessChoice === 'reposition' && resolution.surplus > 0) {
      const resolvedParticipant = nextCombat.participants?.[target.id];
      if (resolvedParticipant) {
        resolvedCombat = {
          ...nextCombat,
          participants: {
            ...nextCombat.participants,
            [target.id]: {
              ...resolvedParticipant,
              defensiveReposition: { remaining: (Number(resolvedParticipant.defensiveReposition?.remaining) || 0) + resolution.surplus, ignoresDuelExit: true },
            },
          },
        };
      }
    }

    let counterResolution = null;
    let resolvedCounterWeapon = null;
    let counterIgnitionIds = [];
    if (options.excessChoice === 'counterattack' && resolution.surplus > 0) {
      const legalWeapons = getCanvasCounterattackWeapons({ defender: target, attacker, items: scenario.items || [], gridConfig });
      const requested = options.counterWeapon;
      const counterWeapon = requested
        ? legalWeapons.find((weapon) => getCanvasWeaponIdentity(weapon) === getCanvasWeaponIdentity(requested))
        : getPreferredCanvasCounterattackWeapon({ pending, participant: targetParticipant, weapons: legalWeapons });
      if (!counterWeapon) {
        triggerToast('Contraataque no válido', 'Necesitas un arma equipada que alcance al atacante.', 'warning');
        return false;
      }
      const counterSelection = resolveCanvasAttackSelection({
        attacker: target,
        target: attacker,
        selection: counterWeapon,
        items: scenario.items || [],
        gridConfig,
      });
      if (!counterSelection.legal) {
        triggerToast('Contraataque no válido', 'El arma debe poder alcanzar legalmente y no puede lanzarse.', 'warning');
        return false;
      }
      resolvedCounterWeapon = counterSelection.weapon;
      counterResolution = resolveCanvasAttackDamage({
        attackPressure: resolution.surplus,
        defenseDice: [],
        target: attacker,
        defenseCdBonus: counterattackShieldBonus(attacker, pending),
        weapon: counterSelection.weapon,
        suppressTraits: false,
      });
      resolvedCombat = {
        ...resolvedCombat,
        participants: {
          ...resolvedCombat.participants,
          [target.id]: { ...resolvedCombat.participants[target.id], lastAttackWeaponIds: [getCanvasWeaponIdentity(counterWeapon)] },
        },
      };
    }

    if (counterResolution && resolvedCounterWeapon) {
      const alreadyBurning = new Set([...(currentCombat.explosiveBlast?.tarZoneIds || []),
        ...(currentCombat.queuedFireBursts || []).flatMap(burst => burst.tarZoneIds || [])]);
      const counterAttack = { id: `counter-fire-${pending.id}`, attackerId: target.id, targetId: attacker.id,
        attackerName: target.name, targetName: attacker.name, weapon: resolvedCounterWeapon,
        weaponName: resolvedCounterWeapon.name || resolvedCounterWeapon.nombre,
        weaponDiceProfile: [], weaponResults: [], actionDice: [], actionDieIds: [],
        pressure: { total: resolution.surplus, actionPressure: 0, weaponPressure: 0, threatPressure: 0 },
        range: { distance: 0, suppressTraits: false }, source: 'digital', status: 'awaiting-defense', createdAt: now };
      const ignited = attachTarIgnition({ pendingAttack: counterAttack },
        (scenario.items || []).filter(item => !alreadyBurning.has(item.id)), gridConfig).explosiveBlast;
      if (ignited) {
        const extraTargets = ignited.targetIds.filter(id => id !== attacker.id);
        if (extraTargets.length) resolvedCombat = { ...resolvedCombat,
          queuedFireBursts: [...(resolvedCombat.queuedFireBursts || []), { ...ignited, targetIds: extraTargets, nextTargetIndex: 0 }] };
        else counterIgnitionIds = ignited.tarZoneIds;
      }
    }

    resolvedCombat = continueCanvasExplosiveBlast(resolvedCombat, pending, scenario.items || []);

    resolvingAttackRef.current = pending.id;
    const nextTarget = {
      ...presentArcaneBarrierImpact(applyAttackBleeding(applyAttackPoison(target, pending.weapon, resolution, pending.range?.suppressTraits), pending.weapon, resolution, pending.range?.suppressTraits, currentCombat), pending.id, now),
      ...(resolution.lifeLost > 0 ? { canvasDamageEffect: {
        id: pending.id, previousLife: Number(target.stats?.vida?.current), nextLife: resolution.nextLife,
        ...(resolution.temporaryLifeLost > 0 ? { previousTemporaryLife: target.stats.vidaTemporal.current, nextTemporaryLife: resolution.nextTemporaryLife } : {}),
        bleedingApplied: !isCanvasBleeding(target) && isCanvasBleeding(applyAttackBleeding(target, pending.weapon, resolution, pending.range?.suppressTraits, currentCombat)),
        poisonApplied: !isCanvasPoisoned(target) && isCanvasPoisoned(applyAttackPoison(target, pending.weapon, resolution, pending.range?.suppressTraits)),
      } } : {}),
      stats: {
        ...(target.stats || {}),
        ...(resolution.nextTemporaryLife != null ? { vidaTemporal: { ...target.stats.vidaTemporal, current: resolution.nextTemporaryLife } } : {}),
        vida: {
          ...(target.stats?.vida || {}),
          current: resolution.nextLife,
        },
      },
      runtimeDirty: target.profileType === 'rogueliteClass',
    };
    const burnedZoneIds = [...counterIgnitionIds, ...(resolvedCombat.explosiveBlast?.id !== currentCombat.explosiveBlast?.id ? currentCombat.explosiveBlast?.tarZoneIds || [] : [])];
    const nextItems = presentTarIgnition(scenario.items || [], burnedZoneIds).map((item) => {
      if (item.id === target.id) {
        return counterResolution ? removeHiddenStatusFromToken(nextTarget) : nextTarget;
      }
      if (counterResolution && item.id === attacker.id) {
        return removeHiddenStatusFromToken({
          ...presentArcaneBarrierImpact(applyAttackBleeding(applyAttackPoison(attacker, resolvedCounterWeapon, counterResolution), resolvedCounterWeapon, counterResolution, false, currentCombat), `${pending.id}-counter`, now),
          ...(counterResolution.lifeLost > 0 ? { canvasDamageEffect: {
            id: pending.id, previousLife: Number(attacker.stats?.vida?.current), nextLife: counterResolution.nextLife,
            ...(counterResolution.temporaryLifeLost > 0 ? { previousTemporaryLife: attacker.stats.vidaTemporal.current, nextTemporaryLife: counterResolution.nextTemporaryLife } : {}),
            bleedingApplied: !isCanvasBleeding(attacker) && isCanvasBleeding(applyAttackBleeding(attacker, resolvedCounterWeapon, counterResolution, false, currentCombat)),
            poisonApplied: !isCanvasPoisoned(attacker) && isCanvasPoisoned(applyAttackPoison(attacker, resolvedCounterWeapon, counterResolution)),
          } } : {}),
          stats: {
            ...(attacker.stats || {}),
            ...(counterResolution.nextTemporaryLife != null ? { vidaTemporal: { ...attacker.stats.vidaTemporal, current: counterResolution.nextTemporaryLife } } : {}),
            vida: { ...(attacker.stats?.vida || {}), current: counterResolution.nextLife },
          },
          runtimeDirty: attacker.profileType === 'rogueliteClass',
        });
      }
      if (item.id === attacker.id) return removeHiddenStatusFromToken(attacker);
      return item;
    });
    setActiveScenario((current) => (
      current?.id === scenario.id
        ? { ...current, items: nextItems, ...(isPractice ? {} : { canvasCombat: resolvedCombat }) }
        : current
    ));
    localItemsRef.current = nextItems;
    if (isPractice) persistPracticeCombat(resolvedCombat.pendingAttack || resolvedCombat.explosiveBlast || resolvedCombat.arcaneChain
      || options.excessChoice === 'reposition' ? resolvedCombat : null);
    else {
      updateCombat(() => resolvedCombat);
    }
    await safePersistItems?.(
      scenario.id,
      nextItems,
      scenario.items || [],
      [target.id, attacker.id, ...burnedZoneIds],
      { persistRuntime: true },
    );

    try {
      await addDoc(collection(db, 'combat_log'), {
        ...buildCanvasCombatLog({
          pending: resolvedPending, attacker, target, defenseDice, resolution, counterResolution,
          counterWeapon: resolvedCounterWeapon, excessChoice: options.excessChoice,
          scenarioId: scenario.id, now,
          updatedAttacker: nextItems.find(item => item.id === pending.attackerId),
          updatedTarget: nextItems.find(item => item.id === pending.targetId),
        }),
        timestamp: serverTimestamp(),
        clientTimestamp: now,
      });
    } catch (error) {
      console.warn('No se pudo registrar el ataque del Canvas:', error);
    }

    triggerToast(
      resolution.lifeLost > 0 ? 'Ataque resuelto' : 'Presión contenida',
      resolution.surplus > 0
        ? (options.excessChoice === 'discard' ? 'Defensa resuelta sin gastar excedente.' : options.excessChoice === 'reposition' ? `${resolution.surplus} casillas de reposicionamiento disponibles, sin ataque de oportunidad.` : `Contraataque: ${resolution.surplus} de Presión · ${describeLifeLoss(counterResolution)}`)
        : `${resolution.finalPressure} de Presión · ${describeLifeLoss(resolution)}`,
      resolution.lifeLost > 0 ? 'warning' : 'success',
    );
    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    gridConfig,
    isPlayerView,
    playerName,
    persistPracticeCombat,
    practiceCombat,
    safePersistItems,
    setActiveScenario,
    triggerToast,
    updateCombat,
  ]);

  const canvasRolls = useMemo(() => (
    Array.isArray(activeScenario?.canvasRolls) ? activeScenario.canvasRolls : []
  ), [activeScenario?.canvasRolls]);

  const rollFreeDice = useCallback((dicePool, options = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return null;

    try {
      const rolledBy = options.rolledBy || playerName || (isPlayerView ? 'Jugador' : 'Máster');
      const result = rollDicePool(dicePool, { ...options, rolledBy });

      const currentRolls = Array.isArray(scenario.canvasRolls) ? scenario.canvasRolls : [];
      const nextRolls = [result, ...currentRolls].slice(0, 20);

      setActiveScenario((current) => (
        current?.id === scenario.id ? { ...current, canvasRolls: nextRolls } : current
      ));

      writeQueueRef.current = writeQueueRef.current.then(async () => {
        const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
        try {
          await updateDoc(scenarioRef, {
            canvasRolls: nextRolls,
            rollsModifiedAt: Date.now(),
          });
        } catch (_err) {
          await setDoc(scenarioRef, {
            canvasRolls: nextRolls,
            rollsModifiedAt: Date.now(),
          }, { merge: true });
        }
      }).catch((error) => {
        console.error('Error sincronizando tirada libre:', error);
      });

      return result;
    } catch (error) {
      triggerToast('Tirada no válida', error.message, 'warning');
      return null;
    }
  }, [
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    playerName,
    scenarioCollectionName,
    setActiveScenario,
    triggerToast,
  ]);

  const clearRollHistory = useCallback(() => {
    if (isPlayerView) return;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return;

    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasRolls: [] } : current
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      try {
        await updateDoc(scenarioRef, {
          canvasRolls: [],
          rollsModifiedAt: Date.now(),
        });
      } catch (_err) {
        await setDoc(scenarioRef, {
          canvasRolls: [],
          rollsModifiedAt: Date.now(),
        }, { merge: true });
      }
    }).catch((error) => {
      console.error('Error limpiando historial de tiradas:', error);
    });
  }, [
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    scenarioCollectionName,
    setActiveScenario,
  ]);

  const toggleRollDie = useCallback((rollId, dieIndex) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return;
    const currentRolls = Array.isArray(scenario.canvasRolls) ? scenario.canvasRolls : [];
    const targetIndex = currentRolls.findIndex((r) => r.id === rollId);
    if (targetIndex === -1) return;

    const updatedRoll = toggleRollDieExcluded(currentRolls[targetIndex], dieIndex);
    const nextRolls = [...currentRolls];
    nextRolls[targetIndex] = updatedRoll;

    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasRolls: nextRolls } : current
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      try {
        await updateDoc(scenarioRef, {
          canvasRolls: nextRolls,
          rollsModifiedAt: Date.now(),
        });
      } catch (_err) {
        await setDoc(scenarioRef, {
          canvasRolls: nextRolls,
          rollsModifiedAt: Date.now(),
        }, { merge: true });
      }
    }).catch((error) => {
      console.error('Error actualizando exclusión de dado:', error);
    });
  }, [activeScenario, activeScenarioRef, scenarioCollectionName, setActiveScenario]);

  const controlledTokenIds = useMemo(() => (
    (activeScenario?.items || [])
      .filter((token) => canControlToken(token, isPlayerView, playerName))
      .map((token) => token.id)
  ), [activeScenario?.items, isPlayerView, playerName]);

  const getMovementBaseForToken = useCallback((tokenIdOrToken) => {
    const token = typeof tokenIdOrToken === 'string'
      ? (activeScenario?.items || []).find((item) => item.id === tokenIdOrToken)
      : tokenIdOrToken;
    return getMovementBase(token);
  }, [activeScenario?.items]);

  const getAvailableMovementForParticipant = useCallback((tokenIdOrParticipant) => {
    if (!tokenIdOrParticipant) return 2;
    const participant = typeof tokenIdOrParticipant === 'string'
      ? (practiceCombat?.participants?.[tokenIdOrParticipant]?.defensiveReposition?.remaining > 0 ? practiceCombat.participants[tokenIdOrParticipant] : combatState?.participants?.[tokenIdOrParticipant])
      : tokenIdOrParticipant;
    if (participant) {
      return getAvailableMovement(participant);
    }
    const token = typeof tokenIdOrParticipant === 'string'
      ? (activeScenario?.items || []).find((item) => item.id === tokenIdOrParticipant)
      : tokenIdOrParticipant;
    return getMovementBase(token);
  }, [activeScenario?.items, combatState?.participants, practiceCombat]);

  const hasPracticeReposition = Object.values(practiceCombat?.participants || {}).some(participant => Number(participant.defensiveReposition?.remaining) > 0);
  return {
    combatState: practiceCombat?.pendingAttack || attackDraft?.practice || hasPracticeReposition ? practiceCombat : combatState,
    spellPresentation: { ...spellPresentation, effect: trackedSpellEffect,
      sourceAppearance: spellPresentation.effect?.spellId === 'runic-barrier'
        ? activeScenario?.items?.find(item => item.id === spellPresentation.effect.sourceTokenId) : undefined,
      sourceVisible: !['arcane-mist', 'runic-barrier'].includes(spellPresentation.effect?.spellId)
      || canShowCanvasItemEffect({ token: activeScenario?.items?.find(item => item.id === spellPresentation.effect.sourceTokenId),
        items: activeScenario?.items || [], viewer: { isPlayerView, playerName, selectedTokenIds, showHiddenTokens }, gridConfig }),
      targetVisible: spellPresentation.effect?.spellId !== 'runic-barrier'
        || canShowCanvasItemEffect({ token: activeScenario?.items?.find(item => item.id === spellPresentation.effect.targetId),
          items: activeScenario?.items || [], viewer: { isPlayerView, playerName, selectedTokenIds, showHiddenTokens }, gridConfig }) },
    attackDraft,
    isConfirmingAttack,
    pendingAttack: practiceCombat?.pendingAttack || combatState?.pendingAttack || null,
    canvasRolls,
    controlledTokenIds,
    startCombat,
    startPreparedCombat,
    setCombatParticipation,
    chooseArmorProtection,
    chooseBleeding,
    isResolvingBleeding,
    pendingBleedingToken: !combatState?.pendingAttack ? (activeScenario?.items || []).find(token =>
      canControlToken(token, isPlayerView, playerName) && needsBleedingChoice(token, combatState)) : null,
    mutableArmorTokens: (activeScenario?.items || []).filter(item => hasCanvasMutableArmor(item) && canControlToken(item, isPlayerView, playerName)),
    submitRoll,
    rollActionDice,
    rollAllPending,
    rollFreeDice,
    clearRollHistory,
    toggleRollDie,
    updateDieStatus,
    updateEnemyActionStatus,
    getItemUseResources,
    prepareItemUseResources,
    commitItemUse,
    commitExplosiveBombImpact,
    commitExplosiveBombUse,
    explosiveBlast: practiceCombat?.explosiveBlast || combatState?.explosiveBlast || null,
    castFireball,
    castArcaneProjectile,
    castArcaneMist,
    castArcaneBarrier,
    prepareSpellUseResources,
    isCastingSpell,
    completeActivation,
    setMovementModifier,
    reconcileMovementResource,
    standUp,
    activateSprint,
    activateEnemySprint,
    confirmMovement,
    undoMovement,
    getMovementBase: getMovementBaseForToken,
    getAvailableMovement: getAvailableMovementForParticipant,
    nextRound,
    undoActivation,
    finishCombat,
    igniteTarZone,
    beginAttackDraft,
    getAttackOptions,
    setAttackWeapons,
    finishAttackAdjustment,
    resolveCunning,
    isResolvingCunning,
    cancelAttackDraft,
    cancelPendingAttack,
    getWeaponAvailability,
    getCounterattackWeapons: () => {
      const pending = practiceCombat?.pendingAttack || combatState?.pendingAttack;
      return getCanvasCounterattackWeapons({
        defender: (activeScenario?.items || []).find(item => item.id === pending?.targetId),
        attacker: (activeScenario?.items || []).find(item => item.id === pending?.attackerId),
        items: activeScenario?.items || [], gridConfig,
      });
    },
    getPreferredCounterattackWeapon: () => {
      const current = practiceCombat?.pendingAttack ? practiceCombat : combatState;
      const pending = current?.pendingAttack;
      const weapons = getCanvasCounterattackWeapons({
        defender: (activeScenario?.items || []).find(item => item.id === pending?.targetId),
        attacker: (activeScenario?.items || []).find(item => item.id === pending?.attackerId),
        items: activeScenario?.items || [], gridConfig,
      });
      return getPreferredCanvasCounterattackWeapon({ pending, participant: current?.participants?.[pending?.targetId], weapons });
    },
    confirmAttack,
    isRollingEnemyDefense,
    rollEnemyDefense,
    resolvePendingAttack,
  };
};

export const useCanvasCombatRuntime = options => {
  const base = useRogueliteCombatRuntime(options);
  const campaign = useCampaignAttackRuntime({ ...options, base });
  return getCanvasSystem(options.activeScenario) === 'campaign' ? { ...base, ...campaign } : base;
};
