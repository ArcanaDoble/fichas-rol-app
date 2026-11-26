import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { onSnapshot } from 'firebase/firestore';
import { useCustomEquipmentImages } from '../useCustomEquipmentImages';

jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), onSnapshot: jest.fn() }));

let deliverSnapshot;
const stopListening = jest.fn();
const publish = (url) => act(() => deliverSnapshot({
  forEach: visit => { if (url) visit({ id: 'fireball', data: () => ({ itemName: 'Bola de fuego', imageUrl: url }) }); },
}));
const Consumer = ({ name }) => {
  const images = useCustomEquipmentImages();
  return <output aria-label={name}>{images.get('bola_de_fuego') || 'vacío'}</output>;
};

beforeEach(() => {
  jest.clearAllMocks();
  onSnapshot.mockImplementation((_query, callback) => {
    deliverSnapshot = callback;
    return stopListening;
  });
});

test('shares a live catalog and retains it when HUD consumers remount', () => {
  const first = render(<><Consumer name="hud" /><Consumer name="preparación" /></>);
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  publish('/cached-fireball.webp');
  expect(screen.getByLabelText('hud')).toHaveTextContent('/cached-fireball.webp');
  expect(screen.getByLabelText('preparación')).toHaveTextContent('/cached-fireball.webp');
  first.unmount();
  expect(stopListening).toHaveBeenCalledTimes(1);

  render(<Consumer name="nuevo hud" />);
  expect(screen.getByLabelText('nuevo hud')).toHaveTextContent('/cached-fireball.webp');
  expect(onSnapshot).toHaveBeenCalledTimes(2);
  publish('/updated-fireball.webp');
  expect(screen.getByLabelText('nuevo hud')).toHaveTextContent('/updated-fireball.webp');
  publish(null);
  expect(screen.getByLabelText('nuevo hud')).toHaveTextContent('vacío');
});
