import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import CanvasCombatPanel from '../CanvasCombatPanel';
import { createCanvasCombatState, markParticipantActed, submitActionDice } from '../../combat/canvasCombatState';

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
    expect(screen.getByText(/Iniciativa y dados de acción/i)).toBeInTheDocument();
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

  it('renders the first action pool after the initiative roll without rolling again and updates status to Reservado', () => {
    const active = submitActionDice(createCanvasCombatState([token]), token.id, [8, 4, 2], { random: () => 0 });
    const runtime = createRuntime(active);
    const { rerender } = render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView />);

    const dieButton = screen.getByLabelText('d8 con resultado 8: Disponible');
    expect(dieButton).toBeInTheDocument();
    expect(screen.getByLabelText('d6 con resultado 4: Disponible')).toBeInTheDocument();
    expect(screen.getByLabelText('d4 con resultado 2: Disponible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tirar aquí' })).not.toBeInTheDocument();

    fireEvent.click(dieButton);
    expect(runtime.updateDieStatus).toHaveBeenCalledWith(token.id, expect.any(String), 'committed');

    // When status is committed, it displays 'Reservado'
    const committedState = {
      ...active,
      participants: {
        ...active.participants,
        [token.id]: {
          ...active.participants[token.id],
          actionDice: [
            { ...active.participants[token.id].actionDice[0], status: 'committed' },
            ...active.participants[token.id].actionDice.slice(1),
          ],
        },
      },
    };

    rerender(<CanvasCombatPanel activeTab="ROUND" combatRuntime={createRuntime(committedState)} isPlayerView={false} />);
    expect(screen.getByLabelText('d8 con resultado 8: Reservado')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
  });

  it('renders participant portraits and enemy actions (Movimiento and Ataque) with Finalizar turno button', () => {
    const enemyToken = {
      id: 'goblin-token',
      name: 'Duende',
      portrait: 'goblin.webp',
      profileType: 'rogueliteEnemy',
      threatDie: 'd6',
      stats: { iniciativa: { current: 3, max: 3 } },
    };

    const state = createCanvasCombatState([token, enemyToken]);
    const active = submitActionDice(state, token.id, [6, 4, 2], { random: () => 0 });
    const updateEnemyActionStatus = jest.fn();
    const activateEnemySprint = jest.fn();
    const completeActivation = jest.fn();
    const runtime = {
      ...createRuntime(active),
      controlledTokenIds: [token.id, enemyToken.id],
      updateEnemyActionStatus,
      activateEnemySprint,
      completeActivation,
    };

    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView={false} />);

    // Check portraits are rendered in round
    const images = document.querySelectorAll('img');
    expect(images.length).toBeGreaterThanOrEqual(2);

    // Check enemy actions
    const moveAction = screen.getByRole('button', { name: 'Movimiento: Disponible' });
    const attackAction = screen.getByRole('button', { name: 'Ataque: Disponible' });
    expect(moveAction).toBeInTheDocument();
    expect(attackAction).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correr: Completo' })).toBeDisabled();

    fireEvent.click(moveAction);
    expect(updateEnemyActionStatus).toHaveBeenCalledWith('goblin-token', 'movement', 'committed');

    // Check the Roguelite activation action (the legacy end-turn label no longer applies)
    const finishTurnBtn = screen.getByRole('button', { name: 'Finalizar turno' });
    expect(finishTurnBtn).toBeInTheDocument();
    fireEvent.click(finishTurnBtn);
    expect(completeActivation).toHaveBeenCalledWith(expect.any(String));
  });

  it('offers enemy Correr after movement has been spent and consumes Ataque through the runtime', () => {
    const enemyToken = {
      id: 'goblin-token',
      name: 'Duende',
      profileType: 'rogueliteEnemy',
      stats: {
        iniciativa: { current: 3, max: 3 },
        movimiento: { current: 3, max: 3 },
      },
    };
    const active = createCanvasCombatState([enemyToken]);
    const participant = active.participants[enemyToken.id];
    const movedState = {
      ...active,
      participants: {
        ...active.participants,
        [enemyToken.id]: {
          ...participant,
          movementRuntime: { ...participant.movementRuntime, spent: 2 },
          enemyActions: participant.enemyActions.map((action) => (
            action.id === 'movement' ? { ...action, status: 'spent' } : action
          )),
        },
      },
    };
    const activateEnemySprint = jest.fn();
    const runtime = {
      ...createRuntime(movedState),
      controlledTokenIds: [enemyToken.id],
      activateEnemySprint,
    };

    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView={false} />);

    const sprintButton = screen.getByRole('button', { name: 'Correr: Gasta ataque' });
    expect(sprintButton).toBeEnabled();
    fireEvent.click(sprintButton);
    expect(activateEnemySprint).toHaveBeenCalledWith(enemyToken.id);
  });

  it('allows switching between Combate and Tirada libre sub-tabs', () => {
    const token = {
      id: 'barbarian-token',
      name: 'Bárbaro',
      profileType: 'rogueliteClass',
      linkedClassId: 'barbarian',
      actionDice: ['d8', 'd6', 'd4'],
      stats: { iniciativa: { current: 2, max: 2 } },
    };

    const runtime = createRuntime(createCanvasCombatState([token]));
    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView={false} playerName="Máster" />);

    // Initially in Combate view
    expect(screen.getByText('Ronda 1')).toBeInTheDocument();

    // Switch to Tirada libre
    const freeDiceBtn = screen.getByRole('button', { name: 'Tirada libre' });
    fireEvent.click(freeDiceBtn);

    expect(screen.getByTestId('canvas-dice-table')).toBeInTheDocument();

    // Switch back to Combate
    const combatBtn = screen.getByRole('button', { name: 'Combate' });
    fireEvent.click(combatBtn);

    expect(screen.getByText('Ronda 1')).toBeInTheDocument();
  });

  it('lets the master reopen the turn of the specific token that already acted', () => {
    let state = submitActionDice(
      createCanvasCombatState([token]),
      token.id,
      [7, 4, 2],
      { random: () => 0 },
    );
    state = markParticipantActed(state, token.id);
    const runtime = createRuntime(state);

    render(<CanvasCombatPanel activeTab="ROUND" combatRuntime={runtime} isPlayerView={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir turno' }));

    expect(runtime.undoActivation).toHaveBeenCalledWith(token.id);
  });
});
