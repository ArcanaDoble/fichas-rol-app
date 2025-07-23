import { render, act } from '@testing-library/react';
import React from 'react';

function NoSync() {
  return null;
}

test('storage events are ignored', () => {
  const initial = [{ id: 't1', controlledBy: 'Alice', tokenSheetId: 's1' }];
  let renderedTokens = initial;
  const Wrapper = () => {
    const [tokens, setTokens] = React.useState(initial);
    renderedTokens = tokens;
    return <NoSync />;
  };

  localStorage.clear();
  render(<Wrapper />);

  const sheet = { stats: { vida: { base: 5 } }, estados: ['herido'] };
  act(() => {
    localStorage.setItem('player_Alice', JSON.stringify(sheet));
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'player_Alice', newValue: JSON.stringify(sheet) })
    );
  });

  expect(localStorage.getItem('tokenSheets')).toBeNull();
  expect(renderedTokens).toEqual(initial);
});
