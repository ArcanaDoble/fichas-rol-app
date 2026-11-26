import { getAntidoteBlockReason } from './antidoteRules';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAreaSceneItem, resolveAreaPlacement } from '../../tactical-shared/areaPlacementSystem';
import { canControlToken } from '../../tactical-shared/tokenControlUtils';
import { ITEM_USE_PHASES, advanceItemUseSession, createItemUseSession } from './itemUseSystem';
import { getItemUseDefinition } from './itemUseDefinitions';
import { getHealingPotionBlockReason } from './healingPotionRules';
import { getExplosiveBombMaxRange, resolveExplosiveBombAreaPlacements } from './explosiveBombRules';

const getEventPoint = (event) => event?.touches?.[0] || event?.changedTouches?.[0] || event;

export const useCanvasItemUseSystem = ({
    activeScenario,
    activeScenarioRef,
    combatRuntime,
    divToWorld,
    gridConfig,
    isPlayerView,
    playerName,
    triggerToast,
}) => {
    const [session, setSession] = useState(null);
    const [placement, setPlacement] = useState(null);
    const [result, setResult] = useState(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const commitRef = useRef(false);
    const dismissedBlastIdRef = useRef(null);
    const touchGestureRef = useRef(null);
    const ignoreMouseUntilRef = useRef(0);

    const sourceToken = useMemo(() => (
        (activeScenario?.items || []).find((item) => item.id === session?.sourceTokenId) || null
    ), [activeScenario?.items, session?.sourceTokenId]);
    const definition = useMemo(() => getItemUseDefinition(session?.item), [session?.item]);
    const isExplosiveBomb = session?.definitionId === 'explosive-bomb';
    const antidoteTargets = useMemo(() => ['antidote', 'bandage'].includes(session?.definitionId)
        ? (activeScenario?.items || []).filter(candidate => candidate.id === sourceToken?.id
            || !getAntidoteBlockReason(sourceToken, candidate, activeScenario.items, gridConfig, { isPlayerView, playerName }, session?.definitionId === 'bandage'))
            .map(candidate => ({ id: candidate.id, name: candidate.name,
                blocked: getAntidoteBlockReason(sourceToken, candidate, activeScenario.items, gridConfig, { isPlayerView, playerName }, session?.definitionId === 'bandage') })) : [],
        [session?.definitionId, activeScenario?.items, sourceToken, gridConfig, isPlayerView, playerName]);
    const selectTarget = useCallback(targetId => {
        if (commitRef.current || !antidoteTargets.some(candidate => candidate.id === targetId && !candidate.blocked)) return;
        setSession(current => current ? { ...current, context: { ...current.context, targetId } } : current);
    }, [antidoteTargets]);

    const hasOrientation = Boolean(definition?.area?.orientAroundImpact);
    const pendingBlast = combatRuntime?.explosiveBlast?.phase === 'choose-area'
        ? combatRuntime.explosiveBlast : null;
    const canResumeExplosiveBlast = Boolean(pendingBlast && canControlToken(
        (activeScenario?.items || []).find((candidate) => candidate.id === pendingBlast.sourceTokenId),
        isPlayerView, playerName,
    ));
    const resources = useMemo(() => (
        session?.sourceTokenId ? combatRuntime?.getItemUseResources?.(session.sourceTokenId, session.item) || [] : []
    ), [combatRuntime, session?.sourceTokenId, session?.item, combatRuntime?.combatState]);
    const savedDistance = session?.context?.impactCommitted ? Number(session.context.distance) : NaN;
    const savedRange = session?.context?.impactCommitted ? Number(session.context.maxRange) : NaN;
    const explosiveOrientations = useMemo(() => (
        hasOrientation && session?.context?.impactCell
            ? resolveExplosiveBombAreaPlacements({
                impactCell: session.context.impactCell, gridConfig, source: sourceToken,
            }).map((option) => ({ ...option,
                distance: Number.isFinite(savedDistance) ? savedDistance : option.distance,
                range: Number.isFinite(savedRange) ? savedRange : getExplosiveBombMaxRange({ source: sourceToken, resourceValue: session?.context?.resource?.value }),
            }))
            : []
    ), [gridConfig, hasOrientation, savedDistance, savedRange, session?.context?.impactCell, session?.context?.resource?.value, sourceToken]);
    const explosivePressure = isExplosiveBomb ? session?.context?.pressure ?? null : null;
    const trajectorySource = session?.context?.sourcePosition && sourceToken
        ? { ...sourceToken, ...session.context.sourcePosition } : sourceToken;

    const resumeExplosiveBlast = useCallback(() => {
        if (commitRef.current || !pendingBlast) return false;
        const scenario = activeScenarioRef.current || activeScenario;
        const token = (scenario?.items || []).find((candidate) => candidate.id === pendingBlast.sourceTokenId);
        if (!canControlToken(token, isPlayerView, playerName)) return false;
        const blastDefinition = getItemUseDefinition(pendingBlast.item);
        const orientations = resolveExplosiveBombAreaPlacements({
            impactCell: pendingBlast.impactCell, gridConfig, source: token,
        }).map((option) => ({ ...option, distance: pendingBlast.distance,
            range: pendingBlast.maxRange ?? getExplosiveBombMaxRange({ source: token, resourceValue: pendingBlast.resource?.value }) }));
        if (blastDefinition?.id !== 'explosive-bomb' || !orientations.length) return false;
        const nextSession = createItemUseSession({
            definition: blastDefinition, sourceToken: token, item: pendingBlast.item,
            context: { scenarioId: scenario.id, resource: pendingBlast.resource,
                impactCell: pendingBlast.impactCell, pressure: pendingBlast.pressure,
                explosiveRolls: pendingBlast.rolls, distance: pendingBlast.distance,
                maxRange: pendingBlast.maxRange ?? orientations[0].range,
                sourcePosition: pendingBlast.sourcePosition, impactCommitted: true,
                placement: orientations[0] },
        });
        const confirmIndex = nextSession?.phases.findIndex((phase) => phase.id === ITEM_USE_PHASES.CONFIRM);
        if (confirmIndex < 0) return false;
        dismissedBlastIdRef.current = null;
        setPlacement(orientations[0]);
        setSession({ ...nextSession, id: pendingBlast.useId || pendingBlast.id,
            phaseIndex: confirmIndex, phase: ITEM_USE_PHASES.CONFIRM });
        return true;
    }, [activeScenario, activeScenarioRef, gridConfig, isPlayerView, pendingBlast, playerName]);

    useEffect(() => {
        if (!pendingBlast) {
            dismissedBlastIdRef.current = null;
            return;
        }
        if (!session && dismissedBlastIdRef.current !== (pendingBlast.useId || pendingBlast.id)) {
            resumeExplosiveBlast();
        }
    }, [pendingBlast, resumeExplosiveBlast, session]);

    const cancel = useCallback(() => {
        if (commitRef.current) return;
        if (session?.context?.impactCommitted) dismissedBlastIdRef.current = session.id;
        setSession(null);
        setPlacement(null);
        setResult(null);
        touchGestureRef.current = null;
    }, [session]);

    useEffect(() => {
        if (session && (!sourceToken || session.context.scenarioId !== activeScenario?.id)) cancel();
    }, [activeScenario?.id, cancel, isCommitting, session, sourceToken]);

    useEffect(() => {
        if (!session) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') cancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancel, session]);

    const begin = useCallback((tokenId, item) => {
        if (commitRef.current) return false;
        if (combatRuntime?.explosiveBlast) {
            triggerToast('Explosión pendiente', 'Elige el área de la bomba ya lanzada antes de usar otro objeto.', 'warning');
            return false;
        }
        const scenario = activeScenarioRef.current || activeScenario;
        if (scenario?.rulesSystem === 'campaign') {
            triggerToast('Objeto de Campaña', 'Resuelve su efecto en mesa y ajusta los recursos desde el inspector.', 'info');
            return false;
        }
        const token = (scenario?.items || []).find((candidate) => candidate.id === tokenId);
        const itemDefinition = getItemUseDefinition(item);
        if (!itemDefinition) {
            triggerToast('Uso no disponible', 'Este objeto todavía no tiene un efecto de uso configurado.', 'info');
            return false;
        }
        if (!canControlToken(token, isPlayerView, playerName)) {
            triggerToast('No puedes usar el objeto', 'No controlas esta ficha.', 'warning');
            return false;
        }
        const blocked = itemDefinition.effect?.type === 'heal' ? getHealingPotionBlockReason(token) : null;
        if (blocked) {
            triggerToast('No puedes beber la poción', blocked, 'warning');
            return false;
        }
        const nextResources = combatRuntime?.prepareItemUseResources?.(tokenId, item)
            || combatRuntime?.getItemUseResources?.(tokenId, item) || [];
        if (!token || nextResources.every((resource) => resource.status !== 'available')) {
            triggerToast('Sin acciones disponibles', itemDefinition.cost === 'action'
                ? 'Necesitas una acción disponible para usar la poción.'
                : 'Necesitas un dado disponible para usar este objeto.', 'warning');
            return false;
        }
        setPlacement(null);
        setResult(null);
        const nextSession = createItemUseSession({
            definition: itemDefinition, sourceToken: token, item,
            context: { practice: nextResources.some((resource) => resource.practice), scenarioId: scenario?.id, targetId: tokenId },
        });
        setSession(nextSession);
        return true;
    }, [activeScenario, activeScenarioRef, combatRuntime, isPlayerView, playerName, triggerToast]);

    const selectResource = useCallback((resource) => {
        if (commitRef.current || resource?.status !== 'available') return;
        setSession((current) => {
            if (current?.phase === ITEM_USE_PHASES.SELECT_DIE) return advanceItemUseSession(current, resource);
            if (!['healing-potion', 'antidote', 'bandage', 'haste-potion', 'vitality-potion'].includes(current?.definitionId) || current.phase !== ITEM_USE_PHASES.CONFIRM) return current;
            if (current.context.resource?.id === resource.id) return { ...current, phaseIndex: 0,
                phase: ITEM_USE_PHASES.SELECT_DIE, context: { ...current.context, resource: undefined } };
            return { ...current, context: { ...current.context, resource } };
        });
        setPlacement(null);
    }, []);

    const reselectResource = useCallback(() => {
        if (commitRef.current) return;
        setSession(current => current?.phase === ITEM_USE_PHASES.CONFIRM ? {
            ...current, phaseIndex: 0, phase: ITEM_USE_PHASES.SELECT_DIE,
            context: { ...current.context, resource: undefined },
        } : current);
    }, []);

    const resolvePlacementFromEvent = useCallback((event) => {
        if (!session || session.phase !== ITEM_USE_PHASES.PLACE_AREA || !definition || !sourceToken) return null;
        const pointer = getEventPoint(event);
        if (!Number.isFinite(pointer?.clientX) || !Number.isFinite(pointer?.clientY)) return null;
        const worldPoint = divToWorld(pointer.clientX, pointer.clientY);
        if (hasOrientation) {
            const range = getExplosiveBombMaxRange({ source: sourceToken, resourceValue: session.context?.resource?.value });
            const impact = resolveAreaPlacement({
                point: worldPoint, source: sourceToken, gridConfig,
                shape: 'rect', size: { columns: 1, rows: 1 },
                range,
            });
            const impactCell = impact.cells?.[0];
            const orientations = impactCell ? resolveExplosiveBombAreaPlacements({
                impactCell, gridConfig, source: sourceToken, maxRange: range,
            }) : [];
            return {
                ...impact, impactCell,
                valid: impact.valid && orientations.length > 0,
                reason: impact.reason || (orientations.length ? null : 'outside-grid'),
            };
        }
        return resolveAreaPlacement({
            point: worldPoint,
            source: sourceToken,
            gridConfig,
            shape: definition.area?.shape,
            size: definition.area?.size,
            range: session.context?.resource?.value,
            items: activeScenario?.items || [],
            validate: definition.area?.validate,
        });
    }, [activeScenario?.items, definition, divToWorld, gridConfig, hasOrientation, session, sourceToken]);

    const handlePointerMove = useCallback((event) => {
        if (commitRef.current) return true;
        if (event?.touches?.length > 1 || event?.buttons === 4 || event?.altKey) return false;
        const nextPlacement = resolvePlacementFromEvent(event);
        if (!nextPlacement) return false;
        setPlacement((current) => current && current.x === nextPlacement.x && current.y === nextPlacement.y
            && current.range === nextPlacement.range && current.reason === nextPlacement.reason
            && current.distance === nextPlacement.distance && current.valid === nextPlacement.valid
            && current.width === nextPlacement.width && current.height === nextPlacement.height
            ? current : nextPlacement);
        return true;
    }, [resolvePlacementFromEvent]);

    const handlePointerDown = useCallback((event) => {
        if (commitRef.current) {
            event?.stopPropagation?.();
            return true;
        }
        if (event?.button != null && Date.now() < ignoreMouseUntilRef.current) {
            event.stopPropagation?.();
            return true;
        }
        if ((event?.button != null && event.button !== 0) || event?.altKey) return false;
        if (session?.phase !== ITEM_USE_PHASES.PLACE_AREA) return false;
        const nextPlacement = resolvePlacementFromEvent(event) || placement;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (!nextPlacement?.valid) {
            setPlacement(nextPlacement);
            triggerToast(
                'Plantilla no válida',
                nextPlacement?.reason === 'out-of-range'
                    ? `Está a ${nextPlacement.distance} casillas y ${sourceToken?.profileType === 'rogueliteEnemy' ? 'la Base ofensiva' : 'el dado'} alcanza ${nextPlacement.range}.`
                    : 'La plantilla debe quedar completamente dentro del tablero.',
                'warning',
            );
            return true;
        }
        if (isExplosiveBomb) {
            commitRef.current = true;
            setIsCommitting(true);
            setPlacement(nextPlacement);
            Promise.resolve().then(() => combatRuntime?.commitExplosiveBombImpact?.({
                useId: session.id,
                tokenId: session.sourceTokenId,
                item: session.item,
                resource: session.context.resource,
                impactCell: nextPlacement.impactCell,
            })).then((outcome) => {
                if (!outcome?.ok) return;
                const blast = outcome.blast || outcome;
                const orientations = resolveExplosiveBombAreaPlacements({
                    impactCell: blast.impactCell || nextPlacement.impactCell,
                    gridConfig, source: sourceToken,
                }).map((option) => ({ ...option, distance: outcome.distance ?? blast.distance,
                    range: blast.maxRange ?? getExplosiveBombMaxRange({ source: sourceToken, resourceValue: session.context.resource?.value }) }));
                const orientedPlacement = orientations[0];
                if (!orientedPlacement) return;
                setPlacement(orientedPlacement);
                setSession((current) => {
                    if (current?.phase !== ITEM_USE_PHASES.PLACE_AREA) return current;
                    const advanced = advanceItemUseSession(current, orientedPlacement);
                    return {
                        ...advanced,
                        context: {
                            ...advanced.context,
                            impactCell: blast.impactCell || nextPlacement.impactCell,
                            pressure: outcome.pressure ?? blast.pressure,
                            explosiveRolls: outcome.rolls || blast.rolls,
                            distance: outcome.distance ?? blast.distance,
                            maxRange: blast.maxRange ?? orientedPlacement.range,
                            sourcePosition: blast.sourcePosition,
                            impactCommitted: true,
                        },
                    };
                });
            }).catch(() => {
                triggerToast('No se pudo lanzar la bomba', 'Inténtalo de nuevo.', 'error');
            }).finally(() => {
                commitRef.current = false;
                setIsCommitting(false);
            });
        } else if (hasOrientation) {
            const oriented = resolveExplosiveBombAreaPlacements({ impactCell: nextPlacement.impactCell,
                gridConfig, source: sourceToken, maxRange: nextPlacement.range })[0];
            if (!oriented) return true;
            const selected = { ...oriented, range: nextPlacement.range };
            setPlacement(selected);
            setSession(current => {
                const advanced = advanceItemUseSession(current, selected);
                return { ...advanced, context: { ...advanced.context, impactCell: nextPlacement.impactCell } };
            });
        } else {
            setPlacement(nextPlacement);
            setSession((current) => advanceItemUseSession(current, nextPlacement));
        }
        return true;
    }, [combatRuntime, gridConfig, hasOrientation, isExplosiveBomb, placement, resolvePlacementFromEvent, session, sourceToken, triggerToast]);

    // One finger previews then fixes the destination on release; a pinch is
    // delegated to the viewport and must never fix a template on touchend.
    const handleTouchStart = useCallback((event) => {
        if (session?.phase !== ITEM_USE_PHASES.PLACE_AREA) return false;
        ignoreMouseUntilRef.current = Date.now() + 800;
        if (event.touches.length > 1) {
            touchGestureRef.current = 'pinch';
            return false;
        }
        if (touchGestureRef.current === 'pinch') return false;
        touchGestureRef.current = 'place';
        event.stopPropagation();
        handlePointerMove(event);
        return true;
    }, [handlePointerMove, session?.phase]);

    const handleTouchMove = useCallback((event) => {
        if (touchGestureRef.current !== 'place' || event.touches.length !== 1) return false;
        event.stopPropagation();
        handlePointerMove(event);
        return true;
    }, [handlePointerMove]);

    const handleTouchEnd = useCallback((event) => {
        const gesture = touchGestureRef.current;
        if (gesture) ignoreMouseUntilRef.current = Date.now() + 800;
        if (event.touches.length === 0) touchGestureRef.current = null;
        if (gesture !== 'place') return false;
        event.stopPropagation();
        return handlePointerDown(event);
    }, [handlePointerDown]);

    const handleTouchCancel = useCallback(() => {
        touchGestureRef.current = null;
    }, []);

    const reposition = useCallback(() => {
        if (commitRef.current || session?.context?.impactCommitted) return;
        setPlacement(null);
        setSession((current) => current ? {
            ...current,
            phaseIndex: Math.max(0, current.phaseIndex - 1),
            phase: ITEM_USE_PHASES.PLACE_AREA,
            context: { ...current.context, placement: undefined, impactCell: undefined },
        } : current);
    }, [session?.context?.impactCommitted]);

    const chooseExplosiveOrientation = useCallback((orientation) => {
        if (commitRef.current || session?.phase !== ITEM_USE_PHASES.CONFIRM || !hasOrientation) return;
        const nextPlacement = explosiveOrientations.find((candidate) => candidate.orientation === orientation);
        if (!nextPlacement) return;
        setPlacement(nextPlacement);
        setSession((current) => current?.phase === ITEM_USE_PHASES.CONFIRM ? {
            ...current, context: { ...current.context, placement: nextPlacement },
        } : current);
    }, [explosiveOrientations, hasOrientation, session?.phase]);

    const confirm = useCallback(() => {
        if (commitRef.current) return false;
        if (['heal', 'remove-poison', 'remove-bleeding', 'haste', 'temporary-life'].includes(definition?.effect?.type)) {
            if (session?.phase !== ITEM_USE_PHASES.CONFIRM || session.status !== 'active') return false;
            commitRef.current = true;
            setIsCommitting(true);
            return Promise.resolve().then(() => combatRuntime?.commitItemUse?.({
                useId: session.id, tokenId: session.sourceTokenId,
                item: session.item, resource: session.context.resource, targetId: session.context.targetId,
            })).then(outcome => {
                if (!outcome?.ok) return false;
                setResult(null);
                setSession(current => current?.id === session.id ? null : current);
                return true;
            }).catch(() => {
                triggerToast('No se pudo usar el consumible', 'Inténtalo de nuevo.', 'error');
                return false;
            }).finally(() => {
                commitRef.current = false;
                setIsCommitting(false);
            });
        }
        if (isExplosiveBomb) {
            if (session?.phase !== ITEM_USE_PHASES.CONFIRM || session.status !== 'active'
                || !placement?.valid || !session.context?.impactCell
                || !session.context?.impactCommitted) return false;
            commitRef.current = true;
            setIsCommitting(true);
            return Promise.resolve().then(() => combatRuntime?.commitExplosiveBombUse?.({
                useId: session.id,
                tokenId: session.sourceTokenId,
                impactCell: session.context.impactCell,
                placement,
            })).then((outcome) => {
                if (!outcome?.ok) return false;
                setSession((current) => current?.id === session.id ? null : current);
                setPlacement(null);
                return true;
            }).catch(() => {
                triggerToast('No se pudo lanzar la bomba', 'Inténtalo de nuevo.', 'error');
                return false;
            }).finally(() => {
                commitRef.current = false;
                setIsCommitting(false);
            });
        }
        if (!session || session.phase !== ITEM_USE_PHASES.CONFIRM || !placement?.valid || !definition) return false;
        if (definition.id === 'tar-bomb') {
            commitRef.current = true;
            setIsCommitting(true);
            return Promise.resolve().then(() => combatRuntime?.commitItemUse?.({
                useId: session.id, tokenId: session.sourceTokenId, item: session.item,
                resource: session.context.resource, placement, impactCell: session.context.impactCell,
            })).then(outcome => {
                if (!outcome?.ok) return false;
                setSession(null); setPlacement(null); return true;
            }).catch(() => { triggerToast('No se pudo lanzar la brea', 'Inténtalo de nuevo.', 'error'); return false;
            }).finally(() => { commitRef.current = false; setIsCommitting(false); });
        }
        const area = createAreaSceneItem({
            placement,
            ...definition.effect,
            controlledBy: ['master'],
            metadata: {
                createdByTokenId: session.sourceTokenId,
                createdByRole: isPlayerView ? 'player' : 'master',
                createdByName: isPlayerView ? playerName : 'Master',
                itemUseDefinitionId: definition.id,
                deletableBy: ['master'],
            },
        });
        let resolvingSession = advanceItemUseSession(session, true);
        const didCommit = combatRuntime?.commitItemUse?.({
            tokenId: session.sourceTokenId,
            item: session.item,
            resource: session.context.resource,
            resolvedItems: [area],
            placement, impactCell: session.context.impactCell,
        });
        if (!didCommit) return false;
        resolvingSession = advanceItemUseSession(resolvingSession);
        resolvingSession = advanceItemUseSession(resolvingSession, area);
        setSession(resolvingSession);
        setPlacement(null);
        globalThis.setTimeout(() => setSession(null), 180);
        return true;
    }, [combatRuntime, definition, isExplosiveBomb, isPlayerView, placement, playerName, session, triggerToast]);

    return {
        session,
        placement,
        resources,
        sourceToken,
        trajectorySource,
        definition,
        result,
        isCommitting,
        canResumeExplosiveBlast,
        explosiveOrientations,
        explosivePressure,
        begin,
        resumeExplosiveBlast,
        selectResource,
        antidoteTargets,
        selectTarget,
        reselectResource,
        handlePointerMove,
        handlePointerDown,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        confirm,
        chooseExplosiveOrientation,
        reposition,
        cancel,
        isPlacing: session?.phase === ITEM_USE_PHASES.PLACE_AREA,
        isConfirming: session?.phase === ITEM_USE_PHASES.CONFIRM,
        isShowingResult: Boolean(result),
    };
};

export default useCanvasItemUseSystem;
