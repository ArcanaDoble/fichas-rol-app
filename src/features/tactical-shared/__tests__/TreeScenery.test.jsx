import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TreeLibraryPanel } from '../components/sidebar/TreeLibraryPanel';
import { TreeInspectorPanel } from '../components/sidebar/TreeInspectorPanel';
import { TreeSceneryVisual } from '../components/TreeScenery';
import { TreeCanopySurfaces } from '../components/TreeCanopySurfaces';
import { TREE_CATALOG, createTreeScenery } from '../scenery';
import { TREE_OCCUPIED_OPACITY } from '../canvasVision';

const config = { cellWidth: 50, cellHeight: 50 };
const tree = createTreeScenery(TREE_CATALOG[0], { x: 100, y: 100 }, config);

test('the library places the chosen tree with the chosen vision mode', () => {
    const onAdd = jest.fn();
    render(<TreeLibraryPanel onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Solo tronco' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Árbol verde A1' }));
    expect(onAdd).toHaveBeenCalledWith(TREE_CATALOG[0].id, 'trunk');
});

test('the inspector changes vision, trunk size, footprint and angle independently', () => {
    const updateItem = jest.fn();
    render(<TreeInspectorPanel item={tree} gridConfig={config} updateItem={updateItem} deleteItem={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Solo tronco' }));
    expect(updateItem).toHaveBeenLastCalledWith(tree.id, { treeVisionMode: 'trunk' }, true);
    fireEvent.change(screen.getByLabelText('Ancho · casillas'), { target: { value: '3' } });
    expect(updateItem).toHaveBeenLastCalledWith(tree.id, { width: 150 }, true);
    fireEvent.change(screen.getByLabelText('Giro · grados'), { target: { value: '90' } });
    expect(updateItem).toHaveBeenLastCalledWith(tree.id, { rotation: 90 }, true);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '.5' } });
    expect(updateItem).toHaveBeenLastCalledWith(tree.id, { treeTrunkRatio: .5 }, true);
});

test('the player image has no editing contour and retains contain fitting', () => {
    const { container, rerender } = render(<TreeSceneryVisual item={tree} />);
    expect(screen.getByRole('img', { name: tree.name })).toHaveAttribute('src', TREE_CATALOG[0].image);
    expect(container.querySelector('polygon')).toBeNull();
    rerender(<TreeSceneryVisual item={tree} showContour />);
    expect(container.querySelector('polygon')).not.toBeNull();
});

test('canopy restoration is still clipped by range and other obstacles', () => {
    const source = { id: 'viewer', type: 'token', x: 0, y: 100, width: 20, height: 20, hasVision: true, visionRadius: 200 };
    const wall = { id: 'barrier', type: 'wall', x1: 50, y1: 0, x2: 50, y2: 300 };
    const { container } = render(<svg><TreeCanopySurfaces items={[source, tree, wall]} gridConfig={{ fogOfWar: true }}
        isPlayerView={false} selectedTokenIds={['viewer']} bounds={{ x: 0, y: 0, width: 500, height: 500 }} /></svg>);
    const mask = container.querySelector(`mask[id$="-${source.id}"]`);
    expect(mask.querySelectorAll('polygon')).toHaveLength(1);
    expect(container.querySelector('circle')).toHaveAttribute('r', '200');
    expect(container.querySelector('g[mask]')).not.toBeNull();
});

test('visible actors under foliage remain readable without cutting holes for hidden actors', () => {
    const source = { id: 'viewer', type: 'token', x: 0, y: 115, width: 10, height: 10,
        hasVision: true, controlledBy: ['Ada'], visionRadius: 500 };
    const visible = { id: 'under-leaves', type: 'token', x: 145, y: 115, width: 10, height: 10 };
    const blocked = { id: 'behind-trunk', type: 'token', x: 145, y: 145, width: 10, height: 10 };
    const { container } = render(<svg><TreeCanopySurfaces items={[source, visible, blocked, { ...tree, treeVisionMode: 'trunk' }]}
        gridConfig={{ fogOfWar: true }} isPlayerView playerName="Ada" selectedTokenIds={[]}
        bounds={{ x: 0, y: 0, width: 500, height: 500 }} /></svg>);
    expect(container.querySelector('[data-tree-visible-actor="under-leaves"]')).not.toBeNull();
    expect(container.querySelector('[data-tree-visible-actor="behind-trunk"]')).toBeNull();
    expect(container.querySelector('[data-tree-canopy-opacity]')).toHaveAttribute('opacity', String(TREE_OCCUPIED_OPACITY));
});

test('opacity is applied once across shared sight and restored when the last actor leaves', () => {
    const source = { id: 'viewer', type: 'token', x: 140, y: 115, width: 10, height: 10,
        hasVision: true, controlledBy: ['Ada'], visionRadius: 500 };
    const other = { ...source, id: 'other', x: 0 };
    const props = { gridConfig: { fogOfWar: true }, isPlayerView: true, playerName: 'Ada', selectedTokenIds: [],
        bounds: { x: 0, y: 0, width: 500, height: 500 } };
    const { container, rerender } = render(<svg><TreeCanopySurfaces {...props} items={[source, other, tree]} /></svg>);
    expect(container.querySelectorAll('[data-tree-canopy-opacity]')).toHaveLength(1);
    expect(container.querySelector('[data-tree-canopy-opacity]')).toHaveAttribute('opacity', String(TREE_OCCUPIED_OPACITY));
    rerender(<svg><TreeCanopySurfaces {...props} items={[{ ...source, x: 0 }, other, tree]} /></svg>);
    expect(container.querySelector('[data-tree-canopy-opacity]')).toHaveAttribute('opacity', '1');
    rerender(<TreeSceneryVisual item={tree} opacity={TREE_OCCUPIED_OPACITY} />);
    expect(screen.getByRole('img')).toHaveStyle({ opacity: TREE_OCCUPIED_OPACITY });
    rerender(<TreeSceneryVisual item={tree} opacity={TREE_OCCUPIED_OPACITY} surfaceOverlay />);
    expect(screen.getByRole('img')).toHaveStyle({ opacity: 0 });
});
