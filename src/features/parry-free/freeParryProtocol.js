import { campaignNonce } from '../canvas/combat/campaignAttackCommitment';
import { compactParryChoice, compareParryZones, normalizeParryZones } from './freeParryZones';
export { PARRY_ZONES } from './freeParryZones';

export const PARRY_SEATS = ['a', 'b'];
export const FREE_PARRY_COLLECTION = 'parryFreeGames';
const secretPrefix = 'noma:parry-free:choice:';
const digest = async value => {
  if (!globalThis.crypto?.subtle) throw new Error('Parry libre necesita HTTPS o localhost.');
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};
export const parryViewerId = (isMaster, playerName) => isMaster ? 'master' : playerName?.trim() ? `player:${playerName.trim()}` : '';
export const otherSeat = seat => seat === 'a' ? 'b' : 'a';
export const seatForViewer = (game, viewerId) => PARRY_SEATS.find(seat => game?.participants?.[seat]?.controllerId === viewerId) || null;
export const bothCommitted = game => game?.status === 'active' && PARRY_SEATS.every(seat => /^[a-f0-9]{64}$/.test(game.commitments?.[seat] || ''));
export const gamePairId = ids => digest(['parry-free-pair-v1', [...ids].sort()]);
export const choiceCommitment = (game, seat, choice, nonce) => {
  const zones = normalizeParryZones(choice);
  const value = compactParryChoice(zones);
  return digest([zones.length > 1 ? 'parry-free-choice-v2' : 'parry-free-choice-v1', game.id, game.roundId, seat, value, nonce]);
};
const revealedZones = choice => {
  if (choice?.zones !== undefined) return choice.zone !== undefined || !Array.isArray(choice.zones)
    ? [] : normalizeParryZones(choice.zones);
  return typeof choice?.zone === 'string' ? normalizeParryZones(choice.zone) : [];
};
export const privateChoiceReveal = choice => ({
  ...(choice.zones ? { zones:[...choice.zones] } : { zone:choice.zone }), nonce:choice.nonce,
});
const secretKey = (game, seat, commitment) => `${secretPrefix}${encodeURIComponent(game.participants[seat].controllerId)}:${game.id}:${game.roundId}:${seat}:${commitment}`;
export function clearPrivateParryChoices(viewerId, storage = globalThis.localStorage) {
  const prefix = `${secretPrefix}${encodeURIComponent(viewerId)}:`;
  for (let index = (storage?.length || 0) - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) storage.removeItem(key);
  }
}

export async function preparePrivateChoice(game, viewerId, zone, storage = globalThis.localStorage) {
  const seat = seatForViewer(game, viewerId);
  const zones = normalizeParryZones(zone);
  if (!seat || game.status !== 'active' || !zones.length) throw new Error('No puedes fijar esa elección en esta ronda.');
  if (game.commitments?.[seat]) {
    const previous = readPrivateChoice(game, viewerId, storage);
    if (!previous || JSON.stringify(revealedZones(previous)) !== JSON.stringify(zones)) throw new Error('Tu elección ya está fijada.');
    return previous;
  }
  const nonce = campaignNonce();
  const commitment = await choiceCommitment(game, seat, zones, nonce);
  const choice = { ...(zones.length === 1 ? { zone:zones[0] } : { zones }), nonce, commitment };
  // Save before sending the hash. Every hash has its own slot, so two tabs
  // cannot overwrite the nonce belonging to the winning transaction.
  try { storage.setItem(secretKey(game, seat, commitment), JSON.stringify(choice)); }
  catch { throw new Error('No se pudo guardar tu elección en este navegador. No se ha enviado.'); }
  return choice;
}
export function readPrivateChoice(game, viewerId, storage = globalThis.localStorage) {
  const seat = seatForViewer(game, viewerId), commitment = game?.commitments?.[seat];
  if (!seat || !commitment) return null;
  try {
    const choice = JSON.parse(storage.getItem(secretKey(game, seat, commitment)) || 'null');
    return choice?.commitment === commitment && revealedZones(choice).length ? choice : null;
  } catch { return null; }
}
export function forgetPrivateChoice(game, viewerId, storage = globalThis.localStorage) {
  const seat = seatForViewer(game, viewerId), commitment = game?.commitments?.[seat];
  if (seat && commitment) try { storage.removeItem(secretKey(game, seat, commitment)); } catch { /* A public result needs no local secret. */ }
}
export async function verifyChoice(game, seat, reveal) {
  const zones = revealedZones(reveal);
  return Boolean(zones.length && /^[a-f0-9]{64}$/.test(reveal?.nonce || '')
    && await choiceCommitment(game, seat, zones, reveal.nonce) === game.commitments?.[seat]);
}
export async function verifiedGameResult(game) {
  if (!bothCommitted(game) || !PARRY_SEATS.every(seat => game.reveals?.[seat])) return null;
  const valid = await Promise.all(PARRY_SEATS.map(seat => verifyChoice(game, seat, game.reveals[seat])));
  if (!valid.every(Boolean)) return null;
  const attack = compactParryChoice(revealedZones(game.reveals[game.attacker]));
  const parry = compactParryChoice(revealedZones(game.reveals[otherSeat(game.attacker)]));
  return compareParryZones(attack, parry);
}
export const participantSnapshot = person => ({
  controllerId: String(person?.controllerId || '').trim(),
  controller: person?.controllerId === 'master' ? 'Máster' : String(person?.controller || 'Jugador'),
  name: String(person?.name || '').trim().slice(0, 80),
  image: typeof person?.image === 'string' ? person.image : '',
  characterId: String(person?.characterId || ''),
});
export function makeGame({ id, creator, opponent, attackFirst = true, roundId, now = Date.now() }) {
  const a = participantSnapshot(creator), b = participantSnapshot(opponent);
  if (!a.controllerId || !b.controllerId || a.controllerId === b.controllerId || !a.name || !b.name) {
    throw new Error('Elige dos participantes controlados por personas diferentes.');
  }
  return { id, sessionId:roundId, schemaVersion:1, participants:{ a, b }, participantIds:[a.controllerId, b.controllerId],
    status:'invited', invitedBy:a.controllerId, round:1, roundId, attacker:attackFirst ? 'a' : 'b',
    commitments:{}, reveals:{}, createdAt:now, updatedAt:now };
}

