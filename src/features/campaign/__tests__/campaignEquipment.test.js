import {
  applyCampaignProtectionRdChange, equipCampaignProtection, getCampaignEquipmentState,
  isCampaignArmorReinforcement, removeCampaignEquipment, resolveCampaignArmorRd, resolveCampaignProtection,
} from '../campaignEquipment';
import { activateWeaponSet, equipItemInWeaponSet, reconcileEquippedItemsWithInventory } from '../../roguelite/equipmentPool';

const sword = { name: 'Espada', itemType: 'weapon', handsRequired: 1 };
const axe = { name: 'Hacha', itemType: 'weapon', handsRequired: 2 };
const character = {
  equipment: { weapons: [sword, sword, axe] },
  equippedItems: { mainHand: sword, body: { name: 'Gabardina antigua' } },
};

test('legacy equipment is bound to unique copies and set changes preserve armor and both hands', () => {
  const state = getCampaignEquipmentState(character);
  const [first, second, greatAxe] = state.equipment.weapons;
  expect(state.equippedItems.mainHand.instanceId).toBe(first.instanceId);
  expect(first.instanceId).not.toBe(second.instanceId);
  const duplicate = equipItemInWeaponSet(state.equippedItems, 1, 'mainHand', first);
  expect(duplicate.weaponSets[1].mainHand).toBeNull();
  const secondSet = equipItemInWeaponSet(state.equippedItems, 1, 'offHand', second);
  const twoHands = equipItemInWeaponSet(secondSet, 1, 'mainHand', greatAxe);
  const active = activateWeaponSet(twoHands, 1);
  expect(active.mainHand.name).toBe('Hacha');
  expect(active.offHand).toBeNull();
  expect(active.weaponSets[0].mainHand.instanceId).toBe(first.instanceId);
  expect(active.body.name).toBe('Gabardina antigua');
  expect(character.equippedItems.mainHand.instanceId).toBeUndefined();
});

test('removing a copy clears its slot and preserves other copies and legacy armor', () => {
  const state = getCampaignEquipmentState(character);
  const next = removeCampaignEquipment({ ...character, ...state }, 'weapons', 0);
  expect(next.equippedItems.mainHand).toBeNull();
  expect(next.equippedItems.body.name).toBe('Gabardina antigua');
  expect(next.equipment.weapons.map((item) => item.instanceId)).toEqual(state.equipment.weapons.slice(1).map((item) => item.instanceId));
});

test('only removing the last ability copy clears its prepared slots', () => {
  const ability = { id: 'spell', name: 'Habilidad' };
  const source = { equipment: { abilities: [ability, ability] }, equippedSkillIds: ['spell', null, 'spell'] };
  const first = removeCampaignEquipment(source, 'abilities', 0);
  expect(first.equippedSkillIds).toEqual(source.equippedSkillIds);
  const last = removeCampaignEquipment(first, 'abilities', 0);
  expect(last.equippedSkillIds).toEqual([null, null, null]);
});

const guards = { id: 'guards', name: 'Guardabrazos', itemType: 'armor', traits: 'Armadura, Brazos, Refuerzo', rd: 1 };
const outfit = { name: 'Atuendo', itemType: 'armor', traits: 'Ropa, Torso', rd: 0 };

test('armor requires the explicit Refuerzo trait regardless of its name or protected zones', () => {
  expect(isCampaignArmorReinforcement(guards)).toBe(true);
  expect(isCampaignArmorReinforcement({ name: 'Protecciones', itemType: 'armor', traits: ['Piernas', 'REFUERZO'] })).toBe(true);
  expect(isCampaignArmorReinforcement({ name: 'Guardabrazos', itemType: 'accessory', traits: 'Armadura, Refuerzo' })).toBe(true);
  expect(isCampaignArmorReinforcement({ payload: { itemType: 'armor', rasgos: 'Refuerzo' } })).toBe(true);
  expect(isCampaignArmorReinforcement({ name: 'Guardabrazos', itemType: 'armor', traits: 'Brazos' })).toBe(false);
  expect(isCampaignArmorReinforcement({ name: 'Armadura completa', itemType: 'armor', tags: ['Torso', 'Brazos', 'Piernas'] })).toBe(false);
  expect(isCampaignArmorReinforcement({ name: 'Refuerzo', itemType: 'armor' })).toBe(false);
  expect(isCampaignArmorReinforcement({ itemType: 'armor', traits: 'Sinrefuerzo' })).toBe(false);
  expect(isCampaignArmorReinforcement({ itemType: 'accessory', traits: 'Refuerzo' })).toBe(false);
  expect(isCampaignArmorReinforcement({ name: 'Brazalete negro', itemType: 'accessory', traits: 'Quilate, Fuerza' })).toBe(false);
  expect(isCampaignArmorReinforcement(outfit)).toBe(false);
});

