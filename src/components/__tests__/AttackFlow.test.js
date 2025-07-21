import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AttackModal from '../AttackModal';
import DefenseModal from '../DefenseModal';
import useAttackRequests from '../../hooks/useAttackRequests';
import { act } from 'react';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  setDoc: jest.fn().mockResolvedValue(),
  addDoc: jest.fn().mockResolvedValue(),
  updateDoc: jest.fn().mockResolvedValue(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
  deleteDoc: jest.fn().mockResolvedValue(),
}));

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('../DefenseModal', () => jest.fn(() => null));

const { addDoc, onSnapshot, updateDoc, getDoc } = require('firebase/firestore');

function ListenerDemo({ playerName = 'p2', userType = 'player' }) {
  const [req, setReq] = React.useState(null);
  const tokens = [
    { id: 'a', controlledBy: 'p1', x: 0, y: 0 },
    { id: 'b', controlledBy: 'p2', x: 1, y: 1 },
  ];
  useAttackRequests({ tokens, playerName, userType, onAttack: setReq });
  return req ? (
    <DefenseModal
      isOpen
      attacker={{ id: req.attackerId }}
      target={{ id: req.targetId }}
      distance={0}
      attackResult={req.result}
      armas={[]}
      poderesCatalog={[]}
      onClose={() => {}}
    />
  ) : null;
}

describe('Attack flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem(
      'tokenSheets',
      JSON.stringify({ '1': { id: '1', weapons: [{ nombre: 'Espada', alcance: 'Toque', dano: '1d4' }], poderes: [] } })
    );
  });

  test('writes attack request to firestore', async () => {
    render(
      <AttackModal
        isOpen
        attacker={{ id: 'a', name: 'A', tokenSheetId: '1' }}
        target={{ id: 'b', name: 'B', tokenSheetId: '2' }}
        distance={1}
        armas={[]}
        poderesCatalog={[]}
        onClose={() => {}}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /lanzar/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalled());
  });

  test('opens defense modal for targeted player', () => {
    let snapCb;
    onSnapshot.mockImplementation((col, cb) => {
      snapCb = cb;
      return () => {};
    });
    render(<ListenerDemo />);
    const doc = {
      id: 'req1',
      data: () => ({ attackerId: 'a', targetId: 'b', result: { total: 5 } }),
    };
    act(() => {
      snapCb({ docChanges: () => [{ type: 'added', doc }] });
    });
    expect(DefenseModal).toHaveBeenCalled();
  });

  test('ignores attacks for other players', () => {
    let snapCb;
    onSnapshot.mockImplementation((col, cb) => {
      snapCb = cb;
      return () => {};
    });
    render(<ListenerDemo playerName="p1" />);
    const doc = {
      id: 'req1',
      data: () => ({ attackerId: 'a', targetId: 'b', result: { total: 5 } }),
    };
    act(() => {
      snapCb({ docChanges: () => [{ type: 'added', doc }] });
    });
    expect(DefenseModal).not.toHaveBeenCalled();
  });

  test('auto resolves if defense is unanswered', async () => {
    jest.useFakeTimers();
    addDoc.mockResolvedValue({ id: 'r1' });
    getDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ completed: false }) });
    render(
      <AttackModal
        isOpen
        attacker={{ id: 'a', name: 'A', tokenSheetId: '1' }}
        target={{ id: 'b', name: 'B', tokenSheetId: '2' }}
        distance={1}
        armas={[]}
        poderesCatalog={[]}
        onClose={() => {}}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /lanzar/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    jest.useRealTimers();
  });
});
