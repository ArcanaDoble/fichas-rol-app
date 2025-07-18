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
    setPages(ps => ps.map((p, i) => i === current ? { ...p, tokens: [...p.tokens, 'new'] } : p));
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

test('switching pages keeps tokens isolated', async () => {
  render(<TestApp />);
  const addBtn = screen.getByRole('button', { name: /add token/i });

  // Page 1 initial
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('A');
  expect(screen.getByTestId('playerTokens')).toHaveTextContent('A');

  // Modify tokens on page 1
  await userEvent.click(addBtn);
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('A,new');
  expect(screen.getByTestId('playerTokens')).toHaveTextContent('A,new');

  // Switch to page 2 for master only
  await userEvent.click(screen.getByRole('button', { name: /page 2/i }));
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('B');
  // Player still sees page 1
  expect(screen.getByTestId('playerTokens')).toHaveTextContent('A,new');

  // Modify tokens on page 2
  await userEvent.click(addBtn);
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('B,new');
  // Verify page 1 tokens unchanged when switching back
  await userEvent.click(screen.getByRole('button', { name: /page 1/i }));
  expect(screen.getByTestId('masterTokens')).toHaveTextContent('A,new');

  // Change visible page for players
  await userEvent.selectOptions(screen.getByRole('combobox'), 'p2');
  expect(screen.getByTestId('playerTokens')).toHaveTextContent('B,new');
});
