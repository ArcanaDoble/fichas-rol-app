import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import RogueliteClassSection from '../components/RogueliteClassSection';

jest.mock('../../../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

const playerSnapshot = (access) => ({
  exists: () => true,
  data: () => ({ gameAccess: { roguelite: access } }),
});

const classSnapshot = {
  docs: [
    {
      id: 'barbarian',
      data: () => ({
        name: 'Bárbaro',
        level: 8,
        subtitle: 'Furia desatada',
        description: 'Convierte el riesgo en fuerza.',
        roguelite: {
          actionDice: ['d8', 'd6', 'd4'],
          maxLife: 8,
          defenseClass: 7,
          movement: 2,
          initiativeBase: 2,
          resource: { name: 'Furia', maximum: 3 },
        },
      }),
    },
  ],
};

describe('RogueliteClassSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    doc.mockReturnValue({ kind: 'player' });
    collection.mockImplementation((database, ...segments) => ({ kind: segments.join('/') }));
  });

  test('stays hidden for a player without roguelite access', async () => {
    onSnapshot.mockImplementation((reference, next) => {
      next(playerSnapshot({ enabled: false, unlockedClassIds: [] }));
      return jest.fn();
    });

    render(<RogueliteClassSection playerName="Ada" onOpenClass={jest.fn()} />);

    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('roguelite-class-section')).not.toBeInTheDocument();
  });

  test('opens the shared character sheet with a clean personal configuration', async () => {
    const onOpenClass = jest.fn();
    onSnapshot.mockImplementation((reference, next) => {
      if (reference.kind === 'player') {
        next(playerSnapshot({ enabled: true, unlockedClassIds: ['barbarian'] }));
      } else if (reference.kind === 'classes') {
        next(classSnapshot);
      } else {
        next({ docs: [] });
      }
      return jest.fn();
    });

    render(<RogueliteClassSection playerName="Ada" onOpenClass={onOpenClass} />);

    const classButton = await screen.findByRole('button', { name: 'Abrir clase Bárbaro' });
    expect(screen.queryByText('Clase desbloqueada')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Cambiar retrato')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Eliminar clase')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-card-stars').querySelectorAll('svg')).toHaveLength(10);
    expect(screen.getByText('Nivel 1')).toBeInTheDocument();
    fireEvent.click(classButton);

    expect(onOpenClass).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'barbarian',
        owner: 'Ada',
        templateId: 'barbarian',
        level: 1,
        equipment: expect.objectContaining({ weapons: [], armor: [], abilities: [] }),
      }),
      expect.objectContaining({
        mode: 'roguelite',
        collectionPathSegments: ['players', 'Ada', 'rogueliteClasses'],
        updateMainLibrary: false,
      }),
    );
  });

  test('uses the level stored only for that player profile', async () => {
    onSnapshot.mockImplementation((reference, next) => {
      if (reference.kind === 'player') {
        next(playerSnapshot({ enabled: true, unlockedClassIds: ['barbarian'] }));
      } else if (reference.kind === 'classes') {
        next(classSnapshot);
      } else if (reference.kind === 'players/Ada/rogueliteClasses') {
        next({ docs: [{ id: 'barbarian', data: () => ({ level: 6 }) }] });
      } else {
        next({ docs: [] });
      }
      return jest.fn();
    });

    render(<RogueliteClassSection playerName="Ada" onOpenClass={jest.fn()} />);

    expect(await screen.findByText('Nivel 6')).toBeInTheDocument();
  });
});
