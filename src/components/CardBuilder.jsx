import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, Download, Palette, RotateCcw, Tag, Type } from 'lucide-react';

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

export const WEAPON_TYPES = [
  'Ametralladora',
  'Arco',
  'Ballesta',
  'Clava',
  'Daga',
  'Escopeta',
  'Espada',
  'Fusil',
  'Hacha',
  'Lanza',
  'Martillo',
  'Maza',
  'Pistola',
  'Revólver',
  'Rifle'
];

const drawDiceIcon = (context, x, y, size, imgElement, qty) => {
  if (!imgElement) return;
  context.save();
  
  // 1. Draw the preloaded dice image centered at x, y
  context.drawImage(imgElement, x - size/2, y - size/2, size, size);
  
  // 2. Draw the quantity number to the right (e.g. "1")
  const qtyX = x + size/2 + 24;
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#000000';
  context.lineWidth = 26;
  context.lineJoin = 'round';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.font = '900 130px Lato, Arial, sans-serif';
  context.strokeText(qty.toString(), qtyX, y + 4);
  context.fillText(qty.toString(), qtyX, y + 4);
  
  context.restore();
};

const drawRuler = (context, x, y, width, selectedIndex, labelY = y + 90) => {
  context.save();
  
  const tickNames = ['TOQUE', 'CERCANO', 'INTERMEDIO', 'LEJANO', 'EXTREMO'];
  const startX = x - width / 2;
  const step = width / 4;
  
  // 1. Draw the horizontal ruler line with black outline
  // Outline
  context.strokeStyle = '#000000';
  context.lineWidth = 40; // Double width for outline (was 32)
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX, y);
  context.lineTo(startX + width, y);
  context.stroke();
  
  // Inner white line
  context.strokeStyle = '#ffffff';
  context.lineWidth = 20; // Inner white line thickness (was 16)
  context.beginPath();
  context.moveTo(startX, y);
  context.lineTo(startX + width, y);
  context.stroke();
  
  // 2. Draw the 5 ticks
  for (let i = 0; i < 5; i++) {
    const tickX = startX + i * step;
    const isSelected = i === selectedIndex;
    
    // Draw tick line with outline
    context.strokeStyle = '#000000';
    context.lineWidth = isSelected ? 44 : 28;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(tickX, y - (isSelected ? 36 : 24));
    context.lineTo(tickX, y + (isSelected ? 36 : 24));
    context.stroke();
    
    // Inner tick line (Red if selected, White if not)
    context.strokeStyle = isSelected ? '#e51c23' : '#ffffff';
    context.lineWidth = isSelected ? 26 : 14;
    context.beginPath();
    context.moveTo(tickX, y - (isSelected ? 36 : 24));
    context.lineTo(tickX, y + (isSelected ? 36 : 24));
    context.stroke();
  }
  
  // 3. Draw the active range text centered below the ruler
  const labelText = tickNames[selectedIndex] || 'TOQUE';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#000000';
  context.lineWidth = 16;
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
  const y = 2372;
  const height = 168;
  const slotSize = 122;
  const railWidth = 780;
  const railX = (CANVAS_WIDTH - railWidth) / 2; // Centered
  const slotGap = 8;
  const slotsWidth = slotSize * 5 + slotGap * 4;
  const startX = railX + (railWidth - slotsWidth) / 2 + slotSize / 2;

  drawRailBase(context, railX, y, railWidth, height, 'left');

  const displayConsumptionSlots = [...consumptionSlots].reverse();

  displayConsumptionSlots.forEach((slot, index) => {
    const x = startX + index * (slotSize + slotGap);
    const slotY = y + height / 2;
    drawEmptyCircleSlot(context, x, slotY, slotSize);
    drawSlotIcon(context, resourceImages[`consumption:${slot}`], x, slotY, slotSize, 'circle');
  });
};

const createRailPath = (context, x, y, width, height, side = 'left') => {
  const bevel = 82;
  context.beginPath();
  if (side === 'left') {
    context.moveTo(x, y + height / 2);
    context.lineTo(x + bevel, y);
    context.lineTo(x + width - bevel, y);
    context.lineTo(x + width, y + height / 2);
    context.lineTo(x + width - bevel, y + height);
    context.lineTo(x + bevel, y + height);
  } else {
    context.moveTo(x, y + height / 2);
    context.lineTo(x + bevel, y);
    context.lineTo(x + width - bevel, y);
    context.lineTo(x + width, y + height / 2);
    context.lineTo(x + width - bevel, y + height);
    context.lineTo(x + bevel, y + height);
  }
  context.closePath();
};

