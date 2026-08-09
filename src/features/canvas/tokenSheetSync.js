import { syncArmorState } from '../../utils/armorSystem';

export const STATUS_EFFECT_IDS = [
    'acido', 'apresado', 'ardiendo', 'asfixiado', 'asustado', 'aturdido',
    'cansado', 'cegado', 'congelado', 'derribado', 'conmocionado', 'enfermo', 'ensordecido',
    'envenenado', 'herido', 'iluminado', 'regeneracion', 'sangrado', 'silenciado',
];

export const getRarityInfo = (rareza) => {
    const r = (rareza || '').toLowerCase();
    if (r.includes('legendari')) return { border: 'border-orange-500/50', text: 'text-orange-400', glow: 'from-orange-900/80', stripe: 'bg-orange-500' };
    if (r.includes('épic') || r.includes('epic')) return { border: 'border-purple-500/50', text: 'text-purple-400', glow: 'from-purple-900/80', stripe: 'bg-purple-500' };
    if (r.includes('rar')) return { border: 'border-blue-500/50', text: 'text-blue-400', glow: 'from-blue-900/80', stripe: 'bg-blue-500' };
    if (r.includes('poco com')) return { border: 'border-green-500/50', text: 'text-green-400', glow: 'from-green-900/80', stripe: 'bg-green-500' };
    return { border: 'border-slate-700', text: 'text-slate-500', glow: 'from-slate-800', stripe: 'bg-slate-600' };
};

// --- Helper: Transform character sheet data into token format ---
export const normalizeEquipmentName = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

