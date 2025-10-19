/** @jest-environment jsdom */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { addDoc, collection, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import useAttackRequests from '../../hooks/useAttackRequests';
import { db } from '../../firebase';

if (typeof setImmediate === 'undefined') {
  // jsdom puede no exponer setImmediate; grpc-js lo necesita para resoluciones DNS
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!emulatorHost) {
  // eslint-disable-next-line no-console
  console.warn(
    'Skipping useAttackRequests emulator tests because FIRESTORE_EMULATOR_HOST is not set.'
  );
}

const describeIfEmulator = emulatorHost ? describe : describe.skip;

const Listener = ({ tokens, playerName, userType, pageId, onAttack }) => {
  useAttackRequests({ tokens, playerName, userType, pageId, onAttack });
  return null;
};

describeIfEmulator('useAttackRequests with Firestore emulator', () => {
  jest.setTimeout(20000);

  beforeEach(async () => {
    const snapshot = await getDocs(collection(db, 'attacks'));
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  });

  test('only controllers of the targeted token receive updates', async () => {
    const aliceHandler = jest.fn();
    const bobHandler = jest.fn();

    render(
      <>
        <Listener
          tokens={[{ id: 'token-1', controlledBy: 'Alice' }]}
          playerName="Alice"
          userType="player"
          pageId="page-1"
          onAttack={aliceHandler}
        />
        <Listener
          tokens={[{ id: 'token-1', controlledBy: 'Alice' }]}
          playerName="Bob"
          userType="player"
          pageId="page-1"
          onAttack={bobHandler}
        />
      </>
    );

    // Esperar a que los listeners se inicialicen
    await new Promise((resolve) => setTimeout(resolve, 200));

    await addDoc(collection(db, 'attacks'), {
      attackerId: 'attacker-1',
      targetId: 'token-1',
      result: { total: 7 },
      completed: false,
      pageId: 'page-1',
      sessionId: 'test-session',
      targetControlledIds: ['Alice'],
      timestamp: serverTimestamp(),
    });

    await waitFor(() => expect(aliceHandler).toHaveBeenCalledTimes(1), { timeout: 5000 });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(bobHandler).not.toHaveBeenCalled();
  });
});