// Called against the latest transaction snapshot, never against stale UI state.
export async function applyGameCommand(game, viewerId, command) {
  const seat = seatForViewer(game, viewerId);
  if (!seat) throw new Error('No participas en este Parry libre.');
  if (command.sessionId && command.sessionId !== game.sessionId) throw new Error('Esta partida ha cambiado. Vuelve a abrirla.');
  if (command.type === 'close') return game.status === 'closed' ? game : { ...game, status:'closed', closedBy:viewerId, updatedAt:Date.now() };
  if (command.type === 'accept') {
    if (seat !== 'b') throw new Error('Solo la persona invitada puede aceptar.');
    if (game.status !== 'invited') return game;
    const person = command.person ? participantSnapshot({ ...game.participants[seat], ...command.person,
      controllerId:game.participants[seat].controllerId, controller:game.participants[seat].controller }) : game.participants[seat];
    if (!person.name) throw new Error('Escribe el nombre de tu personaje.');
    return { ...game, participants:{ ...game.participants, [seat]:person }, status:'active', updatedAt:Date.now() };
  }
  if (game.status !== 'active') throw new Error('Esta partida ya no está activa.');
  if (game.roundId !== command.roundId) {
    if (command.type === 'next') return game;
    throw new Error('La ronda ha cambiado. Vuelve a elegir.');
  }
  if (command.type === 'commit') {
    if (!/^[a-f0-9]{64}$/.test(command.commitment || '')) throw new Error('La elección no es válida.');
    const current = game.commitments[seat];
    if (current && current !== command.commitment) throw new Error('Tu elección ya está fijada.');
    if (current) return game;
    return { ...game, commitments:{ ...game.commitments, [seat]:command.commitment }, updatedAt:Date.now() };
  }
  if (command.type === 'reveal') {
    if (!bothCommitted(game)) throw new Error('Ambos debéis confirmar antes de revelar.');
    if (!await verifyChoice(game, seat, command.reveal)) throw new Error('La revelación no coincide con la elección fijada.');
    if (game.reveals[seat]) return game;
    return { ...game, reveals:{ ...game.reveals, [seat]:privateChoiceReveal(command.reveal) }, updatedAt:Date.now() };
  }
  if (command.type === 'next') {
    if (!await verifiedGameResult(game)) throw new Error('Espera a que se revelen las dos elecciones.');
    return { ...game, round:game.round + 1, roundId:command.nextRoundId,
      attacker:command.swap ? otherSeat(game.attacker) : game.attacker, commitments:{}, reveals:{}, updatedAt:Date.now() };
  }
  throw new Error('La operación no es válida.');
}

export function projectGame(game, viewerId, privateChoice, result, allowSpectator = false) {
  const seat = seatForViewer(game, viewerId);
  if (!seat && !allowSpectator) return null;
  return {
    observer:!seat,
    number:game.round, attacker:game.attacker, defender:otherSeat(game.attacker), participants:game.participants,
    locked:Object.fromEntries(PARRY_SEATS.map(key => [key, Boolean(game.commitments[key])])),
    ownChoice:seat && game.commitments[seat] && privateChoice ? compactParryChoice(revealedZones(privateChoice)) : null,
    ownLocked:Boolean(game.commitments[seat]), revealed:Boolean(result), result:result || null,
    awaitingReveal:bothCommitted(game) && !result,
    missingSecret:Boolean(game.commitments[seat] && !game.reveals[seat] && !privateChoice),
  };
}
