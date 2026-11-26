export const ARCANE_BARRIER_STATUS_ID = 'barrera';

const statusIds = token => Array.isArray(token?.status) ? token.status
  : String(token?.status || '').split(',').map(id => id.trim()).filter(Boolean);
const isBarrier = id => String(id || '').split('|')[0].trim().toLowerCase() === ARCANE_BARRIER_STATUS_ID;
const hasBarrierMetadata = token => token?.arcaneBarrier?.spellId === 'runic-barrier'
  && token.arcaneBarrier.expires === 'combat-end';

// Scene-local state: its bonus never changes base CD or the adventure sheet.
// Metadata-only barriers remain supported for scenes saved before the state existed.
export const hasArcaneBarrier = token => hasBarrierMetadata(token) || statusIds(token).some(isBarrier);
export const getArcaneBarrierBonus = token => hasArcaneBarrier(token) ? 1 : 0;
export const getArcaneBarrierProtections = token => hasArcaneBarrier(token)
  ? (token?.arcaneBarrier?.negatedTraits || []).filter(trait => ['critico', 'venenosa', 'conmocion'].includes(trait)) : [];
export const getArcaneBarrierStatusIds = token => [
  ...statusIds(token).filter(id => !isBarrier(id)),
  ...(hasArcaneBarrier(token) ? [ARCANE_BARRIER_STATUS_ID] : []),
];
export const withoutArcaneBarrierStatus = statuses => statusIds({ status: statuses }).filter(id => !isBarrier(id));

export const clearArcaneBarrier = token => {
  if (!hasArcaneBarrier(token)) return token;
  const { arcaneBarrier, ...rest } = token;
  return { ...rest, ...(token.status !== undefined ? { status: withoutArcaneBarrierStatus(token.status) } : {}) };
};
export const applyArcaneBarrier = (token, { castId, sourceTokenId, catalystId, protections = [], now }) => ({
  ...token,
  status: [...withoutArcaneBarrierStatus(token.status), ARCANE_BARRIER_STATUS_ID],
  arcaneBarrier: { id: castId, spellId: 'runic-barrier', sourceTokenId, catalystId,
    negatedTraits: [...new Set(protections)], createdAt: now, expires: 'combat-end' },
});

// All Canvas state editors use this patch, so a manual removal cannot leave
// an invisible protection behind. Unrelated updates keep the existing barrier.
export const reconcileArcaneBarrierUpdate = (token, updates, now = Date.now()) => {
  if (!token || !updates) return updates;
  const editsStatus = Object.prototype.hasOwnProperty.call(updates, 'status');
  const editsBarrier = Object.prototype.hasOwnProperty.call(updates, 'arcaneBarrier');
  if (!editsStatus && !editsBarrier) return updates;
  const next = { ...token, ...updates };
  if (!hasArcaneBarrier(token) && !hasArcaneBarrier(next) && !editsBarrier) return updates;
  // Old scenes have no status entry yet. Editing another condition must migrate
  // that protection, not revoke it; explicit metadata removal still revokes it.
  const removesStatus = editsStatus && !statusIds(next).some(isBarrier)
    && (statusIds(token).some(isBarrier) || !hasBarrierMetadata(token));
  if (removesStatus || (editsBarrier && !hasBarrierMetadata(next))) {
    return { ...updates, status: withoutArcaneBarrierStatus(next.status), arcaneBarrier: null };
  }
  if (!hasArcaneBarrier(next)) return updates;
  const arcaneBarrier = hasBarrierMetadata(next) ? next.arcaneBarrier : {
    id: `manual-barrier-${token.id}-${now}`, spellId: 'runic-barrier',
    negatedTraits: [], createdAt: now, expires: 'combat-end',
  };
  return { ...updates, status: getArcaneBarrierStatusIds(next), arcaneBarrier };
};

export const presentArcaneBarrierImpact = (token, attackId, now) => hasArcaneBarrier(token)
  ? { ...token, arcaneBarrier: {
    ...(token.arcaneBarrier || { id: `manual-barrier-${token.id}`, spellId: 'runic-barrier', expires: 'combat-end', negatedTraits: [] }),
    lastImpactId: attackId, lastImpactAt: now,
  } } : token;
export const ARCANE_BARRIER_PROTECTION_NAMES = { critico: 'Crítico', venenosa: 'Veneno', conmocion: 'Conmoción' };
