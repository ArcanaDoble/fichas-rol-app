import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { PhysicalTable } from './rendererTable';
import './rendererTable.css';

export default function TableScene(props) {
  const container = useRef(null),
    canvas = useRef(null),
    engine = useRef(null),
    latest = useRef(props);
  const instructions = useId(),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false);
  latest.current = props;
  const instance = props.game?.id;
  useLayoutEffect(() => {
    if (!instance || !canvas.current) return undefined;
    let table;
    try {
      table = new PhysicalTable(canvas.current, container.current, {
        ...latest.current,
        onMessage: setMessage,
      });
      engine.current = table;
      setFailed(false);
    } catch (err) {
      console.error('Canvas 3D', err);
      setFailed(true);
      return undefined;
    }
    // WebGL may discard the drawing buffer after compositing. Render once at
    // capture time so exporting this canvas never keeps an extra 4K buffer.
    const surface = canvas.current,
      originalExport = surface.toDataURL;
    if (table.renderer)
      surface.toDataURL = function (...args) {
        table.renderer.render(table.scene, table.cam);
        return originalExport.apply(surface, args);
      };
    const gameText = () => {
      const g = table.game,
        s = g.scenes[g.sceneId];
      return JSON.stringify({
        mode: 'canvas3d',
        coordinates: 'centros, x este, z sur, unidades de casilla',
        scene: {
          id: s.id,
          name: s.name,
          cols: s.cols,
          rows: s.rows,
          terrain: s.terrain.map(({ id, kind }) => ({ id, kind })),
          artworkReady:
            !!s.image && table.lib.images.get(s.image)?.state === 'ready',
        },
        round: g.round,
        seats: Object.keys(g.seats),
        gold: g.gold,
        camera: {
          x: table.gameX(table.target.x),
          z: table.target.z,
          zoom: table.zoom,
          tilt: table.tilt,
        },
        pieces: [...table.objects.values()].map(({ p, node }) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          artworkReady: p.image
            ? table.lib.images.get(p.image)?.state === 'ready'
            : null,
          parentId: p.parentId,
          slot: p.slot,
          x: +table.gameX(node.position.x).toFixed(3),
          z: +node.position.z.toFixed(3),
          value: p.value,
          rolled: p.rolled,
        })),
        held: table.drag?.id || null,
        destination: table.destinationTile.visible
          ? table.destinationTile.userData.cell
          : null,
        settling: [...table.landings.keys()],
        flying: [...(table.airborne?.keys() || [])],
        rolling: [...table.active.keys()],
        renderer: table.renderer ? 'webgl2' : 'canvas',
      });
    };
    const advance = (ms) => {
      const n = Math.min(1200, Math.max(1, Math.round(ms / (1000 / 60))));
      for (let i = 0; i < n; i++) table.step(1 / 60);
    };
    const inspect = {
      screenPoint: (a) => table.screenPoint(a),
      focus: (target, seat) => table.focus(target, seat || table.props.seatId),
    };
    const oldText = window.render_game_to_text,
      oldAdvance = window.advanceTime,
      oldTable = window.canvas3dTable;
    window.render_game_to_text = gameText;
    window.advanceTime = advance;
    window.canvas3dTable = inspect;
    return () => {
      if (window.render_game_to_text === gameText)
        window.render_game_to_text = oldText;
      if (window.advanceTime === advance) window.advanceTime = oldAdvance;
      if (window.canvas3dTable === inspect) window.canvas3dTable = oldTable;
      if (table.renderer) delete surface.toDataURL;
      table.dispose();
      engine.current = null;
    };
  }, [instance]);
  useLayoutEffect(() => {
    engine.current?.update({ ...props, onMessage: setMessage });
  }, [props]);
  const placement = props.placementRef;
  useLayoutEffect(() => {
    if (!placement || !engine.current) return undefined;
    const table = engine.current;
    const tools = {
      preview: (character, pixels) => table.previewMat(character, pixels),
      clear: () => table.clearPreview(),
    };
    placement.current = tools;
    return () => {
      if (placement.current === tools) placement.current = null;
      table.clearPreview();
    };
  }, [placement, instance]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(''), 2200);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="n3-world" ref={container}>
      <canvas
        ref={canvas}
        className="n3-world-canvas"
        aria-label="Mesa de juego 3D"
        aria-describedby={instructions}
        tabIndex={0}
      />
      <span id={instructions} className="n3-world-instructions">
        Arrastra una pieza para levantarla. Arrastra la madera para mover la
        cámara. Usa la rueda o dos dedos para acercarte. Con el teclado, recorre
        las piezas y los huecos con corchetes, usa Intro para coger y soltar, y
        las flechas para mover.
      </span>
      <output
        aria-live="polite"
        className={message ? 'n3-world-caption' : 'n3-world-instructions'}
      >
        {message}
      </output>
      {failed && (
        <p className="n3-world-error" role="alert">
          No se ha podido abrir la superficie de juego en este navegador.
        </p>
      )}
    </div>
  );
}
