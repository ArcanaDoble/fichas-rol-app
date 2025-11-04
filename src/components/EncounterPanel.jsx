import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FiBatteryCharging,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiEdit3,
  FiExternalLink,
  FiInfo,
  FiMoreHorizontal,
  FiNavigation,
  FiShield,
  FiTarget,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import Boton from './Boton';
import EstadoSelector from './EstadoSelector';
import {
  catalogStates,
  normalizeStateEntry,
  normalizeStateList,
} from '../utils/stateUtils';

const RESOURCE_PRIORITY = ['vida', 'postura', 'cordura', 'ingenio', 'karma', 'armadura'];

const StatControl = ({
  label,
  value,
  onDecrease,
  onIncrease,
  accent,
}) => {
  const current = value?.actual ?? 0;
  const total = value?.total ?? value?.base ?? 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/70 border border-gray-700 px-3 py-2">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-100">
          {current}
          {Number.isFinite(total) && total > 0 ? (
            <span className="text-sm text-gray-400"> / {total}</span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          className={`h-10 w-10 rounded-full text-xl font-bold shadow-inner transition disabled:opacity-30 disabled:cursor-not-allowed ${accent}`}
          aria-label={`Restar ${label}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={onIncrease}
          className={`h-10 w-10 rounded-full text-xl font-bold shadow-inner transition disabled:opacity-30 disabled:cursor-not-allowed ${accent}`}
          aria-label={`Sumar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
};

StatControl.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.shape({
    base: PropTypes.number,
    buff: PropTypes.number,
    total: PropTypes.number,
    actual: PropTypes.number,
  }),
  onDecrease: PropTypes.func.isRequired,
  onIncrease: PropTypes.func.isRequired,
  accent: PropTypes.string,
};

const getAccentClass = (key) => {
  switch (key) {
    case 'vida':
      return 'bg-red-600/70 text-white hover:bg-red-500/80';
    case 'postura':
      return 'bg-emerald-600/70 text-white hover:bg-emerald-500/80';
    case 'cordura':
      return 'bg-purple-600/70 text-white hover:bg-purple-500/80';
    case 'ingenio':
      return 'bg-sky-600/70 text-white hover:bg-sky-500/80';
    case 'karma':
      return 'bg-amber-600/70 text-white hover:bg-amber-500/80';
    default:
      return 'bg-gray-600/70 text-white hover:bg-gray-500/80';
  }
};

const CATEGORY_LABELS = {
  weapons: 'Armas',
  armors: 'Armaduras',
  powers: 'Poderes',
};

const CATEGORY_ICONS = {
  weapons: FiTarget,
  armors: FiShield,
  powers: FiZap,
};

const EnemyActions = ({
  onManageStates,
  onCustomChange,
  onViewSheet,
  onDuplicate,
  onRemove,
}) => {
  const handleMenuAction = (callback) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (callback) {
      callback();
    }
    const details = event.currentTarget.closest('details');
    if (details) {
      details.open = false;
    }
  };

  return (
    <div className="flex w-full justify-end">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={onManageStates}
          className="flex items-center gap-2 rounded-full bg-emerald-500/80 px-3 py-1.5 font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
          title="Gestionar estados"
        >
          Gestionar estados
        </button>
        <details className="relative">
          <summary
            className="flex cursor-pointer items-center justify-center rounded-full p-2 text-gray-200 transition hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 [&::-webkit-details-marker]:hidden"
            aria-label="Más acciones"
            aria-haspopup="menu"
            title="Más acciones"
          >
            <FiMoreHorizontal className="text-lg" />
          </summary>
          <div className="absolute right-0 top-full mt-2 flex items-center gap-1 rounded-2xl border border-gray-700/70 bg-gray-900/95 p-2 text-base shadow-2xl z-20">
            <button
              type="button"
              onClick={handleMenuAction(onCustomChange)}
              className="rounded-xl p-2 text-gray-200 transition hover:bg-gray-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
              aria-label="Cambio personalizado"
              title="Cambio personalizado"
            >
              <FiEdit3 className="text-lg" />
            </button>
            <button
              type="button"
              onClick={handleMenuAction(onViewSheet)}
              className="rounded-xl p-2 text-gray-200 transition hover:bg-gray-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
              aria-label="Ver ficha completa"
              title="Ver ficha completa"
            >
              <FiExternalLink className="text-lg" />
            </button>
            <button
              type="button"
              onClick={handleMenuAction(onDuplicate)}
              className="rounded-xl p-2 text-gray-200 transition hover:bg-gray-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
              aria-label="Duplicar"
              title="Duplicar"
            >
              <FiCopy className="text-lg" />
            </button>
            <button
              type="button"
              onClick={handleMenuAction(onRemove)}
              className="rounded-xl p-2 text-rose-200 transition hover:bg-rose-600/40 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
              aria-label="Eliminar"
              title="Eliminar"
            >
              <FiTrash2 className="text-lg" />
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};

EnemyActions.propTypes = {
  onManageStates: PropTypes.func.isRequired,
  onCustomChange: PropTypes.func.isRequired,
  onViewSheet: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const EQUIPMENT_PRIMARY_STATS = {
  weapons: [
    { label: 'Daño', key: 'damage' },
    { label: 'Alcance', key: 'range' },
    { label: 'Consumo', key: 'cost' },
  ],
  powers: [
    { label: 'Daño', key: 'damage' },
    { label: 'Alcance', key: 'range' },
    { label: 'Consumo', key: 'cost' },
  ],
  armors: [
    {
      label: 'Defensa',
      key: 'defense',
      keys: ['defense', 'blocks'],
      type: 'defenseBlocks',
    },
  ],
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return value.toString().trim();
};

const MAX_DEFENSE_BLOCKS = 20;

const DEFENSE_FILLED_CHARS = new Set(['⬛', '■', '▪', '◼', '⚫']);
const DEFENSE_EMPTY_CHARS = new Set(['⬜', '□', '▫', '◻', '⚪']);

const clampBlockCount = (count) => {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(count, MAX_DEFENSE_BLOCKS));
};

const buildBlockVisual = (states, accessibleLabel) => {
  if (!states || states.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {states.map((state, index) => (
          <span
            key={`defense-block-${index}`}
            className={`inline-block h-3 w-3 rounded-[2px] border ${
              state === 'filled'
                ? 'bg-gray-200 border-gray-400 shadow-inner'
                : 'bg-gray-900 border-gray-700'
            }`}
          />
        ))}
      </span>
      <span className="sr-only">{accessibleLabel}</span>
    </span>
  );
};

const parseDefenseBlocks = (rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;

  if (typeof rawValue === 'number') {
    const count = clampBlockCount(Math.floor(rawValue));
    const states = Array.from({ length: count }, () => 'filled');
    return {
      states,
      accessibleLabel: count === 1 ? '1 bloque de defensa' : `${count} bloques de defensa`,
    };
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const current = clampBlockCount(parseInt(fractionMatch[1], 10));
      const total = clampBlockCount(parseInt(fractionMatch[2], 10));
      const limit = total || current;
      if (limit <= 0) {
        return {
          states: [],
          accessibleLabel: '0 bloques de defensa',
        };
      }
      const states = Array.from({ length: limit }, (_, index) =>
        index < Math.min(current, limit) ? 'filled' : 'empty'
      );
      return {
        states,
        accessibleLabel: `${Math.min(current, limit)} de ${limit} bloques de defensa`,
      };
    }

    if (/^\d+$/.test(trimmed)) {
      const count = clampBlockCount(parseInt(trimmed, 10));
      const states = Array.from({ length: count }, () => 'filled');
      return {
        states,
        accessibleLabel: count === 1 ? '1 bloque de defensa' : `${count} bloques de defensa`,
      };
    }

    const glyphs = Array.from(trimmed.replace(/\s+/g, ''));
    if (
      glyphs.length > 0 &&
      glyphs.every((char) => DEFENSE_FILLED_CHARS.has(char) || DEFENSE_EMPTY_CHARS.has(char))
    ) {
      const states = glyphs.map((char) =>
        DEFENSE_FILLED_CHARS.has(char) ? 'filled' : 'empty'
      );
      const filled = states.filter((state) => state === 'filled').length;
      return {
        states,
        accessibleLabel: `${filled} de ${states.length} bloques de defensa`,
      };
    }

    const firstNumber = trimmed.match(/(\d+)/);
    if (firstNumber) {
      const count = clampBlockCount(parseInt(firstNumber[1], 10));
      const states = Array.from({ length: count }, () => 'filled');
      return {
        states,
        accessibleLabel: count === 1 ? '1 bloque de defensa' : `${count} bloques de defensa`,
      };
    }

    return {
      states: [],
      accessibleLabel: trimmed,
    };
  }

  const description = toDisplayValue(rawValue);
  return {
    states: [],
    accessibleLabel: description || 'Defensa',
  };
};

const renderDefenseBlocks = (value) => {
  const parsed = parseDefenseBlocks(value);
  if (!parsed) return null;
  const { states, accessibleLabel } = parsed;
  if (!states || states.length === 0) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
    return value;
  }
  return buildBlockVisual(states, accessibleLabel);
};

