import React, { useId, useState } from 'react';
import { supportsCanvasInitiative } from '../combat/canvasCombatState';

export const CanvasCombatParticipation = ({ token, combat, onChange }) => {
    const [busy, setBusy] = useState(false);
    const statusId = useId();
    if (!supportsCanvasInitiative(token, 'campaign')) return null;
    const enabled = token.participatesInCombat !== false;
    const open = ['setup', 'active'].includes(combat?.status);
    const participant = open ? combat.participants?.[token.id] : null;
    let status = enabled ? 'Entrará al preparar la iniciativa.' : 'Fuera de la iniciativa.';
    if (enabled && open) status = combat.roundPhase === 'rolling' ? 'Puedes preparar su iniciativa.' : 'Se incorpora en la siguiente ronda.';
    if (participant) {
        status = participant.awaitingRoll ? 'Pendiente de preparar la iniciativa.' : `En la ronda ${combat.round}.`;
        if (!enabled) status = 'Saldrá al terminar esta ronda.';
    }
    const change = async (next, joinNow = false) => {
        setBusy(true);
        try { await onChange(token.id, next, { joinNow }); } finally { setBusy(false); }
    };

    return <div className="space-y-2 rounded border border-slate-800 bg-[#0b1120] px-4 py-1.5"
        role="group" aria-label="Participación en combate">
        <button type="button" role="switch" aria-label="Participa en combate" aria-checked={enabled}
            aria-describedby={statusId}
            aria-busy={busy} disabled={busy} onClick={() => change(!enabled)}
            className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#c8aa6e] disabled:opacity-60">
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Participa en combate</span>
                <span id={statusId} className="text-[8px] text-slate-600 italic">{status}</span>
            </span>
            <span aria-hidden="true" className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${enabled ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled ? 'left-7' : 'left-1'}`} />
            </span>
        </button>
        {open && !participant && <button type="button" disabled={busy} onClick={() => change(true, true)}
            className="min-h-11 w-full rounded border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#f8e7b9] transition-colors hover:bg-[#c8aa6e]/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#c8aa6e] disabled:opacity-60">
            {combat.roundPhase === 'rolling' ? 'Preparar iniciativa' : 'Incorporar a esta ronda'}
        </button>}
    </div>;
};
