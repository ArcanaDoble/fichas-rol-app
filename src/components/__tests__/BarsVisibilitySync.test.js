import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

function Sender({ tokens, setTokens }) {
  const prev = React.useRef({});
  React.useEffect(() => {
    let changed = false;
    tokens.forEach(t => {
      if (prev.current[t.id] !== undefined && prev.current[t.id] !== t.barsVisibility) {
        changed = true;
      }
      prev.current[t.id] = t.barsVisibility;
    });
    Object.keys(prev.current).forEach(id => {
      if (!tokens.find(t => t.id === id)) delete prev.current[id];
    });
    if (changed) {
      window.dispatchEvent(
        new CustomEvent('barsVisibilityChanged', { detail: { tokens, pageId: 'p1' } })
      );
    }
  }, [tokens]);

  const toggle = () => {
    setTokens(ts => ts.map(t => t.id === 't1' ? { ...t, barsVisibility: t.barsVisibility === 'all' ? 'none' : 'all' } : t));
  };

  return <button onClick={toggle}>toggle</button>;
}

function TestApp() {
  const [tokens, setTokens] = React.useState([{ id: 't1', barsVisibility: 'all' }]);
  const [masterTokens, setMasterTokens] = React.useState(tokens);
  const [playerTokens, setPlayerTokens] = React.useState(tokens);

  React.useEffect(() => {
    const handler = e => {
      const { tokens: tks, pageId } = e.detail;
      if (pageId !== 'p1') return;
      setMasterTokens(tks);
      setPlayerTokens(tks);
    };
    window.addEventListener('barsVisibilityChanged', handler);
    return () => window.removeEventListener('barsVisibilityChanged', handler);
  }, []);

  return (
    <div>
      <Sender tokens={tokens} setTokens={setTokens} />
      <span data-testid="master">{masterTokens[0].barsVisibility}</span>
      <span data-testid="player">{playerTokens[0].barsVisibility}</span>
    </div>
  );
}

test('bars visibility syncs between master and player', async () => {
  render(<TestApp />);
  const btn = screen.getByRole('button', { name: /toggle/i });
  const master = screen.getByTestId('master');
  const player = screen.getByTestId('player');

  expect(master).toHaveTextContent('all');
  expect(player).toHaveTextContent('all');
  await userEvent.click(btn);
  expect(master).toHaveTextContent('none');
  expect(player).toHaveTextContent('none');
});
