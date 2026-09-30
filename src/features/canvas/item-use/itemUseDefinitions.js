import { ITEM_USE_PHASES } from './itemUseSystem';

const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const SMOKE_BOMB_ITEM_USE_ID = 'smoke-bomb';
export const HEALING_POTION_ITEM_USE_ID = 'healing-potion';
export const EXPLOSIVE_BOMB_ITEM_USE_ID = 'explosive-bomb';

export const explosiveBombItemUseDefinition = Object.freeze({
    id: EXPLOSIVE_BOMB_ITEM_USE_ID,
    label: 'Bomba explosiva',
    cost: 'action',
    phases: [
        {
            id: ITEM_USE_PHASES.SELECT_DIE,
            storeAs: 'resource',
            validate: (resource) => (
                resource?.status === 'available' && Number.isFinite(Number(resource?.value))
                    ? true
                    : 'Selecciona un dado de acción disponible.'
            ),
        },
        {
            id: ITEM_USE_PHASES.PLACE_AREA,
            storeAs: 'placement',
            validate: (placement) => placement?.valid === true || 'La explosión debe quedar dentro del tablero.',
        },
        { id: ITEM_USE_PHASES.CONFIRM, storeAs: 'confirmed', validate: (confirmed) => confirmed === true || 'Confirma el lanzamiento.' },
        { id: ITEM_USE_PHASES.CONSUME_RESOURCES },
        { id: ITEM_USE_PHASES.RESOLVE_EFFECTS },
    ],
    area: {
        shape: 'rect',
        size: { columns: 2, rows: 2 },
        snapToGrid: true,
        rangeFrom: 'resource.value',
        orientAroundImpact: true,
    },
    effect: {
        type: 'explosive-pressure',
        dice: [8, 8],
        persistent: false,
        affectsAllCreatures: true,
    },
});

export const healingPotionItemUseDefinition = Object.freeze({
    id: HEALING_POTION_ITEM_USE_ID,
    label: 'Poción de curación',
    cost: 'action',
    phases: [
        {
            id: ITEM_USE_PHASES.SELECT_DIE,
            storeAs: 'resource',
            validate: (resource) => resource?.status === 'available' || 'Selecciona una acción disponible.',
        },
        { id: ITEM_USE_PHASES.CONFIRM, storeAs: 'confirmed', validate: (confirmed) => confirmed === true || 'Confirma el uso de la poción.' },
        { id: ITEM_USE_PHASES.CONSUME_RESOURCES },
        { id: ITEM_USE_PHASES.RESOLVE_EFFECTS },
    ],
    effect: { type: 'heal', die: 'd4', sides: 4, target: 'self' },
});

export const smokeBombItemUseDefinition = Object.freeze({
    id: SMOKE_BOMB_ITEM_USE_ID,
    label: 'Bomba de humo',
    phases: [
        {
            id: ITEM_USE_PHASES.SELECT_DIE,
            storeAs: 'resource',
            validate: (resource) => (
                resource?.status === 'available' && Number(resource?.value) >= 0
                    ? true
                    : 'Selecciona un dado disponible.'
            ),
        },
        {
            id: ITEM_USE_PHASES.PLACE_AREA,
            storeAs: 'placement',
            validate: (placement) => placement?.valid === true || 'La plantilla no puede colocarse ahí.',
        },
        { id: ITEM_USE_PHASES.CONFIRM, storeAs: 'confirmed', validate: (confirmed) => confirmed === true || 'Confirma el lanzamiento.' },
        { id: ITEM_USE_PHASES.CONSUME_RESOURCES },
        { id: ITEM_USE_PHASES.RESOLVE_EFFECTS },
    ],
    area: {
        shape: 'rect',
        size: { columns: 2, rows: 2 },
        snapToGrid: true,
        rangeFrom: 'resource.value',
    },
    effect: {
        geometryKind: 'smoke',
        name: 'Humo',
        backgroundColor: '#64748b',
        opacity: 0.32,
        areaEffect: {
            id: 'smoke-concealment',
            type: 'smoke',
            persistent: true,
        },
    },
});

