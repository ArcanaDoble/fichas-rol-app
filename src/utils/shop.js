const SHOP_ITEM_LIMIT = 4;
const SHOP_GOLD_MIN = 0;
const SHOP_GOLD_MAX = 9999;

const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed : '';
};

const sanitizeItemId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed : '';
};

const sanitizePlayerName = sanitizeText;

const normalizePurchaseEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const itemId = sanitizeItemId(entry.itemId);
  if (!itemId) return null;

  const itemName = sanitizeText(entry.itemName);
  const buyer = sanitizePlayerName(entry.buyer);
  if (!buyer) return null;

  const typeLabel = sanitizeText(entry.typeLabel);
  const rawTimestamp = entry.timestamp;
  let timestamp = null;
  if (typeof rawTimestamp === 'number' && Number.isFinite(rawTimestamp)) {
    timestamp = rawTimestamp;
  } else if (rawTimestamp && typeof rawTimestamp.toMillis === 'function') {
    timestamp = rawTimestamp.toMillis();
  } else if (rawTimestamp instanceof Date && !Number.isNaN(rawTimestamp.getTime())) {
    timestamp = rawTimestamp.getTime();
  }

  const numericCost = Number(entry.cost);
  const cost = Number.isFinite(numericCost) ? clampShopGold(numericCost) : null;

  const payload = {
    itemId,
    itemName,
    buyer,
    typeLabel,
    cost,
    timestamp,
  };

  return payload;
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
      playerWallets: {},
      lastPurchase: null,
    };
  }

  const gold = clampShopGold(config.gold);
  const suggestedItemIds = Array.isArray(config.suggestedItemIds)
    ? config.suggestedItemIds
        .map(sanitizeItemId)
        .filter((id, index, array) => id && array.indexOf(id) === index)
        .slice(0, SHOP_ITEM_LIMIT)
    : [];

  const playerWallets = {};
  if (config.playerWallets && typeof config.playerWallets === 'object') {
    Object.entries(config.playerWallets).forEach(([name, amount]) => {
      const sanitizedName = sanitizePlayerName(name);
      if (!sanitizedName) return;
      playerWallets[sanitizedName] = clampShopGold(amount);
    });
  }

  const lastPurchase = normalizePurchaseEntry(config.lastPurchase);

  return {
    gold,
    suggestedItemIds,
    playerWallets,
    lastPurchase,
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
