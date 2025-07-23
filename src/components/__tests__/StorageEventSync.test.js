import { render, act } from '@testing-library/react';
import React from 'react';

function StorageListener({ tokens, onTokensChange }) {
  React.useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || !e.key.startsWith('player_') || !e.newValue) return;
      const name = e.key.replace('player_', '');
      const affected = tokens.filter(
        (t) => t.controlledBy === name && t.tokenSheetId
      );
      if (!affected.length) return;

      const sheet = JSON.parse(e.newValue);
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
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [tokens, onTokensChange]);
  return null;
}

test('tokens update on storage event', () => {
  const initial = [{ id: 't1', controlledBy: 'Alice', tokenSheetId: 's1', syncWithPlayer: true }];
  let renderedTokens = initial;
  const Wrapper = () => {
    const [tokens, setTokens] = React.useState(initial);
    renderedTokens = tokens;
    return <StorageListener tokens={tokens} onTokensChange={setTokens} />;
  };

  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('tokenSheetSaved', saved);
  render(<Wrapper />);

  const sheet = { stats: { vida: { base: 5 } }, estados: ['herido'] };
  act(() => {
    localStorage.setItem('player_Alice', JSON.stringify(sheet));
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'player_Alice', newValue: JSON.stringify(sheet) })
    );
  });

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s1.stats.vida.base).toBe(5);
  expect(renderedTokens[0].estados).toEqual(['herido']);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenSheetSaved', saved);
});
