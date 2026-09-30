import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import CanvasAttackDefense from '../CanvasAttackDefense';

const blade = { id: 'blade', runItemId: 'blade-copy', name: 'Estilete', img: '/test-excess-blade.webp', type: 'weapon', dano: '1d4', alcance: 'Cercano' };
const sword = { id: 'sword', runItemId: 'sword-copy', name: 'Espada', img: '/test-excess-sword.webp', type: 'weapon', dano: '1d8', alcance: 'Cercano' };
const props = {
  pending: { id: 'attack', attackerName: 'Duende', targetName: 'Bárbaro', weaponName: 'Garrote', weapon: {}, pressure: { total: 2 } },
  target: { name: 'Bárbaro' },
  customImages: new Map(),
  preview: { defense: 6, finalPressure: 0, surplus: 4, lifeLost: 0, baseCd: 6, effectiveCd: 6 },
  counterWeapons: [blade, sword],
};
const response = () => within(screen.getByRole('region', { name: 'Aprovechar excedente' }));
const weaponChoices = () => within(screen.getByRole('group', { name: 'Armas para contraatacar' }));

test('the preferred previous weapon is selected initially but never overrides a manual choice', async () => {
  const onResolveExcess = jest.fn();
  const { rerender } = render(<CanvasAttackDefense {...props} preferredCounterWeaponId={sword.runItemId} onResolveExcess={onResolveExcess} />);
  expect(response().getByRole('heading', { name: 'Espada' })).toBeInTheDocument();
  fireEvent.click(response().getByRole('button', { name: 'Cambiar arma del contraataque' }));
  fireEvent.click(weaponChoices().getByRole('button', { name: 'Estilete' }));
  rerender(<CanvasAttackDefense {...props} counterWeapons={[sword, blade]} preferredCounterWeaponId={sword.runItemId} onResolveExcess={onResolveExcess} />);
  expect(response().getByRole('heading', { name: 'Estilete' })).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar contraataque' })); });
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'counterattack', counterWeapon: blade });
});

test('a preferred weapon which is no longer legal cannot be selected', () => {
  render(<CanvasAttackDefense {...props} counterWeapons={[blade]} preferredCounterWeaponId={sword.runItemId} onResolveExcess={jest.fn()} />);
  expect(response().getByRole('heading', { name: 'Estilete' })).toBeInTheDocument();
});

test('switching response and weapon prepares the chosen counterattack without resolving resources', async () => {
  const onResolveExcess = jest.fn();
  render(<CanvasAttackDefense {...props} onResolveExcess={onResolveExcess} />);
  expect(response().getByRole('heading', { name: 'Estilete' })).toBeInTheDocument();
  fireEvent.click(response().getByRole('button', { name: 'Reposicionarse · 4' }));
  expect(response().getByRole('button', { name: 'Reposicionarse · 4' })).toHaveAttribute('aria-pressed', 'true');
  expect(response().getByText('casillas')).toBeInTheDocument();
  expect(onResolveExcess).not.toHaveBeenCalled();
  fireEvent.click(response().getByRole('button', { name: 'Contraatacar · 4' }));
  const toggle = response().getByRole('button', { name: 'Cambiar arma del contraataque' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: 'Armas para contraatacar' })).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(document.getElementById(toggle.getAttribute('aria-controls')))
    .toContainElement(screen.getByRole('group', { name: 'Armas para contraatacar' }));
  fireEvent.click(weaponChoices().getByRole('button', { name: 'Espada' }));
  expect(response().getByRole('heading', { name: 'Espada' })).toBeInTheDocument();
  expect(weaponChoices().getByRole('button', { name: 'Espada' })).toHaveAttribute('aria-pressed', 'true');
  expect(response().getByText('Presión')).toBeInTheDocument();
  expect(response().getByText('Sin tirada · Sin defensa activa')).toBeInTheDocument();
  expect(onResolveExcess).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar contraataque' })); });
  expect(onResolveExcess).toHaveBeenCalledTimes(1);
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'counterattack', counterWeapon: sword });
});

