import React from 'react';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FreeParryEntry, FreeParryProvider, useFreeParry } from '../FreeParryProvider';
import MasterMenu from '../../../components/MasterMenu';
import { freeParryService } from '../freeParryService';
import { preparePrivateChoice } from '../freeParryProtocol';
import { memoryStorage, readMemoryRecord, resetMemoryFirestore, seedMemoryRecord, writes } from '../testing/memoryFirestore';
import { memberKey, memberOnline, PARRY_PRESENCE_MS, roomMember } from '../freeParryRoom';

jest.mock('firebase/firestore', () => require('../testing/memoryFirestore'));
jest.mock('../../../firebase', () => ({ db:{} }));
jest.mock('../../canvas/components/CanvasCombatDetails', () => ({ ActionDieButton:() => null }));
beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value:webcrypto, configurable:true });
  globalThis.TextEncoder = TextEncoder;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open',''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(resetMemoryFirestore);
const people = [
  { controllerId:'master', controller:'Máster', name:'Tirador' },
  { controllerId:'player:Ada', controller:'Ada', name:'Yerma', image:'/yerma/Yerma.webp' },
  { controllerId:'player:Bea', controller:'Bea', name:'Yuuzu' },
];
const roomPath = 'parryFreeRooms/main';
const command = (person, game, event, service = freeParryService) => service.roomCommand(person.controllerId, { ...event, roundId:game.roundId, sessionId:game.sessionId });
const mountRoom = () => {
  const stores = people.map(() => memoryStorage());
  const mounted = render(<>{people.map((person, index) => <div key={person.controllerId} data-testid={`client-${index}`}>
    <FreeParryProvider initialConfig={{ viewer:person }} storage={stores[index]}><FreeParryEntry actor={person} /></FreeParryProvider>
  </div>)}</>);
  return { ...mounted, stores, clients:people.map((person, index) => within(screen.getByTestId(`client-${index}`))) };
};
async function enter(clients) {
  for (let index = 0; index < clients.length; index += 1) {
    fireEvent.click(clients[index].getByRole('button', { name:`Abrir Parry libre con ${people[index].name}` }));
    await clients[index].findByRole('textbox', { name:'Tu personaje' });
  }
  await clients[0].findByRole('button', { name:'Atacar a Yuuzu' });
}
async function choose(client, zone) {
  fireEvent.click(client.getByRole('radio', { name:zone, exact:true }));
  fireEvent.click(client.getByRole('button', { name:'Fijar elección', exact:true }));
  await client.findByRole('img', { name:`Tu elección fijada: ${zone}` });
}

test('máster y jugador seleccionan varias zonas sin mostrarlas al espectador y revelan una coincidencia parcial', async () => {
  const { clients, stores } = mountRoom();
  await enter(clients);
  fireEvent.click(clients[0].getByRole('button', { name:'Atacar a Yerma' }));
  await clients[0].findByRole('radiogroup', { name:'Zona de ataque' });
  fireEvent.click(clients[0].getByRole('button', { name:'Varias zonas' }));
  fireEvent.click(clients[0].getByRole('button', { name:'Todas', exact:true }));
  expect(clients[0].getAllByRole('checkbox').filter(input => input.getAttribute('aria-checked') === 'true')).toHaveLength(5);
  fireEvent.click(clients[0].getByRole('button', { name:'Todas', exact:true }));
  expect(clients[0].getByRole('button', { name:'Fijar elección' })).toBeDisabled();
  fireEvent.click(clients[0].getByRole('checkbox', { name:'Arriba' }));
  fireEvent.click(clients[0].getByRole('checkbox', { name:'Derecha' }));
  fireEvent.click(clients[0].getByRole('checkbox', { name:'Centro' }));
  fireEvent.click(clients[0].getByRole('checkbox', { name:'Centro' }));
  fireEvent.click(clients[0].getByRole('button', { name:'Fijar elección' }));
  await clients[0].findByRole('img', { name:'Tu elección fijada: Arriba + Derecha' });
  expect(JSON.stringify(readMemoryRecord(roomPath))).not.toContain('arriba');
  expect(JSON.stringify(readMemoryRecord(roomPath))).not.toContain('derecha');
  expect(clients[2].queryByRole('checkbox')).not.toBeInTheDocument();
  expect(clients[2].queryByText('Arriba + Derecha')).not.toBeInTheDocument();
  fireEvent.click(clients[1].getByRole('button', { name:'Varias zonas' }));
  const defense = clients[1].getByRole('group', { name:'Zonas de parry' });
  fireEvent.keyDown(defense, { key:'ArrowUp' });
  expect(clients[1].getByRole('checkbox', { name:'Arriba' })).toHaveFocus();
  fireEvent.click(clients[1].getByRole('checkbox', { name:'Arriba' }));
  fireEvent.click(clients[1].getByRole('checkbox', { name:'Centro' }));
  fireEvent.click(clients[1].getByRole('button', { name:'Fijar elección' }));
  for (const client of clients) await client.findByRole('heading', { name:'Coinciden algunas zonas' });
  expect(readMemoryRecord(roomPath).history).toHaveLength(1);
  expect(clients[2].getByRole('img', { name:'Ataque: Arriba + Derecha. Parry: Arriba + Centro.' })).toBeInTheDocument();
  expect(clients[2].getByText(/Ataque sin coincidencia: Derecha/)).toBeInTheDocument();
  expect(stores[0].length).toBe(1);
});