export const isSmokeBombItem = (item = {}) => {
    const explicitId = normalizeText(
        item.itemUseId
        || item.useEffect?.id
        || item.payload?.itemUseId
        || item.payload?.useEffect?.id,
    );
    if (explicitId === SMOKE_BOMB_ITEM_USE_ID) return true;
    return normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre)
        .includes('bomba de humo');
};

export const isHealingPotionItem = (item = {}) => {
    const explicitId = normalizeText(item.itemUseId || item.useEffect?.id
        || item.payload?.itemUseId || item.payload?.useEffect?.id);
    if (explicitId) return explicitId === HEALING_POTION_ITEM_USE_ID;
    return normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre) === 'pocion de curacion';
};

export const isExplosiveBombItem = (item = {}) => {
    const explicitId = normalizeText(item.itemUseId || item.useEffect?.id
        || item.payload?.itemUseId || item.payload?.useEffect?.id);
    if (explicitId) return explicitId === EXPLOSIVE_BOMB_ITEM_USE_ID;
    return normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre) === 'bomba explosiva';
};

export const TAR_BOMB_ITEM_USE_ID = 'tar-bomb';
export const tarBombItemUseDefinition = Object.freeze({
    ...smokeBombItemUseDefinition,
    id: TAR_BOMB_ITEM_USE_ID,
    label: 'Bomba de brea',
    area: { ...smokeBombItemUseDefinition.area, orientAroundImpact: true },
    effect: { geometryKind: 'tar', name: 'Brea', backgroundColor: '#17130f', opacity: 1,
        areaEffect: { id: 'tar-terrain', type: 'tar', difficultTerrain: true, inflammable: true, expires: 'combat-end' } },
});
export const isTarBombItem = (item = {}) => {
    const explicitId = normalizeText(item.itemUseId || item.useEffect?.id || item.payload?.itemUseId || item.payload?.useEffect?.id);
    if (explicitId) return explicitId === TAR_BOMB_ITEM_USE_ID;
    return normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre) === 'bomba de brea';
};

export const antidoteItemUseDefinition = Object.freeze({
    ...healingPotionItemUseDefinition, id: 'antidote', label: 'Antídoto',
    effect: { type: 'remove-poison', target: 'self-or-touch' },
});
export const isAntidoteItem = (item = {}) => {
    const explicitId = normalizeText(item.itemUseId || item.useEffect?.id || item.payload?.itemUseId || item.payload?.useEffect?.id);
    return explicitId ? explicitId === 'antidote'
        : normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre) === 'antidoto';
};

export const hastePotionItemUseDefinition = Object.freeze({
    ...healingPotionItemUseDefinition, id: 'haste-potion', label: 'Poción de presteza',
    effect: { type: 'haste', target: 'self' },
});
export const bandageItemUseDefinition = Object.freeze({
    ...healingPotionItemUseDefinition, id: 'bandage', label: 'Vendaje',
    effect: { type: 'remove-bleeding', target: 'self-or-touch' },
});
export const vitalityPotionItemUseDefinition = Object.freeze({
    ...healingPotionItemUseDefinition, id: 'vitality-potion', label: 'Poción de vitalidad',
    effect: { type: 'temporary-life', target: 'self' },
});
export const getItemUseDefinition = (item = {}) => {
    if (!item) return null;
    const explicitId = normalizeText(item.itemUseId || item.useEffect?.id || item.payload?.itemUseId || item.payload?.useEffect?.id);
    const name = normalizeText(item.name || item.nombre || item.payload?.name || item.payload?.nombre);
    if (explicitId === 'bandage' || (!explicitId && ['venda', 'vendaje', 'vendas'].includes(name))) return bandageItemUseDefinition;
    if (explicitId === 'haste-potion' || (!explicitId && name === 'pocion de presteza')) return hastePotionItemUseDefinition;
    if (explicitId === 'vitality-potion' || (!explicitId && ['pocion de vitalidad', 'balsamo de vitalidad menor'].includes(name))) return vitalityPotionItemUseDefinition;
    if (isAntidoteItem(item)) return antidoteItemUseDefinition;
    if (isTarBombItem(item)) return tarBombItemUseDefinition;
    if (isHealingPotionItem(item)) return healingPotionItemUseDefinition;
    if (isExplosiveBombItem(item)) return explosiveBombItemUseDefinition;
    return isSmokeBombItem(item) ? smokeBombItemUseDefinition : null;
};
