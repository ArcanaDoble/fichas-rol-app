import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClassList from '../ClassList';
import { CharacterCreatorView } from '../CharacterCreatorView';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(), collection: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
  getDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(), query: jest.fn(),
  setDoc: jest.fn(), where: jest.fn(), writeBatch: jest.fn(),
}));

let records;
let commit;
beforeEach(() => {
  records = new Map();
  commit = jest.fn().mockResolvedValue(undefined);
  const firestore = require('firebase/firestore');
  const reference = (...args) => ({ path: args.filter((entry) => typeof entry === 'string').join('/') });
  window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation((value) => value);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
  firestore.getDoc.mockImplementation(async (ref) => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }));
  firestore.onSnapshot.mockImplementation((ref, onNext) => {
    onNext({ docs: [], empty: true, forEach: () => {} });
    return jest.fn();
  });
  firestore.writeBatch.mockImplementation(() => {
    const pending = [];
    return {
      set: (ref, value) => pending.push([ref.path, value]),
      commit: async () => {
        await commit();
        pending.forEach(([path, value]) => records.set(path, value));
      },
    };
  });
});

const renderLibrary = (owner, initialCharacterName) => render(<ClassList
  collectionPath="characters" ownerFilter={owner} currentUserId={owner}
  isPlayerMode initialCharacterName={initialCharacterName}
  CreatorComponent={CharacterCreatorView} creatorLabel="Personaje"
  onBack={jest.fn()}
/>);

test.each(['LIND', 'gara', 'Personaje adicional'])('%s opens the campaign sheet with an arbitrary existing ID', async (name) => {
  const character = {
    id: `existing-${name}`, owner: 'Propietario', name,
    image: '/portrait.webp', stats: { vida: { current: 4, max: 4 } },
    attributes: { destreza: 'd12' },
    equipment: { weapons: [{ name: 'Arma propia', itemType: 'weapon' }] },
    talents: { title: 'Clave propia', slots: [] },
  };
  require('firebase/firestore').getDocs.mockResolvedValue({
    empty: false, docs: [{ id: character.id, data: () => character }],
  });
  renderLibrary(character.owner, name);
  expect(await screen.findByTestId('campaign-action-dice')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Editar estadísticas' })).toBeEnabled();
  expect(screen.queryByText('ATRIBUTOS')).not.toBeInTheDocument();
  expect(screen.getByText('Ficha de personaje')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar estadísticas' }));
  expect(screen.getByRole('textbox', { name: 'Vida actual' })).toHaveValue('');
  expect(records.size).toBe(0);
  expect(character.stats.vida.max).toBe(4);
  expect(character.talents.title).toBe('Clave propia');
});

test('creation saves both documents together and opens the new campaign sheet with its entered values', async () => {
  renderLibrary('Jugadora');
  fireEvent.click(await screen.findByRole('button', { name: 'Crear nuevo personaje' }));
  expect(screen.queryByText(/Atributos Iniciales|Max Bloques|Postura|Ingenio|Cordura/)).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Portada (Carta)' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Icono (Avatar)' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del Personaje' }), { target: { value: ' Nueva viajera ' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Vida' }), { target: { value: '53' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Mente' }), { target: { value: '8' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Movilidad' }), { target: { value: '4' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Armadura · RD' }), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Dado de acción 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'd8' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Personaje' }));

  expect(await screen.findByTestId('campaign-action-dice')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar estadísticas' }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Vida actual' })).toHaveValue('53'));
  const character = [...records.entries()].find(([key]) => key.startsWith('characters/'))[1];
  const sheet = records.get(`campaignCharacterSheets/${character.id}`);
  expect(commit).toHaveBeenCalledTimes(1);
  expect(records.size).toBe(2);
  expect(character).toMatchObject({ name: 'Nueva viajera', owner: 'Jugadora', systemId: 'campaign-parry' });
  expect(character.attributes).toBeUndefined();
  expect(character.stats).toBeUndefined();
  expect(sheet).toMatchObject({
    owner: 'Jugadora', sourceCharacterId: character.id,
    vida: { current: 53, max: 53 }, mente: { current: 8, max: 8 },
    movilidad: 4, armaduraRd: 0, actionDice: ['d8', null, null],
  });
  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  expect(screen.getByRole('textbox', { name: 'Nombre de la clave' })).toBeInTheDocument();
});

test('failed creation keeps the form and retry creates a complete sheet with undefined values', async () => {
  commit.mockRejectedValueOnce(new Error('offline'));
  renderLibrary('Jugadora');
  fireEvent.click(await screen.findByRole('button', { name: 'Crear nuevo personaje' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del Personaje' }), { target: { value: 'Borrador' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Personaje' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Tus cambios siguen aquí');
  expect(screen.getByRole('textbox', { name: 'Nombre del Personaje' })).toHaveValue('Borrador');
  expect(records.size).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Personaje' }));
  expect(await screen.findByTestId('campaign-action-dice')).toBeInTheDocument();
  expect([...records.entries()].find(([key]) => key.startsWith('campaignCharacterSheets/'))[1]).toMatchObject({
    vida: { current: null, max: null }, mente: { current: null, max: null },
    actionDice: [null, null, null], movilidad: null, armaduraRd: null,
  });
});
