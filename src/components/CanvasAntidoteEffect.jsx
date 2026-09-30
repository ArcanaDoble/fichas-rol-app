import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { FlaskConical, Bandage } from 'lucide-react';
import { isImagePreloaded, preloadImage } from './LoadingImage';
import './CanvasAntidoteEffect.css';
import { getTokenSilhouetteStyle } from '../features/tactical-shared/tokenSilhouette';
import { getTokenResourceRibbonGeometry } from '../features/tactical-shared/components/TokenResourceCrown';

// Coordinates are in board space; strokes and the caption remain readable at any zoom.
export default function CanvasAntidoteEffect({ effect, targetPos, sourcePos, zoom = 1 }) {
    const haste = effect.effect === 'haste';
    const vitality = effect.effect === 'temporary-life';
    const bandage = effect.effect === 'remove-bleeding';
    const title = bandage ? 'Vendaje' : haste ? 'Presteza' : vitality ? 'Vitalidad' : 'Antídoto';
    const message = bandage ? 'Sangrado detenido' : haste ? '+4 casillas · +1 Movimiento' : vitality ? '+2 Vida temporal' : 'Veneno eliminado';
    const ItemIcon = bandage ? Bandage : FlaskConical;
    const reducedMotion = useReducedMotion();
    const [, tick] = useState(0);
    const [imageReady, setImageReady] = useState(() => isImagePreloaded(effect.itemImage));
    useEffect(() => {
        let active = true;
        setImageReady(isImagePreloaded(effect.itemImage));
        preloadImage(effect.itemImage).then(ready => { if (active) setImageReady(ready); });
        return () => { active = false; };
    }, [effect.itemImage]);
    const [initialElapsed] = useState(() => Math.max(0, Date.now() - Number(effect.presentationStartedAt || effect.startedAt || Date.now())));
    const [fallbackStart] = useState(Date.now);
    const startedAt = Number(effect.presentationStartedAt || effect.startedAt) || fallbackStart;
    useEffect(() => {
        if (reducedMotion || !targetPos) return undefined;
        let frame;
        const update = () => {
            tick(value => value + 1);
            if (Date.now() - startedAt < 3200) frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [startedAt, reducedMotion, targetPos]);
    if (!targetPos) return null;
    const scale = 1 / Math.max(0.1, zoom);
    const x = targetPos.x + targetPos.width / 2;
    const y = targetPos.y + targetPos.height / 2;
    const radius = Math.max(targetPos.width, targetPos.height) / 2;
    const shared = sourcePos && effect.actorId !== effect.targetId;
    const sx = shared ? sourcePos.x + sourcePos.width / 2 : x;
    const sy = shared ? sourcePos.y + sourcePos.height / 2 : y;
    const elapsed = Math.max(0, Date.now() - Number(effect.presentationStartedAt || effect.startedAt));
    if (elapsed >= 3200) return null;
    const cx = (sx + x) / 2;
    const cy = Math.min(sy, y) - Math.max(radius, 25 * scale);
    const progress = reducedMotion ? 1 : Math.min(1, elapsed / 1050);
    const u = 1 - progress;
    const bx = shared ? u * u * sx + 2 * u * progress * cx + progress * progress * x : x;
    const by = shared ? u * u * sy + 2 * u * progress * cy + progress * progress * y : y;
    const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    const shake = !reducedMotion && elapsed > 1050 && elapsed < 1650 ? Math.sin(elapsed / 42) * 7 : 0;
    return <div className="noma-antidote-effect" data-effect={effect.effect} role="status" aria-label={message}
        style={{ '--antidote-elapsed': `${-initialElapsed}ms` }}>
        <svg className="noma-antidote-effect__canvas" overflow="visible" aria-hidden="true">
            {shared && <g className="noma-antidote-effect__connection">
                <path className="noma-antidote-effect__guide" d={`M ${sx} ${sy} Q ${cx} ${cy} ${x} ${y}`}
                    fill="none" strokeWidth={4 * scale} />
                <path className="noma-antidote-effect__trail" pathLength="1"
                    d={`M ${sx} ${sy} Q ${cx} ${cy} ${x} ${y}`}
                    style={{ strokeDashoffset: 1 - progress }} fill="none" strokeWidth={3 * scale} strokeLinecap="round" />
                <path className="noma-antidote-effect__arrow" d="M -12 -7 L 0 0 L -12 7"
                    transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
                    fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={progress} />
            </g>}
            {targetPos.isCircular !== false && <circle className="noma-antidote-effect__pulse" cx={x} cy={y} r={radius + 3 * scale}
                fill="none" strokeWidth={3 * scale} style={{ transformOrigin: `${x}px ${y}px` }} />}
            {[0, 1, 2, 3, 4, 5].map(index => {
                const angle = index * Math.PI / 3;
                return <circle key={index} className="noma-antidote-effect__mote"
                    cx={x + Math.cos(angle) * radius} cy={y + Math.sin(angle) * radius}
                    r={2 * scale} style={{ '--mote-rise': `${-18 * scale}px` }} />;
            })}
        </svg>
        {targetPos.isCircular === false && <div className="noma-antidote-effect__silhouette" aria-hidden="true" style={{
            left: targetPos.x, top: targetPos.y, width: targetPos.width, height: targetPos.height,
            transform: `rotate(${targetPos.rotation || 0}deg)`, ...getTokenSilhouetteStyle(targetPos.img, false),
        }}><span /></div>}
        <div className="noma-antidote-effect__bottle-position" style={{ left: bx, top: by,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${shake}deg)` }}>
            <div className="noma-antidote-effect__bottle">
                {effect.itemImage && <img src={effect.itemImage} alt="" draggable={false}
                    onLoad={() => setImageReady(true)} onError={() => setImageReady(false)}
                    style={{ display: imageReady ? undefined : 'none' }} />}
                {!imageReady && <ItemIcon aria-hidden="true" />}
                <strong>{title}</strong>
            </div>
        </div>
        <span className="noma-antidote-effect__label" style={{ left: x, top: targetPos.isCircular === false
            ? targetPos.y + targetPos.height + (getTokenResourceRibbonGeometry({ ...targetPos, zoom }).readoutOffset + 34) * scale
            : y + radius + 40 * scale,
            transformOrigin: 'top center', transform: `translateX(-50%) scale(${scale})` }}>{message}</span>
    </div>;
}