test('a selected weapon copy survives option reordering by instance identity', async () => {
  const first = { ...blade, name: 'Daga', runItemId: 'dagger-first' };
  const second = { ...blade, name: 'Daga', runItemId: 'dagger-second' };
  const onResolveExcess = jest.fn();
  const { rerender } = render(<CanvasAttackDefense {...props} counterWeapons={[first, second]} onResolveExcess={onResolveExcess} />);
  fireEvent.click(response().getByRole('button', { name: 'Cambiar arma del contraataque' }));
  fireEvent.click(weaponChoices().getByRole('button', { name: /Daga.*Ejemplar 2/ }));
  rerender(<CanvasAttackDefense {...props} counterWeapons={[{ ...second }, { ...first }]} onResolveExcess={onResolveExcess} />);
  expect(weaponChoices().getByRole('button', { name: /Daga.*Ejemplar 1/ })).toHaveAttribute('aria-pressed', 'true');
  expect(weaponChoices().getByRole('button', { name: /Daga.*Ejemplar 2/ })).toHaveAttribute('aria-pressed', 'false');
  expect(onResolveExcess).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar contraataque' })); });
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'counterattack', counterWeapon: expect.objectContaining({ runItemId: 'dagger-second' }) });
});

test('Derribado forbids reposition while preserving a legal counterattack', async () => {
  const onResolveExcess = jest.fn();
  render(<CanvasAttackDefense {...props} prone onResolveExcess={onResolveExcess} />);
  expect(response().getByRole('button', { name: 'Reposicionarse · 4' })).toBeDisabled();
  expect(response().getByRole('button', { name: 'Contraatacar · 4' })).toBeEnabled();
  fireEvent.click(response().getByRole('button', { name: 'Reposicionarse · 4' }));
  expect(response().getByRole('button', { name: 'Contraatacar · 4' })).toHaveAttribute('aria-pressed', 'true');
  expect(onResolveExcess).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirmar contraataque' })); });
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'counterattack', counterWeapon: blade });
});

test('with neither legal response the defender can explicitly discard all surplus', async () => {
  const onResolveExcess = jest.fn();
  render(<CanvasAttackDefense {...props} counterWeapons={[]} prone onResolveExcess={onResolveExcess} />);
  expect(response().getByRole('button', { name: 'Reposicionarse · 4' })).toBeDisabled();
  expect(response().getByRole('button', { name: 'Contraatacar · 4' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /^Confirmar/ })).not.toBeInTheDocument();
  expect(response().getByText(/Derribado: no puedes reposicionarte/)).toHaveTextContent('Ningún arma alcanza al atacante.');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continuar sin gastar excedente' })); });
  expect(onResolveExcess).toHaveBeenCalledTimes(1);
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'discard' });
});

test('discard remains explicit even when a weapon is selected', async () => {
  const onResolveExcess = jest.fn();
  render(<CanvasAttackDefense {...props} onResolveExcess={onResolveExcess} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continuar sin gastar excedente' })); });
  expect(onResolveExcess).toHaveBeenCalledWith({ excessChoice: 'discard' });
});

test('pending confirmation locks responses and weapon choices and invokes the callback only once', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const onResolveExcess = jest.fn(() => pending);
  render(<CanvasAttackDefense {...props} onResolveExcess={onResolveExcess}>
    <button type="button">Dado de defensa</button>
  </CanvasAttackDefense>);
  fireEvent.click(response().getByRole('button', { name: 'Cambiar arma del contraataque' }));
  const confirm = screen.getByRole('button', { name: 'Confirmar contraataque' });
  fireEvent.click(confirm);
  expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Dado de defensa' })).toBeDisabled();
  expect(response().getByRole('button', { name: 'Reposicionarse · 4' })).toBeDisabled();
  expect(response().getByRole('button', { name: 'Contraatacar · 4' })).toBeDisabled();
  expect(response().getByRole('button', { name: 'Cambiar arma del contraataque' })).toBeDisabled();
  weaponChoices().getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Continuar sin gastar excedente' })).toBeDisabled();
  fireEvent.click(confirm);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar sin gastar excedente' }));
  expect(onResolveExcess).toHaveBeenCalledTimes(1);
  await act(async () => { finish(false); await pending; });
  expect(screen.getByRole('button', { name: 'Confirmar contraataque' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Dado de defensa' })).toBeEnabled();
  expect(response().getByRole('button', { name: 'Reposicionarse · 4' })).toBeEnabled();
  expect(onResolveExcess).toHaveBeenCalledTimes(1);
});
