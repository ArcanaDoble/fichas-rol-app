import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

function Client({ id, move }) {
  return <button onClick={() => move(id)}>Move {id}</button>;
}

function ConcurrentMoveApp() {
  const [tokens, setTokens] = React.useState([
    { id: 't1', x: 0 },
    { id: 't2', x: 0 }
  ]);

  const move = id => {
    const delta = id === 't1' ? 5 : 7;
    setTimeout(() => {
      setTokens(prev => prev.map(t => (t.id === id ? { ...t, x: t.x + delta } : t)));
    }, 0);
  };

  return (
    <div>
      <Client id="t1" move={move} />
      <Client id="t2" move={move} />
      <span data-testid="t1">{tokens.find(t => t.id === 't1').x}</span>
      <span data-testid="t2">{tokens.find(t => t.id === 't2').x}</span>
    </div>
  );
}

test('concurrent moves persist token positions', async () => {
  jest.useFakeTimers();
  render(<ConcurrentMoveApp />);
  const btn1 = screen.getByRole('button', { name: /move t1/i });
  const btn2 = screen.getByRole('button', { name: /move t2/i });

  await Promise.all([userEvent.click(btn1), userEvent.click(btn2)]);

  await act(async () => {
    jest.runAllTimers();
  });

  expect(screen.getByTestId('t1')).toHaveTextContent('5');
  expect(screen.getByTestId('t2')).toHaveTextContent('7');

  await act(async () => {
    jest.runAllTimers();
  });

  expect(screen.getByTestId('t1')).toHaveTextContent('5');
  expect(screen.getByTestId('t2')).toHaveTextContent('7');
  jest.useRealTimers();
});
