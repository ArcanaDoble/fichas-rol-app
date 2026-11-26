// Definitions belong to the catalog; activeFormId belongs to each physical copy.
const text = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const splitWeaponTraits = value => (Array.isArray(value) ? value : String(value || '').split(','))
  .map(value => String(value).trim()).filter(Boolean);
const sourceOf = item => ({ ...item?.payload, ...item });
export const hasWeaponTrick = item => {
  const source = sourceOf(item);
  return splitWeaponTraits(source.rasgos ?? source.traits ?? source.trait).some(trait => text(trait) === 'truco');
};
const profileKeys = ['dano', 'damage', 'alcance', 'range', 'actionCost', 'consumo', 'consumption', 'cost', 'coste',
  'handsRequired', 'hands', 'requiredHands', 'manos', 'competence', 'competencia', 'weaponCompetence',
  'rasgos', 'traits', 'trait', 'properties', 'descripcion', 'description', 'rulesDescription',
  'image', 'img', 'imagen', 'imageUrl', 'imageSource', 'art', 'icon',
  'campaignZoneTraits', 'campaignPenetration', 'penetration', 'perforante', 'campaignBlocks',
  'campaignParryPairs', 'campaignSplit', 'campaignProjectile', 'attackType', 'defenseDiceProfile', 'perfilDefensa'];
const pickProfile = source => Object.fromEntries(profileKeys.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
const normalizeProfile = (source, id, fallbackLabel) => ({
  ...pickProfile(source), id, label: String(source.label || fallbackLabel),
  dano: String(source.dano ?? source.damage ?? ''),
  alcance: source.alcance || source.range || 'Cercano',
  actionCost: Math.min(3, Math.max(1, Number(source.actionCost) || 1)),
  handsRequired: Number(source.handsRequired ?? source.hands) === 2 ? 2 : 1,
  competence: source.competence || source.competencia || 'Simple',
  rasgos: splitWeaponTraits(source.rasgos ?? source.traits).filter(trait => text(trait) !== 'truco'),
  descripcion: String(source.descripcion ?? source.description ?? ''),
  image: Object.prototype.hasOwnProperty.call(source, 'image') ? source.image || ''
    : source.img || source.imagen || source.imageUrl || source.imageSource || source.art || source.icon || '',
});

export const getWeaponForms = (item = {}, baseImage = '') => {
  const source = sourceOf(item);
  const stored = Array.isArray(source.trickForms) ? source.trickForms : [];
  const primary = stored[0] || { ...source, image: baseImage || source.image };
  const secondary = stored[1] || { ...pickProfile(source), image: '', img: '', imagen: '', imageUrl: '', icon: '' };
  return [normalizeProfile(primary, stored[0]?.id || 'primary', 'Forma I'),
    normalizeProfile(secondary, stored[1]?.id && stored[1].id !== stored[0]?.id ? stored[1].id : 'secondary', 'Forma II')];
};

export const updateWeaponForm = (item, index, patch, baseImage = '') => {
  const forms = getWeaponForms(item, baseImage);
  forms[index] = normalizeProfile({ ...forms[index], ...patch }, forms[index].id, forms[index].label);
  const primary = forms[0];
  return { ...item, trickForms: forms, ...(index === 0 ? {
    ...pickProfile(primary),
    rasgos: ['Truco', ...primary.rasgos].join(', '),
  } : {}) };
};

export const resolveWeaponForm = item => {
  if (!item || !hasWeaponTrick(item)) return item;
  const source = sourceOf(item), forms = getWeaponForms(source);
  const form = forms.find(form => form.id === source.activeFormId) || forms[0];
  const resolved = { ...source };
  profileKeys.forEach(key => delete resolved[key]);
  Object.assign(resolved, pickProfile(form), {
    trickForms: forms, activeFormId: form.id, formLabel: form.label,
    dano: form.dano, damage: form.dano, alcance: form.alcance, range: form.alcance,
    handsRequired: form.handsRequired, hands: form.handsRequired,
    actionCost: form.actionCost, consumption: form.actionCost, consumo: '🟡'.repeat(form.actionCost),
    competence: form.competence, competencia: form.competence,
    rasgos: ['Truco', ...form.rasgos], traits: ['Truco', ...form.rasgos],
    descripcion: form.descripcion, description: form.descripcion,
    image: form.image, img: form.image, imagen: form.image, imageUrl: form.image, imageSource: form.image, art: form.image, icon: form.image,
  });
  if (item.payload) resolved.payload = { ...item.payload, ...Object.fromEntries(Object.entries(resolved).filter(([key]) => key !== 'payload')) };
  return resolved;
};

export const setWeaponForm = (item, formId) => {
  if (!hasWeaponTrick(item) || !getWeaponForms(item).some(form => form.id === formId)) throw new Error('La forma del arma ya no está disponible.');
  return resolveWeaponForm({ ...item, activeFormId: formId });
};

export const normalizeWeaponFormsForStorage = item => {
  if (!hasWeaponTrick(item)) return item;
  const forms = getWeaponForms(item);
  const normalized = resolveWeaponForm({ ...item, trickForms: forms, activeFormId: forms[0].id });
  // A catalog definition never chooses the live form of every owned copy.
  delete normalized.activeFormId;
  delete normalized.formLabel;
  return normalized;
};
