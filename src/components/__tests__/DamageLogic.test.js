import { applyDamage, parseDieValue } from '../../utils/damage';
import React from 'react';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  setDoc: jest.fn().mockResolvedValue(),
}));

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('../../utils/dice', () => ({
  rollExpression: jest.fn(() => ({ total: 12, details: [] })),
}));

const { rollExpression } = require('../../utils/dice');

beforeEach(() => {
  localStorage.clear();
});

test('damage applied equals floor(damage / attribute value)', () => {
  const sheet = {
    id: 's1',
    atributos: { destreza: 'D6' },
    stats: { postura: { actual: 3 } },
  };
  const { sheet: updated, blocks } = applyDamage(sheet, 7, 'postura');
  expect(blocks).toBe(1);
  expect(updated.stats.postura.actual).toBe(2);
});

test('counter-attacks trigger when defense exceeds attack', () => {
  const attacker = {
    id: 'att',
    atributos: { vigor: 'D6' },
    stats: { vida: { actual: 10 } },
  };
  const diff = 7; // defensa 12 - ataque 5
  const { sheet: updated } = applyDamage(attacker, diff, 'vida');
  expect(updated.stats.vida.actual).toBe(9);
});

test('damage is applied sequentially across stats', () => {
  const sheet = {
    id: 's2',
    atributos: { destreza: 'D4', vigor: 'D4' },
    stats: { armadura: { actual: 1 }, postura: { actual: 2 }, vida: { actual: 2 } },
  };
  let remaining = 4;
  let updated = sheet;
  ['armadura', 'postura', 'vida'].forEach((stat) => {
    const res = applyDamage(updated, remaining, stat);
    remaining = res.remaining;
    updated = res.sheet;
  });
  expect(updated.stats.armadura.actual).toBe(0);
  expect(updated.stats.postura.actual).toBe(2);
  expect(updated.stats.vida.actual).toBe(2);
});
