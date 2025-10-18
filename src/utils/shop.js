const SHOP_ITEM_LIMIT = 4;
const SHOP_GOLD_MIN = 0;
const SHOP_GOLD_MAX = 9999;

const sanitizeItemId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed : '';
};

export const clampShopGold = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return SHOP_GOLD_MIN;
  }
  const rounded = Math.round(numeric);
  if (rounded < SHOP_GOLD_MIN) return SHOP_GOLD_MIN;
  if (rounded > SHOP_GOLD_MAX) return SHOP_GOLD_MAX;
  return rounded;
};

export const normalizeShopConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return {
      gold: SHOP_GOLD_MIN,
      suggestedItemIds: [],
    };
  }

  const gold = clampShopGold(config.gold);
  const suggestedItemIds = Array.isArray(config.suggestedItemIds)
    ? config.suggestedItemIds
        .map(sanitizeItemId)
        .filter((id, index, array) => id && array.indexOf(id) === index)
        .slice(0, SHOP_ITEM_LIMIT)
    : [];

  return {
    gold,
    suggestedItemIds,
  };
};

export const DEFAULT_SHOP_CONFIG = normalizeShopConfig({});
export const SHOP_GOLD_BOUNDS = { min: SHOP_GOLD_MIN, max: SHOP_GOLD_MAX };
export const SHOP_CONFIG_LIMITS = { suggestedItems: SHOP_ITEM_LIMIT };

export default {
  clampShopGold,
  normalizeShopConfig,
  DEFAULT_SHOP_CONFIG,
  SHOP_GOLD_BOUNDS,
  SHOP_CONFIG_LIMITS,
};
