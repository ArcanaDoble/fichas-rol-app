import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Hand } from 'lucide-react';
import { getTokenResourceCrownGeometry, getTokenResourceRibbonGeometry } from './TokenResourceCrown';
import './TokenInventoryReceipt.css';

/** Local acknowledgement of inventory additions; never writes scene state. */
export default function TokenInventoryReceipt({ inventory = [], zoom = 1, pendingItem = null, recipientName = '', width = 50, height = 50, cellSize = null, isCircular = true }) {
    const previousCount = useRef(inventory.length);
    const timerRef = useRef(null);
    const [receipt, setReceipt] = useState(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        const added = inventory.length - previousCount.current;
        previousCount.current = inventory.length;
        if (added <= 0) return;
        const lastItem = inventory[inventory.length - 1];
        setReceipt(added > 1 ? `${added} objetos` : (lastItem?.name || lastItem?.nombre || 'Objeto'));
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setReceipt(null), 1800);
    }, [inventory]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const pendingName = pendingItem?.lootItem?.nombre || pendingItem?.lootItem?.name || pendingItem?.name || 'Objeto';
    const message = pendingItem ? (recipientName || pendingName) : receipt;
    const Icon = pendingItem ? Hand : Check;
    const safeZoom = Math.max(.05, Number(zoom) || 1);
    const readoutOffset = isCircular
        ? getTokenResourceCrownGeometry({ width, height, cellSize, zoom: safeZoom }).readoutOffset
        : getTokenResourceRibbonGeometry({ width, height, cellSize, zoom: safeZoom }).readoutOffset;
    // Crown clearance + full name/Life plate + a small screen-space gap.
    // A world-space margin overlaps the plate when zooming out.
    const screenOffset = readoutOffset + 26 + 8;

    return (
        <div className="noma-token-pickup-anchor"
            style={{ marginTop: screenOffset / safeZoom, transform: `translateX(-50%) scale(${1 / safeZoom})` }}>
            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.12 }}
                        className="noma-token-pickup"
                        data-pending={Boolean(pendingItem)}
                        role="status" aria-label={pendingItem ? `Suelta para recoger ${pendingName}${recipientName ? `: ${recipientName}` : ''}` : `${message} recogido`}>
                        <Icon size={12} aria-hidden="true" />
                        {pendingItem && <span className="noma-token-pickup__action">Soltar</span>}
                        <span className="noma-token-life-name">{message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
