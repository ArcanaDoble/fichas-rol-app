import * as THREE from 'three';
import { paintPatioDie } from './rendererDice';
import { paintMedallionWall } from './patioMedallions';
import { visual } from './rendererSurfaces';

// Orthographic projection is affine on each face. Keep the same camera, pieces,
// engravings and hit testing when a browser has disabled hardware rendering.
function face(
  ctx,
  image,
  a,
  b,
  d,
  sx = 0,
  sy = 0,
  width = image?.width,
  height = image?.height
) {
  if (!image || !width || !height) return;
  ctx.save();
  ctx.transform(
    (b.x - a.x) / width,
    (b.y - a.y) / width,
    (d.x - a.x) / height,
    (d.y - a.y) / height,
    a.x,
    a.y
  );
  ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);
  ctx.restore();
}
function polygon(ctx, pts, color) {
  if (!pts.length) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
export function drawFlat(table) {
  const { ctx, canvas, size, game, cam, objects, lib } = table;
  const s = game?.scenes?.[game.sceneId];
  if (!ctx || !s) return;
  ctx.setTransform(canvas.width / size.w, 0, 0, canvas.height / size.h, 0, 0);
  const wood = ctx.createPattern(
    lib.image(visual('nogal-patio.webp')) || lib.wood,
    'repeat'
  );
  ctx.fillStyle = wood || '#34291f';
  ctx.fillRect(0, 0, size.w, size.h);
  const project = (x, y, z) => table.toPixel(table.metricX(x), y, z);
  const rect = (x, z, w, d, y = 0) =>
    [
      [x, z],
      [x + w, z],
      [x + w, z + d],
      [x, z + d],
    ].map(([a, b]) => project(a, y, b));
  const shade = table.map?.userData.shadow;
  if (shade) {
    const pad = shade.pad,
      area = rect(-pad, -pad, s.cols + 2 * pad, s.rows + 2 * pad, -0.151);
    face(ctx, shade.texture.image, area[0], area[1], area[3]);
  }
  const rim = rect(-0.15, -0.15, s.cols + 0.3, s.rows + 0.3, 0.001);
  polygon(ctx, rim, '#544331');
  face(
    ctx,
    table.map?.children[0]?.material[1]?.map?.image,
    rim[0],
    rim[1],
    rim[3]
  );
  const board = rect(0, 0, s.cols, s.rows);
  face(ctx, table.mapTexture?.image, board[0], board[1], board[3]);
  if (s.darkness)
    polygon(ctx, board, 'rgba(8,15,18,' + s.darkness * 0.65 + ')');
  const paintLayer = (mesh) => {
    const texture = mesh.userData.flatTexture || mesh.material.map;
    if (!texture?.image) return;
    const at = (x, y) => {
      const p = mesh.localToWorld(new THREE.Vector3(x, y, 0));
      return table.toPixel(p.x, p.y, p.z);
    };
    const a = at(-0.5, 0.5),
      b = at(0.5, 0.5),
      d = at(-0.5, -0.5);
    ctx.save();
    ctx.globalAlpha = mesh.material.opacity;
    if (mesh.userData.circle) {
      ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const angle = (i * Math.PI) / 24,
          p = at(0.5 * Math.cos(angle), 0.5 * Math.sin(angle));
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.clip();
    }
    face(ctx, texture.image, a, b, d);
    ctx.restore();
  };
  for (const node of table.terrain.children) {
    if (node.userData.terrain?.kind !== 'smoke')
      node.children.filter((m) => m.userData.layer).forEach(paintLayer);
  }
  if (table.fog) paintLayer(table.fog.children[0]);
  for (const node of table.terrain.children) {
    if (node.userData.terrain?.kind === 'smoke')
      node.children.filter((m) => m.userData.layer).forEach(paintLayer);
  }
  const tile = table.destinationTile;
  if (tile.visible && table.mapTexture?.image) {
    const { x, z } = tile.userData.cell,
      art = table.mapTexture.image;
    const base = rect(x + 0.01, z + 0.01, 0.98, 0.98, 0.043);
    const top = rect(
      x + 0.01,
      z + 0.01,
      0.98,
      0.98,
      0.043 + tile.children[1].position.y
    );
    polygon(ctx, [base[2], base[3], top[3], top[2]], '#3b3b2e');
    face(
      ctx,
      art,
      top[0],
      top[1],
      top[3],
      ((x + 0.01) * art.width) / s.cols,
      ((z + 0.01) * art.height) / s.rows,
      (0.98 * art.width) / s.cols,
      (0.98 * art.height) / s.rows
    );
    polygon(
      ctx,
      top,
      tile.userData.hostile ? 'rgba(223,119,71,.2)' : 'rgba(237,205,134,.17)'
    );
    ctx.strokeStyle = tile.userData.hostile ? '#e9a083' : '#e6cb91';
    ctx.lineWidth = Math.max(1, (top[1].x - top[0].x) * 0.017);
    ctx.stroke();
  }
  const pieces = [
    ...objects.values(),
    ...(table.placement ? [table.placement] : []),
  ].filter((o) => o.node.visible);
  const depth = new THREE.Vector3();
  for (const o of pieces) {
    o.flatDepth = depth
      .setFromMatrixPosition(o.node.matrixWorld)
      .applyMatrix4(cam.matrixWorldInverse).z;
  }
  pieces.sort((a, b) => a.flatDepth - b.flatDepth);
  // At an oblique angle the centre of a broad ledger can project ahead of a
  // die in its far pocket. Paint each support before its nested pieces.
  const visible = [],
    visited = new Set();
  function aboveSupport(o) {
    if (!o?.node.visible || visited.has(o)) return;
    visited.add(o);
    aboveSupport(objects.get(o.p.parentId));
    visible.push(o);
  }
  for (const piece of pieces) aboveSupport(piece);
  for (const piece of visible) {
    const shadow = piece.shadow;
    if (!shadow?.visible || !shadow.material?.map?.image) continue;
    const params = shadow.geometry.parameters;
    const projectShadow = (x, y) => {
      const pt = shadow.localToWorld(new THREE.Vector3(x, y, 0));
      return table.toPixel(pt.x, pt.y, pt.z);
    };
    const halfW = params.width / 2,
      halfD = params.height / 2;
    ctx.save();
    ctx.globalAlpha = shadow.material.opacity;
    face(
      ctx,
      shadow.material.map.image,
      projectShadow(-halfW, halfD),
      projectShadow(halfW, halfD),
      projectShadow(-halfW, -halfD)
    );
    ctx.restore();
  }
  for (const { p, node, h } of visible) {
    const w = p.width || 1,
      d = p.depth || w,
      die = node.userData.die;
    const world = (v) => v.clone().applyMatrix4(node.matrixWorld);
    const pp = (v) => table.toPixel(v.x, v.y, v.z);
    if (die || node.userData.pair) {
      const parts = node.userData.pair || [node.children[0]];
      for (const part of parts)
        paintPatioDie(ctx, part, pp, table.viewDirection);
    } else {
      const fittings = node.userData.fittings;
      const printFittings = (drawer) => {
        if (!fittings) return;
        node.traverse((part) => {
          const image = part.userData.fixturePrint;
          if (!image || (part.parent === fittings.leaf) !== drawer) return;
          const { width, depth, texture } = image;
          const p2 = (x, z) =>
            pp(new THREE.Vector3(x, 0, z).applyMatrix4(part.matrixWorld));
          face(
            ctx,
            texture.image,
            p2(-width / 2, -depth / 2),
            p2(width / 2, -depth / 2),
            p2(-width / 2, depth / 2)
          );
        });
      };
      printFittings(true);
      const points = [
        [-w / 2, -d / 2],
        [w / 2, -d / 2],
        [w / 2, d / 2],
        [-w / 2, d / 2],
      ].map(([x, z]) => pp(world(new THREE.Vector3(x, h * 0.5, z))));
      ctx.save();
      if (p.kind === 'token' || p.kind === 'enemy') {
        ctx.globalAlpha = p.hidden ? 0.58 : 1;
        paintMedallionWall(ctx, w, d, h, p.kind === 'enemy', (coords) =>
          pp(world(new THREE.Vector3(...coords)))
        );
      }
      if (!['token', 'enemy', 'coin', 'bag'].includes(p.kind))
        polygon(
          ctx,
          points.map((v) => ({
            x: v.x + 1,
            y: v.y + Math.max(2, 5 / table.zoom),
          })),
          '#574431'
        );
      face(ctx, node.userData.texture?.image, points[0], points[1], points[3]);
      ctx.restore();
      const ring = node.userData.rings?.children.find((m) => m.visible);
      if (ring) {
        const sw = (w * node.userData.rings.userData.scale) / 2,
          sd = (d * node.userData.rings.userData.scale) / 2;
        const draw = (x, z) =>
          pp(ring.localToWorld(new THREE.Vector3(x, 0, z)));
        face(
          ctx,
          ring.material.map.image,
          draw(-sw, -sd),
          draw(sw, -sd),
          draw(-sw, sd)
        );
      }

      printFittings(false);
    }
  }
  for (const node of table.terrain.children) {
    const t = node.userData.terrain;
    if (t?.kind === 'tree') {
      const before = ctx.globalAlpha;
      const w = t.width || 1,
        d = t.depth || w,
        r = rect(t.x - w / 2, t.z - d / 2, w, d, 0.49);
      ctx.globalAlpha = node.userData.top.material.opacity;
      face(
        ctx,
        lib.image(t.image || '/scenery/trees/fa-01-arbol-verde-a1.webp'),
        r[0],
        r[1],
        r[3]
      );
      ctx.globalAlpha = before;
    }
  }
  for (const e of table.effects.values())
    if (e.kind === 'impact') {
      const p = table.toPixel(
          e.node.position.x,
          e.node.position.y,
          e.node.position.z
        ),
        radius = (size.h / table.viewSpan) * table.zoom;
      ctx.save();
      ctx.globalAlpha = e.node.material.opacity;
      ctx.drawImage(
        e.node.material.map.image,
        p.x - radius * 0.55,
        p.y - radius * 0.26,
        radius * 1.1,
        radius * 0.52
      );
      ctx.restore();
    }
}
