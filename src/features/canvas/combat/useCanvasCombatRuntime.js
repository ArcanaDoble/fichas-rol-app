import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '../../../firebase';
import {
  cancelQueuedCanvasAttack,
  createCanvasCombatState,
  finishCanvasCombat,
  getAvailableMovement,
  getMovementBase,
  markParticipantActed,
  pruneCombatState,
  queueCanvasAttack,
  recordParticipantMovement,
  resolveQueuedCanvasAttack,
  rollDiceProfile,
  setActionDieStatus,
  setEnemyActionStatus,
  setParticipantMovementModifier,
  startNextRound,
  submitActionDice,
  undoLastActivation,
  undoParticipantMovement,
} from './canvasCombatState';
import {
  calculateCanvasAttackPressure,
  evaluateCanvasAttackRange,
  getCanvasWeaponActionCost,
  getCanvasWeaponAvailability,
  getCriticalDieSides,
  getUsableDefenseDice,
  parseWeaponDiceProfile,
  resolveCanvasAttackDamage,
  rollWeaponDice,
} from './canvasAttackRules';

import { rollDicePool, toggleRollDieExcluded } from '../dice/canvasDiceEngine';

const STATUS_ORDER = ['available', 'committed', 'spent'];

const canControlToken = (token, isPlayerView, playerName) => {
  if (!isPlayerView) return true;
  if (!token) return false;
  return (Array.isArray(token.controlledBy) && token.controlledBy.includes(playerName))
    || token.linkedClassOwner === playerName;
};

const saveCombatDoc = async (scenarioRef, nextCombat) => {
  try {
    await updateDoc(scenarioRef, {
      canvasCombat: nextCombat,
      combatModifiedAt: Date.now(),
    });
  } catch (_error) {
    await setDoc(scenarioRef, {
      canvasCombat: nextCombat,
      combatModifiedAt: Date.now(),
    }, { merge: true });
  }
};

