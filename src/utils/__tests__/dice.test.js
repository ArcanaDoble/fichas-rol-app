import { parseAndRollFormula, parseAndRollFormulaCritical } from '../dice';

afterEach(() => {
  jest.restoreAllMocks();
});

test('does not count dice coefficients as numeric modifiers', () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);

  const result = parseAndRollFormula('1d10 + 1d10 + 1d12 + 1d12 + 3');

  expect(result.total).toBe(7);
  expect(result.details).toEqual([
    { type: 'dice', formula: '1d10', rolls: [1], subtotal: 1 },
    { type: 'dice', formula: '1d10', rolls: [1], subtotal: 1 },
    { type: 'dice', formula: '1d12', rolls: [1], subtotal: 1 },
    { type: 'dice', formula: '1d12', rolls: [1], subtotal: 1 },
    { type: 'modifier', value: 3, formula: '+3' },
  ]);
});

test('critical rolls also ignore dice coefficients as numeric modifiers', () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);

  const result = parseAndRollFormulaCritical('1d10 + 1d10 + 2');

  expect(result.total).toBe(4);
  expect(result.details).toEqual([
    { type: 'dice', formula: '1d10', rolls: [{ value: 1, critical: false }], subtotal: 1 },
    { type: 'dice', formula: '1d10', rolls: [{ value: 1, critical: false }], subtotal: 1 },
    { type: 'modifier', value: 2, formula: '+2' },
  ]);
});
