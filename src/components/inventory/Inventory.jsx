import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Boton from '../Boton';
import Input from '../Input';
import Tarjeta from '../Tarjeta';
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

const CATEGORY_DETAILS = {
  [CATEGORY_WEAPON]: {
    label: 'Armas compradas',
    singular: 'arma',
    icon: '⚔️',
    variant: 'weapon',
    description:
      'Consulta todas las armas adquiridas por el jugador y mantenlas listas para equiparlas en la ficha.',
    emptyMessage: 'Aún no hay armas compradas registradas para este jugador.',
  },
  [CATEGORY_ARMOR]: {
    label: 'Armaduras compradas',
    singular: 'armadura',
    icon: '🛡️',
    variant: 'armor',
    description:
      'Guarda aquí las armaduras que el jugador ha comprado para consultarlas rápidamente durante la partida.',
    emptyMessage: 'Aún no se han guardado armaduras compradas.',
  },
  [CATEGORY_ABILITY]: {
    label: 'Poderes comprados',
    singular: 'poder',
    icon: '✨',
    variant: 'power',
    description:
      'Administra poderes, técnicas o habilidades especiales que se hayan adquirido en la tienda.',
    emptyMessage: 'Registra aquí los poderes comprados por el jugador.',
  },
  [CATEGORY_OTHER]: {
    label: 'Otros objetos guardados',
    singular: 'objeto',
    icon: '🎒',
    variant: 'default',
    description:
      'Para consumibles, recursos o notas de compras especiales que quieras tener a mano durante el combate.',
    emptyMessage: 'Agrega consumibles o notas rápidas para completar el inventario.',
  },
};

const CATEGORY_ORDER = [
  CATEGORY_WEAPON,
  CATEGORY_ARMOR,
  CATEGORY_ABILITY,
  CATEGORY_OTHER,
];

const gradientByCategory = {
  [CATEGORY_WEAPON]: 'from-red-500/10 via-rose-500/5 to-red-500/10 border-red-500/40',
  [CATEGORY_ARMOR]: 'from-slate-500/10 via-slate-400/5 to-slate-500/10 border-slate-500/40',
  [CATEGORY_ABILITY]: 'from-violet-500/10 via-indigo-500/5 to-violet-500/10 border-violet-500/40',
  [CATEGORY_OTHER]: 'from-slate-600/10 via-slate-500/5 to-slate-600/10 border-slate-600/40',
};

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
    const labelA = (a.name || a.typeLabel || '').toLowerCase();
    const labelB = (b.name || b.typeLabel || '').toLowerCase();
    if (labelA && labelB && labelA !== labelB) {
      return labelA.localeCompare(labelB, 'es', { sensitivity: 'base' });
    }
    if (a.category !== b.category) {
      return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    }
    return String(a.id).localeCompare(String(b.id));
  });

