import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, Download, Palette, RotateCcw, Tag, Type } from 'lucide-react';
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
  { id: 'weapon', label: 'Arma', maxTraits: 6, layout: 'weapon' },
  { id: 'armor', label: 'Armadura', maxTraits: 8, layout: 'armor' },
  { id: 'trap', label: 'Trampa', maxTraits: 1, layout: 'trap' },
  { id: 'action', label: 'Acción', maxTraits: 0, layout: 'none' },
  { id: 'skill', label: 'Minion', maxTraits: 4, layout: 'weapon' },
  { id: 'status', label: 'Estado', maxTraits: 1, layout: 'trap' },
];

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

const DEFAULT_TRAITS = ['-', '-', '-', '-', '-', '-', '-', '-'];
const MINION_ATTRIBUTE_TYPES = ['Hambre', 'Cuerpo', 'Mente'];
const DEFAULT_MINION_ATTRIBUTES = {
  Hambre: 1,
  Cuerpo: 1,
  Mente: 1,
};

const CHARGE_TYPES = [
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/cargas/Hambre.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/cargas/Cuerpo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/cargas/Mente.webp' },
];

const CONSUMPTION_TYPES = [
  { id: 'Tiempo', label: 'Tiempo', src: '/interfaz/consumos/Tiempo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/consumos/Mente.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/consumos/Cuerpo.webp' },
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/consumos/Hambre.webp' },
  { id: 'Armadura_1', label: 'Armadura', src: '/interfaz/consumos/Armadura_1.webp' },
  { id: 'Recurso', label: 'Recurso', src: '/interfaz/consumos/Recurso.webp' },
  { id: 'Variable', label: 'Variable', src: '/interfaz/consumos/Variable.webp' },
];

