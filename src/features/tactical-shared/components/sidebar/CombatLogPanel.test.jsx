import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatLogPanel } from './CombatLogPanel';

const base = { id: 'log', attackerName: 'Bárbaro', targetName: 'Duende', weaponName: 'Mandoble', blocksLost: { vida: 1 }, finalDamage: 7 };
const show = entry => render(<CombatLogPanel activeTab="COMBAT_LOG" combatLog={[{ ...base, ...entry }]} isBoardMode={false} />);

test('weapon transformations show the form change and payment without an attack result', () => {
  const { container } = show({ eventType: 'item-use', effect: 'weapon-transform', itemName: 'Bastón enroscado',
    logText: 'Yuuzu transforma Bastón enroscado: Látigo.', resourcesSpent: [{ label: 'd6 · Valor ignorado' }] });
  expect(screen.getByText('Yuuzu transforma Bastón enroscado: Látigo.')).toBeInTheDocument();
  expect(screen.getByText('d6 · Valor ignorado')).toBeInTheDocument();
  expect(container.textContent).not.toContain('Presión');
});

test('renders surviving Canvas summary totals without inventing dice or exposing enemy CD', () => {
  const { container } = show({ canvasRoguelite: true, reactionType: 'parar', attackPressure: 17, defense: 10, effectiveCd: 7, clientTimestamp: 123456789, logText: 'CD secreta 7' });
  expect(screen.getByText('17')).toBeInTheDocument();
  expect(screen.getByText('Detalle de dados no guardado en esta entrada.')).toBeInTheDocument();
  expect(container.textContent).toContain('7 de Presión restante');
  expect(container.textContent).not.toContain('Invalid Date');
  expect(container.innerHTML).not.toMatch(/CD secreta|effectiveCd|\bCD\b/);
});

test('keeps historical evasion and removed defense dice visible with status and resource details', () => {
  show({ reactionType: 'parar', attackTotal: 17, defenderTotal: 10,
    attackerDice: [{ id: 'atk-one', faces: 8, value: 6 }, { id: 'two', faces: 8, value: 5, critical: true }],
    evadedDiceIds: ['one'], defenderDice: [{ id: 'def', faces: 6, value: 4, eludedByElusion: true }],
    statusEffectsApplied: { target: [{ id: 'sangrado', label: 'Sangrado' }] },
    resourcesSpent: [{ side: 'attacker', label: '2 dados de acción' }],
    negatedTraits: ['Crítico'],
  });
  expect(screen.getByTitle('Dado de Arma (Evadido)')).toBeInTheDocument();
  expect(screen.getByTitle('Dado Crítico')).toBeInTheDocument();
  expect(screen.getByTitle('Dado retirado por Elusión (4)')).toBeInTheDocument();
  expect(screen.getByText('Sangrado')).toBeInTheDocument();
  expect(screen.getByText(/2 dados de acción/)).toBeInTheDocument();
  expect(screen.getByText(/Rasgos anulados: Crítico/)).toBeInTheDocument();
});

test('distinguishes the counterattack weapon and life lost from the original defense', () => {
  show({ canvasRoguelite: true, reactionType: 'parar', attackerDice: [], defenderTotal: 20,
    finalDamage: 0, counterWeaponName: 'Lanza', counterDamage: 4, attackerBlocksLost: { vida: 1 },
  });
  expect(screen.getByText(/Contraataque · Lanza: 4 Presión · −1 Vida/)).toBeInTheDocument();
});

test('shows a passive shield even without active defense while keeping CD private', () => {
  const { container } = show({ canvasRoguelite: true, reactionType: 'recibir', defenderDice: [],
    defenderShield: { id: 'shield', name: 'Escudo de hierro', defenseClass: 1 },
    effectiveCd: 5, baseCd: 4, defenseCdBonus: 1,
  });
  expect(screen.getByText('Escudo de hierro · protección pasiva.')).toBeInTheDocument();
  expect(container.textContent).toContain('Sin defensa activa.');
  expect(container.innerHTML).not.toMatch(/effectiveCd|baseCd|defenseCdBonus|\bCD\b/);
});

test('healing uses a consumable entry without attack labels or absolute enemy health', () => {
  const { container } = show({ eventType: 'item-use', effect: 'heal', actorName: 'Duende', itemName: 'Poción de curación',
    healed: 2, dice: [{ id: 'heal', faces: 4, value: 3 }], resourcesSpent: [{ label: '1 consumible' }, { label: 'Acción principal' }],
    previousLife: 17, nextLife: 19, maxLife: 20, effectiveCd: 8,
  });
  expect(screen.getByText('Recupera 2 bloques de Vida.')).toBeInTheDocument();
  expect(screen.getByText('Poción de curación')).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/Presión|Poder|Mandoble|17|19|20|CD/);
});

test('healing log separates the real die from capped recovery and shows the actual paid resource', () => {
  const { container } = show({ eventType: 'item-use', effect: 'heal', actorName: 'Duende', itemName: 'Poción de curación',
    itemImage: '/potion.webp', healed: 1, dice: [{ faces: 4, value: 4 }],
    timestamp: { toMillis: () => 123456789 }, resourcesSpent: [{ label: '1 consumible' }, { label: 'Movimiento' }],
  });
  expect(screen.getByRole('img', { name: 'Tirada de curación: d4, resultado 4' }).tagName.toLowerCase()).toBe('svg');
  expect(screen.getByText('+1')).toBeInTheDocument();
  expect(screen.getByText('Limitada por la Vida máxima.')).toBeInTheDocument();
  expect(screen.getByText('1 consumible · Movimiento')).toBeInTheDocument();
  expect(container.querySelector('img')).toHaveAttribute('src', '/potion.webp');
  expect(container.querySelector('.healing-log-entry--illustrated > .healing-log-art')).toBeInTheDocument();
  expect(container.querySelector('time')).toHaveTextContent(new Date(123456789).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
});
