import CampaignCombatOverlay from './CampaignCombatOverlay';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { preloadImage } from '../../../components/LoadingImage';
import { resolveCombatHudObjects } from '../../../utils/combatHudObjects';
import { getCanvasPreparedSpells, isCanvasMage } from '../spells/canvasSpells';
import { isSpellResolutionDeferred } from '../spells/canvasSpellPresentation';
import {
  isCanvasProne,
  getEnemyActiveDefenseEligibility,
  getCanvasDefensiveEquipment,
  getDefaultCanvasEnemyDefenseSelection,
  resolveCanvasEnemyDefenseSelection,
  toggleCanvasEnemyDefenseEquipment,
  isCanvasShield,
  getCanvasWeaponIdentity,
  evaluateCanvasThrownRange,
  getCanvasEquippedWeapons,
  getUsableDefenseDice,
  getCanvasDefenseThreatDice,
  resolveCanvasAttackDamage,
} from '../combat/canvasAttackRules';

import {
  ActionDieButton, DefenseEquipmentChoice, DefenseRollSummary,
  IncomingAttackSummary,
} from './CanvasCombatDetails';
import CanvasAttackPreparation from './CanvasAttackPreparation';
import CanvasAttackDefense from './CanvasAttackDefense';
import CanvasCunningChoice from './CanvasCunningChoice';
import CanvasBleedingChoice from './CanvasBleedingChoice';
import { isCanvasCunningPending } from '../combat/canvasCunning';
import EnemyThreatDice from './EnemyThreatDice';

const ModalFrame = ({ children, variant }) => {
  const frame = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    frame.current?.focus();
    return () => previousFocus?.isConnected && previousFocus.focus?.();
  }, []);
  useEffect(() => {
    if (document.activeElement === document.body) frame.current?.focus();
  });
  const containFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...frame.current.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === frame.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === frame.current)) {
      event.preventDefault(); first.focus();
    }
  };
  return <div className="combat-modal-backdrop">
    <section ref={frame} role="dialog" aria-modal="true" aria-label="Resolución de combate" tabIndex={-1}
      onKeyDown={containFocus} data-testid="canvas-combat-action-modal" className={`combat-modal-frame${variant === 'prepare' ? ' attack-preparation-frame' : variant === 'defense' ? ' attack-defense-frame' : ''}`}>
      <div className="combat-details">{children}</div>
    </section>
  </div>;
};

const EncounterHeading = ({ title, attacker, target, onCancel, busy }) => (
  <header className="combat-modal-heading">
    <h2>{title}</h2>
    <div className="combat-duel" aria-label={`${attacker?.name || 'Atacante'} contra ${target?.name || 'Objetivo'}`}>
      <span className="combat-duelist">
        {(attacker?.portrait || attacker?.img) && <img src={attacker.portrait || attacker.img} alt="" />}
        <strong>{attacker?.name}</strong>
      </span>
      <span className="combat-duel-divider" aria-hidden="true">VS</span>
      <span className="combat-duelist">
        <strong>{target?.name}</strong>
        {(target?.portrait || target?.img) && <img src={target.portrait || target.img} alt="" />}
      </span>
    </div>
    {onCancel && <button type="button" className="combat-close" disabled={busy} onClick={onCancel} aria-label="Cancelar ataque"><X size={20} /></button>}
  </header>
);

const AttackAdjustment = ({ pending, participant, onConfirm, customImages }) => {
  const [previousId, setPreviousId] = useState(pending.actionDice[0]?.id);
  const [nextId, setNextId] = useState(null);
  return <ModalFrame>
    <EncounterHeading title="Ajuste del ataque" attacker={{ name: pending.attackerName }} target={{ name: pending.targetName }} />
    <div className="combat-modal-body custom-scrollbar">
      <div className="combat-defense-layout">
      <div className="combat-overview">
      <IncomingAttackSummary pending={pending} customImages={customImages} />
      </div>
      <div className="combat-adjustment-controls">
      <p className="combat-help">Puedes sustituir un dado de acción. La tirada de armas se conserva.</p>
      <div className="combat-section-heading"><h3>Dado que devuelves</h3></div>
      <div className="combat-dice-tray">{pending.actionDice.map(die => <ActionDieButton key={die.id} die={die} selected={previousId === die.id} onClick={() => setPreviousId(die.id)} />)}</div>
      <div className="combat-section-heading"><h3>Dado disponible</h3></div>
      <div className="combat-dice-tray">{(participant?.actionDice || []).filter(die => die.status === 'available').map(die => <ActionDieButton key={die.id} die={die} selected={nextId === die.id} onClick={() => setNextId(die.id)} />)}</div>
      </div>
      </div>
    </div>
    <footer className="combat-modal-footer combat-adjustment-footer">
      <button className="combat-confirm" disabled={!nextId} onClick={() => onConfirm({ replaceDieId: previousId, withDieId: nextId })}>Sustituir y continuar</button>
      <button className="combat-confirm" onClick={() => onConfirm({})}>Conservar dados y continuar</button>
    </footer>
  </ModalFrame>;
};

