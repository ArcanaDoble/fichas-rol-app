import {
  addCampaignFeature,
  addCampaignTalent,
  equipCampaignTalent,
  getCampaignTalentRoster,
  getCampaignTalentSlots,
  getCampaignLoadoutTalentCatalog,
  setCampaignLoadoutTalentCatalog,
  setCampaignLoadoutTalentSlots,
  removeCampaignTalent,
  updateCampaignFeature,
  updateCampaignTalent,
} from '../campaignTalents';

const character = {
  id: 'char-yerma',
  actionData: {
    movement: [{ id: 'legacy-movement', name: 'Moverse' }],
    reaction: [
      { id: 'astuta', name: 'Astuta', desc: 'Texto previo', isActive: true, customFlag: 'keep' },
      { id: 'soberbia', name: 'Soberbia', desc: 'Otro texto', isActive: true },
    ],
  },
  talents: {
    title: 'Nombre heredado',
    rarity: 'rara',
    slots: [
      { id: 'astuta', name: 'Astuta', desc: 'Texto previo', slotNote: 'keep' },
      { id: 'soberbia', name: 'Soberbia', desc: 'Otro texto' },
      null,
    ],
  },
  features: [{ name: 'Uroboros', description: 'Original', level: 2, foilType: 'golden' }],
};

test('editing a personal talent synchronizes its equipped copy and preserves other legacy fields', () => {
  const edited = updateCampaignTalent(character, 'astuta', { name: 'Astuta revisada', desc: 'Nueva definición' });

  expect(edited.actionData.reaction[0]).toMatchObject({
    name: 'Astuta revisada', desc: 'Nueva definición', customFlag: 'keep',
  });
  expect(edited.talents.slots[0]).toMatchObject({
    name: 'Astuta revisada', desc: 'Nueva definición', slotNote: 'keep',
  });
  expect(edited.actionData.movement).toEqual(character.actionData.movement);
  expect(edited.talents.title).toBe('Nombre heredado');
  expect(edited.talents.rarity).toBe('rara');
  expect(edited.features).toEqual(character.features);
  expect(character.actionData.reaction[0].name).toBe('Astuta');
});

test('slot-only legacy talents survive the first catalogue edit', () => {
  const withOrphan = {
    ...character,
    actionData: { ...character.actionData, reaction: [] },
  };
  const roster = getCampaignTalentRoster(withOrphan);
  expect(roster.map((talent) => talent.name)).toEqual(['Astuta', 'Soberbia']);

  const edited = addCampaignTalent(withOrphan, {
    id: 'personal', name: 'Talento nuevo', desc: '', isActive: true,
  });
  expect(edited.actionData.reaction.map((talent) => talent.name)).toEqual([
    'Astuta', 'Soberbia', 'Talento nuevo',
  ]);
  expect(edited.talents.slots[0].slotNote).toBe('keep');
});

test('equipping moves a talent between the three slots and removal clears only its slot', () => {
  const added = addCampaignTalent(character, {
    id: 'third', name: 'Tercer talento', desc: '', isActive: true,
  });
  const equipped = equipCampaignTalent(added, 2, 'third');
  const moved = equipCampaignTalent(equipped, 0, 'third');

  expect(getCampaignTalentSlots(moved).map((talent) => talent?.id || null)).toEqual([
    'third', 'soberbia', null,
  ]);
  expect(moved.actionData.reaction.find((talent) => talent.id === 'astuta').isActive).toBe(false);
  expect(moved.actionData.reaction.find((talent) => talent.id === 'third').isActive).toBe(true);
  const removed = removeCampaignTalent(moved, 'third');
  expect(removed.talents.slots.map((talent) => talent?.id || null)).toEqual([
    null, 'soberbia', null,
  ]);
  expect(removed.actionData.reaction.map((talent) => talent.id)).toEqual(['astuta', 'soberbia']);
});

test('personal traits remain separate from equipable talents and retain metadata', () => {
  const edited = updateCampaignFeature(character, 0, { description: 'Texto revisado' });
  const added = addCampaignFeature(edited, { id: 'new-trait', name: 'Nota propia', description: '' });

  expect(added.features[0]).toMatchObject({
    name: 'Uroboros', description: 'Texto revisado', level: 2, foilType: 'golden',
  });
  expect(added.features[1]).toMatchObject({ name: 'Nota propia' });
  expect(getCampaignTalentRoster(added).map((talent) => talent.name)).toEqual(['Astuta', 'Soberbia']);
});

test('the shared sidebar edits legacy keys and preserves slot metadata without creating roguelite rules', () => {
  const catalog = getCampaignLoadoutTalentCatalog(character);
  const next = setCampaignLoadoutTalentCatalog(character, catalog.map((talent) => ({
    ...talent, description: talent.id === 'astuta' ? 'Revisada en equipo' : talent.description,
  })));
  expect(next.actionData.reaction[0]).toMatchObject({ desc: 'Revisada en equipo', customFlag: 'keep' });
  expect(next.talents.slots[0]).toMatchObject({ desc: 'Revisada en equipo', slotNote: 'keep' });
  expect(next.roguelite).toBeUndefined();
  expect(next.talentCatalog).toBeUndefined();
  const unequipped = setCampaignLoadoutTalentSlots(next, [null, 'soberbia', 'astuta']);
  expect(getCampaignTalentSlots(unequipped).map((talent) => talent?.id || null)).toEqual([null, 'soberbia', 'astuta']);
  expect(getCampaignTalentRoster(unequipped)).toHaveLength(2);
  const removed = setCampaignLoadoutTalentCatalog(unequipped, [catalog[1]]);
  expect(removed.talents.slots[2]).toBeNull();
  expect(removed.actionData.movement).toEqual(character.actionData.movement);
});
