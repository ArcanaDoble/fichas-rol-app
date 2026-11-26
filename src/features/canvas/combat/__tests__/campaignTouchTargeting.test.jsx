import React, { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CombatHUD from '../../../../components/CombatHUD';
import { createCanvasTokenController } from '../../../tactical-shared/createTacticalTokenController';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), updateDoc: jest.fn(), runTransaction: jest.fn(),
  addDoc: jest.fn(), collection: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(), serverTimestamp: jest.fn() }));
jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({ useCustomEquipmentImages: () => ({}), getCustomImage: () => null }));

const sword = { id: 'sword', instanceId: 'sword', name: 'Espada corta', type: 'weapon', canvasSlot: 'mainHand',
  dano: '1d8', alcance: 'Toque', hands: 1, actionCost: 1, rasgos: [] };
const actor = (id, x) => ({ id, type: 'token', rulesSystem: 'campaign', profileType: 'campaignCharacter', name: id,
  teamId: id, controlledBy: ['Ada'], x, y: 0, width: 50, height: 50, hasVision: true,
  stats: { vida: { current: 28, max: 28 } }, equippedItems: [sword] });
const attacker = actor('Yerma', 0), target = { ...actor('Enemigo', 50), profileType: 'rogueliteEnemy', controlledBy: ['master'] };

function Fixture({ player = false, targetX = 50, onAction }) {
  const scene = { id: 'touch-campaign', rulesSystem: 'campaign', items: [attacker, { ...target, x: targetX }] };
  const ref = useRef(scene); ref.current = scene;
  const [targeting, setTargeting] = useState({ attackerId: attacker.id, phase: 'targeting' });
  const [focus, setFocus] = useState(null);
  const lastTouch = useRef({});
  const runtime = useCanvasCombatRuntime({ activeScenario: scene, activeScenarioRef: ref,
    gridConfig: { cellWidth: 50, cellHeight: 50 }, isPlayerView: player, playerName: 'Ada', currentUserId: 'Ada',
    scenarioCollectionName: 'canvas_scenarios', setActiveScenario: jest.fn(), triggerToast: jest.fn() });
  const controller = createCanvasTokenController({ activeScenario: scene, activeScenarioRef: ref, targetingState: targeting,
    focusedTargetId: focus, setFocusedTargetId: setFocus, setTargetingState: setTargeting,
    isPlayerView: player, playerName: 'Ada', lastTouchTokenInteractionRef: lastTouch,
    boardCardHandTransferRef: { current: null }, clearBoardHandHoverSuppression: jest.fn(),
    getEventCoords: e => { const p = e.touches?.[0] || e; return { x: p.clientX, y: p.clientY }; }, triggerToast: jest.fn() });
  return <>
    <div data-testid="canvas" onMouseDown={() => { if (targeting) { setTargeting(null); setFocus(null); } }}>
      <div data-testid="target" onMouseDown={e => controller.handleTokenMouseDown(e, scene.items[1])}
        onTouchStart={e => controller.handleTokenMouseDown(e, scene.items[1])}>Objetivo</div>
    </div>
    <output data-testid="target-id">{focus || 'sin objetivo'}</output>
    <CombatHUD token={attacker} mode="canvas" isActive onAction={onAction} onEndTurn={jest.fn()}
      canvasAttackOptions={runtime.getAttackOptions(attacker, focus)}
      forceWeaponMenu={targeting?.phase === 'weapon_selection'} targetDistance={targetX / 50} />
  </>;
}

test.each([false, true])('touch compatibility mouse events keep the same in-range campaign weapon as desktop (player=%s)', async player => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  try {
    const onAction = jest.fn();
    render(<Fixture player={player} onAction={onAction} />);
    fireEvent.touchStart(screen.getByTestId('target'), { touches: [{ identifier: 7, clientX: 60, clientY: 20 }] });
    await waitFor(() => expect(screen.getAllByTestId('attack-option')).toHaveLength(1));
    expect(screen.getByTestId('target-id')).toHaveTextContent('Enemigo');
    // Mobile browsers synthesize this mouse event after the touch. It must be
    // consumed by the token instead of reaching the background cancel handler.
    fireEvent.mouseDown(screen.getByTestId('target'), { button: 0, clientX: 60, clientY: 20 });
    expect(screen.getByTestId('target-id')).toHaveTextContent('Enemigo');
    expect(screen.getAllByTestId('attack-option')).toHaveLength(1);
    expect(screen.queryByText(/Ningún arma o habilidad/)).not.toBeInTheDocument();
    expect(screen.getByText('Espada corta')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('attack-option'));
    fireEvent.click(screen.getByRole('button', { name: 'Preparar ataque', exact: true }));
    expect(onAction).toHaveBeenCalledWith('attack', expect.objectContaining({ instanceId: 'sword' }));
    fireEvent.mouseDown(screen.getByTestId('canvas'), { button: 0 });
    expect(screen.getByTestId('target-id')).toHaveTextContent('sin objetivo');
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  }
});

test('desktop selection still offers the weapon and real range exclusions remain in force', async () => {
  const { unmount } = render(<Fixture onAction={jest.fn()} />);
  fireEvent.mouseDown(screen.getByTestId('target'), { button: 0, clientX: 60, clientY: 20 });
  await waitFor(() => expect(screen.getAllByTestId('attack-option')).toHaveLength(1));
  unmount();
  render(<Fixture targetX={150} onAction={jest.fn()} />);
  fireEvent.touchStart(screen.getByTestId('target'), { touches: [{ identifier: 7, clientX: 160, clientY: 20 }] });
  expect(await screen.findByText('Ningún arma o habilidad tiene alcance suficiente.')).toBeInTheDocument();
  expect(screen.queryByTestId('attack-option')).not.toBeInTheDocument();
});
