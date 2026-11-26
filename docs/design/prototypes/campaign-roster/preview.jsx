import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import EnemyModeSelector from '../../../../src/features/roguelite-bestiary/EnemyModeSelector';
import RogueliteBestiaryView from '../../../../src/features/roguelite-bestiary/RogueliteBestiaryView';
import { collection, onSnapshot, seed } from './memoryFirestore';

seed('campaignNpcs/henry', { id: 'henry', name: 'Henry', description: 'Un compañero de viaje que lucha junto al grupo.', image: '/yerma/Taiga.webp', stats: { vida: { current: 36, max: 36 }, iniciativa: { current: 7, max: 7 } } });
seed('gameSettings/canvasVisibility', { activeScenarioId: 'local-campaign' });
seed('canvas_scenarios/local-campaign', { rulesSystem: 'campaign', items: [{ id: 'yerma', type: 'token', profileType: 'campaignCharacter', name: 'Yerma', teamId: 'Compañía del Alba' }] });

function Preview() {
  const [open, setOpen] = useState(new URLSearchParams(location.search).has('editor'));
  return <>
    {open ? <RogueliteBestiaryView variant="campaignNpc" onBack={() => setOpen(false)} armas={[]} armaduras={[]} habilidades={[]} accesorios={[]} />
      : <EnemyModeSelector onBack={() => {}} onSelect={() => setOpen(true)} />}
  </>;
}
createRoot(document.getElementById('root')).render(<Preview />);
// Public deployment feedback from the real Canvas service, displayed outside the product UI.
onSnapshot(collection('canvas_scenarios'), snapshot => {
  const tokens = snapshot.docs.flatMap(entry => entry.data().items || []).filter(token => token.campaignNpcId);
  document.getElementById('deployment').textContent = tokens.length
    ? `Comprobación local · ${tokens.map(token => `${token.name}: ${token.teamId}`).join(' · ')}`
    : 'Comprobación local · Datos en memoria; no se modifica ninguna partida.';
});
