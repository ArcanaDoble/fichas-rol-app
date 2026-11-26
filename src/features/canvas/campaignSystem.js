import { normalizeCampaignSheet } from '../campaign/characterSheet';
import { getCampaignEquipmentState, resolveCampaignProtection } from '../campaign/campaignEquipment';
import { getCampaignLoadoutTalentCatalog, getCampaignTalentSlots } from '../campaign/campaignTalents';
import { resolveRogueliteEquippedItems, syncCanvasTokenWithSheet } from './rogueliteTokenSheetSync';
import { refreshForgeEquipment } from '../../utils/forgeEquipmentSync';

export const getCanvasSystem = scenario => scenario?.rulesSystem === 'campaign' ? 'campaign' : 'roguelite';
export const isCampaignToken = token => token?.profileType === 'campaignCharacter' || token?.rulesSystem === 'campaign';
export const isCampaignSheet = sheet => sheet?.profileType === 'campaignCharacter' || sheet?.systemId === 'campaign-parry';
const number = value => Math.max(0, Math.floor(Number(value) || 0));
const track = (source, label, color) => ({ current: number(source?.current), max: number(source?.max), label, color });

export const getCampaignArmorRd = token => {
  if (token?.stats?.armadura?.current != null) return number(token.stats.armadura.current);
  return number(resolveCampaignProtection(token?.equipmentLoadout).total);
};

export const syncCampaignToken = (token, character, catalogs = {}, options = {}) => {
  const sheet = normalizeCampaignSheet(character.campaignSheet, {
    characterId: character.id, owner: character.owner, personalityId: character.name,
  });
  const gear = getCampaignEquipmentState(refreshForgeEquipment(character, catalogs));
  const equipped = resolveRogueliteEquippedItems(gear.equippedItems);
  const keep = options.preserveTokenState === true && token.profileType === 'campaignCharacter';
  const armorValue = resolveCampaignProtection(equipped.loadout).total;
  const stats = {
    vida: track(sheet.vida, 'Vida', '#e7a0a8'),
    mente: track(sheet.mente, 'Mente', '#bba2db'),
    movimiento: track({ current: sheet.movilidad, max: sheet.movilidad }, 'Movilidad', '#86bfe2'),
    armadura: track({ current: sheet.armaduraRd ?? armorValue, max: sheet.armaduraRd ?? armorValue }, 'RD', '#c8c6be'),
  };
  if (/^yuu?zu$/i.test(character.name || '')) stats.karma = { current: Number(character.stats?.karma?.actual) || 0 };
  if (options.preserveMovement && token.campaignPersonality === sheet.activePersonality
    && token.campaignSheet?.movilidad === sheet.movilidad && token.stats?.movimiento) {
    stats.movimiento = token.stats.movimiento;
  }
  const talentSlots = getCampaignTalentSlots(character);
  const skillIds = character.equippedSkillIds || character.skills?.slots || [];
  const inventory = Object.entries(gear.equipment).flatMap(([category, items]) => items.map(item => ({
    ...item, type: ({ weapons: 'weapon', armor: 'armor', abilities: 'ability', objects: 'object', accessories: 'accessory' })[category],
    isEquipped: equipped.items.some(e => e.instanceId === item.instanceId),
  })));
  const skills = skillIds.slice(0, 3).map(id => inventory.find(item => [item.id, item.templateId, item.name, item.nombre].includes(id)) || null);
  return {
    ...token, profileType: 'campaignCharacter', rulesSystem: 'campaign', canvasRuntime: 'campaign',
    participatesInCombat: token.participatesInCombat !== false,
    linkedCharacterId: character.id, linkedClassId: null, linkedClassOwner: null, runId: null,
    campaignOwner: character.owner || '', campaignSheet: sheet,
    campaignPersonality: sheet.activePersonality || null,
    name: character.name || token.name,
    img: character.avatar || character.portraitSource || character.image || token.img || '',
    portrait: character.avatar || character.portraitSource || character.image || token.portrait || '',
    stats: keep ? token.stats : stats,
    actionDice: sheet.actionDice,
    initiativeBase: 0,
    yermo: keep ? token.yermo ?? sheet.yermo ?? '0' : sheet.yermo ?? '0',
    equipmentLoadout: equipped.loadout, equippedItems: equipped.items,
    activeWeaponSet: equipped.activeWeaponSet, inventory,
    equippedTalentSlots: talentSlots, equippedTalents: talentSlots.filter(Boolean),
    equippedTalentIds: talentSlots.map(t => t?.id || null), talentCatalog: getCampaignLoadoutTalentCatalog(character),
    equippedSkillIds: skillIds, equippedSkillSlots: skills, equippedSkills: skills.filter(Boolean),
    proficiencies: character.proficiencies || character.summary?.proficiencies || null,
    status: token.status || [],
  };
};

export const syncCanvasSystemToken = (token, sheet, catalogs, options = {}) => {
  if (isCampaignSheet(sheet)) return syncCampaignToken(token, sheet, catalogs, options);
  const synced = syncCanvasTokenWithSheet(token, sheet, catalogs, options);
  return options.rulesSystem === 'campaign' ? switchEnemySystem(synced, 'campaign') : synced;
};

// Keep each enemy's numeric resources when alternating systems; never scale Life
// or convert CD into RD. Map geometry and ownership remain shared.
export const switchEnemySystem = (token, system) => {
  if (token.profileType !== 'rogueliteEnemy') return token;
  const previous = token.rulesSystem === 'campaign' ? 'campaign' : 'roguelite';
  if (previous === system) return token;
  const systems = { ...token.systemResources, [previous]: { stats: token.stats || {} } };
  const stored = systems[system];
  const stats = stored?.stats || {
    vida: token.stats?.vida || track(null, 'Vida', '#e7a0a8'),
    movimiento: token.stats?.movimiento || track(null, 'Movilidad', '#86bfe2'),
    iniciativa: token.stats?.iniciativa || track({ current: token.fixedInitiative, max: token.fixedInitiative }, 'Iniciativa', '#d7b867'),
    ofensiva: token.stats?.ofensiva || track({ current: token.offenseBase, max: token.offenseBase }, 'Acción', '#d68469'),
    armadura: track({ current: getCampaignArmorRd(token), max: getCampaignArmorRd(token) }, 'RD', '#c8c6be'),
  };
  return { ...token, rulesSystem: system, stats, systemResources: systems,
    ...(system === 'campaign' ? { participatesInCombat: token.participatesInCombat !== false } : {}),
    fixedInitiative: number(stats.iniciativa?.current),
    velocidad: number(stats.iniciativa?.current),
    offenseBase: number(stats.ofensiva?.current),
  };
};

export const applyCampaignImpact = (token, impact) => {
  const damage = Math.max(0, number(impact) - getCampaignArmorRd(token));
  const current = number(token.stats?.vida?.current);
  return { ...token.stats, vida: { ...token.stats?.vida, current: Math.max(0, current - damage) } };
};
