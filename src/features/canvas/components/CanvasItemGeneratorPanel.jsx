import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Gem, GripVertical, Package, Search, Shield, Sparkles, Sword, WandSparkles, X,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { CanvasAssetImage, getObjectImage } from '../../tactical-shared/components/TacticalAssetImage';
import {
    CANVAS_CATALOG_ITEM_ARM_EVENT,
    CANVAS_CATALOG_ITEM_DRAG_END_EVENT,
    CANVAS_CATALOG_ITEM_DRAG_PREVIEW_EVENT,
    CANVAS_CATALOG_ITEM_DROP_EVENT,
} from '../canvasInventoryTransfer';
import {
    CANVAS_CATALOG_CATEGORIES,
    filterCanvasCatalogItems,
    prepareCanvasCatalogItem,
} from '../canvasCatalogItems';

const CATEGORY_ICONS = {
    weapons: Sword,
    objects: Package,
    accessories: Gem,
    armor: Shield,
    abilities: WandSparkles,
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

const itemSummary = (item) => (
    item.dano
    || item.damage
    || item.poder
    || item.defenseClass
    || item.defensa
    || item.alcance
    || item.range
    || item.rareza
    || item.rarity
    || 'Objeto de la Forja'
);

const CanvasItemGeneratorPanel = ({ setShowSettings }) => {
    const [categoryId, setCategoryId] = useState('weapons');
    const [catalogs, setCatalogs] = useState({});
    const [loadedCollections, setLoadedCollections] = useState(new Set());
    const [search, setSearch] = useState('');
    const [loadError, setLoadError] = useState(false);
    const [dragPreview, setDragPreview] = useState(null);
    const customImages = useCustomEquipmentImages();
    const dragRef = useRef(null);
    const removeDragListenersRef = useRef(() => {});

    useEffect(() => {
        const unsubscribers = CANVAS_CATALOG_CATEGORIES.map((category) => onSnapshot(
            collection(db, category.collection),
            (snapshot) => {
                const entries = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
                setCatalogs((current) => ({ ...current, [category.id]: entries }));
                setLoadedCollections((current) => new Set(current).add(category.id));
            },
            (error) => {
                console.error(`No se pudo cargar ${category.collection} para el generador del Canvas:`, error);
                setLoadError(true);
                setLoadedCollections((current) => new Set(current).add(category.id));
            },
        ));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, []);

    useEffect(() => () => {
        removeDragListenersRef.current();
        window.dispatchEvent(new CustomEvent(CANVAS_CATALOG_ITEM_DRAG_END_EVENT));
        document.body.classList.remove('noma-canvas-inventory-dragging');
        document.body.classList.remove('noma-canvas-inventory-dropping');
    }, []);

    const activeCategory = CANVAS_CATALOG_CATEGORIES.find((category) => category.id === categoryId)
        || CANVAS_CATALOG_CATEGORIES[0];
    const activeItems = useMemo(
        () => filterCanvasCatalogItems(catalogs[categoryId] || [], search),
        [catalogs, categoryId, search],
    );
    const isLoading = !loadedCollections.has(categoryId);

    const armCatalogItem = (rawItem) => {
        const image = getObjectImage(rawItem, customImages);
        const item = prepareCanvasCatalogItem(rawItem, categoryId, image);
        window.dispatchEvent(new CustomEvent(CANVAS_CATALOG_ITEM_ARM_EVENT, {
            detail: { item, image },
        }));
        setShowSettings?.(false);
    };

    const beginCatalogDrag = (event, rawItem) => {
        if (typeof event.button === 'number' && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        removeDragListenersRef.current();
        const image = getObjectImage(rawItem, customImages);
        const item = prepareCanvasCatalogItem(rawItem, categoryId, image);
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            item,
            image,
            dragging: false,
        };

        const handlePointerMove = (pointerEvent) => {
            const drag = dragRef.current;
            if (!drag || (pointerEvent.pointerId !== undefined && drag.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId)) return;
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
            const overCanvas = isPointOverCanvas(pointerEvent.clientX, pointerEvent.clientY);
            window.dispatchEvent(new CustomEvent(CANVAS_CATALOG_ITEM_DRAG_PREVIEW_EVENT, {
                detail: overCanvas ? {
                    item: drag.item,
                    image: drag.image,
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
            });
        };

        const finishDrag = (pointerEvent) => {
            const drag = dragRef.current;
            if (!drag || (pointerEvent?.pointerId !== undefined && drag.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId)) return;
            if (drag.dragging && isPointOverCanvas(pointerEvent.clientX, pointerEvent.clientY)) {
                window.dispatchEvent(new CustomEvent(CANVAS_CATALOG_ITEM_DROP_EVENT, {
                    detail: {
                        item: drag.item,
                        image: drag.image,
                        clientX: pointerEvent.clientX,
                        clientY: pointerEvent.clientY,
                    },
                }));
                if (window.matchMedia?.('(max-width: 639px)').matches) setShowSettings?.(false);
            }
            dragRef.current = null;
            setDragPreview(null);
            window.dispatchEvent(new CustomEvent(CANVAS_CATALOG_ITEM_DRAG_END_EVENT));
            document.body.classList.remove('noma-canvas-inventory-dragging');
            document.body.classList.remove('noma-canvas-inventory-dropping');
            removeDragListenersRef.current();
        };

        const removeListeners = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
        };
        removeDragListenersRef.current = removeListeners;
        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('pointercancel', finishDrag);
    };

    return (
        <section className="border-t border-[#c8aa6e]/20 pt-5" data-testid="canvas-item-generator">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Generador de objetos
                    </h4>
                    <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                        Arrastra desde el asa o usa Colocar para elegir una casilla.
                    </p>
                </div>
                <span className="border border-[#c8aa6e]/25 bg-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#9f8a5c]">
                    Forja
                </span>
            </div>

            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none]" aria-label="Categorías de objetos">
                {CANVAS_CATALOG_CATEGORIES.map((category) => {
                    const Icon = CATEGORY_ICONS[category.id] || Package;
                    const selected = category.id === categoryId;
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => { setCategoryId(category.id); setSearch(''); }}
                            className={`flex min-h-11 min-w-[58px] shrink-0 flex-col items-center justify-center gap-1 border px-2 transition-colors ${selected
                                ? 'border-[#c8aa6e]/65 bg-[#c8aa6e]/10 text-[#e0c98e]'
                                : 'border-slate-800 bg-[#090e18] text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}
                            aria-pressed={selected}
                            aria-label={category.label}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-[7px] font-black uppercase tracking-[0.11em]">{category.label}</span>
                        </button>
                    );
                })}
            </div>

            <label className="mt-2 flex min-h-11 items-center gap-2 border border-slate-800 bg-[#080d16] px-3 focus-within:border-[#c8aa6e]/45">
                <Search className="h-4 w-4 shrink-0 text-slate-600" />
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Buscar ${activeCategory.label.toLowerCase()}…`}
                    className="min-w-0 flex-1 bg-transparent text-xs text-[#e8dfcf] outline-none placeholder:text-slate-600"
                    aria-label={`Buscar en ${activeCategory.label}`}
                />
                {search && (
                    <button type="button" onClick={() => setSearch('')} className="p-1 text-slate-500 hover:text-slate-200" aria-label="Borrar búsqueda">
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </label>

            <div className="mt-3 space-y-2" aria-live="polite">
                {isLoading && (
                    <div className="border border-dashed border-slate-800 px-3 py-6 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                        Consultando la Forja…
                    </div>
                )}
                {!isLoading && activeItems.map((rawItem) => {
                    const image = getObjectImage(rawItem, customImages);
                    const Icon = CATEGORY_ICONS[categoryId] || Package;
                    const name = rawItem.name || rawItem.nombre || activeCategory.singular;
                    return (
                        <article
                            key={`${categoryId}-${rawItem.id || name}`}
                            className="group grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 border border-slate-800 bg-[#090e18] p-2 transition-colors hover:border-[#c8aa6e]/40 hover:bg-[#0d1420]"
                        >
                            <div className="relative h-11 w-11 overflow-hidden border border-slate-700 bg-black/30">
                                <CanvasAssetImage
                                    src={image}
                                    label={name}
                                    imageClassName="h-full w-full object-cover"
                                    loadingClassName="absolute inset-0 flex items-center justify-center bg-[#090e18]"
                                    loadingRingClassName=""
                                    fallback={<div className="absolute inset-0 flex items-center justify-center"><Icon className="h-5 w-5 text-[#8e7b52]" /></div>}
                                />
                            </div>
                            <div className="min-w-0">
                                <strong className="block truncate font-['Cinzel'] text-[10px] uppercase tracking-[0.08em] text-[#eee3cc]">{name}</strong>
                                <span className="mt-1 block truncate text-[8px] uppercase tracking-[0.13em] text-slate-500">{itemSummary(rawItem)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => armCatalogItem(rawItem)}
                                    className="min-h-10 border border-[#785a28]/75 bg-[#c8aa6e]/[0.07] px-2 text-[8px] font-black uppercase tracking-[0.12em] text-[#c8aa6e] transition-colors hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/15"
                                    aria-label={`Colocar ${name} en el Canvas`}
                                >
                                    Colocar
                                </button>
                                <button
                                    type="button"
                                    onPointerDown={(event) => beginCatalogDrag(event, rawItem)}
                                    className="flex h-10 w-8 touch-none items-center justify-center border border-slate-700 text-slate-500 transition-colors hover:border-[#c8aa6e]/60 hover:text-[#c8aa6e] active:cursor-grabbing"
                                    title="Arrastrar al Canvas"
                                    aria-label={`Arrastrar ${name} al Canvas`}
                                >
                                    <GripVertical className="h-4 w-4" />
                                </button>
                            </div>
                        </article>
                    );
                })}
                {!isLoading && activeItems.length === 0 && (
                    <div className="border border-dashed border-slate-800 px-3 py-6 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                            {search ? 'Sin coincidencias' : `Sin ${activeCategory.label.toLowerCase()} en la Forja`}
                        </p>
                    </div>
                )}
                {loadError && (
                    <p className="text-[9px] leading-relaxed text-amber-300/70">Alguna categoría no pudo sincronizarse. Las demás siguen disponibles.</p>
                )}
            </div>

            {dragPreview && typeof document !== 'undefined' && createPortal(
                <div
                    className={`pointer-events-none fixed z-[220] flex min-w-44 -translate-x-1/2 -translate-y-1/2 items-center gap-3 border bg-[#080d18]/95 px-3 py-2 text-[#f0e6d2] shadow-2xl ${dragPreview.overCanvas ? 'border-[#c8aa6e]' : 'border-slate-700'}`}
                    style={{ left: dragPreview.x, top: dragPreview.y }}
                    data-testid="canvas-catalog-drag-preview"
                >
                    <div className="relative h-10 w-10 overflow-hidden border border-slate-700 bg-black/30">
                        {dragPreview.image ? <img src={dragPreview.image} alt="" className="h-full w-full object-cover" /> : <Package className="m-2.5 h-5 w-5 text-slate-500" />}
                    </div>
                    <div>
                        <strong className="block max-w-40 truncate font-['Cinzel'] text-[10px] uppercase tracking-[0.1em]">{dragPreview.name}</strong>
                        <span className={`mt-1 block text-[8px] font-black uppercase tracking-[0.16em] ${dragPreview.overCanvas ? 'text-[#c8aa6e]' : 'text-slate-500'}`}>
                            {dragPreview.overCanvas ? 'Soltar en la casilla' : 'Arrastra hacia el mapa'}
                        </span>
                    </div>
                </div>,
                document.body,
            )}
        </section>
    );
};

export default CanvasItemGeneratorPanel;
