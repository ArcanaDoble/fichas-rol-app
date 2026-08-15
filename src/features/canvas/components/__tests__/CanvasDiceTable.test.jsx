import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { CanvasDiceTable } from '../CanvasDiceTable';

describe('CanvasDiceTable', () => {
  it('renders all 6 supported dice buttons (d4, d6, d8, d10, d12, d20) with critical toggle', () => {
    render(<CanvasDiceTable combatRuntime={{}} isPlayerView={false} playerName="Máster" />);

    expect(screen.getByTitle(/Pulsar para marcar D4 como crítico/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Pulsar para marcar D6 como crítico/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Pulsar para marcar D8 como crítico/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Pulsar para marcar D10 como crítico/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Pulsar para marcar D12 como crítico/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Pulsar para marcar D20 como crítico/i)).toBeInTheDocument();
  });

  it('allows toggling critical/explosive state for a die', () => {
    render(<CanvasDiceTable combatRuntime={{}} isPlayerView={false} playerName="Máster" />);

    const d6Button = screen.getByTitle(/Pulsar para marcar D6 como crítico/i);
    fireEvent.click(d6Button);

    expect(screen.getByTitle(/D6 es crítico \(pulsa para quitar\)/i)).toBeInTheDocument();
  });

  it('allows adding and removing dice from the pool', () => {
    render(<CanvasDiceTable combatRuntime={{}} isPlayerView={false} playerName="Máster" />);

    const addD4 = screen.getByRole('button', { name: 'Añadir D4' });
    const addD8 = screen.getByRole('button', { name: 'Añadir D8' });
    const countD4 = screen.getByTestId('dice-count-d4');
    const countD8 = screen.getByTestId('dice-count-d8');

    expect(countD4).toHaveTextContent('0');
    fireEvent.click(addD4);
    expect(countD4).toHaveTextContent('1');

    fireEvent.click(addD8);
    expect(countD8).toHaveTextContent('1');

    // Remove one d4
    const removeD4 = screen.getByRole('button', { name: 'Quitar D4' });
    fireEvent.click(removeD4);
    expect(countD4).toHaveTextContent('0');
  });

  it('executes rollFreeDice with pool and explosive map when clicking Lanzar reserva', () => {
    const rollFreeDice = jest.fn();

    const runtime = {
      canvasRolls: [],
      rollFreeDice,
    };

    render(<CanvasDiceTable combatRuntime={runtime} isPlayerView playerName="Bárbaro" />);

    // Add 1d4 and 1d8
    fireEvent.click(screen.getByRole('button', { name: 'Añadir D4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir D8' }));
    // Mark D8 as critical
    fireEvent.click(screen.getByTitle(/Pulsar para marcar D8 como crítico/i));

    const rollBtn = screen.getByRole('button', { name: /Lanzar reserva/i });
    expect(rollBtn).toBeInTheDocument();

    fireEvent.click(rollBtn);
    expect(rollFreeDice).toHaveBeenCalledWith(
      { 4: 1, 6: 0, 8: 1, 10: 0, 12: 0, 20: 0 },
      expect.objectContaining({
        rolledBy: 'Bárbaro',
        explosive: expect.objectContaining({ 8: true }),
      }),
    );
  });

  it('renders synchronized roll history and allows toggling die exclusion', () => {
    const historyRolls = [
      {
        id: 'roll-h1',
        rolledBy: 'Pícaro',
        formula: '2d6',
        dice: [{ faces: 6, value: 4 }, { faces: 6, value: 5 }],
        total: 9,
        effectiveTotal: 9,
        excludedRollIndexes: [],
        timestamp: Date.now(),
      },
    ];

    const clearRollHistory = jest.fn();
    const toggleRollDie = jest.fn();
    const runtime = {
      canvasRolls: historyRolls,
      clearRollHistory,
      toggleRollDie,
    };

    render(<CanvasDiceTable combatRuntime={runtime} isPlayerView={false} playerName="Máster" />);

    expect(screen.getByText('Últimas Tiradas')).toBeInTheDocument();
    expect(screen.getByText('Pícaro')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();

    // Toggle first die in roll
    const dieButton = screen.getAllByTitle('Anular dado')[0];
    fireEvent.click(dieButton);
    expect(toggleRollDie).toHaveBeenCalledWith('roll-h1', 0);

    const clearBtn = screen.getByRole('button', { name: 'Limpiar historial' });
    fireEvent.click(clearBtn);
    expect(clearRollHistory).toHaveBeenCalled();
  });

  it('allows adding and adjusting flat modifiers into the roll', () => {
    const rollFreeDice = jest.fn();
    const runtime = {
      canvasRolls: [],
      rollFreeDice,
    };

    render(<CanvasDiceTable combatRuntime={runtime} isPlayerView playerName="Bárbaro" />);

    expect(screen.getByText('Modificador fijo')).toBeInTheDocument();

    // Increase flat modifier +5 and +1 -> +6
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar modificador' }));

    const modifierInput = screen.getByLabelText('Valor del modificador fijo');
    expect(modifierInput).toHaveValue(6);

    // Roll
    const rollBtn = screen.getByRole('button', { name: 'Lanzar reserva' });
    fireEvent.click(rollBtn);

    expect(rollFreeDice).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        modifier: 6,
      }),
    );
  });
});
