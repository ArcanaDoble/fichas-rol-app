import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import RogueliteBestiaryView from '../../../../src/features/roguelite-bestiary/RogueliteBestiaryView';
import { seed } from './memoryFirestore';

const samples = [
  ['ghoul', 'Ghoul', 'Una figura demacrada, de carne marchita y ojos consumidos. Sus miembros largos y retorcidos se agitan con una fuerza impropia de un cadáver.', 'enemy'],
  ['fusilero', 'Fusilero', 'Un disparo rompe el silencio.', 'enemy'],
  ['troll', 'Troll', 'Una mole de colmillos y piedra viva.', 'enemy'],
  ['caballero', 'Falso caballero', 'Bajo el oro, una identidad desconocida.', 'ally'],
];
samples.forEach(([id, name, description, allegiance], sortOrder) => seed(`campaignNpcs/${id}`, {
  id, name, description, allegiance, sortOrder, headerLayout: 'square',
  image: `/output/playwright/encounter-art/${id}.png`,
  imageSource: `/output/playwright/encounter-art/${id}.png`,
  headerImage: `/output/playwright/encounter-art/${id}.png`,
}));

function Preview() {
  const [resetKey, setResetKey] = useState(0);
  return <>
    <aside style={{ padding: '12px 24px', color: '#c8aa6e', background: '#0d1421', font: '14px Lato,Arial,sans-serif', borderBottom: '1px solid #354054' }}>
      Prueba local con tus originales · Cambiar arte permite comparar Ilustración completa y Panorámica. Los cambios solo se guardan en esta pestaña.
    </aside>
    <RogueliteBestiaryView key={resetKey} variant="campaignNpc" onBack={() => setResetKey(value => value + 1)} armas={[]} armaduras={[]} habilidades={[]} accesorios={[]} />
  </>;
}
createRoot(document.getElementById('root')).render(<Preview />);
