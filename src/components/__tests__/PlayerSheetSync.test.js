import { render } from '@testing-library/react';
import React from 'react';

function SyncListener({ tokens }) {
  React.useEffect(() => {
    const handler = (e) => {
      const { name, sheet, origin } = e.detail || {};
      if (origin === 'mapSync') return;
      const affected = tokens.filter(
        (t) => t.controlledBy === name && t.tokenSheetId
      );
      if (!affected.length) return;

      const stored = localStorage.getItem('tokenSheets');
      const sheets = stored ? JSON.parse(stored) : {};
      affected.forEach((t) => {
        const copy = { ...sheet, id: t.tokenSheetId };
        sheets[t.tokenSheetId] = copy;
        window.dispatchEvent(
          new CustomEvent('tokenSheetSaved', { detail: copy })
        );
      });
      localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    };
    window.addEventListener('playerSheetSaved', handler);
    return () => window.removeEventListener('playerSheetSaved', handler);
  }, [tokens]);
  return null;
}

function savePlayer(name, data) {
  localStorage.setItem(`player_${name}`, JSON.stringify(data));
  window.dispatchEvent(
    new CustomEvent('playerSheetSaved', { detail: { name, sheet: data } })
  );
}

test('controlled token updates on player sheet save', () => {
  const tokens = [{ id: 't1', controlledBy: 'Alice', tokenSheetId: 's1' }];
  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('tokenSheetSaved', saved);
  render(<SyncListener tokens={tokens} />);

  const sheet = { stats: { vida: { base: 5 } } };
  savePlayer('Alice', sheet);

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s1.stats.vida.base).toBe(5);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenSheetSaved', saved);
});

test('mapSync events are ignored to avoid loops', () => {
  const tokens = [{ id: 't1', controlledBy: 'Bob', tokenSheetId: 's2' }];
  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('tokenSheetSaved', saved);
  render(<SyncListener tokens={tokens} />);

  window.dispatchEvent(
    new CustomEvent('playerSheetSaved', {
      detail: { name: 'Bob', sheet: { stats: {} }, origin: 'mapSync' },
    })
  );

  expect(localStorage.getItem('tokenSheets')).toBeNull();
  expect(saved).not.toHaveBeenCalled();
  window.removeEventListener('tokenSheetSaved', saved);
});
