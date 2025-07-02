import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnemyCard from '../EnemyCard';

const mock = {
  id: '1',
  name: 'Goblin',
  description: 'Sneaky',
  imageUrl: '/img.png',
  challenge: 1,
  hp: 7,
  tags: ['easy'],
};

test('renders name and hp', () => {
  render(<EnemyCard {...mock} />);
  expect(screen.getByTestId('enemy-name')).toHaveTextContent('Goblin');
  expect(screen.getByTestId('enemy-hp')).toHaveTextContent('7');
});

test('shows menu on button click', async () => {
  render(<EnemyCard {...mock} />);
  await userEvent.click(screen.getByRole('button', { name: /actions/i }));
  expect(screen.getByText(/edit/i)).toBeInTheDocument();
});
