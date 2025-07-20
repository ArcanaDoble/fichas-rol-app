import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import AttackModal from '../AttackModal';

function AttackToolDemo({ selectedId, playerName = 'player', onSettings } = {}) {
  const [activeTool, setActiveTool] = React.useState('select');
  const [attackSourceId, setAttackSourceId] = React.useState(null);
  const [attackTargetId, setAttackTargetId] = React.useState(null);
  const [attackLine, setAttackLine] = React.useState(null);
  const [attackReady, setAttackReady] = React.useState(false);

  const tokens = [
    { id: 'a', x: 10, y: 10, controlledBy: playerName },
    { id: 'b', x: 80, y: 10, controlledBy: 'other' },
  ];

  const handleClick = (id) => {
    if (activeTool !== 'target') return;
    const attacker = attackSourceId;
    const clicked = tokens.find((t) => t.id === id);
    const isOwn = clicked.controlledBy === playerName;
    if (!attacker) {
      if (isOwn) setAttackSourceId(id);
    } else if (attackTargetId == null && !isOwn && id !== attacker) {
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      if (source && clicked) {
        setAttackLine([source.x, source.y, clicked.x, clicked.y]);
      }
      setAttackReady(false);
    } else if (attackTargetId === id) {
      if (!attackReady) setAttackReady(true);
    } else if (!isOwn && id !== attacker) {
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      if (source && clicked) {
        setAttackLine([source.x, source.y, clicked.x, clicked.y]);
      }
      setAttackReady(false);
    }
  };

  const handleMove = () => {
    if (activeTool === 'target' && attackSourceId && !attackTargetId) {
      // line does not follow the mouse
    }
  };

  return (
    <div>
      <button data-testid="target-tool" onClick={() => setActiveTool('target')}>
        Target
      </button>
      <div
        data-testid="canvas"
        onMouseMove={handleMove}
        style={{ position: 'relative', width: 100, height: 40 }}
      >
        {tokens.map((t) => {
          const border =
            attackSourceId === t.id
              ? '2px solid yellow'
              : attackTargetId === t.id
              ? '2px solid red'
              : 'none';
          return (
            <div
              key={t.id}
              data-testid={t.id}
              onClick={() => handleClick(t.id)}
              onDoubleClick={() => {
                if (activeTool !== 'target') onSettings?.(t.id);
              }}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: 10,
                height: 10,
                border,
              }}
            />
          );
        })}
        <svg>{attackLine && <line data-testid="line" />}</svg>
      </div>
      {attackReady && attackTargetId && (
        <AttackModal
          isOpen
          attacker={{ name: 'A', tokenSheetId: '1' }}
          target={{ name: 'B', tokenSheetId: '2' }}
          distance={5}
          onClose={() => {}}
        />
      )}
    </div>
  );
}

test('attack modal renders distance', () => {
  render(
    <AttackModal
      isOpen
      attacker={{ name: 'A', tokenSheetId: '1' }}
      target={{ name: 'B', tokenSheetId: '2' }}
      distance={5}
      onClose={() => {}}
    />
  );
  expect(screen.getByText(/5 casillas/)).toBeInTheDocument();
});

test('crosshair tool selects source and target', async () => {
  render(<AttackToolDemo />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('a'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.getByTestId('line')).toBeInTheDocument();
  expect(screen.queryByText('Ataque')).toBeNull();
  expect(screen.getByTestId('a')).toHaveStyle('border: 2px solid yellow');
  expect(screen.getByTestId('b')).toHaveStyle('border: 2px solid red');
});

test('does not auto select attacker from previous selection', async () => {
  render(<AttackToolDemo selectedId="a" />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.queryByTestId('line')).toBeNull();
  await userEvent.click(screen.getByTestId('a'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.getByTestId('line')).toBeInTheDocument();
});

test('allows targeting tokens controlled by another player', async () => {
  render(<AttackToolDemo playerName="alice" />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('a'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.getByTestId('line')).toBeInTheDocument();
});

test('attack modal appears on second click over same target', async () => {
  render(<AttackToolDemo />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('a'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.queryByText('Ataque')).toBeNull();
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.getByText('Ataque')).toBeInTheDocument();
});

test('double click does not open settings while targeting', async () => {
  const onSettings = jest.fn();
  render(<AttackToolDemo onSettings={onSettings} />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('a'));
  await userEvent.dblClick(screen.getByTestId('b'));
  expect(onSettings).not.toHaveBeenCalled();
});
