import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, GripVertical, Layers, MoveUpRight } from 'lucide-react';
import { getCardStackIds } from '../../../utils/cardBoard';
import { getCardDisplayImage } from '../../../utils/cardImages';
import { CardImageWithLoader } from '../../tactical-shared/components/TacticalAssetImage';
import './BoardStackInspector.css';

export const BoardStackInspector = ({ parent, items, canReorder, busy, onReorder, onExtract, onOpenMenu }) => {
    const byId = new Map(items.map(item => [item.id, item]));
    const cards = [parent, ...getCardStackIds(parent).slice().reverse().map(id => byId.get(id)).filter(Boolean)];
    const [selectedId, setSelectedId] = useState(parent.id);
    const [drag, setDrag] = useState(null);
    const [announcement, setAnnouncement] = useState('');
    const gridRef = useRef(null);
    const gestureRef = useRef(null);
    const frameRef = useRef(null);
    const lastTouchPressRef = useRef(0);
    const live = useRef(null);
    live.current = { cards, parent, busy, onReorder };
    const selected = cards.find(card => card.id === selectedId) || cards[0];
    const selectedIndex = cards.findIndex(card => card.id === selected.id);
    const cardImage = card => getCardDisplayImage(canReorder ? { ...card, faceDown: false } : card);
    // Touch browsers may suppress the compatibility click after a captured drag.
    // Activate on release and ignore its later synthetic click; keyboard keeps onClick.
    const press = action => ({
        onPointerUp: event => {
            if (event.pointerType !== 'touch') return;
            event.preventDefault();
            lastTouchPressRef.current = Date.now();
            action(event);
        },
        onClick: event => {
            if (event.detail === 0 || Date.now() - lastTouchPressRef.current > 600) action(event);
        },
    });

    const cancelDrag = () => {
        gestureRef.current = null;
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        setDrag(null);
    };
    useEffect(() => {
        const cancel = event => { if (event.key === 'Escape') cancelDrag(); };
        window.addEventListener('keydown', cancel);
        return () => {
            window.removeEventListener('keydown', cancel);
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    const locateDrop = gesture => {
        const slot = document.elementFromPoint(gesture.x, gesture.y)?.closest('[data-stack-card-id]');
        if (!slot || !gridRef.current?.contains(slot)) return { valid: false };
        const rect = slot.getBoundingClientRect();
        const index = live.current.cards.findIndex(card => card.id === slot.dataset.stackCardId);
        const after = gesture.y >= rect.top + rect.height / 2;
        return { valid: true, targetId: slot.dataset.stackCardId, after,
            beforeCardId: live.current.cards[index + (after ? 1 : 0)]?.id || null };
    };
    const scrollWhileDragging = () => {
        const gesture = gestureRef.current;
        if (!gesture?.active) return;
        const grid = gridRef.current;
        const bounds = grid.getBoundingClientRect();
        if (gesture.x >= bounds.left && gesture.x <= bounds.right && gesture.y >= bounds.top - 20 && gesture.y <= bounds.bottom + 20) {
            const speed = gesture.y < bounds.top + 40 ? -7 : gesture.y > bounds.bottom - 40 ? 7 : 0;
            if (speed) {
                const previousScroll = grid.scrollTop;
                grid.scrollTop += speed;
                if (grid.scrollTop !== previousScroll) {
                    gesture.drop = locateDrop(gesture);
                    setDrag({ ...gesture });
                }
            }
        }
        frameRef.current = requestAnimationFrame(scrollWhileDragging);
    };
    const startDrag = (event, card) => {
        if (!canReorder || busy || event.button > 0) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setSelectedId(card.id);
        gestureRef.current = { id: card.id, startX: event.clientX, startY: event.clientY,
            x: event.clientX, y: event.clientY, active: false, drop: null };
    };
    const moveDrag = event => {
        const gesture = gestureRef.current;
        if (!gesture) return;
        gesture.x = event.clientX;
        gesture.y = event.clientY;
        if (!gesture.active && Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) < 6) return;
        gesture.active = true;
        gesture.drop = locateDrop(gesture);
        setDrag({ ...gesture });
        if (frameRef.current === null) frameRef.current = requestAnimationFrame(scrollWhileDragging);
    };
    const finishDrag = async event => {
        const gesture = gestureRef.current;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        cancelDrag();
        if (!gesture?.active || !gesture.drop?.valid || live.current.busy || gesture.id === gesture.drop.beforeCardId) return;
        const current = live.current.cards;
        const oldIndex = current.findIndex(card => card.id === gesture.id);
        if (oldIndex < 0 || current[oldIndex + 1]?.id === gesture.drop.beforeCardId
            || (oldIndex === current.length - 1 && !gesture.drop.beforeCardId)) return;
        const saved = await live.current.onReorder?.(live.current.parent, gesture.id, gesture.drop.beforeCardId);
        if (saved) setAnnouncement('Orden del montón actualizado.');
    };
    const nudge = direction => {
        const target = direction < 0 ? cards[selectedIndex - 1]?.id : cards[selectedIndex + 2]?.id || null;
        onReorder?.(parent, selected.id, target);
    };
    const ghost = drag && cards.find(card => card.id === drag.id);
    return <section className="board-stack-inventory" aria-label="Orden del montón" aria-busy={busy}>
        <header>
            <div><Layers size={17} /><h5>Orden de robo <span>{cards.length}</span></h5></div>
            {onOpenMenu && <button type="button" {...press(event => onOpenMenu(parent, event))} title="Gestionar montón" aria-label="Gestionar montón"><Layers size={18} /></button>}
        </header>
        <p>{canReorder ? 'Arrastra el asa para cambiar el orden.' : 'Selecciona una carta para sacarla.'} La primera está arriba.</p>
        <div ref={gridRef} className="board-stack-grid" role="list" aria-label="Cartas en orden de robo">
            {cards.map((card, index) => <div key={card.id} role="listitem" data-stack-card-id={card.id}
                className={`board-stack-slot ${selected.id === card.id ? 'is-selected' : ''} ${drag?.id === card.id ? 'is-dragging' : ''} ${drag?.drop?.targetId === card.id ? (drag.drop.after ? 'drop-after' : 'drop-before') : ''}`}>
                <button type="button" className="board-stack-select" aria-pressed={selected.id === card.id}
                    aria-label={`${index + 1}. ${card.name || 'Carta'}${index === 0 ? ', arriba' : ''}`}
                    {...press(() => setSelectedId(card.id))}>
                    <span className="board-stack-position">{index === 0 ? '1 · Arriba' : index + 1}</span>
                    <CardImageWithLoader src={cardImage(card)} label={card.name || 'Carta'}
                        className="board-stack-art" imageClassName="h-full w-full object-contain" />
                    <span className="board-stack-name">{card.name || 'Carta'}</span>
                </button>
                {canReorder && <button type="button" className="board-stack-grip" disabled={busy}
                    aria-label={`Mover ${card.name || 'carta'}, posición ${index + 1}`} title="Arrastrar para ordenar"
                    onPointerDown={event => startDrag(event, card)} onPointerMove={moveDrag}
                    onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
                    onKeyDown={event => {
                        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                        event.preventDefault(); setSelectedId(card.id);
                        const direction = event.key === 'ArrowUp' ? -1 : 1;
                        if (index + direction < 0 || index + direction >= cards.length) return;
                        onReorder?.(parent, card.id, direction < 0 ? cards[index - 1].id : cards[index + 2]?.id || null);
                    }}><GripVertical size={19} /></button>}
            </div>)}
        </div>
        <footer>
            <p><span>{selectedIndex + 1} / {cards.length}</span> {selected.name || 'Carta'}</p>
            <div className="board-stack-selection-actions">
                <button type="button" className="board-stack-extract" disabled={busy} {...press(() => { if (!busy) onExtract?.(parent.id, selected.id); })}><MoveUpRight size={17} /> Sacar carta</button>
                {canReorder && <>
                    <button type="button" aria-label="Subir carta" disabled={busy || selectedIndex === 0} {...press(() => { if (!busy && selectedIndex > 0) nudge(-1); })}><ArrowUp size={18} /></button>
                    <button type="button" aria-label="Bajar carta" disabled={busy || selectedIndex === cards.length - 1} {...press(() => { if (!busy && selectedIndex < cards.length - 1) nudge(1); })}><ArrowDown size={18} /></button>
                </>}
            </div>
            <span className="sr-only" role="status">{busy ? 'Guardando el montón' : announcement}</span>
        </footer>
        {ghost && createPortal(<div className="board-stack-drag-ghost" style={{ left: drag.x + 18, top: drag.y - 48 }} aria-hidden="true">
            <img src={cardImage(ghost)} alt="" /><span>{ghost.name || 'Carta'}</span>
        </div>, document.body)}
    </section>;
};
