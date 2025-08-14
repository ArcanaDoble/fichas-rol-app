import { render } from '@testing-library/react';
import ItemToken from './ItemToken';

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}] }));

beforeEach(() => {
  localStorage.clear();
});

test('renders icon and count', () => {
  const { getByText } = render(<ItemToken id="1" type="comida" count={2} />);
  getByText('🍖');
  getByText('2');
});

test('supports new polvora type', () => {
  const { getByText } = render(<ItemToken id="2" type="polvora" count={1} />);
  getByText('💥');
  getByText('1');
});

test('renders custom item from localStorage', () => {
  localStorage.setItem(
    'customItems',
    JSON.stringify([
      {
        name: 'Gema',
        type: 'gema',
        icon: '💎',
        description: 'Una gema',
        color: '#00ff00',
      },
    ])
  );
  const { getByText } = render(<ItemToken id="3" type="gema" count={1} />);
  getByText('💎');
  getByText('1');
});
