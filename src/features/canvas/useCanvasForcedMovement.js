import { useEffect, useRef, useState } from 'react';
import { canForceMoveToken, getForcedMovementDestination } from '../tactical-shared/forcedMovement';

export const useCanvasForcedMovement = ({ activeScenario, activeScenarioRef, activeLayer = 'TABLETOP',
    isPlayerView, disabled, gridConfig, safePersistItems, setActiveScenario, triggerToast }) => {
    const [session, setSession] = useState(null);
    const saving = useRef(false);
    const liveSession = useRef(null);
    const cancel = () => { liveSession.current = null; setSession(null); };
    const canBegin = token => !isPlayerView && !disabled && activeLayer === 'TABLETOP' && canForceMoveToken(token);
    const isActive = tokenId => !isPlayerView && !disabled && activeLayer === 'TABLETOP'
        && Boolean(tokenId) && liveSession.current?.tokenId === tokenId
        && liveSession.current?.scenarioId === (activeScenarioRef.current || activeScenario)?.id;
    const begin = tokenId => {
        const scenario = activeScenarioRef.current || activeScenario;
        const token = scenario?.items?.find(item => item.id === tokenId);
        if (!canBegin(token) || saving.current) return false;
        const next = { tokenId, scenarioId: scenario.id };
        liveSession.current = next; setSession(next);
        return true;
    };
    useEffect(() => {
        if (session && (isPlayerView || disabled || activeLayer !== 'TABLETOP'
            || activeScenario?.id !== session.scenarioId || !activeScenario?.items?.some(item => item.id === session.tokenId))) cancel();
    }, [isPlayerView, disabled, activeLayer, activeScenario?.id, activeScenario?.items, session]);
    useEffect(() => {
        if (!session) return undefined;
        const key = event => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [session]);
    const commitDrag = async (tokenId, { from, to, originalItems }) => {
        const scenario = activeScenarioRef.current || activeScenario;
        const currentToken = scenario?.items?.find(item => item.id === tokenId);
        if (!isActive(tokenId) || !canBegin(currentToken) || saving.current
            || ![from?.x, from?.y, to?.x, to?.y].every(Number.isFinite)) return false;
        const token = { ...currentToken, x: from.x, y: from.y };
        const width = Number(token.width) || Number(gridConfig.cellWidth) || 50;
        const height = Number(token.height) || Number(gridConfig.cellHeight) || 50;
        const beforeItems = originalItems || scenario.items.map(item => item.id === tokenId ? token : item);
        const destination = getForcedMovementDestination({ token,
            point: { x: to.x + width / 2, y: to.y + height / 2 }, items: beforeItems, config: gridConfig });
        if (!destination?.valid) return false;
        if (destination.x === token.x && destination.y === token.y) return true;
        saving.current = true;
        const moved = { ...token, x: destination.x, y: destination.y,
            forcedMovement: { id: `force-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                from: { x: token.x, y: token.y }, to: { x: destination.x, y: destination.y } } };
        const nextItems = scenario.items.map(item => item.id === token.id ? moved : item);
        setActiveScenario(value => value?.id === scenario.id ? { ...value, items: nextItems } : value);
        try {
            const saved = await safePersistItems(scenario.id, nextItems, beforeItems, [token.id], { persistRuntime: false });
            if (saved === false) throw new Error('No se ha guardado el desplazamiento');
            return true;
        } catch (error) {
            setActiveScenario(value => value?.id === scenario.id ? { ...value, items: value.items.map(item => (
                item.id === token.id && item.forcedMovement?.id === moved.forcedMovement.id
                    ? { ...item, x: token.x, y: token.y, forcedMovement: token.forcedMovement || null } : item
            )) } : value);
            triggerToast('No se pudo desplazar', 'La ficha conserva su posición anterior. Puedes volver a intentarlo.', 'error');
            return false;
        } finally { saving.current = false; }
    };
    return { session, isActive, canBegin, begin, cancel, commitDrag };
};
