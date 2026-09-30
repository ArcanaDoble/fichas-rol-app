import {
    CANVAS_CATALOG_CATEGORIES,
    filterCanvasCatalogItems,
    prepareCanvasCatalogItem,
} from '../canvasCatalogItems';
import { createCanvasLootSceneItem } from '../canvasInventoryTransfer';

test.each([
    ['weapons', 'weapon'],
    ['objects', 'object'],
    ['accessories', 'accessory'],
    ['armor', 'armor'],
    ['abilities', 'ability'],
])('normalizes Forge %s entries for Canvas inventory and ground loot', (category, itemType) => {
    const item = prepareCanvasCatalogItem({
        id: `${category}-1`,
        nombre: `Entrada ${category}`,
        rareza: 'Rara',
    }, category, '/item.webp');

    expect(item).toMatchObject({
        id: `${category}-1`,
        catalogId: `${category}-1`,
        templateId: `${category}-1`,
        name: `Entrada ${category}`,
        itemType,
        category,
        image: '/item.webp',
    });

    const loot = createCanvasLootSceneItem({
        item,
        image: '/item.webp',
        sourceToken: null,
        position: { x: 10, y: 20, width: 16, height: 16 },
    });
    expect(loot).toMatchObject({
        sceneItemKind: 'canvasLoot',
        name: `Entrada ${category}`,
        img: '/item.webp',
        droppedByTokenId: null,
        lootItem: expect.objectContaining({ itemType, category }),
    });
});

test('searches the live Forge catalog by name, rarity and traits while omitting deleted entries', () => {
    const items = [
        { id: 'sword', nombre: 'Espada lunar', rareza: 'Épica', rasgos: ['Arcana'] },
        { id: 'shield', nombre: 'Escudo', rareza: 'Común' },
        { id: 'old', nombre: 'Espada antigua', deleted: true },
    ];
    expect(filterCanvasCatalogItems(items, 'epica arcana')).toEqual([
        expect.objectContaining({ id: 'sword' }),
    ]);
    expect(filterCanvasCatalogItems(items, '')).toHaveLength(2);
    expect(CANVAS_CATALOG_CATEGORIES.map((entry) => entry.collection)).toEqual([
        'weapons', 'customItems', 'accessories', 'armors', 'abilities',
    ]);
});
