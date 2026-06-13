import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronLeft,
  Database,
  Download,
  Image as ImageIcon,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Tag,
  Type,
  X,
  ArrowDown,
  ArrowUp,
  UploadCloud
} from 'lucide-react';
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadDataUrl } from '../utils/storage';
import HexColorInput from './HexColorInput';

export const CARD_BACKGROUNDS = [
  'Amarillo_1.webp',
  'Amarillo_2.webp',
  'Azul_1.webp',
  'Azul_2.webp',
  'Cian.webp',
  'Gris.webp',
  'Indigo.webp',
  'Morado.webp',
  'Naranja.webp',
  'Rojo.webp',
  'Rosa.webp',
  'Verde_1.webp',
  'Verde_2.webp',
  'Verde_3.webp',
  'Violeta.webp',
].map((file) => ({
  file,
  name: file.replace('.webp', '').replace(/_/g, ' '),
  src: `${process.env.PUBLIC_URL || ''}/cards/${file}`,
}));

const CANVAS_WIDTH = 1888;
const CANVAS_HEIGHT = 2624;
const MOBILE_PREVIEW_RENDER_SCALE = 0.25;
const DEFAULT_CARD_NAME = 'NOMBRE DE CARTA';
const DEFAULT_DESCRIPTION = '';
const DEFAULT_FLAVOR_TEXT = '';
const DESCRIPTION_PREVIEW_TEXT = 'Descripción de la carta';
const PRIMARY_DESCRIPTION_PREVIEW_TEXT = 'Descripción principal';
const FLAVOR_DESCRIPTION_PREVIEW_TEXT = 'Descripción narrativa';
const EMPTY_SLOT = '';

const CARD_TYPES = [
  { id: 'weapon', label: 'Daño', containerId: 'damage', maxTraits: 6, layout: 'weapon' },
  { id: 'armor', label: 'Consumo', containerId: 'consumption', maxTraits: 8, layout: 'armor' },
  { id: 'trap', label: 'Rasgos', containerId: 'traits', maxTraits: 1, layout: 'trap' },
  { id: 'action', label: 'Regla', containerId: 'range', maxTraits: 0, layout: 'none' },
  { id: 'skill', label: 'Minion', containerId: 'minion', maxTraits: 4, layout: 'weapon' },
  { id: 'status', label: 'Descripción', containerId: 'description', maxTraits: 1, layout: 'trap' },
];

const CARD_CONTAINER_TYPES = [
  { id: 'range', label: 'Alcance' },
  { id: 'consumption', label: 'Consumo' },
  { id: 'damage', label: 'Daño' },
  { id: 'traits', label: 'Rasgos' },
  { id: 'minion', label: 'Minion' },
  { id: 'charge', label: 'Carga' },
  { id: 'description', label: 'Descripción' },
];

const DEFAULT_CARD_CONTAINERS_BY_TYPE = {
  weapon: ['range', 'consumption', 'damage', 'traits', 'description', 'charge'],
  armor: ['consumption', 'traits', 'description', 'charge'],
  trap: ['range', 'consumption', 'traits', 'description', 'charge'],
  action: ['consumption', 'damage', 'description', 'charge'],
  skill: ['range', 'damage', 'traits', 'minion', 'description', 'charge'],
  status: ['description', 'charge'],
};

const MAX_CARD_CONTAINERS = 6;
const MAX_TRAITS_PER_CONTAINER = 3;
const SINGLE_INSTANCE_CARD_CONTAINERS = new Set(['range', 'minion', 'charge']);

const createCardContainer = (id) => ({
  id,
  key: `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
});

const normalizeCardContainer = (container, fallbackIndex = 0) => {
  if (typeof container === 'string') {
    return { id: container, key: `${container}-legacy-${fallbackIndex}` };
  }
  return {
    id: container?.id || 'description',
    key: container?.key || `${container?.id || 'description'}-legacy-${fallbackIndex}`,
  };
};

const getContainerId = (container, fallbackIndex = 0) => normalizeCardContainer(container, fallbackIndex).id;
const getContainerKey = (container, fallbackIndex = 0) => normalizeCardContainer(container, fallbackIndex).key;

const getDefaultCardContainers = (typeId) => (
  DEFAULT_CARD_CONTAINERS_BY_TYPE[typeId] || DEFAULT_CARD_CONTAINERS_BY_TYPE.weapon
).map((id) => createCardContainer(id));

const DESCRIPTION_SPACE_UNITS = [1, 2, 3, 4, 5, 6];
const MODULAR_DESCRIPTION_UNIT_HEIGHT = 240;

export const ELEMENT_TYPES = [
  { id: 'Ninguno', label: 'Ninguno' },
  { id: 'Agua', label: 'Agua' },
  { id: 'Fuego', label: 'Fuego' },
  { id: 'Hielo', label: 'Hielo' },
  { id: 'Luz', label: 'Luz' },
  { id: 'Oscuridad', label: 'Oscuridad' },
  { id: 'Rayo', label: 'Rayo' },
  { id: 'Tierra', label: 'Tierra' },
  { id: 'Veneno', label: 'Veneno' },
  { id: 'Viento', label: 'Viento' }
];

const HEADER_ICON_SOURCES = {
  Agua: '/cabecera/agua.webp',
  Fuego: '/cabecera/fuego.webp',
  Hielo: '/cabecera/hielo.webp',
  Luz: '/cabecera/luz.webp',
  Oscuridad: '/cabecera/oscuridad.webp',
  Rayo: '/cabecera/rayo.webp',
  Tierra: '/cabecera/tierra.webp',
  Veneno: '/cabecera/veneno.webp',
  Viento: '/cabecera/viento.webp',
};

const ELEMENT_CONSUMPTION_ICON_SOURCES = {
  Agua: '/elementos_new/agua.webp',
  Fuego: '/elementos_new/fuego.webp',
  Hielo: '/elementos_new/hielo.webp',
  Luz: '/elementos_new/luz.webp',
  Oscuridad: '/elementos_new/oscuridad.webp',
  Rayo: '/elementos_new/rayo.webp',
  Tierra: '/elementos_new/tierra.webp',
  Veneno: '/elementos_new/veneno.webp',
  Viento: '/elementos_new/viento.webp',
};

const ELEMENT_CONSUMPTION_STYLES = {
  Agua: { stroke: '#3f7f9f', fill: 'rgba(63,127,159,0.15)' },
  Fuego: { stroke: '#c46f1f', fill: 'rgba(196,111,31,0.15)' },
  Hielo: { stroke: '#79a6b5', fill: 'rgba(121,166,181,0.16)' },
  Luz: { stroke: '#b99a55', fill: 'rgba(185,154,85,0.15)' },
  Oscuridad: { stroke: '#5f5873', fill: 'rgba(95,88,115,0.16)' },
  Rayo: { stroke: '#b1832f', fill: 'rgba(177,131,47,0.15)' },
  Tierra: { stroke: '#827044', fill: 'rgba(130,112,68,0.15)' },
  Veneno: { stroke: '#668f4f', fill: 'rgba(102,143,79,0.15)' },
  Viento: { stroke: '#6d958a', fill: 'rgba(109,149,138,0.15)' },
};

const DESCRIPTION_ICON_STYLES = {
  Tiempo: { stroke: '#c46f1f', fill: 'rgba(196,111,31,0.14)' },
  Mente: { stroke: '#2f6fb3', fill: 'rgba(47,111,179,0.14)' },
  Cuerpo: { stroke: '#a93832', fill: 'rgba(169,56,50,0.14)' },
  Hambre: { stroke: '#3d7d45', fill: 'rgba(61,125,69,0.14)' },
  Recurso: { stroke: '#6f716c', fill: 'rgba(111,113,108,0.14)' },
  Armadura: { stroke: '#60798f', fill: 'rgba(96,121,143,0.15)' },
  ...ELEMENT_CONSUMPTION_STYLES,
};

const ACCENT_PRESET_COLORS = [
  { id: 'default', label: 'Base', value: '#c46f1f' },
  { id: 'gold', label: 'Dorado', value: '#c8aa6e' },
  { id: 'red', label: 'Rojo', value: '#ad5134' },
  { id: 'green', label: 'Verde', value: '#73824f' },
  { id: 'blue', label: 'Azul', value: '#52758a' },
  { id: 'purple', label: 'Morado', value: '#765d86' },
  { id: 'bone', label: 'Hueso', value: '#d8d0bd' },
  { id: 'ashen', label: 'Ceniza', value: '#747168' },
];

const DEFAULT_TRAITS = ['-', '-', '-', '-', '-', '-', '-', '-'];
const MINION_ATTRIBUTE_TYPES = ['Hambre', 'Cuerpo', 'Mente'];
const DEFAULT_MINION_ATTRIBUTES = {
  Hambre: 1,
  Cuerpo: 1,
  Mente: 1,
};

const CHARGE_TYPES = [
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/consumo_new/Hambre.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/consumo_new/Cuerpo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/consumo_new/Mente.webp' },
];

const CONSUMPTION_TYPES = [
  { id: 'Tiempo', label: 'Tiempo', src: '/interfaz/consumo_new/Tiempo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/consumo_new/Mente.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/consumo_new/Cuerpo.webp' },
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/consumo_new/Hambre.webp' },
  { id: 'Armadura_1', label: 'Armadura', src: '/interfaz/consumo_new/Armadura.png' },
  { id: 'Recurso', label: 'Recurso', src: '/interfaz/consumo_new/Recurso.webp' },
  { id: 'Variable', label: 'Variable', src: '/interfaz/consumos/Variable.webp' },
];

const RESOURCE_SLOT_COUNT = 4;
const CHARGE_SLOT_COUNT = 5;
const DEFAULT_CHARGE_SLOTS = Array.from({ length: CHARGE_SLOT_COUNT }, () => EMPTY_SLOT);
const DEFAULT_CONSUMPTION_SLOTS = ['Tiempo', EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
const MAX_DAMAGE_DICE_QTY = 7;
const DEFAULT_CONTAINER_DAMAGE = { diceType: 'D6', diceQty: 1 };
const DEFAULT_CONTAINER_CONSUMPTION_TYPES = Array.from({ length: RESOURCE_SLOT_COUNT }, () => 'consumption');
const createDefaultContainerConsumption = () => ({
  slots: [...DEFAULT_CONSUMPTION_SLOTS],
  slotTypes: [...DEFAULT_CONTAINER_CONSUMPTION_TYPES],
});
const RESOURCE_MODE_BOTH = 'charge-consumption';
const RESOURCE_MODE_CHARGE_ONLY = 'charge-only';
const RESOURCE_MODE_CONSUMPTION_ONLY = 'consumption-only';
const RESOURCE_MODE_NONE = 'none';
const RESOURCE_CARD_TYPES = new Set(['weapon', 'armor', 'trap', 'skill']);
const COLLECTION_ACCESS_EDIT = 'edit';
const COLLECTION_ACCESS_HIDDEN = 'hidden';

export const WEAPON_TYPES = [
  'Cuerpo a cuerpo',
  'Distancia',
  'Magia'
];

const WEAPON_TYPE_ALIASES = [
  {
    type: 'Cuerpo a cuerpo',
    aliases: ['cuerpo a cuerpo', 'cuerpo', 'melee', 'espada', 'daga', 'clava', 'hacha', 'lanza', 'martillo', 'maza'],
  },
  {
    type: 'Distancia',
    aliases: ['distancia', 'rango', 'arco', 'ballesta', 'escopeta', 'fusil', 'rifle', 'pistola', 'revolver', 'revólver', 'ametralladora'],
  },
  {
    type: 'Magia',
    aliases: ['magia', 'magico', 'mágico', 'conjuro', 'hechizo', 'arcano'],
  },
];

const getWeaponTypeIconSrc = (weaponType) => (
  `${process.env.PUBLIC_URL || ''}/tipo/${encodeURIComponent(weaponType)}.webp`
);

const getPreviewRenderScale = () => {
  if (typeof window === 'undefined') return 1;
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const isNarrowViewport = window.matchMedia?.('(max-width: 820px)').matches;
  const deviceMemory = Number(window.navigator?.deviceMemory || 0);
  const isLowMemoryDevice = deviceMemory > 0 && deviceMemory <= 4;
  return isCoarsePointer || isNarrowViewport || isLowMemoryDevice ? MOBILE_PREVIEW_RENDER_SCALE : 1;
};

const drawDiceIcon = (context, x, y, size, imgElement, qty, showQty = true) => {
  if (!imgElement) return;
  context.save();
  
  // 1. Draw the preloaded dice image centered at x, y
  context.drawImage(imgElement, x - size/2, y - size/2, size, size);
  
  if (showQty) {
    // 2. Draw the quantity number to the right (e.g. "1")
    const qtyX = x + size/2 + 24;
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#000000';
    context.lineWidth = 38; // Trazo negro más grueso para mayor contraste
    context.lineJoin = 'round';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.font = '900 130px Lato, Arial, sans-serif';
    context.strokeText(qty.toString(), qtyX, y + 4);
    context.fillText(qty.toString(), qtyX, y + 4);
  }
  
  context.restore();
};

const drawRuler = (context, x, y, width, selectedIndex, labelY = y + 120) => {
  context.save();
  if ('letterSpacing' in context) {
    context.letterSpacing = '0px';
  }
  if ('fontKerning' in context) {
    context.fontKerning = 'normal';
  }
  
  const tickNames = ['TOQUE', 'CERCANO', 'INTERMEDIO', 'LEJANO', 'EXTREMO'];
  const startX = x - width / 2;
  const step = width / 4;
  
  // 1. Draw horizontal ruler line outline (black)
  // Shifted inward by 15px so that the rounded ends are completely inside the leftmost and rightmost vertical ticks
  context.strokeStyle = '#000000';
  context.lineWidth = 56; // Trazo negro más grueso para la regla
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX + 15, y);
  context.lineTo(startX + width - 15, y);
  context.stroke();
  
  // 2. Draw all non-selected (white) ticks' outlines (black)
  context.strokeStyle = '#000000';
  context.lineWidth = 48; // Trazo negro más grueso para las marcas normales
  context.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    if (i !== selectedIndex) {
      const tickX = startX + i * step;
      context.beginPath();
      context.moveTo(tickX, y - 36); // Altura consistente, igual a la seleccionada
      context.lineTo(tickX, y + 36);
      context.stroke();
    }
  }
  
  // 3. Draw horizontal inner white line, erasing vertical black borders inside the main bar
  context.strokeStyle = '#ffffff';
  context.lineWidth = 20; // Espesor de la línea blanca interna
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX + 15, y);
  context.lineTo(startX + width - 15, y);
  context.stroke();
  
  // 4. Draw non-selected (white) ticks' inner white lines, merging seamlessly
  context.strokeStyle = '#ffffff';
  context.lineWidth = 22; // Espesor consistente de la línea blanca interna
  context.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    if (i !== selectedIndex) {
      const tickX = startX + i * step;
      context.beginPath();
      context.moveTo(tickX, y - 36);
      context.lineTo(tickX, y + 36);
      context.stroke();
    }
  }
  
  // 5. Draw selected (red) tick completely on top, preserving its full outline
  if (selectedIndex >= 0 && selectedIndex < 5) {
    const selectedTickX = startX + selectedIndex * step;
    
    // Outline
    context.strokeStyle = '#000000';
    context.lineWidth = 58; // Trazo negro más grueso para la marca seleccionada
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(selectedTickX, y - 36);
    context.lineTo(selectedTickX, y + 36);
    context.stroke();
    
    // Inner red line
    context.strokeStyle = '#e51c23';
    context.lineWidth = 26;
    context.beginPath();
    context.moveTo(selectedTickX, y - 36);
    context.lineTo(selectedTickX, y + 36);
    context.stroke();
  }
  
  // 6. Draw the active range text centered below the ruler
  const labelText = tickNames[selectedIndex] || 'TOQUE';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#000000';
  context.lineWidth = 24; // Trazo negro más grueso para el texto del rango
  context.lineJoin = 'round';
  context.font = '900 82px Lato, Arial, sans-serif'; // Scaled up font from 68px to 82px
  context.strokeText(labelText, x, labelY);
  context.fillText(labelText, x, labelY);
  
  context.restore();
};

const drawWeaponTypeIcon = (context, x, y, size, imgElement) => {
  if (!imgElement) return;
  context.save();
  // Draw the image centered at x, y
  context.drawImage(imgElement, x - size/2, y - size/2, size, size);
  context.restore();
};

const getActionDicePositions = (qty) => {
  const centerY = 1410;
  
  if (qty === 1) {
    return [{ x: CANVAS_WIDTH / 2, y: centerY, size: 540 }];
  }
  if (qty === 2) {
    const colGap = 540;
    return [
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY, size: 460 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY, size: 460 },
    ];
  }
  if (qty === 3) {
    const colGap = 540;
    const rowGap = 440; // Spaced vertically to prevent merging
    return [
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY - rowGap / 2, size: 400 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY - rowGap / 2, size: 400 },
      { x: CANVAS_WIDTH / 2, y: centerY + rowGap / 2, size: 400 },
    ];
  }
  if (qty === 4) {
    const colGap = 520;
    const rowGap = 460;
    return [
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY - rowGap / 2, size: 380 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY - rowGap / 2, size: 380 },
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY + rowGap / 2, size: 380 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY + rowGap / 2, size: 380 },
    ];
  }
  if (qty === 5) {
    const colGap = 520;
    const rowGap = 400;
    return [
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY - rowGap, size: 340 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY - rowGap, size: 340 },
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY, size: 340 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY, size: 340 },
      { x: CANVAS_WIDTH / 2, y: centerY + rowGap, size: 340 },
    ];
  }
  if (qty === 6) {
    const colGap = 520;
    const rowGap = 400;
    return [
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY - rowGap, size: 340 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY - rowGap, size: 340 },
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY, size: 340 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY, size: 340 },
      { x: CANVAS_WIDTH / 2 - colGap / 2, y: centerY + rowGap, size: 340 },
      { x: CANVAS_WIDTH / 2 + colGap / 2, y: centerY + rowGap, size: 340 },
    ];
  }
  return [];
};

const drawActionConsumptionRail = (context, consumptionSlots, resourceImages) => {
  const y = 2356;
  const height = 156;
  const slotSize = 122;
  const circleSize = 108; // Rediseñado a 108px para separación y proporción estéticas de los círculos
  const slotGap = 8;
  const slotCount = consumptionSlots.length;
  const slotsWidth = slotSize * slotCount + slotGap * (slotCount - 1);
  const railPadding = 138; // Margen exacto para las esquinas biseladas del riel centrado
  const railWidth = Math.max(780, slotsWidth + railPadding);
  const railX = (CANVAS_WIDTH - railWidth) / 2; // Centered
  const startX = railX + (railWidth - slotsWidth) / 2 + slotSize / 2;

  drawRailBase(context, railX, y, railWidth, height, 'center');

  const displayConsumptionSlots = [...consumptionSlots].reverse();

  displayConsumptionSlots.forEach((slot, index) => {
    const x = startX + index * (slotSize + slotGap);
    const slotY = y + height / 2;
    drawEmptyCircleSlot(context, x, slotY, circleSize);
    drawSlotIcon(context, resourceImages[`consumption:${slot}`], x, slotY, circleSize, 'circle');
  });
};

const createRailPath = (context, x, y, width, height, side = 'left') => {
  const bevel = 82;
  const cornerRadius = 16; // Mismo radio de redondeo que el slot de rombo para unificar la estética
  context.beginPath();
  if (side === 'left') {
    // Extremo izquierdo recto, extremo derecho en pico con punta sutilmente redondeada
    context.moveTo(x, y);
    context.lineTo(x + width - bevel, y);
    context.arcTo(x + width, y + height / 2, x + width - bevel, y + height, cornerRadius);
    context.lineTo(x + width - bevel, y + height);
    context.lineTo(x, y + height);
  } else if (side === 'right') {
    // Extremo izquierdo en pico con punta sutilmente redondeada, extremo derecho recto
    context.moveTo(x + width, y);
    context.lineTo(x + bevel, y);
    context.arcTo(x, y + height / 2, x + bevel, y + height, cornerRadius);
    context.lineTo(x + bevel, y + height);
    context.lineTo(x + width, y + height);
  } else if (side === 'center') {
    // Ambos extremos en pico con puntas redondeadas
    context.moveTo(x + bevel, y);
    context.lineTo(x + width - bevel, y);
    context.arcTo(x + width, y + height / 2, x + width - bevel, y + height, cornerRadius);
    context.lineTo(x + width - bevel, y + height);
    context.lineTo(x + bevel, y + height);
    context.arcTo(x, y + height / 2, x + bevel, y, cornerRadius);
    context.lineTo(x + bevel, y);
  }
  context.closePath();
};

const drawPlateGrain = (context, x, y, width, height, seed = 1, count = 38) => {
  context.save();
  context.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const t = i + seed * 17;
    const px = x + ((Math.sin(t * 12.9898) + 1) / 2) * width;
    const py = y + ((Math.sin(t * 78.233) + 1) / 2) * height;
    const lineWidth = 18 + ((Math.sin(t * 37.719) + 1) / 2) * 62;
    const alpha = 0.018 + ((Math.sin(t * 19.19) + 1) / 2) * 0.035;
    context.strokeStyle = `rgba(255,255,255,${alpha})`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(px - lineWidth / 2, py);
    context.lineTo(px + lineWidth / 2, py + Math.sin(t) * 5);
    context.stroke();
  }
  context.restore();
};

const strokeRailOutline = (context, x, y, width, height, side) => {
  const bevel = 82;
  const cornerRadius = 16; // Mismo radio de redondeo que el slot de rombo
  context.beginPath();
  if (side === 'left') {
    // Carga: El trazo va por arriba y el pico redondeado (no por abajo ni por la izquierda plana)
    context.moveTo(x, y);
    context.lineTo(x + width - bevel, y);
    context.arcTo(x + width, y + height / 2, x + width - bevel, y + height, cornerRadius);
    context.lineTo(x + width - bevel, y + height);
  } else if (side === 'right') {
    // Consumo: El trazo va por arriba y el pico redondeado (no por abajo ni por la derecha plana)
    context.moveTo(x + width, y);
    context.lineTo(x + bevel, y);
    context.arcTo(x, y + height / 2, x + bevel, y + height, cornerRadius);
    context.lineTo(x + bevel, y + height);
  } else {
    // Riel centrado (Acción): Trazamos todo el contorno bebelado redondeado
    createRailPath(context, x, y, width, height, 'center');
  }
};

const drawRailBase = (context, x, y, width, height, side) => {
  context.save();

  createRailPath(context, x, y, width, height, side);
  context.shadowColor = 'rgba(0,0,0,0.82)';
  context.shadowBlur = 18;

  const gradient = context.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, 'rgba(10,10,12,0.72)');
  gradient.addColorStop(0.48, 'rgba(0,0,0,0.96)');
  gradient.addColorStop(1, 'rgba(10,10,12,0.82)');
  context.fillStyle = gradient;
  context.fill();

  context.save();
  createRailPath(context, x, y, width, height, side);
  context.clip();
  drawPlateGrain(context, x, y, width, height, side === 'right' ? 9 : side === 'center' ? 5 : 3, 44);
  context.restore();

  // Creamos la ruta de trazo personalizada para evitar líneas blancas en la base y lados exteriores
  strokeRailOutline(context, x, y, width, height, side);
  
  // 1. Trazado del glow blanco difuminado para iluminar las líneas no fusionadas
  context.save();
  context.shadowColor = 'rgba(255, 255, 255, 0.48)';
  context.shadowBlur = 24;
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  context.stroke();
  context.restore();

  // 2. Trazado del núcleo plateado brillante para gran contraste físico
  context.save();
  context.shadowBlur = 0;
  context.lineWidth = 2.5;
  context.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  context.stroke();
  context.restore();

  context.restore();
};

const drawDiamondSlotPath = (context, x, y, size) => {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 4); // Rotación de 45 grados
  const s = size / Math.sqrt(2); // Lado del cuadrado para que la diagonal sea 'size'
  const radius = 16; // Radio de redondeo para emparejar la estética del WebP
  
  context.beginPath();
  context.moveTo(-s / 2 + radius, -s / 2);
  context.lineTo(s / 2 - radius, -s / 2);
  context.quadraticCurveTo(s / 2, -s / 2, s / 2, -s / 2 + radius);
  context.lineTo(s / 2, s / 2 - radius);
  context.quadraticCurveTo(s / 2, s / 2, s / 2 - radius, s / 2);
  context.lineTo(-s / 2 + radius, s / 2);
  context.quadraticCurveTo(-s / 2, s / 2, -s / 2, s / 2 - radius);
  context.lineTo(-s / 2, -s / 2 + radius);
  context.quadraticCurveTo(-s / 2, -s / 2, -s / 2 + radius, -s / 2);
  context.closePath();
  context.restore();
};

const drawEmptyDiamondSlot = (context, x, y, size) => {
  context.save();
  drawDiamondSlotPath(context, x, y, size);
  
  // Sunken metallic/charcoal socket gradient for rich physical depth
  const gradient = context.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
  gradient.addColorStop(0, '#101012');
  gradient.addColorStop(0.5, '#202024');
  gradient.addColorStop(1, '#0c0c0e');
  context.fillStyle = gradient;
  context.fill();
  
  // Subtle chiseled inner white outline
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.stroke();
  
  context.restore();
};

const drawEmptyCircleSlot = (context, x, y, size) => {
  context.save();
  const radius = size / 2;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  
  // Sunken metallic/charcoal socket linear gradient for rich physical depth matching the diamond
  const gradient = context.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
  gradient.addColorStop(0, '#101012');
  gradient.addColorStop(0.5, '#202024');
  gradient.addColorStop(1, '#0c0c0e');
  context.fillStyle = gradient;
  context.fill();
  
  // Subtle chiseled inner white outline matching the diamond
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.stroke();
  
  context.restore();
};

const drawBlackIcon = (context, iconImage, x, y, size) => {
  if (!iconImage) return;
  context.save();
  try {
    const buffer = document.createElement('canvas');
    buffer.width = size;
    buffer.height = size;
    const bufferCtx = buffer.getContext('2d');
    if (bufferCtx) {
      bufferCtx.drawImage(iconImage, 0, 0, size, size);
      bufferCtx.globalCompositeOperation = 'source-in';
      bufferCtx.fillStyle = '#000000';
      bufferCtx.fillRect(0, 0, size, size);
      context.drawImage(buffer, x - size / 2, y - size / 2);
    } else {
      context.drawImage(iconImage, x - size / 2, y - size / 2, size, size);
    }
  } catch (e) {
    context.drawImage(iconImage, x - size / 2, y - size / 2, size, size);
  }
  context.restore();
};

const drawSlotIcon = (context, iconImage, x, y, size, shape, forceBlack = false) => {
  if (!iconImage) return;
  context.save();
  // Dibujamos el icono completo a 0.98 del tamaño para lucir su propio contorno nativo sin recortes ni bordes superpuestos
  const iconSize = size * 0.98;
  if (forceBlack) {
    drawBlackIcon(context, iconImage, x, y, iconSize);
  } else {
    context.drawImage(iconImage, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
  }
  context.restore();
};

const VISIBLE_IMAGE_BOUNDS_CACHE = new WeakMap();

const getVisibleImageBounds = (image) => {
  if (!image) return null;
  const imageWidth = image.naturalWidth || image.width || 0;
  const imageHeight = image.naturalHeight || image.height || 0;
  if (!imageWidth || !imageHeight) return null;
  if (VISIBLE_IMAGE_BOUNDS_CACHE.has(image)) {
    return VISIBLE_IMAGE_BOUNDS_CACHE.get(image);
  }

  const fallbackBounds = { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight };
  if (typeof document === 'undefined') return fallbackBounds;

  try {
    const buffer = document.createElement('canvas');
    buffer.width = imageWidth;
    buffer.height = imageHeight;
    const bufferContext = buffer.getContext('2d', { willReadFrequently: true });
    bufferContext.drawImage(image, 0, 0);
    const pixels = bufferContext.getImageData(0, 0, imageWidth, imageHeight).data;
    let minX = imageWidth;
    let minY = imageHeight;
    let maxX = -1;
    let maxY = -1;

    for (let py = 0; py < imageHeight; py += 1) {
      for (let px = 0; px < imageWidth; px += 1) {
        const alpha = pixels[(py * imageWidth + px) * 4 + 3];
        if (alpha > 10) {
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      VISIBLE_IMAGE_BOUNDS_CACHE.set(image, fallbackBounds);
      return fallbackBounds;
    }

    const padding = 2;
    const bounds = {
      sx: Math.max(0, minX - padding),
      sy: Math.max(0, minY - padding),
      sw: Math.min(imageWidth, maxX + padding + 1) - Math.max(0, minX - padding),
      sh: Math.min(imageHeight, maxY + padding + 1) - Math.max(0, minY - padding),
    };
    VISIBLE_IMAGE_BOUNDS_CACHE.set(image, bounds);
    return bounds;
  } catch (error) {
    VISIBLE_IMAGE_BOUNDS_CACHE.set(image, fallbackBounds);
    return fallbackBounds;
  }
};

const drawWeaponResourceRails = (context, chargeSlots, consumptionSlots, resourceImages) => {
  const y = 2356;
  const height = 156;
  const slotSize = 122;
  const circleSize = 108;
  const slotGap = 8;
  const railWidth = 720; // Longitud unificada y simétrica de 720px para ambos letreros
  const chargeRail = { x: 127, y, width: railWidth, height };
  const consumptionRail = { x: 1761 - railWidth, y, width: railWidth, height };
  
  const chargeStartX = chargeRail.x + 81; // 20px de margen + slotSize/2
  const consumptionStartX = consumptionRail.x + consumptionRail.width - 81;

  drawRailBase(context, chargeRail.x, chargeRail.y, chargeRail.width, chargeRail.height, 'left');
  drawRailBase(context, consumptionRail.x, consumptionRail.y, consumptionRail.width, consumptionRail.height, 'right');

  chargeSlots.forEach((slot, index) => {
    const x = chargeStartX + index * (slotSize + slotGap);
    const slotY = chargeRail.y + chargeRail.height / 2;
    drawEmptyDiamondSlot(context, x, slotY, slotSize);
    drawSlotIcon(context, resourceImages[`charge:${slot}`], x, slotY, slotSize, 'diamond', true);
  });

  const displayConsumptionSlots = [...consumptionSlots].reverse();

  displayConsumptionSlots.forEach((slot, index) => {
    const x = consumptionStartX - (4 - index) * (slotSize + slotGap);
    const slotY = consumptionRail.y + consumptionRail.height / 2;
    drawEmptyCircleSlot(context, x, slotY, circleSize);
    drawSlotIcon(context, resourceImages[`consumption:${slot}`], x, slotY, circleSize, 'circle');
  });
};

const drawCenteredChargeRail = (context, chargeSlots, resourceImages) => {
  const y = 2356;
  const height = 156;
  const slotSize = 122;
  const slotGap = 8;
  const railWidth = 780;
  const railX = (CANVAS_WIDTH - railWidth) / 2;
  const slotY = y + height / 2;
  const totalSlotsWidth = chargeSlots.length * slotSize + (chargeSlots.length - 1) * slotGap;
  const chargeStartX = railX + (railWidth - totalSlotsWidth) / 2 + slotSize / 2;

  drawRailBase(context, railX, y, railWidth, height, 'center');

  chargeSlots.forEach((slot, index) => {
    const x = chargeStartX + index * (slotSize + slotGap);
    drawEmptyDiamondSlot(context, x, slotY, slotSize);
    drawSlotIcon(context, resourceImages[`charge:${slot}`], x, slotY, slotSize, 'diamond', true);
  });
};

const normalizeCardName = (value) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CARD_NAME;
};

const TITLE_HEADER_CENTER_X = CANVAS_WIDTH / 2;
const TITLE_HEADER_CENTER_Y = 272;
const TITLE_HEADER_MAX_WIDTH = CANVAS_WIDTH * 0.85;

const measureSpacedText = (context, text, letterSpacing) => {
  return Array.from(text).reduce((total, char, index, chars) => {
    const charWidth = context.measureText(char).width;
    return total + charWidth + (index < chars.length - 1 ? letterSpacing : 0);
  }, 0);
};

const fitTitleFont = (context, title) => {
  let size = 125;
  let letterSpacing = Math.round(size * 0.1);

  context.save();
  while (size > 38) {
    letterSpacing = Math.round(size * 0.1);
    context.font = `900 ${size}px Cinzel, Georgia, serif`;
    if ('letterSpacing' in context) {
      context.letterSpacing = '0px';
    }
    const measuredWidth = measureSpacedText(context, title, letterSpacing);
    if (measuredWidth <= TITLE_HEADER_MAX_WIDTH) break;
    size -= 2;
  }
  context.restore();

  return { size, letterSpacing };
};

const drawCenteredSpacedText = (context, text, centerX, centerY, letterSpacing) => {
  const chars = Array.from(text);
  const totalWidth = measureSpacedText(context, text, letterSpacing);
  let cursorX = centerX - totalWidth / 2;

  chars.forEach((char, index) => {
    const charWidth = context.measureText(char).width;
    context.fillText(char, cursorX + charWidth / 2, centerY);
    cursorX += charWidth + (index < chars.length - 1 ? letterSpacing : 0);
  });
};

const getTraitSlots = (layout) => {
  if (layout === 'armor') {
    return [592, 822, 1052, 1282].flatMap((y) => [
      { x: 240, y, width: 620, height: 175 },
      { x: 1028, y, width: 620, height: 175 },
    ]);
  }

  if (layout === 'trap') {
    return [{ x: 574, y: 508, width: 740, height: 185 }];
  }

  if (layout === 'weapon') {
    return [807, 1047, 1287].flatMap((y) => [
      { x: 225, y, width: 650, height: 175 },
      { x: 1013, y, width: 650, height: 175 },
    ]);
  }

  return [];
};

const fitTraitFont = (context, text, maxWidth, maxFontSize = 60) => {
  let size = maxFontSize;
  while (size > 34) {
    context.font = `900 ${size}px Lato, Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 3;
  }
  return size;
};

