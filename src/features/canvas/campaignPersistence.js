import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { CAMPAIGN_CHARACTER_SHEET_COLLECTION, normalizeCampaignSheet } from '../campaign/characterSheet';
import { normalizeYermo } from '../campaign/yermo';
import { loadCanvasRogueliteRuntimeSheet, persistCanvasRogueliteRuns } from './rogueliteRunPersistence';
import { getCanvasSystem, isCampaignSheet, syncCampaignToken, switchEnemySystem } from './campaignSystem';
import { sanitizeForFirestore } from '../tactical-shared/legacyCombatRules';

export const loadCanvasSystemSheet = async (sheet, options = {}) => {
  if (!isCampaignSheet(sheet)) return loadCanvasRogueliteRuntimeSheet(sheet, options);
  const [character, stats] = await Promise.all([
    getDoc(doc(db, 'characters', sheet.id)),
    getDoc(doc(db, CAMPAIGN_CHARACTER_SHEET_COLLECTION, sheet.id)),
  ]);
  return { ...sheet, ...(character.exists() ? character.data() : {}), id: sheet.id,
    profileType: 'campaignCharacter', campaignSheet: stats.exists() ? stats.data() : sheet.campaignSheet };
};

export const prepareCanvasSystemSave = async ({ currentData, payload, transaction }) => {
  const system = payload.config?.gameSystem === 'campaign' ? 'campaign' : 'roguelite';
  if (system === getCanvasSystem(currentData)) return payload;
  const items = await Promise.all(payload.items.map(async token => {
    if (system === 'campaign' && token.linkedCharacterId && token.profileType !== 'campaignCharacter') {
      const character = await transaction.get(doc(db, 'characters', token.linkedCharacterId));
      const stats = await transaction.get(doc(db, CAMPAIGN_CHARACTER_SHEET_COLLECTION, token.linkedCharacterId));
      if (character.exists()) return syncCampaignToken(token, {
        ...character.data(), id: token.linkedCharacterId, campaignSheet: stats.exists() ? stats.data() : null,
      });
    }
    return switchEnemySystem(token, system);
  }));
  // Turn budgets belong to the selected rules, so an explicit mode change
  // starts a fresh combat setup while retaining each mode's scene resources.
  return { ...payload, rulesSystem: system, items, canvasCombat: null, canvasPracticeCombat: null,
    lastModifiedItemIds: items.map(item => item.id) };
};

export const persistCanvasSystemItems = async options => {
  const rogueResults = await persistCanvasRogueliteRuns(options);
  const ids = options.explicitModifiedIds ? new Set(options.explicitModifiedIds) : null;
  const originals = new Map((options.originalItems || []).map(item => [item.id, item]));
  const tokens = (options.finalItems || []).filter(item => item.profileType === 'campaignCharacter'
    && item.linkedCharacterId && (ids ? ids.has(item.id) : JSON.stringify(item) !== JSON.stringify(originals.get(item.id))));
  const campaignResults = await Promise.all(tokens.map(token => runTransaction(db, async transaction => {
    const sceneRef = doc(db, 'canvas_scenarios', options.scenarioId);
    const sheetRef = doc(db, CAMPAIGN_CHARACTER_SHEET_COLLECTION, token.linkedCharacterId);
    const scene = await transaction.get(sceneRef);
    const saved = await transaction.get(sheetRef);
    const characterRef = doc(db, 'characters', token.linkedCharacterId);
    const character = await transaction.get(characterRef);
    const committed = scene.data()?.items?.find(item => item.id === token.id);
    if (!committed || committed.profileType !== 'campaignCharacter') return { persisted: false, reason: 'stale-scenario' };
    const sheet = normalizeCampaignSheet(saved.exists() ? saved.data() : committed.campaignSheet, {
      characterId: committed.linkedCharacterId, owner: committed.campaignOwner, personalityId: committed.campaignPersonality,
    });
    const profile = {
      vida: { current: committed.stats.vida.current, max: committed.stats.vida.max },
      mente: { current: committed.stats.mente.current, max: committed.stats.mente.max },
      movilidad: scene.data()?.canvasCombat?.participants?.[token.id]?.movementRuntime?.statMax ?? committed.stats.movimiento.max,
      actionDice: committed.actionDice,
    };
    const matches = !sheet.activePersonality || sheet.activePersonality === committed.campaignPersonality;
    const next = { ...sheet, ...(matches ? profile : {}), armaduraRd: committed.stats.armadura.current,
      ...(sheet.personalities ? {
        yermo: normalizeYermo(committed.yermo),
        personalities: { ...sheet.personalities, [committed.campaignPersonality]: profile },
      } : {}) };
    transaction.set(sheetRef, sanitizeForFirestore(next));
    const characterPatch = {};
    if (committed.stats.karma) characterPatch['stats.karma.actual'] = Number(committed.stats.karma.current) || 0;
    const original = originals.get(token.id);
    if (original && JSON.stringify(original.inventory) !== JSON.stringify(committed.inventory)) {
      const equipment = { weapons: [], armor: [], abilities: [], objects: [], accessories: [] };
      (committed.inventory || []).forEach(item => {
        const category = ({ weapon: 'weapons', armor: 'armor', ability: 'abilities', accessory: 'accessories' })[item.type] || 'objects';
        equipment[category].push(item);
      });
      characterPatch.equipment = equipment;
    }
    if (original && JSON.stringify(original.equipmentLoadout) !== JSON.stringify(committed.equipmentLoadout)) {
      characterPatch.equippedItems = committed.equipmentLoadout;
    }
    if (character.exists() && Object.keys(characterPatch).length) transaction.update(characterRef, sanitizeForFirestore(characterPatch));
    return { persisted: true, tokenId: token.id };
  })));
  return [...(rogueResults || []), ...campaignResults];
};
