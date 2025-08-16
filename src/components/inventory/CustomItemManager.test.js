import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomItemManager from './CustomItemManager';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(() => {}),
  deleteDoc: jest.fn(() => {}),
  doc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  enableIndexedDbPersistence: jest.fn(() => Promise.resolve()),
}));

const { getDocs, setDoc, deleteDoc } = require('firebase/firestore');

beforeEach(() => {
  getDocs.mockClear();
  setDoc.mockClear();
  deleteDoc.mockClear();
});

test('shows default comida item', async () => {
  getDocs.mockResolvedValueOnce({ docs: [] });
  render(<CustomItemManager />);
  expect(await screen.findByText('Comida')).toBeInTheDocument();
});

test('filters items by search', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      { data: () => ({ name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' }) },
      { data: () => ({ name: 'Poción', type: 'pocion', icon: '🧪', description: '', color: '#0ff' }) },
    ],
  });
  render(<CustomItemManager />);
  await screen.findByText('Gema');
  const search = screen.getByPlaceholderText(/buscar objeto/i);
  await userEvent.type(search, 'gema');
  expect(screen.getByText('Gema')).toBeInTheDocument();
  expect(screen.queryByText('Poción')).toBeNull();
});

test('edits an item', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      { data: () => ({ name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' }) },
    ],
  });
  render(<CustomItemManager />);
  const item = await screen.findByText('Gema');
  await userEvent.click(within(item.closest('li')).getByText('Editar'));
  const nameInput = await screen.findByPlaceholderText('Nombre');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Perla');
  await userEvent.click(screen.getByText('Guardar'));
  await screen.findByText('Perla');
  const call = setDoc.mock.calls[0];
  expect(call[1]).toEqual(expect.objectContaining({ name: 'Perla' }));
});

test('deletes an item', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      { data: () => ({ name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' }) },
    ],
  });
  render(<CustomItemManager />);
  const item = await screen.findByText('Gema');
  await userEvent.click(within(item.closest('li')).getByText('Eliminar'));
  await waitFor(() => expect(screen.queryByText('Gema')).toBeNull());
  expect(deleteDoc).toHaveBeenCalled();
});
