import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Link as LinkIcon,
  Eye,
  Lamp,
  CloudFog,
  Eraser,
  Trees,
  DoorOpen,
  Spline,
  PanelsTopLeft,
  Coins,
  Undo2,
  Moon,
  Swords,
} from 'lucide-react';
import { tableLink } from './navigation';

const chapters = ['Puestos', 'Bestiario', 'Mapa', 'Partida'];
const seats = ['puesto1', 'puesto2', 'puesto3', 'puesto4'];

export default function TableBook({
  game,
  catalog,
  presence,
  canUndo,
  inviteSeat,
  undo,
  command,
  close,
  onTool,
  onSurvey,
  onPreview,
  onTravel,
  onFile,
  onNewRoom,
  sceneId,
  initialPage = 'Puestos',
}) {
  const [page, setPage] = useState(initialPage);
  const [links, setLinks] = useState({});
  const [copyState, setCopyState] = useState('');
  const [busy, setBusy] = useState('');
  const [scenario, setScenario] = useState(sceneId);
  const [enemyId, setEnemyId] = useState('');
  const [target, setTarget] = useState('');
  const [inSecret, setInSecret] = useState(true);
  const [treeSight, setTreeSight] = useState('trunk');
  const pointer = useRef(null);
  const scene = game.scenes[game.sceneId];
  const creatures = Object.values(game.pieces).filter(
    (p) => p.kind === 'enemy' && p.sceneId === game.sceneId
  );
  const heroes = Object.values(game.seats);
  const chosen =
    catalog.scenes.find((s) => s.id === scenario) || game.scenes[scenario];
  const turnPage = (n) =>
    setPage(
      (current) =>
        chapters[Math.max(0, Math.min(3, chapters.indexOf(current) + n))]
    );

  async function makeInvite(id) {
    setBusy(id);
    try {
      const token = await inviteSeat(id);
      if (token) {
        const link = tableLink(token.roomId, token.invite, token.joinOrigin);
        setLinks((previous) => ({ ...previous, [id]: link }));
        setCopyState('');
      }
    } finally {
      setBusy('');
    }
  }
  async function copy(id) {
    try {
      await navigator.clipboard.writeText(links[id]);
      setCopyState(id);
    } catch {
      document.getElementById('link-' + id)?.select();
    }
  }
  const tool = (kind, data, label) => {
    onTool(kind, data, label);
    close();
  };
  return (
    <aside
      className="n3-book"
      aria-label="Libro del máster"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      onPointerDown={(e) => {
        if (!e.target.closest('input,button,select,textarea,label'))
          pointer.current = [e.clientX, e.clientY];
      }}
      onPointerUp={(e) => {
        if (pointer.current) {
          const [x, y] = pointer.current;
          pointer.current = null;
          if (Math.abs(e.clientX - x) > 62 && Math.abs(e.clientY - y) < 38)
            turnPage(e.clientX < x ? 1 : -1);
        }
      }}
    >
      <header>
        <div>
          <small>Cuaderno del máster</small>
          <h2>{page}</h2>
        </div>
        <button aria-label="Cerrar el libro" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <nav aria-label="Capítulos">
        {chapters.map((ch) => (
          <button
            key={ch}
            aria-current={ch === page ? 'page' : undefined}
            onClick={() => setPage(ch)}
          >
            {ch}
          </button>
        ))}
      </nav>
      <div className="n3-leaf" key={page}>
        {page === 'Puestos' && (
          <>
            <p>
              Entrega una invitación a cada persona que se siente a la mesa.
            </p>
            {seats.map((id, i) => {
              const seat = game.seats[id];
              const here = presence?.find((p) => p.seatId === id);
              return (
                <section key={id} className="n3-seatrow">
                  <div>
                    <b>{seat?.name || here?.name || 'Puesto ' + (i + 1)}</b>
                    <small>
                      {seat
                        ? seat.className + (here ? ' · En mesa' : ' · Ausente')
                        : here
                          ? 'Abriendo la caja'
                          : 'Disponible'}
                    </small>
                  </div>
                  {seat ? (
                    <button onClick={() => onPreview(id)}>
                      <Eye size={16} /> Ver como jugador
                    </button>
                  ) : (
                    !here && (
                      <button
                        disabled={busy === id}
                        onClick={() => makeInvite(id)}
                      >
                        <LinkIcon size={15} />{' '}
                        {links[id] ? 'Renovar' : 'Invitar'}
                      </button>
                    )
                  )}
                  {links[id] && !here && !seat && (
                    <label className="n3-invite">
                      Enlace del puesto {i + 1}
                      <span>
                        <input
                          id={'link-' + id}
                          readOnly
                          value={links[id]}
                          onFocus={(e) => e.target.select()}
                        />
                        <button onClick={() => copy(id)}>
                          {copyState === id ? 'Copiado' : 'Copiar'}
                        </button>
                      </span>
                    </label>
                  )}
                </section>
              );
            })}
          </>
        )}
        {page === 'Bestiario' && (
          <>
            <label className="n3-check">
              <input
                type="checkbox"
                checked={inSecret}
                onChange={(e) => setInSecret(e.target.checked)}
              />{' '}
              Colocar en secreto
            </label>
            <div className="n3-bestiary">
              {catalog.enemies.map((e) => (
                <button
                  key={e.id}
                  onClick={() =>
                    tool(
                      'enemy',
                      { enemy: e, hidden: inSecret },
                      'Coloca ' + e.name + ' en una casilla.'
                    )
                  }
                >
                  <img src={e.image} alt="" />
                  <b>{e.name}</b>
                </button>
              ))}
            </div>
            {creatures.map((p) => (
              <section key={p.id} className="n3-seatrow">
                <div>
                  <b>{p.name}</b>
                  <small>{p.hidden ? 'En secreto' : 'En el mapa'}</small>
                </div>
                {p.hidden && (
                  <button
                    onClick={() => command({ type: 'reveal', pieceId: p.id })}
                  >
                    Revelar
                  </button>
                )}
              </section>
            ))}
          </>
        )}
        {page === 'Mapa' && (
          <>
            <label>
              Escenario
              <select
                aria-label="Escenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                {[
                  ...new Map(
                    [...Object.values(game.scenes), ...catalog.scenes].map(
                      (s) => [s.id, s]
                    )
                  ).values(),
                ].map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={Boolean(s.unavailable)}
                  >
                    {s.name} · {s.cols} × {s.rows}
                  </option>
                ))}
              </select>
            </label>
            {chosen?.importNote && <p>{chosen.importNote}</p>}
            <div className="n3-ink-actions">
              <button
                disabled={
                  scenario === game.sceneId ||
                  !chosen ||
                  Boolean(chosen?.unavailable)
                }
                onClick={() => onTravel(chosen)}
              >
                Llevar al grupo
              </button>
              <label className="n3-file">
                Abrir mapa ilustrado
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFile}
                />
              </label>
            </div>
            <label>
              Oscuridad{' '}
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={Math.round(100 * (scene.darkness || 0))}
                key={scene.id}
                onPointerUp={(e) =>
                  command({
                    type: 'darkness',
                    value: Number(e.currentTarget.value) / 100,
                  })
                }
                onKeyUp={(e) =>
                  command({
                    type: 'darkness',
                    value: Number(e.currentTarget.value) / 100,
                  })
                }
              />
            </label>
            <label className="n3-check">
              <input
                type="checkbox"
                checked={Boolean(scene.fogOfWar)}
                onChange={(e) =>
                  command({ type: 'fogOfWar', enabled: e.target.checked })
                }
              />
              Niebla de guerra por aventurero
            </label>
            <h3>Trazado e iluminación</h3>
            <div className="n3-tools">
              {[
                [Spline, 'wall', 'Muro'],
                [DoorOpen, 'door', 'Puerta'],
                [PanelsTopLeft, 'window', 'Ventana'],
                [Lamp, 'light', 'Foco de luz'],
              ].map(([Icon, id, label]) => (
                <button key={id} onClick={() => onSurvey(id)}>
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => onSurvey('select')}>
              Ajustar los puntos del mapa
            </button>
            <h3>Terreno y visibilidad</h3>
            <div className="n3-tools">
              {[
                [
                  CloudFog,
                  'fog',
                  'Pintar niebla',
                  'Arrastra sobre las casillas que quieres cubrir.',
                ],
                [
                  Eraser,
                  'clearFog',
                  'Levantar niebla',
                  'Toca la niebla que quieres retirar.',
                ],
                [CloudFog, 'smoke', 'Humo', 'Arrastra para extender el humo.'],
                [Trees, 'tree', 'Árbol', 'Coloca la copa sobre el mapa.'],
              ].map(([Icon, id, name, help]) => (
                <button
                  key={id}
                  onClick={() =>
                    tool(
                      id,
                      id === 'tree' ? { visionMode: treeSight } : null,
                      help
                    )
                  }
                >
                  <Icon size={18} />
                  {name}
                </button>
              ))}
            </div>
            <label>
              Los árboles bloquean la visión por
              <select
                value={treeSight}
                onChange={(e) => setTreeSight(e.target.value)}
              >
                <option value="trunk">El tronco</option>
                <option value="canopy">La copa</option>
              </select>
            </label>
          </>
        )}
        {page === 'Partida' && (
          <>
            <h3>Ataque enemigo</h3>
            <label>
              Atacante
              <select
                value={enemyId}
                onChange={(e) => setEnemyId(e.target.value)}
              >
                <option value="">Elige una peana</option>
                {creatures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Defensor
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Elige un aventurero</option>
                {heroes.map((p) => (
                  <option key={p.id} value={p.tokenId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!enemyId || !target}
              onClick={async () => {
                if (
                  await command({
                    type: 'enemyAttack',
                    pieceId: enemyId,
                    targetId: target,
                  })
                ) {
                  close();
                }
              }}
            >
              <Swords size={16} /> Declarar ataque
            </button>
            <div className="n3-tools">
              <button
                onClick={() => tool('coin', null, 'Deja la moneda en la mesa.')}
              >
                <Coins size={17} /> Dar oro
              </button>
              <button
                onClick={() =>
                  tool('trait', null, 'Deja el rasgo de visión en la mesa.')
                }
              >
                <Moon size={17} /> Visión en la oscuridad
              </button>
              <button onClick={() => command({ type: 'turn' })}>
                Avanzar turno
              </button>
              <button disabled={!canUndo} onClick={undo}>
                <Undo2 size={17} /> Deshacer jugada
              </button>
            </div>
            <h3>Crónica</h3>
            <ol className="n3-log">
              {(game.log || [])
                .slice(-8)
                .reverse()
                .map((e, i) => (
                  <li key={e.id || i}>
                    {e.text || e.message || e.label || String(e)}
                  </li>
                ))}
            </ol>
            <button onClick={onNewRoom}>Preparar otra mesa</button>
          </>
        )}
      </div>
      <footer>
        <button
          disabled={page === chapters[0]}
          onClick={() => turnPage(-1)}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </button>
        <span>{['I', 'II', 'III', 'IV'][chapters.indexOf(page)]}</span>
        <button
          disabled={page === chapters[3]}
          onClick={() => turnPage(1)}
          aria-label="Página siguiente"
        >
          <ChevronRight />
        </button>
      </footer>
    </aside>
  );
}
