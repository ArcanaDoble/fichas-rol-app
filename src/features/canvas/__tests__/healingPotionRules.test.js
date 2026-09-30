import {
  consumeHealingPotionItem,
  getHealingPotionBlockReason,
  resolveHealingPotionItem,
} from '../item-use/healingPotionRules';
import { normalizeCanvasInventoryItem } from '../canvasInventoryTransfer';
import { addCanvasLootToInventory, createCanvasLootSceneItem } from '../canvasInventoryTransfer';
import { prepareCanvasCatalogItem } from '../canvasCatalogItems';
import { createRogueliteActiveRunFromToken } from '../../roguelite/activeRun';
import { syncCanvasTokenWithSheet } from '../rogueliteTokenSheetSync';

const potion = { id: 'catalog-healing', runItemId: 'potion-one', name: 'Poción de curación', type: 'object' };
const secondPotion = { ...potion, runItemId: 'potion-two' };
const tokenWithItems = (items = [potion], profileType = 'rogueliteClass') => ({
  id: 'hero', profileType, stats: { vida: { current: 3, max: 8 } },
  inventory: items,
  equippedItems: items,
  equipmentLoadout: Object.fromEntries(items.map((item, index) => [`belt_${index}`, item])),
});

test.each([
  { status: ['envenenado'] },
  { status: 'Derribado, Envenenado' },
  { status: [{ id: 'envenenado' }] },
  { status: [{ name: 'Envenenado' }] },
  { status: { label: 'ENVENENADO' } },
  { statusEffects: ['Envenenado'] },
  { statusEffects: 'envenenado' },
  { statusEffects: { id: 'envenenado' } },
])('poison blocks healing for supported status representation %j', status => {
  expect(getHealingPotionBlockReason({ ...tokenWithItems(), ...status })).toBe('Envenenado impide recibir curación.');
});

test.each([0, '0', -1])('zero or negative Life cannot be revived by drinking a potion: %s', current => {
  expect(getHealingPotionBlockReason({ ...tokenWithItems(), stats: { vida: { current, max: 8 } } }))
    .toMatch(/0 de Vida/);
});

test('dead status blocks use even if the token has a positive Life value', () => {
  expect(getHealingPotionBlockReason({ ...tokenWithItems(), status: [{ id: 'muerto' }] })).toMatch(/0 de Vida/);
});

test('full Life is permitted, and unrelated statuses do not prevent drinking', () => {
  expect(getHealingPotionBlockReason({ ...tokenWithItems(), stats: { vida: { current: 8, max: 8 } }, status: ['derribado', 'sangrado'] }))
    .toBeNull();
});

test.each([
  { current: null, max: 8 }, { current: '', max: 8 }, { current: 3, max: 0 },
  { current: 3, max: '' }, { current: 'invalid', max: 8 }, { current: 3, max: Number.POSITIVE_INFINITY },
])('malformed Life cannot enter healing arithmetic: %j', vida => {
  expect(getHealingPotionBlockReason({ ...tokenWithItems(), stats: { vida } })).toMatch(/Vida actual y máxima válidas/);
});

test('a stack of two consumes one unit, keeps its belt slot, then removes only the final unit', () => {
  const stack = { ...potion, quantity: 2, cantidad: 2 };
  const token = tokenWithItems([stack, secondPotion]);
  const before = JSON.stringify(token);
  const once = consumeHealingPotionItem(resolveHealingPotionItem(token, stack));
  expect(once.inventory).toHaveLength(2);
  expect(once.inventory[0]).toMatchObject({ runItemId: potion.runItemId, quantity: 1, cantidad: 1 });
  expect(once.equippedItems[0]).toMatchObject({ runItemId: potion.runItemId, quantity: 1, cantidad: 1 });
  expect(once.equipmentLoadout.belt_0).toMatchObject({ quantity: 1, cantidad: 1 });
  expect(once.equipmentLoadout.belt_1).toEqual(secondPotion);
  expect(JSON.stringify(token)).toBe(before);
  const twice = consumeHealingPotionItem(resolveHealingPotionItem(once, stack));
  expect(twice.inventory.map(item => item.runItemId)).toEqual([secondPotion.runItemId]);
  expect(twice.equipmentLoadout.belt_0).toBeNull();
  expect(twice.equipmentLoadout.belt_1).toMatchObject({ runItemId: secondPotion.runItemId });
});

test.each(['rogueliteClass', 'rogueliteEnemy'])('only the chosen physical copy is consumed for %s', profileType => {
  const token = tokenWithItems([potion, secondPotion], profileType);
  const located = resolveHealingPotionItem(token, secondPotion);
  expect(located.index).toBe(1);
  const next = consumeHealingPotionItem(located);
  expect(next.inventory.map(item => item.runItemId)).toEqual([potion.runItemId]);
  expect(next.equippedItems.map(item => item.runItemId)).toEqual([potion.runItemId]);
  expect(next.equipmentLoadout.belt_0).toMatchObject({ runItemId: potion.runItemId });
  expect(next.equipmentLoadout.belt_1).toBeNull();
});