export const useCanvasCombatRuntime = ({
  activeScenario,
  activeScenarioRef,
  isPlayerView,
  playerName,
  gridConfig,
  safePersistItems,
  scenarioCollectionName,
  setActiveScenario,
  triggerToast,
}) => {
  const [attackDraft, setAttackDraft] = useState(null);
  const localCombatRef = useRef(activeScenario?.canvasCombat || null);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    const remoteCombat = activeScenario?.canvasCombat;
    if (!remoteCombat) {
      localCombatRef.current = null;
      return;
    }
    const pruned = pruneCombatState(remoteCombat, activeScenario?.items || []);
    localCombatRef.current = pruned;
  }, [activeScenario?.canvasCombat, activeScenario?.items]);

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

  const updateCombat = useCallback((updater) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;
    const current = localCombatRef.current || scenario?.canvasCombat;
    if (!current) return false;
    const next = updater(current);
    if (!next || next === current) return false;

    localCombatRef.current = next;
    setActiveScenario((active) => (
      active?.id === scenario.id ? { ...active, canvasCombat: next } : active
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await saveCombatDoc(scenarioRef, localCombatRef.current || next);
    }).catch((error) => {
      console.error('No se pudo actualizar la ronda del Canvas:', error);
      triggerToast('No se pudo sincronizar la ronda', error?.message || 'Reinténtalo', 'error');
    });

    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    scenarioCollectionName,
    setActiveScenario,
    triggerToast,
  ]);

  const startCombat = useCallback(() => {
    if (isPlayerView) return;
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return;
    const next = createCanvasCombatState(scenario.items || []);
    void persistCombat(next);
    triggerToast(
      'Combate preparado',
      next.roundPhase === 'rolling' ? 'Esperando las tiradas iniciales' : 'Orden de iniciativa listo',
      'success',
    );
  }, [activeScenario, activeScenarioRef, isPlayerView, persistCombat, triggerToast]);

  const submitRoll = useCallback((tokenId, values, source = 'manual') => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) {
      triggerToast('Tirada no permitida', 'No controlas esta ficha', 'warning');
      return false;
    }
    try {
      return updateCombat((current) => submitActionDice(current, tokenId, values, { source }));
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
    return updateCombat((current) => submitActionDice(current, tokenId, values, { source: 'digital' }));
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

  const completeActivation = useCallback((tokenId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => markParticipantActed(current, tokenId));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const setMovementModifier = useCallback((tokenId, modifier) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => setParticipantMovementModifier(current, tokenId, modifier));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const confirmMovement = useCallback(async (tokenId, { from, to, cost = 0, isExceptional = false }) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;

    const nextItems = (scenario.items || []).map((item) => (
      item.id === tokenId ? { ...item, x: to.x, y: to.y } : item
    ));

    const currentCombat = localCombatRef.current || scenario.canvasCombat;
    const nextCombat = currentCombat
      ? recordParticipantMovement(currentCombat, tokenId, {
          from,
          to,
          cost,
          isExceptional,
          actor: isPlayerView ? (token.name || playerName) : 'Master',
        })
      : null;

    if (nextCombat) localCombatRef.current = nextCombat;

    setActiveScenario((active) => (
      active?.id === scenario.id
        ? { ...active, items: nextItems, ...(nextCombat ? { canvasCombat: nextCombat } : {}) }
        : active
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await updateDoc(scenarioRef, {
        items: nextItems,
        ...(nextCombat ? { canvasCombat: nextCombat } : {}),
      });
    }).catch((error) => {
      console.error('No se pudo guardar el movimiento confirmado:', error);
      triggerToast('Error al confirmar movimiento', error?.message || 'Reinténtalo', 'error');
    });

    return true;
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, scenarioCollectionName, setActiveScenario, triggerToast]);

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

    const nextItems = (scenario.items || []).map((item) => (
      item.id === tokenId ? { ...item, x: undoneEntry.from.x, y: undoneEntry.from.y } : item
    ));

    localCombatRef.current = nextCombat;
    setActiveScenario((active) => (
      active?.id === scenario.id
        ? { ...active, items: nextItems, canvasCombat: nextCombat }
        : active
    ));

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      await updateDoc(scenarioRef, {
        items: nextItems,
        canvasCombat: nextCombat,
      });
      triggerToast(
        'Movimiento deshecho',
        `Restaurada posición de ${undoneEntry.actor || 'token'}${undoneEntry.cost > 0 ? ` (+${undoneEntry.cost} mov devuelto)` : ''}`,
        'info',
      );
    }).catch((error) => {
      console.error('No se pudo deshacer el movimiento:', error);
      triggerToast('Error al deshacer movimiento', error?.message || 'Reinténtalo', 'error');
    });

    return true;
  }, [activeScenario, activeScenarioRef, isPlayerView, scenarioCollectionName, setActiveScenario, triggerToast]);

  const nextRound = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => startNextRound(current));
  }, [isPlayerView, updateCombat]);

  const undoActivation = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => undoLastActivation(current));
  }, [isPlayerView, updateCombat]);

  const finishCombat = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => finishCanvasCombat(current));
  }, [isPlayerView, updateCombat]);

  const beginAttackDraft = useCallback(({ attackerId, targetId, weapon }) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const attacker = (scenario?.items || []).find((item) => item.id === attackerId);
    const target = (scenario?.items || []).find((item) => item.id === targetId);
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const participant = currentCombat?.participants?.[attackerId];

    if (!currentCombat || currentCombat.status !== 'active') {
      triggerToast('Combate no preparado', 'Inicia la ronda y resuelve las tiradas de acción antes de atacar.', 'warning');
      return false;
    }
    if (currentCombat.pendingAttack) {
      triggerToast('Ataque pendiente', 'Resuelve la defensa anterior antes de iniciar otro ataque.', 'warning');
      return false;
    }
    if (!canControlToken(attacker, isPlayerView, playerName)) {
      triggerToast('Ataque no permitido', 'No controlas esta ficha.', 'warning');
      return false;
    }

    const range = evaluateCanvasAttackRange({
      attacker,
      target,
      weapon,
      items: scenario?.items || [],
      gridConfig,
    });
    if (!range.legal) {
      triggerToast('Objetivo fuera de alcance', range.reason, 'warning');
      return false;
    }

    const availability = getCanvasWeaponAvailability({ token: attacker, participant, weapon });
    if (!availability.available) {
      triggerToast('No puedes usar esa arma', availability.reason, 'warning');
      return false;
    }

    const weaponDiceProfile = parseWeaponDiceProfile(weapon);
    if (weaponDiceProfile.length === 0) {
      triggerToast('Arma sin perfil de daño', 'Configura su dado de arma antes de utilizarla.', 'warning');
      return false;
    }

    setAttackDraft({
      attackerId,
      targetId,
      weapon,
      range,
      actionCost: getCanvasWeaponActionCost(weapon, attacker),
      weaponDiceProfile,
    });
    return true;
  }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, playerName, triggerToast]);

  const cancelAttackDraft = useCallback(() => setAttackDraft(null), []);

  const getWeaponAvailability = useCallback((token, weapon) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const participant = (localCombatRef.current || scenario?.canvasCombat)?.participants?.[token?.id];
    if (!participant) {
      return { available: false, reason: 'Prepara la ronda antes de atacar.' };
    }
    return getCanvasWeaponAvailability({ token, participant, weapon });
  }, [activeScenario, activeScenarioRef]);

  const confirmAttack = useCallback(({ actionDieIds = [], useThreat = false } = {}) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    if (!attackDraft || !currentCombat || currentCombat.pendingAttack) return false;

    const attacker = (scenario?.items || []).find((item) => item.id === attackDraft.attackerId);
    const target = (scenario?.items || []).find((item) => item.id === attackDraft.targetId);
    const participant = currentCombat.participants?.[attackDraft.attackerId];
    if (!attacker || !target || !participant) return false;

    const selectedIds = new Set(actionDieIds);
    const selectedDice = (participant.actionDice || []).filter((die) => selectedIds.has(die.id));
    if (attacker.profileType !== 'rogueliteEnemy' && (
      selectedDice.length !== attackDraft.actionCost
      || selectedDice.some((die) => die.status !== 'available')
    )) {
      triggerToast('Dados de acción incompletos', `Selecciona exactamente ${attackDraft.actionCost}.`, 'warning');
      return false;
    }
    const weaponResults = rollWeaponDice(attackDraft.weaponDiceProfile);

    const criticalDieSides = getCriticalDieSides(
      attackDraft.weaponDiceProfile,
      weaponResults,
      attackDraft.weapon,
      attackDraft.range.suppressTraits,
    );
    const criticalResult = criticalDieSides
      ? rollWeaponDice([{ sides: criticalDieSides }])[0]
      : 0;

    const pressure = calculateCanvasAttackPressure({
      attacker,
      actionDice: selectedDice,
      weaponResults,
      criticalResult,
      threatValue: useThreat ? participant.threatValue : 0,
      distance: attackDraft.range.distance,
      weapon: attackDraft.weapon,
      suppressTraits: attackDraft.range.suppressTraits,
    });
    const now = Date.now();
    const attack = {
      id: globalThis.crypto?.randomUUID?.() || `canvas-attack-${now}-${attackDraft.attackerId}`,
      attackerId: attackDraft.attackerId,
      targetId: attackDraft.targetId,
      attackerName: attacker.name || 'Atacante',
      targetName: target.name || 'Objetivo',
      weapon: attackDraft.weapon,
      weaponName: attackDraft.weapon.name || attackDraft.weapon.nombre || 'Arma',
      weaponDiceProfile: attackDraft.weaponDiceProfile,
      weaponResults: weaponResults.map(Number),
      criticalDieSides,
      criticalResult,
      actionDieIds: [...selectedIds],
      actionDice: selectedDice,
      usedThreat: attacker.profileType === 'rogueliteEnemy'
        && useThreat
        && participant.threatValue !== null
        && participant.threatValue !== undefined,
      pressure,
      range: attackDraft.range,
      source: 'digital',
      createdAt: now,
    };
    const next = queueCanvasAttack(currentCombat, attack, { now });
    if (next === currentCombat) return false;
    updateCombat(() => next);
    setAttackDraft(null);
    triggerToast('Ataque lanzado', `${attack.weaponName}: ${pressure.total} de Presión`, 'success');
    return true;
  }, [activeScenario, activeScenarioRef, attackDraft, triggerToast, updateCombat]);

  const cancelPendingAttack = useCallback(async () => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    if (!currentCombat?.pendingAttack || !scenario?.id) return false;

    const nextCombat = cancelQueuedCanvasAttack(currentCombat);
    localCombatRef.current = nextCombat;
    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
    ));
    updateCombat(() => nextCombat);
    triggerToast('Ataque descartado', 'Se ha cancelado el ataque pendiente.', 'info');
    return true;
  }, [activeScenario, activeScenarioRef, setActiveScenario, triggerToast, updateCombat]);

  const resolvePendingAttack = useCallback(async (defenseDieIds = []) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const currentCombat = localCombatRef.current || scenario?.canvasCombat;
    const pending = currentCombat?.pendingAttack;
    if (!pending || !scenario?.id) return false;

    const attacker = (scenario.items || []).find((item) => item.id === pending.attackerId);
    const target = (scenario.items || []).find((item) => item.id === pending.targetId);
    if (!target) {
      // Si el objetivo ya no existe en la escena, limpiamos el ataque pendiente de forma limpia
      const nextCombat = cancelQueuedCanvasAttack(currentCombat);
      localCombatRef.current = nextCombat;
      setActiveScenario((current) => (
        current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
      ));
      updateCombat(() => nextCombat);
      triggerToast('Ataque descartado', 'El objetivo del ataque ya no está en la escena.', 'info');
      return true;
    }

    if (!canControlToken(target, isPlayerView, playerName) && isPlayerView) {
      triggerToast('Defensa no permitida', 'No controlas el objetivo de este ataque.', 'warning');
      return false;
    }

    const targetParticipant = currentCombat.participants?.[pending.targetId];
    const usableDefenseDice = getUsableDefenseDice(targetParticipant);
    const selectedIds = new Set(defenseDieIds);
    const defenseDice = usableDefenseDice.filter((die) => selectedIds.has(die.id));
    if (defenseDice.length !== selectedIds.size) {
      triggerToast('Defensa no válida', 'Alguno de esos dados ya no está disponible.', 'warning');
      return false;
    }

    const resolution = resolveCanvasAttackDamage({
      attackPressure: pending.pressure?.total || 0,
      defenseDice,
      target,
      weapon: pending.weapon,
      suppressTraits: pending.range?.suppressTraits,
    });
    const now = Date.now();
    const nextCombat = resolveQueuedCanvasAttack(currentCombat, {
      attackId: pending.id,
      defenseDieIds: [...selectedIds],
      ...resolution,
    }, { now });
    if (nextCombat === currentCombat) return false;

    const nextTarget = {
      ...target,
      stats: {
        ...(target.stats || {}),
        vida: {
          ...(target.stats?.vida || {}),
          current: resolution.nextLife,
        },
      },
      runtimeDirty: target.profileType === 'rogueliteClass',
    };
    const nextItems = (scenario.items || []).map((item) => (item.id === target.id ? nextTarget : item));
    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, items: nextItems, canvasCombat: nextCombat } : current
    ));
    localCombatRef.current = nextCombat;
    updateCombat(() => nextCombat);
    await safePersistItems?.(
      scenario.id,
      nextItems,
      scenario.items || [],
      [target.id],
      { persistRuntime: true },
    );

    try {
      await addDoc(collection(db, 'combat_log'), {
        sourceEventId: pending.id,
        scenarioId: scenario.id,
        reactionType: defenseDice.length > 0 ? 'parar' : 'recibir',
        attackerId: pending.attackerId,
        targetId: pending.targetId,
        attackerName: pending.attackerName || attacker?.name || 'Atacante',
        targetName: pending.targetName || target.name || 'Objetivo',
        weaponName: pending.weaponName,
        attackPressure: pending.pressure?.total || 0,
        defense: resolution.defense,
        finalDamage: resolution.finalPressure,
        damage: resolution.finalPressure,
        effectiveCd: resolution.effectiveCd,
        surplus: resolution.surplus,
        blocksLost: { postura: 0, armadura: 0, vida: resolution.lifeLost },
        baseBlocksLost: { postura: 0, armadura: 0, vida: resolution.lifeLost },
        canvasRoguelite: true,
        timestamp: serverTimestamp(),
        clientTimestamp: now,
      });
    } catch (error) {
      console.warn('No se pudo registrar el ataque del Canvas:', error);
    }

    triggerToast(
      resolution.lifeLost > 0 ? 'Ataque resuelto' : 'Presión contenida',
      resolution.surplus > 0
        ? `Excedente defensivo ${resolution.surplus}: resuelve movimiento o contraataque manualmente.`
        : `${resolution.finalPressure} de Presión · ${resolution.lifeLost} bloque(s) de Vida`,
      resolution.lifeLost > 0 ? 'warning' : 'success',
    );
    return true;
  }, [
    activeScenario,
    activeScenarioRef,
    isPlayerView,
    playerName,
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
      ? combatState?.participants?.[tokenIdOrParticipant]
      : tokenIdOrParticipant;
    if (participant) {
      return getAvailableMovement(participant);
    }
    const token = typeof tokenIdOrParticipant === 'string'
      ? (activeScenario?.items || []).find((item) => item.id === tokenIdOrParticipant)
      : tokenIdOrParticipant;
    return getMovementBase(token);
  }, [activeScenario?.items, combatState?.participants]);

  return {
    combatState,
    attackDraft,
    pendingAttack: combatState?.pendingAttack || null,
    canvasRolls,
    controlledTokenIds,
    startCombat,
    submitRoll,
    rollActionDice,
    rollAllPending,
    rollFreeDice,
    clearRollHistory,
    toggleRollDie,
    updateDieStatus,
    updateEnemyActionStatus,
    completeActivation,
    setMovementModifier,
    confirmMovement,
    undoMovement,
    getMovementBase: getMovementBaseForToken,
    getAvailableMovement: getAvailableMovementForParticipant,
    nextRound,
    undoActivation,
    finishCombat,
    beginAttackDraft,
    cancelAttackDraft,
    cancelPendingAttack,
    getWeaponAvailability,
    confirmAttack,
    resolvePendingAttack,
  };
};
