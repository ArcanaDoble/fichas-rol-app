import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombatReactionModal from '../CombatReactionModal';

jest.mock('../CombatModifiersPanel', () => () => null);
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
