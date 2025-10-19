import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function resolveDamageEventPageIds(pageId) {
  const ids = new Set();
  if (pageId) ids.add(pageId);

  try {
    const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
    if (visibilityDoc.exists()) {
      const playerVisiblePageId = visibilityDoc.data().playerVisiblePageId;
      if (playerVisiblePageId) {
        ids.add(playerVisiblePageId);
      }
    }
  } catch (err) {
    console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
  }

  return Array.from(ids);
}

export async function publishDamageEvent(event, targetPageIds) {
  const ids = Array.isArray(targetPageIds) ? targetPageIds : [targetPageIds];
  const validIds = ids.filter((id) => id !== undefined && id !== null);
  const targets = validIds.length ? validIds : [null];

  await Promise.all(
    targets.map((targetPageId) =>
      addDoc(collection(db, 'damageEvents'), {
        ...event,
        pageId: targetPageId,
        timestamp: serverTimestamp(),
      }).catch((error) => {
        console.error('Error publicando evento de daño:', error);
      })
    )
  );
}
