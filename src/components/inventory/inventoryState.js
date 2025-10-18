import { nanoid } from 'nanoid';

const DEFAULT_SLOT_COUNT = 4;

const createSlotId = (index) => index;

const createTokenId = () => nanoid();

const sanitizeSlotItem = (item) => {
  if (!item) return null;

  const count = Number.isFinite(item.count) ? item.count : 1;

  return {
    type: typeof item.type === 'string' ? item.type : 'unknown',
    count,
    name: typeof item.name === 'string' ? item.name : '',
    itemId: typeof item.itemId === 'string' ? item.itemId : '',
    rarity: typeof item.rarity === 'string' ? item.rarity : '',
    description: typeof item.description === 'string' ? item.description : '',
    typeLabel: typeof item.typeLabel === 'string' ? item.typeLabel : '',
    cost: Number.isFinite(item.cost) ? item.cost : null,
    costLabel: typeof item.costLabel === 'string' ? item.costLabel : '',
  };
};

const sanitizeSlot = (slot, index) => ({
  id:
    typeof slot?.id === 'number' || typeof slot?.id === 'string'
      ? slot.id
      : createSlotId(index),
  item: sanitizeSlotItem(slot?.item),
});

const sanitizeToken = (token = {}) => ({
  id:
    typeof token.id === 'string' || typeof token.id === 'number'
      ? token.id
      : createTokenId(),
  type: typeof token.type === 'string' ? token.type : 'unknown',
  count: Number.isFinite(token.count) ? token.count : 1,
  name: typeof token.name === 'string' ? token.name : '',
  itemId: typeof token.itemId === 'string' ? token.itemId : '',
  rarity: typeof token.rarity === 'string' ? token.rarity : '',
  description: typeof token.description === 'string' ? token.description : '',
  typeLabel: typeof token.typeLabel === 'string' ? token.typeLabel : '',
  cost: Number.isFinite(token.cost) ? token.cost : null,
  costLabel: typeof token.costLabel === 'string' ? token.costLabel : '',
  fromSlot: token.fromSlot ?? null,
});

export const createDefaultSlots = () =>
  Array.from({ length: DEFAULT_SLOT_COUNT }, (_, index) => ({
    id: createSlotId(index),
    item: null,
  }));

export const createDefaultInventoryState = () => ({
  slots: createDefaultSlots(),
  tokens: [],
  nextId: DEFAULT_SLOT_COUNT,
});

export const ensureInventoryState = (data = {}) => {
  const slotsSource = Array.isArray(data.slots) ? data.slots : createDefaultSlots();
  const tokensSource = Array.isArray(data.tokens) ? data.tokens : [];

  const slots =
    slotsSource.length > 0
      ? slotsSource.map((slot, index) => sanitizeSlot(slot, index))
      : createDefaultSlots();

  const tokens = tokensSource.map((token) => sanitizeToken(token));

  const nextId = Number.isInteger(data.nextId)
    ? data.nextId
    : Math.max(slots.length, DEFAULT_SLOT_COUNT);

  return {
    slots,
    tokens,
    nextId,
  };
};

export const createInventoryTokenFromShopItem = (item = {}) =>
  sanitizeToken({
    id: createTokenId(),
    type: typeof item.type === 'string' ? item.type : 'unknown',
    name: typeof item.name === 'string' ? item.name : '',
    itemId: typeof item.id === 'string' ? item.id : '',
    rarity: typeof item.rarity === 'string' ? item.rarity : '',
    description: typeof item.description === 'string' ? item.description : '',
    typeLabel: typeof item.typeLabel === 'string' ? item.typeLabel : '',
    cost: Number.isFinite(item.cost) ? item.cost : null,
    costLabel: typeof item.costLabel === 'string' ? item.costLabel : '',
    count: 1,
  });

export const appendInventoryToken = (state, token) => {
  const base = ensureInventoryState(state);
  return {
    ...base,
    tokens: [...base.tokens, sanitizeToken(token)],
  };
};

export const DEFAULT_SLOT_TOTAL = DEFAULT_SLOT_COUNT;
