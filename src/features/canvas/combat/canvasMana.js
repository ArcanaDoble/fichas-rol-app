import { getCanvasWeaponTraits, parseWeaponDiceProfile } from './canvasAttackRules';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Only the level-one Arcane Discharge enhancement. Prepared spells have
// individual enhancements and must not inherit this cost/effect implicitly.
export const getCanvasManaOption = (token, weapons = []) => {
  const resource = token?.stats?.recurso;
  const visible = token?.profileType === 'rogueliteClass'
    && (normalize(token.classIdentity) === 'mago' || normalize(resource?.label) === 'mana');
  const available = Math.max(0, Math.floor(Number(resource?.current) || 0));
  const weapon = weapons[0];
  const profile = weapon ? parseWeaponDiceProfile(weapon) : [];
  const catalyst = weapon && (getCanvasWeaponTraits(weapon).includes('catalizador')
    || /arcan/.test(normalize(weapon.competence || weapon.competencia)));
  let reason = '';
  if (weapons.length !== 1 || !catalyst || ['ability', 'abilities'].includes(weapon?.type || weapon?._category)) {
    reason = 'Potencia una Descarga arcana con un único Catalizador equipado.';
  } else if (!profile.length) reason = 'El Catalizador necesita un perfil de dados.';
  else if (new Set(profile.map(die => die.sides)).size !== 1) reason = 'El Catalizador tiene dados distintos: falta definir su dado base.';
  return { visible, available, sides: profile[0]?.sides || 0, reason, eligible: visible && !reason };
};

export const validateCanvasManaSpend = (token, weapons, amount = 0) => {
  const option = getCanvasManaOption(token, weapons);
  if (amount !== 0 && amount !== 1) return { ...option, legal: false, reason: 'Cada Descarga puede potenciarse una vez por 1 de Maná.' };
  if (!amount) return { ...option, legal: true };
  if (!option.eligible) return { ...option, legal: false, reason: option.reason || 'Esta ficha no dispone de Maná.' };
  if (!option.available) return { ...option, legal: false, reason: 'No queda Maná para potenciar la Descarga.' };
  return { ...option, legal: true };
};
