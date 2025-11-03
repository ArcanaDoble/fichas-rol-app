import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiEdit3,
  FiTrash2,
  FiUsers,
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
        return (
          <div key={group.id} className="rounded-2xl border border-gray-700 bg-gray-900/80 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 text-left hover:bg-gray-900/90 transition"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400">{group.instances.length} criaturas</p>
                <p className="text-2xl font-semibold text-gray-100">{group.baseName}</p>
                <p className="text-sm text-gray-400 mt-1">
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
                  <FiChevronUp className="text-xl text-gray-400" />
                ) : (
                  <FiChevronDown className="text-xl text-gray-400" />
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
                  return (
                    <div
                      key={instance.id}
                      className="rounded-xl border border-gray-700 bg-gray-900/90 p-4 space-y-4"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-100">{instance.displayName}</h3>
                          <p className="text-sm text-gray-400">
                            Estados activos: {activeStates.length}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-emerald-600/60 text-white text-sm"
                            onClick={() => setStateModal({ type: 'instance', instanceId: instance.id })}
                          >
                            Gestionar estados
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-indigo-600/60 text-white text-sm"
                            onClick={() => setCustomChangeTarget(instance.id)}
                          >
                            <FiEdit3 className="inline mr-1" /> Cambio personalizado
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-sky-600/60 text-white text-sm"
                            onClick={() => onOpenSheet(instance.baseId)}
                          >
                            Ver ficha completa
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-cyan-600/60 text-white text-sm"
                            onClick={() => onDuplicate(instance.id)}
                          >
                            <FiCopy className="inline mr-1" /> Duplicar
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-rose-600/60 text-white text-sm"
                            onClick={() => onRemove(instance.id)}
                          >
                            <FiTrash2 className="inline mr-1" /> Eliminar
                          </button>
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
                            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Estados rápidos</p>
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

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {['weapons', 'armors', 'powers'].map((key) => {
                              const items = instance.equipment?.[key] || [];
                              if (items.length === 0) return null;
                              return (
                                <div key={key}>
                                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{CATEGORY_LABELS[key]}</p>
                                  <div className="space-y-2">
                                    {items.map((item) => {
                                      const details = item.details || {};
                                      const traits = Array.isArray(details.traits)
                                        ? details.traits
                                        : [];
                                      const rows = [];
                                      if (key === 'armors') {
                                        if (details.blocks) rows.push({ label: 'Bloques', value: details.blocks });
                                      } else {
                                        if (details.damage) rows.push({ label: 'Daño', value: details.damage });
                                        if (details.range) rows.push({ label: 'Alcance', value: details.range });
                                        if (details.cost) rows.push({ label: 'Consumo', value: details.cost });
                                      }
                                      if (details.body) rows.push({ label: 'Cuerpo', value: details.body });
                                      if (details.mind) rows.push({ label: 'Mente', value: details.mind });
                                      if (details.type && key !== 'armors') rows.push({ label: 'Tipo', value: details.type });
                                      if (details.value) rows.push({ label: 'Valor', value: details.value });
                                      if (details.technology) rows.push({ label: 'Tecnología', value: details.technology });
                                      if (details.weight) rows.push({ label: 'Carga', value: details.weight });
                                      return (
                                        <div
                                          key={item.id}
                                          className={`rounded-xl border px-3 py-3 transition ${
                                            item.used
                                              ? 'border-amber-400/70 bg-amber-500/10 text-amber-100'
                                              : 'border-gray-700 bg-gray-800/40 text-gray-200'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-semibold">{item.name}</p>
                                              {details.description ? (
                                                <p className="mt-1 text-xs text-gray-300/80 italic">
                                                  {details.description}
                                                </p>
                                              ) : null}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => onToggleEquipment(instance.id, key, item.id)}
                                              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                                                item.used
                                                  ? 'border-amber-300 bg-amber-400/20 text-amber-50'
                                                  : 'border-gray-500 bg-gray-700/60 text-gray-200 hover:border-gray-400'
                                              }`}
                                            >
                                              {item.used ? 'Usado' : 'Disponible'}
                                            </button>
                                          </div>
                                          {rows.length > 0 && (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-200">
                                              {rows.map((row) => (
                                                <div key={`${item.id}-${row.label}`}>
                                                  <span className="font-semibold text-gray-100">{row.label}:</span> {row.value}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          {traits.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {traits.map((trait) => (
                                                <span
                                                  key={`${item.id}-${trait}`}
                                                  className="rounded-full border border-gray-500 bg-gray-800 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-200"
                                                >
                                                  {trait}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {instance.history && instance.history.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Últimas acciones</p>
                              <ul className="space-y-1 text-xs text-gray-400">
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
