const HASH_PREFIX = '#';

const trimHash = value => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith(HASH_PREFIX) ? trimmed.slice(1) : trimmed;
};

export const normalizeHexColor = (value = '') => {
  const withoutHash = trimHash(value);
  if (!withoutHash) {
    return '';
  }
  return `${HASH_PREFIX}${withoutHash}`.toLowerCase();
};

export const isValidHexColor = (value = '') =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value.toLowerCase());

