import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';

const slugify = (value) => {
  if (value === undefined || value === null) return 'item';
  return String(value)
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'item';
};

const toArray = (value) => {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  return [value];
};

const sanitizeStateId = (value) => {
  if (!value && value !== 0) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'object') {
    const source = value.id || value.name || value.label;
    if (!source) return null;
    return String(source).trim() || null;
  }
  return String(value).trim() || null;
};

const sanitizeStates = (states = []) => {
  const unique = new Set();
  toArray(states).forEach((raw) => {
    const id = sanitizeStateId(raw);
    if (id) {
      unique.add(id);
    }
  });
  return Array.from(unique);
};

const normalizeCustomStates = (customStates = []) => {
  const result = [];
  const seen = new Set();
  toArray(customStates).forEach((state) => {
    if (!state) return;
    const label = typeof state === 'string' ? state : state.label || state.name || state.id;
    if (!label) return;
    const cleanLabel = String(label).trim();
    if (!cleanLabel) return;
    const baseId = typeof state === 'object' && state.id ? String(state.id) : `custom:${slugify(cleanLabel)}`;
    let uniqueId = baseId;
    let counter = 1;
    while (seen.has(uniqueId)) {
      counter += 1;
      uniqueId = `${baseId}-${counter}`;
    }
    seen.add(uniqueId);
    result.push({ id: uniqueId, label: cleanLabel });
  });
  return result;
};

const buildEquipmentEntry = (item, type) => {
  if (!item) return null;
  const label =
    typeof item === 'string'
      ? item
      : item.nombre || item.name || item.titulo || item.label || item.id;
  if (!label) return null;
  const sourceId = typeof item === 'object' && item.id ? item.id : label;
  return {
    id: `${type}:${slugify(sourceId)}`,
    label: String(label).trim(),
    type,
    active: true,
  };
};

const buildEquipmentFromEnemy = (enemy) => {
  if (!enemy) return [];
  const equipment = [];
  toArray(enemy.armas).forEach((item) => {
    const entry = buildEquipmentEntry(item, 'arma');
    if (entry) equipment.push(entry);
  });
  toArray(enemy.armaduras).forEach((item) => {
    const entry = buildEquipmentEntry(item, 'armadura');
    if (entry) equipment.push(entry);
  });
  toArray(enemy.poderes).forEach((item) => {
    const entry = buildEquipmentEntry(item, 'poder');
    if (entry) equipment.push(entry);
  });
  return equipment;
};

const mergeEquipment = (runtimeEquipment = [], baseEquipment = []) => {
  const map = new Map();
  baseEquipment.forEach((item) => {
    map.set(item.id, { ...item });
  });

  toArray(runtimeEquipment).forEach((item) => {
    if (!item || !item.id) return;
    const normalized = {
      ...item,
      active: item.active !== false,
    };
    if (map.has(item.id)) {
      map.set(item.id, { ...map.get(item.id), ...normalized });
    } else {
      map.set(item.id, normalized);
    }
  });

  return Array.from(map.values());
};

const ensureRuntime = (runtime, enemy) => {
  const enemyStates = sanitizeStates(enemy?.estados || []);
  const hasRuntimeStates = runtime && Object.prototype.hasOwnProperty.call(runtime, 'states');
  const runtimeStates = hasRuntimeStates ? sanitizeStates(runtime?.states || []) : enemyStates;
  const customStates = normalizeCustomStates(runtime?.customStates || []);
  const customStateIds = customStates.map((state) => state.id);
  const combinedStates = hasRuntimeStates
    ? [...runtimeStates, ...customStateIds]
    : [...enemyStates, ...runtimeStates, ...customStateIds];
  const states = sanitizeStates(combinedStates);
  const baseEquipment = buildEquipmentFromEnemy(enemy);
  const equipment = mergeEquipment(runtime?.equipment, baseEquipment);
  return {
    states,
    customStates,
    equipment,
  };
};

const mergeRuntime = (currentRuntime, nextRuntime, enemy) => {
  if (!nextRuntime) {
    return ensureRuntime(currentRuntime, enemy);
  }
  const ensuredCurrent = ensureRuntime(currentRuntime, enemy);
  const ensuredNext = ensureRuntime(
    { ...ensuredCurrent, ...nextRuntime },
    enemy,
  );
  return {
    ...ensuredCurrent,
    ...ensuredNext,
  };
};

