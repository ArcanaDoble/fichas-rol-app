export const CAMPAIGN_TALENT_SLOT_COUNT = 3;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const getTalentId = (talent, fallback) => {
  const id = typeof talent?.id === 'string' ? talent.id.trim() : String(talent?.id ?? '').trim();
  return id || fallback;
};

export const getCampaignTalentRoster = (character = {}) => {
  const reaction = Array.isArray(character.actionData?.reaction)
    ? character.actionData.reaction
    : [];
  const slots = Array.isArray(character.talents?.slots) ? character.talents.slots : [];
  const roster = [];
  const seen = new Set();

  reaction.forEach((talent, index) => {
    if (!isRecord(talent)) return;
    const id = getTalentId(talent, `legacy-talent-${index}`);
    if (seen.has(id)) return;
    roster.push({ ...talent, id });
    seen.add(id);
  });

  // Some older sheets kept a talent only in the equipped slots. Expose it in
  // the personal catalogue before any edit, so the first save cannot lose it.
  slots.slice(0, CAMPAIGN_TALENT_SLOT_COUNT).forEach((talent, index) => {
    if (!isRecord(talent)) return;
    const id = getTalentId(talent, `legacy-slot-${index}`);
    if (seen.has(id)) return;
    roster.push({ ...talent, id });
    seen.add(id);
  });

  return roster;
};

export const getCampaignTalentSlots = (character = {}) => {
  const rawSlots = Array.isArray(character.talents?.slots) ? character.talents.slots : [];
  const roster = getCampaignTalentRoster(character);
  return Array.from({ length: CAMPAIGN_TALENT_SLOT_COUNT }, (_, index) => {
    const talent = rawSlots[index];
    if (!isRecord(talent)) return null;
    const id = getTalentId(talent, `legacy-slot-${index}`);
    const catalogueEntry = roster.find((entry) => entry.id === id);
    return catalogueEntry ? { ...talent, ...catalogueEntry } : { ...talent, id };
  });
};

const withTalentChanges = (character, roster, slots) => {
  const currentSlots = Array.isArray(character.talents?.slots) ? character.talents.slots : [];
  const equippedIds = new Set(slots.filter(Boolean).map((talent) => talent.id));
  const preparedRoster = roster.map((talent) => ({
    ...talent,
    isActive: equippedIds.has(talent.id),
  }));
  const rosterById = new Map(preparedRoster.map((talent) => [talent.id, talent]));
  const nextSlots = slots.map((slot) => {
    if (!slot) return null;
    const updated = rosterById.get(slot.id);
    return updated ? { ...slot, ...updated } : null;
  });

  return {
    ...character,
    actionData: { ...(character.actionData || {}), reaction: preparedRoster },
    talents: {
      ...(character.talents || {}),
      slots: [...nextSlots, ...currentSlots.slice(CAMPAIGN_TALENT_SLOT_COUNT)],
    },
  };
};

export const addCampaignTalent = (character, talent) => {
  const roster = getCampaignTalentRoster(character);
  if (roster.some((entry) => entry.id === talent.id)) return character;
  return withTalentChanges(character, [...roster, talent], getCampaignTalentSlots(character));
};

// The shared equipment editor uses descriptions and IDs; campaign sheets keep
// their original reactions and full slot objects as the single source of truth.
export const getCampaignLoadoutTalentCatalog = (character) => getCampaignTalentRoster(character)
  .map((talent) => ({
    ...talent,
    description: talent.desc ?? talent.description ?? '',
    image: talent.image || talent.icon || '',
    available: talent.available !== false,
  }));

export const setCampaignLoadoutTalentCatalog = (character, catalog) => {
  const previous = new Map(getCampaignTalentRoster(character).map((talent) => [talent.id, talent]));
  const roster = catalog.map((talent) => ({
    ...previous.get(talent.id),
    ...talent,
    desc: talent.description ?? talent.desc ?? '',
  }));
  const availableIds = new Set(roster.map((talent) => talent.id));
  return withTalentChanges(character, roster, getCampaignTalentSlots(character)
    .map((talent) => availableIds.has(talent?.id) ? talent : null));
};

export const setCampaignLoadoutTalentSlots = (character, ids) => {
  const roster = getCampaignTalentRoster(character);
  const seen = new Set();
  const slots = Array.from({ length: CAMPAIGN_TALENT_SLOT_COUNT }, (_, index) => {
    const talent = roster.find((entry) => entry.id === ids[index]);
    if (!talent || seen.has(talent.id)) return null;
    seen.add(talent.id);
    return talent;
  });
  return withTalentChanges(character, roster, slots);
};

export const updateCampaignTalent = (character, id, changes) => {
  const roster = getCampaignTalentRoster(character);
  if (!roster.some((talent) => talent.id === id)) return character;
  const nextRoster = roster.map((talent) => {
    if (talent.id !== id) return talent;
    const next = { ...talent, ...changes };
    if (Object.prototype.hasOwnProperty.call(changes, 'desc') &&
      Object.prototype.hasOwnProperty.call(talent, 'description')) {
      next.description = changes.desc;
    }
    return next;
  });
  return withTalentChanges(character, nextRoster, getCampaignTalentSlots(character));
};

export const removeCampaignTalent = (character, id) => {
  const roster = getCampaignTalentRoster(character).filter((talent) => talent.id !== id);
  const slots = getCampaignTalentSlots(character).map((slot) => slot?.id === id ? null : slot);
  return withTalentChanges(character, roster, slots);
};

export const equipCampaignTalent = (character, slotIndex, id) => {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CAMPAIGN_TALENT_SLOT_COUNT) {
    return character;
  }
  const roster = getCampaignTalentRoster(character);
  const talent = roster.find((entry) => entry.id === id);
  if (id && !talent) return character;
  const slots = getCampaignTalentSlots(character).map((slot, index) => {
    if (index === slotIndex) return talent || null;
    return slot?.id === id ? null : slot;
  });
  return withTalentChanges(character, roster, slots);
};

export const updateCampaignFeature = (character, index, changes) => {
  const features = Array.isArray(character.features) ? character.features : [];
  if (!isRecord(features[index])) return character;
  return {
    ...character,
    features: features.map((feature, currentIndex) => currentIndex === index
      ? { ...feature, ...changes }
      : feature),
  };
};

export const addCampaignFeature = (character, feature) => ({
  ...character,
  features: [...(Array.isArray(character.features) ? character.features : []), feature],
});

export const removeCampaignFeature = (character, index) => ({
  ...character,
  features: (Array.isArray(character.features) ? character.features : [])
    .filter((_, currentIndex) => currentIndex !== index),
});
