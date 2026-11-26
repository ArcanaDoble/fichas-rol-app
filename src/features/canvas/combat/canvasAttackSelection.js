import { getCanvasArmorProtection, hasCanvasMutableArmor } from './canvasArmorRules';
import { validateCanvasFurySpend } from './canvasFury';
import { validateCanvasManaSpend } from './canvasMana';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { evaluateCanvasAttackRange, getCanvasCombatItems, getCanvasEquippedWeapons, getCanvasWeaponIdentity, getCanvasWeaponTraits, getCanvasWeaponActionCost, isCanvasShield, parseWeaponDiceProfile } from './canvasAttackRules';

const structural = new Set(['duelista', 'dos manos', 'pesada', 'catalizador', 'alcance', 'guardia', 'sin guardia']);
const manualTraits = new Set(['critico', 'perforante', 'venenosa', 'sangrado']);
const normalized = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const weaponCompetence = value => {
  const category = normalized(value).trim();
  if (['simple', 'simples'].includes(category)) return 'simple';
  if (['marcial', 'marciales', 'martial'].includes(category)) return 'martial';
  if (['arcana', 'arcano', 'arcanas', 'arcanos', 'arcane', 'especial', 'special'].includes(category)) return 'special';
  // Inventory categories (weapon/weapons) are not weapon competencies.
  return null;
};
const getSingleAttackItems = token => [...getCanvasEquippedWeapons(token), ...getCanvasCombatItems(token).filter(item => ['ability', 'abilities'].includes(item.type || item._category) && parseWeaponDiceProfile(item).length)]
  .filter(item => token.profileType !== 'rogueliteEnemy' || !isCanvasShield(item));
const isShield = item => normalized([item.type, item.category, item.name, item.nombre].join(' ')).includes('escudo');
export const isCanvasCatalyst = item => getCanvasWeaponTraits(item).some(trait => trait.includes('catalizador'))
  || normalized(item.competence || item.competencia).includes('arcan');

export const getCanvasDualWeapons = token => {
  if (token?.profileType === 'rogueliteEnemy') return [];
  const weapons = getCanvasEquippedWeapons(token).filter(item => !isShield(item) && !isCanvasCatalyst(item)
    && resolveEquipmentHandsRequired(item) === 1
    && ['mainHand', 'offHand'].includes(item.canvasSlot));
  const main = weapons.find(item => item.canvasSlot === 'mainHand');
  const off = weapons.find(item => item.canvasSlot === 'offHand');
  return main && off && getCanvasWeaponIdentity(main) !== getCanvasWeaponIdentity(off) ? [main, off] : [];
};

export const combineCanvasWeapons = (weapons, mode, traits = []) => ({
  id: `${mode}:${weapons.map(getCanvasWeaponIdentity).join('+')}`,
  attackMode: mode, attackWeapons: weapons,
  name: `${mode === 'dual' ? 'Ataque dual' : 'Ataque combinado'} — ${weapons.map(item => item.name || item.nombre).join(' + ')}`,
  type: 'weapon', actionCost: mode === 'dual' ? 2 : 0,
  dano: weapons.flatMap(parseWeaponDiceProfile).map(die => die.die).join(' + '),
  rasgos: [...new Set(traits.filter(trait => !structural.has(trait)))],
});

