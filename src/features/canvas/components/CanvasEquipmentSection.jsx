import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Gem, Package, Shield, Sword, Zap } from 'lucide-react';
import RogueliteInventoryCard from '../../../components/RogueliteInventoryCard';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { EquipmentSection as LegacyEquipmentSection } from '../../tactical-shared/components/EquipmentSection';
import { getObjectImage } from '../../tactical-shared/components/TacticalAssetImage';
import {
  CANVAS_INVENTORY_DRAG_END_EVENT,
  CANVAS_INVENTORY_DRAG_PREVIEW_EVENT,
  CANVAS_INVENTORY_DROP_EVENT,
  detachCanvasInventoryItem,
  reorderCanvasInventory,
  resolveCanvasInventoryItemIdentity,
} from '../canvasInventoryTransfer';

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
  if (type.includes('abil') || type.includes('habil') || type.includes('power')) return { label: 'Habilidad', Icon: Zap, hands: null };
  if (type.includes('access')) return { label: 'Accesorio', Icon: Gem, hands: null };
  return { label: 'Objeto', Icon: Package, hands: null };
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
  const [dragPreview, setDragPreview] = useState(null);
  const dragStateRef = useRef(null);
  const inventoryRef = useRef([]);

  useEffect(() => () => {
    dragStateRef.current = null;
    window.dispatchEvent(new CustomEvent(CANVAS_INVENTORY_DRAG_END_EVENT));
    document.body.classList.remove('noma-canvas-inventory-dragging');
    document.body.classList.remove('noma-canvas-inventory-dropping');
  }, []);

  if (token?.profileType !== 'rogueliteClass' && token?.profileType !== 'rogueliteEnemy') {
    return <LegacyEquipmentSection {...props} />;
  }

  const inventoryItems = Array.isArray(token.inventory) ? token.inventory : equippedItems;
  inventoryRef.current = inventoryItems;
  const equippedCount = inventoryItems.filter((item) => item.isEquipped || item.isPrepared).length;

  const removeInventoryItem = (item, index) => {
    if (!onUpdateToken) return;
    const detached = detachCanvasInventoryItem(token, index);
    if (detached) onUpdateToken(detached.updates);
  };

  const moveInventoryItem = (index, delta) => {
    if (!onUpdateToken) return;
    const targetIndex = Math.max(0, Math.min(inventoryItems.length - 1, index + delta));
    if (targetIndex === index) return;
    onUpdateToken({ inventory: reorderCanvasInventory(inventoryItems, index, targetIndex) });
  };

  const isPointOverCanvas = (clientX, clientY) => {
    const viewport = document.querySelector('[data-tactical-viewport="true"]');
    const rect = viewport?.getBoundingClientRect?.();
    const sidebarRect = document.querySelector('[data-tactical-sidebar="true"]')?.getBoundingClientRect?.();
    const sidebarIsTemporarilyHidden = document.body.classList.contains('noma-canvas-inventory-dropping')
      && window.matchMedia?.('(max-width: 639px)').matches;
    const insideSidebar = Boolean(
      sidebarRect
      && !sidebarIsTemporarilyHidden
      && clientX >= sidebarRect.left
      && clientX <= sidebarRect.right
      && clientY >= sidebarRect.top
      && clientY <= sidebarRect.bottom
    );
    return Boolean(
      rect
      && !insideSidebar
      && clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    );
  };

  const beginInventoryDrag = (event, item, index, image) => {
    if (!onUpdateToken || (typeof event.button === 'number' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pointerId = event.pointerId ?? 1;
    dragStateRef.current = {
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentIndex: index,
      targetIndex: index,
      item,
      image,
      dragging: false,
    };

    const handlePointerMove = (pointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      if (pointerEvent.pointerId !== undefined && drag.pointerId !== undefined && drag.pointerId !== pointerEvent.pointerId) return;
      const distance = Math.hypot(pointerEvent.clientX - drag.startX, pointerEvent.clientY - drag.startY);
      if (!drag.dragging && distance < 6) return;
      if (!drag.dragging) {
        drag.dragging = true;
        document.body.classList.add('noma-canvas-inventory-dragging');
      }
      if (Math.abs(pointerEvent.clientX - drag.startX) > 42) {
        document.body.classList.add('noma-canvas-inventory-dropping');
      }
      pointerEvent.preventDefault();

      const hoveredRaw = document.elementFromPoint?.(pointerEvent.clientX, pointerEvent.clientY);
      const hovered = hoveredRaw?.getAttribute?.('data-canvas-inventory-index')
        ? hoveredRaw
        : hoveredRaw?.closest?.('[data-canvas-inventory-index]');
      const rawIndex = hovered?.getAttribute?.('data-canvas-inventory-index') ?? hovered?.dataset?.canvasInventoryIndex;
      const hoveredIndex = rawIndex !== null && rawIndex !== undefined && rawIndex !== '' ? Number(rawIndex) : NaN;
      if (Number.isInteger(hoveredIndex)) drag.targetIndex = hoveredIndex;

      const overCanvas = isPointOverCanvas(pointerEvent.clientX, pointerEvent.clientY);
      window.dispatchEvent(new CustomEvent(CANVAS_INVENTORY_DRAG_PREVIEW_EVENT, {
        detail: overCanvas ? {
          sourceTokenId: token.id,
          clientX: pointerEvent.clientX,
          clientY: pointerEvent.clientY,
        } : null,
      }));
      setDragPreview({
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
        image: drag.image,
        name: drag.item.name || drag.item.nombre || 'Objeto',
        overCanvas,
        currentIndex: drag.currentIndex,
        targetIndex: drag.targetIndex,
      });
    };

    const finishDrag = (pointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      if (pointerEvent?.pointerId !== undefined && drag.pointerId !== undefined && drag.pointerId !== pointerEvent.pointerId) return;
      const dropTarget = isPointOverCanvas(pointerEvent.clientX, pointerEvent.clientY);

      if (drag.dragging && dropTarget) {
        window.dispatchEvent(new CustomEvent(CANVAS_INVENTORY_DROP_EVENT, {
          detail: {
            sourceTokenId: token.id,
            itemIndex: drag.currentIndex,
            itemIdentity: resolveCanvasInventoryItemIdentity(drag.item),
            clientX: pointerEvent.clientX,
            clientY: pointerEvent.clientY,
            image: drag.image,
          },
        }));
      } else if (
        drag.dragging
        && Number.isInteger(drag.targetIndex)
        && drag.targetIndex !== drag.currentIndex
      ) {
        const nextInventory = reorderCanvasInventory(inventoryRef.current, drag.currentIndex, drag.targetIndex);
        inventoryRef.current = nextInventory;
        onUpdateToken({ inventory: nextInventory });
      }

      dragStateRef.current = null;
      setDragPreview(null);
      window.dispatchEvent(new CustomEvent(CANVAS_INVENTORY_DRAG_END_EVENT));
      document.body.classList.remove('noma-canvas-inventory-dragging');
      document.body.classList.remove('noma-canvas-inventory-dropping');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  return (
    <section className="space-y-3 border-t border-slate-800/60 pt-4" data-testid="roguelite-token-equipment">
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">Inventario</h4>
        <span className="font-mono text-[9px] text-slate-600">{equippedCount} equipados · {inventoryItems.length} elementos</span>
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
            const itemImage = getObjectImage(item, customEquipmentImages);

            const isDraggingThis = Boolean(dragPreview && dragPreview.currentIndex === index);
            const isTargetSlot = Boolean(
              dragPreview
              && !dragPreview.overCanvas
              && dragPreview.targetIndex === index
              && dragPreview.currentIndex !== index,
            );

            return (
              <div
                key={`${item.canvasSlot || item.type || 'item'}-${item.runItemId || item.instanceId || item.templateId || item.id || item.name || 'item'}-${index}`}
                className="group/inventory-item relative"
                data-canvas-inventory-index={index}
              >
                <RogueliteInventoryCard
                  variant="inspector"
                  item={item}
                  image={itemImage}
                  fallbackIcon={<Icon />}
                  categoryLabel={token.profileType === 'rogueliteEnemy' && label === 'Habilidad'
                    ? 'Habilidad'
                    : (item.isPrepared ? `${label} · Preparada` : (item.isEquipped ? `${label} · Equipado` : label))}
                  rarityAccent={accent}
                  raritySoft={hexToRgba(accent, 0.34)}
                  rarityFaint={hexToRgba(accent, 0.12)}
                  actionCost={supportsCost ? resolveActionCost(item.actionCost ?? item.consumption ?? item.consumo) : null}
                  handsRequired={hands}
                  visibleTraits={resolveTraits(item, hands)}
                  glossary={glossary}
                  canDrag={Boolean(onUpdateToken)}
                  onDragPointerDown={(event) => beginInventoryDrag(event, item, index, itemImage)}
                  onDragKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    moveInventoryItem(index, event.key === 'ArrowUp' ? -1 : 1);
                  }}
                  dragTitle="Arrastra para ordenar o suelta en el mapa"
                  isDragging={isDraggingThis}
                  isDropTarget={isTargetSlot}
                  canRemove={Boolean(onUpdateToken)}
                  onRemove={() => removeInventoryItem(item, index)}
                />
              </div>
            );
          })}
        </div>
      )}

      {dragPreview && typeof document !== 'undefined' && createPortal(
        <div
          className={`pointer-events-none fixed z-[200] flex min-w-44 -translate-x-1/2 -translate-y-1/2 items-center gap-3 border px-3 py-2 shadow-2xl transition-colors ${dragPreview.overCanvas
            ? 'border-[#c8aa6e] bg-[#080d18]/95 text-[#f0e6d2]'
            : 'border-[#c8aa6e]/60 bg-[#080d18]/95 text-[#f0e6d2]'}`}
          style={{ left: dragPreview.x, top: dragPreview.y }}
          data-testid="canvas-inventory-drag-preview"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden border border-slate-700 bg-[#0b1120]">
            {dragPreview.image ? (
              <img src={dragPreview.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="m-3 h-5 w-5 text-slate-500" aria-hidden="true" />
            )}
          </div>
          <div>
            <strong className="block max-w-44 truncate font-fantasy text-xs uppercase tracking-[0.12em]">{dragPreview.name}</strong>
            <span className={`mt-1 block text-[8px] font-black uppercase tracking-[0.18em] ${dragPreview.overCanvas ? 'text-[#c8aa6e]' : 'text-slate-400'}`}>
              {dragPreview.overCanvas ? '✦ Soltar en el mapa' : '↕ Reordenar'}
            </span>
          </div>
        </div>,
        document.body,
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
