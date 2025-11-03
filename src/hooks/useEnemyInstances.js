import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';

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

  const removeInstance = useCallback((instanceId) => {
    if (!instanceId) return;
    setActiveEncounter((prev) => prev.filter((instance) => instance.id !== instanceId));
  }, []);

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
        };
      }),
    );
  }, [enemies, ensureEnemy, resolveEnemy]);

  return {
    activeEncounter,
    addEnemiesToEncounter,
    updateInstanceStats,
    removeInstance,
    resetEncounter,
    setEncounter,
  };
};

export default useEnemyInstances;
