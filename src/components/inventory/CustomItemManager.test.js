import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomItemManager from './CustomItemManager';

beforeEach(() => {
  localStorage.clear();
});

test('filters items by search', async () => {
  localStorage.setItem(
    'customItems',
    JSON.stringify([
      { name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' },
      { name: 'Poción', type: 'pocion', icon: '🧪', description: '', color: '#0ff' },
    ])
  );
  render(<CustomItemManager />);
  const search = screen.getByPlaceholderText(/buscar objeto/i);
  await userEvent.type(search, 'gema');
  expect(screen.getByText('Gema')).toBeInTheDocument();
  expect(screen.queryByText('Poción')).toBeNull();
});

test('edits an item', async () => {
  localStorage.setItem(
    'customItems',
    JSON.stringify([
      { name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' },
    ])
  );
  render(<CustomItemManager />);
  const item = screen.getByText('Gema').closest('li');
  await userEvent.click(within(item).getByText('Editar'));
  const nameInput = screen.getByPlaceholderText('Nombre');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Perla');
  await userEvent.click(screen.getByText('Guardar'));
  expect(screen.getByText('Perla')).toBeInTheDocument();
  const stored = JSON.parse(localStorage.getItem('customItems'));
  const perla = stored.find((i) => i.name === 'Perla');
  expect(perla).toBeTruthy();
});

test('deletes an item', async () => {
  localStorage.setItem(
    'customItems',
    JSON.stringify([
      { name: 'Gema', type: 'gema', icon: '💎', description: '', color: '#ff0' },
    ])
  );
  render(<CustomItemManager />);
  const item = screen.getByText('Gema').closest('li');
  await userEvent.click(within(item).getByText('Eliminar'));
  expect(screen.queryByText('Gema')).toBeNull();
  const stored = JSON.parse(localStorage.getItem('customItems'));
  expect(stored.find((i) => i.type === 'gema')).toBeUndefined();
});
