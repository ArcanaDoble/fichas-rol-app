import { CAMPAIGN_PERSONALITIES, resolveCampaignPersonality } from './personalities';
import { normalizeYermo } from './yermo';

export const CAMPAIGN_CHARACTER_SHEET_COLLECTION = 'campaignCharacterSheets';
export const CAMPAIGN_SYSTEM_ID = 'campaign-parry';
export const CAMPAIGN_SHEET_SCHEMA_VERSION = 2;

export const CAMPAIGN_ACTION_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const emptyTrack = () => ({ current: null, max: null });

export const createEmptyCampaignSheet = ({ characterId, owner }) => ({
  systemId: CAMPAIGN_SYSTEM_ID,
  schemaVersion: CAMPAIGN_SHEET_SCHEMA_VERSION,
  sourceCharacterId: String(characterId || '').trim(),
  owner: String(owner || '').trim(),
  vida: emptyTrack(),
  mente: emptyTrack(),
  movilidad: null,
  actionDice: [null, null, null],
  armaduraRd: null,
});

const readNonNegativeInteger = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
};

const normalizeTrack = (value) => ({
  current: readNonNegativeInteger(value?.current),
  max: readNonNegativeInteger(value?.max),
});

const normalizePersonalityStats = (source) => {
  const dice = Array.isArray(source?.actionDice) ? source.actionDice : [];
  return {
    vida: normalizeTrack(source?.vida),
    mente: normalizeTrack(source?.mente),
    movilidad: readNonNegativeInteger(source?.movilidad),
    actionDice: [0, 1, 2].map((index) => (
      CAMPAIGN_ACTION_DICE.includes(dice[index]) ? dice[index] : null
    )),
  };
};

export const normalizeCampaignSheet = (source, identity) => {
  const stats = normalizePersonalityStats(source);
  const activePersonality = resolveCampaignPersonality(source?.activePersonality)
    || resolveCampaignPersonality(identity?.personalityId);
  const personalities = activePersonality ? Object.fromEntries(CAMPAIGN_PERSONALITIES.map(({ id }) => [
    id,
    // Existing values belong to the portrait currently shown. Other profiles
    // start empty; equipment and manual RD remain on the shared character.
    id === activePersonality.id ? stats : normalizePersonalityStats(source?.personalities?.[id]),
  ])) : null;

  return {
    ...createEmptyCampaignSheet(identity),
    ...stats,
    armaduraRd: readNonNegativeInteger(source?.armaduraRd),
    ...(personalities ? {
      activePersonality: activePersonality.id,
      personalities,
      yermo: normalizeYermo(source?.yermo),
    } : {}),
  };
};

export const switchCampaignPersonality = (sheet, personalityId, identity) => {
  const nextPersonality = resolveCampaignPersonality(personalityId);
  const current = normalizeCampaignSheet(sheet, identity);
  if (!current.personalities || !nextPersonality) return current;
  return normalizeCampaignSheet({
    ...current,
    ...current.personalities[nextPersonality.id],
    activePersonality: nextPersonality.id,
  }, identity);
};

export const validateCampaignSheet = (sheet) => {
  const errors = [];
  const profiles = sheet?.personalities
    ? CAMPAIGN_PERSONALITIES.map(({ id, name }) => [name, sheet.personalities[id]])
    : [['', sheet]];
  profiles.forEach(([name, profile]) => {
    ['vida', 'mente'].forEach((key) => {
      const track = profile?.[key] || {};
      if (track.max !== null && track.current !== null && track.current > track.max) {
        errors.push(`${name ? `${name}: ` : ''}El valor actual de ${key} no puede superar su máximo.`);
      }
    });
  });
  return errors;
};

