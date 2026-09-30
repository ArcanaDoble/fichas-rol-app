import React from 'react';
import { DEFAULT_STATUS_EFFECTS, ICON_MAP } from '../../../utils/statusEffects';
import './TokenStatusBadges.css';

export default function TokenStatusBadges({ statusIds, width, height, zoom = 1, rotation = 0, isCircular }) {
    const effects = statusIds.map(id => ({ id, ...DEFAULT_STATUS_EFFECTS[id] }));
    if (!effects.length) return null;

    const safeZoom = Math.max(0.05, Number(zoom) || 1);
    const angle = rotation * Math.PI / 180;
    const w = width * safeZoom;
    const h = height * safeZoom;
    // Circular badges follow the silhouette; rectangular ones sit on the selection border.
    const screenWidth = isCircular
        ? Math.hypot(w * Math.cos(angle), h * Math.sin(angle))
        : Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
    const screenHeight = isCircular
        ? Math.hypot(w * Math.sin(angle), h * Math.cos(angle))
        : Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
    const size = Math.min(40, Math.max(26, 23 + Math.min(w, h) * 0.045));
    const step = size + 5;
    const capacity = Math.max(2, Math.min(6, Math.floor((isCircular ? screenHeight : h) * 0.72 / step)));
    const overflow = effects.length > capacity;
    const shown = effects.slice(0, overflow ? capacity - 1 : capacity);
    const remaining = effects.slice(shown.length);
    const badges = overflow ? [...shown, {
        id: 'overflow', label: remaining.map(effect => effect.label).join(' · '),
        hex: '#c8aa6e', count: remaining.length,
    }] : shown;

    return (
        <div className="noma-token-statuses" role="group" aria-label="Estados"
            style={{ transform: `rotate(${-rotation}deg) scale(${1 / safeZoom})` }}>
            {badges.map((effect, index) => {
                const offset = (index - (badges.length - 1) / 2) * step;
                const radiusX = screenWidth / 2 + size / 2 + 5;
                const radiusY = Math.max(screenHeight / 2 + size / 2 + 5, Math.abs(offset) + size);
                // The outline is inset -4 with a 2px border: its centre lies 3 world units out.
                const edgeX = -w / 2 - 3 * safeZoom;
                const x = isCircular ? -radiusX * Math.sqrt(1 - (offset / radiusY) ** 2)
                    : edgeX * Math.cos(angle) - offset * Math.sin(angle);
                const y = isCircular ? offset : edgeX * Math.sin(angle) + offset * Math.cos(angle);
                const Icon = ICON_MAP[effect.iconName] || ICON_MAP.AlertCircle;
                return (
                    <span key={effect.id} className="noma-token-status" role="img"
                        aria-label={effect.count ? `${effect.count} estados más: ${effect.label}` : effect.label}
                        title={effect.label} data-status-id={effect.id}
                        style={{ '--status-color': effect.hex || '#c8aa6e', width: size, height: size,
                            left: x, top: y }}>
                        {effect.count ? <span className="noma-token-status__count">+{effect.count}</span>
                            : <Icon aria-hidden="true" size={size * 0.64} strokeWidth={2.1} />}
                    </span>
                );
            })}
        </div>
    );
}
