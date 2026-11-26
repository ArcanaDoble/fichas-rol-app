import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import FreeParryWindow, { ParryPortrait } from './FreeParryWindow';
import useFreeParryRoom from './useFreeParryRoom';
import { freeParryService } from './freeParryService';
import { preparePrivateChoice, projectGame, readPrivateChoice, seatForViewer } from './freeParryProtocol';
import { memberOnline, PARRY_HISTORY_LIMIT } from './freeParryRoom';
import { CombatRose } from '../canvas/components/CampaignCombatControls';
import { parryResultLabel } from './freeParryZones';

const ParryContext = createContext(null);
export const useFreeParry = () => useContext(ParryContext);
const defaultConfig = { viewer:null, players:[] };

function RoomIdentity({ person, busy, onRename }) {
  const [name, setName] = useState(person.name);
  useEffect(() => setName(person.name), [person.name]);
  return <form className="parry-room-identity" onSubmit={event => { event.preventDefault(); if (name.trim()) onRename(name.trim()); }}>
    {person.image && <div className="parry-room-identity-art" aria-hidden="true"><ParryPortrait person={person} /></div>}
    <label className="parry-field">Tu personaje<input value={name} onChange={event => setName(event.target.value)} maxLength={80} autoComplete="off" /></label>
    {name.trim() !== person.name && <button type="submit" className="parry-text-button" disabled={busy || !name.trim()}>Usar personaje</button>}
  </form>;
}

function RoomRoster({ room, self, viewerId, busy, waiting, now, onStart, onRename, onLeave, headingRef }) {
  const members = Object.values(room?.members || {}).sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
  return <aside className="parry-room-sidebar" aria-label="Participantes de la sala">
    {self && <RoomIdentity person={self} busy={busy} onRename={onRename} />}
    <div className="parry-room-section-title"><h2 ref={headingRef} tabIndex={-1}>En la sala</h2><span>{members.filter(person => memberOnline(person, now)).length} conectados</span></div>
    <ul className="parry-room-members">{members.map(person => {
      const own = person.controllerId === viewerId;
      const online = memberOnline(person, now);
      const seat = seatForViewer(room.current, person.controllerId);
      const status = waiting && seat ? seat === room.current.attacker ? 'Ataca' : 'Hace parry' : online ? own ? 'Tú' : '' : 'Ausente';
      return <li key={person.controllerId} data-own={own} data-online={online} data-playing={waiting && Boolean(seat)}>
        {person.image && <div className="parry-room-member-art" aria-hidden="true"><ParryPortrait person={person} /></div>}
        <ParryPortrait person={person} />
        <div className="parry-room-person"><strong>{person.name}</strong><small>{person.controller}{status && ` · ${status}`}</small></div>
        {!own && <button type="button" className="parry-room-attack" aria-label={`Atacar a ${person.name}`}
          disabled={busy || !self || !online || waiting} onClick={() => onStart(person.controllerId)}>Atacar</button>}
      </li>;
    })}</ul>
    {members.length < 2 && <p className="parry-helper">Los demás aparecerán al abrir Parry desde sus fichas o el menú del máster.</p>}
    {waiting && <p className="parry-room-note">Hay una parada en curso. Al revelarse, puedes elegir el siguiente objetivo.</p>}
    {self && <button type="button" className="parry-text-button parry-room-leave" disabled={busy} onClick={onLeave}>Salir de la sala</button>}
  </aside>;
}

function RoomHistory({ rounds, resultFor, onView, selectedId }) {
  const visible = rounds.filter(round => resultFor(round)).slice(0, PARRY_HISTORY_LIMIT);
  return <section className="parry-room-history" aria-label="Resultados de la sala">
    <div className="parry-room-section-title"><h2>Últimas paradas</h2><span>{visible.length}</span></div>
    {visible.length ? <ol>{visible.map(round => {
      const result = resultFor(round);
      return <li key={round.roundId}><button type="button" aria-pressed={selectedId === round.roundId} onClick={() => onView(round.roundId)}>
        <span className="parry-round-number">{round.round}</span>
        <span>{round.participants[round.attacker].name} <span aria-hidden="true">→</span> {round.participants[round.attacker === 'a' ? 'b' : 'a'].name}
          <small>{parryResultLabel(result)}</small></span>
        <span className="parry-history-rose" aria-hidden="true"><CombatRose phase="result" attackZone={result.attack} defenseZone={result.parry} defense="parry" matched={false} /></span>
      </button></li>;
    })}</ol> : <p className="parry-room-note">Los resultados aparecerán aquí cuando se revelen ambas elecciones.</p>}
  </section>;
}

