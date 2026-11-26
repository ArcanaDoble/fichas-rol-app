import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { getGridCellWorldRect, getTokenPrimaryGridCell } from '../../tactical-shared/legacyCombatRules';
import './CampaignCombatOverlay.css';
import CanvasAttackPreparation from './CanvasAttackPreparation';
import CampaignThreatTray from './CampaignThreatTray';
import { FocusScope, useTokenAnchor } from './CampaignDirectionalCombat';
import { CampaignDiceChoice, CombatRose, EvasionRose, zoneNames } from './CampaignCombatControls';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { areTokensAllied } from '../../tactical-shared/legacyCombatRules';
import { getCanvasWeaponIdentity } from '../combat/canvasAttackRules';
import { getCampaignEvasionDestinations, getCampaignParryOptions, getCampaignResources,
  validateCampaignAttackResources, validateCampaignDefense, validateCampaignZones } from '../combat/campaignAttackRules';

const toggle = (values, id) => values.includes(id) ? values.filter(value => value !== id) : [...values, id];
const issue = check => { try { check(); return ''; } catch (error) { return error.message; } };

// Each exchange owns its local, uncommitted defense. A new attack (including a
// counter) mounts a fresh choice; only the runtime may spend or resolve it.
export default function CampaignCombatOverlay(props) {
  const id = props.combatRuntime.campaignDraft?.id || props.combatRuntime.campaignPending?.id;
  return <CampaignExchange key={id} {...props} />;
}

