import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

function TokenSyncApp() {
  const [tokens, setTokens] = React.useState([{ id: 't1', x: 0 }]);
  const [masterTokens, setMasterTokens] = React.useState(tokens);

  // listener effect as master
  React.useEffect(() => {
    setMasterTokens(tokens);
  }, [tokens]);

  const moveToken = () => {
    setTokens(ts => ts.map(t => (t.id === 't1' ? { ...t, x: t.x + 10 } : t)));
  };

  return (
    <div>
      <button onClick={moveToken}>Move Token</button>
      <span data-testid="masterPos">{masterTokens[0].x}</span>
    </div>
  );
}

test('master receives token movement without reload', async () => {
  render(<TokenSyncApp />);
  const moveBtn = screen.getByRole('button', { name: /move token/i });
  const pos = screen.getByTestId('masterPos');

  expect(pos).toHaveTextContent('0');
  await userEvent.click(moveBtn);
  expect(pos).toHaveTextContent('10');
  await userEvent.click(moveBtn);
  expect(pos).toHaveTextContent('20');
});