test('reinforcement keeps its exact owned copy across saves and weapon set changes', () => {
  const state = getCampaignEquipmentState({ equipment: { armor: [outfit, guards, guards] } });
  const equippedItems = equipCampaignProtection(
    { ...state.equippedItems, body: state.equipment.armor[0] }, 'reinforcement', state.equipment.armor[2],
  );
  const saved = JSON.parse(JSON.stringify({ ...state, equippedItems }));
  const restored = getCampaignEquipmentState(saved);
  expect(restored.equippedItems.reinforcement.instanceId).toBe(state.equipment.armor[2].instanceId);
  expect(activateWeaponSet(restored.equippedItems, 1).reinforcement.instanceId).toBe(state.equipment.armor[2].instanceId);
  expect(reconcileEquippedItemsWithInventory(restored.equippedItems, restored.equipment).reinforcement.instanceId).toBe(state.equipment.armor[2].instanceId);
  expect(resolveCampaignProtection(restored.equippedItems).total).toBe(1);
  expect(restored.equipment.reinforcement).toBeUndefined();
});

test('moving a legacy guard copy to reinforcement frees the old accessory slot', () => {
  const legacy = { ...guards, itemType: 'accessory', rd: undefined, description: 'Al equiparse, otorga RD 1.' };
  const state = getCampaignEquipmentState({ equipment: { armor: [outfit], accessories: [legacy] }, equippedItems: { accessory_1: legacy } });
  const next = equipCampaignProtection(state.equippedItems, 'reinforcement', state.equipment.accessories[0]);
  expect(next.accessory_1).toBeNull();
  expect(next.reinforcement.instanceId).toBe(state.equipment.accessories[0].instanceId);
  expect(resolveCampaignProtection(next).total).toBe(1);
  const rebound = getCampaignEquipmentState({ ...state, equippedItems: next });
  expect(rebound.equippedItems.reinforcement.instanceId).toBe(state.equipment.accessories[0].instanceId);
  expect(applyCampaignProtectionRdChange({ armaduraRd: 1 }, state.equippedItems, next).armaduraRd).toBe(1);
});

test('removing the other copy preserves reinforcement; removing the equipped copy clears it', () => {
  const state = getCampaignEquipmentState({ equipment: { armor: [guards, guards] } });
  state.equippedItems = equipCampaignProtection(state.equippedItems, 'reinforcement', state.equipment.armor[1]);
  const firstRemoved = removeCampaignEquipment(state, 'armor', 0);
  expect(firstRemoved.equippedItems.reinforcement.instanceId).toBe(state.equipment.armor[1].instanceId);
  expect(removeCampaignEquipment(firstRemoved, 'armor', 0).equippedItems.reinforcement).toBeNull();
});

test('reinforcement cannot hold a full suit, and partial armor cannot use the main protection slot', () => {
  const source = { body: outfit };
  expect(equipCampaignProtection(source, 'reinforcement', outfit)).toBe(source);
  expect(equipCampaignProtection(source, 'body', guards)).toBe(source);
});

test('RD preserves zero, does not import roguelite CD, and caps physical reinforcement at one', () => {
  expect(resolveCampaignArmorRd(outfit)).toBe(0);
  expect(resolveCampaignArmorRd({ name: 'Armadura antigua', defenseClass: 6 })).toBeNull();
  expect(resolveCampaignArmorRd({ ...guards, rd: undefined, description: 'Otorga +1 de RD como refuerzo físico.' })).toBe(1);
  expect(resolveCampaignProtection({ body: outfit, reinforcement: { ...guards, rd: 2 } })).toEqual({ body: 0, reinforcement: 1, total: 1 });
});

test('equipping and removing protection adjusts RD without losing existing manual bonuses', () => {
  const previous = { body: { ...outfit, rd: 2 } };
  const next = { ...previous, reinforcement: guards };
  const sheet = { armaduraRd: 3, vida: { current: 12, max: 28 } };
  const equipped = applyCampaignProtectionRdChange(sheet, previous, next);
  expect(equipped.armaduraRd).toBe(4);
  expect(equipped.vida).toBe(sheet.vida);
  expect(applyCampaignProtectionRdChange(equipped, next, previous).armaduraRd).toBe(3);
  expect(applyCampaignProtectionRdChange({ armaduraRd: null }, previous, next).armaduraRd).toBe(3);
  expect(applyCampaignProtectionRdChange({ armaduraRd: 0 }, { body: outfit }, { body: outfit, reinforcement: guards }).armaduraRd).toBe(1);
});
