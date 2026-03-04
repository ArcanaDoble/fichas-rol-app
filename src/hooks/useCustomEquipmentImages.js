import { useState, useEffect } from 'react';
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

export const useCustomEquipmentImages = () => {
    const [images, setImages] = useState(new Map());

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'equipment_images'), (snap) => {
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
            setImages(map);
        });
        return () => unsub();
    }, []);

    return images;
};

/**
 * Given an item and the customImages map, check if a custom image exists.
 * Returns the custom image URL or null.
 */
export const getCustomImage = (item, customImages) => {
    if (!customImages || customImages.size === 0) return null;

    const name = item.name || item.nombre || '';
    const key = normalizeKey(name);
    return customImages.get(key) || null;
};
