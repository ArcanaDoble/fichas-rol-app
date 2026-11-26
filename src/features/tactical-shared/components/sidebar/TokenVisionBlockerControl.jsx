import React, { useEffect, useRef, useState } from 'react';
import { readTokenVisionShape } from '../../tokenVisionShape';

export const TokenVisionBlockerControl = ({ token, updateItem }) => {
    const [preparing, setPreparing] = useState(false);
    const request = useRef(0);
    useEffect(() => {
        setPreparing(false);
        return () => { request.current += 1; };
    }, [token.id, token.img, token.isCircular]);

    const enabled = token.blocksVision === true;
    const toggle = async () => {
        if (enabled) {
            updateItem(token.id, { blocksVision: false }, true);
            return;
        }
        const current = ++request.current;
        const needsOutline = Boolean(token.img && !token.isCircular);
        if (needsOutline) setPreparing(true);
        const shape = needsOutline ? await readTokenVisionShape(token.img) : null;
        if (current !== request.current) return;
        updateItem(token.id, { blocksVision: true, visionBlockerShape: shape }, true);
        setPreparing(false);
    };

    return <button type="button" role="switch" aria-label="Bloquea la visión" aria-checked={enabled}
        aria-busy={preparing} disabled={preparing} onClick={toggle}
        className="flex w-full min-h-[44px] items-center justify-between gap-3 border-t border-slate-800/60 pt-3 text-left disabled:cursor-wait focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#c8aa6e]">
        <span className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bloquea la visión</span>
            <span className="text-[8px] text-slate-600 italic">
                {preparing ? 'Preparando la silueta…' : 'Con la niebla activa, oculta lo que queda detrás.'}
            </span>
        </span>
        <span aria-hidden="true" className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${enabled ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}>
            <span className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
        </span>
    </button>;
};
