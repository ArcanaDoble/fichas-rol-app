import * as THREE from 'three';

// Mesa/fuente/juego.js projects ground distances by q = .83.
export const PATIO_ANGLE = Math.round((Math.acos(0.83) * 180) / Math.PI);
export const MAX_ANGLE = 40;

export function pawnCell(table, point) {
  const scene = table.game.scenes[table.game.sceneId];
  const x = table.gameX(point.x),
    z = point.z;
  if (x < 0 || z < 0 || x >= scene.cols || z >= scene.rows) return null;
  return { x: Math.floor(x), z: Math.floor(z) };
}

// targetCell, from fuente/dibujo.js. The lifted face samples the actual stone
// or illustration under the piece, including its grain and map registration.
export function makeDestinationTile() {
  const group = new THREE.Group();
  const side = new THREE.Mesh(
    new THREE.BoxGeometry(0.984, 1, 0.984),
    new THREE.MeshBasicMaterial({ color: '#3b3b2e' })
  );
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.98),
    new THREE.MeshStandardMaterial({ roughness: 0.91 })
  );
  const tint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.98),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
  );
  const outline = new THREE.Mesh(
    new THREE.RingGeometry(0.676, 0.699, 4, 1, Math.PI / 4),
    new THREE.MeshBasicMaterial()
  );
  for (const mesh of [face, tint, outline]) mesh.rotation.x = -Math.PI / 2;
  group.add(side, face, tint, outline);
  group.visible = false;
  function select(table, point, hostile) {
    const cell = point && pawnCell(table, point);
    group.visible = Boolean(cell);
    group.userData.cell = cell;
    if (!cell) return;
    const scene = table.game.scenes[table.game.sceneId];
    const u = (cell.x + 0.01) / scene.cols,
      v = 1 - (cell.z + 0.01) / scene.rows;
    const uv = face.geometry.attributes.uv;
    uv.setXY(0, u, v);
    uv.setXY(1, u + 0.98 / scene.cols, v);
    uv.setXY(2, u, v - 0.98 / scene.rows);
    uv.setXY(3, u + 0.98 / scene.cols, v - 0.98 / scene.rows);
    uv.needsUpdate = true;
    if (face.material.map !== table.mapTexture) {
      face.material.map = table.mapTexture;
      face.material.needsUpdate = true;
    }
    const ground = table.map.userData.surface || table.map.children[1];
    if (ground?.material?.color)
      face.material.color.copy(ground.material.color);
    // The trial's offset is .032 cells on screen. At zenith a real lift only
    // shows its shadow, so the outline remains even with reduced motion.
    const height = table.reduceMotion ? 0.006 : 0.085;
    group.position.set(table.metricX(cell.x + 0.5), 0.043, cell.z + 0.5);
    group.scale.x = table.cellAspect;
    side.position.y = height / 2;
    side.scale.y = height;
    face.position.y = height;
    tint.position.y = height + 0.001;
    outline.position.y = height + 0.002;
    tint.material.color.set(hostile ? '#df7747' : '#edcd86');
    tint.material.opacity = hostile ? 0.2 : 0.17;
    outline.material.color.set(hostile ? '#e9a083' : '#e6cb91');
    group.userData.hostile = hostile;
  }
  group.userData.select = select;
  return group;
}
