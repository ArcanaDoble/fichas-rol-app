import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { collection, onSnapshot } from 'firebase/firestore';
import CanvasItemGeneratorPanel from '../CanvasItemGeneratorPanel';
import { CANVAS_CATALOG_ITEM_ARM_EVENT } from '../../canvasInventoryTransfer';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: jest.fn((_db, name) => ({ name })),
    onSnapshot: jest.fn(),
}));
jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({
    useCustomEquipmentImages: () => new Map([['espada_de_prueba', '/espada.webp']]),
}));
jest.mock('../../../tactical-shared/components/TacticalAssetImage', () => ({
    CanvasAssetImage: ({ src, fallback }) => (src ? <img src={src} alt="" /> : fallback),
    getObjectImage: (item) => (item.nombre === 'Espada de prueba' ? '/espada.webp' : null),
}));

beforeEach(() => {
    collection.mockClear();
    collection.mockImplementation((_db, name) => ({ name }));
    onSnapshot.mockImplementation((reference, onValue) => {
        const data = reference.name === 'weapons'
            ? [{ id: 'sword-1', nombre: 'Espada de prueba', rareza: 'Rara', dano: '1d8' }]
            : [];
        onValue({ docs: data.map((entry) => ({ id: entry.id, data: () => entry })) });
        return jest.fn();
    });
});

test('shows every Forge category and arms a normalized item for touch placement', async () => {
    const setShowSettings = jest.fn();
    const armed = jest.fn();
    window.addEventListener(CANVAS_CATALOG_ITEM_ARM_EVENT, armed);

    render(<CanvasItemGeneratorPanel setShowSettings={setShowSettings} />);

    expect(screen.getByRole('button', { name: 'Armas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objetos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accesorios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Armaduras' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Habilidades' })).toBeInTheDocument();

    const placeButton = await screen.findByRole('button', { name: 'Colocar Espada de prueba en el Canvas' });
    fireEvent.click(placeButton);

    await waitFor(() => expect(armed).toHaveBeenCalledTimes(1));
    expect(armed.mock.calls[0][0].detail).toMatchObject({
        image: '/espada.webp',
        item: {
            name: 'Espada de prueba',
            catalogId: 'sword-1',
            category: 'weapons',
            itemType: 'weapon',
        },
    });
    expect(setShowSettings).toHaveBeenCalledWith(false);

    window.removeEventListener(CANVAS_CATALOG_ITEM_ARM_EVENT, armed);
});
