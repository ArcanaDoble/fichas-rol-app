import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignTokenResources from '../CampaignTokenResources';
import CanvasTokenLife from '../CanvasTokenLife';

test('edits point totals, applies impact minus RD and renders one continuous crown at large Life', () => {
  const Fixture = () => {
    const [token, setToken] = useState({ id: 'yerma', profileType: 'campaignCharacter', actionDice: ['d6', 'd6', 'd6'], campaignPersonality: 'yerma', yermo: '9007199254740993',
      stats: { vida: { current: 53, max: 60 }, mente: { current: 5, max: 5 }, movimiento: { current: 2, max: 2 }, armadura: { current: 1, max: 1 } } });
    return <><CampaignTokenResources token={token} onUpdate={update => setToken(old => ({ ...old, ...update }))} />
      <CanvasTokenLife stats={token.stats} continuous name="Yerma" /></>;
  };
  const { container } = render(<Fixture />);
  expect(container.querySelectorAll('[data-life-block]')).toHaveLength(0);
  expect(container.querySelectorAll('[data-life-continuous]')).toHaveLength(1);
  expect(container.querySelector('.noma-token-life-crown--arc')).toBeInTheDocument();
  expect(screen.queryByLabelText('Dados de acción de Campaña')).not.toBeInTheDocument();
  expect(container.querySelector('.campaign-yermo')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Yermo' }));
  expect(screen.getByLabelText('Yermo actual')).toHaveValue('9007199254740994');
  fireEvent.click(screen.getByRole('button', { name: 'Reducir Yermo' }));
  expect(screen.getByLabelText('Yermo actual')).toHaveValue('9007199254740993');
  fireEvent.change(screen.getByLabelText(/Impacto/), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar daño' }));
  expect(screen.getByLabelText('Vida actual')).toHaveValue('42');
  fireEvent.change(screen.getByLabelText('Vida máximo'), { target: { value: '1000' } });
  expect(screen.getByLabelText('Vida máximo')).toHaveValue('1000');
  expect(container.querySelectorAll('[data-life-continuous]')).toHaveLength(1);
});

test('initial NPC threat edits copies and grades directly and preserves the legacy profile field', () => {
  const onUpdate = jest.fn();
  function Fixture() {
    const [token, setToken] = useState({ id: 'henry', profileType: 'rogueliteEnemy', threatDie: 'd8', stats: {} });
    return <CampaignTokenResources token={token} onUpdate={update => { onUpdate(update); setToken(old => ({ ...old, ...update })); }} />;
  }
  const { container } = render(<Fixture />);
  expect(container.querySelector('details')).toBeNull();
  expect(screen.getByRole('region', { name: 'Perfil inicial de Amenaza' })).toBeInTheDocument();
  expect(screen.getByText('1d8')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d8 de Amenaza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d20 de Amenaza' }));
  expect(onUpdate).toHaveBeenLastCalledWith({ threatDice: ['d8', 'd8', 'd20'], threatDie: 'd8' });
  expect(screen.getByText('2d8 + 1d20')).toBeInTheDocument();
  expect(screen.queryByText(/al confirmar/)).not.toBeInTheDocument();
  expect(screen.getByText(/Se aplica al siguiente combate/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar d8 de Amenaza' }));
  expect(onUpdate).toHaveBeenLastCalledWith({ threatDice: ['d8', 'd20'], threatDie: 'd8' });
  fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }));
  expect(onUpdate).toHaveBeenLastCalledWith({ threatDice: [], threatDie: null });
});

test('the player inspector cannot edit the initial NPC threat profile', () => {
  render(<CampaignTokenResources token={{ id: 'henry', profileType: 'rogueliteEnemy', threatDice: ['d20'], stats: {} }}
    onUpdate={jest.fn()} isPlayerView />);
  expect(screen.queryByRole('region', { name: 'Perfil inicial de Amenaza' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Añadir d/ })).not.toBeInTheDocument();
});
