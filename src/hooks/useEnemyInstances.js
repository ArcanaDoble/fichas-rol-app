import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { normalizeStateList } from '../utils/stateUtils';

const DEFAULT_STORAGE_KEY = 'masterActiveEncounter';

const toSafeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeStat = (value) => {
  if (!value || typeof value !== 'object') {
    const numeric = toSafeNumber(value, 0);
    return {
      base: numeric,
      buff: 0,
      total: numeric,
      actual: numeric,
    };
  }
  const base = toSafeNumber(value.base, 0);
  const buff = toSafeNumber(value.buff, 0);
  const total = toSafeNumber(value.total, base + buff);
  const actual = toSafeNumber(value.actual, total);
  return {
    base,
    buff,
    total,
    actual,
  };
};

const normalizeTraits = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((value) => value && value.toString().trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeEquipmentEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const name = entry.trim();
    if (!name) return null;
    return {
      id: nanoid(),
      name,
      used: false,
      details: {
        damage: '',
        range: '',
        cost: '',
        traits: [],
        blocks: '',
        body: '',
        mind: '',
        type: '',
        value: '',
        description: '',
        raw: null,
      },
    };
  }

  if (typeof entry === 'object') {
    const name = entry.nombre || entry.name || '';
    if (!name) return null;
    const traits = normalizeTraits(entry.rasgos || entry.traits);
    return {
      id: entry.id || nanoid(),
      name,
      used: Boolean(entry.used),
      details: {
        damage: entry.dano || entry.daño || entry.damage || entry.poder || '',
        range: entry.alcance || entry.range || '',
        cost: entry.consumo || entry.cost || entry.coste || '',
        traits,
        blocks:
          entry.bloques ||
          entry.bloquesArmadura ||
          entry.bloque ||
          entry.bloqueo ||
          entry.bloquesDefensa ||
          '',
        body: entry.cuerpo || entry.cargaFisica || entry.carga || '',
        mind: entry.mente || entry.cargaMental || '',
        type: entry.tipoDano || entry.tipo || '',
        value: entry.valor || '',
        description: entry.descripcion || entry.description || '',
        technology: entry.tecnologia || entry.technology || '',
        weight: entry.peso || '',
        raw: entry,
      },
    };
  }

  return null;
};

const mapEquipment = (list = []) =>
  list
    .map((entry) => normalizeEquipmentEntry(entry))
    .filter((item) => item && item.name);

const pushHistoryEntry = (history, description) => {
  if (!description) return history || [];
  const next = [
    {
      id: nanoid(),
      description,
      timestamp: Date.now(),
    },
    ...(history || []),
  ];
  return next.slice(0, 3);
};

const normalizeStatePool = (states = []) => normalizeStateList(states);

const createStatePool = (enemy) => {
  const states = [];
  if (enemy?.estados) {
    if (Array.isArray(enemy.estados)) {
      states.push(...enemy.estados);
    } else if (typeof enemy.estados === 'string') {
      states.push(
        ...enemy.estados
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      );
    }
  }
  return normalizeStatePool(states);
};

