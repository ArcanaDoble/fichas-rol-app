import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import {
  getEnemyActiveDefenseEligibility,
  getUsableDefenseDice,
  resolveCanvasAttackDamage,
} from '../combat/canvasAttackRules';

import {
  ActionDieButton, DefenseEquipmentChoice, DefenseRollSummary, getItemTraits,
  IncomingAttackSummary, ResolutionMetrics, ThreatChoice,
} from './CanvasCombatDetails';

const ModalFrame = ({ children }) => (
  <div className="pointer-events-auto fixed inset-0 z-[100] flex items-stretch justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur-sm sm:items-center sm:p-4">
    <section
      data-testid="canvas-combat-action-modal"
      className="relative my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border-2 border-red-900/50 bg-[#1a1b26] p-4 shadow-2xl shadow-red-900/20 sm:max-h-[85vh] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
      <div className="combat-details relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  </div>
);

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

const CanvasCombatActionModal = ({ activeScenario, combatRuntime, isPlayerView }) => {
  const customEquipmentImages = useCustomEquipmentImages();
  const draft = combatRuntime?.attackDraft;
  const pending = combatRuntime?.pendingAttack;
  const [selectedActionDice, setSelectedActionDice] = useState([]);
  const [selectedDefenseDice, setSelectedDefenseDice] = useState([]);
  const [attackThreatMode, setAttackThreatMode] = useState('none');
  const [attackCustomThreatSides, setAttackCustomThreatSides] = useState(6);
  const [enemyDefenseEquipmentId, setEnemyDefenseEquipmentId] = useState('');
  const [enemyThreatMode, setEnemyThreatMode] = useState('none');
  const [customThreatSides, setCustomThreatSides] = useState(6);

  const items = activeScenario?.items || [];
  const attacker = draft ? items.find((item) => item.id === draft.attackerId) : null;
  const target = draft ? items.find((item) => item.id === draft.targetId) : null;
  const attackerParticipant = draft ? combatRuntime?.combatState?.participants?.[draft.attackerId] : null;
  const pendingTarget = pending ? items.find((item) => item.id === pending.targetId) : null;
  const pendingTargetParticipant = pending
    ? combatRuntime?.combatState?.participants?.[pending.targetId]
    : null;
  const isTargetPlayerSide = pendingTargetParticipant?.side === 'players' || pendingTarget?.profileType === 'rogueliteClass';
  const canResolvePending = Boolean(
    pending
    && (
      isPlayerView
        ? combatRuntime?.controlledTokenIds?.includes(pending.targetId)
        : !isTargetPlayerSide
    ),
  );

  useEffect(() => {
    setSelectedActionDice([]);
    setAttackThreatMode('none');
    setAttackCustomThreatSides(6);
  }, [
    draft?.attackerId,
    draft?.targetId,
    draft?.weapon?.id,
    draft?.weapon?.name,
    draft?.weapon?.nombre,
  ]);
  useEffect(() => setSelectedDefenseDice([]), [pending?.id]);
  useEffect(() => {
    setEnemyDefenseEquipmentId('');
    setEnemyThreatMode('none');
    setCustomThreatSides(6);
  }, [pending?.id]);

  const availableActionDice = useMemo(() => (
    (attackerParticipant?.actionDice || []).filter((die) => die.status === 'available')
  ), [attackerParticipant?.actionDice]);

  if (!draft && (!pending || !canResolvePending)) return null;

  if (pending && canResolvePending) {
    const isEnemyTarget = pendingTarget?.profileType === 'rogueliteEnemy';
    const enemyDefense = isEnemyTarget
      ? getEnemyActiveDefenseEligibility({ token: pendingTarget, participant: pendingTargetParticipant })
      : null;
    const selectedEnemyEquipment = enemyDefense?.equipment?.find((item, index) => (
      String(item.id || item.catalogId || item.name || item.nombre || index) === String(enemyDefenseEquipmentId)
    )) || enemyDefense?.equipment?.[0];
    const storedThreatValue = pendingTargetParticipant?.threatValue;
    const hasStoredThreat = storedThreatValue !== null
      && storedThreatValue !== undefined
      && Number.isFinite(Number(storedThreatValue));

    if (isEnemyTarget) {
      const defenseWasRolled = pending.status === 'defense-rolled';
      const remainingPressure = Number(pending.remainingPressure) || 0;
      const defensiveExcess = Number(pending.defensiveExcess) || 0;
      return (
        <ModalFrame>
          <header className="relative shrink-0 text-center">
            <h2 className="font-fantasy text-2xl uppercase tracking-widest text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] sm:text-3xl">
              ¡Ataque inminente!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              <strong className="text-white">{pending.attackerName}</strong> ataca a{' '}
              <strong className="text-blue-300">{pending.targetName}</strong> con{' '}
              <strong className="text-red-400">{pending.weaponName}</strong>.
            </p>
          </header>

          <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar sm:pr-2">
            <IncomingAttackSummary pending={pending} customImages={customEquipmentImages} threatDie={combatRuntime.combatState?.participants?.[pending.attackerId]?.threatDie} />

            {!defenseWasRolled ? (
              <>
                {enemyDefense?.eligible ? (
                  <div className="space-y-4">
                    <div>
                      <div className="combat-section-heading"><h3>Equipo defensivo</h3><span>Consume tu acción principal</span></div>
                      <div className="mt-3 grid gap-2">
                        {enemyDefense.equipment.map((item, index) => {
                          const identity = String(item.id || item.catalogId || item.name || item.nombre || index);
                          const selected = (enemyDefenseEquipmentId || String(enemyDefense.equipment[0]?.id || enemyDefense.equipment[0]?.catalogId || enemyDefense.equipment[0]?.name || enemyDefense.equipment[0]?.nombre || 0)) === identity;
                          return (
                            <DefenseEquipmentChoice key={identity} item={item} selected={selected}
                              customImages={customEquipmentImages}
                              onClick={() => setEnemyDefenseEquipmentId(identity)} />
                          );
                        })}
                      </div>
                    </div>

                    <ThreatChoice mode={enemyThreatMode} onModeChange={setEnemyThreatMode}
                      hasStoredThreat={hasStoredThreat} storedThreatValue={storedThreatValue}
                      sides={customThreatSides} onSidesChange={setCustomThreatSides} />
                  </div>
                ) : (
                  <p className="border border-slate-800 bg-black/20 px-4 py-3 text-center text-sm italic text-slate-500">{enemyDefense?.reason}</p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <DefenseRollSummary pending={pending} />
                <ResolutionMetrics defense={pending.totalDefense} remaining={remainingPressure} excess={defensiveExcess} />
              </div>
            )}
          </div>

          <footer className="mt-5 shrink-0 border-t border-red-900/30 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
            {!defenseWasRolled ? (
              <div className={`grid gap-3 ${enemyDefense?.eligible ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button type="button" onClick={() => combatRuntime.resolvePendingAttack([])} className="rounded bg-gradient-to-r from-red-600 to-red-800 px-5 py-3 font-fantasy text-sm uppercase tracking-[0.18em] text-white shadow-lg active:scale-[0.98]">Recibir ataque</button>
                {enemyDefense?.eligible && (
                  <button type="button" onClick={() => combatRuntime.rollEnemyDefense({ equipmentId: String(selectedEnemyEquipment?.id || selectedEnemyEquipment?.catalogId || selectedEnemyEquipment?.name || selectedEnemyEquipment?.nombre || 0), threatMode: enemyThreatMode, customThreatSides })} className="rounded border border-blue-400/50 bg-blue-950/35 px-5 py-3 font-fantasy text-sm uppercase tracking-[0.18em] text-blue-100 active:scale-[0.98]">Defender</button>
                )}
              </div>
            ) : defensiveExcess > 0 ? (
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-3">
                <button type="button" onClick={() => combatRuntime.resolvePendingAttack([], { excessChoice: 'reposition' })} className="rounded border border-blue-400/50 bg-blue-950/35 px-4 py-3 font-fantasy text-xs uppercase tracking-[0.15em] text-blue-100">Reposicionarse · {defensiveExcess}</button>
                <button type="button" onClick={() => combatRuntime.resolvePendingAttack([], { excessChoice: 'counterattack', counterWeapon: pending.defenseItem })} className="rounded border border-red-500/50 bg-red-950/35 px-4 py-3 font-fantasy text-xs uppercase tracking-[0.15em] text-red-100">Contraatacar · {defensiveExcess}</button>
              </div>
            ) : (
              <button type="button" onClick={() => combatRuntime.resolvePendingAttack([])} className="w-full rounded bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 font-fantasy text-sm uppercase tracking-[0.2em] text-white shadow-lg active:scale-[0.98]">{remainingPressure > 0 ? 'Aplicar ataque' : 'Anular ataque'}</button>
            )}
          </footer>
        </ModalFrame>
      );
    }

    const defenseDice = getUsableDefenseDice(pendingTargetParticipant);
    const selectedDefenseObjects = defenseDice.filter((die) => selectedDefenseDice.includes(die.id));
    const preview = resolveCanvasAttackDamage({
      attackPressure: pending.pressure?.total,
      defenseDice: selectedDefenseObjects,
      target: pendingTarget,
      weapon: pending.weapon,
      suppressTraits: pending.range?.suppressTraits,
    });
    const equippedArmor = resolveEquippedArmor(pendingTarget);
    const equippedArmorName = equippedArmor?.name || equippedArmor?.nombre || '';
    const equippedArmorImage = equippedArmor
      ? resolveEquipmentImage(equippedArmor, customEquipmentImages)
      : null;
    const cdIsModified = preview.effectiveCd !== preview.baseCd;

    return (
      <ModalFrame>
        <header className="relative shrink-0 text-center">
          <h2 className="font-fantasy text-2xl uppercase tracking-widest text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] sm:text-3xl">
            ¡Ataque inminente!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            <strong className="text-white">{pending.attackerName}</strong> ataca a{' '}
            <strong className="text-blue-300">{pending.targetName}</strong> con{' '}
            <strong className="text-red-400">{pending.weaponName}</strong>.
          </p>
        </header>

        <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar sm:pr-2">
          <IncomingAttackSummary pending={pending} customImages={customEquipmentImages} threatDie={combatRuntime.combatState?.participants?.[pending.attackerId]?.threatDie} />

          <section className="combat-defense-panel" aria-label={`Defensa actual, CD ${preview.effectiveCd}`}>
            {equippedArmorImage && <img className="combat-defense-art" src={equippedArmorImage} alt="" />}
            <div className="combat-defense-shade" />
            <div className="combat-defense-card-content">
              <div className="combat-defense-copy">
                <div className="combat-defense-identity">
                  <span className="combat-eyebrow">Tu defensa</span>
                  <h3>{equippedArmorName || 'Protección actual'}</h3>
                  <span>{equippedArmor ? 'Armadura equipada' : 'Clase de defensa actual'}</span>
                </div>
                <div className="combat-defense-rule">
                  <p>Cada {preview.effectiveCd} puntos de Presión restante cuestan 1 bloque de Vida.</p>
                  {cdIsModified && <span>CD base {preview.baseCd} · Perforante −1</span>}
                </div>
              </div>
              <div className="combat-cd-seal" data-modified={cdIsModified}>
                <span>CD</span>
                <strong>{preview.effectiveCd}</strong>
                <small>actual</small>
              </div>
            </div>
          </section>

          <div className="combat-defense-pool">
            <div className="combat-section-heading">
              <h3>Dados de defensa</h3>
              <span>{selectedDefenseDice.length} seleccionados</span>
            </div>
            <p className="combat-help mb-3">Elige los dados que quieres gastar para reducir la presión.</p>
            <div className="combat-dice-tray combat-defense-dice-tray">
              {defenseDice.length > 0 ? defenseDice.map((die) => (
                <ActionDieButton
                  key={die.id}
                  die={die}
                  selected={selectedDefenseDice.includes(die.id)}
                  selectedLabel="En defensa"
                  onClick={() => setSelectedDefenseDice((current) => (
                    current.includes(die.id) ? current.filter((id) => id !== die.id) : [...current, die.id]
                  ))}
                />
              )) : (
                <span className="self-center text-sm italic text-slate-500">No quedan dados disponibles para defender.</span>
              )}
            </div>
          </div>

          <ResolutionMetrics defense={preview.defense} remaining={preview.finalPressure} excess={preview.surplus} cd={preview.effectiveCd} />
        </div>

        <footer className="mt-5 shrink-0 border-t border-red-900/30 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
          <button
            type="button"
            onClick={() => combatRuntime.resolvePendingAttack(selectedDefenseDice)}
            className="w-full rounded bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 font-fantasy text-sm uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:shadow-red-600/20 active:scale-[0.98]"
          >
            {selectedDefenseDice.length > 0 ? 'Confirmar defensa' : 'Recibir ataque'}
          </button>
        </footer>
      </ModalFrame>
    );
  }

  const isEnemy = attacker?.profileType === 'rogueliteEnemy';
  const canSubmit = isEnemy || selectedActionDice.length === draft.actionCost;
  const damageProfile = draft.weaponDiceProfile.map((die) => die.die).join(' + ');
  const attackWeaponImage = resolveEquipmentImage(draft.weapon, customEquipmentImages);
  const attackWeaponTraits = getItemTraits(draft.weapon);
  const attackStoredThreatValue = attackerParticipant?.threatValue;
  const hasAttackStoredThreat = attackStoredThreatValue !== null
    && attackStoredThreatValue !== undefined
    && Number.isFinite(Number(attackStoredThreatValue));

  return (
    <ModalFrame>
      <header className="relative shrink-0 text-center">
        <button
          type="button"
          onClick={combatRuntime.cancelAttackDraft}
          className="absolute -right-1 -top-1 z-10 flex h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:text-white"
          aria-label="Cancelar ataque"
        >
          <X size={22} />
        </button>
        <h2 className="px-6 font-fantasy text-2xl uppercase tracking-widest text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] sm:text-3xl">
          Preparar ataque
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          <strong className="text-white">{attacker?.name}</strong>
          <span className="mx-2 font-fantasy text-xs uppercase tracking-[0.2em] text-red-400/80">VS</span>
          <strong className="text-blue-300">{target?.name}</strong>
        </p>
      </header>

      <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar sm:pr-2">
        <div className="relative min-h-[150px] overflow-hidden rounded-md border border-[#c8aa6e]/30 bg-[#090d15] shadow-[0_12px_30px_rgba(0,0,0,0.28)] sm:min-h-[170px]">
          {attackWeaponImage ? (
            <img src={attackWeaponImage} alt={draft.weapon.name || draft.weapon.nombre || 'Arma'} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(200,170,110,0.14),transparent_35%),linear-gradient(135deg,#171b24,#090d15_70%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080c14] via-[#080c14]/90 to-[#080c14]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-black/15" />
          <div className="relative flex min-h-[150px] flex-col justify-between p-4 sm:min-h-[170px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[8px] font-black uppercase tracking-[0.24em] text-[#c8aa6e]/65">Arma seleccionada</span>
                <h3 className="mt-1 break-words font-fantasy text-xl uppercase tracking-[0.1em] text-[#f0e6d2] drop-shadow-md sm:text-2xl">{draft.weapon.name || draft.weapon.nombre}</h3>
              </div>
              <div className="shrink-0 rounded-sm border border-[#c8aa6e]/35 bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
                <span className="block text-[7px] font-black uppercase tracking-[0.18em] text-slate-500">Coste</span>
                <strong className="font-fantasy text-sm text-[#e4c77c] sm:text-base">{isEnemy ? 'Acción' : `${draft.actionCost} dado${draft.actionCost === 1 ? '' : 's'}`}</strong>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-sm border border-red-500/25 bg-red-950/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-200">{damageProfile}</span>
                <span className="rounded-sm border border-slate-600/40 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300">{draft.range.rangeName} · {draft.range.distance} casilla(s)</span>
              </div>
              {attackWeaponTraits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {attackWeaponTraits.slice(0, 6).map((trait) => <span key={trait} className="rounded-sm border border-[#c8aa6e]/20 bg-black/45 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#c8aa6e]/80">◆ {trait}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isEnemy ? (
          <div>
            <div className="combat-section-heading"><h3>Dados de acción</h3><span>{selectedActionDice.length} / {draft.actionCost} seleccionados</span></div>
            <div className="combat-dice-tray">
              {availableActionDice.map((die) => (
                <ActionDieButton
                  key={die.id}
                  die={die}
                  selected={selectedActionDice.includes(die.id)}
                  disabled={!selectedActionDice.includes(die.id) && selectedActionDice.length >= draft.actionCost}
                  onClick={() => setSelectedActionDice((current) => (
                    current.includes(die.id) ? current.filter((id) => id !== die.id) : [...current, die.id]
                  ))}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="combat-section-heading"><h3>Acción enemiga</h3><span>Perfil del arma + Base ofensiva</span></div>
            <p className="combat-help">El arma se tira al confirmar. Se consume la acción principal.</p>
            <div className="mt-4">
              <ThreatChoice mode={attackThreatMode} onModeChange={setAttackThreatMode}
                hasStoredThreat={hasAttackStoredThreat} storedThreatValue={attackStoredThreatValue}
                sides={attackCustomThreatSides} onSidesChange={setAttackCustomThreatSides}
                purpose="ataque" />
            </div>
          </div>
        )}

        {draft.range.note && (
          <p className="border-l-2 border-[#c8aa6e]/60 pl-3 text-xs leading-relaxed text-slate-400">{draft.range.note}</p>
        )}
      </div>

      <footer className="mt-5 shrink-0 border-t border-red-900/30 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => combatRuntime.confirmAttack({
            actionDieIds: selectedActionDice,
            threatMode: isEnemy ? attackThreatMode : 'none',
            customThreatSides: attackCustomThreatSides,
          })}
          className="w-full rounded bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 font-fantasy text-sm uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:shadow-red-600/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Confirmar ataque
        </button>
      </footer>
    </ModalFrame>
  );
};

export default CanvasCombatActionModal;
