import React, { useEffect, useMemo, useState } from 'react';
import { Swords, X } from 'lucide-react';
import DiceSvg from '../../../components/DiceSvg';
import ActionDieSvg from '../../../components/ActionDieSvg';
import {
  getUsableDefenseDice,
  resolveCanvasAttackDamage,
} from '../combat/canvasAttackRules';

const getDieFaces = (die = {}) => {
  const explicit = Number(die.sides ?? die.faces);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Number.parseInt(String(die.die || die.type || '').match(/\d+/)?.[0], 10) || 6;
};

const ActionDieButton = ({ die, selected, disabled, onClick, accent = 'gold' }) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`group flex min-w-[76px] flex-col items-center border px-3 py-2 transition-all ${
        selected
          ? accent === 'blue' ? 'border-blue-400/65 bg-blue-950/35' : 'border-[#c8aa6e]/70 bg-[#c8aa6e]/10'
          : 'border-slate-700/80 bg-black/25 hover:border-slate-500'
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      <ActionDieSvg
        faces={getDieFaces(die)}
        value={die.value}
        className="h-10 w-10"
        accent={accent}
        selected={selected}
        status={disabled ? 'spent' : 'available'}
        title={`${die.die || `d${getDieFaces(die)}`} · ${die.value}`}
      />
      <span className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${selected ? 'text-[#f0e6d2]' : 'text-slate-500'}`}>
        {die.die || `d${getDieFaces(die)}`}
      </span>
    </button>
  );
};

const ResultDie = ({ faces, value, label, accent = 'red', action = false }) => {
  const style = accent === 'gold'
    ? { backgroundColor: 'rgba(200, 170, 110, 0.16)', borderColor: '#c8aa6e', color: '#e8cf91', boxShadow: '0 0 10px rgba(200,170,110,0.24)' }
    : { backgroundColor: 'rgba(185, 55, 55, 0.15)', borderColor: '#ef4444', color: '#fca5a5', boxShadow: '0 0 10px rgba(239,68,68,0.22)' };

  return (
    <div className="flex min-w-[58px] flex-col items-center">
      {action ? (
        <ActionDieSvg
          faces={faces}
          value={value}
          className="h-11 w-11"
          selected
          title={label}
        />
      ) : (
        <DiceSvg faces={faces} value={value} className="h-10 w-10" style={style} title={label} />
      )}
      <span className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.13em] text-slate-500">{label}</span>
    </div>
  );
};

const ModalFrame = ({ children }) => (
  <div className="pointer-events-auto fixed inset-0 z-[100] flex items-stretch justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur-sm sm:items-center sm:p-4">
    <section
      data-testid="canvas-combat-action-modal"
      className="relative my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border-2 border-red-900/50 bg-[#1a1b26] p-4 shadow-2xl shadow-red-900/20 sm:max-h-[85vh] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  </div>
);

