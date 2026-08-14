import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EnemyModeSelector from '../EnemyModeSelector';

test('separa explícitamente el bestiario tradicional del Roguelite', () => {
  const onSelect = jest.fn();
  render(<EnemyModeSelector onBack={jest.fn()} onSelect={onSelect} />);

  expect(screen.getByRole('heading', { name: /fichas de enemigos/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /roguelite/i }));
  expect(onSelect).toHaveBeenCalledWith('roguelite');
  fireEvent.click(screen.getByRole('button', { name: /rol tradicional/i }));
  expect(onSelect).toHaveBeenCalledWith('role');
});

