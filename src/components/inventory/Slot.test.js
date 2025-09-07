import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Slot from './Slot';

beforeAll(() => {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  });
});

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{ isOver: false }, () => {}] }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  getFirestore: jest.fn(() => ({})),
  enableIndexedDbPersistence: jest.fn(() => Promise.resolve()),
}));

const { getDocs } = require('firebase/firestore');

beforeEach(() => {
  getDocs.mockClear();
  getDocs.mockResolvedValue({ docs: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders item token when item prop provided', () => {
  const { getByText } = render(<Slot id={1} item={{ type: 'remedio', count: 2 }} />);
  getByText('💊');
  getByText('2');
});

test('calls onDelete on double click when empty', () => {
  const onDelete = jest.fn();
  const { getByTitle } = render(<Slot id={1} onDelete={onDelete} />);
  fireEvent.doubleClick(getByTitle(/doble clic/i));
  expect(onDelete).toHaveBeenCalled();
});

test('applies custom border color when item has custom color', async () => {
  getDocs.mockResolvedValue({
    docs: [
      {
        data: () => ({ type: 'gema', color: '#00ff00', name: 'Gema', icon: '💎', description: 'Una gema' }),
      },
    ],
  });

  render(<Slot id={1} item={{ type: 'gema', count: 1 }} />);
  const slot = await screen.findByTitle(/doble clic/i);
  await waitFor(() => expect(slot).toHaveStyle({ borderColor: '#00ff00' }));
});
