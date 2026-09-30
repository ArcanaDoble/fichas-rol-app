import React from 'react';
import { act, render } from '@testing-library/react';
import { preloadImage } from '../../../../components/LoadingImage';
import CanvasDefensiveExcess from '../CanvasDefensiveExcess';

jest.mock('../../../../components/LoadingImage', () => ({ preloadImage: jest.fn() }));

const weapons = [
  { id: 'blade', name: 'Estilete', img: '/counter-blade.webp' },
  { id: 'sword', name: 'Espada', img: '/counter-sword.webp' },
  { id: 'dagger', name: 'Daga', img: '/counter-dagger.webp' },
];
const props = { weapons, surplus: 3, action: 'counterattack', onWeaponChange: jest.fn(), onActionChange: jest.fn(), customImages: new Map() };

const controlLoads = () => {
  const requests = new Map();
  preloadImage.mockImplementation(src => {
    if (!requests.has(src)) {
      let resolve;
      const promise = new Promise(finish => { resolve = finish; });
      requests.set(src, { promise, resolve });
    }
    return requests.get(src).promise;
  });
  return async (src, ready = true) => {
    await act(async () => { requests.get(src).resolve(ready); await requests.get(src).promise; });
  };
};

beforeEach(() => jest.clearAllMocks());

test('keeps the previous decoded image mounted and visible until its replacement is ready', async () => {
  const finishLoad = controlLoads();
  const { container, rerender } = render(<CanvasDefensiveExcess {...props} weapon={weapons[0]} />);
  const firstImage = container.querySelector('img[src="/counter-blade.webp"]');
  const secondImage = container.querySelector('img[src="/counter-sword.webp"]');
  await finishLoad(weapons[0].img);
  expect(firstImage).toHaveAttribute('data-visible', 'true');
  rerender(<CanvasDefensiveExcess {...props} weapon={weapons[1]} />);
  expect(container.querySelector('img[src="/counter-blade.webp"]')).toBe(firstImage);
  expect(container.querySelector('img[src="/counter-sword.webp"]')).toBe(secondImage);
  expect(firstImage).toHaveAttribute('data-visible', 'true');
  expect(secondImage).toHaveAttribute('data-visible', 'false');
  await finishLoad(weapons[1].img);
  expect(firstImage).toHaveAttribute('data-visible', 'false');
  expect(secondImage).toHaveAttribute('data-visible', 'true');
  expect(secondImage).toHaveAttribute('draggable', 'false');
});

test('a slower abandoned selection cannot replace the latest chosen illustration', async () => {
  const finishLoad = controlLoads();
  const { container, rerender } = render(<CanvasDefensiveExcess {...props} weapon={weapons[0]} />);
  await finishLoad(weapons[0].img);
  rerender(<CanvasDefensiveExcess {...props} weapon={weapons[1]} />);
  rerender(<CanvasDefensiveExcess {...props} weapon={weapons[2]} />);
  await finishLoad(weapons[2].img);
  await finishLoad(weapons[1].img);
  expect(container.querySelectorAll('img[data-visible="true"]')).toHaveLength(1);
  expect(container.querySelector('img[data-visible="true"]')).toHaveAttribute('src', weapons[2].img);
});

test('a failed replacement fades out the previous weapon instead of keeping the wrong illustration', async () => {
  const finishLoad = controlLoads();
  const { container, rerender } = render(<CanvasDefensiveExcess {...props} weapon={weapons[0]} />);
  await finishLoad(weapons[0].img);
  rerender(<CanvasDefensiveExcess {...props} weapon={weapons[1]} />);
  await finishLoad(weapons[1].img, false);
  expect(container.querySelector('img[data-visible="true"]')).toBeNull();
});
