import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Copy, Eye, EyeOff, Layers, Minus, Plus, RotateCw, Shuffle, X } from 'lucide-react';
import { getCardStackIds } from '../../../utils/cardBoard';
import { MAX_STACK_COPIES, MAX_STACK_DRAW } from '../boardStackActions';
import './BoardCardMenu.css';

const QuantityControl = ({ id, label, value, onChange, max, presets, disabled }) => {
    const number = Number(value);
    const adjust = amount => onChange(Math.min(max, Math.max(1, (number || 1) + amount)));
    return <div className="board-card-quantity">
        <label htmlFor={id}>{label}</label>
        <div className="board-card-stepper">
            <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={disabled || number <= 1} onClick={() => adjust(-1)}><Minus size={18} /></button>
            <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" role="spinbutton"
                aria-valuemin={1} aria-valuemax={max} aria-valuenow={number || 1} value={value} disabled={disabled}
                onChange={event => { if (/^\d*$/.test(event.target.value)) onChange(event.target.value); }}
                onBlur={() => onChange(Math.min(max, Math.max(1, number || 1)))}
                onKeyDown={event => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault(); adjust(event.key === 'ArrowUp' ? 1 : -1);
                    }
                }} />
            <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || number >= max} onClick={() => adjust(1)}><Plus size={18} /></button>
        </div>
        <div className="board-card-presets" aria-label={`Cantidades rápidas: ${label.toLowerCase()}`}>
            {presets.filter(preset => preset <= max).map(preset => <button key={preset} type="button" aria-pressed={number === preset}
                disabled={disabled} onClick={() => onChange(preset)}>{preset}</button>)}
        </div>
    </div>;
};

export const BoardCardMenu = ({ menu, card, isPlayerView, busy, onAction, onClose, onFlip }) => {
    const ref = useRef(null);
    const [copies, setCopies] = useState(30);
    const [drawCount, setDrawCount] = useState(1);
    const [position, setPosition] = useState({ left: 12, top: 12 });
    const count = getCardStackIds(card).length + 1;
    const isPile = count > 1 || Boolean(card?.stackKey);
    const hidden = card?.hideStackContentsForPlayers === true;

    useLayoutEffect(() => {
        if (!menu || !ref.current) return;
        const previousFocus = document.activeElement;
        const place = () => {
            const bounds = ref.current?.getBoundingClientRect();
            if (!bounds) return;
            setPosition({
                left: Math.max(12, Math.min(menu.x, window.innerWidth - bounds.width - 12)),
                top: Math.max(12, Math.min(menu.y, window.innerHeight - bounds.height - 12)),
            });
        };
        place();
        ref.current.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
        observer?.observe(ref.current);
        window.addEventListener('resize', place);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', place);
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, [menu, isPlayerView, isPile]);

    useEffect(() => {
        if (!menu) return;
        const outside = event => { if (!ref.current?.contains(event.target)) onClose(); };
        const keydown = event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', keydown);
        };
    }, [menu, onClose]);

    if (!menu || !card) return null;
    const validCopies = Number.isInteger(Number(copies)) && copies >= 1 && copies <= MAX_STACK_COPIES;
    const validDraw = Number.isInteger(Number(drawCount)) && drawCount >= 1 && drawCount <= Math.min(count, MAX_STACK_DRAW);
    const copyForm = <form className="board-card-copy-form" onSubmit={event => { event.preventDefault(); if (validCopies) onAction('copies', Number(copies)); }}>
        <QuantityControl id="board-copy-count" label="Copias nuevas de esta carta" value={copies} onChange={setCopies}
            max={MAX_STACK_COPIES} presets={[1, 10, 30, 50]} disabled={busy} />
        <button className="board-card-confirm" type="submit" disabled={busy || !validCopies}><Copy size={18} /> Apilar copias <span>×{copies || 0}</span></button>
    </form>;
    return createPortal(
        <div ref={ref} className="board-card-menu" style={position} role="dialog" aria-label="Acciones de cartas"
            aria-busy={busy} onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}
            onTouchStart={event => event.stopPropagation()} onContextMenu={event => event.preventDefault()}>
            <header className="board-card-menu-heading"><Layers size={22} /><div><h4>{isPile ? 'Montón de cartas' : 'Carta'}</h4>
                <p>{count} {count === 1 ? 'carta disponible' : 'cartas disponibles'}{hidden ? ' · Boca abajo' : ''}</p></div>
                <button type="button" aria-label="Cerrar menú de cartas" onClick={onClose}><X size={19} /></button></header>
            <div className="board-card-menu-content">
                {isPile && <form onSubmit={event => { event.preventDefault(); if (validDraw) onAction('draw', Number(drawCount)); }}>
                    <QuantityControl id="board-draw-count" label="Cartas a robar" value={drawCount} onChange={setDrawCount}
                        max={Math.min(count, MAX_STACK_DRAW)} presets={[1, 3, 5, 10]} disabled={busy} />
                    <button className="board-card-confirm board-card-confirm-primary" type="submit" disabled={busy || !validDraw}><Layers size={18} /> Robar <span>{drawCount || 0}</span></button>
                    <p className="board-card-menu-hint">Se revelan carta a carta sobre la mesa.</p>
                </form>}
                {!isPlayerView && (isPile ? <details className="board-card-copy-disclosure">
                    <summary><Copy size={17} /> Añadir copias <ChevronDown size={16} /></summary>{copyForm}
                </details> : copyForm)}
                <div className="board-card-secondary-actions">
                    {!isPlayerView && count > 1 && <button type="button" disabled={busy} onClick={() => onAction('shuffle')}><Shuffle size={17} /> Barajar boca abajo</button>}
                    {!(isPlayerView && hidden) && <button type="button" disabled={busy} onClick={onFlip}><RotateCw size={17} /> Voltear carta</button>}
                </div>
                {!isPlayerView && isPile && <button type="button" className="board-card-privacy" disabled={busy} aria-pressed={hidden} onClick={() => onAction('privacy')}>
                    {hidden ? <EyeOff size={19} /> : <Eye size={19} />}<span>Contenido {hidden ? 'oculto' : 'visible'} a jugadores
                        <small>{hidden ? 'Toca para permitir verlo' : 'Toca para ocultarlo'}</small></span></button>}
                {busy && <p className="board-card-menu-hint" role="status">Guardando…</p>}
            </div>
        </div>, document.body
    );
};
