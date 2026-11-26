import React, { useState } from 'react';
import { TREE_CATALOG } from '../../scenery';
import '../TreeScenery.css';

export const TreeVisionChoice = ({ value, onChange }) => (
    <div className="noma-tree-vision" role="group" aria-label="Bloqueo de visión del árbol">
        <button type="button" aria-pressed={value !== 'trunk'} onClick={() => onChange('canopy')}>Copa completa</button>
        <button type="button" aria-pressed={value === 'trunk'} onClick={() => onChange('trunk')}>Solo tronco</button>
    </div>
);

export const TreeLibraryPanel = ({ onAdd }) => {
    const [visionMode, setVisionMode] = useState('canopy');
    return <section className="noma-tree-library" aria-label="Biblioteca de árboles">
        <div className="noma-tree-heading"><h4>Árboles</h4><span>{TREE_CATALOG.length} variedades</span></div>
        <label className="noma-tree-label">Visión al colocar</label>
        <TreeVisionChoice value={visionMode} onChange={setVisionMode} />
        <div className="noma-tree-library__grid">
            {TREE_CATALOG.map(asset => <button key={asset.id} type="button" onClick={() => onAdd(asset.id, visionMode)}
                className="noma-tree-library__asset" aria-label={`Añadir ${asset.name}`}>
                <img src={asset.thumbnail || asset.image} alt="" loading="lazy" decoding="async" draggable={false} />
                <span>{asset.name}</span>
            </button>)}
        </div>
    </section>;
};
