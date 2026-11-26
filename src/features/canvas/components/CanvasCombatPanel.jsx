import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, Dices, Flag, Footprints, RotateCcw, Shield, Swords, Undo } from 'lucide-react';

import ActionDieSvg from '../../../components/ActionDieSvg';
import { getCampaignThreatPool } from '../combat/campaignThreatDice';

import { canAdvanceCanvasRound, getAvailableMovement, getCanvasCombatReinforcements, getMovementBase } from '../combat/canvasCombatState';
import CanvasDiceTable from './CanvasDiceTable';

const STATUS_ORDER = ['available', 'committed', 'spent'];
const STATUS_LABELS = {
  available: 'Disponible',
  committed: 'Reservado',
  spent: 'Gastado',
};

const participantCanBeManaged = (participant, controlledTokenIds = []) => (
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
                className="min-h-11 border border-slate-700 bg-[#080d16] text-center font-mono text-sm text-[#eee5d3] outline-none focus:border-[#c8aa6e]"
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
        <button type="button" onClick={onCancel} className="min-h-11 border border-slate-800 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300">
          Cancelar
        </button>
        <button type="button" onClick={() => onSubmit(values)} className="min-h-11 border border-[#c8aa6e]/60 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15">
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
            <div className="mt-1 flex items-center gap-1.5" aria-label={participant.actionDiceProfile.map((die) => die.toUpperCase()).join(' · ')}>
              <span className="sr-only">{participant.actionDiceProfile.map((die) => die.toUpperCase()).join(' · ')}</span>
              {participant.actionDiceProfile.map((die, dieIndex) => {
                const faces = Number.parseInt(String(die).replace(/\D/g, ''), 10) || 6;
                return (
                  <span key={`${die}-${dieIndex}`} className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <ActionDieSvg faces={faces} value={faces} title={die.toUpperCase()} className="h-5 w-5" />
                    {die.toUpperCase()}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!isEnemy && participant.awaitingRoll && canManage && !manualOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => runtime.rollActionDice(participant.tokenId)}
            className="min-h-11 border border-[#c8aa6e]/50 bg-[#c8aa6e]/10 px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15"
          >
            Tirar aquí
          </button>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="min-h-11 border border-slate-700 px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 hover:border-[#c8aa6e]/40 hover:text-[#d8bf88]"
          >
            Anotar mesa
          </button>
        </div>
      )}
      {manualOpen && participant.awaitingRoll && (
        <ManualRoll
          participant={participant}
          onCancel={() => setManualOpen(false)}
          onSubmit={async (values) => {
            if (await runtime.submitRoll(participant.tokenId, values, 'manual')) setManualOpen(false);
          }}
        />
      )}
    </article>
  );
};

