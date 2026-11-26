import { useEffect, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import sanitize from '../../../utils/sanitize';
import { getCanvasSystem } from '../campaignSystem';
import { createCanvasCombatState, rollParticipantActionDice } from './canvasCombatState';
import { getCanvasWeaponActionCost, getCanvasWeaponTraits } from './canvasAttackRules';
import { buildCanvasCombatLog } from './canvasCombatLog';
import { needsBleedingChoice } from '../../tactical-shared/bleedingRules';
import { normalizeCampaignThreatProfile } from './campaignThreatDice';
import { campaignAttackForViewer, campaignCombatForViewer } from './campaignCombatVisibility';
import {
  assertCampaignAttackTurn, canControlCampaignToken, getCampaignAttackOptions, getCampaignCounterWeapons, getCampaignEvasionDestinations,
  getCampaignResources, isCampaignAttack, isCampaignMeleeWeapon, resolveCampaignAttack, resolveCampaignAttackSelection,
  restoreCampaignResources, rollCampaignWeapon, selectCampaignResources, spendCampaignResources,
  validateCampaignAttackResources, validateCampaignDefense, validateCampaignZones,
} from './campaignAttackRules';
import { campaignChoicePayload, campaignNonce, campaignRandom, forgetCampaignChoice, readCampaignChoice,
  rememberCampaignChoice, verifyCampaignReveal } from './campaignAttackCommitment';

const assert = (test, message) => { if (!test) throw new Error(message); };
const sameResources = (before, after) => assert(JSON.stringify(before.map(r => [r.id, r.value, r.status]))
  === JSON.stringify(after.map(r => [r.id, r.value, r.status])), 'Los recursos han cambiado. Vuelve a preparar el ataque.');
const find = (scene, id) => scene?.items?.find(item => item.id === id);
const pendingContext = scene => {
  for (const field of ['canvasCombat', 'canvasPracticeCombat']) {
    if (isCampaignAttack(scene?.[field]?.pendingAttack)) return { field, combat: scene[field], pending: scene[field].pendingAttack };
  }
  return null;
};
const signature = selection => JSON.stringify({ mode: selection.campaignMode, cost: selection.structuralCost,
  parts: selection.parts.map(part => ({ id: part.weaponId, form: part.weapon.activeFormId, profile: part.profile,
    traits: part.traits, hands: part.weapon.hands, range: part.range.rangeName,
    zoneTraits: part.weapon.campaignZoneTraits, penetration: part.weapon.campaignPenetration ?? part.weapon.penetration ?? part.weapon.perforante })) });
const appendHistory = (combat, event) => ({ ...combat, history: [...(combat.history || []).slice(-39), event] });
const makePractice = items => {
  let combat = createCanvasCombatState(items, { rulesSystem: 'campaign', includeNonParticipants: true });
  Object.values(combat.participants).forEach(p => {
    if (p.side === 'players' && p.awaitingRoll) combat = rollParticipantActionDice(combat, p.tokenId);
  });
  return combat;
};

export const useCampaignAttackRuntime = options => {
  const latest = useRef(options); latest.current = options;
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const failureRef = useRef(null);
  const [retry, setRetry] = useState(0);
  const [dismissed, setDismissed] = useState(null);
  const generation = useRef(0);
  const operations = useRef({});
  const scene = options.activeScenario;
  const enabled = getCanvasSystem(scene) === 'campaign';
  const read = () => latest.current.activeScenarioRef?.current || latest.current.activeScenario;
  const control = token => canControlCampaignToken(token, latest.current);
  const setLocalDraft = value => { draftRef.current = value; setDraft(value); };
  const notify = message => latest.current.triggerToast?.('Ataque de Campaña', message, 'warning');
  const publish = saved => {
    if (!saved || latest.current.activeScenario?.id !== saved.id) return;
    if (latest.current.activeScenarioRef) latest.current.activeScenarioRef.current = saved;
    latest.current.setActiveScenario(current => current?.id === saved.id ? { ...current, ...saved } : current);
  };
  const run = async (key, action) => {
    if (busyRef.current) return false;
    const epoch = generation.current;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const value = await action();
      if (epoch === generation.current) failureRef.current = null;
      return value;
    } catch (cause) {
      if (epoch === generation.current) {
        failureRef.current = key;
        setError(cause.message || 'No se pudo guardar el intercambio. Puedes reintentarlo.');
      }
      return false;
    } finally { busyRef.current = false; if (epoch === generation.current) setBusy(false); }
  };
  const transact = async (attackId, transform, parentId) => {
    const context = latest.current, scenarioId = read()?.id;
    assert(scenarioId && attackId, 'El encuentro o el ataque ya no está abierto.');
    const sceneRef = doc(db, context.scenarioCollectionName, scenarioId);
    const receiptRef = doc(db, context.scenarioCollectionName, scenarioId, 'campaignAttacks', attackId);
    const saved = await runTransaction(db, async transaction => {
      const refs = [sceneRef, receiptRef, ...(parentId ? [doc(db, context.scenarioCollectionName, scenarioId, 'campaignAttacks', parentId)] : [])];
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      assert(snapshots[0].exists(), 'El encuentro ha sido eliminado.');
      const fresh = { ...snapshots[0].data(), id: scenarioId };
      assert(getCanvasSystem(fresh) === 'campaign', 'El encuentro ya no utiliza Campaña.');
      const receipt = snapshots[1].exists() ? snapshots[1].data() : null;
      const parent = snapshots[2]?.exists() ? snapshots[2].data() : null;
      const changed = await transform(fresh, receipt, parent);
      if (!changed?.patch) return fresh;
      const lastModified = Math.max(Date.now(), Number(fresh.lastModified || 0) + 1);
      const patch = sanitize({ ...changed.patch, lastModified });
      transaction.update(sceneRef, patch);
      if (changed.receipt) transaction.set(receiptRef, sanitize(changed.receipt), { merge: true });
      if (changed.parentReceipt) transaction.set(refs[2], sanitize(changed.parentReceipt), { merge: true });
      if (changed.log) transaction.set(doc(db, 'combat_log', `campaign-${scenarioId}-${attackId}`), {
        ...sanitize(changed.log), timestamp: serverTimestamp(),
      });
      return { ...fresh, ...patch };
    });
    publish(saved);
    return saved;
  };

  useEffect(() => {
    generation.current += 1;
    draftRef.current = null; setDraft(null); setDismissed(null); setError(''); failureRef.current = null;
  }, [scene?.id, scene?.rulesSystem]);

  const getAttackOptions = (token, targetId) => {
    const current = read();
    return getCampaignAttackOptions({ attacker: find(current, token?.id) || token, target: find(current, targetId),
      items: current?.items || [], gridConfig: latest.current.gridConfig });
  };
  const beginAttackDraft = ({ attackerId, targetId, weapon, responseTo } = {}) => {
    if (!enabled || busyRef.current || draftRef.current) return false;
    const current = read(), attacker = find(current, attackerId), target = find(current, targetId);
    if (!control(attacker)) { notify('No controlas la ficha atacante.'); return false; }
    const pending = pendingContext(current);
    const response = Boolean(responseTo);
    if (response ? pending?.pending.id !== responseTo || pending.pending.status !== 'resolved' || !pending.pending.result?.counter
      || pending.pending.targetId !== attackerId || pending.pending.attackerId !== targetId
      : current.canvasCombat?.pendingAttack || current.canvasPracticeCombat?.pendingAttack || current.canvasCombat?.arcaneChain) {
      notify('Resuelve el intercambio pendiente antes de iniciar otro.'); return false;
    }
    const practice = response ? pending.field === 'canvasPracticeCombat' : current.canvasCombat?.status !== 'active';
    const combat = response ? pending.combat : practice ? makePractice(current.items) : current.canvasCombat;
    if (needsBleedingChoice(attacker, combat)) { notify('Resuelve primero el Sangrado de esta ficha.'); return false; }
    const selection = resolveCampaignAttackSelection({ attacker, target, selection: weapon, items: current.items, gridConfig: latest.current.gridConfig });
    if (!selection.legal) { notify(selection.reason); return false; }
    try {
      assertCampaignAttackTurn(attacker, current, combat, practice, response);
      assert(!combat.participants[targetId]?.awaitingRoll, 'El objetivo aún está preparando su iniciativa.');
      const resources = response ? pending.pending.defense.resources : getCampaignResources(attacker, combat).filter(r => !r.spent);
      assert(resources.length >= selection.actionCost, 'No quedan recursos suficientes para este ataque.');
      setLocalDraft({ id: campaignNonce(), attackerId, targetId, weapon: selection.weapon,
        selection, practice, practiceCombat: practice ? combat : null,
        practiceBaseId: current.canvasPracticeCombat?.startedAt || null,
        responseTo: responseTo || null, reusedResources: response ? resources : null,
        phase: 'prepare', resourceIds: [], zones: [], assignments: [], selectionSignature: signature(selection),
        combatStartedAt: combat.startedAt, combatRound: combat.round });
      setError(''); setDismissed(null); return true;
    } catch (cause) { notify(cause.message); return false; }
  };

  const getDraftContext = (fresh, d) => {
    assert(d && getCanvasSystem(fresh) === 'campaign', 'La preparación ya no está disponible.');
    const attacker = find(fresh, d.attackerId), target = find(fresh, d.targetId);
    assert(control(attacker), 'No controlas esta ficha.');
    const field = d.practice ? 'canvasPracticeCombat' : 'canvasCombat';
    const current = fresh[field];
    if (d.practice) assert(fresh.canvasCombat?.status !== 'active', 'El combate ha comenzado; prepara el ataque con sus recursos actuales.');
    const combat = d.responseTo || d.prepaid ? current : d.practice ? d.practiceCombat : current;
    assert(combat, 'Los recursos de combate han cambiado.');
    if (d.prepaid) assert(current?.pendingAttack?.id === d.id && current.pendingAttack.status === 'awaiting-zones', 'El reparto ya no está disponible.');
    else if (d.responseTo) assert(current.pendingAttack?.id === d.responseTo && current.pendingAttack.status === 'resolved'
      && current.pendingAttack.result?.counter && !current.pendingAttack.response, 'El contraparry ya no está disponible.');
    else if (!d.prepaid) {
      assert(!fresh.canvasCombat?.pendingAttack && !fresh.canvasPracticeCombat?.pendingAttack, 'Otro ataque ya está pendiente.');
      if (d.practice) assert((current?.startedAt || null) === d.practiceBaseId, 'La práctica ha cambiado en otra sesión. Vuelve a prepararla.');
    }
    if (!d.practice && !d.responseTo && !d.prepaid) assert(combat.startedAt === d.combatStartedAt && combat.round === d.combatRound,
      'La ronda ha cambiado. Vuelve a preparar el ataque.');
    assertCampaignAttackTurn(attacker, fresh, combat, d.practice, Boolean(d.responseTo || d.prepaid));
    assert(!combat.participants[d.targetId]?.awaitingRoll, 'El objetivo aún está preparando su iniciativa.');
    const selection = resolveCampaignAttackSelection({ attacker, target, selection: d.weapon, items: fresh.items, gridConfig: latest.current.gridConfig });
    assert(selection.legal, selection.reason);
    assert(signature(selection) === d.selectionSignature, 'El equipo o el alcance han cambiado; vuelve a preparar el ataque.');
    return { field, combat, attacker, target, selection };
  };
  const customThreat = async (sides, seed, token) => {
    const profile = normalizeCampaignThreatProfile(sides);
    assert(!profile.length || (!latest.current.isPlayerView && token.profileType === 'rogueliteEnemy'), 'Solo el máster puede añadir Amenaza puntual a un PNJ.');
    const random = await campaignRandom(seed);
    return profile.map((die, i) => ({ id: `custom-threat-${i}`, kind: 'threat', source: 'custom', die, label: `Amenaza ${die}`,
      sides: Number(die.slice(1)), value: 1 + Math.floor(random() * Number(die.slice(1))), status: 'available' }));
  };
  const prepare = async (resourceIds, { customDice = [] } = {}) => {
    const d = draftRef.current;
    if (!d || d.phase !== 'prepare') return false;
    try {
      const context = getDraftContext(read(), d);
      const resources = d.reusedResources || selectCampaignResources(context.attacker, context.combat, resourceIds);
      const actionValue = validateCampaignAttackResources(context.attacker, resources, context.selection, Boolean(d.responseTo));
      assert(!customDice.length || (!latest.current.isPlayerView && context.attacker.profileType === 'rogueliteEnemy' && !d.responseTo), 'No puedes añadir Amenaza a este ataque.');
      if (d.selection.campaignMode !== 'heavy') {
        setLocalDraft({ ...d, resourceIds, resources, actionValue, customThreatDice: normalizeCampaignThreatProfile(customDice), phase: 'aim' }); return true;
      }
      // Heavy attacks must pay before seeing the weapon dice to distribute.
      return run(`${d.id}:prepare`, async () => {
        const random = await campaignRandom(campaignNonce());
        const extras = await customThreat(customDice, `${d.id}:threat`, context.attacker);
        const allResources = [...resources, ...extras];
        const rolled = rollCampaignWeapon(d.selection.profile, d.selection.parts[0].traits, random);
        const dice = [...allResources.map(r => ({ ...r, kind: 'action' })), ...rolled];
        const saved = await transact(d.id, (fresh, receipt, parent) => {
          if (receipt) { assert(receipt.status === 'prepared' && fresh[receipt.field]?.pendingAttack?.id === d.id, 'Este intento ya ha terminado.'); return null; }
          const c = getDraftContext(fresh, d);
          if (d.responseTo) assert(parent?.status === 'resolved' && !parent.counterAttackId, 'La respuesta ya se ha utilizado.');
          const selected = d.reusedResources || selectCampaignResources(c.attacker, c.combat, resourceIds);
          sameResources(resources, selected);
          validateCampaignAttackResources(c.attacker, selected, c.selection, Boolean(d.responseTo));
          const paid = d.responseTo ? c.combat : spendCampaignResources(c.combat, d.attackerId, selected);
          const pending = { ...createPending(d, [...selected, ...extras], actionValue + extras.reduce((sum, r) => sum + r.value, 0)), status: 'awaiting-zones', heavyDice: dice };
          return { patch: { [c.field]: { ...paid, pendingAttack: pending } }, receipt: { status: 'prepared', field: c.field },
            ...(d.responseTo ? { parentReceipt: { counterAttackId: d.id } } : {}) };
        }, d.responseTo);
        const p = saved[d.practice ? 'canvasPracticeCombat' : 'canvasCombat'].pendingAttack;
        setLocalDraft({ ...d, resourceIds, resources: p.resources, actionValue: p.actionValue, heavyDice: p.heavyDice,
          prepaid: true, phase: 'aim', zones: [], assignments: p.heavyDice.map(() => 0) });
        return true;
      });
    } catch (cause) { notify(cause.message); return false; }
  };
  const createPending = (d, resources, actionValue) => ({
    kind: 'campaign-attack', id: d.id, status: 'awaiting-defense', attackerId: d.attackerId, targetId: d.targetId,
    attackerName: find(read(), d.attackerId)?.name || '', targetName: find(read(), d.targetId)?.name || '',
    weapon: d.weapon, weaponName: d.weapon.name || d.weapon.nombre,
    attackParts: d.selection.parts, modifierProfile: d.selection.profile.filter(die => die.source === 'Modificador'), campaignMode: d.selection.campaignMode,
    melee: d.selection.parts.every(part => isCampaignMeleeWeapon(part.weapon)),
    ballistic: d.selection.parts.every(part => getCanvasWeaponTraits(part.weapon).some(trait => /balistico/.test(trait)) || part.weapon.campaignProjectile === 'bullets'),
    resources, actionValue, pressure: { total: actionValue, actionPressure: actionValue },
    actionDice: resources.filter(r => r.kind === 'die'), actionDieIds: resources.filter(r => r.kind === 'die').map(r => r.id),
    response: Boolean(d.responseTo), responseTo: d.responseTo, practice: d.practice, createdAt: Date.now(),
  });
  const commit = () => run(`${draftRef.current?.id}:commit`, async () => {
    const d = draftRef.current;
    assert(d?.phase === 'aim', 'Primero prepara el ataque.');
    validateCampaignZones(d.selection, d.zones, d.assignments, d.heavyDice);
    const secret = await rememberCampaignChoice(read().id, d.id, campaignChoicePayload(d.zones, d.assignments));
    setLocalDraft({ ...d, frozen: true });
    const saved = await transact(d.id, async (fresh, receipt, parent) => {
      if (receipt?.status === 'committed') {
        assert(fresh[receipt.field]?.pendingAttack?.id === d.id, 'Este ataque ya ha terminado.'); return null;
      }
      assert(!receipt || (d.prepaid && receipt.status === 'prepared'), 'Este intento ya ha terminado.');
      const c = getDraftContext(fresh, d);
      if (d.responseTo && !d.prepaid) assert(parent?.status === 'resolved' && !parent.counterAttackId, 'El contraparry ya se ha utilizado.');
      const resources = d.reusedResources || (d.prepaid ? c.combat.pendingAttack.resources : selectCampaignResources(c.attacker, c.combat, d.resourceIds));
      sameResources(d.resources, resources);
      const baseActionValue = validateCampaignAttackResources(c.attacker, resources, c.selection, Boolean(d.responseTo));
      const extras = await customThreat(d.customThreatDice || [], `${d.id}:threat`, c.attacker);
      const actionValue = baseActionValue + extras.reduce((sum, r) => sum + r.value, 0);
      const paid = d.prepaid || d.responseTo ? c.combat : spendCampaignResources(c.combat, d.attackerId, resources);
      const pending = { ...createPending(d, [...resources, ...extras], actionValue), commitment: secret.commitment,
        ...(d.prepaid ? { heavyDice: c.combat.pendingAttack.heavyDice } : {}) };
      const combat = appendHistory({ ...paid, pendingAttack: pending }, { id: `${d.id}-queued`, type: 'campaign-attack-queued',
        attackerId: d.attackerId, targetId: d.targetId, attackId: d.id, round: paid.round });
      return { patch: { [c.field]: combat }, receipt: { status: 'committed', field: c.field, commitment: secret.commitment },
        ...(d.responseTo ? { parentReceipt: { counterAttackId: d.id } } : {}) };
    }, d.responseTo);
    setLocalDraft(null); return Boolean(pendingContext(saved));
  });

  const defend = defense => run(`${pendingContext(read())?.pending.id}:defend`, async () => {
    const id = pendingContext(read())?.pending.id;
    assert(id, 'No hay un ataque pendiente.');
    const nonce = campaignNonce();
    const extras = await customThreat(defense.customDice || [], `${id}:defense:${nonce}`, find(read(), pendingContext(read())?.pending.targetId));
    await transact(id, fresh => {
      const c = pendingContext(fresh), p = c?.pending;
      assert(p?.id === id, 'El ataque ha cambiado.');
      assert(control(find(fresh, p.targetId)), 'No controlas la ficha defensora.');
      if (p.defense) return null;
      assert(p.status === 'awaiting-defense', 'La defensa ya está fijada.');
      const selected = validateCampaignDefense({ pending: p, target: find(fresh, p.targetId), combat: c.combat,
        ...defense, extraResources: extras, items: fresh.items, gridConfig: latest.current.gridConfig });
      const paid = spendCampaignResources(c.combat, p.targetId, selected.resources);
      return { patch: { [c.field]: { ...paid, pendingAttack: { ...p, defense: { ...selected, nonce }, status: 'awaiting-reveal' } } } };
    });
    return true;
  });
  const reveal = id => run(`${id}:awaiting-reveal`, async () => {
    const secret = readCampaignChoice(read().id, id);
    assert(secret, 'La elección secreta está en el navegador del atacante. Espera a que vuelva a conectarse.');
    await transact(id, async fresh => {
      const c = pendingContext(fresh), p = c?.pending;
      assert(p?.id === id && control(find(fresh, p.attackerId)), 'Este ataque no te pertenece.');
      if (p.status === 'ready' || p.status === 'resolved') return null;
      assert(p.status === 'awaiting-reveal' && p.defense, 'Primero debe comprometerse la defensa.');
      const revealed = { ...p, reveal: { ...secret.payload, nonce: secret.nonce } };
      assert(await verifyCampaignReveal(revealed), 'La elección secreta no coincide con el ataque fijado.');
      validateCampaignZones({ campaignMode: p.campaignMode }, revealed.reveal.zones, revealed.reveal.assignments, p.heavyDice);
      return { patch: { [c.field]: { ...c.combat, pendingAttack: { ...revealed, status: 'ready' } } } };
    });
    return true;
  });
  const resolve = id => run(`${id}:ready`, async () => {
    const saved = await transact(id, async (fresh, receipt) => {
      const c = pendingContext(fresh), p = c?.pending;
      if (receipt?.status === 'resolved' || receipt?.status === 'closed') return null;
      assert(p?.id === id && p.status === 'ready' && p.defense, 'La revelación aún no está completa.');
      const attacker = find(fresh, p.attackerId), target = find(fresh, p.targetId);
      assert(control(attacker) || control(target), 'No participas en este intercambio.');
      assert(await verifyCampaignReveal(p), 'La revelación del ataque no es válida.');
      validateCampaignZones({ campaignMode: p.campaignMode }, p.reveal.zones, p.reveal.assignments, p.heavyDice);
      assert(target && attacker, 'Falta una de las fichas. El máster puede cancelar el intercambio.');
      if (p.defense.mode === 'evade') {
        assert(getCampaignEvasionDestinations(target, fresh.items, latest.current.gridConfig)
          .some(d => !d.blocked && d.label === p.defense.destination.label), 'El destino de evasión ha quedado bloqueado. El máster puede cancelar el intercambio.');
      }
      const random = await campaignRandom(`${id}:${p.reveal.nonce}:${p.defense.nonce}`);
      const resolution = resolveCampaignAttack({ pending: p, target, random, heavyDice: p.heavyDice });
      const weapons = resolution.counter ? getCampaignCounterWeapons({ defender: resolution.target, attacker, items: fresh.items,
        gridConfig: latest.current.gridConfig, resources: p.defense.resources }) : [];
      const result = { ...resolution, target: undefined, counter: resolution.counter && weapons.length > 0 };
      const items = fresh.items.map(item => item.id === target.id ? resolution.target : item);
      const pending = { ...p, status: 'resolved', result };
      const combat = appendHistory({ ...c.combat, pendingAttack: pending }, { id: `${id}-resolved`, type: 'campaign-attack-resolved',
        attackId: id, attackerId: p.attackerId, targetId: p.targetId, damage: result.damage, round: c.combat.round });
      const log = buildCanvasCombatLog({ pending: { ...p, weaponDiceProfile: result.hits.flatMap(hit => hit.dice),
        weaponResults: result.hits.flatMap(hit => hit.dice.map(die => die.value)), pressure: { total: result.impact, actionPressure: p.actionValue } },
        attacker, target, defenseDice: p.defense.resources,
        resolution: { defense: p.defense.value, finalPressure: result.impact, lifeLost: result.damage, surplus: 0 },
        scenarioId: fresh.id, now: Date.now(), updatedTarget: resolution.target });
      return { patch: { items, [c.field]: combat }, receipt: { status: 'resolved', result, field: c.field },
        log: { ...log, damage: result.damage, finalDamage: result.damage, canvasRoguelite: false, canvasCampaign: true,
          resourcesSpent: [...p.resources.map(r => ({ side: 'attacker', label: p.response ? `Defensa reutilizada · ${r.value}` : `${r.label} · ${r.value}` })),
            ...p.defense.resources.map(r => ({ side: 'target', label: `${r.label} · ${r.value}` }))],
          campaignAttack: { zones: p.reveal.zones,
          defense: p.defense.mode, defenseZones: p.defense.zones, rd: result.rd, hits: result.hits },
          reactionType: ({ parry: 'parar', evade: 'evadir', receive: 'recibir' })[p.defense.mode] } };
    });
    if (pendingContext(saved)?.pending.status === 'resolved') forgetCampaignChoice(saved.id, id);
    return true;
  });
  const close = () => {
    if (draftRef.current) {
      if (draftRef.current.prepaid) { notify('Este reparto ya ha gastado sus recursos. Fija las zonas o pide al máster que lo cancele.'); return false; }
      const responseTo = draftRef.current.responseTo;
      setLocalDraft(null); setError('');
      if (!responseTo) return true;
      return true;
    }
    const c = pendingContext(read()), p = c?.pending;
    if (!p || p.status !== 'resolved') return false;
    if (p.result.counter && !control(find(read(), p.targetId))) { setDismissed(p.id); return true; }
    return run(`${p.id}:close`, async () => {
      await transact(p.id, fresh => {
        const next = pendingContext(fresh), pending = next?.pending;
        if (pending?.id !== p.id) return null;
        assert(pending.status === 'resolved' && (control(find(fresh, pending.targetId))
          || (!pending.result.counter && control(find(fresh, pending.attackerId)))), 'La respuesta la decide el defensor.');
        return { patch: { [next.field]: { ...next.combat, pendingAttack: null }, lastCampaignAttack: pending }, receipt: { status: 'closed' } };
      });
      setDismissed(p.id); return true;
    });
  };
  const cancelPending = () => run(`${pendingContext(read())?.pending.id}:cancel`, async () => {
    assert(!latest.current.isPlayerView, 'Solo el máster puede cancelar el intercambio.');
    const id = pendingContext(read())?.pending.id;
    await transact(id, fresh => {
      const c = pendingContext(fresh), p = c?.pending;
      assert(p?.id === id && p.status !== 'resolved', 'Este intercambio ya se ha resuelto.');
      let combat = p.response ? c.combat : restoreCampaignResources(c.combat, p.attackerId, p.resources);
      if (p.defense) combat = restoreCampaignResources(combat, p.targetId, p.defense.resources);
      return { patch: { [c.field]: { ...combat, pendingAttack: null } }, receipt: { status: 'cancelled' } };
    });
    forgetCampaignChoice(read().id, id); setLocalDraft(null); return true;
  });

  const context = pendingContext(scene), pending = context?.pending;
  const controlledTokenIds = (scene?.items || []).filter(control).map(token => token.id);
  const canView = pending && (controlledTokenIds.includes(pending.attackerId) || controlledTokenIds.includes(pending.targetId));
  const maySee = id => control(find(scene, id));
  const visiblePending = canView && pending.id !== dismissed ? campaignAttackForViewer(pending, maySee) : null;
  const result = visiblePending?.status === 'resolved' ? visiblePending : null;
  operations.current = { reveal, resolve };
  useEffect(() => {
    if (!enabled || !pending || busyRef.current || failureRef.current === `${pending.id}:${pending.status}`) return;
    if (pending.status === 'awaiting-reveal' && controlledTokenIds.includes(pending.attackerId)
      && readCampaignChoice(scene.id, pending.id)) void operations.current.reveal(pending.id);
    else if (pending.status === 'ready' && canView) void operations.current.resolve(pending.id);
  }, [enabled, scene?.id, pending?.id, pending?.status, busy, retry, canView, controlledTokenIds.join('|')]);

  // Reopen an interrupted prepaid heavy distribution from the persisted dice.
  useEffect(() => {
    if (!enabled || draftRef.current || pending?.status !== 'awaiting-zones' || !controlledTokenIds.includes(pending.attackerId)) return;
    const attacker = find(scene, pending.attackerId), target = find(scene, pending.targetId);
    const selection = resolveCampaignAttackSelection({ attacker, target, selection: pending.weapon, items: scene.items, gridConfig: options.gridConfig });
    if (selection.legal) setLocalDraft({ ...pending, selection, selectionSignature: signature(selection),
      practice: context.field === 'canvasPracticeCombat', prepaid: true, phase: 'aim', resources: pending.resources,
      reusedResources: pending.response ? pending.resources : null,
      resourceIds: pending.resources.map(r => r.id), zones: [], assignments: pending.heavyDice.map(() => 0) });
  }, [enabled, pending?.id, pending?.status]);

  const currentCombat = draft?.prepaid ? context?.combat : draft?.practice ? draft.practiceCombat || context?.combat : context?.combat || scene?.canvasCombat;
  const attackResources = draft ? draft.reusedResources || getCampaignResources(find(scene, draft.attackerId), currentCombat) : [];
  return {
    campaignRules: true, attackDraft: draft, campaignDraft: draft, campaignPending: visiblePending, campaignResult: result,
    pendingAttack: campaignAttackForViewer(pending, maySee) || options.base?.pendingAttack || null,
    combatState: campaignCombatForViewer(currentCombat || options.base?.combatState, maySee),
    controlledTokenIds, campaignBusy: busy, campaignError: error,
    campaignCanControl: control, campaignCanSeeResources: token => Boolean(token && maySee(token.id)), campaignAttackResources: attackResources, campaignGridConfig: options.gridConfig,
    campaignVisible: Boolean(draft || visiblePending),
    campaignFocusTargetId: draft?.phase === 'aim' ? draft.targetId : visiblePending ? visiblePending.targetId : null,
    beginAttackDraft, getAttackOptions,
    getWeaponAvailability: (token, weapon) => {
      const c = read()?.canvasCombat;
      if (pendingContext(read())) return { available: false, reason: 'Resuelve primero el intercambio pendiente.' };
      const cost = token?.profileType === 'rogueliteEnemy' ? 1 : getCanvasWeaponActionCost(weapon);
      if (!c || c.status !== 'active') return { available: Number(token?.stats?.vida?.current) > 0, cost, reason: '' };
      return { available: getCampaignResources(token, c).filter(r => !r.spent).length >= cost,
        cost, reason: 'No quedan recursos suficientes.' };
    },
    prepareCampaignAttack: prepare, commitCampaignAttack: commit, commitCampaignDefense: defend,
    updateCampaignDraft: changes => { if (!busyRef.current && draftRef.current && !draftRef.current.frozen
      && !(draftRef.current.prepaid && changes.phase === 'prepare')) setLocalDraft({ ...draftRef.current, ...changes }); },
    cancelAttackDraft: close, closeCampaignAttack: close, cancelPendingAttack: cancelPending,
    retryCampaignAttack: () => { failureRef.current = null; setError(''); setRetry(value => value + 1); },
    getCampaignCounterWeapons: () => result ? getCampaignCounterWeapons({ defender: find(scene, result.targetId), attacker: find(scene, result.attackerId),
      items: scene.items, gridConfig: options.gridConfig, resources: result.defense.resources }) : [],
    beginCampaignCounter: weapon => result && beginAttackDraft({ attackerId: result.targetId, targetId: result.attackerId, weapon, responseTo: result.id }),
  };
};

