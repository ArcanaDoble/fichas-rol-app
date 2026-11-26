import React from 'react';
import { getTreeAsset, getTreeTrunkRatio } from '../../scenery';
import { TreeVisionChoice } from './TreeLibraryPanel';
import '../TreeScenery.css';

export const TreeInspectorPanel = ({ item, gridConfig, updateItem, deleteItem }) => {
    const cellWidth = Number(gridConfig.cellWidth) || 50, cellHeight = Number(gridConfig.cellHeight) || 50;
    const patch = fields => updateItem(item.id, fields, true);
    return <section className="noma-tree-inspector" aria-label="Inspector de árbol">
        <div className="noma-tree-inspector__portrait">
            <img src={getTreeAsset(item)?.image || item.img} alt="" />
            <span>Escenografía · Árbol</span>
        </div>
        <label className="noma-tree-label">Nombre
            <input value={item.name || ''} onChange={event => patch({ name: event.target.value })} />
        </label>
        <div className="noma-tree-field">
            <span className="noma-tree-label">Bloquea la visión</span>
            <TreeVisionChoice value={item.treeVisionMode} onChange={treeVisionMode => patch({ treeVisionMode })} />
            <p>{item.treeVisionMode === 'trunk' ? 'La visión puede pasar bajo la copa.' : 'El contorno de la copa oculta lo que queda detrás.'}</p>
        </div>
        <label className="noma-tree-label">Grosor del tronco · {Math.round(getTreeTrunkRatio(item) * 100)} %
            <input type="range" min="0.1" max="1" step="0.05" value={getTreeTrunkRatio(item)}
                onChange={event => patch({ treeTrunkRatio: Number(event.target.value) })} />
            <span className="noma-tree-help">El tronco bloquea el paso en ambos modos.</span>
        </label>
        <div className="noma-tree-size">
            <label className="noma-tree-label">Ancho · casillas
                <input type="number" min="0.25" step="0.25" value={Number((item.width / cellWidth).toFixed(3))}
                    onChange={event => Number(event.target.value) > 0 && patch({ width: Number(event.target.value) * cellWidth })} />
            </label>
            <label className="noma-tree-label">Alto · casillas
                <input type="number" min="0.25" step="0.25" value={Number((item.height / cellHeight).toFixed(3))}
                    onChange={event => Number(event.target.value) > 0 && patch({ height: Number(event.target.value) * cellHeight })} />
            </label>
        </div>
        <label className="noma-tree-label">Giro · grados
            <input type="number" step="15" value={Number((item.rotation || 0).toFixed(1))}
                onChange={event => patch({ rotation: Number(event.target.value) || 0 })} />
        </label>
        <label className="noma-tree-check"><input type="checkbox" checked={Boolean(item.snapToGrid)}
            onChange={event => patch({ snapToGrid: event.target.checked })} />Ajustar a la rejilla</label>
        <button type="button" className="noma-tree-delete" onClick={() => deleteItem(item.id)}>Eliminar árbol</button>
    </section>;
};
