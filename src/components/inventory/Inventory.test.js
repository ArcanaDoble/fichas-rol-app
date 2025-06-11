import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inventory from './Inventory';

jest.mock('./Slot', () => (props) => <div title="Doble clic para borrar" data-testid={`slot-${props.id}`}></div>);
jest.mock('./ItemToken', () => ({ type }) => <div>{type === 'comida' ? '🍖' : '?'}</div>);
jest.mock('./ItemGenerator', () => ({ onGenerate }) => (
  <div>
    <input placeholder="Buscar objeto" data-testid="gen-input" />
    <button onClick={() => onGenerate('comida')}>Generar</button>
  </div>
));

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{ isOver: false }, () => {}] }));

afterEach(() => {
  jest.clearAllMocks();
});

test('adds a new slot when clicking + button', async () => {
  const { container } = render(<Inventory />);
  const initialSlots = container.querySelectorAll('div[title="Doble clic para borrar"]');
  expect(initialSlots).toHaveLength(4);
  const addBtn = screen.getByRole('button', { name: '+' });
  await userEvent.click(addBtn);
  const updatedSlots = container.querySelectorAll('div[title="Doble clic para borrar"]');
  expect(updatedSlots).toHaveLength(5);
});

test('generates an item token', async () => {
  render(<Inventory />);
  const input = screen.getByPlaceholderText(/buscar objeto/i);
  await userEvent.type(input, 'comida');
  const genBtn = screen.getByRole('button', { name: /generar/i });
  await userEvent.click(genBtn);
  expect(screen.getByText('🍖')).toBeInTheDocument();
});
