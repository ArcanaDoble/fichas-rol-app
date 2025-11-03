import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiChevronUp, FiCopy, FiTrash2, FiUsers } from 'react-icons/fi';
import Boton from './Boton';

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
}) => {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [bulkTarget, setBulkTarget] = useState(null);

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
        estados: group.instances.reduce((acc, item) => acc + (item.activeStates?.length || 0), 0),
      },
    }));
  }, [instances]);

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

  const handleBulkAction = (group, action) => {
    if (!group) return;
    switch (action) {
      case 'damage-1':
        onApplyGroup(group, (instance) => {
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
        onApplyGroup(group, (instance) => {
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
        setBulkTarget(group);
        break;
      default:
        break;
    }
  };

  const handleBulkStateToggle = (group, state) => {
    if (!group || !state) return;
    onApplyGroup(
      group,
      (instance) => {
        const isActive = instance.activeStates?.includes(state);
        const nextActive = isActive
          ? instance.activeStates.filter((item) => item !== state)
          : [...(instance.activeStates || []), state];
        const pool = Array.from(new Set([...(instance.statePool || []), state]));
        return {
          ...instance,
          statePool: pool,
          activeStates: nextActive,
        };
      },
      `Estado ${state} en grupo`
    );
    setBulkTarget(null);
  };

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
                  return (
                    <div
                      key={instance.id}
                      className="rounded-xl border border-gray-700 bg-gray-900/90 p-4 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-100">{instance.displayName}</h3>
                          <p className="text-sm text-gray-400">
                            Estados activos: {instance.activeStates?.length || 0}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-indigo-600/60 text-white text-sm"
                            onClick={() => onOpenSheet(instance.baseId)}
                          >
                            Ver ficha completa
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-sky-600/60 text-white text-sm"
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
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {orderedStats.map((key) => {
                          const stat = instance.stats[key];
                          if (!stat) return null;
                          const handleDecrease = () => {
                            onAdjustStat(instance.id, key, -1);
                          };
                          const handleIncrease = () => {
                            onAdjustStat(instance.id, key, 1);
                          };
                          return (
                            <StatControl
                              key={key}
                              label={key.toUpperCase()}
                              value={stat}
                              onDecrease={handleDecrease}
                              onIncrease={handleIncrease}
                              accent={getAccentClass(key)}
                            />
                          );
                        })}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Estados</p>
                        <div className="flex flex-wrap gap-2">
                          {(instance.statePool || []).map((state) => {
                            const isActive = instance.activeStates?.includes(state);
                            return (
                              <button
                                key={state}
                                type="button"
                                onClick={() => onToggleState(instance.id, state)}
                                className={`px-3 py-1 rounded-full text-sm border transition ${
                                  isActive
                                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                                    : 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500'
                                }`}
                              >
                                {state}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              const label = window.prompt('Añadir estado personalizado');
                              if (label) {
                                onAddState(instance.id, label.trim());
                              }
                            }}
                            className="px-3 py-1 rounded-full bg-gray-700/70 text-sm text-gray-200 border border-dashed border-gray-500"
                          >
                            + Añadir estado
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {['weapons', 'armors', 'powers'].map((key) => {
                          const items = instance.equipment?.[key] || [];
                          if (items.length === 0) return null;
                          const title =
                            key === 'weapons'
                              ? 'Armas'
                              : key === 'armors'
                              ? 'Armaduras'
                              : 'Poderes';
                          return (
                            <div key={key}>
                              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{title}</p>
                              <div className="flex flex-wrap gap-2">
                                {items.map((item) => {
                                  const active = item.used;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => onToggleEquipment(instance.id, key, item.id)}
                                      className={`px-3 py-1 rounded-full text-sm transition border ${
                                        active
                                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                                          : 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500'
                                      }`}
                                    >
                                      {item.name}
                                    </button>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {bulkTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Estado para todo el grupo</h3>
            <p className="text-sm text-gray-400">Selecciona un estado existente o escribe uno nuevo para aplicarlo en bloque.</p>
            <div className="flex flex-wrap gap-2">
              {instances
                .filter((instance) => (instance.baseId || instance.baseName) === bulkTarget)
                .flatMap((instance) => instance.statePool || [])
                .filter((value, index, self) => self.indexOf(value) === index)
                .map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => handleBulkStateToggle(bulkTarget, state)}
                    className="px-3 py-1 rounded-full bg-emerald-600/60 text-white text-sm"
                  >
                    {state}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Estado personalizado"
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const value = event.currentTarget.value.trim();
                    if (value) {
                      handleBulkStateToggle(bulkTarget, value);
                    }
                  }
                }}
              />
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200"
                onClick={() => setBulkTarget(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
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
};

export default EncounterPanel;