test('the master can repeatedly reopen Parry from the same menu after closing it', async () => {
  function Menu() {
    const parry = useFreeParry();
    return <MasterMenu onSelect={id => { if (id === 'parry-free') parry.open(); }} onBackToMain={jest.fn()} />;
  }
  render(<FreeParryProvider initialConfig={{ viewer:people[0] }} storage={memoryStorage()}><Menu /></FreeParryProvider>);
  for (let count = 0; count < 3; count += 1) {
    fireEvent.click(screen.getByText('Parry libre', { selector:'h3' }));
    await screen.findByRole('dialog', { name:'Sala de Parry libre' });
    expect(await screen.findByRole('textbox', { name:'Tu personaje' })).toHaveValue('Tirador');
    fireEvent.click(screen.getByRole('button', { name:'Cerrar Parry libre' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }
});

test('three clients enter once, attack without invitations, keep spectator secrets and immediately change target', async () => {
  const { clients } = mountRoom();
  await enter(clients);
  expect(screen.queryByRole('button', { name:/Invitar|Aceptar invitación/i })).not.toBeInTheDocument();
  fireEvent.click(clients[0].getByRole('button', { name:'Atacar a Yerma' }));
  await clients[0].findByRole('radiogroup', { name:'Zona de ataque' });
  await clients[1].findByRole('radiogroup', { name:'Zona de parry' });
  await clients[2].findByRole('heading', { name:'Parada en curso' });
  expect(clients[2].queryByRole('radio')).not.toBeInTheDocument();
  expect(clients[2].queryByRole('button', { name:'Fijar elección' })).not.toBeInTheDocument();
  await choose(clients[0], 'Arriba');
  expect(readMemoryRecord(roomPath).current.reveals).toEqual({});
  expect(JSON.stringify(readMemoryRecord(roomPath))).not.toContain('arriba');
  expect(clients[2].queryByText('Arriba', { exact:true })).not.toBeInTheDocument();
  fireEvent.click(clients[1].getByRole('radio', { name:'Arriba', exact:true }));
  fireEvent.click(clients[1].getByRole('button', { name:'Fijar elección', exact:true }));
  for (const client of clients) await client.findByRole('heading', { name:'Las zonas coinciden' });
  for (const { data } of writes) if (data.current && Object.keys(data.current.reveals).length) expect(Object.keys(data.current.commitments)).toHaveLength(2);
  expect(readMemoryRecord(roomPath).history).toHaveLength(1);
  fireEvent.click(clients[0].getByRole('button', { name:'Cambiar rival' }));
  expect(clients[0].getByRole('heading', { name:'En la sala' })).toHaveFocus();
  fireEvent.click(clients[0].getByRole('button', { name:'Atacar a Yuuzu' }));
  await clients[2].findByRole('radiogroup', { name:'Zona de parry' });
  expect(await clients[1].findByRole('heading', { name:'Parada en curso' })).toBeInTheDocument();
  expect(readMemoryRecord(roomPath).current.round).toBe(2);
  expect(readMemoryRecord(roomPath).memberIds).toHaveLength(3);
  expect(new Set(writes.map(write => write.path))).toEqual(new Set([roomPath]));
  expect(readMemoryRecord(roomPath)).not.toHaveProperty('resources');
});

test('players attack one another and the master, while closing and reloading preserves a fixed choice', async () => {
  const mounted = mountRoom();
  await enter(mounted.clients);
  const player = mounted.clients[1];
  fireEvent.click(player.getByRole('button', { name:'Atacar a Yuuzu' }));
  await player.findByRole('radiogroup', { name:'Zona de ataque' });
  await choose(player, 'Centro');
  fireEvent.click(player.getByRole('button', { name:'Cerrar Parry libre' }));
  fireEvent.click(player.getByRole('button', { name:'Abrir Parry libre con Yerma' }));
  expect(player.getByRole('img', { name:'Tu elección fijada: Centro' })).toBeInTheDocument();
  mounted.unmount();
  render(<FreeParryProvider initialConfig={{ viewer:people[1] }} storage={mounted.stores[1]}><FreeParryEntry /></FreeParryProvider>);
  fireEvent.click(await screen.findByRole('button', { name:'Abrir Parry libre', exact:true }));
  expect(screen.getByRole('img', { name:'Tu elección fijada: Centro' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  const cancel = screen.getByRole('button', { name:'Cancelar parada' });
  await waitFor(() => expect(cancel).toBeEnabled());
  fireEvent.click(cancel);
  await screen.findByRole('heading', { name:'Parada cancelada' });
  fireEvent.click(screen.getByRole('button', { name:'Atacar a Tirador' }));
  await screen.findByRole('radiogroup', { name:'Zona de ataque' });
  expect(readMemoryRecord(roomPath).current.participants.b.controllerId).toBe('master');
});

test('simultaneous starts cannot replace an unresolved round and a spectator cannot play or advance it', async () => {
  for (const person of people) await freeParryService.roomCommand(person.controllerId, { type:'join', person });
  const starts = await Promise.allSettled([
    freeParryService.roomCommand('master', { type:'start', targetId:'player:Ada' }),
    freeParryService.roomCommand('player:Bea', { type:'start', targetId:'master' }),
  ]);
  expect(starts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  const game = readMemoryRecord(roomPath).current;
  await expect(command(people[2], game, { type:'commit', commitment:'a'.repeat(64) })).rejects.toThrow(/No participas/);
  await expect(command(people[2], game, { type:'next' })).rejects.toThrow();
  const first = await preparePrivateChoice(game, 'master', 'centro', memoryStorage());
  const second = await preparePrivateChoice(game, 'player:Ada', 'arriba', memoryStorage());
  await command(people[0], game, { type:'commit', commitment:first.commitment });
  await command(people[1], game, { type:'commit', commitment:second.commitment });
  await command(people[0], game, { type:'reveal', reveal:first });
  await command(people[1], game, { type:'reveal', reveal:second });
  const advances = await Promise.allSettled([command(people[0], game, { type:'next', swap:true }), command(people[1], game, { type:'next', swap:true })]);
  expect(advances.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  expect(readMemoryRecord(roomPath).current).toMatchObject({ round:2, attacker:'b', commitments:{}, reveals:{} });
  expect(readMemoryRecord(roomPath).history).toHaveLength(1);
});

test('leaving cancels an unfinished exchange without revealing, and returning needs no invitation', async () => {
  const { clients } = mountRoom();
  await enter(clients);
  fireEvent.click(clients[0].getByRole('button', { name:'Atacar a Yerma' }));
  await clients[1].findByRole('radiogroup', { name:'Zona de parry' });
  await choose(clients[0], 'Derecha');
  fireEvent.click(clients[1].getByRole('button', { name:'Salir de la sala' }));
  await clients[0].findByRole('heading', { name:'Parada cancelada' });
  expect(readMemoryRecord(roomPath).current.reveals).toEqual({});
  expect(readMemoryRecord(roomPath).history).toHaveLength(0);
  expect(clients[0].queryByRole('button', { name:'Atacar a Yerma' })).not.toBeInTheDocument();
  fireEvent.click(clients[1].getByRole('button', { name:'Abrir Parry libre con Yerma' }));
  await clients[0].findByRole('button', { name:'Atacar a Yerma' });
});

test('a failed reveal reconnects without changing either commitment', async () => {
  for (const person of people) await freeParryService.roomCommand(person.controllerId, { type:'join', person });
  const room = await freeParryService.roomCommand('master', { type:'start', targetId:'player:Ada' });
  const game = room.current, storage = memoryStorage();
  const a = await preparePrivateChoice(game, 'master', 'arriba', memoryStorage());
  const b = await preparePrivateChoice(game, 'player:Ada', 'derecha', storage);
  await command(people[0], game, { type:'commit', commitment:a.commitment });
  await command(people[1], game, { type:'commit', commitment:b.commitment });
  await command(people[0], game, { type:'reveal', reveal:a });
  const commitments = readMemoryRecord(roomPath).current.commitments;
  let failReveal = true;
  const service = { ...freeParryService, roomCommand:async (id, event) => {
    if (event.type === 'reveal' && failReveal) throw new Error('offline');
    return freeParryService.roomCommand(id, event);
  } };
  render(<FreeParryProvider service={service} initialConfig={{ viewer:people[1] }} storage={storage}><FreeParryEntry /></FreeParryProvider>);
  fireEvent.click(await screen.findByRole('button', { name:'Abrir Parry libre', exact:true }));
  await screen.findByText(/No se pudo completar la revelación/);
  expect(screen.queryByText('Ataque · Arriba')).not.toBeInTheDocument();
  failReveal = false;
  fireEvent.click(screen.getByRole('button', { name:'Reintentar conexión' }));
  expect(await screen.findByRole('heading', { name:'Las zonas no coinciden' })).toBeInTheDocument();
  expect(readMemoryRecord(roomPath).current.commitments).toEqual(commitments);
});

test.each([0, 1])('client %i resumes a suspended exchange, renews presence and reveals the original choice', async index => {
  const viewer = people[index], rival = people[1 - index], storage = memoryStorage();
  for (const person of [viewer, rival]) await freeParryService.roomCommand(person.controllerId, { type:'join', person });
  const { current:game } = await freeParryService.roomCommand('master', { type:'start', targetId:people[1].controllerId });
  let suspended = false;
  const listeners = [];
  const service = { ...freeParryService, listenRoom:jest.fn((next, fail) => {
    const listener = { interrupted:false, next };
    listeners.push(listener);
    return freeParryService.listenRoom((...args) => { if (!listener.interrupted) next(...args); }, fail);
  }) };
  const visibility = jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => suspended ? 'hidden' : 'visible');
  try {
    render(<FreeParryProvider service={service} initialConfig={{ viewer }} storage={storage}><FreeParryEntry /></FreeParryProvider>);
    fireEvent.click(screen.getByRole('button', { name:'Abrir Parry libre' }));
    await screen.findByRole('radiogroup');
    await waitFor(() => expect(screen.getByRole('button', { name:'Cancelar parada' })).toBeEnabled());
    await choose(screen, 'Centro');
    const fixed = readMemoryRecord(roomPath);
    expect(fixed.current.reveals).toEqual({});
    expect(JSON.stringify(fixed)).not.toContain('centro');
    const beforeSleep = listeners.length;
    const oldListener = listeners[beforeSleep - 1];
    oldListener.interrupted = true;
    suspended = true;
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => {
      fixed.members[memberKey(viewer.controllerId)].lastSeen = Date.now() - PARRY_PRESENCE_MS - 1;
      seedMemoryRecord(roomPath, fixed);
      const choice = await preparePrivateChoice(game, rival.controllerId, 'izquierda', memoryStorage());
      await command(rival, game, { type:'commit', commitment:choice.commitment });
      await command(rival, game, { type:'reveal', reveal:choice });
    });
    expect(memberOnline(roomMember(readMemoryRecord(roomPath), viewer.controllerId))).toBe(false);
    expect(readMemoryRecord(roomPath).history).toHaveLength(0);
    suspended = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true }));
    });
    await screen.findByRole('heading', { name:'Las zonas no coinciden' });
    const recovered = readMemoryRecord(roomPath);
    expect(listeners).toHaveLength(beforeSleep + 1);
    expect(memberOnline(roomMember(recovered, viewer.controllerId))).toBe(true);
    expect(recovered.current.commitments).toMatchObject(fixed.current.commitments);
    expect(recovered.history.map(entry => entry.roundId)).toEqual([game.roundId]);
    act(() => oldListener.next(fixed));
    expect(screen.getByRole('heading', { name:'Las zonas no coinciden' })).toBeInTheDocument();
    await act(async () => { await command(rival, game, { type:'next', swap:true }); });
    expect(await screen.findByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:'Parada 2' })).toBeInTheDocument();
  } finally {
    visibility.mockRestore();
  }
});

