import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import ActionDieSvg from './ActionDieSvg';
import { CANVAS_HEALING_DURATION, CANVAS_HEALING_REVEAL_AT, getCanvasHealingPresentationStart, useCanvasHealingTimeline } from '../features/tactical-shared/canvasHealingPresentation';
import './CanvasDieOutcomeEffect.css';
import { getTokenSilhouetteStyle } from '../features/tactical-shared/tokenSilhouette';

export const CANVAS_DIE_OUTCOME_DURATION = CANVAS_HEALING_DURATION;

// Screen-space placement keeps the die readable at any zoom and clear of the
// token's existing top toolbar. Return an offset from the token centre.
export const getCanvasDieOutcomeOffset = ({ tokenRect, viewport, zoom = 1 }) => {
    const scale = Math.max(.05, Number(zoom) || 1);
    const halfWidth = 48, halfHeight = 56, margin = 8;
    const cx = tokenRect.left + tokenRect.width / 2, cy = tokenRect.top + tokenRect.height / 2;
    const controlHalfWidth = Math.max(tokenRect.width / 2, 52 * scale);
    const side = controlHalfWidth + halfWidth + 10;
    const top = tokenRect.top - halfHeight - 8;
    const candidates = [
        { x: cx + side, y: top }, { x: cx - side, y: top },
        { x: cx + tokenRect.width / 2 + halfWidth + 10, y: Math.max(cy, tokenRect.top - 8 * scale + halfHeight + 10) },
        { x: cx - tokenRect.width / 2 - halfWidth - 10, y: Math.max(cy, tokenRect.top - 8 * scale + halfHeight + 10) },
        { x: cx, y: tokenRect.top - 40 * scale - halfHeight - 12 },
        { x: cx, y: tokenRect.top + tokenRect.height + 28 * scale + halfHeight + 12 },
    ];
    if (!viewport?.width || !viewport?.height) return { x: candidates[0].x - cx, y: candidates[0].y - cy };
    const fits = point => point.x - halfWidth >= margin && point.x + halfWidth <= viewport.width - margin
        && point.y - halfHeight >= margin && point.y + halfHeight <= viewport.height - margin;
    const chosen = candidates.find(fits) || candidates[0];
    const clamp = (value, lower, upper) => Math.max(lower, Math.min(Math.max(lower, upper), value));
    return { x: clamp(chosen.x, margin + halfWidth, viewport.width - margin - halfWidth) - cx,
        y: clamp(chosen.y, margin + halfHeight, viewport.height - margin - halfHeight) - cy };
};

// Numerals are a presentation of a committed roll, never another random draw.
export default function CanvasDieOutcomeEffect({ effect, targetPos, zoom = 1, outcomeOffset }) {
    const reducedMotion = useReducedMotion();
    const die = effect?.dice?.[0];
    const faces = Number(die?.faces || 4), result = Number(die?.value);
    const id = effect?.sourceEventId || effect?.id;
    const committedStart = getCanvasHealingPresentationStart(effect);
    const startedAt = useMemo(() => committedStart || Date.now(), [id, committedStart]);
    const timeline = useCanvasHealingTimeline({ id, startedAt, reducedMotion, animateDie: true });
    const arrivalElapsed = useMemo(() => Math.max(0, Date.now() - startedAt), [startedAt]);
    const pulseElapsed = useMemo(() => timeline.revealed ? Math.max(0, Date.now() - startedAt - CANVAS_HEALING_REVEAL_AT) : 0, [startedAt, timeline.revealed]);
    if (!targetPos || !timeline.started || timeline.finished || !Number.isInteger(result) || result < 1 || result > faces) return null;
    const { frame, revealed: resolved } = timeline;
    const displayed = resolved ? result : (result + frame) % faces + 1;
    const recovered = Math.max(0, Number(effect.healed) || 0);
    const scale = Math.max(.05, Number(zoom) || 1);
    const offset = outcomeOffset || getCanvasDieOutcomeOffset({ tokenRect: {
        left: -targetPos.width * scale / 2, top: -targetPos.height * scale / 2,
        width: targetPos.width * scale, height: targetPos.height * scale }, zoom: scale });
    return <div className={`canvas-die-outcome ${resolved ? 'is-resolved' : ''} ${reducedMotion ? 'is-reduced' : ''}`}
        style={{ left: targetPos.x + targetPos.width / 2, top: targetPos.y + targetPos.height / 2,
            animationDelay: `-${arrivalElapsed}ms`,
            '--outcome-inverse-zoom': 1 / scale,
            '--outcome-token-width': `${targetPos.width}px`, '--outcome-token-height': `${targetPos.height}px`,
            '--outcome-left': `${offset.x / scale}px`, '--outcome-top': `${offset.y / scale}px` }}
        data-item-effect-id={effect.sourceEventId || effect.id}>
        {recovered > 0 && <span aria-hidden="true" style={targetPos.isCircular === false && targetPos.img ? {
            position: 'absolute', left: -targetPos.width / 2, top: -targetPos.height / 2,
            width: targetPos.width, height: targetPos.height, transform: `rotate(${targetPos.rotation || 0}deg)`,
            ...getTokenSilhouetteStyle(targetPos.img, false),
        } : { display: 'contents' }}>
            <span className="canvas-die-outcome-pulse" style={{ animationDelay: `-${pulseElapsed}ms`,
                ...(targetPos.isCircular === false && targetPos.img ? { left: '50%', top: '50%', background: 'radial-gradient(ellipse, #f3c1c270, #e7a0a84d 67%, transparent)' } : {}) }} />
        </span>}
        <div className="canvas-die-outcome-content">
            <div className="canvas-die-outcome-die" aria-hidden="true">
                <ActionDieSvg faces={faces} value={displayed} accent="gold" />
            </div>
            <div className="canvas-die-outcome-recovery" aria-hidden="true">
                <strong>+{recovered}</strong><span>Vida</span>
            </div>
            <span role="status" className="sr-only">{resolved
                ? `D${faces}: ${result}. ${recovered > 0 ? `Recupera ${recovered} de Vida.` : 'Sin Vida recuperada.'}`
                : 'Tirada de curación.'}</span>
        </div>
    </div>;
}
