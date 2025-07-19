import { applyDoorCheck } from '../../utils/door';
import DoorCheckModal from '../DoorCheckModal';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ messages: [] }) }),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

function TestDoor({ wall, onResult }) {
  return (
    <DoorCheckModal
      isOpen={true}
      onClose={onResult}
      playerName="P1"
      difficulty={wall.difficulty}
    />
  );
}

test('door unlocks after successful roll', async () => {
  const wall = { id: 1, door: 'closed', difficulty: 5, baseDifficulty: 5 };
  render(<TestDoor wall={wall} onResult={(total) => {
    Object.assign(wall, applyDoorCheck(wall, total));
  }} />);
  const input = screen.getByRole('textbox');
  await userEvent.clear(input);
  await userEvent.type(input, '10');
  await userEvent.click(screen.getByRole('button', { name: /lanzar/i }));
  await screen.findByRole('button', { name: /lanzar/i });
  expect(wall.door).toBe('open');
  expect(wall.difficulty).toBe(0);
});
