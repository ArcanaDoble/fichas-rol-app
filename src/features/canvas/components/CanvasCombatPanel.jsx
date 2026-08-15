import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, Dices, Flag, Footprints, RotateCcw, Shield, Swords, Undo } from 'lucide-react';

import DiceSvg from '../../../components/DiceSvg';

import { getAvailableMovement, getMovementBase, sortCombatParticipants } from '../combat/canvasCombatState';
import CanvasDiceTable from './CanvasDiceTable';

const STATUS_ORDER = ['available', 'committed', 'spent'];
const STATUS_LABELS = {
  available: 'Disponible',
  committed: 'Reservado',
  spent: 'Gastado',
};

const participantCanBeManaged = (participant, controlledTokenIds) => (
  controlledTokenIds.includes(participant.tokenId)
);

const ManualRoll = ({ participant, onCancel, onSubmit }) => {
  const [values, setValues] = useState(() => participant.actionDiceProfile.map(() => 1));

  return (
    <div className="mt-3 border-l border-[#c8aa6e]/40 pl-3">
      <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Resultado de los dados físicos
      </p>
      <div className="flex items-end gap-2">
        {participant.actionDiceProfile.map((die, index) => {
          const sides = Number(String(die).replace(/\D/g, '')) || 6;
          return (
            <label key={`${die}-${index}`} className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-center font-['Cinzel'] text-[9px] text-[#c8aa6e]">{die.toUpperCase()}</span>
              <select
                value={values[index]}
                onChange={(event) => setValues((current) => current.map((value, valueIndex) => (
                  valueIndex === index ? Number(event.target.value) : value
                )))}
                className="h-9 border border-slate-700 bg-[#080d16] text-center font-mono text-sm text-[#eee5d3] outline-none focus:border-[#c8aa6e]"
                aria-label={`Resultado de ${die}`}
              >
                {Array.from({ length: sides }, (_, valueIndex) => valueIndex + 1).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="h-9 border border-slate-800 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300">
          Cancelar
        </button>
        <button type="button" onClick={() => onSubmit(values)} className="h-9 border border-[#c8aa6e]/60 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15">
          Confirmar
        </button>
      </div>
    </div>
  );
};

const SetupParticipant = ({ participant, canManage, runtime }) => {
  const [manualOpen, setManualOpen] = useState(false);
  const isEnemy = participant.side === 'enemies';

  return (
    <article className="border-b border-slate-800/70 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden border border-slate-700 bg-[#080d16]">
          {participant.portrait
            ? <img src={participant.portrait} alt="" className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center">{isEnemy ? <Swords size={15} className="text-slate-600" /> : <Shield size={15} className="text-slate-600" />}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h5 className="truncate font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.08em] text-[#eee5d3]">
              {participant.name}
            </h5>
            {isEnemy ? (
              <span className="font-mono text-[10px] text-[#d7b867]">INI {participant.initiative}</span>
            ) : participant.awaitingRoll ? (
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-500">Pendiente</span>
            ) : (
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-400">Listo · {participant.initiative}</span>
            )}
          </div>
          {!isEnemy && (
            <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">
              {participant.actionDiceProfile.map((die) => die.toUpperCase()).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {!isEnemy && participant.awaitingRoll && canManage && !manualOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2 pl-[52px]">
          <button
            type="button"
            onClick={() => runtime.rollActionDice(participant.tokenId)}
            className="h-9 border border-[#c8aa6e]/50 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15"
          >
            Tirar aquí
          </button>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="h-9 border border-slate-700 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 hover:border-[#c8aa6e]/40 hover:text-[#d8bf88]"
          >
            Anotar mesa
          </button>
        </div>
      )}
      {manualOpen && (
        <ManualRoll
          participant={participant}
          onCancel={() => setManualOpen(false)}
          onSubmit={(values) => {
            if (runtime.submitRoll(participant.tokenId, values, 'manual')) setManualOpen(false);
          }}
        />
      )}
    </article>
  );
};

const ActionDie = ({ die, disabled, onChange }) => {
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(die.status) + 1) % STATUS_ORDER.length];
  const tone = die.status === 'available'
    ? 'border-[#c8aa6e]/40 text-[#d8bf88] bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/10'
    : die.status === 'committed'
      ? 'border-sky-400/60 text-sky-300 bg-sky-500/10 hover:bg-sky-500/15'
      : 'border-slate-800/80 text-slate-500 bg-black/30 opacity-60';

  const statusBadgeClass = die.status === 'available'
    ? 'border-[#c8aa6e]/20 text-[#d8bf88]'
    : die.status === 'committed'
      ? 'border-sky-400/30 text-sky-300'
      : 'border-slate-800 text-slate-600';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(nextStatus)}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-between border py-2 px-1 text-center transition-all ${tone} ${
        disabled ? 'cursor-default' : 'hover:border-[#c8aa6e] active:scale-[0.98]'
      }`}
      aria-label={`${die.die} con resultado ${die.value}: ${STATUS_LABELS[die.status]}`}
      title={`${die.die} (${die.value}) — ${STATUS_LABELS[die.status]}`}
    >
      <div className="flex w-full items-center justify-between px-1 text-[8px] font-bold uppercase tracking-wider opacity-75">
        <span className="font-['Cinzel']">{die.die}</span>
        <span className="font-mono text-[9px] font-bold">{die.value}</span>
      </div>
      <div className="my-1 flex items-center justify-center">
        <DiceSvg faces={die.sides} value={die.value} className="h-7 w-7" />
      </div>
      <span className={`w-full py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] border-t ${statusBadgeClass}`}>
        {STATUS_LABELS[die.status]}
      </span>
    </button>
  );
};

const EnemyAction = ({ action, disabled, onChange }) => {
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(action.status) + 1) % STATUS_ORDER.length];
  const isMove = action.id === 'movement';
  const Icon = isMove ? Footprints : Swords;
  const tone = action.status === 'available'
    ? 'border-[#c8aa6e]/40 text-[#d8bf88] bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/10'
    : action.status === 'committed'
      ? 'border-sky-400/60 text-sky-300 bg-sky-500/10 hover:bg-sky-500/15'
      : 'border-slate-800/80 text-slate-500 bg-black/30 opacity-60';

  const statusBadgeClass = action.status === 'available'
    ? 'border-[#c8aa6e]/20 text-[#d8bf88]'
    : action.status === 'committed'
      ? 'border-sky-400/30 text-sky-300'
      : 'border-slate-800 text-slate-600';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(nextStatus)}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-between border py-2 px-1 text-center transition-all ${tone} ${
        disabled ? 'cursor-default' : 'hover:border-[#c8aa6e] active:scale-[0.98]'
      }`}
      aria-label={`${action.label}: ${STATUS_LABELS[action.status]}`}
      title={`${action.label} — ${STATUS_LABELS[action.status]} (Haz clic para cambiar)`}
    >
      <div className="flex w-full items-center justify-center px-1 text-[8px] font-bold uppercase tracking-wider opacity-75">
        <span className="font-['Cinzel'] truncate">{action.label}</span>
      </div>
      <div className="my-1.5 flex items-center justify-center">
        <Icon size={17} className={action.status === 'committed' ? 'text-sky-300' : (action.status === 'available' ? 'text-[#d8bf88]' : 'text-slate-500')} />
      </div>
      <span className={`w-full py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] border-t ${statusBadgeClass}`}>
        {STATUS_LABELS[action.status]}
      </span>
    </button>
  );
};

const RoundParticipant = ({ participant, activeBlock, canManage, runtime, isPlayerView }) => {
  const hasActed = activeBlock?.actedIds?.includes(participant.tokenId);
  const isInActiveBlock = activeBlock?.memberIds?.includes(participant.tokenId);
  const isEnemy = participant.side === 'enemies';
  const enemyActions = participant.enemyActions || [
    { id: 'movement', label: 'Movimiento', type: 'movement', status: 'available' },
    { id: 'attack', label: 'Ataque', type: 'attack', status: 'available' },
  ];

  const movementBase = participant.movementRuntime?.base ?? getMovementBase(participant);
  const movementModifier = participant.movementRuntime?.modifier ?? 0;
  const movementSpent = participant.movementRuntime?.spent ?? 0;
  const movementAvailable = Math.max(0, movementBase + movementModifier - movementSpent);
  const hasMovementHistory = (participant.movementRuntime?.history || []).length > 0;

  return (
    <article className={`border-b border-slate-800/70 py-4 last:border-b-0 ${hasActed ? 'opacity-55' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-700 bg-[#080d16]">
          {participant.portrait ? (
            <img src={participant.portrait} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              {isEnemy ? <Swords size={15} className="text-slate-600" /> : <Shield size={15} className="text-slate-600" />}
            </div>
          )}
          {hasActed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
              <Check size={18} className="text-emerald-400" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h5 className="truncate font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.08em] text-[#eee5d3]">{participant.name}</h5>
            {isInActiveBlock && !hasActed && <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-400">Activo</span>}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="font-mono text-[9px] text-[#d7b867]">Iniciativa {participant.initiative}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                <Footprints size={10} className="text-[#c8aa6e]" />
                <span className="text-[#c8aa6e] font-mono">{movementAvailable}</span>
                <span className="text-[8px] text-slate-500">({movementBase}{movementModifier !== 0 ? (movementModifier > 0 ? `+${movementModifier}` : movementModifier) : ''})</span>
              </span>
              {canManage && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => runtime.setMovementModifier && runtime.setMovementModifier(participant.tokenId, movementModifier - 1)}
                    className="h-4 w-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center border border-slate-700 leading-none"
                    title="Reducir modificador de movimiento"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => runtime.setMovementModifier && runtime.setMovementModifier(participant.tokenId, movementModifier + 1)}
                    className="h-4 w-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center border border-slate-700 leading-none"
                    title="Aumentar modificador de movimiento (+1)"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isEnemy && (
        <div className="mt-3 flex gap-2">
          {participant.actionDice.map((die) => (
            <ActionDie
              key={die.id}
              die={die}
              disabled={!canManage}
              onChange={(status) => runtime.updateDieStatus(participant.tokenId, die.id, status)}
            />
          ))}
        </div>
      )}

      {isEnemy && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            {enemyActions.map((action) => (
              <EnemyAction
                key={action.id}
                action={action}
                disabled={!canManage}
                onChange={(status) => (runtime.updateEnemyActionStatus
                  ? runtime.updateEnemyActionStatus(participant.tokenId, action.id, status)
                  : runtime.updateDieStatus(participant.tokenId, action.id, status))}
              />
            ))}
          </div>
          {participant.threatDie && (
            <p className="text-[8px] uppercase tracking-[0.12em] text-slate-500">
              Amenaza {participant.threatDie.toUpperCase()} · <strong className="text-[#d8bf88]">{participant.threatValue ?? '—'}</strong>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!isPlayerView && hasMovementHistory && (
          <button
            type="button"
            onClick={() => runtime.undoMovement && runtime.undoMovement(participant.tokenId)}
            className="h-8 px-2 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-300 flex items-center justify-center gap-1 rounded"
            title="Deshacer último movimiento confirmado"
          >
            <Undo size={11} />
            <span>Deshacer mov</span>
          </button>
        )}
        {isInActiveBlock && !hasActed && canManage && (
          <button
            type="button"
            onClick={() => runtime.completeActivation(participant.tokenId)}
            className="h-8 flex-1 border border-emerald-500/35 bg-emerald-500/10 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/20 rounded"
          >
            Finalizar activación
          </button>
        )}
      </div>
    </article>
  );
};

const CanvasCombatPanel = ({ activeTab, combatRuntime = {}, isPlayerView, playerName }) => {
  const [subTab, setSubTab] = useState('COMBAT'); // 'COMBAT' | 'FREE_DICE'
  const state = combatRuntime?.combatState;
  const participants = useMemo(() => Object.values(state?.participants || {}).sort(
    (left, right) => left.orderIndex - right.orderIndex,
  ), [state?.participants]);
  const sortedParticipants = useMemo(() => (
    sortCombatParticipants(Object.values(state?.participants || {}))
  ), [state?.participants]);
  if (activeTab !== 'ROUND') return null;

  const activeBlock = state?.blocks?.[state.activeBlockIndex] || null;
  const roundComplete = state?.roundPhase === 'turns' && state.activeBlockIndex >= (state.blocks?.length || 0);

  return (
    <section data-testid="canvas-combat-panel" className="space-y-4">
      <header className="border-b border-[#c8aa6e]/20 pb-3">
        <div className="flex items-center gap-2 text-[#c8aa6e]">
          <Dices size={17} />
          <h3 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.16em]">Ronda y dados</h3>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          {subTab === 'COMBAT'
            ? 'Iniciativa y dados de acción para resolver las activaciones del encuentro.'
            : 'Mesa de tiradas libres para pruebas, ataques y habilidades manuales.'}
        </p>

        {/* Conmutador de sub-vistas: Combate vs Tirada libre */}
        <div className="mt-3 grid grid-cols-2 gap-1 border border-slate-800 bg-[#080d16] p-1">
          <button
            type="button"
            onClick={() => setSubTab('COMBAT')}
            className={`flex h-7 items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${
              subTab === 'COMBAT'
                ? 'border border-[#c8aa6e]/50 bg-[#c8aa6e]/15 text-[#f0e3c8]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Swords size={12} /> Combate
          </button>
          <button
            type="button"
            onClick={() => setSubTab('FREE_DICE')}
            className={`flex h-7 items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${
              subTab === 'FREE_DICE'
                ? 'border border-[#c8aa6e]/50 bg-[#c8aa6e]/15 text-[#f0e3c8]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Dices size={12} /> Tirada libre
          </button>
        </div>
      </header>

      {subTab === 'FREE_DICE' ? (
        <CanvasDiceTable
          combatRuntime={combatRuntime}
          isPlayerView={isPlayerView}
          playerName={playerName}
        />
      ) : (
        <>
          {!state || state.status === 'finished' ? (
            <div className="border-y border-slate-800/70 py-5">
              <p className="text-[10px] leading-relaxed text-slate-400">
                {state?.status === 'finished' ? 'El combate anterior ha finalizado.' : 'Todavía no hay un combate activo en este encuentro.'}
              </p>
              {!isPlayerView && (
                <button
                  type="button"
                  onClick={combatRuntime?.startCombat}
                  className="mt-4 h-11 w-full border border-[#c8aa6e]/55 bg-[#c8aa6e]/10 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.16em] text-[#d8bf88] hover:bg-[#c8aa6e]/15"
                >
                  Preparar combate
                </button>
              )}
            </div>
          ) : state.roundPhase === 'rolling' ? (
            <div>
              <div className="flex items-end justify-between border-b border-slate-800/70 pb-3">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600">Preparación</span>
                  <h4 className="font-['Cinzel'] text-base text-[#eee5d3]">Ronda {state.round}</h4>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-500">Esperando tiradas</span>
              </div>
              {!isPlayerView && participants.some((p) => p.awaitingRoll) && combatRuntime?.rollAllPending && (
                <button
                  type="button"
                  onClick={combatRuntime.rollAllPending}
                  className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15"
                >
                  <Dices size={13} /> Tirar todas las pendientes
                </button>
              )}
              {participants.map((participant) => (
                <SetupParticipant
                  key={participant.tokenId}
                  participant={participant}
                  canManage={participantCanBeManaged(participant, combatRuntime?.controlledTokenIds)}
                  runtime={combatRuntime}
                />
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between border-b border-slate-800/70 pb-3">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600">Combate activo</span>
                  <h4 className="font-['Cinzel'] text-base text-[#eee5d3]">Ronda {state.round}</h4>
                </div>
                <span className="font-mono text-[9px] text-[#d7b867]">
                  {roundComplete ? 'Ronda resuelta' : `Bloque ${state.activeBlockIndex + 1}/${state.blocks.length}`}
                </span>
              </div>

              {sortedParticipants
                .filter((participant) => participant.initiative !== null
                  && participant.initiative !== undefined
                  && Number.isFinite(Number(participant.initiative)))
                .map((participant) => (
                  <RoundParticipant
                    key={participant.tokenId}
                    participant={participant}
                    activeBlock={activeBlock}
                    canManage={participantCanBeManaged(participant, combatRuntime?.controlledTokenIds)}
                    runtime={combatRuntime}
                    isPlayerView={isPlayerView}
                  />
                ))}
            </div>
          )}

          {!isPlayerView && state && state.status !== 'finished' && (
            <div className="space-y-2 border-t border-[#c8aa6e]/20 pt-4">
              {roundComplete && (
                <button type="button" onClick={combatRuntime?.nextRound} className="h-10 w-full border border-[#c8aa6e]/55 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15">
                  Siguiente ronda
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={combatRuntime?.undoActivation} disabled={state.roundPhase !== 'turns'} className="flex h-9 items-center justify-center gap-2 border border-slate-800 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-300 disabled:opacity-30">
                  <ChevronLeft size={12} /> Deshacer turno
                </button>
                <button type="button" onClick={combatRuntime?.finishCombat} className="flex h-9 items-center justify-center gap-2 border border-red-900/50 text-[8px] font-bold uppercase tracking-[0.12em] text-red-400/70 hover:bg-red-950/20 hover:text-red-300">
                  <Flag size={12} /> Finalizar
                </button>
              </div>
              <button type="button" onClick={combatRuntime?.startCombat} className="flex h-8 w-full items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-700 hover:text-slate-400">
                <RotateCcw size={11} /> Reiniciar orden
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CanvasCombatPanel;