function CampaignExchange({ activeScenario, combatRuntime: runtime, isPlayerView, glossary }) {
  const customImages = useCustomEquipmentImages();
  const draft = runtime.campaignDraft, pending = runtime.campaignPending;
  const exchange = draft || pending;
  const items = activeScenario.items || [];
  const attacker = items.find(item => item.id === exchange?.attackerId);
  const target = items.find(item => item.id === exchange?.targetId);
  const point = useTokenAnchor(target?.id);
  const [resourceIds, setResourceIds] = useState([]);
  const [activeZone, setActiveZone] = useState(0);
  const [defenseMode, setDefenseMode] = useState(runtime.campaignPreviewDefenseMode || 'parry');
  const [defenseIds, setDefenseIds] = useState([]);
  const [defenseZones, setDefenseZones] = useState([]);
  const [coverage, setCoverage] = useState(1);
  const [equipment, setEquipment] = useState(null);
  const [destination, setDestination] = useState(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [attackThreat, setAttackThreat] = useState({ customDice: [] });
  const [defenseThreat, setDefenseThreat] = useState({ customDice: [] });
  if (!attacker || !target || !exchange) return null;
  const busy = runtime.campaignBusy;
  const preparing = draft?.phase === 'prepare', aiming = draft?.phase === 'aim';
  const result = pending?.status === 'resolved' ? pending.result : null;
  const canDefend = !draft && pending?.status === 'awaiting-defense' && runtime.campaignCanControl(target);
  const waiting = !draft && !result && !canDefend;
  const options = draft ? runtime.campaignAttackResources : [];
  const selected = draft?.reusedResources ? options.map(r => r.id) : resourceIds;
  const selectedResources = options.filter(r => selected.includes(r.id));
  const preparationIssue = draft ? issue(() => validateCampaignAttackResources(attacker, selectedResources, draft.selection, Boolean(draft.responseTo))) : '';
  const error = runtime.campaignError;
  const feedback = error && <p className="campaign-direction-error" role="alert">{error}
    <button type="button" disabled={busy} onClick={runtime.retryCampaignAttack}>Reintentar</button></p>;
  if (preparing) return <div className="combat-modal-backdrop campaign-direction-preparation polish-preparation">
    <FocusScope className="combat-modal-frame attack-preparation-frame" label="Preparar ataque de Campaña"
      onEscape={!busy ? runtime.cancelAttackDraft : undefined}>
      <div className="combat-details"><CanvasAttackPreparation attacker={attacker} target={target}
        draft={{ ...draft, actionCost: draft.selection.actionCost, attackParts: draft.selection.parts,
          weaponDiceProfile: draft.selection.profile, range: draft.selection.range }}
        isEnemy={attacker.profileType === 'rogueliteEnemy'} customImages={customImages} glossary={glossary}
        combatRuntime={{ cancelAttackDraft: runtime.cancelAttackDraft, isConfirmingAttack: busy,
          confirmAttack: () => runtime.prepareCampaignAttack(selected, attackThreat) }}
        availableActionDice={options.filter(r => !r.spent)} selectedActionDice={selected}
        actionValueOverride={selectedResources.reduce((sum, resource) => sum + resource.value, 0)}
        setSelectedActionDice={setResourceIds} canSubmit={!busy && !preparationIssue}
        resourceSelector={attacker.profileType === 'rogueliteEnemy' || draft.responseTo ? <section aria-label="Recursos del ataque">
          <div className="attack-preparation-dice-heading"><h3>{draft.responseTo ? 'Defensa reutilizada' : options.length > 1 ? 'Acción y Amenaza' : 'Acción básica'}</h3></div>
          <CampaignDiceChoice purpose="attack" options={options} ids={selected} onChange={id => !busy && !draft.responseTo && setResourceIds(toggle(resourceIds, id))} />
          {!isPlayerView && !draft.responseTo && <CampaignThreatTray selection={attackThreat} onChange={setAttackThreat} disabled={busy} />}
          {draft.responseTo && <p className="attack-preparation-note">La respuesta reutiliza el valor defensivo sin volver a gastarlo.</p>}
        </section> : undefined}
        confirmLabel={draft.selection.campaignMode === 'heavy' ? 'Tirar y repartir el golpe' : 'Elegir zona sobre el token'}
        rollNote={draft.selection.campaignMode === 'heavy' ? 'Gastas la acción antes de tirar y repartir los dados completos.' : 'El recurso se gasta cuando fijes la zona en el tablero.'} />
        {feedback}
      </div>
    </FocusScope>
  </div>;

  const parryOptions = pending ? getCampaignParryOptions(target, pending) : [];
  const gear = equipment || parryOptions.slice(0, 1).map(option => option.id);
  const defenseResources = getCampaignResources(target, runtime.combatState, true);
  const destinations = getCampaignEvasionDestinations(target, items, runtime.campaignGridConfig);
  const defense = { defense: defenseMode, ids: defenseIds, zones: defenseZones.slice(0, coverage), equipmentIds: gear, destination,
    customDice: defenseMode === 'receive' ? [] : defenseThreat.customDice };
  const defenseIssue = canDefend ? issue(() => validateCampaignDefense({ ...defense, pending, target,
    extraResources: defense.customDice.map((sides, i) => ({ id: `custom-${i}`, kind: 'threat', value: 0 })),
    combat: runtime.combatState, items, gridConfig: runtime.campaignGridConfig })) : '';
  const zoneIssue = aiming ? issue(() => validateCampaignZones(draft.selection, draft.zones, draft.assignments, draft.heavyDice)) : '';
  const phase = aiming ? 'aim' : result ? 'result' : 'defense';
  const zones = aiming ? draft.zones : defenseZones;
  const zoneIndex = Math.min(activeZone, aiming ? (draft.selection.campaignMode === 'single' ? 0 : 1) : coverage - 1);
  const changeZone = zone => {
    if (busy || draft?.frozen) return;
    const next = [...zones]; next[zoneIndex] = zone;
    if (aiming) runtime.updateCampaignDraft({ zones: next }); else setDefenseZones(next);
  };
  const showRose = aiming || result || (canDefend && defenseMode === 'parry');
  const friendly = areTokensAllied(attacker, target);
  const maySeeLife = !isPlayerView || runtime.campaignCanControl(target);
  const maySeeAttack = !isPlayerView || runtime.campaignCanControl(attacker);
  const counterWeapons = result?.counter && runtime.campaignCanControl(target) ? runtime.getCampaignCounterWeapons() : [];
  const zoneCount = aiming ? draft.selection.campaignMode === 'single' ? 1 : 2 : coverage;
  const choosePart = zoneCount > 1 && <div className="campaign-zone-parts" role="group" aria-label="Zona que estás eligiendo">
    {Array.from({ length: zoneCount }, (_, i) => <button type="button" key={i} aria-pressed={zoneIndex === i}
      disabled={busy || draft?.frozen} onClick={() => setActiveZone(i)}>
      {aiming && draft.selection.campaignMode === 'dual' ? draft.selection.parts[i].weapon.name : `Zona ${i + 1}`}
      <strong>{zoneNames[zones[i]] || 'Elegir'}</strong></button>)}
  </div>;
  const canDouble = parryOptions.some(option => option.double || option.pairs.length)
    || parryOptions.filter(option => resolveEquipmentHandsRequired(option.item) === 1).length > 1;
  const weapon = draft?.weapon || pending.weapon;
  const weaponImage = resolveEquipmentImage(weapon, customImages);
  const selectedZone = zoneNames[zones[zoneIndex]];
  const sumDefense = defenseResources.filter(r => defenseIds.includes(r.id)).reduce((sum, r) => sum + r.value, 0);
  const description = aiming ? selectedZone || 'Elige la zona sobre el objetivo'
    : canDefend && defenseMode === 'parry' ? selectedZone ? `Proteges ${selectedZone.toLowerCase()}` : 'Elige dónde parar sobre el token'
      : canDefend && defenseMode === 'evade' ? destination ? `${destination.label} · una casilla` : 'Elige una dirección libre sobre el token'
        : canDefend ? 'Recibes el golpe sin gastar defensa' : result ? result.title : 'Esperando la defensa';
  const primary = aiming ? friendly ? 'Atacar a aliado' : 'Fijar ataque' : canDefend ? 'Revelar y resolver' : 'Volver al Canvas';
  const valid = aiming ? !zoneIssue : canDefend ? !defenseIssue : true;
  const action = aiming ? runtime.commitCampaignAttack : canDefend ? () => runtime.commitCampaignDefense(defense) : runtime.closeCampaignAttack;
  return <FocusScope className="campaign-direction-stage polish-stage" focusKey={`${phase}:${defenseMode}:${zoneIndex}`}
    label={aiming ? 'Elegir zona de ataque' : result ? 'Resultado del intercambio' : canDefend ? 'Defender ataque' : 'Intercambio en curso'}
    onEscape={!busy && aiming && !draft.prepaid && !draft.frozen ? () => runtime.updateCampaignDraft({ phase: 'prepare' }) : result ? runtime.closeCampaignAttack : undefined}>
    {point && showRose && <div className="campaign-direction-anchor" style={{ left: point.x, top: point.y }}>
      <CombatRose phase={phase} value={zones[zoneIndex]} onChange={changeZone}
        attackZone={result ? pending.reveal.zones : undefined} defenseZone={result ? pending.defense.zones : undefined}
        defense={pending?.defense?.mode || defenseMode} matched={Boolean(result?.parried)} />
    </div>}
    {point && canDefend && defenseMode === 'evade' && <>
      <EvasionDestination target={target} destination={destination} gridConfig={runtime.campaignGridConfig} />
      <div className="campaign-direction-anchor" style={{ left: point.x, top: point.y }}>
        <EvasionRose destinations={destinations} value={destination} onChange={setDestination} disabled={busy} />
      </div>
    </>}
    <div className="campaign-direction-dock combat-details noma-area-controls polish-dock" data-phase={phase} data-defense={defenseMode}>
      <div className="polish-weapon-scene" data-stage={phase}>
        {weaponImage && <img className="polish-weapon-art" src={weaponImage} alt="" />}
        <div className="polish-weapon-copy">
          <p className="polish-duel">{attacker.name}<span>→</span>{target.name}</p>
          <h3>{weapon.name || weapon.nombre}</h3>
          <p className="polish-profile">{aiming ? `${draft.actionValue} de acción + ${weapon.dano}${draft.customThreatDice?.length ? ' + Amenaza al fijar' : ''}` : result ? 'Intercambio resuelto' : maySeeAttack ? `${pending.actionValue} de acción · zona oculta` : 'Recursos del atacante reservados'}</p>
        </div>
      </div>
      {canDefend && <div className="polish-defense-tabs" role="group" aria-label="Tipo de defensa">
        {[['parry', 'Parry'], ['evade', 'Evasión'], ['receive', 'Recibir']].map(([id, label]) => <button type="button" key={id}
          disabled={busy} aria-pressed={defenseMode === id} onClick={() => {
            setDefenseMode(id); setDefenseIds([]); setDefenseZones([]); setDestination(null); setActiveZone(0);
          }}>{label}</button>)}
      </div>}
      <div className="polish-decision">
        {aiming ? <>
          {choosePart}
          {draft.heavyDice && <div className="campaign-heavy-dice" role="group" aria-label="Reparto de dados completos">
            {draft.heavyDice.map((die, i) => <button type="button" key={i} disabled={busy || draft.frozen}
              onClick={() => runtime.updateCampaignDraft({ assignments: draft.assignments.map((v, j) => j === i ? 1 - v : v) })}>
              <span>{die.kind === 'action' ? 'Acción' : die.die} <strong>{die.value}</strong></span>
              <small>{zoneNames[zones[draft.assignments[i]]] || `Zona ${draft.assignments[i] + 1}`}</small></button>)}
          </div>}
          <p className="polish-choice" aria-live="polite">{description}<small>Elección secreta</small></p>
          {friendly && <p className="polish-friendly">Objetivo aliado · {target.name}</p>}
        </> : canDefend ? <>
          {defenseMode !== 'receive' && <>
            {defenseMode === 'parry' && (parryOptions.length > 1 || canDouble) && <div className="polish-equipment" role="group" aria-label="Equipo para parar">
              {parryOptions.map(option => <button type="button" key={option.id} disabled={busy} aria-pressed={gear.includes(option.id)}
                onClick={() => setEquipment(toggle(gear, option.id))}>{option.name}</button>)}
              {canDouble && <button type="button" disabled={busy} aria-pressed={coverage === 2}
                onClick={() => { setCoverage(coverage === 1 ? 2 : 1); setDefenseZones([]); setActiveZone(0); }}>Dos zonas</button>}
            </div>}
            <CampaignDiceChoice options={defenseResources} ids={defenseIds} onChange={id => !busy && setDefenseIds(toggle(defenseIds, id))} />
            {!isPlayerView && target.profileType === 'rogueliteEnemy' && <CampaignThreatTray selection={defenseThreat} onChange={setDefenseThreat} disabled={busy} />}
            {defenseMode === 'parry' && choosePart}
          </>}
          <p className="polish-choice" aria-live="polite">{description}</p>
          <p className="polish-help">{defenseIds.length && defenseMode !== 'receive' && defenseIssue && (destination || defenseZones.length)
            ? defenseIssue : defenseMode === 'evade' ? maySeeAttack ? `Defensa ${sumDefense} · Acción ${pending.actionValue}` : `Tu defensa: ${sumDefense}${defense.customDice.length ? ' + Amenaza al confirmar' : ''} · Resultado al resolver`
              : defenseMode === 'parry' ? 'Acertar la zona detiene el golpe, incluso con un valor menor.' : 'La armadura reducirá el Impacto.'}</p>
        </> : result ? <div className="polish-result" aria-live="polite">
          <h3>{result.damage ? <><strong>{result.damage}</strong> de daño</> : result.parried ? 'Golpe detenido' : 'Sin daño'}</h3>
          <div className="campaign-reveal-legend" aria-label="Zonas del intercambio">
            <span className="campaign-reveal-attack"><i aria-hidden="true" />Ataque: {pending.reveal.zones.map(zone => zoneNames[zone]).join(' + ')}</span>
            {pending.defense.mode === 'parry' && <span className="campaign-reveal-parry"><i aria-hidden="true" />Parry: {pending.defense.zones.map(zone => zoneNames[zone]).join(' + ')}</span>}
          </div>
          {maySeeLife && <p>{target.name} <strong>{result.before} → {result.after}</strong> Vida</p>}
          {pending.defense.mode === 'evade' && <p>{result.evaded ? 'Evasión lograda' : 'Evasión fallida'}</p>}
          {maySeeAttack && result.hits.map((hit, i) => <small key={i}>{hit.cancelled ? 'Golpe detenido · no se tira el arma' : `Impacto ${hit.impact} − RD ${hit.rd} = ${hit.damage} de daño`}</small>)}
        </div> : waiting ? <div className="polish-result" aria-live="polite">
          <h3>{pending?.status === 'awaiting-defense' ? `${target.name} elige su defensa` : pending?.status === 'awaiting-zones' ? `${attacker.name} reparte su golpe` : 'Revelando el intercambio…'}</h3>
          <p>{pending?.status === 'awaiting-reveal' ? 'Esperando al navegador del atacante.' : 'Las zonas se revelarán tras fijar la defensa.'}</p>
        </div> : null}
        {feedback}
      </div>
      {counterOpen && <div className="campaign-counter-weapons" role="group" aria-label="Arma del contraparry">
        {counterWeapons.map(item => <button type="button" key={getCanvasWeaponIdentity(item)} disabled={busy}
          onClick={() => runtime.beginCampaignCounter(item)}><img src={resolveEquipmentImage(item, customImages)} alt="" />
          <span>{item.name}<small>{item.dano} · reutiliza tu defensa</small></span></button>)}
      </div>}
      {!waiting && <footer className="polish-actions">
        <button type="button" className="attack-preparation-confirm" disabled={busy || !valid} onClick={action}>{busy ? 'Guardando…' : primary}</button>
        {aiming && !draft.prepaid && !draft.frozen && <button type="button" className="polish-secondary" disabled={busy}
          onClick={() => runtime.updateCampaignDraft({ phase: 'prepare' })}>Volver al dado</button>}
        {aiming && !draft.prepaid && <button type="button" className="polish-secondary" disabled={busy} onClick={runtime.cancelAttackDraft}>Cancelar</button>}
        {canDefend && !isPlayerView && <button type="button" className="polish-secondary" disabled={busy}
          onClick={runtime.cancelPendingAttack}>Cancelar y devolver</button>}
        {counterWeapons.length > 0 && !counterOpen && <button type="button" className="polish-secondary" disabled={busy}
          onClick={() => setCounterOpen(true)}>Contraparry</button>}
      </footer>}
      {waiting && !isPlayerView && <button type="button" className="polish-secondary polish-wait-cancel" disabled={busy}
        onClick={runtime.cancelPendingAttack}>Cancelar y devolver recursos</button>}
    </div>
  </FocusScope>;
}

function EvasionDestination({ target, destination, gridConfig }) {
  if (!destination) return null;
  const item = document.querySelector(`[data-board-item-id="${target.id}"]`);
  if (!item?.parentElement) return null;
  const moved = { ...target, ...destination.position };
  const cell = getTokenPrimaryGridCell(moved, gridConfig);
  const rect = getGridCellWorldRect(cell, gridConfig);
  return createPortal(<div className="polish-evasion-destination" aria-hidden="true" style={{ left: rect.x, top: rect.y,
    width: Math.max(gridConfig.cellWidth, target.width), height: Math.max(gridConfig.cellHeight, target.height) }}>
    <span>Destino si evades</span>
  </div>, item.parentElement);
}
