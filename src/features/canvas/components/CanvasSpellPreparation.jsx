import React, { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import ActionDieSvg from '../../../components/ActionDieSvg';
import LoadingImage, { preloadImage } from '../../../components/LoadingImage';
import { getCanvasWeaponIdentity, parseWeaponDiceProfile } from '../combat/canvasAttackRules';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getArcaneBarrierResonance } from '../spells/arcaneBarrierRules';
import { ARCANE_BARRIER_PROTECTION_NAMES } from '../spells/arcaneBarrierState';
import './CanvasPotionPreparation.css';
import './CanvasSpellPreparation.css';

const CanvasSpellPreparation = ({ system, customImages }) => {
  const session = system?.session;
  const image = resolveEquipmentImage(session?.item, customImages);
  useEffect(() => { preloadImage(image); }, [image]);
  if (session?.phase !== 'prepare') return null;
  const token = system.sourceToken;
  const projectile = session.definitionId === 'arcane-projectile';
  const mist = session.definitionId === 'arcane-mist';
  const barrier = session.definitionId === 'runic-barrier';
  const support = mist || barrier;
  const name = barrier ? 'Barrera rúnica' : mist ? 'Niebla arcana' : projectile ? session.item?.name || session.item?.nombre || 'Proyectil arcano' : 'Bola de fuego';
  const mana = Number(token?.stats?.recurso?.current) || 0;
  const manaMaximum = Number(token?.stats?.recurso?.max) || 3;
  const catalyst = system.catalysts.find(item => getCanvasWeaponIdentity(item) === session.catalystId);
  const profile = parseWeaponDiceProfile(catalyst);
  const mixedDice = new Set(profile.map(die => die.sides)).size !== 1;
  const conservationUsed = system.conservationUsed;
  const selectedDie = system.resources.find(die => die.id === session.actionDieId && die.status === 'available');
  const manaCost = session.manaSpend + Number(session.conserve);
  const pressureDice = [...profile, ...(!projectile && session.manaSpend && profile[0] ? [profile[0]] : [])]
    .map(die => die.die).join(' + ') || 'Catalizador';
  const ready = Boolean(selectedDie && catalyst) && manaCost <= mana;
  return <section className="potion-preparation spell-preparation" aria-label={`Preparar ${name}`}>
    <div className="potion-preparation-scroll custom-scrollbar">
      <header className="potion-preparation-header">
        {image && <div className="potion-preparation-image" aria-hidden="true"><LoadingImage src={image} alt="" skeleton={false}
          draggable={false} imageClassName="potion-preparation-art" /></div>}
        <button className="potion-preparation-close" type="button" onClick={system.cancel} aria-label="Cerrar preparación del conjuro"><X size={20} /></button>
        <span className="potion-preparation-eyebrow">{token?.name || 'Mago'}</span>
        <h2>{name}</h2>
        <p className="potion-preparation-effect spell-preparation__effect">{barrier ? <>Protección · <strong>+1 CD</strong></> : mist ? <>Humo · <strong>{session.manaSpend ? '3×3' : '2×2'}</strong></> : projectile ? 'Rastreador · Sin defensa activa' : <>Área <strong>2×2</strong> · Fuego amigo</>}</p>
      </header>
      <p className="potion-preparation-note potion-preparation-duration">{barrier
        ? 'Sobre ti o un aliado visible. Hasta el final del combate. Las Barreras no se acumulan.' : mist
        ? 'Hasta el final del combate. Bloquea la visión entre dentro y fuera para ambos bandos; dentro de la misma nube podéis veros.' : projectile
        ? 'Ignora Cobertura. Puede rodear obstáculos si existe un recorrido abierto y el enemigo está localizado.'
        : 'Una Presión compartida. Cada criatura resuelve su CD y defensa.'}</p>
      <div className="potion-preparation-health spell-preparation__mana" aria-label={`Maná: ${mana} de ${manaMaximum}`}
        style={{ '--potion-life': token?.stats?.recurso?.color || '#a77bd4' }}>
        <span>Maná</span>
        <span className="potion-preparation-blocks" aria-hidden="true">
          {Array.from({ length: Math.min(manaMaximum, 3) }, (_, index) => <i key={index} data-filled={index < mana} />)}
        </span>
        <span>{mana} <span className="potion-preparation-max">/ {manaMaximum}</span></span>
      </div>
      <div className="potion-preparation-costs" role="group" aria-label="Dado de acción del conjuro">
        <p className="potion-preparation-prompt">Elige qué gastar</p>
        <div className="potion-preparation-resources" style={{ '--potion-resource-columns': Math.min(3, Math.max(1, system.resources.length)) }}>
          {system.resources.map(die => <button key={die.id} type="button" className="potion-preparation-resource" disabled={die.status !== 'available'}
            aria-pressed={session.actionDieId === die.id} aria-label={`Usar d${die.sides} de valor ${die.value}`}
            title={support ? 'Gasta este dado de acción; su valor se ignora.' : `+${die.value} Presión`}
            onClick={() => system.configure({ actionDieId: session.actionDieId === die.id ? null : die.id })}>
            <ActionDieSvg faces={die.sides} value={die.value} selected={session.actionDieId === die.id}
              connectedFaces={die.sides === 20} accent={die.status === 'available' ? 'gold' : 'slate'}
              status={die.status === 'available' ? 'available' : 'spent'} />
            <span className="potion-preparation-resource-name">d{die.sides}</span>
            <span className="potion-preparation-resource-state">{die.status === 'available'
              ? (session.actionDieId === die.id ? 'Para lanzar' : 'Disponible') : 'Agotado'}</span>
          </button>)}
        </div>
      </div>
      <div className="spell-preparation__catalysts" role="group" aria-label="Catalizador del conjuro">
        {system.catalysts.map(item => <button key={getCanvasWeaponIdentity(item)} type="button"
          aria-pressed={session.catalystId === getCanvasWeaponIdentity(item)}
          onClick={() => system.configure({ catalystId: getCanvasWeaponIdentity(item), manaSpend: 0 })}>
          <span>{item.name || item.nombre}</span><small>{support ? 'Alcance' : item.dano || item.damage} · {item.alcance || item.alc || item.range}</small>
        </button>)}
      </div>
      {barrier && getArcaneBarrierResonance(catalyst).length > 0 && <p className="potion-preparation-note spell-preparation__resonance">
        Resonancia · Neutraliza {getArcaneBarrierResonance(catalyst).map(trait => ARCANE_BARRIER_PROTECTION_NAMES[trait]).join(' y ')}
      </p>}
      <div className="spell-preparation__enhancements">
        <button type="button" aria-pressed={session.manaSpend === 1}
          disabled={!session.manaSpend && ((!projectile && !support && mixedDice) || mana < 1 + Number(session.conserve))}
          onClick={() => system.configure({ manaSpend: session.manaSpend ? 0 : 1 })}>
          <strong>{barrier ? 'Adaptación' : mist ? 'Extensión' : projectile ? 'Cadena arcana' : 'Intensificación'} · 1 Maná</strong><span>{barrier
            ? 'Añade protección contra Conmoción.' : mist
            ? 'Amplía el área a 3×3. Misma nube, misma duración.' : projectile
            ? 'Tras el impacto, elige otro enemigo desde el primer objetivo. Vuelve a tirar el Catalizador.'
            : mixedDice ? 'Falta definir el dado base' : `Añade ${profile[0]?.die || 'un dado del Catalizador'} · El área no aumenta`}</span>
        </button>
        {Number(token?.level || 1) >= 2 && <button type="button" aria-pressed={session.conserve}
          disabled={!session.conserve && (conservationUsed || mana < 1 + session.manaSpend)}
          onClick={() => system.configure({ conserve: !session.conserve })}>
          <strong>Conservación arcana · 1 Maná</strong><span>{conservationUsed ? 'Usada en este combate' : 'Conserva esta copia · Una vez por combate'}</span>
        </button>}
      </div>
    </div>
    <footer className="potion-preparation-footer">
      <p className="potion-preparation-note" aria-live="polite">{selectedDie
        ? `${support ? 'Dado de acción · Valor ignorado' : `Presión: ${pressureDice} + ${selectedDie.value}`} · ${session.conserve ? 'Copia conservada' : '1 copia'} · ${manaCost} Maná`
        : 'Elige un dado de acción para lanzar.'}</p>
      <button className="potion-preparation-confirm" type="button" disabled={!ready} onClick={system.prepareArea}>{barrier || projectile ? 'Elegir objetivo' : mist ? `Elegir área ${session.manaSpend ? '3×3' : '2×2'}` : 'Elegir área 2×2'}<ArrowRight size={21} aria-hidden="true" /></button>
    </footer>
  </section>;
};

export default CanvasSpellPreparation;
