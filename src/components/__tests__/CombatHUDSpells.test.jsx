import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CombatHUD from '../CombatHUD';

jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  ...jest.requireActual('../../hooks/useCustomEquipmentImages'),
  useCustomEquipmentImages: () => new Map([['bola_de_fuego', '/conjuros/bola-de-fuego.webp'],
    ['proyectil_arcano', '/conjuros/proyectil-arcano.webp'], ['barrera_arcana', '/conjuros/barrera-arcana.webp'],
    ['baston_arcano', '/armas/baston-arcano.webp'], ['niebla_arcana', '/conjuros/niebla-arcana.webp']]),
}));

const staff = { id: 'staff', name: 'Bastón arcano', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador'] };
const spell = { id: 'fireball', name: 'Bola de fuego', type: 'ability' };
const token = { id: 'mage', name: 'Mago', profileType: 'rogueliteClass', classIdentity: 'Mago', level: 2,
  equippedItems: [staff], equippedSkillIds: ['fireball', 'fireball'], equippedSkillSlots: [spell, spell, null],
  stats: { recurso: { label: 'Maná', current: 1, max: 3 } } };
const die = { id: 'die', sides: 6, value: 4, status: 'available' };
const combat = { status: 'active', roundPhase: 'turns', activeBlockIndex: 0,
  blocks: [{ memberIds: ['mage'], actedIds: [] }], participants: { mage: { actionDice: [die] } } };

test('mage Class contains exactly three prepared slots and keeps independent copies', () => {
  const onAction = jest.fn();
  render(<CombatHUD token={{ ...token, usedSkillSlots: [true, false, false] }} mode="canvas" isActive onAction={onAction}
    spellUseSystem={{ combat }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clase' }));
  expect(screen.queryByRole('button', { name: 'Descarga arcana' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ranura de conjuro 3 vacía' })).toBeDisabled();
  expect(screen.getAllByRole('button', { name: /^(Lanzar .* copia \d|Ranura de conjuro \d vacía)$/ })).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Lanzar Bola de fuego, copia 1' })).toBeDisabled();
  const second = screen.getByRole('button', { name: 'Lanzar Bola de fuego, copia 2' });
  expect(second).toBeEnabled();
  expect(screen.queryByText('Barrido')).not.toBeInTheDocument();
  expect(screen.queryByText('Habilidad 1')).not.toBeInTheDocument();
  fireEvent.click(second);
  expect(onAction).toHaveBeenCalledWith('use_spell', { slotIndex: 1 });
});

test('spell preparation exposes catalyst, action dice, enhancement and the map step within Class', () => {
  const configure = jest.fn(), prepareArea = jest.fn();
  render(<CombatHUD token={token} mode="canvas" isActive spellUseSystem={{ combat, sourceToken: token, catalysts: [staff], resources: [die],
    session: { id: 'cast', sourceTokenId: 'mage', definitionId: 'fireball', phase: 'prepare', item: spell,
      slotIndex: 1, catalystId: 'staff', actionDieId: 'die', manaSpend: 0, conserve: false }, configure, prepareArea }} />);
  expect(screen.getByRole('region', { name: 'Preparar Bola de fuego' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Usar d6 de valor 4' }));
  expect(configure).toHaveBeenCalledWith({ actionDieId: null });
  fireEvent.click(screen.getByRole('button', { name: /Intensificación/ }));
  expect(configure).toHaveBeenCalledWith({ manaSpend: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Elegir área 2×2' }));
  expect(prepareArea).toHaveBeenCalled();
});

test('discharge uses Actions and the existing catalyst selector after structural traits are normalized', () => {
  const onAction = jest.fn();
  const { rerender } = render(<CombatHUD token={token} mode="canvas" isActive onAction={onAction}
    canvasAttackOptions={[{ ...staff, rasgos: [] }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Atacar' }));
  expect(onAction).toHaveBeenCalledWith('attack');
  rerender(<CombatHUD token={token} mode="canvas" isActive onAction={onAction} forceWeaponMenu
    canvasAttackOptions={[{ ...staff, rasgos: [] }]} />);
  expect(screen.getByText('Bastón arcano')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Bastón arcano'));
  fireEvent.click(screen.getByRole('button', { name: 'Preparar ataque' }));
  expect(onAction).toHaveBeenLastCalledWith('attack', expect.objectContaining({ id: 'staff', dano: 'd8' }));
});

test('projectile has its own preparation and chain option without adding a fourth Class slot', () => {
  const projectile = { id: 'projectile', name: 'Proyectil arcano', type: 'ability' };
  const configure = jest.fn(), prepareArea = jest.fn();
  render(<CombatHUD token={token} mode="canvas" isActive spellUseSystem={{ combat, sourceToken: token, catalysts: [staff], resources: [die],
    session: { id: 'cast', sourceTokenId: 'mage', definitionId: 'arcane-projectile', phase: 'prepare', item: projectile,
      slotIndex: 0, catalystId: 'staff', actionDieId: 'die', manaSpend: 1, conserve: false }, configure, prepareArea }} />);
  expect(screen.getByRole('region', { name: 'Preparar Proyectil arcano' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Cadena arcana/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: /Intensificación/ })).not.toBeInTheDocument();
  expect(screen.getByText('Presión: d8 + 4 · 1 copia · 1 Maná')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir objetivo' }));
  expect(prepareArea).toHaveBeenCalled();
});

test('mist preparation uses its illustration, ignores the action die value and offers Extension for mixed catalysts', () => {
  const mist = { id: 'mist', name: 'Niebla arcana', type: 'ability' };
  const configure = jest.fn(), prepareArea = jest.fn();
  render(<CombatHUD token={token} mode="canvas" isActive spellUseSystem={{ combat, sourceToken: token,
    catalysts: [{ ...staff, dano: 'd8 + d6' }], resources: [die],
    session: { id: 'cast', sourceTokenId: 'mage', definitionId: 'arcane-mist', phase: 'prepare', item: mist,
      slotIndex: 0, catalystId: 'staff', actionDieId: 'die', manaSpend: 0, conserve: false }, configure, prepareArea }} />);
  expect(screen.getByRole('region', { name: 'Preparar Niebla arcana' })).toBeInTheDocument();
  expect(document.querySelector('.potion-preparation-art')).toHaveAttribute('src', '/conjuros/niebla-arcana.webp');
  expect(screen.getByText('Dado de acción · Valor ignorado · 1 copia · 0 Maná')).toBeInTheDocument();
  expect(screen.queryByText(/Presión:/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Extensión/ })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Intensificación/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Extensión/ }));
  expect(configure).toHaveBeenCalledWith({ manaSpend: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Elegir área 2×2' }));
  expect(prepareArea).toHaveBeenCalled();
});

test('Board keeps its card hand without mage spell controls', () => {
  render(<CombatHUD token={token} mode="board" isActive />);
  expect(screen.getByText('Arrastra cartas aquí')).toBeInTheDocument();
  expect(screen.queryByText('Descarga arcana')).not.toBeInTheDocument();
});

test('canonical Runic Barrier uses approved legacy artwork and the support panel without Pressure', () => {
  const barrier = { id: 'barrier', name: 'Barrera rúnica', type: 'ability' };
  const configure = jest.fn(), prepareArea = jest.fn();
  render(<CombatHUD token={token} mode="canvas" isActive spellUseSystem={{ combat, sourceToken: token,
    catalysts: [{ ...staff, rasgos: ['Catalizador', 'Crítico'] }], resources: [die],
    session: { id: 'cast', sourceTokenId: 'mage', definitionId: 'runic-barrier', phase: 'prepare', item: barrier,
      slotIndex: 0, catalystId: 'staff', actionDieId: 'die', manaSpend: 0, conserve: false }, configure, prepareArea }} />);
  expect(document.querySelector('.potion-preparation-art')).toHaveAttribute('src', '/conjuros/barrera-arcana.webp');
  expect(screen.queryByText(/Presión:/)).not.toBeInTheDocument();
  expect(screen.getByText('Dado de acción · Valor ignorado · 1 copia · 0 Maná')).toBeInTheDocument();
  expect(screen.getByText('Resonancia · Neutraliza Crítico')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Adaptación/ }));
  expect(configure).toHaveBeenCalledWith({ manaSpend: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Elegir objetivo' }));
  expect(prepareArea).toHaveBeenCalled();
});

test('Class uses existing spell illustrations and enables Fireball in practice', () => {
  const projectile = { id: 'projectile', nombre: 'Proyectil arcano' };
  const barrier = { id: 'barrier', nombre: 'Barrera arcana' };
  render(<CombatHUD token={{ ...token, equippedSkillSlots: [projectile, spell, barrier] }} mode="canvas" isActive
    spellUseSystem={{ combat: null, availabilityOptions: { practice: true } }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clase' }));
  expect(screen.getByRole('img', { name: 'Bola de fuego' })).toHaveAttribute('src', '/conjuros/bola-de-fuego.webp');
  expect(screen.getByRole('img', { name: 'Proyectil arcano' })).toHaveAttribute('src', '/conjuros/proyectil-arcano.webp');
  expect(screen.getByRole('img', { name: 'Barrera rúnica' })).toHaveAttribute('src', '/conjuros/barrera-arcana.webp');
  expect(screen.getByRole('button', { name: 'Lanzar Barrera rúnica, copia 3' })).toBeEnabled();
  expect(screen.queryByRole('img', { name: 'Descarga arcana' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Lanzar Bola de fuego, copia 2' })).toBeEnabled();
});
