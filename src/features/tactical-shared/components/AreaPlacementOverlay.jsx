import React, { useEffect, useRef, useState } from 'react';
import { Check, Crosshair, Dices, RotateCcw, UserRound, X } from 'lucide-react';
import './AreaPlacementOverlay.css';

const TargetPortrait = ({ image, circular }) => {
    const [failed, setFailed] = useState(false);
    return image && !failed
        ? <img src={image} alt="" decoding="async" draggable={false} data-circular={circular}
            onError={() => setFailed(true)} />
        : <UserRound className="noma-area-target__fallback" aria-hidden="true" />;
};

const SpellTargetSelector = ({ system }) => {
    const selectedRef = useRef(null);
    const selectedId = system.placement?.targetId;
    useEffect(() => {
        selectedRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [selectedId]);
    return <div className="noma-area-controls__targets" role="group"
        aria-label={system.session?.definitionId === 'runic-barrier' ? 'Objetivo de Barrera rúnica' : system.session?.chainId ? 'Segundo objetivo de Cadena arcana' : 'Objetivo de Proyectil arcano'}>
        {system.targetOptions?.length ? system.targetOptions.map(option => {
            const selected = selectedId === option.targetId;
            return <button type="button" key={option.targetId} className="noma-area-target"
                ref={selected ? selectedRef : undefined} disabled={system.isCommitting} aria-pressed={selected}
                aria-label={`${option.targetName} · ${option.distance} de ${option.range} casillas`}
                title={option.targetName} onClick={() => system.selectTarget(option.targetId)}>
                <span className="noma-area-target__portrait" aria-hidden="true">
                    <TargetPortrait key={option.targetImage || 'empty'} image={option.targetImage} circular={option.targetIsCircular} />
                    <span className="noma-area-target__selected"><Check size={12} /></span>
                </span>
                <span className="noma-area-target__name">{option.targetName}</span>
                <span className="noma-area-target__distance">{option.distance} / {option.range} casillas</span>
            </button>;
        }) : <p className="noma-area-controls__targets-empty">{system.session?.definitionId === 'runic-barrier'
            ? 'No hay aliados visibles sin Barrera dentro del alcance.' : 'No hay enemigos localizados con un recorrido válido.'}</p>}
    </div>;
};

export const getThrowTrajectory = (source, placement, zoom = 1) => {
    if (!source || !placement) return null;
    const scale = Math.max(0.1, Number(zoom) || 1);
    const center = { x: Number(source.x) + (Number(source.width) || 50) / 2,
        y: Number(source.y) + (Number(source.height) || 50) / 2 };
    const impactCell = placement.impactCell;
    const firstCell = placement.cells?.[0];
    const end = impactCell && firstCell
        ? {
            x: placement.x + (impactCell.column - firstCell.column + 0.5) * placement.width / placement.columns,
            y: placement.y + (impactCell.row - firstCell.row + 0.5) * placement.height / placement.rows,
        }
        : { x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 };
    const dx = end.x - center.x;
    const dy = end.y - center.y;
    const lift = Math.min(120, Math.max(40, Math.hypot(dx, dy) * scale * 0.22)) / scale;
    const control = { x: (center.x + end.x) / 2 + (Math.abs(dx) < Math.abs(dy) * 0.3 ? lift * 0.6 : 0),
        y: Math.min(center.y, end.y) - lift };
    const angle = Math.atan2(control.y - center.y, control.x - center.x);
    const start = { x: center.x + Math.cos(angle) * (Number(source.width) || 50) * 0.45,
        y: center.y + Math.sin(angle) * (Number(source.height) || 50) * 0.45 };
    return {
        start, end,
        path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
        label: { x: start.x * 0.25 + control.x * 0.5 + end.x * 0.25,
            y: start.y * 0.25 + control.y * 0.5 + end.y * 0.25 - 14 / scale },
    };
};

export const AreaPlacementOverlay = ({ system, source = system?.trajectorySource || system?.sourceToken, zoom = 1 }) => {
    const placement = system?.placement;
    if ((!system?.isPlacing && !system?.isConfirming) || !placement) return null;
    if (['arcane-projectile', 'runic-barrier'].includes(system.session?.definitionId) && !placement.valid) return null;
    const barrier = system.session?.definitionId === 'runic-barrier';
    const isExplosiveBomb = system.session?.definitionId === 'explosive-bomb';
    const isTarBomb = system.session?.definitionId === 'tar-bomb';
    const maxRange = placement.range;
    const scale = Math.max(0.1, Number(zoom) || 1);
    const route = system.session?.definitionId === 'arcane-projectile' ? placement.route : null;
    const mist = system.session?.definitionId === 'arcane-mist';
    const trajectory = route?.length ? { path: route.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
        start: route[0], end: route[route.length - 1], label: route[Math.floor(route.length / 2)] }
        : getThrowTrajectory(source, mist ? placement.basePlacement || placement : placement, scale);
    const labelTransform = `translate(-50%, -50%) scale(${1 / scale})`;
    return (
        <div className="noma-area-overlay" data-area-placement-phase={system.isConfirming ? 'confirm' : 'place'} data-valid={placement.valid} data-explosive={isExplosiveBomb} data-mist={mist} data-barrier={barrier}>
            <div className="noma-area-template" style={{ left: placement.x, top: placement.y, width: placement.width, height: placement.height, borderWidth: 1.5 / scale }} data-area-placement-valid={placement.valid ? 'true' : 'false'}>
                {!barrier && placement.cells.map((cell, index) => (
                    <span key={`${cell.column}:${cell.row}`} className={`noma-area-cell${(isExplosiveBomb || isTarBomb) && cell.column === placement.impactCell?.column && cell.row === placement.impactCell?.row ? ' noma-area-cell--impact' : ''}`} style={{
                        left: `${(mist ? cell.column - Math.min(...placement.cells.map(value => value.column)) : index % placement.columns) * (100 / placement.columns)}%`,
                        top: `${(mist ? cell.row - Math.min(...placement.cells.map(value => value.row)) : Math.floor(index / placement.columns)) * (100 / placement.rows)}%`,
                        width: `${100 / placement.columns}%`, height: `${100 / placement.rows}%`,
                    }} />
                ))}
                {!barrier && <span className="noma-area-center" style={{ transform: labelTransform,
                    ...(mist && placement.basePlacement ? { left: `${(placement.basePlacement.x + placement.basePlacement.width / 2 - placement.x) / placement.width * 100}%`,
                        top: `${(placement.basePlacement.y + placement.basePlacement.height / 2 - placement.y) / placement.height * 100}%` } : {}) }}><Crosshair size={12} /> {(isExplosiveBomb || isTarBomb) ? (system.isConfirming ? 'Área 2×2' : 'Impacto') : `${placement.distance}/${placement.range}`}</span>}
            </div>
            {trajectory && <>
                <svg className="noma-area-trajectory" aria-hidden="true">
                    <path d={trajectory.path} className="noma-area-trajectory__underlay" vectorEffect="non-scaling-stroke" />
                    <path d={trajectory.path} className="noma-area-trajectory__line" vectorEffect="non-scaling-stroke" />
                    <circle cx={trajectory.start.x} cy={trajectory.start.y} r={2.5 / scale} fill="currentColor" />
                    <circle cx={trajectory.end.x} cy={trajectory.end.y} r={5 / scale} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
                </svg>
                <span className="noma-area-distance" style={{ left: trajectory.label.x, top: trajectory.label.y, transform: labelTransform }}>
                    <Dices size={13} /><strong>{placement.distance} / {maxRange}</strong><span>{isExplosiveBomb ? `casillas · −${placement.distance} Presión` : 'casillas'}</span>
                </span>
            </>}
        </div>
    );
};

export const AreaPlacementControls = ({ system }) => {
    if (!system?.isPlacing && !system?.isConfirming) return system?.canResumeExplosiveBlast ? (
        <div className="noma-area-controls-dock noma-area-controls-dock--resume">
            <button type="button" className="noma-area-controls__resume" onClick={system.resumeExplosiveBlast}>Continuar explosión pendiente</button>
        </div>
    ) : null;
    if (['healing-potion', 'antidote', 'haste-potion', 'vitality-potion'].includes(system.session?.definitionId)) return null;
    const placement = system.placement;
    const isExplosiveBomb = system.session?.definitionId === 'explosive-bomb';
    const isTarBomb = system.session?.definitionId === 'tar-bomb';
    const isArcaneProjectile = system.session?.definitionId === 'arcane-projectile';
    const isTargetSpell = isArcaneProjectile || system.session?.definitionId === 'runic-barrier';
    const isMist = system.session?.definitionId === 'arcane-mist';
    const impactCommitted = Boolean(isExplosiveBomb && system.session?.context?.impactCommitted);
    const ready = system.isConfirming && placement?.valid && !system.isCommitting
        && (!isTargetSpell || system.targetOptions?.some(option => option.targetId === placement.targetId));
    const resourceValue = Number(system.session?.context?.resource?.value) || 0;
    const maxRange = placement?.range ?? resourceValue;
    const rolls = system.session?.context?.explosiveRolls;
    const orientationNames = { nw: 'Noroeste', ne: 'Noreste', sw: 'Suroeste', se: 'Sureste' };
    const stopPropagation = event => event.stopPropagation();
    return (
        <div className="noma-area-controls-dock" onPointerDown={stopPropagation} onMouseDown={stopPropagation} onTouchStart={stopPropagation} onTouchMove={stopPropagation} onTouchEnd={stopPropagation}>
            <div className="noma-area-controls" role="group" aria-label={system.labels?.group || (isExplosiveBomb ? 'Lanzamiento de bomba explosiva' : 'Lanzamiento de objeto')} data-explosive={isExplosiveBomb} data-target-selection={isTargetSpell} data-mist={isMist}>
                <div className="noma-area-controls__status">
                    <div className="noma-area-controls__status-line">
                        <Crosshair size={15} />
                        <span>{system.labels?.status || (isExplosiveBomb
                            ? system.isCommitting && !impactCommitted ? 'Lanzando y tirando 2d8…' : ready ? 'Orienta la explosión' : placement && !placement.valid ? placement.reason === 'out-of-range' ? 'Impacto fuera de alcance' : 'Impacto fuera del tablero' : 'Elige la casilla de impacto'
                            : isTarBomb ? ready ? 'Orienta la brea · 2×2' : 'Elige la casilla de impacto' : ready ? 'Destino preparado' : placement && !placement.valid ? 'Fuera de alcance o del tablero' : 'Coloca la plantilla')}</span>
                        {placement && Number.isFinite(placement.distance) && <strong>{isExplosiveBomb && impactCommitted ? `−${placement.distance} Presión` : `${placement.distance} / ${maxRange} casillas`}</strong>}
                    </div>
                    <p className="noma-area-controls__hint"><span className="noma-area-controls__touch">Un dedo para fijar · Dos dedos para acercar</span><span className="noma-area-controls__mouse">Clic para fijar · Esc para cancelar</span></p>
                </div>
                {isTargetSpell && <SpellTargetSelector system={system} />}
                {(isExplosiveBomb || isTarBomb) && system.isConfirming && <div className="noma-area-controls__explosion">
                    {isExplosiveBomb && <div className="noma-area-controls__formula" aria-live="polite">
                        <span>Presión compartida</span>
                        <strong>{resourceValue} <i>+</i> {rolls?.[0]} <i>+</i> {rolls?.[1]} <i>−</i> {placement?.distance} <i>=</i> <em>{system.explosivePressure}</em></strong>
                    </div>}
                    <div className="noma-area-controls__orientations" role="group" aria-label="Orientación del área 2 por 2">
                        {(system.explosiveOrientations || []).map((option) => <button
                            key={option.orientation} type="button" disabled={system.isCommitting}
                            aria-label={`Extender ${isTarBomb ? 'brea' : 'explosión'} hacia el ${orientationNames[option.orientation] || option.orientation}`}
                            aria-pressed={placement?.orientation === option.orientation}
                            className="noma-area-controls__orientation"
                            onClick={() => system.chooseExplosiveOrientation?.(option.orientation)}
                        >
                            <span className="noma-area-controls__orientation-grid" aria-hidden="true">
                                {option.cells.map((cell) => <span key={`${cell.column}:${cell.row}`} data-impact={cell.column === option.impactCell?.column && cell.row === option.impactCell?.row} />)}
                            </span>
                            <span>{orientationNames[option.orientation]}</span>
                        </button>)}
                    </div>
                    <p className="noma-area-controls__explosion-note">{isTarBomb ? 'Terreno difícil · Inflamable · Hasta el final del combate o hasta arder.' : 'Bomba y dado gastados · Una Presión para aliados y enemigos del área.'}</p>
                </div>}
                <div className="noma-area-controls__actions" data-impact-committed={impactCommitted}>
                    <button type="button" className="noma-area-controls__launch" disabled={!ready} onClick={system.confirm} aria-label={system.labels?.confirm || (impactCommitted ? 'Confirmar área de explosión' : 'Confirmar uso del objeto')}><Check size={17} />{system.isCommitting ? 'Resolviendo…' : system.labels?.confirm || (impactCommitted ? 'Confirmar área' : 'Lanzar')}</button>
                    {!impactCommitted && <button type="button" disabled={(!system.isConfirming && !system.canReposition) || system.isCommitting} onClick={system.reposition} aria-label="Recolocar plantilla"><RotateCcw size={15} />Recolocar</button>}
                    <button type="button" disabled={system.isCommitting} onClick={system.cancel} aria-label={system.labels?.cancel || (impactCommitted ? 'Cerrar explosión pendiente' : 'Cancelar uso del objeto')}><X size={16} />{impactCommitted ? 'Cerrar' : 'Cancelar'}</button>
                </div>
            </div>
        </div>
    );
};

export default AreaPlacementOverlay;
