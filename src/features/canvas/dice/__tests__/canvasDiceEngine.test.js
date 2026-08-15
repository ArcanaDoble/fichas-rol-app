import {
  SUPPORTED_DICE_FACES,
  countTotalDiceInPool,
  formatDiceFormula,
  normalizeDieFaces,
  rollDicePool,
  rollSingleDie,
  toggleRollDieExcluded,
} from '../canvasDiceEngine';

describe('canvasDiceEngine', () => {
  it('supports standard RPG dice faces', () => {
    expect(SUPPORTED_DICE_FACES).toEqual([4, 6, 8, 10, 12, 20]);
    expect(normalizeDieFaces(4)).toBe(4);
    expect(normalizeDieFaces(20)).toBe(20);
    expect(normalizeDieFaces(100)).toBe(20);
  });

  it('rolls single die within expected bounds', () => {
    const fixedLow = rollSingleDie(6, () => 0);
    const fixedHigh = rollSingleDie(6, () => 0.99999);
    expect(fixedLow).toBe(1);
    expect(fixedHigh).toBe(6);
  });

  it('formats dice formula properly', () => {
    expect(formatDiceFormula({ 4: 1, 8: 2 })).toBe('1d4 + 2d8');
    expect(formatDiceFormula({ d6: 3, d20: 1 })).toBe('3d6 + 1d20');
    expect(formatDiceFormula({})).toBe('');
  });

  it('counts total dice in pool', () => {
    expect(countTotalDiceInPool({ 4: 2, 8: 1, 20: 3 })).toBe(6);
    expect(countTotalDiceInPool({})).toBe(0);
  });

  it('throws error when rolling empty pool', () => {
    expect(() => rollDicePool({})).toThrow('Selecciona al menos un dado');
  });

  it('rolls composite dice pool with total, individual dice, and formula', () => {
    const mockRandom = jest.fn()
      .mockReturnValueOnce(0.5) // d4 -> 3
      .mockReturnValueOnce(0.75); // d8 -> 7

    const result = rollDicePool({ 4: 1, 8: 1 }, {
      random: mockRandom,
      rolledBy: 'Bárbaro',
      now: 1000,
    });

    expect(result.rolledBy).toBe('Bárbaro');
    expect(result.formula).toBe('1d4 + 1d8');
    expect(result.dice).toHaveLength(2);
    expect(result.dice[0]).toMatchObject({ faces: 4, value: 3 });
    expect(result.dice[1]).toMatchObject({ faces: 8, value: 7 });
    expect(result.diceTotal).toBe(10);
    expect(result.total).toBe(10);
    expect(result.timestamp).toBe(1000);
  });

  it('handles explosive/critical dice that roll maximum value', () => {
    const mockRandom = jest.fn()
      .mockReturnValueOnce(0.999) // d6 -> 6 (max, explodes!)
      .mockReturnValueOnce(0.5); // d6 explosion -> 4

    const result = rollDicePool({ 6: 1 }, {
      random: mockRandom,
      explosive: { 6: true },
      rolledBy: 'Bárbaro',
      now: 2000,
    });

    expect(result.formula).toBe('1d6 (crítico)');
    expect(result.dice).toHaveLength(2);
    expect(result.dice[0]).toMatchObject({ faces: 6, value: 6, explosive: true, exploded: false });
    expect(result.dice[1]).toMatchObject({ faces: 6, value: 4, explosive: true, exploded: true });
    expect(result.total).toBe(10);
    expect(result.effectiveTotal).toBe(10);
  });

  it('toggles roll die exclusion and recalculates effective total', () => {
    const initialRoll = {
      id: 'roll-test',
      dice: [
        { faces: 6, value: 6 },
        { faces: 6, value: 4 },
      ],
      modifier: 2,
      total: 12,
      effectiveTotal: 12,
      excludedRollIndexes: [],
    };

    // Exclude second die (value 4)
    const afterExclude = toggleRollDieExcluded(initialRoll, 1);
    expect(afterExclude.excludedRollIndexes).toEqual([1]);
    expect(afterExclude.effectiveTotal).toBe(8); // 6 + 2 modifier

    // Toggle again to un-exclude
    const afterUnexclude = toggleRollDieExcluded(afterExclude, 1);
    expect(afterUnexclude.excludedRollIndexes).toEqual([]);
    expect(afterUnexclude.effectiveTotal).toBe(12);
  });
});
