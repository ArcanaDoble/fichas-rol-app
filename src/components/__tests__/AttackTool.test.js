import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import AttackModal from '../AttackModal';

function AttackToolDemo({ selectedId } = {}) {
  const [activeTool, setActiveTool] = React.useState('select');
  const [attackSourceId, setAttackSourceId] = React.useState(null);
  const [attackTargetId, setAttackTargetId] = React.useState(null);
  const [attackLine, setAttackLine] = React.useState(null);
  const [attackReady, setAttackReady] = React.useState(false);

  const tokens = [
    { id: 'a', x: 10, y: 10 },
    { id: 'b', x: 80, y: 10 },
  ];

  const handleClick = (id) => {
    if (activeTool !== 'target') return;
    const attacker = attackSourceId || selectedId;
    if (!attacker) {
      setAttackSourceId(id);
    } else if (attackTargetId == null && id !== attacker) {
      setAttackSourceId(attacker);
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      const target = tokens.find((t) => t.id === id);
      if (source && target) {
        setAttackLine([source.x, source.y, target.x, target.y]);
      }
      setAttackReady(false);
    } else if (attackTargetId === id) {
      if (!attackReady) setAttackReady(true);
    } else if (id !== attacker) {
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      const target = tokens.find((t) => t.id === id);
      if (source && target) {
        setAttackLine([source.x, source.y, target.x, target.y]);
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
        {tokens.map((t) => (
          <div
            key={t.id}
            data-testid={t.id}
            onClick={() => handleClick(t.id)}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: 10,
              height: 10,
            }}
          />
        ))}
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
});

test('auto selects attacker if a token was preselected', async () => {
  render(<AttackToolDemo selectedId="a" />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('b'));
  expect(screen.getByTestId('line')).toBeInTheDocument();
  expect(screen.queryByText('Ataque')).toBeNull();
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