const cloneStats = (stats) => {
  if (!stats || typeof stats !== 'object') {
    return {};
  }
  return Object.entries(stats).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = { ...value };
    } else {
      acc[key] = { actual: value ?? 0, total: value ?? 0 };
    }
    return acc;
  }, {});
};

const normalizeQuantity = (quantity) => {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.floor(numeric));
};

const ensureFunction = (fn) => (typeof fn === 'function' ? fn : (value) => value);

const resolveSourceId = (enemy) => {
  if (!enemy) return 'enemy';
  if (enemy.id !== undefined && enemy.id !== null) {
    return String(enemy.id);
  }
  if (enemy.name) {
    return `enemy:${enemy.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
  }
  return 'enemy';
};

const resolveAliasBase = (enemy) => enemy?.alias || enemy?.name || 'Enemigo';

const useEnemyInstances = (enemies = [], ensureEnemyDefaults) => {
  const [activeEncounter, setActiveEncounter] = useState([]);
  const aliasCounters = useRef({});
  const ensureEnemy = useMemo(() => ensureFunction(ensureEnemyDefaults), [ensureEnemyDefaults]);

  const findEnemyById = useCallback(
    (id) => {
      if (id === undefined || id === null) return null;
      const idStr = String(id);
      return enemies.find((enemy) => enemy && String(enemy.id) === idStr) || null;
    },
    [enemies],
  );

  const resolveEnemy = useCallback(
    (source) => {
      if (!source) return null;
      if (typeof source === 'string' || typeof source === 'number') {
        return findEnemyById(source);
      }
      if (typeof source === 'object') {
        if (source.id !== undefined && source.id !== null) {
          return findEnemyById(source.id) || source;
        }
        return source;
      }
      return null;
    },
    [findEnemyById],
  );

  const addEnemiesToEncounter = useCallback(
    (source, quantity = 1) => {
      const normalizedQuantity = normalizeQuantity(quantity);
      const baseEnemy = resolveEnemy(source);
      if (!baseEnemy) {
        return [];
      }
      const ensuredEnemy = ensureEnemy(baseEnemy);
      const sourceId = resolveSourceId(ensuredEnemy);
      const createdInstances = [];

      setActiveEncounter((prev) => {
        const next = [...prev];
        for (let i = 0; i < normalizedQuantity; i += 1) {
          const instanceId = nanoid();
          const currentCount = aliasCounters.current[sourceId] || 0;
          const nextCount = currentCount + 1;
          aliasCounters.current[sourceId] = nextCount;

          const aliasBase = resolveAliasBase(ensuredEnemy);
          const alias = `${aliasBase} #${nextCount}`;
          const stats = cloneStats(ensuredEnemy.stats);

          const instance = {
            id: instanceId,
            enemyId: sourceId,
            alias,
            baseName: ensuredEnemy.name || aliasBase,
            stats,
            runtime: ensureRuntime(null, ensuredEnemy),
            data: ensuredEnemy,
            createdAt: Date.now(),
          };

          createdInstances.push(instance);
          next.push(instance);
        }
        return next;
      });

      return createdInstances;
    },
    [ensureEnemy, resolveEnemy],
  );

  const updateInstanceStats = useCallback((instanceId, arg1, arg2) => {
    if (!instanceId) return;
    setActiveEncounter((prev) =>
      prev.map((instance) => {
        if (instance.id !== instanceId) return instance;
        const previousStats = instance.stats || {};

        if (typeof arg1 === 'function') {
          const nextStats = arg1(previousStats);
          return {
            ...instance,
            stats: { ...previousStats, ...cloneStats(nextStats) },
          };
        }

        if (typeof arg1 === 'string') {
          const statKey = arg1;
          const currentStat = previousStats[statKey] || {};
          const nextValue =
            typeof arg2 === 'function'
              ? arg2(currentStat)
              : { ...currentStat, ...(arg2 && typeof arg2 === 'object' ? arg2 : {}) };

          return {
            ...instance,
            stats: {
              ...previousStats,
              [statKey]: { ...currentStat, ...(nextValue || {}) },
            },
          };
        }

        if (arg1 && typeof arg1 === 'object') {
          const partial = arg1;
          const mergedStats = { ...previousStats };
          Object.entries(partial).forEach(([key, value]) => {
            const currentStat = previousStats[key] || {};
            const nextValue =
              typeof value === 'function'
                ? value(currentStat)
                : { ...currentStat, ...(value && typeof value === 'object' ? value : {}) };
            mergedStats[key] = { ...currentStat, ...(nextValue || {}) };
          });
          return {
            ...instance,
            stats: mergedStats,
          };
        }

        return instance;
      }),
    );
  }, []);

  const updateInstance = useCallback((instanceId, updater) => {
    if (!instanceId || !updater) return;
    setActiveEncounter((prev) =>
      prev.map((instance) => {
        if (instance.id !== instanceId) return instance;
        const patch = typeof updater === 'function' ? updater(instance) : updater;
        if (!patch) return instance;
        const nextInstance = { ...instance, ...patch };
        nextInstance.runtime = mergeRuntime(instance.runtime, patch.runtime, nextInstance.data);
        return nextInstance;
      }),
    );
  }, []);

  const removeInstance = useCallback((instanceId) => {
    if (!instanceId) return;
    setActiveEncounter((prev) => prev.filter((instance) => instance.id !== instanceId));
  }, []);

  const duplicateInstance = useCallback(
    (instanceId) => {
      if (!instanceId) return null;
      const source = activeEncounter.find((instance) => instance.id === instanceId);
      if (!source) return null;
      const baseEnemy = resolveEnemy(source.enemyId) || source.data;
      if (!baseEnemy) return null;
      const created = addEnemiesToEncounter(baseEnemy, 1);
      const duplicated = created?.[0] || null;
      if (duplicated && source.runtime) {
        setActiveEncounter((prev) =>
          prev.map((instance) =>
            instance.id === duplicated.id
              ? {
                  ...instance,
                  runtime: mergeRuntime(instance.runtime, source.runtime, instance.data),
                }
              : instance,
          ),
        );
      }
      return duplicated;
    },
    [activeEncounter, resolveEnemy, addEnemiesToEncounter],
  );

  const resetEncounter = useCallback(() => {
    aliasCounters.current = {};
    setActiveEncounter([]);
  }, []);

  const setEncounter = useCallback(
    (instances = []) => {
      const normalized = [];
      const nextCounters = {};

      instances.forEach((rawInstance) => {
        const resolvedEnemy =
          resolveEnemy(rawInstance.enemyId) || resolveEnemy(rawInstance.data) || rawInstance.data || rawInstance;
        const ensuredEnemy = ensureEnemy(resolvedEnemy);
        const sourceId = resolveSourceId(ensuredEnemy);
        const aliasBase = resolveAliasBase(ensuredEnemy);
        const currentCount = nextCounters[sourceId] || 0;
        const nextCount = currentCount + 1;
        nextCounters[sourceId] = nextCount;

        normalized.push({
          id: rawInstance.id || nanoid(),
          enemyId: sourceId,
          alias: rawInstance.alias || `${aliasBase} #${nextCount}`,
          baseName: ensuredEnemy.name || aliasBase,
          stats: cloneStats(rawInstance.stats || ensuredEnemy.stats),
          runtime: ensureRuntime(rawInstance.runtime, ensuredEnemy),
          data: ensuredEnemy,
          createdAt: rawInstance.createdAt || Date.now(),
        });
      });

      aliasCounters.current = nextCounters;
      setActiveEncounter(normalized);
    },
    [ensureEnemy, resolveEnemy],
  );

  useEffect(() => {
    setActiveEncounter((prev) =>
      prev.map((instance) => {
        const updatedEnemy = resolveEnemy(instance.enemyId);
        if (!updatedEnemy) {
          return instance;
        }
        const ensuredEnemy = ensureEnemy(updatedEnemy);
        return {
          ...instance,
          data: ensuredEnemy,
          runtime: ensureRuntime(instance.runtime, ensuredEnemy),
        };
      }),
    );
  }, [enemies, ensureEnemy, resolveEnemy]);

  return {
    activeEncounter,
    addEnemiesToEncounter,
    updateInstanceStats,
    updateInstance,
    removeInstance,
    duplicateInstance,
    resetEncounter,
    setEncounter,
  };
};

export default useEnemyInstances;
