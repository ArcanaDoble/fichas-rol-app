import { useCallback, useMemo } from 'react';
import { doc, runTransaction, setDoc } from 'firebase/firestore';

import { db } from '../../../firebase';
import {
  createCanvasCombatState,
  finishCanvasCombat,
  markParticipantActed,
  rollDiceProfile,
  setActionDieStatus,
  startNextRound,
  submitActionDice,
  undoLastActivation,
} from './canvasCombatState';

const canControlToken = (token, isPlayerView, playerName) => {
  if (!isPlayerView) return true;
  if (!token) return false;
  return (Array.isArray(token.controlledBy) && token.controlledBy.includes(playerName))
    || token.linkedClassOwner === playerName;
};

export const useCanvasCombatRuntime = ({
  activeScenario,
  activeScenarioRef,
  isPlayerView,
  playerName,
  scenarioCollectionName,
  setActiveScenario,
  triggerToast,
}) => {
  const combatState = activeScenario?.canvasCombat || null;

  const persistCombat = useCallback(async (nextCombat) => {
    const scenario = activeScenarioRef.current || activeScenario;
    if (!scenario?.id) return false;

    setActiveScenario((current) => (
      current?.id === scenario.id ? { ...current, canvasCombat: nextCombat } : current
    ));

    try {
      await setDoc(doc(db, scenarioCollectionName, scenario.id), {
        canvasCombat: nextCombat,
        combatModifiedAt: Date.now(),
      }, { merge: true });
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
    const current = scenario?.canvasCombat;
    if (!scenario?.id || !current) return false;
    const next = updater(current);
    if (!next || next === current) return false;
    setActiveScenario((active) => (
      active?.id === scenario.id ? { ...active, canvasCombat: next } : active
    ));
    void runTransaction(db, async (transaction) => {
      const scenarioRef = doc(db, scenarioCollectionName, scenario.id);
      const snapshot = await transaction.get(scenarioRef);
      const remoteCombat = snapshot.data()?.canvasCombat || current;
      const committedCombat = updater(remoteCombat);
      transaction.set(scenarioRef, {
        canvasCombat: committedCombat,
        combatModifiedAt: Date.now(),
      }, { merge: true });
      return committedCombat;
    }).then((committedCombat) => {
      setActiveScenario((active) => (
        active?.id === scenario.id ? { ...active, canvasCombat: committedCombat } : active
      ));
    }).catch((error) => {
      console.error('No se pudo actualizar la ronda del Canvas:', error);
      triggerToast('No se pudo sincronizar la ronda', error.message || 'Reinténtalo', 'error');
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
    const participant = scenario?.canvasCombat?.participants?.[tokenId];
    if (!participant) return false;
    const values = rollDiceProfile(participant.actionDiceProfile);
    return updateCombat((current) => submitActionDice(current, tokenId, values, { source: 'digital' }));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, triggerToast, updateCombat]);

  const updateDieStatus = useCallback((tokenId, dieId, status) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => setActionDieStatus(current, tokenId, dieId, status));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const completeActivation = useCallback((tokenId) => {
    const scenario = activeScenarioRef.current || activeScenario;
    const token = (scenario?.items || []).find((item) => item.id === tokenId);
    if (!canControlToken(token, isPlayerView, playerName)) return false;
    return updateCombat((current) => markParticipantActed(current, tokenId));
  }, [activeScenario, activeScenarioRef, isPlayerView, playerName, updateCombat]);

  const nextRound = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => startNextRound(current));
  }, [isPlayerView, updateCombat]);

  const undoActivation = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => undoLastActivation(current));
  }, [isPlayerView, updateCombat]);

  const finishCombat = useCallback(() => {
    if (!isPlayerView) updateCombat((current) => finishCanvasCombat(current));
  }, [isPlayerView, updateCombat]);

  const controlledTokenIds = useMemo(() => (
    (activeScenario?.items || [])
      .filter((token) => canControlToken(token, isPlayerView, playerName))
      .map((token) => token.id)
  ), [activeScenario?.items, isPlayerView, playerName]);

  return {
    combatState,
    controlledTokenIds,
    startCombat,
    submitRoll,
    rollActionDice,
    updateDieStatus,
    completeActivation,
    nextRound,
    undoActivation,
    finishCombat,
  };
};
