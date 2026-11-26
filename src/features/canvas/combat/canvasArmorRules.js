import { resolveEquippedArmor, getItemTraits } from '../../../utils/armorSystem';
import { getArcaneBarrierProtections } from '../spells/arcaneBarrierState';

const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const traitKey = value => ['perforacion', 'penetrante'].includes(key(value)) ? 'perforante' : key(value);
export const CANVAS_MUTABLE_PROTECTIONS = ['critico', 'perforante', 'conmocion', 'empuje'];

export const getCanvasEquippedArmor = token => {
  const body = token?.equipmentLoadout?.body;
  if (token?.equipmentLoadout) return body ? { ...body.payload, ...body } : null;
  return resolveEquippedArmor(token);
};

export const hasCanvasMutableArmor = token => {
  if (token?.rulesSystem === 'campaign') return false;
  const armor = getCanvasEquippedArmor(token);
  return getItemTraits(armor).some(trait => /adaptativa|mutable/.test(key(trait)))
    || key(armor?.name || armor?.nombre).includes('tunica arcana');
};

// Canvas armor has no durability pool. Only the equipped piece grants protection.
// Explicit family metadata wins; the common arsenal supplies a fallback for older copies.
export const isCanvasCuttingAttack = weapon => {
  const family = key(weapon?.damageFamily || weapon?.damageType || weapon?.tipoDano);
  if (family) return family === 'cortante';
  const traits = getItemTraits(weapon).map(key);
  if (traits.some(trait => trait.includes('catalizador'))) return false;
  return traits.includes('cortante') || /^(daga|espada|cimitarra|mandoble)(\s|$)/.test(key(weapon?.name || weapon?.nombre));
};

export const getCanvasArmorProtection = (token, weapon) => {
  const armor = getCanvasEquippedArmor(token);
  const barrierTraits = getArcaneBarrierProtections(token);
  if (!armor) return { activeArmor: null, negatedTraits: barrierTraits };
  const name = key(armor.name || armor.nombre);
  let traits = getItemTraits(armor).map(traitKey).filter(trait => CANVAS_MUTABLE_PROTECTIONS.includes(trait));
  if (hasCanvasMutableArmor(token)) {
    traits = CANVAS_MUTABLE_PROTECTIONS.includes(token.armorProtectionChoice) ? [token.armorProtectionChoice] : [];
  } else if (/gambeson/.test(name)) traits = ['conmocion'];
  else if (/malla/.test(name)) traits = isCanvasCuttingAttack(weapon) ? ['critico'] : [];
  else if (/escamas/.test(name)) traits = ['perforante'];
  else if (/placas/.test(name)) traits = ['empuje'];
  const suppressed = (token.suppressedArmorTraits || []).map(traitKey);
  return { activeArmor: armor, negatedTraits: [...new Set([...traits.filter(trait => !suppressed.includes(trait)), ...barrierTraits])] };
};
