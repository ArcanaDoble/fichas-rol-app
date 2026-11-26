import { useSyncExternalStore } from 'react';
import { hasWeaponTrick, resolveWeaponForm } from '../features/roguelite/weaponForms';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Hook that subscribes to custom equipment images from Firestore.
 * Returns a Map<normalizedItemName, imageUrl> for fast lookups.
 *
 * Usage:
 *   const customImages = useCustomEquipmentImages();
 *   // Then in getObjectImage, check customImages before hardcoded fallback
 */
const normalizeKey = (name) =>
    (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

// Retain the latest catalog when a HUD or preparation remounts. Consumers share
// one live subscription rather than each starting with an empty catalog.
let imageSnapshot = new Map();
let unsubscribeImages = null;
const imageListeners = new Set();
const getImageSnapshot = () => imageSnapshot;

const subscribeToImages = (listener) => {
    imageListeners.add(listener);
    if (!unsubscribeImages) {
        unsubscribeImages = onSnapshot(collection(db, 'equipment_images'), (snap) => {
            const map = new Map();
            snap.forEach(doc => {
                const data = doc.data();
                if (data.imageUrl) {
                    // Store by doc id (normalized key) AND by normalized item name
                    map.set(doc.id, data.imageUrl);
                    if (data.itemName) {
                        map.set(normalizeKey(data.itemName), data.imageUrl);
                    }
                }
            });
            imageSnapshot = map;
            imageListeners.forEach(notify => notify());
        });
    }
    return () => {
        imageListeners.delete(listener);
        if (imageListeners.size === 0) {
            unsubscribeImages?.();
            unsubscribeImages = null;
        }
    };
};

export const useCustomEquipmentImages = () => useSyncExternalStore(
    subscribeToImages, getImageSnapshot, getImageSnapshot,
);

/**
 * Given an item and the customImages map, check if a custom image exists.
 * Returns the custom image URL or null.
 */
export const getCustomImage = (item, customImages) => {
    if (hasWeaponTrick(item)) return resolveWeaponForm(item).image || null;
    if (!customImages || !item) return null;

    const getImageFromMap = (key) => {
        if (!key) return null;
        if (typeof customImages.get === 'function') {
            return customImages.get(key) || null;
        }
        return customImages[key] || null;
    };

    const name = item.name || item.nombre || item.displayName || item._displayName || '';
    const key = normalizeKey(name);
    const byKey = getImageFromMap(key);
    if (byKey) return byKey;

    if (item.id) {
        const byId = getImageFromMap(item.id) || getImageFromMap(normalizeKey(item.id));
        if (byId) return byId;
    }

    if (item._key) {
        const byUnderKey = getImageFromMap(item._key);
        if (byUnderKey) return byUnderKey;
    }

    return null;
};
