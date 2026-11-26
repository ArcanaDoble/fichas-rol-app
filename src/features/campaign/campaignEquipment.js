import {
  createEquipmentTemplateId,
  equipmentItemsShareInstance,
  materializeEquipmentInstances,
  normalizeEquippedWeaponSets,
  resolveEquipmentInstanceId,
} from '../roguelite/equipmentPool';

const categories = ['weapons', 'armor', 'abilities', 'objects', 'accessories'];

const normalizeEquipmentText = (value) => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();

// A reinforcement is still an armor item, not another inventory category.
// Older guards may live in Accessories with their Armadura/Refuerzo tags.
export const isCampaignArmorReinforcement = (item = {}) => {
  if (!item) return false;
  const source = { ...item.payload, ...item };
  const traits = normalizeEquipmentText([
    source.traits, source.rasgos, source.trait, source.tags,
    source.category, source.categoria,
  ].flat().filter(Boolean).join(', '));
  const armor = source._category === 'armor' || source.itemType === 'armor'
    || source.type === 'armor' || /\barmaduras?\b/.test(traits);
  return armor && /\brefuerzo\b/.test(traits);
};

export const resolveCampaignArmorRd = (item) => {
  if (!item) return 0;
  const source = { ...item.payload, ...item };
  const raw = [source.rd, source.armaduraRd, source.defensa, source.defense]
    .find((value) => value != null && String(value).trim() !== '');
  if (raw !== undefined && Number.isFinite(Number(raw)) && Number(raw) >= 0) return Number(raw);
  // Compatibility for old accessory cards whose explicit RD is in their effect.
  if (isCampaignArmorReinforcement(source)) {
    const text = normalizeEquipmentText(source.description || source.descripcion || '');
    const match = text.match(/\brd\s*\+?\s*(\d+)\b/)
      || text.match(/\+\s*(\d+)\s*(?:de\s+)?rd\b/);
    if (match) return Number(match[1]);
  }
  return null;
};

export const resolveCampaignProtection = (equippedItems = {}) => {
  const body = resolveCampaignArmorRd(equippedItems.body);
  const reinforcementValue = resolveCampaignArmorRd(equippedItems.reinforcement);
  const reinforcement = reinforcementValue == null ? null : Math.min(1, reinforcementValue);
  return {
    body,
    reinforcement,
    total: body == null || reinforcement == null ? null : body + reinforcement,
  };
};

export const equipCampaignProtection = (equippedItems = {}, slot, item) => {
  if (!['body', 'reinforcement'].includes(slot)) return equippedItems;
  if (item && (slot === 'reinforcement') !== isCampaignArmorReinforcement(item)) return equippedItems;
  const next = { ...equippedItems, [slot]: item || null };
  // Moving the same owned copy from an old accessory/body slot frees that slot.
  if (item) Object.entries(next).forEach(([otherSlot, candidate]) => {
    if (otherSlot !== slot && (otherSlot === 'body' || otherSlot === 'reinforcement'
      || otherSlot.startsWith('accessory_') || otherSlot.startsWith('belt_'))
      && equipmentItemsShareInstance(candidate, item)) next[otherSlot] = null;
  });
  return next;
};

export const resolveCampaignProtectionDelta = (previous, next) => {
  const before = resolveCampaignProtection(previous);
  const after = resolveCampaignProtection(next);
  const legacyContribution = (items) => Math.min(1, Math.max(0,
    ...['accessory_1', 'accessory_2'].map((slot) => (
      isCampaignArmorReinforcement(items?.[slot]) ? resolveCampaignArmorRd(items[slot]) || 0 : 0
    )),
  ));
  // An already worn legacy guard does not grant its RD again when moved.
  const beforeReinforcement = Math.max(before.reinforcement || 0, legacyContribution(previous));
  const afterReinforcement = Math.max(after.reinforcement || 0, legacyContribution(next));
  const bodyDelta = before.body == null || after.body == null ? 0 : after.body - before.body;
  if (before.reinforcement != null && after.reinforcement != null) {
    return bodyDelta + afterReinforcement - beforeReinforcement;
  }
  return ['body', 'reinforcement'].reduce((delta, key) => (
    before[key] == null || after[key] == null ? delta : delta + after[key] - before[key]
  ), 0);
};

