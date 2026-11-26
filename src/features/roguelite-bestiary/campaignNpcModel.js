import { nanoid } from 'nanoid';
import { createRogueliteEnemyTokenPayload, normalizeRogueliteEnemy, prepareRogueliteEnemyForFirestore } from './enemyModel';
import { normalizeCampaignThreatProfile } from '../canvas/combat/campaignThreatDice';

const integer = (value, fallback, maximum) => {
  const parsed = Number(value);
  return Math.min(maximum, Math.max(0, Math.round(Number.isFinite(parsed) ? parsed : fallback)));
};

const stat = (value, fallback, maximum) => {
  const base = integer(value?.max ?? value?.current, fallback, maximum);
  return { current: Math.min(integer(value?.current, base, maximum), base), max: base };
};

export const CAMPAIGN_NPC_STAT_LIMITS = {
  vida: 999,
  armadura: 99,
  movimiento: 99,
  iniciativa: 99,
  ofensiva: 99,
};

export const normalizeCampaignNpc = (candidate = {}) => {
  const base = normalizeRogueliteEnemy(candidate);
  const source = candidate.stats || {};
  const threatDice = normalizeCampaignThreatProfile(candidate.threatDice, candidate.threatDie);
  return {
    ...base,
    profileType: 'campaignNpc',
    allegiance: candidate.allegiance === 'enemy' ? 'enemy' : 'ally',
    threatDice,
    threatDie: threatDice[0] || '',
    name: String(candidate.name || 'PNJ').trim() || 'PNJ',
    stats: {
      vida: stat(source.vida, 6, CAMPAIGN_NPC_STAT_LIMITS.vida),
      armadura: stat(source.armadura, 0, CAMPAIGN_NPC_STAT_LIMITS.armadura),
      movimiento: stat(source.movimiento, 2, CAMPAIGN_NPC_STAT_LIMITS.movimiento),
      iniciativa: stat(source.iniciativa, 2, CAMPAIGN_NPC_STAT_LIMITS.iniciativa),
      ofensiva: stat(source.ofensiva, 2, CAMPAIGN_NPC_STAT_LIMITS.ofensiva),
    },
  };
};

export const createEmptyCampaignNpc = () => normalizeCampaignNpc({
  id: `campaign-npc-${nanoid(10)}`,
  name: 'Nuevo PNJ',
  description: 'Describe su aspecto, personalidad y papel en la campaña.',
  headerLayout: 'square',
  stats: { vida: { current: 6, max: 6 }, armadura: { current: 0, max: 0 },
    movimiento: { current: 2, max: 2 }, iniciativa: { current: 2, max: 2 },
    ofensiva: { current: 2, max: 2 } },
  equipmentSlotCount: 3,
  abilitySlotCount: 3,
});

export const createCampaignNpcTokenPayload = (candidate = {}) => {
  const npc = normalizeCampaignNpc(candidate);
  const payload = createRogueliteEnemyTokenPayload(npc);
  return prepareRogueliteEnemyForFirestore({
    ...payload,
    profileType: 'rogueliteEnemy', // The Canvas uses this combat profile for enemy and allied NPC actions.
    rulesSystem: 'campaign',
    canvasRuntime: 'campaign',
    participatesInCombat: true,
    campaignNpcId: npc.id,
    threatDice: npc.threatDice,
    threatDie: npc.threatDice[0] || null,
    linkedEnemyId: null,
    teamId: npc.allegiance === 'enemy' ? 'enemies' : 'aliados',
    stats: npc.stats,
    fixedInitiative: npc.stats.iniciativa.current,
    velocidad: npc.stats.iniciativa.current,
    offenseBase: npc.stats.ofensiva.current,
  });
};
