import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { doc, runTransaction } from 'firebase/firestore';
import { addCampaignNpcToActiveCanvas, addRogueliteEnemyToActiveCanvas } from '../canvasSpawn';
import CanvasEquipmentSection from '../../canvas/components/CanvasEquipmentSection';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    runTransaction: jest.fn(),
}));
jest.mock('../../../hooks/useCustomEquipmentImages', () => ({
    ...jest.requireActual('../../../hooks/useCustomEquipmentImages'),
    useCustomEquipmentImages: () => new Map(),
}));

test.each([
    ['campaign', addCampaignNpcToActiveCanvas],
    ['roguelite', addRogueliteEnemyToActiveCanvas],
])('direct deployment preserves and displays the enemy ability art in %s, including reopening a saved token', async (rulesSystem, deploy) => {
    doc.mockImplementation((_db, ...parts) => parts.join('/'));
    let written;
    runTransaction.mockImplementation((_db, callback) => callback({
        get: async ref => ({
            exists: () => true,
            data: () => ref === 'gameSettings/canvasVisibility' ? { activeScenarioId: 'encounter' } : { rulesSystem, items: [] },
        }),
        set: (_ref, patch) => { written = patch; },
    }));
    const template = {
        id: 'succionador', name: 'Succionador', allegiance: 'enemy',
        equipmentSlots: [{ id: 'weapon', name: 'Espada corta', type: 'weapon', icon: 'https://assets.example/espada.webp' }],
        abilitySlots: [
            { id: 'tongue', name: 'Lengua de succión', damage: '2d8', range: 'Intermedio', traits: ['Apresa', 'Derribo', 'Atrae'],
                description: 'Atrae a su objetivo.', image: 'https://assets.example/lengua.webp', imageSource: 'https://assets.example/lengua-original.webp' },
            { id: 'immunity', name: 'Inmunidad a empuje', imageSource: '/habilidades/inmunidad.webp' },
            { id: 'vulnerable', name: 'Vulnerable al perforante' },
        ],
    };
    await deploy(template);
    // Use the stored payload rather than the in-memory template: existing encounters take this path too.
    const token = JSON.parse(JSON.stringify(written.items[0]));
    expect(token.enemyAbilities[0].image).toBe(template.abilitySlots[0].image);
    const { unmount } = render(<CanvasEquipmentSection token={token} />);
    const assertArt = (name, source) => {
        const card = screen.getByRole('heading', { name }).closest('article');
        const image = card.querySelector('img.noma-inventory-card__art');
        expect(image).toHaveAttribute('src', source);
        fireEvent.load(image);
        expect(card.querySelector('.noma-inventory-card__fallback')).toBeNull();
    };
    assertArt('Lengua de succión', template.abilitySlots[0].image);
    assertArt('Inmunidad a empuje', template.abilitySlots[1].imageSource);
    assertArt('Espada corta', template.equipmentSlots[0].icon);
    expect(screen.getByText('Atrae a su objetivo.')).toBeInTheDocument();
    expect(screen.getByText('2d8')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vulnerable al perforante' }).closest('article').querySelector('img')).toBeNull();
    unmount();
    render(<CanvasEquipmentSection token={JSON.parse(JSON.stringify(token))} />);
    assertArt('Lengua de succión', template.abilitySlots[0].image);
});
