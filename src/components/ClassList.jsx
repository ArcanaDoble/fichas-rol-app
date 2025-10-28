import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import {
  FiChevronDown,
  FiImage,
  FiLock,
  FiSearch,
  FiStar,
  FiX,
  FiArrowRight,
  FiTarget,
  FiEdit2,
  FiPlus,
  FiCheckSquare,
  FiSquare,
  FiSave,
  FiRefreshCw,
  FiTrash2,
  FiSliders,
} from 'react-icons/fi';
import Cropper from 'react-easy-crop';
import Boton from './Boton';
import Modal from './Modal';
import { getGlossaryTooltipId, escapeGlossaryWord } from '../utils/glossary';
import { convertNumericStringToIcons } from '../utils/iconConversions';
import { db, storage } from '../firebase';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

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
        mentalLoad: item.cargaMental || '',
        traits: joinTraits(item.rasgos || item.traits || ''),
        ...baseEntry,
      });
    } else {
      grouped.abilities.push({
        damage: item.dano || item.damage || '',
        range: item.alcance || item.range || '',
        consumption: item.consumo || item.cost || '',
        body: item.cuerpo || '',
        mind: item.mente || '',
        trait: joinTraits(item.rasgo || item.rasgos || item.traits || ''),
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
      damage: weapon.dano || weapon.damage || '',
      range: weapon.alcance || weapon.range || '',
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
      defense: armor.defensa || armor.defense || '',
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
      damage: ability.dano || ability.damage || '',
      range: ability.alcance || ability.range || '',
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
    'w-full rounded-2xl border border-slate-700/60 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40';

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
          className={`group inline-flex w-full items-center gap-2 text-left transition hover:text-slate-100/90 ${displayClassName}`}
        >
          <span
            className={`${
              textClassName || ''
            } ${isPlaceholder ? 'text-slate-500/70 italic' : ''}`.trim()}
          >
            {displayValue}
          </span>
          <FiEdit2 className="h-3.5 w-3.5 text-slate-500 opacity-0 transition group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
};

const ensureClassDefaults = (classItem) => {
  const base = {
    summary: { battleRole: '', combo: '', difficultyNote: '', highlights: [] },
    inspiration: [],
    classLevels: [],
    rules: [],
    equipment: deepClone(defaultEquipment),
  };

  const merged = {
    ...deepClone(base),
    ...deepClone(classItem),
  };

  merged.status = merged.status || 'available';

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
      };
    }

    return {
      title: `Nivel ${index + 1} — Nuevo avance`,
      description: typeof level === 'string' ? level : '',
      completed: false,
    };
  });
  merged.rules = merged.rules || [];

  merged.equipment = {
    ...deepClone(defaultEquipment),
    ...(merged.equipment || {}),
  };

  merged.image = normalizeImageValue(merged.image);

  merged.equipment.weapons = (merged.equipment.weapons || []).map((weapon) => {
    const consumption = toDisplayString(
      weapon.consumption ?? weapon.cost ?? weapon.consumo ?? '',
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
    };
  });

  merged.equipment.abilities = (merged.equipment.abilities || []).map((ability) => {
    const consumption = toDisplayString(
      ability.consumption ?? ability.cost ?? ability.consumo ?? '',
    );
    const body = toDisplayString(ability.body ?? ability.cuerpo ?? '');
    const mind = toDisplayString(ability.mind ?? ability.mente ?? '');
    const traitValue = joinTraits(ability.trait || ability.rasgo || ability.rasgos || '');

    return {
      name: '',
      category: '',
      damage: toDisplayString(ability.damage ?? ability.dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ''),
      consumption,
      body,
      mind,
      trait: traitValue,
      rareza: toDisplayString(ability.rareza || ''),
      description: '',
      ...ability,
      damage: toDisplayString(ability.damage ?? ability.dano ?? ''),
      range: toDisplayString(ability.range ?? ability.alcance ?? ''),
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
            className={`${starSize} transition-transform transition-colors ${
              filled
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

const ClassList = ({
  onBack,
  armas = [],
  armaduras = [],
  habilidades = [],
  glossary = [],
  rarityColorMap = {},
}) => {
  const [classes, setClasses] = useState(initialClasses);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('alphaAsc');
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [cropperState, setCropperState] = useState({
    classId: null,
    imageSrc: '',
    crop: { x: 0, y: 0 },
    zoom: 0.9,
    croppedAreaPixels: null,
  });
  const [isCropping, setIsCropping] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [levelSliderLimit, setLevelSliderLimit] = useState(12);
  const [equipmentSearchTerms, setEquipmentSearchTerms] = useState({
    weapons: '',
    armor: '',
    abilities: '',
  });

  const fileInputRef = useRef(null);

  const equipmentCatalog = useMemo(
    () => ({
      weapons: (armas || []).map(buildWeaponEntry).filter(Boolean),
      armor: (armaduras || []).map(buildArmorEntry).filter(Boolean),
      abilities: (habilidades || []).map(buildAbilityEntry).filter(Boolean),
    }),
    [armas, armaduras, habilidades],
  );

  useEffect(() => {
    let isMounted = true;

    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'classes'));
        if (!isMounted) return;
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((docSnap) =>
            ensureClassDefaults({ id: docSnap.id, ...docSnap.data() }),
          );
          setClasses(loaded);
        }
      } catch (error) {
        console.error('Error al cargar las clases desde Firebase', error);
      }
    };

    fetchClasses();

    return () => {
      isMounted = false;
    };
  }, []);

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
  };

  const closeClassDetails = () => {
    setSaveStatus(null);
    setSelectedClass(null);
    setActiveDetailTab('overview');
    setEditingClass(null);
  };

  const updateEditingClass = (mutator) => {
    setEditingClass((prev) => {
      if (!prev) return prev;
      const draft = deepClone(prev);
      mutator(draft);
      return draft;
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

  const handleTagChange = (index, value) => {
    updateEditingClass((draft) => {
      const tags = draft.tags || [];
      tags[index] = value;
      draft.tags = tags;
    });
  };

  const addTag = () => {
    updateEditingClass((draft) => {
      const tags = draft.tags || [];
      tags.push('Nueva etiqueta');
      draft.tags = tags;
    });
  };

  const removeTag = (index) => {
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

  const toggleLevelCompleted = (index) => {
    updateEditingClass((draft) => {
      const levels = draft.classLevels || [];
      if (!levels[index]) return;
      levels[index].completed = !levels[index].completed;
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

  const handleSaveChanges = useCallback(async () => {
    if (!editingClass) return;

    let sanitized = ensureClassDefaults(editingClass);
    let classId = sanitized.id?.toString().trim();

    if (!classId) {
      classId = slugifyId(sanitized.name);
      if (!classId) {
        setSaveStatus({
          type: 'error',
          message: 'La clase necesita un nombre o identificador antes de guardarse.',
        });
        return;
      }
      sanitized.id = classId;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      sanitized.image = normalizeImageValue(sanitized.image);
      sanitized = pruneUndefined(sanitized);

      await setDoc(doc(db, 'classes', classId), sanitized, { merge: true });

      setClasses((prevClasses) => {
        const exists = prevClasses.some((classItem) => classItem.id === sanitized.id);
        if (exists) {
          return prevClasses.map((classItem) =>
            classItem.id === sanitized.id ? sanitized : classItem,
          );
        }
        return [...prevClasses, sanitized];
      });

      setSelectedClass(sanitized);
      setEditingClass(deepClone(sanitized));
      const targetLimit = Math.max(levelSliderLimit, (sanitized.classLevels?.length || 0) + 2);
      setLevelSliderLimit(targetLimit);
      setSaveStatus({ type: 'success', message: 'Cambios guardados en Firebase.' });
    } catch (error) {
      console.error('Error al guardar la clase en Firebase', error);
      setSaveStatus({
        type: 'error',
        message: 'No se pudo guardar en Firebase. Intenta de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    editingClass,
    levelSliderLimit,
    setClasses,
    setEditingClass,
    setIsSaving,
    setLevelSliderLimit,
    setSaveStatus,
    setSelectedClass,
  ]);

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
            </div>
          </div>
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
                    className={`group rounded-2xl border p-4 shadow-[0_10px_25px_-15px_rgba(251,191,36,0.6)] transition ${
                      completed
                        ? 'border-emerald-400/50 bg-emerald-500/10 ring-1 ring-emerald-400/40'
                        : 'border-amber-400/30 bg-amber-400/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleInspirationCompleted(index)}
                        className={`mt-1 rounded-full border border-transparent p-2 transition ${
                          completed
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
                          textClassName={`text-sm font-semibold uppercase tracking-[0.3em] ${
                            completed ? 'text-emerald-100' : 'text-amber-100'
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
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                              isCompleted
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
                            textClassName={`text-sm font-semibold uppercase tracking-[0.3em] ${
                              isCompleted
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
                        textClassName={`text-sm leading-relaxed ${
                          isCompleted ? 'text-emerald-100/90' : 'text-indigo-50/90'
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
                className={`text-[0.6rem] uppercase tracking-[0.35em] ${
                  labelClassName || config.statLabelClass
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

  const openFileDialogForClass = (classId) => {
    setCropperState({ classId, imageSrc: '', crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperState((prev) => ({ ...prev, imageSrc: reader.result }));
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = useCallback((_, croppedAreaPixels) => {
    setCropperState((prev) => ({ ...prev, croppedAreaPixels }));
  }, []);

  const handleCropCancel = () => {
    setIsCropping(false);
    setCropperState({ classId: null, imageSrc: '', crop: { x: 0, y: 0 }, zoom: 0.9, croppedAreaPixels: null });
  };

  const handleCropSave = async () => {
    if (!cropperState.classId) return;
    const croppedImage = await getCroppedImage(cropperState.imageSrc, cropperState.croppedAreaPixels);
    if (!croppedImage) return;

    const classId = cropperState.classId;
    const filePath = `class-images/${classId}.png`;

    try {
      setSaveStatus(null);
      const storageRef = ref(storage, filePath);
      await uploadString(storageRef, croppedImage, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      const normalizedUrl = normalizeImageValue(downloadURL);

      if (normalizedUrl) {
        try {
          await setDoc(
            doc(db, 'classes', classId),
            { image: normalizedUrl },
            { merge: true },
          );
        } catch (firestoreError) {
          console.error('Error al guardar la URL del retrato en Firestore', firestoreError);
          setSaveStatus({
            type: 'error',
            message: 'El retrato se subió a Storage, pero no se pudo guardar en Firestore.',
          });
          return;
        }
      }

      setClasses((prevClasses) =>
        prevClasses.map((classItem) =>
          classItem.id === classId ? { ...classItem, image: normalizedUrl } : classItem,
        ),
      );

      setSelectedClass((prevSelected) =>
        prevSelected && prevSelected.id === classId
          ? { ...prevSelected, image: normalizedUrl }
          : prevSelected,
      );

      setEditingClass((prevEditing) =>
        prevEditing && prevEditing.id === classId ? { ...prevEditing, image: normalizedUrl } : prevEditing,
      );

      setSaveStatus({
        type: 'success',
        message: 'Retrato actualizado y guardado en Firebase.',
      });
      handleCropCancel();
    } catch (error) {
      console.error('Error al subir la imagen recortada a Firebase Storage', error);
      setSaveStatus({
        type: 'error',
        message: 'No se pudo subir la imagen recortada. Intenta nuevamente.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300/80">
              <span className="text-amber-300">Modo Máster</span>
              <span className="text-slate-600">/</span>
              <span>Clases</span>
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-wide text-white drop-shadow-[0_0_20px_rgba(96,165,250,0.35)]">
              Lista de Clases
            </h1>
            <p className="max-w-xl text-sm text-slate-400">
              Gestiona la biblioteca de clases disponibles para tus jugadores. Puedes personalizar el retrato de cada carta y prepararla antes de la sesión.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1">
                67 / 79 clases activas
              </span>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1">
                200 / 415 esencias
              </span>
              <span className="rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1">
                1169 / 3950 reliquias
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
                265 / 500 dominio
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Boton color="gray" onClick={onBack} className="w-full md:w-auto">
              ← Volver al menú
            </Boton>
            <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-[0_18px_40px_-18px_rgba(14,165,233,0.45)]">
              <div className="text-xs uppercase tracking-widest text-slate-500">Resumen rápido</div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div>
                  <div className="text-emerald-300/90 text-lg font-bold">12</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Disponibles</div>
                </div>
                <div>
                  <div className="text-sky-300/90 text-lg font-bold">4</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">En progreso</div>
                </div>
                <div>
                  <div className="text-amber-300/90 text-lg font-bold">2</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Legendarias</div>
                </div>
                <div>
                  <div className="text-rose-300/90 text-lg font-bold">6</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bloqueadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/80 p-4 shadow-[0_10px_30px_rgba(8,7,21,0.55)] md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar clase, rol o palabras clave"
              className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-black/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                aria-label="Limpiar búsqueda"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Orden</span>
              <div className="relative">
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="appearance-none rounded-2xl border border-slate-700/60 bg-slate-950/80 py-3 pl-4 pr-10 text-sm font-semibold text-slate-100 shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((classItem) => {
            const status = statusConfig[classItem.status];
            return (
              <div
                key={classItem.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir detalles de ${classItem.name}`}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.45)] transition hover:border-sky-500/40 hover:shadow-[0_25px_50px_-20px_rgba(56,189,248,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                onClick={() => openClassDetails(classItem)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openClassDetails(classItem);
                  }
                }}
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {classItem.image ? (
                      <img
                        src={classItem.image}
                        alt={`Retrato de ${classItem.name}`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900/80">
                        <FiImage className="h-12 w-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/10 to-transparent" />
                    {status && (
                      <div
                        className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] backdrop-blur-sm transition group-hover:translate-y-[-2px] group-hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] ${status.badgeClass}`}
                      >
                        {classItem.status === 'locked' && <FiLock className="h-3.5 w-3.5" />}
                        <span>{status.label}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openFileDialogForClass(classItem.id);
                      }}
                      className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-slate-500/60 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 backdrop-blur transition hover:border-sky-400 hover:text-sky-200"
                    >
                      <FiImage className="h-4 w-4" />
                      <span>Editar retrato</span>
                    </button>
                    {classItem.status === 'locked' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
                          <FiLock className="h-4 w-4" />
                          <span>Contenido bloqueado</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-6">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-white drop-shadow-[0_0_16px_rgba(96,165,250,0.35)]">
                          {classItem.name}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                          {classItem.subtitle}
                        </p>
                      </div>
                      <RatingStars rating={classItem.rating} size="sm" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {classItem.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {classItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-xs text-slate-400">
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Dificultad</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.difficulty}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Dominio</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.mastery}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Enfoque</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.focus}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">C. de desbloqueo</div>
                      <div className="text-sm font-semibold text-amber-200">
                        {classItem.xp} XP • {classItem.shards} fragmentos
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedClass)}
        onClose={closeClassDetails}
        size="full"
        overlayClassName="bg-slate-950/80 backdrop-blur-xl"
        className="max-h-[95vh] overflow-y-auto border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
      >
        {selectedClass && editingClass && (
          <div className="flex min-h-0 flex-col gap-8">
            <div className="grid min-h-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="flex min-h-0 flex-col gap-8">
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-8 shadow-[0_20px_45px_-30px_rgba(56,189,248,0.65)]">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-slate-300">
                        <span className="text-sky-300">Clase</span>
                        <span className="text-slate-600">/</span>
                        <span>Detalle</span>
                      </div>
                      <div className="space-y-2">
                        <EditableField
                          value={editingClass.name}
                          onChange={(value) => handleGeneralFieldChange('name', value)}
                          placeholder="Nombre de la clase"
                          displayClassName="block rounded-2xl border border-transparent px-3 py-2"
                          textClassName="text-3xl font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]"
                          inputClassName="bg-slate-900/80 text-2xl font-bold uppercase tracking-[0.2em]"
                          autoSelect={false}
                        />
                        <EditableField
                          value={editingClass.subtitle}
                          onChange={(value) => handleGeneralFieldChange('subtitle', value)}
                          placeholder="Define un subtítulo inspirador"
                          displayClassName="block"
                          textClassName="mt-1 text-xs uppercase tracking-[0.35em] text-slate-500"
                          inputClassName="bg-slate-900/70 text-xs uppercase tracking-[0.35em]"
                          autoSelect={false}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1 text-xs uppercase tracking-[0.35em] text-slate-300">
                        <span>Valoración</span>
                        <RatingStars rating={editingClass.rating || 0} onChange={handleRatingChange} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <label className="text-[0.55rem] uppercase tracking-[0.35em] text-slate-500">Estado</label>
                        <div className="relative">
                          <select
                            value={editingClass.status || 'available'}
                            onChange={(event) => handleGeneralFieldChange('status', event.target.value)}
                            className="appearance-none rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-1.5 pr-10 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                          >
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <option key={`status-${value}`} value={value}>
                                {config.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </div>
                      {statusConfig[editingClass.status] ? (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${statusConfig[editingClass.status].badgeClass}`}
                        >
                          {editingClass.status === 'locked' && <FiLock className="h-3.5 w-3.5" />}
                          <span>{statusConfig[editingClass.status].label}</span>
                        </div>
                      ) : (
                        editingClass.status && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                            {editingClass.status}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <EditableField
                    value={editingClass.description}
                    onChange={(value) => handleGeneralFieldChange('description', value)}
                    multiline
                    placeholder="Describe a la clase para presentarla al grupo."
                    displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-3"
                    textClassName="block text-sm leading-relaxed text-slate-300 lg:max-w-3xl"
                  />
                  <div className="flex flex-wrap gap-2">
                    {editingClass.tags && editingClass.tags.length > 0 ? (
                      editingClass.tags.map((tag, index) => (
                        <div
                          key={`tag-${index}`}
                          className="group inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1"
                        >
                          <EditableField
                            value={tag}
                            onChange={(value) => handleTagChange(index, value)}
                            placeholder="Etiqueta"
                            displayClassName="flex-1 text-left"
                            textClassName="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-sky-100"
                            inputClassName="bg-slate-950/80 border-slate-700/60 text-[0.65rem] uppercase tracking-[0.3em]"
                            autoSelect={false}
                          />
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="rounded-full border border-transparent p-1 text-slate-400 transition hover:border-slate-500 hover:text-rose-300"
                            aria-label="Eliminar etiqueta"
                          >
                            <FiX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="rounded-full border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                        Añade etiquetas temáticas para clasificarla.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={addTag}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:border-sky-300 hover:text-sky-200"
                    >
                      <FiPlus className="h-3.5 w-3.5" />
                      Nueva etiqueta
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.38fr_1fr] xl:grid-cols-[0.32fr_1fr]">
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner shadow-slate-900/50">
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Secciones</div>
                  <div className="mt-4 flex flex-col gap-3">
                    {detailTabs.map((tab) => {
                      const isActive = tab.id === activeDetailTab;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDetailTab(tab.id)}
                          className={`group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                            isActive
                              ? 'border-sky-400/60 bg-sky-500/10 text-sky-100 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
                              : 'border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                          }`}
                        >
                          <span className="flex-1">{tab.label}</span>
                          <FiArrowRight
                            className={`h-4 w-4 transition-transform ${
                              isActive ? 'translate-x-1 text-sky-200' : 'text-slate-500 group-hover:translate-x-1'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner shadow-slate-900/50">
                  <div className="max-h-[520px] overflow-y-auto pr-3 md:max-h-[620px] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-500/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/40">
                    <div className="space-y-6 pb-2">
                      {renderDetailContent()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-6">
              <div className="flex flex-wrap justify-end gap-3">
                <Boton
                  color="indigo"
                  onClick={handleDiscardChanges}
                  disabled={!hasChanges}
                  className="uppercase tracking-[0.3em]"
                  icon={<FiRefreshCw className="h-4 w-4" />}
                >
                  Restablecer
                </Boton>
                <Boton
                  color="blue"
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || isSaving}
                  loading={isSaving}
                  className="uppercase tracking-[0.3em]"
                  icon={<FiSave className="h-4 w-4" />}
                >
                  Guardar cambios
                </Boton>
              </div>
              {saveStatus?.message && (
                <p
                  className={`text-sm ${
                    saveStatus.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                  role="status"
                >
                  {saveStatus.message}
                </p>
              )}
              <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60 shadow-[0_25px_55px_-25px_rgba(56,189,248,0.55)]">
                <div
                  className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden sm:max-w-[400px] xl:max-w-[420px] 2xl:max-w-[440px] lg:max-h-[520px] 2xl:max-h-[560px]"
                >
                  {editingClass.image ? (
                    <img
                      src={editingClass.image}
                      alt={`Retrato de ${editingClass.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-950/80">
                      <FiImage className="h-16 w-16 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{editingClass.name}</h3>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                          {editingClass.subtitle}
                        </p>
                      </div>
                      <RatingStars rating={editingClass.rating || 0} size="sm" onChange={handleRatingChange} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-6">
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Dificultad</div>
                      <EditableField
                        value={editingClass.difficulty}
                        onChange={(value) => handleGeneralFieldChange('difficulty', value)}
                        placeholder="Nivel de dificultad"
                        displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                        textClassName="text-sm font-semibold text-slate-100"
                        inputClassName="text-sm font-semibold text-slate-100"
                        autoSelect={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Dominio</div>
                      <EditableField
                        value={editingClass.mastery}
                        onChange={(value) => handleGeneralFieldChange('mastery', value)}
                        placeholder="Progreso de dominio"
                        displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                        textClassName="text-sm font-semibold text-slate-100"
                        inputClassName="text-sm font-semibold text-slate-100"
                        autoSelect={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Enfoque</div>
                      <EditableField
                        value={editingClass.focus}
                        onChange={(value) => handleGeneralFieldChange('focus', value)}
                        placeholder="Atributos clave"
                        displayClassName="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2"
                        textClassName="text-sm font-semibold text-slate-100"
                        inputClassName="text-sm font-semibold text-slate-100"
                        autoSelect={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Experiencia</div>
                      <EditableField
                        value={editingClass.xp !== undefined ? String(editingClass.xp) : ''}
                        onChange={(value) => handleGeneralFieldChange('xp', value)}
                        placeholder="XP requerida"
                        displayClassName="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2"
                        textClassName="text-sm font-semibold text-amber-200"
                        inputClassName="text-sm font-semibold text-amber-200"
                        autoSelect={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Fragmentos</div>
                      <EditableField
                        value={editingClass.shards !== undefined ? String(editingClass.shards) : ''}
                        onChange={(value) => handleGeneralFieldChange('shards', value)}
                        placeholder="Coste en fragmentos"
                        displayClassName="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2"
                        textClassName="text-sm font-semibold text-amber-200"
                        inputClassName="text-sm font-semibold text-amber-200"
                        autoSelect={false}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 text-xs text-slate-400">
                    <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Etiquetas</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editingClass.tags && editingClass.tags.length > 0 ? (
                        editingClass.tags.map((tag, index) => (
                          <span
                            key={`detail-${index}`}
                            className="rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200"
                          >
                            {tag || 'Sin etiqueta'}
                          </span>
                        ))
                      ) : (
                        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                          Aún no hay etiquetas asignadas.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Boton color="gray" onClick={closeClassDetails} className="uppercase tracking-[0.3em]">
                    Cerrar panel
                    </Boton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </Modal>

      <Modal
        isOpen={isCropping}
        onClose={handleCropCancel}
        title="Ajustar retrato"
        size="xl"
        footer={
          <>
            <Boton color="gray" onClick={handleCropCancel}>
              Cancelar
            </Boton>
            <Boton color="blue" onClick={handleCropSave}>
              Guardar recorte
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900">
            {cropperState.imageSrc ? (
              <Cropper
                image={cropperState.imageSrc}
                crop={cropperState.crop}
                zoom={cropperState.zoom}
                aspect={4 / 5}
                minZoom={0.3}
                maxZoom={6}
                onCropChange={(crop) => setCropperState((prev) => ({ ...prev, crop }))}
                onZoomChange={(zoom) => setCropperState((prev) => ({ ...prev, zoom }))}
                onCropComplete={handleCropComplete}
                restrictPosition
                objectFit="cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Selecciona una imagen para comenzar.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="zoom" className="text-xs uppercase tracking-[0.4em] text-slate-500">
              Zoom
            </label>
            <input
              id="zoom"
              type="range"
              min={0.3}
              max={6}
              step={0.05}
              value={cropperState.zoom}
              onChange={(event) =>
                setCropperState((prev) => ({ ...prev, zoom: Number(event.target.value) }))
              }
              className="accent-sky-400"
            />
          </div>
        </div>
      </Modal>
    </div>
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
