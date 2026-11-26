import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Crosshair,
  Eye,
  Map as MapIcon,
  Spline,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import TableScene from './TableScene';
import { MAX_ANGLE, PATIO_ANGLE } from './patioMovement';
import TableBook from './TableBook';
import MapSurveyToolbar from './MapSurveyToolbar';
import ClassBox from './ClassBox';
import usePieceArtwork from './usePieceArtwork';
import { decodedMaps } from './decodedMaps';
import { loadTableCatalog, starterCatalog } from './catalog';
import { invitationFrom, tableLink } from './navigation';
import {
  createRoom,
  joinRoom,
  inviteSeat,
  watchRoom,
  sendCommand,
  grabPiece,
  releasePiece,
  dragPiece,
  undoRoom,
  getSavedSession,
  forgetSession,
  fetchRoomMap,
} from './roomClient';
import './table3d.css';

const exitToNoma = () => window.location.assign('/');
const freshId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
const roleTitle = (role) => (role === 'master' ? 'Máster' : 'Jugador');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(
  window.location.hostname
);

async function prepareFile(file) {
  if (!file || !['image/webp', 'image/png', 'image/jpeg'].includes(file.type))
    throw new Error('Elige una imagen PNG, JPEG o WebP.');
  const url = URL.createObjectURL(file),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    let side = Math.min(3072, Math.max(img.naturalWidth, img.naturalHeight));
    let image;
    do {
      const scale = side / Math.max(img.naturalWidth, img.naturalHeight);
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      image = canvas.toDataURL('image/webp', 0.9);
      side *= 0.77;
    } while (image.length > 2 * 1024 * 1024 && side > 80);
    if (image.length > 2 * 1024 * 1024)
      throw new Error('La imagen supera el espacio disponible para este mapa.');
    return {
      id: 'mapa-' + freshId(),
      name: file.name.replace(/\.[^.]+$/, ''),
      image,
      imageWidth: img.naturalWidth,
      imageHeight: img.naturalHeight,
      cols: 12,
      rows: Math.min(
        100,
        Math.max(2, Math.round((12 * img.naturalHeight) / img.naturalWidth))
      ),
      imagePrivate: true,
      fogOfWar: false,
      terrain: [],
      enemies: [],
      darkness: 0,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function useMapArtwork(session, asSeat, current) {
  const [photo, setPhoto] = useState(null);
  const mask =
    current?.visibility?.detail?.hex ||
    current?.visibility?.rowsMask?.join('/') ||
    '';
  const servedByRoom =
    current?.mapProtected ||
    (session?.role === 'master' && !asSeat && Boolean(current?.image));
  const scope = servedByRoom
    ? [
        session?.roomId,
        session?.role,
        current.id,
        asSeat || session?.seatId,
        current.cols,
        current.rows,
        current.cellAspect,
        JSON.stringify(current.imageBounds),
      ].join('|')
    : '';
  const signature = scope && scope + '|' + mask;
  const source = current?.image;
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!photo?.url) return undefined;
    const { url } = photo;
    return () => {
      decodedMaps.delete(url);
      URL.revokeObjectURL(url);
    };
  }, [photo]);
  useEffect(() => {
    if (!signature) return undefined;
    const controller = new AbortController();
    let url;
    fetchRoomMap(session, asSeat, controller.signal)
      .then(async (blob) => {
        if (controller.signal.aborted) return;
        if (!blob?.size)
          throw new Error('La ilustración del escenario está vacía.');
        url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await img.decode();
        if (controller.signal.aborted) return;
        decodedMaps.set(url, img);
        setPhoto({ scope, url });
        url = null;
        setError(null);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError({
            signature,
            error: 'No se ha podido cargar la ilustración del escenario.',
          });
      })
      .finally(() => {
        if (url) URL.revokeObjectURL(url);
      });
    return () => {
      controller.abort();
    };
  }, [session, asSeat, scope, signature, source]);
  const active = scope && photo?.scope === scope ? photo : null;
  return {
    servedByRoom,
    url: active?.url || '',
    error: error?.signature === signature ? error.error : '',
  };
}

