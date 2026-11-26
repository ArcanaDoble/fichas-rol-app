import React from 'react';
import { Sparkles } from 'lucide-react';
import { getCanvasShadowPoints, getCanvasTokenVisionBlockers, getCanvasVisionBlockingSegments, getCanvasVisionObservers } from '../canvasVision';
import { getCanvasTokenFogDensity, isCanvasTokenHiddenFromViewer } from '../tokenVisibilityAccess';
import SmokeOcclusion from './SmokeOcclusion';

// Recover only the creature's art in its own shadow, never the floor or
// another actor. Other walls, other creatures, smoke and range still cut it.
export const TokenVisionSurfaces = ({ items, gridConfig, isPlayerView, playerName, selectedTokenIds,
    showHiddenTokens, bounds, smokePerspective, draggedTokenId, pendingTokenId, shadowInteraction }) => {
    if (!gridConfig.fogOfWar) return null;
    const blockers = getCanvasTokenVisionBlockers(items, gridConfig);
    if (!blockers.length) return null;
    const viewer = { isPlayerView, playerName, selectedTokenIds, showHiddenTokens };
    const { observers, masterOverview } = getCanvasVisionObservers(items, viewer);
    if (masterOverview || !observers.length) return null;

    return <g aria-hidden="true" data-token-vision-surfaces="true">
        {blockers.map(({ token, placement: { x, y }, segments }) => {
            if (!segments.length || token.id === draggedTokenId || token.id === pendingTokenId
                || isCanvasTokenHiddenFromViewer(token, items, viewer)
                || getCanvasTokenFogDensity(token, items, viewer) >= 0.65) return null;
            const width = Number(token.width), height = Number(token.height);
            const cx = x + width / 2, cy = y + height / 2;
            const id = `token-vision-surface-${token.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
            const size = Math.min(width, height) * 0.42;
            const art = <g transform={`rotate(${Number(token.rotation) || 0} ${cx} ${cy})`}
                clipPath={token.isCircular ? `url(#${id}-circle)` : undefined}>
                {token.img ? <image href={token.img} x={x} y={y} width={width} height={height}
                    preserveAspectRatio={token.isCircular && token.tokenImageFit !== 'contain' ? 'xMidYMid slice' : 'xMidYMid meet'} />
                    : <><rect x={x} y={y} width={width} height={height} fill="#151f30" />
                        <Sparkles x={cx - size / 2} y={cy - size / 2} width={size} height={size} color="#c8aa6e" /></>}
            </g>;
            const viewers = observers.filter(source => source.id !== token.id && Math.hypot(cx - source.x - source.width / 2,
                cy - source.y - source.height / 2) < (Number(source.visionRadius) || 300) + Math.hypot(width, height) / 2);
            if (!viewers.length) return null;
            return <g key={token.id} data-token-vision-surface={token.id}>
                <defs>
                    {token.isCircular && <clipPath id={`${id}-circle`} clipPathUnits="userSpaceOnUse">
                        <ellipse cx={cx} cy={cy} rx={width / 2} ry={height / 2} />
                    </clipPath>}
                    {gridConfig.ambientDarkness > 0 && <mask id={`${id}-alpha`} maskUnits="userSpaceOnUse" {...bounds} style={{ maskType: 'alpha' }}>{art}</mask>}
                </defs>
                {viewers.map((source, index) => {
                    const suffix = `${id}-${index}`;
                    const origin = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
                    const others = getCanvasVisionBlockingSegments(items, { observer: source, gridConfig, excludeTokenId: token.id });
                    return <React.Fragment key={source.id}>
                        <defs>
                            <clipPath id={`${suffix}-range`} clipPathUnits="userSpaceOnUse">
                                <circle cx={origin.x} cy={origin.y} r={Number(source.visionRadius) || 300} />
                            </clipPath>
                            <mask id={`${suffix}-visible`} maskUnits="userSpaceOnUse" {...bounds}>
                                <rect {...bounds} fill="white" />
                                <SmokeOcclusion source={source} {...origin} items={items} perspective={smokePerspective}
                                    bounds={bounds} maskId={`${suffix}-smoke`} />
                                {others.map(wall => <polygon key={wall.id} fill="black"
                                    points={getCanvasShadowPoints(origin, wall, shadowInteraction, selectedTokenIds)} />)}
                            </mask>
                            <mask id={`${suffix}-shadow`} maskUnits="userSpaceOnUse" {...bounds}>
                                {segments.map(wall => <polygon key={wall.id} fill="white" points={getCanvasShadowPoints(origin, wall)} />)}
                            </mask>
                        </defs>
                        <g clipPath={`url(#${suffix}-range)`} mask={`url(#${suffix}-visible)`}>
                            <g mask={`url(#${suffix}-shadow)`}>
                                {art}
                                {gridConfig.ambientDarkness > 0 && <g mask={`url(#${id}-alpha)`}>
                                    <rect {...bounds} fill="black" opacity={gridConfig.ambientDarkness} mask="url(#lighting-mask)" />
                                </g>}
                            </g>
                        </g>
                    </React.Fragment>;
                })}
            </g>;
        })}
    </g>;
};
