import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, Dices, Flag, RotateCcw, Swords } from 'lucide-react';

import DiceSvg from '../../../components/DiceSvg';

const STATUS_ORDER = ['available', 'committed', 'spent'];
const STATUS_LABELS = {
  available: 'Disponible',
  committed: 'Comprometido',
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
            : <div className="grid h-full w-full place-items-center"><Swords size={15} className="text-slate-600" /></div>}
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
    ? 'border-[#c8aa6e]/45 text-[#d8bf88] bg-[#c8aa6e]/5'
    : die.status === 'committed'
      ? 'border-sky-400/50 text-sky-300 bg-sky-400/10'
      : 'border-slate-800 text-slate-600 bg-black/20 opacity-70';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(nextStatus)}
      className={`flex min-w-0 flex-1 items-center gap-2 border px-2 py-2 text-left transition-colors ${tone} ${disabled ? 'cursor-default' : 'hover:border-[#c8aa6e]'}`}
      aria-label={`${die.die} con resultado ${die.value}: ${STATUS_LABELS[die.status]}`}
    >
      <DiceSvg faces={die.sides} value={die.value} className="h-8 w-8 shrink-0" />
      <span className="min-w-0">
        <span className="block font-['Cinzel'] text-[9px] font-bold uppercase">{die.die}</span>
        <span className="block truncate text-[7px] font-bold uppercase tracking-[0.1em] opacity-70">{STATUS_LABELS[die.status]}</span>
      </span>
    </button>
  );
};

const RoundParticipant = ({ participant, activeBlock, canManage, runtime }) => {
  const hasActed = activeBlock?.actedIds?.includes(participant.tokenId);
  const isInActiveBlock = activeBlock?.memberIds?.includes(participant.tokenId);
  return (
    <article className={`border-b border-slate-800/70 py-4 last:border-b-0 ${hasActed ? 'opacity-55' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h5 className="truncate font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.08em] text-[#eee5d3]">{participant.name}</h5>
          <span className="font-mono text-[9px] text-[#d7b867]">Iniciativa {participant.initiative}</span>
        </div>
        {isInActiveBlock && !hasActed && <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-400">Turno activo</span>}
        {hasActed && <Check size={15} className="text-slate-500" />}
      </div>

      {participant.side === 'players' && (
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
      {participant.side === 'enemies' && participant.threatDie && (
        <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-slate-500">
          Amenaza {participant.threatDie.toUpperCase()} · <strong className="text-[#d8bf88]">{participant.threatValue}</strong>
        </p>
      )}

      {isInActiveBlock && !hasActed && canManage && (
        <button
          type="button"
          onClick={() => runtime.completeActivation(participant.tokenId)}
          className="mt-3 h-9 w-full border border-emerald-500/35 bg-emerald-500/5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10"
        >
          Finalizar activación
        </button>
      )}
    </article>
  );
};

const CanvasCombatPanel = ({ activeTab, combatRuntime, isPlayerView }) => {
  const state = combatRuntime?.combatState;
  const participants = useMemo(() => Object.values(state?.participants || {}).sort(
    (left, right) => left.orderIndex - right.orderIndex,
  ), [state?.participants]);
  if (activeTab !== 'ROUND') return null;

  const activeBlock = state?.blocks?.[state.activeBlockIndex] || null;
  const roundComplete = state?.roundPhase === 'turns' && state.activeBlockIndex >= (state.blocks?.length || 0);

  return (
    <section data-testid="canvas-combat-panel" className="space-y-5">
      <header className="border-b border-[#c8aa6e]/20 pb-4">
        <div className="flex items-center gap-2 text-[#c8aa6e]">
          <Dices size={17} />
          <h3 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.16em]">Ronda e iniciativa</h3>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          La tirada inicial determina la iniciativa y conserva esos mismos dados para las acciones de la primera ronda.
        </p>
      </header>

      {!state || state.status === 'finished' ? (
        <div className="border-y border-slate-800/70 py-5">
          <p className="text-[10px] leading-relaxed text-slate-400">
            {state?.status === 'finished' ? 'El combate anterior ha finalizado.' : 'Todavía no hay un combate activo en este encuentro.'}
          </p>
          {!isPlayerView && (
            <button
              type="button"
              onClick={combatRuntime.startCombat}
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
          {participants.map((participant) => (
            <SetupParticipant
              key={participant.tokenId}
              participant={participant}
              canManage={participantCanBeManaged(participant, combatRuntime.controlledTokenIds)}
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

          {participants
            .filter((participant) => participant.initiative !== null
              && participant.initiative !== undefined
              && Number.isFinite(Number(participant.initiative)))
            .sort((left, right) => right.initiative - left.initiative || left.orderIndex - right.orderIndex)
            .map((participant) => (
              <RoundParticipant
                key={participant.tokenId}
                participant={participant}
                activeBlock={activeBlock}
                canManage={participantCanBeManaged(participant, combatRuntime.controlledTokenIds)}
                runtime={combatRuntime}
              />
            ))}
        </div>
      )}

      {!isPlayerView && state && state.status !== 'finished' && (
        <div className="space-y-2 border-t border-[#c8aa6e]/20 pt-4">
          {roundComplete && (
            <button type="button" onClick={combatRuntime.nextRound} className="h-10 w-full border border-[#c8aa6e]/55 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15">
              Siguiente ronda
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={combatRuntime.undoActivation} disabled={state.roundPhase !== 'turns'} className="flex h-9 items-center justify-center gap-2 border border-slate-800 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-300 disabled:opacity-30">
              <ChevronLeft size={12} /> Deshacer turno
            </button>
            <button type="button" onClick={combatRuntime.finishCombat} className="flex h-9 items-center justify-center gap-2 border border-red-900/50 text-[8px] font-bold uppercase tracking-[0.12em] text-red-400/70 hover:bg-red-950/20 hover:text-red-300">
              <Flag size={12} /> Finalizar
            </button>
          </div>
          <button type="button" onClick={combatRuntime.startCombat} className="flex h-8 w-full items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-700 hover:text-slate-400">
            <RotateCcw size={11} /> Reiniciar orden
          </button>
        </div>
      )}
    </section>
  );
};

export default CanvasCombatPanel;
