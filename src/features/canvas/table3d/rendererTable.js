import { advanceDrawer, drawerTravel } from './patioClassFittings';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildTableInput } from './rendererInput';
import { makeDestinationTile, PATIO_ANGLE, MAX_ANGLE } from './patioMovement';
import { createTableAudio } from './rendererAudio';
import { createSmokeSurface, makeSightVeil } from './tableAtmosphere';
import { SurfaceLibrary, mapSkin } from './rendererSurfaces';
import {
  makeTerrain,
  makeMap,
  makeTable,
  makePiece,
  makeShadow,
  clearGroup,
  pieceHeight,
  tokenFragments,
  makeImpact,
} from './rendererObjects';
import {
  dieAttitude,
  dieShape,
  dieSupport,
  dieResult,
  savedDiePose,
} from './rendererDice';
import { drawFlat } from './rendererFallback';
import { updatePawnMark } from './patioMedallions';
import {
  patioWorld,
  tableMaterial,
  weighDie,
  spinDie,
} from './patioDiceDynamics';

const {
  getSlots,
  getWorldPosition,
  isDrawerSlot,
  patioDimensions,
  mountedOffset,
  MAT_WIDTH,
  MAT_DEPTH,
} = require('./gamePieces.js');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const axisY = new THREE.Vector3(0, 1, 0);
const hiddenByBag = (pieces, p) => {
  let item = p;
  const seen = new Set();
  while (item?.parentId && !seen.has(item.id)) {
    seen.add(item.id);
    const parent = pieces[item.parentId];
    if (parent?.kind === 'mat' && !parent.drawerOpen && isDrawerSlot(item.slot))
      return true;
    item = parent;
    if ((item?.kind === 'bag' || item?.kind === 'box') && !item.open)
      return true;
  }
  return false;
};
function visibleInScene(game, p) {
  let current = p;
  const seen = new Set();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    current = game.pieces[current.parentId];
  }
  return (
    current &&
    !(current.kind === 'enemy' && current.defeated) &&
    !(p.role === 'enemy' && !p.rolled && game.pieces[p.sourceId]?.defeated) &&
    (!current.sceneId || current.sceneId === game.sceneId) &&
    !hiddenByBag(game.pieces, p)
  );
}

function showThrownWeapon(node, amount) {
  const projectile = node.userData.projectile;
  if (!projectile) return;
  const alpha = clamp(amount, 0, 1),
    plate = node.userData.plate;
  for (const material of plate.material) {
    material.transparent = alpha > 0;
    material.opacity = 1 - alpha;
  }
  projectile.visible = alpha > 0;
  projectile.traverse((part) => {
    if (part.material) {
      part.material.transparent = alpha < 1;
      part.material.opacity = alpha;
    }
  });
  plate.visible = alpha < 1;
}
const skinKey = (p) =>
  [
    p.kind,
    p.name,
    p.className,
    p.image,
    p.width,
    p.depth,
    p.dice,
    p.sides,
    p.role,
    p.open,
    p.maxLife,
    p.isBarbarian,
    p.kind === 'mat' ? '' : p.defense,
  ].join('|');

