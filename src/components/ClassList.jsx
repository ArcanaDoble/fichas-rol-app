import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import {
  FiChevronDown,
  FiArrowLeft,
  FiImage,
  FiLock,
  FiSearch,
  FiStar,
  FiX,
  FiArrowRight,
  FiTarget,
  FiEdit2,
  FiPlus,
  FiMinus,
  FiCheckSquare,
  FiSquare,
  FiSave,
  FiRefreshCw,
  FiTrash2,
  FiSliders,
  FiMap,
  FiChevronRight,
  FiUnlock,
  FiKey,
} from 'react-icons/fi';
import {
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  LayoutTemplate,
  CircleUser,
  Upload,
  ImageIcon,
  Dices,
  Zap,
  Map,
  Star,
  Lock,
} from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { ICON_MAP, DEFAULT_STATUS_EFFECTS } from '../utils/statusEffects';
import { ClassCreatorView } from './ClassCreatorView';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import Boton from './Boton';
import Modal from './Modal';
import { getGlossaryTooltipId, escapeGlossaryWord } from '../utils/glossary';
import { convertNumericStringToIcons } from '../utils/iconConversions';
import { db, storage } from '../firebase';
import Sidebar, { MobileNav } from './Sidebar';
import ProgressionView from './ProgressionView';
import LoadoutView from './LoadoutView';
import { StoreView } from './StoreView';
import HexIcon from './HexIcon';
import { RelicsView } from './RelicsView';
import KarmaBar from './KarmaBar';
import { isYuuzuName, KARMA_MIN, KARMA_MAX } from '../utils/karma';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

// Utility to convert common tailwind colors to hex
const TAILWIND_COLOR_MAP = {
  'red': '#ef4444',
  'orange': '#f97316',
  'amber': '#f59e0b',
  'yellow': '#eab308',
  'lime': '#84cc16',
  'green': '#22c55e',
  'emerald': '#10b981',
  'teal': '#14b8a6',
  'cyan': '#06b6d4',
  'sky': '#0ea5e9',
  'blue': '#3b82f6',
  'indigo': '#6366f1',
  'violet': '#8b5cf6',
  'purple': '#a855f7',
  'fuchsia': '#d946ef',
  'pink': '#ec4899',
  'rose': '#f43f5e',
  'slate': '#64748b',
  'gray': '#6b7280',
  'zinc': '#71717a',
  'neutral': '#737373',
  'stone': '#78716c'
};

const extractHex = (effect) => {
  if (effect.hex) return effect.hex;
  const colorStr = effect.color || '';
  if (colorStr.includes('[') && colorStr.includes(']')) {
    return colorStr.match(/\[(.*?)\]/)?.[1];
  }
  // Match standard like text-red-500
  const standardMatch = colorStr.match(/text-([a-z]+)-(\d+)/);
  if (standardMatch) {
    const colorName = standardMatch[1];
    return TAILWIND_COLOR_MAP[colorName] || '#94a3b8';
  }
  return '#94a3b8';
};

const pruneUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.reduce((accumulator, item) => {
      const prunedItem = pruneUndefined(item);
      if (prunedItem !== undefined) {
        accumulator.push(prunedItem);
      }
      return accumulator;
    }, []);
  }

  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return Object.entries(value).reduce((accumulator, [key, entryValue]) => {
      const prunedValue = pruneUndefined(entryValue);
      if (prunedValue !== undefined) {
        accumulator[key] = prunedValue;
      }
      return accumulator;
    }, {});
  }

  return value === undefined ? undefined : value;
};

const defaultEquipment = {
  weapons: [],
  armor: [],
  abilities: [],
  objects: [],
  accessories: [],
};

const normalizeImageValue = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  return trimmed;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const joinTraits = (value) => toArray(value).join(', ');

const categorizeEquipment = (items = []) => {
  const grouped = deepClone(defaultEquipment);

  items.forEach((item) => {
    const baseEntry = {
      name: item.name || '',
      category: item.type || '',
      description: item.detail || '',
      rareza: item.rareza || item.rarity || '',
    };

    const typeLabel = (item.type || '').toLowerCase();

    if (typeLabel.includes('arma') || typeLabel.includes('implemento') || typeLabel.includes('báculo')) {
      grouped.weapons.push({
        damage: item.damage || '',
        range: item.range || '',
        consumption: item.consumo || item.cost || '',
        physicalLoad: item.cargaFisica || item.carga || '',
        mentalLoad: item.cargaMental || '',
        traits: joinTraits(item.rasgos || item.traits || item.properties || ''),
        ...baseEntry,
      });
    } else if (typeLabel.includes('armadura') || typeLabel.includes('escudo')) {
      grouped.armor.push({
        defense: item.defensa || item.defense || '',
        physicalLoad: item.cargaFisica || item.carga || '',
        ...baseEntry,
      });
    }
  });

  return grouped;
};

const formatOrigin = (value) => {
  if (!value) return 'Catálogo';
  const label = value.toString().trim();
  return label.length > 0 ? label : 'Catálogo';
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  let normalized = hex.trim().replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  if (normalized.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildRarityStyle = (color) => {
  if (!color) {
    return null;
  }

  const border = hexToRgba(color, 0.55);
  const borderHover = hexToRgba(color, 0.85);
  const background = `linear-gradient(140deg, ${hexToRgba(color, 0.16)} 0%, transparent 75%)`;
  const shadow = `0 18px 45px -24px ${hexToRgba(color, 0.45)}`;
  const shadowHover = `0 22px 55px -20px ${hexToRgba(color, 0.65)}`;

  return {
    border,
    borderHover,
    background,
    shadow,
    shadowHover,
  };
};

const sanitizeCategoryCandidate = (value) => {
  if (!value) return '';
  const label = value.toString().trim();
  if (!label) return '';

  if (/^[\d\s]*[🛠️🧠🔲🟡⚫⚪]+$/u.test(label)) {
    return '';
  }

  if (/^[\d]+d\d+/i.test(label)) {
    return '';
  }

  return label;
};

const extractCategory = (candidates, fallback) => {
  for (const candidate of candidates) {
    const sanitized = sanitizeCategoryCandidate(candidate);
    if (sanitized) {
      return sanitized;
    }
  }
  return fallback;
};

const looksLikeDiceValue = (value) => {
  if (!value) return false;
  return /^[\d]+d\d+(\s*[+-]\s*\d+)?$/i.test(value.toString().trim());
};

const toDisplayString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toString();
};

const slugifyId = (value) => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const buildWeaponEntry = (weapon) => {
  if (!weapon) return null;

  const name = weapon.nombre || weapon.name || '';
  if (!name) return null;

  const description = weapon.descripcion || weapon.description || '';
  const traits = joinTraits(weapon.rasgos || weapon.traits || '');
  const category = extractCategory(
    [weapon.category, weapon.tipo, weapon.clase, weapon.origen, weapon.tipoDano],
    'Arma',
  );

  const consumption = convertNumericStringToIcons(
    weapon.consumo || weapon.cost || '',
    '🟡',
    ['Consumo', 'Velocidad'],
  );
  const physicalLoad = convertNumericStringToIcons(
    weapon.cargaFisica || weapon.carga || '',
    '🔲',
    ['Carga física', 'Carga fisica'],
  );
  const mentalLoad = convertNumericStringToIcons(
    weapon.cargaMental || '',
    '🧠',
    ['Carga mental'],
  );
  const rarity = (weapon.rareza || weapon.rarity || '').toString().trim();

  const payload = {
    id: weapon.id || name,
    name,
    category,
    preview: description || traits || `${weapon.dano || ''} ${weapon.alcance || ''}`.trim(),
    origin: formatOrigin(weapon.fuente || weapon.source),
    payload: {
      name,
      category,
      damage: weapon.dano || weapon.damage || weapon.Dano || weapon.Damage || '',
      range: weapon.alcance || weapon.range || weapon.Alcance || weapon.Range || '',
      consumption,
      physicalLoad,
      mentalLoad,
      traits,
      rareza: rarity,
      description,
    },
  };

  if (!payload.payload.damage && looksLikeDiceValue(category)) {
    payload.payload.damage = category;
    payload.payload.category = 'Arma';
    payload.category = 'Arma';
  }

  return payload;
};

const buildArmorEntry = (armor) => {
  if (!armor) return null;

  const name = armor.nombre || armor.name || '';
  if (!name) return null;

  const description = armor.descripcion || armor.description || '';
  const traits = joinTraits(armor.rasgos || armor.traits || '');
  const category = extractCategory(
    [armor.tipo, armor.categoria, armor.category, armor.clase],
    'Armadura',
  );

  const physicalLoad = convertNumericStringToIcons(
    armor.cargaFisica || armor.carga || armor.peso || '',
    '🔲',
    ['Carga física', 'Carga fisica'],
  );
  const mentalLoad = convertNumericStringToIcons(
    armor.cargaMental || '',
    '🧠',
    ['Carga mental'],
  );
  const rarity = (armor.rareza || armor.rarity || '').toString().trim();

  return {
    id: armor.id || name,
    name,
    category,
    preview: description || traits || `${armor.defensa || ''} ${armor.carga || ''}`.trim(),
    origin: formatOrigin(armor.fuente || armor.source),
    payload: {
      name,
      category,
      defense: armor.defensa || armor.defense || armor.Defensa || armor.Defense || '',
      physicalLoad,
      mentalLoad,
      traits,
      rareza: rarity,
      description,
    },
  };
};

const buildAbilityEntry = (ability) => {
  if (!ability) return null;

  const name = ability.nombre || ability.name || '';
  if (!name) return null;

  const description = ability.descripcion || ability.description || '';
  const traits = joinTraits(ability.rasgos || ability.traits || '');
  let category = extractCategory(
    [ability.poder, ability.tipo, ability.category],
    'Habilidad',
  );
  const metaChunks = [];

  if (ability.alcance) {
    metaChunks.push(`Alcance: ${ability.alcance}`);
  }
  if (traits) {
    metaChunks.push(`Rasgos: ${traits}`);
  }

  const consumption = convertNumericStringToIcons(
    ability.consumo || ability.cost || '',
    '🟡',
    ['Consumo', 'Velocidad'],
  );
  const body = convertNumericStringToIcons(ability.cuerpo || '', '🔲', ['Cuerpo']);
  const mind = convertNumericStringToIcons(ability.mente || '', '🧠', ['Mente']);
  const trait = joinTraits(ability.rasgo || ability.etiqueta || ability.keyword || '');
  const rarity = (ability.rareza || ability.rarity || '').toString().trim();

  const meta = metaChunks.join(' • ');

  const payload = {
    id: ability.id || name,
    name,
    category,
    preview: description || meta,
    origin: formatOrigin(ability.fuente || ability.source),
    payload: {
      name,
      category,
      damage: ability.dano || ability.damage || ability.Dano || ability.Damage || ability.daño || ability.Daño || ability.poder || ability.Poder || '',
      range: ability.alcance || ability.range || ability.Alcance || ability.Range || '',
      consumption,
      body,
      mind,
      trait: trait || traits,
      rareza: rarity,
      description: meta ? `${description}${description ? '\n' : ''}${meta}` : description,
    },
  };

  if (!payload.payload.damage && looksLikeDiceValue(category)) {
    payload.payload.damage = category;
    payload.payload.category = 'Habilidad';
    payload.category = 'Habilidad';
  }

  return payload;
};

const EditableField = ({
  value,
  onChange,
  onCommit,
  showEditIcon = true,
  placeholder = 'Haz clic para editar',
  multiline = false,
  displayClassName = '',
  inputClassName = '',
  buttonClassName = '',
  textClassName = '',
  type = 'text',
  autoSelect = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (autoSelect && typeof inputRef.current.select === 'function') {
        inputRef.current.select();
      }
    }
  }, [isEditing, autoSelect]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onCommit) onCommit();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      setIsEditing(false);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
    }
  };

  const baseInputClasses =
    'w-full bg-black/60 border border-slate-700/50 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-[#c8aa6e]/80 transition-all';

  const displayValue = value && value.length > 0 ? value : placeholder;
  const isPlaceholder = !value || value.length === 0;

  return (
    <div className={`relative ${buttonClassName}`}>
      {isEditing ? (
        multiline ? (
          <textarea
            ref={inputRef}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`${baseInputClasses} min-h-[120px] resize-y ${inputClassName}`}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`${baseInputClasses} ${inputClassName}`}
            placeholder={placeholder}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`group inline-flex items-center gap-2 text-left transition hover:text-slate-100/90 ${displayClassName || 'w-full'}`}
        >
          <span
            className={`${textClassName || ''
              } ${isPlaceholder ? 'text-slate-500/70 italic' : ''}`.trim()}
          >
            {displayValue}
          </span>
          {showEditIcon && (
            <FiEdit2 className="h-3.5 w-3.5 absolute -right-5 top-1/2 -translate-y-1/2 text-slate-500 opacity-0 transition group-hover:opacity-100 pointer-events-none" />
          )}
        </button>
      )}
    </div>
  );
};

const ensureClassDefaults = (classItem) => {
  const base = {
    name: '',
    subtitle: '',
    summary: { battleRole: '', combo: '', difficultyNote: '', highlights: [] },
    inspiration: [],
    classLevels: [],
    rules: [],
    features: [], // Relics/Talents
    equipment: deepClone(defaultEquipment),
    actionData: null, // Custom action reference overrides
    portraitSource: '',
  };

  const merged = {
    ...deepClone(base),
    ...deepClone(classItem),
  };

  merged.name = merged.name || '';
  merged.subtitle = merged.subtitle || '';
  merged.status = merged.status || 'available';

  merged.summary = merged.summary || { battleRole: '', combo: '', difficultyNote: '', highlights: [] };
  merged.summary.proficiencies = merged.summary.proficiencies || {
    weapons: { simple: false, martial: false, special: false },
    armor: { light: false, medium: false, heavy: false }
  };

  merged.inspiration = (merged.inspiration || []).map((entry) => ({
    completed: false,
    ...entry,
  }));

  merged.classLevels = (merged.classLevels || []).map((level, index) => {
    if (level && typeof level === 'object') {
      return {
        title: level.title || `Nivel ${index + 1} — Nuevo avance`,
        description: level.description || '',
        completed: Boolean(level.completed),
        acquired: Boolean(level.acquired),
        additionalFeatures: level.additionalFeatures || [],
      };
    }

    return {
      title: `Nivel ${index + 1} — Nuevo avance`,
      description: typeof level === 'string' ? level : '',
      completed: false,
      acquired: false,
      additionalFeatures: [],
    };
  });
  merged.rules = merged.rules || [];

  merged.equipment = {
    ...deepClone(defaultEquipment),
    ...(merged.equipment || {}),
  };

  // Initialize storeItems and money with defaults if not present
  merged.storeItems = merged.storeItems !== undefined ? merged.storeItems : [];
  merged.money = merged.money !== undefined ? merged.money : 4697;

  merged.image = normalizeImageValue(merged.image);

  merged.equipment.weapons = (merged.equipment.weapons || []).map((weapon) => {
    const consumption = convertNumericStringToIcons(
      weapon.consumption ?? weapon.cost ?? weapon.consumo ?? '',
      '🟡',
      ['Consumo', 'Velocidad'],
    );
    const physicalLoad = toDisplayString(
      weapon.physicalLoad ??
      weapon.weight ??
      weapon.cargaFisica ??
      weapon.carga ??
      '',
    );
    const mentalLoad = toDisplayString(
      weapon.mentalLoad ?? weapon.cargaMental ?? '',
    );
    const traitsValue = joinTraits(
      weapon.traits || weapon.properties || weapon.rasgos || '',
    );

    return {
      name: '',
      category: '',
      damage: toDisplayString(weapon.damage ?? weapon.dano ?? ''),
      range: toDisplayString(weapon.range ?? weapon.alcance ?? ''),
      consumption,
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
      rareza: toDisplayString(weapon.rareza || ''),
      description: '',
      ...weapon,
      damage: toDisplayString(weapon.damage ?? weapon.dano ?? ''),
      range: toDisplayString(weapon.range ?? weapon.alcance ?? ''),
      consumption,
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
    };
  });

  merged.equipment.abilities = (merged.equipment.abilities || []).map((ability) => {
    const speed = convertNumericStringToIcons(
      ability.consumption ?? ability.cost ?? ability.consumo ?? '',
      '🟡',
      ['Consumo', 'Velocidad'],
    );
    const mana = convertNumericStringToIcons(
      ability.mana ?? ability.maná ?? '',
      '🔵',
      ['Mana'],
    );
    const consumption = `${speed} ${mana}`.trim();

    const body = toDisplayString(ability.body ?? ability.cuerpo ?? '');
    const mind = toDisplayString(ability.mind ?? ability.mente ?? '');
    const traitValue = joinTraits(ability.trait || ability.rasgo || ability.rasgos || '');

    return {
      name: '',
      category: '',
      damage: toDisplayString(ability.damage ?? ability.dano ?? ability.Damage ?? ability.Dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ability.Range ?? ability.Alcance ?? ''),
      consumption,
      body,
      mind,
      trait: traitValue,
      rareza: toDisplayString(ability.rareza || ability.rarity || ability.Rareza || ability.Rarity || ''),
      description: '',
      ...ability,
      damage: toDisplayString(ability.damage ?? ability.dano ?? ability.Damage ?? ability.Dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ability.Range ?? ability.Alcance ?? ''),
      consumption,
      body,
      mind,
      trait: traitValue,
    };
  });

  merged.equipment.objects = (merged.equipment.objects || []).map((object) => {
    return {
      name: '',
      category: '',
      quantity: 1,
      rareza: '',
      description: '',
      ...object,
    };
  });

  merged.equipment.accessories = (merged.equipment.accessories || []).map((accessory) => {
    const physicalLoad = toDisplayString(
      accessory.physicalLoad ??
      accessory.weight ??
      accessory.cargaFisica ??
      accessory.carga ??
      '',
    );
    const mentalLoad = toDisplayString(accessory.mentalLoad ?? accessory.cargaMental ?? '');
    const traitsValue = joinTraits(accessory.traits || accessory.rasgos || '');

    // Convert defense to squares for "Coste" slot visualization if needed, or keep as string
    const defense = toDisplayString(accessory.defense ?? accessory.defensa ?? '');

    return {
      name: '',
      category: '',
      defense,
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
      rareza: toDisplayString(accessory.rareza || ''),
      description: '',
      ...accessory,
      defense,
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
    };
  });

  merged.equipment.armor = (merged.equipment.armor || []).map((armor) => {
    const physicalLoad = toDisplayString(
      armor.physicalLoad ??
      armor.weight ??
      armor.cargaFisica ??
      armor.carga ??
      '',
    );
    const mentalLoad = toDisplayString(armor.mentalLoad ?? armor.cargaMental ?? '');
    const traitsValue = joinTraits(armor.traits || armor.rasgos || '');

    // Convert defense to squares for "Coste" slot visualization
    const defenseSquares = convertNumericStringToIcons(
      armor.defense ?? armor.defensa ?? '',
      '🟦',
      ['Defensa'],
    );

    return {
      name: '',
      category: '',
      defense: toDisplayString(armor.defense ?? armor.defensa ?? ''),
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
      rareza: toDisplayString(armor.rareza || ''),
      description: '',
      ...armor,
      defense: toDisplayString(armor.defense ?? armor.defensa ?? ''),
      physicalLoad,
      mentalLoad,
      traits: traitsValue,
      consumption: defenseSquares, // Map defense squares to consumption for LoadoutView
    };
  });

  merged.equipment.abilities = (merged.equipment.abilities || []).map((ability) => {
    const speed = convertNumericStringToIcons(
      ability.consumption ?? ability.cost ?? ability.consumo ?? '',
      '🟡',
      ['Consumo', 'Velocidad'],
    );
    const mana = convertNumericStringToIcons(
      ability.mana ?? ability.maná ?? '',
      '🔵',
      ['Mana'],
    );
    const consumption = `${speed} ${mana}`.trim();

    const body = toDisplayString(ability.body ?? ability.cuerpo ?? '');
    const mind = toDisplayString(ability.mind ?? ability.mente ?? '');
    const traitValue = joinTraits(ability.trait || ability.rasgo || ability.rasgos || '');

    return {
      name: '',
      category: '',
      damage: toDisplayString(ability.damage ?? ability.dano ?? ability.Damage ?? ability.Dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ability.Range ?? ability.Alcance ?? ''),
      consumption,
      body,
      mind,
      trait: traitValue,
      rareza: toDisplayString(ability.rareza || ability.rarity || ability.Rareza || ability.Rarity || ''),
      description: '',
      ...ability,
      damage: toDisplayString(ability.damage ?? ability.dano ?? ability.Damage ?? ability.Dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ability.Range ?? ability.Alcance ?? ''),
      consumption,
      body,
      mind,
      trait: traitValue,
    };
  });

  merged.tags = merged.tags || [];

  return merged;
};