const drawRailBase = (context, x, y, width, height, side) => {
  context.save();
  createRailPath(context, x, y, width, height, side);
  context.shadowColor = 'rgba(255,255,255,0.28)';
  context.shadowBlur = 16;
  context.fillStyle = 'rgba(0,0,0,0.96)';
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.stroke();
  context.restore();
};

const drawDiamondSlotPath = (context, x, y, size) => {
  context.beginPath();
  context.moveTo(x, y - size / 2);
  context.lineTo(x + size / 2, y);
  context.lineTo(x, y + size / 2);
  context.lineTo(x - size / 2, y);
  context.closePath();
};

const drawEmptyDiamondSlot = (context, x, y, size) => {
  context.save();
  drawDiamondSlotPath(context, x, y, size);
  const gradient = context.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
  gradient.addColorStop(0, '#4a4a4a');
  gradient.addColorStop(0.5, '#626262');
  gradient.addColorStop(1, '#2d2d2d');
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(255,255,255,0.16)';
  context.shadowBlur = 12;
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.stroke();
  context.restore();
};

const drawEmptyCircleSlot = (context, x, y, size) => {
  context.save();
  const radius = size / 2;
  const gradient = context.createRadialGradient(x - radius * 0.28, y - radius * 0.35, radius * 0.1, x, y, radius);
  gradient.addColorStop(0, '#737373');
  gradient.addColorStop(0.58, '#555555');
  gradient.addColorStop(1, '#2b2b2b');
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(255,255,255,0.16)';
  context.shadowBlur = 12;
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(0,0,0,0.58)';
  context.stroke();
  context.restore();
};

const drawSlotIcon = (context, iconImage, x, y, size, shape) => {
  if (!iconImage) return;
  context.save();
  const iconSize = shape === 'diamond' ? size * 1.16 : size * 1.08;
  if (shape === 'diamond') {
    drawDiamondSlotPath(context, x, y, size);
  } else {
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
  }
  context.clip();
  context.drawImage(iconImage, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
  context.restore();
};

const drawWeaponResourceRails = (context, chargeSlots, consumptionSlots, resourceImages) => {
  const y = 2372;
  const height = 168;
  const slotSize = 122;
  const chargeRail = { x: 78, y, width: 780, height };
  const consumptionRail = { x: 1030, y, width: 780, height };
  const slotGap = 8;
  const slotsWidth = slotSize * 5 + slotGap * 4;
  const chargeStartX = chargeRail.x + (chargeRail.width - slotsWidth) / 2 + slotSize / 2;
  const consumptionStartX = consumptionRail.x + consumptionRail.width - ((consumptionRail.width - slotsWidth) / 2) - slotSize / 2;

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
    drawEmptyCircleSlot(context, x, slotY, slotSize);
    drawSlotIcon(context, resourceImages[`consumption:${slot}`], x, slotY, slotSize, 'circle');
  });
};

const normalizeCardName = (value) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CARD_NAME;
};

const fitTitleFont = (context, title) => {
  const maxWidth = CANVAS_WIDTH * 0.82;
  let size = 125;
  let letterSpacing = Math.round(size * 0.14);

  while (size > 60) {
    letterSpacing = Math.round(size * 0.14);
    context.font = `900 ${size}px Cinzel, Georgia, serif`;
    if ('letterSpacing' in context) {
      context.letterSpacing = `${letterSpacing}px`;
    }
    const measuredWidth = context.measureText(title).width + letterSpacing * Math.max(title.length - 1, 0);
    if (measuredWidth <= maxWidth) break;
    size -= 4;
  }

  return { size, letterSpacing };
};

const getTraitSlots = (layout) => {
  if (layout === 'armor') {
    return [592, 822, 1052, 1282].flatMap((y) => [
      { x: 240, y, width: 620, height: 175 },
      { x: 1028, y, width: 620, height: 175 },
    ]);
  }

  if (layout === 'trap') {
    return [{ x: 574, y: 558, width: 740, height: 185 }];
  }

  if (layout === 'weapon') {
    return [807, 1047, 1287].flatMap((y) => [
      { x: 225, y, width: 650, height: 175 },
      { x: 1013, y, width: 650, height: 175 },
    ]);
  }

  return [];
};

