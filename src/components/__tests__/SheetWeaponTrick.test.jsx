import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClassList from '../ClassList';
import CanvasEquipmentSection from '../../features/canvas/components/CanvasEquipmentSection';
import { resolveWeaponForm } from '../../features/roguelite/weaponForms';
import { syncCampaignToken } from '../../features/canvas/campaignSystem';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(), collection: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
  getDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(), query: jest.fn(),
  setDoc: jest.fn(), where: jest.fn(), writeBatch: jest.fn(), runTransaction: jest.fn(), serverTimestamp: () => 42,
}));

const cane = resolveWeaponForm({ id: 'cane', instanceId: 'cane-one', name: 'Bastón enroscado', type: 'weapon', rasgos: ['Truco'],
  trickForms: [
    { id: 'primary', label: 'Estoque', dano: '1d12', alcance: 'Cercano', rasgos: ['Perforante', 'Torso'], image: '/cane.png' },
    { id: 'secondary', label: 'Látigo', dano: '2d4', alcance: 'Intermedio', rasgos: ['Crítico', 'Sangrado', 'Sin guardia'], image: '/whip.png' },
  ] });
let records, commit;
beforeEach(() => {
  records = new Map([
    ['characters/yuuzu', { id: 'yuuzu', owner: 'Rai', name: 'Yuuzu',
      equipment: { weapons: [cane, { ...cane, instanceId: 'cane-two' }], armor: [], accessories: [], abilities: [], objects: [] },
      equippedItems: { mainHand: cane }, talents: { title: 'Clave de Yuuzu', slots: [] } }],
    ['campaignCharacterSheets/yuuzu', { schemaVersion: 1, vida: { current: 28, max: 28 }, mente: { current: 8, max: 8 },
      movilidad: 3, actionDice: ['d6', 'd6', 'd6'], armaduraRd: 0 }],
  ]);
  const firestore = require('firebase/firestore');
  commit = jest.fn().mockResolvedValue(undefined);
  const ref = (...parts) => ({ path: parts.filter(part => typeof part === 'string').join('/') });
  firestore.collection.mockImplementation(ref); firestore.doc.mockImplementation(ref);
  firestore.query.mockImplementation(value => value); firestore.where.mockReturnValue({});
  firestore.getDocs.mockImplementation(async () => ({ empty: false, docs: [{ id: 'yuuzu', data: () => records.get('characters/yuuzu') }] }));
  firestore.getDoc.mockImplementation(async reference => ({ exists: () => records.has(reference.path), data: () => records.get(reference.path) }));
  firestore.onSnapshot.mockImplementation((_ref, next) => { next({ docs: [], empty: true, forEach: () => {} }); return jest.fn(); });
  firestore.writeBatch.mockImplementation(() => {
    const pending = [];
    return { set: (reference, value) => pending.push([reference.path, value]), commit: async () => {
      await commit(); pending.forEach(([path, value]) => records.set(path, JSON.parse(JSON.stringify(value))));
    } };
  });
  firestore.runTransaction.mockImplementation(async (_db, callback) => {
    const pending = [];
    const result = await callback({
      get: async reference => ({ exists: () => records.has(reference.path), data: () => records.get(reference.path) }),
      update: (reference, value) => pending.push([reference.path, value]),
      set: (reference, value) => pending.push([reference.path, value]),
    });
    pending.forEach(([path, value]) => records.set(path, { ...records.get(path), ...value }));
    return result;
  });
  window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const openEquipment = async () => {
  const view = render(<ClassList collectionPath="characters" ownerFilter="Rai" currentUserId="Rai"
    isPlayerMode initialCharacterName="Yuuzu" onBack={jest.fn()} />);
  await screen.findByRole('button', { name: 'Editar estadísticas' });
  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  fireEvent.click(screen.getByRole('button', { name: 'Equipo' }));
  return view;
};
const transform = () => screen.getByRole('button', { name: 'Transformar Bastón enroscado en Látigo' });

test('prepares one owned copy, saves its full profile, and renders that saved form in the token inspector', async () => {
  const onSaved = jest.fn(); window.addEventListener('playerSheetSaved', onSaved);
  const source = { ...records.get('characters/yuuzu'), campaignSheet: records.get('campaignCharacterSheets/yuuzu') };
  const originalToken = syncCampaignToken({ id: 'token', x: 300, y: 200, layer: 'TOKEN' }, source);
  const stats = { vida: { current: 9, max: 28 }, mente: { current: 3, max: 8 }, movimiento: { current: 1, max: 3 } };
  originalToken.stats = stats;
  records.set('gameSettings/canvasVisibility', { activeScenarioId: 'scene' });
  records.set('canvas_scenarios/scene', { items: [originalToken, { id: 'map', layer: 'TABLETOP', x: 12 }], canvasCombat: { status: 'ended' } });
  const view = await openEquipment();
  fireEvent.click(transform());
  await screen.findByRole('button', { name: 'Transformar Bastón enroscado en Estoque' });
  expect(records.get('characters/yuuzu').equipment.weapons[0].activeFormId).toBe('primary');
  expect(screen.queryByText('Seleccionar arma')).not.toBeInTheDocument();
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(require('firebase/firestore').runTransaction).toHaveBeenCalledTimes(1);
  const saved = records.get('characters/yuuzu');
  expect(saved.equippedItems.mainHand).toMatchObject({ activeFormId: 'secondary', damage: '2d4', range: 'Intermedio', image: '/whip.png' });
  expect(saved.equipment.weapons.map(item => item.activeFormId)).toEqual(['secondary', 'primary']);
  const event = onSaved.mock.calls[0][0].detail;
  expect(event.preserveTokenState).toBe(true);
  const token = records.get('canvas_scenarios/scene').items[0];
  expect(token.stats).toEqual(stats);
  expect(token).toMatchObject({ x: 300, y: 200 });
  expect(records.get('canvas_scenarios/scene').items[1]).toEqual({ id: 'map', layer: 'TABLETOP', x: 12 });
  expect(token.equippedItems[0]).toMatchObject({ activeFormId: 'secondary', damage: '2d4', range: 'Intermedio', image: '/whip.png' });
  view.unmount(); window.removeEventListener('playerSheetSaved', onSaved);
  render(<CanvasEquipmentSection token={token} equippedItems={token.equippedItems} />);
  const equipped = screen.getAllByTestId('inventory-item-card').find(element => within(element).queryByText(/Equipado/));
  expect(equipped).toHaveTextContent('2d4'); expect(equipped).toHaveTextContent('Intermedio');
  expect(equipped).toHaveTextContent('Sin guardia'); expect(equipped).not.toHaveTextContent('Perforante');
  expect(equipped.querySelector('img')).toHaveAttribute('src', '/whip.png');
});

test('during combat only Save applies the prepared form, without a payment dialog or changing actions', async () => {
  const token = syncCampaignToken({ id: 'token', layer: 'TOKEN', controlledBy: ['Rai'] }, {
    ...records.get('characters/yuuzu'), campaignSheet: records.get('campaignCharacterSheets/yuuzu'),
  });
  records.set('gameSettings/canvasVisibility', { activeScenarioId: 'scene' });
  records.set('canvas_scenarios/scene', { rulesSystem: 'campaign', items: [token], canvasCombat: {
    status: 'active', startedAt: 10, round: 1, roundPhase: 'turns', activeBlockIndex: 0,
    blocks: [{ memberIds: ['token'], actedIds: [] }], participants: { token: { tokenId: 'token', side: 'players', awaitingRoll: false,
      actionDice: [{ id: 'high', value: 6, die: 'd6', status: 'available' }, { id: 'low', value: 1, die: 'd6', status: 'available' }], movementRuntime: { spent: 2 } } },
  } });
  const beforeCombat = JSON.parse(JSON.stringify(records.get('canvas_scenarios/scene').canvasCombat));
  await openEquipment(); fireEvent.click(transform());
  await screen.findByRole('button', { name: 'Transformar Bastón enroscado en Estoque' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(records.get('characters/yuuzu').equippedItems.mainHand.activeFormId).toBe('primary');
  expect(require('firebase/firestore').runTransaction).not.toHaveBeenCalled();
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => expect(records.get('characters/yuuzu').equippedItems.mainHand.activeFormId).toBe('secondary'));
  expect(records.get('canvas_scenarios/scene').canvasCombat).toEqual(beforeCombat);
  expect(records.get('characters/yuuzu').equippedItems.mainHand.activeFormId).toBe('secondary');
  expect(records.get('canvas_scenarios/scene').items[0].equippedItems[0].activeFormId).toBe('secondary');
  expect(screen.getByRole('button', { name: 'Transformar Bastón enroscado en Estoque' })).toBeEnabled();
});

test('a failed save keeps the prepared form locally and retry applies it', async () => {
  await openEquipment(); fireEvent.click(transform());
  await screen.findByRole('button', { name: 'Transformar Bastón enroscado en Estoque' });
  require('firebase/firestore').runTransaction.mockRejectedValueOnce(new Error('Sin conexión'));
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await screen.findByText('Sin conexión');
  expect(commit).not.toHaveBeenCalled();
  expect(records.get('characters/yuuzu').equipment.weapons[0].activeFormId).toBe('primary');
  expect(screen.getByRole('button', { name: 'Transformar Bastón enroscado en Estoque' })).toBeEnabled();
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => expect(records.get('characters/yuuzu').equipment.weapons[0].activeFormId).toBe('secondary'));
});
