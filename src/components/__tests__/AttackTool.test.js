import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import AttackModal from '../AttackModal';

function AttackToolDemo({
  selectedId,
  playerName = 'player',
  userType = 'player',
  onSettings,
} = {}) {
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
    const canSource = userType === 'master' || isOwn;
    const canTarget = userType === 'master' ? id !== attacker : (!isOwn && id !== attacker);
    if (!attacker) {
      if (canSource) {
        setAttackSourceId(id);
        return;
      }
    } else if (attackTargetId == null && canTarget) {
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      if (source && clicked) {
        setAttackLine([source.x, source.y, clicked.x, clicked.y]);
      }
    } else if (attackTargetId === id) {
      if (!attackReady) setAttackReady(true);
    } else if (canTarget) {
      setAttackTargetId(id);
      const source = tokens.find((t) => t.id === attacker);
      if (source && clicked) {
        setAttackLine([source.x, source.y, clicked.x, clicked.y]);
      }
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
          armas={[]}
          poderesCatalog={[]}
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
      armas={[]}
      poderesCatalog={[]}
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

test('master selects attacker then target without auto-targeting first click', async () => {
  render(<AttackToolDemo userType="master" playerName="master" />);
  await userEvent.click(screen.getByTestId('target-tool'));
  await userEvent.click(screen.getByTestId('a')); // choose attacker
  expect(screen.queryByTestId('line')).toBeNull();
  await userEvent.click(screen.getByTestId('b')); // choose target
  expect(screen.getByTestId('line')).toBeInTheDocument();
});

test('shows message when no equipment', () => {
  localStorage.setItem('tokenSheets', JSON.stringify({ '1': { id: '1', weapons: [], poderes: [] } }));
  render(
    <AttackModal
      isOpen
      attacker={{ name: 'A', tokenSheetId: '1' }}
      target={{ name: 'B', tokenSheetId: '2' }}
      distance={2}
      armas={[]}
      poderesCatalog={[]}
      onClose={() => {}}
    />
  );
  expect(screen.getByText(/no hay armas o poderes equipados/i)).toBeInTheDocument();
});

test('shows message when equipment out of range', () => {
  localStorage.setItem('tokenSheets', JSON.stringify({ '1': { id: '1', weapons: [{ nombre: 'Espada', alcance: 'Toque' }], poderes: [] } }));
  render(
    <AttackModal
      isOpen
      attacker={{ name: 'A', tokenSheetId: '1' }}
      target={{ name: 'B', tokenSheetId: '2' }}
      distance={3}
      armas={[]}
      poderesCatalog={[]}
      onClose={() => {}}
    />
  );
  expect(screen.getByText(/no hay ningún arma disponible al alcance/i)).toBeInTheDocument();
});
