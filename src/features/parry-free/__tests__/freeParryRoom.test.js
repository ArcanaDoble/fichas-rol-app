import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { applyRoomCommand, emptyRoom, memberOnline, removeRoomPlayer, roomMember } from '../freeParryRoom';
import { preparePrivateChoice, projectGame, verifiedGameResult } from '../freeParryProtocol';
import { memoryStorage } from '../testing/memoryFirestore';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value:webcrypto, configurable:true });
  globalThis.TextEncoder = TextEncoder;
});
const people = [{ controllerId:'master', name:'Tirador' }, { controllerId:'player:A', name:'Germán' }, { controllerId:'player:B', name:'Yuuzu' }];
async function joined() {
  let room = emptyRoom();
  for (const person of people) room = await applyRoomCommand(room, person.controllerId, { type:'join', person }, 1000);
  return room;
}
async function finish(room) {
  const game = room.current;
  const a = await preparePrivateChoice(game, game.participantIds[0], 'izquierda', memoryStorage());
  const b = await preparePrivateChoice(game, game.participantIds[1], 'centro', memoryStorage());
  for (const [id, event] of [[game.participantIds[0], { type:'commit', commitment:a.commitment }], [game.participantIds[1], { type:'commit', commitment:b.commitment }],
    [game.participantIds[0], { type:'reveal', reveal:a }], [game.participantIds[1], { type:'reveal', reveal:b }]]) {
    room = await applyRoomCommand(room, id, { ...event, roundId:game.roundId, sessionId:game.sessionId }, 1001);
  }
  return room;
}

test('only joined, connected members can be targeted and reopening preserves the represented character', async () => {
  let room = await joined();
  await expect(applyRoomCommand(room, 'master', { type:'start', targetId:'player:missing', nextRoundId:'round' }, 1001)).rejects.toThrow(/conectado/);
  await expect(applyRoomCommand(room, 'master', { type:'start', targetId:'master', nextRoundId:'round' }, 1001)).rejects.toThrow(/diferentes/);
  await expect(applyRoomCommand(room, 'master', { type:'start', targetId:'player:A', nextRoundId:'round' }, 122000)).rejects.toThrow(/conectado/);
  expect(memberOnline(roomMember(room, 'player:A'), 122000)).toBe(false);
  room = await applyRoomCommand(room, 'master', { type:'rename', person:{ name:'Bandido', controllerId:'player:A' } }, 1001);
  room = await applyRoomCommand(room, 'master', { type:'join', person:{ name:'Máster' } }, 1002);
  expect(roomMember(room, 'master')).toMatchObject({ name:'Bandido', controllerId:'master' });
});

test('spectators receive no private choice or result until both valid reveals exist', async () => {
  let room = await joined();
  room = await applyRoomCommand(room, 'master', { type:'start', targetId:'player:A', nextRoundId:'round' }, 1001);
  const game = room.current;
  const secret = await preparePrivateChoice(game, 'master', 'derecha', memoryStorage());
  room = await applyRoomCommand(room, 'master', { type:'commit', roundId:game.roundId, sessionId:game.sessionId, commitment:secret.commitment }, 1002);
  expect(projectGame(room.current, 'player:B', secret, null, true)).toMatchObject({ observer:true, ownChoice:null, ownLocked:false, result:null });
  await expect(applyRoomCommand(room, 'master', { type:'reveal', roundId:game.roundId, sessionId:game.sessionId, reveal:secret }, 1002)).rejects.toThrow(/Ambos/);
  expect(room.history).toHaveLength(0);
});

test('completed exchanges form a bounded public history and old commands cannot cancel a new exchange', async () => {
  let room = await joined();
  const legacyHistory = [];
  for (let index = 0; index < 21; index += 1) {
    room = await applyRoomCommand(room, 'master', { type:'start', targetId:'player:A', nextRoundId:`round-${index}` }, 1001);
    room = await finish(room);
    legacyHistory.unshift(room.current);
  }
  expect(room.history.map(game => game.round)).toEqual([21, 20, 19]);
  expect(await verifiedGameResult(room.history[0])).toMatchObject({ attack:'izquierda', parry:'centro', matched:false });
  const trimmed = await applyRoomCommand({ ...room, history:legacyHistory }, 'master', { type:'heartbeat' }, 1002);
  expect(trimmed.history.map(game => game.round)).toEqual([21, 20, 19]);
  expect(trimmed.current).toBe(room.current);
  await expect(applyRoomCommand(room, 'master', { type:'close', roundId:'round-0', sessionId:'round-0' }, 1002)).rejects.toThrow(/ha cambiado/);
});

test('deleting a player clears their membership and exchanges while preserving the other participants', async () => {
  let room = await joined();
  room = await applyRoomCommand(room, 'master', { type:'start', targetId:'player:A', nextRoundId:'first' }, 1001);
  room = await finish(room);
  room = await applyRoomCommand(room, 'master', { type:'start', targetId:'player:B', nextRoundId:'second' }, 1001);
  const cleaned = removeRoomPlayer(room, 'player:A');
  expect(cleaned.memberIds).toEqual(['master', 'player:B']);
  expect(cleaned.history).toHaveLength(0);
  expect(cleaned.current.roundId).toBe('second');
  expect(removeRoomPlayer(room, 'player:B').current).toBeNull();
});