test('an interrupted reveal can finish on the next connection even while the old request is pending', async () => {
  const [master, player] = people, storage = memoryStorage();
  for (const person of [master, player]) await freeParryService.roomCommand(person.controllerId, { type:'join', person });
  const { current:game } = await freeParryService.roomCommand('master', { type:'start', targetId:player.controllerId });
  const attack = await preparePrivateChoice(game, 'master', ['arriba', 'centro'], storage);
  const parry = await preparePrivateChoice(game, player.controllerId, 'centro', memoryStorage());
  await command(master, game, { type:'commit', commitment:attack.commitment });
  await command(player, game, { type:'commit', commitment:parry.commitment });
  await command(player, game, { type:'reveal', reveal:parry });
  let rejectOld;
  const service = { ...freeParryService, roomCommand:(id, event) => {
    if (event.type === 'reveal' && !rejectOld) return new Promise((_, reject) => { rejectOld = reject; });
    return freeParryService.roomCommand(id, event);
  } };
  render(<FreeParryProvider service={service} initialConfig={{ viewer:master }} storage={storage}><FreeParryEntry /></FreeParryProvider>);
  fireEvent.click(screen.getByRole('button', { name:'Abrir Parry libre' }));
  await waitFor(() => expect(rejectOld).toBeDefined());
  fireEvent(window, new Event('online'));
  await screen.findByRole('heading', { name:'Coinciden algunas zonas' });
  await act(async () => rejectOld(new Error('old connection closed')));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  const room = readMemoryRecord(roomPath);
  expect(room.history).toHaveLength(1);
  expect(room.current.commitments).toEqual({ a:attack.commitment, b:parry.commitment });
});
