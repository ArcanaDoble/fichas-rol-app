import { copyCanvasInventoryItem, normalizeCanvasInventoryItem } from './canvasInventoryTransfer';

export const CANVAS_CATALOG_CATEGORIES = Object.freeze([
    { id: 'weapons', label: 'Armas', singular: 'Arma', collection: 'weapons', itemType: 'weapon' },
    { id: 'objects', label: 'Objetos', singular: 'Objeto', collection: 'customItems', itemType: 'object' },
    { id: 'accessories', label: 'Accesorios', singular: 'Accesorio', collection: 'accessories', itemType: 'accessory' },
    { id: 'armor', label: 'Armaduras', singular: 'Armadura', collection: 'armors', itemType: 'armor' },
    { id: 'abilities', label: 'Habilidades', singular: 'Habilidad', collection: 'abilities', itemType: 'ability' },
]);

export const normalizeCanvasCatalogText = (value = '') => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const prepareCanvasCatalogItem = (item = {}, categoryId = 'objects', image = null) => {
    const category = CANVAS_CATALOG_CATEGORIES.find((entry) => entry.id === categoryId)
        || CANVAS_CATALOG_CATEGORIES[1];
    const catalogId = item.catalogId || item.templateId || item.id || item.nombre || item.name;
    const template = copyCanvasInventoryItem(item);
    const prepared = normalizeCanvasInventoryItem({
        ...template,
        id: item.id || catalogId,
        catalogId,
        templateId: item.templateId || catalogId,
        type: item.type || category.itemType,
        itemType: item.itemType || category.itemType,
        category: category.id,
        catalogSource: category.collection,
        ...(image ? { image, imageUrl: image } : {}),
    }, image);
    // A catalog selection is a new physical copy, even if its nested source
    // happened to carry an identity from a previous adventure.
    delete prepared.runItemId;
    return prepared;
};

export const filterCanvasCatalogItems = (items = [], search = '') => {
    const needle = normalizeCanvasCatalogText(search);
    return (items || [])
        .filter((item) => item && !item.deleted)
        .filter((item) => !needle || normalizeCanvasCatalogText([
            item.name,
            item.nombre,
            item.rareza,
            item.rarity,
            item.description,
            item.descripcion,
            item.lore,
            ...(Array.isArray(item.rasgos) ? item.rasgos : [item.rasgos]),
        ].filter(Boolean).join(' ')).includes(needle))
        .sort((left, right) => String(left.name || left.nombre || '').localeCompare(
            String(right.name || right.nombre || ''),
            'es',
        ));
};
