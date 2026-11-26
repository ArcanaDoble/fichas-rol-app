import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ParryFreePreview, { initialRound, isRevealed, projectRound, roundReducer } from '../../../../../docs/design/prototypes/parry-free/ParryFreePreview';

jest.mock('../CanvasCombatDetails', () => ({ ActionDieButton: () => null }));

const choose = zone => fireEvent.click(screen.getByRole('radio', { name: zone }));
const lock = () => fireEvent.click(screen.getByRole('button', { name: 'Fijar elección' }));
const switchView = controller => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${controller}`) }));

test('neither view can reveal the opponent choice before both lock, even if the master goes second', () => {
  let round = initialRound();
  round = roundReducer(round, { type:'choose', seat:'player', zone:'izquierda' });
  round = roundReducer(round, { type:'lock', seat:'player' });
  const master = projectRound(round, 'master');
  expect(master).toMatchObject({ ownChoice:null, ownLocked:false, result:null, revealed:false });
  expect(JSON.stringify(master)).not.toContain('izquierda');
  expect(master.locked.player).toBe(true);
  const fixed = roundReducer(round, { type:'choose', seat:'player', zone:'derecha' });
  expect(fixed).toBe(round);
  expect(roundReducer(round, { type:'next', swap:true })).toBe(round);
  round = roundReducer(round, { type:'choose', seat:'master', zone:'arriba' });
  const player = projectRound(round, 'player');
  expect(JSON.stringify(player)).not.toContain('arriba');
  round = roundReducer(round, { type:'lock', seat:'master' });
  expect(isRevealed(round)).toBe(true);
  expect(projectRound(round, 'player').result).toEqual({ attack:'arriba', parry:'izquierda', matched:false });
});

test('the actual player/master windows keep secrets, lock immutably, and reveal a missed parry together', () => {
  const { container } = render(<ParryFreePreview />);
  expect(screen.getByRole('button', { name:'Fijar elección' })).toBeDisabled();
  choose('Izquierda'); lock();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name:'Tu elección fijada: Izquierda' })).toBeInTheDocument();
  switchView('Máster');
  expect(screen.queryByText('Izquierda')).not.toBeInTheDocument();
  expect(container.querySelector('[data-zone="izquierda"]')).toHaveAttribute('data-active','false');
  expect(screen.getByRole('radiogroup', { name:'Zona de ataque' })).toBeInTheDocument();
  choose('Arriba');
  switchView('Jugador');
  expect(screen.queryByText('Arriba')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name:'Tu elección fijada: Izquierda' })).toBeInTheDocument();
  switchView('Máster'); lock();
  expect(screen.getByRole('heading', { name:'Las zonas no coinciden' })).toHaveFocus();
  expect(screen.getByRole('img', { name:'Ataque: Arriba. Parry: Izquierda.' })).toBeInTheDocument();
  expect(container.querySelector('[data-zone="arriba"] .polish-lance').getAttribute('fill')).toMatch(/-red\)$/);
  expect(container.querySelector('[data-zone="izquierda"] .polish-lance').getAttribute('fill')).toMatch(/-blue\)$/);
  switchView('Jugador');
  expect(screen.getByRole('img', { name:'Ataque: Arriba. Parry: Izquierda.' })).toBeInTheDocument();
});

test('master can lock first; matching center, repeat and swap clear both secrets and change the defending portrait', () => {
  const { container } = render(<ParryFreePreview />);
  switchView('Máster'); choose('Centro'); lock();
  switchView('Jugador');
  expect(screen.getByRole('radio', { name:'Centro' })).toHaveAttribute('aria-checked','false');
  choose('Centro'); lock();
  expect(screen.getByRole('heading', { name:'Las zonas coinciden' })).toBeInTheDocument();
  expect(container.querySelector('.polish-rose-center')).toHaveAttribute('data-guard','true');
  expect(container.querySelector('.polish-rose-center')).toHaveAttribute('data-active','true');
  fireEvent.click(screen.getByRole('button', { name:/Otra ronda/ }));
  expect(screen.getByText('Campaña · Ronda 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name:'Fijar elección' })).toBeDisabled();
  choose('Abajo'); lock(); switchView('Máster'); choose('Abajo'); lock();
  fireEvent.click(screen.getByRole('button', { name:'Intercambiar roles' }));
  expect(screen.getByText('Campaña · Ronda 3')).toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name:'Zona de parry' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name:'Tirador' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name:'Fijar elección' })).toBeDisabled();
  switchView('Jugador');
  expect(screen.getByRole('radiogroup', { name:'Zona de ataque' })).toBeInTheDocument();
});

test('keyboard, mobile preview and closing/reopening retain the current round without editing a locked choice', () => {
  const { container } = render(<ParryFreePreview />);
  fireEvent.click(screen.getByRole('button', { name:'Móvil' }));
  expect(container.querySelector('.parry-preview-body')).toHaveAttribute('data-device','mobile');
  fireEvent.keyDown(screen.getByRole('radiogroup'), { key:'ArrowRight' });
  expect(screen.getByRole('radio', { name:'Derecha' })).toHaveAttribute('aria-checked','true');
  lock();
  fireEvent.keyDown(document, { key:'Escape' });
  expect(screen.queryByRole('region', { name:'Parry libre' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:/Volver a la ronda/ }));
  expect(screen.getByRole('img', { name:'Tu elección fijada: Derecha' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'Reiniciar prueba' }));
  expect(screen.getByRole('button', { name:'Fijar elección' })).toBeDisabled();
});

test('conversation preferences restore only the view and size, and never save the secret zones', () => {
  globalThis.openai = { widgetState:{ privateContent:{ seat:'master', device:'mobile' } }, setWidgetState:jest.fn().mockResolvedValue(undefined) };
  const { container, unmount } = render(<ParryFreePreview />);
  expect(container.querySelector('.parry-preview-body')).toHaveAttribute('data-device','mobile');
  expect(screen.getByRole('radiogroup', { name:'Zona de ataque' })).toBeInTheDocument();
  choose('Abajo'); lock();
  expect(globalThis.openai.setWidgetState).not.toHaveBeenCalled();
  switchView('Jugador');
  expect(globalThis.openai.setWidgetState).toHaveBeenCalledWith({
    modelContent:{ tool:'Parry libre', view:'player', format:'mobile' },
    privateContent:{ seat:'player', device:'mobile' },
  });
  expect(JSON.stringify(globalThis.openai.setWidgetState.mock.calls)).not.toContain('abajo');
  unmount(); delete globalThis.openai;
});
