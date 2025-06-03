import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main menu', () => {
  render(<App />);
  const heading = screen.getByText(/¿Quién eres\?/i);
  expect(heading).toBeInTheDocument();
});
