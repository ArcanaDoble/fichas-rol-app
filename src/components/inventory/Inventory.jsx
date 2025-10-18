import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Boton from '../Boton';
import Input from '../Input';
import ItemGenerator from './ItemGenerator';
import {
  CATEGORY_ABILITY,
  CATEGORY_ARMOR,
  CATEGORY_OTHER,
  CATEGORY_WEAPON,
  INVENTORY_CATEGORY_LABELS,
  createDefaultInventoryState,
  ensureInventoryState,
  inferInventoryCategory,
} from './inventoryState';

const CATEGORY_CONFIG = [
  {
    key: CATEGORY_WEAPON,
    label: 'Armas',
    singular: 'arma',
    icon: '🗡️',
    accent: 'from-rose-500/20 via-rose-400/10 to-rose-500/20 border-rose-500/50',
    description: 'Gestiona las armas listas para usarse en el combate.',
  },
  {
    key: CATEGORY_ARMOR,
    label: 'Armaduras',
    singular: 'armadura',
    icon: '🛡️',
    accent: 'from-slate-500/20 via-slate-400/10 to-slate-500/20 border-slate-500/50',
    description: 'Controla las piezas defensivas que cada jugador puede equipar.',
  },
  {
    key: CATEGORY_ABILITY,
    label: 'Habilidades',
    singular: 'habilidad',
    icon: '✨',
    accent: 'from-violet-500/20 via-violet-400/10 to-violet-500/20 border-violet-500/50',
    description: 'Administra poderes y técnicas especiales disponibles.',
  },
];

const OTHER_CONFIG = {
  key: CATEGORY_OTHER,
  label: 'Objetos adicionales',
  singular: 'objeto',
  icon: '🎒',
  accent: 'from-slate-600/20 via-slate-500/10 to-slate-600/20 border-slate-500/40',
  description: 'Reúne consumibles, recursos o cualquier otra posesión del jugador.',
};

const CATEGORY_OPTIONS = [...CATEGORY_CONFIG, OTHER_CONFIG];

const createEmptyToken = (category, overrides = {}) => {
  const baseType = overrides.type || category;
  return {
    id: nanoid(),
    type: baseType,
    name: overrides.name || '',
    description: overrides.description || '',
    rarity: overrides.rarity || '',
    typeLabel: overrides.typeLabel || '',
    itemId: overrides.itemId || '',
    cost: Number.isFinite(overrides.cost) ? overrides.cost : null,
    costLabel: overrides.costLabel || '',
    count: Number.isFinite(overrides.count) ? overrides.count : 1,
    category,
    equipped: Boolean(overrides.equipped),
  };
};

