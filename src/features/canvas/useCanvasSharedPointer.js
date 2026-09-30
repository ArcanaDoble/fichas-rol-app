import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    CANVAS_PING_LIFETIME_MS,
    getActiveCanvasPings,
    getCanvasPointerActorId,
    getCanvasPointerColor,
    normalizeCanvasPointers,
} from './sharedPointerModel';

const POINTER_WRITE_INTERVAL_MS = 120;
const POINTER_IDLE_TIMEOUT_MS = 2200;
const PING_CLEANUP_TIMERS = new Map();

export const useCanvasSharedPointer = ({
    activeScenario,
    currentUserId,
    divToWorld,
    isPlayerView,
    playerName,
    scenarioCollectionName,
}) => {
    const [remotePointers, setRemotePointers] = useState([]);
    const [remotePings, setRemotePings] = useState([]);
    const [localPointer, setLocalPointer] = useState(null);
    const [localPings, setLocalPings] = useState([]);
    const [pointerClock, setPointerClock] = useState(() => Date.now());
    const writeTimerRef = useRef(null);
    const idleTimerRef = useRef(null);
    const queuedPointerRef = useRef(null);
    const lastWriteAtRef = useRef(0);
    const localPointerRef = useRef(null);
    const mountedRef = useRef(true);
    const scenarioId = activeScenario?.id || null;
    const actorId = useMemo(() => getCanvasPointerActorId({
        currentUserId,
        isPlayerView,
        playerName,
    }), [currentUserId, isPlayerView, playerName]);
    const displayName = isPlayerView ? (playerName || 'Jugador') : 'Máster';
    const color = useMemo(
        () => getCanvasPointerColor(actorId, !isPlayerView),
        [actorId, isPlayerView],
    );

    useEffect(() => {
        localPointerRef.current = localPointer;
    }, [localPointer]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const pointerDocRef = useCallback(() => (
        scenarioId
            ? doc(db, scenarioCollectionName, scenarioId, 'sharedPointers', actorId)
            : null
    ), [actorId, scenarioCollectionName, scenarioId]);

    const pingDocRef = useCallback((pingId) => (
        scenarioId && pingId
            ? doc(db, scenarioCollectionName, scenarioId, 'sharedPings', pingId)
            : null
    ), [scenarioCollectionName, scenarioId]);

    const writePointer = useCallback((payload) => {
        const reference = pointerDocRef();
        if (!reference || !payload) return;
        lastWriteAtRef.current = Date.now();
        setDoc(reference, payload, { merge: true }).catch((error) => {
            console.error('No se pudo compartir el puntero del Canvas:', error);
        });
    }, [pointerDocRef]);

    const queuePointerWrite = useCallback((payload, immediate = false) => {
        queuedPointerRef.current = payload;
        const elapsed = Date.now() - lastWriteAtRef.current;

        if (immediate || elapsed >= POINTER_WRITE_INTERVAL_MS) {
            if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
            const nextPayload = queuedPointerRef.current;
            queuedPointerRef.current = null;
            writePointer(nextPayload);
            return;
        }

        if (writeTimerRef.current !== null) return;
        writeTimerRef.current = window.setTimeout(() => {
            writeTimerRef.current = null;
            const nextPayload = queuedPointerRef.current;
            queuedPointerRef.current = null;
            writePointer(nextPayload);
        }, POINTER_WRITE_INTERVAL_MS - elapsed);
    }, [writePointer]);

    const clearSharedPointer = useCallback(() => {
        if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
        if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
        writeTimerRef.current = null;
        idleTimerRef.current = null;
        queuedPointerRef.current = null;
        localPointerRef.current = null;
        if (mountedRef.current) setLocalPointer(null);
        const reference = pointerDocRef();
        if (reference) deleteDoc(reference).catch(() => {});
    }, [pointerDocRef]);

    const schedulePointerExpiry = useCallback(() => {
        if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(clearSharedPointer, POINTER_IDLE_TIMEOUT_MS);
    }, [clearSharedPointer]);

    const publishPing = useCallback((ping) => {
        const reference = pingDocRef(ping.id);
        if (!reference) return;

        setLocalPings((current) => [
            ...getActiveCanvasPings({ pings: current }, ping.createdAt),
            ping,
        ]);
        setDoc(reference, ping).catch((error) => {
            console.error('No se pudo compartir el ping del Canvas:', error);
        });

        const cleanupKey = `${scenarioCollectionName}/${scenarioId}/${ping.id}`;
        const previousTimer = PING_CLEANUP_TIMERS.get(cleanupKey);
        if (previousTimer !== undefined) window.clearTimeout(previousTimer);
        const cleanupTimer = window.setTimeout(() => {
            PING_CLEANUP_TIMERS.delete(cleanupKey);
            deleteDoc(reference).catch(() => {});
            if (mountedRef.current) {
                setLocalPings((current) => current.filter((entry) => entry.id !== ping.id));
            }
        }, CANVAS_PING_LIFETIME_MS + 50);
        PING_CLEANUP_TIMERS.set(cleanupKey, cleanupTimer);
    }, [pingDocRef, scenarioCollectionName, scenarioId]);

    const buildPointer = useCallback((event) => {
        const worldPoint = divToWorld(event.clientX, event.clientY);
        return {
            actorId,
            name: displayName,
            color,
            x: worldPoint.x,
            y: worldPoint.y,
            updatedAt: Date.now(),
            visible: true,
            pings: [],
            ping: null,
        };
    }, [actorId, color, displayName, divToWorld]);

    const handleSharedPointerMove = useCallback((event) => {
        if (!scenarioId || !event.ctrlKey) {
            if (localPointerRef.current) clearSharedPointer();
            return false;
        }
        const pointer = buildPointer(event);
        localPointerRef.current = pointer;
        setLocalPointer(pointer);
        queuePointerWrite(pointer);
        schedulePointerExpiry();
        return true;
    }, [buildPointer, clearSharedPointer, queuePointerWrite, scenarioId, schedulePointerExpiry]);

    const handleSharedPointerDown = useCallback((event) => {
        if (!scenarioId || !event.ctrlKey || event.button !== 0) return false;
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent?.stopImmediatePropagation?.();

        const now = Date.now();
        const worldPoint = divToWorld(event.clientX, event.clientY);
        const ping = {
            id: `${actorId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
            actorId,
            name: displayName,
            color,
            x: worldPoint.x,
            y: worldPoint.y,
            createdAt: now,
            updatedAt: now,
        };
        publishPing(ping);

        const pointer = buildPointer(event);
        localPointerRef.current = pointer;
        setLocalPointer(pointer);
        queuePointerWrite(pointer, true);
        schedulePointerExpiry();
        return true;
    }, [actorId, buildPointer, color, displayName, divToWorld, publishPing, queuePointerWrite, scenarioId, schedulePointerExpiry]);

    useEffect(() => {
        if (!scenarioId) {
            setRemotePointers([]);
            setRemotePings([]);
            setLocalPointer(null);
            return undefined;
        }

        const unsubscribePointers = onSnapshot(
            collection(db, scenarioCollectionName, scenarioId, 'sharedPointers'),
            (snapshot) => {
                setRemotePointers(snapshot.docs.map((pointerDocument) => ({
                    id: pointerDocument.id,
                    data: pointerDocument.data(),
                })));
            },
            (error) => console.error('No se pudieron recibir los punteros del Canvas:', error),
        );
        const unsubscribePings = onSnapshot(
            collection(db, scenarioCollectionName, scenarioId, 'sharedPings'),
            (snapshot) => {
                setRemotePings(snapshot.docs.map((pingDocument) => ({
                    id: pingDocument.id,
                    ...pingDocument.data(),
                })));
            },
            (error) => console.error('No se pudieron recibir los pings del Canvas:', error),
        );
        return () => {
            unsubscribePointers();
            unsubscribePings();
        };
    }, [scenarioCollectionName, scenarioId]);

    useEffect(() => {
        const intervalId = window.setInterval(() => setPointerClock(Date.now()), 250);
        const handleKeyUp = (event) => {
            if (event.key === 'Control') clearSharedPointer();
        };
        const handleVisibilityChange = () => {
            if (document.hidden) clearSharedPointer();
        };
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', clearSharedPointer);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', clearSharedPointer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [clearSharedPointer]);

    useEffect(() => () => clearSharedPointer(), [clearSharedPointer]);

    const activeLocalPings = getActiveCanvasPings({ pings: localPings }, pointerClock);
    const localPingIds = new Set(activeLocalPings.map((ping) => ping.id));
    const activeRemotePings = remotePings.filter((ping) => (
        !localPingIds.has(ping.id)
        && getActiveCanvasPings({ pings: [ping] }, pointerClock).length > 0
    ));
    const pingPointers = [...activeRemotePings, ...activeLocalPings].map((ping) => ({
        id: `ping:${ping.id}`,
        actorId: ping.actorId,
        name: ping.name,
        color: ping.color,
        x: ping.x,
        y: ping.y,
        visible: false,
        pings: [ping],
    }));

    return {
        canvasPointers: [
            ...normalizeCanvasPointers(remotePointers, {
                now: pointerClock,
                // Firestore can keep the last local document in the snapshot for a
                // moment after Ctrl is released. Never render that local echo: the
                // immediate pointer is already represented by localPointer and,
                // once cleared, its stale snapshot would visibly jump back to the
                // last published position (usually the most recent ping).
                localActorId: actorId,
            }),
            ...(localPointer ? [{ id: actorId, ...localPointer }] : []),
            ...pingPointers,
        ],
        isCanvasPointerActive: Boolean(localPointer),
        handleSharedPointerDown,
        handleSharedPointerLeave: clearSharedPointer,
        handleSharedPointerMove,
    };
};
