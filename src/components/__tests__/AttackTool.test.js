import { render, screen } from '@testing-library/react';
import React from 'react';
import AttackModal from '../AttackModal';

test('attack modal renders distance', () => {
  render(<AttackModal isOpen attacker={{ name: 'A', tokenSheetId: '1' }} target={{ name: 'B', tokenSheetId: '2' }} distance={5} onClose={() => {}} />);
  expect(screen.getByText(/5 casillas/)).toBeInTheDocument();
});
