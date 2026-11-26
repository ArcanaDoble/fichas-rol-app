import { hasWeaponTrick, resolveWeaponForm } from '../features/roguelite/weaponForms';

const identityKeys = ['id', 'instanceId', 'runItemId', 'activeFormId', 'quantity', 'count', 'canvasSlot', 'equippedSlots', '_inventoryOrder', 'notes', 'note'];
const nameOf = item => String(item?.name || item?.nombre || '').trim().toLowerCase();

// Catalog changes update definitions, never ownership or the layout of an inventory.
export const refreshForgeEquipment = (sheet, catalog) => {
    if (!sheet) return sheet;
    const entries = Object.values(catalog).flat().filter(item => !item.deleted);
    const refresh = value => {
        if (Array.isArray(value)) return value.map(refresh);
        if (!value || typeof value !== 'object') return value;
        const payload = value.payload || value;
        const ids = [payload.templateId, payload.catalogId, value.templateId, value.catalogId, payload.id, value.id].filter(Boolean).map(String);
        let match = entries.find(entry => [entry.id, entry.payload?.templateId, entry.payload?.id].filter(Boolean).some(id => ids.includes(String(id))));
        if (!match && nameOf(payload)) {
            const matches = entries.filter(entry => nameOf(entry.payload || entry) === nameOf(payload));
            if (matches.length === 1) match = matches[0];
        }
        if (match) {
            const definition = match.payload || match;
            const updated = { ...payload, ...definition };
            identityKeys.forEach(key => { if (Object.prototype.hasOwnProperty.call(payload, key)) updated[key] = payload[key]; });
            if (value.activeFormId) updated.activeFormId = value.activeFormId;
            const wrapped = value.payload ? { ...value, name: match.name || definition.name || value.name, payload: updated } : updated;
            return resolveWeaponForm(value.payload && hasWeaponTrick(updated)
                ? { ...wrapped, ...updated, id: value.id || updated.id, payload: updated } : wrapped);
        }
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, refresh(child)]));
    };
    const next = { ...sheet, equipment: refresh(sheet.equipment), equippedItems: refresh(sheet.equippedItems) };
    return JSON.stringify(next) === JSON.stringify(sheet) ? sheet : next;
};
