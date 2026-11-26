export const PARRY_ZONES = ['arriba', 'izquierda', 'centro', 'derecha', 'abajo'];

export const normalizeParryZones = value => {
  const zones = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(zones) || zones.length > PARRY_ZONES.length
    || zones.some(zone => !PARRY_ZONES.includes(zone)) || new Set(zones).size !== zones.length) return [];
  return PARRY_ZONES.filter(zone => zones.includes(zone));
};

export const compactParryChoice = zones => zones.length === 1 ? zones[0] : zones;

export function compareParryZones(attack, parry) {
  const attacking = normalizeParryZones(attack), defending = normalizeParryZones(parry);
  const coincident = attacking.filter(zone => defending.includes(zone));
  const uncovered = attacking.filter(zone => !defending.includes(zone));
  return { attack, parry, matched:coincident.length > 0,
    ...(attacking.length > 1 || defending.length > 1
      ? { coincident, uncovered, partial:coincident.length > 0 && uncovered.length > 0 } : {}) };
}

export const parryResultLabel = result => result.partial ? 'Coinciden algunas zonas'
  : result.matched ? 'Las zonas coinciden' : 'Las zonas no coinciden';
