import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClassList from '../ClassList';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(), collection: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
  getDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(), query: jest.fn(),
  setDoc: jest.fn(), where: jest.fn(), writeBatch: jest.fn(),
}));

const characterPath = 'characters/yerma-test';
const sheetPath = 'campaignCharacterSheets/yerma-test';
let records;
let commit;
beforeEach(() => {
  records = new Map([
    [characterPath, {
      id: 'yerma-test', owner: 'Jugadora', name: 'Yerma',
      image: '/yerma-personalizada.webp', avatar: '/yerma-avatar.webp',
      equippedItems: { body: { name: 'Gabardina de cuero', defense: 1 } },
      equipment: { armor: [{ name: 'Gabardina de cuero', defense: 1 }] },
      talents: { title: 'Clave de Yerma', slots: [] },
    }],
    [sheetPath, {
      schemaVersion: 1, vida: { current: 12, max: 28 },
      mente: { current: 4, max: 5 }, movilidad: 4,
      actionDice: ['d8', 'd6', 'd4'], armaduraRd: 1,
    }],
  ]);
  commit = jest.fn().mockResolvedValue(undefined);
  const firestore = require('firebase/firestore');
  const reference = (...args) => ({ path: args.filter((entry) => typeof entry === 'string').join('/') });
  window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation((value) => value);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockImplementation(async () => ({
    empty: false, docs: [{ id: 'yerma-test', data: () => records.get(characterPath) }],
  }));
  firestore.getDoc.mockImplementation(async (ref) => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }));
  firestore.setDoc.mockImplementation(async (ref, value) => records.set(ref.path, { ...records.get(ref.path), ...value }));
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
        pending.forEach(([path, value]) => records.set(path, JSON.parse(JSON.stringify(value))));
      },
    };
  });
});

const open = () => render(<ClassList collectionPath="characters" ownerFilter="Jugadora"
  currentUserId="Jugadora" isPlayerMode initialCharacterName={records.get(characterPath).name} onBack={jest.fn()} />);
const value = (label) => screen.getByRole('textbox', { name: label });
const change = (label, number) => fireEvent.change(value(label), { target: { value: String(number) } });
const select = (name) => fireEvent.click(screen.getByRole('button', { name: `Personalidad ${name}` }));
const chooseDie = (current, next) => {
  fireEvent.click(screen.getByRole('button', { name: `Dado de acción 1: ${current}` }));
  fireEvent.click(screen.getByRole('button', { name: next }));
};
const save = async () => {
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => expect(document.getElementById('save-btn-sidebar')).toHaveTextContent('Guardado'));
};

