import * as THREE from 'three';
import { innerFog } from '../../../vendor/tokenmagic/fog';
import capturedFog from '../../../assets/fog-shader-zone.webp';
import {
  getBoardLightVisualProfile,
  getBoardLightFlickerStyle,
} from '../../../utils/boardLighting';
import { calculateShadowPoints } from '../../tactical-shared/spatial';
import { cutPath } from './rendererSurfaces';
const { unpackMask } = require('./gameSightMask.js');

// A dark veil whose boundary follows the actual view rays. The hard interior
// covers the old map immediately when a new private illustration is in flight.
export function makeSightVeil(scene) {
  const { visibility } = scene;
  if (!visibility) return null;
  const rows = unpackMask(visibility.detail) || visibility.rowsMask;
  if (!rows?.some((row) => row.includes('0'))) return null;
  const small = document.createElement('canvas');
  small.width = rows[0].length;
  small.height = rows.length;
  const smallCtx = small.getContext('2d'),
    samples = smallCtx.createImageData(small.width, small.height);
  for (let y = 0; y < small.height; y++)
    for (let x = 0; x < small.width; x++) {
      const i = (y * small.width + x) * 4;
      samples.data.set([11, 17, 24, rows[y][x] === '0' ? 255 : 0], i);
    }
  smallCtx.putImageData(samples, 0, 0);
  const canvas = document.createElement('canvas'),
    scale = Math.min(4, 1024 / Math.max(small.width, small.height));
  canvas.width = Math.max(2, Math.round(small.width * scale));
  canvas.height = Math.max(2, Math.round(small.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  const observer = visibility.observer;
  if (observer) {
    ctx.save();
    ctx.scale(canvas.width / scene.cols, canvas.height / scene.rows);
    const fade = ctx.createRadialGradient(
      observer.x,
      observer.z,
      0,
      observer.x,
      observer.z,
      observer.radius
    );
    fade.addColorStop(0, 'rgba(11,17,24,0)');
    fade.addColorStop(0.85, 'rgba(11,17,24,.2)');
    fade.addColorStop(1, '#0b1118');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, scene.cols, scene.rows);
    ctx.restore();
  }
  // Occluded sample centres retain full opacity, including the first frame
  // following a move and the Canvas2D path.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const sheet = layer(group, texture, scene.cols, scene.rows, 0.042);
  sheet.renderOrder = 2;
  sheet.position.x = scene.cols / 2;
  sheet.position.z = scene.rows / 2;
  group.userData.ownTextures = [texture];
  group.userData.texture = texture;
  return group;
}

// The same fog program and captured frames as the tactical canvas. Every smoke
// zone reads one 128px texture, irrespective of the viewport size or zone count.
export function createSmokeSurface(lib, renderer) {
  let frame = 0;
  const atlas = lib.texture('fog:captured', 128, 128, (ctx, w, h, get) => {
    const art = get(capturedFog);
    if (art)
      ctx.drawImage(
        art,
        (frame * art.width) / 12,
        0,
        art.width / 12,
        art.height,
        0,
        0,
        w,
        h
      );
  });
  let target, source, quad, pass, camera;
  if (renderer) {
    target = new THREE.WebGLRenderTarget(128, 128, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    source = new THREE.DataTexture(new Uint8Array([11, 17, 32, 255]), 1, 1);
    source.needsUpdate = true;
    const material = new THREE.RawShaderMaterial({
      vertexShader:
        'attribute vec3 position; varying vec2 vTextureCoord; varying vec2 vFilterCoord; void main(){ vTextureCoord=position.xy*.5+.5; vFilterCoord=vTextureCoord; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: innerFog.replace(
        'precision mediump float;',
        'precision highp float;'
      ),
      uniforms: {
        uSampler: { value: source },
        time: { value: 0 },
        color: { value: new THREE.Vector3() },
        density: { value: 0.65 },
        dimensions: { value: new THREE.Vector2(1, 1) },
      },
      depthWrite: false,
      depthTest: false,
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    pass = new THREE.Scene();
    pass.add(quad);
    camera = new THREE.Camera();
    // TokenMagic writes display RGB directly. Store the exact display bytes;
    // applying Three's lighting or gamma conversion brightens the fog twice.
    target.texture.colorSpace = THREE.NoColorSpace;
  }
  let lastTick = -Infinity;
  return {
    texture: target?.texture || atlas,
    fallback: atlas,
    update(now, reduced) {
      if (now - lastTick < 1000 / 24 || (reduced && lastTick !== -Infinity))
        return false;
      lastTick = now;
      if (renderer) {
        const previous = renderer.getRenderTarget();
        quad.material.uniforms.time.value = reduced ? 0 : now * 0.75;
        renderer.setRenderTarget(target);
        renderer.render(pass, camera);
        renderer.setRenderTarget(previous);
      } else {
        const time = reduced ? 0 : (now / 1440) % 2;
        frame = Math.min(11, Math.floor((time > 1 ? 2 - time : time) * 12));
        const art = lib.image(capturedFog);
        if (art) {
          const size = art.width / 12;
          atlas.image
            .getContext('2d')
            .drawImage(art, frame * size, 0, size, art.height, 0, 0, 128, 128);
          atlas.needsUpdate = true;
        }
      }
      return true;
    },
    dispose() {
      quad?.geometry.dispose();
      quad?.material.dispose();
      source?.dispose();
      target?.dispose();
    },
  };
}

function layer(group, texture, width, depth, y, opacity = 1, circle = false) {
  const geometry = circle
    ? new THREE.CircleGeometry(0.5, 64)
    : new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(width, depth, 1);
  mesh.position.y = y;
  mesh.userData.layer = true;
  mesh.userData.circle = circle;
  group.add(mesh);
  return mesh;
}

function endpoints(t) {
  const half = (t.width || 1) / 2;
  return [t.x1 ?? t.x - half, t.z1 ?? t.z, t.x2 ?? t.x + half, t.z2 ?? t.z];
}

// The engraved stone, timber, hinges and shadow follow boundary() in
// Patio's cartografia-direccion.js. Scale the joints by length per grid unit.
function boundary(lib, group, t, onIllustration, master) {
  const [x1, z1, x2, z2] = endpoints(t);
  const length = Math.hypot(x2 - x1, z2 - z1);
  const door = t.kind === 'door',
    window = t.kind === 'window' || t.transparent;
  if (!length || (onIllustration && !master && !door && !window)) return;
  const open = door && (t.open || t.isOpen);
  const angle = Math.atan2(z2 - z1, x2 - x1) - (open ? 0.93 : 0);
  group.position.set(
    x1 + (Math.cos(angle) * length) / 2,
    0,
    z1 + (Math.sin(angle) * length) / 2
  );
  group.rotation.y = -angle;
  const style = window ? 'window' : door ? 'door' : 'stone';
  const joints = Math.min(
    256,
    Math.max(1, Math.round(length * (door ? 3 : 5)))
  );
  const thickness = Math.max(0.07, Math.min(0.38, t.thickness || 0.12));
  const tex = lib.texture(
    'boundary:' + style + ':' + joints,
    Math.min(3072, Math.max(192, joints * 42)),
    72,
    (ctx, w, h) => {
      const start = door ? (0.06 * w) / Math.max(1, length) : 0,
        end = w - start;
      const line = (x, y, xx, yy, color, weight) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = weight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(xx, yy);
        ctx.stroke();
      };
      line(start, h * 0.65, end, h * 0.65, '#171914b8', h * 0.57);
      line(
        start,
        h * 0.48,
        end,
        h * 0.48,
        window ? '#537675' : door ? '#58361f' : '#53554b',
        h * 0.52
      );
      line(
        start,
        h * 0.29,
        end,
        h * 0.29,
        window ? '#b0d5d4' : door ? '#bd9c62' : '#a19d86',
        h * 0.11
      );
      if (window) line(start, h * 0.62, end, h * 0.62, '#9fc0bd', h * 0.09);
      for (let i = 0; i < joints; i++) {
        const x = start + ((i + 0.5) * (end - start)) / joints;
        line(
          x,
          h * 0.27,
          x,
          h * 0.68,
          door ? '#4b3524' : '#373c35',
          Math.max(1, (w / joints) * 0.066)
        );
      }
      if (door)
        for (const [x, r] of [
          [start, 0.17],
          [end - (w / Math.max(joints, 1)) * 0.18, 0.1],
        ]) {
          ctx.beginPath();
          ctx.ellipse(x, h * 0.48, r * h * 0.65, r * h, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#d2af72';
          ctx.fill();
        }
    }
  );
  const height = onIllustration ? 0.054 : 0.11;
  if (!onIllustration) {
    // The low bevel catches light when the camera tilts. The painted top still
    // shows Patio's original mortar joints, window bars or bronze hinges.
    const half = Math.max(0.018, length / 2 - (door ? 0.06 : 0));
    const breadth = thickness * 0.4,
      cut = Math.min(0.021, breadth * 0.35, half * 0.22);
    const points = [
      [-half + cut, -breadth],
      [half - cut, -breadth],
      [half, -breadth + cut],
      [half, breadth - cut],
      [half - cut, breadth],
      [-half + cut, breadth],
      [-half, breadth - cut],
      [-half, -breadth + cut],
    ];
    const footprint = new THREE.Shape(
      points.map(([x, z]) => new THREE.Vector2(x, z))
    );
    const geom = new THREE.ExtrudeGeometry(footprint, {
      depth: height - 0.056,
      bevelEnabled: true,
      bevelSize: cut * 0.45,
      bevelThickness: 0.007,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geom.rotateX(-Math.PI / 2);
    const rail = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({
        color: door ? '#563c2a' : window ? '#465c58' : '#57574c',
        metalness: door || window ? 0.24 : 0.05,
        roughness: 0.77,
      })
    );
    rail.position.y = 0.039;
    group.add(rail);
  }
  layer(
    group,
    tex,
    length,
    thickness * 1.72,
    height,
    onIllustration && !door && !window ? 0.68 : 1
  );
}

function shadowEdges(t) {
  if (
    t.open ||
    t.blocksVision === false ||
    t.transparent ||
    t.kind === 'window'
  )
    return [];
  if (t.kind === 'wall' || t.kind === 'door') return [endpoints(t)];
  if (t.kind !== 'tree') return [];
  const trunk = (t.visionMode || t.treeVisionMode) === 'trunk';
  const radius = (Math.min(t.width, t.depth) * (t.trunkRatio || 0.35)) / 2;
  const points =
    !trunk && t.polygon?.length >= 3
      ? t.polygon
      : Array.from({ length: 16 }, (_, i) => {
          const angle = (i * Math.PI) / 8;
          return {
            x: Math.cos(angle) * (trunk ? radius : t.width / 2),
            z: Math.sin(angle) * (trunk ? radius : t.depth / 2),
          };
        });
  const a = t.yaw || 0;
  const world = points.map((p) => [
    t.x + p.x * Math.cos(a) + p.z * Math.sin(a),
    t.z - p.x * Math.sin(a) + p.z * Math.cos(a),
  ]);
  return world.map((p, i) => p.concat(world[(i + 1) % world.length]));
}

function lamp(lib, group, t, scene, master, onIllustration) {
  const r = t.radius || 3;
  const profile = getBoardLightVisualProfile({
    ...t,
    type: 'light',
    radius: r * 64,
  });
  const reach = r * 1.12;
  const edges = scene.terrain
    .flatMap(shadowEdges)
    .filter(
      ([x1, z1, x2, z2]) =>
        Math.min(x1, x2) < t.x + reach &&
        Math.max(x1, x2) > t.x - reach &&
        Math.min(z1, z2) < t.z + reach &&
        Math.max(z1, z2) > t.z - reach
    );
  // This texture belongs to this placement only. Editing a light never leaves
  // old visibility textures in the shared library cache.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const px = (v) => (v / reach + 1) * 192;
  const stops = [
    [0, profile.glowCoreOpacity],
    [0.16, profile.glowCoreOpacity * 0.88],
    [0.42, profile.glowMidOpacity],
    [0.72, profile.glowOuterOpacity],
    [1, 0],
  ];
  const grad = ctx.createRadialGradient(192, 192, 0, 192, 192, 192);
  // Canvas accepts the catalog's CSS colours, including named colours.
  ctx.fillStyle = profile.color;
  ctx.fillRect(0, 0, 1, 1);
  const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data;
  ctx.clearRect(0, 0, 1, 1);
  for (const [offset, alpha] of stops)
    grad.addColorStop(
      offset,
      'rgba(' + [red, green, blue, alpha].join(',') + ')'
    );
  ctx.fillStyle = grad;
  ctx.fillRect(
    px(-t.x),
    px(-t.z),
    (scene.cols / reach) * 192,
    (scene.rows / reach) * 192
  );
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const [a, b, c, d] of edges) {
    const polygon = calculateShadowPoints(
      192,
      192,
      px(a - t.x),
      px(b - t.z),
      px(c - t.x),
      px(d - t.z),
      1000,
      0.35
    );
    ctx.beginPath();
    polygon.split(' ').forEach((p, i) => {
      const [x, y] = p.split(',').map(Number);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  const glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  group.userData.ownTextures = [glowTexture];
  const glow = layer(group, glowTexture, reach * 2, reach * 2, 0.045);
  if (t.flicker) {
    const style = getBoardLightFlickerStyle(t.id);
    group.userData.flicker = {
      glow,
      period: parseFloat(style.animationDuration) * 1000,
      phase: parseFloat(style.animationDelay) * 1000,
    };
  }
  if (onIllustration && !master) return;
  const icon = lib.texture('torch:patio', 192, 192, (c, w, h, get) => {
    c.scale(w, h);
    cutPath(c, 0.018, 0.07, 0.964, 0.91, 0.085);
    c.fillStyle = '#39291d';
    c.fill();
    cutPath(c, 0.022, 0.019, 0.956, 0.924, 0.084);
    c.fillStyle = '#a38859';
    c.fill();
    cutPath(c, 0.059, 0.056, 0.882, 0.851, 0.072);
    c.clip();
    const art = get('/armas/antorcha.webp');
    if (art) c.drawImage(art, 0.056, 0.054, 0.888, 0.86);
  });
  layer(group, icon, 0.54, 0.55, 0.087).rotation.z = 0.08;
}

export function addTerrainSurface(lib, group, t, scene, master, smoke) {
  const illustrated = !!(
    scene.image ||
    scene.mapProtected ||
    scene.hasIllustration
  );
  if (['door', 'wall', 'window'].includes(t.kind))
    return boundary(lib, group, t, illustrated, master);
  if (t.kind === 'light')
    return lamp(lib, group, t, scene, master, illustrated);
  const circle = Boolean(t.radius),
    w = circle ? t.radius * 2 : t.width || 1,
    d = circle ? w : t.depth || w;
  if (t.kind === 'smoke') {
    const mesh = layer(group, smoke.texture, w, d, 0.09, 1, circle);
    mesh.renderOrder = 3;
    mesh.userData.flatTexture = smoke.fallback;
    if (smoke.texture !== smoke.fallback) {
      mesh.material.dispose();
      mesh.material = new THREE.ShaderMaterial({
        uniforms: { picture: { value: smoke.texture } },
        vertexShader:
          'varying vec2 sampleUV; void main(){sampleUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'uniform sampler2D picture; varying vec2 sampleUV; void main(){gl_FragColor=texture2D(picture,sampleUV);}',
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
    }
    const mist = /niebla|bruma/i.test(t.name || '');
    const edge = lib.texture(
      'smoke:edge:' + mist + ':' + circle,
      256,
      256,
      (c, W, H) => {
        c.strokeStyle = 'rgba(203,213,225,.70)';
        c.lineWidth = 2;
        c.beginPath();
        if (circle) c.arc(W / 2, H / 2, W / 2 - 2, 0, 2 * Math.PI);
        else c.rect(1, 1, W - 2, H - 2);
        c.stroke();
        c.strokeStyle = 'rgba(226,232,240,.22)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(W / 2, 0);
        c.lineTo(W / 2, H);
        c.moveTo(0, H / 2);
        c.lineTo(W, H / 2);
        c.stroke();
        c.font = '600 14px NomaMesa, Georgia, serif';
        const name = mist ? 'Niebla' : 'Humo',
          width = c.measureText(name).width + 15;
        c.fillStyle = 'rgba(2,6,23,.78)';
        c.fillRect((W - width) / 2, H - 31, width, 20);
        c.fillStyle = '#e2e8f0';
        c.textAlign = 'center';
        c.fillText(name, W / 2, H - 16);
      }
    );
    layer(group, edge, w, d, 0.092, 1, circle).renderOrder = 4;
    return;
  }
  if (t.kind === 'fog' && master) {
    const tex = lib.texture('fog:master-hatch', 96, 96, (c, W, H) => {
      c.fillStyle = '#191b23aa';
      c.fillRect(0, 0, W, H);
      c.lineWidth = 1.15;
      c.strokeStyle = '#b3ada422';
      for (let k = -4; k <= 5; k++) {
        c.beginPath();
        c.moveTo(k * 24, 0);
        c.lineTo(k * 24 + W, H);
        c.stroke();
      }
      c.strokeStyle = '#aaa08c88';
      c.strokeRect(0.5, 0.5, W - 1, H - 1);
    });
    layer(group, tex, w, d, 0.054, 1, circle);
  }
}
