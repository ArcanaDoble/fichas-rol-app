import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import {
  applyGameCommand, bothCommitted, choiceCommitment, clearPrivateParryChoices, makeGame, preparePrivateChoice, projectGame, readPrivateChoice, verifiedGameResult,
} from '../freeParryProtocol';
import { memoryStorage } from '../testing/memoryFirestore';
import { PARRY_ZONES } from '../freeParryZones';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value:webcrypto, configurable:true });
  globalThis.TextEncoder = TextEncoder;
});
const player = { controllerId:'player:Ada', name:'Yerma', image:'/yerma/Yerma.webp' };
const master = { controllerId:'master', name:'Tirador' };
const activeGame = () => ({ ...makeGame({ id:'game', creator:player, opponent:master, roundId:'round-1' }), status:'active' });
const commit = async (game, viewer, zone, storage) => {
  const choice = await preparePrivateChoice(game, viewer, zone, storage);
  return { choice, game:await applyGameCommand(game, viewer, { type:'commit', roundId:game.roundId, commitment:choice.commitment }) };
};

test.each([
  [['arriba', 'derecha'], ['arriba', 'centro'], ['arriba'], ['derecha']],
  [PARRY_ZONES, PARRY_ZONES, PARRY_ZONES, []],
  [['izquierda', 'centro'], ['derecha', 'abajo'], [], ['izquierda', 'centro']],
])('varias zonas mantienen el secreto y comparan sus intersecciones: %j / %j', async (attack, parry, coincident, uncovered) => {
  const aStore = memoryStorage(), bStore = memoryStorage();
  const first = await commit(activeGame(), player.controllerId, attack, aStore);
  expect(JSON.stringify(first.game)).not.toContain('zones');
  expect(JSON.stringify(first.game)).not.toContain(first.choice.nonce);
  expect(readPrivateChoice(first.game, player.controllerId, aStore)).toEqual(first.choice);
  expect(projectGame(first.game, 'observer', null, null, true)).toMatchObject({ ownChoice:null, result:null });
  await expect(applyGameCommand(first.game, player.controllerId, { type:'reveal', roundId:first.game.roundId, reveal:first.choice })).rejects.toThrow('Ambos');
  const second = await commit(first.game, 'master', parry, bStore);
  const one = await applyGameCommand(second.game, player.controllerId, { type:'reveal', roundId:second.game.roundId, reveal:first.choice });
  expect(await verifiedGameResult(one)).toBeNull();
  const both = await applyGameCommand(one, 'master', { type:'reveal', roundId:one.roundId, reveal:second.choice });
  expect(await verifiedGameResult(both)).toMatchObject({ coincident, uncovered, matched:coincident.length > 0,
    partial:coincident.length > 0 && uncovered.length > 0 });
});

test('el conjunto fijado no se puede alterar, repetir ni vaciar; el orden no cambia la selección', async () => {
  const storage = memoryStorage();
  const first = await commit(activeGame(), player.controllerId, ['derecha', 'arriba'], storage);
  expect(first.choice.zones).toEqual(['arriba', 'derecha']);
  expect(await preparePrivateChoice(first.game, player.controllerId, ['arriba', 'derecha'], storage)).toEqual(first.choice);
  await expect(preparePrivateChoice(first.game, player.controllerId, ['centro'], storage)).rejects.toThrow('fijada');
  for (const invalid of [[], ['arriba', 'arriba'], ['arriba', 'norte'], Array(6).fill('centro')]) {
    await expect(preparePrivateChoice(activeGame(), player.controllerId, invalid, storage)).rejects.toThrow('No puedes');
  }
  const second = await commit(first.game, 'master', 'centro', memoryStorage());
  for (const reveal of [
    { ...first.choice, zones:['arriba'] },
    { ...first.choice, zones:[...PARRY_ZONES] },
    { ...first.choice, zone:'arriba' },
    { ...first.choice, nonce:'0'.repeat(64) },
  ]) await expect(applyGameCommand(second.game, player.controllerId, { type:'reveal', roundId:second.game.roundId, reveal })).rejects.toThrow('no coincide');
  await expect(applyGameCommand(second.game, 'master', { type:'reveal', roundId:second.game.roundId,
    reveal:{ zones:'centro', nonce:second.choice.nonce } })).rejects.toThrow('no coincide');
  await expect(applyGameCommand(second.game, player.controllerId, { type:'reveal', roundId:second.game.roundId,
    reveal:{ zone:['arriba', 'derecha'], nonce:first.choice.nonce } })).rejects.toThrow('no coincide');
  expect(await choiceCommitment(second.game, 'a', ['derecha', 'arriba'], first.choice.nonce)).toBe(first.choice.commitment);
  expect(await verifiedGameResult({ ...second.game, roundId:'otra-ronda', reveals:{ a:first.choice, b:second.choice } })).toBeNull();
});

test('single confirmation shares an unguessable salted hash and rejects any early reveal', async () => {
  const storage = memoryStorage(), start = activeGame();
  const { game, choice } = await commit(start, player.controllerId, 'arriba', storage);
  expect(JSON.stringify(game)).not.toContain('arriba');
  expect(JSON.stringify(game)).not.toContain(choice.nonce);
  expect(game.commitments.a).toMatch(/^[a-f0-9]{64}$/);
  expect(bothCommitted(game)).toBe(false);
  await expect(applyGameCommand(game, player.controllerId, { type:'reveal', roundId:game.roundId, reveal:choice })).rejects.toThrow('Ambos');
  expect(projectGame(game, 'master', null, null)).toMatchObject({ ownChoice:null, ownLocked:false, result:null });
  const another = await preparePrivateChoice(start, player.controllerId, 'arriba', memoryStorage());
  expect(another.commitment).not.toBe(choice.commitment);
});

