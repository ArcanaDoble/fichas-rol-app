import React from 'react';
import './CanvasTokenName.css';

export const TokenReadout = ({ name, width = 50, height, zoom, offset, isCircular = true, rotation = 0, hasResizeHandle = false, children }) => {
    const angle = Number(rotation || 0) * Math.PI / 180;
    const sine = Math.sin(angle), cosine = Math.cos(angle);
    const w = Number(width), h = Number(height), originalBottom = h * zoom / 2;
    const bodyBottom = (isCircular ? Math.hypot(w * sine, h * cosine)
        : Math.abs(w * sine) + Math.abs(h * cosine)) * zoom / 2;
    const bodyClearance = Math.max(0, bodyBottom - originalBottom);
    // The resize square rotates with the token; the readout remains upright.
    const resizeBottom = inset => ((w / 2 + inset) * sine + (h / 2 + inset) * cosine
        + 6 * (Math.abs(sine) + Math.abs(cosine))) * zoom;
    return <div className="noma-token-life-readout" data-resize-handle={hasResizeHandle}
        style={{ top: h + offset / zoom,
            '--token-readout-body-clearance': `${bodyClearance}px`,
            '--token-readout-desktop-clearance': `${Math.max(bodyClearance, resizeBottom(-2) + 8 - originalBottom - offset)}px`,
            '--token-readout-touch-clearance': `${Math.max(bodyClearance, resizeBottom(6) + 8 - originalBottom - offset)}px`,
            transform: `translateX(-50%) scale(${1 / zoom}) translateY(var(--token-readout-clearance, 0px))` }}>
        {(name || children) && <span className="noma-token-life-details">
            {name && <span className="noma-token-life-name">{name}</span>}
            {children}
        </span>}
    </div>;
};

/** Passive inspection reuses the name treatment without receiving any private resources. */
export function CanvasTokenName({ name = '', width = 50, height = 50, zoom = 1, isSelected = false, isCircular = true, rotation = 0, hasResizeHandle = false }) {
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    if (!name) return null;
    return <div className="noma-token-life noma-token-name-only" data-selected={isSelected} aria-label={name}
        style={{ transform: `rotate(${-Number(rotation || 0)}deg)` }}>
        <TokenReadout name={name} width={width} height={height} zoom={safeZoom} offset={isCircular ? 10 : 12}
            isCircular={isCircular} rotation={rotation} hasResizeHandle={hasResizeHandle} />
    </div>;
}
