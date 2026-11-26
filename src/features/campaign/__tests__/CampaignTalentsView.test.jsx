import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignTalentsView from '../CampaignTalentsView';

const makeCharacter = () => ({
  name: 'Yerma',
  level: 2,
  actionData: {
    movement: [{ id: 'move', name: 'Movimiento propio', desc: 'Regla guardada' }],
    reaction: ['Astuta', 'Soberbia', 'Atenta'].map((name) => ({
      id: name, name, desc: `Texto de ${name}`, isActive: true,
      campaignUses: { current: 1, max: 2 },
    })),
  },
  talents: {
    title: 'Clave personal',
    slots: ['Astuta', 'Soberbia', 'Atenta'].map((name) => ({ id: name, name, slotNote: 'Conservar' })),
  },
  features: [{ name: 'Uroboros', description: 'Rasgo propio', level: 2, color: 'gold', foilType: 'golden' }],
});

const renderCharacter = (initial, onChange = () => {}) => {
  const Harness = () => {
    const [character, setCharacter] = useState(initial);
    return <CampaignTalentsView character={character} onChange={(next) => {
      onChange(next);
      setCharacter(next);
    }} />;
  };
  return render(<Harness />);
};

test('restores the original editor and keeps talent edits synchronized with equipped copies', () => {
  let latest;
  renderCharacter(makeCharacter(), (next) => { latest = next; });
  expect(screen.getByRole('heading', { name: 'GUÍA DE ACCIONES & TALENTOS' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'RASGOS EXCLUSIVOS: Yerma' })).toBeInTheDocument();
  expect(screen.getByText('Uroboros')).toBeInTheDocument();
  expect(screen.getByText('Movimiento propio')).toBeInTheDocument();
  expect(screen.queryByText('Repertorio personal')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByDisplayValue('Astuta'), { target: { value: 'Astuta revisada' } });
  fireEvent.change(screen.getByDisplayValue('Texto de Astuta'), { target: { value: 'Nueva descripción' } });
  fireEvent.change(screen.getByDisplayValue('Uroboros'), { target: { value: 'Uroboros revisado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

  expect(latest.actionData.reaction[0]).toMatchObject({ name: 'Astuta revisada', desc: 'Nueva descripción', campaignUses: { current: 1, max: 2 } });
  expect(latest.talents.slots[0]).toMatchObject({ name: 'Astuta revisada', desc: 'Nueva descripción', slotNote: 'Conservar' });
  expect(latest.features[0]).toMatchObject({ name: 'Uroboros revisado', level: 2, color: 'gold', foilType: 'golden' });
  expect(latest.actionData.movement).toEqual(makeCharacter().actionData.movement);
  expect(latest.talents.title).toBe('Clave personal');
});

test('creating, toggling and deleting talents preserves the three active slots', () => {
  let latest;
  renderCharacter(makeCharacter(), (next) => { latest = next; });
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir Talento' }));
  fireEvent.change(screen.getByDisplayValue('Nueva Acción'), { target: { value: 'Talento propio' } });
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  const newTalent = latest.actionData.reaction.find((talent) => talent.name === 'Talento propio');

  fireEvent.click(screen.getByText('Talento propio'));
  expect(latest.talents.slots.map((talent) => talent.id)).toEqual(['Astuta', 'Soberbia', 'Atenta']);
  fireEvent.click(screen.getByText('Astuta'));
  fireEvent.click(screen.getByText('Talento propio'));
  expect(latest.talents.slots.map((talent) => talent?.id)).toEqual([newTalent.id, 'Soberbia', 'Atenta']);

  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const talentCard = screen.getByDisplayValue('Talento propio').parentElement;
  fireEvent.click(talentCard.querySelector('button'));
  expect(latest.talents.slots[0]).toBeNull();
  expect(latest.actionData.reaction.map((talent) => talent.id)).toEqual(['Astuta', 'Soberbia', 'Atenta']);
});

test('read-only characters cannot edit or toggle talents', () => {
  const onChange = jest.fn();
  render(<CampaignTalentsView character={makeCharacter()} onChange={onChange} readOnly />);
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Astuta'));
  expect(onChange).not.toHaveBeenCalled();
});