test('wrapped instance identities preserve the other same-catalog belt copy', () => {
  const first = { payload: potion }, second = { payload: secondPotion };
  const token = tokenWithItems([first, second]);
  const located = resolveHealingPotionItem(token, { payload: secondPotion });
  expect(located.index).toBe(1);
  const next = consumeHealingPotionItem(located);
  expect(next.inventory).toHaveLength(1);
  expect(normalizeCanvasInventoryItem(next.inventory[0])).toMatchObject({ runItemId: potion.runItemId });
  expect(normalizeCanvasInventoryItem(next.equipmentLoadout.belt_0)).toMatchObject({ runItemId: potion.runItemId });
  expect(next.equipmentLoadout.belt_1).toBeNull();
});

test('an enemy legacy belt-only copy is removed from every reference and cannot be materialized again', () => {
  const token = { ...tokenWithItems([potion], 'rogueliteEnemy'), inventory: [], equippedItems: [] };
  const next = consumeHealingPotionItem(resolveHealingPotionItem(token, potion));
  expect(next.inventory).toEqual([]);
  expect(next.equippedItems).toEqual([]);
  expect(next.equipmentLoadout.belt_0).toBeNull();
  expect(() => resolveHealingPotionItem(next, potion)).toThrow(/ya no está disponible/);
  expect(token.equipmentLoadout.belt_0).toEqual(potion);
});

test('missing requested instance cannot silently fall back to another copy with the same catalog id', () => {
  const token = tokenWithItems([secondPotion]);
  expect(() => resolveHealingPotionItem(token, potion)).toThrow(/ya no está disponible/);
});

test('a catalog-only request consumes one copy automatically and preserves the other', () => {
  const token = tokenWithItems([potion, secondPotion]);
  const next = consumeHealingPotionItem(resolveHealingPotionItem(token, { id: potion.id, name: potion.name }));
  expect(next.inventory.map(item => item.runItemId)).toEqual([secondPotion.runItemId]);
  expect(next.equipmentLoadout.belt_1).toMatchObject({ runItemId: secondPotion.runItemId });
  expect(token.inventory).toHaveLength(2);
});

test.each(['rogueliteClass', 'rogueliteEnemy'])('legacy identical catalog copies retain their other slot for %s', profileType => {
  const legacy = { id: 'healing', name: potion.name, type: 'object' };
  const token = tokenWithItems([{ ...legacy }, { ...legacy }], profileType);
  const next = consumeHealingPotionItem(resolveHealingPotionItem(token, { ...legacy, canvasSlot: 'belt_1' }));
  expect(next.inventory).toHaveLength(1);
  expect(next.inventory[0].instanceId).toBeTruthy();
  expect(next.equipmentLoadout.belt_0.instanceId).toBe(next.inventory[0].instanceId);
  expect(next.equipmentLoadout.belt_1).toBeNull();
  expect(next.equippedItems).toHaveLength(1);
  const emptied = consumeHealingPotionItem(resolveHealingPotionItem(next, next.inventory[0]));
  expect(emptied.inventory).toEqual([]);
  expect(emptied.equipmentLoadout.belt_0).toBeNull();
});

test('generator copies keep distinct identity through ground transfer, belt equip and exact consumption', () => {
  const catalog = { id: 'healing', payload: { ...potion, runItemId: 'old-template-instance' } };
  const first = prepareCanvasCatalogItem(catalog), second = prepareCanvasCatalogItem(catalog);
  expect(first.instanceId).not.toBe(second.instanceId);
  expect(normalizeCanvasInventoryItem(first).runItemId).toBeUndefined();
  const base = { ...tokenWithItems([]), equipmentLoadout: { beltSlots: 2, belt_0: null, belt_1: null } };
  const position = { x: 0, y: 0, width: 1, height: 1 };
  const loot = createCanvasLootSceneItem({ item: second, position });
  expect(loot.lootItem.instanceId).toBe(second.instanceId);
  const received = addCanvasLootToInventory(addCanvasLootToInventory(base, first), loot.lootItem);
  const next = consumeHealingPotionItem(resolveHealingPotionItem(received, second));
  expect(next.inventory.map(item => item.instanceId)).toEqual([first.instanceId]);
  expect(next.equipmentLoadout.belt_0.instanceId).toBe(first.instanceId);
  expect(next.equipmentLoadout.belt_1).toBeNull();
});