const resolveEquippedArmor = (token = {}) => {
  const equipped = token.equippedItems;
  const items = Array.isArray(equipped) ? equipped : [];
  const armor = items.find((item) => {
    const type = String(item?.type || item?.itemType || item?._category || item?.category || '').toLowerCase();
    return item?.canvasSlot === 'body' || ['armor', 'armadura', 'armaduras'].includes(type);
  });
  if (armor) return armor;

  const loadout = token.equipmentLoadout || (!Array.isArray(equipped) ? equipped : null);
  return loadout?.body || null;
};

const resolveDefenseAppearance = (token, customImages) => {
  if (!token) return { name: '', image: null };
  if (token.profileType === 'rogueliteEnemy') {
    return { name: token.name, image: token.portrait || token.img || null };
  }
  const armor = resolveEquippedArmor(token);
  return {
    name: armor?.name || armor?.nombre || '',
    image: armor ? resolveEquipmentImage(armor, customImages) : null,
  };
};

const RogueliteCombatActionModal = ({ activeScenario, combatRuntime, isPlayerView, glossary = [] }) => {
  const customEquipmentImages = useCustomEquipmentImages();
  const draft = combatRuntime?.attackDraft;
  const pending = combatRuntime?.pendingAttack;
  const [selectedActionDice, setSelectedActionDice] = useState([]);
  const [selectedDefenseDice, setSelectedDefenseDice] = useState([]);
  const [attackThreatSelection, setAttackThreatSelection] = useState({ useStored: false, customDice: [] });
  const [enemyDefenseSelection, setEnemyDefenseSelection] = useState(null);
  const [enemyThreatSelection, setEnemyThreatSelection] = useState({ useStored: false, customDice: [] });

  const items = activeScenario?.items || [];
  const participants = combatRuntime?.combatState?.participants;
  const controlledTokenIds = combatRuntime?.controlledTokenIds;
  const attacker = draft ? items.find((item) => item.id === draft.attackerId) : null;
  const target = draft ? items.find((item) => item.id === draft.targetId) : null;
  const attackerParticipant = draft ? combatRuntime?.combatState?.participants?.[draft.attackerId] : null;
  const pendingTarget = pending ? items.find((item) => item.id === pending.targetId) : null;
  const pendingTargetParticipant = pending
    ? combatRuntime?.combatState?.participants?.[pending.targetId]
    : null;
  const canResolvePending = Boolean(
    pending
    && !isCanvasCunningPending(pending)
    && pending.status !== 'awaiting-adjustment'
    && (
      isPlayerView
        ? combatRuntime?.controlledTokenIds?.includes(pending.targetId)
        : true
    ),
  );

  useEffect(() => {
    // The defender's client has no attack draft; warm its art before a reaction
    // arrives, while the always-mounted modal is still closed.
    const tokenIds = new Set([pending?.targetId, draft?.targetId, ...Object.keys(participants || {})]);
    const sources = new Set(items.filter(item => tokenIds.has(item.id))
      .map(token => resolveDefenseAppearance(token, customEquipmentImages).image).filter(Boolean));
    // Warm the HUD before selecting a character or opening a category, including
    // practice mode where there are no combat participants yet.
    const controlled = new Set(controlledTokenIds || []);
    items.filter(token => !isPlayerView || controlled.has(token.id)).forEach(token => {
      const illustratedItems = [
        ...resolveCombatHudObjects(token),
        ...(isCanvasMage(token) ? getCanvasPreparedSpells(token).filter(Boolean).map(spell => spell.item) : []),
      ];
      illustratedItems.forEach(item => {
        const src = resolveEquipmentImage(item, customEquipmentImages);
        if (src) sources.add(src);
      });
    });
    sources.forEach(src => { void preloadImage(src); });
  }, [items, participants, customEquipmentImages, draft?.targetId, pending?.targetId, controlledTokenIds, isPlayerView]);

  useEffect(() => {
    setSelectedActionDice([]);
    setAttackThreatSelection({ useStored: false, customDice: [] });
  }, [
    draft?.attackerId,
    draft?.targetId,
  ]);
  useEffect(() => setSelectedDefenseDice([]), [pending?.id]);
  useEffect(() => {
    setEnemyDefenseSelection(null);
    setEnemyThreatSelection({ useStored: false, customDice: [] });
  }, [pending?.id]);

  const availableActionDice = useMemo(() => (
    (attackerParticipant?.actionDice || []).filter((die) => die.status === 'available')
  ), [attackerParticipant?.actionDice]);

  if (isSpellResolutionDeferred(combatRuntime?.spellPresentation, pending)) return null;

  if (combatRuntime?.pendingBleedingToken) {
    return <ModalFrame variant="defense"><CanvasBleedingChoice token={combatRuntime.pendingBleedingToken}
      onChoose={combatRuntime.chooseBleeding} busy={combatRuntime.isResolvingBleeding} /></ModalFrame>;
  }
  if (isCanvasCunningPending(pending)) {
    if (isPlayerView && !combatRuntime.controlledTokenIds?.includes(pending.attackerId)) return null;
    return <ModalFrame variant="defense"><CanvasCunningChoice key={pending.id} pending={pending}
      attacker={items.find(item => item.id === pending.attackerId)} customImages={customEquipmentImages}
      onResolve={combatRuntime.resolveCunning} busy={combatRuntime.isResolvingCunning} /></ModalFrame>;
  }
  if (pending?.status === 'awaiting-adjustment') {
    if (isPlayerView && !combatRuntime.controlledTokenIds?.includes(pending.attackerId)) return null;
    return <AttackAdjustment key={pending.id} pending={pending} participant={combatRuntime.combatState?.participants?.[pending.attackerId]}
      onConfirm={combatRuntime.finishAttackAdjustment} customImages={customEquipmentImages} />;
  }
  if (!draft && (!pending || !canResolvePending)) return null;

  if (pending && canResolvePending) {
    const defenseAppearance = resolveDefenseAppearance(pendingTarget, customEquipmentImages);
    const isEnemyTarget = pendingTarget?.profileType === 'rogueliteEnemy';
    const preventsActiveDefense = Boolean(pending.weapon?.preventsActiveDefense);
    const enemyDefense = isEnemyTarget
      ? preventsActiveDefense ? { eligible: false, reason: 'Proyectil arcano impide la defensa activa. Conservas la protección pasiva.' }
        : getEnemyActiveDefenseEligibility({ token: pendingTarget, participant: pendingTargetParticipant })
      : null;
    const storedThreatValue = pendingTargetParticipant?.threatValue;

    if (isEnemyTarget) {
      const defenseWasRolled = pending.status === 'defense-rolled';
      const equipment = getCanvasDefensiveEquipment(pendingTarget);
      const requestedIds = enemyDefenseSelection?.attackId === pending.id
        ? enemyDefenseSelection.ids : getDefaultCanvasEnemyDefenseSelection(pendingTarget);
      // Passive protection remains usable even when the main action is spent.
      const equipmentIds = requestedIds.filter(id => equipment.some(item => getCanvasWeaponIdentity(item) === id
        && (enemyDefense?.eligible || isCanvasShield(item))));
      const selectedEquipment = resolveCanvasEnemyDefenseSelection({ token: pendingTarget, equipmentIds });
      const willDefend = enemyDefense?.eligible && selectedEquipment.legal && selectedEquipment.weapons.length > 0;
      const enemyPreview = resolveCanvasAttackDamage({
        attackPressure: pending.pressure?.total,
        defenseDice: defenseWasRolled ? [...(pending.defenseDice || []), ...getCanvasDefenseThreatDice(pending)] : [],
        target: pendingTarget, weapon: pending.weapon, suppressTraits: pending.range?.suppressTraits,
        defenseCdBonus: defenseWasRolled ? pending.defenseCdBonus : selectedEquipment.cdBonus,
      });
      const remainingPressure = enemyPreview.finalPressure;
      return (
        <ModalFrame variant="defense">
          <CanvasAttackDefense key={pending.id} glossary={glossary}
            pending={pending} attacker={items.find(item => item.id === pending.attackerId)} target={pendingTarget}
            customImages={customEquipmentImages} threatDie={combatRuntime.combatState?.participants?.[pending.attackerId]?.threatDie}
            preview={enemyPreview} isEnemy showProtection={!isPlayerView}
            counterWeapons={combatRuntime.getCounterattackWeapons?.() || []} prone={isCanvasProne(pendingTarget)}
            preferredCounterWeaponId={getCanvasWeaponIdentity(combatRuntime.getPreferredCounterattackWeapon?.() || {}) || null}
            onResolveExcess={options => combatRuntime.resolvePendingAttack([], options)}
            armorName={defenseAppearance.name} armorImage={defenseAppearance.image}
            forecast={!defenseWasRolled && willDefend}
            actions={!defenseWasRolled ? (
              <button type="button" className="combat-confirm" disabled={combatRuntime.isRollingEnemyDefense || !selectedEquipment.legal} data-tone={willDefend ? 'defend' : 'damage'}
                onClick={() => willDefend
                  ? combatRuntime.rollEnemyDefense({ equipmentIds, threatSelection: enemyThreatSelection })
                  : combatRuntime.resolvePendingAttack([], { equipmentIds })}>
                <span>{combatRuntime.isRollingEnemyDefense ? 'Confirmando…' : willDefend ? 'Confirmar defensa' : 'Recibir ataque'}</span><ArrowRight size={20} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={() => combatRuntime.resolvePendingAttack([])} className="combat-confirm"><span>{remainingPressure > 0 ? 'Aplicar ataque' : 'Anular ataque'}</span><ArrowRight size={20} aria-hidden="true" /></button>
            )}
          >
            {!defenseWasRolled ? <>
              {equipment.length > 0 && <section>
                <div className="combat-section-heading"><h3>Equipo defensivo</h3><span>{willDefend ? 'Una acción principal' : selectedEquipment.shield ? 'Protección pasiva' : 'Sin defensa activa'}</span></div>
                <div className="attack-defense-choices">
                  {equipment.map(item => {
                    const identity = getCanvasWeaponIdentity(item);
                    const copies = equipment.filter(candidate => (candidate.name || candidate.nombre) === (item.name || item.nombre));
                    const copyLabel = copies.length > 1 ? `Ejemplar ${copies.findIndex(candidate => getCanvasWeaponIdentity(candidate) === identity) + 1}` : '';
                    return <DefenseEquipmentChoice key={identity} item={item} selected={equipmentIds.includes(identity)}
                      disabled={combatRuntime.isRollingEnemyDefense || (!enemyDefense?.eligible && !isCanvasShield(item))}
                      customImages={customEquipmentImages} glossary={glossary} copyLabel={copyLabel}
                      onClick={() => setEnemyDefenseSelection({ attackId: pending.id,
                        ids: toggleCanvasEnemyDefenseEquipment({ token: pendingTarget, equipmentIds, itemId: identity }) })} />;
                  })}
                </div>
              </section>}
              {!selectedEquipment.legal && <p className="attack-defense-note">{selectedEquipment.reason}</p>}
              {!enemyDefense?.eligible && <p className="attack-defense-note">{enemyDefense?.reason}</p>}
              {enemyDefense?.eligible && <EnemyThreatDice selection={enemyThreatSelection} onChange={setEnemyThreatSelection}
                storedThreatValue={storedThreatValue} storedThreatDie={pendingTargetParticipant?.threatDie}
                disabled={!willDefend || combatRuntime.isRollingEnemyDefense} busy={combatRuntime.isRollingEnemyDefense} />}
            </>
              : <DefenseRollSummary pending={pending} />}
          </CanvasAttackDefense>
        </ModalFrame>
      );
    }

    const defenseDice = preventsActiveDefense ? [] : getUsableDefenseDice(pendingTargetParticipant);
    const selectedDefenseObjects = defenseDice.filter((die) => selectedDefenseDice.includes(die.id));
    const preview = resolveCanvasAttackDamage({
      attackPressure: pending.pressure?.total,
      defenseDice: selectedDefenseObjects,
      target: pendingTarget,
      weapon: pending.weapon,
      suppressTraits: pending.range?.suppressTraits,
    });
    return (
      <ModalFrame variant="defense">
        <CanvasAttackDefense key={pending.id} glossary={glossary}
          pending={pending} attacker={items.find(item => item.id === pending.attackerId)} target={pendingTarget}
          customImages={customEquipmentImages} threatDie={combatRuntime.combatState?.participants?.[pending.attackerId]?.threatDie}
          preview={preview} armorName={defenseAppearance.name} armorImage={defenseAppearance.image}
          counterWeapons={combatRuntime.getCounterattackWeapons?.() || []} prone={isCanvasProne(pendingTarget)}
          preferredCounterWeaponId={getCanvasWeaponIdentity(combatRuntime.getPreferredCounterattackWeapon?.() || {}) || null}
          onResolveExcess={options => combatRuntime.resolvePendingAttack(selectedDefenseDice, options)}
          actions={(
            <button type="button" onClick={() => combatRuntime.resolvePendingAttack(selectedDefenseDice)}
              className="combat-confirm" data-tone={selectedDefenseDice.length ? 'defend' : 'damage'}>
              <span>{selectedDefenseDice.length > 0 ? 'Confirmar defensa' : 'Recibir ataque'}</span><ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
        >
          {preventsActiveDefense ? <p className="attack-defense-note">Proyectil arcano impide la defensa activa. El impacto se resuelve contra tu CD.</p> : <section aria-label="Dados de defensa">
            <div className="attack-defense-pool-heading"><h3>Elige tu defensa</h3><span>{selectedDefenseDice.length} {selectedDefenseDice.length === 1 ? 'dado' : 'dados'}</span></div>
            <div className="combat-dice-tray combat-defense-dice-tray">
              {defenseDice.length > 0 ? defenseDice.map(die => (
                <ActionDieButton key={die.id} die={die} selected={selectedDefenseDice.includes(die.id)} selectedLabel="En defensa"
                  onClick={() => setSelectedDefenseDice(current => current.includes(die.id) ? current.filter(id => id !== die.id) : [...current, die.id])} />
              )) : <p className="attack-defense-note">Sin dados para defender</p>}
            </div>
          </section>}
        </CanvasAttackDefense>
      </ModalFrame>
    );
  }

  const isEnemy = attacker?.profileType === 'rogueliteEnemy';
  const inventoryWeaponIds = new Set(isEnemy ? getCanvasEquippedWeapons(attacker).map(getCanvasWeaponIdentity) : []);
  const enemyWeaponOptions = isEnemy ? (combatRuntime.getAttackOptions?.(attacker, target?.id) || []).filter(item => inventoryWeaponIds.has(getCanvasWeaponIdentity(item))) : [];
  const committedDice = availableActionDice.filter(die => selectedActionDice.includes(die.id));
  const thrownRange = evaluateCanvasThrownRange({ attacker, weapon: draft.weapon, actionDice: committedDice,
    distance: draft.range?.distance, suppressTraits: draft.range?.suppressTraits });
  const canSubmit = !combatRuntime.isConfirmingAttack && thrownRange.legal
    && (isEnemy || selectedActionDice.length === draft.actionCost);
  const attackStoredThreatValue = attackerParticipant?.threatValue;

  return (
    <ModalFrame variant="prepare">
      <CanvasAttackPreparation
        attacker={attacker} target={target} draft={draft} isEnemy={isEnemy}
        customImages={customEquipmentImages} combatRuntime={combatRuntime} glossary={glossary}
        availableActionDice={availableActionDice} selectedActionDice={selectedActionDice}
        setSelectedActionDice={setSelectedActionDice} canSubmit={canSubmit}
        thrownRange={thrownRange}
        enemyWeaponOptions={enemyWeaponOptions}
        canChooseEnemyWeapons={inventoryWeaponIds.has(getCanvasWeaponIdentity(draft.attackParts?.[0]?.weapon || draft.weapon))}
        attackThreatSelection={attackThreatSelection} setAttackThreatSelection={setAttackThreatSelection}
        attackStoredThreatValue={attackStoredThreatValue} attackStoredThreatDie={attackerParticipant?.threatDie}
      />
    </ModalFrame>
  );
};

const CanvasCombatActionModal = props => props.combatRuntime?.campaignVisible
  ? <CampaignCombatOverlay {...props} />
  : <RogueliteCombatActionModal {...props} combatRuntime={props.combatRuntime?.pendingAttack?.kind === 'campaign-attack'
    ? { ...props.combatRuntime, pendingAttack: null } : props.combatRuntime} />;
export default CanvasCombatActionModal;
