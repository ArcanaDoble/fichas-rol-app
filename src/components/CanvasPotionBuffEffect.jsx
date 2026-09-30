import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { subscribePotionField } from './potionBuffShader';
import './CanvasPotionBuffEffect.css';
import { getTokenSilhouetteStyle } from '../features/tactical-shared/tokenSilhouette';
import { getTokenResourceRibbonGeometry } from '../features/tactical-shared/components/TokenResourceCrown';

export default function CanvasPotionBuffEffect({ effect, targetPos, sourcePos, zoom = 1 }) {
    const ref = useRef(null);
    const reduced = useReducedMotion();
    const startedAt = Number(effect.presentationStartedAt || effect.startedAt);
    const vitality = effect.effect === 'temporary-life';
    const bandage = effect.effect === 'remove-bleeding';
    const [initialElapsed] = useState(() => Math.max(0, Date.now() - startedAt));
    const silhouette = targetPos?.isCircular === false && Boolean(targetPos?.img);
    useEffect(() => subscribePotionField(ref.current, { effect: effect.effect, startedAt, reduced, silhouette }), [effect.id, effect.effect, startedAt, reduced, silhouette]);
    if (!targetPos) return null;
    const scale = 1 / Math.max(.1, zoom);
    const width = Number(targetPos.width) || 50, height = Number(targetPos.height) || 50;
    const label = bandage ? 'Sangrado detenido' : vitality ? '+2 Vida temporal' : '+4 casillas · +1 Movimiento';
    const shared = bandage && sourcePos && effect.actorId !== effect.targetId;
    const tx = targetPos.x + width / 2, ty = targetPos.y + height / 2;
    const sx = shared ? sourcePos.x + sourcePos.width / 2 : tx;
    const sy = shared ? sourcePos.y + sourcePos.height / 2 : ty;
    const captionOffset = targetPos.isCircular === false
        ? getTokenResourceRibbonGeometry({ width, height, zoom, cellSize: targetPos.cellSize }).readoutOffset + 34 : 31;
    return <div className="noma-potion-buff" data-effect={effect.effect} style={{ '--potion-elapsed': `${-initialElapsed}ms` }} role="status" aria-label={label}>
        {shared && <svg className="noma-bandage-transfer" aria-hidden="true">
            <path d={`M ${sx} ${sy} Q ${(sx + tx) / 2} ${Math.min(sy, ty) - 35 * scale} ${tx} ${ty}`}
                pathLength="1" fill="none" stroke="#e5cfaa" strokeWidth={2.5 * scale} strokeLinecap="round" />
        </svg>}
        <div style={silhouette ? { position: 'absolute', left: targetPos.x, top: targetPos.y, width, height,
            transform: `rotate(${targetPos.rotation || 0}deg)`, ...getTokenSilhouetteStyle(targetPos.img, false) } : { display: 'contents' }}>
        <canvas ref={ref} className="noma-potion-buff-field" aria-hidden="true" style={{
            left: (silhouette ? 0 : targetPos.x) - width * .225, top: (silhouette ? 0 : targetPos.y) - height * .225, width: width * 1.45, height: height * 1.45,
        }} />
        </div>
        <div className="noma-potion-buff-caption" style={{ left: targetPos.x + width / 2, top: targetPos.y + height + captionOffset * scale,
            transform: `translateX(-50%) scale(${scale})`, color: bandage ? '#ead9b8' : vitality ? '#dfc885' : '#bdd5df' }}>
            <strong>{bandage ? 'Vendaje' : vitality ? 'Vitalidad' : 'Presteza'}</strong><span>{label}</span>
        </div>
    </div>;
}
