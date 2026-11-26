import { fittingHit, graspFixture } from './patioClassFittings';
import * as CANNON from 'cannon-es';
import { buildMapSurvey } from './mapSurvey';
import { recordDiePoint, dieSwipe } from './patioDiceDynamics';

const { getSlots } = require('./gamePieces.js');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

import { MAX_ANGLE, pawnCell } from './patioMovement';

export function buildTableInput(table) {
  const survey = buildMapSurvey(table);
  const canvas = table.canvas,
    pointers = new Map();
  let press = null,
    pinch = null,
    selection = null,
    lastTap = null,
    token = 0,
    tabIndex = -1;
  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const notify = (text) => table.announce(text);
  function free(drag) {
    if (!drag) return;
    const o = table.objects.get(drag.id);
    if (o) {
      o.body.type = CANNON.Body.STATIC;
      o.body.velocity.setZero();
      o.body.angularVelocity.setZero();
    }
    if (drag.locked) table.props.onRelease?.(drag.id);
  }
  function cancel() {
    survey.cancel();
    token++;
    press?.fixture?.end(press.screen, true);
    free(table.drag);
    table.drag = null;
    selection = null;
    press = null;
    table.highlight.visible = false;
    table.destinationTile.visible = false;
    table.toolMark.visible = false;
    canvas.style.cursor = 'grab';
    table.invalidate();
  }
  function setPoint(d, p) {
    const plane = table.worldAt(p.x, p.y, d.height);
    d.point = { x: plane.x + d.offset.x, z: plane.z + d.offset.z };
    d.screen = p;
    if (table.objects.get(d.id)?.p.kind === 'die') {
      recordDiePoint(d.samples, d.point, performance.now());
    } else {
      d.samples.push({ ...d.point, t: performance.now() });
      while (
        d.samples.length > 2 &&
        d.samples[d.samples.length - 1].t - d.samples[0].t > 95
      )
        d.samples.shift();
    }
    const hit = table.destination(p.x, p.y, d.id);
    table.mark(hit, d.point);
    table.previewPawn(d.id, p, hit);
    if (d.locked && performance.now() - d.lastNet > 100) {
      const mesh = table.objects.get(d.id)?.node;
      const pose = mesh && {
        height: mesh.position.y,
        orientation: mesh.quaternion.toArray(),
        rolling: false,
      };
      table.props.onDrag?.(d.id, table.gameX(d.point.x), d.point.z, pose);
      d.lastNet = performance.now();
    }
    table.invalidate();
  }
  function activate(d, p) {
    if (table.active.has(d.id) || table.landings.has(d.id)) return false;
    const o = table.objects.get(d.id);
    if (!o) return false;
    const world = table.worldAt(d.start.x, d.start.y, o.node.position.y);
    d.height = o.node.position.y;
    d.offset = {
      x: o.node.position.x - world.x,
      z: o.node.position.z - world.z,
    };
    d.samples = [];
    d.lastNet = 0;
    d.moving = true;
    d.display = o.node.position.clone();
    table.drag = d;
    setPoint(d, p);
    const version = ++token;
    d.claim = Promise.resolve(table.props.onGrab?.(d.id))
      .then((ok) => {
        if (ok === false) {
          if (table.drag === d) {
            table.drag = null;
            press = null;
            table.highlight.visible = false;
            table.destinationTile.visible = false;
          }
          notify('Otra mano tiene esa pieza.');
          table.invalidate();
          return false;
        }
        if (token !== version || table.disposed) {
          table.props.onRelease?.(d.id);
          return false;
        }
        d.locked = true;
        o.body.type = CANNON.Body.KINEMATIC;
        o.body.wakeUp();
        table.audio.play('rub', 0.3);
        return true;
      })
      .catch(() => {
        if (table.drag === d) table.drag = null;
        table.destinationTile.visible = false;
        table.invalidate();
        return false;
      });
    canvas.style.cursor = 'grabbing';
    return true;
  }
  async function finish(d, p, forceRoll = false) {
    if (d.finishing) return;
    d.finishing = true;
    const releasedAt = performance.now();
    const hit = forceRoll ? {} : table.destination(p.x, p.y, d.id);
    const world = table.worldAt(p.x, p.y, 0.03);
    const floor = { x: table.gameX(world.x), z: world.z };
    const o = table.objects.get(d.id);
    if (!o || !(await d.claim) || table.disposed || table.drag !== d) return;
    table.drag = null;
    press = null;
    selection = null;
    canvas.style.cursor = 'grab';
    table.highlight.visible = false;
    table.destinationTile.visible = false;
    o.body.type = CANNON.Body.STATIC;
    o.body.velocity.setZero();
    o.body.angularVelocity.setZero();
    if (hit.parentId || hit.targetId) {
      table.audio.play(
        hit.parentId &&
          table.game.pieces[hit.parentId]?.kind === 'bag' &&
          o.p.kind === 'coin'
          ? 'coin'
          : 'wood',
        0.52
      );
      await table.dropFromHand(
        { type: 'drop', pieceId: o.p.id, x: floor.x, z: floor.z, ...hit },
        o,
        o.node.position.clone().set(d.point.x, o.node.position.y, d.point.z)
      );
    } else if (o.p.kind === 'token' || o.p.kind === 'enemy') {
      const cell = pawnCell(table, world);
      const x = cell ? cell.x + 0.5 : floor.x;
      const z = cell ? cell.z + 0.5 : floor.z;
      table.audio.play('wood', 0.45);
      await table.dropFromHand(
        { type: 'drop', pieceId: o.p.id, x, z },
        o,
        o.node.position.clone().set(table.metricX(x), o.h * 0.5 + 0.026, z)
      );
    } else {
      const last = d.samples.at(-1),
        first = d.samples[0];
      const elapsed = Math.max(0.026, (last.t - first.t) / 1000),
        stale = performance.now() - last.t > 155;
      const velocity =
        o.p.kind === 'die'
          ? dieSwipe(d.samples, releasedAt)
          : {
              x: stale
                ? 0
                : clamp(((last.x - first.x) / elapsed) * 0.72, -8, 8),
              z: stale
                ? 0
                : clamp(((last.z - first.z) / elapsed) * 0.72, -8, 8),
            };
      const speed = Math.hypot(velocity.x, velocity.z);
      const roll =
        o.p.kind === 'die' &&
        (forceRoll ||
          (!o.p.rolled && o.p.role !== 'expose') ||
          ((o.p.role === 'weapon' || o.p.role === 'fury') &&
            o.p.parentId &&
            speed > 0.65));
      // The grab offset remains constant as the hand crosses a board edge.
      // Release at the hand, not the last position sampled by the render loop.
      o.body.position.set(
        d.point.x,
        Math.max(o.h * 0.5 + 0.16, o.node.position.y),
        d.point.z
      );
      o.body.quaternion.copy(o.node.quaternion);
      if (speed > 0.65 || roll) {
        table.startFlight(o, velocity, roll);
      } else {
        table.audio.play(o.p.kind === 'die' ? 'stone' : 'wood', 0.36);
        const c = {
          type: 'drop',
          pieceId: o.p.id,
          x: table.gameX(d.point.x),
          z: d.point.z,
          yaw: o.p.yaw || 0,
        };
        if (o.p.kind === 'die') c.orientation = o.node.quaternion.toArray();
        await table.dropFromHand(
          c,
          o,
          o.node.position
            .clone()
            .set(
              d.point.x,
              o.h * 0.5 + table.supportBelow(o.p, d.point) + 0.026,
              d.point.z
            )
        );
      }
    }
    table.invalidate();
  }
  async function tap(o, point, e) {
    if (!o) return;
    const p = o.p,
      time = performance.now();
    if (p.kind === 'box' || p.kind === 'bag') {
      table.audio.play(p.open ? 'close' : 'open', 0.65);
      await table.send({ type: 'bag', pieceId: p.id });
      return;
    }
    if (
      p.kind === 'die' &&
      !p.used &&
      lastTap?.id === p.id &&
      time - lastTap.t < 370
    ) {
      lastTap = null;
      const d = { id: p.id, start: point };
      if (activate(d, point)) await finish(d, point, true);
      return;
    }
    lastTap = { id: p.id, t: time };
    table.props.onAim?.(p);
    const suffix =
      p.kind === 'die' ? (p.rolled ? ' · ' + p.value : ' · d' + p.sides) : '';
    notify((p.name || 'Pieza') + suffix);
  }
  function down(e) {
    if (e.button > 2) return;
    const p = pos(e);
    pointers.set(e.pointerId, p);
    table.audio.unlock();
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    if (pointers.size === 2) {
      cancel();
      const [a, b] = [...pointers.values()];
      pinch = {
        span: Math.max(5, distance(a, b)),
        center: middle(a, b),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
      return;
    }
    if (pointers.size > 2 || table.drag?.finishing) return;
    const tool = table.props.tool,
      o =
        e.button === 0 && !e.altKey && !tool
          ? table.pick(p.x, p.y, e.pointerType === 'touch')
          : null;
    press = {
      pointerId: e.pointerId,
      start: p,
      prev: p,
      screen: p,
      id: o?.p.id || '',
      tool: e.button === 0 ? tool : null,
      moving: false,
    };
    const fitting =
      e.button === 0 && !e.altKey && !tool ? fittingHit(table, p) : null;
    if (fitting) {
      press.fixture = graspFixture(table, fitting, p);
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (press.tool) {
      if (press.tool === 'survey') {
        survey.down(p, e.pointerType === 'touch');
        canvas.style.cursor = 'crosshair';
        return;
      }
      const a = table.worldAt(p.x, p.y);
      press.worldStart = a;
      canvas.style.cursor = 'crosshair';
      if (['light', 'fog', 'smoke', 'tree'].includes(press.tool)) {
        table.toolMark.position.set(a.x, 0.11, a.z);
        table.toolMark.scale.set(table.cellAspect, 1, 1);
        table.toolMark.visible = true;
        table.invalidate();
      }
    } else canvas.style.cursor = o ? 'grab' : 'grabbing';
  }
  function move(e) {
    const p = pos(e);
    if (!pointers.has(e.pointerId)) {
      if (table.props.tool === 'survey') survey.move(p);
      canvas.style.cursor = table.props.tool
        ? 'crosshair'
        : table.hits(p.x, p.y)[0]
          ? 'grab'
          : 'move';
      return;
    }
    pointers.set(e.pointerId, p);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()],
        c = middle(a, b),
        span = Math.max(5, distance(a, b));
      const before = table.worldAt(pinch.center.x, pinch.center.y),
        after = table.worldAt(c.x, c.y);
      table.target.x += before.x - after.x;
      table.target.z += before.z - after.z;
      table.camera();
      table.zoomAt(c.x, c.y, span / pinch.span);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const diff = Math.atan2(
        Math.sin(angle - pinch.angle),
        Math.cos(angle - pinch.angle)
      );
      if (Math.abs(diff) > 0.005) {
        table.tilt = clamp(table.tilt + diff * 23, 0, MAX_ANGLE);
        table.camera();
      }
      pinch = { span, center: c, angle };
      return;
    }
    if (!press || press.pointerId !== e.pointerId || press.finishing) return;
    if (press.fixture) {
      press.screen = p;
      press.fixture.move(p);
      return;
    }
    if (press.tool) {
      if (press.tool === 'survey') {
        survey.move(p);
        return;
      }
      press.screen = p;
      const b = table.worldAt(p.x, p.y);
      const r = clamp(
        Math.hypot(
          table.gameX(b.x - press.worldStart.x),
          b.z - press.worldStart.z
        ),
        0.5,
        15
      );
      if (table.toolMark.visible) {
        table.toolMark.scale.set(r * table.cellAspect, r, 1);
        table.invalidate();
      }
      return;
    }
    if (
      distance(p, press.start) < (e.pointerType === 'touch' ? 5 : 3) &&
      !press.moving
    )
      return;
    if (press.id) {
      if (!press.moving) {
        if (!activate(press, p)) return;
      } else setPoint(press, p);
    } else {
      const a = table.worldAt(press.prev.x, press.prev.y),
        b = table.worldAt(p.x, p.y);
      table.target.x += a.x - b.x;
      table.target.z += a.z - b.z;
      press.moving = true;
      table.camera();
    }
    press.prev = p;
  }
  function up(e) {
    const p = pos(e);
    pointers.delete(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) {
        pinch = null;
        press = null;
      }
      return;
    }
    if (!press || press.pointerId !== e.pointerId) return;
    const d = press;
    if (d.fixture) {
      press = null;
      d.fixture.end(p);
      canvas.style.cursor = 'grab';
      return;
    }
    if (d.tool === 'survey') {
      press = null;
      survey.up(p);
      return;
    }
    if (d.tool) {
      const s = table.game.scenes[table.game.sceneId],
        start = d.worldStart,
        b = table.worldAt(p.x, p.y);
      const gx = table.gameX(start.x);
      if (gx >= 0 && start.z >= 0 && gx <= s.cols && start.z <= s.rows)
        table.props.onMapPoint?.(
          gx,
          start.z,
          Math.hypot(table.gameX(b.x - start.x), b.z - start.z)
        );
      table.toolMark.visible = false;
      table.invalidate();
      press = null;
      canvas.style.cursor = 'grab';
    } else if (d.moving && d.id) void finish(d, p, e.shiftKey);
    else {
      press = null;
      if (!d.moving && d.id) void tap(table.objects.get(d.id), p, e);
      canvas.style.cursor = 'grab';
    }
  }
  function wheel(e) {
    e.preventDefault();
    const p = pos(e);
    if (e.shiftKey) {
      table.tilt = clamp(table.tilt + Math.sign(e.deltaY) * 2, 0, MAX_ANGLE);
      table.camera();
    } else
      table.zoomAt(p.x, p.y, Math.exp(-clamp(e.deltaY, -160, 160) * 0.0027));
  }
  function abort(e) {
    pointers.delete(e.pointerId);
    if (!press || e.pointerId === press.pointerId || pinch) {
      cancel();
      pinch = null;
    }
  }
  function key(e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const o = selection && table.objects.get(selection.pieceId);
    if (e.key === 'Escape') {
      cancel();
      if (table.props.tool === 'survey') table.props.onSurveyClose?.();
      return;
    }
    if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault();
      table.zoomAt(
        table.size.w / 2,
        table.size.h / 2,
        e.key === '-' ? 0.81 : 1.24
      );
      return;
    }
    if (e.key.toLowerCase() === 'e' && !table.drag) {
      const id =
        o?.p.kind === 'mat'
          ? o.p.id
          : table.game.seats[table.props.seatId]?.matId;
      if (id) {
        e.preventDefault();
        table.send({ type: 'drawer', pieceId: id });
      }
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      table.focus(e.shiftKey ? 'map' : 'seat', table.props.seatId);
      return;
    }
    if (e.key === '[' || e.key === ']') {
      const entries = [];
      for (const item of table.objects.values()) {
        if (table.drag && item.p.id === table.drag.id) continue;
        entries.push({ pieceId: item.p.id });
        if (table.drag)
          for (const slot of getSlots(item.p))
            if (
              (item.p.kind !== 'mat' ||
                item.p.drawerOpen ||
                !/^(armor|accessory2?|inventory[123])$/.test(slot.id)) &&
              slot.accepts.includes(table.objects.get(table.drag.id)?.p.kind)
            )
              entries.push({ pieceId: item.p.id, slot: slot.id });
      }
      if (!entries.length) return;
      tabIndex =
        (tabIndex + (e.key === '[' ? -1 : 1) + entries.length) % entries.length;
      selection = entries[tabIndex];
      const selected = table.objects.get(selection.pieceId);
      notify(
        (selected.p.name || 'Pieza') +
          (selection.slot
            ? ' · ' +
              getSlots(selected.p).find((s) => s.id === selection.slot)?.label
            : '')
      );
      table.mark({ parentId: selected.p.id, slot: selection.slot });
      e.preventDefault();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && o) {
      e.preventDefault();
      const screen = table.screenPoint(selection),
        rect = canvas.getBoundingClientRect(),
        p = { x: screen.x - rect.left, y: screen.y - rect.top };
      if (table.drag) {
        setPoint(table.drag, p);
        void finish(table.drag, p);
      } else if (o.p.kind === 'bag' || o.p.kind === 'box') void tap(o, p, e);
      else activate({ id: o.p.id, start: p }, p);
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const scale = (table.viewSpan / table.zoom) * 0.065,
        dx = { ArrowRight: 1, ArrowLeft: -1 }[e.key] || 0,
        dz = { ArrowDown: 1, ArrowUp: -1 }[e.key] || 0;
      if (table.drag) {
        const d = table.drag;
        const p = table.toPixel(
          d.point.x + dx * scale,
          d.height,
          d.point.z + dz * scale
        );
        setPoint(d, p);
      } else {
        table.target.x += dx * scale;
        table.target.z += dz * scale;
        table.camera();
      }
    }
  }
  const noMenu = (e) => e.preventDefault();
  const listeners = [
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', abort],
    ['contextmenu', noMenu],
    ['keydown', key],
    ['wheel', wheel],
  ];
  for (const [name, fn] of listeners)
    canvas.addEventListener(
      name,
      fn,
      name === 'wheel' ? { passive: false } : undefined
    );
  return {
    survey,
    edge(dt) {
      const d = table.drag;
      if (!d?.moving || !d.screen || d.finishing) return;
      const zone = Math.min(42, Math.min(table.size.w, table.size.h) * 0.07);
      const side = (n, max) =>
        n < zone
          ? -(1 - clamp(n / zone, 0, 1))
          : n > max - zone
            ? 1 - clamp((max - n) / zone, 0, 1)
            : 0;
      const dx = side(d.screen.x, table.size.w),
        dz = side(d.screen.y, table.size.h);
      if (!dx && !dz) return;
      const speed = (table.viewSpan / table.zoom) * 0.72 * dt;
      table.target.x += dx * speed;
      table.target.z += dz * speed;
      table.camera();
      setPoint(d, d.screen);
    },
    destroy() {
      for (const [name, fn] of listeners) canvas.removeEventListener(name, fn);
      cancel();
      survey.destroy();
      pointers.clear();
    },
  };
}