const drawTraitBadge = (context, slot, label) => {
  const { x, y, width, height } = slot;
  const bevel = Math.min(92, width * 0.17);
  const radius = 28;
  const text = label.trim().toUpperCase();

  context.save();

  const traceBadgePath = (grow = 0) => {
    const gx = x - grow;
    const gy = y - grow * 0.65;
    const gw = width + grow * 2;
    const gh = height + grow * 1.3;
    const gBevel = bevel + grow * 0.55;
    const gRadius = radius + grow * 0.2;

    context.beginPath();
    context.moveTo(gx + gBevel + gRadius, gy);
    context.lineTo(gx + gw - gBevel - gRadius, gy);
    context.quadraticCurveTo(gx + gw - gBevel, gy, gx + gw - gBevel + gRadius * 0.35, gy + gRadius * 0.35);
    context.lineTo(gx + gw, gy + gh / 2);
    context.lineTo(gx + gw - gBevel + gRadius * 0.35, gy + gh - gRadius * 0.35);
    context.quadraticCurveTo(gx + gw - gBevel, gy + gh, gx + gw - gBevel - gRadius, gy + gh);
    context.lineTo(gx + gBevel + gRadius, gy + gh);
    context.quadraticCurveTo(gx + gBevel, gy + gh, gx + gBevel - gRadius * 0.35, gy + gh - gRadius * 0.35);
    context.lineTo(gx, gy + gh / 2);
    context.lineTo(gx + gBevel - gRadius * 0.35, gy + gRadius * 0.35);
    context.quadraticCurveTo(gx + gBevel, gy, gx + gBevel + gRadius, gy);
    context.closePath();
  };

  traceBadgePath(18);
  context.shadowColor = 'rgba(255,255,255,0.24)';
  context.shadowBlur = 30;
  context.fillStyle = 'rgba(255,255,255,0.045)';
  context.fill();

  traceBadgePath();
  context.shadowColor = 'rgba(0,0,0,0.75)';
  context.shadowBlur = 14;
  const fillGradient = context.createLinearGradient(x, y, x, y + height);
  fillGradient.addColorStop(0, 'rgba(10,10,12,0.76)');
  fillGradient.addColorStop(0.45, 'rgba(0,0,0,0.98)');
  fillGradient.addColorStop(1, 'rgba(12,12,14,0.84)');
  context.fillStyle = fillGradient;
  context.fill();

  context.save();
  traceBadgePath();
  context.clip();
  drawPlateGrain(context, x, y, width, height, Math.round((x + y) / 31), 32);
  context.restore();

  context.shadowBlur = 0;
  traceBadgePath();
  context.save();
  context.shadowColor = 'rgba(255, 255, 255, 0.48)';
  context.shadowBlur = 24;
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  context.stroke();
  context.restore();

  traceBadgePath();
  context.save();
  context.shadowBlur = 0;
  context.lineWidth = 2.5;
  context.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  context.stroke();
  context.restore();

  if (text) {
    context.fillStyle = 'rgba(255,255,255,0.96)';
    context.shadowColor = 'rgba(255,255,255,0.28)';
    context.shadowBlur = 10;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    if ('letterSpacing' in context) context.letterSpacing = '2px';
    const maxFontSize = height > 180 ? 78 : 60;
    context.font = `900 ${fitTraitFont(context, text, width - bevel * 1.22, maxFontSize)}px Lato, Arial, sans-serif`;
    context.fillText(text, x + width / 2, y + height / 2 + 2);
  }

  context.restore();
};

const usesSplitDescription = (typeConfig, showTraits) => false;

const getDynamicStartingLayout = (layout, text, isPrimary) => {
  return layout;
};

const getDescriptionLayouts = (typeConfig, showTraits, singleTextStyle = 'narrative', visibleTraitRows = 3) => {
  if (typeConfig.id === 'action') return {};

  const hasRails = typeConfig.id === 'weapon' || typeConfig.id === 'armor' || typeConfig.id === 'trap' || typeConfig.id === 'skill';

  // Base coordinates for single layout
  let y = 1545;
  let height = hasRails ? 740 : 895;

  let yOffset = 0;
  if (showTraits) {
    if (typeConfig.id === 'weapon') {
      const activeRows = Math.min(visibleTraitRows, 3);
      const hiddenRows = 3 - activeRows;
      yOffset = hiddenRows * 240;
    } else if (typeConfig.id === 'skill') {
      const activeRows = Math.min(visibleTraitRows, 2);
      const hiddenRows = 2 - activeRows;
      yOffset = hiddenRows * 240;
    } else if (typeConfig.id === 'armor') {
      const activeRows = Math.min(visibleTraitRows, 4);
      const hiddenRows = 4 - activeRows;
      yOffset = hiddenRows * 230;
    }
  }

  y -= yOffset;
  height += yOffset;

  // Apply combined layouts for cases that previously used split descriptions (when traits are hidden)
  if (!showTraits) {
    if (typeConfig.id === 'weapon') {
      y = 815;
      height = 1465;
    } else if (typeConfig.id === 'armor') {
      y = 508;
      height = 1772;
    } else if (typeConfig.id === 'skill') {
      y = 1047;
      height = 1233;
    }
  }

  // Trap cards can use the top badge area only when the badge is hidden.
  if (typeConfig.id === 'trap') {
    if (showTraits) {
      y = 815;
      height = 1465;
    } else {
      y = 508;
      height = 1772;
    }
  }

  return {
    flavor: {
      x: 210,
      y: y,
      width: 1470,
      height: height,
      fontSize: 85,
      lineHeight: 104,
      italic: singleTextStyle === 'narrative',
      weight: 400,
      family: "Georgia, serif",
    },
  };
};

const getSyllables = (word) => {
  if (word.length <= 1) return [word];

  const vowels = "aeiouáéíóúüAEIOUÁÉÍÓÚÜ";
  const isVowel = (c) => vowels.includes(c);

  const chars = Array.from(word);
  const syllables = [];
  const splits = new Set();

  const isStrong = (c) => "aeoáéíóAEOÁÉÍÓ".includes(c);
  const isWeak = (c) => "iuüíúIUÜÍÚ".includes(c);
  const isAccentedWeak = (c) => "íúÍÚ".includes(c);

  const isDiphthong = (v1, v2) => {
    if (v1.toLowerCase() === v2.toLowerCase()) return false;
    if (isStrong(v1) && isStrong(v2)) return false;
    if (isAccentedWeak(v1) || isAccentedWeak(v2)) return false;
    return true;
  };

  const isTriphthong = (v1, v2, v3) => {
    return isWeak(v1) && !isAccentedWeak(v1) &&
           isStrong(v2) &&
           isWeak(v3) && !isAccentedWeak(v3);
  };

  const isCluster = (c1, c2) => {
    const l1 = c1.toLowerCase();
    const l2 = c2.toLowerCase();
    if (l1 === 'c' && l2 === 'h') return true;
    if (l1 === 'l' && l2 === 'l') return true;
    if (l1 === 'r' && l2 === 'r') return true;
    if ('bcfgp'.includes(l1) && l2 === 'l') return true;
    if ('bcdfgpt'.includes(l1) && l2 === 'r') return true;
    return false;
  };

  let i = 0;
  while (i < word.length) {
    if (!isVowel(chars[i])) {
      i++;
      continue;
    }

    let j = i;
    while (j < word.length && isVowel(chars[j])) {
      j++;
    }
    const vowelCount = j - i;

    if (vowelCount === 2) {
      if (!isDiphthong(chars[i], chars[i+1])) {
        splits.add(i);
      }
    } else if (vowelCount === 3) {
      if (!isTriphthong(chars[i], chars[i+1], chars[i+2])) {
        if (isDiphthong(chars[i], chars[i+1])) {
          splits.add(i+1);
        } else if (isDiphthong(chars[i+1], chars[i+2])) {
          splits.add(i);
        } else {
          splits.add(i);
          splits.add(i+1);
        }
      }
    } else if (vowelCount > 3) {
      for (let k = i; k < j - 1; k++) {
        splits.add(k);
      }
    }

    let nextVowelIndex = j;
    while (nextVowelIndex < word.length && !isVowel(chars[nextVowelIndex])) {
      nextVowelIndex++;
    }

    if (nextVowelIndex === word.length) {
      break;
    }

    const consCount = nextVowelIndex - j;

    if (consCount === 1) {
      splits.add(j - 1);
    } else if (consCount === 2) {
      if (isCluster(chars[j], chars[j+1])) {
        splits.add(j - 1);
      } else {
        splits.add(j);
      }
    } else if (consCount === 3) {
      if (isCluster(chars[j+1], chars[j+2])) {
        splits.add(j);
      } else {
        splits.add(j+1);
      }
    } else if (consCount === 4) {
      splits.add(j+1);
    }

    i = j;
  }

  let current = '';
  for (let k = 0; k < word.length; k++) {
    current += chars[k];
    if (splits.has(k) && k < word.length - 1) {
      syllables.push(current);
      current = '';
    }
  }
  if (current) {
    syllables.push(current);
  }

  return syllables;
};

const DESCRIPTION_ICON_LIBRARY = [
  { id: 'Tiempo', label: 'Tiempo', src: '/interfaz/consumo_new/Tiempo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/consumo_new/Mente.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/consumo_new/Cuerpo.webp' },
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/consumo_new/Hambre.webp' },
  { id: 'Armadura', label: 'Armadura', src: '/interfaz/consumo_new/Armadura.png' },
  { id: 'Recurso', label: 'Recurso', src: '/interfaz/consumo_new/Recurso.webp' },
  { id: 'Agua', label: 'Agua', src: '/elementos_new/agua.webp' },
  { id: 'Fuego', label: 'Fuego', src: '/elementos_new/fuego.webp' },
  { id: 'Hielo', label: 'Hielo', src: '/elementos_new/hielo.webp' },
  { id: 'Luz', label: 'Luz', src: '/elementos_new/luz.webp' },
  { id: 'Oscuridad', label: 'Oscuridad', src: '/elementos_new/oscuridad.webp' },
  { id: 'Rayo', label: 'Rayo', src: '/elementos_new/rayo.webp' },
  { id: 'Tierra', label: 'Tierra', src: '/elementos_new/tierra.webp' },
  { id: 'Veneno', label: 'Veneno', src: '/elementos_new/veneno.webp' },
  { id: 'Viento', label: 'Viento', src: '/elementos_new/viento.webp' },
];

const KEYWORD_ICONS = Object.fromEntries(
  DESCRIPTION_ICON_LIBRARY.map((icon) => [icon.id, icon.src]),
);

const DESCRIPTION_ICON_LOOKUP = Object.fromEntries(
  DESCRIPTION_ICON_LIBRARY.map((icon) => [icon.id.toLowerCase(), icon.id]),
);

const DESCRIPTION_ICON_TOKEN_REGEX = /\[icon:([^\]\r\n]+)\]/gi;

const normalizeDescriptionIconId = (value = '') => (
  DESCRIPTION_ICON_LOOKUP[value.trim().toLowerCase()] || null
);

const createDescriptionIconToken = (iconId) => `[icon:${iconId}]`;

const extractDescriptionIconIds = (text = '') => {
  const ids = [];
  const seen = new Set();
  DESCRIPTION_ICON_TOKEN_REGEX.lastIndex = 0;
  let match = DESCRIPTION_ICON_TOKEN_REGEX.exec(text);
  while (match) {
    const iconId = normalizeDescriptionIconId(match[1]);
    if (iconId && !seen.has(iconId)) {
      seen.add(iconId);
      ids.push(iconId);
    }
    match = DESCRIPTION_ICON_TOKEN_REGEX.exec(text);
  }
  return ids;
};

const getActiveFontSize = (context) => {
  const fontStr = context.font;
  const match = fontStr.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 60;
};

const getInlineIconMetrics = (context) => {
  const fontSize = getActiveFontSize(context);
  return {
    fontSize,
    iconSize: fontSize,
    iconPadding: fontSize * 0.12,
  };
};

const drawInlineDescriptionIcon = (context, iconImage, iconId, x, y, size) => {
  if (!iconImage) return;

  const imageWidth = iconImage.naturalWidth || iconImage.width || 0;
  const imageHeight = iconImage.naturalHeight || iconImage.height || 0;
  if (!imageWidth || !imageHeight || typeof document === 'undefined') {
    context.drawImage(iconImage, x, y, size, size);
    return;
  }

  const bounds = getVisibleImageBounds(iconImage) || { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight };
  const scale = Math.min(size / bounds.sw, size / bounds.sh);
  const drawWidth = bounds.sw * scale;
  const drawHeight = bounds.sh * scale;
  const drawX = x + (size - drawWidth) / 2;
  const drawY = y + (size - drawHeight) / 2;
  const buffer = document.createElement('canvas');
  buffer.width = Math.max(1, Math.ceil(drawWidth));
  buffer.height = Math.max(1, Math.ceil(drawHeight));
  const bufferContext = buffer.getContext('2d');
  if (!bufferContext) {
    context.drawImage(iconImage, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  bufferContext.imageSmoothingEnabled = true;
  bufferContext.imageSmoothingQuality = 'high';
  bufferContext.drawImage(
    iconImage,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    buffer.width,
    buffer.height,
  );
  bufferContext.globalCompositeOperation = 'source-in';
  bufferContext.fillStyle = DESCRIPTION_ICON_STYLES[iconId]?.stroke || '#c46f1f';
  bufferContext.fillRect(0, 0, buffer.width, buffer.height);

  context.drawImage(buffer, drawX, drawY, drawWidth, drawHeight);
};

const measureTextWithIcons = (context, text, ignoreIcons = false) => {
  if (!text) return 0;
  if (ignoreIcons) return context.measureText(text).width;

  const { iconSize, iconPadding } = getInlineIconMetrics(context);
  const iconWidth = iconSize + iconPadding * 2;
  return parseLineSegments(text).reduce((width, segment) => {
    if (segment.isKeyword) return width + iconWidth;
    return width + context.measureText(segment.text).width;
  }, 0);
};

const DESCRIPTION_SEPARATOR_REGEX = /^\s*-{3,}\s*$/;
const LORE_OPEN_TAG = '[lore]';
const LORE_CLOSE_TAG = '[/lore]';

const parseStyles = (text) => {
  const segments = [];
  let currentText = '';
  let bold = false;
  let italic = false;
  let color = null;

  let i = 0;
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, color });
        currentText = '';
      }
      bold = !bold;
      i += 2;
    } else if (text.startsWith('*', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, color });
        currentText = '';
      }
      italic = !italic;
      i += 1;
    } else if (text.startsWith('[color:', i)) {
      const closeBracket = text.indexOf(']{', i);
      if (closeBracket !== -1) {
        const colorVal = text.slice(i + 7, closeBracket).trim();
        const closeCurly = text.indexOf('}', closeBracket + 2);
        if (closeCurly !== -1) {
          if (currentText) {
            segments.push({ text: currentText, bold, italic, color });
            currentText = '';
          }
          const innerText = text.slice(closeBracket + 2, closeCurly);
          const innerSegments = parseStyles(innerText);
          innerSegments.forEach(seg => {
            segments.push({
              text: seg.text,
              bold: seg.bold || bold,
              italic: seg.italic || italic,
              color: seg.color || colorVal
            });
          });
          i = closeCurly + 1;
          continue;
        }
      }
      currentText += text[i];
      i++;
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    segments.push({ text: currentText, bold, italic, color });
  }

  return segments;
};

const splitLoreSegments = (text, initialIsLore = false) => {
  const segments = [];
  let cursor = 0;
  let isLore = initialIsLore;

  while (cursor < text.length) {
    const nextOpen = text.indexOf(LORE_OPEN_TAG, cursor);
    const nextClose = text.indexOf(LORE_CLOSE_TAG, cursor);
    let nextTag = -1;
    let nextIsOpen = false;

    if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
      nextTag = nextOpen;
      nextIsOpen = true;
    } else if (nextClose !== -1) {
      nextTag = nextClose;
    }

    if (nextTag === -1) {
      segments.push({ text: text.slice(cursor), isLore });
      break;
    }

    if (nextTag > cursor) {
      segments.push({ text: text.slice(cursor, nextTag), isLore });
    }

    cursor = nextTag + (nextIsOpen ? LORE_OPEN_TAG.length : LORE_CLOSE_TAG.length);
    isLore = nextIsOpen;
  }

  return {
    segments: segments.filter((segment) => segment.text.length > 0),
    isLore,
  };
};

const getFontInfoFromContext = (context) => {
  const fontStr = context.font;
  const italic = fontStr.includes('italic');
  const sizeMatch = fontStr.match(/(\d+)px/);
  const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 85;
  const parts = fontStr.split('px');
  const family = parts[1] ? parts[1].trim() : 'Georgia, serif';
  
  let weight = '400';
  if (fontStr.includes('900') || fontStr.includes('bold')) {
    weight = '900';
  } else {
    const weightMatch = fontStr.match(/\b([1-9]00)\b/);
    if (weightMatch) {
      weight = weightMatch[1];
    }
  }

  return {
    italic,
    size,
    family,
    weight,
    defaultColor: context.fillStyle,
  };
};

const applySegmentStyle = (context, seg, layoutFontInfo) => {
  const baseFamily = layoutFontInfo.family || "Georgia, serif";
  const baseSize = layoutFontInfo.size || 85;
  const finalItalic = seg.italic ? !layoutFontInfo.italic : layoutFontInfo.italic;
  const styleStr = finalItalic ? 'italic ' : '';
  const weightStr = seg.bold ? '900' : (layoutFontInfo.weight || '400');
  
  context.font = `${styleStr}${weightStr} ${baseSize}px ${baseFamily}`;
  
  if (seg.color) {
    context.fillStyle = seg.color;
  } else {
    context.fillStyle = layoutFontInfo.defaultColor || 'rgba(255,255,255,0.96)';
  }
};

const measureStyledText = (context, text, layoutFontInfo = {}, ignoreIcons = false) => {
  const segments = parseStyles(text);
  let totalWidth = 0;
  
  context.save();
  segments.forEach((seg) => {
    applySegmentStyle(context, seg, layoutFontInfo);
    totalWidth += measureTextWithIcons(context, seg.text, ignoreIcons);
  });
  context.restore();
  
  return totalWidth;
};

const measureTextWidth = (context, text, ignoreIcons = false) => {
  const fontInfo = getFontInfoFromContext(context);
  return measureStyledText(context, text, fontInfo, ignoreIcons);
};

const getStyledWordsOfLine = (line) => {
  const segments = parseStyles(line);
  const words = [];
  
  segments.forEach((seg) => {
    const parts = seg.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (part === '') return;
      if (part.trim() === '') {
        words.push({
          text: part,
          bold: seg.bold,
          italic: seg.italic,
          color: seg.color,
          isSpace: true,
        });
      } else {
        words.push({
          text: part,
          bold: seg.bold,
          italic: seg.italic,
          color: seg.color,
          isSpace: false,
        });
      }
    });
  });
  
  return words;
};

const drawSingleStyledWord = (context, word, x, y, resourceImages = {}, ignoreIcons = false) => {
  const fontInfo = getFontInfoFromContext(context);
  
  context.save();
  applySegmentStyle(context, word, fontInfo);
  
  const { fontSize, iconSize, iconPadding } = getInlineIconMetrics(context);
  
  if (ignoreIcons) {
    context.fillText(word.text, x, y);
  } else {
    const kwSegments = parseLineSegments(word.text);
    let cursorX = x;
    
    kwSegments.forEach((seg) => {
      if (!seg.isKeyword) {
        context.fillText(seg.text, cursorX, y);
        cursorX += context.measureText(seg.text).width;
      }
      
      if (seg.isKeyword) {
        const iconImg = resourceImages[`keyword:${seg.iconId}`] || null;
        
        if (iconImg) {
          const iconY = y + (fontSize - iconSize) / 2;
          drawInlineDescriptionIcon(context, iconImg, seg.iconId, cursorX + iconPadding, iconY, iconSize);
        }
        cursorX += iconSize + iconPadding * 2;
      }
    });
  }
  
  context.restore();
};

const measureStyledWordWidth = (context, word, ignoreIcons = false) => {
  const fontInfo = getFontInfoFromContext(context);
  let wordWidth = 0;
  
  context.save();
  applySegmentStyle(context, word, fontInfo);
  wordWidth = measureTextWithIcons(context, word.text, ignoreIcons);
  context.restore();
  
  return wordWidth;
};

const parseLineSegments = (line) => {
  if (!line) return [];

  const segments = [];
  let cursor = 0;
  DESCRIPTION_ICON_TOKEN_REGEX.lastIndex = 0;
  let match = DESCRIPTION_ICON_TOKEN_REGEX.exec(line);

  while (match) {
    if (match.index > cursor) {
      segments.push({ text: line.slice(cursor, match.index), isKeyword: false });
    }

    const iconId = normalizeDescriptionIconId(match[1]);
    if (iconId) {
      segments.push({ text: match[0], iconId, isKeyword: true });
    } else {
      segments.push({ text: match[0], isKeyword: false });
    }

    cursor = DESCRIPTION_ICON_TOKEN_REGEX.lastIndex;
    match = DESCRIPTION_ICON_TOKEN_REGEX.exec(line);
  }

  if (cursor < line.length) {
    segments.push({ text: line.slice(cursor), isKeyword: false });
  }

  return segments.filter((segment) => segment.text !== '');
};

const tokenizeParagraph = (paragraph) => {
  const preserved = paragraph.replace(/\bcuerpo\s+a\s+cuerpo\b/gi, 'cuerpo_a_cuerpo');
  return preserved.split(/\s+/).map(w => w.replace(/cuerpo_a_cuerpo/gi, 'cuerpo a cuerpo'));
};

const drawTextLineWithIcons = (context, line, x, y, maxWidth, justify = false, resourceImages = {}, ignoreIcons = false) => {
  if (justify === 'center') {
    const fontInfo = getFontInfoFromContext(context);
    const styleSegments = parseStyles(line);
    
    if (styleSegments.length === 0) return;
    
    const naturalWidth = measureStyledText(context, line, fontInfo, ignoreIcons);
    let cursorX = x + (maxWidth - naturalWidth) / 2;
    
    context.save();
    styleSegments.forEach((styleSeg) => {
      applySegmentStyle(context, styleSeg, fontInfo);
      
      const { fontSize, iconSize, iconPadding } = getInlineIconMetrics(context);
      
      if (ignoreIcons) {
        context.fillText(styleSeg.text, cursorX, y);
        cursorX += context.measureText(styleSeg.text).width;
      } else {
        const kwSegments = parseLineSegments(styleSeg.text);
        kwSegments.forEach((seg) => {
          if (!seg.isKeyword) {
            context.fillText(seg.text, cursorX, y);
            cursorX += context.measureText(seg.text).width;
          }
          
          if (seg.isKeyword) {
            const iconImg = resourceImages[`keyword:${seg.iconId}`] || null;
            
            if (iconImg) {
              const iconY = y + (fontSize - iconSize) / 2;
              drawInlineDescriptionIcon(context, iconImg, seg.iconId, cursorX + iconPadding, iconY, iconSize);
            }
            cursorX += iconSize + iconPadding * 2;
          }
        });
      }
    });
    context.restore();
    return;
  }

  if (!justify) {
    const fontInfo = getFontInfoFromContext(context);
    const styleSegments = parseStyles(line);
    
    if (styleSegments.length === 0) return;
    
    let cursorX = x;
    
    context.save();
    styleSegments.forEach((styleSeg) => {
      applySegmentStyle(context, styleSeg, fontInfo);
      
      const { fontSize, iconSize, iconPadding } = getInlineIconMetrics(context);
      
      if (ignoreIcons) {
        context.fillText(styleSeg.text, cursorX, y);
        cursorX += context.measureText(styleSeg.text).width;
      } else {
        const kwSegments = parseLineSegments(styleSeg.text);
        kwSegments.forEach((seg) => {
          if (!seg.isKeyword) {
            context.fillText(seg.text, cursorX, y);
            cursorX += context.measureText(seg.text).width;
          }
          
          if (seg.isKeyword) {
            const iconImg = resourceImages[`keyword:${seg.iconId}`] || null;
            
            if (iconImg) {
              const iconY = y + (fontSize - iconSize) / 2;
              drawInlineDescriptionIcon(context, iconImg, seg.iconId, cursorX + iconPadding, iconY, iconSize);
            }
            cursorX += iconSize + iconPadding * 2;
          }
        });
      }
    });
    context.restore();
  } else {
    const styledWords = getStyledWordsOfLine(line);
    const spaceTokensCount = styledWords.filter(w => w.isSpace).length;
    
    const fontInfo = getFontInfoFromContext(context);
    const naturalWidth = measureStyledText(context, line, fontInfo, ignoreIcons);
    const extraWidth = maxWidth - naturalWidth;
    
    if (spaceTokensCount < 2 || extraWidth <= 0) {
      drawTextLineWithIcons(context, line, x, y, maxWidth, false, resourceImages, ignoreIcons);
      return;
    }
    
    const extraSpaceShare = extraWidth / spaceTokensCount;
    let cursorX = x;
    
    styledWords.forEach((word) => {
      if (word.isSpace) {
        const spaceNaturalWidth = measureStyledWordWidth(context, word, ignoreIcons);
        cursorX += spaceNaturalWidth + extraSpaceShare;
      } else {
        drawSingleStyledWord(context, word, cursorX, y, resourceImages, ignoreIcons);
        cursorX += measureStyledWordWidth(context, word, ignoreIcons);
      }
    });
  }
};

const splitLongWord = (context, word, maxWidth) => {
  if (measureTextWidth(context, word) <= maxWidth) return [word];

  const chunks = [];
  let chunk = '';
  Array.from(word).forEach((character) => {
    const nextChunk = `${chunk}${character}`;
    if (measureTextWidth(context, nextChunk) <= maxWidth || !chunk) {
      chunk = nextChunk;
      return;
    }

    chunks.push(chunk);
    chunk = character;
  });

  if (chunk) chunks.push(chunk);
  return chunks;
};


const serializeTokens = (tokens) => {
  let result = '';
  let activeBold = false;
  let activeItalic = false;
  let activeColor = null;

  tokens.forEach((token) => {
    const tBold = token.bold || false;
    const tItalic = token.italic || false;
    const tColor = token.color || null;

    if (tBold !== activeBold || tItalic !== activeItalic || tColor !== activeColor) {
      if (activeColor) result += '}';
      if (activeItalic) result += '*';
      if (activeBold) result += '**';

      if (tBold) result += '**';
      if (tItalic) result += '*';
      if (tColor) result += `[color:${tColor}]{`;

      activeBold = tBold;
      activeItalic = tItalic;
      activeColor = tColor;
    }

    result += token.text;
  });

  if (activeColor) result += '}';
  if (activeItalic) result += '*';
  if (activeBold) result += '**';

  return result;
};

const wrapDescriptionText = (context, text, maxWidth, hyphenate = false, isLore = false, ignoreIcons = false) => {
  const paragraphs = text
    .trim()
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const segments = parseStyles(paragraph);
    const tokens = [];

    segments.forEach((seg) => {
      const preserved = seg.text.replace(/\bcuerpo\s+a\s+cuerpo\b/gi, 'cuerpo_a_cuerpo');
      const parts = preserved.split(/(\s+)/);
      parts.forEach((part) => {
        if (part === '') return;
        const cleanPart = part.replace(/cuerpo_a_cuerpo/gi, 'cuerpo a cuerpo');
        const isSpace = /^\s+$/.test(cleanPart);

        if (isSpace) {
          tokens.push({
            text: cleanPart,
            bold: seg.bold,
            italic: seg.italic,
            color: seg.color,
            isSpace: true,
          });
        } else {
          const wordWidth = measureStyledText(context, cleanPart, {
            bold: seg.bold,
            italic: seg.italic,
            color: seg.color,
          }, isLore || ignoreIcons);

          if (wordWidth <= maxWidth) {
            tokens.push({
              text: cleanPart,
              bold: seg.bold,
              italic: seg.italic,
              color: seg.color,
              isSpace: false,
            });
          } else {
            const chars = Array.from(cleanPart);
            let chunk = '';
            chars.forEach((char) => {
              const nextChunk = chunk + char;
              const nextWidth = measureStyledText(context, nextChunk, {
                bold: seg.bold,
                italic: seg.italic,
                color: seg.color,
              }, isLore || ignoreIcons);
              if (nextWidth <= maxWidth || !chunk) {
                chunk = nextChunk;
              } else {
                tokens.push({
                  text: chunk,
                  bold: seg.bold,
                  italic: seg.italic,
                  color: seg.color,
                  isSpace: false,
                });
                chunk = char;
              }
            });
            if (chunk) {
              tokens.push({
                text: chunk,
                bold: seg.bold,
                italic: seg.italic,
                color: seg.color,
                isSpace: false,
              });
            }
          }
        }
      });
    });

    let currentLineTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.isSpace) {
        if (currentLineTokens.length === 0) continue;
        currentLineTokens.push(token);
        continue;
      }

      const testTokens = [...currentLineTokens, token];
      const testString = serializeTokens(testTokens);

      if (measureTextWidth(context, testString, ignoreIcons) <= maxWidth || currentLineTokens.length === 0) {
        currentLineTokens.push(token);
        continue;
      }

      if (hyphenate) {
        const match = token.text.match(/^([^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ]*)(.*?)([^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ]*)$/);
        if (match) {
          const leadingPunct = match[1];
          const cleanWord = match[2];
          const trailingPunct = match[3];

          if (cleanWord.length > 3) {
            const rawSyllables = getSyllables(cleanWord);
            if (rawSyllables.length > 1) {
              const syllables = [...rawSyllables];
              syllables[0] = leadingPunct + syllables[0];
              syllables[syllables.length - 1] = syllables[syllables.length - 1] + trailingPunct;

              let hyphenated = false;
              for (let k = syllables.length - 1; k >= 1; k--) {
                const prefixText = syllables.slice(0, k).join('') + '-';
                const suffixText = syllables.slice(k).join('');

                const prefixToken = { ...token, text: prefixText };
                const suffixToken = { ...token, text: suffixText };

                const testTokensWithHyphen = [...currentLineTokens, prefixToken];
                const testStringWithHyphen = serializeTokens(testTokensWithHyphen);

                if (measureTextWidth(context, testStringWithHyphen, ignoreIcons) <= maxWidth) {
                  currentLineTokens.push(prefixToken);
                  while (currentLineTokens.length > 0 && currentLineTokens[currentLineTokens.length - 1].isSpace) {
                    currentLineTokens.pop();
                  }
                  lines.push(serializeTokens(currentLineTokens));
                  currentLineTokens = [suffixToken];
                  hyphenated = true;
                  break;
                }
              }

              if (hyphenated) {
                continue;
              }
            }
          }
        }
      }

      while (currentLineTokens.length > 0 && currentLineTokens[currentLineTokens.length - 1].isSpace) {
        currentLineTokens.pop();
      }
      lines.push(serializeTokens(currentLineTokens));
      currentLineTokens = [token];
    }

    if (currentLineTokens.length > 0) {
      while (currentLineTokens.length > 0 && currentLineTokens[currentLineTokens.length - 1].isSpace) {
        currentLineTokens.pop();
      }
      lines.push(serializeTokens(currentLineTokens));
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines;
};

