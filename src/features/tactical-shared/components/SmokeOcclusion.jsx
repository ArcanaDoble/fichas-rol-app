import React from 'react';
import { calculateShadowPoints } from '../spatial';
import { isTokenFullyInsideSmokeArea } from '../tokenVisibilityAccess';

// The cloud's surface is visible, its projected shadow is not. Keep this mask
// separate from walls: cutting holes here must never reveal a cloud through a wall.
export default function SmokeOcclusion({ source, x, y, items, perspective, bounds, maskId }) {
    if (!perspective || perspective.bypass || !perspective.areas.length || isTokenFullyInsideSmokeArea(source, items)) return null;
    return <g data-smoke-occlusion={source.id}>
        <defs><mask id={maskId} maskUnits="userSpaceOnUse" {...bounds}>
            <rect {...bounds} fill="white" />
            {perspective.areas.map(area => <rect key={area.id} x={area.x} y={area.y} width={area.width} height={area.height} fill="black" />)}
        </mask></defs>
        <g mask={`url(#${maskId})`}>
            {perspective.areas.flatMap(area => {
                const left = Number(area.x), top = Number(area.y);
                const right = left + Number(area.width), bottom = top + Number(area.height);
                return [[left, top, right, top], [right, top, right, bottom], [right, bottom, left, bottom], [left, bottom, left, top]]
                    .map((edge, index) => <polygon key={`${area.id}-${index}`} points={calculateShadowPoints(x, y, ...edge)} fill="black" />);
            })}
        </g>
    </g>;
}
