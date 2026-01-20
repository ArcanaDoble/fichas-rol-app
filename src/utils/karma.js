export const KARMA_KEY = 'karma';
export const KARMA_MIN = -10;
export const KARMA_MAX = 10;

const normalize = (value) =>
  value
    ? value
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, '')
    : '';

export const isYuuzuName = (name) => {
  const n = normalize(name);
  return n === 'yuuzu' || n === 'yuzuu';
};

export const clampKarma = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const rounded = Math.round(numeric);
  return Math.max(KARMA_MIN, Math.min(KARMA_MAX, rounded));
};

export const getKarmaColor = (value) => {
  if (value > 0) return '#ffffff';
  if (value < 0) return '#000000';
  return 'transparent';
};

export const formatKarmaValue = (value) => {
  const clamped = clampKarma(value);
  return clamped > 0 ? `+${clamped}` : `${clamped}`;
};

export const getKarmaStatus = (value) => {
  const clamped = clampKarma(value);
  if (clamped > 0) return 'Karma positivo';
  if (clamped < 0) return 'Karma negativo';
  return 'Karma neutro';
};

export const ensureKarmaStat = (stats = {}, name) => {
  const normalizedStats = { ...stats };
  if (!isYuuzuName(name)) {
    delete normalizedStats[KARMA_KEY];
    return normalizedStats;
  }

  const current = normalizedStats[KARMA_KEY] || {};
  const actual = clampKarma(current.actual ?? 0);

  normalizedStats[KARMA_KEY] = {
    label: 'Karma',
    type: 'karma',
    actual,
    base: 0,
    total: 0,
    buff: 0,
    min: KARMA_MIN,
    max: KARMA_MAX,
    color: getKarmaColor(actual),
    showOnToken: current.showOnToken ?? false,
    tokenRow: current.tokenRow ?? 0,
    tokenAnchor: current.tokenAnchor ?? 'top',
  };

  return normalizedStats;
};
