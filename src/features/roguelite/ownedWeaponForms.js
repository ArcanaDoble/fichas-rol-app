import { getWeaponForms, hasWeaponTrick, resolveWeaponForm, setWeaponForm } from './weaponForms';
import { normalizeEquippedWeaponSets, resolveEquipmentInstanceId } from './equipmentPool';

export const ownedWeaponKey = (item = {}) => {
  const source = item.payload ? { ...item.payload, ...item } : item;
  return resolveEquipmentInstanceId(source)
    || String(source.id || source.catalogId || source.name || source.nombre || '');
};

// A form belongs to an owned copy, including its inventory and loadout references.
export const transformWeaponInGear = (gear, weapon, formId) => {
  if (Array.isArray(gear)) return gear.map(entry => transformWeaponInGear(entry, weapon, formId));
  if (!gear || typeof gear !== 'object') return gear;
  if (hasWeaponTrick(gear) && ownedWeaponKey(gear) === ownedWeaponKey(weapon)) return setWeaponForm(gear, formId);
  return Object.fromEntries(Object.entries(gear).map(([key, value]) => [key,
    key === 'trickForms' ? value : transformWeaponInGear(value, weapon, formId)]));
};

export const transformSheetWeapon = (sheet, weapon, formId) => {
  const destination = getWeaponForms(weapon).find(form => form.id === formId);
  if (!destination) throw new Error('Esta forma ya no está disponible.');
  const loadout = normalizeEquippedWeaponSets(sheet.equippedItems);
  for (const set of loadout.weaponSets) {
    const hands = [set.mainHand, set.offHand].filter(Boolean);
    if (hands.some(item => ownedWeaponKey(item) === ownedWeaponKey(weapon))
      && destination.handsRequired === 2 && hands.length > 1) {
      throw new Error('Libera la otra mano antes de transformar el arma.');
    }
  }
  const next = { ...sheet };
  for (const field of ['equipment', 'equippedItems', 'activeRun']) {
    if (sheet[field]) next[field] = transformWeaponInGear(sheet[field], weapon, formId);
  }
  return next;
};

export const sheetWeaponFormsChanged = (before, after) => {
  const forms = sheet => {
    const result = {};
    const visit = value => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') {
        if (hasWeaponTrick(value)) result[ownedWeaponKey(value)] = resolveWeaponForm(value).activeFormId;
        else Object.values(value).forEach(visit);
      }
    };
    visit([sheet?.equipment, sheet?.equippedItems, sheet?.activeRun?.inventory]);
    return result;
  };
  const previous = forms(before), current = forms(after);
  return Object.keys(current).some(key => previous[key] && current[key] !== previous[key]);
};
