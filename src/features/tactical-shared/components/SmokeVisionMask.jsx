import React from 'react';

// Preserve the radial field of vision, but dim the exterior as an orientation
// aid while every observer is in smoke. Shared interiors stay clear.
export default function SmokeVisionMask({ perspective, bounds }) {
    if (!perspective) return null;
    const dimExterior = !perspective.bypass && !perspective.outsideVisible && perspective.visibleAreas.size > 0;
    return <g data-smoke-vision-mask={perspective.bypass ? 'bypass' : 'true'}>
        {/* Keep the same rectangle mounted so entry, exit and reversals blend. */}
        {bounds && (
            <rect {...bounds} fill="white" fillOpacity={dimExterior ? 0.5 : 0}
                className="canvas-smoke-memory-veil" data-smoke-memory-veil="true" />
        )}
        {perspective.areas.filter(area => perspective.bypass || perspective.visibleAreas.has(area)).map(area => (
            <rect key={area.id} x={area.x} y={area.y} width={area.width} height={area.height}
                fill="black" data-smoke-interior={area.id} />
        ))}
    </g>;
}
