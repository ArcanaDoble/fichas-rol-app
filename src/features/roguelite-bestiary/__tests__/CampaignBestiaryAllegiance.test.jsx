import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import RogueliteBestiaryView from '../RogueliteBestiaryView';
import { addCampaignNpcToActiveCanvas } from '../canvasSpawn';

jest.mock('../../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), doc: jest.fn(), onSnapshot: jest.fn(), setDoc: jest.fn(),
  deleteDoc: jest.fn(), writeBatch: jest.fn(),
}));
jest.mock('../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(), getCustomImage: () => null,
}));
jest.mock('../canvasSpawn', () => ({
  addCampaignNpcToActiveCanvas: jest.fn(), addRogueliteEnemyToActiveCanvas: jest.fn(),
}));

test('guarda la elección, la recupera al reabrir y guarda los cambios antes de añadir al Canvas', async () => {
  let saved = { id: 'henry', name: 'Henry', stats: { vida: { current: 52, max: 60 } } };
  const reference = (database, ...parts) => ({ path: parts.join('/') });
  collection.mockImplementation(reference);
  doc.mockImplementation(reference);
  onSnapshot.mockImplementation((ref, next) => {
    next({ docs: ref.path === 'campaignNpcs' ? [{ id: saved.id, data: () => saved }] : [] });
    return jest.fn();
  });
  setDoc.mockImplementation(async (ref, data) => { saved = data; });
  addCampaignNpcToActiveCanvas.mockResolvedValue({ scenarioId: 'campaign' });
  const props = { variant: 'campaignNpc', onBack: jest.fn(), armas: [], armaduras: [], habilidades: [], accesorios: [] };
  const first = render(<RogueliteBestiaryView {...props} />);

  expect(await screen.findByRole('heading', { name: 'PNJ y enemigos de Campaña' })).toBeInTheDocument();
  expect(await screen.findByRole('radio', { name: 'Aliado', exact: true })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Enemigo', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));
  await waitFor(() => expect(setDoc).toHaveBeenCalledWith({ path: 'campaignNpcs/henry' }, expect.objectContaining({ allegiance: 'enemy' })));
  first.unmount();

  render(<RogueliteBestiaryView {...props} />);
  expect(await screen.findByRole('radio', { name: 'Enemigo', exact: true })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Aliado', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Añadir al encuentro/i }));
  await waitFor(() => expect(addCampaignNpcToActiveCanvas).toHaveBeenCalledWith(expect.objectContaining({ allegiance: 'ally' })));
  expect(saved.allegiance).toBe('ally');
  expect(setDoc.mock.invocationCallOrder.at(-1)).toBeLessThan(addCampaignNpcToActiveCanvas.mock.invocationCallOrder[0]);
});

test.each([
  ['campaignNpc', 'ally', 'PNJ'],
  ['campaignNpc', 'enemy', 'PNJ'],
  ['roguelite', undefined, 'Enemigo'],
])('permite borrar y escribir espacios en el nombre antes de guardar: %s / %s', async (variant, allegiance, fallback) => {
  const campaign = variant === 'campaignNpc';
  let saved = { id: 'criatura', name: 'Nombre anterior', allegiance };
  const reference = (database, ...parts) => ({ path: parts.join('/') });
  collection.mockImplementation(reference);
  doc.mockImplementation(reference);
  onSnapshot.mockImplementation((ref, next) => {
    next({ docs: ref.path === (campaign ? 'campaignNpcs' : 'rogueliteEnemies') ? [{ id: saved.id, data: () => saved }] : [] });
    return jest.fn();
  });
  setDoc.mockImplementation(async (ref, data) => { saved = data; });
  const props = { variant, onBack: jest.fn(), armas: [], armaduras: [], habilidades: [], accesorios: [] };
  const first = render(<RogueliteBestiaryView {...props} />);
  const editName = campaign ? 'Editar nombre y descripción de la ficha de Campaña' : 'Editar nombre y descripción del enemigo';
  const inputName = campaign ? 'Nombre de la ficha de Campaña' : 'Nombre del enemigo';
  await userEvent.click(await screen.findByRole('button', { name: editName }));
  const input = screen.getByRole('textbox', { name: inputName });
  await userEvent.clear(input);
  expect(input).toHaveValue('');
  await userEvent.type(input, '  La ');
  expect(input).toHaveValue('  La ');
  await userEvent.type(input, ' sombra del bosque  ');
  expect(input).toHaveValue('  La  sombra del bosque  ');
  const description = screen.getByRole('textbox', { name: campaign ? 'Descripción de la ficha de Campaña' : 'Descripción del enemigo' });
  await userEvent.clear(description);
  await userEvent.type(description, 'Acecha entre los árboles.');
  expect(input).toHaveValue('  La  sombra del bosque  ');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(saved.name).toBe('La  sombra del bosque'));
  first.unmount();
  render(<RogueliteBestiaryView {...props} />);
  await userEvent.click(await screen.findByRole('button', { name: editName }));
  expect(screen.getByRole('textbox', { name: inputName })).toHaveValue('La  sombra del bosque');
  await userEvent.clear(screen.getByRole('textbox', { name: inputName }));
  expect(screen.getByRole('textbox', { name: inputName })).toHaveValue('');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(saved.name).toBe(fallback));
});
