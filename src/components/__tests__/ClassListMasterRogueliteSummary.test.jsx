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
        tags: ['Arcano|#3b82f6'],
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
          talentCatalog: [{
            id: 'athletics',
            name: 'Atletismo',
            description: 'Avanza con un impulso feroz.',
            image: '',
            available: true,
          }],
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
  firestore.getDocs.mockImplementation(async (ref) => {
    if (ref?.path === 'players') {
      return {
        empty: false,
        docs: [{ id: 'Ada', data: () => ({ name: 'Ada' }) }],
      };
    }
    if (ref?.path === 'players/Ada/rogueliteClasses') {
      return {
        empty: false,
        docs: [{
          id: 'barbarian',
          data: () => ({
            id: 'barbarian',
            owner: 'Ada',
            level: 1,
            activeRun: {
              id: 'run-1',
              status: 'active',
              classId: 'barbarian',
              owner: 'Ada',
              templateRevision: 1,
              stats: {
                vida: { current: 4, max: 8 },
              },
              inventory: {},
              baseInventoryTemplateIds: [],
            },
          }),
        }],
      };
    }
    return classSnapshot;
  });
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
  expect(screen.getByRole('button', { name: 'Gestionar estados' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Añadir etiqueta' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta Arcano' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre de etiqueta Arcano' }), {
    target: { value: 'Veterano' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Color Violeta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar color de etiqueta' }));

  fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta ETIQUETA' }));
  const emptyTagInput = screen.getByRole('textbox', { name: 'Nombre de etiqueta ETIQUETA' });
  fireEvent.change(emptyTagInput, { target: { value: '' } });
  fireEvent.keyDown(emptyTagInput, { key: 'Enter' });
  expect(screen.queryByRole('button', { name: 'Editar etiqueta ETIQUETA' })).not.toBeInTheDocument();

  const lifeEditor = screen.getByTestId('roguelite-stat-editor-vida');
  within(lifeEditor).getAllByRole('button').forEach((button) => {
    expect(button).toHaveClass('h-5', 'w-5');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Fijar Vida en 7' }));
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

  const savedData = [...require('firebase/firestore').setDoc.mock.calls]
    .reverse()
    .find(([, data]) => data.classTags?.includes('Veterano|#a78bfa'))[1];
  expect(savedData).toMatchObject({
    lifeInitial: 7,
    maxLife: 9,
    maxDefenseClass: 4,
    maxMovement: 4,
    maxInitiative: 5,
    resource: { name: 'Furia', maximum: 4, initial: 1 },
    actionDice: ['d12', 'd6', 'd4'],
    tags: ['Veterano|#a78bfa'],
    classTags: ['Veterano|#a78bfa'],
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

  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  expect(await screen.findByLabelText('Nombre del recurso de clase')).toHaveValue('Furia');
  expect(screen.getByLabelText('Editar imagen del recurso de clase')).toBeInTheDocument();
  expect(screen.getByTestId('talents-sidebar')).toHaveClass('overflow-y-auto');
  expect(screen.getByTestId('talents-sidebar')).toHaveClass('noma-talents-shell--master');
  expect(screen.getAllByText('Atletismo').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Simples' })).toHaveClass('border-slate-700', 'text-slate-600');
  expect(screen.getByRole('button', { name: 'Marciales' }).parentElement).toHaveClass('grid-cols-3', 'max-w-[390px]');

  fireEvent.click(screen.getByRole('button', { name: 'Añadir talento a la clase' }));
  const talentNameInput = screen.getByDisplayValue('Nuevo talento');
  fireEvent.change(talentNameInput, { target: { value: '' } });
  expect(talentNameInput).toHaveValue('');
  fireEvent.change(talentNameInput, { target: { value: 'Intimidación' } });
  const talentDescriptionInput = screen.getByRole('textbox', { name: 'Descripción del talento' });
  fireEvent.change(talentDescriptionInput, { target: { value: 'Impone miedo ' } });
  expect(talentDescriptionInput).toHaveValue('Impone miedo ');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar editor de talento' }));
  expect(screen.getAllByText('Intimidación').length).toBeGreaterThan(0);

  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => {
    const savedClass = [...require('firebase/firestore').setDoc.mock.calls]
      .reverse()
      .find(([, data]) => data.talentCatalog?.some((talent) => talent.name === 'Intimidación'))[1];
    expect(savedClass.talentCatalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'athletics', name: 'Atletismo' }),
      expect.objectContaining({ name: 'Intimidación', description: 'Impone miedo ', available: true }),
    ]));
    expect(savedClass.roguelite.talentCatalog).toEqual(savedClass.talentCatalog);
  });

  expect(require('firebase/firestore').setDoc).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'players/Ada/rogueliteClasses/barbarian' }),
    expect.objectContaining({
      activeRun: expect.objectContaining({
        classId: 'barbarian',
        owner: 'Ada',
        templateRevision: expect.any(Number),
        stats: expect.objectContaining({
          vida: expect.objectContaining({ current: 4, max: expect.any(Number) }),
        }),
      }),
    }),
    { merge: true },
  );
}, 10000);
