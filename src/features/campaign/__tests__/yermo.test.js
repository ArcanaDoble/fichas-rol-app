import { adjustYermo, getYermoScale, normalizeYermo } from '../yermo';

test('the reserve stays exact above JavaScript integer precision and cannot become negative', () => {
  const largeAmount = '9007199254740993123456789';
  expect(adjustYermo(largeAmount, 1)).toBe('9007199254740993123456790');
  expect(adjustYermo(largeAmount, -1)).toBe('9007199254740993123456788');
  expect(adjustYermo('0', -1)).toBe('0');
  expect(normalizeYermo('00053')).toBe('53');
  expect(normalizeYermo('-3')).toBe('0');
  expect(normalizeYermo('Infinity')).toBe('0');
});

test('visual segments stay bounded for empty, partial and arbitrarily large reserves', () => {
  expect(getYermoScale('0').segments).toEqual(Array(10).fill(0));
  expect(getYermoScale('53')).toEqual({ step: '10', segments: [100, 100, 100, 100, 100, 30, 0, 0, 0, 0] });
  const large = getYermoScale(`1${'0'.repeat(100)}`);
  expect(large.segments).toHaveLength(10);
  expect(large.segments.every((fill) => fill === 100)).toBe(true);
  expect(large.step).toBe(`1${'0'.repeat(99)}`);
});
