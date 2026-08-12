import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsersView from '../UsersView';

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

const snapshot = (documents = []) => ({
  docs: documents.map(({ id, ...data }) => ({ id, data: () => data })),
  empty: documents.length === 0,
});

beforeEach(() => {
  const firestore = require('firebase/firestore');
  const reference = (...args) => ({
    path: args.filter((argument) => typeof argument === 'string').join('/'),
  });

  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.setDoc.mockResolvedValue(undefined);
  firestore.updateDoc.mockResolvedValue(undefined);
  firestore.getDocs.mockImplementation(async (ref) => {
    if (ref.path === 'players') {
      return snapshot([{
        id: 'Ada',
        name: 'Ada',
        gameAccess: { roguelite: { enabled: true, unlockedClassIds: ['barbarian'] } },
      }]);
    }
    if (ref.path === 'players/Ada/rogueliteClasses') {
      return snapshot([{
        id: 'barbarian',
        level: 2,
        owner: 'Ada',
        activeRun: {
          id: 'run-1',
          status: 'active',
          classId: 'barbarian',
          owner: 'Ada',
          templateRevision: 1,
          stats: {},
          inventory: {},
        },
      }]);
    }
    if (ref.path === 'classes') return snapshot();
    if (ref.path === 'rogueliteClasses') {
      return snapshot([{
        id: 'barbarian',
        name: 'Bárbaro',
        templateRevision: 2,
        resource: { name: 'Furia', maximum: 3 },
        roguelite: { resource: { name: 'Furia', maximum: 3 } },
        rogueliteProgressionConfigured: true,
        classLevels: [
          { title: 'Furia', effects: [] },
          { title: 'Sed de batalla', effects: [] },
          {
            title: 'Reserva de Furia',
            effects: [{ target: 'resource.max', operation: 'add', value: 1 }],
          },
        ],
      }]);
    }
    return snapshot();
  });
});

test('lets the master confirm a level change for one specific player class', async () => {
  render(<UsersView onBack={jest.fn()} />);

  const levelUp = await screen.findByRole('button', {
    name: 'Subir Bárbaro de Ada al nivel 3',
  });
  fireEvent.click(levelUp);

  expect(screen.getByText('Subir de nivel · 2 → 3')).toBeInTheDocument();
  expect(screen.getByText('Reserva de Furia')).toBeInTheDocument();
  expect(screen.getByText(/Furia máximo: \+1/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  await waitFor(() => {
    expect(require('firebase/firestore').setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'players/Ada/rogueliteClasses/barbarian' }),
      expect.objectContaining({
        templateId: 'barbarian',
        owner: 'Ada',
        profileType: 'rogueliteClass',
        level: 3,
      }),
      { merge: true },
    );
  });
  await waitFor(() => {
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });
});

test('lets the master finish and reset one personal active run', async () => {
  window.confirm = jest.fn(() => true);
  render(<UsersView onBack={jest.fn()} />);

  expect(await screen.findByText('Aventura activa')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar aventura' }));
  await waitFor(() => {
    expect(require('firebase/firestore').setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'players/Ada/rogueliteClasses/barbarian' }),
      expect.objectContaining({ activeRun: null, appliedTemplateRevision: 2 }),
      { merge: true },
    );
  });
});
