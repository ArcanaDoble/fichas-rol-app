import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useArcaneBarrierPresentation } from '../../../src/features/tactical-shared/useArcaneBarrierPresentation';
import './BarrierMarkerAlternatives.css';

// Review-only compositions. None of these replaces the production token marker.
export const BARRIER_MARKER_OPTIONS = [
    { id: 'states', title: 'Entre los estados', description: 'Un escudo con +1 en la columna de marcadores.' },
    { id: 'crest', title: 'En el retrato', description: 'Un pequeño blasón que se apoya sobre el aro.' },
    { id: 'name', title: 'Unido al nombre', description: 'El escudo abre el rótulo; la cifra queda dentro.' },
];

function ShieldGlyph({ variant }) {
    if (variant === 'states') return <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 5 25 8v8c0 5-4.5 9-9 12-4.5-3-9-7-9-12V8Z" fill="#141720" stroke="#dfc885" strokeWidth="1.5" />
        <text x="16" y="20" textAnchor="middle">+1</text>
    </svg>;
    return <svg viewBox="0 0 40 46" aria-hidden="true">
        <path d="m3 6 17-4 17 4v17c0 9-8 16-17 21C11 39 3 32 3 23Z" fill="#11141e" stroke="#d7bc7c" strokeWidth="1.5" />
        <path d="m6 9 14-3 14 3v14c0 7-6.5 13-14 18C12.5 36 6 30 6 23Z" fill="#20212a" stroke="#8b7549" strokeWidth=".7" />
        <path d="m7 10 13-3 13 3M20 32v6" fill="none" stroke="#e5d29f" strokeWidth=".8" />
        <text x="20" y="27" textAnchor="middle">+1</text>
    </svg>;
}

export function BarrierMarkerPreviewToken({ item, zoom, variant, presentation, renderToken }) {
    const ref = useRef(null);
    const [host, setHost] = useState(null);
    const { visible } = useArcaneBarrierPresentation(item, presentation);
    const safeZoom = Math.max(.05, zoom);
    const angle = Number(item.rotation || 0) * Math.PI / 180;
    const w = item.width * safeZoom, h = item.height * safeZoom;
    const screenWidth = item.isCircular !== false ? Math.hypot(w * Math.cos(angle), h * Math.sin(angle))
        : Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
    const size = Math.min(40, Math.max(26, 23 + Math.min(w, h) * .045));
    const step = size + 5;
    const radiusX = screenWidth / 2 + size / 2 + 5;
    const radiusY = Math.max(h / 2 + size / 2 + 5, step + size);
    const outsideX = -radiusX * Math.sqrt(1 - (step / radiusY) ** 2);

    useLayoutEffect(() => {
        const root = ref.current;
        setHost(root?.querySelector(variant === 'name' ? '.noma-token-life-readout'
            : variant === 'states' ? '.noma-token-statuses' : `[id="token-inner-wrapper-${item.id}"]`) || null);
    }, [item.id, variant, visible]);

    const style = variant === 'states' ? { left: outsideX, top: step, width: size, height: size }
        : variant === 'crest' ? { left: '100%', top: '50%',
            transform: `translate(-50%, -50%) rotate(${-Number(item.rotation || 0)}deg) scale(${1 / safeZoom})` }
            : undefined;
    return <div ref={ref} className="barrier-marker-preview-token" data-variant={variant}
        style={{ '--marker-state-step': `${step}px`, '--marker-state-outside-x': `${outsideX}px`,
            '--marker-state-center-x': `${-radiusX}px` }}>
        {renderToken(item)}
        {visible && host && createPortal(<span className={`barrier-marker-concept barrier-marker-concept--${variant}`}
            style={style} role="img" aria-label="Barrera rúnica: +1 CD hasta el final del combate"
            title="Barrera rúnica · +1 CD">
            <ShieldGlyph variant={variant} />
        </span>, host)}
    </div>;
}

export function BarrierMarkerReviewControls({ chosen, onChoose, selected, onToggleSelection, onImpact }) {
    return <div className="barrier-marker-review-controls">
        <div className="barrier-marker-review-options" role="group" aria-label="Representaciones de Barrera">
            {BARRIER_MARKER_OPTIONS.map(option => <button key={option.id} type="button"
                aria-pressed={chosen === option.id} onClick={() => onChoose(option.id)}>
                {option.title}
            </button>)}
        </div>
        <div className="barrier-marker-review-actions">
            <button type="button" onClick={onToggleSelection}>{selected ? 'Quitar selección' : 'Seleccionar tokens'}</button>
            <button type="button" onClick={onImpact}>Probar impacto</button>
        </div>
    </div>;
}