const CanvasCombatActionModal = ({ activeScenario, combatRuntime, isPlayerView }) => {
  const draft = combatRuntime?.attackDraft;
  const pending = combatRuntime?.pendingAttack;
  const [selectedActionDice, setSelectedActionDice] = useState([]);
  const [selectedDefenseDice, setSelectedDefenseDice] = useState([]);
  const [useThreat, setUseThreat] = useState(false);

  const items = activeScenario?.items || [];
  const attacker = draft ? items.find((item) => item.id === draft.attackerId) : null;
  const target = draft ? items.find((item) => item.id === draft.targetId) : null;
  const attackerParticipant = draft ? combatRuntime?.combatState?.participants?.[draft.attackerId] : null;
  const pendingTarget = pending ? items.find((item) => item.id === pending.targetId) : null;
  const pendingTargetParticipant = pending
    ? combatRuntime?.combatState?.participants?.[pending.targetId]
    : null;
  const hasAssignedPlayer = Boolean(
    (Array.isArray(pendingTarget?.controlledBy) && pendingTarget.controlledBy.length > 0)
    || pendingTarget?.linkedClassOwner,
  );
  const isTargetPlayerSide = pendingTargetParticipant?.side === 'players' || pendingTarget?.profileType === 'rogueliteClass';
  const canResolvePending = Boolean(
    pending
    && (
      isPlayerView
        ? combatRuntime?.controlledTokenIds?.includes(pending.targetId)
        : (!hasAssignedPlayer && !isTargetPlayerSide) || (combatRuntime?.controlledTokenIds?.includes(pending.targetId) && !hasAssignedPlayer)
    ),
  );

  useEffect(() => {
    setSelectedActionDice([]);
    setUseThreat(false);
  }, [
    draft?.attackerId,
    draft?.targetId,
    draft?.weapon?.id,
    draft?.weapon?.name,
    draft?.weapon?.nombre,
  ]);
  useEffect(() => setSelectedDefenseDice([]), [pending?.id]);

  const availableActionDice = useMemo(() => (
    (attackerParticipant?.actionDice || []).filter((die) => die.status === 'available')
  ), [attackerParticipant?.actionDice]);

  if (!draft && (!pending || !canResolvePending)) return null;

  if (pending && canResolvePending) {
    const defenseDice = getUsableDefenseDice(pendingTargetParticipant);
    const selectedDefenseObjects = defenseDice.filter((die) => selectedDefenseDice.includes(die.id));
    const preview = resolveCanvasAttackDamage({
      attackPressure: pending.pressure?.total,
      defenseDice: selectedDefenseObjects,
      target: pendingTarget,
      weapon: pending.weapon,
      suppressTraits: pending.range?.suppressTraits,
    });

    return (
      <ModalFrame>
        <header className="relative shrink-0 text-center">
          <button
            type="button"
            onClick={combatRuntime.cancelPendingAttack}
            className="absolute -right-1 -top-1 p-2 text-slate-500 transition-colors hover:text-white"
            aria-label="Descartar o cancelar ataque"
            title="Descartar o cancelar ataque"
          >
            <X size={22} />
          </button>
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
          <div className="border border-[#c8aa6e]/20 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">Dados del atacante</p>
              <div className="text-right">
                <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">Presión</span>
                <strong className="font-fantasy text-2xl text-red-400">{pending.pressure?.total || 0}</strong>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {(pending.actionDice || []).map((die) => (
                <ResultDie key={die.id} faces={getDieFaces(die)} value={die.value} label="Acción" accent="gold" action />
              ))}
              {(pending.weaponResults || []).map((value, index) => (
                <ResultDie
                  key={`weapon-${index}`}
                  faces={pending.weaponDiceProfile?.[index]?.sides || 6}
                  value={value}
                  label="Arma"
                />
              ))}
              {Number(pending.criticalResult) > 0 && (
                <ResultDie
                  faces={pending.criticalDieSides || pending.weaponDiceProfile?.[0]?.sides || 6}
                  value={pending.criticalResult}
                  label="Crítico"
                  accent="gold"
                />
              )}
            </div>
            {pending.pressure?.actionPressure > 0 && pending.actionDice?.length === 0 && (
              <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Base ofensiva +{pending.pressure.actionPressure}
                {pending.pressure?.threatPressure > 0 ? ` · Amenaza +${pending.pressure.threatPressure}` : ''}
              </p>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Defensa</p>
                <p className="mt-1 text-xs text-slate-500">Selecciona un dado disponible que quieras gastar para defenderte.</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                CD {preview.effectiveCd}
              </span>
            </div>
            <div className="flex min-h-[76px] flex-wrap justify-center gap-2 border-y border-slate-700/60 py-3">
              {defenseDice.length > 0 ? defenseDice.map((die) => (
                <ActionDieButton
                  key={die.id}
                  die={die}
                  accent="blue"
                  selected={selectedDefenseDice.includes(die.id)}
                  onClick={() => setSelectedDefenseDice((current) => (
                    current.includes(die.id) ? current.filter((id) => id !== die.id) : [...current, die.id]
                  ))}
                />
              )) : (
                <span className="self-center text-sm italic text-slate-500">No quedan dados disponibles para defender.</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 border border-slate-700/50 bg-black/25 text-center">
            {[
              ['Defensa', preview.defense],
              ['Presión final', preview.finalPressure],
              ['Vida', `−${preview.lifeLost}`],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-slate-700/50 px-2 py-2 last:border-r-0">
                <span className="block text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
                <strong className="font-fantasy text-lg text-[#f0e6d2]">{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-5 flex items-center gap-3 shrink-0 border-t border-red-900/30 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
          <button
            type="button"
            onClick={combatRuntime.cancelPendingAttack}
            className="flex-1 rounded border border-slate-700 bg-slate-800/80 px-4 py-3 font-fantasy text-xs uppercase tracking-[0.15em] text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-[0.98]"
          >
            Descartar ataque
          </button>
          <button
            type="button"
            onClick={() => combatRuntime.resolvePendingAttack(selectedDefenseDice)}
            className="flex-[2] rounded bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 font-fantasy text-sm uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:shadow-red-600/20 active:scale-[0.98]"
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

  return (
    <ModalFrame>
      <header className="relative shrink-0 text-center">
        <button
          type="button"
          onClick={combatRuntime.cancelAttackDraft}
          className="absolute -right-1 -top-1 p-2 text-slate-500 transition-colors hover:text-white"
          aria-label="Cancelar ataque"
        >
          <X size={22} />
        </button>
        <h2 className="font-fantasy text-2xl uppercase tracking-widest text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] sm:text-3xl">
          Preparar ataque
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          <strong className="text-white">{attacker?.name}</strong>
          <span className="mx-2 text-slate-600">contra</span>
          <strong className="text-blue-300">{target?.name}</strong>
        </p>
      </header>

      <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar sm:pr-2">
        <div className="border border-[#c8aa6e]/20 bg-black/40 p-4">
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-fantasy text-base uppercase tracking-[0.08em] text-[#f0e6d2]">
                {draft.weapon.name || draft.weapon.nombre}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {damageProfile} · {draft.range.rangeName} · {draft.range.distance} casilla(s)
              </p>
            </div>
            <div className="shrink-0 border-l border-slate-700/70 pl-3 text-right">
              <span className="block text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">Coste</span>
              <strong className="font-fantasy text-lg text-[#c8aa6e]">
                {isEnemy ? 'Acción' : `${draft.actionCost} dado${draft.actionCost === 1 ? '' : 's'}`}
              </strong>
            </div>
          </div>
        </div>

        {!isEnemy ? (
          <div>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">Dados de acción</p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Selecciona exactamente {draft.actionCost} para comprometer en el ataque.
            </p>
            <div className="mt-3 flex min-h-[80px] flex-wrap justify-center gap-3 border-y border-slate-700/60 py-3">
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
          <div className="border-y border-slate-700/60 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">Acción enemiga</p>
            <p className="mt-1 text-xs text-slate-500">La Base ofensiva se suma automáticamente al perfil del arma.</p>
            {attackerParticipant?.threatValue !== null && attackerParticipant?.threatValue !== undefined && (
              <button
                type="button"
                aria-pressed={useThreat}
                onClick={() => setUseThreat((current) => !current)}
                className={`mx-auto mt-3 flex min-w-[180px] items-center justify-center gap-3 border px-4 py-2 transition-all ${
                  useThreat
                    ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                    : 'border-slate-700 bg-black/25 text-slate-400 hover:border-[#c8aa6e]/60'
                }`}
              >
                <DiceSvg
                  faces={getDieFaces({ die: attackerParticipant.threatDie })}
                  value={attackerParticipant.threatValue}
                  className="h-9 w-9"
                  style={useThreat
                    ? { backgroundColor: 'rgba(200,170,110,0.18)', borderColor: '#c8aa6e', color: '#e8cf91' }
                    : { backgroundColor: 'rgba(15,23,42,0.72)', borderColor: '#64748b', color: '#94a3b8' }}
                />
                <span className="text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.18em]">Dado de amenaza</span>
                  <span className="block text-xs">{useThreat ? 'Se gastará en este ataque' : 'Reservar para otra acción'}</span>
                </span>
              </button>
            )}
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
          onClick={() => combatRuntime.confirmAttack({ actionDieIds: selectedActionDice, useThreat })}
          className="w-full rounded bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 font-fantasy text-sm uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:shadow-red-600/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Confirmar ataque
        </button>
      </footer>
    </ModalFrame>
  );
};

export default CanvasCombatActionModal;
