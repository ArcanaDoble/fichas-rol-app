import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ConfirmProvider } from './components/Confirm';
jest.mock('./components/inventory/Inventory', () => () => <div>Inventory</div>);
jest.mock('./components/MasterMenu', () => () => <div>MasterMenu</div>);

test('renders main menu', () => {
  render(
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  );
  const heading = screen.getByText(/¿Quién eres\?/i);
  expect(heading).toBeInTheDocument();
});

test.skip('master login shows master menu', async () => {
  render(
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  );

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
