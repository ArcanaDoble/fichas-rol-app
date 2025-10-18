import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { FaBoxOpen } from 'react-icons/fa';

const formatCost = (cost) => {
  if (typeof cost !== 'number' || Number.isNaN(cost)) return '—';
  return cost.toLocaleString('es-ES');
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('es-ES');
  } catch (error) {
    return '';
  }
};

const defaultRarityColor = '#64748b';

const resolveRarityColor = (rarity, palette = {}) => {
  if (!rarity) return defaultRarityColor;
  const direct = palette[rarity];
  if (direct) return direct;
  const normalized = rarity
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = Object.entries(palette).find(([key]) => {
    const normalizedKey = key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizedKey === normalized;
  });
  return match ? match[1] : defaultRarityColor;
};

const InventoryMenu = ({
  inventories = {},
  availablePlayers = [],
  isPlayerView = false,
  currentPlayerName = '',
  availableItems = [],
  rarityColorMap = {},
  onAddItem,
  onRemoveItem,
  canManageInventory = false,
}) => {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
  const [customItem, setCustomItem] = useState({ name: '', typeLabel: '', cost: '', rarity: '' });
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const playerOptions = useMemo(() => {
    const names = new Set(
      [...availablePlayers, ...Object.keys(inventories || {})]
        .map((name) => name?.trim())
        .filter(Boolean)
    );
    if (isPlayerView && currentPlayerName) {
      names.add(currentPlayerName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [availablePlayers, inventories, isPlayerView, currentPlayerName]);

  const [selectedPlayer, setSelectedPlayer] = useState(() => {
    if (isPlayerView) return currentPlayerName || '';
    return playerOptions[0] || '';
  });

  useEffect(() => {
    if (isPlayerView) {
      setSelectedPlayer(currentPlayerName || '');
      return;
    }
    if (!selectedPlayer || !playerOptions.includes(selectedPlayer)) {
      setSelectedPlayer(playerOptions[0] || '');
    }
  }, [isPlayerView, currentPlayerName, playerOptions, selectedPlayer]);

  const normalizedSearch = search.trim().toLowerCase();
  const entries = useMemo(() => {
    const list = (inventories && selectedPlayer && inventories[selectedPlayer]) || [];
    if (!normalizedSearch) return list;
    return list.filter((entry) => {
      const haystack = [entry.itemName, entry.typeLabel, entry.rarity]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [inventories, normalizedSearch, selectedPlayer]);

  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!canManageInventory) return [];
    if (!normalizedQuery) return availableItems.slice(0, 6);
    return availableItems
      .filter((item) => item.searchText?.includes(normalizedQuery))
      .slice(0, 8);
  }, [availableItems, normalizedQuery, canManageInventory]);

  const selectedSuggestion = useMemo(
    () => availableItems.find((item) => item.id === selectedSuggestionId) || null,
    [availableItems, selectedSuggestionId]
  );

  const resetFeedbackLater = () => {
    if (typeof window === 'undefined') return;
    window.clearTimeout(resetFeedbackLater.timeoutId);
    resetFeedbackLater.timeoutId = window.setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(
    () => () => {
      if (typeof window !== 'undefined') {
        window.clearTimeout(resetFeedbackLater.timeoutId);
      }
    },
    []
  );

  const handleAddSuggestion = async () => {
    if (!canManageInventory || !selectedPlayer || !selectedSuggestion || !onAddItem) return;
    setIsSaving(true);
    const result = await onAddItem(selectedPlayer, selectedSuggestion);
    setIsSaving(false);
    if (!result?.success) {
      setFeedback({ type: 'error', message: 'No se pudo agregar el objeto seleccionado.' });
      resetFeedbackLater();
      return;
    }
    setFeedback({ type: 'success', message: 'Objeto agregado al inventario.' });
    setQuery('');
    setSelectedSuggestionId(null);
    resetFeedbackLater();
  };

  const handleAddCustom = async () => {
    if (!canManageInventory || !selectedPlayer || !onAddItem) return;
    if (!customItem.name.trim()) {
      setFeedback({ type: 'error', message: 'Ingresa un nombre para el objeto.' });
      resetFeedbackLater();
      return;
    }
    const payload = {
      id: '',
      name: customItem.name,
      typeLabel: customItem.typeLabel,
      cost: customItem.cost !== '' ? Number(customItem.cost) : null,
      rarity: customItem.rarity,
    };
    setIsSaving(true);
    const result = await onAddItem(selectedPlayer, payload);
    setIsSaving(false);
    if (!result?.success) {
      setFeedback({ type: 'error', message: 'No se pudo crear el objeto personalizado.' });
      resetFeedbackLater();
      return;
    }
    setFeedback({ type: 'success', message: 'Objeto personalizado agregado.' });
    setCustomItem({ name: '', typeLabel: '', cost: '', rarity: '' });
    resetFeedbackLater();
  };

  const handleRemoveItem = async (entryId) => {
    if (!canManageInventory || !selectedPlayer || !onRemoveItem) return;
    setIsSaving(true);
    const result = await onRemoveItem(selectedPlayer, entryId);
    setIsSaving(false);
    if (!result?.success) {
      setFeedback({ type: 'error', message: 'No se pudo eliminar el objeto.' });
      resetFeedbackLater();
      return;
    }
    setFeedback({ type: 'success', message: 'Objeto eliminado del inventario.' });
    resetFeedbackLater();
  };

  const renderPlayerSelector = () => {
    if (isPlayerView) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-200">
          <FiUsers className="text-lg" />
          <span>{currentPlayerName || 'Jugador sin nombre'}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-300">Inventario de jugador</span>
        <div className="flex flex-wrap gap-2">
          {playerOptions.length === 0 && (
            <span className="text-xs text-gray-400">No hay jugadores activos.</span>
          )}
          {playerOptions.map((name) => {
            const isActive = name === selectedPlayer;
            return (
              <button
                key={name}
                onClick={() => setSelectedPlayer(name)}
                className={`px-3 py-1 rounded-full text-sm transition-colors border ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderItems = () => {
    if (!selectedPlayer) {
      return (
        <div className="text-sm text-gray-400 bg-gray-800/60 rounded p-4 border border-gray-700">
          Selecciona un jugador para ver su inventario.
        </div>
      );
    }

    if (!entries || entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-gray-700 rounded-lg bg-gray-800/60">
          <FaBoxOpen className="text-4xl text-gray-600" />
          <p className="text-sm text-gray-400 text-center max-w-xs">
            {isPlayerView
              ? 'Todavía no has comprado objetos. Visita la tienda para adquirir tus primeras recompensas.'
              : 'Este jugador no tiene objetos registrados. Puedes agregar nuevos desde las sugerencias o crear uno personalizado.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map((entry) => {
          const accent = resolveRarityColor(entry.rarity, rarityColorMap);
          return (
            <div
              key={entry.entryId}
              className="relative rounded-lg border border-gray-700 bg-slate-900/90 p-4 shadow-lg"
              style={{ boxShadow: `0 18px 35px -28px ${accent}AA` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">{entry.itemName}</h3>
                  <p className="text-xs text-gray-300 mt-1">{entry.typeLabel || 'Objeto'}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full border"
                  style={{
                    borderColor: accent,
                    color: accent,
                    backgroundColor: `${accent}22`,
                  }}
                >
                  {entry.rarity || 'Común'}
                </span>
              </div>
              <div className="mt-3 text-xs text-gray-300 flex items-center justify-between">
                <span>Costo: {formatCost(entry.cost)}</span>
                <span>{formatTimestamp(entry.timestamp)}</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">Origen: {entry.source === 'shop' ? 'Tienda' : 'Manual'}</div>
              {canManageInventory && (
                <button
                  onClick={() => handleRemoveItem(entry.entryId)}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-500"
                  title="Eliminar objeto"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-[360px] max-w-[92vw] bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur p-5 text-white space-y-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">Inventario</h2>
          {feedback && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-red-500/20 text-red-200 border border-red-400/40'
              }`}
            >
              {feedback.message}
            </span>
          )}
        </div>
        {renderPlayerSelector()}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar objetos del inventario"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </header>

      {canManageInventory && !isPlayerView && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">Agregar desde catálogo</h3>
            <button
              onClick={handleAddSuggestion}
              disabled={!selectedSuggestion || !selectedPlayer || isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-gray-400 transition-colors"
            >
              <FiPlus /> Añadir
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedSuggestionId(null);
              }}
              placeholder="Buscar en el catálogo"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="max-h-44 overflow-y-auto space-y-2">
              {suggestions.map((item) => {
                const isSelected = selectedSuggestionId === item.id;
                const accent = resolveRarityColor(item.rarity, rarityColorMap);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedSuggestionId(item.id);
                      setQuery(item.name);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-gray-200 hover:bg-slate-700'
                    }`}
                    style={isSelected ? { boxShadow: `0 0 0 1px ${accent}55` } : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-gray-300">{item.typeLabel}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                      <span>Rareza: {item.rarity || 'Común'}</span>
                      <span>Costo: {formatCost(item.cost)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {canManageInventory && !isPlayerView && (
        <section className="space-y-3 border border-slate-800 rounded-lg p-4 bg-slate-900/80">
          <h3 className="text-sm font-semibold text-gray-200">Crear objeto personalizado</h3>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              value={customItem.name}
              onChange={(event) => setCustomItem((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre del objeto"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={customItem.typeLabel}
              onChange={(event) => setCustomItem((prev) => ({ ...prev, typeLabel: event.target.value }))}
              placeholder="Tipo o categoría"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={customItem.cost}
                onChange={(event) => setCustomItem((prev) => ({ ...prev, cost: event.target.value }))}
                placeholder="Costo"
                className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={customItem.rarity}
                onChange={(event) => setCustomItem((prev) => ({ ...prev, rarity: event.target.value }))}
                placeholder="Rareza"
                className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={handleAddCustom}
            disabled={!customItem.name.trim() || !selectedPlayer || isSaving}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-400 transition-colors"
          >
            <FiPlus /> Guardar en inventario
          </button>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">Objetos almacenados</h3>
        {renderItems()}
      </section>
    </div>
  );
};

InventoryMenu.propTypes = {
  inventories: PropTypes.objectOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        entryId: PropTypes.string.isRequired,
        itemId: PropTypes.string,
        itemName: PropTypes.string.isRequired,
        typeLabel: PropTypes.string,
        rarity: PropTypes.string,
        cost: PropTypes.number,
        timestamp: PropTypes.number,
        source: PropTypes.string,
      })
    )
  ),
  availablePlayers: PropTypes.arrayOf(PropTypes.string),
  isPlayerView: PropTypes.bool,
  currentPlayerName: PropTypes.string,
  availableItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      typeLabel: PropTypes.string,
      rarity: PropTypes.string,
      searchText: PropTypes.string,
      cost: PropTypes.number,
    })
  ),
  rarityColorMap: PropTypes.object,
  onAddItem: PropTypes.func,
  onRemoveItem: PropTypes.func,
  canManageInventory: PropTypes.bool,
};

export default InventoryMenu;