export class PhysicalTable {
  constructor(canvas, container, props) {
    this.canvas = canvas;
    this.container = container;
    this.props = props;
    this.game = props.game;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 220);
    this.target = new THREE.Vector3();
    this.viewDirection = new THREE.Vector3();
    this.viewSpan = 9;
    this.zoom = 1;
    this.tilt = Number.isFinite(props.tilt)
      ? clamp(props.tilt, 0, MAX_ANGLE)
      : PATIO_ANGLE;
    this.reduceMotion = Boolean(
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
    this.landings = new Map();
    this.size = { w: 1, h: 1 };
    this.views = new Map();
    this.objects = new Map();
    this.active = new Map();
    this.disposed = false;
    this.dirty = 2;
    this.clock = 0;
    this.ray = new THREE.Raycaster();
    this.effects = new Map();
    this.textureStore = new SurfaceLibrary(() => this.invalidate());
    this.lib = this.textureStore;
    this.audio = createTableAudio();
    this.audio.mute(props.muted);
    this.physics = patioWorld();
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });
    if (context) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          context,
          antialias: true,
          alpha: false,
        });
        this.renderer.setClearColor('#28251f');
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, 1.65)
        );
      } catch {
        this.renderer = null;
      }
    }
    if (!this.renderer) {
      this.ctx = canvas.getContext('2d');
    }
    this.scene.add(new THREE.HemisphereLight('#fff1d8', '#aaa08a', 1.75));
    this.sun = new THREE.DirectionalLight('#fff3d7', 1.95);
    this.sun.position.set(-7, 13, 5);
    this.scene.add(this.sun);
    this.scene.add(makeTable(this.lib));
    this.terrain = new THREE.Group();
    this.scene.add(this.terrain);
    this.highlight = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1, 48),
      new THREE.MeshBasicMaterial({
        color: '#efd18e',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
      })
    );
    this.highlight.rotation.x = -Math.PI / 2;
    this.highlight.visible = false;
    this.highlight.renderOrder = 6;
    this.scene.add(this.highlight);
    this.destinationTile = makeDestinationTile();
    this.scene.add(this.destinationTile);
    this.toolMark = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 64),
      new THREE.MeshBasicMaterial({
        color: '#e5bb73',
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthTest: false,
      })
    );
    this.toolMark.rotation.x = -Math.PI / 2;
    this.toolMark.visible = false;
    this.toolMark.renderOrder = 6;
    this.scene.add(this.toolMark);
    this.input = buildTableInput(this);
    this.resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => this.resize())
        : null;
    this.resizeObserver?.observe(container);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.onRestore = () => this.invalidate();
    canvas.addEventListener('webglcontextrestored', this.onRestore);
    this.resize();
    this.update(props);
    this.focus('initial', props.seatId);
    this.lastFrame = performance.now();
    this.frame = (t) => {
      if (this.disposed) return;
      const dt = Math.min(0.045, Math.max(0.001, (t - this.lastFrame) / 1000));
      this.lastFrame = t;
      const atmospheric = !document.hidden && this.updateAtmosphere(t);
      if (
        this.active.size ||
        this.drag ||
        this.dirty ||
        this.fading ||
        atmospheric ||
        this.effects.size ||
        this.remoteActive()
      )
        this.step(dt);
      this.raf = requestAnimationFrame(this.frame);
    };
    this.raf = requestAnimationFrame(this.frame);
  }
  invalidate() {
    this.dirty = 3;
  }
  updateAtmosphere(time) {
    const smokeChanged =
      this.hasSmoke && this.smokeSurface?.update(time, this.reduceMotion);
    if (
      !this.lamps?.length ||
      this.reduceMotion ||
      time - (this.lastGlow || 0) < 1000 / 15
    )
      return smokeChanged;
    this.lastGlow = time;
    for (const { glow, phase, period } of this.lamps) {
      const t = ((time + phase) / period) * Math.PI * 2;
      glow.material.opacity =
        0.93 + 0.05 * Math.cos(t) + 0.02 * Math.sin(3 * t);
    }
    return true;
  }
  announce(text) {
    this.props.onMessage?.(text);
  }
  resize() {
    const rect = this.container.getBoundingClientRect();
    if (this.ready && this.size.h > 1 && rect.height > 1)
      this.viewSpan *= rect.height / this.size.h;
    this.size = { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
    if (this.renderer) this.renderer.setSize(this.size.w, this.size.h, false);
    else {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      this.canvas.width = this.size.w * dpr;
      this.canvas.height = this.size.h * dpr;
    }
    this.camera();
  }
  camera() {
    const h = this.viewSpan / this.zoom,
      w = (h * this.size.w) / this.size.h;
    this.cam.left = -w / 2;
    this.cam.right = w / 2;
    this.cam.top = h / 2;
    this.cam.bottom = -h / 2;
    const a = (this.tilt * Math.PI) / 180;
    this.viewDirection.set(0, Math.cos(a), Math.sin(a));
    this.cam.up.set(0, Math.sin(a), -Math.cos(a));
    this.cam.position.copy(this.target).addScaledVector(this.viewDirection, 90);
    this.cam.lookAt(this.target);
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld(true);
    this.input?.survey.draw();
    this.invalidate();
  }
  focus(kind, seatId) {
    const g = this.game,
      s = g?.scenes?.[g.sceneId];
    if (!s) return;
    const seat = g.seats?.[seatId],
      mat = seat && g.pieces[seat.matId];
    let x = s.cols / 2,
      z = s.rows / 2,
      w = this.metricX(s.cols) + 1.2,
      d = s.rows + 1.2;
    if (kind === 'seat' || (kind === 'initial' && mat)) {
      if (!mat) return;
      const pos = getWorldPosition(g, mat);
      x = pos.x;
      z = pos.z;
      w = MAT_WIDTH + 1.0;
      d = MAT_DEPTH + 1.25;
      if (mat.drawerOpen) {
        z -= drawerTravel * 0.46;
        d += drawerTravel;
      }
      if (this.size.w < 650 && this.size.h > this.size.w) {
        w = MAT_WIDTH + 0.38;
      }
      const preparing = !Object.values(g.pieces).some(
        (p) =>
          p.parentId === mat.id && /^(hand|armor|sheath)/.test(p.slot || '')
      );
      if (preparing) {
        const options = Object.values(g.pieces).filter(
          (p) =>
            p.seatId === seatId &&
            p.sceneId === g.sceneId &&
            !p.parentId &&
            ['weapon', 'armor', 'accessory', 'shield', 'item'].includes(
              p.kind
            ) &&
            Math.abs(p.z - z) < 8 &&
            Math.abs(p.x - x) < 7
        );
        if (options.length) {
          const low = Math.min(
              z - mat.depth * 0.5,
              ...options.map((p) => p.z - p.depth * 0.5)
            ),
            high = Math.max(
              z + mat.depth * 0.5,
              ...options.map((p) => p.z + p.depth * 0.5)
            );
          z = (low + high) / 2;
          d = high - low + 1.05;
        }
      }
    } else if (kind === 'overview') {
      let xs = [-0.4, s.cols + 0.4],
        zs = [-0.4, s.rows + 0.4];
      for (const { p } of this.objects.values()) {
        const pos = getWorldPosition(g, p);
        xs.push(pos.x - p.width / 2, pos.x + p.width / 2);
        zs.push(pos.z - p.depth / 2, pos.z + p.depth / 2);
      }
      const x0 = Math.min(...xs),
        x1 = Math.max(...xs),
        z0 = Math.min(...zs),
        z1 = Math.max(...zs);
      x = (x0 + x1) / 2;
      z = (z0 + z1) / 2;
      w = this.metricX(x1 - x0) + 1;
      d = z1 - z0 + 1;
    } else if (kind === 'initial' || kind === 'map') {
      const token = seat && g.pieces[seat.tokenId];
      const occupants = Object.values(g.pieces).filter(
        (p) => p.kind === 'enemy' && p.sceneId === g.sceneId && !p.hidden
      );
      const subject =
        (token && !token.parentId && token) || occupants[0] || s.entrance;
      if (s.cols > 12 || s.rows > 10) {
        x = subject?.x ?? x;
        z = subject?.z ?? z;
        w = Math.min(10, w);
        d = Math.min(8, d);
      }
    }
    if (kind === 'initial' && mat) {
      const token = g.pieces[seat.tokenId];
      if (
        token &&
        !token.parentId &&
        token.sceneId === s.id &&
        token.x >= 0 &&
        token.z >= 0 &&
        token.x < s.cols &&
        token.z < s.rows
      ) {
        const center = getWorldPosition(g, mat);
        const x0 = Math.min(0, center.x - this.gameX(MAT_WIDTH / 2)),
          x1 = Math.max(s.cols, center.x + this.gameX(MAT_WIDTH / 2));
        const z0 = Math.min(0, center.z - MAT_DEPTH / 2),
          z1 = Math.max(s.rows, center.z + MAT_DEPTH / 2);
        // Resume a compact encounter as a single table with the adventurer's
        // frame at its edge. A large dungeon or a phone opens on the peana.
        if (this.metricX(x1 - x0) < 15 && z1 - z0 < 14 && this.size.w >= 650) {
          x = (x0 + x1) / 2;
          z = (z0 + z1) / 2;
          w = this.metricX(x1 - x0) + 0.55;
          d = (z1 - z0) * Math.cos((this.tilt * Math.PI) / 180) + 0.95;
        } else {
          x = token.x;
          z = token.z;
          w = Math.min(7, this.metricX(s.cols) + 0.6);
          d = Math.min(6, s.rows + 0.6);
        }
      }
    }
    this.target.set(this.metricX(x), 0, z);
    this.zoom = 1;
    this.viewSpan = Math.max(d, (w * this.size.h) / this.size.w) * 1.03;
    this.camera();
  }
  metricX(x) {
    return x * (this.cellAspect || 1);
  }
  gameX(x) {
    return x / (this.cellAspect || 1);
  }
  toPixel(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.cam);
    return {
      x: (v.x + 1) * this.size.w * 0.5,
      y: (1 - v.y) * this.size.h * 0.5,
    };
  }
  rayAt(px, py) {
    this.ray.setFromCamera(
      new THREE.Vector2((px / this.size.w) * 2 - 1, 1 - (py / this.size.h) * 2),
      this.cam
    );
    return this.ray;
  }
  worldAt(px, py, height = 0) {
    const r = this.rayAt(px, py).ray,
      t = (height - r.origin.y) / r.direction.y;
    return {
      x: r.origin.x + r.direction.x * t,
      z: r.origin.z + r.direction.z * t,
    };
  }
  zoomAt(px, py, scale) {
    const a = this.worldAt(px, py);
    this.zoom = clamp(this.zoom * scale, 0.2, 16);
    this.camera();
    const b = this.worldAt(px, py);
    this.target.x += a.x - b.x;
    this.target.z += a.z - b.z;
    this.camera();
  }
  remoteActive() {
    return (
      Object.keys(this.props.remoteGrabs || {}).length > 0 ||
      !!this.airborne?.size
    );
  }
  update(next) {
    const prior = this.props,
      previousGame = this.game;
    this.props = next;
    this.game = next.game;
    if (!this.game) return;
    const g = this.game,
      s = g.scenes[g.sceneId];
    if (!s) return;
    this.cellAspect = Number(s.cellAspect) || 1;
    const sceneChanged = this.currentScene !== g.sceneId;
    const nextView = g.sceneId + '|' + next.seatId,
      changedView = this.viewId !== nextView;
    if (changedView && this.viewId)
      this.views.set(this.viewId, {
        center: this.target.clone(),
        zoom: this.zoom,
        tilt: this.tilt,
        viewSpan: this.viewSpan,
      });
    const mapKey = [
      s.id,
      s.cols,
      s.rows,
      s.cellAspect,
      s.image,
      JSON.stringify(s.imageBounds || null),
    ].join('|');
    if (mapKey !== this.mapKey) {
      if (this.map) clearGroup(this.map);
      if (
        this.mapTexture &&
        this.mapSource &&
        this.mapSource !== s.image &&
        this.mapSource.startsWith('blob:')
      ) {
        this.lib.release(this.mapTextureKey);
        this.lib.forgetImage(this.mapSource);
      }
      this.map = makeMap(this.lib, s);
      this.map.scale.x = this.cellAspect;
      this.scene.add(this.map);
      this.mapTexture = mapSkin(this.lib, s);
      this.mapTextureKey = 'map:' + mapKey;
      this.mapSource = s.image;
      this.mapKey = mapKey;
    }
    const darkness = clamp(Number(s.darkness) || 0, 0, 1);
    this.map.children[1].material.color.setRGB(
      1 - darkness * 0.7,
      1 - darkness * 0.68,
      1 - darkness * 0.59
    );
    const trees = s.terrain?.map((t) => {
      if (t.kind !== 'tree' || t.faded != null) return t;
      const occupied = Object.values(g.pieces).some(
        (p) =>
          (p.kind === 'token' || p.kind === 'enemy') &&
          !p.parentId &&
          p.sceneId === g.sceneId &&
          Math.hypot(
            (p.x - t.x) / (t.width * 0.5 + p.width * 0.25),
            (p.z - t.z) / (t.depth * 0.5 + p.depth * 0.25)
          ) < 1
      );
      return { ...t, faded: occupied };
    });
    const terrainKey = JSON.stringify([
      this.cellAspect,
      s.cols,
      s.rows,
      !!(s.image || s.mapProtected || s.hasIllustration),
      trees?.map((t) => ({ ...t, faded: undefined })),
      next.seatId === 'master',
    ]);
    if (terrainKey !== this.terrainKey) {
      clearGroup(this.terrain);
      this.terrain = new THREE.Group();
      this.scene.add(this.terrain);
      this.terrain.scale.x = this.cellAspect;
      this.hasSmoke = trees?.some((t) => t.kind === 'smoke');
      if (this.hasSmoke && !this.smokeSurface)
        this.smokeSurface = createSmokeSurface(this.lib, this.renderer);
      for (const t of trees || [])
        this.terrain.add(
          makeTerrain(
            this.lib,
            t,
            next.seatId === 'master',
            s,
            this.smokeSurface
          )
        );
      this.lamps = this.terrain.children
        .map((node) => node.userData.flicker)
        .filter(Boolean)
        .slice(0, 10);
      this.terrainKey = terrainKey;
    }
    this.terrain.children.forEach((node, i) => {
      const t = trees[i];
      if (t.kind !== 'tree') return;
      if (node.userData.terrain.faded !== t.faded) this.fading = true;
      node.userData.terrain = t;
    });
    const fogKey = [
      s.id,
      s.cols,
      s.rows,
      this.cellAspect,
      s.visibility?.detail?.hex || s.visibility?.rowsMask?.join('|'),
      JSON.stringify(s.visibility?.observer),
    ].join(':');
    if (fogKey !== this.fogKey) {
      if (this.fog) clearGroup(this.fog);
      this.fog = makeSightVeil(s);
      if (this.fog) {
        this.fog.scale.x = this.cellAspect;
        this.scene.add(this.fog);
      }
      this.fogKey = fogKey;
    }
    const keys = new Set();
    for (const stored of Object.values(g.pieces)) {
      const dims = patioDimensions(stored, g.pieces[stored.parentId]);
      const p = dims ? { ...stored, ...dims } : stored;
      const fallen = this.objects.get(p.id);
      if (p.kind === 'enemy' && p.defeated && fallen && !fallen.p.defeated) {
        const fragments = tokenFragments(p, fallen.node.userData.texture);
        fragments.position.copy(fallen.node.position);
        this.scene.add(fragments);
        this.effects.set(p.id, {
          node: fragments,
          start: this.clock,
          kind: 'fracture',
        });
      } else if (!p.defeated && this.effects.get(p.id)?.kind === 'fracture') {
        clearGroup(this.effects.get(p.id).node);
        this.effects.delete(p.id);
      }
      if (!visibleInScene(g, p)) continue;
      keys.add(p.id);
      const key = skinKey(p);
      let o = this.objects.get(p.id);
      if (o?.key !== key) {
        if (o) this.remove(p.id);
        const node = makePiece(this.lib, p),
          h = pieceHeight(p),
          radius = node.userData.radius;
        let shape;
        if (p.kind === 'die') shape = dieShape(p.sides, radius);
        else if (
          ['coin', 'enemy', 'token'].includes(p.kind) &&
          Math.abs(p.width - p.depth) < 0.001
        )
          shape = new CANNON.Cylinder(p.width / 2, p.width / 2, h, 16);
        else
          shape = new CANNON.Box(
            new CANNON.Vec3(p.width / 2, h / 2, p.depth / 2)
          );
        const body = new CANNON.Body({
          mass: 0,
          shape,
          allowSleep: true,
          material: tableMaterial(p.kind === 'die'),
        });
        body.userData = { id: p.id };
        body.angularDamping = 0.3;
        body.linearDamping = 0.21;
        this.physics.addBody(body);
        this.scene.add(node);
        const shadow = makeShadow(this.lib, p.width, p.depth);
        this.scene.add(shadow);
        o = { p, key, node, body, h, shadow, shape };
        this.objects.set(p.id, o);
        body.addEventListener('collide', (e) => this.contact(o, e));
      }
      if (
        o.p.parentId &&
        !p.parentId &&
        p.kind === 'weapon' &&
        p.lastThrownBy
      ) {
        const start = o.node.position.clone();
        const source =
          g.pieces[p.lastThrownBy] ||
          g.pieces[g.seats[p.lastThrownBy]?.tokenId];
        const origin = source && getWorldPosition(g, source);
        if (origin) start.set(this.metricX(origin.x), 0.27, origin.z);
        const end = new THREE.Vector3(this.metricX(p.x), 0, p.z);
        end.y = o.h * 0.5 + this.supportBelow(p, end) + 0.026;
        this.airborne ||= new Map();
        this.airborne.set(p.id, {
          start,
          end,
          time: this.clock,
          duration: 0.42,
        });
        this.audio.play('rub', 0.7);
      }
      if (p.parentId && this.airborne?.delete(p.id))
        showThrownWeapon(o.node, 0);
      o.p = p;
      if (p.kind === 'mat') {
        const f = o.node.userData.fittings;
        f.turnAway = Boolean(
          g.turnId && g.seats[p.seatId]?.tokenId !== g.turnId
        );
        if (p.drawerOpen && !o.leafShape) {
          o.leafShape = new CANNON.Box(
            new CANNON.Vec3(MAT_WIDTH * 0.3213, 0.025, MAT_DEPTH * 0.366)
          );
          o.body.addShape(
            o.leafShape,
            new CANNON.Vec3(
              MAT_WIDTH * 0.0812,
              o.h * 0.5 - 0.071,
              -MAT_DEPTH * 0.84035
            )
          );
        } else if (!p.drawerOpen && o.leafShape) {
          o.body.removeShape(o.leafShape);
          o.leafShape = null;
        }
        const reserved = Object.values(g.pieces).some(
          (d) => d.role === 'action' && d.seatId === p.seatId && d.rolled
        );
        o.node.userData.texture?.userData.setClassStats?.(p, reserved);
      }
    }
    for (const id of [...this.objects.keys()])
      if (!keys.has(id)) this.remove(id);
    if (this.ready && !sceneChanged && previousGame !== g)
      for (const attack of Object.values(g.attacks || {})) {
        if (
          attack.status !== 'resolved' ||
          !Object.values(previousGame.attacks || {}).some(
            (old) => old.id === attack.id && old.status !== 'resolved'
          )
        )
          continue;
        const target =
          this.objects.get(attack.targetId)?.node ||
          this.effects.get(attack.targetId)?.node;
        if (!target) continue;
        const text = attack.damage ? '−' + attack.damage : 'Parada',
          node = makeImpact(this.lib, text, !attack.damage);
        node.position.copy(target.position);
        node.position.y += 0.53;
        this.scene.add(node);
        this.effects.set('impact:' + attack.id, {
          node,
          start: this.clock,
          kind: 'impact',
          text,
          height: node.position.y,
        });
      }
    if (sceneChanged)
      for (const [id, effect] of this.effects) {
        clearGroup(effect.node);
        this.effects.delete(id);
      }
    this.currentScene = g.sceneId;
    this.audio.mute(next.muted);
    if (next.tilt != null && next.tilt !== prior?.tilt) {
      this.tilt = clamp(Number(next.tilt) || 0, 0, MAX_ANGLE);
      this.camera();
    }
    if (changedView && this.ready) {
      const saved = this.views.get(nextView);
      if (saved) {
        this.target.copy(saved.center);
        this.zoom = saved.zoom;
        this.tilt = saved.tilt;
        this.viewSpan = saved.viewSpan;
        this.camera();
      } else this.focus('initial', next.seatId);
    }
    this.viewId = nextView;
    if (
      next.focusRequest &&
      (!this.ready || next.focusRequest !== prior?.focusRequest)
    ) {
      if (
        !prior?.focusRequest ||
        next.focusRequest.sequence !== prior.focusRequest.sequence ||
        next.focusRequest.target !== prior.focusRequest.target
      )
        this.focus(
          next.focusRequest.target,
          next.focusRequest.seatId || next.seatId
        );
    }
    const seatNow = g.seats?.[next.seatId]?.matId;
    if (this.ready && !changedView && seatNow && !this.ownMatId)
      this.focus('seat', next.seatId);
    this.ownMatId = seatNow;
    this.ready = true;
    this.input?.survey.sync();
    if (changedView) {
      this.landings.clear();
      this.destinationTile.visible = false;
    }
    this.positionAll(1);
    this.invalidate();
  }
  remove(id) {
    const o = this.objects.get(id);
    if (!o) return;
    const f = this.active.get(id);
    if (f?.pairBodies) for (const b of f.pairBodies) this.physics.removeBody(b);
    this.physics.removeBody(o.body);
    clearGroup(o.node);
    clearGroup(o.shadow);
    this.active.delete(id);
    this.objects.delete(id);
  }
  contact(o, event) {
    if (this.disposed || (!this.active.size && !this.drag)) return;
    const speed = Math.abs(event.contact?.getImpactVelocityAlongNormal() || 0);
    if (speed > 0.5) {
      const peer = this.objects.get(event.body?.userData?.id);
      this.audio.play(
        o.p.kind === 'die'
          ? peer?.p.kind === 'die'
            ? 'dice'
            : peer
              ? 'wood'
              : 'stone'
          : 'wood',
        Math.min(1, speed / 6)
      );
    }
    // Free dice resting on a ledger can be knocked loose by another piece.
    // Acquire their own lease before committing the incidental displacement.
    if (
      !event.body?.userData?.id ||
      o.p.kind !== 'die' ||
      o.p.parentId ||
      this.active.has(o.p.id) ||
      this.drag?.id === o.p.id ||
      speed < 0.7
    )
      return;
    const peerId = event.body.userData.id;
    if (!(this.drag?.id === peerId || this.active.has(peerId)) || o.acquiring)
      return;
    o.acquiring = true;
    Promise.resolve(this.props.onGrab?.(o.p.id))
      .then((ok) => {
        if (ok === false) return;
        if (this.disposed || this.objects.get(o.p.id) !== o) {
          this.props.onRelease?.(o.p.id);
          return;
        }
        const v = event.body.velocity;
        this.startFlight(o, { x: v.x * 0.48, z: v.z * 0.48 }, false);
      })
      .catch(() => {})
      .finally(() => {
        o.acquiring = false;
      });
  }
  pose(o, visited = new Set()) {
    if (visited.has(o.p.id)) return;
    visited.add(o.p.id);
    const { p, node, body, h } = o,
      held = this.drag?.id === p.id ? this.drag : null,
      remote = this.props.remoteGrabs?.[p.id];
    if (node.userData.rings)
      updatePawnMark(node, p.hidden, !p.parentId && this.game.turnId === p.id);
    const landing = this.landings.get(p.id);
    const settling = landing && !held && !this.active.has(p.id);
    const parent =
      !settling &&
      !held &&
      !this.active.has(p.id) &&
      this.objects.get(p.parentId);
    if (parent) this.pose(parent, visited);
    const flight = this.airborne?.get(p.id);
    if (advanceDrawer(o, this.dt, this.reduceMotion)) this.invalidate();
    if (node.userData.grip) {
      const target = held?.moving || remote ? 1 : 0;
      const old = node.userData.gripLift || 0;
      const lift =
        Math.abs(target - old) < 0.008 ? target : old + (target - old) * 0.22;
      if (lift !== old) {
        node.userData.grip.userData.setLift(lift);
        node.userData.gripLift = lift;
        this.invalidate();
      }
    }
    if (settling) {
      const settled =
        landing.revision != null && this.props.revision >= landing.revision;
      if (settled || landing.rejected) this.landings.delete(p.id);
      // Polling can deliver several old snapshots between pointerup and the
      // accepted move. Keep this one object at the hand until its own receipt.
      if (!settled && !landing.rejected) {
        node.position.lerp(landing.at, this.reduceMotion ? 1 : 0.44);
        body.position.copy(node.position);
        body.quaternion.copy(node.quaternion);
        o.shadow.position.set(
          node.position.x + 0.05,
          0.036,
          node.position.z + 0.065
        );
        node.updateMatrixWorld(true);
        if (node.position.distanceToSquared(landing.at) > 0.00001)
          this.invalidate();
        return;
      }
      visited.delete(p.id);
      return this.pose(o, visited);
    }
    if (flight && !held) {
      const t = clamp((this.clock - flight.time) / flight.duration, 0, 1);
      node.position.lerpVectors(flight.start, flight.end, t);
      node.position.y += Math.sin(t * Math.PI) * 0.96;
      node.quaternion.setFromEuler(
        new THREE.Euler(
          0.34 * Math.sin(t * Math.PI),
          t * Math.PI * 2 + (p.yaw || 0),
          -0.21 * Math.sin(t * Math.PI)
        )
      );
      showThrownWeapon(node, Math.min(1, t / 0.18, (1 - t) / 0.19));
      body.position.copy(node.position);
      body.quaternion.copy(node.quaternion);
      if (t === 1) {
        this.airborne.delete(p.id);
        this.audio.play('wood', 0.62);
        visited.delete(p.id);
        return this.pose(o, visited);
      }
    } else if (this.active.has(p.id)) {
      const f = this.active.get(p.id);
      if (f.pairBodies) {
        const [a, b] = f.pairBodies;
        node.position.set(
          (a.position.x + b.position.x) / 2,
          (a.position.y + b.position.y) / 2,
          (a.position.z + b.position.z) / 2
        );
        node.quaternion.identity();
        node.userData.pair.forEach((mesh, i) => {
          mesh.position.copy(f.pairBodies[i].position).sub(node.position);
          mesh.quaternion.copy(f.pairBodies[i].quaternion);
        });
        body.position.copy(node.position);
      } else {
        node.position.copy(body.position);
        node.quaternion.copy(body.quaternion);
      }
    } else {
      const die = p.kind === 'die',
        stored =
          die &&
          !p.parentId &&
          Array.isArray(p.orientation) &&
          p.orientation.length === 4;
      const stand = die
        ? stored
          ? savedDiePose(p.sides, p.value, p.orientation)
          : dieAttitude(p.sides, p.value || (p.sides === 6 ? 5 : p.sides))
        : new THREE.Quaternion();
      const support = die
        ? dieSupport(p.sides, stand, node.userData.radius)
        : h * 0.5;
      const lift = held && held.moving ? 0.31 : 0;
      const outside =
        !held &&
        Number.isFinite(remote?.x) &&
        Number.isFinite(remote?.z) &&
        this.props.seatId !== remote?.seatId;
      let base;
      if (parent && !outside) {
        const dieBed =
          die &&
          (parent.p.kind === 'mat' ||
            ['item', 'weapon', 'armor', 'accessory', 'shield'].includes(
              parent.p.kind
            ));
        const anchor = mountedOffset(this.game, p) || p;
        const inDrawer = parent.p.kind === 'mat' && isDrawerSlot(p.slot);
        const leafShift = inDrawer
          ? (1 - parent.node.userData.fittings.progress) * drawerTravel
          : 0;
        const offset = new THREE.Vector3(
          anchor.x,
          parent.h * 0.5 +
            support +
            (inDrawer ? -0.048 : dieBed ? -0.026 : 0.005),
          anchor.z + leafShift
        ).applyQuaternion(parent.node.quaternion);
        base = parent.node.position.clone().add(offset);
        node.quaternion.copy(parent.node.quaternion).multiply(stand);
      } else {
        const snap = outside ? remote : getWorldPosition(this.game, p);
        const w = held?.moving
          ? held.point
          : { x: this.metricX(snap?.x || 0), z: snap?.z || 0 };
        const supportTop =
          held?.moving || outside ? 0 : this.supportBelow(p, w);
        const remoteHeight =
          outside && Number.isFinite(remote.height) ? remote.height : null;
        base = new THREE.Vector3(
          w?.x || 0,
          remoteHeight ??
            support + 0.026 + supportTop + lift + (outside ? 0.16 : 0),
          w?.z || 0
        );
        node.quaternion
          .setFromAxisAngle(axisY, stored ? 0 : p.yaw || 0)
          .multiply(stand);
      }
      if (outside) {
        o.remotePosition ??= node.position.clone();
        base = o.remotePosition.lerp(
          base,
          1 - Math.exp(-(this.dt || 0.016) * 18)
        );
        if (
          Array.isArray(remote.orientation) &&
          remote.orientation.length === 4
        ) {
          const wanted = new THREE.Quaternion()
            .fromArray(remote.orientation)
            .normalize();
          o.remoteOrientation ??= node.quaternion.clone();
          node.quaternion.copy(
            o.remoteOrientation.slerp(
              wanted,
              1 - Math.exp(-(this.dt || 0.016) * 18)
            )
          );
        }
      } else {
        o.remotePosition = null;
        o.remoteOrientation = null;
      }
      if (held?.moving) {
        if (!held.display) held.display = node.position.clone();
        held.display.lerp(base, 0.37);
        base = held.display;
        if (!die) {
          const roll = clamp((base.x - held.point.x) * 0.12, -0.14, 0.14);
          node.quaternion.multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              roll
            )
          );
        }
      }
      node.position.copy(base);
      if (node.userData.pair) {
        const number = p.value || 100,
          digits = [Math.floor((number % 100) / 10) || 10, number % 10 || 10];
        node.userData.pair.forEach((mesh, i) => {
          mesh.position.set(node.userData.radius * (i ? 0.48 : -0.48), 0, 0);
          const saved =
            (outside && remote.percentileOrientation?.[i]) ||
            ((!p.parentId || held) && p.percentileOrientation?.[i]);
          mesh.quaternion.copy(
            Array.isArray(saved) && saved.length === 4
              ? savedDiePose(10, digits[i], saved)
              : dieAttitude(10, digits[i], i === 0 ? 'tens' : 'normal')
          );
        });
      }
      if (body.type === CANNON.Body.KINEMATIC && held?.moving) {
        body.velocity.set(
          (base.x - body.position.x) * 45,
          (base.y - body.position.y) * 45,
          (base.z - body.position.z) * 45
        );
      } else body.velocity.setZero();
      body.position.copy(base);
      body.quaternion.copy(node.quaternion);
      body.aabbNeedsUpdate = true;
    }
    const liftAbove = Math.max(0, node.position.y - h * 0.5);
    o.shadow.visible = !parent;
    o.shadow.position.set(
      node.position.x + 0.052 + liftAbove * 0.15,
      0.036,
      node.position.z + 0.065 + liftAbove * 0.2
    );
    o.shadow.scale.set(1 + liftAbove * 0.13, 1 + liftAbove * 0.13, 1);
    o.shadow.material.opacity = clamp(0.65 - liftAbove * 0.24, 0.16, 0.65);
    node.updateMatrixWorld(true);
  }
  positionAll() {
    const visited = new Set();
    for (const o of this.objects.values()) this.pose(o, visited);
  }
  supportBelow(p, world) {
    if (!world || ['mat', 'box', 'enemy', 'token'].includes(p.kind)) return 0;
    let h = 0,
      coinsBelow = 0;
    for (const other of this.objects.values()) {
      const base = other.p;
      if (
        p.kind === 'coin' &&
        base.kind === 'coin' &&
        !base.parentId &&
        base.id !== p.id &&
        this.drag?.id !== base.id
      ) {
        const order =
          Number(base.stackOrder || 0) - Number(p.stackOrder || 0) ||
          base.id.localeCompare(p.id);
        if (
          order < 0 &&
          Math.hypot(this.metricX(base.x) - world.x, base.z - world.z) <
            Math.min(base.width, p.width) * 0.36
        )
          coinsBelow++;
        continue;
      }
      const struck =
        p.kind === 'weapon' &&
        p.lastThrownBy &&
        ['token', 'enemy'].includes(base.kind);
      if (
        base.id === p.id ||
        ![
          'mat',
          'box',
          'weapon',
          'armor',
          'shield',
          'item',
          'accessory',
          'token',
          'enemy',
        ].includes(base.kind) ||
        (!struck &&
          p.kind !== 'die' &&
          base.width * base.depth <= p.width * p.depth * 1.1) ||
        this.isChild(base, p.id)
      )
        continue;
      const dx = world.x - other.node.position.x,
        dz = world.z - other.node.position.z;
      if (
        Math.max(Math.abs(dx), Math.abs(dz)) >
        Math.max(base.width, base.depth) * 0.71
      )
        continue;
      const yaw = other.node.rotation.y,
        co = Math.cos(yaw),
        si = Math.sin(yaw);
      if (base.kind === 'mat' && base.drawerOpen) {
        const x = dx * co - dz * si,
          z = dx * si + dz * co;
        if (
          x > -0.2401 * MAT_WIDTH &&
          x < 0.4025 * MAT_WIDTH &&
          z > -1.2062 * MAT_DEPTH &&
          z < -0.4743 * MAT_DEPTH
        )
          h = Math.max(h, other.node.position.y + other.h * 0.5 - 0.046);
      }
      if (
        Math.abs(dx * co - dz * si) < base.width * 0.5 &&
        Math.abs(dx * si + dz * co) < base.depth * 0.5
      )
        h = Math.max(h, other.node.position.y + other.h * 0.5);
    }
    return h + coinsBelow * 0.061;
  }
  hits(px, py, exclude) {
    const ray = this.rayAt(px, py),
      items = [];
    for (const o of this.objects.values()) {
      if (o.node.visible && o.p.id !== exclude && !this.isChild(o.p, exclude)) {
        items.push(o.node.userData.pick);
        const f = o.node.userData.fittings;
        if (f)
          items.push(
            ...f.picks.filter(
              (h) => h.userData.fixtureAction !== 'leaf' || f.progress > 0.05
            )
          );
      }
    }
    return ray
      .intersectObjects(items, false)
      .map((x) => this.objects.get(x.object.userData.pieceId));
  }
  pick(px, py, touch) {
    const hits = this.hits(px, py);
    const direct = hits[0];
    if (touch && ['enemy', 'token'].includes(direct?.p.kind)) {
      // At overview scale a fingertip can cover both the struck portrait and
      // the corner of the hatchet. Compare the two visible centres in pixels.
      const distanceToHand = (o) => {
        const v = o.node.position,
          center = this.toPixel(v.x, v.y + o.h * 0.5, v.z);
        return Math.hypot(center.x - px, center.y - py);
      };
      const gear = hits.find(
        (o) => o.p.kind === 'weapon' && !o.p.parentId && o.p.lastThrownBy
      );
      if (gear && distanceToHand(gear) < distanceToHand(direct)) return gear;
    }
    if (!touch || (direct && !['mat', 'box'].includes(direct.p.kind)))
      return direct;
    let near = null,
      best = 17;
    for (const candidate of this.objects.values()) {
      if (
        !['die', 'health', 'ember', 'trait', 'coin'].includes(candidate.p.kind)
      )
        continue;
      const position = candidate.node.position,
        center = this.toPixel(position.x, position.y, position.z);
      const distance = Math.hypot(px - center.x, py - center.y);
      if (distance < best) {
        near = candidate;
        best = distance;
      }
    }
    return near || direct;
  }
  isChild(piece, parentId) {
    if (!parentId) return false;
    const seen = new Set();
    while (piece?.parentId && !seen.has(piece.id)) {
      seen.add(piece.id);
      if (piece.parentId === parentId) return true;
      piece = this.game.pieces[piece.parentId];
    }
    return false;
  }
  destination(px, py, id) {
    const carried = this.objects.get(id)?.p;
    if (!carried) return {};
    for (const o of this.hits(px, py, id)) {
      const p = o.p;
      if (
        ['enemy', 'token'].includes(p.kind) &&
        ['die', 'weapon', 'token'].includes(carried.kind)
      )
        return { targetId: p.id };
      if (
        ['bag', 'box'].includes(p.kind) &&
        !['bag', 'box', 'mat', 'token', 'enemy'].includes(carried.kind)
      )
        return { parentId: p.id };
      const slotList = getSlots(p);
      if (!slotList.length) continue;
      const pos = this.worldAt(px, py, o.node.position.y + o.h / 2);
      const local = o.node.worldToLocal(
        new THREE.Vector3(pos.x, o.node.position.y + o.h / 2, pos.z)
      );
      for (const s of slotList) {
        if (
          p.kind === 'mat' &&
          ((isDrawerSlot(s.id) && !p.drawerOpen) ||
            (carried.role === 'action' &&
              (carried.rolled ? /^action/ : /^reserve/).test(s.id)))
        )
          continue;
        if (
          Math.abs(s.x - local.x) <= s.width * 0.54 &&
          Math.abs(s.z - local.z) <= s.depth * 0.54 &&
          s.accepts?.includes(carried.kind)
        ) {
          return { parentId: p.id, slot: s.id };
        }
      }
      if (carried.kind === 'ember' && p.kind === 'weapon')
        return { targetId: p.id };
    }
    return {};
  }
  mark(dest, point) {
    if (!dest.parentId && !dest.targetId) {
      this.highlight.visible = false;
      return;
    }
    const o = this.objects.get(dest.parentId || dest.targetId);
    if (!o) return;
    let x = o.node.position.x,
      z = o.node.position.z,
      r = Math.min(o.p.width, o.p.depth) * 0.53;
    if (dest.slot) {
      const s = getSlots(o.p).find((v) => v.id === dest.slot);
      if (s) {
        const v = o.node.localToWorld(new THREE.Vector3(s.x, 0, s.z));
        x = v.x;
        z = v.z;
        r = Math.min(s.width, s.depth) * 0.55;
      }
    }
    this.highlight.position.set(x, o.node.position.y + o.h * 0.5 + 0.05, z);
    this.highlight.scale.setScalar(r);
    this.highlight.visible = true;
    this.invalidate();
  }
  previewPawn(id, pixel, hit) {
    const item = this.objects.get(id)?.p;
    const target = this.objects.get(hit?.targetId)?.p;
    const movingPawn = item && (item.kind === 'token' || item.kind === 'enemy');
    const at =
      movingPawn && !hit?.parentId && this.worldAt(pixel.x, pixel.y, 0.03);
    this.destinationTile.userData.select(
      this,
      at,
      Boolean(target && target.kind !== item?.kind)
    );
  }
  async dropFromHand(command, o, at) {
    const landing = { at, revision: null, rejected: false };
    this.landings.set(o.p.id, landing);
    this.invalidate();
    try {
      const result = await this.send(command, o.p.id);
      if (result && Number.isFinite(result.revision))
        landing.revision = result.revision;
      else landing.rejected = true;
      return result;
    } finally {
      this.invalidate();
    }
  }
  async send(c, id) {
    try {
      return await this.props.onCommand?.(c);
    } catch (e) {
      this.announce(e?.message || 'La pieza sigue en la mesa.');
    } finally {
      if (id) this.props.onRelease?.(id);
      this.invalidate();
    }
  }
  startFlight(o, velocity, roll) {
    const id = o.p.id,
      body = o.body;
    if (this.active.has(id)) return;
    body.type = CANNON.Body.DYNAMIC;
    if (o.p.kind === 'die') {
      const finish = o.node.userData.die?.finish || 'amber';
      weighDie(body, o.p.sides, finish, o.node.userData.radius);
    } else {
      body.mass = o.p.kind === 'mat' ? 2.4 : 0.39;
      body.updateMassProperties();
      body.sleepTimeLimit = 0.22;
      body.sleepSpeedLimit = 0.12;
    }
    body.wakeUp();
    if (roll) {
      spinDie(body, velocity);
    } else {
      const speed = Math.hypot(velocity.x, velocity.z);
      body.velocity.set(
        velocity.x,
        Math.min(2.7, 0.45 + speed * 0.19),
        velocity.z
      );
      body.angularFactor.set(0, 1, 0);
      body.angularVelocity.set(0, clamp(velocity.x * 0.26, -1.9, 1.9), 0);
    }
    if (o.p.kind === 'mat') body.angularFactor.set(0, 1, 0);
    body.aabbNeedsUpdate = true;
    const flight = { o, roll, start: this.clock, lastPing: 0, pending: false };
    if (roll && o.node.userData.pair) {
      flight.pairBodies = o.node.userData.pair.map((mesh, i) => {
        const radius = mesh.userData.die.radius,
          die = new CANNON.Body({ mass: 0.07, shape: dieShape(10, radius) });
        die.position.copy(body.position);
        die.position.x += o.node.userData.radius * (i ? 0.57 : -0.57);
        die.quaternion.copy(mesh.quaternion);
        die.velocity.copy(body.velocity);
        die.velocity.x += i ? 0.17 : -0.17;
        weighDie(die, 10, mesh.userData.die.finish, radius);
        spinDie(die, { x: die.velocity.x, z: die.velocity.z });
        die.addEventListener('collide', (e) => {
          const hit = Math.abs(e.contact?.getImpactVelocityAlongNormal() || 0);
          if (hit > 0.55) this.audio.play('stone', Math.min(1, hit / 5));
        });
        this.physics.addBody(die);
        return die;
      });
      body.collisionFilterMask = 0;
      body.type = CANNON.Body.KINEMATIC;
      body.velocity.setZero();
      body.angularVelocity.setZero();
    }
    this.active.set(id, flight);
    this.invalidate();
  }
  finishFlight(f) {
    if (f.pending) return;
    f.pending = true;
    const { o, roll } = f,
      p = o.p,
      body = o.body;
    const q = new THREE.Quaternion().copy(body.quaternion);
    let value = roll ? dieResult(p.sides, q) : p.value;
    const faces = f.pairBodies?.map((b) =>
      new THREE.Quaternion().copy(b.quaternion)
    );
    if (faces) {
      const tens = dieResult(10, faces[0]) % 10,
        units = dieResult(10, faces[1]) % 10;
      value = tens * 10 + units || 100;
    }
    body.sleep();
    const c = {
      type: roll ? 'roll' : 'drop',
      pieceId: p.id,
      x: this.gameX(body.position.x),
      z: body.position.z,
    };
    if (roll) c.value = value;
    if (p.kind === 'die') c.orientation = q.toArray();
    if (faces) c.percentileOrientation = faces.map((v) => v.toArray());
    if (p.kind !== 'die')
      c.yaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
    this.send(c, p.id).finally(() => {
      if (f.pairBodies)
        for (const b of f.pairBodies) {
          if (b.world) this.physics.removeBody(b);
        }
      body.collisionFilterMask = -1;
      body.type = CANNON.Body.STATIC;
      body.mass = 0;
      body.updateMassProperties();
      body.velocity.setZero();
      body.angularVelocity.setZero();
      this.active.delete(p.id);
      this.invalidate();
    });
  }
  step(dt) {
    this.dt = dt;
    this.clock += dt;
    for (const [id, effect] of this.effects) {
      const t = this.clock - effect.start;
      if (t > 1.22) {
        clearGroup(effect.node);
        this.effects.delete(id);
        continue;
      }
      const opacity = clamp((1.22 - t) / 0.4, 0, 1);
      if (effect.kind === 'impact') {
        effect.node.material.opacity = opacity;
        effect.node.position.y = effect.height + 0.3 * (1 - Math.exp(-t * 3.8));
      } else {
        for (const shard of effect.node.children) {
          const { centerX, centerZ, mid, index } = shard.userData;
          const distance =
            (0.28 + 0.041 * (index % 3)) * (1 - Math.exp(-t * 4.2));
          shard.position.set(
            centerX + Math.cos(mid) * distance,
            Math.max(0, t * (1.6 + 0.23 * (index % 3)) - 4.3 * t * t),
            centerZ + Math.sin(mid) * distance
          );
          shard.rotation.set(
            0.31 * Math.sin(t * Math.PI * 2.3) * Math.exp(-t * 3),
            distance * (index % 2 ? 1 : -1),
            0.22 * Math.sin(t * Math.PI * 2) * Math.exp(-t * 3)
          );
          for (const mat of shard.material) mat.opacity = opacity;
        }
      }
    }
    if (this.fading) {
      this.fading = false;
      for (const node of this.terrain.children) {
        if (!node.userData.top) continue;
        const faded = node.userData.terrain.faded;
        const target = faded ? 0.38 : 1,
          top = node.userData.top.material,
          under = node.userData.under.material;
        const delta = target - top.opacity;
        if (Math.abs(delta) < 0.003) top.opacity = target;
        else {
          top.opacity += delta * (1 - Math.exp(-dt * (faded ? 12 : 7.5)));
          this.fading = true;
        }
        under.opacity = 0.115 + (top.opacity - 0.38) * (0.625 / 0.62);
        top.depthWrite = under.depthWrite = top.opacity >= 0.995;
      }
    }
    if (this.drag?.moving) this.input.edge(dt);
    this.positionAll();
    if (this.active.size || this.drag?.moving) {
      this.physics.step(1 / 90, dt, 5);
      for (const f of this.active.values()) {
        if (f.pending) continue;
        const { o } = f;
        if (this.clock - f.lastPing > 0.12) {
          const q = o.body.quaternion;
          const pose = {
            height: o.node.position.y,
            orientation: [q.x, q.y, q.z, q.w],
            rolling: !!f.roll,
          };
          if (f.pairBodies)
            pose.percentileOrientation = f.pairBodies.map((b) => [
              b.quaternion.x,
              b.quaternion.y,
              b.quaternion.z,
              b.quaternion.w,
            ]);
          this.props.onDrag?.(
            o.p.id,
            this.gameX(o.node.position.x),
            o.node.position.z,
            pose
          );
          f.lastPing = this.clock;
        }
        const bodies = f.pairBodies || [o.body];
        if (
          this.clock - f.start > 3.3 ||
          (this.clock - f.start > 0.32 &&
            bodies.every(
              (b) =>
                b.sleepState === CANNON.Body.SLEEPING ||
                (b.velocity.length() < 0.095 &&
                  b.angularVelocity.length() < 0.2)
            ))
        )
          this.finishFlight(f);
      }
      this.positionAll();
    }
    this.scene.updateMatrixWorld(true);
    if (this.renderer) this.renderer.render(this.scene, this.cam);
    else if (this.ctx) drawFlat(this);
    this.dirty = Math.max(0, this.dirty - 1);
  }
  screenPoint({ pieceId, slot, fixture, x, z } = {}) {
    const o = this.objects.get(pieceId);
    let pt;
    if (o) {
      const s = slot && getSlots(o.p).find((t) => t.id === slot);
      const fitting = o.node.userData.fittings?.picks.find(
        (p) => p.userData.fixtureAction === fixture
      );
      const point = fitting
        ? fitting.getWorldPosition(new THREE.Vector3())
        : o.node.localToWorld(
            new THREE.Vector3(s ? s.x : 0, o.h * 0.5, s ? s.z : 0)
          );
      pt = this.toPixel(point.x, point.y, point.z);
    } else if (Number.isFinite(x) && Number.isFinite(z)) {
      pt = this.toPixel(this.metricX(x), 0.025, z);
    } else return null;
    const rect = this.canvas.getBoundingClientRect();
    return { x: pt.x + rect.left, y: pt.y + rect.top };
  }
  previewMat(character, pixels) {
    if (
      this.disposed ||
      !character ||
      !Number.isFinite(pixels?.x) ||
      !Number.isFinite(pixels?.y)
    )
      return null;
    if (!this.placement || this.placement.key !== character.id) {
      this.clearPreview();
      const p = {
        id: 'placing-mat',
        kind: 'mat',
        width: MAT_WIDTH,
        depth: MAT_DEPTH,
        name: character.name || character.className,
        className: character.className,
        image: character.portrait || character.image,
        maxLife: character.life,
        defense: character.defense,
        isBarbarian: character.isBarbarian,
      };
      const node = makePiece(this.lib, p),
        shadow = makeShadow(this.lib, p.width, p.depth);
      node.userData.grip?.userData.setLift(1);
      this.scene.add(node, shadow);
      this.placement = {
        key: character.id,
        p,
        node,
        shadow,
        h: pieceHeight(p),
      };
      this.audio.unlock();
      this.audio.play('rub', 0.36);
    }
    const rect = this.canvas.getBoundingClientRect(),
      point = this.worldAt(pixels.x - rect.left, pixels.y - rect.top);
    const { node, shadow } = this.placement;
    node.position.set(point.x, 0.34, point.z);
    node.rotation.x = -0.035;
    node.updateMatrixWorld(true);
    shadow.position.set(point.x + 0.09, 0.037, point.z + 0.14);
    this.invalidate();
    return { x: this.gameX(point.x), z: point.z };
  }
  clearPreview() {
    if (!this.placement) return;
    clearGroup(this.placement.node);
    clearGroup(this.placement.shadow);
    this.placement = null;
    this.invalidate();
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestore);
    this.input.destroy();
    for (const id of this.active.keys()) this.props.onRelease?.(id);
    this.clearPreview();
    this.audio.dispose();
    for (const id of [...this.objects.keys()]) this.remove(id);
    clearGroup(this.scene);
    this.smokeSurface?.dispose();
    this.lib.dispose();
    this.renderer?.dispose();
  }
}