const getDescriptionFlowItems = (context, text, maxWidth, lineHeight, hyphenate = false, options = {}) => {
  const {
    ignoreIcons = false,
    paragraphGapScale = 0.55,
  } = options;
  const lines = text.trim().split(/\n/);
  const items = [];
  let paragraph = '';
  let paragraphIsLore = false;
  let activeLore = false;

  const flushParagraph = () => {
    const cleanParagraph = paragraph.trim();
    if (!cleanParagraph) {
      paragraph = '';
      return;
    }

    const wrappedLines = wrapDescriptionText(context, cleanParagraph, maxWidth, hyphenate, paragraphIsLore, ignoreIcons);
    wrappedLines.forEach((line, lineIdx) => {
      items.push({
        type: 'text',
        line,
        isLore: paragraphIsLore,
        isLastLineOfParagraph: lineIdx === wrappedLines.length - 1,
        height: paragraphIsLore ? Math.round(lineHeight * 1.02) : lineHeight,
      });
    });
    paragraph = '';
  };

  lines.forEach((rawLine) => {
    if (DESCRIPTION_SEPARATOR_REGEX.test(rawLine)) {
      flushParagraph();
      items.push({ type: 'separator', height: Math.round(lineHeight * 0.74) });
      return;
    }

    const loreResult = splitLoreSegments(rawLine, activeLore);
    activeLore = loreResult.isLore;
    const { segments } = loreResult;
    if (segments.length === 0) {
      flushParagraph();
      items.push({ type: 'gap', height: Math.round(lineHeight * paragraphGapScale) });
      return;
    }

    segments.forEach((segment) => {
      const cleanText = segment.text.trim();
      if (!cleanText) return;

      if (paragraph && paragraphIsLore !== segment.isLore) {
        flushParagraph();
      }

      paragraphIsLore = segment.isLore;
      paragraph = paragraph ? `${paragraph} ${cleanText}` : cleanText;
    });
  });

  flushParagraph();
  while (items.length > 0 && (items[0].type === 'gap' || items[0].type === 'separator')) items.shift();
  while (items.length > 0 && (items[items.length - 1].type === 'gap' || items[items.length - 1].type === 'separator')) items.pop();
  return items;
};

const fitDescriptionFont = (context, text, layout, hyphenate = false) => {
  let size = layout.fontSize;
  let lineHeight = layout.lineHeight;
  let items = [];
  const style = layout.italic ? 'italic ' : '';
  const family = layout.family || "Georgia, serif";

  while (size > 48) {
    context.font = `${style}${layout.weight} ${size}px ${family}`;
    items = getDescriptionFlowItems(context, text, layout.width, lineHeight, hyphenate);
    const textHeight = items.reduce((total, item) => total + item.height, 0);
    if (textHeight <= layout.height) break;
    size -= 1;
    lineHeight = Math.round(size * 1.22);
  }

  return { size, lineHeight, items };
};

const drawPreviewText = (context, text, layout) => {
  const family = layout.family || "Georgia, serif";
  const style = layout.italic ? 'italic ' : '';
  let size = Math.min(layout.fontSize, 70);

  while (size > 36) {
    context.font = `${style}400 ${size}px ${family}`;
    if (context.measureText(text).width <= layout.width * 0.86) break;
    size -= 3;
  }

  context.fillStyle = 'rgba(255,255,255,0.42)';
  context.shadowColor = 'rgba(0,0,0,0.65)';
  context.shadowBlur = 8;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if ('letterSpacing' in context) context.letterSpacing = '0px';
  context.fillText(text, layout.x + layout.width / 2, layout.y + layout.height / 2);
};

const traceRoundedRect = (context, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(x, y, width, height, safeRadius);
    return;
  }

  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const getTextPanelBounds = (layout) => ({
  x: layout.x,
  y: layout.y,
  width: layout.width,
  height: layout.height,
});

const drawTextPanel = (context, layout) => {
  const { x, y, width, height } = getTextPanelBounds(layout);

  context.save();
  traceRoundedRect(context, x, y, width, height, 26);

  const panelGradient = context.createLinearGradient(x, y, x, y + height);
  panelGradient.addColorStop(0, 'rgba(0, 0, 0, 0.64)');
  panelGradient.addColorStop(0.42, 'rgba(0, 0, 0, 0.74)');
  panelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  context.fillStyle = panelGradient;
  context.shadowColor = 'rgba(0,0,0,0.50)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 3;
  context.fill();
  context.restore();
};

const getTextContentLayout = (layout) => {
  const panel = getTextPanelBounds(layout);
  const paddingX = Math.min(68, panel.width * 0.055);
  const paddingTop = Math.min(48, panel.height * 0.12);
  const paddingBottom = Math.min(54, panel.height * 0.14);

  return {
    ...layout,
    x: panel.x + paddingX,
    y: panel.y + paddingTop,
    width: Math.max(240, panel.width - paddingX * 2),
    height: Math.max(160, panel.height - paddingTop - paddingBottom),
  };
};

const shouldJustifyLine = (lines, index) => {
  const line = lines[index];
  if (!line || !line.includes(' ')) return false;
  const nextLine = lines[index + 1];
  return Boolean(nextLine);
};

const drawJustifiedLine = (context, line, x, y, maxWidth) => {
  const words = line.trim().split(/\s+/);
  if (words.length < 2) {
    context.fillText(line, x, y);
    return;
  }

  const wordsWidth = words.reduce((total, word) => total + context.measureText(word).width, 0);
  const spaceWidth = (maxWidth - wordsWidth) / (words.length - 1);
  let cursorX = x;

  words.forEach((word, index) => {
    context.fillText(word, cursorX, y);
    cursorX += context.measureText(word).width + (index < words.length - 1 ? spaceWidth : 0);
  });
};

