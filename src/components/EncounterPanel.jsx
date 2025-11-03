import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  FiChevronDown,
  FiCopy,
  FiEye,
  FiMinus,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { HiOutlineRefresh } from 'react-icons/hi';
import Boton from './Boton';
import Input from './Input';
import ResourceBar from './ResourceBar';
import KarmaBar from './KarmaBar';
import EstadoSelector, { ESTADOS } from './EstadoSelector';
import Modal from './Modal';
import EnemyViewModal from './EnemyViewModal';
import { nanoid } from 'nanoid';

const STAT_COLORS = {
  vida: '#f87171',
  postura: '#34d399',
  cordura: '#a855f7',
  ingenio: '#60a5fa',
  armadura: '#9ca3af',
};

const PRIORITY_STATS = ['vida', 'postura', 'cordura', 'ingenio', 'armadura', 'karma'];
const MAX_HISTORY_ENTRIES = 3;

const pushHistoryEntry = (runtime = {}, entry) => {
  if (!entry) {
    return Array.isArray(runtime?.history) ? runtime.history : [];
  }
  const history = Array.isArray(runtime?.history) ? runtime.history : [];
  const normalized = {
    id: entry.id || nanoid(),
    timestamp: entry.timestamp || Date.now(),
    type: entry.type || 'custom',
    label: entry.label || 'Acción aplicada',
    payload: entry.payload || {},
  };
  return [...history.slice(-(MAX_HISTORY_ENTRIES - 1)), normalized];
};

