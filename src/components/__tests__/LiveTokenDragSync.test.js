import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

function LiveSyncApp() {
  const [tokens, setTokens] = React.useState([
    { id: 't1', x: 0, y: 0 },
    { id: 't2', x: 0, y: 0 },
  ]);
  const tokensRef = React.useRef(tokens);
  React.useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const dragMoveRafs = React.useRef({});
  const dragMovePositions = React.useRef({});

  const handleDragMove = (id, x) => {
    const evt = {
      target: {
        x: () => x,
        y: () => 0,
        offsetX: () => 0,
        offsetY: () => 0,
      },
    };
    const node = evt.target;
    const col = Math.round(node.x());
    const row = Math.round(node.y());
    dragMovePositions.current[id] = { col, row };
    if (dragMoveRafs.current[id]) return;
    dragMoveRafs.current[id] = requestAnimationFrame(() => {
      dragMoveRafs.current[id] = null;
      const pos = dragMovePositions.current[id];
      const token = tokensRef.current.find((t) => t.id === id);
      if (token && (token.x !== pos.col || token.y !== pos.row)) {
        setTokens((prev) =>
          prev.map((t) => (t.id === id ? { ...t, x: pos.col, y: pos.row } : t))
        );
      }
    });
  };

  return (
    <div>
      <button onClick={() => handleDragMove('t1', tokensRef.current.find(t => t.id === 't1').x + 1)}>move1</button>
      <button onClick={() => handleDragMove('t2', tokensRef.current.find(t => t.id === 't2').x + 1)}>move2</button>
      <span data-testid="t1">{tokens.find((t) => t.id === 't1').x}</span>
      <span data-testid="t2">{tokens.find((t) => t.id === 't2').x}</span>
    </div>
  );
}

test('tokens update continuously during simultaneous drag moves', async () => {
  jest.useFakeTimers();
  render(<LiveSyncApp />);
  const btn1 = screen.getByText('move1');
  const btn2 = screen.getByText('move2');

  await Promise.all([userEvent.click(btn1), userEvent.click(btn2)]);
  await act(async () => {
    jest.advanceTimersByTime(16);
  });
  expect(screen.getByTestId('t1')).toHaveTextContent('1');
  expect(screen.getByTestId('t2')).toHaveTextContent('1');

  await Promise.all([userEvent.click(btn1), userEvent.click(btn2)]);
  await act(async () => {
    jest.advanceTimersByTime(16);
  });
  expect(screen.getByTestId('t1')).toHaveTextContent('2');
  expect(screen.getByTestId('t2')).toHaveTextContent('2');
  jest.useRealTimers();
});
