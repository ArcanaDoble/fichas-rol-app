import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { applyCampaignImpact } from '../../campaignSystem';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), updateDoc: jest.fn(), runTransaction: jest.fn(),
  addDoc: jest.fn(), collection: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(), serverTimestamp: jest.fn() }));

const weapon = { id: 'practice-sword', instanceId: 'practice-sword', name: 'Espada de prueba',
  type: 'weapon', canvasSlot: 'mainHand', dano: '1d6', alcance: 'Toque', actionCost: 1, rasgos: [] };
const actor = (id, profileType, teamId, controller) => ({ id, name: id, type: 'token', rulesSystem: 'campaign',
  profileType, teamId, controlledBy: [controller], x: 0, y: 0, width: 50, height: 50, hasVision: true,
  actionDice: ['d6', 'd6', 'd6'], offenseBase: 4, fixedInitiative: 4,
  stats: { vida: { current: 28, max: 28 }, armadura: { current: 2 } }, equippedItems: [weapon] });
const yuuzu = actor('Yuuzu', 'campaignCharacter', 'aliados', 'Rai');
const yerma = actor('Yerma', 'campaignCharacter', 'aliados', 'Alvaro');
const henry = actor('Henry', 'rogueliteEnemy', 'aliados', 'master');
const enemy = actor('Bandido', 'rogueliteEnemy', 'hostiles', 'master');
const pairs = [[yuuzu, enemy], [enemy, yuuzu], [enemy, henry], [henry, enemy], [henry, yuuzu], [yuuzu, yerma]]
  .map(([attacker, target]) => ({ label: `${attacker.name} → ${target.name}`, attacker, target }));

beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); globalThis.TextEncoder = TextEncoder; });

test.each(pairs)('campaign prepares the actual attack: $label', ({ attacker, target }) => {
  const items = [attacker, target];
  const initial = { id: 'campaign-audit', rulesSystem: 'campaign', items };
  const toast = jest.fn(), persist = jest.fn();
  const hook = renderHook(() => {
    const [scene, setScene] = useState(initial);
    const ref = useRef(scene); ref.current = scene;
    return useCanvasCombatRuntime({ activeScenario: scene, activeScenarioRef: ref,
      isPlayerView: attacker === yuuzu, playerName: 'Rai', scenarioCollectionName: 'canvas_scenarios',
      gridConfig: { cellWidth: 50, cellHeight: 50 }, setActiveScenario: setScene,
      safePersistItems: persist, triggerToast: toast });
  });
  act(() => expect(hook.result.current.beginAttackDraft({ attackerId: attacker.id, targetId: target.id, weapon })).toBe(true));
  expect(toast).not.toHaveBeenCalled();
  expect(hook.result.current.attackDraft).toMatchObject({ attackerId: attacker.id, targetId: target.id, phase: 'prepare' });
  expect(hook.result.current.pendingAttack).toBeFalsy();
  expect(persist).not.toHaveBeenCalled();
  expect(target.stats.vida.current).toBe(28);
  hook.unmount();
});

test('campaign impact applies points and RD equally to players, NPCs and hostiles', () => {
  [yuuzu, yerma, henry, enemy].forEach(target => {
    expect(applyCampaignImpact(target, 9).vida.current).toBe(21);
    expect(applyCampaignImpact(target, 1).vida.current).toBe(28);
    expect(applyCampaignImpact(target, 999).vida.current).toBe(0);
  });
});