const formatStatLabel = (key) => {
  if (!key) return 'Recurso';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const parseNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeStatValue = (value) => {
  if (value && typeof value === 'object') {
    const actual = parseNumber(
      value.actual ?? value.value ?? value.base ?? value.total,
      0,
    );
    const total = parseNumber(value.total ?? value.max ?? value.base, actual);
    const penalizacion = parseNumber(value.penalizacion ?? value.penalty, 0);
    const buff = parseNumber(value.buff ?? value.bonus, 0);
    const min = parseNumber(value.min, 0);
    const max = parseNumber(value.max, total || actual);
    return { actual, total, penalizacion, buff, min, max };
  }
  const numeric = parseNumber(value, 0);
  return {
    actual: numeric,
    total: numeric,
    penalizacion: 0,
    buff: 0,
    min: 0,
    max: numeric,
  };
};

const EncounterPanel = ({
  activeEncounter = [],
  onRemoveInstance,
  onResetEncounter,
  onUpdateInstanceStat,
  onUpdateInstance,
  onDuplicateInstance,
  onSyncInstance,
  headerActions = null,
  title = 'Encuentro activo',
  subtitle,
  compact = false,
  className = '',
  showEmptyState = true,
  rarityColorMap = {},
}) => {
  const estadoMap = useMemo(() => {
    return ESTADOS.reduce((acc, estado) => {
      acc[estado.id] = estado;
      return acc;
    }, {});
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map();
    activeEncounter.forEach((instance) => {
      if (!instance) return;
      const groupKey = instance.enemyId || instance.baseName || instance.alias || instance.id;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          baseName: instance.baseName || 'Enemigo',
          instances: [],
        });
      }
      grouped.get(groupKey).instances.push(instance);
    });
    return Array.from(grouped.values()).map((group) => ({
      ...group,
      instances: group.instances.sort((a, b) => {
        const aliasA = a.alias?.toLowerCase?.() || '';
        const aliasB = b.alias?.toLowerCase?.() || '';
        return aliasA.localeCompare(aliasB);
      }),
    }));
  }, [activeEncounter]);

  const [openGroup, setOpenGroup] = useState(groups[0]?.key ?? null);
  const [bulkGroup, setBulkGroup] = useState(null);
  const [stateSelectorTarget, setStateSelectorTarget] = useState(null);
  const [previewInstance, setPreviewInstance] = useState(null);
  const [customStateMenu, setCustomStateMenu] = useState({
    open: false,
    instanceId: null,
    x: 0,
    y: 0,
    value: '',
  });
  const updateHighlightTimeouts = useRef(new Map());
  const [recentUpdates, setRecentUpdates] = useState({});

  const customMenuStyle = useMemo(() => {
    if (!customStateMenu.open || typeof window === 'undefined') return {};
    const width = 280;
    const height = 180;
    const safeLeft = Math.max(
      12,
      Math.min(customStateMenu.x, window.innerWidth - width - 12),
    );
    const safeTop = Math.max(
      12,
      Math.min(customStateMenu.y, window.innerHeight - height - 12),
    );
    return { top: safeTop, left: safeLeft };
  }, [customStateMenu]);

  useEffect(() => {
    if (groups.length === 0) {
      setOpenGroup(null);
      setBulkGroup(null);
      return;
    }
    if (!groups.some((group) => group.key === openGroup)) {
      setOpenGroup(groups[0]?.key ?? null);
    }
    if (bulkGroup && !groups.some((group) => group.key === bulkGroup)) {
      setBulkGroup(null);
    }
  }, [groups, openGroup, bulkGroup]);

  useEffect(() => {
    if (!stateSelectorTarget) return;
    const nextInstance = activeEncounter.find(
      (instance) => instance.id === stateSelectorTarget.id,
    );
    if (!nextInstance) {
      setStateSelectorTarget(null);
      return;
    }
    if (nextInstance !== stateSelectorTarget) {
      setStateSelectorTarget(nextInstance);
    }
  }, [activeEncounter, stateSelectorTarget]);

  useEffect(() => {
    if (!previewInstance) return;
    const nextInstance = activeEncounter.find(
      (instance) => instance.id === previewInstance.id,
    );
    if (!nextInstance) {
      setPreviewInstance(null);
      return;
    }
    if (nextInstance !== previewInstance) {
      setPreviewInstance(nextInstance);
    }
  }, [activeEncounter, previewInstance]);

  const resolvedSubtitle = subtitle
    ? subtitle
    : activeEncounter.length > 0
    ? `${activeEncounter.length} instancia${activeEncounter.length === 1 ? '' : 's'} preparadas para combate`
    : 'El encuentro está vacío. Añade enemigos desde el catálogo para comenzar.';

  const containerPadding = compact ? 'p-4' : 'p-6';

  const registerStatUpdate = useCallback((instanceId, statKey) => {
    if (!instanceId || !statKey) return;
    const key = `${instanceId}:${statKey}`;
    setRecentUpdates((prev) => ({
      ...prev,
      [key]: Date.now(),
    }));
    if (updateHighlightTimeouts.current.has(key)) {
      clearTimeout(updateHighlightTimeouts.current.get(key));
    }
    const timeoutId = setTimeout(() => {
      setRecentUpdates((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      updateHighlightTimeouts.current.delete(key);
    }, 1000);
    updateHighlightTimeouts.current.set(key, timeoutId);
  }, []);

  const recordStatHistory = useCallback(
    (instanceId, statKey, previousActual, nextActual, total) => {
      if (!onUpdateInstance) return;
      if (!instanceId || !statKey) return;
      const prevValue = Number(previousActual);
      const nextValue = Number(nextActual);
      if (!Number.isFinite(prevValue) || !Number.isFinite(nextValue) || prevValue === nextValue) {
        return;
      }
      const totalValue = Number(total);
      onUpdateInstance(instanceId, (prev) => {
        const runtime = prev.runtime || {};
        const history = pushHistoryEntry(runtime, {
          type: 'stat',
          label: `${formatStatLabel(statKey)}: ${prevValue} → ${nextValue}`,
          payload: {
            statKey,
            prevActual: prevValue,
            prevTotal: Number.isFinite(totalValue) ? totalValue : undefined,
            nextActual: nextValue,
            nextTotal: Number.isFinite(totalValue) ? totalValue : undefined,
          },
        });
        return {
          runtime: {
            ...runtime,
            history,
          },
        };
      });
    },
    [onUpdateInstance],
  );

  useEffect(() => () => {
    updateHighlightTimeouts.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    updateHighlightTimeouts.current.clear();
  }, []);

  const handleToggleState = useCallback(
    (instance, stateId) => {
      if (!instance?.id || !stateId || !onUpdateInstance) return;
      onUpdateInstance(instance.id, (prev) => {
        const runtime = prev.runtime || {};
        const currentStates = new Set(runtime.states || []);
        const wasActive = currentStates.has(stateId);
        if (wasActive) {
          currentStates.delete(stateId);
        } else {
          currentStates.add(stateId);
        }
        const custom = (runtime.customStates || []).find((state) => state.id === stateId);
        const estado = estadoMap[stateId];
        const label =
          estado?.name || custom?.label || stateId.replace(/^custom:/, '');
        const history = pushHistoryEntry(runtime, {
          type: 'state',
          label: `${wasActive ? 'Estado retirado' : 'Estado aplicado'}: ${label}`,
          payload: {
            stateId,
            prevActive: wasActive,
            nextActive: !wasActive,
          },
        });
        return {
          runtime: {
            ...runtime,
            states: Array.from(currentStates),
            history,
          },
        };
      });
      onSyncInstance?.(instance.id);
    },
    [estadoMap, onSyncInstance, onUpdateInstance],
  );

  const handleToggleEquipment = useCallback(
    (instance, equipmentId) => {
      if (!instance?.id || !equipmentId || !onUpdateInstance) return;
      onUpdateInstance(instance.id, (prev) => {
        const runtime = prev.runtime || {};
        const previousEquipment = runtime.equipment || [];
        const targetItem = previousEquipment.find((item) => item.id === equipmentId);
        const wasActive = targetItem ? targetItem.active !== false : true;
        const updatedEquipment = previousEquipment.map((item) =>
          item.id === equipmentId ? { ...item, active: !wasActive } : item,
        );
        const history = pushHistoryEntry(runtime, {
          type: 'equipment',
          label: `${wasActive ? 'Equipo desactivado' : 'Equipo activado'}: ${
            targetItem?.label || equipmentId
          }`,
          payload: {
            equipmentId,
            prevActive: wasActive,
            nextActive: !wasActive,
          },
        });
        return {
          runtime: {
            ...runtime,
            equipment: updatedEquipment,
            history,
          },
        };
      });
      onSyncInstance?.(instance.id);
    },
    [onSyncInstance, onUpdateInstance],
  );

  const slugifyLabel = useCallback((value) => {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      || 'estado';
  }, []);

  const handleAddCustomState = useCallback(
    (instance, label) => {
      if (!instance?.id || !label || !onUpdateInstance) return;
      const trimmed = label.trim();
      if (!trimmed) return;
      onUpdateInstance(instance.id, (prev) => {
        const runtime = prev.runtime || {};
        const existingCustom = runtime.customStates || [];
        const existingIds = new Set([
          ...(runtime.states || []),
          ...existingCustom.map((state) => state.id),
        ]);
        const baseId = `custom:${slugifyLabel(trimmed)}`;
        let uniqueId = baseId;
        let counter = 1;
        while (existingIds.has(uniqueId)) {
          counter += 1;
          uniqueId = `${baseId}-${counter}`;
        }
        const history = pushHistoryEntry(runtime, {
          type: 'customState',
          label: `Estado creado: ${trimmed}`,
          payload: {
            stateId: uniqueId,
            label: trimmed,
          },
        });
        return {
          runtime: {
            ...runtime,
            customStates: [
              ...existingCustom,
              {
                id: uniqueId,
                label: trimmed,
              },
            ],
            states: Array.from(new Set([...(runtime.states || []), uniqueId])),
            history,
          },
        };
      });
      onSyncInstance?.(instance.id);
    },
    [onSyncInstance, onUpdateInstance, slugifyLabel],
  );

  const closeCustomStateMenu = useCallback(() => {
    setCustomStateMenu({
      open: false,
      instanceId: null,
      x: 0,
      y: 0,
      value: '',
    });
  }, []);

  const handleCustomStateValueChange = useCallback((nextValue) => {
    setCustomStateMenu((prev) => ({
      ...prev,
      value: nextValue,
    }));
  }, []);

  const handleCustomStateSubmit = useCallback(() => {
    if (!customStateMenu.instanceId) {
      closeCustomStateMenu();
      return;
    }
    const instance = activeEncounter.find(
      (item) => item.id === customStateMenu.instanceId,
    );
    if (instance) {
      handleAddCustomState(instance, customStateMenu.value);
    }
    closeCustomStateMenu();
  }, [
    activeEncounter,
    customStateMenu.instanceId,
    customStateMenu.value,
    handleAddCustomState,
    closeCustomStateMenu,
  ]);

  const handleUndoHistory = useCallback(
    (instance, entry) => {
      if (!instance?.id || !entry) return;
      const { type, payload } = entry;
      if (type === 'stat' && payload?.statKey) {
        if (payload.prevActual !== undefined) {
          onUpdateInstanceStat?.(
            instance.id,
            payload.statKey,
            'actual',
            payload.prevActual,
          );
          registerStatUpdate(instance.id, payload.statKey);
        }
        if (payload.prevTotal !== undefined) {
          onUpdateInstanceStat?.(
            instance.id,
            payload.statKey,
            'total',
            payload.prevTotal,
          );
        }
      } else if (type === 'state' && payload?.stateId) {
        onUpdateInstance?.(instance.id, (prev) => {
          const runtime = prev.runtime || {};
          const states = new Set(runtime.states || []);
          if (payload.prevActive) {
            states.add(payload.stateId);
          } else {
            states.delete(payload.stateId);
          }
          return {
            runtime: {
              ...runtime,
              states: Array.from(states),
            },
          };
        });
      } else if (type === 'equipment' && payload?.equipmentId) {
        onUpdateInstance?.(instance.id, (prev) => {
          const runtime = prev.runtime || {};
          const equipment = (runtime.equipment || []).map((item) =>
            item.id === payload.equipmentId
              ? { ...item, active: payload.prevActive }
              : item,
          );
          return {
            runtime: {
              ...runtime,
              equipment,
            },
          };
        });
      } else if (type === 'customState' && payload?.stateId) {
        onUpdateInstance?.(instance.id, (prev) => {
          const runtime = prev.runtime || {};
          const customStates = (runtime.customStates || []).filter(
            (state) => state.id !== payload.stateId,
          );
          const states = (runtime.states || []).filter(
            (stateId) => stateId !== payload.stateId,
          );
          return {
            runtime: {
              ...runtime,
              customStates,
              states,
            },
          };
        });
      }

      onUpdateInstance?.(instance.id, (prev) => {
        const runtime = prev.runtime || {};
        const history = Array.isArray(runtime.history)
          ? runtime.history.filter((item) => item.id !== entry.id)
          : [];
        return {
          runtime: {
            ...runtime,
            history,
          },
        };
      });
      onSyncInstance?.(instance.id);
    },
    [
      onSyncInstance,
      onUpdateInstance,
      onUpdateInstanceStat,
      registerStatUpdate,
    ],
  );

  useEffect(() => {
    if (!customStateMenu.open) return undefined;
    const handleClick = (event) => {
      if (event.target.closest?.('[data-custom-state-menu="true"]')) {
        return;
      }
      closeCustomStateMenu();
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeCustomStateMenu();
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [customStateMenu.open, closeCustomStateMenu]);

  return (
    <>
      <section
        className={`rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/60 via-black/40 to-purple-900/40 shadow-[0_18px_36px_rgba(88,28,135,0.35)] backdrop-blur ${containerPadding} space-y-5 ${className}`}
      >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-purple-100">{title}</h2>
          <p className="text-sm text-purple-200/80">{resolvedSubtitle}</p>
          {activeEncounter.length > 0 && (
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-300/80">
              <FiUsers className="text-base" />
              {groups.length} tipo{groups.length === 1 ? '' : 's'} en el campo de batalla
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {onResetEncounter && activeEncounter.length > 0 && (
            <Boton
              color="gray"
              size="sm"
              onClick={onResetEncounter}
              className="rounded-xl border border-purple-500/30 bg-purple-900/60 text-xs uppercase tracking-wide text-purple-100 hover:bg-purple-900/80"
              icon={<HiOutlineRefresh className="text-sm" />}
            >
              Vaciar encuentro
            </Boton>
          )}
        </div>
      </header>

      {activeEncounter.length === 0 && showEmptyState ? (
        <div className="rounded-2xl border border-dashed border-purple-500/30 bg-purple-900/10 p-6 text-center text-sm text-purple-200/80">
          No hay enemigos en el encuentro activo todavía. Usa el catálogo para añadir nuevas instancias.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const isOpen = openGroup === group.key;
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-2xl border border-purple-500/20 bg-black/40 shadow-inner shadow-purple-900/20"
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group.key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-purple-100 transition-colors hover:bg-purple-900/30"
                  aria-expanded={isOpen}
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold">
                      {group.baseName}
                      <span className="ml-2 text-sm font-normal text-purple-300/80">({group.instances.length})</span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-purple-300/70">
                      Tap/clic para desplegar
                    </span>
                  </div>
                  <FiChevronDown
                    className={`text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Boton
                          size="xs"
                          color={bulkGroup === group.key ? 'purple' : 'gray'}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                            bulkGroup === group.key
                              ? 'border-purple-400/60 bg-purple-500/20 text-purple-100'
                              : 'border-purple-500/20 bg-purple-950/40 text-purple-200/80 hover:border-purple-400/60'
                          }`}
                          onClick={() =>
                            setBulkGroup((current) => (current === group.key ? null : group.key))
                          }
                        >
                          {bulkGroup === group.key ? 'Aplicando a todos' : 'Aplicar a todos'}
                        </Boton>
                        {onDuplicateInstance && (
                          <Boton
                            size="xs"
                            color="gray"
                            className="rounded-full border border-purple-500/30 bg-purple-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-200/80 hover:border-purple-400/60"
                            icon={<FiCopy className="text-sm" />}
                            onClick={() => {
                              group.instances.forEach((instance) => {
                                onDuplicateInstance(instance.id);
                              });
                            }}
                          >
                            Duplicar grupo
                          </Boton>
                        )}
                        {onRemoveInstance && (
                          <Boton
                            size="xs"
                            color="gray"
                            className="rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100 hover:border-red-400/60"
                            icon={<FiTrash2 className="text-sm" />}
                            onClick={() => {
                              group.instances.forEach((instance) => {
                                onRemoveInstance(instance.id);
                              });
                            }}
                          >
                            Eliminar grupo
                          </Boton>
                        )}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {group.instances.map((instance) => {
                          const statEntries = Object.entries(instance.stats || {}).sort(
                            ([keyA], [keyB]) => {
                              const indexA = PRIORITY_STATS.indexOf(keyA);
                              const indexB = PRIORITY_STATS.indexOf(keyB);
                              if (indexA === -1 && indexB === -1) {
                                return keyA.localeCompare(keyB);
                              }
                              if (indexA === -1) return 1;
                              if (indexB === -1) return -1;
                              return indexA - indexB;
                            },
                          );
                          const runtime = instance.runtime || {
                            states: [],
                            customStates: [],
                            equipment: [],
                          };
                          const combinedStates = runtime.states || [];
                          const customStates = runtime.customStates || [];
                          const customStateMap = new Map(
                            customStates.map((state) => [state.id, state]),
                          );

                          return (
                            <article
                              key={instance.id}
                              className={`relative flex flex-col gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/70 via-purple-900/40 to-black/60 p-4 shadow-lg shadow-black/40 transition ${
                                bulkGroup === group.key
                                  ? 'ring-2 ring-purple-400/60'
                                  : 'hover:ring-1 hover:ring-purple-400/40'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-purple-100">{instance.alias}</p>
                                  <p className="text-xs text-purple-200/70">{instance.baseName}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {onDuplicateInstance && (
                                    <button
                                      type="button"
                                      onClick={() => onDuplicateInstance(instance.id)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/40 bg-purple-900/40 text-purple-100 transition hover:border-purple-300 hover:text-white"
                                      aria-label="Duplicar instancia"
                                    >
                                      <FiCopy className="text-sm" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewInstance(instance)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/40 bg-purple-900/40 text-purple-100 transition hover:border-purple-300 hover:text-white"
                                    aria-label="Ver ficha completa"
                                  >
                                    <FiEye className="text-sm" />
                                  </button>
                                  {onRemoveInstance && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveInstance(instance.id)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/40 bg-red-500/20 text-red-100 transition hover:border-red-300 hover:text-white"
                                      aria-label="Quitar instancia"
                                    >
                                      <FiTrash2 className="text-sm" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {statEntries.length > 0 ? (
                                <div className="grid gap-3">
                                  {statEntries.map(([statKey, statValue]) => {
                                    const normalized = normalizeStatValue(statValue);
                                    const statColor = STAT_COLORS[statKey] || '#c084fc';
                                    const isBulkHighlighted = !!recentUpdates[`${instance.id}:${statKey}`];
                                    const targets = bulkGroup === group.key ? group.instances : [instance];
                                    return (
                                      <div
                                        key={statKey}
                                        className={`rounded-xl border border-purple-500/40 bg-purple-950/40 p-3 transition ${
                                          isBulkHighlighted ? 'border-purple-300/80 bg-purple-900/60' : ''
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                              {formatStatLabel(statKey)}
                                            </p>
                                            <p className="text-lg font-semibold text-purple-100">
                                              {normalized.actual}
                                              {Number.isFinite(normalized.total) && (
                                                <span className="text-sm text-purple-300"> / {normalized.total}</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                targets.forEach((target) => {
                                                  const current = normalizeStatValue(target.stats?.[statKey]);
                                                  const next = Math.max(
                                                    current.min ?? 0,
                                                    current.actual - 1,
                                                  );
                                                  onUpdateInstanceStat?.(
                                                    target.id,
                                                    statKey,
                                                    'actual',
                                                    next,
                                                  );
                                                  registerStatUpdate(target.id, statKey);
                                                  recordStatHistory(
                                                    target.id,
                                                    statKey,
                                                    current.actual,
                                                    next,
                                                    current.total,
                                                  );
                                                  onSyncInstance?.(target.id);
                                                });
                                              }}
                                              className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/40 bg-purple-900/40 text-purple-100 transition hover:border-purple-300 hover:text-white"
                                              aria-label={`Reducir ${formatStatLabel(statKey)}`}
                                            >
                                              <FiMinus className="text-base" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                targets.forEach((target) => {
                                                  const current = normalizeStatValue(target.stats?.[statKey]);
                                                  const limit = Number.isFinite(current.total)
                                                    ? current.total
                                                    : current.max ?? current.total;
                                                  const next = Math.min(
                                                    Number.isFinite(limit) ? limit : current.actual + 1,
                                                    current.actual + 1,
                                                  );
                                                  onUpdateInstanceStat?.(
                                                    target.id,
                                                    statKey,
                                                    'actual',
                                                    next,
                                                  );
                                                  registerStatUpdate(target.id, statKey);
                                                  recordStatHistory(
                                                    target.id,
                                                    statKey,
                                                    current.actual,
                                                    next,
                                                    current.total,
                                                  );
                                                  onSyncInstance?.(target.id);
                                                });
                                              }}
                                              className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/40 bg-purple-900/40 text-purple-100 transition hover:border-purple-300 hover:text-white"
                                              aria-label={`Aumentar ${formatStatLabel(statKey)}`}
                                            >
                                              <FiPlus className="text-base" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2">
                                          {statKey === 'karma' ? (
                                            <KarmaBar
                                              value={normalized.actual}
                                              min={normalized.min}
                                              max={normalized.max}
                                              className="h-5"
                                            />
                                          ) : (
                                            <ResourceBar
                                              color={statColor}
                                              actual={Math.max(0, normalized.actual)}
                                              base={Math.max(0, normalized.total - normalized.buff)}
                                              buff={Math.max(0, normalized.buff)}
                                              penalizacion={Math.max(0, normalized.penalizacion)}
                                              max={Math.max(
                                                normalized.total + normalized.buff + normalized.penalizacion,
                                                normalized.actual,
                                                normalized.total,
                                                1,
                                              )}
                                            />
                                          )}
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-purple-300">
                                            <label className="uppercase tracking-wide">Actual</label>
                                            <Input
                                              type="number"
                                              value={normalized.actual}
                                              onChange={(event) => {
                                                onUpdateInstanceStat?.(
                                                  instance.id,
                                                  statKey,
                                                  'actual',
                                                  event.target.value,
                                                );
                                                registerStatUpdate(instance.id, statKey);
                                                onSyncInstance?.(instance.id);
                                              }}
                                              className="h-8 w-20 rounded-lg border border-purple-500/40 bg-purple-950/60 px-2 text-sm font-semibold text-purple-100 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                            />
                                            <span className="text-xs">/</span>
                                            <label className="uppercase tracking-wide">Máx</label>
                                            <Input
                                              type="number"
                                              value={normalized.total}
                                              onChange={(event) => {
                                                onUpdateInstanceStat?.(
                                                  instance.id,
                                                  statKey,
                                                  'total',
                                                  event.target.value,
                                                );
                                                onSyncInstance?.(instance.id);
                                              }}
                                              className="h-8 w-20 rounded-lg border border-purple-500/40 bg-purple-950/60 px-2 text-sm font-semibold text-purple-100 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-purple-200/70">
                                  Esta instancia no tiene estadísticas configuradas.
                                </p>
                              )}

                              <div
                                className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-3"
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  setCustomStateMenu({
                                    open: true,
                                    instanceId: instance.id,
                                    x: event.clientX,
                                    y: event.clientY,
                                    value: '',
                                  });
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                    Estados activos
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setStateSelectorTarget(instance)}
                                    className="rounded-full border border-purple-500/40 bg-purple-900/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-200 transition hover:border-purple-300 hover:text-white"
                                  >
                                    Gestionar
                                  </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {combinedStates.length === 0 && (
                                    <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-[11px] uppercase tracking-wide text-purple-300/80">
                                      Sin estados
                                    </span>
                                  )}
                                  {combinedStates.map((stateId) => {
                                    const estado = estadoMap[stateId];
                                    const custom = customStateMap.get(stateId);
                                    const label =
                                      estado?.name || custom?.label || stateId.replace(/^custom:/, '');
                                    return (
                                      <button
                                        key={stateId}
                                        type="button"
                                        onClick={() => handleToggleState(instance, stateId)}
                                        className={`group flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                          estado
                                            ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                                            : 'border-sky-400/40 bg-sky-500/20 text-sky-100'
                                        }`}
                                        title="Tocar para desactivar"
                                      >
                                        <span>{label}</span>
                                        <span className="text-xs opacity-70">×</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="mt-2 text-[10px] text-purple-300/70">
                                  Mantén pulsado o clic derecho para añadir estados personalizados rápidamente.
                                </p>
                              </div>

                              <div className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                  Equipo
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(runtime.equipment || []).length === 0 && (
                                    <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-[11px] uppercase tracking-wide text-purple-300/80">
                                      Sin equipo registrado
                                    </span>
                                  )}
                                  {(runtime.equipment || []).map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleToggleEquipment(instance, item.id)}
                                      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                        item.active
                                          ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                                          : 'border-gray-500/40 bg-gray-700/40 text-gray-300/80'
                                      }`}
                                      title={item.active ? 'Activo — tocar para desactivar' : 'Inactivo — tocar para activar'}
                                    >
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {Array.isArray(runtime.history) && runtime.history.length > 0 && (
                                <div className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                    Historial reciente
                                  </p>
                                  <ul className="mt-3 space-y-2">
                                    {[...runtime.history]
                                      .slice()
                                      .reverse()
                                      .map((entry) => (
                                        <li
                                          key={entry.id}
                                          className="flex items-start justify-between gap-3 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3 py-2 text-left"
                                        >
                                          <div className="flex-1">
                                            <p className="text-xs font-semibold text-purple-100">
                                              {entry.label}
                                            </p>
                                            <p className="text-[10px] text-purple-300/70">
                                              {new Date(entry.timestamp).toLocaleTimeString()}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleUndoHistory(instance, entry)}
                                            className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-900/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-100 transition hover:border-purple-300 hover:text-white"
                                          >
                                            <FiRotateCcw className="text-sm" />
                                            Deshacer
                                          </button>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </section>

      {customStateMenu.open && (
        <div
          data-custom-state-menu="true"
          className="fixed z-50 w-72 rounded-2xl border border-purple-500/40 bg-black/90 p-4 text-purple-100 shadow-2xl"
          style={customMenuStyle}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
            Añadir estado personalizado
          </p>
          <Input
            autoFocus
            value={customStateMenu.value}
            onChange={(event) => handleCustomStateValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCustomStateSubmit();
              }
            }}
            placeholder="Nombre del estado"
            className="mt-3 h-10 rounded-xl border border-purple-500/40 bg-purple-950/60 px-3 text-sm text-purple-100 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <div className="mt-3 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={closeCustomStateMenu}
              className="rounded-full border border-purple-500/30 px-3 py-1 text-purple-200 transition hover:border-purple-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCustomStateSubmit}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!stateSelectorTarget}
        onClose={() => setStateSelectorTarget(null)}
        title={
          stateSelectorTarget
            ? `Estados de ${stateSelectorTarget.alias || stateSelectorTarget.baseName || 'instancia'}`
            : 'Estados'
        }
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-purple-100/80">
            Toca cualquier estado para activarlo o desactivarlo al instante.
          </p>
          <EstadoSelector
            selected={stateSelectorTarget?.runtime?.states || []}
            onToggle={(stateId) => {
              if (!stateSelectorTarget) return;
              handleToggleState(stateSelectorTarget, stateId);
            }}
          />
          <p className="text-xs text-purple-200/70">
            Usa el menú contextual sobre la tarjeta para crear estados personalizados y mantenerlos sincronizados.
          </p>
        </div>
      </Modal>

      {previewInstance?.data && (
        <EnemyViewModal
          enemy={previewInstance.data}
          onClose={() => setPreviewInstance(null)}
          rarityColorMap={rarityColorMap}
        />
      )}
    </>
  );
};

EncounterPanel.propTypes = {
  activeEncounter: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      alias: PropTypes.string,
      baseName: PropTypes.string,
      enemyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      stats: PropTypes.object,
      runtime: PropTypes.shape({
        states: PropTypes.arrayOf(PropTypes.string),
        customStates: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string,
          }),
        ),
        equipment: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string,
            type: PropTypes.string,
            active: PropTypes.bool,
          }),
        ),
      }),
    }),
  ),
  onRemoveInstance: PropTypes.func,
  onResetEncounter: PropTypes.func,
  onUpdateInstanceStat: PropTypes.func,
  onUpdateInstance: PropTypes.func,
  onDuplicateInstance: PropTypes.func,
  onSyncInstance: PropTypes.func,
  headerActions: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
  showEmptyState: PropTypes.bool,
  rarityColorMap: PropTypes.object,
};

export default EncounterPanel;