export const syncTokenWithSheet = (token, sheetData, catalogs = {}, options = {}) => {
    if (!sheetData) return token;
    const { preserveTokenState = false, skipArmorSync = false } = options;
    const {
        armas = [],
        armaduras = [],
        habilidades = [],
        accesorios = [],
    } = catalogs;

    // Map character attributes to token attributes format
    const tokenAttributes = {};
    const sourceAttributes = { ...(sheetData.atributos || {}), ...(sheetData.attributes || {}) };

    if (Object.keys(sourceAttributes).length > 0) {
        const attrKeyMap = {
            'Destreza': 'destreza', 'destreza': 'destreza',
            'Vigor': 'vigor', 'vigor': 'vigor',
            'Intelecto': 'intelecto', 'intelecto': 'intelecto',
            'Voluntad': 'voluntad', 'voluntad': 'voluntad',
        };
        Object.entries(sourceAttributes).forEach(([key, value]) => {
            const mappedKey = attrKeyMap[key] || key.toLowerCase();
            if (['destreza', 'vigor', 'intelecto', 'voluntad'].includes(mappedKey)) {
                tokenAttributes[mappedKey] = typeof value === 'string' ? value.toLowerCase() : value;
            }
        });
    }

    // Map character stats to token stats format
    const tokenStats = {};
    if (sheetData.stats) {
        const validStats = ['postura', 'armadura', 'vida', 'ingenio', 'cordura'];
        Object.entries(sheetData.stats).forEach(([key, value]) => {
            const mappedKey = key.toLowerCase();
            if (validStats.includes(mappedKey) && value && typeof value === 'object') {
                const max = value.max ?? value.total ?? value.base ?? 0;
                const current = value.current ?? value.actual ?? max;
                tokenStats[mappedKey] = {
                    current: Math.min(current, 10),
                    max: Math.min(max, 10),
                };
            }
        });
    }

    // Extract status effects from character tags
    const tokenStatus = [];
    if (sheetData.tags && Array.isArray(sheetData.tags)) {
        sheetData.tags.forEach(tag => {
            const normalizedTag = tag.toLowerCase().trim();
            if (STATUS_EFFECT_IDS.includes(normalizedTag)) {
                tokenStatus.push(normalizedTag);
            }
        });
    }

    // Helper to flatten item (extract from .payload if present)
    const flattenItem = (item) => {
        if (!item) return null;
        if (item.payload) {
            return { ...item.payload, ...item, payload: undefined };
        }
        return item;
    };

    const mergeCatalogItem = (entry, catalog, type) => {
        const flattened = flattenItem(entry);
        if (!flattened) return null;
        const rawName =
            typeof flattened === 'string'
                ? flattened
                : flattened.nombre || flattened.name || '';
        const normalizedName = normalizeEquipmentName(rawName);
        const fromCatalog =
            catalog.find(
                (candidate) =>
                    normalizeEquipmentName(
                        candidate?.nombre || candidate?.name || ''
                    ) === normalizedName
            ) || null;
        const merged =
            typeof flattened === 'string'
                ? { ...(fromCatalog || {}), nombre: rawName || fromCatalog?.nombre || fromCatalog?.name || '' }
                : { ...(fromCatalog || {}), ...flattened };
        return {
            ...merged,
            type: merged.type || type,
        };
    };

    const pushUniqueItem = (target, item, type) => {
        const merged = mergeCatalogItem(item, (() => {
            if (type === 'weapon') return armas;
            if (type === 'armor') return armaduras;
            if (type === 'ability') return habilidades;
            if (type === 'access') return accesorios;
            return [];
        })(), type);
        if (!merged) return;
        const key = `${type}:${normalizeEquipmentName(merged.nombre || merged.name)}`;
        if (target.some((candidate) => `${candidate.type}:${normalizeEquipmentName(candidate.nombre || candidate.name)}` === key)) {
            return;
        }
        target.push(merged);
    };

    // Extract equipped items from character sheet slots into token format
    const tokenEquippedItems = [];
    const hasExplicitEquipmentSource =
        (sheetData.equippedItems && typeof sheetData.equippedItems === 'object') ||
        Array.isArray(sheetData.weapons) ||
        Array.isArray(sheetData.armaduras) ||
        Array.isArray(sheetData.poderes) ||
        Array.isArray(sheetData.abilities) ||
        Array.isArray(sheetData.equipment?.abilities) ||
        Array.isArray(sheetData.actionData?.reaction);

    if (sheetData.equippedItems && typeof sheetData.equippedItems === 'object') {
        const slotTypeMap = {
            mainHand: 'weapon',
            offHand: 'weapon',
            body: 'armor',
        };
        Object.entries(sheetData.equippedItems).forEach(([slot, item]) => {
            if (!item || slot === 'beltSlotCount') return; // skip non-item keys

            const flattened = flattenItem(item);
            if (!flattened) return;

            let type = slotTypeMap[slot];
            if (!type) {
                if (slot.startsWith('belt_')) type = 'access';
                else if (slot.startsWith('accessory_')) type = 'access';
                else type = flattened.type || 'weapon'; // fallback
            }
            pushUniqueItem(tokenEquippedItems, flattened, type);
        });
    }

    (sheetData.weapons || []).forEach((weapon) =>
        pushUniqueItem(tokenEquippedItems, weapon, 'weapon')
    );
    (sheetData.armaduras || []).forEach((armor) =>
        pushUniqueItem(tokenEquippedItems, armor, 'armor')
    );
    (sheetData.poderes || []).forEach((power) =>
        pushUniqueItem(tokenEquippedItems, power, 'ability')
    );
    [
        ...(sheetData.equipment?.abilities || []),
        ...(sheetData.abilities || []),
        ...((sheetData.actionData?.reaction || []).filter(
            (entry) => entry?.isActive && (entry.damage || entry.dano)
        )),
    ].forEach((ability) => pushUniqueItem(tokenEquippedItems, ability, 'ability'));

    // Extract inventory items (equipment)
    // sheetData.equipment can be an array OR an object with categories { weapons: [], armor: [], ... }
    let tokenInventory = [];
    const rawEquipment = sheetData.equipment || sheetData.equipo;
    if (rawEquipment) {
        if (Array.isArray(rawEquipment)) {
            tokenInventory = rawEquipment.map(flattenItem).filter(Boolean);
        } else if (typeof rawEquipment === 'object') {
            Object.values(rawEquipment).forEach(categoryList => {
                if (Array.isArray(categoryList)) {
                    categoryList.forEach(item => {
                        const flattened = flattenItem(item);
                        if (flattened) tokenInventory.push(flattened);
                    });
                }
            });
        }
    }

    const syncedToken = {
        ...token,
        // Mantener la imagen del canvas si ya existe, de lo contrario usar la de la ficha
        img: token.img || sheetData.avatar || sheetData.portraitSource || sheetData.image,
        // El retrato siempre usa la imagen de la ficha (si existe) para el inspector/HUD
        portrait: sheetData.avatar || sheetData.portraitSource || sheetData.image || token.portrait || token.img,
        name: sheetData.name || token.name,
        status: preserveTokenState ? token.status || tokenStatus : tokenStatus,
        attributes: tokenAttributes,
        stats: preserveTokenState
            ? token.stats || tokenStats || {}
            : Object.keys(tokenStats).length > 0
                ? tokenStats
                : token.stats || {},
        equippedItems: hasExplicitEquipmentSource
            ? tokenEquippedItems
            : token.equippedItems || tokenEquippedItems,
        inventory: tokenInventory.length > 0 ? tokenInventory : token.inventory || [],
        velocidad: token.velocidad || 0,
        linkedCharacterId: sheetData.id || token.linkedCharacterId || null,
    };

    if (skipArmorSync) {
        return syncedToken;
    }

    return syncArmorState(syncedToken, { armaduras, mode: 'token' });
};

// --- Normalize glossary word (mirrors LoadoutView) ---
export const normalizeGlossaryWord = (word) => (word || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