const drawDescriptionSeparator = (context, layout, y, lineHeight) => {
  const centerY = y + lineHeight * 0.36;
  const inset = Math.min(150, layout.width * 0.18);
  const gradient = context.createLinearGradient(layout.x + inset, centerY, layout.x + layout.width - inset, centerY);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(0.5, 'rgba(200,170,110,0.34)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.save();
  context.shadowColor = 'rgba(255,255,255,0.24)';
  context.shadowBlur = 8;
  context.lineWidth = 2;
  context.strokeStyle = gradient;
  context.beginPath();
  context.moveTo(layout.x + inset, centerY);
  context.lineTo(layout.x + layout.width - inset, centerY);
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,255,255,0.42)';
  const dotRadius = Math.max(3, lineHeight * 0.045);
  [-1, 0, 1].forEach((offset) => {
    context.beginPath();
    context.arc(layout.x + layout.width / 2 + offset * dotRadius * 4.2, centerY, dotRadius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
};

const drawMinionAttributes = (context, attributes, resourceImages = {}) => {
  const slots = [
    { x: 225, y: 807, width: 430, height: 175 },
    { x: 729, y: 807, width: 430, height: 175 },
    { x: 1233, y: 807, width: 430, height: 175 },
  ];

  MINION_ATTRIBUTE_TYPES.forEach((attribute, index) => {
    const slot = slots[index];
    const { x, y, width, height } = slot;
    const bevel = 58;
    const icon = resourceImages[`attribute:${attribute}`] || resourceImages[`keyword:${attribute}`];
    const iconSize = 70;
    const value = Number.isFinite(Number(attributes?.[attribute])) ? Number(attributes[attribute]) : 0;

    context.save();
    const traceAttributePath = (grow = 0) => {
      const gx = x - grow;
      const gy = y - grow * 0.65;
      const gw = width + grow * 2;
      const gh = height + grow * 1.3;
      const gb = bevel + grow * 0.4;
      context.beginPath();
      context.moveTo(gx + gb, gy);
      context.lineTo(gx + gw - gb, gy);
      context.lineTo(gx + gw, gy + gh / 2);
      context.lineTo(gx + gw - gb, gy + gh);
      context.lineTo(gx + gb, gy + gh);
      context.lineTo(gx, gy + gh / 2);
      context.closePath();
    };

    traceAttributePath();
    const fill = context.createLinearGradient(x, y, x, y + height);
    fill.addColorStop(0, 'rgba(0,0,0,0.88)');
    fill.addColorStop(0.52, 'rgba(0,0,0,0.98)');
    fill.addColorStop(1, 'rgba(0,0,0,0.84)');
    context.fillStyle = fill;
    context.shadowColor = 'rgba(0,0,0,0.85)';
    context.shadowBlur = 16;
    context.fill();

    traceAttributePath(2);
    context.shadowColor = 'rgba(255,255,255,0.46)';
    context.shadowBlur = 24;
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(255,255,255,0.28)';
    context.stroke();

    traceAttributePath();
    context.shadowBlur = 0;
    context.lineWidth = 2.5;
    context.strokeStyle = 'rgba(255,255,255,0.58)';
    context.stroke();

    if (icon) {
      context.save();
      context.shadowColor = 'rgba(255,255,255,0.24)';
      context.shadowBlur = 10;
      context.drawImage(icon, x + 82, y + height / 2 - iconSize / 2, iconSize, iconSize);
      context.restore();
    }

    context.fillStyle = 'rgba(255,255,255,0.96)';
    context.shadowColor = 'rgba(0,0,0,0.88)';
    context.shadowBlur = 8;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    if ('letterSpacing' in context) context.letterSpacing = '0px';
    context.font = '900 76px Cinzel, Georgia, serif';
    context.fillText(String(value), x + width / 2 + 15, y + height / 2 - 10);

    context.fillStyle = 'rgba(200,170,110,0.92)';
    context.font = '900 24px Lato, Arial, sans-serif';
    if ('letterSpacing' in context) context.letterSpacing = '2px';
    context.fillText(attribute.toUpperCase(), x + width / 2 + 16, y + height / 2 + 48);

    context.restore();
  });
};

const drawTextBlock = (context, textValue, layout, previewText = '', hyphenate = false, resourceImages = {}) => {
  const hasUserText = textValue.trim().length > 0;
  const text = hasUserText ? textValue.trim() : previewText;
  if (!text || !layout) return;

  context.save();
  drawTextPanel(context, layout);
  const textLayout = getTextContentLayout(layout);
  if (!hasUserText) {
    drawPreviewText(context, text, textLayout);
    context.restore();
    return;
  }

  context.fillStyle = hasUserText ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.58)';
  context.shadowColor = 'rgba(0,0,0,0.85)';
  context.shadowBlur = 6;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  if ('letterSpacing' in context) context.letterSpacing = '0px';

  const isPrimary = previewText === PRIMARY_DESCRIPTION_PREVIEW_TEXT;
  const dynamicLayout = getDynamicStartingLayout(textLayout, text, isPrimary);
  const fitted = fitDescriptionFont(context, text, dynamicLayout, hyphenate);
  const style = dynamicLayout.italic ? 'italic ' : '';
  const family = dynamicLayout.family || "Georgia, serif";
  context.font = `${style}${dynamicLayout.weight || '400'} ${fitted.size}px ${family}`;

  const totalTextHeight = fitted.items.reduce((total, item) => total + item.height, 0);
  let y = dynamicLayout.y;
  if (totalTextHeight < dynamicLayout.height) {
    y += Math.round((dynamicLayout.height - totalTextHeight) / 2);
  }

  fitted.items.forEach((item, index) => {
    if (y + item.height > dynamicLayout.y + dynamicLayout.height) return;

    if (item.type === 'separator') {
      drawDescriptionSeparator(context, dynamicLayout, y, fitted.lineHeight);
    } else if (item.type === 'text' && item.line) {
      const shouldJustify = Boolean(
        !item.isLastLineOfParagraph &&
        !item.isLore &&
        item.line.includes(' ')
      );

      if (item.isLore) {
        context.fillStyle = 'rgba(255,255,255,0.84)';
        context.font = `italic ${dynamicLayout.weight || '400'} ${Math.max(48, Math.round(fitted.size * 0.94))}px ${family}`;
        drawTextLineWithIcons(context, item.line, dynamicLayout.x, y, dynamicLayout.width, 'center', resourceImages, item.isLore);
      } else {
        context.fillStyle = 'rgba(255,255,255,0.96)';
        context.font = `${style}${dynamicLayout.weight || '400'} ${fitted.size}px ${family}`;
        if (shouldJustify) {
          drawTextLineWithIcons(context, item.line, dynamicLayout.x, y, dynamicLayout.width, true, resourceImages, item.isLore);
        } else {
          drawTextLineWithIcons(context, item.line, dynamicLayout.x, y, dynamicLayout.width, false, resourceImages, item.isLore);
        }
      }
    }
    y += item.height;
  });

  context.restore();
};

const drawDescription = (context, description, flavorText, typeConfig, showTraits, hyphenate = false, singleTextStyle = 'narrative', resourceImages = {}, visibleTraitRows = 3) => {
  const layouts = getDescriptionLayouts(typeConfig, showTraits, singleTextStyle, visibleTraitRows);

  if (layouts.primary) {
    drawTextBlock(context, description, layouts.primary, PRIMARY_DESCRIPTION_PREVIEW_TEXT, hyphenate, resourceImages);
    drawTextBlock(context, flavorText, layouts.flavor, FLAVOR_DESCRIPTION_PREVIEW_TEXT, hyphenate, resourceImages);
    return;
  }

  drawTextBlock(context, description, layouts.flavor, DESCRIPTION_PREVIEW_TEXT, hyphenate, resourceImages);
};

const drawRoundRectPath = (context, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(x, y, width, height, safeRadius);
    return;
  }
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
};

const drawCoverImage = (context, image, x, y, width, height) => {
  if (!image) return;
  const imageRatio = image.width / image.height;
  const frameRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > frameRatio) {
    sourceWidth = image.height * frameRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / frameRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

const drawGeneratedHeaderBackdrop = (context, x, y, width, height) => {
  context.save();
  const base = context.createLinearGradient(x, y, x + width, y + height);
  base.addColorStop(0, '#171819');
  base.addColorStop(0.42, '#2a251e');
  base.addColorStop(1, '#111215');
  context.fillStyle = base;
  context.fillRect(x, y, width, height);

  const smoke = context.createRadialGradient(x + width * 0.55, y + height * 0.36, 40, x + width * 0.55, y + height * 0.36, width * 0.58);
  smoke.addColorStop(0, 'rgba(255,235,190,0.18)');
  smoke.addColorStop(0.36, 'rgba(141,102,62,0.14)');
  smoke.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = smoke;
  context.fillRect(x, y, width, height);

  context.fillStyle = 'rgba(0,0,0,0.38)';
  context.fillRect(x, y, width, height);
  context.restore();
};

const fitModularTitleFont = (context, title, hasHeaderIcon = false) => {
  let size = 176;
  context.save();
  while (size > 58) {
    context.font = `900 ${size}px Lato, Arial, sans-serif`;
    const titleWidth = context.measureText(title).width;
    const neededSpace = titleWidth + (hasHeaderIcon ? size * 0.98 + 34 : 0);
    if (neededSpace <= 1340) break;
    size -= 4;
  }
  context.restore();
  return size;
};

const MODULAR_CARD_OUTER_BOUNDS = {
  x: 62,
  y: 54,
  width: 1764,
  height: 2516,
};

const applyReferenceCardLayoutScale = (context) => {
  const scale = CANVAS_WIDTH / MODULAR_CARD_OUTER_BOUNDS.width;
  context.translate(-MODULAR_CARD_OUTER_BOUNDS.x * scale, -MODULAR_CARD_OUTER_BOUNDS.y * scale);
  context.scale(scale, scale);
};

const drawPaperTexture = (context, x, y, width, height, accent = '#c46f1f', stardustImg = null) => {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  // Deterministic pseudo-random number generator to keep the stardust layout identical between renders
  const pseudoRandom = (s) => {
    const mask = 0xffffffff;
    let w = (123456789 + s) & mask;
    let z = (987654321 - s) & mask;
    return () => {
      z = (36969 * (z & 65535) + (z >> 16)) & mask;
      w = (18000 * (w & 65535) + (w >> 16)) & mask;
      return (((z << 16) + w) >>> 0) / 4294967296;
    };
  };

  const random = pseudoRandom(2026); // Fixed seed for stardust layout

  // 1. Soft radial washes to give an organic aged depth/mottling to the background
  for (let i = 0; i < 5; i++) {
    const cx = x + random() * width;
    const cy = y + random() * height;
    const radius = 300 + random() * 400;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(139, 94, 26, 0.05)');
    gradient.addColorStop(0.6, 'rgba(215, 172, 115, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
  }

  // 2. Draw stardust image pattern if loaded
  if (stardustImg) {
    context.save();
    const pattern = context.createPattern(stardustImg, 'repeat');
    if (pattern) {
      context.fillStyle = pattern;
      context.globalAlpha = 0.45; // Subtle but noticeable shimmery specs
      context.fillRect(x, y, width, height);
    }
    context.restore();
  }

  // 3. Fine organic noise particles (procedural dark/light dust specs)
  // We draw 600 micro-particles
  for (let i = 0; i < 600; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const alpha = 0.02 + random() * 0.04;
    if (random() > 0.4) {
      // Dark organic paper dust specs (noticeable but very subtle)
      context.fillStyle = `rgba(70, 55, 40, ${alpha * 1.5})`;
      context.fillRect(px, py, 1.2, 1.2);
    } else {
      // Light particles
      context.fillStyle = `rgba(255, 255, 240, ${alpha})`;
      context.fillRect(px, py, 1.2, 1.2);
    }
  }

  // 4. Medium-sized stardust particles (dust specs)
  // We draw 150 medium particles (1.0px to 3.0px) for depth
  for (let i = 0; i < 150; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 1.0 + random() * 2.0;
    const alpha = 0.02 + random() * 0.04;

    if (random() > 0.4) {
      // Dark particles
      context.fillStyle = `rgba(80, 65, 50, ${alpha * 1.5})`;
    } else {
      // Light particles
      context.fillStyle = `rgba(255, 253, 240, ${alpha})`;
    }

    context.beginPath();
    context.arc(px, py, size / 2, 0, Math.PI * 2);
    context.fill();
  }

  // 5. Soft hazy/blurry stardust clouds
  // We draw 18 larger blurry glow particles for depth
  for (let i = 0; i < 18; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const radius = 3 + random() * 6;
    const alpha = 0.01 + random() * 0.02;

    const g = context.createRadialGradient(px, py, 0, px, py, radius);
    if (random() > 0.5) {
      g.addColorStop(0, `rgba(255, 253, 230, ${alpha * 1.5})`);
      g.addColorStop(1, 'rgba(255, 253, 230, 0)');
    } else {
      g.addColorStop(0, `rgba(130, 95, 65, ${alpha})`);
      g.addColorStop(1, 'rgba(130, 95, 65, 0)');
    }

    context.fillStyle = g;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
  }

  // 6. Aged vignette border overlay
  const vignette = 80;
  
  // Left Edge
  const lGrad = context.createLinearGradient(x, y, x + vignette, y);
  lGrad.addColorStop(0, 'rgba(130, 95, 60, 0.04)');
  lGrad.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = lGrad;
  context.fillRect(x, y, vignette, height);

  // Right Edge
  const rGrad = context.createLinearGradient(x + width - vignette, y, x + width, y);
  rGrad.addColorStop(0, 'rgba(0,0,0,0)');
  rGrad.addColorStop(1, 'rgba(130, 95, 60, 0.04)');
  context.fillStyle = rGrad;
  context.fillRect(x + width - vignette, y, vignette, height);

  // Top Edge
  const tGrad = context.createLinearGradient(x, y, x, y + vignette);
  tGrad.addColorStop(0, 'rgba(130, 95, 60, 0.04)');
  tGrad.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = tGrad;
  context.fillRect(x, y, width, vignette);

  // Bottom Edge
  const bGrad = context.createLinearGradient(x, y + height - vignette, x, y + height);
  bGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bGrad.addColorStop(1, 'rgba(130, 95, 60, 0.04)');
  context.fillStyle = bGrad;
  context.fillRect(x, y + height - vignette, width, vignette);

  // 7. Accent color soft overlay wash
  context.globalAlpha = 0.03;
  context.fillStyle = accent;
  context.fillRect(x, y, width, height);

  context.restore();
};

const drawModularFrame = (context, accent = '#c46f1f', stardustImg = null) => {
  context.save();
  const cardEdgeGradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  cardEdgeGradient.addColorStop(0, '#202223');
  cardEdgeGradient.addColorStop(0.52, '#17191a');
  cardEdgeGradient.addColorStop(1, '#0d0f10');
  context.fillStyle = cardEdgeGradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.lineWidth = 7;
  context.strokeStyle = '#030303';
  context.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);

  const outerGradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  outerGradient.addColorStop(0, '#2b2d2e');
  outerGradient.addColorStop(0.52, '#202223');
  outerGradient.addColorStop(1, '#121415');
  context.fillStyle = outerGradient;
  drawRoundRectPath(context, 62, 54, 1764, 2516, 6);
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = '#030303';
  context.stroke();

  context.fillStyle = '#f3e6cf';
  drawRoundRectPath(context, 160, 126, 1568, 2310, 4);
  context.fill();
  context.lineWidth = 12;
  context.strokeStyle = '#000000';
  context.stroke();

  const paperGradient = context.createRadialGradient(944, 1440, 150, 944, 1440, 1200);
  paperGradient.addColorStop(0, 'rgba(255,248,230,0.65)');
  paperGradient.addColorStop(0.62, 'rgba(244,222,188,0.18)');
  paperGradient.addColorStop(1, 'rgba(197,126,48,0.12)');
  context.fillStyle = paperGradient;
  context.fillRect(168, 770, 1552, 1658);
  drawPaperTexture(context, 168, 770, 1552, 1658, accent, stardustImg);

  context.globalAlpha = 0.04;
  context.fillStyle = accent;
  for (let i = 0; i < 120; i++) {
    const px = 180 + ((i * 157) % 1500);
    const py = 790 + ((i * 283) % 1600);
    context.fillRect(px, py, 1.2, 1.2);
  }
  context.restore();
};

const drawHeaderImageContainer = (
  context,
  headerImage,
  cardName,
  accent,
  weaponIconImg = null,
  elementIconImg = null,
) => {
  const x = 170;
  const y = 136;
  const width = 1548;
  const height = 638;
  context.save();
  drawRoundRectPath(context, x, y, width, height, 2);
  context.clip();
  if (headerImage) {
    drawCoverImage(context, headerImage, x, y, width, height);
  } else {
    drawGeneratedHeaderBackdrop(context, x, y, width, height);
  }

  const bottomShade = context.createLinearGradient(x, y + height * 0.34, x, y + height);
  bottomShade.addColorStop(0, 'rgba(0,0,0,0.08)');
  bottomShade.addColorStop(0.7, 'rgba(0,0,0,0.62)');
  bottomShade.addColorStop(1, 'rgba(0,0,0,0.78)');
  context.fillStyle = bottomShade;
  context.fillRect(x, y, width, height);
  context.restore();

  context.save();
  context.lineWidth = 12;
  context.strokeStyle = '#000000';
  context.strokeRect(x, y, width, height);
  context.fillStyle = accent;
  context.fillRect(x, y + height - 14, width, 14);

  const headerIconImg = elementIconImg;
  const title = normalizeCardName(cardName).toUpperCase();
  const titleSize = fitModularTitleFont(context, title, Boolean(headerIconImg));
  context.font = `900 ${titleSize}px Lato, Arial, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.shadowColor = 'rgba(0,0,0,0.78)';
  context.shadowBlur = 16;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 6;
  context.lineWidth = Math.max(6, Math.round(titleSize * 0.045));
  context.strokeStyle = 'rgba(42,28,16,0.55)';
  context.fillStyle = '#f4ead9';
  const titleX = x + 82;
  const titleY = y + height - 96;
  context.strokeText(title, titleX, titleY);
  context.fillText(title, titleX, titleY);

  if (headerIconImg) {
    const titleMetrics = context.measureText(title);
    const iconBounds = getVisibleImageBounds(headerIconImg);
    const iconVisibleHeight = titleSize * 1.12;
    const iconVisibleWidth = iconVisibleHeight * ((iconBounds?.sw || 1) / (iconBounds?.sh || 1));
    const iconGap = titleSize * 0.14;
    const iconX = Math.min(titleX + titleMetrics.width + iconGap, x + width - 82 - iconVisibleWidth);
    const titleBottom = titleY + Math.max(0, titleMetrics.actualBoundingBoxDescent || titleSize * 0.04);
    const iconY = titleBottom - iconVisibleHeight + titleSize * 0.11;
    context.globalAlpha = 0.94;
    if (iconBounds) {
      context.drawImage(
        headerIconImg,
        iconBounds.sx,
        iconBounds.sy,
        iconBounds.sw,
        iconBounds.sh,
        iconX,
        iconY,
        iconVisibleWidth,
        iconVisibleHeight,
      );
    } else {
      context.drawImage(headerIconImg, iconX, iconY, iconVisibleWidth, iconVisibleHeight);
    }
  }
  context.restore();
};

const drawSectionDiamond = (context, x, y, size, accent) => {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 4);
  context.fillStyle = accent;
  context.fillRect(-size / 2, -size / 2, size, size);
  context.restore();
};

const MODULAR_CONTENT_TOP = 805;
const MODULAR_DIVIDER_BOTTOM_INSET = 14;

const getModularBlockCenterY = (y, height) => (
  y + height / 2 - MODULAR_DIVIDER_BOTTOM_INSET
);

const drawContainerDivider = (context, y, accent) => {
  context.save();
  context.strokeStyle = 'rgba(181,92,18,0.58)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(314, y);
  context.lineTo(902, y);
  context.moveTo(986, y);
  context.lineTo(1574, y);
  context.stroke();
  drawSectionDiamond(context, 944, y, 31, accent);
  context.restore();
};

const traceDiamondPath = (context, x, y, size) => {
  context.beginPath();
  context.moveTo(x, y - size / 2);
  context.lineTo(x + size / 2, y);
  context.lineTo(x, y + size / 2);
  context.lineTo(x - size / 2, y);
  context.closePath();
};

const CHARGE_FOOTER_LINE_Y = 2328;
const CHARGE_FOOTER_RESERVED_HEIGHT = 170;
const CHARGE_STYLES = {
  Hambre: { stroke: '#3d7d45', fill: 'rgba(61,125,69,0.88)' },
  Cuerpo: { stroke: '#a93832', fill: 'rgba(169,56,50,0.88)' },
  Mente: { stroke: '#2f6fb3', fill: 'rgba(47,111,179,0.88)' },
};

const drawModularChargeFooter = (context, chargeSlots, resourceImages = {}, accent = '#c46f1f') => {
  const slots = Array.from({ length: CHARGE_SLOT_COUNT }, (_, index) => chargeSlots[index] || EMPTY_SLOT);
  const y = CHARGE_FOOTER_LINE_Y;
  const centers = [764, 848, 944, 1040, 1124];
  const sizes = [45, 45, 70, 45, 45];

  context.save();
  context.strokeStyle = 'rgba(181,92,18,0.58)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(314, y);
  context.lineTo(715, y);
  context.moveTo(1173, y);
  context.lineTo(1574, y);
  context.stroke();

  slots.forEach((slot, index) => {
    const x = centers[index];
    const size = sizes[index];
    
    // Determine the color corresponding to each charge
    const slotColor = slot === 'Hambre' ? '#3d7d45'
                    : slot === 'Cuerpo' ? '#a93832'
                    : slot === 'Mente' ? '#2f6fb3'
                    : accent;
                    
    // Draw the diamond shape matching the style of the body diamonds but colored
    drawSectionDiamond(context, x, y, size, slotColor);
  });
  context.restore();
};

const drawContainerLabel = (context, label, centerY, accent) => {
  context.save();
  drawSectionDiamond(context, 262, centerY, 34, accent);
  context.font = '900 62px Lato, Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = '#1d2120';
  context.fillText(label.toUpperCase(), 314, centerY);
  context.restore();
};

const drawEmptyContainersMessage = (context) => {
  context.save();
  const bodyCenterY = MODULAR_CONTENT_TOP + (2386 - MODULAR_CONTENT_TOP) / 2;
  context.font = '900 46px Lato, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = 'rgba(29,33,32,0.42)';
  context.fillText('SIN CONTENEDORES HABILITADOS', 944, bodyCenterY);
  context.font = 'italic 34px Lato, Arial, sans-serif';
  context.fillStyle = 'rgba(29,33,32,0.32)';
  context.fillText('Añade contenedores desde el panel lateral', 944, bodyCenterY + 62);
  context.restore();
};

const drawModularRange = (context, y, height, selectedIndex, accent) => {
  const labels = ['TOQUE', 'CERCANO', 'INTERMEDIO', 'LEJANO', 'EXTREMO'];
  const centerX = 944;
  const width = 1148;
  const startX = centerX - width / 2;
  const endX = centerX + width / 2;
  const trackY = getModularBlockCenterY(y, height) + 12;
  const step = (endX - startX) / 4;
  context.save();
  context.strokeStyle = '#252523';
  context.lineWidth = 9;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX, trackY);
  context.lineTo(endX, trackY);
  context.stroke();

  labels.forEach((label, index) => {
    const cx = startX + step * index;
    context.font = '900 36px Lato, Arial, sans-serif';
    context.fillStyle = '#202321';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(label, cx, trackY - 58);

    context.beginPath();
    context.arc(cx, trackY, 41, 0, Math.PI * 2);
    context.fillStyle = index === selectedIndex ? accent : '#f3e6cf';
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = '#202321';
    context.stroke();
  });
  context.restore();
};

const drawModularConsumption = (context, centerY, slots, resourceImages = {}, accent) => {
  const visibleSlots = Array.from({ length: 4 }, (_, index) => slots[index] || EMPTY_SLOT);
  const size = 136;
  const gap = 58;
  const totalWidth = visibleSlots.length * size + Math.max(0, visibleSlots.length - 1) * gap;
  const startX = 944 - totalWidth / 2 + size / 2;
  const cy = centerY;

  const iconStroke = 'rgba(32,35,33,0.78)';
  const iconFill = 'rgba(32,35,33,0.1)';
  const slotStyles = {
    Tiempo: { stroke: accent, fill: 'rgba(196,111,31,0.14)' },
    Mente: { stroke: '#2f6fb3', fill: 'rgba(47,111,179,0.14)' },
    Cuerpo: { stroke: '#a93832', fill: 'rgba(169,56,50,0.14)' },
    Hambre: { stroke: '#3d7d45', fill: 'rgba(61,125,69,0.14)' },
    Recurso: { stroke: '#6f716c', fill: 'rgba(111,113,108,0.14)' },
    Armadura_1: { stroke: '#60798f', fill: 'rgba(96,121,143,0.15)' },
    ...ELEMENT_CONSUMPTION_STYLES,
  };
  const getSlotStyle = (slot) => slotStyles[slot] || {
    stroke: 'rgba(32,35,33,0.56)',
    fill: 'rgba(244,230,207,0.78)',
  };

  const createIconCanvas = (width, height) => {
    const canvasWidth = Math.max(1, Math.ceil(width));
    const canvasHeight = Math.max(1, Math.ceil(height));
    const canvas = typeof window !== 'undefined' && typeof window.OffscreenCanvas !== 'undefined'
      ? new window.OffscreenCanvas(canvasWidth, canvasHeight)
      : document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    return canvas;
  };

  const getVisibleImageBounds = (image, imageWidth, imageHeight) => {
    const sourceCanvas = createIconCanvas(imageWidth, imageHeight);
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) {
      return { x: 0, y: 0, width: imageWidth, height: imageHeight };
    }
    sourceContext.drawImage(image, 0, 0, imageWidth, imageHeight);
    const data = sourceContext.getImageData(0, 0, imageWidth, imageHeight).data;
    let minX = imageWidth;
    let minY = imageHeight;
    let maxX = -1;
    let maxY = -1;
    for (let yPos = 0; yPos < imageHeight; yPos += 1) {
      for (let xPos = 0; xPos < imageWidth; xPos += 1) {
        const alpha = data[((yPos * imageWidth + xPos) * 4) + 3];
        if (alpha > 20) {
          minX = Math.min(minX, xPos);
          minY = Math.min(minY, yPos);
          maxX = Math.max(maxX, xPos);
          maxY = Math.max(maxY, yPos);
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      return { x: 0, y: 0, width: imageWidth, height: imageHeight };
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  };

  const drawTintedImageIcon = (image, cx, targetWidth = 54, targetHeight = 72, tint = iconStroke) => {
    if (!image) return false;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return false;

    const bounds = getVisibleImageBounds(image, imageWidth, imageHeight);
    const scale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height);
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    const x = cx - width / 2;
    const imageY = cy - height / 2;
    const buffer = createIconCanvas(width, height);
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return false;
    bufferContext.imageSmoothingEnabled = true;
    bufferContext.imageSmoothingQuality = 'high';
    bufferContext.drawImage(
      image,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      buffer.width,
      buffer.height,
    );
    bufferContext.globalCompositeOperation = 'source-in';
    bufferContext.fillStyle = tint;
    bufferContext.fillRect(0, 0, buffer.width, buffer.height);

    context.save();
    context.globalAlpha = 0.9;
    context.drawImage(buffer, x, imageY, width, height);
    context.restore();
    return true;
  };

  const drawHourglassIcon = (cx, tint = iconStroke, alpha = 1) => {
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = tint;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Draw top and bottom caps
    context.beginPath();
    context.moveTo(cx - 24, cy - 32);
    context.lineTo(cx + 24, cy - 32);
    context.stroke();

    context.beginPath();
    context.moveTo(cx - 24, cy + 32);
    context.lineTo(cx + 24, cy + 32);
    context.stroke();

    // Draw the glass body
    context.beginPath();
    context.moveTo(cx - 18, cy - 28);
    context.bezierCurveTo(cx - 18, cy - 10, cx - 6, cy - 4, cx - 6, cy); // Upper left to center
    context.bezierCurveTo(cx - 6, cy + 4, cx - 18, cy + 10, cx - 18, cy + 28); // Center to lower left
    context.lineTo(cx + 18, cy + 28); // Lower horizontal
    context.bezierCurveTo(cx + 18, cy + 10, cx + 6, cy + 4, cx + 6, cy); // Lower right to center
    context.bezierCurveTo(cx + 6, cy - 4, cx + 18, cy - 10, cx + 18, cy - 28); // Center to upper right
    context.closePath();
    context.fill();
    context.stroke();

    // Draw sand in the bottom bulb
    context.beginPath();
    context.moveTo(cx - 12, cy + 16);
    context.bezierCurveTo(cx - 8, cy + 26, cx + 8, cy + 26, cx + 12, cy + 16);
    context.lineTo(cx + 14, cy + 26);
    context.lineTo(cx - 14, cy + 26);
    context.closePath();
    context.fillStyle = tint;
    context.fill();

    // Draw sand in the top bulb (falling)
    context.beginPath();
    context.moveTo(cx - 10, cy - 20);
    context.lineTo(cx + 10, cy - 20);
    context.bezierCurveTo(cx + 8, cy - 14, cx - 8, cy - 14, cx - 10, cy - 20);
    context.fillStyle = tint;
    context.fill();

    // Sand stream passing through center
    context.beginPath();
    context.moveTo(cx - 2, cy - 8);
    context.lineTo(cx + 2, cy - 8);
    context.lineTo(cx + 1, cy + 16);
    context.lineTo(cx - 1, cy + 16);
    context.closePath();
    context.fill();

    context.restore();
  };

  const drawMindIcon = (cx, tint = iconStroke, alpha = 1) => {
    context.save();
    context.globalAlpha = alpha;

    // SVG viewBox: 0 0 1202 1280. Scale to fit within ~68px height (68/1280 = 0.053125)
    const scaleFactor = 68 / 1280;
    const widthScaled = 1202 * scaleFactor; // 63.85px
    
    // Position at cx, cy
    context.translate(cx - widthScaled / 2, cy - 34);
    context.scale(scaleFactor, scaleFactor);
    context.translate(0, 1280);
    context.scale(0.1, -0.1);

    const paths = [
  "M4862 12790 c-180 -14 -246 -36 -357 -120 -35 -26 -59 -33 -160 -49 -136 -21 -239 -53 -371 -116 -73 -34 -110 -60 -184 -129 -128 -120 -148 -121 -310 -26 -152 90 -299 130 -478 130 -243 0 -445 -85 -619 -262 -147 -148 -233 -294 -274 -463 -26 -108 -24 -200 6 -314 53 -203 28 -243 -165 -256 -58 -4 -133 -16 -167 -26 -123 -38 -217 -145 -266 -301 -34 -107 -43 -166 -62 -373 -34 -376 -59 -431 -289 -624 -221 -185 -297 -277 -382 -455 -89 -188 -120 -375 -111 -669 6 -195 12 -234 71 -491 17 -75 22 -114 16 -126 -5 -10 -32 -34 -59 -55 -109 -79 -185 -194 -248 -372 -27 -76 -28 -84 -28 -291 l0 -212 -32 -20 c-40 -24 -149 -161 -202 -255 -45 -78 -111 -246 -144 -364 -16 -59 -21 -106 -21 -211 -1 -129 0 -138 27 -193 35 -70 105 -142 187 -193 33 -20 60 -41 60 -46 0 -5 -18 -32 -41 -60 -95 -120 -186 -302 -230 -458 -33 -118 -33 -316 -1 -439 27 -101 77 -209 132 -282 54 -72 202 -222 305 -310 46 -40 96 -89 111 -110 29 -43 30 -80 3 -226 -13 -71 -12 -73 19 -165 38 -110 39 -135 11 -214 -11 -32 -34 -129 -52 -214 -27 -135 -31 -174 -31 -305 1 -133 4 -160 28 -239 37 -124 95 -235 243 -463 220 -340 348 -441 665 -528 95 -26 122 -76 153 -285 19 -132 15 -117 93 -295 124 -283 165 -327 409 -446 89 -43 200 -90 246 -103 198 -58 402 -58 640 0 78 19 170 37 203 41 114 11 122 7 281 -150 79 -78 166 -172 194 -210 88 -117 145 -159 354 -263 302 -149 414 -178 695 -179 267 0 360 26 471 136 l71 69 49 -6 c43 -6 57 -2 132 35 221 111 331 250 373 469 18 95 18 204 -1 317 -8 50 -15 106 -15 126 0 26 -8 43 -30 64 -27 26 -30 35 -30 89 0 75 57 357 110 545 60 212 73 302 67 456 -3 74 -12 152 -21 181 -9 28 -47 99 -86 158 -105 164 -106 201 -7 400 67 134 89 210 102 346 8 89 -12 525 -30 635 -21 133 -79 360 -136 533 -32 99 -48 161 -43 175 3 12 21 43 40 69 18 26 46 71 61 100 26 50 28 60 27 178 0 109 -4 136 -28 210 -45 135 -107 245 -197 351 l-31 37 64 78 c74 92 111 153 141 232 21 55 22 71 22 432 1 206 -3 483 -7 615 -6 220 -10 250 -37 358 -33 130 -162 459 -245 626 -75 149 -74 143 -21 165 129 53 271 309 304 550 14 97 14 519 1 646 -6 52 -21 133 -34 180 -25 86 -76 304 -76 323 0 6 27 36 60 68 59 56 60 59 60 111 0 118 -46 216 -136 296 l-56 49 35 22 c82 50 224 238 252 334 30 102 14 240 -41 350 -24 46 -111 193 -201 339 -43 68 -43 108 1 203 60 129 71 189 70 385 0 260 -34 371 -149 486 -50 51 -83 72 -190 124 -72 34 -159 80 -194 103 -59 38 -68 41 -145 43 -44 1 -132 -2 -194 -6z m253 -140 c237 -83 352 -164 414 -293 91 -191 100 -468 20 -669 -11 -29 -22 -55 -24 -57 -2 -2 -37 23 -77 56 -40 33 -109 86 -153 118 -44 32 -108 82 -142 111 -83 71 -115 87 -147 74 -32 -12 -34 -45 -6 -99 26 -51 82 -98 182 -152 169 -91 269 -187 400 -384 99 -150 165 -283 179 -359 20 -111 -18 -226 -123 -368 -88 -120 -153 -138 -285 -80 -40 18 -103 45 -140 61 -38 16 -108 42 -158 57 -81 25 -105 28 -235 28 -156 0 -270 -18 -446 -70 -49 -15 -138 -39 -197 -55 -59 -16 -118 -34 -130 -40 -36 -19 -67 -51 -67 -71 0 -15 8 -18 55 -18 82 0 182 23 345 81 173 60 262 79 380 79 116 0 233 -21 379 -69 217 -72 388 -167 445 -249 41 -60 42 -101 7 -216 -49 -158 -41 -258 39 -496 57 -167 70 -269 70 -530 0 -249 -38 -433 -115 -560 -35 -57 -131 -156 -174 -179 -22 -12 -26 -10 -67 37 -42 48 -112 92 -147 92 -44 0 -2 -105 113 -280 100 -151 155 -264 258 -520 115 -289 131 -382 139 -775 6 -367 -7 -645 -37 -740 -98 -310 -320 -498 -822 -694 -210 -83 -314 -178 -221 -204 27 -8 41 -4 97 27 36 20 127 57 203 81 95 31 197 75 329 141 155 79 196 96 218 90 43 -11 114 -90 151 -169 75 -158 83 -265 31 -422 l-32 -100 -30 44 c-57 87 -105 128 -156 136 -53 8 -113 -8 -122 -31 -4 -11 29 -52 102 -127 105 -110 108 -115 170 -251 144 -318 208 -572 219 -866 12 -310 -26 -491 -188 -906 -116 -296 -148 -402 -131 -439 7 -14 20 -25 31 -25 53 0 92 42 126 135 10 28 21 54 25 58 10 11 85 -76 110 -128 43 -88 44 -214 2 -307 -43 -96 -133 -178 -267 -243 -135 -65 -212 -79 -414 -72 -194 6 -293 27 -416 87 -100 49 -170 110 -233 205 -58 86 -78 140 -91 253 -6 45 -15 91 -21 102 -21 39 -68 53 -215 61 -77 5 -155 13 -174 18 -135 41 -198 171 -188 391 6 136 29 217 81 288 68 93 85 154 50 183 -25 21 -58 0 -182 -116 -135 -126 -215 -187 -307 -233 -264 -131 -574 -161 -925 -88 -272 57 -452 137 -565 251 -154 155 -323 513 -386 817 -29 144 -23 274 20 384 17 44 31 89 31 101 0 33 -41 58 -132 83 -287 76 -453 213 -523 429 -25 76 -16 125 38 212 64 106 88 202 67 277 -14 55 -31 67 -73 53 -42 -14 -75 -49 -117 -126 -57 -103 -107 -145 -175 -145 -20 0 -79 18 -131 41 -53 22 -105 39 -117 37 -53 -7 -75 -129 -34 -189 36 -55 81 -70 231 -79 73 -4 142 -13 154 -19 22 -12 34 -43 52 -136 35 -179 241 -383 458 -452 40 -13 88 -23 106 -23 18 0 35 -2 38 -5 3 -3 -3 -34 -14 -68 -71 -230 -1 -524 241 -1005 95 -189 226 -345 355 -421 117 -69 339 -129 571 -151 177 -18 465 -16 569 4 147 28 311 98 443 187 23 16 44 29 47 29 3 0 6 -62 6 -137 0 -168 16 -251 69 -358 48 -97 106 -159 179 -193 50 -23 62 -24 166 -19 61 3 120 7 131 9 16 3 20 -5 27 -48 20 -136 89 -264 203 -379 183 -185 375 -245 740 -232 177 6 283 25 460 81 60 19 111 33 114 31 9 -10 -31 -142 -53 -175 -27 -41 -148 -151 -216 -197 -25 -17 -88 -54 -140 -83 -138 -76 -193 -115 -213 -150 -35 -59 13 -76 114 -41 81 28 140 60 284 155 l130 86 3 -33 c2 -17 19 -113 38 -212 81 -414 28 -582 -251 -798 l-90 -69 -6 71 c-7 68 -33 134 -54 134 -5 0 -30 -41 -55 -91 -55 -111 -103 -162 -195 -207 -101 -50 -173 -66 -315 -72 -148 -6 -261 14 -457 79 -204 67 -280 118 -527 352 -120 113 -243 217 -300 251 -14 8 0 19 71 59 49 27 131 79 183 116 52 37 133 90 180 118 47 28 105 66 129 84 l43 33 86 -85 c132 -130 282 -200 427 -200 37 0 69 6 81 14 37 28 -7 63 -189 154 -141 69 -178 93 -237 149 -103 96 -142 181 -173 375 -19 113 -31 157 -51 193 -15 25 -33 45 -39 42 -7 -2 -20 -19 -30 -38 -26 -49 -18 -175 18 -298 23 -80 26 -99 16 -131 -12 -41 -118 -150 -146 -150 -26 0 -107 45 -190 107 -129 95 -185 200 -185 342 0 106 28 187 116 341 80 139 87 160 57 192 -36 40 -96 14 -200 -84 -61 -57 -146 -99 -255 -127 -99 -25 -154 -28 -251 -11 -84 15 -100 10 -90 -31 10 -35 83 -108 121 -120 33 -9 194 -8 286 3 26 3 31 -1 37 -27 4 -16 14 -47 23 -68 9 -21 30 -97 46 -169 17 -72 41 -151 55 -177 66 -121 186 -228 281 -252 24 -6 44 -14 44 -18 0 -14 -160 -124 -241 -166 -328 -170 -768 -203 -1128 -85 -234 76 -367 192 -477 416 -45 92 -64 147 -108 321 l-52 210 140 6 c127 5 286 26 330 43 13 5 16 -1 16 -37 0 -140 51 -275 129 -349 103 -97 245 -135 481 -128 104 3 142 7 167 21 61 33 67 84 13 112 -21 11 -63 15 -157 15 -225 0 -324 29 -412 119 -66 67 -101 140 -101 208 0 47 4 57 38 94 20 23 82 76 137 117 184 139 267 224 285 292 13 47 5 70 -25 70 -30 0 -79 -37 -209 -159 -258 -240 -448 -312 -793 -298 -295 11 -533 117 -705 313 -118 134 -275 420 -322 586 -59 206 -48 450 28 633 l14 33 65 -23 c138 -50 368 -83 462 -66 90 17 137 75 75 92 -14 4 -63 8 -110 8 -246 4 -374 71 -457 239 -46 92 -54 176 -30 310 38 207 41 201 -120 279 -92 44 -145 77 -191 118 -247 224 -350 561 -268 875 15 58 40 134 55 170 25 61 141 245 165 263 22 16 118 -4 219 -44 91 -37 114 -42 213 -48 l112 -7 54 -42 c64 -49 145 -144 289 -337 188 -253 310 -359 472 -411 139 -44 377 -44 377 1 0 20 -56 60 -118 84 -29 12 -114 37 -188 56 -241 62 -314 116 -480 358 -127 186 -149 229 -158 307 -6 50 -13 68 -36 91 -34 35 -76 37 -212 12 -85 -15 -95 -15 -162 1 -82 19 -268 106 -365 170 -92 62 -185 161 -221 238 -26 55 -30 74 -30 149 0 112 32 228 102 369 43 85 67 120 129 183 100 101 110 101 183 5 74 -98 122 -142 179 -163 26 -10 52 -25 57 -34 5 -9 18 -68 30 -131 12 -63 26 -123 32 -135 21 -40 172 -261 210 -307 49 -59 125 -98 190 -98 41 0 50 3 59 24 20 43 -14 91 -126 176 -143 108 -213 219 -250 395 -31 150 -14 303 56 480 56 146 102 217 212 332 107 112 116 136 58 141 -59 6 -97 -7 -146 -50 -119 -105 -229 -308 -291 -537 -15 -53 -28 -99 -31 -104 -8 -13 -63 26 -107 74 -162 180 -195 505 -76 755 33 69 129 179 186 214 42 27 52 22 118 -61 61 -76 132 -118 174 -103 48 17 39 45 -35 120 -79 80 -129 169 -191 340 -57 156 -82 281 -89 459 -10 255 23 438 112 620 61 124 120 199 294 367 207 201 250 219 379 154 96 -48 137 -60 161 -47 34 19 35 47 0 135 -39 101 -43 106 -93 132 -79 40 -78 38 -67 314 10 267 22 330 82 436 39 68 127 150 195 180 95 42 296 81 324 64 13 -8 10 -24 -19 -106 -24 -70 -36 -126 -42 -198 -13 -160 -11 -238 7 -264 17 -24 56 -29 73 -9 6 7 17 75 26 150 8 75 19 156 25 181 9 43 39 138 45 144 2 2 16 -3 32 -11 16 -9 45 -18 66 -22 57 -11 86 25 121 150 15 55 34 110 41 121 21 34 200 120 275 134 121 22 169 63 119 103 -19 15 -33 18 -72 13 -79 -11 -212 -62 -397 -154 -96 -48 -178 -88 -182 -90 -9 -4 -62 164 -78 246 -19 92 -8 223 23 299 56 137 204 345 306 432 130 109 248 151 423 151 169 0 375 -64 534 -166 34 -21 69 -43 78 -49 15 -9 12 -18 -20 -87 -46 -95 -61 -104 -194 -100 -81 2 -100 -1 -128 -18 -41 -25 -38 -39 14 -65 32 -16 59 -20 154 -20 l115 0 14 -40 c9 -27 15 -119 20 -293 6 -236 7 -255 25 -268 40 -29 83 -9 115 53 17 34 13 133 -14 318 -29 196 -31 287 -10 370 41 158 175 305 364 399 89 45 243 99 319 111 l43 7 -39 -79 c-49 -96 -77 -187 -86 -275 -9 -78 -27 -106 -85 -133 -33 -14 -47 -29 -68 -74 -24 -47 -27 -67 -26 -141 2 -210 105 -314 308 -314 86 0 309 30 338 45 21 12 22 42 2 59 -12 10 -34 11 -88 5 -144 -17 -197 -13 -257 21 -78 44 -120 102 -120 165 0 45 4 54 39 88 41 40 54 80 67 201 20 199 133 425 261 522 91 69 156 89 273 84 68 -3 109 -13 205 -46z",
  "M3547 11085 c-83 -31 -185 -124 -257 -236 -57 -88 -73 -172 -69 -358 l4 -148 -40 4 c-119 12 -205 27 -259 44 -68 21 -102 24 -111 9 -12 -19 24 -115 52 -142 55 -52 159 -73 280 -57 101 15 120 8 198 -67 94 -92 196 -131 363 -141 56 -3 104 -9 107 -12 2 -4 -8 -49 -21 -101 -29 -112 -30 -213 -2 -218 9 -2 34 14 56 36 30 30 45 58 67 128 35 112 42 125 105 204 96 120 125 210 67 210 -27 0 -50 -15 -139 -91 -36 -31 -76 -60 -87 -64 -50 -16 -266 71 -374 151 -124 91 -159 262 -94 466 26 83 61 139 141 225 74 81 127 153 120 164 -8 13 -63 10 -107 -6z",
  "M4867 10239 c-66 -44 -131 -119 -172 -201 -42 -84 -44 -110 -10 -136 l25 -20 -78 -7 c-114 -11 -216 -39 -317 -89 -189 -94 -287 -209 -474 -556 -133 -246 -212 -350 -339 -452 -179 -142 -343 -174 -552 -109 -91 29 -151 67 -254 160 -50 45 -95 81 -102 81 -20 0 -64 -100 -64 -145 0 -142 224 -233 654 -266 l154 -12 -20 -38 c-28 -55 -34 -141 -14 -219 23 -91 83 -213 145 -293 l53 -68 -47 -50 c-209 -223 -121 -585 177 -727 125 -60 200 -76 359 -76 l135 -1 12 -150 c6 -82 13 -158 14 -168 2 -15 -11 -23 -72 -41 -304 -90 -552 -380 -577 -673 -7 -73 -3 -72 -113 -42 -208 56 -372 27 -752 -135 l-36 -16 -22 64 c-27 81 -102 189 -166 239 -112 87 -252 131 -419 132 -92 0 -116 -3 -140 -19 l-28 -19 25 -13 c14 -7 86 -24 162 -38 155 -28 225 -56 290 -116 62 -57 100 -120 146 -242 67 -175 112 -188 255 -73 84 68 253 135 394 156 138 20 365 -13 399 -58 7 -11 12 -50 12 -106 0 -88 33 -266 67 -365 25 -70 127 -122 183 -92 31 17 22 51 -42 162 -69 121 -98 225 -105 390 -7 146 4 217 49 325 94 227 275 397 480 449 158 41 271 -19 408 -216 96 -137 121 -142 264 -46 117 79 147 89 239 84 94 -4 145 -34 234 -136 87 -99 143 -144 185 -146 l33 -1 -1 65 c-1 82 -36 162 -96 222 -121 122 -321 138 -618 49 -36 -10 -73 -22 -82 -26 -13 -5 -23 6 -47 52 -74 145 -194 223 -348 223 l-51 0 -7 117 c-14 216 17 295 173 450 108 107 120 131 78 158 -22 14 -28 14 -79 -5 -96 -36 -160 -94 -232 -212 -16 -26 -40 -53 -54 -60 -49 -26 -240 -4 -362 41 -139 52 -220 131 -260 250 -30 88 -22 128 52 268 74 142 74 150 -7 270 -104 155 -132 256 -114 411 20 169 44 211 213 391 126 133 170 197 272 400 254 503 457 632 974 618 102 -3 195 -1 208 4 30 11 29 40 -3 70 -24 23 -32 24 -160 24 -83 0 -134 4 -134 10 1 41 45 168 78 224 48 80 59 116 42 136 -17 20 -20 20 -73 -16z",
  "M2509 10147 c-52 -113 -72 -229 -73 -432 -1 -124 3 -199 13 -242 25 -106 -9 -171 -198 -380 l-110 -122 -56 98 c-105 185 -143 340 -125 499 20 178 64 284 151 368 69 65 89 92 89 117 0 16 -5 18 -32 12 -65 -14 -148 -68 -216 -140 -103 -108 -115 -140 -122 -317 -3 -80 -7 -148 -10 -150 -3 -3 -61 -10 -130 -16 -69 -6 -172 -23 -230 -37 -198 -48 -257 -85 -246 -153 12 -79 57 -82 176 -12 120 71 168 83 307 78 79 -3 117 -8 123 -17 4 -7 10 -34 14 -60 7 -55 118 -254 178 -319 41 -45 42 -49 13 -117 -7 -16 -47 -70 -89 -118 -88 -102 -140 -199 -195 -361 l-37 -112 -90 85 c-101 97 -178 143 -280 167 -109 26 -304 6 -304 -30 0 -34 78 -66 160 -66 56 0 151 -24 205 -51 22 -11 63 -42 90 -68 28 -26 74 -67 104 -90 91 -70 88 -55 61 -261 -19 -150 1 -390 47 -550 20 -72 77 -195 108 -236 14 -18 25 -35 25 -38 0 -2 -15 -7 -32 -11 -61 -12 -192 -83 -260 -139 -56 -47 -74 -69 -110 -142 -36 -74 -43 -97 -43 -148 0 -60 1 -61 29 -64 39 -5 79 36 177 179 82 121 104 141 217 198 101 51 110 47 199 -72 71 -95 201 -212 306 -275 79 -48 204 -100 270 -113 48 -10 60 -9 82 5 58 38 25 73 -139 150 -379 178 -634 472 -735 848 -97 358 12 833 282 1233 37 55 112 141 192 221 121 121 138 134 242 187 66 34 122 70 138 89 24 28 27 38 21 81 -3 30 -28 98 -63 171 -58 121 -58 121 -58 216 0 78 7 122 39 246 42 163 43 200 5 248 -31 40 -47 32 -80 -37z",
  "M4815 9198 c-38 -14 -107 -60 -214 -142 -171 -132 -247 -157 -391 -131 -50 10 -94 15 -96 12 -3 -3 -7 -28 -7 -56 -2 -61 21 -97 83 -128 36 -19 61 -23 133 -23 105 0 144 -15 181 -68 55 -81 102 -230 112 -361 6 -84 -5 -158 -52 -338 -27 -106 -31 -113 -64 -131 -19 -11 -57 -23 -84 -27 -47 -6 -96 -40 -96 -65 0 -15 118 -13 321 7 166 15 179 15 230 -1 78 -25 174 -85 259 -161 92 -83 130 -103 168 -89 60 22 13 103 -126 215 -129 104 -233 139 -419 139 -57 0 -103 2 -103 4 0 3 9 20 20 39 47 80 90 251 90 360 0 157 -39 286 -125 410 -86 128 -86 126 -7 210 32 34 79 88 106 119 28 34 73 73 109 94 71 41 107 72 107 90 0 31 -75 43 -135 22z",
  "M4164 5192 c-85 -47 -109 -86 -125 -199 -22 -155 4 -309 66 -393 32 -44 23 -50 -83 -50 -145 0 -394 63 -524 132 -37 20 -91 64 -142 116 -125 129 -166 142 -166 53 0 -95 31 -137 174 -234 210 -141 359 -178 741 -181 l190 -1 80 39 c117 58 146 56 315 -21 163 -73 257 -103 330 -106 61 -1 120 18 120 39 0 28 -59 53 -263 109 -46 13 -72 29 -128 80 -96 88 -144 103 -284 86 -156 -18 -163 -17 -205 27 -43 46 -73 132 -73 212 0 34 12 93 32 157 18 56 31 113 29 125 -4 29 -42 34 -84 10z",
  "M2445 4983 c-68 -72 -90 -135 -149 -417 -53 -255 -61 -323 -47 -401 23 -125 100 -220 225 -279 105 -50 163 -61 321 -61 l140 0 78 37 c42 20 77 42 77 48 0 21 32 9 82 -31 106 -83 297 -162 498 -205 206 -44 526 -44 735 2 39 8 82 17 97 21 l27 5 -6 -129 c-5 -115 -3 -138 15 -200 42 -138 144 -205 313 -207 72 -1 90 2 108 18 45 40 17 75 -124 156 -124 71 -154 96 -176 144 -22 48 -26 180 -8 251 11 42 15 46 121 107 139 80 270 178 298 223 28 45 21 78 -19 95 -39 16 -56 6 -156 -89 -129 -123 -229 -182 -416 -244 -197 -66 -404 -83 -614 -52 -271 41 -461 123 -611 266 -76 72 -102 80 -152 46 -103 -71 -220 -101 -374 -95 -93 3 -111 7 -171 36 -80 40 -138 102 -168 181 -18 48 -20 71 -16 156 4 89 11 120 65 282 68 203 86 297 65 337 -17 33 -26 33 -58 -1z",
  "M6888 12790 c-14 -4 -46 -21 -70 -38 -25 -17 -107 -61 -183 -97 -117 -57 -148 -76 -200 -128 -115 -118 -149 -228 -150 -487 0 -196 11 -255 71 -385 44 -95 44 -135 1 -206 -19 -30 -64 -102 -100 -160 -127 -205 -157 -287 -157 -419 0 -55 7 -90 23 -130 43 -104 169 -265 244 -311 l35 -22 -56 -49 c-89 -78 -136 -178 -136 -290 0 -59 13 -88 52 -113 17 -11 40 -32 51 -46 19 -26 19 -27 -3 -125 -12 -55 -35 -146 -51 -204 -16 -58 -33 -148 -39 -200 -13 -127 -13 -549 1 -646 34 -243 174 -497 304 -550 53 -22 54 -16 -21 -165 -74 -148 -208 -485 -239 -599 -14 -52 -30 -135 -35 -183 -15 -131 -23 -1107 -9 -1182 15 -86 67 -187 148 -288 39 -48 71 -90 71 -93 0 -3 -14 -19 -31 -37 -76 -80 -149 -210 -195 -347 -24 -74 -28 -101 -28 -210 -1 -118 1 -128 27 -179 16 -29 41 -70 56 -92 58 -79 58 -80 2 -250 -128 -392 -161 -595 -163 -1012 -2 -273 6 -317 99 -503 99 -199 98 -237 -7 -400 -88 -135 -101 -175 -107 -339 -6 -154 7 -245 67 -456 53 -188 110 -470 110 -545 0 -54 -3 -63 -30 -89 -22 -21 -30 -38 -30 -64 0 -20 -7 -76 -15 -126 -19 -113 -19 -222 -1 -317 42 -219 152 -358 373 -469 75 -37 89 -41 132 -35 l49 6 71 -69 c111 -110 204 -136 471 -136 281 1 393 30 695 179 209 104 266 146 354 263 28 38 115 132 194 210 159 157 167 161 281 150 33 -4 125 -22 203 -41 238 -58 442 -58 640 0 46 13 157 60 246 103 244 119 285 163 409 446 78 178 74 163 93 295 31 209 58 259 153 285 316 86 445 188 663 525 138 212 206 338 237 441 32 102 46 221 39 328 -7 108 -56 367 -87 455 -27 79 -25 104 12 214 31 92 32 94 19 165 -27 146 -26 183 3 226 15 22 62 68 104 104 99 84 260 247 312 317 90 120 145 277 157 447 15 226 -79 496 -252 724 -25 33 -45 63 -45 68 0 4 27 25 60 45 82 51 152 123 187 193 27 55 28 64 27 193 0 105 -5 152 -21 211 -33 118 -99 286 -144 364 -53 94 -162 231 -202 255 l-32 20 0 212 c0 207 -1 215 -28 291 -63 178 -139 293 -248 372 -27 21 -54 45 -59 55 -6 12 -1 51 16 126 59 257 65 296 71 491 9 294 -22 481 -111 669 -85 178 -161 270 -382 455 -231 194 -255 246 -289 624 -19 207 -28 266 -62 373 -49 156 -143 263 -266 301 -34 10 -109 22 -167 26 -193 13 -218 53 -165 256 30 115 32 206 5 316 -37 157 -124 305 -259 446 -183 191 -382 277 -633 277 -179 0 -326 -40 -478 -130 -162 -95 -182 -94 -310 26 -74 69 -111 95 -184 129 -132 63 -235 95 -371 116 -101 16 -125 23 -160 49 -115 87 -173 105 -380 120 -161 11 -210 11 -247 0z m402 -122 c175 -79 312 -296 349 -553 24 -166 30 -185 73 -227 39 -38 40 -41 36 -94 -6 -67 -40 -114 -118 -158 -60 -34 -113 -38 -257 -21 -54 6 -76 5 -88 -5 -20 -17 -19 -47 3 -59 28 -15 251 -45 337 -45 203 0 306 105 308 314 1 74 -2 94 -26 141 -21 45 -35 60 -68 74 -58 27 -76 55 -84 133 -8 81 -43 188 -91 284 l-36 71 39 -7 c21 -4 83 -21 138 -37 294 -91 496 -266 551 -480 20 -77 15 -206 -16 -403 -22 -144 -26 -246 -9 -279 32 -62 75 -82 115 -53 18 13 19 32 25 268 5 173 11 266 20 293 l14 40 115 0 c94 0 122 4 154 20 52 26 55 40 14 65 -28 17 -47 20 -128 18 -133 -4 -148 5 -194 100 -32 69 -35 78 -20 87 9 6 44 28 78 49 286 183 634 218 856 86 151 -89 353 -344 415 -525 23 -66 31 -200 15 -278 -16 -81 -69 -249 -78 -245 -4 2 -86 42 -182 90 -185 92 -318 143 -397 154 -39 5 -53 2 -72 -13 -50 -40 -2 -81 119 -103 75 -14 254 -100 275 -134 7 -11 26 -66 41 -121 29 -104 63 -155 101 -155 16 1 58 14 103 34 12 5 19 -3 27 -26 27 -75 44 -166 58 -294 8 -75 19 -142 26 -150 17 -21 56 -17 73 8 18 26 20 104 7 264 -6 72 -18 128 -42 198 -29 82 -32 98 -19 106 17 11 75 4 188 -21 203 -46 319 -149 379 -337 23 -69 26 -102 34 -322 11 -278 11 -276 -70 -315 -43 -21 -67 -59 -107 -171 -17 -50 -17 -53 0 -79 23 -34 48 -30 164 25 153 73 182 61 422 -179 193 -194 245 -267 306 -429 57 -154 69 -232 68 -462 0 -237 -16 -334 -86 -524 -62 -171 -112 -260 -191 -340 -75 -76 -83 -103 -33 -121 41 -14 108 26 172 105 28 34 58 67 68 72 23 13 71 -19 143 -95 108 -116 163 -270 163 -457 0 -177 -49 -322 -146 -429 -44 -49 -99 -87 -107 -74 -3 5 -13 37 -22 73 -61 237 -176 456 -295 563 -53 48 -90 61 -151 55 -58 -5 -49 -29 58 -141 110 -115 156 -186 212 -332 94 -239 94 -447 2 -640 -55 -115 -88 -154 -198 -237 -110 -82 -144 -131 -124 -174 9 -21 18 -24 59 -24 65 0 141 39 190 98 38 46 189 267 210 307 6 12 20 72 32 135 12 63 25 122 30 131 5 9 31 24 57 34 57 21 105 65 179 163 68 89 81 91 159 20 144 -131 255 -383 255 -577 0 -75 -4 -94 -30 -149 -36 -77 -129 -176 -221 -238 -97 -64 -283 -151 -365 -170 -67 -16 -77 -16 -162 -1 -136 25 -178 23 -212 -12 -23 -23 -30 -41 -36 -91 -9 -78 -31 -121 -158 -307 -166 -242 -239 -296 -480 -358 -74 -19 -159 -44 -188 -56 -62 -24 -118 -64 -118 -84 0 -45 238 -45 376 -1 161 52 273 147 457 391 166 220 241 308 305 357 l54 42 112 7 c99 6 122 11 213 47 116 47 194 62 219 41 30 -25 138 -193 165 -259 138 -329 100 -662 -107 -931 -80 -104 -158 -165 -297 -232 -161 -78 -158 -72 -120 -279 22 -126 15 -217 -24 -300 -81 -172 -219 -247 -454 -248 -138 0 -173 -18 -129 -65 35 -37 114 -50 233 -36 128 14 234 37 314 66 l65 23 14 -33 c75 -181 87 -429 29 -631 -33 -114 -134 -320 -223 -454 -196 -294 -446 -433 -805 -447 -340 -14 -547 63 -787 292 -155 149 -227 193 -244 149 -10 -26 12 -88 47 -132 41 -53 116 -119 242 -214 55 -41 117 -94 138 -117 33 -37 37 -47 37 -94 0 -67 -35 -140 -99 -206 -90 -92 -185 -121 -404 -121 -102 0 -145 -4 -167 -15 -54 -28 -48 -79 13 -112 25 -14 63 -18 167 -21 236 -7 378 31 481 128 78 74 129 209 129 349 0 36 3 42 16 37 44 -17 203 -38 329 -43 l140 -6 -51 -207 c-115 -462 -271 -650 -627 -754 -156 -45 -282 -59 -472 -53 -242 8 -419 52 -615 153 -80 41 -240 151 -240 165 0 4 20 12 44 18 95 24 215 131 281 252 14 26 38 105 55 177 16 72 37 148 46 169 9 21 19 52 23 68 6 26 11 30 37 27 92 -11 253 -12 286 -3 38 12 111 85 121 120 10 41 -6 46 -90 31 -96 -17 -150 -15 -250 11 -110 28 -195 70 -256 127 -103 97 -159 121 -199 85 -33 -29 -23 -58 75 -229 119 -206 129 -386 29 -533 -53 -78 -252 -221 -307 -221 -28 0 -134 109 -146 150 -10 32 -7 51 16 131 36 123 44 249 18 298 -10 19 -23 36 -30 38 -6 3 -24 -17 -39 -42 -20 -36 -32 -80 -51 -193 -29 -180 -70 -276 -155 -359 -73 -72 -80 -77 -262 -168 -175 -88 -219 -124 -182 -151 12 -8 44 -14 81 -14 145 0 295 70 427 200 l86 85 43 -33 c24 -18 88 -60 142 -93 54 -32 138 -87 186 -122 49 -34 125 -82 170 -107 l81 -46 -64 -43 c-35 -23 -146 -119 -247 -212 -266 -249 -324 -288 -534 -358 -194 -64 -307 -84 -455 -78 -142 6 -214 22 -315 72 -92 45 -140 96 -195 207 -25 50 -49 92 -55 91 -21 0 -47 -66 -54 -134 l-6 -71 -90 69 c-279 216 -332 383 -251 798 19 99 36 195 38 213 l3 32 120 -81 c221 -148 377 -210 415 -164 9 11 8 20 -7 45 -20 35 -75 74 -213 150 -52 29 -115 66 -140 83 -68 46 -189 156 -216 197 -22 33 -62 165 -53 175 3 2 54 -12 114 -31 180 -57 283 -75 467 -81 362 -12 551 47 733 232 114 115 183 243 203 379 7 43 11 51 27 48 11 -2 70 -6 131 -9 104 -5 116 -4 166 19 69 32 127 92 172 177 57 110 68 159 73 343 3 93 7 168 9 168 2 0 34 -20 71 -44 223 -143 393 -190 689 -188 386 1 696 59 870 163 184 109 321 312 502 744 120 284 149 503 93 684 -10 33 -16 63 -13 66 3 3 20 5 38 5 17 0 63 9 100 21 218 67 429 272 463 451 18 94 29 122 53 137 13 8 72 16 154 21 151 9 194 24 232 80 20 29 23 43 19 88 -7 62 -29 102 -58 102 -11 0 -62 -18 -114 -40 -52 -22 -110 -40 -130 -40 -70 0 -118 42 -180 153 -57 103 -131 150 -170 107 -16 -17 -19 -36 -19 -93 1 -89 14 -129 76 -237 55 -96 59 -125 27 -218 -68 -203 -238 -338 -519 -413 -60 -16 -93 -31 -113 -50 l-27 -28 21 -53 c45 -111 50 -136 56 -233 4 -79 1 -121 -16 -203 -63 -304 -232 -662 -386 -817 -113 -114 -293 -194 -565 -251 -351 -73 -661 -43 -925 88 -92 46 -172 107 -307 233 -128 120 -159 139 -185 112 -29 -29 -18 -76 41 -161 68 -101 86 -161 93 -306 10 -220 -52 -350 -188 -391 -19 -5 -97 -13 -174 -18 -147 -8 -194 -22 -215 -61 -6 -11 -15 -57 -21 -102 -13 -113 -33 -167 -91 -253 -63 -95 -133 -156 -233 -205 -138 -68 -229 -84 -455 -85 -178 0 -201 2 -265 23 -182 61 -323 169 -377 290 -42 93 -41 219 2 307 26 53 100 139 110 128 4 -4 13 -26 20 -48 36 -118 131 -188 162 -120 17 37 -15 143 -126 425 -99 250 -144 393 -173 550 -25 133 -24 476 1 610 42 227 97 403 198 626 62 136 65 141 170 251 73 75 106 116 102 127 -9 23 -69 39 -122 31 -51 -8 -99 -49 -156 -136 l-30 -44 -32 100 c-25 74 -33 118 -34 171 0 125 64 288 145 369 71 71 72 71 289 -39 132 -66 234 -110 329 -141 76 -24 167 -61 203 -81 56 -31 70 -35 97 -27 97 27 -9 120 -246 213 -480 189 -700 378 -797 685 -30 96 -44 376 -36 750 7 390 23 474 138 765 103 257 158 369 259 522 81 124 129 221 129 263 0 41 -103 -8 -164 -77 l-44 -51 -34 21 c-47 29 -139 127 -171 182 -70 121 -107 311 -107 550 0 261 13 363 70 530 80 237 88 338 40 495 -36 116 -37 135 -9 193 43 88 219 193 457 271 148 49 265 71 382 71 118 0 207 -19 380 -79 163 -58 263 -81 345 -81 47 0 55 3 55 19 0 30 -56 69 -128 90 -37 10 -123 35 -192 54 -180 52 -232 64 -351 81 -237 35 -376 11 -644 -112 -192 -87 -246 -77 -349 64 -102 140 -137 248 -117 360 14 76 80 209 179 359 131 197 231 293 400 384 136 73 208 152 200 219 -3 23 -8 27 -39 30 -31 3 -46 -5 -100 -48 -35 -28 -107 -83 -159 -122 -52 -40 -128 -98 -168 -131 -40 -33 -75 -58 -77 -56 -8 9 -46 114 -56 157 -59 259 -2 549 135 685 77 77 238 155 441 213 75 21 206 13 275 -18z",
  "M8366 11092 c-7 -12 44 -81 120 -165 80 -86 115 -142 141 -225 65 -204 30 -375 -94 -466 -108 -80 -324 -167 -374 -151 -11 4 -51 33 -87 64 -89 76 -112 91 -139 91 -34 0 -39 -39 -12 -91 12 -24 50 -80 84 -126 53 -68 69 -99 96 -184 26 -83 40 -110 71 -141 22 -22 47 -38 56 -36 28 5 27 106 -2 218 -13 52 -23 97 -21 101 3 3 51 9 107 12 167 10 268 49 365 142 79 75 96 80 196 66 121 -16 225 5 280 57 28 27 64 123 52 142 -9 15 -43 12 -112 -10 -34 -10 -102 -24 -150 -30 -48 -6 -102 -12 -118 -14 l-30 -4 4 149 c4 197 -11 271 -80 374 -57 84 -151 175 -216 206 -51 25 -127 36 -137 21z",
  "M7080 10255 c-17 -20 -6 -56 41 -136 32 -54 79 -189 79 -228 0 -3 -60 -6 -134 -6 -128 0 -136 -1 -160 -24 -32 -30 -33 -59 -3 -70 13 -5 106 -7 208 -4 347 10 538 -47 699 -207 97 -96 176 -216 280 -421 100 -198 141 -257 278 -402 159 -168 183 -215 202 -392 17 -146 -12 -245 -113 -396 -82 -121 -82 -130 -8 -271 33 -64 63 -134 67 -156 9 -57 -26 -164 -74 -227 -79 -104 -269 -181 -466 -187 -88 -4 -112 7 -151 70 -72 118 -136 176 -232 212 -51 19 -57 19 -79 5 -42 -27 -30 -51 79 -158 155 -155 186 -234 172 -450 l-7 -117 -51 0 c-154 0 -275 -78 -347 -221 -25 -48 -35 -59 -48 -54 -85 35 -258 73 -365 81 -245 18 -416 -109 -434 -322 -6 -69 1 -79 50 -69 23 5 63 39 147 125 137 140 171 160 272 160 86 0 118 -13 236 -93 129 -88 162 -81 251 53 60 89 136 167 196 198 42 22 63 26 130 26 209 -1 426 -168 546 -420 59 -124 72 -194 66 -354 -7 -173 -34 -274 -105 -398 -64 -111 -73 -145 -42 -162 56 -30 158 22 183 92 33 95 67 283 66 371 0 52 4 94 11 102 35 43 268 75 401 56 152 -23 302 -85 416 -172 127 -97 172 -80 233 90 37 104 70 161 128 223 66 71 142 104 306 134 77 14 150 31 164 38 l25 13 -28 19 c-24 16 -48 19 -140 19 -292 -1 -512 -144 -590 -382 l-16 -53 -37 16 c-380 162 -544 191 -752 135 -109 -30 -106 -31 -113 42 -28 297 -273 583 -577 673 -61 18 -74 26 -72 41 1 10 8 86 14 168 l11 150 136 1 c159 0 234 16 359 76 298 142 386 504 177 727 l-47 50 49 63 c55 72 112 178 139 258 27 81 25 203 -3 256 l-22 41 155 12 c430 33 654 124 654 268 0 43 -45 143 -64 143 -6 0 -52 -36 -101 -81 -105 -93 -165 -131 -255 -160 -209 -65 -373 -33 -552 109 -130 104 -202 201 -353 477 -102 187 -155 271 -215 340 -138 161 -335 259 -562 280 l-78 7 25 20 c34 26 32 52 -10 136 -41 82 -106 157 -172 201 -53 36 -56 36 -73 16z",
  "M9431 10184 c-37 -47 -37 -86 3 -243 42 -171 53 -267 36 -331 -6 -25 -34 -94 -62 -154 -30 -64 -53 -128 -56 -155 -6 -67 24 -98 161 -168 104 -53 121 -66 243 -187 148 -148 239 -276 330 -461 296 -609 219 -1174 -215 -1588 -111 -105 -223 -181 -377 -253 -164 -77 -197 -112 -139 -150 22 -14 34 -15 82 -5 191 38 441 207 576 388 89 119 98 123 199 72 113 -57 135 -77 217 -198 98 -143 138 -184 177 -179 28 3 29 4 29 64 0 87 -63 214 -138 278 -73 62 -157 111 -236 137 -36 12 -67 23 -69 24 -2 2 11 23 28 48 81 121 133 297 151 517 11 128 7 227 -17 382 -10 60 2 82 68 133 35 27 89 73 120 102 78 73 180 113 291 113 79 0 157 33 157 66 0 36 -195 56 -304 30 -102 -24 -179 -70 -280 -167 l-90 -85 -37 112 c-54 162 -107 259 -195 361 -79 91 -97 119 -108 166 -5 22 0 34 32 70 60 65 171 263 178 318 10 76 7 74 161 74 129 0 142 -2 195 -27 32 -15 78 -41 104 -58 51 -36 115 -50 139 -30 23 19 30 76 11 104 -36 55 -249 119 -466 138 -69 6 -127 13 -130 16 -3 2 -7 70 -10 150 -7 177 -19 209 -122 317 -68 72 -151 126 -215 140 -30 6 -33 5 -33 -18 0 -18 21 -46 74 -97 86 -83 125 -157 151 -285 44 -211 11 -384 -116 -607 l-50 -87 -106 117 c-131 146 -189 225 -204 284 -11 39 -10 58 6 126 15 67 17 106 12 244 -7 184 -29 304 -76 405 -33 69 -49 77 -80 37z",
  "M7084 9196 c-27 -21 -12 -42 66 -91 67 -42 104 -76 210 -195 82 -92 100 -119 92 -139 -3 -9 -34 -58 -68 -109 -85 -124 -124 -253 -124 -409 0 -109 43 -280 90 -360 11 -19 20 -36 20 -39 0 -2 -46 -4 -102 -4 -187 0 -291 -35 -420 -139 -139 -112 -186 -193 -126 -215 38 -14 76 6 168 89 85 76 181 136 259 161 51 16 64 16 230 1 200 -19 307 -22 316 -7 12 20 -41 58 -91 65 -27 4 -65 16 -84 27 -33 18 -37 25 -64 131 -47 180 -58 254 -52 338 10 131 57 280 112 361 37 53 76 68 181 68 72 0 97 4 133 23 62 31 85 67 83 128 0 28 -4 53 -7 56 -2 3 -46 -2 -96 -12 -144 -26 -220 -1 -391 131 -158 122 -217 154 -284 154 -17 0 -40 -6 -51 -14z",
  "M7777 5203 c-13 -12 -7 -50 24 -144 51 -157 37 -289 -41 -371 -42 -44 -49 -45 -205 -27 -140 17 -188 2 -284 -86 -56 -51 -82 -67 -128 -80 -204 -56 -263 -81 -263 -109 0 -21 59 -40 120 -39 73 3 167 33 330 106 169 77 198 79 315 21 l80 -39 190 1 c382 3 531 40 741 181 143 97 174 139 174 234 0 89 -41 76 -166 -53 -51 -52 -105 -96 -142 -116 -130 -69 -379 -132 -524 -132 -106 0 -115 6 -83 50 54 74 69 133 69 280 0 154 -11 205 -56 256 -47 53 -129 90 -151 67z",
  "M9517 4984 c-21 -40 -3 -134 65 -337 54 -162 61 -193 65 -282 4 -85 2 -108 -16 -156 -30 -79 -88 -141 -168 -181 -60 -29 -78 -33 -171 -36 -154 -6 -271 24 -374 95 -50 34 -76 26 -152 -46 -150 -143 -340 -225 -611 -266 -210 -31 -417 -14 -614 52 -187 62 -287 121 -416 244 -100 95 -117 105 -156 89 -40 -17 -47 -50 -19 -95 28 -45 159 -143 298 -223 106 -61 110 -65 121 -107 18 -71 14 -203 -8 -251 -22 -48 -52 -73 -176 -144 -141 -81 -169 -116 -124 -156 18 -16 36 -19 108 -18 169 2 271 69 313 207 18 62 20 85 15 200 l-6 129 27 -5 c15 -4 59 -13 97 -21 209 -46 529 -46 735 -2 201 43 392 122 498 205 50 40 82 52 82 31 0 -6 35 -28 78 -48 l77 -37 140 0 c158 0 216 11 321 61 125 59 202 154 225 279 14 78 6 146 -47 401 -59 280 -82 345 -148 417 -31 34 -42 34 -59 1z"
];

    const pathObjects = paths.map(p => new Path2D(p));

    // Fill all paths with solid white to make the brain lobes white
    context.fillStyle = '#ffffff';
    pathObjects.forEach(path => {
      context.fill(path);
    });

    // Stroke all paths with a thin stroke of tint for inner wrinkles
    context.strokeStyle = tint;
    context.lineWidth = 150; // Approx 0.8px on screen (150 * 0.053125 * 0.1)
    context.lineCap = 'round';
    context.lineJoin = 'round';
    pathObjects.forEach(path => {
      context.stroke(path);
    });

    // Stroke ONLY the outer boundaries (hemispheres) with thick tint (6px)
    // We split by 'z' to extract only the outer boundary sub-path (without the wrinkle holes)
    const outerPathLeft = new Path2D(paths[0].split('z')[0] + 'z');
    const outerPathRight = new Path2D(paths[7].split('z')[0] + 'z');
    
    context.lineWidth = 1130; // Approx 6px on screen (6 * 12800 / 68)
    context.stroke(outerPathLeft);
    context.stroke(outerPathRight);

    context.restore();
  };

  const drawBodyIcon = (cx) => {
    context.save();
    context.strokeStyle = iconStroke;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Heart shape centered at (cx, cy)
    context.beginPath();
    context.moveTo(cx, cy - 15);
    // Left lobe
    context.bezierCurveTo(cx - 20, cy - 35, cx - 35, cy - 12, cx - 35, cy + 5);
    // Left lower half
    context.bezierCurveTo(cx - 35, cy + 20, cx - 15, cy + 30, cx, cy + 38);
    // Right lower half
    context.bezierCurveTo(cx + 15, cy + 30, cx + 35, cy + 20, cx + 35, cy + 5);
    // Right lobe
    context.bezierCurveTo(cx + 35, cy - 12, cx + 20, cy - 35, cx, cy - 15);
    context.closePath();
    context.fill();
    context.stroke();

    // A subtle decorative shine reflection on the upper left lobe
    context.beginPath();
    context.arc(cx - 12, cy - 10, 4, 0, Math.PI * 2);
    context.fillStyle = iconStroke;
    context.fill();
    
    context.restore();
  };

  const drawHungerIcon = (cx) => {
    context.save();
    context.strokeStyle = iconStroke;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    // Start at top of meat connection to bone
    context.moveTo(cx + 6, cy - 8);
    // Bone top edge
    context.lineTo(cx + 22, cy - 8);
    // Top bone bulb
    context.bezierCurveTo(cx + 26, cy - 15, cx + 36, cy - 11, cx + 34, cy - 2);
    // Bottom bone bulb
    context.bezierCurveTo(cx + 36, cy + 7, cx + 26, cy + 11, cx + 22, cy + 8);
    // Bone bottom edge
    context.lineTo(cx + 6, cy + 8);
    // Meat lower bulge
    context.bezierCurveTo(cx + 6, cy + 30, cx - 32, cy + 28, cx - 32, cy);
    // Meat upper bulge
    context.bezierCurveTo(cx - 32, cy - 28, cx + 6, cy - 30, cx + 6, cy - 8);
    context.closePath();
    context.fill();
    context.stroke();

    // Decorative "cut" in the meat (like a bone detail or a grill mark)
    context.beginPath();
    context.moveTo(cx - 16, cy - 12);
    context.lineTo(cx - 8, cy + 12);
    context.moveTo(cx - 8, cy - 12);
    context.lineTo(cx, cy + 12);
    context.strokeStyle = 'rgba(32,35,33,0.3)';
    context.lineWidth = 4;
    context.stroke();

    context.restore();
  };

  const drawArmorIcon = (cx) => {
    context.save();
    context.strokeStyle = iconStroke;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Scaled down shield path: height from cy - 32 to cy + 32, width from cx - 28 to cx + 28
    context.beginPath();
    context.moveTo(cx, cy - 32);
    context.lineTo(cx + 26, cy - 20);
    context.lineTo(cx + 22, cy + 10);
    context.bezierCurveTo(cx + 14, cy + 24, cx + 3, cy + 32, cx, cy + 34);
    context.bezierCurveTo(cx - 3, cy + 32, cx - 14, cy + 24, cx - 22, cy + 10);
    context.lineTo(cx - 26, cy - 20);
    context.closePath();
    context.fill();
    context.stroke();

    // Internal detail: vertical line and horizontal line
    context.beginPath();
    context.moveTo(cx, cy - 22);
    context.lineTo(cx, cy + 24);
    context.moveTo(cx - 16, cy - 5);
    context.lineTo(cx + 16, cy - 5);
    context.stroke();
    
    context.restore();
  };

  const drawResourceIcon = (cx) => {
    context.save();
    context.strokeStyle = iconStroke;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Bag main body path
    context.beginPath();
    // Top ruffle (left to right)
    context.moveTo(cx - 16, cy - 30);
    context.bezierCurveTo(cx - 8, cy - 25, cx + 8, cy - 25, cx + 16, cy - 30);
    // Right side of neck & body
    context.lineTo(cx + 8, cy - 18);
    context.bezierCurveTo(cx + 28, cy - 8, cx + 28, cy + 26, cx, cy + 30);
    // Left side of neck & body
    context.bezierCurveTo(cx - 28, cy + 26, cx - 28, cy - 8, cx - 8, cy - 18);
    context.closePath();
    context.fill();
    context.stroke();

    // Pouch ribbon tie (horizontal line across the neck)
    context.beginPath();
    context.moveTo(cx - 10, cy - 18);
    context.lineTo(cx + 10, cy - 18);
    context.stroke();

    // Small bow loop details
    context.beginPath();
    context.arc(cx - 5, cy - 18, 4, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(cx + 5, cy - 18, 4, 0, Math.PI * 2);
    context.stroke();

    // Coin emblem on the pouch center
    context.beginPath();
    context.arc(cx, cy + 8, 8, 0, Math.PI * 2);
    context.fillStyle = iconStroke;
    context.fill();

    // Coin inner details
    context.beginPath();
    context.moveTo(cx, cy + 4);
    context.lineTo(cx, cy + 12);
    context.moveTo(cx - 4, cy + 8);
    context.lineTo(cx + 4, cy + 8);
    context.strokeStyle = '#f3e6cf';
    context.lineWidth = 2.5;
    context.stroke();

    context.restore();
  };

  const drawVariableIcon = (cx) => {
    context.save();
    context.fillStyle = iconStroke;
    context.font = '900 64px Lato, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('?', cx, cy - 2);
    context.restore();
  };

  const drawElementIcon = (slot, cx) => {
    const shape = {
      Agua: 'drop',
      Fuego: 'flame',
      Hielo: 'snow',
      Luz: 'sun',
      Oscuridad: 'moon',
      Rayo: 'bolt',
      Tierra: 'mountain',
      Veneno: 'venom',
      Viento: 'wind',
    }[slot];
    context.save();
    context.strokeStyle = iconStroke;
    context.fillStyle = iconFill;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (shape === 'drop') {
      context.beginPath();
      context.moveTo(cx, cy - 48);
      context.bezierCurveTo(cx + 36, cy - 5, cx + 38, cy + 38, cx, cy + 43);
      context.bezierCurveTo(cx - 38, cy + 38, cx - 36, cy - 5, cx, cy - 48);
      context.fill();
      context.stroke();
    } else if (shape === 'flame') {
      context.beginPath();
      context.moveTo(cx, cy - 52);
      context.bezierCurveTo(cx + 38, cy - 12, cx + 33, cy + 35, cx, cy + 45);
      context.bezierCurveTo(cx - 32, cy + 27, cx - 31, cy - 2, cx - 6, cy - 22);
      context.bezierCurveTo(cx - 5, cy - 7, cx + 8, cy + 2, cx + 1, cy + 18);
      context.bezierCurveTo(cx + 20, cy + 2, cx + 15, cy - 26, cx, cy - 52);
      context.fill();
      context.stroke();
    } else if (shape === 'snow') {
      [-Math.PI / 2, -Math.PI / 6, Math.PI / 6].forEach((angle) => {
        context.beginPath();
        context.moveTo(cx + Math.cos(angle) * 46, cy + Math.sin(angle) * 46);
        context.lineTo(cx - Math.cos(angle) * 46, cy - Math.sin(angle) * 46);
        context.stroke();
      });
      context.beginPath();
      context.arc(cx, cy, 10, 0, Math.PI * 2);
      context.fill();
    } else if (shape === 'sun') {
      context.beginPath();
      context.arc(cx, cy, 25, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        context.beginPath();
        context.moveTo(cx + Math.cos(angle) * 38, cy + Math.sin(angle) * 38);
        context.lineTo(cx + Math.cos(angle) * 51, cy + Math.sin(angle) * 51);
        context.stroke();
      }
    } else if (shape === 'moon') {
      context.beginPath();
      context.arc(cx - 6, cy, 38, Math.PI * 0.35, Math.PI * 1.65);
      context.bezierCurveTo(cx + 17, cy + 22, cx + 17, cy - 22, cx - 6, cy - 38);
      context.fill();
      context.stroke();
    } else if (shape === 'bolt') {
      context.beginPath();
      context.moveTo(cx + 9, cy - 50);
      context.lineTo(cx - 26, cy + 4);
      context.lineTo(cx + 1, cy + 4);
      context.lineTo(cx - 9, cy + 50);
      context.lineTo(cx + 31, cy - 8);
      context.lineTo(cx + 4, cy - 8);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (shape === 'mountain') {
      context.beginPath();
      context.moveTo(cx - 46, cy + 40);
      context.lineTo(cx - 9, cy - 42);
      context.lineTo(cx + 11, cy - 5);
      context.lineTo(cx + 28, cy - 29);
      context.lineTo(cx + 50, cy + 40);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (shape === 'venom') {
      context.beginPath();
      context.arc(cx, cy - 8, 34, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(cx - 14, cy + 25);
      context.lineTo(cx - 22, cy + 49);
      context.moveTo(cx + 14, cy + 25);
      context.lineTo(cx + 22, cy + 49);
      context.moveTo(cx - 14, cy - 7);
      context.lineTo(cx - 4, cy - 7);
      context.moveTo(cx + 4, cy - 7);
      context.lineTo(cx + 14, cy - 7);
      context.stroke();
    } else if (shape === 'wind') {
      context.beginPath();
      context.moveTo(cx - 46, cy - 18);
      context.bezierCurveTo(cx - 12, cy - 42, cx + 32, cy - 30, cx + 28, cy - 4);
      context.moveTo(cx - 48, cy + 8);
      context.lineTo(cx + 45, cy + 8);
      context.moveTo(cx - 26, cy + 33);
      context.bezierCurveTo(cx + 0, cy + 48, cx + 34, cy + 40, cx + 29, cy + 20);
      context.stroke();
    } else {
      context.font = '900 38px Lato, Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#202321';
      context.fillText(slot.slice(0, 2).toUpperCase(), cx, cy + 2);
    }
    context.restore();
  };

  const drawFilledIcon = (slot, cx) => {
    if (slot === 'Variable') {
      drawVariableIcon(cx);
      return;
    }

    const image = resourceImages[`consumption:${slot}`];
    const slotStyle = getSlotStyle(slot);
    if (drawTintedImageIcon(
      image,
      cx,
      slot === 'Mente' ? 62 : 54,
      slot === 'Mente' ? 82 : 72,
      slotStyle.stroke,
    )) {
      return;
    }

    if (slot === 'Tiempo') {
      drawHourglassIcon(cx, slotStyle.stroke, 1);
    } else if (slot === 'Mente') {
      drawMindIcon(cx);
    } else if (slot === 'Cuerpo') {
      drawBodyIcon(cx);
    } else if (slot === 'Hambre') {
      drawHungerIcon(cx);
    } else if (slot === 'Armadura_1') {
      drawArmorIcon(cx);
    } else if (slot === 'Recurso') {
      drawResourceIcon(cx);
    } else {
      drawElementIcon(slot, cx);
    }
  };

  context.save();
  visibleSlots.forEach((slot, index) => {
    const isFilled = Boolean(slot && slot !== EMPTY_SLOT);
    const slotStyle = isFilled ? getSlotStyle(slot) : null;
    const cx = startX + index * (size + gap);
    context.beginPath();
    context.arc(cx, cy, size / 2, 0, Math.PI * 2);
    context.fillStyle = isFilled ? slotStyle.fill : 'rgba(32,35,33,0.08)';
    context.fill();
    context.lineWidth = isFilled ? 6 : 5;
    context.strokeStyle = isFilled ? slotStyle.stroke : 'rgba(32,35,33,0.45)';
    context.stroke();

    if (isFilled) {
      drawFilledIcon(slot, cx);
    } else {
      const timeIcon = resourceImages['consumption:Tiempo'];
      if (!drawTintedImageIcon(timeIcon, cx, 54, 72, 'rgba(32,35,33,0.48)')) {
        drawHourglassIcon(cx, 'rgba(32,35,33,0.48)', 1);
      }
    }
  });
  context.restore();
};

const drawModularDamage = (context, centerY, diceIconImg, diceQty, diceType) => {
  context.save();
  const count = diceType === 'DX' ? 1 : Math.max(1, Math.min(MAX_DAMAGE_DICE_QTY, diceQty));
  const size = 96;
  const gap = 24;
  const totalWidth = count * size + (count - 1) * gap;
  let x = 944 - totalWidth / 2;
  const y = centerY - size / 2;
  for (let i = 0; i < count; i++) {
    if (diceIconImg) {
      context.drawImage(diceIconImg, x, y, size, size);
    } else {
      context.font = '900 58px Lato, Arial, sans-serif';
      context.fillStyle = '#202321';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(diceType, x + size / 2, centerY + 2);
    }
    x += size + gap;
  }
  context.restore();
};

const drawModularTraits = (context, centerY, traits, visibleTraitRows, accent) => {
  const labels = traits
    .slice(0, MAX_TRAITS_PER_CONTAINER)
    .map((trait) => (trait || '').trim())
    .filter((trait) => trait && trait !== '-')
    .slice(0, MAX_TRAITS_PER_CONTAINER);
  context.save();
  if (labels.length === 0) {
    context.font = 'italic 44px Lato, Arial, sans-serif';
    context.fillStyle = 'rgba(29,33,32,0.52)';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText('Sin rasgos definidos', 610, centerY);
    context.restore();
    return;
  }

  const badgeHeight = 78;
  const badgeGap = labels.length === 1 ? 0 : 34;
  const badgeWidth = labels.length === 1 ? 310 : 292;
  const totalWidth = labels.length * badgeWidth + (labels.length - 1) * badgeGap;
  const startX = labels.length === 3
    ? 944 - (2 * badgeWidth + badgeGap) / 2
    : 944 - totalWidth / 2;
  const y = centerY - badgeHeight / 2;
  labels.forEach((label, index) => {
    const x = startX + index * (badgeWidth + badgeGap);
    const bevel = 50;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + badgeWidth - bevel, y);
    context.lineTo(x + badgeWidth, y + badgeHeight / 2);
    context.lineTo(x + badgeWidth - bevel, y + badgeHeight);
    context.lineTo(x, y + badgeHeight);
    context.closePath();
    context.fillStyle = 'rgba(244,230,207,0.18)';
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(181,92,18,0.74)';
    context.stroke();

    context.font = '900 34px Lato, Arial, sans-serif';
    context.fillStyle = '#202321';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label.toUpperCase(), x + badgeWidth / 2 - 8, centerY + 1);
  });
  context.restore();
};

const drawModularCombat = (context, centerY, weaponType, weaponIconImg) => {
  context.save();
  const iconSize = 96;
  const centerX = 944;
  const label = (weaponType || 'Cuerpo a cuerpo').toUpperCase();
  let fontSize = 56;
  context.font = `900 ${fontSize}px Lato, Arial, sans-serif`;
  while (fontSize > 42 && context.measureText(label).width > 540) {
    fontSize -= 2;
    context.font = `900 ${fontSize}px Lato, Arial, sans-serif`;
  }
  const textWidth = context.measureText(label).width;
  const gap = 34;

  let textX = 0;
  if (label === 'CUERPO A CUERPO') {
    const part1 = context.measureText('CUERPO ').width;
    const part2 = context.measureText('A').width;
    const offset = part1 + part2 / 2;
    textX = centerX - offset;
  } else if (label === 'DISTANCIA') {
    const part1 = context.measureText('DIST').width;
    const part2 = context.measureText('A').width;
    const offset = part1 + part2 / 2;
    textX = centerX - offset;
  } else if (label === 'MAGIA') {
    const offset = context.measureText('MA').width;
    textX = centerX - offset;
  } else {
    const totalWidth = textWidth + gap + iconSize;
    textX = centerX - totalWidth / 2;
  }

  const iconX = textX + textWidth + gap;
  const iconY = centerY - iconSize / 2;

  context.fillStyle = '#202321';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(label, textX, centerY);
  if (weaponIconImg) {
    context.drawImage(weaponIconImg, iconX, iconY, iconSize, iconSize);
  }
  context.restore();
};

const drawModularDescription = (context, y, height, description, hyphenate, singleTextStyle, resourceImages, accent = '#c46f1f') => {
  const x = 314;
  const maxWidth = 1260;
  const text = description.trim() || DESCRIPTION_PREVIEW_TEXT;
  const isPreview = !description.trim();
  const isNarrativeStyle = singleTextStyle === 'narrative';
  const fontSize = isNarrativeStyle ? 50 : 45;
  const lineHeight = isNarrativeStyle ? 66 : 61;
  const top = isNarrativeStyle ? y + 36 : y + 106;
  const bottom = isNarrativeStyle ? y + height - 58 : y + height - 30;

  context.save();
  context.font = `${isNarrativeStyle ? 'italic ' : 'italic '}400 ${fontSize}px Lato, Arial, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = isPreview ? 'rgba(29,33,32,0.42)' : '#171a19';
  const items = getDescriptionFlowItems(context, text, maxWidth, lineHeight, hyphenate, {
    ignoreIcons: isNarrativeStyle,
    paragraphGapScale: 0.12,
  });
  const totalTextHeight = items.reduce((total, item) => total + item.height, 0);
  let cursorY = isNarrativeStyle
    ? top + Math.max(0, (bottom - top - totalTextHeight) / 2)
    : top;

  items.forEach((item) => {
    if (cursorY + item.height > bottom) return;
    if (item.type === 'separator') {
      context.strokeStyle = 'rgba(181,92,18,0.45)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x + 70, cursorY + lineHeight / 2);
      context.lineTo(x + maxWidth - 70, cursorY + lineHeight / 2);
      context.stroke();
    } else if (item.line) {
      if (item.isLore) {
        context.font = `italic 700 ${Math.max(38, fontSize - 5)}px Lato, Arial, sans-serif`;
        context.fillStyle = accent;
        drawTextLineWithIcons(context, item.line, x, cursorY, maxWidth, 'center', resourceImages, true);
      } else {
        context.font = `${isNarrativeStyle ? 'italic ' : 'italic '}${isNarrativeStyle ? '700' : '400'} ${fontSize}px Lato, Arial, sans-serif`;
        context.fillStyle = isPreview ? 'rgba(29,33,32,0.42)' : (isNarrativeStyle ? accent : '#171a19');
        drawTextLineWithIcons(
          context,
          item.line,
          x,
          cursorY,
          maxWidth,
          isNarrativeStyle ? 'center' : false,
          resourceImages,
          isNarrativeStyle || item.isLore,
        );
      }
    }
    cursorY += item.height;
  });
  context.restore();
};

const getModularContainerHeight = (blockId, remainingHeight, isLast, descriptionUnits = 1) => {
  if (blockId === 'range') return 285;
  if (blockId === 'consumption') return 190;
  if (blockId === 'damage') return 180;
  if (blockId === 'traits') return 190;
  if (blockId === 'minion') return 0;
  if (blockId === 'charge') return 0;
  if (blockId === 'description') {
    return Math.max(MODULAR_DESCRIPTION_UNIT_HEIGHT, MODULAR_DESCRIPTION_UNIT_HEIGHT * descriptionUnits);
  }
  return 180;
};

const getRenderableCardContainers = (containers) => (
  containers
    .map((container, index) => normalizeCardContainer(container, index))
    .filter((block) => block.id !== 'minion' && block.id !== 'charge')
);

const getDescriptionUnitBudget = (containers, cardType = 'weapon') => {
  const blocks = getRenderableCardContainers(containers, cardType);
  const descriptionCount = blocks.filter((block) => block.id === 'description').length;
  if (descriptionCount === 0) return 0;

  const fixedHeight = blocks.reduce((total, block) => {
    if (block.id === 'description') return total;
    return total + getModularContainerHeight(block.id, 0, false);
  }, 0);
  const hasChargeFooter = containers.some((container, index) => getContainerId(container, index) === 'charge');
  const footerHeight = hasChargeFooter ? CHARGE_FOOTER_RESERVED_HEIGHT : 0;
  const availableHeight = Math.max(0, 2386 - MODULAR_CONTENT_TOP - fixedHeight - footerHeight);
  return Math.max(descriptionCount, Math.min(descriptionCount * 6, Math.floor(availableHeight / MODULAR_DESCRIPTION_UNIT_HEIGHT)));
};

const clampDescriptionUnits = (requestedUnits, usedUnits, remainingDescriptions, totalBudget) => {
  const parsedUnits = parseInt(requestedUnits, 10);
  const desiredUnits = DESCRIPTION_SPACE_UNITS.includes(parsedUnits) ? parsedUnits : 1;
  const maxUnits = Math.max(1, totalBudget - usedUnits - remainingDescriptions);
  return Math.min(desiredUnits, maxUnits);
};

const drawCardCanvas = (
  canvas,
  image,
  cardName,
  cardType,
  traits,
  showTraits,
  description,
  flavorText,
  weaponType = 'Cuerpo a cuerpo',
  alcance = 0,
  diceType = 'D6',
  diceQty = 1,
  weaponIconImg = null,
  diceIconImg = null,
  chargeSlots = DEFAULT_CHARGE_SLOTS,
  consumptionSlots = DEFAULT_CONSUMPTION_SLOTS,
  resourceMode = RESOURCE_MODE_BOTH,
  resourceImages = {},
  hyphenate = true,
  elementIconImg = null,
  customColorActive = false,
  customColor = '#c8aa6e',
  singleTextStyle = 'narrative',
  visibleTraitRows = 3,
  minionAttributes = DEFAULT_MINION_ATTRIBUTES,
  renderScale = 1,
  actionCenterMode = 'dado',
  actionAttributeImg = null,
  headerImageImg = null,
  cardContainers = getDefaultCardContainers(cardType),
  containerTraits = {},
  containerDescriptions = {},
  containerDescriptionSizes = {},
  containerDamage = {},
  containerConsumptions = {},
  stardustImg = null,
  diceIconImages = {},
) => {
  const targetWidth = Math.max(1, Math.round(CANVAS_WIDTH * renderScale));
  const targetHeight = Math.max(1, Math.round(CANVAS_HEIGHT * renderScale));
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = renderScale < 1 ? 'medium' : 'high';

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const accent = customColorActive && customColor ? customColor : '#c46f1f';
  const edgeGradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  edgeGradient.addColorStop(0, '#202223');
  edgeGradient.addColorStop(0.52, '#17191a');
  edgeGradient.addColorStop(1, '#0d0f10');
  context.fillStyle = edgeGradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.save();
  applyReferenceCardLayoutScale(context);
  drawModularFrame(context, accent, stardustImg);
  drawHeaderImageContainer(context, headerImageImg, cardName, accent, weaponIconImg, elementIconImg);

  const blockLabels = CARD_CONTAINER_TYPES.reduce((labels, block) => ({
    ...labels,
    [block.id]: block.label,
  }), {});
  const normalizedBlocks = cardContainers.map((container, index) => normalizeCardContainer(container, index));
  const hasChargeFooter = normalizedBlocks.some((block) => block.id === 'charge');
  const blocks = getRenderableCardContainers(cardContainers, cardType);
  if (blocks.length === 0 && !hasChargeFooter) {
    drawEmptyContainersMessage(context);
    context.restore();
    return;
  }

  const descriptionUnitBudget = getDescriptionUnitBudget(cardContainers, cardType);
  let usedDescriptionUnits = 0;
  const contentBottom = hasChargeFooter ? 2386 - CHARGE_FOOTER_RESERVED_HEIGHT : 2386;
  let y = MODULAR_CONTENT_TOP;

  blocks.forEach((block, index) => {
    const blockId = block.id;
    const blockKey = block.key;
    const remainingDescriptionCount = blocks.slice(index + 1).filter((nextBlock) => nextBlock.id === 'description').length;
    const descriptionUnits = blockId === 'description'
      ? clampDescriptionUnits(
        containerDescriptionSizes[blockKey] || 1,
        usedDescriptionUnits,
        remainingDescriptionCount,
        descriptionUnitBudget,
      )
      : 1;
    if (y >= contentBottom - 120) return;
    const remainingHeight = contentBottom - y;
    const blockHeight = Math.min(
      remainingHeight,
      getModularContainerHeight(blockId, remainingHeight, index === blocks.length - 1, descriptionUnits),
    );
    const label = blockLabels[blockId] || blockId;
    const blockCenterY = getModularBlockCenterY(y, blockHeight);

    if (blockId !== 'consumption' && blockId !== 'range' && blockId !== 'description') {
      drawContainerLabel(context, label, blockCenterY, accent);
    } else if (blockId === 'description' && singleTextStyle !== 'narrative') {
      drawContainerLabel(context, label, y + 50, accent);
    }

    if (blockId === 'range') {
      drawModularRange(context, y, blockHeight, alcance, accent);
    } else if (blockId === 'consumption') {
      drawModularConsumption(
        context,
        blockCenterY,
        containerConsumptions[blockKey]?.slots || DEFAULT_CONSUMPTION_SLOTS,
        resourceImages,
        accent,
      );
    } else if (blockId === 'damage') {
      const damageConfig = containerDamage[blockKey] || DEFAULT_CONTAINER_DAMAGE;
      const damageDiceType = damageConfig.diceType || DEFAULT_CONTAINER_DAMAGE.diceType;
      drawModularDamage(
        context,
        blockCenterY,
        diceIconImages[damageDiceType] || diceIconImg,
        damageConfig.diceQty || DEFAULT_CONTAINER_DAMAGE.diceQty,
        damageDiceType,
      );
    } else if (blockId === 'traits') {
      drawModularTraits(
        context,
        blockCenterY,
        showTraits ? (containerTraits[blockKey] || traits).slice(0, MAX_TRAITS_PER_CONTAINER) : [],
        1,
        accent,
      );
    } else if (blockId === 'minion') {
      // Placeholder: se gestiona desde el menú, pero todavía no se renderiza.
    } else if (blockId === 'description') {
      drawModularDescription(
        context,
        y,
        blockHeight,
        containerDescriptions[blockKey] ?? description,
        hyphenate,
        singleTextStyle,
        resourceImages,
        accent,
      );
    }

    const dividerY = y + blockHeight - 14;
    if (dividerY < contentBottom - 18) {
      drawContainerDivider(context, dividerY, accent);
    }
    y += blockHeight;
    if (blockId === 'description') {
      usedDescriptionUnits += descriptionUnits;
    }
  });
  if (hasChargeFooter) {
    drawModularChargeFooter(context, chargeSlots, resourceImages, accent);
  }
  context.restore();
};

const getDeckAccessForViewer = (deck, viewerId) => {
  if (!deck?.isMasterLibrary) return COLLECTION_ACCESS_EDIT;
  return deck.permissions?.[viewerId] || COLLECTION_ACCESS_HIDDEN;
};

const getLibraryCardType = (builderCardType) => {
  if (builderCardType === 'skill') return 'minion';
  if (['weapon', 'armor', 'trap', 'action', 'status'].includes(builderCardType)) return builderCardType;
  return 'action';
};

const MASTER_LIBRARY_TYPE_TARGETS = {
  action: { name: 'Acciones', aliases: ['accion', 'acciones', 'accion rapida', 'acciones universales'] },
  weapon: { name: 'Armas', aliases: ['arma', 'armas'] },
  armor: { name: 'Armaduras', aliases: ['armadura', 'armaduras'] },
  trap: { name: 'Trampas', aliases: ['trampa', 'trampas'] },
  status: { name: 'Estados', aliases: ['estado', 'estados'] },
  minion: { name: 'Minions', aliases: ['minion', 'minions'] },
  skill: { name: 'Habilidades', aliases: ['habilidad', 'habilidades', 'skill', 'skills'] },
  attribute: { name: 'Atributos', aliases: ['atributo', 'atributos'] }
};

const normalizeLibraryName = (value = '') => (
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

const getSafeFileSlug = (value) => (
  normalizeCardName(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'carta'
);

const CardBuilder = ({ onBack, mode = 'player', characterName = '', currentUserId = '' }) => {
  const canvasRef = useRef(null);
  const descriptionRef = useRef(null);
  const flavorTextRef = useRef(null);
  const containerDescriptionRefs = useRef({});
  const imageCacheRef = useRef(new Map());
  const imageLoadCacheRef = useRef(new Map());
  const activeImageRef = useRef(null);
  const headerImageInputRef = useRef(null);
  const fontLoadPromiseRef = useRef(null);
  const drawSequenceRef = useRef(0);
  const drawTimerRef = useRef(null);
  const drawFrameRef = useRef(null);
  const [cardName, setCardName] = useState('Gris');
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [flavorText, setFlavorText] = useState(DEFAULT_FLAVOR_TEXT);
  const [focusedField, setFocusedField] = useState(null);
  const [activeDescriptionKey, setActiveDescriptionKey] = useState(null);
  const [focusedDescriptionKey, setFocusedDescriptionKey] = useState(null);
  const [hyphenate, setHyphenate] = useState(true);
  const [singleTextStyle, setSingleTextStyle] = useState('principal'); // 'narrative' or 'principal'
  const [cardType, setCardType] = useState('weapon');
  const [showTraits, setShowTraits] = useState(true);
  const [visibleTraitRows, setVisibleTraitRows] = useState(3);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [containerTraits, setContainerTraits] = useState({});
  const [containerDescriptions, setContainerDescriptions] = useState({});
  const [containerDescriptionSizes, setContainerDescriptionSizes] = useState({});
  const [containerDamage, setContainerDamage] = useState({});
  const [containerConsumptions, setContainerConsumptions] = useState({});
  const [selectedBackground, setSelectedBackground] = useState('Gris.webp');
  const [headerImageSrc, setHeaderImageSrc] = useState('');
  const [cardContainers, setCardContainers] = useState(getDefaultCardContainers('weapon'));
  const [imageStatus, setImageStatus] = useState('loading');
  const [selectedElement, setSelectedElement] = useState('Ninguno');
  const [customColorActive, setCustomColorActive] = useState(false);
  const [customColor, setCustomColor] = useState('#c8aa6e');
  const [descriptionFormatColor, setDescriptionFormatColor] = useState('#ffffff');
  const [isUploadingCharacterCard, setIsUploadingCharacterCard] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // New states for Weapon properties
  const [weaponType, setWeaponType] = useState('Cuerpo a cuerpo');
  const [alcance, setAlcance] = useState(0); // 0: Toque, 1: Cercano, 2: Intermedio, 3: Lejano, 4: Extremo
  const [diceType, setDiceType] = useState('D6'); // D4, D6, D8, D10, D12
  const [diceQty, setDiceQty] = useState(1);
  const [chargeSlots, setChargeSlots] = useState(DEFAULT_CHARGE_SLOTS);
  const [consumptionSlots, setConsumptionSlots] = useState(DEFAULT_CONSUMPTION_SLOTS);
  const [resourceMode, setResourceMode] = useState(RESOURCE_MODE_BOTH);
  const [consumptionSlotTypes, setConsumptionSlotTypes] = useState(
    DEFAULT_CONTAINER_CONSUMPTION_TYPES,
  );
  const [minionAttributes, setMinionAttributes] = useState(DEFAULT_MINION_ATTRIBUTES);
  const [actionCenterMode, setActionCenterMode] = useState('dado'); // 'dado' | 'Mente' | 'Cuerpo' | 'Hambre'

  // History system for undo/redo
  const descriptionHistoryRef = useRef({ past: [], future: [] });
  const flavorTextHistoryRef = useRef({ past: [], future: [] });
  const lastHistoryPushRef = useRef(0);

  const saveToHistory = (historyRef, currentValue) => {
    const hist = historyRef.current;
    const lastPast = hist.past[hist.past.length - 1];
    if (lastPast === currentValue) return;

    const now = Date.now();
    const isSingleCharDiff = lastPast && Math.abs(lastPast.length - currentValue.length) === 1;
    if (isSingleCharDiff && now - lastHistoryPushRef.current < 1500 && hist.past.length > 0) {
      lastHistoryPushRef.current = now;
      return;
    }

    hist.past.push(currentValue);
    if (hist.past.length > 100) {
      hist.past.shift();
    }
    hist.future = [];
    lastHistoryPushRef.current = now;
  };

  const handleDescriptionChange = (newVal) => {
    saveToHistory(descriptionHistoryRef, description);
    setDescription(newVal);
  };

  const handleFlavorTextChange = (newVal) => {
    saveToHistory(flavorTextHistoryRef, flavorText);
    setFlavorText(newVal);
  };

  const handleTextareaKeyDown = (event, ref, stateSetter, historyRef, currentValue) => {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';
    const isRedo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y';

    if (isUndo) {
      event.preventDefault();
      const hist = historyRef.current;
      if (hist.past.length > 0) {
        const previousValue = hist.past.pop();
        hist.future.push(currentValue);
        stateSetter(previousValue);
      }
    } else if (isRedo) {
      event.preventDefault();
      const hist = historyRef.current;
      if (hist.future.length > 0) {
        const nextValue = hist.future.pop();
        hist.past.push(currentValue);
        stateSetter(nextValue);
      }
    }
  };

  // Auto-detect if slot contains an element to sync UI dropdown toggle state
  useEffect(() => {
    setConsumptionSlotTypes((prev) => {
      const next = [...prev].slice(0, RESOURCE_SLOT_COUNT);
      let changed = false;
      while (next.length < RESOURCE_SLOT_COUNT) {
        next.push('consumption');
        changed = true;
      }
      consumptionSlots.slice(0, RESOURCE_SLOT_COUNT).forEach((slot, index) => {
        const isElement = ELEMENT_TYPES.some((el) => el.id !== 'Ninguno' && el.id === slot);
        const expectedType = isElement ? 'element' : 'consumption';
        if (next[index] !== expectedType && slot !== '') {
          next[index] = expectedType;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [consumptionSlots]);

  // Automatically detect weapon type from cardName
  useEffect(() => {
    if (cardType !== 'weapon') return;
    const nameLower = cardName.toLowerCase();
    const matchedType = WEAPON_TYPE_ALIASES.find(({ aliases }) => (
      aliases.some((alias) => nameLower.includes(alias))
    ));
    if (matchedType) {
      setWeaponType(matchedType.type);
    }
  }, [cardName, cardType]);

  const activeBackground = useMemo(
    () => CARD_BACKGROUNDS.find((background) => background.file === selectedBackground) || CARD_BACKGROUNDS[0],
    [selectedBackground],
  );
  const activeType = useMemo(
    () => CARD_TYPES.find((type) => type.id === cardType) || CARD_TYPES[0],
    [cardType],
  );
  const hasSplitDescription = usesSplitDescription(activeType, showTraits);

  const descriptionMaxLength = useMemo(() => {
    const hasRails = activeType.id === 'weapon' || activeType.id === 'armor' || activeType.id === 'trap' || activeType.id === 'skill';
    let baseHeight = hasRails ? 740 : 895;

    let yOffset = 0;
    if (showTraits) {
      if (activeType.id === 'weapon') {
        const activeRows = Math.min(visibleTraitRows, 3);
        const hiddenRows = 3 - activeRows;
        yOffset = hiddenRows * 240;
      } else if (activeType.id === 'skill') {
        const activeRows = Math.min(visibleTraitRows, 2);
        const hiddenRows = 2 - activeRows;
        yOffset = hiddenRows * 240;
      } else if (activeType.id === 'armor') {
        const activeRows = Math.min(visibleTraitRows, 4);
        const hiddenRows = 4 - activeRows;
        yOffset = hiddenRows * 230;
      }
    }

    let finalHeight = baseHeight + yOffset;

    if (!showTraits) {
      if (activeType.id === 'weapon') {
        finalHeight = 1465;
      } else if (activeType.id === 'armor') {
        finalHeight = 1772;
      } else if (activeType.id === 'skill') {
        finalHeight = 1233;
      }
    }

    if (activeType.id === 'trap') {
      if (showTraits) {
        finalHeight = 1465;
      } else {
        finalHeight = 1772;
      }
    }

    return Math.round(520 * (finalHeight / 740));
  }, [activeType, showTraits, visibleTraitRows]);

  const loadCachedImage = useCallback(async (src) => {
    const cachedImage = imageCacheRef.current.get(src);
    if (cachedImage) return cachedImage;

    const pendingLoad = imageLoadCacheRef.current.get(src);
    if (pendingLoad) return pendingLoad;

    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        imageLoadCacheRef.current.delete(src);
        resolve(img);
      };
      img.onerror = (error) => {
        imageLoadCacheRef.current.delete(src);
        reject(error);
      };
    });

    imageLoadCacheRef.current.set(src, loadPromise);
    return loadPromise;
  }, []);

  const drawCard = useCallback(async (targetCanvas = canvasRef.current, renderScale = getPreviewRenderScale(), updateStatus = true) => {
    const canvas = targetCanvas;
    if (!canvas) return undefined;
    const drawId = drawSequenceRef.current + 1;
    if (updateStatus) {
      drawSequenceRef.current = drawId;
    }

    if (document.fonts?.load) {
      try {
        if (!fontLoadPromiseRef.current) {
          fontLoadPromiseRef.current = document.fonts.load('700 96px Cinzel');
        }
        await fontLoadPromiseRef.current;
      } catch {
        // If font loading is unavailable, the canvas still renders with the fallback serif.
      }
    }
    if (updateStatus && drawId !== drawSequenceRef.current) return undefined;

    let headerImageImg = null;
    if (headerImageSrc) {
      try {
        headerImageImg = await loadCachedImage(headerImageSrc);
      } catch (e) {
        console.error("Could not load header image:", e);
      }
    }

    let stardustImg = null;
    try {
      stardustImg = await loadCachedImage(`${process.env.PUBLIC_URL || ''}/interfaz/stardust.png`);
    } catch (e) {
      console.error("Could not load stardust image:", e);
    }

    let weaponIconImg = null;
    let diceIconImg = null;
    const diceIconImages = {};
    const resourceImages = {};
    const normalizedContainers = cardContainers.map((container, index) => normalizeCardContainer(container, index));
    const usesDamageContainer = normalizedContainers.some((container) => container.id === 'damage');
    const usesConsumptionContainer = normalizedContainers.some((container) => container.id === 'consumption');
    const usesTraitsContainer = normalizedContainers.some((container) => container.id === 'traits');
    const usesChargeContainer = normalizedContainers.some((container) => container.id === 'charge');

    if (cardType === 'weapon' || cardType === 'skill') {
      const iconSrc = getWeaponTypeIconSrc(weaponType);
      try {
        weaponIconImg = await loadCachedImage(iconSrc);
      } catch (e) {
        console.error("Could not load weapon type icon:", e);
      }
    }

    let actionAttributeImg = null;
    if (cardType === 'action' && actionCenterMode !== 'dado') {
      const attrSrc = `${process.env.PUBLIC_URL || ''}/interfaz/acciones/${actionCenterMode}.webp`;
      try {
        actionAttributeImg = await loadCachedImage(attrSrc);
      } catch (e) {
        console.error("Could not load action attribute image:", e);
      }
    }

    if (usesDamageContainer) {
      const damageDiceTypes = Array.from(new Set([
        diceType,
        ...normalizedContainers
          .filter((container) => container.id === 'damage')
          .map((container) => containerDamage[container.key]?.diceType || DEFAULT_CONTAINER_DAMAGE.diceType),
      ]));
      await Promise.all(damageDiceTypes.map(async (type) => {
        const diceSrc = `${process.env.PUBLIC_URL || ''}/dados/cartas/${type}.webp`;
        try {
          const loadedDice = await loadCachedImage(diceSrc);
          diceIconImages[type] = loadedDice;
          if (type === diceType) diceIconImg = loadedDice;
        } catch (e) {
          console.error("Could not load dice icon image:", e);
        }
      }));
    }

    const loadsChargeResources = usesChargeContainer;
    const loadsConsumptionResources = usesConsumptionContainer && ((cardType === 'action' && actionCenterMode === 'dado') || (
      RESOURCE_CARD_TYPES.has(cardType) && (resourceMode === RESOURCE_MODE_BOTH || resourceMode === RESOURCE_MODE_CONSUMPTION_ONLY)
    ) || cardType === 'status');
    const loadsMinionAttributes = usesTraitsContainer && cardType === 'skill';

    if (loadsChargeResources || loadsConsumptionResources || loadsMinionAttributes) {
      const resourceOptions = [
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `charge:${option.id}` })),
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `attribute:${option.id}` })),
        ...CONSUMPTION_TYPES.map((option) => ({ ...option, cacheKey: `consumption:${option.id}` })),
        ...ELEMENT_TYPES.filter((option) => option.id !== 'Ninguno').map((option) => ({
          id: option.id,
          label: option.label,
          src: ELEMENT_CONSUMPTION_ICON_SOURCES[option.id] || `/elementos/${option.id}.webp`,
          cacheKey: `consumption:${option.id}`,
        })),
      ];
      const allConsumptionSlots = [
        ...consumptionSlots,
        ...normalizedContainers
          .filter((container) => container.id === 'consumption')
          .flatMap((container) => containerConsumptions[container.key]?.slots || DEFAULT_CONSUMPTION_SLOTS),
      ];
      const requiredResourceOptions = resourceOptions.filter((option) => (
        loadsChargeResources && chargeSlots.includes(option.id) && option.cacheKey.startsWith('charge:')
      ) || (
        loadsConsumptionResources && allConsumptionSlots.includes(option.id) && option.cacheKey.startsWith('consumption:')
      ) || (
        loadsConsumptionResources && option.id === 'Tiempo' && option.cacheKey === 'consumption:Tiempo'
      ) || (
        loadsMinionAttributes && MINION_ATTRIBUTE_TYPES.includes(option.id) && option.cacheKey.startsWith('attribute:')
      ));

      await Promise.all(requiredResourceOptions.map(async (option) => {
        const src = `${process.env.PUBLIC_URL || ''}${option.src}`;
        let icon = null;
        try {
          icon = await loadCachedImage(src);
        } catch (e) {
          console.error(`Could not load resource icon: ${option.cacheKey}`, e);
        }
        if (icon) {
          resourceImages[option.cacheKey] = icon;
        }
      }));
    }

    let elementIconImg = null;
    if (selectedElement !== 'Ninguno') {
      const elementSrc = `${process.env.PUBLIC_URL || ''}${HEADER_ICON_SOURCES[selectedElement] || `/cabecera/${selectedElement.toLowerCase()}.webp`}`;
      try {
        elementIconImg = await loadCachedImage(elementSrc);
      } catch (e) {
        console.error("Could not load element icon image:", e);
      }
    }

    // 1.5 Load explicit description icon tokens inserted from the icon compendium.
    const textToScan = [
      description,
      flavorText,
      ...Object.values(containerDescriptions),
    ].join(' ');
    const matchedKeywords = extractDescriptionIconIds(textToScan);
    if (matchedKeywords.length > 0) {
      await Promise.all(matchedKeywords.map(async (iconId) => {
        const src = `${process.env.PUBLIC_URL || ''}${KEYWORD_ICONS[iconId]}`;
        let icon = null;
        try {
          icon = await loadCachedImage(src);
        } catch (e) {
          console.error(`Could not load description icon: ${iconId}`, e);
        }
        if (icon) {
          resourceImages[`keyword:${iconId}`] = icon;
        }
      }));
    }

    if (updateStatus && drawId !== drawSequenceRef.current) return undefined;

    // 2. Draw the card canvas.
    drawCardCanvas(
      canvas,
      null,
      cardName,
      cardType,
      traits,
      showTraits,
      description,
      flavorText,
      weaponType,
      alcance,
      diceType,
      diceQty,
      weaponIconImg,
      diceIconImg,
      chargeSlots,
      consumptionSlots,
      resourceMode,
      resourceImages,
      hyphenate,
      elementIconImg,
      customColorActive,
      customColor,
      singleTextStyle,
      visibleTraitRows,
      minionAttributes,
      renderScale,
      actionCenterMode,
      actionAttributeImg,
      headerImageImg,
      cardContainers,
      containerTraits,
      containerDescriptions,
      containerDescriptionSizes,
      containerDamage,
      containerConsumptions,
      stardustImg,
      diceIconImages,
    );

    if (updateStatus) setImageStatus('ready');
    return undefined;
  }, [cardName, cardType, traits, showTraits, description, flavorText, weaponType, alcance, diceType, diceQty, chargeSlots, consumptionSlots, resourceMode, hyphenate, selectedElement, customColorActive, customColor, singleTextStyle, visibleTraitRows, minionAttributes, loadCachedImage, actionCenterMode, headerImageSrc, cardContainers, containerTraits, containerDescriptions, containerDescriptionSizes, containerDamage, containerConsumptions]);

  useEffect(() => {
    let disposed = false;

    drawTimerRef.current = window.setTimeout(() => {
      drawFrameRef.current = window.requestAnimationFrame(() => {
        Promise.resolve(drawCard()).then(() => {
          if (disposed) return;
        });
      });
    }, 35);

    return () => {
      disposed = true;
      if (drawTimerRef.current) {
        window.clearTimeout(drawTimerRef.current);
        drawTimerRef.current = null;
      }
      if (drawFrameRef.current) {
        window.cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = null;
      }
    };
  }, [drawCard]);

  useEffect(() => {
    const preload = () => {
      const commonSources = [
        `${process.env.PUBLIC_URL || ''}/interfaz/stardust.png`,
        ...WEAPON_TYPES.map((type) => getWeaponTypeIconSrc(type)),
        ...['D4', 'D6', 'D8', 'D10', 'D12', 'DX'].map((type) => `${process.env.PUBLIC_URL || ''}/dados/cartas/${type}.webp`),
        ...CHARGE_TYPES.map((option) => `${process.env.PUBLIC_URL || ''}${option.src}`),
        ...CONSUMPTION_TYPES.map((option) => `${process.env.PUBLIC_URL || ''}${option.src}`),
      ];

      commonSources.forEach((src) => {
        loadCachedImage(src).catch(() => {});
      });
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(preload, 750);
    return () => window.clearTimeout(timeoutId);
  }, [loadCachedImage]);

  useEffect(() => {
    let disposed = false;

    Promise.resolve(loadCachedImage(activeBackground.src)).then((image) => {
      if (disposed) {
        return;
      }
      imageCacheRef.current.set(activeBackground.src, image);
    }).catch(() => {
      if (!disposed) setImageStatus('error');
    });

    return () => {
      disposed = true;
    };
  }, [activeBackground.src, loadCachedImage]);

  useEffect(() => {
    CARD_BACKGROUNDS.forEach((background) => {
      if (imageCacheRef.current.has(background.src)) return;
      loadCachedImage(background.src).catch(() => {});
    });
  }, [loadCachedImage]);

  useEffect(() => {
    const normalizedContainers = cardContainers.map((container, index) => normalizeCardContainer(container, index));
    const traitKeys = new Set(normalizedContainers.filter((container) => container.id === 'traits').map((container) => container.key));
    const descriptionKeys = new Set(normalizedContainers.filter((container) => container.id === 'description').map((container) => container.key));
    const damageKeys = new Set(normalizedContainers.filter((container) => container.id === 'damage').map((container) => container.key));
    const consumptionKeys = new Set(normalizedContainers.filter((container) => container.id === 'consumption').map((container) => container.key));

    setContainerTraits((currentTraits) => {
      let changed = false;
      const nextTraits = {};
      traitKeys.forEach((key) => {
        nextTraits[key] = currentTraits[key] || Array.from({ length: MAX_TRAITS_PER_CONTAINER }, () => '-');
        if (!currentTraits[key]) changed = true;
      });
      if (Object.keys(currentTraits).some((key) => !traitKeys.has(key))) changed = true;
      return changed ? nextTraits : currentTraits;
    });

    setContainerDescriptions((currentDescriptions) => {
      let changed = false;
      const nextDescriptions = {};
      descriptionKeys.forEach((key) => {
        nextDescriptions[key] = currentDescriptions[key] ?? '';
        if (!Object.prototype.hasOwnProperty.call(currentDescriptions, key)) changed = true;
      });
      if (Object.keys(currentDescriptions).some((key) => !descriptionKeys.has(key))) changed = true;
      return changed ? nextDescriptions : currentDescriptions;
    });

    setContainerDescriptionSizes((currentSizes) => {
      let changed = false;
      const nextSizes = {};
      descriptionKeys.forEach((key) => {
        nextSizes[key] = currentSizes[key] || 1;
        if (!currentSizes[key]) changed = true;
      });
      if (Object.keys(currentSizes).some((key) => !descriptionKeys.has(key))) changed = true;
      return changed ? nextSizes : currentSizes;
    });

    setContainerDamage((currentDamage) => {
      let changed = false;
      const nextDamage = {};
      damageKeys.forEach((key) => {
        nextDamage[key] = currentDamage[key] || { ...DEFAULT_CONTAINER_DAMAGE };
        if (!currentDamage[key]) changed = true;
      });
      if (Object.keys(currentDamage).some((key) => !damageKeys.has(key))) changed = true;
      return changed ? nextDamage : currentDamage;
    });

    setContainerConsumptions((currentConsumptions) => {
      let changed = false;
      const nextConsumptions = {};
      consumptionKeys.forEach((key) => {
        nextConsumptions[key] = currentConsumptions[key] || createDefaultContainerConsumption();
        if (!currentConsumptions[key]) changed = true;
      });
      if (Object.keys(currentConsumptions).some((key) => !consumptionKeys.has(key))) changed = true;
      return changed ? nextConsumptions : currentConsumptions;
    });
  }, [cardContainers]);

  const handleReset = () => {
    setCardName('Gris');
    setDescription(DEFAULT_DESCRIPTION);
    setContainerDescriptions({});
    setContainerDescriptionSizes({});
    setContainerDamage({});
    setContainerConsumptions({});
    setFlavorText(DEFAULT_FLAVOR_TEXT);
    setHyphenate(true);
    setCardType('weapon');
    setCardContainers(getDefaultCardContainers('weapon'));
    setShowTraits(true);
    setVisibleTraitRows(3);
    setTraits(DEFAULT_TRAITS);
    setContainerTraits({});
    setSelectedBackground('Gris.webp');
    setHeaderImageSrc('');
    setWeaponType('Cuerpo a cuerpo');
    setAlcance(0);
    setDiceType('D6');
    setDiceQty(1);
    setChargeSlots(DEFAULT_CHARGE_SLOTS);
    setConsumptionSlots(DEFAULT_CONSUMPTION_SLOTS);
    setResourceMode(RESOURCE_MODE_BOTH);
    setConsumptionSlotTypes(DEFAULT_CONTAINER_CONSUMPTION_TYPES);
    setMinionAttributes(DEFAULT_MINION_ATTRIBUTES);
    setSelectedElement('Ninguno');
    setCustomColorActive(false);
    setCustomColor('#c8aa6e');
    setDescriptionFormatColor('#ffffff');
    setActionCenterMode('dado');
    setSingleTextStyle('principal');
    setActiveDescriptionKey(null);
    setFocusedDescriptionKey(null);
  };

  const handleTraitChange = (index, value) => {
    setTraits((currentTraits) => {
      const nextTraits = [...currentTraits];
      nextTraits[index] = value;
      return nextTraits;
    });
  };

  const handleContainerTraitChange = (containerKey, index, value) => {
    setContainerTraits((currentTraits) => {
      const nextTraits = [...(currentTraits[containerKey] || Array.from({ length: MAX_TRAITS_PER_CONTAINER }, () => '-'))]
        .slice(0, MAX_TRAITS_PER_CONTAINER);
      nextTraits[index] = value;
      return {
        ...currentTraits,
        [containerKey]: nextTraits,
      };
    });
  };

  const handleContainerDescriptionChange = (containerKey, value) => {
    setContainerDescriptions((currentDescriptions) => ({
      ...currentDescriptions,
      [containerKey]: value,
    }));
  };

  const handleContainerDescriptionSizeChange = (containerKey, value) => {
    const parsed = parseInt(value, 10);
    const nextValue = DESCRIPTION_SPACE_UNITS.includes(parsed) ? parsed : 1;
    setContainerDescriptionSizes((currentSizes) => ({
      ...currentSizes,
      [containerKey]: nextValue,
    }));
  };

  const handleChargeSlotChange = (index, value) => {
    setChargeSlots((currentSlots) => {
      const nextSlots = [...currentSlots].slice(0, CHARGE_SLOT_COUNT);
      while (nextSlots.length < CHARGE_SLOT_COUNT) nextSlots.push(EMPTY_SLOT);
      nextSlots[index] = value;
      return nextSlots;
    });
  };

  const handleConsumptionSlotChange = (index, value) => {
    setConsumptionSlots((currentSlots) => {
      const nextSlots = [...currentSlots].slice(0, RESOURCE_SLOT_COUNT);
      nextSlots[index] = value;
      return nextSlots;
    });
  };

  const handleContainerDamageChange = (containerKey, updates) => {
    setContainerDamage((currentDamage) => {
      const currentConfig = currentDamage[containerKey] || { ...DEFAULT_CONTAINER_DAMAGE };
      const nextConfig = {
        ...currentConfig,
        ...updates,
      };
      if (updates.diceQty !== undefined) {
        const parsedQty = parseInt(updates.diceQty, 10);
        nextConfig.diceQty = Number.isFinite(parsedQty) ? Math.min(MAX_DAMAGE_DICE_QTY, Math.max(1, parsedQty)) : 1;
      }
      return {
        ...currentDamage,
        [containerKey]: nextConfig,
      };
    });
  };

  const handleContainerConsumptionSlotChange = (containerKey, index, value) => {
    setContainerConsumptions((currentConsumptions) => {
      const currentConfig = currentConsumptions[containerKey] || createDefaultContainerConsumption();
      const nextSlots = [...currentConfig.slots].slice(0, RESOURCE_SLOT_COUNT);
      while (nextSlots.length < RESOURCE_SLOT_COUNT) nextSlots.push(EMPTY_SLOT);
      nextSlots[index] = value;
      return {
        ...currentConsumptions,
        [containerKey]: {
          ...currentConfig,
          slots: nextSlots,
        },
      };
    });
  };

  const handleContainerConsumptionSlotTypeToggle = (containerKey, index) => {
    setContainerConsumptions((currentConsumptions) => {
      const currentConfig = currentConsumptions[containerKey] || createDefaultContainerConsumption();
      const nextTypes = [...(currentConfig.slotTypes || DEFAULT_CONTAINER_CONSUMPTION_TYPES)].slice(0, RESOURCE_SLOT_COUNT);
      while (nextTypes.length < RESOURCE_SLOT_COUNT) nextTypes.push('consumption');
      const currentType = nextTypes[index] || 'consumption';
      nextTypes[index] = currentType === 'consumption' ? 'element' : 'consumption';
      const nextSlots = [...(currentConfig.slots || DEFAULT_CONSUMPTION_SLOTS)].slice(0, RESOURCE_SLOT_COUNT);
      while (nextSlots.length < RESOURCE_SLOT_COUNT) nextSlots.push(EMPTY_SLOT);
      nextSlots[index] = EMPTY_SLOT;
      return {
        ...currentConsumptions,
        [containerKey]: {
          ...currentConfig,
          slots: nextSlots,
          slotTypes: nextTypes,
        },
      };
    });
  };

  const handleMinionAttributeChange = (attribute, value) => {
    const parsed = parseInt(value, 10);
    const nextValue = Number.isFinite(parsed) ? Math.min(99, Math.max(0, parsed)) : 0;
    setMinionAttributes((currentAttributes) => ({
      ...currentAttributes,
      [attribute]: nextValue,
    }));
  };

  const handleDiceQtyChange = (value) => {
    setDiceQty(Math.min(MAX_DAMAGE_DICE_QTY, Math.max(1, value)));
  };

  const handleHeaderImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setHeaderImageSrc(typeof reader.result === 'string' ? reader.result : '');
      setImageStatus('loading');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addCardContainer = (containerId) => {
    setCardContainers((current) => {
      if (current.length >= MAX_CARD_CONTAINERS) return current;
      if (
        SINGLE_INSTANCE_CARD_CONTAINERS.has(containerId)
        && current.some((container, index) => getContainerId(container, index) === containerId)
      ) {
        return current;
      }
      const nextContainer = createCardContainer(containerId);
      if (containerId === 'charge') {
        return [...current, nextContainer];
      }
      const chargeIndex = current.findIndex((container, index) => getContainerId(container, index) === 'charge');
      if (chargeIndex === -1) {
        return [...current, nextContainer];
      }
      return [
        ...current.slice(0, chargeIndex),
        nextContainer,
        ...current.slice(chargeIndex),
      ];
    });
  };

  const removeCardContainer = (containerIndex) => {
    setCardContainers((current) => current.filter((_, index) => index !== containerIndex));
  };

  const moveCardContainer = (containerIndex, direction) => {
    setCardContainers((current) => {
      const index = containerIndex;
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      if (getContainerId(current[index], index) === 'charge') return current;
      if (getContainerId(current[nextIndex], nextIndex) === 'charge') return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleTypeChange = (typeId) => {
    setCardType(typeId);
    setCardContainers(getDefaultCardContainers(typeId));
    
    if (typeId !== 'trap') {
      setResourceMode(RESOURCE_MODE_BOTH);
    }
    
    // Ensure resource slots stay capped to the card layout count when switching type.
    if (typeId !== 'action') {
      setActionCenterMode('dado');
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots].slice(0, RESOURCE_SLOT_COUNT);
        while (nextSlots.length < RESOURCE_SLOT_COUNT) {
          nextSlots.push(EMPTY_SLOT);
        }
        return nextSlots;
      });
      setConsumptionSlotTypes((prevTypes) => {
        const nextTypes = [...prevTypes].slice(0, RESOURCE_SLOT_COUNT);
        while (nextTypes.length < RESOURCE_SLOT_COUNT) {
          nextTypes.push('consumption');
        }
        return nextTypes;
      });
    }
    if (typeId === 'trap') {
      setVisibleTraitRows(1);
      setShowTraits(true);
      setTraits((currentTraits) => {
        const nextTraits = [...currentTraits];
        nextTraits[0] = nextTraits[0]?.trim() ? nextTraits[0] : 'TRAMPA';
        return nextTraits;
      });
    } else if (typeId === 'status') {
      setVisibleTraitRows(1);
      setShowTraits(true);
      setTraits((currentTraits) => {
        const nextTraits = [...currentTraits];
        nextTraits[0] = nextTraits[0]?.trim() ? nextTraits[0] : 'ESTADO';
        return nextTraits;
      });
      setCardName((name) => name === 'Gris' ? 'ARDIENDO' : name);
      setSelectedElement('Fuego');
    } else if (typeId === 'armor') {
      setVisibleTraitRows(4);
      setConsumptionSlots((currentSlots) => {
        return currentSlots.slice(0, RESOURCE_SLOT_COUNT).map((slot, index) => (
          index === 0 ? 'Armadura_1' : slot === 'Armadura_1' ? slot : EMPTY_SLOT
        ));
      });
    } else if (typeId === 'action') {
      setVisibleTraitRows(0);
      setDiceQty((qty) => Math.min(MAX_DAMAGE_DICE_QTY, qty));
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots].slice(0, RESOURCE_SLOT_COUNT);
        nextSlots[0] = 'Tiempo';
        return nextSlots;
      });
    } else if (typeId === 'weapon') {
      setVisibleTraitRows(3);
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots].slice(0, RESOURCE_SLOT_COUNT);
        nextSlots[0] = 'Tiempo';
        return nextSlots;
      });
    } else if (typeId === 'skill') {
      setVisibleTraitRows(2);
    } else {
      setVisibleTraitRows(3);
    }
  };

  const findAnyEnclosingColorTag = (text, start, end) => {
    let tempStart = start;
    while (tempStart >= 16) {
      const sub = text.substring(tempStart - 16, tempStart);
      const match = sub.match(/\[color:(#[0-9a-fA-F]{6})\]\{$/);
      if (match) {
        const prefixColor = match[1];
        const prefixLength = match[0].length;

        let tempEnd = end;
        while (tempEnd < text.length) {
          if (text[tempEnd] === '}') {
            const insideText = text.substring(tempStart, tempEnd);
            let openBraces = 0;
            let hasMismatch = false;
            for (let char of insideText) {
              if (char === '{') openBraces++;
              if (char === '}') {
                if (openBraces === 0) {
                  hasMismatch = true;
                  break;
                }
                openBraces--;
              }
            }
            if (!hasMismatch && openBraces === 0) {
              return {
                found: true,
                startIdx: tempStart - prefixLength,
                endIdx: tempEnd + 1,
                innerText: insideText,
                color: prefixColor
              };
            }
          }
          tempEnd++;
        }
      }
      tempStart--;
    }
    return { found: false };
  };

  const applyFormat = (ref, formatType, colorVal = '') => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formatted = selectedText;
    let newStart = start;
    let newEnd = end;
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    if (formatType === 'bold') {
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        formatted = selectedText.slice(2, -2);
        selectionOffsetStart = 0;
        selectionOffsetEnd = formatted.length;
      } else {
        const match = selectedText.match(/^(\s*)(.*?)(\s*)$/);
        const leadingSpace = match ? match[1] : '';
        const trimmedText = match ? match[2] : selectedText;
        const trailingSpace = match ? match[3] : '';
        formatted = `${leadingSpace}**${trimmedText}**${trailingSpace}`;
        
        if (selectedText.length === 0) {
          selectionOffsetStart = 2;
          selectionOffsetEnd = 2;
        } else {
          selectionOffsetStart = leadingSpace.length;
          selectionOffsetEnd = leadingSpace.length + trimmedText.length + 4;
        }
      }
    } else if (formatType === 'italic') {
      if (selectedText.startsWith('*') && !selectedText.startsWith('**') && selectedText.endsWith('*') && !selectedText.endsWith('**')) {
        formatted = selectedText.slice(1, -1);
        selectionOffsetStart = 0;
        selectionOffsetEnd = formatted.length;
      } else {
        const match = selectedText.match(/^(\s*)(.*?)(\s*)$/);
        const leadingSpace = match ? match[1] : '';
        const trimmedText = match ? match[2] : selectedText;
        const trailingSpace = match ? match[3] : '';
        formatted = `${leadingSpace}*${trimmedText}*${trailingSpace}`;
        
        if (selectedText.length === 0) {
          selectionOffsetStart = 1;
          selectionOffsetEnd = 1;
        } else {
          selectionOffsetStart = leadingSpace.length;
          selectionOffsetEnd = leadingSpace.length + trimmedText.length + 2;
        }
      }
    } else if (formatType === 'separator') {
      const before = text.slice(0, start);
      const after = text.slice(end);
      const prefix = before.endsWith('\n') || before.length === 0 ? '' : '\n';
      const suffix = after.startsWith('\n') || after.length === 0 ? '' : '\n';
      formatted = `${prefix}---${suffix}`;
      selectionOffsetStart = formatted.length;
      selectionOffsetEnd = formatted.length;
    } else if (formatType === 'lore') {
      const fallback = 'Texto de lore';
      const loreText = selectedText || fallback;
      if (selectedText.startsWith(LORE_OPEN_TAG) && selectedText.endsWith(LORE_CLOSE_TAG)) {
        formatted = selectedText.slice(LORE_OPEN_TAG.length, -LORE_CLOSE_TAG.length);
        selectionOffsetStart = 0;
        selectionOffsetEnd = formatted.length;
      } else {
        formatted = `${LORE_OPEN_TAG}${loreText}${LORE_CLOSE_TAG}`;
        if (selectedText.length === 0) {
          selectionOffsetStart = LORE_OPEN_TAG.length;
          selectionOffsetEnd = LORE_OPEN_TAG.length + loreText.length;
        } else {
          selectionOffsetStart = 0;
          selectionOffsetEnd = formatted.length;
        }
      }
    } else if (formatType === 'color') {
      const anyColorMatch = selectedText.match(/^\[color:(#[0-9a-fA-F]{6})\]\{(.*)\}$/);
      if (anyColorMatch) {
        const existingColor = anyColorMatch[1];
        const innerText = anyColorMatch[2];
        if (existingColor === colorVal) {
          formatted = innerText;
          selectionOffsetStart = 0;
          selectionOffsetEnd = formatted.length;
        } else {
          formatted = `[color:${colorVal}]{${innerText}}`;
          selectionOffsetStart = 0;
          selectionOffsetEnd = formatted.length;
        }
      } else {
        const enclosing = findAnyEnclosingColorTag(text, start, end);
        if (enclosing.found) {
          if (enclosing.color === colorVal) {
            formatted = enclosing.innerText;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
            selectionOffsetStart = 0;
            selectionOffsetEnd = formatted.length;
          } else {
            formatted = `[color:${colorVal}]{${enclosing.innerText}}`;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
            selectionOffsetStart = 0;
            selectionOffsetEnd = formatted.length;
          }
        } else {
          formatted = `[color:${colorVal}]{${selectedText}}`;
          if (selectedText.length === 0) {
            selectionOffsetStart = 17; // Longitud de '[color:#ffffff]{'
            selectionOffsetEnd = 17;
          } else {
            selectionOffsetStart = 0;
            selectionOffsetEnd = formatted.length;
          }
        }
      }
    }

    const newText = text.substring(0, newStart) + formatted + text.substring(newEnd);
    
    if (ref === descriptionRef) {
      saveToHistory(descriptionHistoryRef, description);
      setDescription(newText);
    } else if (ref === flavorTextRef) {
      saveToHistory(flavorTextHistoryRef, flavorText);
      setFlavorText(newText);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart + selectionOffsetStart, newStart + selectionOffsetEnd);
    }, 0);
  };

  const applyContainerDescriptionFormat = (containerKey, descriptionIndex, formatType, colorVal = '') => {
    const textarea = containerDescriptionRefs.current[containerKey];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formatted = selectedText;
    let newStart = start;
    let newEnd = end;
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    if (formatType === 'bold') {
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        formatted = selectedText.slice(2, -2);
        selectionOffsetStart = 0;
        selectionOffsetEnd = formatted.length;
      } else {
        const match = selectedText.match(/^(\s*)(.*?)(\s*)$/);
        const leadingSpace = match ? match[1] : '';
        const trimmedText = match ? match[2] : selectedText;
        const trailingSpace = match ? match[3] : '';
        formatted = `${leadingSpace}**${trimmedText}**${trailingSpace}`;
        selectionOffsetStart = selectedText.length === 0 ? 2 : leadingSpace.length;
        selectionOffsetEnd = selectedText.length === 0 ? 2 : leadingSpace.length + trimmedText.length + 4;
      }
    } else if (formatType === 'italic') {
      if (selectedText.startsWith('*') && !selectedText.startsWith('**') && selectedText.endsWith('*') && !selectedText.endsWith('**')) {
        formatted = selectedText.slice(1, -1);
        selectionOffsetStart = 0;
        selectionOffsetEnd = formatted.length;
      } else {
        const match = selectedText.match(/^(\s*)(.*?)(\s*)$/);
        const leadingSpace = match ? match[1] : '';
        const trimmedText = match ? match[2] : selectedText;
        const trailingSpace = match ? match[3] : '';
        formatted = `${leadingSpace}*${trimmedText}*${trailingSpace}`;
        selectionOffsetStart = selectedText.length === 0 ? 1 : leadingSpace.length;
        selectionOffsetEnd = selectedText.length === 0 ? 1 : leadingSpace.length + trimmedText.length + 2;
      }
    } else if (formatType === 'color') {
      const anyColorMatch = selectedText.match(/^\[color:(#[0-9a-fA-F]{6})\]\{(.*)\}$/);
      if (anyColorMatch) {
        const existingColor = anyColorMatch[1];
        const innerText = anyColorMatch[2];
        if (existingColor === colorVal) {
          formatted = innerText;
          selectionOffsetStart = 0;
          selectionOffsetEnd = formatted.length;
        } else {
          formatted = `[color:${colorVal}]{${innerText}}`;
          selectionOffsetStart = 0;
          selectionOffsetEnd = formatted.length;
        }
      } else {
        const enclosing = findAnyEnclosingColorTag(text, start, end);
        if (enclosing.found) {
          if (enclosing.color === colorVal) {
            formatted = enclosing.innerText;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
            selectionOffsetStart = 0;
            selectionOffsetEnd = formatted.length;
          } else {
            formatted = `[color:${colorVal}]{${enclosing.innerText}}`;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
            selectionOffsetStart = 0;
            selectionOffsetEnd = formatted.length;
          }
        } else {
          formatted = `[color:${colorVal}]{${selectedText}}`;
          selectionOffsetStart = selectedText.length === 0 ? 17 : 0;
          selectionOffsetEnd = selectedText.length === 0 ? 17 : formatted.length;
        }
      }
    }

    const newText = text.substring(0, newStart) + formatted + text.substring(newEnd);
    if (descriptionIndex === 0) {
      handleDescriptionChange(newText);
    }
    handleContainerDescriptionChange(containerKey, newText);
    setActiveDescriptionKey(containerKey);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart + selectionOffsetStart, newStart + selectionOffsetEnd);
    }, 0);
  };

  const renderContainerDescriptionToolbar = (containerKey, descriptionIndex) => {
    const presetColors = [
      { name: 'Dorado', value: '#c8aa6e' },
      { name: 'Rojo', value: '#ff4d4d' },
      { name: 'Verde', value: '#5cd65c' },
      { name: 'Azul', value: '#33adff' },
      { name: 'Morado', value: '#b366ff' },
    ];
    const isFocused = focusedDescriptionKey === containerKey;
    const borderClass = isFocused
      ? 'border-[#c8aa6e]/70 shadow-[0_-4px_12px_rgba(200,170,110,0.06),_4px_0_12px_rgba(200,170,110,0.06),_-4px_0_12px_rgba(200,170,110,0.06)]'
      : 'border-[#c8aa6e]/25';

    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-t-md border border-b-0 bg-[#09090b]/90 px-3 py-2 transition-all duration-200 ${borderClass}`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyContainerDescriptionFormat(containerKey, descriptionIndex, 'bold')}
            className="flex h-7 w-9 items-center justify-center border border-slate-800 bg-[#09090b]/50 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]"
            title="Negrita"
            aria-label={`Negrita descripción ${descriptionIndex + 1}`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => applyContainerDescriptionFormat(containerKey, descriptionIndex, 'italic')}
            className="flex h-7 w-9 items-center justify-center border border-slate-800 bg-[#09090b]/50 text-[10px] font-black italic uppercase tracking-wider text-slate-300 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]"
            title="Cursiva"
            aria-label={`Cursiva descripción ${descriptionIndex + 1}`}
          >
            I
          </button>
        </div>
        <div className="flex items-center gap-2">
          {presetColors.map((color) => (
            <button
              key={`${containerKey}-description-color-${color.value}`}
              type="button"
              onClick={() => applyContainerDescriptionFormat(containerKey, descriptionIndex, 'color', color.value)}
              className="h-5 w-5 rounded-full border border-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] transition hover:scale-110 hover:border-[#f0e6d2]"
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`Color ${color.name} descripción ${descriptionIndex + 1}`}
            />
          ))}
          <label
            className="relative h-5 w-5 cursor-pointer rounded-full border border-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] transition hover:scale-110 hover:border-[#f0e6d2]"
            style={{ backgroundColor: descriptionFormatColor }}
            title="Color personalizado"
            aria-label={`Color personalizado descripción ${descriptionIndex + 1}`}
          >
            <input
              type="color"
              value={descriptionFormatColor}
              onChange={(event) => {
                setDescriptionFormatColor(event.target.value);
                applyContainerDescriptionFormat(containerKey, descriptionIndex, 'color', event.target.value);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>
    );
  };

  const renderToolbar = (ref, fieldId) => {
    const presetColors = [
      { name: 'Dorado', value: '#c8aa6e' },
      { name: 'Rojo', value: '#ff4d4d' },
      { name: 'Verde', value: '#5cd65c' },
      { name: 'Azul', value: '#33adff' },
      { name: 'Morado', value: '#b366ff' },
      { name: 'Blanco', value: '#ffffff' },
    ];

    const isFocused = focusedField === fieldId;
    const borderClass = isFocused
      ? 'border-[#c8aa6e]/70 shadow-[0_-4px_12px_rgba(200,170,110,0.06),_4px_0_12px_rgba(200,170,110,0.06),_-4px_0_12px_rgba(200,170,110,0.06)]'
      : 'border-[#c8aa6e]/25';

    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 border border-b-0 bg-[#09090b]/90 px-3 py-1.5 rounded-t-md transition-all duration-200 ${borderClass}`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyFormat(ref, 'bold')}
            className="h-6 px-2.5 text-[10px] font-extrabold uppercase tracking-wider border border-slate-800 bg-[#09090b]/40 text-slate-300 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] cursor-pointer flex items-center justify-center transition"
            title="Negrita"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => applyFormat(ref, 'italic')}
            className="h-6 px-2.5 text-[10px] font-extrabold italic uppercase tracking-wider border border-slate-800 bg-[#09090b]/40 text-slate-300 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] cursor-pointer flex items-center justify-center transition"
            title="Cursiva"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => applyFormat(ref, 'separator')}
            className="h-6 px-2.5 text-[10px] font-extrabold uppercase tracking-wider border border-slate-800 bg-[#09090b]/40 text-slate-300 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] cursor-pointer flex items-center justify-center transition"
            title="Insertar separador"
          >
            ---
          </button>
          <button
            type="button"
            onClick={() => applyFormat(ref, 'lore')}
            className="h-6 px-2.5 text-[10px] font-extrabold uppercase tracking-wider border border-slate-800 bg-[#09090b]/40 text-slate-300 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] cursor-pointer flex items-center justify-center transition"
            title="Marcar como lore"
          >
            Lore
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {presetColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => applyFormat(ref, 'color', color.value)}
              className="h-4 w-4 rounded-full border border-black/40 cursor-pointer hover:scale-125 hover:shadow-[0_0_8px_rgba(200,170,110,0.5)] transition"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderExportDataUrl = async () => {
    const exportCanvas = document.createElement('canvas');
    await drawCard(exportCanvas, 1, false);
    return exportCanvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    const dataUrl = await renderExportDataUrl();
    const link = document.createElement('a');
    const safeName = getSafeFileSlug(cardName);
    link.download = `${safeName}.png`;
    link.href = dataUrl;
    link.click();
  };

  const findOrCreateCharacterLibrary = async (ownerName) => {
    const snap = await getDocs(collection(db, 'card_decks'));
    const libraries = snap.docs
      .map((deckDoc) => ({ id: deckDoc.id, ...deckDoc.data() }))
      .filter((deck) => deck.isMasterLibrary === true && (deck.name || '').trim() === ownerName);

    const visibleLibrary = libraries.find((deck) => (
      getDeckAccessForViewer(deck, currentUserId) !== COLLECTION_ACCESS_HIDDEN
      || getDeckAccessForViewer(deck, ownerName) !== COLLECTION_ACCESS_HIDDEN
      || mode === 'master'
    ));

    if (visibleLibrary) {
      const hasEditAccess = (
        mode === 'master'
        || getDeckAccessForViewer(visibleLibrary, currentUserId) === COLLECTION_ACCESS_EDIT
        || getDeckAccessForViewer(visibleLibrary, ownerName) === COLLECTION_ACCESS_EDIT
      );
      if (!hasEditAccess) {
        throw new Error('CHARACTER_LIBRARY_EXISTS_WITHOUT_EDIT_ACCESS');
      }
      return visibleLibrary;
    }

    if (libraries.length > 0) {
      throw new Error('CHARACTER_LIBRARY_EXISTS_WITHOUT_ACCESS');
    }

    const permissions = {};
    if (currentUserId) permissions[currentUserId] = COLLECTION_ACCESS_EDIT;
    if (ownerName && ownerName !== currentUserId) permissions[ownerName] = COLLECTION_ACCESS_EDIT;

    const createdRef = await addDoc(collection(db, 'card_decks'), {
      name: ownerName,
      ownerId: 'master',
      createdAt: Date.now(),
      cards: [],
      isMasterLibrary: true,
      permissions,
      source: 'character-builder',
      createdBy: currentUserId || ownerName
    });

    return {
      id: createdRef.id,
      name: ownerName,
      cards: [],
      isMasterLibrary: true,
      permissions
    };
  };

  const findOrCreateMasterTypeLibrary = async (libraryType) => {
    const target = MASTER_LIBRARY_TYPE_TARGETS[libraryType] || MASTER_LIBRARY_TYPE_TARGETS.action;
    const aliases = target.aliases.map(normalizeLibraryName);
    const snap = await getDocs(collection(db, 'card_decks'));
    const libraries = snap.docs
      .map((deckDoc) => ({ id: deckDoc.id, ...deckDoc.data() }))
      .filter((deck) => deck.isMasterLibrary === true && deck.ownerId === 'master');

    const matchingLibrary = libraries.find((deck) => {
      const deckName = normalizeLibraryName(deck.name || '');
      if (!deckName) return false;
      return aliases.some((alias) => deckName === alias || deckName.includes(alias) || alias.includes(deckName));
    });

    if (matchingLibrary) {
      return matchingLibrary;
    }

    const createdRef = await addDoc(collection(db, 'card_decks'), {
      name: target.name,
      ownerId: 'master',
      createdAt: Date.now(),
      cards: [],
      isMasterLibrary: true,
      permissions: {},
      source: 'master-card-builder',
      autoType: libraryType
    });

    return {
      id: createdRef.id,
      name: target.name,
      cards: [],
      isMasterLibrary: true,
      permissions: {}
    };
  };

  const buildUploadedCardPayload = (cardId, frontUrl, type, ownerName) => ({
    id: cardId,
    templateId: cardId,
    name: normalizeCardName(cardName) || 'Carta sin nombre',
    frontUrl,
    type,
    visibleToPlayers: true,
    createdAt: Date.now(),
    createdBy: currentUserId || ownerName || mode,
    ...(ownerName ? { characterName: ownerName } : {})
  });

  const handleUploadToCharacterLibrary = async () => {
    const ownerName = (characterName || '').trim();
    if (!ownerName) {
      alert('No se pudo detectar el nombre exacto del personaje para crear su colección.');
      return;
    }

    setIsUploadingCharacterCard(true);
    setUploadStatus('');
    try {
      const library = await findOrCreateCharacterLibrary(ownerName);
      const dataUrl = await renderExportDataUrl();
      const cardId = Math.random().toString(36).substr(2, 9);
      const safeName = getSafeFileSlug(cardName);
      const frontUrl = await uploadDataUrl(
        dataUrl,
        `deck-library-cards/${library.id}/${Date.now()}-${cardId}-${safeName}.png`
      );
      const newCard = {
        ...buildUploadedCardPayload(cardId, frontUrl, getLibraryCardType(cardType), ownerName),
        characterName: ownerName
      };
      await updateDoc(doc(db, 'card_decks', library.id), {
        cards: [...(library.cards || []), newCard]
      });
      setUploadStatus(`Subida a ${ownerName}`);
    } catch (error) {
      console.error('Error uploading character card:', error);
      if (error?.message === 'CHARACTER_LIBRARY_EXISTS_WITHOUT_ACCESS') {
        alert(`La colección "${ownerName}" ya está creada, pero no tienes permisos para verla o editarla. Contacta con el Master.`);
      } else if (error?.message === 'CHARACTER_LIBRARY_EXISTS_WITHOUT_EDIT_ACCESS') {
        alert(`La colección "${ownerName}" ya existe, pero no tienes permiso de edición. Contacta con el Master.`);
      } else {
        alert('No se pudo subir la carta a la colección del personaje.');
      }
    } finally {
      setIsUploadingCharacterCard(false);
    }
  };

  const handleUploadToMasterLibrary = async () => {
    setIsUploadingCharacterCard(true);
    setUploadStatus('');
    try {
      const libraryType = getLibraryCardType(cardType);
      const library = await findOrCreateMasterTypeLibrary(libraryType);
      const dataUrl = await renderExportDataUrl();
      const cardId = Math.random().toString(36).substr(2, 9);
      const safeName = getSafeFileSlug(cardName);
      const frontUrl = await uploadDataUrl(
        dataUrl,
        `deck-library-cards/${library.id}/${Date.now()}-${cardId}-${safeName}.png`
      );
      const newCard = buildUploadedCardPayload(cardId, frontUrl, libraryType, 'master');
      await updateDoc(doc(db, 'card_decks', library.id), {
        cards: [...(library.cards || []), newCard]
      });
      setUploadStatus(`Subida a ${library.name || 'colección base'}`);
    } catch (error) {
      console.error('Error uploading master card:', error);
      alert('No se pudo subir la carta a la colección base del Master.');
    } finally {
      setIsUploadingCharacterCard(false);
    }
  };

  const hasContainer = (containerId) => cardContainers.some((container, index) => getContainerId(container, index) === containerId);
  const usesChargeResources = hasContainer('consumption') && RESOURCE_CARD_TYPES.has(cardType);
  const usesConsumptionResources = hasContainer('consumption') && ((cardType === 'action' && actionCenterMode === 'dado') || cardType === 'status' || (
    usesChargeResources && (resourceMode === RESOURCE_MODE_BOTH || resourceMode === RESOURCE_MODE_CONSUMPTION_ONLY)
  ));
  const normalizedCardContainers = useMemo(
    () => cardContainers.map((containerEntry, index) => normalizeCardContainer(containerEntry, index)),
    [cardContainers],
  );
  const descriptionContainers = useMemo(
    () => normalizedCardContainers.filter((container) => container.id === 'description'),
    [normalizedCardContainers],
  );
  const damageContainers = useMemo(
    () => normalizedCardContainers.filter((container) => container.id === 'damage'),
    [normalizedCardContainers],
  );
  const consumptionContainers = useMemo(
    () => normalizedCardContainers.filter((container) => container.id === 'consumption'),
    [normalizedCardContainers],
  );
  const chargeContainers = useMemo(
    () => normalizedCardContainers.filter((container) => container.id === 'charge'),
    [normalizedCardContainers],
  );
  const traitContainers = useMemo(
    () => normalizedCardContainers.filter((container) => container.id === 'traits'),
    [normalizedCardContainers],
  );
  const descriptionUnitBudget = useMemo(
    () => getDescriptionUnitBudget(cardContainers, cardType),
    [cardContainers, cardType],
  );
  const getAvailableDescriptionUnits = (containerKey) => {
    const otherUsedUnits = descriptionContainers.reduce((total, container) => {
      if (container.key === containerKey) return total;
      const parsedUnits = parseInt(containerDescriptionSizes[container.key], 10);
      return total + (DESCRIPTION_SPACE_UNITS.includes(parsedUnits) ? parsedUnits : 1);
    }, 0);
    return Math.max(1, Math.min(6, descriptionUnitBudget - otherUsedUnits));
  };
  const insertDescriptionIcon = (iconId) => {
    const targetContainer = (
      descriptionContainers.find((container) => container.key === activeDescriptionKey)
      || descriptionContainers[0]
    );
    if (!targetContainer) return;

    const targetIndex = descriptionContainers.findIndex((container) => container.key === targetContainer.key);
    const currentText = containerDescriptions[targetContainer.key] ?? (targetIndex === 0 ? description : '');
    const token = createDescriptionIconToken(iconId);
    const nextText = currentText.trim().length > 0 ? `${currentText} ${token}` : token;

    if (targetIndex === 0) {
      handleDescriptionChange(nextText);
    }
    handleContainerDescriptionChange(targetContainer.key, nextText);
    setActiveDescriptionKey(targetContainer.key);
  };

  return (
    <div className="h-screen max-h-screen overflow-y-auto bg-[#09090b] text-[#e2e8f0] font-['Lato'] selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2] custom-scrollbar">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap');
          
          /* Hide browser native up/down number input spinner arrows */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col gap-5 p-4 pb-24 md:p-8">
        <div className="flex flex-col gap-4 border-b border-[#c8aa6e]/20 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
              <span className="opacity-70">ARCANA VAULT</span>
              <span className="h-px w-4 bg-[#c8aa6e]/40" />
              <span>{mode === 'master' ? 'MASTER' : 'PERSONAJE'}</span>
            </div>
            <h1 className="font-['Cinzel'] text-3xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-5xl">
              Constructor de cartas
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="group inline-flex items-center justify-center gap-2 border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 px-4 py-2.5 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e] transition-all hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10"
              >
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 w-10 items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-300 transition hover:border-[#c8aa6e]/60 hover:text-[#c8aa6e]"
              title="Restablecer"
              aria-label="Restablecer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={imageStatus !== 'ready'}
              className="inline-flex h-10 w-10 items-center justify-center border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 text-[#c8aa6e] transition hover:bg-[#c8aa6e]/20 disabled:cursor-not-allowed disabled:opacity-40"
              title="Exportar PNG"
              aria-label="Exportar PNG"
            >
              <Download className="h-4 w-4" />
            </button>
            {mode === 'player' && characterName && (
              <button
                type="button"
                onClick={handleUploadToCharacterLibrary}
                disabled={imageStatus !== 'ready' || isUploadingCharacterCard}
                className="inline-flex h-10 items-center justify-center gap-2 border border-emerald-400/35 bg-emerald-950/25 px-3 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200 transition hover:border-emerald-300/70 hover:bg-emerald-900/30 disabled:cursor-wait disabled:opacity-45"
                title={`Subir a la colección ${characterName}`}
              >
                {isUploadingCharacterCard ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Subir a colección</span>
              </button>
            )}
            {mode === 'master' && (
              <button
                type="button"
                onClick={handleUploadToMasterLibrary}
                disabled={imageStatus !== 'ready' || isUploadingCharacterCard}
                className="inline-flex h-10 items-center justify-center gap-2 border border-emerald-400/35 bg-emerald-950/25 px-3 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200 transition hover:border-emerald-300/70 hover:bg-emerald-900/30 disabled:cursor-wait disabled:opacity-45"
                title="Subir a colección base por tipo"
              >
                {isUploadingCharacterCard ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Subir a base</span>
              </button>
            )}
          </div>
        </div>

        {((mode === 'player' && characterName) || mode === 'master') && (
          <div className="flex flex-wrap items-center gap-2 border border-emerald-400/15 bg-emerald-950/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/80">
            <Database className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-slate-400">{mode === 'master' ? 'Destino automático:' : 'Colección de personaje:'}</span>
            <span className="text-emerald-200">
              {mode === 'master'
                ? (MASTER_LIBRARY_TYPE_TARGETS[getLibraryCardType(cardType)]?.name || 'Colección base')
                : characterName}
            </span>
            {uploadStatus && <span className="ml-auto text-[#c8aa6e]">{uploadStatus}</span>}
          </div>
        )}

        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <aside className="relative z-20 order-2 flex flex-col gap-5 border border-[#c8aa6e]/20 bg-[#0b1120]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:p-5 lg:order-1">
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <Type className="h-4 w-4" />
                Nombre
              </label>
              <input
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                maxLength={34}
                className="w-full border border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70"
                placeholder="Nombre de la carta"
              />
            </div>

            <div className="space-y-3 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
              <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <ImageIcon className="h-4 w-4" />
                Imagen portada
              </div>
              <input
                ref={headerImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeaderImageChange}
                className="hidden"
              />
              <div 
                onClick={() => headerImageInputRef.current?.click()}
                className="relative overflow-hidden border border-[#c8aa6e]/15 bg-black/40 cursor-pointer group transition hover:border-[#c8aa6e]/50" 
                style={{ aspectRatio: '1548/638' }}
              >
                {headerImageSrc ? (
                  <>
                    <img src={headerImageSrc} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#f0e6d2] pointer-events-none">
                      Cambiar imagen
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeaderImageSrc('');
                      }}
                      className="absolute top-1.5 right-1.5 z-10 inline-flex h-6 w-6 items-center justify-center border border-slate-800/30 bg-[#09090b]/50 text-slate-500 transition hover:border-red-500/30 hover:bg-[#09090b]/90 hover:text-red-400 shadow-md"
                      title="Quitar imagen"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 group-hover:text-[#c8aa6e] transition">
                    <UploadCloud className="h-5 w-5 text-slate-500 group-hover:text-[#c8aa6e] transition mb-1" />
                    <span>Haga clic para subir imagen</span>
                    <span className="text-[8px] tracking-[0.12em] opacity-60 font-medium text-slate-500 block mt-1 normal-case">
                      Se generará una cabecera oscura si no subes imagen
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 border-t border-[#c8aa6e]/10 pt-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Icono de cabecera
                </label>
                <select
                  value={selectedElement}
                  onChange={(event) => setSelectedElement(event.target.value)}
                  className="w-full h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70 cursor-pointer"
                >
                  {ELEMENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
              <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <Plus className="h-4 w-4" />
                Contenedores
              </div>
              <div className="space-y-2">
                {cardContainers.length === 0 ? (
                  <div className="border border-slate-800 bg-[#09090b]/60 px-3 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Solo se mostrará imagen y título.
                  </div>
                ) : cardContainers.map((containerEntry, index) => {
                  const containerId = getContainerId(containerEntry, index);
                  const containerKey = getContainerKey(containerEntry, index);
                  const container = CARD_CONTAINER_TYPES.find((item) => item.id === containerId);
                  const isFixedFooterContainer = containerId === 'charge';
                  return (
                    <div
                      key={containerKey}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-1 border border-slate-800 bg-[#0b1120]/70 px-2 py-1.5"
                    >
                      <span className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-[#f0e6d2]">
                        {container?.label || containerId}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveCardContainer(index, -1)}
                        disabled={index === 0 || isFixedFooterContainer}
                        className="inline-flex h-7 w-7 items-center justify-center border border-slate-800 text-slate-400 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] disabled:cursor-not-allowed disabled:opacity-30"
                        title="Subir"
                        aria-label={`Subir ${container?.label || containerId}`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCardContainer(index, 1)}
                        disabled={index === cardContainers.length - 1 || isFixedFooterContainer || getContainerId(cardContainers[index + 1], index + 1) === 'charge'}
                        className="inline-flex h-7 w-7 items-center justify-center border border-slate-800 text-slate-400 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] disabled:cursor-not-allowed disabled:opacity-30"
                        title="Bajar"
                        aria-label={`Bajar ${container?.label || containerId}`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCardContainer(index)}
                        className="inline-flex h-7 w-7 items-center justify-center border border-slate-800 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
                        title="Quitar"
                        aria-label={`Quitar ${container?.label || containerId}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CARD_CONTAINER_TYPES.map((container) => {
                  const isFull = cardContainers.length >= MAX_CARD_CONTAINERS;
                  const isSingletonTaken = SINGLE_INSTANCE_CARD_CONTAINERS.has(container.id) && hasContainer(container.id);
                  const disabled = isFull || isSingletonTaken;
                  return (
                    <button
                      key={container.id}
                      type="button"
                      onClick={() => addCardContainer(container.id)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center gap-1 border border-slate-800 bg-[#09090b]/60 px-2 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="h-3 w-3" />
                      {container.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(cardType === 'weapon' || cardType === 'armor' || cardType === 'trap' || cardType === 'action' || cardType === 'skill' || cardType === 'status') && (
              <div className="space-y-4 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
                <div className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                  Datos de contenedores
                </div>
                
                {hasContainer('range') && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Alcance
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {['Toque', 'Cercano', 'Inter.', 'Lejano', 'Extr.'].map((label, index) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAlcance(index)}
                            className={`border py-1.5 text-[8.5px] xs:text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter xs:tracking-normal sm:tracking-wider transition ${alcance === index
                              ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 text-[#f0e6d2]'
                              : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-slate-700 hover:text-[#c8aa6e]'
                              }`}
                            title={['Toque', 'Cercano', 'Intermedio', 'Lejano', 'Extremo'][index]}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                )}

                {cardType === 'action' && (
                  <div className="space-y-3 border-t border-[#c8aa6e]/10 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Icono Central / Atributo
                      </label>
                      <select
                        value={actionCenterMode}
                        onChange={(event) => setActionCenterMode(event.target.value)}
                        className="w-full h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70 cursor-pointer"
                      >
                        <option value="dado">Dado de Acción (Estándar)</option>
                        <option value="Hambre">Atributo: Hambre (Estómago)</option>
                        <option value="Cuerpo">Atributo: Cuerpo (Corazón)</option>
                        <option value="Mente">Atributo: Mente (Cerebro)</option>
                      </select>
                    </div>
                  </div>
                )}

                {chargeContainers.map((container) => {
                  const activeChargeSlots = [...chargeSlots].slice(0, CHARGE_SLOT_COUNT);
                  while (activeChargeSlots.length < CHARGE_SLOT_COUNT) activeChargeSlots.push(EMPTY_SLOT);
                  return (
                    <div key={`charge-editor-${container.key}`} className="space-y-3 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Carga
                        </label>
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          5 rombos
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {activeChargeSlots.map((slot, index) => (
                          <label
                            key={`${container.key}-charge-slot-${index}`}
                            className="space-y-1"
                          >
                            <span className="block text-center text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                              {index + 1}
                            </span>
                            <select
                              value={slot}
                              onChange={(event) => handleChargeSlotChange(index, event.target.value)}
                              className="h-8 w-full min-w-0 border border-[#c8aa6e]/20 bg-[#09090b]/80 px-1 text-[10px] font-bold uppercase text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70"
                              aria-label={`Carga slot ${index + 1}`}
                            >
                              <option value="">Vacío</option>
                              {CHARGE_TYPES.map((option) => (
                                <option key={`${container.key}-charge-${index}-${option.id}`} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {damageContainers.map((container, damageIndex) => {
                  const damageConfig = containerDamage[container.key] || DEFAULT_CONTAINER_DAMAGE;
                  const activeDiceType = damageConfig.diceType || DEFAULT_CONTAINER_DAMAGE.diceType;
                  const activeDiceQty = damageConfig.diceQty || DEFAULT_CONTAINER_DAMAGE.diceQty;
                  return (
                    <div key={`damage-editor-${container.key}`} className="space-y-3 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Daño {damageIndex + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Dado
                          </label>
                          <select
                            value={activeDiceType}
                            onChange={(event) => {
                              if (damageIndex === 0) setDiceType(event.target.value);
                              handleContainerDamageChange(container.key, { diceType: event.target.value });
                            }}
                            className="w-full h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70 cursor-pointer"
                          >
                            {['D4', 'D6', 'D8', 'D10', 'D12', 'DX'].map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Cantidad
                          </label>
                          {activeDiceType === 'DX' ? (
                            <div className="flex items-center justify-center h-[38px] border border-slate-800 bg-[#09090b]/60 px-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                              Variable
                            </div>
                          ) : (
                            <div className="grid grid-cols-[2.5rem_1fr_2.5rem] h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextQty = activeDiceQty - 1;
                                  if (damageIndex === 0) handleDiceQtyChange(nextQty);
                                  handleContainerDamageChange(container.key, { diceQty: nextQty });
                                }}
                                className="flex items-center justify-center border-r border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 h-full cursor-pointer"
                                aria-label={`Reducir cantidad de dados de daño ${damageIndex + 1}`}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={MAX_DAMAGE_DICE_QTY}
                                value={activeDiceQty}
                                onChange={(event) => {
                                  const nextQty = parseInt(event.target.value, 10) || 1;
                                  if (damageIndex === 0) handleDiceQtyChange(nextQty);
                                  handleContainerDamageChange(container.key, { diceQty: nextQty });
                                }}
                                className="w-full h-full bg-transparent px-2 text-center text-sm font-bold text-[#f0e6d2] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextQty = activeDiceQty + 1;
                                  if (damageIndex === 0) handleDiceQtyChange(nextQty);
                                  handleContainerDamageChange(container.key, { diceQty: nextQty });
                                }}
                                className="flex items-center justify-center border-l border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 h-full cursor-pointer"
                                aria-label={`Aumentar cantidad de dados de daño ${damageIndex + 1}`}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cardType === 'skill' && (
                  <div className="space-y-2 border-t border-[#c8aa6e]/10 pt-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Atributos del Minion
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {MINION_ATTRIBUTE_TYPES.map((attribute) => {
                        const iconSrc = `${process.env.PUBLIC_URL || ''}/interfaz/cargas/${attribute}.webp`;
                        return (
                          <label
                            key={`minion-attribute-${attribute}`}
                            className="grid grid-cols-[2rem_1fr] items-center border border-[#c8aa6e]/20 bg-[#09090b]/80"
                            title={attribute}
                          >
                            <span className="flex h-full items-center justify-center border-r border-[#c8aa6e]/15">
                              <img src={iconSrc} alt="" className="h-5 w-5 object-contain" />
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={minionAttributes[attribute]}
                              onChange={(event) => handleMinionAttributeChange(attribute, event.target.value)}
                              className="h-[34px] min-w-0 bg-transparent px-1 text-center text-sm font-black text-[#f0e6d2] outline-none"
                              aria-label={`Atributo ${attribute}`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {consumptionContainers.map((container, consumptionIndex) => {
                  const consumptionConfig = containerConsumptions[container.key] || createDefaultContainerConsumption();
                  const activeSlots = [...(consumptionConfig.slots || DEFAULT_CONSUMPTION_SLOTS)].slice(0, RESOURCE_SLOT_COUNT);
                  const activeSlotTypes = [...(consumptionConfig.slotTypes || DEFAULT_CONTAINER_CONSUMPTION_TYPES)].slice(0, RESOURCE_SLOT_COUNT);
                  while (activeSlots.length < RESOURCE_SLOT_COUNT) activeSlots.push(EMPTY_SLOT);
                  while (activeSlotTypes.length < RESOURCE_SLOT_COUNT) activeSlotTypes.push('consumption');
                  return (
                    <div key={`consumption-editor-${container.key}`} className="space-y-3 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Consumo {consumptionIndex + 1}
                        </label>
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          4 slots
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {activeSlots.map((slot, index) => (
                          <div
                            key={`${container.key}-consumption-slot-${index}`}
                            className={`grid items-center border border-[#c8aa6e]/20 bg-[#09090b]/80 ${
                              cardType === 'armor' ? 'grid-cols-[1.75rem_minmax(0,1fr)]' : 'grid-cols-[1.5rem_minmax(0,1fr)_2.25rem]'
                            }`}
                          >
                            <span className="border-r border-[#c8aa6e]/15 py-2 text-center text-[10px] font-black text-[#c8aa6e]">
                              {index + 1}
                            </span>
                            <select
                              value={slot}
                              onChange={(event) => {
                                if (consumptionIndex === 0) handleConsumptionSlotChange(index, event.target.value);
                                handleContainerConsumptionSlotChange(container.key, index, event.target.value);
                              }}
                              className={`min-w-0 bg-transparent py-2 font-bold uppercase text-[#f0e6d2] outline-none cursor-pointer h-full ${
                                cardType !== 'armor' && slot === 'Armadura_1'
                                  ? 'px-1 text-[10px] tracking-normal'
                                  : 'px-2 text-xs'
                              }`}
                              aria-label={`Consumo ${consumptionIndex + 1} slot ${index + 1}`}
                            >
                              <option value="">Vacío</option>
                              {cardType === 'armor'
                                ? CONSUMPTION_TYPES.filter((option) => option.id === 'Armadura_1').map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))
                                : (activeSlotTypes[index] || 'consumption') === 'consumption'
                                ? CONSUMPTION_TYPES.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))
                                : ELEMENT_TYPES.filter((type) => type.id !== 'Ninguno').map((type) => (
                                    <option key={type.id} value={type.id}>
                                      {type.label}
                                    </option>
                                  ))}
                            </select>
                            {cardType !== 'armor' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (consumptionIndex === 0) {
                                    const nextTypes = [...consumptionSlotTypes].slice(0, RESOURCE_SLOT_COUNT);
                                    const currentType = nextTypes[index] || 'consumption';
                                    nextTypes[index] = currentType === 'consumption' ? 'element' : 'consumption';
                                    setConsumptionSlotTypes(nextTypes);
                                    handleConsumptionSlotChange(index, '');
                                  }
                                  handleContainerConsumptionSlotTypeToggle(container.key, index);
                                }}
                                className={`h-full border-l border-[#c8aa6e]/15 text-[9px] sm:text-[10px] font-bold uppercase transition flex items-center justify-center cursor-pointer select-none ${
                                  (activeSlotTypes[index] || 'consumption') === 'consumption'
                                    ? 'text-[#c8aa6e] bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/15'
                                    : 'text-teal-400 bg-teal-500/10 hover:bg-teal-500/20'
                                }`}
                                title={(activeSlotTypes[index] || 'consumption') === 'consumption' ? "Cambiar a Elemento" : "Cambiar a Consumo"}
                              >
                                {(activeSlotTypes[index] || 'consumption') === 'consumption' ? 'CON' : 'ELE'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasContainer('description') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                    <Type className="h-4 w-4" />
                    Descripciones
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <input
                      type="checkbox"
                      checked={hyphenate}
                      onChange={(event) => setHyphenate(event.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[#c8aa6e]"
                    />
                    Guionizar
                  </label>
                </div>

                <div className="space-y-2 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Compendio visual
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {DESCRIPTION_ICON_LIBRARY.map((icon) => (
                      <button
                        key={`description-icon-${icon.id}`}
                        type="button"
                        onClick={() => insertDescriptionIcon(icon.id)}
                        className="group flex h-16 flex-col items-center justify-center gap-1.5 border border-slate-800 bg-[#09090b]/55 px-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 transition hover:border-[#c8aa6e]/55 hover:bg-[#c8aa6e]/10 hover:text-[#d8c391]"
                        title={`Insertar ${icon.label}`}
                        aria-label={`Insertar icono ${icon.label}`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-8 w-8 opacity-90 transition group-hover:opacity-100"
                          style={{
                            backgroundColor: DESCRIPTION_ICON_STYLES[icon.id]?.stroke || '#c46f1f',
                            WebkitMaskImage: `url("${process.env.PUBLIC_URL || ''}${icon.src}")`,
                            maskImage: `url("${process.env.PUBLIC_URL || ''}${icon.src}")`,
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                          }}
                        />
                        <span className="max-w-full truncate">{icon.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {descriptionContainers.map((container, descriptionIndex) => {
                  const maxUnitsForContainer = getAvailableDescriptionUnits(container.key);
                  const selectedUnits = Math.min(containerDescriptionSizes[container.key] || 1, maxUnitsForContainer);

                  return (
                    <div
                      key={`description-editor-${container.key}`}
                      className="space-y-2 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                          Descripción {descriptionIndex + 1}
                        </label>
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Espacio
                          <select
                            value={selectedUnits}
                            onChange={(event) => handleContainerDescriptionSizeChange(container.key, Number(event.target.value))}
                            className="h-8 border border-[#c8aa6e]/20 bg-[#09090b]/90 px-2 text-xs font-bold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70"
                          >
                            {DESCRIPTION_SPACE_UNITS.filter((unit) => unit <= maxUnitsForContainer).map((unit) => (
                              <option key={`${container.key}-description-unit-${unit}`} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {singleTextStyle === 'principal' && renderContainerDescriptionToolbar(container.key, descriptionIndex)}
                      <textarea
                        ref={(node) => {
                          if (node) {
                            containerDescriptionRefs.current[container.key] = node;
                          } else {
                            delete containerDescriptionRefs.current[container.key];
                          }
                        }}
                        value={containerDescriptions[container.key] ?? (descriptionIndex === 0 ? description : '')}
                        onChange={(event) => {
                          if (descriptionIndex === 0) {
                            handleDescriptionChange(event.target.value);
                          }
                          handleContainerDescriptionChange(container.key, event.target.value);
                        }}
                        onFocus={() => {
                          setActiveDescriptionKey(container.key);
                          setFocusedDescriptionKey(container.key);
                        }}
                        onBlur={() => setFocusedDescriptionKey(null)}
                        rows={5}
                        maxLength={descriptionMaxLength}
                        className={`min-h-[112px] w-full resize-y border border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70 focus:shadow-[0_4px_12px_rgba(200,170,110,0.06),_4px_0_12px_rgba(200,170,110,0.06),_-4px_0_12px_rgba(200,170,110,0.06)] ${
                          singleTextStyle === 'principal' ? 'rounded-b-md border-t-0' : 'rounded-md'
                        }`}
                        placeholder="Texto descriptivo de la carta"
                      />
                    </div>
                  );
                })}

                <div className="flex justify-center gap-1.5 pt-1.5">
                  {['narrative', 'principal'].map((styleOpt) => (
                    <button
                      key={styleOpt}
                      type="button"
                      onClick={() => setSingleTextStyle(styleOpt)}
                      className={`cursor-pointer border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                        singleTextStyle === styleOpt
                          ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                          : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                      }`}
                    >
                      {styleOpt === 'narrative' ? 'Narrativo' : 'Principal'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasContainer('traits') && (
            <div className="space-y-3 border-t border-[#c8aa6e]/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                  <Tag className="h-4 w-4" />
                  Rasgos
                </div>
                {activeType.maxTraits > 0 && (
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <input
                      type="checkbox"
                      checked={showTraits}
                      onChange={(event) => setShowTraits(event.target.checked)}
                      className="h-4 w-4 accent-[#c8aa6e]"
                    />
                    Mostrar
                  </label>
                )}
              </div>

              {showTraits ? (
                <div className="space-y-3">
                  {traitContainers.map((container, traitsIndex) => {
                    const traitValues = (containerTraits[container.key] || (traitsIndex === 0 ? traits : DEFAULT_TRAITS)).slice(0, MAX_TRAITS_PER_CONTAINER);

                    return (
                      <div
                        key={`traits-editor-${container.key}`}
                        className="space-y-2 rounded border border-[#c8aa6e]/15 bg-[#09090b]/35 p-3"
                      >
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                          Rasgos {traitsIndex + 1} · Máximo 3
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {Array.from({ length: MAX_TRAITS_PER_CONTAINER }).map((_, index) => (
                            <input
                              key={`${container.key}-trait-${index}`}
                              value={traitValues[index] || ''}
                              onChange={(event) => {
                                if (traitsIndex === 0) {
                                  handleTraitChange(index, event.target.value);
                                }
                                handleContainerTraitChange(container.key, index, event.target.value);
                              }}
                              maxLength={22}
                              className="w-full border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 py-2 text-sm font-bold uppercase tracking-[0.08em] text-[#f0e6d2] outline-none transition placeholder:text-slate-700 focus:border-[#c8aa6e]/70"
                              placeholder={`Rasgo ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-slate-800 bg-[#09090b]/60 px-3 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Los letreros están ocultos.
                </div>
              )}
            </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <Palette className="h-4 w-4" />
                Acento
              </div>

              <div className="mt-3 space-y-2.5 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
                <div className="grid grid-cols-4 gap-2">
                  {ACCENT_PRESET_COLORS.map((preset) => {
                    const isSelected = preset.id === 'default'
                      ? !customColorActive
                      : customColorActive && customColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (preset.id === 'default') {
                            setCustomColorActive(false);
                          } else {
                            setCustomColorActive(true);
                            setCustomColor(preset.value);
                          }
                        }}
                        className={`flex h-11 items-center justify-center border text-[8px] font-black uppercase tracking-[0.08em] transition ${
                          isSelected
                            ? 'border-[#f0e6d2] text-[#f0e6d2]'
                            : 'border-slate-800 text-slate-500 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                        }`}
                        style={{ background: `linear-gradient(135deg, ${preset.value}44, ${preset.value}12)` }}
                        title={preset.label}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2 border-t border-[#c8aa6e]/10 pt-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Personalizado
                    </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomColorActive(true);
                    }}
                    className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] transition ${
                      customColorActive && !ACCENT_PRESET_COLORS.some((preset) => preset.id !== 'default' && preset.value.toLowerCase() === customColor.toLowerCase())
                        ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                        : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                    }`}
                  >
                    Hex
                  </button>
                  </div>
                    <HexColorInput
                      value={customColor}
                      onChange={(value) => {
                        setCustomColor(value);
                        setCustomColorActive(true);
                      }}
                    />
                    <p className="text-[10px] italic leading-normal text-slate-400">
                      Cambia la línea bajo la imagen, los rombos y los indicadores activos.
                    </p>
                </div>
              </div>
            </div>
          </aside>

          <main 
            onClick={() => {
              if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
              }
              window.getSelection()?.removeAllRanges();
            }}
            className="sticky top-0 z-10 order-1 flex min-h-[520px] items-center justify-center overflow-hidden border border-[#c8aa6e]/15 bg-[#05070d]/30 p-3 md:p-8 lg:relative lg:order-2 lg:min-h-[620px] lg:items-start lg:justify-center lg:overflow-visible"
          >
            <div className="pointer-events-none absolute inset-0 bg-[#05070d]/50" />
            <div className="relative flex h-full w-full max-w-full items-center justify-center lg:sticky lg:top-12 lg:self-start lg:h-fit lg:w-full lg:items-start">
              <div 
                className="relative w-full max-w-[380px] shrink-0 select-none sm:max-w-[460px] lg:max-w-[520px]"
                style={{
                  aspectRatio: '1888/2624',
                  width: 'min(100%, 520px, calc((100vh - 220px) * 1888 / 2624))',
                }}
              >
                {/* Luz ambiental suave detrás de la previsualización, sin cortes visibles. */}
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[122%] w-[128%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(200,170,110,0.13) 0%, rgba(200,170,110,0.055) 38%, rgba(5,7,13,0) 72%)',
                  }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[92%] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(255,245,220,0.055) 0%, rgba(200,170,110,0.03) 34%, rgba(5,7,13,0) 76%)',
                  }}
                />
                
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="relative z-10 block w-full h-full border border-white/15 bg-black shadow-[0_26px_70px_rgba(0,0,0,0.62),0_0_34px_rgba(200,170,110,0.055)] select-none outline-none"
                />
                {imageStatus === 'loading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                    Cargando
                  </div>
                )}
                {imageStatus === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                    No se pudo cargar el fondo
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

CardBuilder.propTypes = {
  onBack: PropTypes.func,
  mode: PropTypes.oneOf(['player', 'master']),
  characterName: PropTypes.string,
  currentUserId: PropTypes.string,
};

export default CardBuilder;
