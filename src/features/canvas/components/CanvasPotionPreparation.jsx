import { getBuffPotionBlockReason } from '../../tactical-shared/potionBuffs';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Footprints, Heart, Sword, X } from 'lucide-react';
import ActionDieSvg from '../../../components/ActionDieSvg';
import LoadingImage, { preloadImage } from '../../../components/LoadingImage';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getHealingPotionBlockReason } from '../item-use/healingPotionRules';
import './CanvasPotionPreparation.css';

const facesOf = resource => Number(resource.sides || resource.faces || String(resource.die || '').replace(/\D/g, '')) || 6;
const actionName = resource => resource.kind === 'enemy-movement' ? 'Movimiento' : 'Acción principal';
const costText = resource => !resource ? 'Elige qué gastar para beber.'
    : ['enemy-action', 'enemy-movement'].includes(resource.kind) ? `Gastas ${actionName(resource).toLowerCase()}.`
        : resource.kind === 'manual-threat' ? `Gastas Amenaza d${facesOf(resource)} añadida para este uso.`
            : resource.kind === 'threat-die' ? 'Gastas la reserva de Amenaza; su valor se ignora.'
                : `Gastas un d${facesOf(resource)}; su valor se ignora.`;

export default function CanvasPotionPreparation({ session, token, resources = [], onSelectResource, onConfirm, onCancel, busy = false, customImages, targets = [], onSelectTarget }) {
    const bandage = session?.definitionId === 'bandage';
    const antidote = session?.definitionId === 'antidote' || bandage;
    const remedyName = bandage ? 'Vendaje' : 'Antídoto';
    const conditionName = bandage ? 'Sangrado' : 'Envenenado';
    const haste = session?.definitionId === 'haste-potion';
    const vitality = session?.definitionId === 'vitality-potion';
    const buff = haste || vitality;
    const target = targets.find(candidate => candidate.id === session?.context?.targetId);
    const [manualOpen, setManualOpen] = useState(false);
    const frame = useRef(null);
    const selected = session?.context?.resource;
    const selectedAvailable = resources.some(resource => resource.id === selected?.id && resource.status === 'available');
    const regular = resources.filter(resource => resource.kind !== 'manual-threat');
    const manual = resources.filter(resource => resource.kind === 'manual-threat');
    const life = token?.stats?.vida || {};
    const maximum = Math.max(0, Math.floor(Number(life.max) || 0));
    const current = Math.min(maximum, Math.max(0, Number(life.current) || 0));
    const blocked = antidote ? (target?.blocked || (!target ? `Elige una criatura con ${conditionName} a Toque.` : null)) : buff ? getBuffPotionBlockReason(token) : getHealingPotionBlockReason(token);
    const name = session?.item?.name || session?.item?.nombre || 'Poción de curación';
    const image = resolveEquipmentImage(session?.item, customImages);
    useEffect(() => { preloadImage(image); }, [image]);

    useEffect(() => {
        frame.current?.querySelector('button[data-resource]:not(:disabled)')?.focus({ preventScroll: true });
    }, [session?.id]);

    const renderResource = resource => {
        const isAction = ['enemy-action', 'enemy-movement'].includes(resource.kind);
        const active = selected?.id === resource.id;
        const available = resource.status === 'available';
        const faces = facesOf(resource);
        const isManual = resource.kind === 'manual-threat';
        const label = isAction ? actionName(resource) : isManual ? `Amenaza manual d${faces}`
            : `${resource.kind === 'threat-die' ? 'Reserva de Amenaza' : 'Dado de acción'} d${faces} · ${resource.value}`;
        return <button key={resource.id} type="button" data-resource={resource.kind}
            className="potion-preparation-resource" aria-label={label} aria-pressed={active}
            disabled={busy || !available} onClick={() => onSelectResource?.(resource)}>
            {isAction ? <span className="potion-preparation-action-icon" aria-hidden="true">
                {resource.kind === 'enemy-movement' ? <Footprints /> : <Sword />}
            </span> : <ActionDieSvg faces={faces} value={isManual ? faces : resource.value}
                selected={active} connectedFaces={faces === 20} accent={available ? 'gold' : 'slate'}
                status={available ? 'available' : 'spent'} />}
            <span className="potion-preparation-resource-name">{isAction ? actionName(resource)
                : isManual ? `d${faces}` : resource.kind === 'threat-die' ? `Reserva · d${faces}` : `d${faces}`}</span>
            <span className="potion-preparation-resource-state">{!available ? 'Agotado' : active ? (antidote ? 'Para usar' : 'Para beber') : isManual ? 'Añadir' : 'Disponible'}</span>
        </button>;
    };

    return <section className={`potion-preparation${antidote ? (bandage ? ' potion-preparation--bandage' : ' potion-preparation--antidote') : ''}`} data-potion={session?.definitionId} aria-label={`Preparar ${name}`} aria-busy={busy} ref={frame}
        onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onCancel?.(); } }}>
        <div className="potion-preparation-scroll custom-scrollbar">
            <header className="potion-preparation-header">
                {image && <div className="potion-preparation-image" aria-hidden="true"><LoadingImage src={image} alt="" skeleton={false}
                    draggable={false} imageClassName="potion-preparation-art" /></div>}
                <button type="button" className="potion-preparation-close" aria-label={antidote ? `Cancelar uso del ${remedyName}` : 'Cancelar uso de la poción'} disabled={busy} onClick={onCancel}><X size={20} /></button>
                <span className="potion-preparation-eyebrow">{token?.name || 'Consumible'}</span>
                <h2>{name}</h2>
                <p className="potion-preparation-effect">{antidote ? <>Elimina <strong>{conditionName}</strong></> : haste ? <>Ganas <strong>4 casillas</strong> este turno</> : vitality ? <>Obtienes <strong>2 bloques</strong> de Vida temporal</> : <>Recupera <strong>1d4</strong> de Vida</>}</p>
            </header>
            {buff && <p className="potion-preparation-note potion-preparation-duration">{haste ? '+1 Movimiento básico hasta el final del combate. No se acumula.' : 'Hasta el final del combate. Se pierde antes que tu Vida; no se acumula ni puede curarse.'}</p>}
            {antidote ? <div className="potion-preparation-targets" role="group" aria-label={`Criatura que recibe el ${remedyName}`}>
                <p className="potion-preparation-prompt">Para ti o una criatura a Toque</p>
                <p className="potion-preparation-note">Toque: compartir casilla.</p>
                {targets.map(candidate => <button key={candidate.id} type="button" disabled={busy || Boolean(candidate.blocked)}
                    aria-pressed={target?.id === candidate.id} title={candidate.blocked || `Eliminar ${conditionName}`}
                    onClick={() => onSelectTarget?.(candidate.id)}>
                    {candidate.id === token?.id ? 'Sobre ti' : candidate.name} <span>{candidate.blocked ? (bandage ? 'Sin sangrado' : 'Sin veneno') : conditionName}</span>
                </button>)}
            </div> : haste ? <div className="potion-preparation-health potion-preparation-movement">
                <Footprints size={18} aria-hidden="true" /><span>Movimiento adicional · <strong>+4</strong></span>
            </div> : <div className="potion-preparation-health" aria-label={`Vida: ${current} de ${maximum}`}>
                <Heart size={14} aria-hidden="true" />
                <span className="potion-preparation-blocks" aria-hidden="true">
                    {Array.from({ length: Math.min(maximum, 60) }, (_, index) => <i key={index} data-filled={index < current} />)}
                </span>
                <span>{current} <span className="potion-preparation-max">/ {maximum}</span></span>
                {vitality && <span className="potion-preparation-temporary" aria-label="Obtendrás 2 bloques de Vida temporal">
                    <span className="potion-preparation-blocks" aria-hidden="true"><i data-filled="true" /><i data-filled="true" /></span> +2
                </span>}
            </div>}
            <div className="potion-preparation-costs" role="group" aria-label={antidote ? `Recurso para usar el ${remedyName}` : 'Recurso para beber la poción'}>
                <p className="potion-preparation-prompt">Elige qué gastar</p>
                <div className="potion-preparation-resources" style={{ '--potion-resource-columns': Math.min(3, Math.max(1, regular.length)) }}>{regular.map(renderResource)}</div>
                {manual.length > 0 && <>
                    <button type="button" className="potion-preparation-disclosure" aria-expanded={manualOpen}
                        disabled={busy} onClick={() => setManualOpen(value => !value)}>
                        {selected?.kind === 'manual-threat' ? `Amenaza d${facesOf(selected)} añadida` : 'Añadir Amenaza'}
                        <ChevronDown size={16} style={{ transform: manualOpen ? 'rotate(180deg)' : undefined }} />
                    </button>
                    {manualOpen && <div className="potion-preparation-manual" role="group" aria-label="Añadir un dado de Amenaza">{manual.map(renderResource)}</div>}
                </>}
            </div>
        </div>
        <footer className="potion-preparation-footer">
            <p className="potion-preparation-note" aria-live="polite">{blocked || (!antidote && !buff && current >= maximum
                ? 'Vida completa: consumirás la poción sin recuperar más.' : (antidote ? costText(selected).replace('beber', `usar el ${remedyName}`) : costText(selected)))}</p>
            <button type="button" className="potion-preparation-confirm" onClick={onConfirm}
                disabled={busy || !selectedAvailable || Boolean(blocked)}>
                {antidote ? (busy ? 'Aplicando…' : `Usar ${remedyName}`) : (busy ? 'Bebiendo…' : 'Beber poción')}<ArrowRight size={21} aria-hidden="true" />
            </button>
        </footer>
    </section>;
}
