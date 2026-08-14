import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
            tags: ['Vanguardia|#f59e0b'],
            summary: {
              proficiencies: {
                weapons: { simple: false, martial: true, special: false },
                armor: { light: false, medium: true, heavy: false },
              },
            },
            equipment: {
              abilities: [{
                name: 'Barrera arcana',
                templateId: 'PArxBqScw6OZDAqRRoR5H',
                itemType: 'ability',
                description: 'Protege al arcanista.',
              }],
            },
            roguelite: {
              actionDice: ['d8', 'd6', 'd4'],
              maxLife: 8,
              defenseClass: 7,
              movement: 2,
              initiativeBase: 2,
              resource: { name: 'Furia', description: 'La rabia del Bárbaro alimenta sus talentos.', maximum: 3, initial: 0 },
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
      });
    } else {
      onNext(emptySnapshot);
    }
    return jest.fn();
  });
});

test('mounts the roguelite card and opens it in the shared character sheet', async () => {
  const onLaunchCanvas = jest.fn();
  render(
    <CharacterListView
      playerName="Ada"
      armas={[]}
      armaduras={[]}
      habilidades={[]}
      glossary={[]}
      rarityColorMap={{}}
      onBack={jest.fn()}
      onLaunchCanvas={onLaunchCanvas}
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
  expect(screen.getByRole('button', { name: 'Gestionar estados' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Añadir etiqueta' })).not.toBeInTheDocument();
  expect(screen.getByText('Vanguardia')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar etiqueta Vanguardia' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Jugar Aventura/i }));
  await waitFor(() => {
    expect(onLaunchCanvas).toHaveBeenCalledWith(
      'Bárbaro',
      expect.objectContaining({
        id: 'barbarian',
        profileType: 'rogueliteClass',
        launchSource: 'rogueliteClass',
        actionDice: ['d8', 'd6', 'd4'],
        maxLife: 8,
        defenseClass: 7,
        movement: 2,
        initiativeBase: 2,
        resource: expect.objectContaining({ name: 'Furia', maximum: 3 }),
        equippedItems: expect.any(Object),
      }),
    );
  });

  fireEvent.click(screen.getByRole('button', { name: 'Gestionar estados' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sangrado' }));
  fireEvent.click(document.getElementById('save-btn-sidebar'));

  await waitFor(() => {
    const savedProfile = require('firebase/firestore').setDoc.mock.calls.at(-1)[1];
    expect(savedProfile).toMatchObject({
      tags: ['Vanguardia|#f59e0b', 'sangrado'],
      personalStatusTags: ['sangrado'],
    });
  });

  const progressionNavigation = screen.getByText('PROGRESIÓN');
  expect(screen.queryByText('COLECCIÓN')).not.toBeInTheDocument();
  fireEvent.click(progressionNavigation.closest('button'));

  await waitFor(() => {
    expect(screen.getByTestId('roguelite-progression-level-10')).toBeInTheDocument();
  });
  expect(screen.getByTestId('roguelite-progression-level-1')).toHaveTextContent('Nivel actual');
  expect(screen.getByTestId('roguelite-progression-level-2')).toHaveTextContent('Por desbloquear');

  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  await waitFor(() => {
    expect(screen.getByText('La rabia del Bárbaro alimenta sus talentos.')).toBeInTheDocument();
  });
  expect(screen.queryByLabelText('Editar imagen del recurso de clase')).not.toBeInTheDocument();
  expect(screen.getByTestId('talents-sidebar')).toHaveClass('overflow-visible');
  expect(screen.getByTestId('talents-sidebar')).not.toHaveClass('overflow-y-auto');
  expect(screen.getByTestId('talents-sidebar')).toHaveClass('p-6');
  expect(screen.getByTestId('talents-sidebar')).toHaveClass('noma-talents-shell--player');
  expect(screen.queryByText('Resistencia Máxima (Vida)')).not.toBeInTheDocument();
  expect(screen.queryByText('Carga del Equipamiento')).not.toBeInTheDocument();
  expect(screen.getByText('Competencias')).toBeInTheDocument();
  expect(screen.queryByText('Dominio de clase')).not.toBeInTheDocument();
  expect(screen.getByText('Competencias').parentElement).not.toHaveClass('-mt-4');
  expect(screen.getByText('Simples')).toHaveClass('border-slate-700', 'text-slate-600');
  expect(screen.getByText('Marciales')).toHaveClass('bg-[#c8aa6e]', 'text-[#0b1120]');
  expect(screen.getByText('Especiales')).toHaveClass('border-slate-700', 'text-slate-600');
  expect(screen.getByText('Ligera')).toHaveClass('border-slate-700', 'text-slate-600');
  expect(screen.getByText('Media')).toHaveClass('bg-[#c8aa6e]', 'text-[#0b1120]');
  expect(screen.getByText('Pesada')).toHaveClass('border-slate-700', 'text-slate-600');
  expect(screen.getByText('Marciales').parentElement).toHaveClass('grid-cols-3', 'max-w-[390px]');
  expect(screen.getByText('Media').parentElement.className).toBe(screen.getByText('Marciales').parentElement.className);
  expect(screen.queryByRole('button', { name: 'Marciales' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar talento para ranura 1' }));
  fireEvent.click(screen.getByRole('button', { name: /Atletismo Avanza con un impulso feroz/i }));
  expect(screen.getByRole('button', { name: 'Seleccionar talento para ranura 1' })).toHaveTextContent('Atletismo');

  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar talento para ranura 2' }));
  const talentDialog = screen.getByRole('dialog', { name: 'Elegir talento para la ranura 2' });
  fireEvent.click(within(talentDialog).getByRole('button', { name: /Atletismo Avanza con un impulso feroz/i }));
  expect(screen.getByRole('button', { name: 'Seleccionar talento para ranura 2' })).toHaveTextContent('Atletismo');

  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => {
    const savedProfile = require('firebase/firestore').setDoc.mock.calls.at(-1)[1];
    expect(savedProfile.equippedTalentIds).toEqual(['athletics', 'athletics', null]);
    expect(savedProfile.talentCatalog).toBeUndefined();
    expect(savedProfile.roguelite?.talentCatalog).toBeUndefined();
  });
});

test('keeps a mixed-case Firebase ability in the run inventory after launching', async () => {
  const onLaunchCanvas = jest.fn();
  render(
    <CharacterListView
      playerName="Ada"
      armas={[]}
      armaduras={[]}
      habilidades={[]}
      glossary={[]}
      rarityColorMap={{}}
      onBack={jest.fn()}
      onLaunchCanvas={onLaunchCanvas}
    />,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Abrir clase Bárbaro' }));
  fireEvent.click((await screen.findByText('MAZO INICIAL')).closest('button'));
  fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habilidad para ranura 1' }));
  const skillDialog = screen.getByRole('dialog', { name: 'Elegir habilidad para la ranura 1' });
  fireEvent.click(within(skillDialog).getByRole('button', { name: /Barrera arcana Protege al arcanista/i }));

  fireEvent.click(screen.getByText('RESUMEN').closest('button'));
  fireEvent.click(await screen.findByRole('button', { name: /Jugar Aventura/i }));

  await waitFor(() => {
    expect(onLaunchCanvas).toHaveBeenCalledWith(
      'Bárbaro',
      expect.objectContaining({
        equippedSkillIds: ['PArxBqScw6OZDAqRRoR5H', null, null],
        equipment: expect.objectContaining({
          abilities: [expect.objectContaining({
            name: 'Barrera arcana',
            templateId: 'PArxBqScw6OZDAqRRoR5H',
          })],
        }),
      }),
    );
  });
});

test('opens a linked Roguelite class directly from the Canvas target', async () => {
  render(
    <CharacterListView
      playerName="Ada"
      armas={[]}
      armaduras={[]}
      habilidades={[]}
      glossary={[]}
      rarityColorMap={{}}
      onBack={jest.fn()}
      initialRogueliteClassId="barbarian"
    />,
  );

  await waitFor(() => {
    expect(screen.getByText(/Furia de prueba/)).toBeInTheDocument();
  });
  expect(screen.getByTestId('roguelite-action-dice')).toBeInTheDocument();
  expect(screen.queryByText('PERSONAJES DISPONIBLES')).not.toBeInTheDocument();
});

test('refreshes an open Roguelite sheet when its active run changes remotely', async () => {
  const firestore = require('firebase/firestore');
  let profileListener;

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
    } else if (ref.path === 'players/Ada/rogueliteClasses') {
      profileListener = onNext;
      onNext(emptySnapshot);
    } else {
      onNext(emptySnapshot);
    }
    return jest.fn();
  });

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

  fireEvent.click(await screen.findByRole('button', { name: 'Abrir clase Bárbaro' }));
  expect(await screen.findByTestId('roguelite-stat-vida')).toHaveTextContent('8 / 8');

  act(() => {
    profileListener({
      docs: [{
        id: 'barbarian',
        data: () => ({
          level: 1,
          activeRun: {
            id: 'run-1',
            status: 'active',
            classId: 'barbarian',
            owner: 'Ada',
            revision: 2,
            stats: {
              vida: { current: 5, max: 8 },
              cd: { current: 7, max: 7 },
              movimiento: { current: 2, max: 2 },
              iniciativa: { current: 2, max: 2 },
              recurso: { current: 1, max: 3, label: 'Furia', color: '#ef4444' },
            },
            inventory: { weapons: [], armor: [], abilities: [], objects: [], accessories: [] },
            equippedItems: {},
            statusEffects: [],
          },
        }),
      }],
    });
  });

  await waitFor(() => {
    expect(screen.getByTestId('roguelite-stat-vida')).toHaveTextContent('5 / 8');
    expect(screen.getByTestId('roguelite-stat-furia')).toHaveTextContent('1 / 3');
  });
});
