import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders main menu', () => {
  render(<App />);
  const heading = screen.getByText(/¿Quién eres\?/i);
  expect(heading).toBeInTheDocument();
});

test('master login shows refresh button', async () => {
  render(<App />);

  // Acceder al formulario de login de Máster
  const masterBtn = screen.getByRole('button', { name: /soy máster/i });
  await userEvent.click(masterBtn);

  // Escribir contraseña correcta y pulsar Entrar
  const input = screen.getByPlaceholderText(/contraseña/i);
  await userEvent.type(input, '0904');
  const enterBtn = screen.getByRole('button', { name: /entrar/i });
  await userEvent.click(enterBtn);

  // Verificar que aparece el botón para refrescar el catálogo
  const refreshCatalog = await screen.findByRole('button', { name: /refrescar catálogo/i });
  expect(refreshCatalog).toBeInTheDocument();
});
