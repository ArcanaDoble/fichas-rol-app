import { doc, runTransaction } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../../firebase';
import { createRogueliteEnemyTokenPayload, prepareRogueliteEnemyForFirestore } from './enemyModel';
import { getCanvasSystem, switchEnemySystem } from '../canvas/campaignSystem';
import { createCampaignNpcTokenPayload, normalizeCampaignNpc } from './campaignNpcModel';
import { normalizeCombatSideKey } from '../tactical-shared/legacyCombatRules';

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

const addEnemyToActiveCanvas = (enemy, campaignNpc = false) => {
  const visibilityRef = doc(db, 'gameSettings', 'canvasVisibility');
  return runTransaction(db, async (transaction) => {
    const visibility = await transaction.get(visibilityRef);
    const activeScenarioId = visibility.data()?.activeScenarioId;
    if (!activeScenarioId) {
      throw new Error('No hay ningún encuentro del Canvas en transmisión.');
    }
    const scenarioRef = doc(db, 'canvas_scenarios', activeScenarioId);
    const snapshot = await transaction.get(scenarioRef);
    if (!snapshot.exists()) {
      throw new Error('El encuentro activo ya no existe.');
    }
    const scenario = snapshot.data() || {};
    const scenarioName = scenario.name || 'Encuentro del Canvas';
    const system = getCanvasSystem(scenario);
    if (campaignNpc && system !== 'campaign') {
      throw new Error(`«${scenarioName}» está en transmisión. Para añadir esta ficha, elige Campaña en «Sistema del encuentro» y pulsa «Confirmar cambios».`);
    }
    const items = Array.isArray(scenario.items) ? scenario.items : [];
    const campaignCharacters = campaignNpc ? items.filter((item) => item?.profileType === 'campaignCharacter') : [];
    const alliedTeam = campaignCharacters.find((item) => normalizeCombatSideKey(item.teamId || ''))?.teamId || 'aliados';
    const alliedTeams = new Set([alliedTeam, ...campaignCharacters.map((item) => item.teamId)]
      .map((team) => normalizeCombatSideKey(team || '')).filter(Boolean));
    let enemyTeam = 'enemies';
    for (let suffix = 2; alliedTeams.has(normalizeCombatSideKey(enemyTeam)); suffix += 1) {
      enemyTeam = `enemies-${suffix}`;
    }
    const npc = campaignNpc ? normalizeCampaignNpc(enemy) : null;
    const deploymentTeam = npc?.allegiance === 'enemy' ? enemyTeam : alliedTeam;
    const encounterItems = campaignNpc ? items.map((item) => (
      item?.profileType === 'campaignCharacter' && !normalizeCombatSideKey(item.teamId || '')
        ? { ...item, teamId: alliedTeam }
        : item
    )) : items;
    const placement = resolveSpawn(encounterItems, scenario.config || {});
    const payload = prepareRogueliteEnemyForFirestore({
      id: `token-enemy-${nanoid(10)}`,
      ...placement,
      rotation: 0,
      layer: 'TOKEN',
      ...(campaignNpc ? { ...createCampaignNpcTokenPayload(npc), teamId: deploymentTeam } : createRogueliteEnemyTokenPayload(enemy)),
    });
    const token = campaignNpc ? payload : switchEnemySystem(payload, system);
    transaction.set(scenarioRef, {
      items: [...encounterItems, token],
      lastModified: Date.now(),
    }, { merge: true });
    return { scenarioId: activeScenarioId, scenarioName, token };
  });
};

export const addRogueliteEnemyToActiveCanvas = (enemy) => addEnemyToActiveCanvas(enemy);
export const addCampaignNpcToActiveCanvas = (npc) => addEnemyToActiveCanvas(npc, true);
