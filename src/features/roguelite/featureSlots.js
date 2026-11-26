export const resolveItemIdentityKeys = (item) => [
  item?.templateId, item?.catalogId, item?.id, item?.runItemId, item?.name, item?.nombre,
  item?.payload?.templateId, item?.payload?.catalogId, item?.payload?.id,
].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);

export const resolveFeatureSlots = ({ slots, ids, entries, count }) => {
  const sourceSlots = Array.isArray(slots) ? slots : [];
  const sourceIds = Array.isArray(ids) ? ids : [];
  const sourceEntries = Array.isArray(entries) ? entries : [];
  return Array.from({ length: count }, (_, index) => {
    if (sourceSlots[index] && typeof sourceSlots[index] === 'object') return sourceSlots[index];
    const wantedId = String(sourceIds[index] || '').trim().toLowerCase();
    if (!wantedId) return null;
    return sourceEntries.find(entry => resolveItemIdentityKeys(entry).includes(wantedId))
      || { id: sourceIds[index], name: sourceIds[index] };
  });
};

export const resolveFeatureUsage = ({ entries, slotIds, usedSlots }) => {
  const storedIds = Array.isArray(slotIds) ? slotIds : [];
  const storedUsage = Array.isArray(usedSlots) ? usedSlots : [];
  return entries.map((entry, index) => {
    if (!entry) return false;
    const entryId = resolveItemIdentityKeys(entry)[0] || '';
    const storedId = String(storedIds[index] || '').trim().toLowerCase();
    if (storedId && entryId && storedId !== entryId) return false;
    return storedUsage[index] !== undefined ? Boolean(storedUsage[index]) : Boolean(entry.used);
  });
};
