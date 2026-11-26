import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCanvasWeaponIdentity } from '../combat/canvasAttackRules';
import { getCombatRenderPlacement, isCombatTokenItem } from '../../tactical-shared/legacyCombatRules';
import { canControlToken } from '../../tactical-shared/tokenControlUtils';
import { resolveArcaneProjectileTarget } from './arcaneProjectileRules';
import { resolveArcaneBarrierTarget } from './arcaneBarrierRules';
import { resolveCanvasArcaneMistPlacement } from './arcaneMistRules';
import { getCanvasCatalysts, getCanvasSpellAvailability, isCanvasSpellPractice, resolveCanvasFireballPlacement } from './canvasSpells';

export const useCanvasSpellUseSystem = ({ activeScenario, activeScenarioRef, combatRuntime, divToWorld,
  gridConfig, isPlayerView, playerName, triggerToast }) => {
  const [session, setSession] = useState(null);
  const [placement, setPlacement] = useState(null);
  const busyRef = useRef(false);
  const touchRef = useRef(null);
  const ignoreMouseUntilRef = useRef(0);
  const sourceToken = activeScenario?.items?.find(item => item.id === session?.sourceTokenId);
  const catalysts = getCanvasCatalysts(sourceToken);
  const catalyst = session?.chain?.catalyst || catalysts.find(item => getCanvasWeaponIdentity(item) === session?.catalystId);
  const resources = session?.practice ? session.practiceResources
    : activeScenario?.canvasCombat?.participants?.[sourceToken?.id]?.actionDice || [];
  const availabilityOptions = { practice: true, practiceCombat: activeScenario?.canvasPracticeCombat };

  const clearSession = useCallback(() => {
    if (busyRef.current) return;
    setSession(null); setPlacement(null); touchRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (busyRef.current) return;
    if (!session?.chainId) { clearSession(); return; }
    busyRef.current = true;
    return (async () => {
      try {
        const result = await combatRuntime.castArcaneProjectile({ ...session, castId: `${session.chainId}-finish`,
          tokenId: session.sourceTokenId, finishChain: true });
        if (result?.ok) { setSession(null); setPlacement(null); touchRef.current = null; }
      } finally { busyRef.current = false; }
    })();
  }, [clearSession, combatRuntime, session]);

  useEffect(() => {
    if (!session) return undefined;
    const combat = activeScenario?.canvasCombat;
    if (!sourceToken || session.scenarioId !== activeScenario?.id || combat?.startedAt !== session.combatStartedAt
      || combat?.round !== session.combatRound || (session.practice ? !isCanvasSpellPractice(combat) : combat?.status !== 'active')) clearSession();
    const escape = event => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [activeScenario?.id, activeScenario?.canvasCombat, cancel, clearSession, session, sourceToken]);

  const pendingChain = activeScenario?.canvasCombat?.arcaneChain || activeScenario?.canvasPracticeCombat?.arcaneChain;
  useEffect(() => {
    if (session?.chainId && pendingChain?.id !== session.chainId) { clearSession(); return; }
    if (session || pendingChain?.phase !== 'choose-target') return;
    const source = activeScenario?.items?.find(item => item.id === pendingChain.sourceTokenId);
    if (!canControlToken(source, isPlayerView, playerName)) return;
    setPlacement(null);
    setSession({ id: `${pendingChain.id}-chain`, chainId: pendingChain.id, chain: pendingChain,
      scenarioId: activeScenario.id, sourceTokenId: source.id, item: pendingChain.weapon,
      definitionId: 'arcane-projectile', phase: 'place-area', practice: pendingChain.practice,
      combatStartedAt: pendingChain.combatStartedAt, combatRound: pendingChain.combatRound });
  }, [activeScenario?.id, activeScenario?.items, clearSession, isPlayerView, pendingChain, playerName, session]);

  const begin = useCallback((tokenId, slotIndex) => {
    if (busyRef.current) return false;
    const scenario = activeScenarioRef.current || activeScenario;
    if (scenario?.rulesSystem === 'campaign') {
      triggerToast('Habilidad de Campaña', 'Resuelve su efecto en mesa y ajusta los recursos desde el inspector.', 'info');
      return false;
    }
    const token = scenario?.items?.find(item => item.id === tokenId);
    if (isPlayerView && !(token?.controlledBy || []).includes(playerName) && token?.linkedClassOwner !== playerName) return false;
    const option = getCanvasSpellAvailability(token, scenario?.canvasCombat, slotIndex,
      { practice: true, practiceCombat: scenario?.canvasPracticeCombat });
    if (!option.available) { triggerToast('Conjuro no disponible', option.reason, 'warning'); return false; }
    combatRuntime?.cancelAttackDraft?.();
    const practice = isCanvasSpellPractice(scenario?.canvasCombat);
    const practiceResources = practice ? combatRuntime?.prepareSpellUseResources?.(tokenId) : null;
    if (practice && !practiceResources) return false;
    setPlacement(null);
    setSession({ id: globalThis.crypto?.randomUUID?.() || `spell-${Date.now()}-${tokenId}`,
      scenarioId: scenario.id, sourceTokenId: tokenId, slotIndex, item: option.spell.item,
      definitionId: option.spell.spellId, phase: 'prepare', catalystId: getCanvasWeaponIdentity(getCanvasCatalysts(token)[0]),
      actionDieId: null, manaSpend: 0, conserve: false,
      practice, practiceId: practiceResources?.id, practiceResources: practiceResources?.resources,
      combatStartedAt: scenario.canvasCombat?.startedAt, combatRound: scenario.canvasCombat?.round });
    return true;
  }, [activeScenario, activeScenarioRef, combatRuntime, isPlayerView, playerName, triggerToast]);

  const configure = useCallback(patch => {
    if (!busyRef.current) setSession(current => current?.phase === 'prepare' ? { ...current, ...patch } : current);
  }, []);

  const prepareArea = useCallback(() => {
    if (busyRef.current || !session || !catalyst || !resources.some(die => die.id === session.actionDieId && die.status === 'available')) return false;
    const option = getCanvasSpellAvailability(sourceToken, activeScenario?.canvasCombat, session.slotIndex,
      { practice: session.practice, practiceCombat: activeScenario?.canvasPracticeCombat });
    if (!option.available) { triggerToast('Conjuro no disponible', option.reason, 'warning'); return false; }
    if (session.manaSpend + Number(session.conserve) > Number(sourceToken.stats?.recurso?.current || 0)) return false;
    setSession(current => ({ ...current, phase: 'place-area' }));
    return true;
  }, [activeScenario?.canvasCombat, activeScenario?.canvasPracticeCombat, catalyst, resources, session, sourceToken, triggerToast]);

  const fromEvent = useCallback(event => {
    if (session?.phase !== 'place-area' || !sourceToken || !catalyst) return null;
    const pointer = event?.touches?.[0] || event?.changedTouches?.[0] || event;
    if (!Number.isFinite(pointer?.clientX) || !Number.isFinite(pointer?.clientY)) return null;
    const point = divToWorld(pointer.clientX, pointer.clientY);
    if (session.definitionId === 'arcane-mist') return resolveCanvasArcaneMistPlacement({
      point, manaSpend: session.manaSpend,
      source: sourceToken, catalyst, gridConfig, items: activeScenario?.items || [],
    });
    if (['arcane-projectile', 'runic-barrier'].includes(session.definitionId)) {
      const items = activeScenario?.items || [];
      const target = [...items].reverse().find(item => {
        if (!isCombatTokenItem(item)) return false;
        const rendered = getCombatRenderPlacement(item, items, gridConfig);
        return point.x >= rendered.x && point.y >= rendered.y
          && point.x <= rendered.x + (item.width || 50) && point.y <= rendered.y + (item.height || 50);
      });
      if (session.definitionId === 'runic-barrier') return resolveArcaneBarrierTarget({ source: sourceToken,
        target, catalyst, items, gridConfig, manaSpend: session.manaSpend });
      const origin = session.chain ? items.find(item => item.id === session.chain.firstTargetId) || session.chain.origin : sourceToken;
      return resolveArcaneProjectileTarget({ source: sourceToken, origin, target, catalyst, items, gridConfig,
        excludeId: session.chain?.firstTargetId });
    }
    return resolveCanvasFireballPlacement({ point,
      source: sourceToken, catalyst, gridConfig, items: activeScenario?.items || [] });
  }, [activeScenario?.items, catalyst, divToWorld, gridConfig, session, sourceToken]);

  const handlePointerMove = useCallback(event => {
    if (busyRef.current) return true;
    if (event?.touches?.length > 1 || event?.buttons === 4 || event?.altKey) return false;
    const next = fromEvent(event);
    if (!next) return false;
    setPlacement(current => current?.x === next.x && current?.y === next.y && current?.targetId === next.targetId
      && current?.reason === next.reason ? current : next);
    return true;
  }, [fromEvent]);

  const handlePointerDown = useCallback(event => {
    if (busyRef.current) { event?.stopPropagation?.(); return true; }
    if (event?.button != null && Date.now() < ignoreMouseUntilRef.current) { event.stopPropagation?.(); return true; }
    if ((event?.button != null && event.button !== 0) || event?.altKey || session?.phase !== 'place-area') return false;
    const next = fromEvent(event) || placement;
    event?.preventDefault?.(); event?.stopPropagation?.();
    setPlacement(next);
    if (next?.valid) setSession(current => ({ ...current, phase: 'confirm' }));
    else if (session?.definitionId === 'arcane-mist') triggerToast('Área no válida',
      next?.reason || 'Elige un área visible dentro del alcance.', 'warning');
    else triggerToast(['arcane-projectile', 'runic-barrier'].includes(session?.definitionId) ? 'Objetivo no válido' : 'Área no válida', ['arcane-projectile', 'runic-barrier'].includes(session?.definitionId)
      ? next?.reason || 'Elige una criatura enemiga.' : next?.reason === 'out-of-range'
      ? 'Las cuatro casillas deben quedar dentro del alcance del Catalizador.'
      : next?.reason === 'smoke' ? 'El Humo impide ver el área.' : next?.reason === 'duel'
        ? 'No puedes utilizar ese Catalizador en Duelo.' : next?.reason === 'cegado'
          ? 'Cegado: no puedes elegir esa área.' : 'El área debe quedar completamente dentro del tablero.', 'warning');
    return true;
  }, [fromEvent, placement, session?.phase, session?.definitionId, triggerToast]);

  const handleTouchStart = useCallback(event => {
    if (session?.phase !== 'place-area') return false;
    ignoreMouseUntilRef.current = Date.now() + 800;
    if (event.touches.length > 1) { touchRef.current = 'pinch'; return false; }
    if (touchRef.current === 'pinch') return false;
    touchRef.current = 'place'; event.stopPropagation(); handlePointerMove(event); return true;
  }, [handlePointerMove, session?.phase]);
  const handleTouchMove = useCallback(event => {
    if (event.touches.length > 1) { touchRef.current = 'pinch'; return false; }
    if (touchRef.current !== 'place') return false;
    event.stopPropagation(); return handlePointerMove(event);
  }, [handlePointerMove]);
  const handleTouchEnd = useCallback(event => {
    const gesture = touchRef.current;
    ignoreMouseUntilRef.current = Date.now() + 800;
    if (event.touches.length === 0) touchRef.current = null;
    if (gesture !== 'place') return false;
    return handlePointerDown(event);
  }, [handlePointerDown]);

  const confirm = useCallback(async () => {
    if (busyRef.current || session?.phase !== 'confirm' || !placement?.valid) return false;
    busyRef.current = true;
    try {
      const cast = session.definitionId === 'runic-barrier' ? combatRuntime.castArcaneBarrier
        : session.definitionId === 'arcane-mist' ? combatRuntime.castArcaneMist
        : session.definitionId === 'arcane-projectile' ? combatRuntime.castArcaneProjectile : combatRuntime.castFireball;
      const result = await cast({ ...session, castId: session.id, tokenId: session.sourceTokenId,
        point: { x: placement.x + 1, y: placement.y + 1 }, targetId: placement.targetId });
      if (!result?.ok) return false;
      setSession(null); setPlacement(null); return true;
    } finally { busyRef.current = false; }
  }, [combatRuntime, placement, session]);

  const targetOptions = useMemo(() => {
    if (!['arcane-projectile', 'runic-barrier'].includes(session?.definitionId) || !sourceToken || !catalyst) return [];
    const items = activeScenario?.items || [];
    if (session.definitionId === 'runic-barrier') return items.filter(isCombatTokenItem).map(target => ({
      ...resolveArcaneBarrierTarget({ source: sourceToken, target, catalyst, items, gridConfig, manaSpend: session.manaSpend }),
      targetImage: target.portrait || target.img, targetIsCircular: Boolean(target.isCircular),
    })).filter(option => option.valid);
    const origin = session.chain ? items.find(item => item.id === session.chain.firstTargetId) || session.chain.origin : sourceToken;
    return items.filter(isCombatTokenItem).map(target => ({ ...resolveArcaneProjectileTarget({ source: sourceToken,
      origin, target, catalyst, items, gridConfig, excludeId: session.chain?.firstTargetId }),
      targetImage: target.portrait || target.img, targetIsCircular: Boolean(target.isCircular) })).filter(option => option.valid);
  }, [activeScenario?.items, catalyst, gridConfig, session, sourceToken]);
  useEffect(() => {
    if (!['arcane-projectile', 'runic-barrier'].includes(session?.definitionId) || busyRef.current || !placement?.targetId) return;
    const currentTarget = targetOptions.find(option => option.targetId === placement.targetId);
    if (!currentTarget) {
      setPlacement(null);
      setSession(current => current ? { ...current, phase: 'place-area' } : null);
    } else if (session.definitionId === 'runic-barrier') {
      setPlacement(previous => previous.x === currentTarget.x && previous.y === currentTarget.y
        && previous.distance === currentTarget.distance ? previous : currentTarget);
    }
  }, [placement?.targetId, session?.definitionId, targetOptions]);
  const selectTarget = useCallback(targetId => {
    if (busyRef.current || !['place-area', 'confirm'].includes(session?.phase)) return;
    const next = targetOptions.find(option => option.targetId === targetId);
    if (!next) return;
    setPlacement(next); setSession(current => ({ ...current, phase: 'confirm' }));
  }, [session?.phase, targetOptions]);

  useEffect(() => {
    if (session?.definitionId !== 'arcane-mist' || !placement?.valid || busyRef.current) return;
    const current = resolveCanvasArcaneMistPlacement({ point: { x: placement.x + 1, y: placement.y + 1 },
      manaSpend: session.manaSpend,
      source: sourceToken, catalyst, gridConfig, items: activeScenario?.items || [] });
    if (!current.valid) {
      setPlacement(null); setSession(previous => ({ ...previous, phase: 'place-area' }));
    }
  }, [activeScenario?.items, catalyst, gridConfig, placement, session?.definitionId, session?.manaSpend, sourceToken]);

  return { session, sourceToken, catalysts, resources, placement, begin, configure, prepareArea, cancel, confirm,
    targetOptions, selectTarget,
    combat: activeScenario?.canvasCombat,
    availabilityOptions,
    conservationUsed: Boolean((session?.practice ? activeScenario?.canvasPracticeCombat : activeScenario?.canvasCombat)?.participants?.[sourceToken?.id]?.arcaneConservationUsed),
    handlePointerDown, handlePointerMove, handleTouchStart, handleTouchMove, handleTouchEnd,
    handleTouchCancel: () => { touchRef.current = null; },
    reposition: () => { if (!busyRef.current) { setPlacement(null); setSession(current => current ? { ...current, phase: 'place-area' } : null); } },
    isPlacing: session?.phase === 'place-area', isConfirming: session?.phase === 'confirm',
    isCommitting: Boolean(combatRuntime?.isCastingSpell), trajectorySource: session?.chain
      ? activeScenario?.items?.find(item => item.id === session.chain.firstTargetId) || session.chain.origin : sourceToken,
    labels: session?.definitionId === 'runic-barrier' ? {
      group: 'Lanzamiento de Barrera rúnica',
      status: placement?.valid ? `Barrera rúnica · ${placement.targetName}` : placement?.reason || 'Elige al Mago o a un aliado visible',
      confirm: 'Crear Barrera rúnica', cancel: 'Cancelar conjuro',
    } : session?.definitionId === 'arcane-mist' ? {
      group: 'Lanzamiento de Niebla arcana',
      status: `Niebla arcana · Área ${session.manaSpend ? '3×3' : '2×2'} · Hasta el final del combate`,
      confirm: 'Lanzar Niebla arcana', cancel: 'Cancelar conjuro',
    } : session?.definitionId === 'arcane-projectile' ? {
      group: session.chainId ? 'Cadena arcana' : 'Lanzamiento de Proyectil arcano',
      status: placement?.valid ? `${session.chainId ? 'Cadena arcana' : 'Proyectil arcano'} · ${placement.targetName}`
        : placement?.reason || (session.chainId ? 'Elige otro enemigo desde el primer impacto' : 'Elige un enemigo localizado'),
      confirm: session.chainId ? 'Lanzar segundo impacto' : 'Lanzar Proyectil arcano',
      cancel: session.chainId ? 'Terminar cadena' : 'Cancelar conjuro',
    } : { group: 'Lanzamiento de Bola de fuego', status: 'Bola de fuego · Área 2×2 · Fuego amigo',
      confirm: 'Lanzar Bola de fuego', cancel: 'Cancelar conjuro' } };
};
