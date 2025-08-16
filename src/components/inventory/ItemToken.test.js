import { render, screen } from '@testing-library/react';
import ItemToken from './ItemToken';

jest.mock('react-dnd', () => ({ useDrag: () => [{}, () => {}] }));
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

test('renders icon and count', async () => {
  render(<ItemToken id="1" type="comida" count={2} />);
  await screen.findByText('🍖');
  await screen.findByText('2');
});

test('supports new polvora type', async () => {
  render(<ItemToken id="2" type="polvora" count={1} />);
  await screen.findByText('💥');
  await screen.findByText('1');
});

test('custom image is not draggable', async () => {
  getDocs.mockResolvedValue({
    docs: [
      {
        data: () => ({
          name: 'Foto',
          type: 'foto',
          icon: 'data:image/png;base64,abc',
          description: 'Una foto',
          color: '#ffffff',
        }),
      },
    ],
  });
  render(<ItemToken id="4" type="foto" count={1} />);
  const img = await screen.findByAltText('foto');
  expect(img).toHaveAttribute('draggable', 'false');
});

test('renders custom item from firestore', async () => {
  getDocs.mockResolvedValue({
    docs: [
      {
        data: () => ({
          name: 'Gema',
          type: 'gema',
          icon: '💎',
          description: 'Una gema',
          color: '#00ff00',
        }),
      },
    ],
  });
  render(<ItemToken id="3" type="gema" count={1} />);
  await screen.findByText('💎');
  await screen.findByText('1');
});
