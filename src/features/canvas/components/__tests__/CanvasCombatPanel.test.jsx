import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import CanvasCombatPanel from '../CanvasCombatPanel';
import { createCanvasCombatState, submitActionDice } from '../../combat/canvasCombatState';

const token = {
  id: 'barbarian-token',
  name: 'Bárbaro',
  portrait: 'barbarian.webp',
  profileType: 'rogueliteClass',
  actionDice: ['d8', 'd6', 'd4'],
  stats: { iniciativa: { current: 2, max: 2 } },
};

const createRuntime = (combatState = null) => ({
  combatState,
  controlledTokenIds: [token.id],
  startCombat: jest.fn(),
  submitRoll: jest.fn(() => true),
  rollActionDice: jest.fn(),
  updateDieStatus: jest.fn(),
  completeActivation: jest.fn(),
  nextRound: jest.fn(),
  undoActivation: jest.fn(),
  finishCombat: jest.fn(),
});

describe('CanvasCombatPanel', () => {
  it('explains and starts combat from the master Canvas sidebar', () => {
    const runtime = createRuntime();
    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar combate' }));
    expect(runtime.startCombat).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/conserva esos mismos dados.*primera ronda/i)).toBeInTheDocument();
  });

  it('shows the exact dice profile inherited from the class and accepts table results', () => {
    const runtime = createRuntime(createCanvasCombatState([token]));
    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView />);

    expect(screen.getByText('D8 · D6 · D4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anotar mesa' }));
    fireEvent.change(screen.getByLabelText('Resultado de d8'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Resultado de d6'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Resultado de d4'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(runtime.submitRoll).toHaveBeenCalledWith(token.id, [7, 5, 3], 'manual');
  });

  it('renders the first action pool after the initiative roll without rolling again', () => {
    const active = submitActionDice(createCanvasCombatState([token]), token.id, [8, 4, 2], { random: () => 0 });
    const runtime = createRuntime(active);
    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView />);

    expect(screen.getByLabelText('d8 con resultado 8: Disponible')).toBeInTheDocument();
    expect(screen.getByLabelText('d6 con resultado 4: Disponible')).toBeInTheDocument();
    expect(screen.getByLabelText('d4 con resultado 2: Disponible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tirar aquí' })).not.toBeInTheDocument();
  });
});
