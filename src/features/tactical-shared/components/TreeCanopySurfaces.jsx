import React, { useMemo } from 'react';
import { getTreeAsset, getTreeLocalPolygon, isTreeScenery } from '../scenery';
import SmokeOcclusion from './SmokeOcclusion';
import { getCanvasShadowPoints, getCanvasTreeView, getCanvasVisionBlockingSegments, TREE_OCCUPIED_OPACITY } from '../canvasVision';

// Redraw only the tree's pixels over the fog. Its own occluder must hide the
// ground and actors behind it without turning the tree into an empty black hole.
// Other walls, other trees, smoke and the observer's range still clip this surface.
export const TreeCanopySurfaces = ({ items, gridConfig, isPlayerView, playerName,
    selectedTokenIds, bounds, smokePerspective, zoom = 1 }) => {
    const trees = useMemo(() => items.filter(isTreeScenery), [items]);
    if (!trees.length || (!gridConfig.fogOfWar && !gridConfig.ambientDarkness)) return null;
    const { observers, masterOverview, visibleActors, fadedTreeIds } = getCanvasTreeView(items, {
        gridConfig, isPlayerView, playerName, selectedTokenIds,
    });

    return <g aria-hidden="true" data-tree-surfaces="true">
        {trees.filter(tree => masterOverview || !gridConfig.fogOfWar || observers.some(source => (
            Math.hypot(tree.x + tree.width / 2 - source.x - source.width / 2,
                tree.y + tree.height / 2 - source.y - source.height / 2)
                <= (Number(source.visionRadius) || 300) + Math.hypot(tree.width, tree.height) / 2
        ))).map(tree => {
            const id = `tree-surface-${tree.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
            const image = <image href={getTreeAsset(tree)?.image || tree.img} x={tree.x} y={tree.y}
                width={tree.width} height={tree.height} preserveAspectRatio="xMidYMid meet"
                transform={`rotate(${tree.rotation || 0} ${tree.x + tree.width / 2} ${tree.y + tree.height / 2})`} />;
            const surface = <g mask={`url(#${id}-actors)`}>
                {image}
                {gridConfig.ambientDarkness > 0 && <g mask={`url(#${id}-alpha)`}>
                    <rect {...bounds} fill="black" opacity={gridConfig.ambientDarkness} mask="url(#lighting-mask)" />
                </g>}
            </g>;
            return <g key={tree.id}>
                <defs>
                    <mask id={`${id}-alpha`} maskUnits="userSpaceOnUse" {...bounds} style={{ maskType: 'alpha' }}>{image}</mask>
                    <mask id={`${id}-actors`} maskUnits="userSpaceOnUse" {...bounds}>
                        <rect {...bounds} fill="white" />
                        {visibleActors.map(actor => actor.isCircular
                            ? <ellipse key={actor.id} data-tree-visible-actor={actor.id} cx={actor.x + actor.width / 2}
                                cy={actor.y + actor.height / 2} rx={actor.width / 2 + 3 / zoom} ry={actor.height / 2 + 3 / zoom} fill="black" />
                            : <rect key={actor.id} data-tree-visible-actor={actor.id} x={actor.x - 3 / zoom} y={actor.y - 3 / zoom}
                                width={actor.width + 6 / zoom} height={actor.height + 6 / zoom} fill="black" />)}
                    </mask>
                    {gridConfig.fogOfWar && !masterOverview && <>
                        {observers.map(source => {
                            const x = source.x + source.width / 2, y = source.y + source.height / 2;
                            const segments = getCanvasVisionBlockingSegments(items, { excludeTreeId: tree.id, observer: source, gridConfig });
                            return <React.Fragment key={source.id}><mask id={`${id}-${source.id}`} maskUnits="userSpaceOnUse" {...bounds}>
                                <rect {...bounds} fill="white" />
                                <SmokeOcclusion source={source} x={x} y={y} items={items} perspective={smokePerspective}
                                    bounds={bounds} maskId={`${id}-smoke-${source.id}`} />
                                {segments.map(segment => <polygon key={segment.id} fill="black"
                                    points={getCanvasShadowPoints({ x, y }, segment)} />)}
                            </mask><clipPath id={`${id}-range-${source.id}`} clipPathUnits="userSpaceOnUse">
                                <circle cx={x} cy={y} r={Number(source.visionRadius) || 300} />
                            </clipPath></React.Fragment>;
                        })}
                    </>}
                </defs>
                {/* Apply each sight mask directly: nested luminance masks can
                    discard wall cutouts in Chromium when merged into a mask. */}
                <g className="noma-tree-foliage" data-tree-occupied={fadedTreeIds.has(tree.id)}
                    opacity={fadedTreeIds.has(tree.id) ? TREE_OCCUPIED_OPACITY : 1} data-tree-canopy-opacity={tree.id}>
                    {gridConfig.fogOfWar && !masterOverview ? observers.map(source => (
                        <g key={source.id} clipPath={`url(#${id}-range-${source.id})`}>
                            <g mask={`url(#${id}-${source.id})`}>{surface}</g>
                        </g>
                    )) : surface}
                </g>
                {!isPlayerView && selectedTokenIds.includes(tree.id) && <polygon
                    points={getTreeLocalPolygon(tree).map(p => `${p.x + tree.x},${p.y + tree.y}`).join(' ')}
                    transform={`rotate(${tree.rotation || 0} ${tree.x + tree.width / 2} ${tree.y + tree.height / 2})`}
                    fill="none" stroke="#e5c786" strokeWidth={1.5 / zoom} strokeDasharray={`${5 / zoom} ${4 / zoom}`} />}
            </g>;
        })}
    </g>;
};
