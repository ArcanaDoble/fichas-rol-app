import { hasCanvasStatus } from '../combat/canvasAttackRules';
import { canvasInventoryItemsMatch, copyCanvasInventoryItem, detachCanvasInventoryItem, normalizeCanvasInventoryItem, removeCanvasItemFromLoadout } from '../canvasInventoryTransfer';
import { resolveRogueliteEquippedItems } from '../rogueliteTokenSheetSync';
import { getItemUseDefinition } from './itemUseDefinitions';

const statusList = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value ? [value] : [];

export const getHealingPotionBlockReason = token => {
  const statuses = [...statusList(token?.status), ...statusList(token?.statusEffects)];
  if (hasCanvasStatus({ status: statuses }, 'envenenado')) return 'Envenenado impide recibir curación.';
  const life = token?.stats?.vida;
  if (life?.current == null || life?.max == null || life.current === '' || life.max === ''
    || !Number.isFinite(Number(life.current)) || !Number.isFinite(Number(life.max)) || Number(life.max) <= 0) {
    return 'La ficha necesita Vida actual y máxima válidas.';
  }
  if (Number(life.current) <= 0 || statuses.some(status => hasCanvasStatus({ status: [status] }, 'muerto'))) {
    return 'La poción no puede usarse con 0 de Vida.';
  }
  return null;
};

const instanceId = item => item?.runItemId || item?.instanceId;
const matchesInstance = (candidate, requested) => {
  const left = normalizeCanvasInventoryItem(candidate), right = normalizeCanvasInventoryItem(requested);
  return instanceId(right) ? String(instanceId(left) || '') === String(instanceId(right)) : canvasInventoryItemsMatch(left, right);
};

const identifyLegacyPotionCopies = token => {
  const original = Array.isArray(token?.inventory) ? token.inventory : [];
  const isPotion = item => ['healing-potion', 'antidote', 'haste-potion', 'vitality-potion'].includes(getItemUseDefinition(item)?.id);
  const usedIds = new Set(original.map(item => instanceId(normalizeCanvasInventoryItem(item))).filter(Boolean));
  const withIdentity = (candidate, suffix, force = false) => {
    const item = normalizeCanvasInventoryItem(candidate);
    if (!isPotion(item) || (!force && instanceId(item))) return candidate;
    let id = `legacy-potion-${token.id}-${suffix}`;
    while (usedIds.has(id)) id += '-copy';
    usedIds.add(id);
    return copyCanvasInventoryItem(item, id);
  };
  const seenIds = new Set();
  const inventory = original.map((item, index) => {
    const id = instanceId(normalizeCanvasInventoryItem(item));
    const duplicate = id && seenIds.has(String(id));
    if (id) seenIds.add(String(id));
    return withIdentity(item, index, duplicate);
  });
  const remap = (candidate, used, slot) => {
    if (!candidate || !isPotion(candidate)) return candidate;
    const normalized = normalizeCanvasInventoryItem(candidate);
    const matches = original.map((item, index) => ({ item, index }))
      .filter(entry => !used.has(entry.index) && canvasInventoryItemsMatch(entry.item, candidate));
    const matchingSlot = matches.find(entry => entry.item.canvasSlot === slot || entry.item.equippedSlots?.includes(slot));
    const selected = matchingSlot || matches.find(entry => entry.item === candidate) || matches[0];
    if (selected) {
      used.add(selected.index);
      const assigned = normalizeCanvasInventoryItem(inventory[selected.index]);
      return instanceId(normalized) === instanceId(assigned) ? candidate : copyCanvasInventoryItem(candidate, instanceId(assigned));
    }
    return withIdentity(candidate, slot);
  };
  const loadoutUsed = new Set();
  const loadoutIds = new Set();
  const equipmentLoadout = { ...(token.equipmentLoadout || {}) };
  Object.keys(equipmentLoadout).filter(slot => slot.startsWith('belt_')).sort().forEach(slot => {
    const mapped = remap(equipmentLoadout[slot], loadoutUsed, slot);
    const id = instanceId(normalizeCanvasInventoryItem(mapped));
    equipmentLoadout[slot] = id && loadoutIds.has(String(id)) ? withIdentity(mapped, slot, true) : mapped;
    if (id) loadoutIds.add(String(id));
  });
  const equippedUsed = new Set();
  const equippedLoadoutUsed = new Set();
  const equippedItems = (Array.isArray(token.equippedItems) ? token.equippedItems : []).map((item, index) => {
    if (!isPotion(item)) return item;
    const loadoutEntry = Object.entries(token.equipmentLoadout || {}).find(([slot, candidate]) => slot.startsWith('belt_')
      && candidate && !equippedLoadoutUsed.has(slot) && (!item.canvasSlot || item.canvasSlot === slot)
      && canvasInventoryItemsMatch(candidate, item));
    if (loadoutEntry) {
      equippedLoadoutUsed.add(loadoutEntry[0]);
      const assigned = equipmentLoadout[loadoutEntry[0]];
      return { ...copyCanvasInventoryItem(item, instanceId(normalizeCanvasInventoryItem(assigned))), ...assigned };
    }
    return remap(item, equippedUsed, `equipped-${index}`);
  });
  return { ...token, inventory, equipmentLoadout, equippedItems };
};

