import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
  mergeRogueliteClassCatalogs,
  normalizeRogueliteClass,
} from '../../roguelite/classDefinition';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import {
  getTreeAsset,
  getTreeLocalPolygon,
} from '../../tactical-shared/scenery';
import { WORLD_SIZE } from '../../tactical-shared/spatial';
import {
  isSmokeArea,
  tokenHasHiddenStatus,
} from '../../tactical-shared/tokenVisibilityAccess';
import { getCanvasWeaponRange } from '../combat/canvasAttackRules';
import starter from './starterBox.json';

const key = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const title = (value) =>
  value ? value[0].toLocaleUpperCase('es') + value.slice(1) : '';
const equipmentArt = new Map(
  starter.characters.flatMap((c) => c.pool.map((p) => [key(p.name), p.image]))
);
const tree = '/scenery/trees/fa-01-arbol-verde-a1.webp';
export const starterScenes = [
  {
    id: 'patio',
    name: 'Patio de Ceniza',
    cols: 8,
    rows: 6,
    image: '',
    darkness: 0,
    terrain: [
      {
        id: 'castano',
        name: 'Castaño',
        kind: 'tree',
        x: 1.7,
        z: 1.65,
        width: 2.35,
        depth: 2.35,
        image: tree,
        visionMode: 'trunk',
        trunkRatio: 0.32,
      },
    ],
    enemies: [
      {
        ...starter.enemies.find((e) => key(e.name) === 'duende'),
        id: 'duende-del-patio',
        x: 5.5,
        z: 2.5,
      },
    ],
  },
  {
    id: 'aljibe',
    name: 'Umbral del aljibe',
    cols: 7,
    rows: 5,
    image: '',
    darkness: 0.35,
    terrain: [
      {
        id: 'puerta',
        name: 'Puerta del aljibe',
        kind: 'door',
        x: 3,
        z: 2.5,
        x1: 3,
        z1: 2,
        x2: 3,
        z2: 3,
        open: false,
      },
      {
        id: 'brasero',
        kind: 'light',
        x: 1.5,
        z: 3.5,
        radius: 2,
        name: 'Brasero',
      },
    ],
    enemies: [],
  },
];
export const starterCatalog = {
  characters: starter.characters,
  enemies: starter.enemies,
  scenes: starterScenes,
};
const byId = (base, extra) => [
  ...new Map([...base, ...extra].map((item) => [item.id, item])).values(),
];
const dieSides = (input) => {
  if (Array.isArray(input))
    return input
      .map((n) => Number(String(n).replace(/^d/i, '')))
      .filter((n) => [4, 6, 8, 10, 12, 20].includes(n));
  const result = [];
  for (const match of String(input || '').matchAll(
    /(\d*)d(20|12|10|8|6|4)\b/gi
  )) {
    result.push(
      ...Array(Math.min(8, Number(match[1]) || 1)).fill(Number(match[2]))
    );
  }
  return result;
};

