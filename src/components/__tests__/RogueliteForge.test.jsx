import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockFirestore = {
  collection: jest.fn(),
  deleteDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({ defaultsSeeded: true }) })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: jest.fn((_reference, callback) => {
    callback({ docs: [] });
    return jest.fn();
  }),
  setDoc: jest.fn(() => Promise.resolve()),
};

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockFirestore.collection(...args),
  deleteDoc: (...args) => mockFirestore.deleteDoc(...args),
  doc: (...args) => mockFirestore.doc(...args),
  getDoc: (...args) => mockFirestore.getDoc(...args),
  getDocs: (...args) => mockFirestore.getDocs(...args),
  increment: jest.fn((value) => value),
  onSnapshot: (...args) => mockFirestore.onSnapshot(...args),
  setDoc: (...args) => mockFirestore.setDoc(...args),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
  getMetadata: jest.fn(),
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadString: jest.fn(),
}));

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));

const RogueliteForge = require('../RogueliteForge').default;

describe('RogueliteForge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockImplementation((_db, name) => ({ name }));
    mockFirestore.deleteDoc.mockResolvedValue();
    mockFirestore.doc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }));
    mockFirestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ defaultsSeeded: true }) });
    mockFirestore.getDocs.mockResolvedValue({ docs: [] });
    mockFirestore.onSnapshot.mockImplementation((_reference, callback) => {
      callback({ docs: [] });
      return jest.fn();
    });
    mockFirestore.setDoc.mockResolvedValue();
  });

  test('muestra categorías tipográficas sin sus antiguos pictogramas', async () => {
    render(<RogueliteForge onBack={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Armas' }).querySelector('svg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Armaduras' }).querySelector('svg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Habilidades' }).querySelector('svg')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Crear nueva arma' }));
    expect(screen.getByText('Vista en inventario').querySelector('svg')).toBeNull();
  });

  test('permite agregar una rareza desde el gestor de la Forja', async () => {
    const onRaritiesChanged = jest.fn(() => Promise.resolve());
    render(<RogueliteForge onBack={jest.fn()} onRaritiesChanged={onRaritiesChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar rarezas' }));
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Ancestral' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'rarities', id: 'Ancestral' }),
      { nombre: 'Ancestral', color: '#64748b' },
    ));
    expect(onRaritiesChanged).toHaveBeenCalled();
  });

  test('crea la escala inicial una sola vez y deja un marcador persistente', async () => {
    mockFirestore.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    const onRaritiesChanged = jest.fn(() => Promise.resolve());
    render(<RogueliteForge onBack={jest.fn()} onRaritiesChanged={onRaritiesChanged} />);

    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'rarities', id: 'Mítica' }),
      { nombre: 'Mítica', color: '#ef4444' },
    ));
    expect(mockFirestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'rogueliteForgeSettings', id: 'rarities' }),
      expect.objectContaining({ defaultsSeeded: true }),
      { merge: true },
    );
    expect(onRaritiesChanged).toHaveBeenCalledTimes(1);
  });

  test('permite crear un término desde el gestor del glosario', async () => {
    const onGlossaryChanged = jest.fn(() => Promise.resolve());
    render(<RogueliteForge onBack={jest.fn()} onGlossaryChanged={onGlossaryChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar glosario' }));
    fireEvent.change(screen.getByPlaceholderText('Nombre del término'), { target: { value: 'Derribo' } });
    fireEvent.change(screen.getByPlaceholderText('Explicación que verá el jugador…'), { target: { value: 'El objetivo queda derribado.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'glossary', id: 'Derribo' }),
      { word: 'Derribo', color: '#c8aa6e', info: 'El objetivo queda derribado.' },
    ));
    expect(onGlossaryChanged).toHaveBeenCalled();
  });
});
