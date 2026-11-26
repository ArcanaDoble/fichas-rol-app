import { useEffect, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../../../firebase';
import sanitize from '../../../utils/sanitize';
import { canRogueliteTokenClaimRun, createRogueliteActiveRunFromToken } from '../../roguelite/activeRun';
import { applyCanvasWeaponTrick, createCanvasWeaponTrickDraft, transformWeaponInGear } from './canvasWeaponTrick';

export const useCanvasWeaponTrick = options => {
  const latest = useRef(options); latest.current = options;
  const [draft, setDraft] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const draftRef = useRef(null), busyRef = useRef(false);
  const read = () => latest.current.activeScenarioRef?.current || latest.current.activeScenario;
  const close = () => { if (!busyRef.current) { draftRef.current = null; setDraft(null); setError(''); } };
  useEffect(() => { draftRef.current = null; setDraft(null); setError(''); }, [options.activeScenario?.id]);
  const begin = (tokenId, weaponId) => {
    if (busyRef.current) return false;
    try {
      const next = { ...createCanvasWeaponTrickDraft(read(), tokenId, latest.current, weaponId), operationId: nanoid(), scenarioId: read().id };
      draftRef.current = next; setDraft(next); setError(''); return true;
    } catch (cause) {
      latest.current.triggerToast?.('Truco', cause.message, 'warning'); return false;
    }
  };
  const confirm = async resourceId => {
    const captured = draftRef.current;
    if (!captured || busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const viewer = latest.current;
      const sceneRef = doc(db, viewer.scenarioCollectionName || 'canvas_scenarios', captured.scenarioId);
      const receiptRef = doc(db, viewer.scenarioCollectionName || 'canvas_scenarios', captured.scenarioId, 'weaponTransforms', captured.operationId);
      const saved = await runTransaction(db, async transaction => {
        const [snapshot, receipt] = await Promise.all([transaction.get(sceneRef), transaction.get(receiptRef)]);
        if (!snapshot.exists()) throw new Error('El encuentro ha sido eliminado.');
        const scene = { ...snapshot.data(), id: captured.scenarioId };
        if (receipt.exists()) return scene;
        const result = applyCanvasWeaponTrick(scene, captured, resourceId, viewer);
        let changed = result.token;
        const isCharacter = changed.profileType === 'campaignCharacter' && changed.linkedCharacterId;
        const isRun = changed.profileType === 'rogueliteClass' && changed.runId && changed.linkedClassId && changed.linkedClassOwner;
        const ownerRef = isCharacter ? doc(db, 'characters', changed.linkedCharacterId)
          : isRun ? doc(db, 'players', changed.linkedClassOwner, 'rogueliteClasses', changed.linkedClassId) : null;
        const owner = ownerRef ? await transaction.get(ownerRef) : null;
        if (isCharacter) {
          if (!owner.exists()) throw new Error('La ficha vinculada ya no existe.');
          const data = owner.data(), gearPatch = {};
          for (const field of ['equipment', 'equippedItems']) if (data[field]) {
            gearPatch[field] = transformWeaponInGear(data[field], result.weapon, result.destination.id);
          }
          if (Object.keys(gearPatch).length) transaction.update(ownerRef, sanitize(gearPatch));
        } else if (isRun) {
          const currentRun = owner?.data()?.activeRun || null;
          if (currentRun && !canRogueliteTokenClaimRun(changed, currentRun, scene.id)) throw new Error('La partida activa ha cambiado de encuentro.');
          const revision = Math.max(Number(currentRun?.revision || 0), Number(changed.runRevision || 0)) + 1;
          changed = { ...changed, runRevision: revision };
          const activeRun = createRogueliteActiveRunFromToken(changed, currentRun, { scenarioId: scene.id, revision, now: Date.now() });
          transaction.set(ownerRef, sanitize({ id: changed.linkedClassId, templateId: changed.linkedClassId,
            owner: changed.linkedClassOwner, profileType: 'rogueliteClass',
            activeRun: { ...activeRun, sourceCanvasRuntimeRevision: changed.canvasRuntimeRevision } }), { merge: true });
        }
        const patch = sanitize({ ...result.patch, items: result.patch.items.map(item => item.id === changed.id ? changed : item),
          lastModified: Math.max(Date.now(), Number(scene.lastModified || 0) + 1) });
        transaction.update(sceneRef, patch);
        transaction.set(receiptRef, { tokenId: changed.id, weaponId: captured.weaponId, formId: result.destination.id, resourceId: resourceId || null });
        transaction.set(doc(db, 'combat_log', `trick-${scene.id}-${captured.operationId}`), { ...sanitize({
          scenarioId: scene.id, sourceEventId: captured.operationId, actorId: changed.id, actorName: changed.name || 'Personaje',
          eventType: 'item-use', effect: 'weapon-transform', itemName: result.weapon.name || result.weapon.nombre,
          logText: `${changed.name || 'Personaje'} transforma ${result.weapon.name || result.weapon.nombre}: ${result.destination.label}.`,
          resourcesSpent: result.resource ? [{ label: `${result.resource.label || 'Dado de acción'} · Valor ignorado`, diceIds: [result.resource.id] }] : [],
          clientTimestamp: Date.now(),
        }), timestamp: serverTimestamp() });
        return { ...scene, ...patch };
      });
      if (latest.current.activeScenario?.id === saved.id) {
        if (latest.current.activeScenarioRef) latest.current.activeScenarioRef.current = saved;
        latest.current.setActiveScenario(current => current?.id === saved.id ? { ...current, ...saved } : current);
      }
      if (draftRef.current?.operationId === captured.operationId) { draftRef.current = null; setDraft(null); }
      return true;
    } catch (cause) {
      if (draftRef.current?.operationId === captured.operationId) setError(cause.message || 'No se pudo guardar. Puedes reintentarlo sin pagar dos veces.');
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  };
  return { trickDraft: draft, trickBusy: busy, trickError: error, beginWeaponTrick: begin, closeWeaponTrick: close, confirmWeaponTrick: confirm };
};
