import React from 'react';
import { Droplet, Footprints } from 'lucide-react';
import './CanvasBleedingChoice.css';

export default function CanvasBleedingChoice({ token, onChoose, busy }) {
    return <section className="canvas-bleeding-choice" aria-label="Resolver Sangrado" aria-busy={busy}>
        <Droplet size={28} aria-hidden="true" />
        <h2>Sangrado</h2>
        <p className="canvas-bleeding-choice__name">{token.name}</p>
        <p>Al comenzar tu activación, elige:</p>
        <div className="canvas-bleeding-choice__options">
            <button type="button" disabled={busy} onClick={() => onChoose(token.id, 'life')}>
                <Droplet aria-hidden="true" /><strong>Perder 1 Vida</strong>
                <span>Conservas tu Movimiento.</span>
            </button>
            <button type="button" disabled={busy} onClick={() => onChoose(token.id, 'movement')}>
                <Footprints aria-hidden="true" /><strong>Renunciar al Movimiento</strong>
                <span>Este turno. Puedes usar Correr.</span>
            </button>
        </div>
    </section>;
}
