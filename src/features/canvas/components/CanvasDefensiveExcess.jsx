import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Footprints, Swords } from 'lucide-react';
import { preloadImage } from '../../../components/LoadingImage';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getCanvasWeaponIdentity } from '../combat/canvasAttackRules';
import './CanvasDefensiveExcess.css';

// Keep the illustrated layers mounted; never clear the current art while its
// replacement is loading or decoding. A later selection supersedes that load.
const CounterattackArtwork = ({ image, sources }) => {
  const [visibleSource, setVisibleSource] = useState(null);
  useEffect(() => {
    let current = true;
    void preloadImage(image).then(ready => {
      if (current) setVisibleSource(ready ? image : null);
    });
    return () => { current = false; };
  }, [image]);

  return <div className="defensive-excess-art" aria-hidden="true">
    {sources.map(src => <img key={src} src={src} alt="" draggable={false} decoding="async"
      className="defensive-excess-art-image" data-visible={src === visibleSource} />)}
  </div>;
};

// Selecting a response only prepares it. The shared footer commits the defense.
const CanvasDefensiveExcess = ({ surplus, weapons, weapon, onWeaponChange, action, onActionChange, prone, busy, customImages }) => {
  const [choosingWeapon, setChoosingWeapon] = useState(false);
  const listId = useId();
  const listRef = useRef(null);
  const revealWeapons = useCallback(() => listRef.current?.scrollIntoView?.({ block: 'nearest',
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), []);
  useEffect(() => {
    if (choosingWeapon && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) revealWeapons();
  }, [choosingWeapon, revealWeapons]);
  const image = weapon && resolveEquipmentImage(weapon, customImages);
  const imageSources = [...new Set(weapons.map(item => resolveEquipmentImage(item, customImages)).filter(Boolean))];
  const name = weapon?.name || weapon?.nombre;
  const countering = action === 'counterattack';

  return <section className="defensive-excess" aria-label="Aprovechar excedente">
    <div className="defensive-excess-options" role="group" aria-label="Respuesta defensiva">
      <button type="button" aria-label={`Contraatacar · ${surplus}`} aria-pressed={countering}
        disabled={busy || !weapon} onClick={() => { onActionChange('counterattack'); setChoosingWeapon(false); }}>
        <Swords size={22} strokeWidth={1.4} aria-hidden="true" /><span>Contraatacar</span>
      </button>
      <button type="button" aria-label={`Reposicionarse · ${surplus}`} aria-pressed={action === 'reposition'}
        disabled={busy || prone} onClick={() => { onActionChange('reposition'); setChoosingWeapon(false); }}>
        <Footprints size={22} strokeWidth={1.4} aria-hidden="true" /><span>Reposicionarse</span>
      </button>
    </div>
    <div className="defensive-excess-scene" data-response={action || 'none'}>
      {countering && weapon ? <>
        <CounterattackArtwork image={image} sources={imageSources} />
        <div className="defensive-excess-scene-copy">
          <h3>{name}</h3>
          <p className="defensive-excess-effect"><strong>{surplus}</strong><span>Presión</span></p>
          <p className="defensive-excess-note">Sin tirada · Sin defensa activa</p>
        </div>
      </> : action === 'reposition' ? <div className="defensive-excess-scene-copy defensive-excess-movement">
        <Footprints size={42} strokeWidth={1.2} aria-hidden="true" />
        <p className="defensive-excess-effect"><strong>{surplus}</strong><span>{surplus === 1 ? 'casilla' : 'casillas'}</span></p>
        <p className="defensive-excess-note">Sin ataque de oportunidad</p>
        <p className="defensive-excess-instruction">Elige tu posición en el tablero al confirmar.</p>
      </div> : <p className="defensive-excess-note">Puedes continuar sin gastar el excedente.</p>}
    </div>
    {countering && weapons.length > 1 && <div className="defensive-excess-arsenal" data-open={choosingWeapon}>
      <button type="button" className="defensive-excess-weapon-toggle" aria-label="Cambiar arma del contraataque"
        aria-expanded={choosingWeapon} aria-controls={listId} disabled={busy} onClick={() => setChoosingWeapon(value => !value)}>
        <span>Cambiar arma</span><ChevronDown size={17} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="defensive-excess-weapon-fold" id={listId} aria-hidden={!choosingWeapon} inert={!choosingWeapon}
        onTransitionEnd={event => { if (choosingWeapon && event.target === event.currentTarget && event.propertyName === 'grid-template-rows') revealWeapons(); }}>
        <div><div className="defensive-excess-weapons" ref={listRef} role="group" aria-label="Armas para contraatacar">
          {weapons.map(item => {
            const identity = getCanvasWeaponIdentity(item);
            const selected = identity === getCanvasWeaponIdentity(weapon);
            const itemName = item.name || item.nombre;
            const copies = weapons.filter(candidate => (candidate.name || candidate.nombre) === itemName);
            const copy = copies.length > 1 ? copies.findIndex(candidate => getCanvasWeaponIdentity(candidate) === identity) + 1 : null;
            return <button type="button" key={identity} aria-pressed={selected} disabled={busy}
              onClick={() => onWeaponChange(identity)}>
              <span>{itemName}{copy && <small>Ejemplar {copy}</small>}</span>
              {selected && <Check size={17} aria-hidden="true" />}
            </button>;
          })}
        </div></div>
      </div>
    </div>}
    {(prone || !weapon) && <p className="defensive-excess-unavailable">
      {prone && 'Derribado: no puedes reposicionarte.'}{prone && !weapon && ' '}{!weapon && 'Ningún arma alcanza al atacante.'}
    </p>}
  </section>;
};

export default CanvasDefensiveExcess;
