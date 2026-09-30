import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CANVAS_HEALING_REVEAL_AT, getCanvasHealingPresentationStart, useCanvasHealingTimeline } from '../canvasHealingPresentation';
import { TokenReadout } from './CanvasTokenName';
import './TokenResourceCrown.css';

// Keep the crown's proportions with the portrait, including its angular span.
// Only distant tokens receive a small, smooth legibility allowance; never enlarge
// the radius into a separate floating semicircle or cap blocks to a fixed length.
export const getTokenResourceCrownGeometry = ({ width = 50, height = 50, cellSize = null, zoom = 1, maximum = 1 } = {}) => {
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    const screenWidth = Math.max(1, Number(width) || 50) * safeZoom;
    const screenHeight = Math.max(1, Number(height) || 50) * safeZoom;
    const total = Math.max(1, Math.floor(Number(maximum) || 1));
    const diameter = Math.min(screenWidth, screenHeight);
    // Small creatures retain most of a one-cell token's Life thickness. The
    // circle still follows their own portrait; only the blocks gain weight.
    const referenceDiameter = Math.max(diameter, (Number(cellSize) || 0) * safeZoom);
    const thicknessDiameter = diameter + (referenceDiameter - diameter) * .6;
    const pieceWidth = Math.max(
        diameter * .028 + 1.6 * Math.exp(-diameter / 48),
        thicknessDiameter * .028 + 1.6 * Math.exp(-thicknessDiameter / 48),
    );
    const socketWidth = pieceWidth * 1.65;
    const clearance = diameter * .012 + .2;
    const outset = clearance + socketWidth / 2;
    const radiusX = screenWidth / 2 + outset;
    const radiusY = screenHeight / 2 + outset;
    const radius = Math.max(radiusX, radiusY);
    const sweep = 2 * Math.PI / 3;
    const gapAngle = Math.min((diameter * .018 + .3) / radius, sweep / (total * 3));
    const blockAngle = (sweep - (total - 1) * gapAngle) / total;
    const padding = socketWidth / 2 + 2;
    const centerX = radiusX + padding;
    const centerY = radiusY + padding;
    const point = angle => ({ x: centerX + radiusX * Math.cos(angle), y: centerY + radiusY * Math.sin(angle) });
    const paths = Array.from({ length: total }, (_, index) => {
        const angle = Math.PI / 2 + sweep / 2 - index * (blockAngle + gapAngle);
        const start = point(angle);
        const end = point(angle - blockAngle);
        return `M ${start.x} ${start.y} A ${radiusX} ${radiusY} 0 0 0 ${end.x} ${end.y}`;
    });
    return {
        width: centerX * 2, height: centerY * 2, paths, pieceWidth, socketWidth,
        readoutOffset: outset + socketWidth / 2 + 4,
    };
};

export const getTokenResourceRibbonGeometry = ({ width = 50, height = 50, cellSize, zoom = 1, maximum = 1 } = {}) => {
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    const total = Math.max(1, maximum);
    const span = Math.max(54, Number(width) * safeZoom * .72);
    const thickness = Math.max(4, getTokenResourceCrownGeometry({ width, height, cellSize, zoom }).pieceWidth);
    const gap = Math.min(Math.max(2, span * .012), span / total * .22);
    return { width: span, pieceWidth: (span - gap * (total - 1)) / total, gap, thickness, readoutOffset: thickness + 16 };
};

