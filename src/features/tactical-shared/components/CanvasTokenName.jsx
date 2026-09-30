import React from 'react';
import './CanvasTokenName.css';

export const TokenReadout = ({ name, height, zoom, offset, children }) => (
    <div className="noma-token-life-readout" style={{ top: Number(height) + offset / zoom,
        transform: `translateX(-50%) scale(${1 / zoom})` }}>
        {name && <span className="noma-token-life-name">{name}</span>}
        {children}
    </div>
);

/** Passive inspection reuses the name treatment without receiving any private resources. */
export function CanvasTokenName({ name = '', height = 50, zoom = 1, isSelected = false, isCircular = true, rotation = 0 }) {
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    if (!name) return null;
    return <div className="noma-token-life noma-token-name-only" data-selected={isSelected} aria-label={name}
        style={{ transform: `rotate(${-Number(rotation || 0)}deg)` }}>
        <TokenReadout name={name} height={height} zoom={safeZoom} offset={isCircular ? 10 : 12} />
    </div>;
}
