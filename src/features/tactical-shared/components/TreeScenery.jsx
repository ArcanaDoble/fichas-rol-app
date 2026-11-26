import React from 'react';
import { getTreeAsset, getTreeLocalPolygon } from '../scenery';
import './TreeScenery.css';

export const TreeSceneryVisual = ({ item, showContour = false, zoom = 1, opacity = 1, surfaceOverlay = false }) => (
    <div className="noma-tree-visual" data-tree-scenery={item.id}>
        <img src={getTreeAsset(item)?.image || item.img} alt={item.name || 'Árbol'} draggable={false}
            className={surfaceOverlay ? undefined : 'noma-tree-foliage'} data-tree-occupied={opacity < 1}
            style={{ opacity: surfaceOverlay ? 0 : opacity }} />
        {showContour && <svg width="100%" height="100%" viewBox={`0 0 ${item.width} ${item.height}`}
            className="noma-tree-contour" aria-label="Contorno de bloqueo de visión">
            <polygon points={getTreeLocalPolygon(item).map(point => `${point.x},${point.y}`).join(' ')}
                fill="none" stroke="#e5c786" strokeWidth={1.5 / zoom} strokeDasharray={`${5 / zoom} ${4 / zoom}`} />
            {item.treeVisionMode !== 'trunk' && <polygon
                points={getTreeLocalPolygon(item, 'trunk').map(point => `${point.x},${point.y}`).join(' ')}
                fill="rgba(200,170,110,.12)" stroke="#c8aa6e" strokeWidth={1 / zoom} />}
        </svg>}
    </div>
);
