import { addSpeedForToken } from '../initiative';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../../firebase', () => ({ db: {} }));

const { getDoc: mockGetDoc, updateDoc: mockUpdateDoc } = require('firebase/firestore');

beforeEach(() => {
  jest.clearAllMocks();
});

test('creates participant if not exists', async () => {
  mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ participants: [] }) });
  const token = { id: 't1', name: 'A', controlledBy: 'p1' };
  await addSpeedForToken(token, 2);
  const call = updateDoc.mock.calls[0];
  expect(call[1].participants[0]).toEqual(expect.objectContaining({ name: 'A', speed: 2, addedBy: 'p1' }));
});

test('updates existing participant', async () => {
  mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ participants: [{ id: 'x', name: 'A', addedBy: 'p1', speed: 1 }] }) });
  const token = { id: 't1', name: 'A', controlledBy: 'p1' };
  await addSpeedForToken(token, 3);
  const call2 = updateDoc.mock.calls[0];
  expect(call2[1].participants[0]).toEqual({ id: 'x', name: 'A', addedBy: 'p1', speed: 4 });
});
