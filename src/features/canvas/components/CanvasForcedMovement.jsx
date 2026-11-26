import React from 'react';
import { Move } from 'lucide-react';

export function ForcedMovementButton({ controller, token }) {
    if (!controller?.canBegin(token)) return null;
    const active = controller.isActive(token.id);
    return <button type="button" aria-label={`Desplazamiento sin coste de ${token.name || 'la ficha'}`}
        aria-pressed={active} title={active ? 'Desplazamiento sin coste activo' : 'Activar desplazamiento sin coste'}
        className={`p-1 rounded-full transition-colors ${active
            ? 'text-[#facc15] bg-[#c8aa6e]/15 ring-1 ring-inset ring-[#c8aa6e]/60 hover:text-[#ffe66d]'
            : 'text-[#c8aa6e] hover:text-[#f0e6d2] hover:bg-[#c8aa6e]/10'}`}
        onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); if (active) controller.cancel(); else controller.begin(token.id); }}>
        <Move size={12} aria-hidden="true" />
    </button>;
}
