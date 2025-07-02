import { render, screen } from '@testing-library/react';
import EnemyModule from '../EnemyModule';

test('renders search input', () => {
  render(<EnemyModule />);
  expect(screen.getByRole('searchbox')).toBeInTheDocument();
});
