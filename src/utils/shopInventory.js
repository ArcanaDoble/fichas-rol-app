import { nanoid } from 'nanoid';
import { clampShopGold } from './shop';

const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed || '';
};

const sanitizeItemId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed || '';
};

export const sanitizeInventoryPlayerName = (value) => sanitizeText(value);

const normalizeInventoryEntry = (entry, index = 0) => {
  if (!entry || typeof entry !== 'object') return null;

  const itemId = sanitizeItemId(entry.itemId);
  const itemName = sanitizeText(entry.itemName);
  if (!itemName) return null;

  const typeLabel = sanitizeText(entry.typeLabel);
  const rarity = sanitizeText(entry.rarity);

  const rawCost = Number(entry.cost);
  const cost = Number.isFinite(rawCost) ? clampShopGold(rawCost) : null;

  const existingId = sanitizeText(entry.entryId);
  const fallbackIdComponents = [itemId, index]
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => String(part));
  const fallbackId = fallbackIdComponents.length > 0 ? fallbackIdComponents.join('_') : nanoid();

  return {
    entryId: existingId || fallbackId,
    itemId,
    itemName,
    typeLabel,
    rarity,
    cost,
  };
};

export const normalizeShopInventories = (inventories) => {
  if (!inventories || typeof inventories !== 'object') return {};

  const result = {};

  Object.entries(inventories).forEach(([player, entries = []]) => {
    const playerName = sanitizeInventoryPlayerName(player);
    if (!playerName) return;

    const list = Array.isArray(entries)
      ? entries
          .map((entry, index) => normalizeInventoryEntry(entry, index))
          .filter(Boolean)
      : [];

    result[playerName] = list;
  });

  return result;
};

export const buildInventoryEntry = (item, buyer) => {
  const playerName = sanitizeInventoryPlayerName(buyer);
  if (!playerName || !item) return null;

  const entry = normalizeInventoryEntry(
    {
      entryId: nanoid(),
      itemId: sanitizeItemId(item.id),
      itemName: sanitizeText(item.name) || 'Objeto sin nombre',
      typeLabel: sanitizeText(item.typeLabel || item.type || ''),
      rarity: sanitizeText(item.rarity || ''),
      cost: Number.isFinite(Number(item.cost)) ? clampShopGold(item.cost) : null,
    },
    0
  );

  return entry;
};

export const appendInventoryEntry = (inventories = {}, playerName, entry) => {
  const sanitizedName = sanitizeInventoryPlayerName(playerName);
  if (!sanitizedName || !entry) return inventories;

  const current = inventories[sanitizedName] || [];
  return {
    ...inventories,
    [sanitizedName]: [...current, entry],
  };
};

export const removeInventoryEntry = (inventories = {}, playerName, entryId) => {
  const sanitizedName = sanitizeInventoryPlayerName(playerName);
  const sanitizedId = sanitizeText(entryId);
  if (!sanitizedName || !sanitizedId) return inventories;

  const current = inventories[sanitizedName] || [];
  const filtered = current.filter((entry) => entry.entryId !== sanitizedId);

  return {
    ...inventories,
    [sanitizedName]: filtered,
  };
};

export default {
  normalizeShopInventories,
  buildInventoryEntry,
  appendInventoryEntry,
  removeInventoryEntry,
  sanitizeInventoryPlayerName,
};
