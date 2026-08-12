import React from 'react';
import PropTypes from 'prop-types';
import { Gem, Package, Shield, Sword } from 'lucide-react';
import RogueliteInventoryCard from '../../../components/RogueliteInventoryCard';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { resolveRogueliteEquippedItems } from '../rogueliteTokenSheetSync';
import { EquipmentSection as LegacyEquipmentSection } from '../../tactical-shared/components/EquipmentSection';
import { getObjectImage } from '../../tactical-shared/components/TacticalAssetImage';

const FALLBACK_RARITY_COLORS = {
  común: '#8d9aab',
  comun: '#8d9aab',
  'poco común': '#75a986',
  rara: '#6f9fc7',
  épica: '#b47bd0',
  epica: '#b47bd0',
  legendaria: '#c89f62',
};

const hexToRgba = (hex, alpha) => {
  const cleaned = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(cleaned)) return `rgba(141, 154, 171, ${alpha})`;
  const value = Number.parseInt(cleaned, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

const resolveActionCost = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const marks = raw.match(/🟡/g);
  if (marks?.length) return Math.min(3, marks.length);
  const numeric = raw.match(/\d+/);
  return numeric ? Math.min(3, Math.max(0, Number(numeric[0]))) : raw;
};

const resolveTraits = (item, handsRequired) => {
  const raw = item.traits || item.rasgos || item.trait || '';
  const traits = (Array.isArray(raw) ? raw : String(raw).split(','))
    .map((trait) => String(trait).trim())
    .filter(Boolean);
  return handsRequired === 2
    ? traits.filter((trait) => !/(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/i.test(trait))
    : traits;
};

const resolvePresentation = (item) => {
  const type = String(item.type || item.itemType || item._category || '').toLowerCase();
  if (type.includes('weapon') || type.includes('arma')) return { label: 'Arma', Icon: Sword, hands: resolveEquipmentHandsRequired(item) };
  if (type.includes('armor') || type.includes('armadura')) return { label: 'Armadura', Icon: Shield, hands: null };
  if (type.includes('access')) return { label: 'Accesorio', Icon: Gem, hands: null };
  return { label: 'Objeto', Icon: Package, hands: null };
};

const resolveItemIdentity = (item) => (
  item?.templateId || item?.id || item?.runItemId || item?.name || item?.nombre || null
);

const itemsMatch = (left, right) => {
  const leftIdentity = resolveItemIdentity(left);
  const rightIdentity = resolveItemIdentity(right);
  return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
};

const removeItemFromLoadout = (loadout = {}, removedItem) => {
  const clearIfMatch = (item) => (itemsMatch(item, removedItem) ? null : item);
  const weaponSets = Array.isArray(loadout.weaponSets)
    ? loadout.weaponSets.map((weaponSet) => ({
      ...weaponSet,
      mainHand: clearIfMatch(weaponSet?.mainHand),
      offHand: clearIfMatch(weaponSet?.offHand),
    }))
    : loadout.weaponSets;
  const nextLoadout = {
    ...loadout,
    ...(weaponSets ? { weaponSets } : {}),
  };

  Object.keys(nextLoadout).forEach((slot) => {
    if (slot === 'weaponSets') return;
    if (nextLoadout[slot] && typeof nextLoadout[slot] === 'object') {
      nextLoadout[slot] = clearIfMatch(nextLoadout[slot]);
    }
  });

  return nextLoadout;
};

const CanvasEquipmentSection = (props) => {
  const {
    token,
    equippedItems = [],
    rarityColorMap = {},
    glossary = [],
    onUpdateToken,
  } = props;
  const customEquipmentImages = useCustomEquipmentImages();

  if (token?.profileType !== 'rogueliteClass') {
    return <LegacyEquipmentSection {...props} />;
  }

  const inventoryItems = Array.isArray(token.inventory) ? token.inventory : equippedItems;
  const equippedCount = inventoryItems.filter((item) => item.isEquipped).length;

  const removeInventoryItem = (item, index) => {
    if (!onUpdateToken) return;
    const nextInventory = inventoryItems.filter((_, itemIndex) => itemIndex !== index);
    const nextLoadout = removeItemFromLoadout(token.equipmentLoadout || {}, item);
    const nextEquipped = resolveRogueliteEquippedItems(nextLoadout);
    const equippedIdentities = new Set(nextEquipped.items.map(resolveItemIdentity).filter(Boolean));

    onUpdateToken({
      inventory: nextInventory.map((inventoryItem) => ({
        ...inventoryItem,
        isEquipped: equippedIdentities.has(resolveItemIdentity(inventoryItem)),
      })),
      equipmentLoadout: nextEquipped.loadout,
      equippedItems: nextEquipped.items,
      activeWeaponSet: nextEquipped.activeWeaponSet,
    });
  };

  return (
    <section className="space-y-3 border-t border-slate-800/60 pt-4" data-testid="roguelite-token-equipment">
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">Inventario de aventura</h4>
        <span className="font-mono text-[9px] text-slate-600">{equippedCount} equipados · {inventoryItems.length} objetos</span>
      </div>

      {inventoryItems.length === 0 ? (
        <p className="border-y border-slate-800/55 py-5 text-center font-serif text-xs italic text-slate-600">
          Esta clase no ha preparado equipamiento.
        </p>
      ) : (
        <div className="space-y-3">
          {inventoryItems.map((rawItem, index) => {
            const item = { ...rawItem, name: rawItem.name || rawItem.nombre };
            const { label, Icon, hands } = resolvePresentation(item);
            const rarityKey = String(item.rareza || item.rarity || 'común').toLowerCase();
            const accent = rarityColorMap[item.rareza] || FALLBACK_RARITY_COLORS[rarityKey] || '#8d9aab';
            const supportsCost = item.type === 'weapon' || item.type === 'ability';

            return (
              <RogueliteInventoryCard
                key={`${item.canvasSlot || item.type || 'item'}-${item.templateId || item.id || item.name || index}`}
                variant="inspector"
                item={item}
                image={getObjectImage(item, customEquipmentImages)}
                fallbackIcon={<Icon />}
                categoryLabel={item.isEquipped ? `${label} · Equipado` : label}
                rarityAccent={accent}
                raritySoft={hexToRgba(accent, 0.34)}
                rarityFaint={hexToRgba(accent, 0.12)}
                actionCost={supportsCost ? resolveActionCost(item.actionCost ?? item.consumption ?? item.consumo) : null}
                handsRequired={hands}
                visibleTraits={resolveTraits(item, hands)}
                glossary={glossary}
                canRemove={Boolean(onUpdateToken)}
                onRemove={() => removeInventoryItem(item, index)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

CanvasEquipmentSection.propTypes = {
  token: PropTypes.object,
  equippedItems: PropTypes.array,
  rarityColorMap: PropTypes.object,
  glossary: PropTypes.array,
  onUpdateToken: PropTypes.func,
};

CanvasEquipmentSection.defaultProps = {
  token: null,
  equippedItems: [],
  rarityColorMap: {},
  glossary: [],
  onUpdateToken: null,
};

export default CanvasEquipmentSection;
