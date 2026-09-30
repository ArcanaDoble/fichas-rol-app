import React, { useRef } from 'react';
import { useTarTexture } from './TarGroundEffect';
import './TokenTarStain.css';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';

export default function TokenTarStain({ coverage = 0, isCircular = true, source }) {
    const ref = useRef(null);
    useTarTexture(ref, { portrait: true, active: coverage > 0, circular: isCircular });
    return <div className="canvas-token-tar" data-token-tar={coverage > 0 ? 'true' : 'false'}
        aria-hidden="true" style={{ borderRadius: isCircular ? '50%' : 0, opacity: coverage > 0 ? 0.45 + Math.min(1, coverage) * 0.55 : 0,
            ...(!isCircular ? { inset: 0, ...getTokenSilhouetteStyle(source, false) } : {}) }}>
        <canvas ref={ref} width={512} height={512} />
    </div>;
}