test('legacy belt-only copies reuse the same identities in the flat equipment list', () => {
  const legacy = { id: 'healing', name: potion.name, type: 'object' };
  const token = { ...tokenWithItems([{ ...legacy }, { ...legacy }], 'rogueliteEnemy'), inventory: [] };
  const once = consumeHealingPotionItem(resolveHealingPotionItem(token, legacy));
  expect(once.equippedItems).toHaveLength(1);
  expect(once.equipmentLoadout.belt_0).toBeNull();
  expect(once.equipmentLoadout.belt_1.instanceId).toBe(once.equippedItems[0].instanceId);
  const twice = consumeHealingPotionItem(resolveHealingPotionItem(once, legacy));
  expect(twice.equippedItems).toEqual([]);
  expect(twice.equipmentLoadout.belt_1).toBeNull();
  expect(() => resolveHealingPotionItem(twice, legacy)).toThrow(/ya no está disponible/);
});

test.each(['instanceId', 'runItemId'])('pasted copies sharing %s refill the lowest freed belt slot after consumption', identityKey => {
  const bomb = { instanceId: 'bomb', name: 'Bomba de humo', type: 'object' };
  const copied = { id: 'healing', [identityKey]: 'pasted-identity', name: potion.name, type: 'object' };
  const token = { ...tokenWithItems([bomb, { ...copied }, { ...copied }]), equipmentLoadout: {
    beltSlotCount: 3, belt_0: bomb, belt_1: { ...copied }, belt_2: { ...copied },
  } };
  const once = consumeHealingPotionItem(resolveHealingPotionItem(token, { ...copied, canvasSlot: 'belt_1' }));
  expect(once.inventory).toHaveLength(2);
  expect(once.equipmentLoadout.belt_0.instanceId).toBe('bomb');
  expect(once.equipmentLoadout.belt_1).toBeNull();
  const remaining = normalizeCanvasInventoryItem(once.equipmentLoadout.belt_2);
  expect(remaining).toBeTruthy();
  expect(remaining.runItemId || remaining.instanceId).not.toBe('pasted-identity');
  expect(once.equippedItems).toHaveLength(2);
  const refilled = addCanvasLootToInventory(once, { ...copied });
  expect(refilled.equipmentLoadout.belt_0.instanceId).toBe('bomb');
  expect(refilled.equipmentLoadout.belt_1.name).toBe(potion.name);
  expect(refilled.equipmentLoadout.belt_2).toEqual(once.equipmentLoadout.belt_2);
  expect(refilled.equippedItems.map(item => item.canvasSlot)).toEqual(['belt_0', 'belt_1', 'belt_2']);
});

test('newly picked pasted units receive distinct identities before being equipped', () => {
  const pasted = { payload: { ...potion, runItemId: 'pasted' } };
  const token = addCanvasLootToInventory(addCanvasLootToInventory(tokenWithItems([]), pasted), pasted);
  const ids = token.inventory.map(item => item.runItemId || item.instanceId);
  expect(new Set(ids).size).toBe(2);
  const after = consumeHealingPotionItem(resolveHealingPotionItem(token, token.equippedItems[1]));
  expect(after.inventory).toHaveLength(1);
  expect(after.equipmentLoadout.belt_0).toBeTruthy();
  expect(after.equipmentLoadout.belt_1).toBeNull();
});

test('profile round-trip keeps inventory and belt identities equal instead of adding catalog-index aliases', () => {
  const first = { id: 'healing', instanceId: 'physical-a', name: potion.name, type: 'object', runItemId: 'healing:0' };
  const second = { ...first, instanceId: 'physical-b', runItemId: 'healing:1' };
  const token = { ...tokenWithItems([first, second]), linkedClassId: 'class', linkedClassOwner: 'Ada', runId: 'run', runRevision: 1 };
  const activeRun = createRogueliteActiveRunFromToken(token, null, { scenarioId: 'scene', revision: 2 });
  const hydrated = syncCanvasTokenWithSheet(token, { id: 'class', owner: 'Ada', profileType: 'rogueliteClass', activeRun }, {}, { preserveTokenState: false });
  expect(hydrated.inventory.map(item => item.runItemId)).toEqual(['physical-a', 'physical-b']);
  expect(hydrated.inventory.map(item => item.equippedSlots)).toEqual([['belt_0'], ['belt_1']]);
  const consumed = consumeHealingPotionItem(resolveHealingPotionItem(hydrated, hydrated.equippedItems[0]));
  expect(consumed.inventory.map(item => item.instanceId)).toEqual(['physical-b']);
  expect(consumed.equipmentLoadout.belt_0).toBeNull();
  expect(consumed.equipmentLoadout.belt_1.instanceId).toBe('physical-b');
});

test.each([0, -1, 1.5, 'invalid'])('invalid or empty quantities cannot be consumed: %s', quantity => {
  const stack = { ...potion, quantity };
  const token = tokenWithItems([stack]);
  expect(() => consumeHealingPotionItem(resolveHealingPotionItem(token, stack))).toThrow(/ya no está disponible/);
  expect(token.inventory[0].quantity).toBe(quantity);
});
