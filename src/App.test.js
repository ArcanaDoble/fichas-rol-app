import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { evaluatePendingTokenChange } from './App';
import { ConfirmProvider } from './components/Confirm';
jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{}, () => {}] }));
jest.mock('./components/inventory/Inventory', () => () => <div>Inventory</div>);
jest.mock('./components/MasterMenu', () => () => <div>MasterMenu</div>);
jest.mock('./components/MapCanvas', () => () => <div>MapCanvas</div>);

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

describe('evaluatePendingTokenChange', () => {
  const baseToken = {
    id: 'token-1',
    x: 10,
    y: 15,
    updatedAt: 100,
  };

  it('retains pending change when same author has different metadata', () => {
    const pending = { ...baseToken, updatedBy: 'Alice', x: 10 };
    const remote = { ...baseToken, updatedBy: 'Alice', x: 20, updatedAt: 110 };

    const result = evaluatePendingTokenChange({
      pending,
      token: remote,
      currentAuthor: 'Alice',
    });

    expect(result).toEqual({ action: 'skip', deletePending: false });
  });

  it('skips and clears pending when metadata matches', () => {
    const pending = { ...baseToken, updatedBy: 'Alice' };
    const remote = { ...baseToken, updatedBy: 'Alice', updatedAt: 120 };

    const result = evaluatePendingTokenChange({
      pending,
      token: remote,
      currentAuthor: 'Alice',
    });

    expect(result).toEqual({ action: 'skip', deletePending: true });
  });

  it('retains pending when remote change lacks author but matches current', () => {
    const pending = { ...baseToken, updatedBy: 'Alice', x: 10 };
    const remote = { ...baseToken, updatedBy: undefined, x: 30, updatedAt: 115 };

    const result = evaluatePendingTokenChange({
      pending,
      token: remote,
      currentAuthor: 'Alice',
    });

    expect(result).toEqual({ action: 'skip', deletePending: false });
  });

  it('applies update when author differs', () => {
    const pending = { ...baseToken, updatedBy: 'Alice' };
    const remote = { ...baseToken, updatedBy: 'Bob', x: 25, updatedAt: 130 };

    const result = evaluatePendingTokenChange({
      pending,
      token: remote,
      currentAuthor: 'Alice',
    });

    expect(result).toEqual({ action: 'apply', deletePending: true });
  });
});
