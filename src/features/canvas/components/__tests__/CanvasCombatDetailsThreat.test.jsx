import React from 'react';
import { render, screen } from '@testing-library/react';
import { DefenseRollSummary, IncomingAttackDice } from '../CanvasCombatDetails';

jest.mock('../../../../utils/equipmentImages', () => ({ resolveEquipmentImage: () => null }));

test('shows each incoming Threat result, including repeated types and a zero reserve', () => {
  const { container } = render(<IncomingAttackDice pending={{
    attackThreatDice: [
      { id: 'reserve', sides: 8, value: 0, source: 'stored' },
      { id: 'first', sides: 4, value: 3, source: 'custom' },
      { id: 'second', sides: 4, value: 3, source: 'custom' },
    ],
    attackThreatUsed: { sides: 4, value: 6 },
    pressure: { threatPressure: 6 },
  }} />);
  expect(screen.getByLabelText('Amenaza: 0 en d8')).toBeInTheDocument();
  expect(screen.getAllByLabelText('Amenaza: 3 en d4')).toHaveLength(2);
  expect(container.querySelectorAll('.combat-roll-die svg')).toHaveLength(3);
  expect(screen.queryByLabelText('Amenaza: 6 en d4')).not.toBeInTheDocument();
});

test('keeps legacy attack and defense Threat separate after a defense is rolled', () => {
  const pending = {
    status: 'defense-rolled',
    attackThreatUsed: { sides: 8, value: 6, source: 'stored' },
    threatUsed: { id: 'legacy-defense', sides: 4, value: 2, source: 'custom' },
    defenseItem: { name: 'Daga' }, defenseDice: [{ id: 'equipment', sides: 4, value: 1 }],
  };
  const { rerender } = render(<IncomingAttackDice pending={pending} />);
  expect(screen.getByLabelText('Amenaza: 6 en d8')).toBeInTheDocument();
  expect(screen.queryByLabelText('Amenaza: 2 en d4')).not.toBeInTheDocument();
  rerender(<DefenseRollSummary pending={pending} />);
  expect(screen.getByLabelText('Defensa: 1 en d4')).toBeInTheDocument();
  expect(screen.getByLabelText('Amenaza: 2 en d4')).toBeInTheDocument();
  expect(screen.queryByLabelText('Amenaza: 6 en d8')).not.toBeInTheDocument();
});

test('shows only the actual defensive Threat dice instead of a legacy aggregate', () => {
  render(<DefenseRollSummary pending={{
    status: 'defense-rolled', defenseItem: { name: 'Daga' },
    defenseDice: [{ id: 'equipment', sides: 4, value: 1 }],
    defenseThreatDice: [
      { id: 'first', sides: 6, value: 5, source: 'custom' },
      { id: 'second', sides: 6, value: 5, source: 'custom' },
      { id: 'reserve', sides: 8, value: 0, source: 'stored' },
    ],
    threatUsed: { sides: 6, value: 10, source: 'custom' },
  }} />);
  expect(screen.getAllByLabelText('Amenaza: 5 en d6')).toHaveLength(2);
  expect(screen.getByLabelText('Amenaza: 0 en d8')).toBeInTheDocument();
  expect(screen.queryByLabelText('Amenaza: 10 en d6')).not.toBeInTheDocument();
});

test('keeps an old aggregate visible as a flat total without inventing a die', () => {
  const { container, rerender } = render(<IncomingAttackDice pending={{ pressure: { threatPressure: 9 } }} />);
  expect(screen.getByLabelText('Amenaza: 9 en total')).toHaveTextContent('9');
  expect(container.querySelector('svg')).not.toBeInTheDocument();
  rerender(<IncomingAttackDice pending={{ attackThreatDice: [], pressure: { threatPressure: 9 } }} />);
  expect(screen.queryByText('Amenaza')).not.toBeInTheDocument();
});
