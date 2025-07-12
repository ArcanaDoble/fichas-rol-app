export function ensureZ(tokens = []) {
  return tokens.map((t, i) => ({ ...t, z: typeof t.z === 'number' ? t.z : i }));
}

export function normalizeZ(tokens = []) {
  return tokens
    .slice()
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((t, i) => ({ ...t, z: i }));
}