export function characterForTable(
  source,
  forge = [],
  imageLibrary = new Map()
) {
  const c = normalizeRogueliteClass(source);
  const className = title(source.className || source.templateName || c.name);
  const pool = [];
  const categories = {
    weapons: 'weapon',
    armor: 'armor',
    objects: 'item',
    accessories: 'accessory',
  };
  for (const [category, kind] of Object.entries(categories)) {
    for (const item of c.equipment[category] || []) {
      const name = item.name || item.nombre;
      if (!name) continue;
      const entry = forge.find(
        (row) =>
          (item.templateId &&
            [row.id, row.templateId, row.payload?.templateId].includes(
              item.templateId
            )) ||
          key(row.name || row.nombre || row.payload?.name) === key(name)
      );
      const definition = { ...entry, ...entry?.payload, ...item };
      const traits = key([definition.traits, definition.rasgos].join(' '));
      pool.push({
        id: String(item.instanceId || item.templateId || item.id || name),
        name,
        kind: key(name).includes('escudo') ? 'shield' : kind,
        image:
          imageLibrary.get(key(entry?.name || entry?.nombre || name)) ||
          imageLibrary.get(key(name)) ||
          definition.image ||
          definition.imagen ||
          definition.imageUrl ||
          entry?.payload?.image ||
          entry?.image ||
          [definition.icon, entry?.payload?.icon, entry?.icon].find(icon => typeof icon === 'string' && /^(https?:|data:image\/|\/)/i.test(icon)) ||
          equipmentArt.get(key(name)) ||
          '',
        hands: resolveEquipmentHandsRequired(definition),
        dice: dieSides(definition.damage || definition.dano),
        thrown: traits.includes('arrojadiza'),
        critical: traits.includes('critico'),
        heavy: traits.includes('pesada'),
        perforating: traits.includes('perforante'),
        defense: Number(definition.defense || definition.defensa) || 0,
        range: Math.min(100, getCanvasWeaponRange(definition)),
      });
    }
  }
  return {
    id: String(source.id),
    className,
    name: title(c.name),
    portrait: c.image || source.avatar || '',
    life: c.lifeInitial || c.maxLife || 6,
    defense: c.defenseClass || 5,
    initiativeBase: c.initiativeBase,
    actionDice: dieSides(c.actionDice),
    isBarbarian:
      key(className).includes('barbaro') || key(c.resource.name) === 'furia',
    pool,
  };
}

export function enemyForTable(source) {
  const weapons = (source.equipmentSlots || []).filter(Boolean);
  const dice = weapons.flatMap((slot) =>
    dieSides(slot.damage || slot.dano || slot.payload?.damage)
  );
  return {
    id: String(source.id),
    name: title(source.name || 'Criatura'),
    image: source.image || source.portrait || source.img || '',
    life: Number(source.stats?.vida?.current ?? source.life ?? 5),
    defense: Number(source.stats?.cd?.current ?? source.defense ?? 5),
    offense: Number(source.stats?.ofensiva?.current ?? source.offenseBase ?? 3),
    dice: dice.length ? dice : [4],
  };
}