const ActionDie = ({ die, disabled, onChange }) => {
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(die.status) + 1) % STATUS_ORDER.length];
  const isAvailable = die.status === 'available';
  const isCommitted = die.status === 'committed';
  const tone = isAvailable
    ? 'border-[#c8aa6e]/40 bg-[#c8aa6e]/[0.05] hover:border-[#c8aa6e]/80 hover:bg-[#c8aa6e]/[0.10]'
    : isCommitted
      ? 'border-sky-400/50 bg-sky-500/[0.08] hover:border-sky-400/80 hover:bg-sky-500/[0.14]'
      : 'border-slate-800/80 bg-black/40 opacity-40 grayscale hover:opacity-60';
  const labelTone = isAvailable ? 'text-[#d8bf88]' : isCommitted ? 'text-sky-300' : 'text-slate-500';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(nextStatus)}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-between rounded border px-1.5 py-2 text-center transition-all ${tone} ${
        disabled ? 'cursor-default' : 'active:scale-[0.97]'
      }`}
      aria-label={`${die.die} con resultado ${die.value}: ${STATUS_LABELS[die.status]}`}
      title={`${die.die} (${die.value}) — ${STATUS_LABELS[die.status]}`}
    >
      <div className="flex w-full items-center justify-center">
        <span className="font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {die.die}
        </span>
      </div>
      <div className="my-1.5 flex items-center justify-center">
        <ActionDieSvg
          faces={die.sides}
          value={die.value}
          status={die.status}
          accent={isCommitted ? 'blue' : 'gold'}
          selected={isCommitted}
          className="h-10 w-10"
          title={`${die.die} · ${die.value} · ${STATUS_LABELS[die.status]}`}
        />
      </div>
      <span className={`text-[8px] font-bold uppercase tracking-[0.14em] ${labelTone}`}>
        {STATUS_LABELS[die.status]}
      </span>
    </button>
  );
};

const EnemyAction = ({ action, disabled, onChange, statusLabel = null, title = null }) => {
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(action.status) + 1) % STATUS_ORDER.length];
  const isMove = action.id === 'movement';
  const Icon = action.icon || (isMove ? Footprints : action.id === 'defense' ? Shield : Swords);
  const visibleStatus = statusLabel || STATUS_LABELS[action.status];
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
      aria-label={`${action.label}: ${visibleStatus}`}
      title={title || `${action.label} — ${visibleStatus} (Haz clic para cambiar)`}
    >
      <div className="flex w-full items-center justify-center px-1 text-[8px] font-bold uppercase tracking-wider opacity-75">
        <span className="font-['Cinzel'] truncate">{action.label}</span>
      </div>
      <div className="my-1.5 flex items-center justify-center">
        <Icon size={17} className={action.status === 'committed' ? 'text-sky-300' : (action.status === 'available' ? 'text-[#d8bf88]' : 'text-slate-500')} />
      </div>
      <span className={`w-full py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] border-t ${statusBadgeClass}`}>
        {visibleStatus}
      </span>
    </button>
  );
};

const RoundParticipant = ({ participant, activeBlock, participantBlock, canManage, runtime, isPlayerView }) => {
  const hasActed = participantBlock?.actedIds?.includes(participant.tokenId);
  const isInActiveBlock = activeBlock?.memberIds?.includes(participant.tokenId);
  const isEnemy = participant.side === 'enemies';
  const enemyActions = participant.enemyActions || [
    { id: 'movement', label: 'Movimiento', type: 'movement', status: 'available' },
    { id: 'attack', label: 'Ataque', type: 'attack', status: 'available' },
  ];

  const movementBase = participant.movementRuntime?.base ?? getMovementBase(participant);
  const movementModifier = participant.movementRuntime?.modifier ?? 0;
  const movementSpent = participant.movementRuntime?.spent ?? 0;
  const sprintBonus = participant.movementRuntime?.sprintBonus ?? 0;
  const movementAvailable = Math.max(0, movementBase + movementModifier + sprintBonus - movementSpent);
  const enemyAttackAction = isEnemy ? enemyActions.find((action) => action.id === 'attack') : null;
  const enemyMovementBase = Math.max(0, movementBase + movementModifier);
  const canEnemySprint = isEnemy
    && canManage
    && enemyAttackAction?.status !== 'spent'
    && movementAvailable < enemyMovementBase;
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
            {isInActiveBlock && !hasActed && <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e]">Activo</span>}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="font-mono text-[9px] text-[#d7b867]">Iniciativa {participant.initiative}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                <Footprints size={10} className="text-[#c8aa6e]" />
                <span className="text-[#c8aa6e] font-mono">{movementAvailable}</span>
                <span className="text-[8px] text-slate-500">({movementBase}{movementModifier !== 0 ? (movementModifier > 0 ? `+${movementModifier}` : movementModifier) : ''}{sprintBonus > 0 ? ` + correr ${sprintBonus}` : ''})</span>
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

      {!isEnemy && !participant.campaignHiddenResources && (
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

      {participant.campaignHiddenResources && <p className="mt-3 text-xs text-slate-400">Recursos reservados</p>}
      {isEnemy && !participant.campaignHiddenResources && (
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
            <EnemyAction
              action={{
                id: 'sprint',
                label: 'Correr',
                type: 'sprint',
                status: canEnemySprint ? 'available' : 'spent',
                icon: RotateCcw,
              }}
              disabled={!canEnemySprint}
              statusLabel={enemyAttackAction?.status === 'spent'
                ? 'Sin ataque'
                : movementAvailable >= enemyMovementBase
                  ? 'Completo'
                  : 'Gasta ataque'}
              title={enemyAttackAction?.status === 'spent'
                ? 'La acción de Ataque ya está gastada'
                : movementAvailable >= enemyMovementBase
                  ? 'El movimiento base ya está completo'
                  : `Gastar Ataque para recargar ${enemyMovementBase} casillas`}
              onChange={() => runtime.activateEnemySprint?.(participant.tokenId)}
            />
          </div>
          {participant.rulesSystem === 'campaign' && Array.isArray(participant.campaignThreatDice) ? <div className="flex flex-wrap gap-2 text-xs text-[#d8bf88]" aria-label="Reserva de Amenaza">
            {getCampaignThreatPool(participant).map(die => <span key={die.id}>Amenaza {die.die.toUpperCase()} · {die.status === 'spent' ? 'Gastado' : die.value}</span>)}
          </div> : participant.threatDie && (
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
        {!isPlayerView && hasActed && (
          <button
            type="button"
            onClick={() => runtime.undoActivation && runtime.undoActivation(participant.tokenId)}
            className="h-8 flex-1 border border-amber-500/35 bg-amber-500/10 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-500/20 rounded"
            title={`Reabrir la activación de ${participant.name}`}
          >
            Reabrir turno
          </button>
        )}
        {isInActiveBlock && !hasActed && canManage && (
          <button
            type="button"
            onClick={() => runtime.completeActivation(participant.tokenId)}
            className="h-8 flex-1 border border-[#c8aa6e]/50 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.16em] text-[#e8cf91] hover:bg-[#c8aa6e]/20 hover:border-[#c8aa6e] rounded transition-all"
          >
            Finalizar turno
          </button>
        )}
      </div>
    </article>
  );
};

const CanvasCombatPanel = ({ activeScenario, activeTab, combatRuntime = {}, isPlayerView, playerName }) => {
  const [subTab, setSubTab] = useState('COMBAT'); // 'COMBAT' | 'FREE_DICE'
  const [joiningId, setJoiningId] = useState(null);
  const state = combatRuntime?.combatState;
  const participants = useMemo(() => Object.values(state?.participants || {}).sort(
    (left, right) => left.orderIndex - right.orderIndex,
  ), [state?.participants]);
  if (activeTab !== 'ROUND') return null;

  const activeBlock = state?.blocks?.[state.activeBlockIndex] || null;
  const roundComplete = state?.roundPhase === 'turns' && state.activeBlockIndex >= (state.blocks?.length || 0);
  const campaign = combatRuntime.campaignRules;
  const pendingRolls = participants.filter(participant => participant.awaitingRoll);
  const lateRolls = state?.roundPhase === 'turns' ? pendingRolls.filter(participant => !isPlayerView
    || participantCanBeManaged(participant, combatRuntime.controlledTokenIds)) : [];
  const reinforcements = campaign && !isPlayerView ? getCanvasCombatReinforcements(state, activeScenario?.items) : [];
  const joinRound = async id => {
    setJoiningId(id);
    try { await combatRuntime.setCombatParticipation?.(id, true, { joinNow: true }); } finally { setJoiningId(null); }
  };
  const rollPending = !isPlayerView && pendingRolls.length > 0 && combatRuntime.rollAllPending && (
    <button type="button" onClick={combatRuntime.rollAllPending}
      className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d8bf88] hover:bg-[#c8aa6e]/15">
      <Dices size={13} /> Tirar todas las pendientes
    </button>
  );

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

      {subTab === 'COMBAT' && (combatRuntime.mutableArmorTokens || []).map(token => (
        <div key={token.id} className="border-b border-[#c8aa6e]/25 pb-3">
          <p className="font-['Cinzel'] text-xs text-[#d8bf88]">{token.name} · Protección mutable</p>
          <p className="mt-1 text-[11px] text-slate-400">{token.armorProtectionChoice ? 'Protección fijada hasta el final del combate.' : 'Elige una protección para todo el combate.'}</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {[['critico', 'Crítico'], ['perforante', 'Perforación'], ['conmocion', 'Conmoción'], ['empuje', 'Empuje']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={token.armorProtectionChoice === value}
                disabled={Boolean(token.armorProtectionChoice)} onClick={() => combatRuntime.chooseArmorProtection(token.id, value)}
                className={`min-h-[44px] border px-2 text-xs ${token.armorProtectionChoice === value ? 'border-[#c8aa6e] text-[#eee5d3]' : 'border-slate-700 text-slate-400'}`}>{label}</button>
            ))}
          </div>
        </div>
      ))}
      {subTab === 'FREE_DICE' ? (
        <CanvasDiceTable
          combatRuntime={combatRuntime}
          isPlayerView={isPlayerView}
          playerName={playerName}
        />
      ) : (
        <>
          {reinforcements.length > 0 && <section className="border-b border-[#c8aa6e]/25 pb-3" aria-label="Refuerzos pendientes">
            <h4 className="font-fantasy text-sm font-bold text-[#d8bf88]">Refuerzos pendientes</h4>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              {state.roundPhase === 'rolling' ? 'Puedes preparar su iniciativa ahora.' : 'Se incorporan en la siguiente ronda.'}
            </p>
            {reinforcements.map(token => <div key={token.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-800/60 py-2 last:border-0">
              <span className="min-w-20 flex-1 break-words text-sm text-[#eee5d3]">{token.name || 'Ficha'}</span>
              <button type="button" onClick={() => joinRound(token.id)} disabled={joiningId !== null}
                className="min-h-11 shrink-0 border border-[#c8aa6e]/35 px-2 font-fantasy text-[10px] text-[#d8bf88] hover:bg-[#c8aa6e]/10 disabled:opacity-50"
                aria-label={`${state.roundPhase === 'rolling' ? 'Preparar iniciativa de' : 'Incorporar a esta ronda a'} ${token.name || 'Ficha'}`}>
                {state.roundPhase === 'rolling' ? 'Preparar iniciativa' : 'Incorporar a esta ronda'}
              </button>
            </div>)}
          </section>}
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
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{campaign ? 'Preparar iniciativa' : 'Preparación'}</span>
                  <h4 className="font-['Cinzel'] text-base text-[#eee5d3]">Ronda {state.round}</h4>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-500">
                  {pendingRolls.length ? 'Esperando tiradas' : 'Iniciativa lista'}
                </span>
              </div>
              {rollPending}
              {participants.map((participant) => (
                <SetupParticipant
                  key={participant.tokenId}
                  participant={participant}
                  canManage={participantCanBeManaged(participant, combatRuntime?.controlledTokenIds)}
                  runtime={combatRuntime}
                />
              ))}
              {!isPlayerView && state.requiresStart && <button type="button" onClick={combatRuntime.startPreparedCombat}
                disabled={pendingRolls.length > 0 || (!participants.length && !reinforcements.length)}
                className="mt-3 min-h-11 w-full border border-[#c8aa6e]/55 bg-[#c8aa6e] px-3 font-fantasy text-xs font-bold text-[#0b1120] hover:bg-[#dec38a] disabled:border-slate-800 disabled:bg-[#141b28] disabled:text-slate-500">
                Empezar combate
              </button>}
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between border-b border-slate-800/70 pb-3">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600">Combate activo</span>
                  <h4 className="font-['Cinzel'] text-base text-[#eee5d3]">Ronda {state.round}</h4>
                </div>
                <span className="font-mono text-[9px] text-[#d7b867]">
                  {roundComplete ? (pendingRolls.length ? 'Iniciativa pendiente' : 'Ronda resuelta') : `Bloque ${state.activeBlockIndex + 1}/${state.blocks.length}`}
                </span>
              </div>

              {lateRolls.length > 0 && <section className="mt-3 border-l-2 border-[#c8aa6e]/45 bg-[#c8aa6e]/5 px-3 pt-3" aria-label="Iniciativa de refuerzos">
                <h4 className="font-fantasy text-sm font-bold text-[#e6d2a6]">{isPlayerView ? 'Prepara tu iniciativa' : 'Iniciativa de refuerzos'}</h4>
                {rollPending}
                {lateRolls.map(participant => <SetupParticipant key={participant.tokenId} participant={participant}
                  canManage={participantCanBeManaged(participant, combatRuntime.controlledTokenIds)} runtime={combatRuntime} />)}
              </section>}
              {(state.blocks || []).flatMap(block => block.memberIds.map(id => state.participants?.[id]).filter(Boolean).map(participant => (
                  <RoundParticipant
                    key={participant.tokenId}
                    participant={participant}
                    activeBlock={activeBlock}
                    participantBlock={block}
                    canManage={participantCanBeManaged(participant, combatRuntime?.controlledTokenIds)}
                    runtime={combatRuntime}
                    isPlayerView={isPlayerView}
                  />
                )))}
            </div>
          )}

          {!isPlayerView && state && state.status !== 'finished' && (
            <div className="space-y-2 border-t border-[#c8aa6e]/20 pt-4">
              {roundComplete && (
                <button type="button" onClick={combatRuntime?.nextRound} disabled={campaign && !canAdvanceCanvasRound(state)}
                  className="min-h-11 w-full border border-[#c8aa6e]/55 bg-[#c8aa6e]/10 text-[9px] font-bold uppercase tracking-[0.14em] text-[#d8bf88] hover:bg-[#c8aa6e]/15 disabled:opacity-50">
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
              {!campaign && <button type="button" onClick={combatRuntime?.startCombat} className="flex h-8 w-full items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-700 hover:text-slate-400">
                <RotateCcw size={11} /> Reiniciar orden
              </button>}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CanvasCombatPanel;