/** Shared crown geometry and feedback; each mode chooses which resources to show. */
export default function TokenResourceCrown({ stats, resourceKey = 'vida', label = 'Vida', position = 'bottom', showReadout = true, className = '', children, width = 50, height = 50, cellSize = null, zoom = 1, isSelected = false, isCircular = true, rotation = 0, name = '', healingEffect = null, damageEffect = null, smokeVeil = 0, poisoned = false }) {
    const maximum = Math.max(0, Math.floor(Number(stats?.[resourceKey]?.max) || 0));
    const authoritativeLife = Math.max(0, Math.min(maximum, Math.floor(Number(stats?.[resourceKey]?.current) || 0)));
    const temporaryMaximum = resourceKey === 'vida' ? Math.max(0, Number(stats?.vidaTemporal?.max) || 0) : 0;
    const temporaryCurrent = Math.max(0, Number(stats?.vidaTemporal?.current) || 0);
    const green = resourceKey === 'postura' || resourceKey === 'hambre';
    const reducedMotion = useReducedMotion();
    const [, advanceDamage] = useState(0);
    const damageRevealAt = Number(damageEffect?.revealAt) || Number(damageEffect?.deadlineAt) || 0;
    const normalLifeRevealAt = Number(damageEffect?.normalLifeRevealAt) || damageRevealAt;
    useEffect(() => {
        if (reducedMotion) return undefined;
        const timers = [...new Set([damageRevealAt, normalLifeRevealAt])].filter(at => at > Date.now())
            .map(at => setTimeout(() => advanceDamage(value => value + 1), at - Date.now() + 1));
        return () => timers.forEach(clearTimeout);
    }, [damageEffect?.id, damageRevealAt, normalLifeRevealAt, reducedMotion]);
    const pendingHealing = (healingEffect?.sequence || (healingEffect ? [healingEffect] : []))
        .find(effect => Date.now() < getCanvasHealingPresentationStart(effect) + CANVAS_HEALING_REVEAL_AT);
    const timeline = useCanvasHealingTimeline({ id: pendingHealing?.id, startedAt: getCanvasHealingPresentationStart(pendingHealing),
        active: Boolean(pendingHealing), reducedMotion });
    // A later damage/edit wins over the cosmetic delay; never restore obsolete Life.
    const waitingForHealing = pendingHealing && !timeline.revealed
        && authoritativeLife === Number(healingEffect.nextLife);
    const waitingForDamage = !reducedMotion && damageEffect
        && authoritativeLife === Number(damageEffect.nextLife) && Date.now() < damageRevealAt;
    const waitingForVitality = pendingHealing?.effect === 'temporary-life' && !timeline.revealed
        && temporaryCurrent === pendingHealing.nextTemporaryLife;
    const shownTemporary = waitingForDamage && damageEffect?.previousTemporaryLife != null ? damageEffect.previousTemporaryLife
        : waitingForVitality ? pendingHealing.previousTemporaryLife : temporaryCurrent;
    const waitingForNormalDamage = !reducedMotion && damageEffect
        && authoritativeLife === Number(damageEffect.nextLife) && Date.now() < normalLifeRevealAt;
    const current = waitingForNormalDamage
        ? Math.max(0, Math.min(maximum, Math.floor(Number(damageEffect.previousLife) || 0)))
        : waitingForHealing
            ? Math.max(0, Math.min(maximum, Math.floor(Number(pendingHealing.previousLife) || 0))) : authoritativeLife;
    const previous = useRef(current);
    const [change, setChange] = useState(null);
    const gradientId = `token-life-${useId().replace(/:/g, '')}`;
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    const curved = isCircular && maximum <= 24;
    const geometry = useMemo(() => getTokenResourceCrownGeometry({ width, height, cellSize, zoom, maximum: maximum + temporaryMaximum }), [width, height, cellSize, zoom, maximum, temporaryMaximum]);
    const ribbon = getTokenResourceRibbonGeometry({ width, height, cellSize, zoom, maximum: maximum + temporaryMaximum });
    // Match the centre of the selection outline (-4px inset, 2px stroke) on both edges.
    const ribbonAngle = Number(rotation || 0) * Math.PI / 180;
    const ribbonEdge = (position === 'top' ? -1 : 1) * (Number(height) / 2 + 3);
    const rectangularRibbonStyle = {
        width: ribbon.width / safeZoom,
        left: Number(width) / 2 - ribbonEdge * Math.sin(ribbonAngle),
        top: Number(height) / 2 + ribbonEdge * Math.cos(ribbonAngle),
        transform: `translate(-50%, -50%) rotate(${Number(rotation || 0)}deg)`,
    };
    const previousTemporary = useRef(shownTemporary);
    const [temporaryChange, setTemporaryChange] = useState(null);
    useEffect(() => {
        const from = previousTemporary.current;
        previousTemporary.current = shownTemporary;
        if (from === shownTemporary) return undefined;
        setTemporaryChange({ from, to: shownTemporary, direction: shownTemporary > from ? 'heal' : 'damage' });
        const timer = setTimeout(() => setTemporaryChange(null), 2300);
        return () => clearTimeout(timer);
    }, [shownTemporary]);

    useEffect(() => {
        const from = previous.current;
        previous.current = current;
        if (from === current) return undefined;
        setChange({ from, to: current, direction: current > from ? 'heal' : 'damage' });
        const timer = setTimeout(() => setChange(null), 2300);
        return () => clearTimeout(timer);
    }, [current]);

    if (!maximum) return null;
    const changed = index => {
        const feedback = index >= maximum ? temporaryChange : change;
        const block = index >= maximum ? index - maximum : index;
        return feedback && block >= Math.min(feedback.from, feedback.to) && block < Math.max(feedback.from, feedback.to)
            ? feedback.direction : undefined;
    };
    const smokeDepth = Number(smokeVeil) >= 0.5 ? 'dense' : Number(smokeVeil) > 0 ? 'soft' : 'none';
    return <div className={`noma-token-life${className ? ` ${className}` : ''}`} data-selected={isSelected} data-depleted={current === 0} data-resource={resourceKey} data-position={position}
        data-poisoned={poisoned} data-smoke-veil={smokeDepth} data-life-changing={Boolean(change)}
        aria-label={`${name ? `${name} · ` : ''}${label}: ${current} de ${maximum}`}
        style={{ transform: `rotate(${-Number(rotation || 0)}deg)`, '--token-ui-scale': 1 / safeZoom,
            '--token-life-damage-duration': `${Math.max(350, (Number(damageEffect?.previewDurationMs) || 1450) * .45)}ms` }}>
        <div className={`noma-token-life-crown${curved ? ' noma-token-life-crown--arc' : ''}`} style={curved ? {
            width: geometry.width / safeZoom, height: geometry.height / safeZoom, top: Number(height) / 2,
            '--token-life-stroke': `${geometry.pieceWidth}px`, '--token-life-socket-stroke': `${geometry.socketWidth}px`,
        } : !isCircular ? rectangularRibbonStyle : { width: ribbon.width / safeZoom,
            ...(position === 'top' ? { bottom: Number(height) + 8 / safeZoom } : { top: Number(height) + 8 / safeZoom }) }}>
            {curved ? <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="noma-token-life-arc" aria-hidden="true">
                <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={green ? '#b2e2bb' : poisoned ? "#d0dfa2" : "#f3c1c2"} /><stop offset="1" stopColor={green ? '#56a879' : poisoned ? "#819c4e" : "#c97c8a"} />
                </linearGradient></defs>
                {Array.from({ length: maximum + temporaryMaximum }, (_, index) => <g key={index} data-life-block="" data-filled={index < maximum ? index < current : index - maximum < shownTemporary} data-temporary={index >= maximum || undefined}
                    data-change={changed(index)}>
                    <path d={geometry.paths[index]} className="noma-token-life-socket" />
                    <path d={geometry.paths[index]} className="noma-token-life-piece"
                        stroke={index >= maximum ? (index - maximum < shownTemporary ? '#dfc885' : '#35333d') : index < current ? `url(#${gradientId})` : '#35333d'} />
                </g>)}
            </svg> : <div className="noma-token-life-ribbon" aria-hidden="true" style={{ gap: ribbon.gap / safeZoom }}>
                {Array.from({ length: maximum + temporaryMaximum }, (_, index) => <i key={index} data-life-block="" data-filled={index < maximum ? index < current : index - maximum < shownTemporary} data-temporary={index >= maximum || undefined}
                    data-change={changed(index)} style={{ width: ribbon.pieceWidth / safeZoom, height: ribbon.thickness / safeZoom }} />)}
            </div>}
        </div>
        {showReadout && <TokenReadout name={name} height={height} zoom={safeZoom} offset={curved ? geometry.readoutOffset : ribbon.readoutOffset}>
            <span className="noma-token-life-count" aria-label={`${label}: ${current} de ${maximum}`}><strong>{current}</strong><span>/ {maximum}</span></span>
            {temporaryMaximum > 0 && <span className="noma-token-life-count noma-token-life-temporary" aria-label={`Vida temporal: ${shownTemporary}`}><strong>+{shownTemporary}</strong></span>}
            {children}
        </TokenReadout>}
    </div>;
}
