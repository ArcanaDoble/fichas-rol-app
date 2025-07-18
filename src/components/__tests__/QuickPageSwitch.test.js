import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import PageSelector from '../PageSelector';

function TestApp() {
  const [pages, setPages] = React.useState([
    { id: 'p1', name: 'Page 1', tokens: ['A'] },
    { id: 'p2', name: 'Page 2', tokens: ['B'] }
  ]);
  const [current, setCurrent] = React.useState(0);
  const [playerVisible, setPlayerVisible] = React.useState('p1');

  const addToken = () => {
    setPages(ps =>
      ps.map((p, i) =>
        i === current ? { ...p, tokens: [...p.tokens, 'new'] } : p
      )
    );
  };

  const playerPage = pages.find(p => p.id === playerVisible);
  const currentPage = pages[current];

  return (
    <div>
      <PageSelector
        pages={pages}
        current={current}
        onSelect={setCurrent}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        playerVisiblePageId={playerVisible}
        onPlayerVisiblePageChange={setPlayerVisible}
      />
      <div>
        <h2>Master</h2>
        <span data-testid="masterTokens">{currentPage.tokens.join(',')}</span>
        <button onClick={addToken}>Add Token</button>
      </div>
      <div>
        <h2>Player</h2>
        <span data-testid="playerTokens">{playerPage.tokens.join(',')}</span>
      </div>
    </div>
  );
}

// Rapid switch back and forth should not mix tokens
test('rapid page switch keeps tokens separated', async () => {
  render(<TestApp />);
  const addBtn = screen.getByRole('button', { name: /add token/i });
  const page1Btn = screen.getByRole('button', { name: /page 1/i });
  const page2Btn = screen.getByRole('button', { name: /page 2/i });

  // add a token to page 1
  await userEvent.click(addBtn);
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('A,new');

  // rapidly switch to page 2 and back to page 1
  await userEvent.click(page2Btn);
  await userEvent.click(page1Btn);

  // tokens should remain unchanged for both pages
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('A,new');
  await userEvent.click(page2Btn);
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('B');
});
