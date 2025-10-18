import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
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
    blurb: 'Todas las armas que el jugador ya tiene listas para equipar.',
    emptyMessage: 'Aún no hay armas compradas registradas para este jugador.',
  },
  [CATEGORY_ARMOR]: {
    label: 'Armaduras compradas',
    singular: 'armadura',
    icon: '🛡️',
    variant: 'armor',
    blurb: 'Protecciones y escudos adquiridos durante la campaña.',
    emptyMessage: 'Aún no se han guardado armaduras compradas.',
  },
  [CATEGORY_ABILITY]: {
    label: 'Poderes comprados',
    singular: 'poder',
    icon: '✨',
    variant: 'power',
    blurb: 'Habilidades y mejoras desbloqueadas para este héroe.',
    emptyMessage: 'Registra aquí los poderes comprados por el jugador.',
  },
  [CATEGORY_OTHER]: {
    label: 'Otros objetos guardados',
    singular: 'objeto',
    icon: '🎒',
    variant: 'default',
    blurb: 'Consumibles, recursos y apuntes importantes de la partida.',
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
  [CATEGORY_WEAPON]:
    'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/40 shadow-[0_18px_40px_-32px_rgba(244,63,94,0.55)]',
  [CATEGORY_ARMOR]:
    'from-sky-500/10 via-sky-500/5 to-transparent border-sky-500/35 shadow-[0_18px_40px_-32px_rgba(14,165,233,0.55)]',
  [CATEGORY_ABILITY]:
    'from-violet-500/10 via-indigo-500/5 to-transparent border-violet-500/35 shadow-[0_18px_40px_-32px_rgba(124,58,237,0.55)]',
  [CATEGORY_OTHER]:
    'from-slate-500/10 via-slate-500/5 to-transparent border-slate-500/35 shadow-[0_18px_40px_-32px_rgba(100,116,139,0.55)]',
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
        hoverable
        className="border border-white/5 bg-slate-950/70 backdrop-blur-sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-2xl">
                {details.icon}
              </span>
              <div>
                <p className="text-lg font-semibold text-white">
                  {token.name || `Nueva ${details.singular} comprada`}
                </p>
                <p className="text-sm text-slate-300">
                  {token.typeLabel || formatFromType(token.type) || 'Sin tipo asignado'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Boton
                color="blue"
                size="sm"
                onClick={() => setSelectedId(token.id)}
                icon={<FiEdit2 />}
                className="px-3"
              >
                Editar
              </Boton>
              <Boton
                color="red"
                size="sm"
                onClick={() => handleRemoveItem(token.id)}
                icon={<FiTrash2 />}
                className="px-3"
              >
                Eliminar
              </Boton>
            </div>
          </div>
          {token.description && (
            <p className="text-sm leading-relaxed text-slate-200/90 whitespace-pre-line">
              {token.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/90">
            {token.cost != null && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-200">
                Coste: {token.cost}
              </span>
            )}
            {token.cost == null && token.costLabel && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-200">
                {token.costLabel}
              </span>
            )}
            {token.count > 1 && (
              <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1">
                Cantidad: {token.count}
              </span>
            )}
            {token.itemId && (
              <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1">
                ID: {token.itemId}
              </span>
            )}
            {token.equipped && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                Marcado como equipado
              </span>
            )}
          </div>
        </div>
      </Tarjeta>
    );
  };

  return (
    <div className="space-y-8 text-slate-100">
      <div className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-950/90 via-slate-900/75 to-slate-950/60 p-6 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.95)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Inventario personal</span>
            <h2 className="text-3xl font-bold text-white">Inventario de compras</h2>
            <p className="max-w-xl text-sm text-slate-300">
              Gestiona las armas, armaduras y poderes que el jugador ya compró para mantenerlos sincronizados con la ficha de equipamiento.
            </p>
          </div>
          <div className="w-full md:w-80">
            <Input
              size="sm"
              placeholder="Buscar en las compras guardadas"
              value={search}
              onChange={handleSearchChange}
              icon={<FiSearch className="h-4 w-4" aria-hidden />}
              className="bg-slate-900/75 border-slate-700/70 focus:border-blue-400 focus:ring-blue-500/40 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const tokensInCategory = tokensByCategory[category] || [];
          const details = CATEGORY_DETAILS[category];
          return (
            <section
              key={category}
              className={`rounded-3xl border ${gradientByCategory[category]} bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-slate-950/30 p-6 backdrop-blur`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                      {details.icon}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{details.label}</h3>
                      <p className="text-sm text-slate-200/90">{details.blurb}</p>
                    </div>
                  </div>
                </div>
                <Boton
                  color="green"
                  size="sm"
                  onClick={() => handleAddItem(category)}
                  icon={<FiPlus />}
                  className="whitespace-nowrap"
                >
                  Agregar {details.singular}
                </Boton>
              </div>

              <div className="mt-4 space-y-4">
                {tokensInCategory.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tokensInCategory.map((token) => renderTokenCard(token))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-200/80">
                    {details.emptyMessage}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-slate-950/50 p-6 shadow-[0_18px_48px_-34px_rgba(59,130,246,0.45)]">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-white">Añadir compras existentes</h3>
          <p className="text-sm text-slate-300">
            Busca un objeto que ya compraste en la tienda para incorporarlo rápidamente al inventario del jugador.
          </p>
        </div>
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
        <div className="rounded-3xl border border-blue-400/30 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-slate-950/45 p-6 shadow-[0_22px_55px_-36px_rgba(96,165,250,0.6)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Editar compra seleccionada</h3>
              <p className="text-sm text-slate-200/85">
                Ajusta los datos y se guardarán automáticamente para este jugador.
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
              className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
            />
            <Input
              label="Tipo de objeto"
              placeholder="Arma a dos manos, Armadura ligera..."
              value={selectedItem.typeLabel}
              onChange={(event) => handleUpdateItem(selectedItem.id, { typeLabel: event.target.value })}
              className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
            />
            <Input
              label="Identificador de tienda"
              placeholder="ID de referencia"
              value={selectedItem.itemId}
              onChange={(event) => handleUpdateItem(selectedItem.id, { itemId: event.target.value })}
              className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
            />
            <Input
              label="Rareza"
              placeholder="Común, Poco común, Legendaria..."
              value={selectedItem.rarity}
              onChange={(event) => handleUpdateItem(selectedItem.id, { rarity: event.target.value })}
              className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
            />
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200">Descripción o rasgos</label>
              <textarea
                className="h-32 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
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
                className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={selectedItem.count}
                onChange={(event) => handleCountChange(selectedItem.id, event.target.value)}
                className="bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Categoría</label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
              <span className="text-sm font-medium text-slate-200">Estado</span>
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