test('three personalities retain separate stats and dice after saving and reopening, with shared equipment', async () => {
  const view = open();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar estadísticas' }));
  expect(value('Vida actual')).toHaveValue('12');
  expect(screen.queryByText('Karma')).not.toBeInTheDocument();
  expect(value('Yermo actual')).toHaveValue('0');
  expect(screen.getByRole('button', { name: 'Reducir Yermo' })).toBeDisabled();
  change('Yermo actual', '9007199254740993');
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Yermo' }));
  expect(value('Yermo actual')).toHaveValue('9007199254740994');
  fireEvent.click(screen.getByRole('button', { name: 'Reducir Yermo' }));
  expect(value('Yermo actual')).toHaveValue('9007199254740993');
  change('Yermo actual', 53);
  change('Vida actual', 15);
  // Switching keeps this unsaved draft rather than overwriting it with Taiga.
  select('Taiga');
  expect(value('Yermo actual')).toHaveValue('53');
  expect(value('Vida actual')).toHaveValue('');
  expect(value('Mente máximo')).toHaveValue('');
  expect(value('Movilidad')).toHaveValue('');
  expect(value('Armadura RD')).toHaveValue('1');
  expect(screen.getByRole('button', { name: 'Dado de acción 1: Sin definir' })).toBeInTheDocument();
  change('Vida máximo', 32);
  change('Vida actual', 30);
  change('Mente máximo', 7);
  change('Mente actual', 6);
  change('Movilidad', 5);
  chooseDie('Sin definir', 'd10');
  await save();
  expect(records.get(characterPath).name).toBe('Taiga');
  expect(records.get(sheetPath).personalities.yerma.vida.current).toBe(15);

  select('Tundra');
  expect(value('Yermo actual')).toHaveValue('53');
  fireEvent.click(screen.getByRole('button', { name: 'Reducir Yermo' }));
  expect(value('Vida actual')).toHaveValue('');
  change('Vida máximo', 40);
  change('Vida actual', 35);
  change('Mente máximo', 9);
  change('Mente actual', 8);
  change('Movilidad', 3);
  chooseDie('Sin definir', 'd12');
  change('Armadura RD', 2);
  await save();
  view.unmount();

  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar estadísticas' }));
  expect(screen.getByRole('button', { name: 'Personalidad Tundra' })).toHaveAttribute('aria-pressed', 'true');
  expect(value('Vida actual')).toHaveValue('35');
  expect(value('Yermo actual')).toHaveValue('52');
  expect(records.get(sheetPath).yermo).toBe('52');
  expect(records.get(sheetPath).personalities.tundra.yermo).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Dado de acción 1: D12' })).toBeInTheDocument();
  select('Yerma');
  expect(value('Vida actual')).toHaveValue('15');
  expect(value('Yermo actual')).toHaveValue('52');
  expect(value('Vida máximo')).toHaveValue('28');
  expect(value('Mente actual')).toHaveValue('4');
  expect(value('Movilidad')).toHaveValue('4');
  expect(value('Armadura RD')).toHaveValue('2');
  expect(screen.getByRole('button', { name: 'Dado de acción 1: D8' })).toBeInTheDocument();
  await save();
  expect(records.get(characterPath).image).toBe('/yerma-personalizada.webp');
  select('Taiga');
  expect(value('Vida actual')).toHaveValue('30');
  expect(value('Vida máximo')).toHaveValue('32');
  expect(value('Mente actual')).toHaveValue('6');
  expect(value('Movilidad')).toHaveValue('5');
  expect(value('Armadura RD')).toHaveValue('2');
  expect(screen.getByRole('button', { name: 'Dado de acción 1: D10' })).toBeInTheDocument();
  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  expect(screen.getByRole('button', { name: 'Desequipar Gabardina de cuero' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Reducción de daño: 1' })).toBeInTheDocument();
  expect(value('Nombre de la clave')).toHaveValue('Clave de Yerma');
  expect(records.size).toBe(2);
}, 20000);

test('a failed save keeps all personality drafts and retry persists the selection with its stats', async () => {
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar estadísticas' }));
  select('Taiga');
  change('Vida máximo', 32);
  change('Vida actual', 32);
  let failSave;
  commit.mockImplementationOnce(() => new Promise((resolve, reject) => { failSave = reject; }));
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  expect(screen.getByRole('button', { name: 'Personalidad Yerma' })).toBeDisabled();
  await act(async () => failSave(new Error('Sin conexión')));
  expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  expect(records.get(characterPath).name).toBe('Yerma');
  expect(records.get(sheetPath).vida.current).toBe(12);
  select('Yerma');
  expect(value('Vida actual')).toHaveValue('12');
  select('Taiga');
  expect(value('Vida actual')).toHaveValue('32');
  await save();
  expect(records.get(characterPath).name).toBe('Taiga');
  expect(records.get(sheetPath).activePersonality).toBe('taiga');
  expect(records.get(sheetPath).vida.current).toBe(32);
});

test('editing a personality portrait uses separate files and preserves the saved active portrait until character save', async () => {
  const context = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: jest.fn(), translate: jest.fn(), scale: jest.fn(), drawImage: jest.fn(),
  });
  const dataUrl = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,portrait');
  const upload = require('../../utils/storage').uploadDataUrl;
  upload.mockImplementation(async (data, path) => `/${path}.webp`);
  try {
    const view = open();
    await screen.findByRole('button', { name: 'Editar estadísticas' });
    select('Taiga');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Retrato' }));
    const cropActions = screen.getByRole('button', { name: 'Cancelar' }).parentElement;
    fireEvent.click(within(cropActions).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument());
    expect(upload).toHaveBeenCalledWith(expect.any(String), 'character-images/yerma-test-taiga');
    expect(upload).toHaveBeenCalledWith(expect.any(String), 'character-avatars/yerma-test-taiga');
    expect(records.get(characterPath).name).toBe('Yerma');
    expect(records.get(characterPath).image).toBe('/yerma-personalizada.webp');
    expect(records.get(characterPath).personalityPortraits.taiga.image).toBe('/character-images/yerma-test-taiga.webp');
    // Reload before saving the selection: the edited artwork still belongs to Taiga.
    view.unmount();
    open();
    await screen.findByRole('button', { name: 'Editar estadísticas' });
    select('Taiga');
    await save();
    expect(records.get(characterPath).image).toBe('/character-images/yerma-test-taiga.webp');
    select('Yerma');
    await save();
    expect(records.get(characterPath).image).toBe('/yerma-personalizada.webp');
  } finally {
    context.mockRestore();
    dataUrl.mockRestore();
  }
});

test('Yuuzu retains Karma without the personality selector', async () => {
  records.set(characterPath, { ...records.get(characterPath), name: 'Yuuzu', stats: { karma: { actual: 3 } } });
  open();
  await screen.findByRole('button', { name: 'Editar estadísticas' });
  expect(screen.getByText('Karma')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Yermo actual' })).not.toBeInTheDocument();
  expect(screen.getByText('+3')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Personalidad/ })).not.toBeInTheDocument();
});
