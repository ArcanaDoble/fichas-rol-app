import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemGenerator from './ItemGenerator';

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{}, () => {}] }));

afterEach(() => {
  jest.clearAllMocks();
});

test('calls onGenerate when pressing Enter', async () => {
  const onGenerate = jest.fn();
  render(<ItemGenerator onGenerate={onGenerate} />);
  const input = screen.getByPlaceholderText(/buscar objeto/i);
  await userEvent.type(input, 'comida{enter}');
  expect(onGenerate).toHaveBeenCalledWith('comida');
});
