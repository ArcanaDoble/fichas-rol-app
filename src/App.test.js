import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
jest.mock('./components/inventory/Inventory', () => () => <div>Inventory</div>);
jest.mock('./components/MasterMenu', () => () => <div>MasterMenu</div>);
jest.mock('./components/re4/InventoryRE4', () => () => <div>InventoryRE4</div>);

test('renders main menu', () => {
  render(<App />);
  const heading = screen.getByText(/¿Quién eres\?/i);
  expect(heading).toBeInTheDocument();
});

test('master login shows master menu', async () => {
  render(<App />);

  // Acceder al formulario de login de Máster
  const masterBtn = screen.getByRole('button', { name: /soy máster/i });
  await userEvent.click(masterBtn);

  // Escribir contraseña correcta y pulsar Entrar
  const input = screen.getByPlaceholderText(/contraseña/i);
  await userEvent.type(input, '0904');
  const enterBtn = screen.getByRole('button', { name: /entrar/i });
  await userEvent.click(enterBtn);

  // Verificar que aparece el menú de selección de vista
  const menu = await screen.findByText(/MasterMenu/i);
  expect(menu).toBeInTheDocument();
});