// Prefer the real inventory copy. A belt-only legacy item is materialized just
// for the existing detach helper, which also clears its equipment references.
export const resolveHealingPotionItem = (token, requested) => {
  const requestedSlot = requested?.canvasSlot;
  const matchedSlot = requestedSlot?.startsWith('belt_')
    && canvasInventoryItemsMatch(token.equipmentLoadout?.[requestedSlot], requested);
  token = identifyLegacyPotionCopies(token);
  if (matchedSlot) requested = token.equipmentLoadout[requestedSlot];
  const inventory = Array.isArray(token?.inventory) ? token.inventory : [];
  const matches = inventory.map((item, index) => ({ item, index })).filter(entry => matchesInstance(entry.item, requested));
  if (matches.length) return { item: normalizeCanvasInventoryItem(matches[0].item), index: matches[0].index, token };
  const equipped = [
    ...(Array.isArray(token?.equippedItems) ? token.equippedItems : []),
    ...resolveRogueliteEquippedItems(token?.equipmentLoadout || {}).items,
  ].filter(item => matchesInstance(item, requested));
  if (!equipped.length) throw new Error('La poción ya no está disponible en el inventario.');
  return { item: normalizeCanvasInventoryItem(equipped[0]), index: inventory.length,
    token: { ...token, inventory: [...inventory, equipped[0]] } };
};

export const consumeHealingPotionItem = located => {
  const { token, item, index } = located;
  const quantity = Number(item.quantity ?? item.cantidad ?? 1);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('La poción ya no está disponible en el inventario.');
  if (quantity === 1) {
    const normalizedLoadout = Object.fromEntries(Object.entries(token.equipmentLoadout || {}).map(([slot, value]) => [slot,
      slot === 'weaponSets' && Array.isArray(value) ? value.map(set => ({ ...set,
        mainHand: set.mainHand ? normalizeCanvasInventoryItem(set.mainHand) : null,
        offHand: set.offHand ? normalizeCanvasInventoryItem(set.offHand) : null,
      })) : value && typeof value === 'object' ? normalizeCanvasInventoryItem(value) : value,
    ]));
    const normalizedToken = { ...token, inventory: token.inventory.map(candidate => normalizeCanvasInventoryItem(candidate)),
      equippedItems: (Array.isArray(token.equippedItems) ? token.equippedItems : []).map(candidate => normalizeCanvasInventoryItem(candidate)),
      enemyAbilities: (token.enemyAbilities || []).map(candidate => normalizeCanvasInventoryItem(candidate)), equipmentLoadout: normalizedLoadout };
    const detached = detachCanvasInventoryItem(normalizedToken, index);
    if (!detached) throw new Error('La poción ya no está disponible en el inventario.');
    return { ...token, ...detached.updates,
      equipmentLoadout: removeCanvasItemFromLoadout(detached.updates.equipmentLoadout || normalizedLoadout, item) };
  }
  const updateQuantity = candidate => !matchesInstance(candidate, item) ? candidate : {
    ...candidate, quantity: quantity - 1,
    ...(candidate.cantidad !== undefined ? { cantidad: quantity - 1 } : {}),
    ...(candidate.payload?.quantity !== undefined ? { payload: { ...candidate.payload, quantity: quantity - 1 } } : {}),
  };
  const loadout = { ...(token.equipmentLoadout || {}) };
  Object.keys(loadout).forEach(slot => {
    if (slot.startsWith('belt_') && loadout[slot]) loadout[slot] = updateQuantity(loadout[slot]);
  });
  return { ...token,
    inventory: token.inventory.map((candidate, i) => i === index ? updateQuantity(candidate) : candidate),
    equippedItems: (Array.isArray(token.equippedItems) ? token.equippedItems : []).map(updateQuantity),
    equipmentLoadout: loadout,
    runtimeDirty: token.profileType === 'rogueliteClass' || Boolean(token.runtimeDirty),
  };
};
