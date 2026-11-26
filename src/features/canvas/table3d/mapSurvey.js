import {
  boundPoint,
  distanceToLine,
  endpoints,
  isLine,
  lineBetween,
  surveyKind,
  surveySnap,
  translatedLine,
} from './surveyGeometry';

const palette = {
  wall: '#d1b784',
  door: '#75c9b4',
  window: '#9ac8e6',
  light: '#f3d583',
};
const labels = {
  wall: 'Muro',
  door: 'Puerta',
  window: 'Ventana',
  light: 'Foco',
};
const height = 0.075;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const length = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nextId = (kind) =>
  kind +
  '-' +
  (globalThis.crypto.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2));

// A transparent drawing sheet follows the orthographic camera. Handles stay
// finger-sized while all committed positions live in the scene's coordinates.
export function buildMapSurvey(table) {
  let sheet, ctx, gesture, anchor, cursor, lastMode, lastScene, selectedId;
  const scene = () => table.game?.scenes[table.game.sceneId];
  const active = () =>
    table.props?.seatId === 'master' && table.props.tool === 'survey';
  const options = () => table.props.survey || {};
  const editable = () =>
    scene().terrain.filter((t) => isLine(t) || t.kind === 'light');
  const px = (p) => table.toPixel(table.metricX(p.x), height, p.z);
  const world = (p) => {
    const at = table.worldAt(p.x, p.y, height);
    return { x: table.gameX(at.x), z: at.z };
  };
  const inside = (p) =>
    p.x >= 0 && p.x <= scene().cols && p.z >= 0 && p.z <= scene().rows;
  const select = (id) => {
    selectedId = id;
    table.props.onSurveySelect?.(id);
  };
  function spacing() {
    const zero = px({ x: 0, z: 0 });
    return {
      sx: Math.max(0.01, px({ x: 1, z: 0 }).x - zero.x),
      sz: Math.max(0.01, px({ x: 0, z: 1 }).y - zero.y),
    };
  }
  function snap(p, touch, exclude) {
    return surveySnap(p, editable().filter(isLine), {
      ...spacing(),
      scene: scene(),
      grid: options().grid,
      touch,
      exclude,
    });
  }
  function lightWith(item, center, radius) {
    const r = Math.min(40, Math.max(0.25, Math.round(radius * 4) / 4));
    return {
      ...item,
      x: center.x,
      z: center.z,
      width: 0.36,
      depth: 0.36,
      radius: r,
    };
  }
  function handles(item) {
    if (isLine(item))
      return [...endpoints(item), item].map((p, i) => ({
        at: px(p),
        part: ['a', 'b', 'body'][i],
      }));
    const radius = item.radius || 3;
    const center = px(item);
    const { w, h } = table.size;
    const candidates = [
      [1, 0],
      [-1, 0],
      [0, -1],
      [0, 1],
    ].map(([x, z]) => px({ x: item.x + x * radius, z: item.z + z * radius }));
    const at =
      candidates.find(
        (p) => p.x >= 16 && p.x <= w - 16 && p.y >= 62 && p.y <= h - 110
      ) || candidates[0];
    return [
      { at: center, part: 'body' },
      { at, part: 'radius' },
    ];
  }
  function pick(p, touch) {
    const tolerance = touch ? 21 : 12;
    const candidates = editable().reverse();
    const selected = candidates.find((item) => item.id === selectedId);
    if (selected) {
      const best = handles(selected)
        .map((h) => ({ ...h, d: distance(p, h.at) }))
        .sort((a, b) => a.d - b.d)[0];
      if (best.d <= tolerance) return { item: selected, part: best.part };
    }
    const nearest = candidates
      .map((item) => {
        const ends = isLine(item) && endpoints(item).map(px);
        const d = ends ? distanceToLine(p, ...ends) : distance(p, px(item));
        return { item, d };
      })
      .sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > tolerance) return null;
    const end =
      isLine(nearest.item) &&
      handles(nearest.item)
        .slice(0, 2)
        .map((h) => ({ ...h, d: distance(p, h.at) }))
        .sort((a, b) => a.d - b.d)[0];
    return {
      item: nearest.item,
      part: end && end.d <= tolerance ? end.part : 'body',
    };
  }
  function preview(p, touch) {
    const mode = options().mode;
    const target = world(p);
    if (mode === 'select') {
      if (!gesture?.item) return null;
      const { item, part } = gesture;
      if (part === 'radius') return lightWith(item, item, length(item, target));
      if (part === 'a' || part === 'b') {
        const [a, b] = endpoints(item),
          n = snap(target, touch, item.id);
        return lineBetween(item, part === 'a' ? n : a, part === 'b' ? n : b);
      }
      const origin = gesture.origin;
      const n = snap(
        { x: item.x + target.x - origin.x, z: item.z + target.z - origin.z },
        touch,
        item.id
      );
      return isLine(item)
        ? translatedLine(item, { x: n.x - item.x, z: n.z - item.z }, scene())
        : lightWith(item, n, item.radius || 3);
    }
    const start = anchor || gesture?.start;
    if (!start) return null;
    const item = { id: 'draft', kind: mode, name: labels[mode] };
    if (mode === 'light')
      return lightWith(
        { ...item, color: '#fff1ae', intensity: 0.8, flicker: false },
        start,
        gesture?.moved ? length(start, target) : 3
      );
    return lineBetween(item, start, snap(target, touch));
  }
  function down(p, touch) {
    const origin = world(p),
      mode = options().mode;
    const hit = mode === 'select' ? pick(p, touch) : null;
    if (!inside(origin) && !hit) return;
    if (mode === 'select') select(hit?.item.id || null);
    gesture = {
      origin,
      start: snap(origin, touch),
      screen: p,
      moved: false,
      touch,
      ...hit,
    };
    cursor = p;
    draw();
  }
  function move(p) {
    cursor = p;
    if (gesture && distance(p, gesture.screen) >= (gesture.touch ? 5 : 3))
      gesture.moved = true;
    draw();
  }
  function up(p) {
    if (!gesture) return;
    const mode = options().mode;
    move(p);
    if (mode !== 'select' && mode !== 'light' && !gesture.moved && !anchor) {
      anchor = gesture.start;
    } else {
      const item = preview(p, gesture.touch);
      if (
        item &&
        (mode !== 'select' || gesture.moved) &&
        (!isLine(item) || length(...endpoints(item)) > 0.09)
      ) {
        if (item.id === 'draft') item.id = nextId(mode);
        const sceneId = scene().id;
        void table.props
          .onCommand({ type: 'terrain', terrain: item })
          .then((ok) => {
            if (
              ok &&
              active() &&
              scene()?.id === sceneId &&
              options().mode === mode
            ) {
              select(item.id);
              draw();
            }
          });
      }
      anchor = null;
    }
    gesture = null;
    cursor = null;
    draw();
  }
  function cancel() {
    gesture = null;
    cursor = null;
    anchor = null;
    draw();
  }
  function sync() {
    const mode = active() && options().mode;
    if (lastMode !== mode || lastScene !== scene()?.id) {
      anchor = gesture = cursor = null;
      lastMode = mode;
      lastScene = scene()?.id;
    }
    selectedId = options().selectedId;
    draw();
  }
  function draw() {
    if (!active() || !scene()) {
      if (sheet && !sheet.hidden) {
        ctx?.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.clearRect(0, 0, sheet.width, sheet.height);
        sheet.hidden = true;
      }
      return;
    }
    if (!sheet) {
      sheet = document.createElement('canvas');
      sheet.className = 'n3-survey-overlay';
      sheet.setAttribute('aria-hidden', 'true');
      table.container.appendChild(sheet);
      ctx = sheet.getContext('2d');
    }
    sheet.hidden = false;
    if (!ctx) return;
    const { w, h } = table.size,
      dpr = Math.min(2, window.devicePixelRatio || 1);
    if (
      sheet.width !== Math.round(w * dpr) ||
      sheet.height !== Math.round(h * dpr)
    ) {
      sheet.width = Math.round(w * dpr);
      sheet.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const circle = (at, r, fill, stroke) => {
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };
    if (options().grid) {
      const left = boundPoint(world({ x: 0, y: 0 }), scene()),
        right = boundPoint(world({ x: w, y: h }), scene()),
        base = px({ x: 0, z: 0 });
      const { sx, sz } = spacing(),
        step = Math.max(1, Math.ceil(12 / Math.min(sx, sz)));
      ctx.fillStyle = 'rgba(255,230,168,.63)';
      for (let x = Math.ceil(left.x / step) * step; x <= right.x; x += step)
        for (let z = Math.ceil(left.z / step) * step; z <= right.z; z += step)
          ctx.fillRect(
            Math.round(base.x + sx * x) - 1,
            Math.round(base.y + sz * z) - 1,
            2,
            2
          );
    }
    function markItem(item, selected, ghost) {
      const color = palette[surveyKind(item)],
        points = handles(item);
      ctx.setLineDash(ghost || item.open ? [6, 4] : []);
      ctx.strokeStyle = color;
      ctx.lineWidth = selected || ghost ? 2.5 : 1.3;
      ctx.beginPath();
      if (isLine(item)) {
        ctx.moveTo(points[0].at.x, points[0].at.y);
        ctx.lineTo(points[1].at.x, points[1].at.y);
      } else if (selected || ghost) {
        const r = item.radius || 3,
          sizes = spacing(),
          at = points[0].at;
        ctx.ellipse(at.x, at.y, r * sizes.sx, r * sizes.sz, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const h of points) {
        if (h.part === 'radius' && !selected && !ghost) continue;
        if (isLine(item) && h.part === 'body' && !selected) continue;
        circle(
          h.at,
          selected || ghost ? 5.1 : 3.2,
          selected || ghost ? color : '#302b21',
          color
        );
        if (selected || ghost) circle(h.at, 1.6, '#36291b');
      }
    }
    const highlighted = gesture?.moved && gesture?.item?.id;
    for (const item of editable()) {
      if (item.id !== highlighted)
        markItem(item, item.id === selectedId, false);
    }
    if (
      cursor &&
      (gesture?.moved || anchor || (gesture && options().mode === 'light'))
    ) {
      const shape = preview(cursor, gesture?.touch);
      if (shape) markItem(shape, true, true);
    }
    if (anchor) circle(px(anchor), 5.6, '#302b21', '#ffdc91');
  }
  return { down, move, up, cancel, sync, draw, destroy: () => sheet?.remove() };
}