export const resolveCanvasAttackSelection = ({ attacker, target, selection, items = [], gridConfig = {}, rulesSystem = 'roguelite' }) => {
  if (!attacker || !target || !selection) return { legal: false, reason: 'Falta el atacante, el objetivo o su arma.' };
  const pendingArmor = [attacker, target].find(token => hasCanvasMutableArmor(token) && !token.armorProtectionChoice);
  if (pendingArmor && rulesSystem !== 'campaign') return { legal: false, reason: `${pendingArmor.name || 'La ficha'} debe elegir la protección de su Túnica en Ronda antes de atacar o recibir ataques.` };
  const available = getSingleAttackItems(attacker);
  const requests = selection?.attackWeapons || [selection];
  const identities = requests.map(getCanvasWeaponIdentity);
  if (!requests.length || new Set(identities).size !== requests.length) return { legal: false, reason: 'Selecciona copias de armas distintas.' };
  const weapons = requests.map(request => available.find(item => getCanvasWeaponIdentity(item) === getCanvasWeaponIdentity(request)));
  if (weapons.some(item => !item)) return { legal: false, reason: 'El arma ya no está disponible en el inventario o conjunto activo.' };
  const weaponIds = new Set(getCanvasEquippedWeapons(attacker).map(getCanvasWeaponIdentity));
  if (weapons.length > 1 && weapons.some(item => !weaponIds.has(getCanvasWeaponIdentity(item)))) {
    return { legal: false, reason: 'Solo puedes combinar armas; los conjuros y habilidades se resuelven por separado.' };
  }
  const dual = attacker.profileType !== 'rogueliteEnemy' && weapons.length > 1;
  if (weapons.length > 1 && weapons.some(isCanvasCatalyst)) {
    return { legal: false, reason: 'Cada descarga utiliza un único Catalizador. Elige con cuál canalizar.' };
  }
  if (dual) {
    const pair = getCanvasDualWeapons(attacker);
    if (weapons.length !== 2 || pair.length !== 2 || !weapons.every(item => pair.some(hand => getCanvasWeaponIdentity(hand) === getCanvasWeaponIdentity(item)))) {
      return { legal: false, reason: 'Ataque dual requiere dos armas de una mano distintas en las manos del conjunto activo.' };
    }
  }
  const manualCombatTraits = [...new Set(getCanvasWeaponTraits({ rasgos: selection.manualCombatTraits || [] }))]
    .filter(trait => manualTraits.has(trait));
  const furySpend = selection.furySpend ?? 0;
  const fury = validateCanvasFurySpend(attacker, weapons, furySpend);
  if (!fury.legal) return { legal: false, reason: fury.reason };
  const manaSpend = selection.manaSpend ?? 0;
  const mana = validateCanvasManaSpend(attacker, weapons, manaSpend);
  if (!mana.legal) return { legal: false, reason: mana.reason };
  if (furySpend && manaSpend) return { legal: false, reason: 'Elige una única capacidad de recurso para este ataque.' };
  const parts = weapons.map(item => {
    const range = evaluateCanvasAttackRange({ attacker, target, weapon: item, items, gridConfig, allowAlliedTargets: rulesSystem === 'campaign' });
    const competence = [item.competence, item.competencia, item.weaponCompetence, item.category].map(weaponCompetence).find(Boolean);
    const proficiencies = attacker.proficiencies?.weapons;
    const proficiency = !proficiencies || !competence || Object.entries(proficiencies).some(([key, enabled]) => weaponCompetence(key) === competence && enabled);
    const neutralized = getCanvasWeaponTraits({ rasgos: [...(target.negatedTraits || target.neutralizedTraits || []), ...getCanvasArmorProtection(target, item).negatedTraits] });
    const traits = range.suppressTraits || !proficiency ? []
      : [...new Set([...getCanvasWeaponTraits(item), ...manualCombatTraits, ...(furySpend ? ['critico'] : [])])].filter(trait => !neutralized.includes(trait));
    return { weapon: item, negatedTraits: neutralized, weaponId: getCanvasWeaponIdentity(item), range, traits, profile: parseWeaponDiceProfile(item) };
  });
  const invalid = parts.find(part => !part.range.legal || !part.profile.length);
  if (invalid) return { legal: false, reason: `${invalid.weapon.name || invalid.weapon.nombre}: ${invalid.range.reason || 'sin perfil de daño'}` };
  const inactiveThrow = parts.find(part => getCanvasWeaponTraits(part.weapon).includes('arrojadiza')
    && !part.traits.includes('arrojadiza')
    && !evaluateCanvasAttackRange({ attacker, target, weapon: { ...part.weapon, rasgos: [] }, items, gridConfig, allowAlliedTargets: rulesSystem === 'campaign' }).legal);
  if (inactiveThrow) return { legal: false, reason: `${inactiveThrow.weapon.name || inactiveThrow.weapon.nombre}: Arrojadiza no está disponible para este ataque.` };
  const activeTraits = [...new Set(parts.flatMap(part => part.traits).filter(trait => !structural.has(trait)))];
  const mode = dual ? 'dual' : weapons.length > 1 ? 'multiweapon' : 'single';
  // Cost is structural: losing offensive traits never makes Pesada cheaper.
  const weapon = mode === 'single' ? { ...weapons[0], actionCost: getCanvasWeaponActionCost(weapons[0], attacker), rasgos: activeTraits } : combineCanvasWeapons(weapons, mode, activeTraits);
  // Manually added modifiers apply once to the combined attack, never to each hand.
  weapon.manualCombatTraits = manualCombatTraits;
  weapon.extraDamageString = selection?.extraDamageString || '';
  weapon.furySpend = furySpend;
  weapon.manaSpend = manaSpend;
  const profile = parts.flatMap(part => part.profile.map(die => ({
    ...die, id: `${part.weaponId}:${die.id}`, weaponId: part.weaponId, noCritical: !part.traits.includes('critico'),
  })));
  const extraProfile = parseWeaponDiceProfile({ dano: weapon.extraDamageString }).map((die, index) => ({ ...die, id: `modifier-${index}`, source: 'Modificador', noCritical: true }));
  const furyProfile = Array.from({ length: furySpend }, (_, index) => ({
    id: `fury-${index}`, die: `d${fury.sides}`, sides: fury.sides, source: 'Furia',
    noCritical: !parts.some(part => part.traits.includes('critico')),
  }));
  const manaProfile = manaSpend ? [{ id: 'mana-0', die: `d${mana.sides}`, sides: mana.sides, source: 'Maná', noCritical: !parts[0].traits.includes('critico') }] : [];
  return { legal: true, mode, weapon, parts, profile: [...profile, ...extraProfile, ...furyProfile, ...manaProfile], range: { ...parts[0].range, suppressTraits: false }, actionCost: dual ? 2 : undefined };
};

export const getCanvasAttackOptions = ({ attacker, target, items, gridConfig, rulesSystem }) => {
  if (!attacker || !target) return [];
  const weapons = getSingleAttackItems(attacker);
  const pair = getCanvasDualWeapons(attacker);
  return [...weapons, ...(pair.length === 2 ? [combineCanvasWeapons(pair, 'dual')] : [])]
    .map(selection => resolveCanvasAttackSelection({ attacker, target, selection, items, gridConfig, rulesSystem }))
    .filter(result => result.legal).map(result => ({
      ...result.weapon,
      // Show the individual weapon's structural traits without transferring
      // them to the offensive resolution or to the other hand of a dual attack.
      displayTraits: result.parts.length === 1 ? result.parts[0].traits : result.weapon.rasgos,
    }));
};
