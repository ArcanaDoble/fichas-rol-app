import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import sanitize from '../../utils/sanitize';
import { syncCampaignToken } from '../canvas/campaignSystem';

export const findSheetCombatToken = (scene, sheet) => scene?.items?.find(token => (
  (token.profileType === 'campaignCharacter' && token.linkedCharacterId === sheet?.id)
  || (token.profileType === 'rogueliteClass' && token.linkedClassId === (sheet?.templateId || sheet?.id)
    && token.linkedClassOwner === sheet?.owner && token.runId === sheet?.activeRun?.id)
));

// Save the owned form and the visible token together, even when Canvas is unmounted.
// Read the scene inside the transaction so a concurrent turn/combat update cannot be lost.
export const commitCampaignWeaponFormSave = ({ character, writes, catalogs }) => runTransaction(db, async transaction => {
  const visibility = await transaction.get(doc(db, 'gameSettings', 'canvasVisibility'));
  const sceneId = visibility.exists() && visibility.data().activeScenarioId;
  const sceneRef = sceneId ? doc(db, 'canvas_scenarios', sceneId) : null;
  const snapshot = sceneRef ? await transaction.get(sceneRef) : null;
  const scene = snapshot?.exists() ? { ...snapshot.data(), id: sceneId } : null;
  const token = findSheetCombatToken(scene, character);
  writes.forEach(({ ref, value }) => transaction.set(ref, value, { merge: true }));
  if (token) {
    const synced = syncCampaignToken(token, character, catalogs, { preserveTokenState: true, preserveMovement: true });
    const next = { ...token, inventory: synced.inventory, equippedItems: synced.equippedItems,
      equipmentLoadout: synced.equipmentLoadout, activeWeaponSet: synced.activeWeaponSet,
      canvasRuntimeRevision: Number(token.canvasRuntimeRevision || 0) + 1 };
    transaction.update(sceneRef, sanitize({ items: scene.items.map(item => item.id === token.id ? next : item),
      lastModified: Math.max(Date.now(), Number(scene.lastModified || 0) + 1) }));
  }
});