const formatFromType = (type = '') => {
  if (!type) return '';
  return type
    .replace(/[_\-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const migrateSlotItems = (slots = []) =>
  slots
    .filter((slot) => slot?.item)
    .map((slot) => {
      const { item } = slot;
      const category = inferInventoryCategory(item);
      return createEmptyToken(category, { ...item, id: nanoid() });
    });

const sortTokens = (tokens = []) =>
  [...tokens].sort((a, b) => {
    if (a.equipped !== b.equipped) {
      return a.equipped ? -1 : 1;
    }
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA && nameB) {
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    }
    if (nameA || nameB) {
      return nameA ? -1 : 1;
    }
    return String(a.id).localeCompare(String(b.id));
  });

const Inventory = ({ playerName, isMaster = false }) => {
  const defaultState = useMemo(() => createDefaultInventoryState(), []);
  const [slots, setSlots] = useState(defaultState.slots);
  const [nextId, setNextId] = useState(defaultState.nextId);
  const [tokens, setTokens] = useState(defaultState.tokens);
  const [loaded, setLoaded] = useState(false);

  const docRef = useMemo(() => (playerName ? doc(db, 'inventory', playerName) : null), [playerName]);

  useEffect(() => {
    if (!docRef) return;
    const fetchState = async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const state = ensureInventoryState(snap.data());
        const migrated = migrateSlotItems(state.slots);
        setSlots(state.slots.map((slot) => ({ ...slot, item: null })));
        setTokens(sortTokens([...state.tokens, ...migrated]));
        setNextId(state.nextId);
      } else {
        setSlots(defaultState.slots);
        setTokens(defaultState.tokens);
        setNextId(defaultState.nextId);
      }
      setLoaded(true);
    };
    fetchState();
  }, [defaultState.nextId, defaultState.slots, defaultState.tokens, docRef]);

  useEffect(() => {
    if (!loaded || !docRef) return;
    setDoc(docRef, { slots, tokens, nextId });
  }, [slots, tokens, nextId, loaded, docRef]);

  const handleAddItem = useCallback((category) => {
    setTokens((prev) => sortTokens([...prev, createEmptyToken(category)]));
  }, []);

  const handleRemoveItem = useCallback((id) => {
    setTokens((prev) => prev.filter((token) => token.id !== id));
  }, []);

  const handleUpdateItem = useCallback((id, updates) => {
    setTokens((prev) =>
      sortTokens(
        prev.map((token) => (token.id === id ? { ...token, ...updates } : token))
      )
    );
  }, []);

  const handleToggleEquipped = useCallback((id) => {
    setTokens((prev) =>
      sortTokens(
        prev.map((token) =>
          token.id === id ? { ...token, equipped: !token.equipped } : token
        )
      )
    );
  }, []);

  const handleCategoryChange = useCallback((id, category) => {
    setTokens((prev) =>
      sortTokens(
        prev.map((token) =>
          token.id === id
            ? {
                ...token,
                category,
                type: token.type || category,
              }
            : token
        )
      )
    );
  }, []);

  const handleCostChange = useCallback((id, value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      handleUpdateItem(id, { cost: null, costLabel: '' });
      return;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      handleUpdateItem(id, { cost: numeric });
    } else {
      handleUpdateItem(id, { cost: null, costLabel: value });
    }
  }, [handleUpdateItem]);

  const handleGenerate = useCallback(
    (type) => {
      const category = inferInventoryCategory({ type });
      const name = formatFromType(type);
      setTokens((prev) =>
        sortTokens([
          ...prev,
          createEmptyToken(category, {
            type,
            name,
          }),
        ])
      );
    },
    []
  );

  const categorizedTokens = useMemo(() => {
    const map = new Map();
    tokens.forEach((token) => {
      const category = token.category || CATEGORY_OTHER;
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category).push(token);
    });
    return map;
  }, [tokens]);

  const renderItemCard = (token, categoryLabel) => (
    <div
      key={token.id}
      className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 space-y-4 shadow-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Input
          label={`Nombre de ${categoryLabel.toLowerCase()}`}
          value={token.name}
          placeholder="Nombre del objeto"
          onChange={(e) => handleUpdateItem(token.id, { name: e.target.value })}
          size="sm"
        />
        <div className="flex gap-2 sm:ml-auto">
          <Boton
            size="sm"
            color={token.equipped ? 'green' : 'blue'}
            onClick={() => handleToggleEquipped(token.id)}
          >
            {token.equipped ? 'Equipado' : 'Disponible'}
          </Boton>
          <Boton size="sm" color="red" onClick={() => handleRemoveItem(token.id)}>
            Eliminar
          </Boton>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Rareza"
          value={token.rarity}
          onChange={(e) => handleUpdateItem(token.id, { rarity: e.target.value })}
          size="sm"
        />
        <Input
          label="Etiqueta de tipo"
          value={token.typeLabel}
          onChange={(e) => handleUpdateItem(token.id, { typeLabel: e.target.value })}
          size="sm"
        />
        <Input
          label="Cantidad"
          type="number"
          min="1"
          value={token.count}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            handleUpdateItem(token.id, {
              count: Number.isFinite(parsed) ? Math.max(parsed, 1) : 1,
            });
          }}
          size="sm"
        />
        <Input
          label="Costo"
          type="text"
          value={
            token.cost != null
              ? String(token.cost)
              : token.costLabel
              ? token.costLabel
              : ''
          }
          onChange={(e) => handleCostChange(token.id, e.target.value)}
          size="sm"
        />
        <Input
          label="ID de referencia"
          value={token.itemId}
          onChange={(e) => handleUpdateItem(token.id, { itemId: e.target.value })}
          size="sm"
        />
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Categoría
          </label>
          <select
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            value={token.category || CATEGORY_OTHER}
            onChange={(e) => handleCategoryChange(token.id, e.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Descripción
        </label>
        <textarea
          className="w-full min-h-[4rem] rounded-lg bg-slate-800 border border-slate-600 text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          value={token.description}
          onChange={(e) => handleUpdateItem(token.id, { description: e.target.value })}
          placeholder="Notas o detalles sobre el objeto"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <span>📚</span>
          Biblioteca de objetos
        </h3>
        <p className="text-sm text-slate-300">
          Busca objetos creados previamente o añade nuevos para asignarlos al jugador seleccionado.
        </p>
        <ItemGenerator onGenerate={handleGenerate} allowCustom={isMaster} />
        <p className="text-xs text-slate-400">
          Los objetos se colocarán automáticamente en la categoría correspondiente según su tipo.
        </p>
      </div>

      {CATEGORY_CONFIG.map((category) => {
        const items = categorizedTokens.get(category.key) || [];
        return (
          <section
            key={category.key}
            className={`bg-gradient-to-br ${category.accent} rounded-3xl border backdrop-blur-sm p-5 space-y-4`}
          >
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {category.icon}
                  </span>
                  {category.label}
                </h4>
                <p className="text-sm text-slate-200/90">{category.description}</p>
              </div>
              <Boton size="sm" color="green" onClick={() => handleAddItem(category.key)}>
                Agregar {category.singular}
              </Boton>
            </header>
            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((token) => renderItemCard(token, category.label))}
              </div>
            ) : (
              <p className="text-sm text-slate-100/80 italic">
                No hay {category.label.toLowerCase()} registrados para este jugador.
              </p>
            )}
          </section>
        );
      })}

      <section
        className={`bg-gradient-to-br ${OTHER_CONFIG.accent} rounded-3xl border backdrop-blur-sm p-5 space-y-4`}
      >
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {OTHER_CONFIG.icon}
              </span>
              {OTHER_CONFIG.label}
            </h4>
            <p className="text-sm text-slate-200/90">{OTHER_CONFIG.description}</p>
          </div>
          <Boton size="sm" color="green" onClick={() => handleAddItem(OTHER_CONFIG.key)}>
            Agregar {OTHER_CONFIG.singular}
          </Boton>
        </header>
        <div className="space-y-4">
          {(categorizedTokens.get(OTHER_CONFIG.key) || []).map((token) =>
            renderItemCard(token, INVENTORY_CATEGORY_LABELS[token.category] || 'Objeto')
          )}
        </div>
        {(categorizedTokens.get(OTHER_CONFIG.key) || []).length === 0 && (
          <p className="text-sm text-slate-100/80 italic">
            Usa esta sección para registrar recursos, consumibles y recompensas especiales.
          </p>
        )}
      </section>
    </div>
  );
};

Inventory.propTypes = {
  playerName: PropTypes.string,
  isMaster: PropTypes.bool,
};

export default Inventory;