export default function Canvas3DSection({
  mode,
  owner = '',
  initialCharacter = null,
  onBack = exitToNoma,
}) {
  const [arrival] = useState(() => invitationFrom());
  const [session, setSession] = useState(() => {
    if (arrival.invite) return null;
    const saved = getSavedSession(arrival.roomId || undefined);
    return saved && (!mode || saved.role === mode) ? saved : null;
  });
  const entryMode =
    mode ||
    (new URLSearchParams(window.location.search).has('direccion')
      ? 'master'
      : 'player');
  const [name, setName] = useState(owner);
  const [key, setKey] = useState('');
  const [ticket, setTicket] = useState(
    arrival.invite ? window.location.href : ''
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState('');
  const [asSeat, setAsSeat] = useState(null);
  const [view, setView] = useState(null);
  const [catalog, setCatalog] = useState(starterCatalog);
  const [newScene, setNewScene] = useState('patio');
  const [book, setBook] = useState('');
  const [armed, setArmed] = useState(null);
  const [survey, setSurvey] = useState({
    mode: 'select',
    grid: true,
    selectedId: null,
  });
  const [imported, setImported] = useState(null);
  const [muted, setMuted] = useState(false);
  const [tilt, setTilt] = useState(PATIO_ANGLE);
  const [focus, setFocus] = useState(null);
  const focusCounter = useRef(0);
  const pending = useRef(false);
  const placementRef = useRef(null);
  const [remaining, setRemaining] = useState(false);
  const isDirector = session?.role === 'master' && !asSeat;
  const seatId = asSeat || session?.seatId;
  const perspective = session ? session.roomId + '|' + seatId : '';
  const snapshot = view?.perspective === perspective ? view.snapshot : null,
    game = snapshot?.game;
  const scene = game?.scenes[game.sceneId];
  const {
    servedByRoom,
    url: texture,
    error: mapError,
  } = useMapArtwork(session, asSeat, scene);
  const displayed = useMemo(
    () =>
      !game || !servedByRoom
        ? game
        : {
            ...game,
            scenes: {
              ...game.scenes,
              [scene.id]: {
                ...scene,
                image: texture,
                hasIllustration: true,
                imageBounds: undefined,
              },
            },
          },
    [game, servedByRoom, texture, scene]
  );
  const tableGame = usePieceArtwork(session, asSeat, displayed);
  const adjustSurvey = (patch) =>
    setSurvey((previous) => ({ ...previous, ...patch }));
  function beginSurvey(mode = 'select') {
    if (!isDirector || !scene) return;
    setBook('');
    setRemaining(false);
    setSurvey({ mode, grid: scene.snapToGrid !== false, selectedId: null });
    setArmed({ kind: 'survey' });
    focusOn('map');
  }
  const focusOn = useCallback(
    (target, id) =>
      setFocus({ target, seatId: id, sequence: ++focusCounter.current }),
    []
  );

  useEffect(() => {
    let current = true;
    loadTableCatalog({
      director:
        session?.role === 'master' ||
        (!session && (mode === 'master' || (local && entryMode === 'master'))),
      owner,
    })
      .then((c) => {
        if (current) setCatalog(c);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [session?.role, mode, entryMode, owner]);
  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    const off = watchRoom(
      session,
      (s) => {
        if (active) {
          setView({ perspective, snapshot: s });
          setConnection('');
        }
      },
      {
        asSeat: asSeat || undefined,
        onError: (e) => {
          if (active) setConnection(e?.message || 'Reconectando con la mesa…');
        },
      }
    );
    return () => {
      active = false;
      off?.();
    };
  }, [session, asSeat, perspective]);
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(id);
  }, [notice]);
  const report = useCallback(
    (e) => setNotice(e?.message || 'No se ha podido completar el gesto.'),
    []
  );
  const command = useCallback(
    async (c) => {
      if (!session || asSeat) return false;
      try {
        return await sendCommand(session, c);
      } catch (e) {
        report(e);
        return false;
      }
    },
    [session, asSeat, report]
  );
  const grab = useCallback(
    async (id) => {
      if (!session || asSeat) return false;
      try {
        const ok = await grabPiece(session, id);
        if (!ok) setNotice('Otra mano sostiene esa pieza.');
        return ok;
      } catch (e) {
        report(e);
        return false;
      }
    },
    [session, asSeat, report]
  );
  const release = useCallback(
    (id) => {
      if (session && !asSeat) return releasePiece(session, id).catch(report);
    },
    [session, asSeat, report]
  );
  const drag = useCallback(
    (id, x, z, pose) => {
      if (session && !asSeat)
        return dragPiece(session, id, x, z, pose).catch(() => {});
    },
    [session, asSeat]
  );
  const travel = async (destination) => {
    if (
      await command(
        game.scenes[destination.id]
          ? { type: 'scene', sceneId: destination.id }
          : { type: 'scene', scene: destination }
      )
    ) {
      setBook('');
      setImported(null);
      focusOn('map');
    }
  };
  async function enter(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setNotice('');
    try {
      let next;
      if (entryMode === 'master' && !arrival.invite) {
        const selected = catalog.scenes.find((s) => s.id === newScene);
        if (!selected || selected.unavailable)
          throw new Error('Elige un escenario disponible.');
        next = await createRoom({
          name: 'Máster',
          title: selected.name,
          scene: selected,
          masterKey: key,
        });
      } else {
        const entry = arrival.invite ? arrival : invitationFrom(ticket);
        if (!entry.roomId || !entry.invite)
          throw new Error(
            'Pega el enlace de un puesto que te haya dado el máster.'
          );
        next = await joinRoom({
          ...entry,
          name: name.trim() || owner || 'Aventurero',
        });
      }
      setKey('');
      setTicket('');
      setSession(next);
      window.history.replaceState(null, '', tableLink(next.roomId));
    } catch (err) {
      report(err);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function exit() {
    setArmed(null);
    onBack();
  }
  function switchPerspective(id) {
    setBook('');
    setArmed(null);
    setConnection('');
    setAsSeat(id);
    focusOn(id ? 'seat' : 'map', id);
  }
  async function seat(character, position) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (
        await command({
          type: 'seat',
          seatId,
          name: session.name || owner || character.name,
          character,
          position,
        })
      )
        focusOn('seat', seatId);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const mapPoint = async (x, z, r = 0) => {
    if (
      !isDirector ||
      !armed ||
      !scene ||
      !Number.isFinite(x) ||
      !Number.isFinite(z)
    )
      return;
    const { kind, data } = armed;
    const id = kind + '-' + freshId(),
      unit = Math.max(0.5, Math.min(15, Number(r) || 1));
    let c;
    if (kind === 'enemy')
      c = {
        type: 'enemy',
        enemy: { ...data.enemy, id, x, z, hidden: data.hidden },
      };
    else if (kind === 'coin' || kind === 'trait')
      c = { type: 'supply', kind, x, z };
    else if (kind === 'clearFog') {
      const hit = [...scene.terrain]
        .reverse()
        .find(
          (t) =>
            t.kind === 'fog' &&
            (t.radius
              ? Math.hypot(t.x - x, t.z - z) <= t.radius
              : Math.abs(t.x - x) <= t.width / 2 &&
                Math.abs(t.z - z) <= t.depth / 2)
        );
      if (!hit) {
        setNotice('Toca una zona de niebla pintada.');
        return;
      }
      c = { type: 'terrain', removeId: hit.id };
    } else {
      const terrain = {
        id,
        kind,
        x,
        z,
        radius: unit,
        width: unit * 2,
        depth: unit * 2,
      };
      if (kind === 'tree')
        Object.assign(terrain, {
          image: '/scenery/trees/fa-01-arbol-verde-a1.webp',
          visionMode: data?.visionMode || 'trunk',
          trunkRatio: 0.33,
        });
      c = { type: 'terrain', terrain };
    }
    if (await command(c)) setArmed(null);
  };
  const latest = game?.log?.at(-1);
  const pendingAttack = game?.attacks?.find(
    (a) =>
      a.sceneId === game.sceneId &&
      a.status === 'defending' &&
      (isDirector || a.targetId === game.seats[seatId]?.tokenId)
  );
  const loseSession = () => {
    forgetSession(session.roomId);
    setSession(null);
    setView(null);
    setAsSeat(null);
    setConnection('');
  };
  function anotherRoom() {
    // Keep the seat credential so a saved room link still restores this table.
    setSession(null);
    setView(null);
    setAsSeat(null);
    setBook('');
    setArmed(null);
    setConnection('');
    window.history.replaceState(null, '', '/canvas-3d?direccion');
  }
  const errorNode = notice && (
    <div className="n3-notice" role="status">
      {notice}
      <button onClick={() => setNotice('')} aria-label="Cerrar aviso">
        <X size={14} />
      </button>
    </div>
  );

  if (!session)
    return (
      <main className="n3 n3-entry">
        <button className="n3-back" onClick={exit}>
          <ArrowLeft size={17} /> NOMA
        </button>
        <div className="n3-entry-sheet">
          <div className="n3-cover-art" aria-hidden="true" />
          <form onSubmit={enter} className="n3-entry-form">
            <small>NOMA · Roguelike</small>
            <h1>Canvas 3D</h1>
            {entryMode === 'master' && !arrival.invite ? (
              <>
                <p>Elige el escenario que vas a poner sobre la mesa.</p>
                <label>
                  Escenario
                  <select
                    value={newScene}
                    onChange={(e) => setNewScene(e.target.value)}
                  >
                    {catalog.scenes.map((s) => (
                      <option
                        value={s.id}
                        key={s.id}
                        disabled={Boolean(s.unavailable)}
                      >
                        {s.name} · {s.cols} × {s.rows}
                      </option>
                    ))}
                  </select>
                </label>
                {catalog.scenes.find((s) => s.id === newScene)?.importNote && (
                  <p>
                    {catalog.scenes.find((s) => s.id === newScene).importNote}
                  </p>
                )}
                {!local && (
                  <label>
                    Clave de dirección
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                    />
                  </label>
                )}
                <button className="n3-primary" disabled={busy}>
                  {busy ? 'Preparando la mesa…' : 'Abrir mesa como máster'}
                </button>
              </>
            ) : (
              <>
                <p>
                  {arrival.invite
                    ? 'Tienes un puesto en esta mesa.'
                    : 'Entra con la invitación de tu máster.'}
                </p>
                {!arrival.invite && (
                  <label>
                    Enlace de invitación
                    <input
                      value={ticket}
                      onChange={(e) => setTicket(e.target.value)}
                      required
                      placeholder="Pega el enlace de tu puesto"
                    />
                  </label>
                )}
                <label>
                  Tu nombre
                  <input
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={50}
                  />
                </label>
                <button disabled={busy} className="n3-primary">
                  {busy ? 'Entrando…' : 'Sentarme a la mesa'}
                </button>
              </>
            )}
            {errorNode}
          </form>
        </div>
      </main>
    );

  if (!game)
    return (
      <main className="n3 n3-wait">
        <Compass size={38} />
        <h1>{connection ? 'Conexión con la mesa' : 'Abriendo la mesa…'}</h1>
        {connection && (
          <>
            <p role="alert">{connection}</p>
            <button onClick={loseSession}>Volver a la entrada</button>
          </>
        )}
        <button onClick={exit}>Volver a NOMA</button>
      </main>
    );
  const needsClass = session.role === 'player' && !game.seats[seatId];
  const personal =
    initialCharacter &&
    catalog.characters.find(
      (c) =>
        c.id === initialCharacter.id ||
        c.id === owner + '/' + initialCharacter.id
    );
  const choices = personal
    ? [personal, ...catalog.characters.filter((c) => c.id !== personal.id)]
    : catalog.characters;
  return (
    <main className="n3 n3-table">
      <TableScene
        game={tableGame}
        revision={snapshot.revision}
        seatId={seatId}
        placementRef={placementRef}
        onGrab={grab}
        onRelease={release}
        onCommand={command}
        onDrag={drag}
        tool={armed?.kind || null}
        survey={isDirector && armed?.kind === 'survey' ? survey : null}
        onSurveySelect={(id) => adjustSurvey({ selectedId: id })}
        onSurveyClose={() => setArmed(null)}
        onMapPoint={mapPoint}
        focusRequest={focus}
        remoteGrabs={snapshot.grabs}
        muted={muted}
        tilt={tilt}
      />
      <header className="n3-top">
        <button onClick={exit} aria-label="Volver a NOMA">
          <ArrowLeft size={18} />
        </button>
        <div className="n3-heading">
          <small>
            {asSeat
              ? 'Perspectiva de ' + (game.seats[asSeat]?.name || 'jugador')
              : roleTitle(session.role)}{' '}
            · Ronda {game.round}
          </small>
          <h1>{scene.name}</h1>
        </div>
        <div className="n3-camera">
          {isDirector && (
            <button
              onClick={() =>
                armed?.kind === 'survey' ? setArmed(null) : beginSurvey()
              }
              title="Trazado del mapa"
              aria-label="Trazado del mapa"
              aria-pressed={armed?.kind === 'survey'}
            >
              <Spline size={18} />
              <span>Trazado</span>
            </button>
          )}
          <button
            onClick={() => focusOn('map')}
            title="Centrar el mapa"
            aria-label="Centrar el mapa"
          >
            <MapIcon size={18} />
          </button>
          {game.seats[seatId] && (
            <button onClick={() => focusOn('seat', seatId)} title="Mi ficha">
              <Crosshair size={17} />
              <span>Mi ficha</span>
            </button>
          )}
          <button
            onClick={() => setRemaining(!remaining)}
            aria-expanded={remaining}
            aria-label="Ajustar perspectiva"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Activar sonido' : 'Silenciar mesa'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>
      {remaining && (
        <div className="n3-camera-adjust">
          <label>
            Inclinación
            <input
              type="range"
              min="0"
              max={MAX_ANGLE}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
            />
          </label>
          <button
            onClick={() => {
              focusOn('overview');
              setRemaining(false);
            }}
          >
            Ver mesa completa
          </button>
        </div>
      )}
      {needsClass && (
        <ClassBox
          choices={choices}
          busy={busy}
          placementRef={placementRef}
          onChoose={seat}
        />
      )}
      {isDirector && !book && !armed && (
        <button className="n3-book-tab" onClick={() => setBook('Puestos')}>
          <BookOpen size={21} /> Libro del máster
        </button>
      )}
      {asSeat && (
        <button className="n3-book-tab" onClick={() => switchPerspective(null)}>
          <BookOpen size={18} /> Volver a la dirección
        </button>
      )}
      {armed?.kind === 'survey' && isDirector && (
        <MapSurveyToolbar
          settings={survey}
          selected={scene.terrain.find((item) => item.id === survey.selectedId)}
          change={adjustSurvey}
          close={() => setArmed(null)}
          command={command}
        />
      )}
      {armed && armed.kind !== 'survey' && (
        <div className="n3-prompt">
          {armed.label}
          <button
            onClick={() => setArmed(null)}
            aria-label="Cancelar colocación"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {pendingAttack && !asSeat && !book && !armed && (
        <button
          className="n3-resolve"
          onClick={() =>
            command({ type: 'resolve', targetId: pendingAttack.targetId })
          }
        >
          Resolver defensa
        </button>
      )}
      {isDirector && book && (
        <TableBook
          game={game}
          catalog={catalog}
          presence={snapshot.presence}
          canUndo={snapshot.canUndo}
          inviteSeat={async (id) => {
            try {
              return await inviteSeat(session, id);
            } catch (e) {
              report(e);
              return null;
            }
          }}
          undo={async () => {
            try {
              await undoRoom(session);
            } catch (e) {
              report(e);
            }
          }}
          command={command}
          close={() => setBook('')}
          initialPage={book}
          sceneId={game.sceneId}
          onPreview={switchPerspective}
          onSurvey={beginSurvey}
          onNewRoom={anotherRoom}
          onTravel={travel}
          onTool={(kind, data, label) => setArmed({ kind, data, label })}
          onFile={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              setImported(await prepareFile(file));
              setBook('');
            } catch (err) {
              report(err);
            }
          }}
        />
      )}
      {imported && (
        <form
          className="n3-map-form"
          onSubmit={(e) => {
            e.preventDefault();
            travel(imported);
          }}
        >
          <h2>{imported.name}</h2>
          <p>Ajusta la cuadrícula de la ilustración.</p>
          {['cols', 'rows'].map((k, i) => (
            <label key={k}>
              {i ? 'Filas' : 'Columnas'}
              <input
                type="number"
                min="2"
                max="100"
                value={imported[k]}
                onChange={(e) =>
                  setImported({ ...imported, [k]: Number(e.target.value) })
                }
                required
              />
            </label>
          ))}
          <button className="n3-primary">Llevar al grupo</button>
          <button type="button" onClick={() => setImported(null)}>
            Guardar en la caja
          </button>
        </form>
      )}
      {(connection || mapError) && (
        <div className="n3-connection" role="status">
          {connection || mapError}
        </div>
      )}
      {!book && !needsClass && !armed && latest && (
        <output className={'n3-last' + (latest.warning ? ' is-warning' : '')}>
          {latest.text}
        </output>
      )}
      {errorNode}
    </main>
  );
}