test.each([['arriba','arriba',true],['centro','centro',true],['izquierda','abajo',false]])('both orders can reveal %s/%s only after locking', async (attack, parry, matched) => {
  const aStore = memoryStorage(), bStore = memoryStorage();
  const first = await commit(activeGame(), 'master', parry, bStore);
  const second = await commit(first.game, player.controllerId, attack, aStore);
  const game = second.game;
  expect(bothCommitted(game)).toBe(true);
  const oneRevealed = await applyGameCommand(game, 'master', { type:'reveal', roundId:game.roundId, reveal:first.choice });
  expect(await verifiedGameResult(oneRevealed)).toBeNull();
  expect(projectGame(oneRevealed, player.controllerId, second.choice, null).result).toBeNull();
  const both = await applyGameCommand(oneRevealed, player.controllerId, { type:'reveal', roundId:game.roundId, reveal:second.choice });
  expect(await verifiedGameResult(both)).toEqual({ attack, parry, matched });
  await expect(applyGameCommand(both, player.controllerId, { type:'commit', roundId:game.roundId, commitment:'a'.repeat(64) })).rejects.toThrow('fijada');
  const next = await applyGameCommand(both, 'master', { type:'next', roundId:game.roundId, nextRoundId:'round-2', swap:true });
  expect(next).toMatchObject({ round:2, roundId:'round-2', attacker:'b', commitments:{}, reveals:{} });
  expect(await applyGameCommand(next, player.controllerId, { type:'next', roundId:game.roundId, nextRoundId:'round-3' })).toBe(next);
});

test('a forged zone, a forged nonce or a replay in another round cannot pass verification', async () => {
  const first = await commit(activeGame(), player.controllerId, 'centro', memoryStorage());
  const second = await commit(first.game, 'master', 'derecha', memoryStorage());
  await expect(applyGameCommand(second.game, player.controllerId, { type:'reveal', roundId:'round-1', reveal:{ ...first.choice, zone:'arriba' } })).rejects.toThrow('no coincide');
  await expect(applyGameCommand(second.game, player.controllerId, { type:'reveal', roundId:'round-1', reveal:{ ...first.choice, nonce:'0'.repeat(64) } })).rejects.toThrow('no coincide');
  expect(await choiceCommitment({ ...second.game, roundId:'round-2' }, 'a', first.choice.zone, first.choice.nonce)).not.toBe(first.choice.commitment);
  expect(await verifiedGameResult({ ...second.game, reveals:{ a:{ ...first.choice, zone:'arriba' }, b:second.choice } })).toBeNull();
});

test('stale tabs retain the nonce for the actual winning commitment and recover after reopening', async () => {
  const storage = memoryStorage(), start = activeGame();
  const first = await preparePrivateChoice(start, player.controllerId, 'arriba', storage);
  const stale = await preparePrivateChoice(start, player.controllerId, 'abajo', storage);
  const fixed = await applyGameCommand(start, player.controllerId, { type:'commit', roundId:start.roundId, commitment:first.commitment });
  expect(readPrivateChoice(fixed, player.controllerId, storage)).toEqual(first);
  await expect(applyGameCommand(fixed, player.controllerId, { type:'commit', roundId:start.roundId, commitment:stale.commitment })).rejects.toThrow('fijada');
  expect(projectGame(fixed, player.controllerId, null, null).missingSecret).toBe(true);
  expect(storage.keys()).toHaveLength(2);
});

test('missing storage prevents submitting a choice, participants cannot accept their own invitations, and outsiders cannot act', async () => {
  const invited = makeGame({ id:'game', creator:player, opponent:master, roundId:'round-1' });
  await expect(applyGameCommand(invited, player.controllerId, { type:'accept' })).rejects.toThrow('invitada');
  await expect(applyGameCommand(invited, 'player:Intruso', { type:'close' })).rejects.toThrow('No participas');
  await expect(preparePrivateChoice(activeGame(), player.controllerId, 'arriba', { setItem:() => { throw new Error(); } })).rejects.toThrow('No se ha enviado');
  await expect(applyGameCommand({ ...invited, sessionId:'new-session' }, 'master', { type:'close', sessionId:'round-1' })).rejects.toThrow('ha cambiado');
});

test('the invitee can represent an NPC without changing controllers, and deleting a player clears only their private choices', async () => {
  const invited = makeGame({ id:'game', creator:player, opponent:master, roundId:'round-1' });
  const accepted = await applyGameCommand(invited, 'master', { type:'accept', person:{ name:'Henry', image:'/henry.webp', controllerId:'player:Ada' } });
  expect(accepted.participants.b).toMatchObject({ name:'Henry', image:'/henry.webp', controllerId:'master' });
  const storage = memoryStorage();
  await preparePrivateChoice(accepted, 'master', 'derecha', storage);
  await preparePrivateChoice(accepted, player.controllerId, 'izquierda', storage);
  clearPrivateParryChoices(player.controllerId, storage);
  expect(storage.length).toBe(1);
  expect(storage.keys()[0]).toContain(':master:');
});