const difficultyOrder = {
  Baja: 0,
  Media: 1,
  Alta: 2,
  Legendaria: 3,
};

const statusConfig = {
  available: {
    label: 'Disponible',
    badgeClass:
      'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
  },
  'in-progress': {
    label: 'En progreso',
    badgeClass: 'bg-sky-500/15 text-sky-200 border border-sky-400/40',
  },
  locked: {
    label: 'Bloqueada',
    badgeClass: 'bg-slate-700/70 text-slate-200 border border-slate-500/40',
  },
};

const sortOptions = [
  { value: 'alphaAsc', label: 'Orden alfabético (asc.)' },
  { value: 'alphaDesc', label: 'Orden alfabético (desc.)' },
  { value: 'difficulty', label: 'Dificultad' },
  { value: 'rarity', label: 'Valoración' },
  { value: 'status', label: 'Estado' },
];

const detailTabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'inspiration', label: 'Inspiración (Hitos)' },
  { id: 'levels', label: 'Nivel de clase' },
  { id: 'feats', label: 'Reliquias y Talentos' },
  { id: 'rules', label: 'Reglas' },
  { id: 'equipment', label: 'Equipación' },
];

const rawClassData = [
  {
    id: 'berserker',
    name: 'Berserker de Guerra',
    subtitle: 'Especialista en Daño',
    description:
      'Un guerrero impulsado por la ira ancestral, capaz de convertir cada herida en fuerza descomunal.',
    tags: ['Armas Pesadas', 'Furia', 'Frente'],
    difficulty: 'Media',
    rating: 4,
    status: 'available',
    mastery: '3 / 10',
    focus: 'Fuerza / Voluntad',
    shards: 320,
    xp: 120,
    image: null,
    summary: {
      battleRole: 'Ofensiva frontal',
      combo: 'Acumula rabia con golpes pesados y desátala para activar frenesíes devastadores.',
      difficultyNote:
        'Gestiona el daño recibido para potenciar tus ataques sin quedar expuesto cuando tu furia se agota.',
      highlights: [
        'Gran mitigación mientras esté en frenesí',
        'Puede limpiar hordas con barridos circulares',
        'Necesita apoyo para reposicionarse tras largas cargas',
      ],
    },
    inspiration: [
      {
        title: 'Juramento del Último Bastión',
        description:
          'Protege a un aliado herido mortalmente y vence al enemigo que lo amenazaba antes de finalizar el encuentro.',
      },
      {
        title: 'Rito de Cicatrices',
        description:
          'Recibe daño igual o superior a la mitad de tus puntos de vida máximos y continúa luchando hasta lograr la victoria.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 5 — Surcar la Sangre',
        description: 'Puedes volver a lanzar tu acción de ataque cuando eliminas a un enemigo durante el frenesí.',
      },
      {
        title: 'Nivel 9 — Rugido de Guerra',
        description:
          'Todos los aliados cercanos obtienen ventaja en sus siguientes tiradas de ataque tras verte entrar en frenesí.',
      },
    ],
    rules: [
      'Cuando entres en frenesí, aumenta tu defensa en +2 hasta el final de tu siguiente turno.',
      'Si terminas tu turno sin haber atacado, pierdes la mitad de la furia acumulada.',
    ],
    equipment: [
      {
        name: 'Hacha Ciclónica',
        type: 'Arma pesada',
        detail: '2H • Alcance corto • Añade +1 dado de daño durante el frenesí.',
      },
      {
        name: 'Talismán de Ira Ancestral',
        type: 'Accesorio',
        detail: 'Permite convertir 1 punto de daño recibido en furia adicional una vez por encuentro.',
      },
    ],
  },
  {
    id: 'arcanista',
    name: 'Arcanista Umbral',
    subtitle: 'Control y Apoyo',
    description:
      'Domina los pliegues de la realidad para alterar el campo de batalla con hechizos gravitacionales.',
    tags: ['Magia', 'Control', 'Distancia'],
    difficulty: 'Alta',
    rating: 5,
    status: 'in-progress',
    mastery: '6 / 10',
    focus: 'Intelecto / Voluntad',
    shards: 540,
    xp: 180,
    image: null,
    summary: {
      battleRole: 'Control de zona',
      combo: 'Manipula la gravedad para ralentizar a los enemigos y canaliza ráfagas de energía oscura.',
      difficultyNote:
        'Requiere posicionamiento cuidadoso y coordinación para aprovechar al máximo sus campos gravitacionales.',
      highlights: [
        'Puede aislar objetivos prioritarios',
        'Herramientas de apoyo versátiles para el grupo',
        'Vulnerable cuando se queda sin esencia arcana',
      ],
    },
    inspiration: [
      {
        title: 'Horizonte de Eventos',
        description:
          'Mantén a tres enemigos atrapados simultáneamente en tus pozos gravitacionales durante dos rondas completas.',
      },
      {
        title: 'La Luz se Doble',
        description:
          'Protege a un aliado de daño letal desviando el ataque con un portal umbral en el momento preciso.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 7 — Estela Oscura',
        description: 'Tras lanzar una habilidad de control, obtienes automáticamente un escudo de energía escalonado.',
      },
      {
        title: 'Nivel 10 — Desgarro Cósmico',
        description:
          'Una vez por encuentro, abre una grieta que inflige daño masivo y recoloca a los enemigos atrapados.',
      },
    ],
    rules: [
      'Las áreas umbrales se consideran terreno difícil para enemigos pero no para aliados.',
      'Puedes redirigir un ataque dirigido a ti hacia una de tus zonas ancladas con una tirada de concentración exitosa.',
    ],
    equipment: [
      {
        name: 'Báculo de Singulares',
        type: 'Implemento arcano',
        detail: 'Permite almacenar un hechizo de control adicional listo para su liberación inmediata.',
      },
      {
        name: 'Orbe de Horizon',
        type: 'Foco',
        detail: 'Reduce en 1 la dificultad de los chequeos para mantener efectos canalizados.',
      },
    ],
  },
  {
    id: 'guardiana',
    name: 'Guardiana Solar',
    subtitle: 'Defensa y Curación',
    description:
      'Canaliza la luz radiante para proteger a sus aliados y desatar estallidos purificadores.',
    tags: ['Soporte', 'Protección', 'Sagrado'],
    difficulty: 'Media',
    rating: 4,
    status: 'locked',
    mastery: '0 / 10',
    focus: 'Voluntad / Intelecto',
    shards: 410,
    xp: 140,
    image: null,
    summary: {
      battleRole: 'Defensa y curación',
      combo: 'Alterna escudos radiantes y pulsos curativos para mantener al grupo siempre protegido.',
      difficultyNote:
        'Maximiza tu impacto sincronizando las curaciones con los estallidos de luz solar para castigar a los enemigos.',
      highlights: [
        'Curaciones constantes y preventivas',
        'Capacidad de purificar estados negativos',
        'Dependiente de posicionamiento para irradiar a todo el grupo',
      ],
    },
    inspiration: [
      {
        title: 'Aurora Custodia',
        description:
          'Salva a dos aliados diferentes de quedar incapacitados en el mismo encuentro con tus escudos radiantes.',
      },
      {
        title: 'Llama Purificadora',
        description: 'Disipa tres efectos de corrupción en una sola escena usando la luz solar concentrada.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 6 — Halo Inquebrantable',
        description: 'Tus escudos otorgan resistencia a daño radiante y entumecimiento a los agresores.',
      },
      {
        title: 'Nivel 10 — Sol Naciente',
        description:
          'Una vez por día, revive a todo el grupo con la mitad de sus puntos de vida tras caer en combate.',
      },
    ],
    rules: [
      'Tus curaciones restauran un punto de estado adicional a objetivos que no estén bajo efectos oscuros.',
      'Cada vez que bloqueas daño con un escudo solar, generas luz acumulada para potenciar tu siguiente estallido.',
    ],
    equipment: [
      {
        name: 'Maza de Horizonte',
        type: 'Arma ligera',
        detail: 'Inflige daño radiante adicional a criaturas de la sombra.',
      },
      {
        name: 'Égida Solar',
        type: 'Escudo pesado',
        detail: 'Permite redirigir un ataque recibido por un aliado cercano una vez por escena.',
      },
    ],
  },
  {
    id: 'tactico',
    name: 'Táctico Sombrío',
    subtitle: 'Especialista en Sigilo',
    description:
      'Comandante silencioso que orquesta emboscadas precisas desde la penumbra.',
    tags: ['Sigilo', 'Estrategia', 'Emboscada'],
    difficulty: 'Alta',
    rating: 3,
    status: 'available',
    mastery: '8 / 10',
    focus: 'Destreza / Intelecto',
    shards: 270,
    xp: 110,
    image: null,
    summary: {
      battleRole: 'Estratega sigiloso',
      combo: 'Coordina emboscadas desde la sombra y utiliza trampas para dividir al enemigo.',
      difficultyNote:
        'Necesita preparación previa y aliados dispuestos a seguir los planes para brillar.',
      highlights: [
        'Control total de la información del campo',
        'Especialista en objetivos prioritarios',
        'Dependiente de recursos para desplegar trampas',
      ],
    },
    inspiration: [
      {
        title: 'Sombras Concertadas',
        description: 'Resuelve una emboscada en la que cada aliado ejecute tu plan sin fallar ninguna tirada clave.',
      },
      {
        title: 'Maestro del Tablero',
        description: 'Resuelve un encuentro completo sin recibir daño directo gracias a tu red de trampas.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 4 — Reconocimiento Total',
        description: 'Siempre actúas con ventaja en iniciativa si preparaste el terreno con antelación.',
      },
      {
        title: 'Nivel 8 — Emboscada Perfecta',
        description: 'Tras salir de sigilo, tus ataques críticos infligen daño adicional masivo.',
      },
    ],
    rules: [
      'Puedes colocar una trampa sin gastar acción si no te has movido durante el turno.',
      'Obtienes ventaja en tiradas de sigilo contra objetivos que sigan tus rutas preestablecidas.',
    ],
    equipment: [
      {
        name: 'Cuchillas Interferentes',
        type: 'Armas dobles',
        detail: 'Aplican sangrado leve y silencio breve cuando atacas desde sigilo.',
      },
      {
        name: 'Red Fantasma',
        type: 'Herramienta',
        detail: 'Permite inmovilizar a un enemigo en el inicio de la emboscada sin gasto adicional.',
      },
    ],
  },
  {
    id: 'druida',
    name: 'Druida Umbrátil',
    subtitle: 'Invocadora Primal',
    description:
      'Invoca espíritus antiguos y molda la flora del entorno para controlar la batalla.',
    tags: ['Naturaleza', 'Invocaciones', 'Control'],
    difficulty: 'Media',
    rating: 5,
    status: 'available',
    mastery: '5 / 10',
    focus: 'Voluntad / Destreza',
    shards: 360,
    xp: 150,
    image: null,
    summary: {
      battleRole: 'Invocadora primal',
      combo: 'Coordina espíritus y flora cambiante para sofocar a los enemigos mientras apoyas al grupo.',
      difficultyNote:
        'Exige administración constante de los vínculos con los espíritus para no perder control del campo.',
      highlights: [
        'Gran versatilidad a distancia',
        'Invocaciones resistentes y útiles',
        'Vulnerable cuando queda sin espíritus anclados',
      ],
    },
    inspiration: [
      {
        title: 'Círculo Eterno',
        description:
          'Mantén tres espíritus activos de tipos diferentes protegiendo a cada aliado durante un encuentro completo.',
      },
      {
        title: 'Raíz Primigenia',
        description: 'Neutraliza a un enemigo jefe inmovilizándolo con tus lianas durante al menos dos rondas seguidas.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 5 — Brote Resiliente',
        description: 'Tus invocaciones recuperan puntos de vida al inicio de cada turno mientras permanezcas concentrada.',
      },
      {
        title: 'Nivel 9 — Avatar del Bosque',
        description: 'Puedes fusionarte con tus aliados para otorgarles beneficios únicos según el espíritu activo.',
      },
    ],
    rules: [
      'Puedes sacrificar una invocación para disipar efectos elementales en un área pequeña.',
      'Recuperas un espíritu derrotado al final del encuentro si mantuviste el control sin fallos graves.',
    ],
    equipment: [
      {
        name: 'Báculo Semilla Umbral',
        type: 'Implemento',
        detail: 'Fortalece a las invocaciones recién creadas otorgándoles armadura temporal.',
      },
      {
        name: 'Capa de Hoja Viva',
        type: 'Armadura ligera',
        detail: 'Permite camuflarte en entornos naturales ganando ventaja en sigilo.',
      },
    ],
  },
  {
    id: 'artificiero',
    name: 'Artificiero Rúnico',
    subtitle: 'Ofensiva Versátil',
    description:
      'Ingeniero arcano que despliega artefactos explosivos y defensas automáticas.',
    tags: ['Tecnología', 'Control de Zona', 'Ofensiva'],
    difficulty: 'Baja',
    rating: 3,
    status: 'locked',
    mastery: '0 / 10',
    focus: 'Intelecto / Destreza',
    shards: 250,
    xp: 90,
    image: null,
    summary: {
      battleRole: 'Ofensiva versátil',
      combo: 'Despliega torretas y runas explosivas mientras alterna entre apoyo y ofensiva.',
      difficultyNote:
        'Requiere planificación y recursos suficientes para mantener la presión tecnológica.',
      highlights: [
        'Gran capacidad de adaptación táctica',
        'Puede defender posiciones clave con facilidad',
        'Sus artefactos son vulnerables a la destrucción directa',
      ],
    },
    inspiration: [
      {
        title: 'Sincronía Perfecta',
        description: 'Mantén tres artefactos activos a la vez sin perder el control de ninguno durante dos rondas.',
      },
      {
        title: 'Maestro Runario',
        description: 'Neutraliza a un enemigo jefe utilizando exclusivamente inventos rúnicos en un encuentro.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 6 — Red de Torretas',
        description: 'Tus torretas comparten objetivos y ventajas cuando están dentro de tu red táctica.',
      },
      {
        title: 'Nivel 10 — Catalizador Supremo',
        description: 'Activa todos tus artefactos simultáneamente causando una reacción en cadena devastadora.',
      },
    ],
    rules: [
      'Tus torretas cuentan como aliados para efectos de cobertura y flanqueo.',
      'Puedes reconfigurar un artefacto destruido gastando una acción y recursos adecuados.',
    ],
    equipment: [
      {
        name: 'Guanteletes de Sintonía',
        type: 'Arma a distancia',
        detail: 'Permiten canalizar runas elementales y adaptarlas al tipo de objetivo.',
      },
      {
        name: 'Kit de Ensamblaje Rápido',
        type: 'Herramienta',
        detail: 'Reduce el tiempo de despliegue de artefactos a la mitad.',
      },
    ],
  },
];

const initialClasses = rawClassData.map((classItem) => {
  const { championLevels, equipment, inspiration, ...rest } = classItem;

  const groupedEquipment = categorizeEquipment(equipment);

  return ensureClassDefaults({
    ...rest,
    inspiration: (inspiration || []).map((entry) => ({ completed: false, ...entry })),
    classLevels: classItem.classLevels || championLevels || [],
    equipment: groupedEquipment,
  });
});

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImage = async (imageSrc, crop) => {
  if (!imageSrc || !crop) return null;
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL('image/png');
};

const RatingStars = ({ rating, onChange, size = 'md' }) => {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < rating;
        const star = (
          <FiStar
            className={`${starSize} transition-transform transition-colors ${filled
              ? 'text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
              : 'text-slate-600'
              }`}
          />
        );

        if (!onChange) {
          return <span key={index}>{star}</span>;
        }

        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index + 1)}
            className="rounded-full p-0.5 transition hover:scale-110 hover:bg-slate-800/80"
            aria-label={`Asignar ${index + 1} estrellas`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
};

