import { isTokenVisible } from '../../utils/playerVisibility';

describe('hot seat vision', () => {
  const tokens = [
    { id: 'a', x: 0, y: 0, w: 1, h: 1, controlledBy: 'p1', vision: { enabled: true } },
    { id: 'b', x: 5, y: 0, w: 1, h: 1, controlledBy: 'p1', vision: { enabled: true } }
  ];
  const playerVisionPolygons = {
    a: { polygon: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }] },
    b: { polygon: [{ x: 4, y: -1 }, { x: 6, y: -1 }, { x: 6, y: 1 }, { x: 4, y: 1 }] }
  };

  test('token visibility switches with active token', () => {
    expect(isTokenVisible(tokens[1], 'a', tokens, playerVisionPolygons, 1)).toBe(false);
    expect(isTokenVisible(tokens[1], 'b', tokens, playerVisionPolygons, 1)).toBe(true);
  });
});
