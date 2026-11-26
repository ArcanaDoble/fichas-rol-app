import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RogueliteEnemyCard from '../RogueliteEnemyCard';
import { createEmptyRogueliteEnemy } from '../enemyModel';
import { createEmptyCampaignNpc } from '../campaignNpcModel';

jest.mock('../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(), getCustomImage: () => null,
}));
jest.mock('../../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));

test.each(['campaignNpc', 'roguelite'])('permite escribir comas, guardar y seguir editando los rasgos en %s', async (variant) => {
  const saveAbility = jest.fn().mockResolvedValue(undefined);
  function Editor() {
    const [enemy, setEnemy] = useState(() => ({
      ...(variant === 'campaignNpc' ? createEmptyCampaignNpc() : createEmptyRogueliteEnemy()),
      abilitySlotCount: 1,
      abilitySlots: [],
    }));
    return <RogueliteEnemyCard enemy={enemy} variant={variant} equipmentCatalog={[]} abilityLibrary={[]}
      onChange={setEnemy} onSave={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()}
      onSaveAbility={saveAbility} onLaunch={jest.fn()} />;
  }
  render(<Editor />);
  await userEvent.click(screen.getByText('Pulsa para crear o reutilizar una habilidad'));
  await userEvent.click(screen.getByRole('button', { name: 'Crear / editar' }));
  const dialog = screen.getByRole('dialog');
  await userEvent.clear(within(dialog).getByLabelText('Nombre'));
  await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Golpe de prueba');
  const traits = within(dialog).getByLabelText('Rasgos');
  await userEvent.type(traits, 'Derribo, ');
  expect(traits).toHaveValue('Derribo, ');
  await userEvent.type(traits, 'Empuje,  Crítico, ');
  expect(traits).toHaveValue('Derribo, Empuje,  Crítico, ');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Aplicar habilidad' }));
  await waitFor(() => expect(saveAbility).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Golpe de prueba', traits: ['Derribo', 'Empuje', 'Crítico'],
  })));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /Golpe de prueba/ }));
  const reopened = within(screen.getByRole('dialog')).getByLabelText('Rasgos');
  expect(reopened).toHaveValue('Derribo, Empuje, Crítico');
  await userEvent.type(reopened, ', Sangrado');
  expect(reopened).toHaveValue('Derribo, Empuje, Crítico, Sangrado');
});
