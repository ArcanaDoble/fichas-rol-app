import { getWeaponForms, hasWeaponTrick, resolveWeaponForm } from '../../roguelite/weaponForms';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { ownedWeaponKey as copyKey, transformWeaponInGear } from '../../roguelite/ownedWeaponForms';
export { transformWeaponInGear } from '../../roguelite/ownedWeaponForms';
import { getCanvasCombatItems, getCanvasEquippedWeapons, getCanvasWeaponIdentity, isCanvasProne, isCanvasShield } from './canvasAttackRules';
import { assertCampaignAttackTurn, canControlCampaignToken, getCampaignResources, spendCampaignResources } from './campaignAttackRules';
import { needsBleedingChoice } from '../../tactical-shared/bleedingRules';

const assert = (test, message) => { if (!test) throw new Error(message); };
export const getCanvasTrickWeapons = token => getCanvasEquippedWeapons(token).filter(hasWeaponTrick);
export const weaponTrickSignature = item => JSON.stringify({ copy: copyKey(item), forms: getWeaponForms(item) });

export const assertCanvasWeaponTrick = (scene, token, viewer = {}) => {
  assert(canControlCampaignToken(token, viewer), 'No controlas esta ficha.');
  assert(Number(token.stats?.vida?.current) > 0, 'Una ficha sin Vida no puede transformar el arma.');
  assert(!scene.canvasCombat?.pendingAttack && !scene.canvasPracticeCombat?.pendingAttack && !scene.canvasCombat?.arcaneChain && !scene.canvasPracticeCombat?.arcaneChain,
    'Resuelve el intercambio pendiente antes de transformar.');
  const combat = scene.canvasCombat;
  if (combat?.status === 'active') {
    assertCampaignAttackTurn(token, scene, combat, false, false);
    const block = combat.blocks?.[combat.activeBlockIndex];
    assert((block?.memberIds || block?.tokenIds || []).includes(token.id)
      && !(block?.actedIds || block?.completedTokenIds || []).includes(token.id), 'No es el turno de esta ficha.');
    assert(!needsBleedingChoice(token, combat), 'Resuelve primero el Sangrado de esta ficha.');
    assert(!isCanvasProne(token), 'Levántate antes de transformar el arma.');
    assert(getCampaignResources(token, combat).some(resource => !resource.spent), 'No quedan dados de acción para transformar.');
  }
};

export const applyCanvasWeaponTrick = (scene, draft, resourceId, viewer = {}) => {
  const token = scene.items?.find(item => item.id === draft.tokenId);
  assertCanvasWeaponTrick(scene, token, viewer);
  const weapon = getCanvasTrickWeapons(token).find(item => getCanvasWeaponIdentity(item) === draft.weaponId);
  assert(weapon && weaponTrickSignature(weapon) === draft.signature, 'El arma ha cambiado; vuelve a preparar la transformación.');
  assert(resolveWeaponForm(weapon).activeFormId === draft.fromFormId, 'La forma del arma ya ha cambiado.');
  const destination = getWeaponForms(weapon).find(form => form.id === draft.toFormId);
  assert(destination && destination.id !== draft.fromFormId, 'Elige la otra forma del arma.');
  const handItems = [...getCanvasEquippedWeapons(token), ...getCanvasCombatItems(token).filter(isCanvasShield)]
    .filter((item, index, all) => copyKey(item) !== copyKey(weapon) && all.findIndex(other => copyKey(other) === copyKey(item)) === index);
  assert(destination.handsRequired + handItems.reduce((sum, item) => sum + resolveEquipmentHandsRequired(item), 0) <= 2,
    'No tienes manos libres para esta forma.');
  const inCombat = scene.canvasCombat?.status === 'active';
  assert(inCombat === draft.inCombat && (!inCombat || (scene.canvasCombat.startedAt === draft.startedAt && scene.canvasCombat.round === draft.round)),
    'El combate o la ronda han cambiado. Vuelve a preparar la transformación.');
  let combat = scene.canvasCombat, resource = null;
  if (inCombat) {
    resource = getCampaignResources(token, combat).find(candidate => candidate.id === resourceId && !candidate.spent);
    assert(resource && resource.value === draft.resources.find(candidate => candidate.id === resourceId)?.value,
      'El dado seleccionado ha cambiado o ya está gastado.');
    combat = spendCampaignResources(combat, token.id, [resource]);
  }
  const changed = { ...token };
  for (const field of ['inventory', 'equippedItems', 'equipmentLoadout']) {
    if (changed[field]) changed[field] = transformWeaponInGear(changed[field], weapon, destination.id);
  }
  changed.canvasRuntimeRevision = Number(token.canvasRuntimeRevision || 0) + 1;
  return { token: changed, weapon, destination, resource, patch: {
    items: scene.items.map(item => item.id === token.id ? changed : item),
    ...(inCombat ? { canvasCombat: combat } : {}),
    lastModifiedItemIds: [token.id],
  } };
};

export const createCanvasWeaponTrickDraft = (scene, tokenId, viewer = {}, requestedWeaponId) => {
  const token = scene.items?.find(item => item.id === tokenId);
  assertCanvasWeaponTrick(scene, token, viewer);
  const weapons = getCanvasTrickWeapons(token);
  const weapon = requestedWeaponId ? weapons.find(item => getCanvasWeaponIdentity(item) === requestedWeaponId) : weapons[0];
  assert(weapon, 'No tienes un arma con Truco equipada.');
  const active = resolveWeaponForm(weapon), forms = getWeaponForms(weapon);
  return { tokenId, weaponId: getCanvasWeaponIdentity(weapon), fromFormId: active.activeFormId,
    toFormId: forms.find(form => form.id !== active.activeFormId).id, signature: weaponTrickSignature(weapon),
    inCombat: scene.canvasCombat?.status === 'active', startedAt: scene.canvasCombat?.startedAt || null,
    round: scene.canvasCombat?.round || null, resources: getCampaignResources(token, scene.canvasCombat).filter(resource => !resource.spent) };
};
