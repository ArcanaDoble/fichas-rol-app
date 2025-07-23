import { isPointVisible } from './visibility';

export function isTokenVisible(token, activeTokenId, tokens, playerVisionPolygons, gridSize) {
  const playerToken = tokens.find(t => t.id === activeTokenId);
  if (!playerToken) return true;
  if (token.id === activeTokenId) return true;
  if (playerToken.vision?.enabled === false) return false;
  const vision = playerVisionPolygons[playerToken.id];
  if (!vision || !vision.polygon || vision.polygon.length < 3) return true;
  const center = {
    x: (token.x + token.w / 2) * gridSize,
    y: (token.y + token.h / 2) * gridSize,
  };
  return isPointVisible(center, vision.polygon);
}

export function isDoorVisible(wall, activeTokenId, tokens, playerVisionPolygons) {
  const playerToken = tokens.find(t => t.id === activeTokenId);
  if (!playerToken) return true;
  if (playerToken.vision?.enabled === false) return false;
  const vision = playerVisionPolygons[playerToken.id];
  if (!vision || !vision.polygon || vision.polygon.length < 3) return true;
  const [x1, y1, x2, y2] = wall.points;
  const center = { x: wall.x + (x1 + x2) / 2, y: wall.y + (y1 + y2) / 2 };
  return isPointVisible(center, vision.polygon);
}
