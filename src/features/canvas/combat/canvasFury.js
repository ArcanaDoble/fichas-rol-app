import { getCanvasWeaponTraits, parseWeaponDiceProfile } from './canvasAttackRules';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Level-one offensive spending only. Resource generation remains manual.
export const getCanvasFuryOption = (token, weapons = []) => {
  const resource = token?.stats?.recurso;
  const visible = token?.profileType === 'rogueliteClass'
    && (normalize(token.classIdentity).includes('barbaro') || normalize(resource?.label) === 'furia');
  const available = Math.max(0, Math.floor(Number(resource?.current) || 0));
  const profiles = weapons.flatMap(parseWeaponDiceProfile);
  const types = new Set(profiles.map(die => die.sides));
  let reason = '';
  if (!weapons.length || !profiles.length) reason = 'Elige un arma con dados de daño.';
  else if (weapons.some(weapon => {
    const traits = getCanvasWeaponTraits(weapon);
    return traits.includes('catalizador') || /arcan/.test(normalize(weapon.competence || weapon.competencia))
      || ['ability', 'abilities'].includes(weapon.type || weapon._category)
      || (!traits.includes('arrojadiza') && (traits.includes('a distancia') || /intermedio|lejano|distancia/.test(normalize(weapon.alcance || weapon.range))));
  })) reason = 'Furia requiere un ataque cuerpo a cuerpo o Arrojadiza.';
  else if (types.size !== 1) reason = 'Furia con dados de arma distintos: pendiente de definir qué dado añadir.';
  return { visible, available, sides: profiles[0]?.sides || 0, reason, eligible: visible && !reason };
};

export const validateCanvasFurySpend = (token, weapons, amount = 0) => {
  const option = getCanvasFuryOption(token, weapons);
  if (!Number.isInteger(amount) || amount < 0) return { ...option, legal: false, reason: 'El gasto de Furia debe ser un número entero positivo o cero.' };
  if (!amount) return { ...option, legal: true };
  if (!option.eligible) return { ...option, legal: false, reason: option.reason || 'Esta ficha no dispone de Furia.' };
  if (amount > option.available) return { ...option, legal: false, reason: 'No queda suficiente Furia. Revisa la reserva.' };
  return { ...option, legal: true };
};
