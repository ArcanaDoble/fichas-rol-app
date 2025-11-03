import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiTrash2, FiUsers } from 'react-icons/fi';
import { HiOutlineRefresh } from 'react-icons/hi';
import Boton from './Boton';
import Input from './Input';

const formatStatLabel = (key) => {
  if (!key) return 'Recurso';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const EncounterPanel = ({
  activeEncounter = [],
  onRemoveInstance,
  onResetEncounter,
  onUpdateInstanceStat,
  headerActions = null,
  title = 'Encuentro activo',
  subtitle,
  compact = false,
  className = '',
  showEmptyState = true,
}) => {
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

  useEffect(() => {
    if (groups.length === 0) {
      setOpenGroup(null);
      return;
    }
    if (!groups.some((group) => group.key === openGroup)) {
      setOpenGroup(groups[0]?.key ?? null);
    }
  }, [groups, openGroup]);

  const resolvedSubtitle = subtitle
    ? subtitle
    : activeEncounter.length > 0
    ? `${activeEncounter.length} instancia${activeEncounter.length === 1 ? '' : 's'} preparadas para combate`
    : 'El encuentro está vacío. Añade enemigos desde el catálogo para comenzar.';

  const containerPadding = compact ? 'p-4' : 'p-6';

  return (
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
                    <div className="flex flex-wrap gap-4">
                      {group.instances.map((instance) => {
                        const statEntries = Object.entries(instance.stats || {});
                        return (
                          <article
                            key={instance.id}
                            className="w-full max-w-sm flex-1 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/70 via-purple-900/40 to-black/60 p-4 shadow-lg shadow-black/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-purple-100">{instance.alias}</p>
                                <p className="text-xs text-purple-200/70">{instance.baseName}</p>
                              </div>
                              {onRemoveInstance && (
                                <Boton
                                  color="gray"
                                  size="sm"
                                  onClick={() => onRemoveInstance(instance.id)}
                                  className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100 hover:bg-red-500/30"
                                  icon={<FiTrash2 className="text-sm" />}
                                >
                                  Quitar
                                </Boton>
                              )}
                            </div>
                            {statEntries.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {statEntries.map(([statKey, statValue]) => (
                                  <div
                                    key={statKey}
                                    className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-3"
                                  >
                                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                      {formatStatLabel(statKey)}
                                    </span>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-purple-100">
                                      <label className="text-[11px] uppercase tracking-wide text-purple-300">
                                        Act
                                      </label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={statValue?.actual ?? 0}
                                        onChange={(event) =>
                                          onUpdateInstanceStat?.(
                                            instance.id,
                                            statKey,
                                            'actual',
                                            event.target.value,
                                          )
                                        }
                                        className="h-9 w-20 rounded-lg border border-purple-500/40 bg-purple-950/60 px-2 text-sm font-semibold text-purple-100 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                      />
                                      <span className="text-xs text-purple-300">/</span>
                                      <label className="text-[11px] uppercase tracking-wide text-purple-300">
                                        Max
                                      </label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={statValue?.total ?? 0}
                                        onChange={(event) =>
                                          onUpdateInstanceStat?.(
                                            instance.id,
                                            statKey,
                                            'total',
                                            event.target.value,
                                          )
                                        }
                                        className="h-9 w-20 rounded-lg border border-purple-500/40 bg-purple-950/60 px-2 text-sm font-semibold text-purple-100 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-xs text-purple-200/70">
                                Esta instancia no tiene estadísticas configuradas.
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
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
    }),
  ),
  onRemoveInstance: PropTypes.func,
  onResetEncounter: PropTypes.func,
  onUpdateInstanceStat: PropTypes.func,
  headerActions: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
  showEmptyState: PropTypes.bool,
};

export default EncounterPanel;
