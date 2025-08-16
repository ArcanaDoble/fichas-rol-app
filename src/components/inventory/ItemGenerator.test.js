import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemGenerator from './ItemGenerator';

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{}, () => {}] }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(),
  doc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  enableIndexedDbPersistence: jest.fn(() => Promise.resolve()),
}));

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

test('search input does not set a z-index so tooltips can overlap', () => {
  render(<ItemGenerator onGenerate={() => {}} />);
  const input = screen.getByPlaceholderText(/buscar objeto/i);
  expect(input.className).not.toMatch(/z-10/);
});
