import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CharacterListView } from '../CharacterListView';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
}));

const emptySnapshot = {
  docs: [],
  empty: true,
  forEach: () => {},
};

beforeEach(() => {
  const firestore = require('firebase/firestore');
  const reference = (...args) => ({
    path: args.filter((argument) => typeof argument === 'string').join('/'),
  });

  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation((ref) => ref);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockResolvedValue(emptySnapshot);
  firestore.onSnapshot.mockImplementation((ref, onNext) => {
    if (ref.path === 'players/Ada') {
      onNext({
        exists: () => true,
        data: () => ({
          gameAccess: {
            roguelite: { enabled: true, unlockedClassIds: ['barbarian'] },
          },
        }),
      });
    } else if (ref.path === 'classes') {
      onNext({
        ...emptySnapshot,
        empty: false,
        docs: [{
          id: 'barbarian',
          data: () => ({
            name: 'Bárbaro',
            image: '',
            subtitle: 'Furia desatada',
            description: 'Furia de prueba',
            roguelite: {
              actionDice: ['d8', 'd6', 'd4'],
              maxLife: 8,
              defenseClass: 7,
              movement: 2,
              initiativeBase: 2,
              resource: { name: 'Furia', maximum: 3, initial: 0 },
            },
          }),
        }],
      });
    } else {
      onNext(emptySnapshot);
    }
    return jest.fn();
  });
});

test('mounts the roguelite card and opens it in the shared character sheet', async () => {
  render(
    <CharacterListView
      playerName="Ada"
      armas={[]}
      armaduras={[]}
      habilidades={[]}
      glossary={[]}
      rarityColorMap={{}}
      onBack={jest.fn()}
    />,
  );

  const classCard = await screen.findByRole('button', { name: 'Abrir clase Bárbaro' });
  expect(classCard).toBeInTheDocument();

  fireEvent.click(classCard);

  await waitFor(() => {
    expect(screen.getByText(/Furia de prueba/)).toBeInTheDocument();
  });

  const actionDice = screen.getByTestId('roguelite-action-dice');
  expect(screen.getByText('DADOS DE ACCIÓN')).toBeInTheDocument();
  expect(actionDice.querySelectorAll('img')).toHaveLength(3);
  expect(actionDice.querySelector('button')).not.toBeInTheDocument();
  expect(screen.queryByText('ATRIBUTOS')).not.toBeInTheDocument();
  expect(screen.queryByText('Editar Retrato')).not.toBeInTheDocument();
  expect(screen.queryByTitle('Click para editar')).not.toBeInTheDocument();
  expect(screen.getByTestId('roguelite-stat-vida')).toHaveTextContent('8 / 8');
  expect(screen.getByTestId('roguelite-stat-cd')).toHaveTextContent('7 / 7');
  expect(screen.getByTestId('roguelite-stat-movimiento')).toHaveTextContent('2 / 2');
  expect(screen.getByTestId('roguelite-stat-iniciativa')).toHaveTextContent('2 / 2');
  expect(screen.getByTestId('roguelite-stat-furia')).toHaveTextContent('0 / 3');

  const progressionNavigation = screen.getByText('PROGRESIÓN');
  expect(screen.queryByText('COLECCIÓN')).not.toBeInTheDocument();
  fireEvent.click(progressionNavigation.closest('button'));

  await waitFor(() => {
    expect(screen.getByTestId('roguelite-progression-level-10')).toBeInTheDocument();
  });
  expect(screen.getByTestId('roguelite-progression-level-1')).toHaveTextContent('Nivel actual');
  expect(screen.getByTestId('roguelite-progression-level-2')).toHaveTextContent('Por desbloquear');
});
