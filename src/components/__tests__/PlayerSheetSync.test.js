import { render, fireEvent } from '@testing-library/react';
import React from 'react';

function ManualSync({ token }) {
  const restore = () => {
    const stored = localStorage.getItem(`player_${token.controlledBy}`);
    if (!stored) return;
    const sheets = JSON.parse(localStorage.getItem('tokenSheets') || '{}');
    const sheet = { ...JSON.parse(stored), id: token.tokenSheetId, portrait: token.url };
    sheets[token.tokenSheetId] = sheet;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sheet }));
  };

  const update = () => {
    const sheets = JSON.parse(localStorage.getItem('tokenSheets') || '{}');
    const sheet = sheets[token.tokenSheetId];
    if (!sheet) return;
    const mapNames = (arr) => (arr || []).map(it => typeof it === 'string' ? it : it.nombre).filter(Boolean);
    const playerSheet = {
      ...sheet,
      weapons: mapNames(sheet.weapons),
      armaduras: mapNames(sheet.armaduras),
      poderes: mapNames(sheet.poderes),
    };
    localStorage.setItem(`player_${token.controlledBy}`, JSON.stringify(playerSheet));
    window.dispatchEvent(new CustomEvent('playerSheetSaved', { detail: { name: token.controlledBy, sheet: playerSheet } }));
  };

  return (
    <div>
      <button onClick={restore}>restore</button>
      <button onClick={update}>update</button>
    </div>
  );
}

test('restore button loads player sheet into tokenSheets', () => {
  const token = { id: 't1', tokenSheetId: 's1', controlledBy: 'Alice', url: 'img' };
  localStorage.setItem('player_Alice', JSON.stringify({ stats: { vida: { base: 5 } } }));
  const saved = jest.fn();
  window.addEventListener('tokenSheetSaved', saved);
  const { getByText } = render(<ManualSync token={token} />);

  fireEvent.click(getByText('restore'));

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s1.stats.vida.base).toBe(5);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenSheetSaved', saved);
});

test('restore ignores id field from player sheet', () => {
  const token = { id: 't1', tokenSheetId: 's2', controlledBy: 'Carol', url: 'img' };
  localStorage.setItem('player_Carol', JSON.stringify({ id: 'Carol', stats: { vida: { base: 7 } } }));
  const { getByText } = render(<ManualSync token={token} />);

  fireEvent.click(getByText('restore'));

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s2.stats.vida.base).toBe(7);
  expect(stored.Carol).toBeUndefined();
});

test('update button saves token sheet to player', () => {
  const token = { id: 't1', tokenSheetId: 's1', controlledBy: 'Bob', url: 'img' };
  localStorage.setItem('tokenSheets', JSON.stringify({ s1: { id: 's1', weapons: [{ nombre: 'Espada' }] } }));
  const saved = jest.fn();
  window.addEventListener('playerSheetSaved', saved);
  const { getByText } = render(<ManualSync token={token} />);

  fireEvent.click(getByText('update'));

  const player = JSON.parse(localStorage.getItem('player_Bob'));
  expect(player.weapons).toEqual(['Espada']);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('playerSheetSaved', saved);
});
