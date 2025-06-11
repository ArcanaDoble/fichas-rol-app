import { render } from '@testing-library/react';
import ItemToken from './ItemToken';

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}] }));

test('renders icon and count', () => {
  const { getByText } = render(<ItemToken id="1" type="comida" count={2} />);
  getByText('🍖');
  getByText('2');
});
