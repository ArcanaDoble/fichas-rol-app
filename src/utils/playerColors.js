const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const MASTER_COLOR = '#FFD700';

export const getPlayerColor = (name, fallback = '#6B7280') => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return fallback;
  }

  const normalized = stripDiacritics(trimmed).toLowerCase();
  if (normalized === 'master') {
    return MASTER_COLOR;
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const safeHash = Math.abs(hash);
  const hue = safeHash % 360;
  const saturation = 65 + (safeHash % 20);
  const lightness = 55 + (safeHash % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
