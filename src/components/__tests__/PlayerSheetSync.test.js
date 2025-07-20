import { render, act } from '@testing-library/react';
import React from 'react';

function SyncListener({ tokens, onTokensChange }) {
  const prevTokensRef = React.useRef(tokens);

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

      const updated = tokens.map((t) =>
        t.controlledBy === name ? { ...t, estados: sheet.estados || [] } : t
      );
      onTokensChange(updated);
    };
    window.addEventListener('playerSheetSaved', handler);
    return () => window.removeEventListener('playerSheetSaved', handler);
  }, [tokens, onTokensChange]);

  React.useEffect(() => {
    const prev = prevTokensRef.current || [];
    tokens.forEach((token) => {
      const prevToken = prev.find((t) => t.id === token.id);
      if (
        prevToken &&
        token.controlledBy &&
        token.controlledBy !== 'master' &&
        JSON.stringify(prevToken.estados) !== JSON.stringify(token.estados)
      ) {
        const stored = localStorage.getItem(`player_${token.controlledBy}`);
        const sheet = stored ? JSON.parse(stored) : null;
        if (!sheet) return;
        if (JSON.stringify(sheet.estados || []) === JSON.stringify(token.estados || [])) return;
        const updated = { ...sheet, estados: token.estados || [] };
        localStorage.setItem(`player_${token.controlledBy}`, JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent('playerSheetSaved', {
            detail: { name: token.controlledBy, sheet: updated, origin: 'mapSync' },
          })
        );
      }
    });
    prevTokensRef.current = tokens;
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
  const initial = [{ id: 't1', controlledBy: 'Alice', tokenSheetId: 's1' }];
  let renderedTokens = initial;
  const Wrapper = () => {
    const [tokens, setTokens] = React.useState(initial);
    renderedTokens = tokens;
    return <SyncListener tokens={tokens} onTokensChange={setTokens} />;
  };

  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('tokenSheetSaved', saved);
  render(<Wrapper />);

  const sheet = { stats: { vida: { base: 5 } }, estados: ['cansado'] };
  act(() => {
    savePlayer('Alice', sheet);
  });

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s1.stats.vida.base).toBe(5);
  expect(renderedTokens[0].estados).toEqual(['cansado']);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenSheetSaved', saved);
});

test('mapSync events are ignored to avoid loops', () => {
  const initial = [{ id: 't1', controlledBy: 'Bob', tokenSheetId: 's2' }];
  const Wrapper = () => {
    const [tokens, setTokens] = React.useState(initial);
    return <SyncListener tokens={tokens} onTokensChange={setTokens} />;
  };
  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('tokenSheetSaved', saved);
  render(<Wrapper />);

  act(() => {
    window.dispatchEvent(
      new CustomEvent('playerSheetSaved', {
        detail: { name: 'Bob', sheet: { stats: {} }, origin: 'mapSync' },
      })
    );
  });

  expect(localStorage.getItem('tokenSheets')).toBeNull();
  expect(saved).not.toHaveBeenCalled();
  window.removeEventListener('tokenSheetSaved', saved);
});

test('token estado changes update player sheet', () => {
  const initial = [{ id: 't1', controlledBy: 'Carl', tokenSheetId: 's3', estados: [] }];
  let setTokens;
  const Wrapper = () => {
    const [tokens, update] = React.useState(initial);
    setTokens = update;
    return <SyncListener tokens={tokens} onTokensChange={update} />;
  };
  const saved = jest.fn();
  localStorage.clear();
  localStorage.setItem('player_Carl', JSON.stringify({ stats: {} }));
  window.addEventListener('playerSheetSaved', saved);
  render(<Wrapper />);

  act(() => {
    setTokens([{ id: 't1', controlledBy: 'Carl', tokenSheetId: 's3', estados: ['mareado'] }]);
  });

  const updated = JSON.parse(localStorage.getItem('player_Carl'));
  expect(updated.estados).toEqual(['mareado']);
  expect(saved).toHaveBeenCalledTimes(1);
  expect(saved.mock.calls[0][0].detail.origin).toBe('mapSync');
  window.removeEventListener('playerSheetSaved', saved);
});
