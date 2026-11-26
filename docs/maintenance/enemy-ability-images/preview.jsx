import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, getDoc } from 'firebase/firestore';
import { seed } from '../../design/prototypes/campaign-roster/memoryFirestore';
import { addCampaignNpcToActiveCanvas, addRogueliteEnemyToActiveCanvas } from '../../../src/features/roguelite-bestiary/canvasSpawn';
import CanvasEquipmentSection from '../../../src/features/canvas/components/CanvasEquipmentSection';

const rulesSystem = new URLSearchParams(location.search).get('mode') === 'roguelite' ? 'roguelite' : 'campaign';
seed('gameSettings/canvasVisibility', { activeScenarioId: 'ability-images' });
seed('canvas_scenarios/ability-images', { rulesSystem, items: [], config: { cellWidth: 70, cellHeight: 70 } });
const enemy = {
    id: 'succionador', name: 'Succionador · prueba local', allegiance: 'enemy',
    equipmentSlots: [{ id: 'weapon', name: 'Garras', type: 'weapon', dano: '1d6', icon: location.origin + '/armas/garras.webp' }],
    abilitySlots: [
        { id: 'tongue', name: 'Lengua de succión', damage: '2d8', range: 'Intermedio', traits: ['Apresa', 'Derribo', 'Atrae'],
            image: '/armas/fauces.webp', description: 'La criatura atrae a su objetivo. Ilustración local para comprobar la transferencia de la imagen.' },
        { id: 'immune', name: 'Inmunidad a empuje o derribo', imageSource: '/armas/garras.webp', range: 'Toque', description: 'Segunda habilidad con imagen original guardada.' },
        { id: 'plain', name: 'Habilidad sin ilustración', description: 'Conserva el icono de reserva cuando no tiene imagen.' },
    ],
};
function Preview() {
    const [token, setToken] = useState(null);
    const reopen = async () => {
        const scene = await getDoc(doc({}, 'canvas_scenarios', 'ability-images'));
        setToken(scene.data().items[0]);
    };
    const deploy = async () => {
        await (rulesSystem === 'campaign' ? addCampaignNpcToActiveCanvas : addRogueliteEnemyToActiveCanvas)(enemy);
        await reopen();
    };
    return <main style={{ maxWidth: 460, margin: '0 auto', padding: '24px 16px', color: '#e8ddc4' }}>
        <header style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: 'Cinzel,serif', fontSize: 22 }}>Habilidades del encuentro</h1>
            <p style={{ fontFamily: 'Lato,sans-serif', fontSize: 13, margin: '8px 0 16px' }}>Prueba local · {rulesSystem} · Sin cambios en encuentros reales.</p>
            <button type="button" onClick={deploy} style={{ background: '#c8aa6e', color: '#101421', padding: '12px 18px', marginRight: 8 }}>Añadir enemigo</button>
            <button type="button" onClick={reopen} disabled={!token} style={{ padding: '12px 18px', border: '1px solid #c8aa6e', opacity: token ? 1 : .4 }}>Reabrir encuentro</button>
        </header>
        {token && <CanvasEquipmentSection token={token} onUpdateToken={() => {}} />}
    </main>;
}
createRoot(document.getElementById('root')).render(<Preview />);
