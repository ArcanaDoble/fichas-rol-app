import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AttackModal from '../AttackModal';
import DefenseModal from '../DefenseModal';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  setDoc: jest.fn().mockResolvedValue(),
  addDoc: jest.fn().mockResolvedValue(),
  updateDoc: jest.fn().mockResolvedValue(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
}));

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('../../utils/dice', () => ({
  rollExpression: jest.fn(),
}));

const { addDoc } = require('firebase/firestore');
const { rollExpression } = require('../../utils/dice');

function Demo() {
  const [result, setResult] = React.useState(null);
  return (
    <>
      {!result && (
        <AttackModal
          isOpen
          attacker={{ id: 'a', name: 'A', tokenSheetId: '1' }}
          target={{ id: 'b', name: 'B', tokenSheetId: '2' }}
          distance={1}
          armas={[]}
          poderesCatalog={[]}
          onClose={setResult}
        />
      )}
      {result && (
        <DefenseModal
          isOpen
          attacker={{ id: 'a', name: 'A', tokenSheetId: '1' }}
          target={{ id: 'b', name: 'B', tokenSheetId: '2' }}
          distance={1}
          attackResult={result}
          armas={[]}
          poderesCatalog={[]}
          onClose={() => {}}
        />
      )}
    </>
  );
}

test('damage animations fire when master defends right after attacking', async () => {
  rollExpression
    .mockReturnValueOnce({ total: 10, details: [] })
    .mockReturnValueOnce({ total: 1, details: [] });

  localStorage.setItem(
    'tokenSheets',
    JSON.stringify({
      '1': {
        id: '1',
        weapons: [{ nombre: 'Espada', alcance: 'Toque', dano: '1d6' }],
        poderes: [],
        atributos: { destreza: 'D6', vigor: 'D6' },
        stats: { postura: { actual: 1 }, armadura: { actual: 1 }, vida: { actual: 1 } },
      },
      '2': {
        id: '2',
        weapons: [],
        poderes: [],
        atributos: { destreza: 'D6', vigor: 'D6' },
        stats: { postura: { actual: 1 }, armadura: { actual: 1 }, vida: { actual: 1 } },
      },
    })
  );

  const handler = jest.fn();
  window.addEventListener('damageAnimation', handler);
  render(<Demo />);

  const attackBtn = screen.getByRole('button', { name: /lanzar/i });
  await waitFor(() => expect(attackBtn).not.toBeDisabled());
  await userEvent.click(attackBtn);
  await waitFor(() => expect(addDoc).toHaveBeenCalled());
  await waitFor(() => screen.getByText('Defensa'));
  await new Promise(r => setTimeout(r, 0));
  await userEvent.click(screen.getByRole('button', { name: /lanzar/i }));
  await waitFor(() => expect(localStorage.getItem('damageAnimation')).not.toBeNull());
  window.removeEventListener('damageAnimation', handler);
});
