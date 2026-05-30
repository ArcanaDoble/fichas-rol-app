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
  { id: 'skill', label: 'Habilidad', maxTraits: 6, layout: 'weapon' },
  { id: 'status', label: 'Estado', maxTraits: 1, layout: 'trap' },
];

export const ELEMENT_TYPES = [
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

const CHARGE_TYPES = [
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/cargas/Hambre.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/cargas/Cuerpo.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/cargas/Mente.webp' },
];

const CONSUMPTION_TYPES = [
  { id: 'Recurso', label: 'Recurso', src: '/interfaz/consumos/Recurso.webp' },
  { id: 'Armadura_1', label: 'Armadura', src: '/interfaz/consumos/Armadura_1.webp' },
  { id: 'Cuerpo', label: 'Cuerpo', src: '/interfaz/consumos/Cuerpo.webp' },
  { id: 'Hambre', label: 'Hambre', src: '/interfaz/consumos/Hambre.webp' },
  { id: 'Mente', label: 'Mente', src: '/interfaz/consumos/Mente.webp' },
  { id: 'Tiempo', label: 'Tiempo', src: '/interfaz/consumos/Tiempo.webp' },
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

const drawDiceIcon = (context, x, y, size, imgElement, qty) => {
  if (!imgElement) return;
  context.save();
  
  // 1. Draw the preloaded dice image centered at x, y
  context.drawImage(imgElement, x - size/2, y - size/2, size, size);
  
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

const usesSplitDescription = (typeConfig, showTraits) => (
  typeConfig.id === 'trap' || 
  (typeConfig.id === 'skill' && !showTraits) ||
  (typeConfig.id === 'weapon' && !showTraits)
);

const getDynamicStartingLayout = (layout, text, isPrimary) => {
  return layout;
};

const getDescriptionLayouts = (typeConfig, showTraits, singleTextStyle = 'narrative') => {
  if (typeConfig.id === 'action') return {};

  const hasRails = typeConfig.id === 'weapon' || typeConfig.id === 'armor' || typeConfig.id === 'trap' || typeConfig.id === 'skill';
  const isSkillOrTrapWithoutTraits = (typeConfig.id === 'skill' || typeConfig.id === 'trap') && !showTraits;

  if (usesSplitDescription(typeConfig, showTraits)) {
    const isTrapOrWeaponWithoutTraits = typeConfig.id === 'trap' || (typeConfig.id === 'weapon' && !showTraits);
    let primaryY = 815;
    let primaryHeight = 480;
    let flavorY = 1350;
    let flavorHeight = hasRails ? 930 : 1090;

    if (isSkillOrTrapWithoutTraits) {
      primaryY = 508;
      primaryHeight = 858;
      flavorY = 1421;
      flavorHeight = 859;
    } else if (isTrapOrWeaponWithoutTraits) {
      primaryHeight = 705;
      flavorY = 1575;
      flavorHeight = 705;
    }

    return {
      primary: {
        x: 210,
        y: primaryY,
        width: 1470,
        height: primaryHeight,
        fontSize: 85,
        lineHeight: 104,
        italic: false,
        weight: 600,
        family: "Georgia, serif",
      },
      flavor: {
        x: 210,
        y: flavorY,
        width: 1470,
        height: flavorHeight,
        fontSize: 80,
        lineHeight: 98,
        italic: true,
        weight: 600,
        family: "Georgia, serif",
      },
    };
  }

  return {
    flavor: {
      x: 210,
      y: 1545,
      width: 1470,
      height: hasRails ? 740 : 895,
      fontSize: 85,
      lineHeight: 104,
      italic: singleTextStyle === 'narrative',
      weight: 600,
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

const splitLongWord = (context, word, maxWidth) => {
  if (context.measureText(word).width <= maxWidth) return [word];

  const chunks = [];
  let chunk = '';
  Array.from(word).forEach((character) => {
    const nextChunk = `${chunk}${character}`;
    if (context.measureText(nextChunk).width <= maxWidth || !chunk) {
      chunk = nextChunk;
      return;
    }

    chunks.push(chunk);
    chunk = character;
  });

  if (chunk) chunks.push(chunk);
  return chunks;
};

const wrapDescriptionText = (context, text, maxWidth, hyphenate = false) => {
  const paragraphs = text
    .trim()
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/).flatMap((word) => splitLongWord(context, word, maxWidth));
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextLine = line ? `${line} ${word}` : word;

      if (context.measureText(nextLine).width <= maxWidth || !line) {
        line = nextLine;
        continue;
      }

      if (hyphenate) {
        const match = word.match(/^([^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ]*)(.*?)([^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ]*)$/);
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
              const prefix = syllables.slice(0, k).join('') + '-';
              const suffix = syllables.slice(k).join('');
              const testLine = line ? `${line} ${prefix}` : prefix;

              if (context.measureText(testLine).width <= maxWidth) {
                lines.push(testLine);
                line = suffix;
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

      lines.push(line);
      line = word;
    }

    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });

  return lines;
};

const fitDescriptionFont = (context, text, layout, hyphenate = false) => {
  let size = layout.fontSize;
  let lineHeight = layout.lineHeight;
  let lines = [];
  const style = layout.italic ? 'italic ' : '';
  const family = layout.family || "Georgia, serif";

  while (size > 48) {
    context.font = `${style}${layout.weight} ${size}px ${family}`;
    lines = wrapDescriptionText(context, text, layout.width, hyphenate);
    const textHeight = lines.length * lineHeight;
    if (textHeight <= layout.height) break;
    size -= 1;
    lineHeight = Math.round(size * 1.22);
  }

  return { size, lineHeight, lines };
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

const drawTextBlock = (context, textValue, layout, previewText = '', hyphenate = false) => {
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
  context.font = `${style}400 ${fitted.size}px ${family}`;

  let y = dynamicLayout.y;
  fitted.lines.forEach((line, index) => {
    if (y + fitted.lineHeight > dynamicLayout.y + dynamicLayout.height) return;
    if (line) {
      if (shouldJustifyLine(fitted.lines, index)) {
        drawJustifiedLine(context, line, dynamicLayout.x, y, dynamicLayout.width);
      } else {
        context.fillText(line, dynamicLayout.x, y);
      }
    }
    y += fitted.lineHeight;
  });

  context.restore();
};

const drawDescription = (context, description, flavorText, typeConfig, showTraits, hyphenate = false, singleTextStyle = 'narrative') => {
  const layouts = getDescriptionLayouts(typeConfig, showTraits, singleTextStyle);

  if (layouts.primary) {
    drawTextBlock(context, description, layouts.primary, PRIMARY_DESCRIPTION_PREVIEW_TEXT, hyphenate);
    drawTextBlock(context, flavorText, layouts.flavor, FLAVOR_DESCRIPTION_PREVIEW_TEXT, hyphenate);
    return;
  }

  drawTextBlock(context, description, layouts.flavor, DESCRIPTION_PREVIEW_TEXT, hyphenate);
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
) => {
  const context = canvas.getContext('2d');

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
  if (cardType === 'weapon') {
    // 1. Draw Dice
    if (diceIconImg) {
      drawDiceIcon(context, 290, 615, 200, diceIconImg, diceQty);
    }

    // 2. Draw Ruler (width increased to 720, label lowered to 635)
    drawRuler(context, CANVAS_WIDTH / 2, 512, 720, alcance, 635);

    // 3. Draw Weapon Type Icon
    if (weaponIconImg) {
      drawWeaponTypeIcon(context, 1598, 615, 200, weaponIconImg);
    }

    drawChargeResources();
  } else if (cardType === 'armor' || cardType === 'trap' || cardType === 'skill') {
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
    const slotLabels = traits.slice(0, typeConfig.maxTraits);
    getTraitSlots(typeConfig.layout).slice(0, typeConfig.maxTraits).forEach((slot, index) => {
      drawTraitBadge(context, slot, slotLabels[index] || '');
    });
  }

  if (cardType !== 'action') {
    drawDescription(context, description, flavorText, typeConfig, showTraits, hyphenate, singleTextStyle);
  }
};

const CardBuilder = ({ onBack, mode = 'player' }) => {
  const canvasRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const activeImageRef = useRef(null);
  const fontLoadPromiseRef = useRef(null);
  const drawSequenceRef = useRef(0);
  const [cardName, setCardName] = useState('Gris');
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [flavorText, setFlavorText] = useState(DEFAULT_FLAVOR_TEXT);
  const [hyphenate, setHyphenate] = useState(true);
  const [singleTextStyle, setSingleTextStyle] = useState('narrative'); // 'narrative' or 'principal'
  const [cardType, setCardType] = useState('weapon');
  const [showTraits, setShowTraits] = useState(true);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [selectedBackground, setSelectedBackground] = useState('Gris.webp');
  const [imageStatus, setImageStatus] = useState('loading');
  const [selectedElement, setSelectedElement] = useState('Fuego');
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

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeBackground) return undefined;
    const drawId = drawSequenceRef.current + 1;
    drawSequenceRef.current = drawId;

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
    if (drawId !== drawSequenceRef.current) return undefined;

    // 1. Load Background Image
    let backgroundImage = imageCacheRef.current.get(activeBackground.src);
    if (!backgroundImage) {
      try {
        backgroundImage = await new Promise((resolve, reject) => {
          const img = new Image();
          img.decoding = 'async';
          img.src = activeBackground.src;
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
        imageCacheRef.current.set(activeBackground.src, backgroundImage);
      } catch (e) {
        console.error("Could not load background image:", e);
        setImageStatus('error');
        return undefined;
      }
    }

    if (drawId !== drawSequenceRef.current) return undefined;

    // Load Weapon Type Image if cardType is weapon
    let weaponIconImg = null;
    let diceIconImg = null;
    const resourceImages = {};
    if (cardType === 'weapon') {
      const iconSrc = getWeaponTypeIconSrc(weaponType);
      weaponIconImg = imageCacheRef.current.get(iconSrc);
      if (!weaponIconImg) {
        try {
          weaponIconImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = iconSrc;
            img.onload = () => resolve(img);
            img.onerror = reject;
          });
          imageCacheRef.current.set(iconSrc, weaponIconImg);
        } catch (e) {
          console.error("Could not load weapon type icon:", e);
        }
      }
    }

    if (cardType === 'weapon' || cardType === 'action') {
      // Load Dice Icon Image
      const diceSrc = `${process.env.PUBLIC_URL || ''}/dados/cartas/${diceType}.webp`;
      diceIconImg = imageCacheRef.current.get(diceSrc);
      if (!diceIconImg) {
        try {
          diceIconImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = diceSrc;
            img.onload = () => resolve(img);
            img.onerror = reject;
          });
          imageCacheRef.current.set(diceSrc, diceIconImg);
        } catch (e) {
          console.error("Could not load dice icon image:", e);
        }
      }
    }

    const loadsChargeResources = RESOURCE_CARD_TYPES.has(cardType);
    const loadsConsumptionResources = cardType === 'action' || (
      RESOURCE_CARD_TYPES.has(cardType) && resourceMode !== RESOURCE_MODE_CHARGE_ONLY
    );

    if (loadsChargeResources || loadsConsumptionResources) {
      const resourceOptions = [
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `charge:${option.id}` })),
        ...CONSUMPTION_TYPES.map((option) => ({ ...option, cacheKey: `consumption:${option.id}` })),
      ];
      const requiredResourceOptions = resourceOptions.filter((option) => (
        loadsChargeResources && chargeSlots.includes(option.id) && option.cacheKey.startsWith('charge:')
      ) || (
        loadsConsumptionResources && consumptionSlots.includes(option.id) && option.cacheKey.startsWith('consumption:')
      ));

      await Promise.all(requiredResourceOptions.map(async (option) => {
        const src = `${process.env.PUBLIC_URL || ''}${option.src}`;
        let icon = imageCacheRef.current.get(src);
        if (!icon) {
          try {
            icon = await new Promise((resolve, reject) => {
              const img = new Image();
              img.decoding = 'async';
              img.src = src;
              img.onload = () => resolve(img);
              img.onerror = reject;
            });
            imageCacheRef.current.set(src, icon);
          } catch (e) {
            console.error(`Could not load resource icon: ${option.cacheKey}`, e);
          }
        }
        if (icon) {
          resourceImages[option.cacheKey] = icon;
        }
      }));
    }

    let elementIconImg = null;
    if (cardType === 'status') {
      const elementSrc = `${process.env.PUBLIC_URL || ''}/elementos/${selectedElement}.webp`;
      elementIconImg = imageCacheRef.current.get(elementSrc);
      if (!elementIconImg) {
        try {
          elementIconImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = elementSrc;
            img.onload = () => resolve(img);
            img.onerror = reject;
          });
          imageCacheRef.current.set(elementSrc, elementIconImg);
        } catch (e) {
          console.error("Could not load element icon image:", e);
        }
      }
    }

    if (drawId !== drawSequenceRef.current) return undefined;

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
    );

    setImageStatus('ready');
    return undefined;
  }, [activeBackground, cardName, cardType, traits, showTraits, description, flavorText, weaponType, alcance, diceType, diceQty, chargeSlots, consumptionSlots, resourceMode, hyphenate, selectedElement, customColorActive, customColor, singleTextStyle]);

  useEffect(() => {
    let cleanup;
    let disposed = false;

    Promise.resolve(drawCard()).then((drawCleanup) => {
      if (disposed) {
        if (typeof drawCleanup === 'function') drawCleanup();
        return;
      }
      cleanup = drawCleanup;
    });

    return () => {
      disposed = true;
      if (typeof cleanup === 'function') cleanup();
    };
  }, [drawCard]);

  useEffect(() => {
    CARD_BACKGROUNDS.forEach((background) => {
      if (imageCacheRef.current.has(background.src)) return;

      const image = new Image();
      image.decoding = 'async';
      image.src = background.src;
      image.onload = () => {
        imageCacheRef.current.set(background.src, image);
      };
    });
  }, []);

  const handleReset = () => {
    setCardName('Gris');
    setDescription(DEFAULT_DESCRIPTION);
    setFlavorText(DEFAULT_FLAVOR_TEXT);
    setHyphenate(true);
    setCardType('weapon');
    setShowTraits(true);
    setTraits(DEFAULT_TRAITS);
    setSelectedBackground('Gris.webp');
    setWeaponType('Cuerpo a cuerpo');
    setAlcance(0);
    setDiceType('D6');
    setDiceQty(1);
    setChargeSlots(DEFAULT_CHARGE_SLOTS);
    setConsumptionSlots(DEFAULT_CONSUMPTION_SLOTS);
    setResourceMode(RESOURCE_MODE_BOTH);
    setSelectedElement('Fuego');
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

  const handleDiceQtyChange = (value) => {
    const maxQty = cardType === 'action' ? 6 : 9;
    setDiceQty(Math.min(maxQty, Math.max(1, value)));
  };

  const handleTypeChange = (typeId) => {
    setCardType(typeId);
    if (typeId === 'trap') {
      setShowTraits(true);
      setTraits((currentTraits) => {
        const nextTraits = [...currentTraits];
        nextTraits[0] = nextTraits[0]?.trim() ? nextTraits[0] : 'TRAMPA';
        return nextTraits;
      });
    } else if (typeId === 'status') {
      setShowTraits(true);
      setTraits((currentTraits) => {
        const nextTraits = [...currentTraits];
        nextTraits[0] = nextTraits[0]?.trim() ? nextTraits[0] : 'ESTADO';
        return nextTraits;
      });
      setCardName((name) => name === 'Gris' ? 'ARDIENDO' : name);
    } else if (typeId === 'armor') {
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[0] = 'Armadura_1';
        return nextSlots;
      });
    } else if (typeId === 'action') {
      setDiceQty((qty) => Math.min(6, qty));
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[0] = 'Tiempo';
        return nextSlots;
      });
    } else if (typeId === 'weapon') {
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[0] = 'Tiempo';
        return nextSlots;
      });
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    const safeName = normalizeCardName(cardName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'carta';
    link.download = `${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
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
                   cardType === 'skill' ? 'Propiedades de la Habilidad' :
                   'Propiedades del Estado'}
                </div>
                
                {cardType === 'weapon' && (
                  <>
                    {/* 1. Tipo de Arma */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tipo de Arma
                      </label>
                      <select
                        value={weaponType}
                        onChange={(event) => setWeaponType(event.target.value)}
                        className="w-full border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 py-2 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70"
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
                  </>
                )}

                {(cardType === 'weapon' || cardType === 'action') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {cardType === 'weapon' ? 'Dado de Daño' : 'Dado de Acción'}
                      </label>
                      <select
                        value={diceType}
                        onChange={(event) => setDiceType(event.target.value)}
                        className="w-full border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 py-2 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70"
                      >
                        {['D4', 'D6', 'D8', 'D10', 'D12'].map((type) => (
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
                      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] border border-[#c8aa6e]/20 bg-[#09090b]/80">
                        <button
                          type="button"
                          onClick={() => handleDiceQtyChange(diceQty - 1)}
                          className="flex items-center justify-center border-r border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10"
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
                          className="w-full bg-transparent px-2 py-2 text-center text-sm font-bold text-[#f0e6d2] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDiceQtyChange(diceQty + 1)}
                          className="flex items-center justify-center border-l border-[#c8aa6e]/15 text-base font-black text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10"
                          aria-label="Aumentar cantidad de dados"
                        >
                          +
                        </button>
                      </div>
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
                      <label
                        key={`consumption-slot-${index}`}
                        className="grid grid-cols-[1.75rem_1fr] items-center border border-[#c8aa6e]/20 bg-[#09090b]/80"
                      >
                        <span className="border-r border-[#c8aa6e]/15 py-2 text-center text-[10px] font-black text-[#c8aa6e]">
                          {index + 1}
                        </span>
                        <select
                          value={slot}
                          onChange={(event) => handleConsumptionSlotChange(index, event.target.value)}
                          className="min-w-0 bg-transparent px-2 py-2 text-xs font-bold uppercase text-[#f0e6d2] outline-none"
                          aria-label={cardType === 'weapon' ? `Consumo ${index + 1}` : cardType === 'armor' ? `Armadura ${index + 1}` : `Consumo ${index + 1}`}
                        >
                          <option value="">Vacío</option>
                          {CONSUMPTION_TYPES.map((option) => (
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
                {cardType === 'status' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Elemento / Estado
                    </label>
                    <select
                      value={selectedElement}
                      onChange={(event) => setSelectedElement(event.target.value)}
                      className="w-full border border-[#c8aa6e]/20 bg-[#09090b]/80 px-3 py-2 text-sm font-semibold text-[#f0e6d2] outline-none focus:border-[#c8aa6e]/70"
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
                <div className="flex items-center justify-between gap-3">
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
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={hasSplitDescription ? 4 : 5}
                  maxLength={hasSplitDescription ? 360 : 520}
                  className="min-h-[112px] w-full resize-y border border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70"
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
                    <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                      <Type className="h-4 w-4" />
                      Texto narrativo
                    </label>
                    <textarea
                      value={flavorText}
                      onChange={(event) => setFlavorText(event.target.value)}
                      rows={5}
                      maxLength={560}
                      className="min-h-[132px] w-full resize-y border border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold italic leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70"
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {Array.from({ length: activeType.maxTraits }).map((_, index) => (
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

          <main className="sticky top-0 z-10 order-1 flex min-h-[520px] items-center justify-center overflow-hidden border border-[#c8aa6e]/15 bg-[#05070d]/30 p-3 md:p-8 lg:relative lg:order-2 lg:min-h-[620px] lg:items-start lg:justify-center lg:overflow-visible">
            <div className="pointer-events-none absolute inset-0 bg-[#05070d]/50" />
            <div className="relative flex h-full w-full max-w-full items-center justify-center lg:sticky lg:top-12 lg:self-start lg:h-fit lg:w-full lg:items-start">
              <div 
                className="relative w-full max-w-[380px] sm:max-w-[460px] lg:max-w-[520px] lg:max-h-[calc(100vh-220px)] shrink-0"
                style={{ aspectRatio: '1888/2624' }}
              >
                {/* Glow radial centrado exactamente detrás de la previsualización de la carta */}
                <div className="pointer-events-none absolute -inset-[32%] bg-[radial-gradient(circle_at_center,_rgba(200,170,110,0.18)_0%,_rgba(9,9,11,0)_70%)] z-0" />
                
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="relative z-10 block w-full h-full border border-white/15 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.7)]"
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
