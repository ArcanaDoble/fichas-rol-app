import { applyGameCommand, makeGame, participantSnapshot, seatForViewer, verifiedGameResult } from './freeParryProtocol';

export const FREE_PARRY_ROOM_COLLECTION = 'parryFreeRooms';
export const FREE_PARRY_ROOM_ID = 'main';
export const PARRY_HISTORY_LIMIT = 3;
export const PARRY_PRESENCE_MS = 120000;
export const memberKey = id => encodeURIComponent(id);
export const roomMember = (room, id) => room?.members?.[memberKey(id)] || null;
export const memberOnline = (person, now = Date.now()) => Boolean(person && now - person.lastSeen < PARRY_PRESENCE_MS);
export const emptyRoom = () => ({ schemaVersion:1, members:{}, memberIds:[], current:null, history:[], sequence:0 });

export function removeRoomPlayer(room, viewerId) {
  const members = { ...room.members };
  delete members[memberKey(viewerId)];
  return { ...room, members, memberIds:Object.values(members).map(person => person.controllerId),
    current:room.current?.participantIds.includes(viewerId) ? null : room.current,
    history:room.history.filter(game => !game.participantIds.includes(viewerId)).slice(0, PARRY_HISTORY_LIMIT) };
}

// All commands run against the latest room document inside a transaction.
export async function applyRoomCommand(room, viewerId, event, now = Date.now()) {
  const current = room ? { ...room, history:(room.history || []).slice(0, PARRY_HISTORY_LIMIT) } : emptyRoom();
  const self = roomMember(current, viewerId);
  const key = memberKey(viewerId);
  if (!viewerId) throw new Error('Entra como jugador o máster para jugar.');
  if (event.type === 'join') {
    const person = participantSnapshot({ ...(self && !event.replaceActor ? self : event.person), controllerId:viewerId });
    if (!person.name) throw new Error('Escribe el nombre de tu personaje.');
    const members = { ...current.members, [key]:{ ...person, joinedAt:self?.joinedAt || now, lastSeen:now } };
    return { ...current, members, memberIds:Object.values(members).map(member => member.controllerId) };
  }
  if (!self) throw new Error('Entra en la sala para participar.');
  if (event.type === 'heartbeat') return { ...current, members:{ ...current.members, [key]:{ ...self, lastSeen:now } } };
  if (event.type === 'rename') {
    const person = participantSnapshot({ ...self, ...event.person, controllerId:viewerId, controller:self.controller });
    if (!person.name) throw new Error('Escribe el nombre de tu personaje.');
    return { ...current, members:{ ...current.members, [key]:{ ...self, ...person, lastSeen:now } } };
  }
  const game = current.current;
  const result = game && await verifiedGameResult(game);
  if (event.type === 'leave') {
    const members = { ...current.members };
    delete members[key];
    return { ...current, members, memberIds:Object.values(members).map(member => member.controllerId),
      current:game && seatForViewer(game, viewerId) && game.status === 'active' && !result
        ? { ...game, status:'closed', closedBy:viewerId, updatedAt:now } : game };
  }
  if (event.type === 'start') {
    const target = roomMember(current, event.targetId);
    if (!memberOnline(self, now) || !memberOnline(target, now)) throw new Error('Elige a alguien que esté conectado en la sala.');
    if (game?.status === 'active' && !result) throw new Error('Hay una parada en curso. Espera a que termine.');
    const next = { ...makeGame({ id:`room-${FREE_PARRY_ROOM_ID}`, creator:self, opponent:target,
      roundId:event.nextRoundId, now }), status:'active', round:current.sequence + 1, roomId:FREE_PARRY_ROOM_ID };
    return { ...current, current:next, sequence:next.round };
  }
  if (!game || game.roundId !== event.roundId || game.sessionId !== event.sessionId) throw new Error('La parada ha cambiado. Vuelve a elegir.');
  if (event.type === 'close') {
    if (!seatForViewer(game, viewerId) && viewerId !== 'master') throw new Error('Solo los participantes o el máster pueden cancelar la parada.');
    return { ...current, current:{ ...game, status:'closed', closedBy:viewerId, updatedAt:now } };
  }
  if (event.type === 'next') {
    if (!game.participantIds.every(id => memberOnline(roomMember(current, id), now))) throw new Error('Ambos participantes deben estar en la sala.');
  }
  const next = await applyGameCommand(game, viewerId, event);
  if (next === game) return current;
  const revealed = await verifiedGameResult(next);
  const history = revealed && !current.history.some(item => item.roundId === next.roundId)
    ? [next, ...current.history].slice(0, PARRY_HISTORY_LIMIT) : current.history;
  return { ...current, current:next, history, sequence:Math.max(current.sequence, next.round) };
}
