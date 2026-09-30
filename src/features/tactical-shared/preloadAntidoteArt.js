import { preloadImage } from '../../components/LoadingImage';
import { resolveEquipmentImage } from '../../utils/equipmentImages';

// Warm each observer's browser before a consumable is used, not after its event arrives.
export const preloadAntidoteArt = (items = []) => {
    const sources = new Set();
    items.forEach(token => {
        const candidates = [
            ...(Array.isArray(token.inventory) ? token.inventory : []),
            ...Object.values(token.equipment || {}),
            ...Object.values(token.equippedItems || {}),
        ].flat();
        candidates.forEach(candidate => {
            if (!candidate || typeof candidate !== 'object') return;
            const item = { ...candidate.payload, ...candidate };
            const name = String(item.name || item.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (!['antidote', 'bandage', 'haste-potion', 'vitality-potion'].includes(item.itemUseId)
                && !['antidoto', 'vendaje', 'venda', 'vendas', 'pocion de presteza', 'pocion de vitalidad', 'balsamo de vitalidad menor'].includes(name)) return;
            const src = resolveEquipmentImage(item);
            if (src) sources.add(src);
        });
        if (['remove-poison', 'remove-bleeding', 'haste', 'temporary-life'].includes(token.canvasHealingEffect?.effect) && token.canvasHealingEffect.itemImage) {
            sources.add(token.canvasHealingEffect.itemImage);
        }
    });
    return Promise.all([...sources].map(src => preloadImage(src)));
};