const getEquipmentPrimaryStats = (category, details = {}) => {
  const entries = EQUIPMENT_PRIMARY_STATS[category] || [];
  return entries
    .map(({ label, key, keys, type }) => {
      const searchKeys = Array.isArray(keys) && keys.length > 0 ? keys : key ? [key] : [];
      let resolvedValue = '';
      let resolvedKey = key;

      for (const candidateKey of searchKeys) {
        const candidateValue = toDisplayValue(details[candidateKey]);
        if (candidateValue) {
          resolvedValue = candidateValue;
          resolvedKey = candidateKey;
          break;
        }
      }

      if (!resolvedValue) return null;
      return {
        label,
        value: resolvedValue,
        key: resolvedKey || key,
        type: type || null,
      };
    })
    .filter(Boolean);
};

const STAT_ICON_MAP = {
  damage: FiTarget,
  range: FiNavigation,
  cost: FiBatteryCharging,
  defense: FiShield,
  blocks: FiShield,
  defenseBlocks: FiShield,
};

const normalizeTraitList = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((value) => (value === null || value === undefined ? '' : value.toString().trim()))
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
};

const CustomChangeDialog = ({ instance, onSubmit, onClose }) => {
  const [statKey, setStatKey] = useState('');
  const [operation, setOperation] = useState('delta');
  const [value, setValue] = useState(1);
  const [category, setCategory] = useState('');
  const [itemId, setItemId] = useState('');
  const [markUsed, setMarkUsed] = useState('');
  const [note, setNote] = useState('');

  const statOptions = useMemo(() => Object.keys(instance?.stats || {}), [instance]);
  const equipmentCategories = useMemo(
    () =>
      ['weapons', 'armors', 'powers'].filter(
        (key) => (instance?.equipment?.[key] || []).length > 0
      ),
    [instance]
  );

  const selectedItems = instance?.equipment?.[category] || [];

  const handleSubmit = () => {
    const payload = {};
    let hasChanges = false;
    if (statKey) {
      payload.statChange = {
        statKey,
        type: operation === 'set' ? 'set' : 'delta',
        value,
      };
      hasChanges = true;
    }
    if (category && itemId) {
      const change = { category, itemId };
      if (markUsed === 'used') {
        change.markUsed = true;
      } else if (markUsed === 'available') {
        change.markUsed = false;
      }
      payload.equipmentChange = change;
      hasChanges = true;
    }
    if (note.trim()) {
      payload.note = note.trim();
      hasChanges = true;
    }
    if (hasChanges) {
      onSubmit(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-gray-900 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">Cambio personalizado</h3>
            <p className="text-sm text-gray-400">
              Ajusta valores concretos o registra notas rápidas para <strong>{instance?.displayName}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500">Estadística</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={statKey}
                onChange={(event) => setStatKey(event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
              >
                <option value="">Sin cambio</option>
                {statOptions.map((key) => (
                  <option key={key} value={key}>
                    {key.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={operation}
                onChange={(event) => setOperation(event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                disabled={!statKey}
              >
                <option value="delta">Sumar/restar</option>
                <option value="set">Establecer valor</option>
              </select>
              <input
                type="number"
                value={value}
                onChange={(event) => setValue(Number(event.target.value) || 0)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                disabled={!statKey}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500">Equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setItemId('');
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
              >
                <option value="">Sin cambio</option>
                {equipmentCategories.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                disabled={!category}
              >
                <option value="">Selecciona ítem</option>
                {selectedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={markUsed}
                onChange={(event) => setMarkUsed(event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                disabled={!category || !itemId}
              >
                <option value="">Alternar estado</option>
                <option value="used">Marcar como usado</option>
                <option value="available">Marcar disponible</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Nota rápida</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe el cambio aplicado"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 h-20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              handleSubmit();
              onClose();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

CustomChangeDialog.propTypes = {
  instance: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const StateManagerModal = ({
  title,
  description,
  activeStates,
  statePool,
  onToggle,
  onAddCustom,
  onClose,
}) => {
  const [customLabel, setCustomLabel] = useState('');

  const catalogSelected = useMemo(
    () => activeStates.filter((state) => state.source === 'catalog').map((state) => state.id),
    [activeStates]
  );

  const customStates = useMemo(
    () => statePool.filter((state) => state.source === 'custom'),
    [statePool]
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-gray-900 p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Estados estándar</p>
            <EstadoSelector
              selected={catalogSelected}
              onToggle={(stateId) => {
                const entry = catalogStates.find((state) => state.id === stateId);
                if (entry) {
                  onToggle(entry);
                }
              }}
            />
          </div>

          {customStates.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Estados personalizados</p>
              <div className="flex flex-wrap gap-2">
                {customStates.map((state) => {
                  const isActive = activeStates.some((entry) => entry.id === state.id);
                  return (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => onToggle(state)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                          : 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {state.icon ? (
                        <img src={state.icon} alt="" className="h-5 w-5 rounded-full" />
                      ) : null}
                      <span>{state.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customLabel}
              onChange={(event) => setCustomLabel(event.target.value)}
              placeholder="Añadir estado personalizado"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
            />
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              onClick={() => {
                const label = customLabel.trim();
                if (label) {
                  onAddCustom(label);
                  setCustomLabel('');
                }
              }}
            >
              Añadir estado
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

StateManagerModal.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  activeStates: PropTypes.arrayOf(PropTypes.object).isRequired,
  statePool: PropTypes.arrayOf(PropTypes.object).isRequired,
  onToggle: PropTypes.func.isRequired,
  onAddCustom: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
};

const normalizeHexColor = (value) => {
  if (typeof value !== 'string') return '#4b5563';
  let hex = value.trim();
  if (!hex) return '#4b5563';
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  const shortHexMatch = hex.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const fullHexMatch = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (fullHexMatch) {
    return `#${fullHexMatch[1].toLowerCase()}`;
  }
  return '#4b5563';
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);
  const value = normalized.slice(1);
  const intValue = parseInt(value, 16);
  return [
    (intValue >> 16) & 255,
    (intValue >> 8) & 255,
    intValue & 255,
  ];
};

const channelToHex = (value) => value.toString(16).padStart(2, '0');

const mixColors = (hex, mixHex, amount = 0.5) => {
  const mixAmount = clamp01(amount);
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(mixHex);
  const r = Math.round(r1 + (r2 - r1) * mixAmount);
  const g = Math.round(g1 + (g2 - g1) * mixAmount);
  const b = Math.round(b1 + (b2 - b1) * mixAmount);
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
};

const rgbToHsl = ([r, g, b]) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    switch (max) {
      case rNorm:
        hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
        break;
      case gNorm:
        hue = ((bNorm - rNorm) / delta + 2) * 60;
        break;
      default:
        hue = ((rNorm - gNorm) / delta + 4) * 60;
        break;
    }
  }

  const lightness = (max + min) / 2;
  let saturation = 0;
  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  }

  return [hue, clamp01(saturation), clamp01(lightness)];
};

const normalizeHue = (degrees) => {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const hslToRgb = ([h, s, l]) => {
  const hue = normalizeHue(h) / 360;
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToChannel = (t) => {
    let channel = t;
    if (channel < 0) channel += 1;
    if (channel > 1) channel -= 1;
    if (channel < 1 / 6) return p + (q - p) * 6 * channel;
    if (channel < 1 / 2) return q;
    if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
    return p;
  };

  const r = Math.round(hueToChannel(hue + 1 / 3) * 255);
  const g = Math.round(hueToChannel(hue) * 255);
  const b = Math.round(hueToChannel(hue - 1 / 3) * 255);
  return [r, g, b];
};

const hslToHex = (h, s, l) => {
  const [r, g, b] = hslToRgb([h, clamp01(s), clamp01(l)]);
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
};

const lightenColor = (hex, amount = 0.2) => mixColors(hex, '#ffffff', amount);

const darkenColor = (hex, amount = 0.2) => mixColors(hex, '#000000', amount);

const hexToRgba = (hex, alpha = 1) => {
  const [r, g, b] = hexToRgb(hex);
  const safeAlpha = Math.min(Math.max(alpha, 0), 1);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

const hashToUnit = (input) => {
  const str = String(input ?? '');
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(index);
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return (hash >>> 0) / 0xffffffff; // eslint-disable-line no-bitwise
};

const softenColor = (hex, amount = 0.25) => mixColors(hex, '#64748b', clamp01(amount));

const getRelativeLuminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getGroupThemeStyles = (themeColor = '#4b5563', overrides = {}) => {
  const base = normalizeHexColor(themeColor);
  const defaultConfig = {
    soften: 0.4,
    ambientBlend: 0.45,
    saturationScale: 0.65,
    saturationOffset: 0.08,
    minSaturation: 0.16,
    maxSaturation: 0.5,
    lightnessScale: 0.78,
    lightnessOffset: -0.04,
    minLightness: 0.18,
    maxLightness: 0.42,
    lightenSpread: 0.045,
    darkenSpread: 0.05,
    headerLift: 0.1,
    headerShade: 0.26,
    containerShadeStart: 0.2,
    containerShadeEnd: 0.34,
    instanceLift: 0.14,
    instanceShade: 0.32,
    chipLift: 0.2,
    chipEndLift: 0.12,
    borderShade: 0.28,
    headerBorderShade: 0.22,
    instanceBorderShade: 0.24,
    chipBorderShade: 0.18,
    variantHueShift: 10,
    variantSaturationJitter: 0.08,
    variantLightnessJitter: 0.06,
    variantKey: 'group',
    shadowOpacities: {
      container: { base: 0.26, expanded: 0.35 },
      header: { base: 0.25, expanded: 0.34 },
      instance: 0.24,
      chip: 0.16,
    },
  };

  const config = {
    ...defaultConfig,
    ...overrides,
    shadowOpacities: {
      container: {
        ...defaultConfig.shadowOpacities.container,
        ...(overrides.shadowOpacities?.container || {}),
      },
      header: {
        ...defaultConfig.shadowOpacities.header,
        ...(overrides.shadowOpacities?.header || {}),
      },
      instance:
        overrides.shadowOpacities?.instance ?? defaultConfig.shadowOpacities.instance,
      chip: overrides.shadowOpacities?.chip ?? defaultConfig.shadowOpacities.chip,
    },
  };

  const softenedBase = softenColor(base, config.soften);
  const ambientBase = mixColors(softenedBase, '#111827', config.ambientBlend);

  const tuneTone = (hex) => {
    const [h, s, l] = rgbToHsl(hexToRgb(hex));
    const tunedSaturation = clamp01(
      Math.min(
        config.maxSaturation,
        Math.max(
          config.minSaturation,
          s * config.saturationScale + config.saturationOffset
        )
      )
    );
    const tunedLightness = clamp01(
      Math.min(
        config.maxLightness,
        Math.max(
          config.minLightness,
          l * config.lightnessScale + config.lightnessOffset
        )
      )
    );
    return hslToHex(h, tunedSaturation, tunedLightness);
  };

  const tonedBase = tuneTone(ambientBase);

  const variantHueSeed = hashToUnit(`${tonedBase}-${config.variantKey}-h`);
  const variantSatSeed = hashToUnit(`${tonedBase}-${config.variantKey}-s`);
  const variantLightSeed = hashToUnit(`${tonedBase}-${config.variantKey}-l`);

  const variantBase = (() => {
    const [h, s, l] = rgbToHsl(hexToRgb(tonedBase));
    const hueShift = (variantHueSeed - 0.5) * config.variantHueShift;
    const saturationShift = (variantSatSeed - 0.5) * config.variantSaturationJitter;
    const lightnessShift = (variantLightSeed - 0.5) * config.variantLightnessJitter;
    const nextSaturation = clamp01(
      Math.min(
        config.maxSaturation,
        Math.max(config.minSaturation, s + saturationShift)
      )
    );
    const nextLightness = clamp01(
      Math.min(
        config.maxLightness,
        Math.max(config.minLightness, l + lightnessShift)
      )
    );
    return hslToHex(h + hueShift, nextSaturation, nextLightness);
  })();

  const adjustAmount = (amount, spread) => {
    const signedVariant = variantHueSeed * 2 - 1;
    return clamp01(amount + signedVariant * (spread ?? 0));
  };
  const lighten = (amount) =>
    lightenColor(variantBase, adjustAmount(amount, config.lightenSpread));
  const darken = (amount) =>
    darkenColor(variantBase, adjustAmount(amount, config.darkenSpread));

  const lifted = lighten(config.headerLift);
  const headerEnd = darken(config.headerShade);
  const containerStart = darken(config.containerShadeStart);
  const containerEnd = darken(config.containerShadeEnd);
  const instanceStart = lighten(config.instanceLift);
  const instanceEnd = darken(config.instanceShade);
  const chipStart = lighten(config.chipLift);
  const chipEnd = lighten(config.chipEndLift);
  const border = darken(config.borderShade);
  const headerBorder = darken(config.headerBorderShade);
  const instanceBorder = darken(config.instanceBorderShade);
  const chipBorder = darken(config.chipBorderShade);

  const luminance = getRelativeLuminance(headerEnd);
  const tone = luminance > 0.4 ? 'light' : 'dark';
  const text =
    tone === 'light'
      ? {
          main: 'text-slate-900',
          body: 'text-slate-900',
          subtle: 'text-slate-600',
          chip: 'text-slate-900',
          icon: 'text-slate-700',
        }
      : {
          main: 'text-slate-100',
          body: 'text-slate-100',
          subtle: 'text-slate-300',
          chip: 'text-slate-100',
          icon: 'text-slate-200',
        };

  return {
    text,
    styles: {
      container: {
        backgroundImage: `linear-gradient(160deg, ${containerStart}, ${containerEnd})`,
        borderColor: border,
      },
      header: {
        backgroundImage: `linear-gradient(135deg, ${lifted}, ${headerEnd})`,
        borderColor: headerBorder,
      },
      instance: {
        backgroundImage: `linear-gradient(150deg, ${instanceStart}, ${instanceEnd})`,
        borderColor: instanceBorder,
      },
      chip: {
        backgroundImage: `linear-gradient(135deg, ${chipStart}, ${chipEnd})`,
        borderColor: chipBorder,
      },
    },
    shadows: {
      container: {
        base: `0 20px 55px -32px ${hexToRgba(
          variantBase,
          config.shadowOpacities.container.base
        )}`,
        expanded: `0 32px 78px -30px ${hexToRgba(
          variantBase,
          config.shadowOpacities.container.expanded
        )}`,
      },
      header: {
        base: `0 18px 48px -32px ${hexToRgba(
          variantBase,
          config.shadowOpacities.header.base
        )}`,
        expanded: `0 26px 60px -28px ${hexToRgba(
          variantBase,
          config.shadowOpacities.header.expanded
        )}`,
      },
      instance: `0 18px 40px -32px ${hexToRgba(
        variantBase,
        config.shadowOpacities.instance
      )}`,
      chip: `0 14px 32px -26px ${hexToRgba(variantBase, config.shadowOpacities.chip)}`,
    },
  };
};

const EncounterPanel = ({
  instances,
  onAdjustStat,
  onToggleState,
  onAddState,
  onToggleEquipment,
  onDuplicate,
  onRemove,
  onApplyGroup,
  onClearEncounter,
  onOpenSheet,
  onCustomChange,
}) => {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [collapsedInstances, setCollapsedInstances] = useState(() => new Set());
  const [expandedEquipment, setExpandedEquipment] = useState({});
  const [stateModal, setStateModal] = useState(null);
  const [customChangeTarget, setCustomChangeTarget] = useState(null);

  const grouped = useMemo(() => {
    const groups = instances.reduce((acc, instance) => {
      const key = instance.baseId || instance.baseName;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          baseName: instance.baseName,
          themeColor: instance.baseReference?.themeColor || '#4b5563',
          instances: [],
        };
      }
      acc[key].instances.push(instance);
      return acc;
    }, {});
    return Object.values(groups).map((group) => ({
      ...group,
      summary: {
        vida: group.instances.reduce(
          (acc, item) => {
            const stat = item.stats?.vida;
            return {
              actual: acc.actual + (stat?.actual ?? 0),
              total: acc.total + (stat?.total ?? stat?.base ?? 0),
            };
          },
          { actual: 0, total: 0 }
        ),
        estados: group.instances.reduce(
          (acc, item) => acc + normalizeStateList(item.activeStates || []).length,
          0
        ),
      },
    }));
  }, [instances]);

  const instanceMap = useMemo(() => {
    const map = new Map();
    instances.forEach((instance) => {
      map.set(instance.id, instance);
    });
    return map;
  }, [instances]);

  const groupMap = useMemo(() => {
    const map = new Map();
    grouped.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [grouped]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleInstanceCollapse = (instanceId) => {
    setCollapsedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  const equipmentExpansionKey = (instanceId, category) => `${instanceId}:${category}`;

  const isEquipmentExpanded = (instanceId, category) =>
    Boolean(expandedEquipment[equipmentExpansionKey(instanceId, category)]);

  const toggleEquipmentSection = (instanceId, category) => {
    const key = equipmentExpansionKey(instanceId, category);
    setExpandedEquipment((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleBulkAction = (groupId, action) => {
    if (!groupId) return;
    switch (action) {
      case 'damage-1':
        onApplyGroup(groupId, (instance) => {
          const stat = instance.stats?.vida || {};
          const updated = Math.max(0, (stat.actual ?? stat.total ?? stat.base ?? 0) - 1);
          return {
            ...instance,
            stats: {
              ...instance.stats,
              vida: {
                ...stat,
                actual: updated,
              },
            },
          };
        }, 'Vida -1 a todo el grupo');
        break;
      case 'heal-1':
        onApplyGroup(groupId, (instance) => {
          const stat = instance.stats?.vida || {};
          const max = stat.total ?? stat.base ?? 0;
          const updated = Math.min(max, (stat.actual ?? max) + 1);
          return {
            ...instance,
            stats: {
              ...instance.stats,
              vida: {
                ...stat,
                actual: updated,
              },
            },
          };
        }, 'Vida +1 a todo el grupo');
        break;
      case 'toggle-state':
        setStateModal({ type: 'group', groupId });
        break;
      default:
        break;
    }
  };

  const handleGroupStateToggle = (groupId, state) => {
    const entry = normalizeStateEntry(state);
    if (!groupId || !entry) return;
    onApplyGroup(
      groupId,
      (instance) => {
        const pool = normalizeStateList([...(instance.statePool || []), entry]);
        const active = normalizeStateList(instance.activeStates || []);
        const isActive = active.some((item) => item.id === entry.id);
        const nextActive = isActive
          ? active.filter((item) => item.id !== entry.id)
          : normalizeStateList([...active, entry]);
        return {
          ...instance,
          statePool: pool,
          activeStates: nextActive,
        };
      },
      `Estado ${entry.label} alternado en grupo`
    );
  };

  const handleGroupStateAdd = (groupId, label) => {
    const entry = normalizeStateEntry(label);
    if (!groupId || !entry) return;
    onApplyGroup(
      groupId,
      (instance) => {
        const pool = normalizeStateList([...(instance.statePool || []), entry]);
        const active = normalizeStateList([...(instance.activeStates || []), entry]);
        return {
          ...instance,
          statePool: pool,
          activeStates: active,
        };
      },
      `Estado ${entry.label} añadido al grupo`
    );
  };

  const modalData = useMemo(() => {
    if (!stateModal) return null;
    if (stateModal.type === 'instance' && stateModal.instanceId) {
      const target = instanceMap.get(stateModal.instanceId);
      if (!target) return null;
      return {
        scope: 'instance',
        title: `Estados de ${target.displayName}`,
        description: 'Activa o desactiva estados táctiles para esta criatura. Los cambios se aplican al instante.',
        instances: [target],
      };
    }
    if (stateModal.type === 'group' && stateModal.groupId) {
      const group = groupMap.get(stateModal.groupId);
      if (!group) return null;
      const latestInstances = group.instances
        .map((item) => instanceMap.get(item.id) || item)
        .filter(Boolean);
      return {
        scope: 'group',
        groupId: stateModal.groupId,
        title: `Estados de ${group.baseName}`,
        description: 'Los estados seleccionados se aplicarán a todas las copias de esta criatura en el encuentro.',
        instances: latestInstances,
      };
    }
    return null;
  }, [stateModal, instanceMap, groupMap]);

  const modalActiveStates = useMemo(() => {
    if (!modalData) return [];
    return normalizeStateList(
      modalData.instances.flatMap((instance) => instance.activeStates || [])
    );
  }, [modalData]);

  const modalPoolStates = useMemo(() => {
    if (!modalData) return [];
    const fromInstances = normalizeStateList(
      modalData.instances.flatMap((instance) => instance.statePool || [])
    );
    const map = new Map();
    [...fromInstances, ...catalogStates].forEach((state) => {
      const entry = normalizeStateEntry(state);
      if (entry && entry.id) {
        map.set(entry.id, entry);
      }
    });
    return Array.from(map.values());
  }, [modalData]);

  const handleStateModalToggle = (state) => {
    if (!modalData) return;
    if (modalData.scope === 'instance') {
      const target = modalData.instances[0];
      onToggleState(target.id, state);
    } else if (modalData.scope === 'group' && modalData.groupId) {
      handleGroupStateToggle(modalData.groupId, state);
    }
  };

  const handleStateModalAdd = (label) => {
    if (!modalData) return;
    if (modalData.scope === 'instance') {
      const target = modalData.instances[0];
      onAddState(target.id, label);
    } else if (modalData.scope === 'group' && modalData.groupId) {
      handleGroupStateAdd(modalData.groupId, label);
    }
  };

  const customChangeInstance = customChangeTarget
    ? instanceMap.get(customChangeTarget)
    : null;

  if (instances.length === 0) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p className="text-lg">Aún no hay enemigos activos en el encuentro.</p>
        <p className="text-sm text-gray-500 mt-2">Añade enemigos desde el catálogo para gestionarlos desde aquí.</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p className="text-lg">Aún no hay enemigos activos en el encuentro.</p>
        <p className="text-sm text-gray-500 mt-2">Añade enemigos desde el catálogo para gestionarlos desde aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800/70 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3 text-gray-200">
          <FiUsers className="text-xl" />
          <div>
            <p className="text-sm uppercase tracking-widest text-gray-400">Encuentro activo</p>
            <p className="text-lg font-semibold">{instances.length} criaturas en juego</p>
          </div>
        </div>
        <Boton color="red" onClick={onClearEncounter}>
          Limpiar encuentro
        </Boton>
      </div>

      {grouped.map((group) => {
        const isExpanded = expandedGroups.has(group.id);
        const vidaSummary = group.summary.vida;
        const theme = getGroupThemeStyles(group.themeColor);
        return (
          <div
            key={group.id}
            className="rounded-2xl border overflow-hidden transition-shadow duration-200"
            style={{
              ...theme.styles.container,
              boxShadow: isExpanded
                ? theme.shadows.container.expanded
                : theme.shadows.container.base,
            }}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 text-left border transition-all duration-200 hover:brightness-105 ${theme.text.body}`}
              style={{
                ...theme.styles.header,
                boxShadow: isExpanded
                  ? theme.shadows.header.expanded
                  : theme.shadows.header.base,
              }}
            >
              <div>
                <p className={`text-xs uppercase tracking-widest ${theme.text.subtle}`}>
                  {group.instances.length} criaturas
                </p>
                <p className={`text-2xl font-semibold ${theme.text.main}`}>{group.baseName}</p>
                <p className={`text-sm mt-1 ${theme.text.subtle}`}>
                  Vida total restante: {vidaSummary.actual} / {vidaSummary.total}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBulkAction(group.id, 'damage-1');
                    }}
                    className="px-3 py-1 rounded-full bg-red-600/60 text-white text-sm"
                  >
                    -1 vida a todos
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBulkAction(group.id, 'heal-1');
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-600/60 text-white text-sm"
                  >
                    +1 vida a todos
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBulkAction(group.id, 'toggle-state');
                    }}
                    className="px-3 py-1 rounded-full bg-amber-600/60 text-white text-sm"
                  >
                    Estado global
                  </button>
                </div>
                {isExpanded ? (
                  <FiChevronUp className={`text-xl ${theme.text.icon}`} />
                ) : (
                  <FiChevronDown className={`text-xl ${theme.text.icon}`} />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 space-y-5">
                {group.instances.map((instance) => {
                  const statKeys = Object.keys(instance.stats || {});
                  const orderedStats = [
                    ...RESOURCE_PRIORITY.filter((key) => statKeys.includes(key)),
                    ...statKeys.filter((key) => !RESOURCE_PRIORITY.includes(key)),
                  ];
                  const statePool = normalizeStateList(instance.statePool || []);
                  const activeStates = normalizeStateList(instance.activeStates || []);
                  const isCollapsed = collapsedInstances.has(instance.id);
                  const instanceTheme = getGroupThemeStyles(group.themeColor, {
                    variantKey: `instance-${instance.id}`,
                    soften: 0.26,
                    lightenSpread: 0.12,
                    darkenSpread: 0.12,
                    variantHueShift: 18,
                    variantSaturationJitter: 0.12,
                    variantLightnessJitter: 0.08,
                    ambientBlend: 0.38,
                    instanceLift: 0.18,
                    instanceShade: 0.3,
                    chipLift: 0.26,
                    chipEndLift: 0.14,
                    chipBorderShade: 0.18,
                    borderShade: 0.24,
                    shadowOpacities: {
                      instance: 0.24,
                      chip: 0.16,
                    },
                  });
                  const summaryChips = orderedStats
                    .filter((key) =>
                      ['vida', 'postura', 'cordura', 'ingenio', 'karma', 'armadura'].includes(key)
                    )
                    .map((key) => {
                      const stat = instance.stats[key];
                      if (!stat) return null;
                      const current = stat.actual ?? stat.total ?? stat.base ?? 0;
                      const total = stat.total ?? stat.base ?? 0;
                      const label = key.toUpperCase();
                      const value = Number.isFinite(total) && total > 0 ? `${current} / ${total}` : `${current}`;
                      return { label, value };
                    })
                    .filter(Boolean)
                    .slice(0, 4);
                  return (
                    <div
                      key={instance.id}
                      className={`rounded-xl border p-4 space-y-4 transition-shadow duration-200 ${instanceTheme.text.body}`}
                      style={{
                        ...instanceTheme.styles.instance,
                        boxShadow: instanceTheme.shadows.instance,
                      }}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                        <div className="space-y-2">
                          <h3 className={`text-xl font-semibold ${instanceTheme.text.main}`}>
                            {instance.displayName}
                          </h3>
                          <div className={`flex flex-wrap items-center gap-2 text-xs ${instanceTheme.text.subtle}`}>
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-wide ${instanceTheme.text.chip}`}
                              style={{
                                ...instanceTheme.styles.chip,
                                boxShadow: instanceTheme.shadows.chip,
                              }}
                            >
                              Estados activos: {activeStates.length}
                            </span>
                            {summaryChips.map((chip) => (
                              <span
                                key={`${instance.id}-${chip.label}`}
                                className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-wide ${instanceTheme.text.chip}`}
                                style={{
                                  ...instanceTheme.styles.chip,
                                  boxShadow: instanceTheme.shadows.chip,
                                }}
                              >
                                <span className={`font-semibold ${instanceTheme.text.main}`}>
                                  {chip.label}:
                                </span>{' '}
                                {chip.value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {!isCollapsed && (
                            <EnemyActions
                              onManageStates={() =>
                                setStateModal({ type: 'instance', instanceId: instance.id })
                              }
                              onCustomChange={() => setCustomChangeTarget(instance.id)}
                              onViewSheet={() => onOpenSheet(instance.baseId)}
                              onDuplicate={() => onDuplicate(instance.id)}
                              onRemove={() => onRemove(instance.id)}
                            />
                          )}
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-gray-700/60 text-white text-sm"
                            onClick={() => toggleInstanceCollapse(instance.id)}
                          >
                            {isCollapsed ? 'Mostrar detalles' : 'Ocultar detalles'}
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {orderedStats.map((key) => {
                              const stat = instance.stats[key];
                              if (!stat) return null;
                              return (
                                <StatControl
                                  key={key}
                                  label={key.toUpperCase()}
                                  value={stat}
                                  onDecrease={() => onAdjustStat(instance.id, key, -1)}
                                  onIncrease={() => onAdjustStat(instance.id, key, 1)}
                                  accent={getAccentClass(key)}
                                />
                              );
                            })}
                          </div>

                          <div>
                            <p className={`text-xs uppercase tracking-widest mb-2 ${instanceTheme.text.subtle}`}>
                              Estados rápidos
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {statePool.map((state) => {
                                const entry = normalizeStateEntry(state);
                                if (!entry) return null;
                                const isActive = activeStates.some((item) => item.id === entry.id);
                                return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => onToggleState(instance.id, entry)}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                                      isActive
                                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                                        : 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500'
                                    }`}
                                  >
                                    {entry.icon ? (
                                      <img src={entry.icon} alt="" className="h-5 w-5 rounded-full" />
                                    ) : null}
                                    <span>{entry.label}</span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setStateModal({ type: 'instance', instanceId: instance.id })}
                                className="px-3 py-1 rounded-full bg-gray-700/70 text-sm text-gray-200 border border-dashed border-gray-500"
                              >
                                + Gestionar estados
                              </button>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {['weapons', 'armors', 'powers'].map((key) => {
                              const items = instance.equipment?.[key] || [];
                              if (items.length === 0) return null;

                              const normalizedItems = items.map((item) => {
                                const details = item.details || {};
                                const quickStats = getEquipmentPrimaryStats(key, details);
                                const traits = normalizeTraitList(details.traits);
                                const rows = [];
                                if (details.type && key !== 'armors') {
                                  rows.push({ label: 'Tipo', value: details.type });
                                }
                                if (details.weight) {
                                  rows.push({ label: 'Carga', value: details.weight });
                                }
                                return {
                                  ...item,
                                  details,
                                  quickStats,
                                  traits,
                                  rows,
                                };
                              });

                              const sectionId = equipmentExpansionKey(instance.id, key);
                              const isExpanded = isEquipmentExpanded(instance.id, key);
                              const CategoryIcon = CATEGORY_ICONS[key] || FiInfo;

                              return (
                                <div
                                  key={key}
                                  className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/40 shadow-2xl shadow-slate-950/30"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleEquipmentSection(instance.id, key)}
                                    className="flex w-full flex-col gap-5 px-6 py-5 text-left transition hover:bg-slate-900/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                                    aria-expanded={isExpanded}
                                    aria-controls={`${sectionId}-panel`}
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-4">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300 shadow-inner shadow-emerald-500/10">
                                          <CategoryIcon className="text-2xl" />
                                        </span>
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{CATEGORY_LABELS[key]}</p>
                                          <p className="text-lg font-semibold text-slate-100">
                                            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/70 text-slate-300 shadow-inner">
                                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                      </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {normalizedItems.map((itemData) => (
                                        <div
                                          key={`${itemData.id}-summary`}
                                          className={`flex min-h-[100px] flex-col justify-between gap-2 rounded-2xl border px-4 py-3 shadow-inner transition ${
                                            itemData.used
                                              ? 'border-amber-300/60 bg-amber-500/10 text-amber-50'
                                              : 'border-slate-700/70 bg-slate-950/60 text-slate-200'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold text-slate-100 truncate">{itemData.name}</p>
                                            {itemData.used ? (
                                              <span className="rounded-full border border-amber-300/60 bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100">
                                                En uso
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {itemData.quickStats.length > 0
                                              ? itemData.quickStats.map((stat) => {
                                                  const iconKey = stat.type === 'defenseBlocks' ? 'defenseBlocks' : stat.key;
                                                  const StatIcon = STAT_ICON_MAP[iconKey] || FiInfo;
                                                  const displayValue =
                                                    stat.type === 'defenseBlocks'
                                                      ? renderDefenseBlocks(stat.value) ?? stat.value
                                                      : stat.value;
                                                  return (
                                                    <span
                                                      key={`${itemData.id}-${stat.label}-summary`}
                                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-200"
                                                    >
                                                      <StatIcon className="text-sm text-emerald-300" />
                                                      <span className="font-semibold text-slate-100">{stat.label}:</span>
                                                      <span className="font-semibold text-slate-100">
                                                        {React.isValidElement(displayValue) ? displayValue : displayValue || '—'}
                                                      </span>
                                                    </span>
                                                  );
                                                })
                                              : (
                                                  <span className="text-xs text-slate-400">Sin datos rápidos</span>
                                                )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </button>
                                  <div
                                    id={`${sectionId}-panel`}
                                    className={`grid border-t border-slate-800/60 transition-[grid-template-rows] duration-300 ${
                                      isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                  >
                                    <div className="overflow-hidden">
                                      <div className="space-y-6 px-6 py-6">
                                        {normalizedItems.map((itemData) => {
                                          const toggleTitle = itemData.used ? 'Marcar como disponible' : 'Marcar como usado';
                                          return (
                                            <div
                                              key={itemData.id}
                                              className={`relative overflow-hidden rounded-3xl border px-6 py-6 shadow-xl transition ${
                                                itemData.used
                                                  ? 'border-amber-300/70 bg-amber-500/15 text-amber-50 shadow-amber-500/20'
                                                  : 'border-slate-700/70 bg-slate-950/55 text-slate-100 shadow-slate-950/40'
                                              }`}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => onToggleEquipment(instance.id, key, itemData.id)}
                                                className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border text-lg transition ${
                                                  itemData.used
                                                    ? 'border-amber-300/70 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                                                    : 'border-slate-600/70 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900/70 hover:text-slate-100'
                                                }`}
                                                title={toggleTitle}
                                                aria-label={toggleTitle}
                                              >
                                                {itemData.used ? <FiToggleRight /> : <FiToggleLeft />}
                                              </button>
                                              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                                <div className="space-y-5">
                                                  <div className="space-y-2">
                                                    <p className="text-xl font-semibold text-slate-100">{itemData.name}</p>
                                                    {itemData.details.description ? (
                                                      <p className="text-sm text-slate-300/90">{itemData.details.description}</p>
                                                    ) : null}
                                                  </div>
                                                  {itemData.traits.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                      {itemData.traits.map((trait) => (
                                                        <span
                                                          key={`${itemData.id}-${trait}`}
                                                          className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100 shadow-inner shadow-emerald-500/10"
                                                        >
                                                          {trait}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  ) : null}
                                                  {itemData.rows.length > 0 ? (
                                                    <div className="grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4 text-sm text-slate-200 shadow-inner">
                                                      {itemData.rows.map((row) => (
                                                        <div
                                                          key={`${itemData.id}-${row.label}`}
                                                          className="flex items-center justify-between gap-3"
                                                        >
                                                          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{row.label}</span>
                                                          <span className="font-semibold text-slate-100">{row.value}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                  {itemData.quickStats.length > 0 ? (
                                                    itemData.quickStats.map((stat) => {
                                                      const iconKey = stat.type === 'defenseBlocks' ? 'defenseBlocks' : stat.key;
                                                      const StatIcon = STAT_ICON_MAP[iconKey] || FiInfo;
                                                      const displayValue =
                                                        stat.type === 'defenseBlocks'
                                                          ? renderDefenseBlocks(stat.value) ?? stat.value
                                                          : stat.value;
                                                      return (
                                                        <div
                                                          key={`${itemData.id}-${stat.label}`}
                                                          className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/50 text-center shadow-inner"
                                                        >
                                                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 shadow-inner shadow-emerald-500/20">
                                                            <StatIcon className="text-2xl" />
                                                          </span>
                                                          <span className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
                                                            {stat.label}
                                                          </span>
                                                          <div className="text-sm font-semibold text-slate-100">
                                                            {React.isValidElement(displayValue) ? (
                                                              <span className="flex items-center justify-center gap-1">{displayValue}</span>
                                                            ) : (
                                                              displayValue || '—'
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })
                                                  ) : (
                                                    <div className="col-span-full flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/50 text-sm text-slate-400 shadow-inner">
                                                      <FiInfo className="text-xl" />
                                                      <span>Sin estadísticas rápidas</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {instance.history && instance.history.length > 0 && (
                            <div>
                              <p className={`text-xs uppercase tracking-widest mb-2 ${instanceTheme.text.subtle}`}>
                                Últimas acciones
                              </p>
                              <ul className={`space-y-1 text-xs ${instanceTheme.text.subtle}`}>
                                {instance.history.map((entry) => (
                                  <li key={entry.id}>
                                    {new Date(entry.timestamp).toLocaleTimeString()} · {entry.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {modalData && (
        <StateManagerModal
          title={modalData.title}
          description={modalData.description}
          activeStates={modalActiveStates}
          statePool={modalPoolStates}
          onToggle={handleStateModalToggle}
          onAddCustom={handleStateModalAdd}
          onClose={() => setStateModal(null)}
        />
      )}

      {customChangeInstance && (
        <CustomChangeDialog
          instance={customChangeInstance}
          onSubmit={(payload) => onCustomChange(customChangeInstance.id, payload)}
          onClose={() => setCustomChangeTarget(null)}
        />
      )}
    </div>
  );
};

EncounterPanel.propTypes = {
  instances: PropTypes.arrayOf(PropTypes.object).isRequired,
  onAdjustStat: PropTypes.func.isRequired,
  onToggleState: PropTypes.func.isRequired,
  onAddState: PropTypes.func.isRequired,
  onToggleEquipment: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onApplyGroup: PropTypes.func.isRequired,
  onClearEncounter: PropTypes.func.isRequired,
  onOpenSheet: PropTypes.func.isRequired,
  onCustomChange: PropTypes.func.isRequired,
};

export default EncounterPanel;