// Editable Text Component for inline editing
const EditableText = ({ value, onChange, className = '', multiline = false, placeholder = 'Click para editar' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setTempValue(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`${className} bg-slate-900/50 border border-[#c8aa6e]/50 rounded px-2 py-1 focus:outline-none focus:border-[#c8aa6e]`}
        rows={3}
      />
    ) : (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`${className} bg-slate-900/50 border border-[#c8aa6e]/50 rounded px-2 py-1 focus:outline-none focus:border-[#c8aa6e]`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity group relative`}
      title="Click para editar"
    >
      {value || placeholder}
      <span className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 text-xs pointer-events-none">
        ✏️
      </span>
    </div>
  );
};

const DiceSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const diceOptions = ['d4', 'd6', 'd8', 'd10', 'd12'];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-[60px] h-[60px] transition-transform hover:scale-110 focus:outline-none"
      >
        <img
          src={`/dados/${value.toUpperCase()}.png`}
          alt={value}
          className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(200,170,110,0.5)]"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#0f172a] border border-[#c8aa6e]/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 p-2 grid grid-cols-5 gap-x-1 gap-y-0 w-[210px] backdrop-blur-md"
          >
            {diceOptions.map((dice) => {
              const gridPos = {
                'd4': 'col-start-1 row-start-1',
                'd10': 'col-start-2 row-start-2',
                'd6': 'col-start-3 row-start-1',
                'd12': 'col-start-4 row-start-2',
                'd8': 'col-start-5 row-start-1',
              }[dice];

              return (
                <button
                  key={dice}
                  onClick={() => {
                    onChange(dice);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-200 group ${gridPos} ${value === dice ? 'bg-[#c8aa6e]/20 border border-[#c8aa6e]/50' : 'hover:bg-[#c8aa6e]/10 border border-transparent'}`}
                >
                  <div className="w-8 h-8 mb-0.5 transition-transform group-hover:scale-110">
                    <img src={`/dados/${dice.toUpperCase()}.png`} alt={dice} className="w-full h-full object-contain" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${value === dice ? 'text-[#c8aa6e]' : 'text-slate-400 group-hover:text-[#c8aa6e]'}`}>
                    {dice.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ClassList = ({
  onBack,
  armas = [],
  armaduras = [],
  habilidades = [],
  glossary = [],
  rarityColorMap = {},
  readOnly = false,
  backButtonLabel = "Volver al menú",
  onLaunchMinigame,
  onLaunchDiceCalculator,
  onLaunchSpeedSystem,
  onLaunchMinimap,
  onLaunchCanvas,
  title = "Lista de Clases",
  subtitle = "Gestiona el archivo de héroes. Personaliza los retratos y estados para tu próxima sesión.",
  collectionPath = "classes",
  ownerFilter = null,
  CreatorComponent = ClassCreatorView,
  creatorLabel = "Campeón",
  isPlayerMode = false,
  initialCharacterName = null,
}) => {
  const [classes, setClasses] = useState([]);
  const [isAutoOpening, setIsAutoOpening] = useState(!!initialCharacterName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('alphaAsc');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState('list');
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [cropperState, setCropperState] = useState({
    classId: null,
    imageSrc: '',
    isNewUpload: false,
    activeMode: 'CARD', // 'CARD' | 'AVATAR'
    card: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
    avatar: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
  });
  const [isCropping, setIsCropping] = useState(false);

  // Custom Cropper State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState(true);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [editingClass, setEditingClass] = useState(null);
  const [levelSliderLimit, setLevelSliderLimit] = useState(12);
  const [equipmentSearchTerms, setEquipmentSearchTerms] = useState({
    weapons: '',
    armor: '',
    abilities: '',
  });
  const [saveButtonState, setSaveButtonState] = useState('idle'); // 'idle', 'saving', 'success', 'error'
  const [isCreating, setIsCreating] = useState(false);
  const [statusEffectsConfig, setStatusEffectsConfig] = useState(DEFAULT_STATUS_EFFECTS);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [viewingStatusEffect, setViewingStatusEffect] = useState(null);


  const fileInputRef = useRef(null);

  // Sync status effects from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'status_effects_config'), (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      if (Object.keys(data).length > 0) {
        setStatusEffectsConfig(data);
      }
    });

    return () => unsub();
  }, []);

  // Detectar si hay cambios entre editingClass y selectedClass
  const hasUnsavedChanges = useMemo(() => {
    if (!editingClass || !selectedClass) return false;
    return JSON.stringify(editingClass) !== JSON.stringify(selectedClass);
  }, [editingClass, selectedClass]);

  const equipmentCatalog = useMemo(
    () => ({
      weapons: (armas || []).map(buildWeaponEntry).filter(Boolean),
      armor: (armaduras || []).map(buildArmorEntry).filter(Boolean),
      abilities: (habilidades || []).map(buildAbilityEntry).filter(Boolean),
    }),
    [armas, armaduras, habilidades],
  );

  const totalPhysicalLoad = useMemo(() => {
    if (!editingClass || !editingClass.equippedItems) return 0;
    let total = 0;
    Object.entries(editingClass.equippedItems).forEach(([key, item]) => {
      if (item) {
        const p = item.payload || {};
        const val = item.physicalLoad || item.cargaFisica || item.carga_fisica || item.carga || item.peso || item.weight ||
          p.physicalLoad || p.cargaFisica || p.carga_fisica || p.carga || p.peso || p.weight || '';
        const loadValue = val.toString().trim();
        if (!loadValue) return;
        let load = parseInt(loadValue, 10);
        if (isNaN(load) || loadValue.includes('🔲')) {
          const match = loadValue.match(/🔲/g);
          if (match) load = match.length;
          else {
            const digitMatch = loadValue.match(/\d+/);
            if (digitMatch) load = parseInt(digitMatch[0], 10);
            else load = 0;
          }
        }
        if (!isNaN(load) && load > 0) {
          const quantity = item.quantity || 1;
          total += (load * quantity);
        }
      }
    });
    return total;
  }, [editingClass?.equippedItems]);

  const excessLoad = useMemo(() => {
    if (!isPlayerMode || !editingClass) return 0;
    const maxVida = editingClass.stats?.vida?.max ?? editingClass.vida ?? 0;
    return Math.max(0, totalPhysicalLoad - maxVida);
  }, [isPlayerMode, editingClass?.stats?.vida?.max, editingClass?.vida, totalPhysicalLoad]);

  useEffect(() => {
    let isMounted = true;

    const fetchClasses = async () => {
      try {
        let q;
        if (ownerFilter) {
          const { query, where } = await import('firebase/firestore');
          q = query(collection(db, collectionPath), where('owner', '==', ownerFilter));
        } else {
          q = collection(db, collectionPath);
        }
        const snapshot = await getDocs(q);
        if (!isMounted) return;

        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((docSnap) =>
            ensureClassDefaults({ id: docSnap.id, ...docSnap.data() }),
          );
          setClasses(loaded);
        } else if (collectionPath === 'classes' && !ownerFilter) {
          setClasses(initialClasses);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error('Error al cargar las clases desde Firebase', error);
      }
    };

    fetchClasses();

    return () => {
      isMounted = false;
    };
  }, [collectionPath, ownerFilter]); // Added dependencies to refetch if props change

  // Auto-open a specific character when initialCharacterName is provided
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (!initialCharacterName || hasAutoOpened.current || classes.length === 0) return;

    const targetClass = classes.find(c => c.name === initialCharacterName);
    if (targetClass) {
      openClassDetails(targetClass);
      hasAutoOpened.current = true;
      // Small timeout to ensure transition starts smoothly
      setTimeout(() => setIsAutoOpening(false), 50);
    } else {
      // If we finished loading but didn't find the character, just show the list
      setIsAutoOpening(false);
    }
  }, [initialCharacterName, classes]);

  const highlightText = useCallback(
    (rawValue) => {
      if (rawValue === null || rawValue === undefined) return '';

      const text = Array.isArray(rawValue)
        ? rawValue.join(', ')
        : rawValue.toString();

      if (!text || !glossary || glossary.length === 0) {
        return text;
      }

      let parts = [text];

      glossary.forEach((term) => {
        if (!term?.word) return;

        const tooltipId = getGlossaryTooltipId(term.word);
        const escapedWord = escapeGlossaryWord(term.word);

        if (!escapedWord) return;

        const regex = new RegExp(`(${escapedWord})`, 'gi');
        let matchIndex = 0;

        parts = parts.flatMap((part) => {
          if (typeof part !== 'string') return [part];

          return part.split(regex).map((segment) => {
            if (
              segment &&
              segment.toLowerCase() === term.word.toLowerCase()
            ) {
              const key = `${tooltipId}-${matchIndex++}`;

              const style = term.color
                ? { color: term.color }
                : undefined;

              return (
                <span
                  key={key}
                  style={style}
                  className="font-semibold cursor-help underline decoration-dotted decoration-2 underline-offset-4"
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={term.info}
                >
                  {segment}
                </span>
              );
            }

            return segment;
          });
        });
      });

      return parts;
    },
    [glossary],
  );

  const normalizeStatIcons = useCallback((value, type) => {
    if (value === null || value === undefined) return value;

    let normalizedValue = value;
    if (typeof normalizedValue === 'number') {
      normalizedValue = normalizedValue.toString();
    }

    if (Array.isArray(normalizedValue)) {
      normalizedValue = normalizedValue.join(', ');
    }

    if (typeof normalizedValue !== 'string') {
      return normalizedValue;
    }

    const trimmed = normalizedValue.trim();
    if (!trimmed) return '';

    switch (type) {
      case 'consumption':
        return convertNumericStringToIcons(trimmed, '🟡', ['Consumo', 'Velocidad']);
      case 'physical':
        return convertNumericStringToIcons(trimmed, '🔲', [
          'Carga física',
          'Carga fisica',
          'Cuerpo',
        ]);
      case 'mental':
        return convertNumericStringToIcons(trimmed, '🧠', ['Carga mental', 'Mente']);
      default:
        return trimmed;
    }
  }, []);

  const renderHighlightedValue = useCallback(
    (value, { placeholder = '—', className = 'font-semibold text-slate-100', statType } = {}) => {
      const normalized = statType ? normalizeStatIcons(value, statType) : value;
      const content =
        normalized !== null && normalized !== undefined
          ? normalized.toString().trim()
          : '';

      if (!content) {
        return <span className="text-slate-500">{placeholder}</span>;
      }

      return <span className={className}>{highlightText(content)}</span>;
    },
    [highlightText, normalizeStatIcons],
  );

  const getRarityStyle = useCallback(
    (rarity) => {
      const color = rarity ? rarityColorMap?.[rarity] : null;
      return buildRarityStyle(color);
    },
    [rarityColorMap],
  );

  const handleSearchChange = (event) => setSearchTerm(event.target.value);

  const handleSortChange = (event) => setSortBy(event.target.value);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileActiveView('list');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!selectedClass) {
      setMobileActiveView('list');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      const sanitized = ensureClassDefaults(selectedClass);
      setEditingClass(deepClone(sanitized));
      const targetLimit = Math.max(12, (sanitized.classLevels?.length || 0) + 2);
      setLevelSliderLimit(targetLimit);
    } else {
      setEditingClass(null);
    }
  }, [selectedClass]);

  const openClassDetails = (classItem) => {
    setSaveStatus(null);
    const sanitized = ensureClassDefaults(classItem);
    setSelectedClass(sanitized);
    setEditingClass(deepClone(sanitized));
    const targetLimit = Math.max(12, (sanitized.classLevels?.length || 0) + 2);
    setLevelSliderLimit(targetLimit);
    setActiveDetailTab('overview');
    if (isMobile) {
      setMobileActiveView('details');
    }
  };

  const closeClassDetails = () => {
    setSaveStatus(null);
    setSelectedClass(null);
    setActiveDetailTab('overview');
    setEditingClass(null);
    if (isMobile) {
      setMobileActiveView('list');
    }
  };

  const updateEditingClass = (mutator) => {
    setEditingClass((prev) => {
      if (!prev) return prev;
      const draft = deepClone(prev);
      mutator(draft);
      return draft;
    });
  };

  // Funciones de actualización para campos editables
  const handleUpdateClassField = (field, value) => {
    updateEditingClass((draft) => {
      draft[field] = value;
    });
  };

  const handleUpdateLevel = (levelIndex, field, value) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[levelIndex]) return;
      levels[levelIndex][field] = value;
      draft.classLevels = levels;
    });
  };

  const handleAddLevelFeature = (levelIndex) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[levelIndex]) return;

      const currentExtras = levels[levelIndex].additionalFeatures || [];
      if (currentExtras.length >= 2) return; // Máximo 2 extras + 1 principal = 3

      currentExtras.push({ title: 'Nuevo rasgo', description: '' });
      levels[levelIndex].additionalFeatures = currentExtras;
    });
  };

  const handleRemoveLevelFeature = (levelIndex, featureIndex) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[levelIndex]) return;

      const currentExtras = levels[levelIndex].additionalFeatures || [];
      currentExtras.splice(featureIndex, 1);
      levels[levelIndex].additionalFeatures = currentExtras;
    });
  };

  const handleUpdateLevelFeature = (levelIndex, featureIndex, field, value) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[levelIndex]) return;

      const currentExtras = levels[levelIndex].additionalFeatures || [];
      if (currentExtras[featureIndex]) {
        currentExtras[featureIndex][field] = value;
      }
    });
  };

  const handleAddEquipment = (payload, category) => {
    if (!payload) return;

    // Determinar el tipo de ítem basado en la categoría del buscador
    let itemType = 'general';
    if (category === 'weapons') itemType = 'weapon';
    else if (category === 'armor') itemType = 'armor';
    else if (category === 'abilities') itemType = 'ability';
    else if (category === 'objects') itemType = 'object';
    else if (category === 'accessories') itemType = 'accessory';

    // Normalizar el item para asegurar que tiene todas las propiedades necesarias
    const normalized = {
      name: payload.name || payload.nombre || 'Item sin nombre',
      category: payload.category || 'General',
      itemType: itemType, // Campo nuevo para identificar el tipo de ítem
      damage: payload.damage || payload.dano || '',
      range: payload.range || payload.alcance || '',
      consumption: payload.consumption || payload.consumo || '',
      physicalLoad: payload.physicalLoad || payload.cargaFisica || '',
      mentalLoad: payload.mentalLoad || payload.cargaMental || '',
      defense: payload.defense || payload.defensa || '',
      traits: payload.traits || payload.rasgos || payload.trait || '',
      rareza: payload.rareza || payload.rarity || '',
      description: payload.description || payload.descripcion || '',
      body: payload.body || '',
      mind: payload.mind || '',
      icon: payload.icon || '',
    };

    updateEditingClass((draft) => {
      // Asegurar que equipment es un objeto con las categorías correctas
      if (!draft.equipment || Array.isArray(draft.equipment)) {
        draft.equipment = deepClone(defaultEquipment);
      }

      // Usar la categoría proporcionada o 'weapons' por defecto si no coincide
      const targetCategory = ['weapons', 'armor', 'abilities', 'objects', 'accessories'].includes(category) ? category : 'weapons';

      if (!draft.equipment[targetCategory]) {
        draft.equipment[targetCategory] = [];
      }

      draft.equipment[targetCategory].push(normalized);
    });
  };

  const handleRemoveEquipment = (index, category) => {
    updateEditingClass((draft) => {
      if (!draft.equipment || Array.isArray(draft.equipment)) return;

      if (category && draft.equipment[category]) {
        draft.equipment[category].splice(index, 1);
      }
    });
  };

  const handleDeleteClass = async (classId) => {
    if (!classId) return;

    if (!window.confirm("¿Estás seguro de que quieres eliminar esta clase? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, collectionPath, classId));
      setClasses((prev) => prev.filter((c) => c.id !== classId));

      if (selectedClass && selectedClass.id === classId) {
        setSelectedClass(null);
      }
      // If we were editing this class, close the editor
      if (editingClass && editingClass.id === classId) {
        closeClassDetails();
      }

    } catch (error) {
      console.error("Error removing class: ", error);
      alert("Error al eliminar la clase. Inténtalo de nuevo.");
    }
  };

  const handleUpdateTalent = (field, value) => {
    updateEditingClass((draft) => {
      if (!draft.talents) {
        draft.talents = {};
      }
      draft.talents[field] = value;
    });
  };

  const handleEquipmentSearchChange = (category, value) => {
    setEquipmentSearchTerms((prev) => ({ ...prev, [category]: value }));
  };

  const importEquipmentFromCatalog = (category, payload) => {
    if (!payload) return;

    const normalized = (() => {
      switch (category) {
        case 'weapons':
          return {
            name: payload.name || 'Arma sin nombre',
            category: payload.category || 'Arma',
            damage: payload.damage || '',
            range: payload.range || '',
            consumption: payload.consumption || '',
            physicalLoad: payload.physicalLoad || '',
            mentalLoad: payload.mentalLoad || '',
            traits: payload.traits || payload.properties || '',
            rareza: payload.rareza || '',
            description: payload.description || '',
          };
        case 'armor':
          return {
            name: payload.name || 'Armadura sin nombre',
            category: payload.category || 'Armadura',
            defense: payload.defense || '',
            physicalLoad: payload.physicalLoad || payload.weight || '',
            mentalLoad: payload.mentalLoad || '',
            traits: payload.traits || '',
            rareza: payload.rareza || '',
            description: payload.description || '',
          };
        case 'abilities':
        default:
          return {
            name: payload.name || 'Habilidad sin nombre',
            category: payload.category || 'Habilidad',
            damage: payload.damage || '',
            range: payload.range || '',
            consumption: payload.consumption || payload.cost || '',
            body: payload.body || '',
            mind: payload.mind || '',
            trait: payload.trait || payload.traits || '',
            rareza: payload.rareza || '',
            description: payload.description || '',
          };
      }
    })();

    updateEditingClass((draft) => {
      draft.equipment = draft.equipment || deepClone(defaultEquipment);
      const list = draft.equipment[category] || [];
      list.push(normalized);
      draft.equipment[category] = list;
    });

    setEquipmentSearchTerms((prev) => ({ ...prev, [category]: '' }));
  };

  const handleGeneralFieldChange = (field, value) => {
    updateEditingClass((draft) => {
      draft[field] = value;
    });
  };

  const handleSummaryFieldChange = (field, value) => {
    updateEditingClass((draft) => {
      draft.summary = draft.summary || {};
      draft.summary[field] = value;
    });
  };

  const handleProficiencyChange = (type, key) => {
    updateEditingClass((draft) => {
      draft.summary = draft.summary || {};
      draft.summary.proficiencies = draft.summary.proficiencies || { weapons: {}, armor: {} };
      draft.summary.proficiencies[type] = draft.summary.proficiencies[type] || {};
      draft.summary.proficiencies[type][key] = !draft.summary.proficiencies[type][key];
    });
  };

  const handleUpdateEquipped = (slot, item) => {
    updateEditingClass((draft) => {
      draft.equippedItems = draft.equippedItems || { mainHand: null, offHand: null, body: null };
      draft.equippedItems[slot] = item;
    });
  };

  const handleHighlightChange = (index, value) => {
    updateEditingClass((draft) => {
      draft.summary = draft.summary || {};
      const highlights = draft.summary.highlights || [];
      highlights[index] = value;
      draft.summary.highlights = highlights;
    });
  };

  const addHighlight = () => {
    updateEditingClass((draft) => {
      draft.summary = draft.summary || {};
      const highlights = draft.summary.highlights || [];
      highlights.push('Nuevo punto clave');
      draft.summary.highlights = highlights;
    });
  };

  const removeHighlight = (index) => {
    updateEditingClass((draft) => {
      draft.summary = draft.summary || {};
      const highlights = draft.summary.highlights || [];
      highlights.splice(index, 1);
      draft.summary.highlights = highlights;
    });
  };

  const toggleInspirationCompleted = (index) => {
    updateEditingClass((draft) => {
      const entries = draft.inspiration || [];
      if (!entries[index]) return;
      entries[index].completed = !entries[index].completed;
    });
  };

  const handleInspirationFieldChange = (index, field, value) => {
    updateEditingClass((draft) => {
      const entries = draft.inspiration || [];
      if (!entries[index]) return;
      entries[index][field] = value;
    });
  };

  const addInspirationEntry = () => {
    updateEditingClass((draft) => {
      const entries = draft.inspiration || [];
      entries.push({
        title: 'Nuevo hito',
        description: 'Describe el objetivo para completarlo.',
        completed: false,
      });
      draft.inspiration = entries;
    });
  };

  const removeInspirationEntry = (index) => {
    updateEditingClass((draft) => {
      const entries = draft.inspiration || [];
      entries.splice(index, 1);
      draft.inspiration = entries;
    });
  };

  const handleRuleChange = (index, value) => {
    updateEditingClass((draft) => {
      const rules = draft.rules || [];
      rules[index] = value;
      draft.rules = rules;
    });
  };

  const addRule = () => {
    updateEditingClass((draft) => {
      const rules = draft.rules || [];
      rules.push('Nueva regla especial.');
      draft.rules = rules;
    });
  };

  const removeRule = (index) => {
    updateEditingClass((draft) => {
      const rules = draft.rules || [];
      rules.splice(index, 1);
      draft.rules = rules;
    });
  };

  const handleSaveNewClass = async (newClass) => {
    try {
      let imageUrl = newClass.image;
      let avatarUrl = newClass.avatar;

      const storagePrefix = collectionPath === 'classes' ? 'class' : 'character';

      // If image is a base64 string, upload it to Storage
      if (imageUrl && imageUrl.startsWith('data:')) {
        const imageRef = ref(storage, `${storagePrefix}-images/${newClass.id}`);
        await uploadString(imageRef, imageUrl, 'data_url');
        imageUrl = await getDownloadURL(imageRef);
      }

      // If avatar is a base64 string, upload it to Storage
      if (avatarUrl && avatarUrl.startsWith('data:')) {
        const avatarRef = ref(storage, `${storagePrefix}-avatars/${newClass.id}`);
        await uploadString(avatarRef, avatarUrl, 'data_url');
        avatarUrl = await getDownloadURL(avatarRef);
      }

      let portraitSourceUrl = newClass.portraitSource;
      if (portraitSourceUrl && portraitSourceUrl.startsWith('data:')) {
        const sourceRef = ref(storage, `${storagePrefix}-sources/${newClass.id}`);
        await uploadString(sourceRef, portraitSourceUrl, 'data_url');
        portraitSourceUrl = await getDownloadURL(sourceRef);
      }

      const classToSave = {
        ...newClass,
        image: imageUrl,
        avatar: avatarUrl,
        portraitSource: portraitSourceUrl || '',
        owner: ownerFilter || newClass.owner || 'master',
      };

      await setDoc(doc(db, collectionPath, newClass.id), classToSave);
      setClasses((prev) => [...prev, classToSave]);
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating class:", error);
      throw error;
    }
  };

  const handleTagChange = (index, value) => {
    updateEditingClass((draft) => {
      const tags = draft.tags || [];
      tags[index] = value;
      draft.tags = tags;
    });
  };

  const handleAddTag = () => {
    updateEditingClass((draft) => {
      const tags = draft.tags || [];
      tags.push('Nueva etiqueta');
      draft.tags = tags;
    });
  };

  const handleRemoveTag = (index) => {
    updateEditingClass((draft) => {
      const tags = draft.tags || [];
      tags.splice(index, 1);
      draft.tags = tags;
    });
  };

  const handleRatingChange = (value) => {
    updateEditingClass((draft) => {
      draft.rating = value;
    });
  };

  const handleLevelFieldChange = (index, field, value) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[index]) return;
      levels[index][field] = value;
      draft.classLevels = levels;
    });
  };

  const toggleLevelCompleted = (levelIndex) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      // Asegurarse de que existen niveles hasta el índice deseado
      while (levels.length <= levelIndex) {
        levels.push({ title: `Nivel ${levels.length + 1}`, description: '', acquired: false });
      }

      // Lógica secuencial: Evitar huecos en la progresión
      const isTargetAcquired = levels[levelIndex].acquired;

      if (!isTargetAcquired) {
        // DESBLOQUEAR: Marcar este y todos los anteriores como adquiridos
        for (let i = 0; i <= levelIndex; i++) {
          if (levels[i]) levels[i].acquired = true;
        }
      } else {
        // BLOQUEAR: Desmarcar este y todos los posteriores como no adquiridos
        for (let i = levelIndex; i < levels.length; i++) {
          if (levels[i]) levels[i].acquired = false;
        }
      }

      // Contar cuántos niveles están marcados como acquired y actualizar el nivel actual
      const acquiredCount = levels.filter(l => l.acquired).length;
      draft.level = acquiredCount;

      draft.classLevels = levels;
    });
  };

  const setLevelCount = (count) => {
    updateEditingClass((draft) => {
      const target = Math.max(0, count);
      const levels = draft.classLevels || [];
      if (target > levels.length) {
        for (let i = levels.length; i < target; i += 1) {
          levels.push({
            title: `Nivel ${i + 1} — Nuevo avance`,
            description: 'Describe el beneficio de este nivel.',
            completed: false,
          });
        }
      } else if (target < levels.length) {
        levels.length = target;
      }
      draft.classLevels = levels;
    });
  };

  const addLevel = () => {
    const currentCount = editingClass?.classLevels?.length || 0;
    const nextCount = currentCount + 1;
    if (nextCount > levelSliderLimit) {
      setLevelSliderLimit(nextCount);
    }
    setLevelCount(nextCount);
  };

  const removeLevel = (index) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      levels.splice(index, 1);
      draft.classLevels = levels;
    });
  };

  const handleEquipmentChange = (category, index, field, value) => {
    updateEditingClass((draft) => {
      draft.equipment = draft.equipment || deepClone(defaultEquipment);
      const list = draft.equipment[category] || [];
      if (!list[index]) return;
      list[index][field] = value;
      draft.equipment[category] = list;
    });
  };

  const addEquipmentItem = (category) => {
    const templates = {
      weapons: {
        name: 'Nueva arma',
        category: 'Categoría',
        damage: '',
        range: '',
        consumption: '',
        physicalLoad: '',
        mentalLoad: '',
        traits: '',
        rareza: '',
        description: 'Describe los rasgos principales del arma.',
      },
      armor: {
        name: 'Nueva armadura',
        category: 'Categoría',
        defense: '',
        physicalLoad: '',
        mentalLoad: '',
        traits: '',
        rareza: '',
        description: 'Describe la protección o ventajas especiales.',
      },
      abilities: {
        name: 'Nueva habilidad',
        category: 'Tipo',
        damage: '',
        range: '',
        consumption: '',
        body: '',
        mind: '',
        trait: '',
        rareza: '',
        description: 'Detalla el efecto de la habilidad.',
      },
    };

    updateEditingClass((draft) => {
      draft.equipment = draft.equipment || deepClone(defaultEquipment);
      const list = draft.equipment[category] || [];
      list.push(deepClone(templates[category]));
      draft.equipment[category] = list;
    });
  };

  const removeEquipmentItem = (category, index) => {
    updateEditingClass((draft) => {
      draft.equipment = draft.equipment || deepClone(defaultEquipment);
      const list = draft.equipment[category] || [];
      list.splice(index, 1);
      draft.equipment[category] = list;
    });
  };

  const handleSaveChanges = async () => {
    if (!editingClass) return;

    setSaveButtonState('saving');

    try {
      // Preparar datos para Firebase
      const sanitized = ensureClassDefaults(editingClass);
      let classId = sanitized.id?.toString().trim();

      if (!classId) {
        classId = slugifyId(sanitized.name);
        if (!classId) {
          console.error('La clase necesita un nombre o identificador');
          setSaveButtonState('error');
          setTimeout(() => setSaveButtonState('idle'), 2000);
          return;
        }
        sanitized.id = classId;
      }

      // Normalizar imagen
      sanitized.image = normalizeImageValue(sanitized.image);
      const cleanedData = pruneUndefined(sanitized);

      // Asegurar que cleanedData tenga el id
      cleanedData.id = classId;

      // Guardar en Firebase con timeout extendido para evitar espera indefinida
      // Si Firebase está saturado (resource-exhausted), esto fallará después de 20s
      const savePromise = setDoc(doc(db, collectionPath, classId), cleanedData, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firebase está saturado o la conexión es lenta (Timeout 20s)')), 20000)
      );

      try {
        await Promise.race([savePromise, timeoutPromise]);
      } catch (saveError) {
        console.error('Error detallado al guardar:', saveError);
        // Si es un error de cuota o saturación, avisamos específicamente
        if (saveError.message?.includes('resource-exhausted') || saveError.code === 'resource-exhausted') {
          throw new Error('Firebase ha alcanzado el límite de escritura. Espera unos minutos.');
        }
        throw saveError;
      }

      // Usar cleanedData para el estado local para que coincida exactamente con lo guardado
      const savedData = ensureClassDefaults(cleanedData);

      // Actualizar el estado principal de clases
      setClasses((prevClasses) => {
        const exists = prevClasses.some((c) => c.id === classId);
        if (exists) {
          return prevClasses.map((c) => (c.id === classId ? savedData : c));
        }
        return [...prevClasses, savedData];
      });

      // Actualizar selectedClass y editingClass con los mismos datos
      // para que hasUnsavedChanges sea false
      setSelectedClass(savedData);
      setEditingClass(deepClone(savedData));

      // Mostrar éxito
      setSaveButtonState('success');
      setTimeout(() => setSaveButtonState('idle'), 2000);
    } catch (error) {
      console.error('Error final en handleSaveChanges:', error);
      setSaveButtonState('error');
      // No reseteamos a idle inmediatamente para que el usuario vea el error
      setTimeout(() => setSaveButtonState('idle'), 4000);
    }
  };

  const handleDiscardChanges = () => {
    setSaveStatus(null);
    if (selectedClass) {
      const reset = ensureClassDefaults(selectedClass);
      setEditingClass(deepClone(reset));
      const targetLimit = Math.max(levelSliderLimit, (reset.classLevels?.length || 0) + 2);
      setLevelSliderLimit(targetLimit);
    }
  };

  const hasChanges = useMemo(() => {
    if (!selectedClass || !editingClass) return false;
    return JSON.stringify(selectedClass) !== JSON.stringify(editingClass);
  }, [selectedClass, editingClass]);

  useEffect(() => {
    if (hasChanges && saveStatus?.type === 'success') {
      setSaveStatus(null);
    }
  }, [hasChanges, saveStatus]);

  const renderDetailContent = () => {
    if (!editingClass) return null;

    const {
      summary = {},
      inspiration = [],
      classLevels = [],
      rules = [],
      equipment = defaultEquipment,
    } = editingClass;

    switch (activeDetailTab) {
      case 'overview': {
        const highlights = summary.highlights || [];
        return (
          <div className="space-y-6">
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Rol en combate</div>
              <EditableField
                value={summary.battleRole}
                onChange={(value) => handleSummaryFieldChange('battleRole', value)}
                placeholder="Define el rol principal de esta clase."
                displayClassName="rounded-2xl border border-slate-700/40 bg-slate-900/60 px-4 py-2"
                textClassName="text-lg font-semibold text-slate-100"
              />
            </div>
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-sky-200/80">Combo recomendado</div>
              <EditableField
                value={summary.combo}
                onChange={(value) => handleSummaryFieldChange('combo', value)}
                multiline
                placeholder="Describe cómo se combinan las habilidades clave."
                displayClassName="mt-2 w-full"
                textClassName="block text-sm leading-relaxed text-sky-50/90"
                inputClassName="bg-sky-950/60 border-sky-500/40 focus:ring-sky-400"
              />
            </div>
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-purple-200/80">Consejo de dificultad</div>
              <EditableField
                value={summary.difficultyNote}
                onChange={(value) => handleSummaryFieldChange('difficultyNote', value)}
                multiline
                placeholder="Ofrece una pista estratégica para dominar la clase."
                displayClassName="mt-2 w-full"
                textClassName="block text-sm leading-relaxed text-purple-50/90"
                inputClassName="bg-purple-950/50 border-purple-500/40 focus:ring-purple-400"
              />
            </div>
// Proficiencies removed from here and moved to LoadoutView

            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Puntos clave</div>
              <ul className="mt-3 space-y-3">

                {highlights.length > 0 ? (
                  highlights.map((item, index) => (
                    <li
                      key={`highlight-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3 text-sm text-slate-300"
                    >
                      <FiTarget className="mt-1 h-4 w-4 text-sky-300" />
                      <div className="flex flex-1 items-start gap-3">
                        <EditableField
                          value={item}
                          onChange={(value) => handleHighlightChange(index, value)}
                          multiline
                          placeholder="Describe un rasgo o fortaleza."
                          displayClassName="flex-1"
                          textClassName="text-left text-sm leading-relaxed text-slate-300"
                          inputClassName="bg-slate-950/70 border-slate-700/60"
                        />
                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="rounded-full border border-transparent p-2 text-slate-500 transition hover:border-slate-600 hover:text-rose-300"
                          aria-label="Eliminar punto clave"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-500">
                    Agrega los aspectos que quieres destacar de la clase.
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={addHighlight}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
              >
                <FiPlus className="h-4 w-4" />
                Agregar punto clave
              </button>
            </div >
          </div >
        );
      }
      case 'inspiration': {
        return (
          <div className="space-y-4">
            {inspiration.length > 0 ? (
              inspiration.map((entry, index) => {
                const completed = Boolean(entry.completed);
                return (
                  <div
                    key={`inspiration-${index}`}
                    className={`group rounded-2xl border p-4 shadow-[0_10px_25px_-15px_rgba(251,191,36,0.6)] transition ${completed
                      ? 'border-emerald-400/50 bg-emerald-500/10 ring-1 ring-emerald-400/40'
                      : 'border-amber-400/30 bg-amber-400/10'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleInspirationCompleted(index)}
                        className={`mt-1 rounded-full border border-transparent p-2 transition ${completed
                          ? 'bg-emerald-500/20 text-emerald-200 hover:text-emerald-100'
                          : 'bg-slate-900/50 text-amber-200 hover:text-amber-100'
                          }`}
                        aria-label={completed ? 'Marcar hito como pendiente' : 'Marcar hito como completado'}
                      >
                        {completed ? (
                          <FiCheckSquare className="h-4 w-4" />
                        ) : (
                          <FiSquare className="h-4 w-4" />
                        )}
                      </button>
                      <div className="flex-1 space-y-3">
                        <EditableField
                          value={entry.title}
                          onChange={(value) => handleInspirationFieldChange(index, 'title', value)}
                          placeholder="Título del hito"
                          displayClassName="rounded-2xl border border-transparent bg-slate-900/40 px-3 py-2"
                          textClassName={`text-sm font-semibold uppercase tracking-[0.3em] ${completed ? 'text-emerald-100' : 'text-amber-100'
                            }`}
                        />
                        <EditableField
                          value={entry.description}
                          onChange={(value) => handleInspirationFieldChange(index, 'description', value)}
                          multiline
                          placeholder="Describe qué se necesita para completar el hito."
                          displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                          textClassName="text-sm leading-relaxed text-slate-200"
                          inputClassName="bg-slate-950/70 border-slate-700/60"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInspirationEntry(index)}
                        className="rounded-full border border-transparent p-2 text-slate-500 transition hover:border-slate-600 hover:text-rose-300"
                        aria-label="Eliminar hito"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/5 p-5 text-sm text-amber-100/70">
                Añade tus primeros hitos de inspiración para guiar la progresión narrativa de la clase.
              </div>
            )}
            <button
              type="button"
              onClick={addInspirationEntry}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100 transition hover:border-emerald-400 hover:text-emerald-200"
            >
              <FiPlus className="h-4 w-4" />
              Agregar hito
            </button>
          </div>
        );
      }
      case 'levels': {
        const levelCount = classLevels.length;
        return (
          <div className="space-y-5">
            <div className="space-y-3 rounded-3xl border border-indigo-400/20 bg-indigo-500/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-indigo-200/80">
                  <FiSliders className="h-4 w-4" />
                  <span>Niveles configurados</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(levelSliderLimit, levelCount)}
                    value={levelCount}
                    onChange={(event) => setLevelCount(Number(event.target.value))}
                    className="w-40 accent-indigo-400"
                  />
                  <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100">
                    {levelCount} niveles
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <label className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/5 px-3 py-1">
                  <span>Máximo</span>
                  <input
                    type="number"
                    min={Math.max(levelCount, 1)}
                    value={Math.max(levelSliderLimit, levelCount)}
                    onChange={(event) => {
                      const value = Number(event.target.value) || levelSliderLimit;
                      const resolved = Math.max(levelCount, value);
                      setLevelSliderLimit(resolved);
                    }}
                    className="w-16 rounded-full border border-indigo-400/40 bg-slate-950/70 px-2 py-1 text-right text-xs text-indigo-100 focus:border-indigo-300 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={addLevel}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1 font-semibold uppercase tracking-[0.3em] text-indigo-100 transition hover:border-indigo-200"
                >
                  <FiPlus className="h-4 w-4" />
                  Añadir nivel
                </button>
              </div>
            </div>
            {levelCount > 0 ? (
              <div className="space-y-4">
                {classLevels.map((level, index) => {
                  const isCompleted = Boolean(level.completed);
                  const cardTone = isCompleted
                    ? 'border-emerald-400/50 bg-emerald-500/10 shadow-[0_12px_28px_-18px_rgba(16,185,129,0.6)]'
                    : 'border-indigo-400/30 bg-indigo-500/10 shadow-[0_10px_25px_-15px_rgba(129,140,248,0.6)]';

                  return (
                    <div
                      key={`level-${index}`}
                      className={`rounded-2xl p-5 transition ${cardTone}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleLevelCompleted(index)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${isCompleted
                              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300'
                              : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:border-emerald-300 hover:text-emerald-200'
                              }`}
                            aria-pressed={isCompleted}
                            aria-label={
                              isCompleted
                                ? `Marcar nivel ${index + 1} como pendiente`
                                : `Marcar nivel ${index + 1} como completado`
                            }
                          >
                            {isCompleted ? (
                              <FiCheckSquare className="h-4 w-4" />
                            ) : (
                              <FiSquare className="h-4 w-4" />
                            )}
                          </button>
                          <EditableField
                            value={level.title}
                            onChange={(value) => handleLevelFieldChange(index, 'title', value)}
                            placeholder={`Nivel ${index + 1} — Define el avance`}
                            displayClassName="flex-1 rounded-2xl border border-transparent bg-indigo-500/10 px-3 py-2"
                            textClassName={`text-sm font-semibold uppercase tracking-[0.3em] ${isCompleted
                              ? 'text-emerald-100 line-through decoration-emerald-300/60 decoration-2'
                              : 'text-indigo-100'
                              }`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLevel(index)}
                          className="rounded-full border border-transparent p-2 text-indigo-200/80 transition hover:border-indigo-300 hover:text-rose-200"
                          aria-label="Eliminar nivel"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <EditableField
                        value={level.description}
                        onChange={(value) => handleLevelFieldChange(index, 'description', value)}
                        multiline
                        placeholder="Detalla el beneficio de alcanzar este nivel."
                        displayClassName="mt-3 rounded-2xl border border-indigo-400/30 bg-indigo-950/40 px-3 py-3"
                        textClassName={`text-sm leading-relaxed ${isCompleted ? 'text-emerald-100/90' : 'text-indigo-50/90'
                          }`}
                        inputClassName="bg-indigo-950/40 border-indigo-400/30"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-indigo-400/30 bg-indigo-500/5 p-5 text-sm text-indigo-100/70">
                Usa la barra deslizante para establecer los niveles disponibles de esta clase.
              </div>
            )}
          </div>
        );
      }
      case 'feats': {
        return (
          <RelicsView
            dndClass={editingClass}
            onFeaturesChange={(newFeatures) => handleUpdateClassField('features', newFeatures)}
            onActionsChange={(newActions) => handleUpdateClassField('actionData', newActions)}
          />
        );
      }
      case 'rules': {
        return (
          <div className="space-y-4">
            {rules.length > 0 ? (
              rules.map((rule, index) => (
                <div
                  key={`rule-${index}`}
                  className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4"
                >
                  <EditableField
                    value={rule}
                    onChange={(value) => handleRuleChange(index, value)}
                    multiline
                    placeholder="Describe una regla o modificación especial."
                    displayClassName="flex-1"
                    textClassName="text-sm leading-relaxed text-emerald-50/90"
                    inputClassName="bg-emerald-950/40 border-emerald-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="rounded-full border border-transparent p-2 text-emerald-200/80 transition hover:border-emerald-300 hover:text-rose-200"
                    aria-label="Eliminar regla"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-500/5 p-5 text-sm text-emerald-100/70">
                Añade reglas especiales para personalizar la experiencia de juego de la clase.
              </div>
            )}
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-200"
            >
              <FiPlus className="h-4 w-4" />
              Agregar regla
            </button>
          </div>
        );
      }
      case 'equipment': {
        const { weapons = [], armor = [], abilities = [] } = equipment || defaultEquipment;

        const renderEquipmentSection = (category, title, items, fields) => {
          const searchValue = equipmentSearchTerms[category] || '';
          const normalizedSearch = searchValue.trim().toLowerCase();
          const catalog = equipmentCatalog[category] || [];
          const catalogMatches =
            normalizedSearch.length > 0
              ? catalog.filter((entry) =>
                [entry.name, entry.category, entry.preview]
                  .join(' ')
                  .toLowerCase()
                  .includes(normalizedSearch)
              )
              : [];
          const limitedMatches = catalogMatches.slice(0, 8);

          return (
            <div key={category} className="space-y-3 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</div>
                <button
                  type="button"
                  onClick={() => addEquipmentItem(category)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
                >
                  <FiPlus className="h-4 w-4" />
                  Añadir
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">
                  Importar desde el repositorio
                </label>
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => handleEquipmentSearchChange(category, event.target.value)}
                    placeholder={`Buscar ${title.toLowerCase()}`}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-2 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => handleEquipmentSearchChange(category, '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 transition hover:text-rose-300"
                      aria-label={`Borrar búsqueda de ${title.toLowerCase()}`}
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {searchValue && (
                  <div className="mt-1 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/90 p-3 [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-500/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/40">
                    {limitedMatches.length > 0 ? (
                      limitedMatches.map((option) => (
                        <button
                          key={`${category}-catalog-${option.id}`}
                          type="button"
                          onClick={() => importEquipmentFromCatalog(category, option.payload)}
                          className="group flex w-full flex-col gap-1 rounded-2xl border border-transparent px-3 py-2 text-left transition hover:border-sky-500/40 hover:bg-sky-500/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">
                                {option.category || 'Sin categoría'}
                              </div>
                              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-100">
                                {option.name}
                              </div>
                            </div>
                            <FiArrowRight className="mt-1 h-4 w-4 text-sky-300 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                          </div>
                          {option.preview && (
                            <p className="text-xs leading-relaxed text-slate-400">{option.preview}</p>
                          )}
                          {option.origin && (
                            <div className="text-[0.55rem] uppercase tracking-[0.35em] text-slate-600">
                              {option.origin}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        No se encontraron coincidencias en el catálogo.
                      </div>
                    )}
                    <div className="mt-2 text-[0.55rem] uppercase tracking-[0.35em] text-slate-600">
                      Selecciona una entrada para agregarla a la lista.
                    </div>
                  </div>
                )}
              </div>

              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-950/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <EditableField
                          value={item.name}
                          onChange={(value) => handleEquipmentChange(category, index, 'name', value)}
                          placeholder={`Nombre de ${title.toLowerCase()}`}
                          displayClassName="flex-1 rounded-2xl border border-transparent bg-slate-900/50 px-3 py-2"
                          textClassName="text-sm font-semibold uppercase tracking-[0.3em] text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeEquipmentItem(category, index)}
                          className="rounded-full border border-transparent p-2 text-slate-500 transition hover:border-slate-600 hover:text-rose-300"
                          aria-label={`Eliminar ${title.toLowerCase()}`}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {fields.map(({ key, label, placeholder: fieldPlaceholder }) => (
                          <div key={`${category}-${index}-${key}`} className="space-y-2">
                            <div className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">{label}</div>
                            <EditableField
                              value={item[key]}
                              onChange={(value) => handleEquipmentChange(category, index, key, value)}
                              placeholder={fieldPlaceholder}
                              displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                              textClassName="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Descripción</div>
                        <EditableField
                          value={item.description}
                          onChange={(value) => handleEquipmentChange(category, index, 'description', value)}
                          multiline
                          placeholder="Describe rasgos o efectos relevantes."
                          displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                          textClassName="text-sm leading-relaxed text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/50 p-4 text-sm text-slate-500">
                  No hay elementos registrados todavía.
                </div>
              )}
            </div>
          );
        };

        const renderPreviewCards = (title, items, config) => {
          const baseCardClass =
            'group relative overflow-hidden rounded-3xl border px-5 py-5 transition-all duration-300 [border-color:var(--card-border-color,_rgba(148,163,184,0.35))] hover:[border-color:var(--card-border-hover-color,_rgba(148,163,184,0.55))] [box-shadow:var(--card-shadow,_0_15px_30px_-20px_rgba(15,23,42,0.6))] hover:[box-shadow:var(--card-shadow-hover,_0_20px_50px_-20px_rgba(56,189,248,0.45))] [background:var(--card-background,_rgba(15,23,42,0.85))] hover:-translate-y-1';
          const renderStatRow = (label, value, { statType, placeholder, labelClassName, valueClassName } = {}) => (
            <div className="flex items-start justify-between gap-3">
              <span
                className={`text-[0.6rem] uppercase tracking-[0.35em] ${labelClassName || config.statLabelClass
                  }`}
              >
                {label}
              </span>
              {renderHighlightedValue(value, {
                statType,
                placeholder,
                className: valueClassName || config.statValueClass,
              })}
            </div>
          );

          const renderTraitsList = (traits, emptyLabel = 'Sin rasgos destacados.') => {
            const raw = traits ? traits.toString() : '';
            const pieces = raw
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean);

            if (pieces.length === 0) {
              return (
                <p className="text-[0.7rem] text-slate-500">{emptyLabel}</p>
              );
            }

            return (
              <div className="mt-3 flex flex-wrap gap-2">
                {pieces.map((trait, index) => (
                  <span
                    key={`trait-${trait}-${index}`}
                    className={`rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] ${config.traitClass}`}
                  >
                    {renderHighlightedValue(trait, {
                      className: config.traitValueClass,
                    })}
                  </span>
                ))}
              </div>
            );
          };

          const renderDescription = (description, placeholder = 'Sin descripción definida.') => (
            <div className="mt-3">
              {renderHighlightedValue(description, {
                placeholder,
                className: config.descriptionClass,
              })}
            </div>
          );

          return (
            <div className="space-y-3">
              <div className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">{title}</div>
              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const rarityStyle = getRarityStyle(item.rareza);
                    const rarityColor = item.rareza ? rarityColorMap?.[item.rareza] : null;
                    const rarityBadgeStyle = rarityColor
                      ? {
                        color: rarityColor,
                        borderColor: hexToRgba(rarityColor, 0.55),
                        backgroundColor: hexToRgba(rarityColor, 0.18),
                      }
                      : undefined;

                    const palette = config.palette || {};
                    const effectivePalette = {
                      border: rarityStyle?.border || palette.border,
                      borderHover:
                        rarityStyle?.borderHover ||
                        palette.borderHover ||
                        rarityStyle?.border ||
                        palette.border,
                      shadow: rarityStyle?.shadow || palette.shadow,
                      shadowHover:
                        rarityStyle?.shadowHover ||
                        palette.shadowHover ||
                        rarityStyle?.shadow ||
                        palette.shadow,
                      background: rarityStyle?.background || palette.background,
                    };

                    return (
                      <div
                        key={`${title}-${index}`}
                        className={`${baseCardClass} ${config.cardClass || ''}`}
                        style={{
                          '--card-border-color': effectivePalette.border,
                          '--card-border-hover-color': effectivePalette.borderHover,
                          '--card-shadow': effectivePalette.shadow,
                          '--card-shadow-hover': effectivePalette.shadowHover,
                          '--card-background': effectivePalette.background,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div
                              className={`text-[0.55rem] uppercase tracking-[0.35em] ${config.categoryLabelClass}`}
                            >
                              {renderHighlightedValue(item.category || 'Sin categoría', {
                                className: config.categoryValueClass,
                                placeholder: 'Sin categoría',
                              })}
                            </div>
                            <h4 className="mt-1 text-lg font-semibold uppercase tracking-[0.25em] text-white">
                              {renderHighlightedValue(item.name || 'Sin nombre', {
                                className:
                                  'text-lg font-semibold uppercase tracking-[0.25em] text-white drop-shadow-[0_0_20px_rgba(148,163,184,0.3)]',
                                placeholder: 'Sin nombre',
                              })}
                            </h4>
                          </div>
                          {item.rareza && (
                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em]"
                              style={rarityBadgeStyle}
                            >
                              {renderHighlightedValue(item.rareza, {
                                className: 'font-semibold uppercase tracking-[0.35em]',
                                placeholder: '—',
                              })}
                            </span>
                          )}
                        </div>
                        {config.renderContent({
                          item,
                          renderStatRow,
                          renderTraitsList,
                          renderDescription,
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sin {title.toLowerCase()} definidas.</p>
              )}
            </div>
          );
        };

        return (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              {renderEquipmentSection('weapons', 'Armas', weapons, [
                { key: 'category', label: 'Categoría', placeholder: 'Arma pesada, ligera...' },
                { key: 'damage', label: 'Daño', placeholder: '2d8 + modificador' },
                { key: 'range', label: 'Alcance', placeholder: 'Cuerpo a cuerpo, 6 casillas...' },
                { key: 'consumption', label: 'Consumo', placeholder: '2 = 🟡🟡' },
                { key: 'physicalLoad', label: 'Carga física', placeholder: '1 = 🔲' },
                { key: 'mentalLoad', label: 'Carga mental', placeholder: '0 = 🧠' },
                { key: 'traits', label: 'Rasgos', placeholder: 'Afilada, demoledora...' },
                { key: 'rareza', label: 'Rareza', placeholder: 'Común, Épica...' },
              ])}
              {renderEquipmentSection('armor', 'Armaduras', armor, [
                { key: 'category', label: 'Categoría', placeholder: 'Ligera, media, pesada...' },
                { key: 'defense', label: 'Defensa', placeholder: '+2 defensa, resistencia...' },
                { key: 'physicalLoad', label: 'Carga física', placeholder: '1 = 🔲' },
                { key: 'mentalLoad', label: 'Carga mental', placeholder: '0 = 🧠' },
                { key: 'traits', label: 'Rasgos', placeholder: 'Ventaja en tiradas, resistencia...' },
                { key: 'rareza', label: 'Rareza', placeholder: 'Común, Legendaria...' },
              ])}
              {renderEquipmentSection('abilities', 'Habilidades', abilities, [
                { key: 'category', label: 'Tipo', placeholder: 'Ritual, táctica...' },
                { key: 'damage', label: 'Daño', placeholder: '3d6, 12 radiante...' },
                { key: 'range', label: 'Alcance', placeholder: 'Cercano, 12 m...' },
                { key: 'consumption', label: 'Consumo', placeholder: '1 = 🟡' },
                { key: 'body', label: 'Cuerpo', placeholder: '1 = 🔲' },
                { key: 'mind', label: 'Mente', placeholder: '1 = 🧠' },
                { key: 'trait', label: 'Rasgo', placeholder: 'Palabra clave principal' },
                { key: 'rareza', label: 'Rareza', placeholder: 'Rara, Épica...' },
              ])}
            </div>
            <div className="space-y-5 rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Vista previa recopilada</div>
              {renderPreviewCards('Armas preparadas', weapons, {
                cardClass: 'text-sky-50/90 backdrop-blur-sm',
                palette: {
                  border: 'rgba(56, 189, 248, 0.4)',
                  borderHover: 'rgba(125, 211, 252, 0.65)',
                  shadow: '0 15px 30px -20px rgba(56, 189, 248, 0.55)',
                  shadowHover: '0 22px 50px -20px rgba(56, 189, 248, 0.65)',
                  background:
                    'linear-gradient(160deg, rgba(8, 47, 73, 0.82) 0%, rgba(12, 74, 110, 0.55) 100%)',
                },
                categoryLabelClass: 'text-sky-300/70',
                categoryValueClass:
                  'text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sky-100/80',
                statLabelClass: 'text-sky-200/70',
                statValueClass: 'text-right font-semibold text-sky-50',
                traitClass: 'border-sky-400/40 bg-sky-500/10 text-sky-100/80',
                traitValueClass: 'font-semibold',
                descriptionClass:
                  'block whitespace-pre-line text-[0.75rem] leading-relaxed text-slate-200',
                renderContent: ({ item, renderStatRow, renderTraitsList, renderDescription }) => (
                  <>
                    <div className="mt-3 space-y-2 text-xs text-sky-50/90">
                      {renderStatRow('Daño', item.damage)}
                      {renderStatRow('Alcance', item.range)}
                      {renderStatRow('Consumo', item.consumption, {
                        statType: 'consumption',
                      })}
                    </div>
                    <div className="mt-3 grid gap-2 text-[0.7rem] text-sky-100/80 sm:grid-cols-2">
                      {renderStatRow('Carga física', item.physicalLoad, {
                        statType: 'physical',
                        labelClassName: 'text-sky-200/70',
                        valueClassName: 'font-semibold text-sky-100',
                      })}
                      {renderStatRow('Carga mental', item.mentalLoad, {
                        statType: 'mental',
                        labelClassName: 'text-sky-200/70',
                        valueClassName: 'font-semibold text-sky-100',
                      })}
                    </div>
                    {renderTraitsList(item.traits)}
                    {renderDescription(item.description)}
                  </>
                ),
              })}
              {renderPreviewCards('Defensas listas', armor, {
                cardClass: 'text-emerald-50/90 backdrop-blur-sm',
                palette: {
                  border: 'rgba(16, 185, 129, 0.4)',
                  borderHover: 'rgba(110, 231, 183, 0.65)',
                  shadow: '0 15px 30px -20px rgba(16, 185, 129, 0.55)',
                  shadowHover: '0 22px 50px -20px rgba(16, 185, 129, 0.65)',
                  background:
                    'linear-gradient(160deg, rgba(6, 78, 59, 0.8) 0%, rgba(4, 47, 46, 0.55) 100%)',
                },
                categoryLabelClass: 'text-emerald-300/70',
                categoryValueClass:
                  'text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-emerald-100/80',
                statLabelClass: 'text-emerald-200/70',
                statValueClass: 'text-right font-semibold text-emerald-50',
                traitClass: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100/80',
                traitValueClass: 'font-semibold',
                descriptionClass:
                  'block whitespace-pre-line text-[0.75rem] leading-relaxed text-emerald-100/90',
                renderContent: ({ item, renderStatRow, renderTraitsList, renderDescription }) => (
                  <>
                    <div className="mt-3 space-y-2 text-xs text-emerald-50/90">
                      {renderStatRow('Defensa', item.defense)}
                      {renderStatRow('Carga física', item.physicalLoad, {
                        statType: 'physical',
                        labelClassName: 'text-emerald-200/70',
                        valueClassName: 'font-semibold text-emerald-100',
                      })}
                      {renderStatRow('Carga mental', item.mentalLoad, {
                        statType: 'mental',
                        labelClassName: 'text-emerald-200/70',
                        valueClassName: 'font-semibold text-emerald-100',
                      })}
                    </div>
                    {renderTraitsList(item.traits, 'Sin rasgos defensivos definidos.')}
                    {renderDescription(item.description)}
                  </>
                ),
              })}
              {renderPreviewCards('Habilidades disponibles', abilities, {
                cardClass: 'text-amber-50/90 backdrop-blur-sm',
                palette: {
                  border: 'rgba(245, 158, 11, 0.45)',
                  borderHover: 'rgba(251, 191, 36, 0.7)',
                  shadow: '0 15px 30px -20px rgba(245, 158, 11, 0.55)',
                  shadowHover: '0 22px 50px -20px rgba(245, 158, 11, 0.7)',
                  background:
                    'linear-gradient(160deg, rgba(120, 53, 15, 0.82) 0%, rgba(69, 26, 3, 0.55) 100%)',
                },
                categoryLabelClass: 'text-amber-300/70',
                categoryValueClass:
                  'text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-amber-100/80',
                statLabelClass: 'text-amber-200/70',
                statValueClass: 'text-right font-semibold text-amber-50',
                traitClass: 'border-amber-400/40 bg-amber-500/10 text-amber-100/90',
                traitValueClass: 'font-semibold',
                descriptionClass:
                  'block whitespace-pre-line text-[0.75rem] leading-relaxed text-amber-100/90',
                renderContent: ({ item, renderStatRow, renderTraitsList, renderDescription }) => (
                  <>
                    <div className="mt-3 space-y-2 text-xs text-amber-50/90">
                      {renderStatRow('Daño', item.damage)}
                      {renderStatRow('Alcance', item.range)}
                      {renderStatRow('Consumo', item.consumption, {
                        statType: 'consumption',
                      })}
                      {renderStatRow('Cuerpo', item.body, {
                        statType: 'physical',
                        labelClassName: 'text-amber-200/70',
                        valueClassName: 'font-semibold text-amber-100',
                      })}
                      {renderStatRow('Mente', item.mind, {
                        statType: 'mental',
                        labelClassName: 'text-amber-200/70',
                        valueClassName: 'font-semibold text-amber-100',
                      })}
                    </div>
                    {renderTraitsList(item.trait || item.traits, 'Sin rasgo asignado.')}
                    {renderDescription(item.description)}
                  </>
                ),
              })}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const filteredClasses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = classes.filter((classItem) => {
      if (!query) return true;
      const haystack = [
        classItem.name,
        classItem.subtitle,
        classItem.description,
        classItem.tags.join(' '),
        classItem.focus,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'alphaDesc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'difficulty':
        sorted.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
        break;
      case 'rarity':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'status':
        sorted.sort((a, b) => {
          const statusA = statusConfig[a.status] ? statusConfig[a.status].label : a.status;
          const statusB = statusConfig[b.status] ? statusConfig[b.status].label : b.status;
          return statusA.localeCompare(statusB);
        });
        break;
      case 'alphaAsc':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [classes, searchTerm, sortBy]);

  const handleStartPortraitEdit = (dndClass) => {
    setCropperState({
      classId: dndClass.id,
      imageSrc: dndClass.portraitSource || dndClass.image || dndClass.avatar || '',
      isNewUpload: false,
      activeMode: 'CARD',
      card: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
      avatar: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
    });
    setIsCropping(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Initialize with default refWidth, will be updated by effect or first interaction
      setCropperState((prev) => ({
        ...prev,
        imageSrc: reader.result,
        isNewUpload: true,
        card: { ...prev.card, crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
        avatar: { ...prev.avatar, crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 }
      }));
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  // --- CUSTOM CROPPER HANDLERS ---
  const handleMouseDown = (e) => {
    if (!cropperState.imageSrc) return;
    e.preventDefault();
    setIsDragging(true);
    const currentCrop = cropperState.activeMode === 'CARD' ? cropperState.card.crop : cropperState.avatar.crop;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - currentCrop.x, y: clientY - currentCrop.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentWidth = containerRef.current?.clientWidth || 300;

    setCropperState((prev) => ({
      ...prev,
      [prev.activeMode === 'CARD' ? 'card' : 'avatar']: {
        ...prev[prev.activeMode === 'CARD' ? 'card' : 'avatar'],
        crop: {
          x: clientX - dragStart.x,
          y: clientY - dragStart.y
        },
        refWidth: currentWidth
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (!isCropping || !cropperState.imageSrc) return;

    // Smooth zoom with wheel
    const delta = e.deltaY;
    const zoomStep = 0.05;

    setCropperState(prev => {
      const mode = prev.activeMode === 'CARD' ? 'card' : 'avatar';
      const currentZoom = prev[mode].zoom;
      let newZoom = currentZoom - (delta > 0 ? zoomStep : -zoomStep);
      newZoom = Math.min(Math.max(0.5, newZoom), 3);

      return {
        ...prev,
        [mode]: {
          ...prev[mode],
          zoom: newZoom
        }
      };
    });
  };

  // Effect to capture initial width once modal opens
  useEffect(() => {
    if (isCropping && containerRef.current) {
      const width = containerRef.current.clientWidth;
      setCropperState(prev => ({
        ...prev,
        card: { ...prev.card, refWidth: width },
        avatar: { ...prev.avatar, refWidth: width }
      }));
    }
  }, [isCropping]);


  const generateCustomImage = async (mode) => {
    if (!cropperState.imageSrc || !imageRef.current) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = mode === 'CARD' ? 600 : 256;
    const height = mode === 'CARD' ? 900 : 256;
    const cropState = mode === 'CARD' ? cropperState.card : cropperState.avatar;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    const img = imageRef.current;

    // Calculate Scale Ratio
    // IMPORTANT: Use the stored refWidth to ensure consistency even if container resized
    const domWidth = cropState.refWidth || 300;
    const visualToCanvasRatio = width / domWidth;

    ctx.translate(width / 2, height / 2);
    ctx.translate(cropState.crop.x * visualToCanvasRatio, cropState.crop.y * visualToCanvasRatio);
    ctx.scale(cropState.zoom, cropState.zoom);

    // Draw Logic
    const imgAspectRatio = img.naturalHeight / img.naturalWidth;
    const drawWidth = width;
    const drawHeight = width * imgAspectRatio;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setCropperState({
      classId: null,
      imageSrc: '',
      activeMode: 'CARD',
      card: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
      avatar: { crop: { x: 0, y: 0 }, zoom: 1, refWidth: 300 },
    });
  };

  const handleCropSave = async () => {
    if (!cropperState.classId) return;

    const classId = cropperState.classId;
    const updates = {};
    let hasUpdates = false;

    try {
      setSaveStatus(null);

      const storagePrefix = collectionPath === 'classes' ? 'class' : 'character';

      // 0. If it's a new upload, save the RAW source first
      if (cropperState.isNewUpload && cropperState.imageSrc.startsWith('data:')) {
        const sourcePath = `${storagePrefix}-sources/${classId}`;
        const sourceRef = ref(storage, sourcePath);
        await uploadString(sourceRef, cropperState.imageSrc, 'data_url');
        const sourceUrl = await getDownloadURL(sourceRef);
        updates.portraitSource = sourceUrl;
        hasUpdates = true;
      }

      // 1. Process Main Card Image
      const cardDataUrl = await generateCustomImage('CARD');
      if (cardDataUrl) {
        const filePath = `${storagePrefix}-images/${classId}`;
        const storageRef = ref(storage, filePath);
        await uploadString(storageRef, cardDataUrl, 'data_url');
        const url = await getDownloadURL(storageRef);
        updates.image = normalizeImageValue(url);
        hasUpdates = true;
      }

      // 2. Process Avatar Image
      const avatarDataUrl = await generateCustomImage('AVATAR');
      if (avatarDataUrl) {
        const filePath = `${storagePrefix}-avatars/${classId}`;
        const storageRef = ref(storage, filePath);
        await uploadString(storageRef, avatarDataUrl, 'data_url');
        const url = await getDownloadURL(storageRef);
        updates.avatar = normalizeImageValue(url);
        hasUpdates = true;
      }

      if (hasUpdates) {
        await setDoc(doc(db, collectionPath, classId), updates, { merge: true });

        setClasses((prev) => prev.map((c) => c.id === classId ? { ...c, ...updates } : c));

        if (selectedClass?.id === classId) {
          setSelectedClass((prev) => ({ ...prev, ...updates }));
        }
        if (editingClass?.id === classId) {
          setEditingClass((prev) => ({ ...prev, ...updates }));
        }

        setSaveStatus({
          type: 'success',
          message: 'Imágenes actualizadas correctamente.',
        });
      }

      handleCropCancel();
    } catch (error) {
      console.error('Error al guardar imágenes recortadas', error);
      setSaveStatus({
        type: 'error',
        message: 'No se pudieron guardar las imágenes.',
      });
    }
  };

  const renderClassDetailContent = () => {
    if (!selectedClass || !editingClass) {
      return null;
    }

    // Mapping editingClass to the structure expected by the new design
    const dndClass = {
      name: editingClass.name,
      image: editingClass.image || '',
      avatar: editingClass.avatar || '',
      portraitSource: editingClass.portraitSource || '',
      hitDie: editingClass.hitDie || 'd8',
      subtitle: editingClass.subtitle || 'Clase de Héroe',
      difficulty: editingClass.difficulty || 'Media',
      role: editingClass.role || (editingClass.tags && editingClass.tags[0]) || 'Aventurero',
      description: editingClass.description || 'Sin descripción disponible.',
      primaryAbility: editingClass.primaryAbility || editingClass.focus || 'Principal',
      saves: editingClass.saves || ['Fortaleza', 'Voluntad'],
      rating: editingClass.rating || 0,
      id: editingClass.id,
      currentLevel: editingClass.level || 1,
      features: editingClass.features || (editingClass.classLevels ? editingClass.classLevels.map((l, i) => ({
        level: i + 1,
        name: l.title,
        description: l.description
      })) : []),
      actionData: editingClass.actionData,
      equipment: editingClass.equipment || [],
      talents: editingClass.talents || {},
      summary: editingClass.summary || {},
      equippedItems: editingClass.equippedItems || { mainHand: null, offHand: null, body: null },
      storeItems: editingClass.storeItems || [],
      money: editingClass.money !== undefined ? editingClass.money : 4697,
      stats: editingClass.stats || {},
      attributes: editingClass.attributes || {},
      inspiration: editingClass.inspiration || [],
      rules: editingClass.rules || []
    };

    const renderActiveView = () => {
      switch (activeDetailTab) {
        case 'overview':
          return (
            <div className="relative w-full h-full min-h-screen overflow-y-auto custom-scrollbar bg-[#09090b]">
              {/* Dynamic Background based on class - FIXED to cover entire scroll */}
              <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Capa 1: Oscurecimiento base */}
                <div className="absolute inset-0 bg-[#0b1120]/80 z-10"></div>

                {/* Capa 2: Imagen del campeón desenfocada */}
                {dndClass.image && (
                  <img src={dndClass.image} className="w-full h-full object-cover opacity-40 blur-sm" alt="" />
                )}

                {/* Capa 3: Gradiente lateral para que el texto se lea mejor */}
                <div className="absolute inset-0 bg-gradient-to-l from-[#0b1120] via-transparent to-[#0b1120] z-10"></div>

                {/* Capa 4: Textura de polvo de estrellas (Stardust) */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-10"></div>
              </div>

              <div className="relative z-20 flex flex-col lg:flex-row min-h-full items-center justify-start lg:justify-center p-4 pt-16 md:p-8 lg:p-16 gap-6 md:gap-12 lg:gap-24 pb-20 md:pb-8">
                {/* Left: Character Card Presentation / Portrait Editor */}
                <div className="relative w-full max-w-[280px] md:max-w-sm lg:max-w-md shrink-0 flex flex-col gap-0">
                  <div className={`relative group w-full perspective-1000 ${!isCropping ? 'aspect-[2/3]' : ''}`}>
                    <div className="relative w-full h-full transition-transform duration-700">

                      {isCropping ? (
                        <div className="space-y-6 h-full flex flex-col">
                          {/* MODE TABS */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCropperState(prev => ({ ...prev, activeMode: 'CARD' }))}
                              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded border transition-colors ${cropperState.activeMode === 'CARD' ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-[#0b1120] text-slate-500 border-slate-800 hover:border-slate-600'}`}
                            >
                              <LayoutTemplate className="w-3 h-3" /> Portada
                            </button>
                            <button
                              onClick={() => setCropperState(prev => ({ ...prev, activeMode: 'AVATAR' }))}
                              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded border transition-colors ${cropperState.activeMode === 'AVATAR' ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-[#0b1120] text-slate-500 border-slate-800 hover:border-slate-600'}`}
                            >
                              <CircleUser className="w-3 h-3" /> Avatar
                            </button>
                          </div>

                          {/* EDITOR CONTAINER */}
                          <div
                            className={`relative w-full bg-[#0b1120] rounded-sm border border-slate-800 overflow-hidden shadow-2xl group ring-1 ring-slate-700 transition-all duration-300 ${cropperState.activeMode === 'CARD' ? 'aspect-[2/3]' : 'aspect-square max-w-[300px] mx-auto flex-1'}`}
                            style={{ zIndex: 30 }}
                          >
                            {cropperState.imageSrc ? (
                              <div
                                ref={containerRef}
                                className={`w-full h-full relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleMouseDown}
                                onTouchMove={handleMouseMove}
                                onTouchEnd={handleMouseUp}
                                onWheel={handleWheel}
                              >
                                <img
                                  ref={imageRef}
                                  src={cropperState.imageSrc}
                                  alt="Preview"
                                  draggable={false}
                                  crossOrigin="anonymous"
                                  className="absolute max-w-none origin-center pointer-events-none select-none transition-transform duration-75 ease-out"
                                  style={{
                                    left: '50%',
                                    top: '50%',
                                    width: '100%',
                                    height: 'auto',
                                    transform: `translate(-50%, -50%) translate(${cropperState.activeMode === 'CARD' ? cropperState.card.crop.x : cropperState.avatar.crop.x}px, ${cropperState.activeMode === 'CARD' ? cropperState.card.crop.y : cropperState.avatar.crop.y}px) scale(${cropperState.activeMode === 'CARD' ? cropperState.card.zoom : cropperState.avatar.zoom})`,
                                  }}
                                />

                                {/* OVERLAY GUIDES */}
                                {showGuides && cropperState.activeMode === 'CARD' && (
                                  <>
                                    <div className="absolute inset-0 border-[4px] border-[#c8aa6e] z-20 pointer-events-none opacity-80"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent z-20 pointer-events-none flex items-end justify-center pb-6">
                                      <div className="text-[#c8aa6e]/30 text-[8px] uppercase font-bold tracking-widest border border-[#c8aa6e]/20 px-2 py-1 rounded">Zona Texto</div>
                                    </div>
                                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
                                      <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                      <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                      <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                                    </div>
                                  </>
                                )}

                                {showGuides && cropperState.activeMode === 'AVATAR' && (
                                  <>
                                    <div className="absolute inset-0 z-20 pointer-events-none border-[2px] border-[#c8aa6e]/50 rounded-full"></div>
                                    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                      <defs>
                                        <mask id="circleMaskDetail">
                                          <rect width="100" height="100" fill="white" />
                                          <circle cx="50" cy="50" r="48" fill="black" />
                                        </mask>
                                      </defs>
                                      <rect width="100" height="100" fill="rgba(0,0,0,0.7)" mask="url(#circleMaskDetail)" />
                                    </svg>
                                  </>
                                )}

                                {/* Toolbar Controls */}
                                <div className="absolute top-2 right-2 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setShowGuides(!showGuides)}
                                    className={`p-1.5 backdrop-blur rounded-full border transition-colors ${showGuides ? 'bg-[#c8aa6e]/20 border-[#c8aa6e] text-[#c8aa6e]' : 'bg-black/60 border-white/10 text-slate-400'}`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 bg-black/60 backdrop-blur rounded-full text-slate-300 hover:text-white border border-white/10 hover:border-[#c8aa6e]"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCropperState(prev => ({
                                      ...prev,
                                      [prev.activeMode === 'CARD' ? 'card' : 'avatar']: {
                                        ...prev[prev.activeMode === 'CARD' ? 'card' : 'avatar'],
                                        crop: { x: 0, y: 0 },
                                        zoom: 1
                                      }
                                    }))}
                                    className="p-1.5 bg-black/60 backdrop-blur rounded-full text-slate-300 hover:text-white border border-white/10 hover:border-[#c8aa6e]"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* ZOOM & ACTIONS */}
                          <div className="bg-[#161f32]/50 p-4 rounded border border-slate-700 space-y-4 shadow-xl shrink-0">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#c8aa6e]">
                                <div className="flex items-center gap-2"><Move className="w-3 h-3" /> Zoom</div>
                                <div>{((cropperState.activeMode === 'CARD' ? cropperState.card.zoom : cropperState.avatar.zoom) * 100).toFixed(0)}%</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ZoomOut className="w-4 h-4 text-slate-500 cursor-pointer" onClick={() => setCropperState(prev => ({
                                  ...prev,
                                  [prev.activeMode === 'CARD' ? 'card' : 'avatar']: {
                                    ...prev[prev.activeMode === 'CARD' ? 'card' : 'avatar'],
                                    zoom: Math.max(0.5, (prev.activeMode === 'CARD' ? prev.card.zoom : prev.avatar.zoom) - 0.1)
                                  }
                                }))} />
                                <input
                                  type="range"
                                  min="0.5"
                                  max="3"
                                  step="0.05"
                                  value={cropperState.activeMode === 'CARD' ? cropperState.card.zoom : cropperState.avatar.zoom}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    setCropperState(prev => ({
                                      ...prev,
                                      [prev.activeMode === 'CARD' ? 'card' : 'avatar']: {
                                        ...prev[prev.activeMode === 'CARD' ? 'card' : 'avatar'],
                                        zoom: value
                                      }
                                    }));
                                  }}
                                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                />
                                <ZoomIn className="w-4 h-4 text-slate-500 cursor-pointer" onClick={() => setCropperState(prev => ({
                                  ...prev,
                                  [prev.activeMode === 'CARD' ? 'card' : 'avatar']: {
                                    ...prev[prev.activeMode === 'CARD' ? 'card' : 'avatar'],
                                    zoom: Math.min(3, (prev.activeMode === 'CARD' ? prev.card.zoom : prev.avatar.zoom) + 0.1)
                                  }
                                }))} />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                              <button
                                onClick={handleCropCancel}
                                className="flex-1 py-1.5 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 hover:text-slate-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleCropSave}
                                className="flex-1 py-1.5 bg-[#c8aa6e] text-[#0b1120] text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#c8aa6e]/20 transition-all"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Static Card Flow */}
                          <div className="absolute -inset-6 bg-[#c8aa6e] rounded-full opacity-20 blur-[50px] group-hover:opacity-30 transition-opacity"></div>
                          <div className="absolute inset-0 z-10 rounded-xl overflow-hidden border-[3px] border-[#785a28] bg-[#1a1b26] shadow-2xl transition-transform duration-700 transform group-hover:scale-[1.02] group-hover:rotate-y-12">
                            {dndClass.image ? (
                              <img src={dndClass.image} alt={dndClass.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#1a1b26] text-slate-700">
                                <FiImage className="h-24 w-24 opacity-20" />
                              </div>
                            )}

                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/90 to-transparent p-6 pt-16">
                              <EditableText
                                value={dndClass.name}
                                onChange={(val) => handleUpdateClassField('name', val)}
                                className="text-3xl font-['Cinzel'] text-center text-[#f0e6d2] drop-shadow-lg mb-1 block"
                              />
                              <div className="h-[1px] w-1/2 mx-auto bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent mb-3"></div>
                              <EditableText
                                value={dndClass.subtitle}
                                onChange={(val) => handleUpdateClassField('subtitle', val)}
                                className="text-[#c8aa6e] text-center text-xs font-bold tracking-[0.2em] uppercase block"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {['Yerma', 'Taiga', 'Tundra'].includes(dndClass.name) && !isCropping && (
                    <div className="flex justify-center gap-6 mt-4">
                      {[
                        { name: 'Yerma', src: '/yerma/Yerma.png' },
                        { name: 'Taiga', src: '/yerma/Taiga.png' },
                        { name: 'Tundra', src: '/yerma/Tundra.png' }
                      ].map((item) => (
                        <div key={item.name} className="relative group w-14 h-14 cursor-pointer">
                          {/* Glow Effect */}
                          <div className="absolute -inset-2 bg-[#c8aa6e] rounded-full opacity-0 blur-md group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"></div>

                          {/* Button */}
                          <button
                            onClick={() => updateEditingClass(draft => {
                              draft.image = item.src;
                              draft.avatar = item.src;
                              draft.name = item.name;
                            })}
                            className="relative w-full h-full rounded-full border-2 border-slate-600 group-hover:border-[#c8aa6e] overflow-hidden shadow-xl
                                     transition-all duration-700 transform group-hover:scale-110 will-change-transform"
                            title={item.name}
                          >
                            <img src={item.src} alt={item.name} className="w-full h-full object-cover" />
                            {/* Inner Shine */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Right: Data & Stats */}
                <div className="flex-1 w-full max-w-5xl flex flex-col gap-8">

                  {/* Header / Title Section */}
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                      {/* DIFICULTAD */}
                      {!isPlayerMode && (
                        <EditableField
                          value={`${editingClass.difficulty}`}
                          onChange={(val) => updateEditingClass(d => { d.difficulty = val })}
                          showEditIcon={false}
                          displayClassName="w-auto"
                          textClassName="px-3 py-1 bg-[#c8aa6e]/10 border border-[#c8aa6e]/50 text-[#c8aa6e] text-[10px] font-bold uppercase tracking-[0.2em] block"
                          inputClassName="bg-[#0b1120] text-[#c8aa6e] text-[10px] font-bold uppercase border border-[#c8aa6e]/50 px-2 py-0.5 rounded w-24"
                          placeholder="Dificultad"
                        />
                      )}

                      {/* ROL */}
                      {!isPlayerMode && (
                        <EditableField
                          value={editingClass.role || 'N/A'}
                          onChange={(val) => updateEditingClass(d => { d.role = val })}
                          showEditIcon={false}
                          displayClassName="w-auto"
                          textClassName="px-3 py-1 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] block"
                          inputClassName="bg-[#0b1120] text-cyan-400 text-[10px] font-bold uppercase border border-cyan-500/50 px-2 py-0.5 rounded w-24"
                          placeholder="Rol"
                        />
                      )}

                      {/* ETIQUETAS DINÁMICAS */}
                      {(editingClass.tags || []).map((tag, index) => {
                        const isMinigame = tag.toLowerCase().trim() === 'minijuego';

                        if (isMinigame) {
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  if (onLaunchMinigame) {
                                    onLaunchMinigame(editingClass.name);
                                  }
                                }}
                                className="px-3 py-1 bg-amber-900/40 border border-amber-500/50 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-amber-800/60 transition-colors group/mini relative"
                                title="Abrir Minijuego de Cerrajería"
                              >
                                <FiLock className="w-3 h-3" />
                                MINIJUEGO
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                  title="Eliminar Etiqueta"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        const isCalculator = tag.toLowerCase().trim() === 'calculadora';

                        if (isCalculator) {
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  if (onLaunchDiceCalculator) {
                                    onLaunchDiceCalculator(editingClass.name);
                                  }
                                }}
                                className="px-3 py-1 bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-cyan-800/60 transition-colors group/mini relative"
                                title="Abrir Calculadora de Dados"
                              >
                                <Dices className="w-3 h-3" />
                                CALCULADORA
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                  title="Eliminar Etiqueta"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        const isSpeedSystem = tag.toLowerCase().trim() === 'velocidad';

                        if (isSpeedSystem) {
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  if (onLaunchSpeedSystem) {
                                    onLaunchSpeedSystem(editingClass.name);
                                  }
                                }}
                                className="px-3 py-1 bg-amber-900/40 border border-amber-500/50 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-amber-800/60 transition-colors group/mini relative"
                                title="Abrir Sistema de Velocidad"
                              >
                                <Zap className="w-3 h-3" />
                                VELOCIDAD
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                  title="Eliminar Etiqueta"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        const isMinimap = tag.toLowerCase().trim() === 'minimapa';

                        if (isMinimap) {
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  if (onLaunchMinimap) {
                                    onLaunchMinimap(editingClass.name);
                                  }
                                }}
                                className="px-3 py-1 bg-indigo-900/40 border border-indigo-500/50 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-indigo-800/60 transition-colors group/mini relative"
                                title="Abrir Biblioteca de Cuadrantes"
                              >
                                <Map className="w-3 h-3" />
                                MINIMAPA
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                  title="Eliminar Etiqueta"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        const isCanvas = tag.toLowerCase().trim() === 'canvas';

                        if (isCanvas) {
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  if (onLaunchCanvas) {
                                    onLaunchCanvas(editingClass.name);
                                  }
                                }}
                                className="px-3 py-1 bg-rose-900/40 border border-rose-500/50 text-rose-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-rose-800/60 transition-colors group/mini relative"
                                title="Abrir Mapa de Batalla"
                              >
                                <FiMap className="w-3 h-3" />
                                CANVAS
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                  title="Eliminar Etiqueta"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        // Check for Status Effects (Robust lookup by ID or Label)
                        const statusConfig = statusEffectsConfig[tag.toLowerCase()] ||
                          Object.values(statusEffectsConfig).find(c => c.label.toLowerCase() === tag.toLowerCase());

                        if (statusConfig) {
                          const StatusIcon = ICON_MAP[statusConfig.iconName] || ICON_MAP.AlertCircle;

                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setViewingStatusEffect({
                                    ...statusConfig,
                                    label: statusConfig.label,
                                    desc: statusConfig.desc
                                  });
                                }}
                                className={`px-3 py-1 ${statusConfig.bg} border ${statusConfig.border} ${statusConfig.color} text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:brightness-110 transition-all group/mini relative`}
                                style={{
                                  borderColor: extractHex(statusConfig) + '80',
                                  background: extractHex(statusConfig) + '1a',
                                  color: extractHex(statusConfig)
                                }}
                                title={`${statusConfig.label}: ${statusConfig.desc}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditingClass(d => {
                                      d.tags.splice(index, 1);
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] opacity-0 group-hover/mini:opacity-100 transition-opacity hover:bg-red-600 shadow-lg cursor-pointer"
                                  title="Eliminar Estado"
                                >
                                  <FiX />
                                </div>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <EditableField
                            key={index}
                            value={tag}
                            onChange={(val) => updateEditingClass(d => { d.tags[index] = val })}
                            onCommit={() => {
                              updateEditingClass(d => {
                                d.tags = (d.tags || []).filter(t => t.trim() !== '');
                              });
                            }}
                            showEditIcon={false}
                            displayClassName="w-auto"
                            textClassName="px-3 py-1 bg-slate-800/40 border border-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] block"
                            inputClassName="bg-[#0b1120] text-slate-400 text-[10px] font-bold uppercase border border-slate-700 px-2 py-0.5 rounded w-28"
                            placeholder="Etiqueta"
                          />
                        );
                      })}

                      {/* BOTÓN AÑADIR ETIQUETA */}
                      <button
                        onClick={() => updateEditingClass(d => {
                          if (!d.tags) d.tags = [];
                          d.tags.push('ETIQUETA');
                        })}
                        className="p-1 text-[#c8aa6e] hover:text-[#f0e6d2] transition-colors"
                        title="Añadir Etiqueta"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>

                      {/* UNLOCK/LOCK TOGGLE or STATUS MENU */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (isPlayerMode) {
                              setShowStatusSelector(!showStatusSelector);
                            } else {
                              const newStatus = editingClass.status === 'locked' ? 'available' : 'locked';
                              updateEditingClass((draft) => {
                                draft.status = newStatus;
                              });
                            }
                          }}
                          className={`w-10 h-[26px] border rounded flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isPlayerMode
                            ? showStatusSelector ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0b1120]' : 'bg-[#c8aa6e]/10 border-[#c8aa6e]/30 text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:border-[#c8aa6e]'
                            : editingClass.status !== 'locked'
                              ? 'bg-green-900/10 border-green-500/30 text-green-500 hover:bg-green-900/30 hover:border-green-500'
                              : 'bg-red-900/10 border-red-500/30 text-red-500 hover:bg-red-900/30 hover:border-red-500'
                            }`}
                          title={isPlayerMode ? "Gestionar Estados" : (editingClass.status !== 'locked' ? "Bloquear Clase" : "Desbloquear Clase")}
                        >
                          {isPlayerMode ? (
                            <Star className="w-3.5 h-3.5" />
                          ) : (
                            editingClass.status !== 'locked' ? <FiUnlock className="w-3.5 h-3.5" /> : <FiLock className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Status Selector Popover */}
                        <AnimatePresence>
                          {showStatusSelector && isPlayerMode && (
                            <>
                              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setShowStatusSelector(false)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:absolute md:inset-auto md:top-10 md:left-0 md:translate-y-0 w-auto md:w-80 rounded-xl border border-[#c8aa6e]/30 bg-[#0b1120] p-4 shadow-2xl ring-1 ring-[#c8aa6e]/20 max-h-[80vh] flex flex-col"
                              >
                                <div className="mb-3 flex items-center justify-between border-b border-[#c8aa6e]/20 pb-2">
                                  <span className="text-xs font-bold uppercase tracking-widest text-[#c8aa6e]">
                                    Estados Alterados
                                  </span>
                                  <button
                                    onClick={() => setShowStatusSelector(false)}
                                    className="text-slate-500 hover:text-white"
                                  >
                                    <FiX className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                  {Object.entries(statusEffectsConfig).map(([key, config]) => {
                                    const isSelected = (editingClass.tags || []).some(t => t.toLowerCase() === key);
                                    const StatusIcon = ICON_MAP[config.iconName] || ICON_MAP.AlertCircle;

                                    return (
                                      <button
                                        key={key}
                                        onClick={() => {
                                          updateEditingClass(draft => {
                                            const tags = draft.tags || [];
                                            const tagIndex = tags.findIndex(t => {
                                              const tLow = t.toLowerCase();
                                              return tLow === key || tLow === config.label.toLowerCase();
                                            });

                                            if (tagIndex >= 0) {
                                              draft.tags.splice(tagIndex, 1);
                                            } else {
                                              if (!draft.tags) draft.tags = [];
                                              // We push the key for better internal consistency, 
                                              // but the lookup now handles both.
                                              draft.tags.push(key);
                                            }
                                          });
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-all ${isSelected
                                          ? `${config.bg} ${config.border} ${config.color}`
                                          : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                                          }`}
                                        style={isSelected ? {
                                          borderColor: extractHex(config) + '80',
                                          background: extractHex(config) + '1a',
                                          color: extractHex(config)
                                        } : {}}
                                        title={config.label}
                                      >
                                        <StatusIcon className="h-5 w-5" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-center">{config.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        {/* Status Effect Info Modal */}
                        <AnimatePresence>
                          {viewingStatusEffect && (
                            <>
                              <div
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                                onClick={() => setViewingStatusEffect(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
                                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                                exit={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
                                className="fixed top-1/2 left-1/2 z-[70] w-[90%] max-w-sm md:max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#c8aa6e]/30 bg-[#0b1120] p-6 shadow-2xl ring-1 ring-[#c8aa6e]/20 max-h-[85vh] overflow-y-auto custom-scrollbar"
                              >
                                <div className="flex flex-col items-center text-center gap-4">
                                  <div
                                    className={`p-4 rounded-full border-2 ${viewingStatusEffect.bg} ${viewingStatusEffect.border}`}
                                    style={{
                                      borderColor: extractHex(viewingStatusEffect) + '80',
                                      background: extractHex(viewingStatusEffect) + '1a'
                                    }}
                                  >
                                    {(() => {
                                      const StatusIcon = ICON_MAP[viewingStatusEffect.iconName] || ICON_MAP.AlertCircle;
                                      return <StatusIcon
                                        className={`w-8 h-8 ${viewingStatusEffect.color}`}
                                        style={{ color: extractHex(viewingStatusEffect) }}
                                      />;
                                    })()}
                                  </div>

                                  <div>
                                    <h3
                                      className={`text-xl font-['Cinzel'] font-bold uppercase tracking-widest ${viewingStatusEffect.color}`}
                                      style={{ color: extractHex(viewingStatusEffect) }}
                                    >
                                      {viewingStatusEffect.label}
                                    </h3>
                                    <div className="h-[1px] w-24 bg-[#c8aa6e]/30 mx-auto my-3" />
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                      {viewingStatusEffect.desc}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => setViewingStatusEffect(null)}
                                    className="mt-2 px-6 py-2 rounded-full border border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/10 text-slate-400 hover:text-[#c8aa6e] text-xs font-bold uppercase tracking-widest transition-all"
                                  >
                                    Cerrar
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <h1 className="text-5xl lg:text-6xl font-['Cinzel'] text-transparent bg-clip-text bg-gradient-to-b from-[#f0e6d2] to-[#c8aa6e] drop-shadow-sm mb-6">
                      {editingClass.name}
                    </h1>

                    <div className="relative pl-6 lg:pl-6 border-l-2 lg:border-l-2 border-[#c8aa6e]/30 mx-auto lg:mx-0 w-full text-left">
                      <div className="text-lg text-slate-300 leading-relaxed font-serif italic">
                        "<EditableText
                          value={editingClass.description}
                          onChange={(val) =>
                            updateEditingClass((draft) => {
                              draft.description = val;
                            })
                          }
                          className="inline text-slate-300"
                          multiline={true}
                        />"
                      </div>
                      <div className="absolute top-0 -left-[5px] w-[8px] h-[8px] bg-[#c8aa6e] rotate-45"></div>
                      <div className="absolute bottom-0 -left-[5px] w-[8px] h-[8px] bg-[#c8aa6e] rotate-45"></div>
                    </div>
                  </div>

                  {/* Content Grid: Attributes (Left) & Stats (Right) */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">

                    {/* Left Column: Attributes & Actions */}
                    <div className="flex flex-col gap-8">
                      <div>
                        <div className="mb-6 border-b border-[#c8aa6e]/30 pb-2">
                          <h4 className="text-[#c8aa6e] font-['Cinzel'] text-lg tracking-widest flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-[#c8aa6e]"></span>
                            {isPlayerMode ? 'ATRIBUTOS' : 'ATRIBUTOS DE CLASE'}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'destreza', label: 'Destreza', icon: '🎯' },
                            { key: 'vigor', label: 'Vigor', icon: '💪' },
                            { key: 'intelecto', label: 'Intelecto', icon: '🧠' },
                            { key: 'voluntad', label: 'Voluntad', icon: '✨' }
                          ].map((attr) => {
                            const diceValue = editingClass.attributes?.[attr.key] || 'd4';

                            return (
                              <div key={attr.key} className="bg-[#161f32]/80 p-4 rounded-xl border border-[#c8aa6e]/20 hover:border-[#c8aa6e]/50 transition-colors group flex flex-col items-center w-full">
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">{attr.label}</div>
                                <DiceSelector
                                  value={diceValue}
                                  onChange={(newValue) => {
                                    updateEditingClass((draft) => {
                                      if (!draft.attributes) draft.attributes = {};
                                      draft.attributes[attr.key] = newValue;
                                    });
                                  }}
                                />
                                <div className="text-center text-sm text-[#c8aa6e] font-bold mt-3 tracking-widest">{diceValue.toUpperCase()}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {isYuuzuName(dndClass.name) && (
                        <div className="mt-3 mb-2 rounded-xl border border-[#c8aa6e]/20 bg-[#161f32]/80 p-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8aa6e]/5 to-transparent opacity-50 pointer-events-none" />

                          <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-[60px]">
                              <span className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                                Karma
                              </span>
                              <span className={`font-mono text-xs font-bold ${editingClass.stats?.karma?.actual > 0 ? 'text-white' : editingClass.stats?.karma?.actual < 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                                {editingClass.stats?.karma?.actual > 0 ? '+' : ''}{editingClass.stats?.karma?.actual || 0}
                              </span>
                            </div>

                            <div className="flex flex-1 items-center gap-3">
                              <button
                                onClick={() => updateEditingClass(draft => {
                                  if (!draft.stats) draft.stats = {};
                                  if (!draft.stats.karma) draft.stats.karma = { actual: 0 };
                                  const current = draft.stats.karma.actual || 0;
                                  if (current > KARMA_MIN) draft.stats.karma.actual = current - 1;
                                })}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-[#c8aa6e]/50 hover:bg-slate-700 hover:text-rose-400"
                              >
                                <FiMinus className="h-3 w-3" />
                              </button>

                              <div className="flex-1">
                                <KarmaBar value={editingClass.stats?.karma?.actual || 0} />
                              </div>

                              <button
                                onClick={() => updateEditingClass(draft => {
                                  if (!draft.stats) draft.stats = {};
                                  if (!draft.stats.karma) draft.stats.karma = { actual: 0 };
                                  const current = draft.stats.karma.actual || 0;
                                  if (current < KARMA_MAX) draft.stats.karma.actual = current + 1;
                                })}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-[#c8aa6e]/50 hover:bg-slate-700 hover:text-emerald-400"
                              >
                                <FiPlus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto space-y-4">
                        <button
                          onClick={() => {
                            if (onLaunchCanvas) {
                              onLaunchCanvas(editingClass.name, {
                                name: editingClass.name,
                                avatar: editingClass.avatar || editingClass.portraitSource || editingClass.image || '',
                                attributes: editingClass.attributes || {},
                                stats: editingClass.stats || {},
                                tags: editingClass.tags || [],
                              });
                            }
                          }}
                          className="w-full group relative px-10 py-4 bg-gradient-to-b from-[#c8aa6e] to-[#b45309] hover:to-[#d97706] text-[#0b1120] font-['Cinzel'] font-bold text-xl uppercase tracking-[0.15em] transition-all transform hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(200,170,110,0.4)] clip-slant-right"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            Jugar Aventura
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </span>
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out z-0" />
                        </button>

                        <button
                          onClick={() => handleStartPortraitEdit(dndClass)}
                          className={`w-full px-6 py-4 border font-['Cinzel'] font-bold uppercase tracking-widest transition-all ${isCropping ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'border-[#c8aa6e]/30 text-[#c8aa6e] hover:bg-[#c8aa6e]/10'}`}
                        >
                          {isCropping ? 'Editando Retrato...' : 'Editar Retrato'}
                        </button>
                      </div>
                    </div >

                    {/* Right Column: Stats */}
                    < div >

                      {/* STATS SECTION */}
                      < div >
                        <div className="flex items-center justify-between mb-6 border-b border-[#c8aa6e]/30 pb-2">
                          <h4 className="text-[#c8aa6e] font-['Cinzel'] text-lg tracking-widest flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-[#c8aa6e]"></span>
                            ESTADÍSTICAS
                          </h4>
                          <button
                            onClick={() => {
                              // Toggle edit mode for stats
                              const currentMode = editingClass.isEditingStats || false;
                              updateEditingClass((draft) => {
                                draft.isEditingStats = !currentMode;
                              });
                            }}
                            className={`p-1.5 rounded transition-colors ${editingClass.isEditingStats
                              ? 'text-[#c8aa6e] bg-[#c8aa6e]/10'
                              : 'text-slate-600 hover:text-[#c8aa6e]'
                              }`}
                            title="Editar Estadísticas (Master)"
                          >
                            {editingClass.isEditingStats ? <FiCheckSquare className="w-4 h-4" /> : <FiEdit2 className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Vertical Stack Layout */}
                        <div className="flex flex-col gap-5 px-1">
                          {/* POSTURA */}
                          <div className="flex flex-col w-full">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-[#f0e6d2] font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8aa6e] rotate-45"></span>
                                POSTURA
                              </span>
                              {editingClass.isEditingStats ? (
                                <div className="flex items-center gap-3 bg-[#0b1120] border border-[#c8aa6e]/30 rounded px-3 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.postura) draft.stats.postura = { current: 3, max: 4 };
                                          const newCurrent = Math.max(0, (draft.stats.postura.current ?? 3) - 1);
                                          draft.stats.postura.current = Math.min(newCurrent, draft.stats.postura.max ?? 4);
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-[#c8aa6e]">{editingClass.stats?.postura?.current ?? 3}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.postura) draft.stats.postura = { current: 3, max: 4 };
                                          const newCurrent = Math.min((draft.stats.postura.max ?? 4), (draft.stats.postura.current ?? 3) + 1);
                                          draft.stats.postura.current = newCurrent;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="w-[1px] h-3 bg-slate-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.postura) draft.stats.postura = { current: 3, max: 4 };
                                          const newMax = Math.max(0, (draft.stats.postura.max ?? 4) - 1);
                                          draft.stats.postura.max = Math.min(10, newMax);
                                          if (draft.stats.postura.current > newMax) draft.stats.postura.current = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-slate-400">{editingClass.stats?.postura?.max ?? 4}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.postura) draft.stats.postura = { current: 3, max: 4 };
                                          const newMax = Math.min(10, (draft.stats.postura.max ?? 4) + 1);
                                          draft.stats.postura.max = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#c8aa6e] font-bold font-mono text-sm opacity-80">
                                  {Math.max(0, Math.min(editingClass.stats?.postura?.current ?? 3, (editingClass.stats?.postura?.max ?? 4) - excessLoad))} <span className="text-slate-600">/</span> {editingClass.stats?.postura?.max ?? 4}
                                </span>
                              )}
                            </div>

                            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                              {Array.from({ length: editingClass.stats?.postura?.max ?? 4 }).map((_, i) => {
                                const maxPostura = editingClass.stats?.postura?.max ?? 4;
                                const isBlocked = i >= (maxPostura - excessLoad);
                                const isActive = i < (editingClass.stats?.postura?.current ?? 3);

                                return (
                                  <div
                                    key={i}
                                    className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] 
                                      ${isBlocked
                                        ? 'bg-red-600/60 border-red-900 shadow-[inset_0_0_8px_rgba(255,0,0,0.4)]'
                                        : isActive
                                          ? 'bg-[#a3c9a8] border-green-900'
                                          : 'bg-[#a3c9a8]/20 border-green-900/30'
                                      }`}
                                    style={{
                                      clipPath: i === 0
                                        ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                        : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                      marginLeft: i === 0 ? '0' : '-6px',
                                      zIndex: (editingClass.stats?.postura?.max ?? 4) - i,
                                      filter: isBlocked ? 'drop-shadow(2px 0 0 rgba(150,0,0,0.8))' : 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                                    {/* isBlocked X removed */}
                                  </div>
                                )
                              })}
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-slate-800 to-transparent mt-3"></div>
                          </div>

                          {/* VIDA */}
                          <div className="flex flex-col w-full">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-[#f0e6d2] font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8aa6e] rotate-45"></span>
                                VIDA
                              </span>
                              {editingClass.isEditingStats ? (
                                <div className="flex items-center gap-3 bg-[#0b1120] border border-[#c8aa6e]/30 rounded px-3 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.vida) draft.stats.vida = { current: 4, max: 4 };
                                          const newCurrent = Math.max(0, (draft.stats.vida.current ?? 4) - 1);
                                          draft.stats.vida.current = Math.min(newCurrent, draft.stats.vida.max ?? 4);
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-[#c8aa6e]">{editingClass.stats?.vida?.current ?? 4}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.vida) draft.stats.vida = { current: 4, max: 4 };
                                          const newCurrent = Math.min((draft.stats.vida.max ?? 4), (draft.stats.vida.current ?? 4) + 1);
                                          draft.stats.vida.current = newCurrent;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="w-[1px] h-3 bg-slate-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.vida) draft.stats.vida = { current: 4, max: 4 };
                                          const newMax = Math.max(0, (draft.stats.vida.max ?? 4) - 1);
                                          draft.stats.vida.max = Math.min(10, newMax);
                                          if (draft.stats.vida.current > newMax) draft.stats.vida.current = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-slate-400">{editingClass.stats?.vida?.max ?? 4}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.vida) draft.stats.vida = { current: 4, max: 4 };
                                          const newMax = Math.min(10, (draft.stats.vida.max ?? 4) + 1);
                                          draft.stats.vida.max = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#c8aa6e] font-bold font-mono text-sm opacity-80">
                                  {editingClass.stats?.vida?.current ?? 4} <span className="text-slate-600">/</span> {editingClass.stats?.vida?.max ?? 4}
                                </span>
                              )}
                            </div>

                            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                              {Array.from({ length: editingClass.stats?.vida?.max ?? 4 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] ${i < (editingClass.stats?.vida?.current ?? 4)
                                    ? 'bg-[#e09f9f] border-red-900'
                                    : 'bg-[#e09f9f]/20 border-red-900/30'
                                    }`}
                                  style={{
                                    clipPath: i === 0
                                      ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                      : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                    marginLeft: i === 0 ? '0' : '-6px',
                                    zIndex: (editingClass.stats?.vida?.max ?? 4) - i,
                                    filter: 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                                </div>
                              ))}
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-slate-800 to-transparent mt-3"></div>
                          </div>

                          {/* INGENIO */}
                          <div className="flex flex-col w-full">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-[#f0e6d2] font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8aa6e] rotate-45"></span>
                                INGENIO
                              </span>
                              {editingClass.isEditingStats ? (
                                <div className="flex items-center gap-3 bg-[#0b1120] border border-[#c8aa6e]/30 rounded px-3 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.ingenio) draft.stats.ingenio = { current: 2, max: 3 }; const newCurrent = Math.max(0, (draft.stats.ingenio.current ?? 2) - 1); draft.stats.ingenio.current = Math.min(newCurrent, draft.stats.ingenio.max ?? 3); }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3 rotate-45" /></button>
                                    <span className="text-xs font-mono w-4 text-center text-[#c8aa6e]">{editingClass.stats?.ingenio?.current ?? 2}</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.ingenio) draft.stats.ingenio = { current: 2, max: 3 }; const newCurrent = Math.min((draft.stats.ingenio.max ?? 3), (draft.stats.ingenio.current ?? 2) + 1); draft.stats.ingenio.current = newCurrent; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3" /></button>
                                  </div>
                                  <div className="w-[1px] h-3 bg-slate-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.ingenio) draft.stats.ingenio = { current: 2, max: 3 }; const newMax = Math.max(0, (draft.stats.ingenio.max ?? 3) - 1); draft.stats.ingenio.max = Math.min(10, newMax); if (draft.stats.ingenio.current > newMax) draft.stats.ingenio.current = newMax; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3 rotate-45" /></button>
                                    <span className="text-xs font-mono w-4 text-center text-slate-400">{editingClass.stats?.ingenio?.max ?? 3}</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.ingenio) draft.stats.ingenio = { current: 2, max: 3 }; const newMax = Math.min(10, (draft.stats.ingenio.max ?? 3) + 1); draft.stats.ingenio.max = newMax; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#c8aa6e] font-bold font-mono text-sm opacity-80">
                                  {editingClass.stats?.ingenio?.current ?? 2} <span className="text-slate-600">/</span> {editingClass.stats?.ingenio?.max ?? 3}
                                </span>
                              )}
                            </div>

                            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                              {Array.from({ length: editingClass.stats?.ingenio?.max ?? 3 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] ${i < (editingClass.stats?.ingenio?.current ?? 2)
                                    ? 'bg-[#9face0] border-blue-900'
                                    : 'bg-[#9face0]/20 border-blue-900/30'
                                    }`}
                                  style={{
                                    clipPath: i === 0
                                      ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                      : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                    marginLeft: i === 0 ? '0' : '-6px',
                                    zIndex: (editingClass.stats?.ingenio?.max ?? 3) - i,
                                    filter: 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                                </div>
                              ))}
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-slate-800 to-transparent mt-3"></div>
                          </div>

                          {/* CORDURA */}
                          <div className="flex flex-col w-full">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-[#f0e6d2] font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8aa6e] rotate-45"></span>
                                CORDURA
                              </span>
                              {editingClass.isEditingStats ? (
                                <div className="flex items-center gap-3 bg-[#0b1120] border border-[#c8aa6e]/30 rounded px-3 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.cordura) draft.stats.cordura = { current: 3, max: 3 }; const newCurrent = Math.max(0, (draft.stats.cordura.current ?? 3) - 1); draft.stats.cordura.current = Math.min(newCurrent, draft.stats.cordura.max ?? 3); }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3 rotate-45" /></button>
                                    <span className="text-xs font-mono w-4 text-center text-[#c8aa6e]">{editingClass.stats?.cordura?.current ?? 3}</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.cordura) draft.stats.cordura = { current: 3, max: 3 }; const newCurrent = Math.min((draft.stats.cordura.max ?? 3), (draft.stats.cordura.current ?? 3) + 1); draft.stats.cordura.current = newCurrent; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3" /></button>
                                  </div>
                                  <div className="w-[1px] h-3 bg-slate-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.cordura) draft.stats.cordura = { current: 3, max: 3 }; const newMax = Math.max(0, (draft.stats.cordura.max ?? 3) - 1); draft.stats.cordura.max = Math.min(10, newMax); if (draft.stats.cordura.current > newMax) draft.stats.cordura.current = newMax; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3 rotate-45" /></button>
                                    <span className="text-xs font-mono w-4 text-center text-slate-400">{editingClass.stats?.cordura?.max ?? 3}</span>
                                    <button onClick={() => { updateEditingClass((draft) => { if (!draft.stats) draft.stats = {}; if (!draft.stats.cordura) draft.stats.cordura = { current: 3, max: 3 }; const newMax = Math.min(10, (draft.stats.cordura.max ?? 3) + 1); draft.stats.cordura.max = newMax; }); }} className="text-slate-400 hover:text-[#c8aa6e] transition-colors"><FiPlus className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#c8aa6e] font-bold font-mono text-sm opacity-80">
                                  {editingClass.stats?.cordura?.current ?? 3} <span className="text-slate-600">/</span> {editingClass.stats?.cordura?.max ?? 3}
                                </span>
                              )}
                            </div>

                            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                              {Array.from({ length: editingClass.stats?.cordura?.max ?? 3 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] ${i < (editingClass.stats?.cordura?.current ?? 3)
                                    ? 'bg-[#c09fe0] border-purple-900'
                                    : 'bg-[#c09fe0]/20 border-purple-900/30'
                                    }`}
                                  style={{
                                    clipPath: i === 0
                                      ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                      : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                    marginLeft: i === 0 ? '0' : '-6px',
                                    zIndex: (editingClass.stats?.cordura?.max ?? 3) - i,
                                    filter: 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                                </div>
                              ))}
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-slate-800 to-transparent mt-3"></div>
                          </div>

                          {/* ARMADURA */}
                          <div className="flex flex-col w-full">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-[#f0e6d2] font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8aa6e] rotate-45"></span>
                                ARMADURA
                              </span>
                              {editingClass.isEditingStats ? (
                                <div className="flex items-center gap-3 bg-[#0b1120] border border-[#c8aa6e]/30 rounded px-3 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.armadura) draft.stats.armadura = { current: 1, max: 2 };
                                          const newCurrent = Math.max(0, (draft.stats.armadura.current ?? 1) - 1);
                                          draft.stats.armadura.current = Math.min(newCurrent, draft.stats.armadura.max ?? 2);
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-[#c8aa6e]">{editingClass.stats?.armadura?.current ?? 1}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.armadura) draft.stats.armadura = { current: 1, max: 2 };
                                          const newCurrent = Math.min((draft.stats.armadura.max ?? 2), (draft.stats.armadura.current ?? 1) + 1);
                                          draft.stats.armadura.current = newCurrent;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="w-[1px] h-3 bg-slate-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.armadura) draft.stats.armadura = { current: 1, max: 2 };
                                          const newMax = Math.max(0, (draft.stats.armadura.max ?? 2) - 1);
                                          draft.stats.armadura.max = Math.min(10, newMax);
                                          if (draft.stats.armadura.current > newMax) draft.stats.armadura.current = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3 rotate-45" />
                                    </button>
                                    <span className="text-xs font-mono w-4 text-center text-slate-400">{editingClass.stats?.armadura?.max ?? 2}</span>
                                    <button
                                      onClick={() => {
                                        updateEditingClass((draft) => {
                                          if (!draft.stats) draft.stats = {};
                                          if (!draft.stats.armadura) draft.stats.armadura = { current: 1, max: 2 };
                                          const newMax = Math.min(10, (draft.stats.armadura.max ?? 2) + 1);
                                          draft.stats.armadura.max = newMax;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-[#c8aa6e] transition-colors"
                                    >
                                      <FiPlus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#c8aa6e] font-bold font-mono text-sm opacity-80">
                                  {editingClass.stats?.armadura?.current ?? 1} <span className="text-slate-600">/</span> {editingClass.stats?.armadura?.max ?? 2}
                                </span>
                              )}
                            </div>

                            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                              {Array.from({ length: editingClass.stats?.armadura?.max ?? 2 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] ${i < (editingClass.stats?.armadura?.current ?? 1)
                                    ? 'bg-[#a0a0a0] border-slate-600'
                                    : 'bg-[#a0a0a0]/20 border-slate-600/30'
                                    }`}
                                  style={{
                                    clipPath: i === 0
                                      ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                      : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                    marginLeft: i === 0 ? '0' : '-6px',
                                    zIndex: (editingClass.stats?.armadura?.max ?? 2) - i,
                                    filter: 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                                </div>
                              ))}
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-slate-800 to-transparent mt-3"></div>
                          </div>
                        </div>
                      </div >

                    </div >
                  </div >
                </div >
              </div >
            </div >
          );
        /* Funciones movidas al scope principal, ver más arriba */
        case 'progression':
          return (
            <ProgressionView
              dndClass={editingClass}
              onUpdateLevel={handleUpdateLevel}
              onToggleAcquired={toggleLevelCompleted}
              onAddFeature={handleAddLevelFeature}
              onRemoveFeature={handleRemoveLevelFeature}
              onUpdateFeature={handleUpdateLevelFeature}
            />
          );
        case 'loadout':
          return (
            <LoadoutView
              key={dndClass.id}
              dndClass={dndClass}
              isCharacter={isPlayerMode}
              equipmentCatalog={equipmentCatalog}
              glossary={glossary}
              onAddEquipment={handleAddEquipment}
              onRemoveEquipment={handleRemoveEquipment}
              onUpdateTalent={handleUpdateTalent}
              onUpdateProficiency={handleProficiencyChange}
              onUpdateEquipped={handleUpdateEquipped}
            />
          );
        case 'feats':
          return (
            <RelicsView
              dndClass={dndClass}
              onFeaturesChange={(newFeatures) => handleUpdateClassField('features', newFeatures)}
              onActionsChange={(newActions) => handleUpdateClassField('actionData', newActions)}
            />
          );
        case 'store':
          return (
            <StoreView
              equipmentCatalog={equipmentCatalog}
              storeItems={dndClass.storeItems}
              money={dndClass.money !== undefined ? dndClass.money : 4697}
              onUpdateStoreItems={(newItems) => {
                setEditingClass((prev) => ({
                  ...prev,
                  storeItems: newItems
                }));
              }}
              onUpdateMoney={(newMoney) => {
                setEditingClass((prev) => ({
                  ...prev,
                  money: newMoney
                }));
              }}
            />
          );
        default:
          return null;
      }
    };

    return (
      <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#09090b]">
        <Sidebar
          activeTab={activeDetailTab}
          onTabChange={setActiveDetailTab}
          characterName={dndClass.name}
          characterLevel={dndClass.currentLevel}
          characterImage={dndClass.image}
          characterAvatar={dndClass.avatar}
          onSave={readOnly ? undefined : handleSaveChanges}
          hasUnsavedChanges={hasUnsavedChanges}
          saveButtonState={saveButtonState}
        />
        <div className="flex-1 relative overflow-hidden pb-16 md:pb-0">
          {renderActiveView()}

          {/* Close Button Absolute Positioned */}
          <button
            onClick={closeClassDetails}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 rounded-full bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors border border-slate-700/50"
          >
            <FiX className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Mobile Navigation Bar */}
        <MobileNav
          activeTab={activeDetailTab}
          onTabChange={setActiveDetailTab}
          onSave={readOnly ? undefined : handleSaveChanges}
          hasUnsavedChanges={hasUnsavedChanges}
          saveButtonState={saveButtonState}
        />
      </div>
    );
  };

  const detailContent = renderClassDetailContent();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e2e8f0] font-['Lato'] p-4 md:p-8 selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2]">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
        `}
      </style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">
        {isAutoOpening ? (
          <motion.div
            key="auto-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#09090b]"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#c8aa6e]/20 border-t-[#c8aa6e] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FiRefreshCw className="w-6 h-6 text-[#c8aa6e] opacity-40" />
              </div>
            </div>
            <div className="mt-8 text-center">
              <h2 className="font-['Cinzel'] text-[#c8aa6e] text-xl font-bold tracking-[0.2em] uppercase">Consultando Archivo</h2>
              <p className="text-slate-500 text-sm mt-2 font-light tracking-widest uppercase">Cargando datos de {initialCharacterName}...</p>
            </div>
          </motion.div>
        ) : !selectedClass ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto flex w-full max-w-[1600px] flex-col gap-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#c8aa6e]/20 pb-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                  <span className="opacity-70">ARCANA VAULT</span>
                  <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                  <span>{isPlayerMode ? 'PERSONAJES' : 'CLASES'}</span>
                </div>
                <h1 className="font-['Cinzel'] text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-5xl">
                  {title}
                </h1>
                <p className="max-w-2xl font-['Lato'] text-lg font-light leading-relaxed text-[#94a3b8]">
                  {subtitle}
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-2 rounded-sm border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 px-3 py-1.5">
                    <span className="font-['Cinzel'] text-lg font-bold text-[#c8aa6e]">{classes.length}</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#94a3b8]">Activos</span>
                  </div>
                  {!isPlayerMode && (
                    <>
                      <div className="flex items-center gap-2 rounded-sm border border-slate-700/50 bg-slate-900/50 px-3 py-1.5">
                        <span className="font-['Cinzel'] text-lg font-bold text-slate-400">200</span>
                        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#94a3b8]">Esencias</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-sm border border-slate-700/50 bg-slate-900/50 px-3 py-1.5">
                        <span className="font-['Cinzel'] text-lg font-bold text-slate-400">1.2k</span>
                        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#94a3b8]">Reliquias</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 md:items-end">
                <button
                  onClick={onBack}
                  className="group relative px-6 py-2 overflow-hidden rounded-sm border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 text-[#c8aa6e] font-['Cinzel'] font-bold text-xs uppercase tracking-[0.2em] transition-all hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 hover:shadow-[0_0_15px_rgba(200,170,110,0.3)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <FiArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    {backButtonLabel}
                  </span>
                </button>
              </div>
            </div>

            <div className="sticky top-4 z-30 flex flex-col gap-4 rounded-xl border border-[#c8aa6e]/20 bg-[#0f172a]/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c8aa6e]/70" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Buscar en el archivo..."
                  className="w-full rounded-lg border border-[#c8aa6e]/20 bg-[#0b1120]/50 py-2.5 pl-10 pr-4 text-sm text-[#f0e6d2] placeholder-slate-600 transition-colors focus:border-[#c8aa6e]/60 focus:bg-[#0b1120]/80 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#c8aa6e]"
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-3">
                  <span className="font-['Cinzel'] text-xs font-bold uppercase tracking-widest text-[#c8aa6e]">Orden</span>
                  <div className="relative">
                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c8aa6e]/70" />
                    <select
                      value={sortBy}
                      onChange={handleSortChange}
                      className="appearance-none rounded-lg border border-[#c8aa6e]/20 bg-[#0b1120]/50 py-2 pl-3 pr-9 text-xs font-bold uppercase tracking-wider text-[#f0e6d2] focus:border-[#c8aa6e]/60 focus:outline-none"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {isCreating ? (
              <CreatorComponent
                onBack={() => setIsCreating(false)}
                onSave={handleSaveNewClass}
              />
            ) : (
              <div className="flex flex-col gap-10 pb-12">
                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/30 to-transparent"></div>
                  <span className="font-['Cinzel'] text-[#c8aa6e] tracking-widest text-lg">{isPlayerMode ? 'PERSONAJES DISPONIBLES' : 'CAMPEONES DISPONIBLES'}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/30 to-transparent"></div>
                </div>

                <div
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                  {/* Create New Class Card - Only if not readOnly */}
                  {!readOnly && (
                    <div
                      onClick={() => setIsCreating(true)}
                      className="group relative aspect-[3/4.5] rounded-sm cursor-pointer transition-all duration-300 border-2 border-dashed border-[#c8aa6e]/30 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/5 flex flex-col items-center justify-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#0b1120] border border-[#c8aa6e]/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-[0_0_20px_rgba(200,170,110,0.3)]">
                        <FiPlus className="w-8 h-8 text-[#c8aa6e]" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-fantasy font-bold text-[#c8aa6e] uppercase tracking-wider text-lg">Crear Nuevo</h3>
                        <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">{creatorLabel}</p>
                      </div>
                    </div>
                  )}

                  {filteredClasses.map((classItem) => {
                    const isLocked = classItem.status === 'locked';

                    return (
                      <div
                        key={classItem.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openClassDetails(classItem)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openClassDetails(classItem);
                          }
                        }}
                        className="group relative aspect-[3/4.5] cursor-pointer rounded-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_15px_40px_-10px_rgba(200,170,110,0.3)]"
                      >
                        {/* Main Frame Content */}
                        <div className={`absolute inset-0 overflow-hidden bg-[#1a1b26] border-[1px] ${!isLocked ? 'border-[#785a28]' : 'border-slate-700'}`}>
                          {/* Background Image with Zoom effect */}
                          <div className="absolute inset-0 overflow-hidden">
                            {classItem.image ? (
                              <img
                                src={classItem.image}
                                alt={classItem.name}
                                className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${isLocked ? 'grayscale opacity-40' : 'opacity-90'}`}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#1a1b26] text-slate-700">
                                <FiImage className="h-12 w-12 opacity-20" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-transparent opacity-90" />
                          </div>

                          {/* Locked Overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-500 bg-[#0b1120]/80">
                                <FiLock className="h-8 w-8 text-slate-400" />
                              </div>
                              <span className="font-['Cinzel'] text-sm font-bold tracking-[0.2em] text-slate-400 shadow-black drop-shadow-md">BLOQUEADO</span>
                            </div>
                          )}

                          {/* Card Content */}
                          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center p-5 text-center">
                            <h3 className={`mb-1 font-['Cinzel'] text-xl font-bold uppercase tracking-wider transition-colors duration-300 drop-shadow-lg ${!isLocked ? 'text-[#f0e6d2] group-hover:text-white' : 'text-slate-500'}`}>
                              {classItem.name}
                            </h3>

                            {/* Stars */}
                            <div className="mb-3 flex items-center justify-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg
                                  key={i}
                                  className={`h-3 w-3 drop-shadow-md ${i < (classItem.rating || 0) ? (!isLocked ? 'text-[#c8aa6e] fill-[#c8aa6e]' : 'text-slate-600 fill-slate-600') : 'text-slate-800 fill-slate-800'}`}
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>

                            {/* Role/Level Badge */}
                            {!isLocked && (
                              <div className="flex w-full items-center justify-center gap-3">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8aa6e]/50"></div>
                                <div className="rounded border border-[#c8aa6e]/40 bg-[#1c1917]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#c8aa6e]">
                                  Nvl {classItem.level || 1}
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8aa6e]/50"></div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fancy Border Frame (Over everything) */}
                        <div className={`pointer-events-none absolute inset-0 z-30 border-2 shadow-[inset_0_0_20px_rgba(200,170,110,0.2)] transition-opacity duration-300 ${!isLocked ? 'border-[#c8aa6e]' : 'border-slate-600'} opacity-0 group-hover:opacity-100`}>
                          {/* Corner Accents */}
                          <div className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-white"></div>
                          <div className="absolute right-0 top-0 h-2 w-2 border-r-2 border-t-2 border-white"></div>
                          <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-white"></div>
                          <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-white"></div>
                        </div>

                        {/* Static Border for non-hover */}
                        <div className={`pointer-events-none absolute inset-0 z-20 border transition-opacity ${!isLocked ? 'border-[#785a28]' : 'border-slate-700'} opacity-100 group-hover:opacity-0`}></div>


                        {/* Edit Button (Top Left) */}
                        {/* Edit Button (Top Left) - Only if not readOnly */}
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartPortraitEdit(classItem);
                              }}
                              className="absolute left-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/30 bg-[#0b1120]/80 text-slate-300 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-slate-800 hover:text-white group-hover:opacity-100"
                              title="Cambiar retrato"
                            >
                              <FiImage className="h-3.5 w-3.5" />
                            </button>

                            {!isLocked && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClass(classItem.id);
                                }}
                                className="absolute right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-[#0b1120]/80 text-red-400 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-red-900/50 hover:text-red-200 group-hover:opacity-100"
                                title="Eliminar clase"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]"
          >
            {detailContent}
          </motion.div>
        )}
      </AnimatePresence>


    </div >
  );
};

ClassList.propTypes = {
  onBack: PropTypes.func.isRequired,
  armas: PropTypes.arrayOf(PropTypes.object),
  armaduras: PropTypes.arrayOf(PropTypes.object),
  habilidades: PropTypes.arrayOf(PropTypes.object),
  glossary: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      color: PropTypes.string,
      info: PropTypes.string,
    }),
  ),
  rarityColorMap: PropTypes.objectOf(PropTypes.string),
};

export default ClassList;