export const applyCampaignProtectionRdChange = (sheet, previous, next) => {
  if (!sheet) return sheet;
  const total = resolveCampaignProtection(next).total;
  const rd = sheet.armaduraRd == null ? total
    : Math.max(0, sheet.armaduraRd + resolveCampaignProtectionDelta(previous, next));
  return rd == null || rd === sheet.armaduraRd ? sheet : { ...sheet, armaduraRd: rd };
};

// Bind old equipped items to their physical copies without dropping equipment
// that an older sheet stored only in a slot. This is a view until the user edits.
export const getCampaignEquipmentState = (character = {}) => {
  const equipment = Object.fromEntries(categories.map((category) => [category,
    materializeEquipmentInstances(character.equipment?.[category] || [], category),
  ]));
  const used = new Set();
  const bind = (item, category, slot) => {
    if (!item) return null;
    const instanceId = resolveEquipmentInstanceId(item);
    const match = equipment[category].find((candidate) => (
      !used.has(candidate.instanceId) && (instanceId
        ? candidate.instanceId === instanceId
        : createEquipmentTemplateId(candidate, category) === createEquipmentTemplateId(item, category))
    ));
    if (match) {
      used.add(match.instanceId);
      return { ...match, ...item, templateId: match.templateId, instanceId: match.instanceId };
    }
    return { ...item, instanceId: instanceId || `campaign-equipped:${slot}` };
  };
  const source = normalizeEquippedWeaponSets(character.equippedItems);
  const weaponSets = source.weaponSets.map((set, index) => ({
    mainHand: bind(set.mainHand, 'weapons', `${index}:mainHand`),
    offHand: bind(set.offHand, 'weapons', `${index}:offHand`),
  }));
  const reinforcementCategory = equipment.accessories.some((item) => (
    equipmentItemsShareInstance(item, source.reinforcement)
  )) ? 'accessories' : 'armor';
  const equippedItems = {
    ...source, weaponSets, body: bind(source.body, 'armor', 'body'),
    reinforcement: bind(source.reinforcement, reinforcementCategory, 'reinforcement'),
  };
  Object.keys(source).forEach((slot) => {
    if (slot.startsWith('belt_') || slot.startsWith('accessory_')) {
      equippedItems[slot] = bind(source[slot], slot.startsWith('belt_') ? 'objects' : 'accessories', slot);
    }
  });
  return { equipment, equippedItems: normalizeEquippedWeaponSets(equippedItems) };
};

export const removeCampaignEquipment = (character, category, index) => {
  const { equipment, equippedItems } = getCampaignEquipmentState(character);
  const removed = equipment[category]?.[index];
  if (!removed) return character;
  equipment[category].splice(index, 1);
  const keep = (item) => item?.instanceId === removed.instanceId ? null : item;
  equippedItems.weaponSets = equippedItems.weaponSets.map((set) => ({
    mainHand: keep(set.mainHand), offHand: keep(set.offHand),
  }));
  Object.keys(equippedItems).forEach((slot) => {
    if (slot === 'body' || slot === 'reinforcement' || slot.startsWith('belt_') || slot.startsWith('accessory_')) {
      equippedItems[slot] = keep(equippedItems[slot]);
    }
  });
  const next = { ...character, equipment, equippedItems: normalizeEquippedWeaponSets(equippedItems) };
  if (category === 'abilities' && !equipment.abilities.some((item) => item.templateId === removed.templateId)) {
    const keys = [removed.templateId, removed.id, removed.name, removed.nombre].filter(Boolean);
    next.equippedSkillIds = (character.equippedSkillIds || character.skills?.slots || [])
      .map((id) => keys.includes(id) ? null : id);
    next.skills = { ...character.skills, slots: [...next.equippedSkillIds] };
  }
  return next;
};
