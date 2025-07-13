export function ensureZ(tokens = []) {
  return tokens.map((t, i) => ({ ...t, z: typeof t.z === 'number' ? t.z : i }));
}

export function normalizeZ(tokens = []) {
  return tokens
    .slice()
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((t, i) => ({ ...t, z: i }));
}

export function shiftZ(tokens = [], id, delta) {
  const ordered = normalizeZ(tokens);
  const index = ordered.findIndex((t) => t.id === id);
  if (index === -1) return ordered;
  let newIndex = index + delta;
  newIndex = Math.max(0, Math.min(ordered.length - 1, newIndex));
  if (newIndex === index) return ordered;
  const [token] = ordered.splice(index, 1);
  ordered.splice(newIndex, 0, token);
  return ordered.map((t, i) => ({ ...t, z: i }));
}
