import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FreeParryEntry, FreeParryProvider } from '../../../../src/features/parry-free/FreeParryProvider';
import { freeParryService } from '../../../../src/features/parry-free/freeParryService';
import { preparePrivateChoice, seatForViewer } from '../../../../src/features/parry-free/freeParryProtocol';
import useFreeParryRoom from '../../../../src/features/parry-free/useFreeParryRoom';
import { memoryStorage, resetMemoryFirestore } from '../../../../src/features/parry-free/testing/memoryFirestore';

const params = new URLSearchParams(location.search);
const people = [
  { controllerId:'master', controller:'Máster', name:'Tirador', image:'/yerma/Taiga.webp' },
  { controllerId:'player:Ada', controller:'Ada', name:'Yerma', image:'/yerma/Yerma.webp', characterId:'yerma' },
  { controllerId:'player:Bea', controller:'Bea', name:'Yuuzu', image:'' },
];
const viewerIndex = params.get('view') === 'master' ? 0 : params.get('view') === 'observer' ? 2 : 1;
const viewer = people[viewerIndex];
const stores = people.map(() => memoryStorage());
resetMemoryFirestore();

function Companion({ index }) {
  const person = people[index], runtime = useFreeParryRoom(person.controllerId, freeParryService, stores[index]);
  const game = runtime.room?.current, inFlight = useRef(new Set());
  useEffect(() => {
    const seat = seatForViewer(game, person.controllerId);
    if (!seat || game.status !== 'active' || game.commitments[seat] || inFlight.current.has(game.roundId)
      || (params.get('stage') === 'watch' && index === 1)) return;
    inFlight.current.add(game.roundId);
    preparePrivateChoice(game, person.controllerId, 'arriba', stores[index])
      .then(choice => freeParryService.roomCommand(person.controllerId, { type:'commit', commitment:choice.commitment, roundId:game.roundId, sessionId:game.sessionId }));
  }, [game, person.controllerId, index]);
  return null;
}
async function start() {
  for (let index = 0; index < people.length; index += 1) if (index !== viewerIndex) {
    await freeParryService.roomCommand(people[index].controllerId, { type:'join', person:people[index] });
  }
  if (viewerIndex === 2) await freeParryService.roomCommand('master', { type:'start', targetId:'player:Ada' });
  createRoot(document.getElementById('root')).render(<>
    {people.map((person, index) => index !== viewerIndex && <Companion key={index} index={index} />)}
    <FreeParryProvider initialConfig={{ viewer }} storage={stores[viewerIndex]}>
      <div className="free-parry" style={{ maxWidth:580, margin:'40px auto', padding:16 }}>
        <p className="parry-eyebrow">Comprobación local · sala de tres participantes</p>
        <h1 style={{ fontFamily:'Cinzel,serif', margin:'16px 0' }}>Ficha · {viewer.name}</h1>
        <FreeParryEntry actor={viewer} variant={viewerIndex === 0 ? 'button' : 'tag'} />
        <p className="parry-helper">Sala, ventana y transacciones reales. Firebase se sustituye por memoria. Los otros dos clientes eligen Arriba automáticamente para esta prueba.</p>
        <nav style={{ display:'flex', gap:18, flexWrap:'wrap', fontSize:16 }}>
          <a href="?view=master">Máster</a><a href="?view=player">Jugador</a><a href="?view=observer&stage=watch">Espectador · zonas ocultas</a><a href="?view=observer">Espectador · resultado</a>
        </nav>
      </div>
    </FreeParryProvider>
  </>);
}
start().catch(error => { document.getElementById('root').textContent = error.message; });