const makeInstanceFromEnemy = ({ enemy, ensureEnemyDefaults, index = 0, existingCount = 0 }) => {
  const normalized = ensureEnemyDefaults ? ensureEnemyDefaults(enemy) : enemy;
  const statsEntries = Object.entries(normalized?.stats || {});
  const stats = statsEntries.reduce((acc, [key, value]) => {
    acc[key] = normalizeStat(value);
    return acc;
  }, {});

  const baseName = normalized?.name || 'Enemigo';
  const serial = existingCount + index + 1;
  const statePool = createStatePool(normalized);

  return {
    id: nanoid(),
    baseId: normalized?.id || null,
    baseName,
    displayName: `${baseName} #${serial}`,
    baseReference: {
      id: normalized?.id || null,
      tokenSheetId: normalized?.tokenSheetId || null,
      enemyId: normalized?.enemyId || normalized?.id || null,
      themeColor: normalized?.themeColor || null,
    },
    stats,
    statePool,
    activeStates: [...statePool],
    customStates: statePool.filter((state) => state?.source === 'custom'),
    equipment: {
      weapons: mapEquipment(normalized?.weapons),
      armors: mapEquipment(normalized?.armaduras),
      powers: mapEquipment(normalized?.poderes),
    },
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

const reviveInstance = (instance) => {
  if (!instance) return instance;
  return {
    ...instance,
    equipment: {
      weapons: (instance.equipment?.weapons || [])
        .map((item) => normalizeEquipmentEntry(item))
        .filter(Boolean),
      armors: (instance.equipment?.armors || [])
        .map((item) => normalizeEquipmentEntry(item))
        .filter(Boolean),
      powers: (instance.equipment?.powers || [])
        .map((item) => normalizeEquipmentEntry(item))
        .filter(Boolean),
    },
    stats: Object.entries(instance.stats || {}).reduce((acc, [key, value]) => {
      acc[key] = normalizeStat(value);
      return acc;
    }, {}),
    history: (instance.history || []).slice(0, 3),
    statePool: normalizeStatePool(instance.statePool),
    activeStates: normalizeStatePool(instance.activeStates),
    customStates: normalizeStatePool(instance.customStates),
  };
};

const useEnemyInstances = ({
  ensureEnemyDefaults,
  storageKey = DEFAULT_STORAGE_KEY,
  onSyncInstance,
} = {}) => {
  const [instances, setInstances] = useState([]);
  const isReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.instances)) {
        setInstances(parsed.instances.map(reviveInstance));
      }
    } catch (error) {
      console.error('Error cargando encuentro activo', error);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isReadyRef.current) {
      isReadyRef.current = true;
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({ instances });
      window.localStorage.setItem(storageKey, payload);
    } catch (error) {
      console.error('Error guardando encuentro activo', error);
    }
  }, [instances, storageKey]);

  const wrapUpdate = useCallback((updater, description) => {
    setInstances((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const updatedList = Array.isArray(next) ? next.map(reviveInstance) : [];
      if (description && updatedList.length === prev.length) {
        // description handled by callers inside update callbacks
      }
      return updatedList;
    });
  }, []);

  const addEnemyInstances = useCallback((enemy, quantity = 1) => {
    if (!enemy || quantity <= 0) return [];
    const count = Math.max(1, quantity);
    const created = [];
    setInstances((prev) => {
      const existingCount = prev.filter((inst) => inst.baseId === enemy.id).length;
      const additions = Array.from({ length: count }).map((_, index) =>
        makeInstanceFromEnemy({
          enemy,
          ensureEnemyDefaults,
          index,
          existingCount,
        })
      );
      created.push(...additions);
      return [...prev, ...additions];
    });
    return created;
  }, [ensureEnemyDefaults]);

  const updateInstance = useCallback((id, updater, description) => {
    setInstances((prev) =>
      prev.map((instance) => {
        if (instance.id !== id) return instance;
        const updated = typeof updater === 'function' ? updater(instance) : { ...instance, ...updater };
        const withMeta = {
          ...instance,
          ...updated,
          updatedAt: Date.now(),
          history: pushHistoryEntry(updated.history ?? instance.history, description),
        };
        if (onSyncInstance) {
          try {
            onSyncInstance(withMeta);
          } catch (error) {
            console.error('Error sincronizando instancia', error);
          }
        }
        return reviveInstance(withMeta);
      })
    );
  }, [onSyncInstance]);

  const removeInstance = useCallback((id) => {
    setInstances((prev) => prev.filter((instance) => instance.id !== id));
  }, []);

  const duplicateInstance = useCallback((id) => {
    let duplicated = null;
    setInstances((prev) => {
      const target = prev.find((instance) => instance.id === id);
      if (!target) return prev;
      const existingCount = prev.filter((inst) => inst.baseId === target.baseId).length;
      duplicated = {
        ...target,
        id: nanoid(),
        displayName: `${target.baseName} #${existingCount + 1}`,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return [...prev, reviveInstance(duplicated)];
    });
    if (duplicated && onSyncInstance) {
      try {
        onSyncInstance(duplicated);
      } catch (error) {
        console.error('Error sincronizando instancia', error);
      }
    }
  }, [onSyncInstance]);

  const clearEncounter = useCallback(() => {
    setInstances([]);
  }, []);

  const applyToGroup = useCallback((baseId, updater, description) => {
    setInstances((prev) =>
      prev.map((instance) => {
        if (instance.baseId !== baseId) return instance;
        const updated = typeof updater === 'function' ? updater(instance) : { ...instance, ...updater };
        const withMeta = {
          ...instance,
          ...updated,
          updatedAt: Date.now(),
          history: pushHistoryEntry(updated.history ?? instance.history, description),
        };
        if (onSyncInstance) {
          try {
            onSyncInstance(withMeta);
          } catch (error) {
            console.error('Error sincronizando instancia', error);
          }
        }
        return reviveInstance(withMeta);
      })
    );
  }, [onSyncInstance]);

  const refreshFromCatalog = useCallback((catalog = []) => {
    if (!catalog || catalog.length === 0) return;
    const catalogMap = catalog.reduce((acc, enemy) => {
      if (enemy?.id) acc[enemy.id] = enemy;
      return acc;
    }, {});
    setInstances((prev) =>
      prev.map((instance) => {
        const matching = catalogMap[instance.baseId];
        if (!matching) return instance;
        const normalized = ensureEnemyDefaults ? ensureEnemyDefaults(matching) : matching;
        const statePool = Array.from(new Set([...instance.statePool, ...createStatePool(normalized)]));
        return reviveInstance({
          ...instance,
          baseName: normalized.name || instance.baseName,
          displayName: instance.displayName?.includes('#')
            ? `${normalized.name || instance.baseName} ${instance.displayName.substring(instance.displayName.indexOf('#'))}`
            : normalized.name || instance.displayName,
          baseReference: {
            ...instance.baseReference,
            themeColor: normalized.themeColor || instance.baseReference?.themeColor || null,
          },
          statePool,
          equipment: {
            weapons: instance.equipment?.weapons || mapEquipment(normalized.weapons),
            armors: instance.equipment?.armors || mapEquipment(normalized.armaduras),
            powers: instance.equipment?.powers || mapEquipment(normalized.poderes),
          },
        });
      })
    );
  }, [ensureEnemyDefaults]);

  const value = useMemo(
    () => ({
      instances,
      addEnemyInstances,
      updateInstance,
      removeInstance,
      duplicateInstance,
      clearEncounter,
      applyToGroup,
      refreshFromCatalog,
    }),
    [
      instances,
      addEnemyInstances,
      updateInstance,
      removeInstance,
      duplicateInstance,
      clearEncounter,
      applyToGroup,
      refreshFromCatalog,
    ]
  );

  return value;
};

export default useEnemyInstances;
