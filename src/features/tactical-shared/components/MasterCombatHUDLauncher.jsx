import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './MasterCombatHUDLauncher.css';

export default function MasterCombatHUDLauncher({ onOpen }) {
    return (
        <button
            type="button"
            className="master-combat-launcher"
            onClick={onOpen}
            aria-label="Abrir HUD de combate"
            aria-expanded={false}
            title="Abrir HUD de combate"
        >
            <ChevronUp className="master-combat-launcher__arrow" size={17} strokeWidth={1.6} aria-hidden="true" />
        </button>
    );
}

export function MasterCombatHUDCollapse({ onClose }) {
    return (
        <button type="button" className="master-combat-launcher master-combat-launcher--collapse"
            onClick={onClose} aria-label="Plegar HUD de combate" title="Plegar HUD de combate" aria-expanded={true}>
            <ChevronDown className="master-combat-launcher__arrow" size={14} strokeWidth={1.6} aria-hidden="true" />
        </button>
    );
}
