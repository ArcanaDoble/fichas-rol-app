import React, { memo, useEffect, useState } from 'react';
import { CALTROPS_TEXTURE_SPAN, getCaltropsClipPath, getCaltropsOffset, loadCaltropsTexture } from '../caltropsTexture';
import { CALTROPS_HAZARD_ART } from '../geometry';
import { DEFAULT_GRID_CONFIG } from '../grid';

export const CaltropsHazardVisual = memo(function CaltropsHazardVisual({ itemId, width, height, cellWidth, cellHeight }) {
    const [texture, setTexture] = useState(null);

    useEffect(() => {
        let mounted = true;
        loadCaltropsTexture().then(
            url => { if (mounted) setTexture(url); },
            () => { if (mounted) setTexture(CALTROPS_HAZARD_ART.image); },
        );
        return () => { mounted = false; };
    }, []);

    const cellSize = Math.min(
        Number(cellWidth) || DEFAULT_GRID_CONFIG.cellWidth,
        Number(cellHeight) || DEFAULT_GRID_CONFIG.cellHeight,
    );
    const seamless = Boolean(texture && texture !== CALTROPS_HAZARD_ART.image);
    const span = cellSize * (seamless ? CALTROPS_TEXTURE_SPAN : 1);
    const offset = seamless ? getCaltropsOffset(itemId, span) : null;

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            data-hazard-art={CALTROPS_HAZARD_ART.id}
            aria-hidden="true"
            style={{
                backgroundImage: texture ? `url("${texture}")` : undefined,
                backgroundSize: `${span}px ${span}px`,
                backgroundPosition: offset ? `${offset.x}px ${offset.y}px` : undefined,
                clipPath: offset ? getCaltropsClipPath({ width: Number(width), height: Number(height), span, offset }) : undefined,
            }}
        />
    );
});