const fitTraitFont = (context, text, maxWidth) => {
  let size = 60;
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
  context.beginPath();
  context.moveTo(x + bevel + radius, y);
  context.lineTo(x + width - bevel - radius, y);
  context.quadraticCurveTo(x + width - bevel, y, x + width - bevel + radius * 0.35, y + radius * 0.35);
  context.lineTo(x + width, y + height / 2);
  context.lineTo(x + width - bevel + radius * 0.35, y + height - radius * 0.35);
  context.quadraticCurveTo(x + width - bevel, y + height, x + width - bevel - radius, y + height);
  context.lineTo(x + bevel + radius, y + height);
  context.quadraticCurveTo(x + bevel, y + height, x + bevel - radius * 0.35, y + height - radius * 0.35);
  context.lineTo(x, y + height / 2);
  context.lineTo(x + bevel - radius * 0.35, y + radius * 0.35);
  context.quadraticCurveTo(x + bevel, y, x + bevel + radius, y);
  context.closePath();

  context.shadowColor = 'rgba(255,255,255,0.48)';
  context.shadowBlur = 34;
  context.fillStyle = 'rgba(0,0,0,0.96)';
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255,255,255,0.19)';
  context.stroke();

  if (text) {
    context.fillStyle = 'rgba(255,255,255,0.96)';
    context.shadowColor = 'rgba(255,255,255,0.28)';
    context.shadowBlur = 10;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    if ('letterSpacing' in context) context.letterSpacing = '2px';
    context.font = `900 ${fitTraitFont(context, text, width - bevel * 1.22)}px Lato, Arial, sans-serif`;
    context.fillText(text, x + width / 2, y + height / 2 + 2);
  }

  context.restore();
};

const usesSplitDescription = (typeConfig, showTraits) => (
  typeConfig.id === 'trap' || (typeConfig.id === 'skill' && !showTraits)
);

const getDynamicStartingLayout = (layout, text, isPrimary) => {
  return layout;
};

const getDescriptionLayouts = (typeConfig, showTraits) => {
  if (typeConfig.id === 'action') return {};

  const hasRails = typeConfig.id === 'weapon' || typeConfig.id === 'armor';

  if (usesSplitDescription(typeConfig, showTraits)) {
    return {
      primary: {
        x: 210,
        y: 815,
        width: 1470,
        height: 500,
        fontSize: 78,
        lineHeight: 95,
        italic: false,
        weight: 700,
        family: "Cinzel, Georgia, serif",
      },
      flavor: {
        x: 210,
        y: 1320,
        width: 1470,
        height: hasRails ? 1020 : 1120,
        fontSize: 68,
        lineHeight: 83,
        italic: true,
        weight: 700,
        family: "Cinzel, Georgia, serif",
      },
    };
  }

  return {
    flavor: {
      x: 210,
      y: 1545,
      width: 1470,
      height: hasRails ? 800 : 895,
      fontSize: 68,
      lineHeight: 83,
      italic: false,
      weight: 700,
      family: "Cinzel, Georgia, serif",
    },
  };
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

const wrapDescriptionText = (context, text, maxWidth) => {
  const paragraphs = text
    .trim()
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/).flatMap((word) => splitLongWord(context, word, maxWidth));
    let line = '';

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      if (context.measureText(nextLine).width <= maxWidth || !line) {
        line = nextLine;
        return;
      }

      lines.push(line);
      line = word;
    });

    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });

  return lines;
};

const fitDescriptionFont = (context, text, layout) => {
  let size = layout.fontSize;
  let lineHeight = layout.lineHeight;
  let lines = [];
  const style = layout.italic ? 'italic ' : '';
  const family = layout.family || "Cinzel, Georgia, serif";

  while (size > 48) {
    context.font = `${style}${layout.weight} ${size}px ${family}`;
    lines = wrapDescriptionText(context, text, layout.width);
    const textHeight = lines.length * lineHeight;
    if (textHeight <= layout.height) break;
    size -= 1;
    lineHeight = Math.round(size * 1.22);
  }

  return { size, lineHeight, lines };
};