export function sceneForTable(source) {
  const config = source.config || {};
  const cellX = Math.max(1, Number(config.cellWidth) || 50),
    cellZ = Math.max(1, Number(config.cellHeight) || 50);
  const cols = Math.max(2, Number(config.columns) || 8),
    rows = Math.max(2, Number(config.rows) || 6);
  const X = (px) => (Number(px) - WORLD_SIZE / 2) / cellX + cols / 2;
  const Z = (py) => (Number(py) - WORLD_SIZE / 2) / cellZ + rows / 2;
  const scene = {
    id: String(source.id),
    name: source.name || 'Escenario',
    cols,
    rows,
    cellAspect: cellX / cellZ,
    image: config.backgroundImage || '',
    imageWidth: config.imageWidth,
    imageHeight: config.imageHeight,
    darkness: Number(config.ambientDarkness) || 0,
    snapToGrid: config.snapToGrid,
    fogOfWar: Boolean(config.fogOfWar),
    terrain: [],
    enemies: [],
  };
  const unsupported = new Set();
  for (const item of Array.isArray(source.items) ? source.items : []) {
    const width = (Number(item.width) || cellX) / cellX,
      depth = (Number(item.height) || cellZ) / cellZ;
    const base = {
      id: String(item.id),
      name: item.name || '',
      width,
      depth,
      hidden: Boolean(item.hidden || item.isHidden || item.layer === 'GM'),
      x: X(item.x) + width / 2,
      z: Z(item.y) + depth / 2,
      yaw: ((Number(item.rotation) || 0) * Math.PI) / 180,
    };
    if (item.profileType === 'rogueliteEnemy') {
      scene.enemies.push({
        ...enemyForTable(item),
        ...base,
        hidden: Boolean(
          item.hidden ||
            item.isHidden ||
            item.layer === 'GM' ||
            tokenHasHiddenStatus(item)
        ),
      });
    } else if (item.geometryKind === 'tree') {
      scene.terrain.push({
        ...base,
        kind: 'tree',
        image: getTreeAsset(item)?.image || item.img || tree,
        visionMode: item.treeVisionMode || 'canopy',
        trunkRatio: item.treeTrunkRatio || 0.35,
        polygon: getTreeLocalPolygon(item, 'canopy').map((p) => ({
          x: p.x / cellX - width / 2,
          z: p.y / cellZ - depth / 2,
        })),
      });
    } else if (item.type === 'wall') {
      scene.terrain.push({
        ...base,
        kind: ['door','window'].includes(item.wallType) ? item.wallType : 'wall',
        open: Boolean(item.isOpen),
        secret: Boolean(item.isSecret),
        transparent: item.wallType === 'window',
        thickness: (Number(item.thickness) || 4) / cellX,
        x1: X(item.x1),
        z1: Z(item.y1),
        x2: X(item.x2),
        z2: Z(item.y2),
      });
    } else if (item.type === 'light') {
      scene.terrain.push({
        ...base,
        kind: 'light',
        radius: (Number(item.radius) || cellX * 3) / cellX,
        color: item.color || '#fff1ae',
        intensity: item.intensity != null && Number.isFinite(Number(item.intensity)) ? Number(item.intensity) : .8,
        flicker: Boolean(item.flicker),
      });
    } else if (
      isSmokeArea(item) ||
      /fog|niebla/.test(
        key(
          [
            item.areaEffectType,
            item.geometryKind,
            item.shapeType,
            item.name,
          ].join(' ')
        )
      )
    ) {
      scene.terrain.push({
        ...base,
        kind: isSmokeArea(item) ? 'smoke' : 'fog',
      });
    } else if (item.profileType !== 'rogueliteClass' && item.layer !== 'GM') {
      unsupported.add(item.name || item.geometryKind || item.type || 'pieza');
    }
  }
  if (config.isInfinite || cols > 100 || rows > 100)
    scene.unavailable = 'Esta mesa admite mapas finitos de hasta 100 × 100.';
  if (unsupported.size)
    scene.importNote =
      'Elementos pendientes de adaptación: ' +
      [...unsupported].slice(0, 6).join(', ') +
      '.';
  return scene;
}

const documents = async (...parts) =>
  (await getDocs(collection(db, ...parts))).docs.map((d) => ({
    ...d.data(),
    id: d.id,
  }));
export async function loadTableCatalog({ director = false, owner = '' } = {}) {
  const requests = [
    documents('classes'),
    documents('rogueliteClasses'),
    documents('customItems'),
    owner ? documents('players', owner, 'rogueliteClasses') : [],
    director ? documents('canvas_scenarios') : [],
    director ? documents('rogueliteEnemies') : [],
    documents('equipment_images'),
  ];
  const result = await Promise.allSettled(requests);
  const [legacy, dedicated, forge, owned, scenarios, enemies, illustrations] =
    result.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const templates = mergeRogueliteClassCatalogs(
    legacy.filter((c) => c.roguelite || c.actionDice?.length),
    dedicated
  );
  const images = new Map(
    illustrations
      .filter((i) => i.imageUrl)
      .map((i) => [key(i.itemName || i.id.replace(/_/g, ' ')), i.imageUrl])
  );
  const characters = templates.map((c) => characterForTable(c, forge, images));
  for (const c of owned) {
    const template = templates.find((t) => t.id === (c.templateId || c.id));
    characters.unshift(
      characterForTable(
        {
          ...template,
          ...c,
          id: owner + '/' + c.id,
          className: template?.name || c.name,
          equipment: template?.equipment || c.equipment,
        },
        forge,
        images
      )
    );
  }
  return {
    characters: byId(starter.characters, characters),
    enemies: byId(starter.enemies, enemies.map(enemyForTable)),
    scenes: byId(
      starterScenes,
      scenarios
        .filter((s) => (s.rulesSystem || s.config?.gameSystem) !== 'campaign')
        .map(sceneForTable)
    ),
    offline: result.some((r) => r.status === 'rejected'),
  };
}
