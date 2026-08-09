import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClassList from '../ClassList';

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

beforeEach(() => {
  const firestore = require('firebase/firestore');
  const reference = (...args) => ({
    path: args.filter((argument) => typeof argument === 'string').join('/'),
  });
  const classSnapshot = {
    empty: false,
    docs: [{
      id: 'barbarian',
      data: () => ({
        name: 'Bárbaro',
        subtitle: 'Furia desatada',
        description: 'Convierte el riesgo en fuerza.',
        roguelite: {
          actionDice: ['d8', 'd6', 'd4'],
          lifeInitial: 6,
          maxLife: 8,
          defenseClass: 2,
          maxDefenseClass: 3,
          movement: 2,
          maxMovement: 3,
          initiativeBase: 2,
          maxInitiative: 4,
          resource: { name: 'Furia', maximum: 3, initial: 1 },
        },
      }),
    }],
  };

  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation((ref) => ref);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockResolvedValue(classSnapshot);
  firestore.onSnapshot.mockImplementation((ref, onNext) => {
    onNext({ docs: [], empty: true, forEach: () => {} });
    return jest.fn();
  });
});

test('uses the editable roguelite summary for the master class sheet', async () => {
  render(
    <ClassList
      onBack={jest.fn()}
      armas={[]}
      armaduras={[]}
      habilidades={[]}
      glossary={[]}
      rarityColorMap={{}}
    />,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Abrir Bárbaro' }));

  await waitFor(() => {
    expect(screen.getByText('DADOS DE ACCIÓN')).toBeInTheDocument();
  });

  const actionDice = screen.getByTestId('roguelite-action-dice');
  expect(actionDice.querySelectorAll('button')).toHaveLength(3);
  expect(screen.queryByText('ATRIBUTOS DE CLASE')).not.toBeInTheDocument();
  expect(screen.queryByText('POSTURA')).not.toBeInTheDocument();
  expect(screen.queryByText('INGENIO')).not.toBeInTheDocument();
  expect(screen.queryByText('CORDURA')).not.toBeInTheDocument();
  expect(screen.getByText('Editar Retrato')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Vida' })).not.toBeInTheDocument();
  expect(screen.getByTestId('roguelite-stat-cd')).toBeInTheDocument();
  expect(screen.getByTestId('roguelite-stat-movimiento')).toBeInTheDocument();
  expect(screen.getByTestId('roguelite-stat-iniciativa')).toBeInTheDocument();
  expect(screen.getByLabelText('Vida inicio: 6')).toBeInTheDocument();
  expect(screen.getByLabelText('Vida máx.: 8')).toBeInTheDocument();
  expect(screen.getByLabelText('Movimiento inicio: 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Movimiento máx.: 3')).toBeInTheDocument();
  expect(screen.getByLabelText('Furia inicio: 1')).toBeInTheDocument();
  expect(screen.getByLabelText('Furia máx.: 3')).toBeInTheDocument();

  const lifeEditor = screen.getByTestId('roguelite-stat-editor-vida');
  within(lifeEditor).getAllByRole('button').forEach((button) => {
    expect(button).toHaveClass('h-7', 'w-7');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Vida inicio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Vida máx.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar CD máx.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Movimiento máx.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Iniciativa máx.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Furia máx.' }));
  expect(screen.getByLabelText('Vida inicio: 7')).toBeInTheDocument();
  expect(screen.getByLabelText('Vida máx.: 9')).toBeInTheDocument();
  expect(screen.getByLabelText('Movimiento máx.: 4')).toBeInTheDocument();

  const adventureButton = screen.getByRole('button', { name: /Jugar Aventura/i });
  expect(adventureButton.parentElement).not.toHaveClass('mt-auto');

  fireEvent.click(within(actionDice).getByRole('button', { name: 'd8' }));
  fireEvent.click(screen.getByRole('button', { name: /^d12/i }));
  expect(actionDice).toHaveTextContent('D12');

  fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
  await waitFor(() => {
    expect(require('firebase/firestore').setDoc).toHaveBeenCalled();
  });

  const savedData = require('firebase/firestore').setDoc.mock.calls.at(-1)[1];
  expect(savedData).toMatchObject({
    lifeInitial: 7,
    maxLife: 9,
    maxDefenseClass: 4,
    maxMovement: 4,
    maxInitiative: 5,
    resource: { name: 'Furia', maximum: 4, initial: 1 },
    actionDice: ['d12', 'd6', 'd4'],
    roguelite: {
      lifeInitial: 7,
      maxLife: 9,
      maxDefenseClass: 4,
      maxMovement: 4,
      maxInitiative: 5,
      resource: { name: 'Furia', maximum: 4, initial: 1 },
      actionDice: ['d12', 'd6', 'd4'],
    },
  });
});
