import { createRogueliteEnemyTokenPayload } from '../roguelite-bestiary/enemyModel';
import { getCanvasSystem, switchEnemySystem } from './campaignSystem';

// Image-only tokens are editable encounter actors, without a linked sheet.
// Reuse the enemy resources/actions until the master links a character sheet.
export const createCanvasImageToken = (token, scenario) => {
  const system = getCanvasSystem(scenario);
  const profile = createRogueliteEnemyTokenPayload({
    id: token.id,
    name: token.name,
    image: token.img,
    imageSource: token.img,
  }, {
    linkedEnemyId: null,
    isCircular: Boolean(token.isCircular),
  });
  return switchEnemySystem({
    ...profile,
    ...token,
    rulesSystem: 'roguelite',
  }, system);
};