const DEFAULT_CHARGE_SLOTS = ['Hambre', EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
const DEFAULT_CONSUMPTION_SLOTS = ['Tiempo', EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
const RESOURCE_MODE_BOTH = 'charge-consumption';
const RESOURCE_MODE_CHARGE_ONLY = 'charge-only';
const RESOURCE_CARD_TYPES = new Set(['weapon', 'armor', 'trap', 'skill']);

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
  const railWidth = 780;
  const railX = (CANVAS_WIDTH - railWidth) / 2; // Centered
  const slotGap = 8;
  const slotsWidth = slotSize * 5 + slotGap * 4;
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

const drawSlotIcon = (context, iconImage, x, y, size, shape) => {
  if (!iconImage) return;
  context.save();
  // Dibujamos el icono completo a 0.98 del tamaño para lucir su propio contorno nativo sin recortes ni bordes superpuestos
  const iconSize = size * 0.98;
  context.drawImage(iconImage, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
  context.restore();
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
    drawSlotIcon(context, resourceImages[`charge:${slot}`], x, slotY, slotSize, 'diamond');
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
    drawSlotIcon(context, resourceImages[`charge:${slot}`], x, slotY, slotSize, 'diamond');
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

const KEYWORD_ICONS = {
  'Tiempo': '/interfaz/consumos/Tiempo.webp',
  'Mente': '/interfaz/consumos/Mente.webp',
  'Cuerpo': '/interfaz/consumos/Cuerpo.webp',
  'Hambre': '/interfaz/consumos/Hambre.webp',
  'Armadura': '/interfaz/consumos/Armadura_1.webp',
  'Recurso': '/interfaz/consumos/Recurso.webp',
  'Variable': '/interfaz/consumos/Variable.webp',
  'Agua': '/elementos/Agua.webp',
  'Fuego': '/elementos/Fuego.webp',
  'Hielo': '/elementos/Hielo.webp',
  'Luz': '/elementos/Luz.webp',
  'Oscuridad': '/elementos/Oscuridad.webp',
  'Rayo': '/elementos/Rayo.webp',
  'Tierra': '/elementos/Tierra.webp',
  'Veneno': '/elementos/Veneno.webp',
  'Viento': '/elementos/Viento.webp',
  'Cuerpo a cuerpo': '/tipo/Cuerpo a cuerpo.webp',
  'Distancia': '/tipo/Distancia.webp',
  'Magia': '/tipo/Magia.webp',
  'D4': '/dados/cartas/D4.webp',
  'D6': '/dados/cartas/D6.webp',
  'D8': '/dados/cartas/D8.webp',
  'D10': '/dados/cartas/D10.webp',
  'D12': '/dados/cartas/D12.webp',
  'DX': '/dados/cartas/DX.webp',
  'Dado': '/dados/cartas/DX.webp',
};

const KEYWORD_REGEX = new RegExp(
  '\\b(' + 
  Object.keys(KEYWORD_ICONS)
    .sort((a, b) => b.length - a.length)
    .map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|') + 
  ')\\b',
  'gi'
);

const getActiveFontSize = (context) => {
  const fontStr = context.font;
  const match = fontStr.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 60;
};

const measureTextWithIcons = (context, text) => {
  const baseWidth = context.measureText(text).width;
  if (!text) return baseWidth;
  KEYWORD_REGEX.lastIndex = 0;
  const matches = text.match(KEYWORD_REGEX);
  if (!matches) return baseWidth;
  
  const fontSize = getActiveFontSize(context);
  const spaceCharWidth = context.measureText(' ').width;
  const extraWidthPerMatch = fontSize * 1.1 + spaceCharWidth; // 0.9 * size for icon + 0.2 * size for spacing + 1 keyboard space width
  return baseWidth + matches.length * extraWidthPerMatch;
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

const measureStyledText = (context, text, layoutFontInfo = {}) => {
  const segments = parseStyles(text);
  let totalWidth = 0;
  
  context.save();
  segments.forEach((seg) => {
    applySegmentStyle(context, seg, layoutFontInfo);
    totalWidth += measureTextWithIcons(context, seg.text);
  });
  context.restore();
  
  return totalWidth;
};

const measureTextWidth = (context, text) => {
  const fontInfo = getFontInfoFromContext(context);
  return measureStyledText(context, text, fontInfo);
};

const getStyledWordsOfLine = (line) => {
  const segments = parseStyles(line);
  const words = [];
  
  segments.forEach((seg) => {
    const parts = seg.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (part === '') return;
      if (part.trim() === '') {
        words.push({ text: part, isSpace: true });
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

const drawSingleStyledWord = (context, word, x, y, resourceImages = {}) => {
  const fontInfo = getFontInfoFromContext(context);
  
  context.save();
  applySegmentStyle(context, word, fontInfo);
  
  const fontSize = getActiveFontSize(context);
  const iconSize = fontSize * 0.9;
  const iconGap = fontSize * 0.2;
  const spaceCharWidth = context.measureText(' ').width;
  
  const kwSegments = parseLineSegments(word.text);
  let cursorX = x;
  
  kwSegments.forEach((seg) => {
    context.fillText(seg.text, cursorX, y);
    const textWidth = context.measureText(seg.text).width;
    cursorX += textWidth;
    
    if (seg.isKeyword) {
      const matchedKw = Object.keys(KEYWORD_ICONS).find(kw => kw.toLowerCase() === seg.text.toLowerCase());
      const iconImg = matchedKw ? resourceImages[`keyword:${matchedKw}`] : null;
      const shiftX = spaceCharWidth;
      
      if (iconImg) {
        const iconY = y + (fontSize - iconSize) / 2;
        context.drawImage(iconImg, cursorX + shiftX, iconY, iconSize, iconSize);
      }
      cursorX += iconSize + iconGap + shiftX;
    }
  });
  
  context.restore();
};

const measureStyledWordWidth = (context, word) => {
  const fontInfo = getFontInfoFromContext(context);
  let wordWidth = 0;
  
  context.save();
  applySegmentStyle(context, word, fontInfo);
  wordWidth = measureTextWithIcons(context, word.text);
  context.restore();
  
  return wordWidth;
};

const parseLineSegments = (line) => {
  if (!line) return [];
  KEYWORD_REGEX.lastIndex = 0;
  const parts = line.split(KEYWORD_REGEX);
  return parts.map((part) => {
    const isKeyword = Object.keys(KEYWORD_ICONS).some(
      (kw) => kw.toLowerCase() === part.toLowerCase() || (part.toLowerCase() === 'dado' && kw === 'Dado')
    );
    return {
      text: part,
      isKeyword,
    };
  }).filter((segment) => segment.text !== '');
};

const tokenizeParagraph = (paragraph) => {
  const preserved = paragraph.replace(/\bcuerpo\s+a\s+cuerpo\b/gi, 'cuerpo_a_cuerpo');
  return preserved.split(/\s+/).map(w => w.replace(/cuerpo_a_cuerpo/gi, 'cuerpo a cuerpo'));
};

const drawTextLineWithIcons = (context, line, x, y, maxWidth, justify = false, resourceImages = {}) => {
  if (!justify) {
    const fontInfo = getFontInfoFromContext(context);
    const styleSegments = parseStyles(line);
    
    if (styleSegments.length === 0) return;
    
    const spaceCharWidth = context.measureText(' ').width;
    let cursorX = x;
    
    context.save();
    styleSegments.forEach((styleSeg) => {
      applySegmentStyle(context, styleSeg, fontInfo);
      
      const fontSize = getActiveFontSize(context);
      const iconSize = fontSize * 0.9;
      const iconGap = fontSize * 0.2;
      
      const kwSegments = parseLineSegments(styleSeg.text);
      kwSegments.forEach((seg) => {
        context.fillText(seg.text, cursorX, y);
        const textWidth = context.measureText(seg.text).width;
        cursorX += textWidth;
        
        if (seg.isKeyword) {
          const matchedKw = Object.keys(KEYWORD_ICONS).find(kw => kw.toLowerCase() === seg.text.toLowerCase());
          const iconImg = matchedKw ? resourceImages[`keyword:${matchedKw}`] : null;
          const shiftX = spaceCharWidth;
          
          if (iconImg) {
            const iconY = y + (fontSize - iconSize) / 2;
            context.drawImage(iconImg, cursorX + shiftX, iconY, iconSize, iconSize);
          }
          cursorX += iconSize + iconGap + shiftX;
        }
      });
    });
    context.restore();
  } else {
    const styledWords = getStyledWordsOfLine(line);
    const actualWords = styledWords.filter(w => !w.isSpace);
    
    if (actualWords.length < 2) {
      drawTextLineWithIcons(context, line, x, y, maxWidth, false, resourceImages);
      return;
    }
    
    const wordsWidth = actualWords.reduce((total, word) => {
      return total + measureStyledWordWidth(context, word);
    }, 0);
    
    const spaceWidth = (maxWidth - wordsWidth) / (actualWords.length - 1);
    let cursorX = x;
    
    actualWords.forEach((word, index) => {
      drawSingleStyledWord(context, word, cursorX, y, resourceImages);
      cursorX += measureStyledWordWidth(context, word) + (index < actualWords.length - 1 ? spaceWidth : 0);
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

const wrapDescriptionText = (context, text, maxWidth, hyphenate = false) => {
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
          });

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
              });
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

      if (measureTextWidth(context, testString) <= maxWidth || currentLineTokens.length === 0) {
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

                if (measureTextWidth(context, testStringWithHyphen) <= maxWidth) {
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

const getDescriptionFlowItems = (context, text, maxWidth, lineHeight, hyphenate = false) => {
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

    const wrappedLines = wrapDescriptionText(context, cleanParagraph, maxWidth, hyphenate);
    wrappedLines.forEach((line) => {
      items.push({
        type: 'text',
        line,
        isLore: paragraphIsLore,
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
      items.push({ type: 'gap', height: Math.round(lineHeight * 0.55) });
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

  let y = dynamicLayout.y;
  fitted.items.forEach((item, index) => {
    if (y + item.height > dynamicLayout.y + dynamicLayout.height) return;

    if (item.type === 'separator') {
      drawDescriptionSeparator(context, dynamicLayout, y, fitted.lineHeight);
    } else if (item.type === 'text' && item.line) {
      const nextTextItem = fitted.items.slice(index + 1).find((candidate) => candidate.type === 'text' || candidate.type === 'separator');
      const shouldJustify = Boolean(
        nextTextItem &&
        nextTextItem.type === 'text' &&
        !item.isLore &&
        !nextTextItem.isLore &&
        item.line.includes(' ')
      );

      if (item.isLore) {
        context.fillStyle = 'rgba(255,255,255,0.84)';
        context.font = `italic ${dynamicLayout.weight || '400'} ${Math.max(48, Math.round(fitted.size * 0.94))}px ${family}`;
      } else {
        context.fillStyle = 'rgba(255,255,255,0.96)';
        context.font = `${style}${dynamicLayout.weight || '400'} ${fitted.size}px ${family}`;
      }

      if (shouldJustify) {
        drawTextLineWithIcons(context, item.line, dynamicLayout.x, y, dynamicLayout.width, true, resourceImages);
      } else {
        drawTextLineWithIcons(context, item.line, dynamicLayout.x, y, dynamicLayout.width, false, resourceImages);
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
  context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (customColorActive && customColor) {
    context.save();
    context.beginPath();
    const rx = 125;
    const ry = 410;
    const rw = 1630;
    const rh = 2100;
    const radius = 50; // Beautifully rounded corners to match the frame

    if (context.roundRect) {
      context.roundRect(rx, ry, rw, rh, radius);
    } else {
      // Fallback path drawing rounded rect for backward compatibility
      context.moveTo(rx + radius, ry);
      context.lineTo(rx + rw - radius, ry);
      context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      context.lineTo(rx + rw, ry + rh - radius);
      context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      context.lineTo(rx + radius, ry + rh);
      context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      context.lineTo(rx, ry + radius);
      context.quadraticCurveTo(rx, ry, rx + radius, ry);
    }
    context.closePath();

    context.globalCompositeOperation = 'color';
    context.fillStyle = customColor;
    context.fill();
    context.restore();
  }


  const title = normalizeCardName(cardName).toUpperCase();
  const titleFont = fitTitleFont(context, title);

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(255,255,255,0.38)';
  context.shadowBlur = 10;
  context.fillStyle = 'rgba(245,245,245,0.95)';
  context.font = `900 ${titleFont.size}px Cinzel, Georgia, serif`;
  if ('fontKerning' in context) {
    context.fontKerning = 'normal';
  }
  if ('letterSpacing' in context) {
    context.letterSpacing = '0px';
  }
  drawCenteredSpacedText(
    context,
    title,
    TITLE_HEADER_CENTER_X,
    TITLE_HEADER_CENTER_Y,
    titleFont.letterSpacing,
  );
  context.restore();

  const drawChargeResources = () => {
    if (resourceMode === RESOURCE_MODE_CHARGE_ONLY) {
      drawCenteredChargeRail(context, chargeSlots, resourceImages);
      return;
    }

    drawWeaponResourceRails(context, chargeSlots, consumptionSlots, resourceImages);
  };

  // Draw weapon interface if cardType is weapon or armor or action!
  if (cardType === 'weapon' || cardType === 'skill') {
    // 1. Draw Dice or Element Icon
    if (cardType === 'weapon' && elementIconImg) {
      context.save();
      context.drawImage(elementIconImg, 290 - 200/2, 615 - 200/2, 200, 200);
      context.restore();
    } else if (diceIconImg) {
      drawDiceIcon(context, 290, 615, 200, diceIconImg, diceQty, diceType !== 'DX');
    }

    // 2. Draw Ruler (width increased to 720, label lowered to 635)
    drawRuler(context, CANVAS_WIDTH / 2, 512, 720, alcance, 635);

    // 3. Draw Weapon Type Icon
    if (weaponIconImg) {
      drawWeaponTypeIcon(context, 1598, 615, 200, weaponIconImg);
    }

    drawChargeResources();
    if (cardType === 'skill') {
      drawMinionAttributes(context, minionAttributes, resourceImages);
    }
  } else if (cardType === 'armor' || cardType === 'trap') {
    drawChargeResources();
  } else if (cardType === 'action') {
    if (diceIconImg) {
      const positions = getActionDicePositions(diceQty);
      positions.forEach((pos) => {
        context.save();
        context.drawImage(diceIconImg, pos.x - pos.size / 2, pos.y - pos.size / 2, pos.size, pos.size);
        context.restore();
      });
    }
    drawActionConsumptionRail(context, consumptionSlots, resourceImages);
  } else if (cardType === 'status') {
    if (elementIconImg) {
      context.save();
      const cx = CANVAS_WIDTH / 2;
      const cy = 1120;
      const size = 600;
      context.drawImage(elementIconImg, cx - size / 2, cy - size / 2, size, size);
      context.restore();
    }
  }

  const typeConfig = CARD_TYPES.find((type) => type.id === cardType) || CARD_TYPES[0];
  if (showTraits && typeConfig.maxTraits > 0) {
    const activeRows = typeConfig.maxTraits > 2 ? Math.min(visibleTraitRows, typeConfig.maxTraits / 2) : 1;
    const activeTraitsCount = typeConfig.maxTraits > 2 ? activeRows * 2 : typeConfig.maxTraits;
    const slotLabels = traits.slice(0, activeTraitsCount);
    const traitSlots = cardType === 'skill'
      ? getTraitSlots(typeConfig.layout).slice(2, 2 + activeTraitsCount)
      : getTraitSlots(typeConfig.layout).slice(0, activeTraitsCount);
    traitSlots.forEach((slot, index) => {
      drawTraitBadge(context, slot, slotLabels[index] || '');
    });
  }

  if (cardType !== 'action') {
    drawDescription(context, description, flavorText, typeConfig, showTraits, hyphenate, singleTextStyle, resourceImages, visibleTraitRows);
  }
};

const CardBuilder = ({ onBack, mode = 'player' }) => {
  const canvasRef = useRef(null);
  const descriptionRef = useRef(null);
  const flavorTextRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const imageLoadCacheRef = useRef(new Map());
  const activeImageRef = useRef(null);
  const fontLoadPromiseRef = useRef(null);
  const drawSequenceRef = useRef(0);
  const drawTimerRef = useRef(null);
  const drawFrameRef = useRef(null);
  const [cardName, setCardName] = useState('Gris');
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [flavorText, setFlavorText] = useState(DEFAULT_FLAVOR_TEXT);
  const [focusedField, setFocusedField] = useState(null);
  const [hyphenate, setHyphenate] = useState(true);
  const [singleTextStyle, setSingleTextStyle] = useState('narrative'); // 'narrative' or 'principal'
  const [cardType, setCardType] = useState('weapon');
  const [showTraits, setShowTraits] = useState(true);
  const [visibleTraitRows, setVisibleTraitRows] = useState(3);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [selectedBackground, setSelectedBackground] = useState('Gris.webp');
  const [imageStatus, setImageStatus] = useState('loading');
  const [selectedElement, setSelectedElement] = useState('Ninguno');
  const [customColorActive, setCustomColorActive] = useState(false);
  const [customColor, setCustomColor] = useState('#c8aa6e');

  // New states for Weapon properties
  const [weaponType, setWeaponType] = useState('Cuerpo a cuerpo');
  const [alcance, setAlcance] = useState(0); // 0: Toque, 1: Cercano, 2: Intermedio, 3: Lejano, 4: Extremo
  const [diceType, setDiceType] = useState('D6'); // D4, D6, D8, D10, D12
  const [diceQty, setDiceQty] = useState(1);
  const [chargeSlots, setChargeSlots] = useState(DEFAULT_CHARGE_SLOTS);
  const [consumptionSlots, setConsumptionSlots] = useState(DEFAULT_CONSUMPTION_SLOTS);
  const [resourceMode, setResourceMode] = useState(RESOURCE_MODE_BOTH);
  const [consumptionSlotTypes, setConsumptionSlotTypes] = useState(['consumption', 'consumption', 'consumption', 'consumption', 'consumption']);
  const [minionAttributes, setMinionAttributes] = useState(DEFAULT_MINION_ATTRIBUTES);

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
      const next = [...prev];
      let changed = false;
      consumptionSlots.forEach((slot, index) => {
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
    if (!canvas || !activeBackground) return undefined;
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

    // 1. Load Background Image
    let backgroundImage = null;
    try {
      backgroundImage = await loadCachedImage(activeBackground.src);
    } catch (e) {
      console.error("Could not load background image:", e);
        if (updateStatus) setImageStatus('error');
      return undefined;
    }

    if (updateStatus && drawId !== drawSequenceRef.current) return undefined;

    // Load Weapon Type Image if cardType is weapon-like
    let weaponIconImg = null;
    let diceIconImg = null;
    const resourceImages = {};
    if (cardType === 'weapon' || cardType === 'skill') {
      const iconSrc = getWeaponTypeIconSrc(weaponType);
      try {
        weaponIconImg = await loadCachedImage(iconSrc);
      } catch (e) {
        console.error("Could not load weapon type icon:", e);
      }
    }

    if (cardType === 'weapon' || cardType === 'action' || cardType === 'skill') {
      // Load Dice Icon Image
      const diceSrc = `${process.env.PUBLIC_URL || ''}/dados/cartas/${diceType}.webp`;
      try {
        diceIconImg = await loadCachedImage(diceSrc);
      } catch (e) {
        console.error("Could not load dice icon image:", e);
      }
    }

    const loadsChargeResources = RESOURCE_CARD_TYPES.has(cardType);
    const loadsConsumptionResources = cardType === 'action' || (
      RESOURCE_CARD_TYPES.has(cardType) && resourceMode !== RESOURCE_MODE_CHARGE_ONLY
    );
    const loadsMinionAttributes = cardType === 'skill';

    if (loadsChargeResources || loadsConsumptionResources || loadsMinionAttributes) {
      const resourceOptions = [
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `charge:${option.id}` })),
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `attribute:${option.id}` })),
        ...CONSUMPTION_TYPES.map((option) => ({ ...option, cacheKey: `consumption:${option.id}` })),
        ...ELEMENT_TYPES.filter((option) => option.id !== 'Ninguno').map((option) => ({
          id: option.id,
          label: option.label,
          src: `/elementos/${option.id}.webp`,
          cacheKey: `consumption:${option.id}`,
        })),
      ];
      const requiredResourceOptions = resourceOptions.filter((option) => (
        loadsChargeResources && chargeSlots.includes(option.id) && option.cacheKey.startsWith('charge:')
      ) || (
        loadsConsumptionResources && consumptionSlots.includes(option.id) && option.cacheKey.startsWith('consumption:')
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
    if ((cardType === 'status' || cardType === 'weapon') && selectedElement !== 'Ninguno') {
      const suffix = cardType === 'weapon' ? '_p' : '';
      const elementSrc = `${process.env.PUBLIC_URL || ''}/elementos/${selectedElement}${suffix}.webp`;
      try {
        elementIconImg = await loadCachedImage(elementSrc);
      } catch (e) {
        console.error("Could not load element icon image:", e);
      }
    }

    // 1.5 Load Keyword Icon Images if mentioned in text
    const textToScan = `${description} ${flavorText}`;
    const matchedKeywords = Array.from(new Set(textToScan.match(KEYWORD_REGEX) || []));
    if (matchedKeywords.length > 0) {
      await Promise.all(matchedKeywords.map(async (kwMatch) => {
        const matchedKw = Object.keys(KEYWORD_ICONS).find(kw => kw.toLowerCase() === kwMatch.toLowerCase());
        if (!matchedKw) return;
        const src = `${process.env.PUBLIC_URL || ''}${KEYWORD_ICONS[matchedKw]}`;
        let icon = null;
        try {
          icon = await loadCachedImage(src);
        } catch (e) {
          console.error(`Could not load keyword icon: ${matchedKw}`, e);
        }
        if (icon) {
          resourceImages[`keyword:${matchedKw}`] = icon;
        }
      }));
    }

    if (updateStatus && drawId !== drawSequenceRef.current) return undefined;

    // 2. Draw the card canvas.
    drawCardCanvas(
      canvas,
      backgroundImage,
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
    );

    if (updateStatus) setImageStatus('ready');
    return undefined;
  }, [activeBackground, cardName, cardType, traits, showTraits, description, flavorText, weaponType, alcance, diceType, diceQty, chargeSlots, consumptionSlots, resourceMode, hyphenate, selectedElement, customColorActive, customColor, singleTextStyle, visibleTraitRows, minionAttributes, loadCachedImage]);

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

  const handleReset = () => {
    setCardName('Gris');
    setDescription(DEFAULT_DESCRIPTION);
    setFlavorText(DEFAULT_FLAVOR_TEXT);
    setHyphenate(true);
    setCardType('weapon');
    setShowTraits(true);
    setVisibleTraitRows(3);
    setTraits(DEFAULT_TRAITS);
    setSelectedBackground('Gris.webp');
    setWeaponType('Cuerpo a cuerpo');
    setAlcance(0);
    setDiceType('D6');
    setDiceQty(1);
    setChargeSlots(DEFAULT_CHARGE_SLOTS);
    setConsumptionSlots(DEFAULT_CONSUMPTION_SLOTS);
    setResourceMode(RESOURCE_MODE_BOTH);
    setConsumptionSlotTypes(['consumption', 'consumption', 'consumption', 'consumption', 'consumption']);
    setMinionAttributes(DEFAULT_MINION_ATTRIBUTES);
    setSelectedElement('Ninguno');
    setCustomColorActive(false);
    setCustomColor('#c8aa6e');
  };

  const handleTraitChange = (index, value) => {
    setTraits((currentTraits) => {
      const nextTraits = [...currentTraits];
      nextTraits[index] = value;
      return nextTraits;
    });
  };

  const handleChargeSlotChange = (index, value) => {
    setChargeSlots((currentSlots) => {
      const nextSlots = [...currentSlots];
      nextSlots[index] = value;
      return nextSlots;
    });
  };

  const handleConsumptionSlotChange = (index, value) => {
    setConsumptionSlots((currentSlots) => {
      const nextSlots = [...currentSlots];
      nextSlots[index] = value;
      return nextSlots;
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
    const maxQty = cardType === 'action' ? 6 : 9;
    setDiceQty(Math.min(maxQty, Math.max(1, value)));
  };

  const handleTypeChange = (typeId) => {
    setCardType(typeId);
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
        return currentSlots.map((slot, index) => (
          index === 0 ? 'Armadura_1' : slot === 'Armadura_1' ? slot : EMPTY_SLOT
        ));
      });
    } else if (typeId === 'action') {
      setVisibleTraitRows(0);
      setDiceQty((qty) => Math.min(6, qty));
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[0] = 'Tiempo';
        return nextSlots;
      });
    } else if (typeId === 'weapon') {
      setVisibleTraitRows(3);
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
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

    if (formatType === 'bold') {
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        formatted = selectedText.slice(2, -2);
      } else {
        formatted = `**${selectedText}**`;
      }
    } else if (formatType === 'italic') {
      if (selectedText.startsWith('*') && !selectedText.startsWith('**') && selectedText.endsWith('*') && !selectedText.endsWith('**')) {
        formatted = selectedText.slice(1, -1);
      } else {
        formatted = `*${selectedText}*`;
      }
    } else if (formatType === 'separator') {
      const before = text.slice(0, start);
      const after = text.slice(end);
      const prefix = before.endsWith('\n') || before.length === 0 ? '' : '\n';
      const suffix = after.startsWith('\n') || after.length === 0 ? '' : '\n';
      formatted = `${prefix}---${suffix}`;
      newStart = start;
      newEnd = end;
    } else if (formatType === 'lore') {
      const fallback = 'Texto de lore';
      const loreText = selectedText || fallback;
      if (selectedText.startsWith(LORE_OPEN_TAG) && selectedText.endsWith(LORE_CLOSE_TAG)) {
        formatted = selectedText.slice(LORE_OPEN_TAG.length, -LORE_CLOSE_TAG.length);
      } else {
        formatted = `${LORE_OPEN_TAG}${loreText}${LORE_CLOSE_TAG}`;
      }
    } else if (formatType === 'color') {
      const anyColorMatch = selectedText.match(/^\[color:(#[0-9a-fA-F]{6})\]\{(.*)\}$/);
      if (anyColorMatch) {
        const existingColor = anyColorMatch[1];
        const innerText = anyColorMatch[2];
        if (existingColor === colorVal) {
          formatted = innerText;
        } else {
          formatted = `[color:${colorVal}]{${innerText}}`;
        }
      } else {
        const enclosing = findAnyEnclosingColorTag(text, start, end);
        if (enclosing.found) {
          if (enclosing.color === colorVal) {
            formatted = enclosing.innerText;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
          } else {
            formatted = `[color:${colorVal}]{${enclosing.innerText}}`;
            newStart = enclosing.startIdx;
            newEnd = enclosing.endIdx;
          }
        } else {
          formatted = `[color:${colorVal}]{${selectedText}}`;
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
      textarea.setSelectionRange(newStart, newStart + formatted.length);
    }, 0);
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

  const handleDownload = async () => {
    const exportCanvas = document.createElement('canvas');
    await drawCard(exportCanvas, 1, false);
    const link = document.createElement('a');
    const safeName = normalizeCardName(cardName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'carta';
    link.download = `${safeName}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const usesChargeResources = RESOURCE_CARD_TYPES.has(cardType);
  const usesConsumptionResources = cardType === 'action' || cardType === 'status' || (
    usesChargeResources && resourceMode !== RESOURCE_MODE_CHARGE_ONLY
  );

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
          </div>
        </div>

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

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <Tag className="h-4 w-4" />
                Tipo
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CARD_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeChange(type.id)}
                    className={`border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${cardType === type.id
                      ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                      : 'border-slate-700 bg-[#09090b]/60 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {(cardType === 'weapon' || cardType === 'armor' || cardType === 'trap' || cardType === 'action' || cardType === 'skill' || cardType === 'status') && (
              <div className="space-y-4 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
                <div className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                  {cardType === 'weapon' ? 'Propiedades del Arma' : 
                   cardType === 'armor' ? 'Propiedades de la Armadura' : 
                   cardType === 'trap' ? 'Propiedades de la Trampa' :
                   cardType === 'action' ? 'Propiedades de la Acción' : 
                   cardType === 'skill' ? 'Propiedades del Minion' :
                   'Propiedades del Estado'}
                </div>
                
                {(cardType === 'weapon' || cardType === 'skill') && (
                  <>
                    {/* 1. Tipo de Arma */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tipo de Arma
                      </label>
                      <select
                        value={weaponType}
                        onChange={(event) => setWeaponType(event.target.value)}
                        className="w-full h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70 cursor-pointer"
                      >
                        {WEAPON_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Alcance */}
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
                    {cardType === 'weapon' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Elemento / Estado
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
                    )}
                  </>
                )}

                {(cardType === 'weapon' || cardType === 'action' || cardType === 'skill') && (cardType !== 'weapon' || selectedElement === 'Ninguno') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {cardType === 'weapon' ? 'Dado de Daño' : cardType === 'skill' ? 'Dado del Minion' : 'Dado de Acción'}
                      </label>
                      <select
                        value={diceType}
                        onChange={(event) => setDiceType(event.target.value)}
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
                        Cantidad de Dados
                      </label>
                      {diceType === 'DX' ? (
                        <div className="flex items-center justify-center h-[38px] border border-slate-800 bg-[#09090b]/60 px-2 text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-slate-500 text-center leading-tight">
                          Dado variable. Depende de otros factores.
                        </div>
                      ) : (
                        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] h-[38px] border border-[#c8aa6e]/20 bg-[#09090b]/80">
                          <button
                            type="button"
                            onClick={() => handleDiceQtyChange(diceQty - 1)}
                            className="flex items-center justify-center border-r border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 h-full cursor-pointer"
                            aria-label="Reducir cantidad de dados"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={cardType === 'action' ? 6 : 9}
                            value={diceQty}
                            onChange={(event) => handleDiceQtyChange(parseInt(event.target.value, 10) || 1)}
                            className="w-full h-full bg-transparent px-2 text-center text-sm font-bold text-[#f0e6d2] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDiceQtyChange(diceQty + 1)}
                            className="flex items-center justify-center border-l border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 h-full cursor-pointer"
                            aria-label="Aumentar cantidad de dados"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                {usesChargeResources && (
                  <div className="space-y-2 border-t border-[#c8aa6e]/10 pt-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Recursos
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setResourceMode(RESOURCE_MODE_BOTH)}
                        className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition ${resourceMode === RESOURCE_MODE_BOTH
                          ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                          : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                          }`}
                      >
                        Carga + consumo
                      </button>
                      <button
                        type="button"
                        onClick={() => setResourceMode(RESOURCE_MODE_CHARGE_ONLY)}
                        className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition ${resourceMode === RESOURCE_MODE_CHARGE_ONLY
                          ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                          : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                          }`}
                      >
                        Solo carga
                      </button>
                    </div>
                  </div>
                )}

                {usesChargeResources && (
                  <div className="space-y-2 border-t border-[#c8aa6e]/10 pt-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Carga
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {chargeSlots.map((slot, index) => (
                        <label
                          key={`charge-slot-${index}`}
                          className="grid grid-cols-[1.75rem_1fr] items-center border border-[#c8aa6e]/20 bg-[#09090b]/80"
                        >
                          <span className="border-r border-[#c8aa6e]/15 py-2 text-center text-[10px] font-black text-[#c8aa6e]">
                            {index + 1}
                          </span>
                          <select
                            value={slot}
                            onChange={(event) => handleChargeSlotChange(index, event.target.value)}
                            className="min-w-0 bg-transparent px-2 py-2 text-xs font-bold uppercase text-[#f0e6d2] outline-none"
                            aria-label={`Carga ${index + 1}`}
                          >
                            <option value="">Vacío</option>
                            {CHARGE_TYPES.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {usesConsumptionResources && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {cardType === 'weapon' ? 'Consumo' : cardType === 'armor' ? 'Armadura' : 'Consumo'}
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {consumptionSlots.map((slot, index) => (
                      <div
                        key={`consumption-slot-${index}`}
                        className={`grid items-center border border-[#c8aa6e]/20 bg-[#09090b]/80 ${
                          cardType === 'armor' ? 'grid-cols-[1.75rem_minmax(0,1fr)]' : 'grid-cols-[1.5rem_minmax(0,1fr)_2.25rem]'
                        }`}
                      >
                        <span className="border-r border-[#c8aa6e]/15 py-2 text-center text-[10px] font-black text-[#c8aa6e]">
                          {index + 1}
                        </span>
                        <select
                          value={slot}
                          onChange={(event) => handleConsumptionSlotChange(index, event.target.value)}
                          className={`min-w-0 bg-transparent py-2 font-bold uppercase text-[#f0e6d2] outline-none cursor-pointer h-full ${
                            cardType !== 'armor' && slot === 'Armadura_1'
                              ? 'px-1 text-[10px] tracking-normal'
                              : 'px-2 text-xs'
                          }`}
                          aria-label={cardType === 'weapon' ? `Consumo ${index + 1}` : cardType === 'armor' ? `Armadura ${index + 1}` : `Consumo ${index + 1}`}
                        >
                          <option value="">Vacío</option>
                          {cardType === 'armor'
                            ? CONSUMPTION_TYPES.filter((option) => option.id === 'Armadura_1').map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))
                            : (consumptionSlotTypes[index] || 'consumption') === 'consumption'
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
                              const nextTypes = [...consumptionSlotTypes];
                              const currentType = nextTypes[index] || 'consumption';
                              nextTypes[index] = currentType === 'consumption' ? 'element' : 'consumption';
                              setConsumptionSlotTypes(nextTypes);
                              handleConsumptionSlotChange(index, '');
                            }}
                            className={`h-full border-l border-[#c8aa6e]/15 text-[9px] sm:text-[10px] font-bold uppercase transition flex items-center justify-center cursor-pointer select-none ${
                              (consumptionSlotTypes[index] || 'consumption') === 'consumption'
                                ? 'text-[#c8aa6e] bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/15'
                                : 'text-teal-400 bg-teal-500/10 hover:bg-teal-500/20'
                            }`}
                            title={(consumptionSlotTypes[index] || 'consumption') === 'consumption' ? "Cambiar a Elemento" : "Cambiar a Consumo"}
                          >
                            {(consumptionSlotTypes[index] || 'consumption') === 'consumption' ? 'CON' : 'ELE'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )}
                {cardType === 'status' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Elemento / Estado
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
                )}
              </div>
            )}

            {activeType.id !== 'action' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                    <Type className="h-4 w-4" />
                    {hasSplitDescription ? 'Texto principal' : 'Descripción'}
                  </label>
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hyphenate}
                      onChange={(event) => setHyphenate(event.target.checked)}
                      className="h-4 w-4 accent-[#c8aa6e] cursor-pointer"
                    />
                    Guionizar
                  </label>
                </div>
                {renderToolbar(descriptionRef, 'description')}
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(event) => handleDescriptionChange(event.target.value)}
                  onKeyDown={(event) => handleTextareaKeyDown(event, descriptionRef, setDescription, descriptionHistoryRef, description)}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  rows={hasSplitDescription ? 4 : 5}
                  maxLength={hasSplitDescription ? 360 : 520}
                  className="min-h-[112px] w-full resize-y border border-t-0 border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70 focus:shadow-[0_4px_12px_rgba(200,170,110,0.06),_4px_0_12px_rgba(200,170,110,0.06),_-4px_0_12px_rgba(200,170,110,0.06)] rounded-b-md"
                  placeholder={hasSplitDescription ? 'Descripción de la carta' : 'Texto descriptivo de la carta'}
                />
                {!hasSplitDescription && (
                  <div className="flex justify-center gap-1.5 pt-1.5">
                    {['narrative', 'principal'].map((styleOpt) => (
                      <button
                        key={styleOpt}
                        type="button"
                        onClick={() => setSingleTextStyle(styleOpt)}
                        className={`border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition cursor-pointer ${
                          singleTextStyle === styleOpt
                            ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                            : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                        }`}
                      >
                        {styleOpt === 'narrative' ? 'Narrativo' : 'Principal'}
                      </button>
                    ))}
                  </div>
                )}
                {hasSplitDescription && (
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e] pb-1">
                      <Type className="h-4 w-4" />
                      Texto narrativo
                    </label>
                    {renderToolbar(flavorTextRef, 'flavorText')}
                    <textarea
                      ref={flavorTextRef}
                      value={flavorText}
                      onChange={(event) => handleFlavorTextChange(event.target.value)}
                      onKeyDown={(event) => handleTextareaKeyDown(event, flavorTextRef, setFlavorText, flavorTextHistoryRef, flavorText)}
                      onFocus={() => setFocusedField('flavorText')}
                      onBlur={() => setFocusedField(null)}
                      rows={5}
                      maxLength={560}
                      className="min-h-[132px] w-full resize-y border border-t-0 border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold italic leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70 focus:shadow-[0_4px_12px_rgba(200,170,110,0.06),_4px_0_12px_rgba(200,170,110,0.06),_-4px_0_12px_rgba(200,170,110,0.06)] rounded-b-md"
                      placeholder="Texto descriptivo de la carta"
                    />
                  </div>
                )}
              </div>
            )}

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

              {activeType.maxTraits === 0 ? (
                <div className="border border-slate-800 bg-[#09090b]/60 px-3 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Este tipo no usa rasgos.
                </div>
              ) : showTraits ? (
                <div className="space-y-3">
                  {activeType.maxTraits > 2 && (
                    <div className="flex items-center justify-between gap-2 border-b border-[#c8aa6e]/10 pb-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Filas / Pares visibles
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: activeType.maxTraits / 2 }).map((_, i) => {
                          const rowVal = i + 1;
                          const isSelected = visibleTraitRows === rowVal;
                          return (
                            <button
                              key={`visible-rows-${rowVal}`}
                              type="button"
                              onClick={() => setVisibleTraitRows(rowVal)}
                              className={`h-7 w-10 border text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]'
                                  : 'border-slate-800 bg-[#09090b]/40 text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'
                              }`}
                            >
                              {rowVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {Array.from({ length: activeType.maxTraits > 2 ? Math.min(visibleTraitRows, activeType.maxTraits / 2) * 2 : activeType.maxTraits }).map((_, index) => (
                      <input
                        key={`${cardType}-trait-${index}`}
                        value={traits[index] || ''}
                        onChange={(event) => handleTraitChange(index, event.target.value)}
                        maxLength={22}
                        className="w-full border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 py-2 text-sm font-bold uppercase tracking-[0.08em] text-[#f0e6d2] outline-none transition placeholder:text-slate-700 focus:border-[#c8aa6e]/70"
                        placeholder={cardType === 'trap' ? 'TRAMPA' : `Rasgo ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-slate-800 bg-[#09090b]/60 px-3 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Los letreros están ocultos.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <Palette className="h-4 w-4" />
                Fondo
              </div>

              <div className="grid grid-cols-3 gap-3 pr-1 sm:grid-cols-5 lg:max-h-[56vh] lg:grid-cols-3 lg:overflow-y-auto lg:custom-scrollbar">
                {CARD_BACKGROUNDS.map((background) => {
                  const isSelected = background.file === selectedBackground;

                  return (
                    <button
                      key={background.file}
                      type="button"
                      onClick={() => setSelectedBackground(background.file)}
                      className={`group relative aspect-[1888/2624] overflow-hidden border bg-[#09090b] transition-all ${isSelected
                        ? 'border-[#c8aa6e] shadow-[0_0_20px_rgba(200,170,110,0.28)]'
                        : 'border-slate-700/70 hover:border-[#c8aa6e]/60'
                        }`}
                      title={background.name}
                      aria-label={`Fondo ${background.name}`}
                      aria-pressed={isSelected}
                    >
                      <img
                        src={background.src}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200">
                        {background.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom background color overlay controls */}
              <div className="mt-3 space-y-2.5 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                    <input
                      type="checkbox"
                      checked={customColorActive}
                      onChange={(event) => {
                        setCustomColorActive(event.target.checked);
                        if (event.target.checked) {
                          setSelectedBackground('Gris.webp');
                        }
                      }}
                      className="h-4 w-4 accent-[#c8aa6e]"
                    />
                    Personalizar color
                  </label>
                </div>
                {customColorActive && (
                  <div className="space-y-2 border-t border-[#c8aa6e]/10 pt-2.5">
                    <HexColorInput value={customColor} onChange={setCustomColor} />
                    <p className="text-[10px] italic leading-normal text-slate-400">
                      * Se recomienda usar el fondo <strong>Gris</strong> como base para obtener colores puros.
                    </p>
                  </div>
                )}
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
                className="relative w-full max-w-[380px] sm:max-w-[460px] lg:max-w-[520px] lg:max-h-[calc(100vh-220px)] shrink-0 select-none"
                style={{ aspectRatio: '1888/2624' }}
              >
                {/* Glow radial centrado exactamente detrás de la previsualización de la carta */}
                <div className="pointer-events-none absolute -inset-[32%] bg-[radial-gradient(circle_at_center,_rgba(200,170,110,0.18)_0%,_rgba(9,9,11,0)_70%)] z-0" />
                
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="relative z-10 block w-full h-full border border-white/15 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.7)] select-none outline-none"
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
};

export default CardBuilder;
