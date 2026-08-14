import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../../firebase';
import { createRogueliteEnemyTokenPayload, prepareRogueliteEnemyForFirestore } from './enemyModel';

const WORLD_CENTER = 6000;

const resolveSpawn = (items = [], config = {}) => {
  const cellWidth = Math.max(20, Number(config.cellWidth) || 50);
  const cellHeight = Math.max(20, Number(config.cellHeight) || 50);
  const size = Math.min(cellWidth, cellHeight) * 0.8;
  const enemyCount = items.filter((item) => item?.profileType === 'rogueliteEnemy').length;
  const column = enemyCount % 4;
  const row = Math.floor(enemyCount / 4) % 4;
  return {
    x: WORLD_CENTER - cellWidth * 1.7 + column * cellWidth,
    y: WORLD_CENTER - cellHeight * 1.7 + row * cellHeight,
    width: size,
    height: size,
  };
};

export const addRogueliteEnemyToActiveCanvas = async (enemy) => {
  const visibilitySnapshot = await getDoc(doc(db, 'gameSettings', 'canvasVisibility'));
  const activeScenarioId = visibilitySnapshot.data()?.activeScenarioId || null;
  if (!activeScenarioId) {
    throw new Error('No hay ningún encuentro del Canvas en transmisión.');
  }

  const scenarioRef = doc(db, 'canvas_scenarios', activeScenarioId);
  let createdToken = null;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(scenarioRef);
    if (!snapshot.exists()) {
      throw new Error('El encuentro activo ya no existe.');
    }
    const scenario = snapshot.data() || {};
    const items = Array.isArray(scenario.items) ? scenario.items : [];
    const placement = resolveSpawn(items, scenario.config || {});
    createdToken = prepareRogueliteEnemyForFirestore({
      id: `token-enemy-${nanoid(10)}`,
      ...placement,
      rotation: 0,
      layer: 'TOKEN',
      ...createRogueliteEnemyTokenPayload(enemy),
    });
    transaction.set(scenarioRef, {
      items: [...items, createdToken],
      lastModified: Date.now(),
    }, { merge: true });
  });

  return { scenarioId: activeScenarioId, token: createdToken };
};
