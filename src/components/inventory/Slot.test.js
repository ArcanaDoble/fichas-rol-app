import { render, fireEvent } from '@testing-library/react';
import Slot from './Slot';

beforeAll(() => {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  });
});

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}], useDrop: () => [{ isOver: false }, () => {}] }));

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
