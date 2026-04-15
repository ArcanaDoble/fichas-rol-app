import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombatReactionModal from '../CombatReactionModal';

jest.mock('../CombatModifiersPanel', () => ({
  __esModule: true,
  default: () => null,
  applyModifiersToWeapon: (weapon) => ({ ...weapon }),
}));
jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(),
  getCustomImage: () => null,
}));

const baseEvent = {
  id: 'event-1',
  status: 'esperando_reaccion',
  attackerName: 'Atacante',
  attackerRollResult: {
    details: [
      {
        type: 'dice',
        formula: '1d6',
        rolls: [4],
      },
    ],
  },
  weapon: { nombre: 'Espada' },
};

const baseTargetToken = {
  velocidad: 0,
  equippedItems: [
    {
      type: 'weapon',
      nombre: 'Daga',
      consumo: 1,
      dano: '1d6',
    },
  ],
};

test('blocks duplicate confirm submissions while reaction is being sent', async () => {
  let resolveReaction;
  const onReact = jest.fn(
    () =>
      new Promise((resolve) => {
        resolveReaction = resolve;
      })
  );

  render(
    <CombatReactionModal
      event={baseEvent}
      targetToken={baseTargetToken}
      onReact={onReact}
    />
  );

  await userEvent.click(screen.getByRole('button', { name: /recibir golpe/i }));
  const confirmButton = screen.getByRole('button', { name: /confirmar/i });

  await userEvent.dblClick(confirmButton);

  expect(onReact).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled();

  resolveReaction();

  await waitFor(() => expect(onReact).toHaveBeenCalledTimes(1));
});

test('blocks duplicate close submissions on resolved events', async () => {
  let resolveReaction;
  const onReact = jest.fn(
    () =>
      new Promise((resolve) => {
        resolveReaction = resolve;
      })
  );

  render(
    <CombatReactionModal
      event={{
        ...baseEvent,
        status: 'resuelto',
        result: {
          attackerName: 'Atacante',
          targetName: 'Defensor',
          reactionType: 'recibir',
          attackerDice: [],
          damage: 4,
          blocksLost: { postura: 1, armadura: 0, vida: 0 },
        },
      }}
      targetToken={baseTargetToken}
      onReact={onReact}
    />
  );

  const continueButton = screen.getByRole('button', { name: /continuar/i });
  await userEvent.dblClick(continueButton);

  expect(onReact).toHaveBeenCalledTimes(1);
  expect(onReact).toHaveBeenCalledWith({ type: 'cerrar' });

  resolveReaction();

  await waitFor(() => expect(onReact).toHaveBeenCalledTimes(1));
});

test('keeps resolved modal constrained to the viewport-friendly mobile layout', () => {
  render(
    <CombatReactionModal
      event={{
        ...baseEvent,
        status: 'resuelto',
        result: {
          attackerName: 'Atacante',
          targetName: 'Defensor',
          reactionType: 'parar',
          attackerDice: [
            { id: 'a1', value: 10, faces: 10 },
            { id: 'a2', value: 9, faces: 10 },
            { id: 'a3', value: 6, faces: 10, matchedAttr: 'vigor' },
            { id: 'a4', value: 8, faces: 10, matchedAttr: 'vigor' },
          ],
          defenderDice: [
            { id: 'd1', value: 5, faces: 10 },
            { id: 'd2', value: 3, faces: 10 },
            { id: 'd3', value: 1, faces: 10, matchedAttr: 'destreza' },
            { id: 'd4', value: 6, faces: 10, matchedAttr: 'destreza' },
          ],
          attackTotal: 33,
          defenderTotal: 15,
          defenderWeapon: 'Pica',
          damage: 18,
          blocksLost: { postura: 1, armadura: 1, vida: 0 },
        },
      }}
      targetToken={baseTargetToken}
      onReact={jest.fn()}
      queueTotal={2}
      queueResolved={1}
      queueCurrent={1}
    />
  );

  const modalCard = screen.getByTestId('combat-reaction-modal-card');
  expect(modalCard).toHaveClass('flex', 'flex-col', 'max-h-[calc(100dvh-1rem)]');
  expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
});

test('permite combinar evasión y parada dentro del mismo presupuesto de reacción', async () => {
  const onReact = jest.fn();
  const targetToken = {
    ...baseTargetToken,
    equippedItems: [
      {
        type: 'weapon',
        nombre: 'Escudo',
        consumo: 2,
        dano: '1d6',
      },
    ],
  };

  const event = {
    ...baseEvent,
    reactionBudget: 3,
    attackerRollResult: {
      total: 15,
      details: [
        {
          type: 'dice',
          formula: '3d6',
          rolls: [4, 5, 6],
        },
      ],
    },
  };

  render(
    <CombatReactionModal
      event={event}
      targetToken={targetToken}
      onReact={onReact}
    />
  );

  await userEvent.click(screen.getByRole('button', { name: /evadir/i }));
  await userEvent.click(screen.getAllByTitle(/dado de arma/i)[0]);
  await userEvent.click(screen.getByRole('button', { name: /parar/i }));

  const addParryButton = await screen.findByRole('button', { name: /añadir parada/i });
  await waitFor(() => expect(addParryButton).toBeEnabled());
  await userEvent.click(addParryButton);
  await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

  expect(onReact).toHaveBeenCalledWith({
    type: 'parar',
    data: expect.objectContaining({
      evadedDiceIds: ['0-0'],
      yellowCost: 3,
      parryCost: 2,
      evadeCost: 1,
      reactionBudget: 3,
      parrySteps: expect.arrayContaining([
        expect.objectContaining({
          weaponName: 'Escudo',
          yellowCost: 2,
        }),
      ]),
    }),
  });
});