function RoomPortraits({ room, self }) {
  const others = Object.values(room?.members || {}).filter(person => person.controllerId !== self?.controllerId).slice(0, 2);
  const people = [others[0], self, others[1]].filter(Boolean);
  return <div className="parry-room-portraits" aria-hidden="true">{people.map(person => <div key={person.controllerId} data-own={person.controllerId === self?.controllerId}>
    <div className="parry-room-medallion"><ParryPortrait person={person} /></div>
    <span>{person.name}</span>
  </div>)}</div>;
}

export function FreeParryProvider({ children, service = freeParryService, storage = globalThis.localStorage, initialConfig = defaultConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const viewerId = config.viewer?.controllerId || '';
  const runtime = useFreeParryRoom(viewerId, service, storage);
  const [open, setOpen] = useState(false), [tab, setTab] = useState('room');
  const [historyId, setHistoryId] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [rosterRequested, setRosterRequested] = useState(false);
  const rosterHeading = useRef(null);
  const busyRef = useRef(false), currentViewer = useRef(viewerId), actor = useRef(null);
  currentViewer.current = viewerId;
  const dialog = useRef(null);
  const configure = useCallback(next => setConfig(previous => previous.viewer?.controllerId === next.viewer?.controllerId
    && previous.viewer?.name === next.viewer?.name && previous.players === next.players ? previous : next), []);
  const run = useCallback(async operation => {
    if (busyRef.current) return null;
    const startedAs = viewerId;
    busyRef.current = true; setBusy(true); setError('');
    try { return await operation(); }
    catch (failure) { if (currentViewer.current === startedAs) setError(failure?.message || 'No se pudo guardar. Reinténtalo.'); return null; }
    finally { busyRef.current = false; setBusy(false); }
  }, [viewerId]);
  const join = useCallback(source => run(() => service.roomCommand(viewerId, { type:'join', replaceActor:Boolean(source),
    person:{ ...config.viewer, ...source, controllerId:viewerId, controller:config.viewer.controller } })), [run, viewerId, config.viewer, service]);
  const openTool = useCallback(source => {
    if (!viewerId) return;
    actor.current = source || null;
    setError(''); setHistoryId(null); setTab(runtime.room?.current?.status === 'active' ? 'exchange' : 'room'); setOpen(true);
    join(source);
  }, [viewerId, join, runtime.room?.current?.status]);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { setOpen(false); setHistoryId(null); setDrafts({}); setError(''); actor.current = null; }, [viewerId]);
  const current = runtime.room?.current;
  const currentSeat = seatForViewer(current, viewerId);
  const result = current && runtime.resultFor(current);
  const waiting = current?.status === 'active' && !result;
  const pending = runtime.joined && currentSeat && waiting ? 1 : 0;
  const selected = historyId ? runtime.room?.history.find(round => round.roundId === historyId) : current;
  const seat = historyId ? null : seatForViewer(selected, viewerId);
  const draftKey = selected ? `${selected.roundId}:${viewerId}` : '';
  const secret = selected && seat && readPrivateChoice(selected, viewerId, storage);
  const view = selected?.status === 'active' && projectGame(selected, historyId ? '' : viewerId, secret, runtime.resultFor(selected), true);
  if (view && seat && !view.ownLocked) view.ownChoice = drafts[draftKey] || null;
  useEffect(() => { if (current?.status === 'active') { setHistoryId(null); setTab('exchange'); } }, [current?.roundId, current?.status]);
  useEffect(() => {
    if (!rosterRequested || !open || tab !== 'room') return;
    rosterHeading.current?.scrollIntoView?.({ block:'nearest' });
    rosterHeading.current?.focus({ preventScroll:true });
    setRosterRequested(false);
  }, [rosterRequested, open, tab]);
  const showRoster = () => { setTab('room'); setRosterRequested(true); };
  useEffect(() => {
    if (!open || !viewerId) return undefined;
    const previous = document.activeElement, element = dialog.current;
    if (typeof element.showModal === 'function') element.showModal(); else element.setAttribute('open', '');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close?.(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus?.({ preventScroll:true }); };
  }, [open, viewerId]);
  const value = useMemo(() => ({ viewer:config.viewer, configure, open:openTool, pending }), [config.viewer, configure, openTool, pending]);
  const gameCommand = event => run(() => service.roomCommand(viewerId, { ...event, roundId:current?.roundId, sessionId:current?.sessionId }));
  const start = targetId => run(async () => {
    const next = await service.roomCommand(viewerId, { type:'start', targetId });
    if (currentViewer.current === viewerId && next) { setHistoryId(null); setTab('exchange'); }
  });
  const lock = () => run(async () => {
    const choice = await preparePrivateChoice(selected, viewerId, drafts[draftKey], storage);
    await service.roomCommand(viewerId, { type:'commit', roundId:selected.roundId, sessionId:selected.sessionId, commitment:choice.commitment });
  });
  return <ParryContext.Provider value={value}>
    {children}
    {open && viewerId && <dialog ref={dialog} className="free-parry parry-modal parry-room-modal" aria-label="Sala de Parry libre" onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="parry-modal-content parry-room" data-mobile-tab={tab}>
        <header className="parry-window-header parry-room-header"><div className="parry-room-brand">
          <h1>Parry libre</h1>
          <p className="parry-room-header-note">Elige un rival, fija en secreto y descubre el resultado.</p></div>
          <button type="button" className="parry-close" aria-label="Cerrar Parry libre" onClick={close}><X size={20} aria-hidden="true" /></button></header>
        <nav className="parry-room-tabs" aria-label="Vista de la sala">
          <button type="button" aria-pressed={tab === 'room'} onClick={() => setTab('room')}>Participantes</button>
          <button type="button" aria-pressed={tab === 'exchange'} onClick={() => setTab('exchange')}>Parada {current?.round || ''}</button>
        </nav>
        {(error || runtime.error) && <div className="parry-error parry-room-error" role="alert">{error || runtime.error}<button type="button" onClick={() => { setError(''); runtime.reconnect(); if (!runtime.joined) join(actor.current); }}>Reintentar conexión</button></div>}
        {runtime.joined && runtime.syncing && !runtime.error && <div className="parry-waiting" role="status">Sincronizando la sala…</div>}
        {runtime.loading ? <p role="status" className="parry-helper parry-room-loading">Cargando sala…</p>
          : !runtime.joined ? <p role="status" className="parry-helper parry-room-loading">{busy ? 'Entrando en la sala…' : 'Abre Parry para entrar en la sala.'}</p>
            : <div className="parry-room-layout">
              <div className="parry-room-sidebar-content">
                <RoomRoster room={runtime.room} self={runtime.self} viewerId={viewerId} busy={busy || runtime.syncing} waiting={waiting} now={runtime.now} onStart={start} headingRef={rosterHeading}
                  onRename={name => run(() => service.roomCommand(viewerId, { type:'rename', person:{ name, image:'', characterId:'' } }))}
                  onLeave={() => run(async () => { await service.roomCommand(viewerId, { type:'leave' }); if (currentViewer.current === viewerId) close(); })} />
                <RoomHistory rounds={runtime.room.history} resultFor={runtime.resultFor} selectedId={historyId}
                  onView={id => { setHistoryId(id); setTab('exchange'); }} />
              </div>
              <main className="parry-room-stage" aria-label="Parada de la sala">
                {historyId && <button type="button" className="parry-text-button" onClick={() => { setHistoryId(null); setTab('exchange'); }}>Volver a la parada actual</button>}
                {view ? <FreeParryWindow view={view} seat={seat} roomMode busy={busy} syncing={runtime.syncing} onClose={close} error="" onRetry={runtime.reconnect}
                  onChoose={zone => { if (seat && !busy && !view.ownLocked) setDrafts(previous => ({ ...previous, [draftKey]:zone })); }}
                  onLock={lock} onNext={swap => gameCommand({ type:'next', swap })} onLobby={showRoster}
                  onEnd={!historyId && waiting && (currentSeat || viewerId === 'master') ? () => gameCommand({ type:'close' }) : null} />
                  : <section className="parry-room-empty">
                    <RoomPortraits room={runtime.room} self={runtime.self} />
                    <h2>{current?.status === 'closed' ? 'Parada cancelada' : 'La sala está preparada'}</h2>
                    <p>Pulsa <strong>Atacar</strong> junto a otro participante para empezar directamente.</p>
                    <p>Los demás pueden observar. Las zonas solo se muestran cuando los dos confirman.</p>
                    <button type="button" className="parry-secondary parry-mobile-roster" onClick={() => setTab('room')}>Ver participantes</button>
                  </section>}
              </main>
            </div>}
      </div>
    </dialog>}
  </ParryContext.Provider>;
}

export function FreeParryEntry({ actor, className = '', variant = 'button' }) {
  const parry = useFreeParry();
  if (!parry?.viewer) return null;
  const entryClass = variant === 'tag'
    ? 'parry-sheet-tag px-3 py-1 bg-amber-900/40 border border-amber-500/50 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-amber-800/60 transition-colors relative'
    : 'parry-sheet-access';
  return <button type="button" className={`${entryClass} ${className}`} onClick={() => parry.open(actor)}
    title="Abrir Parry libre" aria-label={actor?.name ? `Abrir Parry libre con ${actor.name}` : 'Abrir Parry libre'}>
    {variant === 'tag' ? 'Parry' : 'Parry libre'}{parry.pending > 0 && <span>{parry.pending}</span>}</button>;
}
