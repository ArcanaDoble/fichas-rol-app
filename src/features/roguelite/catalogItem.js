import { resolveEquipmentHandsRequired } from './equipmentPool';

const clampInteger = (value, minimum, maximum, fallback = minimum) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
};

const splitTraits = (value) => {
  if (Array.isArray(value)) {
    return value.map((trait) => String(trait || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((trait) => trait.trim())
    .filter(Boolean);
};

const joinTraits = (value) => splitTraits(value).join(', ');

export const ACTION_DICE_COSTS = Object.freeze([0, 1, 2, 3]);
export const EQUIPMENT_RANGES = Object.freeze([
  'Toque',
  'Cercano',
  'Intermedio',
  'Lejano',
  'Extremo',
]);
export const ABILITY_RANGES = Object.freeze([
  'Arma',
  'Catalizador',
  'Toque',
  'Cercano',
  'Intermedio',
  'Lejano',
  'Extremo',
]);
export const WEAPON_COMPETENCES = Object.freeze(['Simple', 'Marcial', 'Arcana']);
export const ARMOR_COMPETENCES = Object.freeze(['Ligera', 'Media', 'Pesada', 'Arcana']);

export const parseActionDiceCost = (value, fallback = 0) => {
  if (typeof value === 'number') return clampInteger(value, 0, 3, fallback);

  const text = String(value || '').trim();
  if (!text) return fallback;

  const diceIcons = text.match(/🟡/g);
  if (diceIcons?.length) return clampInteger(diceIcons.length, 0, 3, fallback);

  const numeric = text.match(/\d+/)?.[0];
  return numeric === undefined ? fallback : clampInteger(numeric, 0, 3, fallback);
};

export const toLegacyActionDiceCost = (value) => '🟡'.repeat(
  parseActionDiceCost(value, 0),
);

const omitLegacyFields = (item = {}, keys = []) => Object.fromEntries(
  Object.entries(item).filter(([key]) => !keys.includes(key)),
);

const commonLegacyFields = [
  'carga',
  'cargaFisica',
  'cargaMental',
  'physicalLoad',
  'mentalLoad',
  'cuerpo',
  'mente',
  'tecnologia',
  'technology',
];

const armorCostFields = [
  'actionCost',
  'consumo',
  'consumption',
  'cost',
  'coste',
];

export const createEmptyWeaponCatalogItem = () => ({
  id: '',
  nombre: '',
  dano: '',
  alcance: 'Cercano',
  actionCost: 1,
  handsRequired: 1,
  competence: 'Simple',
  rasgos: '',
  descripcion: '',
  valor: '',
  rareza: '',
});

export const createEmptyArmorCatalogItem = () => ({
  id: '',
  nombre: '',
  defenseClass: '',
  competence: 'Ligera',
  rasgos: '',
  descripcion: '',
  valor: '',
  rareza: '',
});

export const createEmptyAccessoryCatalogItem = () => ({
  id: '',
  nombre: '',
  rasgos: '',
  descripcion: '',
  valor: '',
  rareza: '',
});

export const createEmptyAbilityCatalogItem = () => ({
  id: '',
  nombre: '',
  alcance: 'Arma',
  actionCost: 1,
  poder: '',
  rasgos: '',
  descripcion: '',
  rareza: '',
});

export const weaponCatalogItemToForm = (item = {}) => ({
  ...createEmptyWeaponCatalogItem(),
  ...omitLegacyFields(item, [...commonLegacyFields, 'tipoDano', 'damageType']),
  actionCost: parseActionDiceCost(item.actionCost ?? item.consumo ?? item.cost, 1),
  handsRequired: resolveEquipmentHandsRequired(item),
  competence: item.competence ?? item.competencia ?? item.weaponCompetence ?? item.tipo ?? 'Simple',
  rasgos: joinTraits(item.rasgos ?? item.traits),
});

export const armorCatalogItemToForm = (item = {}) => ({
  ...createEmptyArmorCatalogItem(),
  ...omitLegacyFields(item, [...commonLegacyFields, ...armorCostFields]),
  defenseClass: item.defenseClass ?? item.cd ?? item.defensa ?? item.defense ?? '',
  competence: item.competence ?? item.competencia ?? item.armorCompetence ?? item.tipo ?? 'Ligera',
  rasgos: joinTraits(item.rasgos ?? item.traits),
});

export const accessoryCatalogItemToForm = (item = {}) => ({
  ...createEmptyAccessoryCatalogItem(),
  ...omitLegacyFields(item, [...commonLegacyFields, 'defensa', 'defense']),
  rasgos: joinTraits(item.rasgos ?? item.traits),
});

export const abilityCatalogItemToForm = (item = {}) => ({
  ...createEmptyAbilityCatalogItem(),
  ...omitLegacyFields(item, commonLegacyFields),
  actionCost: parseActionDiceCost(item.actionCost ?? item.consumo ?? item.cost, 1),
  poder: item.poder ?? item.damage ?? item.dano ?? '',
  rasgos: joinTraits(item.rasgos ?? item.traits),
});

export const weaponCatalogItemToStorage = (item = {}) => {
  const clean = omitLegacyFields(item, [
    ...commonLegacyFields,
    'tipoDano',
    'damageType',
    'requiredHands',
    'manosRequeridas',
    'manos',
    'cost',
  ]);
  const actionCost = parseActionDiceCost(item.actionCost ?? item.consumo, 1);
  const handsRequired = clampInteger(item.handsRequired, 1, 2, 1);

  return {
    ...clean,
    actionCost,
    consumo: toLegacyActionDiceCost(actionCost),
    handsRequired,
    competence: item.competence || 'Simple',
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim(),
  };
};

export const armorCatalogItemToStorage = (item = {}) => {
  const clean = omitLegacyFields(item, [
    ...commonLegacyFields,
    ...armorCostFields,
    'defense',
  ]);
  const defenseClass = String(item.defenseClass ?? item.cd ?? item.defensa ?? '').trim();

  return {
    ...clean,
    defenseClass,
    defensa: defenseClass,
    competence: item.competence || 'Ligera',
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim(),
  };
};

export const accessoryCatalogItemToStorage = (item = {}) => ({
  ...omitLegacyFields(item, [...commonLegacyFields, 'defensa', 'defense']),
  rasgos: splitTraits(item.rasgos),
  rareza: String(item.rareza || '').trim(),
});

export const abilityCatalogItemToStorage = (item = {}) => {
  const clean = omitLegacyFields(item, [...commonLegacyFields, 'cost', 'damage', 'dano']);
  const actionCost = parseActionDiceCost(item.actionCost ?? item.consumo, 1);

  return {
    ...clean,
    actionCost,
    consumo: toLegacyActionDiceCost(actionCost),
    poder: String(item.poder || '').trim(),
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim(),
  };
};