const drawPreviewText = (context, text, layout) => {
  const family = layout.family || "Cinzel, Georgia, serif";
  const style = layout.italic ? 'italic ' : '';
  let size = Math.min(layout.fontSize, 70);

  while (size > 36) {
    context.font = `${style}600 ${size}px ${family}`;
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

const drawTextBlock = (context, textValue, layout, previewText = '') => {
  const hasUserText = textValue.trim().length > 0;
  const text = hasUserText ? textValue.trim() : previewText;
  if (!text || !layout) return;

  context.save();
  if (!hasUserText) {
    drawPreviewText(context, text, layout);
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
  const dynamicLayout = getDynamicStartingLayout(layout, text, isPrimary);
  const fitted = fitDescriptionFont(context, text, dynamicLayout);
  const style = dynamicLayout.italic ? 'italic ' : '';
  const family = dynamicLayout.family || "Cinzel, Georgia, serif";
  context.font = `${style}${dynamicLayout.weight} ${fitted.size}px ${family}`;

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

const drawDescription = (context, description, flavorText, typeConfig, showTraits) => {
  const layouts = getDescriptionLayouts(typeConfig, showTraits);

  if (layouts.primary) {
    drawTextBlock(context, description, layouts.primary, PRIMARY_DESCRIPTION_PREVIEW_TEXT);
    drawTextBlock(context, flavorText, layouts.flavor, FLAVOR_DESCRIPTION_PREVIEW_TEXT);
    return;
  }

  drawTextBlock(context, description, layouts.flavor, DESCRIPTION_PREVIEW_TEXT);
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
  weaponType = 'Daga',
  alcance = 0,
  diceType = 'D6',
  diceQty = 1,
  weaponIconImg = null,
  diceIconImg = null,
  chargeSlots = DEFAULT_CHARGE_SLOTS,
  consumptionSlots = DEFAULT_CONSUMPTION_SLOTS,
  resourceImages = {},
) => {
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
    context.letterSpacing = `${titleFont.letterSpacing}px`;
  }
  context.fillText(title, CANVAS_WIDTH / 2, 287);
  context.restore();

  // Draw weapon interface if cardType is weapon or armor or action!
  if (cardType === 'weapon') {
    // 1. Draw Dice
    if (diceIconImg) {
      drawDiceIcon(context, 290, 615, 200, diceIconImg, diceQty);
    }

    // 2. Draw Ruler (width increased to 720, label lowered to 615)
    drawRuler(context, CANVAS_WIDTH / 2, 512, 720, alcance, 615);

    // 3. Draw Weapon Type Icon
    if (weaponIconImg) {
      drawWeaponTypeIcon(context, 1598, 615, 200, weaponIconImg);
    }

    drawWeaponResourceRails(context, chargeSlots, consumptionSlots, resourceImages);
  } else if (cardType === 'armor') {
    drawWeaponResourceRails(context, chargeSlots, consumptionSlots, resourceImages);
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
  }

  const typeConfig = CARD_TYPES.find((type) => type.id === cardType) || CARD_TYPES[0];
  if (showTraits && typeConfig.maxTraits > 0) {
    const slotLabels = traits.slice(0, typeConfig.maxTraits);
    getTraitSlots(typeConfig.layout).slice(0, typeConfig.maxTraits).forEach((slot, index) => {
      drawTraitBadge(context, slot, slotLabels[index] || '');
    });
  }

  if (cardType !== 'action') {
    drawDescription(context, description, flavorText, typeConfig, showTraits);
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
  const [cardType, setCardType] = useState('weapon');
  const [showTraits, setShowTraits] = useState(true);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [selectedBackground, setSelectedBackground] = useState('Gris.webp');
  const [imageStatus, setImageStatus] = useState('loading');

  // New states for Weapon properties
  const [weaponType, setWeaponType] = useState('Daga');
  const [alcance, setAlcance] = useState(0); // 0: Toque, 1: Cercano, 2: Intermedio, 3: Lejano, 4: Extremo
  const [diceType, setDiceType] = useState('D6'); // D4, D6, D8, D10, D12
  const [diceQty, setDiceQty] = useState(1);
  const [chargeSlots, setChargeSlots] = useState(DEFAULT_CHARGE_SLOTS);
  const [consumptionSlots, setConsumptionSlots] = useState(DEFAULT_CONSUMPTION_SLOTS);

  // Automatically detect weapon type from cardName
  useEffect(() => {
    if (cardType !== 'weapon') return;
    const nameLower = cardName.toLowerCase();
    const matchedType = WEAPON_TYPES.find(
      (type) => nameLower.includes(type.toLowerCase())
    );
    if (matchedType) {
      setWeaponType(matchedType);
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
      const iconSrc = `${process.env.PUBLIC_URL || ''}/tipo/${weaponType}.webp`;
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
      const diceSrc = `${process.env.PUBLIC_URL || ''}/dados/${diceType}.webp`;
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

    if (cardType === 'weapon' || cardType === 'armor' || cardType === 'action') {
      const resourceOptions = [
        ...CHARGE_TYPES.map((option) => ({ ...option, cacheKey: `charge:${option.id}` })),
        ...CONSUMPTION_TYPES.map((option) => ({ ...option, cacheKey: `consumption:${option.id}` })),
      ];
      const requiredResourceOptions = resourceOptions.filter((option) => (
        chargeSlots.includes(option.id) && option.cacheKey.startsWith('charge:')
      ) || (
        consumptionSlots.includes(option.id) && option.cacheKey.startsWith('consumption:')
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
      resourceImages,
    );

    setImageStatus('ready');
    return undefined;
  }, [activeBackground, cardName, cardType, traits, showTraits, description, flavorText, weaponType, alcance, diceType, diceQty, chargeSlots, consumptionSlots]);

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
    setCardType('weapon');
    setShowTraits(true);
    setTraits(DEFAULT_TRAITS);
    setSelectedBackground('Gris.webp');
    setWeaponType('Daga');
    setAlcance(0);
    setDiceType('D6');
    setDiceQty(1);
    setChargeSlots(DEFAULT_CHARGE_SLOTS);
    setConsumptionSlots(DEFAULT_CONSUMPTION_SLOTS);
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
    } else if (typeId === 'armor') {
      setConsumptionSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[0] = 'Armadura_1';
        return nextSlots;
      });
    } else if (typeId === 'action') {
      setDiceQty((qty) => Math.min(6, qty));
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

            {(cardType === 'weapon' || cardType === 'armor' || cardType === 'action') && (
              <div className="space-y-4 rounded border border-[#c8aa6e]/15 bg-[#09090b]/40 p-3 shadow-inner">
                <div className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                  {cardType === 'weapon' ? 'Propiedades del Arma' : cardType === 'armor' ? 'Propiedades de la Armadura' : 'Propiedades de la Acción'}
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
                            className={`border py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${alcance === index
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

                {(cardType === 'weapon' || cardType === 'armor') && (
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
              </div>
            )}

            {activeType.id !== 'action' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                  <Type className="h-4 w-4" />
                  {hasSplitDescription ? 'Texto principal' : 'Descripción'}
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={hasSplitDescription ? 4 : 5}
                  maxLength={hasSplitDescription ? 360 : 520}
                  className="min-h-[112px] w-full resize-y border border-[#c8aa6e]/25 bg-[#09090b]/80 px-4 py-3 text-base font-semibold leading-relaxed text-[#f0e6d2] outline-none transition placeholder:text-slate-600 focus:border-[#c8aa6e]/70"
                  placeholder={hasSplitDescription ? 'Descripción de la carta' : 'Texto descriptivo de la carta'}
                />
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
            </div>
          </aside>

          <main className="sticky top-0 z-10 order-1 flex min-h-[520px] items-center justify-start overflow-x-auto overflow-y-hidden border border-[#c8aa6e]/15 bg-[radial-gradient(circle_at_center,_rgba(200,170,110,0.14),_rgba(9,9,11,0)_56%)] p-4 md:p-8 lg:static lg:order-2 lg:min-h-[620px] lg:items-start lg:justify-center lg:overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[#05070d]/50" />
            <div className="relative flex h-full min-w-max items-center justify-center lg:min-w-0 lg:w-full lg:items-start">
              <div className="relative h-[480px] w-[345px] shrink-0 lg:h-auto lg:w-full lg:max-w-[520px]">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="block aspect-[1888/2624] h-full w-auto border border-white/15 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.7)] lg:h-auto lg:max-h-[calc(100vh-220px)] lg:w-full"
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
