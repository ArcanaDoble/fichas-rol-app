import { useLayoutEffect, useRef, useState } from 'react';

export const BOARD_DRAW_INTERVAL_MS = 180;
export const BOARD_DRAW_DURATION_MS = 420;

// A draw is committed once. Every connected viewer presents those same cards
// one at a time; loading an existing board never replays past draws.
export const useBoardDrawPresentation = (scenario, enabled = true) => {
    const sceneRef = useRef(null);
    const seenRef = useRef(new Set());
    const [presentations, setPresentations] = useState({});
    useLayoutEffect(() => {
        const items = scenario?.items || [];
        const eventKey = card => `${card.id}:${card.boardDraw?.id}`;
        if (!enabled || scenario?.id !== sceneRef.current) {
            sceneRef.current = scenario?.id;
            seenRef.current = new Set(items.filter(card => card.boardDraw?.id).map(eventKey));
            setPresentations({});
            return;
        }
        const now = Date.now();
        const added = {};
        items.forEach(card => {
            const draw = card.boardDraw;
            if (!draw?.id || seenRef.current.has(eventKey(card))) return;
            seenRef.current.add(eventKey(card));
            if (card.stackParentId || card.zone === 'hand' || Math.abs(now - draw.at) > 30000) return;
            added[card.id] = {
                ...draw, targetX: card.x, targetY: card.y,
                delay: draw.index * BOARD_DRAW_INTERVAL_MS / 1000,
                endsAt: now + draw.index * BOARD_DRAW_INTERVAL_MS + BOARD_DRAW_DURATION_MS,
            };
        });
        setPresentations(previous => {
            const live = new Map(items.map(card => [card.id, card]));
            const next = {};
            Object.entries(previous).forEach(([id, presentation]) => {
                const card = live.get(id);
                if (card?.boardDraw?.id === presentation.id && !card.stackParentId && card.zone !== 'hand'
                    && card.x === presentation.targetX && card.y === presentation.targetY && presentation.endsAt > now) next[id] = presentation;
            });
            if (!Object.keys(added).length && Object.keys(next).length === Object.keys(previous).length) return previous;
            return { ...next, ...added };
        });
    }, [scenario?.id, scenario?.items, enabled]);

    useLayoutEffect(() => {
        const endings = Object.values(presentations).map(presentation => presentation.endsAt);
        if (!endings.length) return;
        const timer = window.setTimeout(() => {
            setPresentations(previous => Object.fromEntries(Object.entries(previous).filter(([, value]) => value.endsAt > Date.now())));
        }, Math.max(0, Math.min(...endings) - Date.now()) + 16);
        return () => window.clearTimeout(timer);
    }, [presentations]);
    return enabled ? presentations : {};
};