const Inventory = ({ playerName, isMaster = false }) => {
  const defaultState = useMemo(() => createDefaultInventoryState(), []);
  const [slots, setSlots] = useState(defaultState.slots);
  const [nextId, setNextId] = useState(defaultState.nextId);
  const [tokens, setTokens] = useState(defaultState.tokens);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

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

  useEffect(() => {
    if (!selectedId) return;
    if (!tokens.some((token) => token.id === selectedId)) {
      setSelectedId(null);
    }
  }, [tokens, selectedId]);

  const handleAddItem = useCallback((category, overrides = {}) => {
    const newToken = createEmptyToken(category, overrides);
    setTokens((prev) => sortTokens([...prev, newToken]));
    setSelectedId(newToken.id);
  }, []);

  const handleRemoveItem = useCallback((id) => {
    setTokens((prev) => prev.filter((token) => token.id !== id));
    setSelectedId((current) => (current === id ? null : current));
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

  const handleCostChange = useCallback(
    (id, value) => {
      const trimmed = value.trim();
      if (trimmed === '') {
        handleUpdateItem(id, { cost: null, costLabel: '' });
        return;
      }
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        handleUpdateItem(id, { cost: numeric, costLabel: '' });
      } else {
        handleUpdateItem(id, { cost: null, costLabel: value });
      }
    },
    [handleUpdateItem]
  );

  const handleCountChange = useCallback(
    (id, value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        handleUpdateItem(id, { count: 1 });
        return;
      }
      handleUpdateItem(id, { count: Math.max(1, parsed) });
    },
    [handleUpdateItem]
  );

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const filteredTokens = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tokens;
    return tokens.filter((token) =>
      [
        token.name,
        token.type,
        token.typeLabel,
        token.description,
        token.costLabel,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [tokens, search]);

  const tokensByCategory = useMemo(() => {
    const grouped = CATEGORY_ORDER.reduce(
      (acc, key) => ({
        ...acc,
        [key]: [],
      }),
      {}
    );
    filteredTokens.forEach((token) => {
      const key = CATEGORY_ORDER.includes(token.category) ? token.category : CATEGORY_OTHER;
      grouped[key].push(token);
    });
    return grouped;
  }, [filteredTokens]);

  const selectedItem = useMemo(
    () => tokens.find((token) => token.id === selectedId) || null,
    [tokens, selectedId]
  );

  const renderTokenCard = (token) => {
    const details = CATEGORY_DETAILS[token.category] || CATEGORY_DETAILS[CATEGORY_OTHER];
    const variant = details.variant;
    return (
      <Tarjeta
        key={token.id}
        variant={variant}
        interactive={false}
        className="bg-slate-900/70 border border-white/5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                {details.icon}
              </span>
              <div>
                <p className="text-lg font-semibold text-white">
                  {token.name || `Nueva ${details.singular} comprada`}
                </p>
                <p className="text-sm text-gray-300">
                  {token.typeLabel || formatFromType(token.type)}
                </p>
              </div>
            </div>
            {token.description && (
              <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">
                {token.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
              {token.cost != null && (
                <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-amber-200">
                  Coste: {token.cost}
                </span>
              )}
              {token.cost == null && token.costLabel && (
                <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-amber-200">
                  {token.costLabel}
                </span>
              )}
              {token.count > 1 && (
                <span className="rounded-full border border-slate-400/60 bg-slate-400/10 px-3 py-1">
                  Cantidad: {token.count}
                </span>
              )}
              {token.itemId && (
                <span className="rounded-full border border-slate-400/60 bg-slate-400/10 px-3 py-1">
                  ID: {token.itemId}
                </span>
              )}
              {token.equipped && (
                <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Marcado como equipado
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-stretch md:flex-col">
            <Boton
              color="blue"
              size="sm"
              onClick={() => setSelectedId(token.id)}
              className="w-full"
            >
              Editar
            </Boton>
            <Boton
              color="red"
              size="sm"
              onClick={() => handleRemoveItem(token.id)}
              className="w-full"
            >
              Eliminar
            </Boton>
          </div>
        </div>
      </Tarjeta>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-600/40 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Inventario de compras</h2>
            <p className="text-sm text-slate-300">
              Organiza las armas, armaduras y poderes adquiridos para cada jugador, igual que en la pestaña de equipamiento de las fichas.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              size="sm"
              placeholder="Buscar compras por nombre, rasgos o descripción"
              value={search}
              onChange={handleSearchChange}
              icon="🔍"
            />
            {search && (
              <Boton
                color="gray"
                size="sm"
                onClick={() => setSearch('')}
                className="whitespace-nowrap"
              >
                Limpiar
              </Boton>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const tokensInCategory = tokensByCategory[category] || [];
          const details = CATEGORY_DETAILS[category];
          return (
            <section
              key={category}
              className={`rounded-3xl border ${gradientByCategory[category]} bg-gradient-to-br p-6 shadow-lg backdrop-blur`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {details.icon}
                    </span>
                    <h3 className="text-xl font-semibold text-white">{details.label}</h3>
                  </div>
                  <p className="text-sm text-slate-200">{details.description}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Boton
                    color="green"
                    size="sm"
                    onClick={() => handleAddItem(category)}
                    className="whitespace-nowrap"
                  >
                    Agregar {details.singular} comprada
                  </Boton>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {tokensInCategory.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tokensInCategory.map((token) => renderTokenCard(token))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-300">
                    {details.emptyMessage}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-600/40 bg-slate-900/70 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white">Buscar compras en la biblioteca</h3>
        <p className="mt-1 text-sm text-slate-300">
          Escribe el nombre del objeto que ya adquiriste en la tienda para añadirlo automáticamente a esta lista.
        </p>
        <div className="mt-4">
          <ItemGenerator
            onGenerate={(type) => {
              const category = inferInventoryCategory({ type });
              handleAddItem(category, {
                type,
                typeLabel: formatFromType(type),
              });
            }}
            allowCustom={isMaster}
          />
        </div>
      </div>

      {selectedItem && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Editar compra seleccionada</h3>
              <p className="text-sm text-amber-100/80">
                Ajusta los datos como aparecerán en la ficha de equipamiento y guarda los cambios automáticamente.
              </p>
            </div>
            <Boton color="gray" size="sm" onClick={() => setSelectedId(null)}>
              Cerrar
            </Boton>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre del objeto"
              placeholder="Espada corta, Ballesta de repetición..."
              value={selectedItem.name}
              onChange={(event) => handleUpdateItem(selectedItem.id, { name: event.target.value })}
            />
            <Input
              label="Tipo de objeto"
              placeholder="Arma a dos manos, Armadura ligera..."
              value={selectedItem.typeLabel}
              onChange={(event) => handleUpdateItem(selectedItem.id, { typeLabel: event.target.value })}
            />
            <Input
              label="Identificador de tienda"
              placeholder="ID de referencia"
              value={selectedItem.itemId}
              onChange={(event) => handleUpdateItem(selectedItem.id, { itemId: event.target.value })}
            />
            <Input
              label="Rareza"
              placeholder="Común, Poco común, Legendaria..."
              value={selectedItem.rarity}
              onChange={(event) => handleUpdateItem(selectedItem.id, { rarity: event.target.value })}
            />
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-amber-100">
                Descripción o rasgos
              </label>
              <textarea
                className="h-32 w-full rounded-lg border border-amber-200/30 bg-black/30 p-4 text-sm text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/40"
                placeholder="Daño, alcance, rasgos especiales, notas de uso..."
                value={selectedItem.description}
                onChange={(event) => handleUpdateItem(selectedItem.id, { description: event.target.value })}
              />
            </div>
            <div>
              <Input
                label="Coste pagado"
                placeholder="Ej. 150"
                value={selectedItem.cost != null ? selectedItem.cost : selectedItem.costLabel}
                onChange={(event) => handleCostChange(selectedItem.id, event.target.value)}
              />
            </div>
            <div>
              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={selectedItem.count}
                onChange={(event) => handleCountChange(selectedItem.id, event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-amber-100">Categoría</label>
              <select
                className="w-full rounded-lg border border-amber-200/40 bg-black/40 p-3 text-sm text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                value={selectedItem.category}
                onChange={(event) => handleCategoryChange(selectedItem.id, event.target.value)}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {INVENTORY_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-amber-100">Estado</span>
              <Boton
                color={selectedItem.equipped ? 'green' : 'gray'}
                size="sm"
                onClick={() => handleToggleEquipped(selectedItem.id)}
              >
                {selectedItem.equipped ? 'Marcado como equipado' : 'Disponible en inventario'}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Inventory.propTypes = {
  playerName: PropTypes.string,
  isMaster: PropTypes.bool,
};

export default Inventory;
