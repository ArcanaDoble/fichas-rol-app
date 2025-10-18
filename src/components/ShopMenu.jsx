import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FaCoins } from 'react-icons/fa';
import { FiChevronRight, FiPlus, FiSearch, FiX } from 'react-icons/fi';

const navigationTabs = [
  { id: 'recommended', label: 'Recomendados', active: true },
  { id: 'all', label: 'Todos los objetos' },
  { id: 'sets', label: 'Sets de objetos' },
];

const rarityPalettes = {
  legendaria: 'from-amber-500/25 via-slate-900 to-slate-950',
  epica: 'from-fuchsia-500/30 via-slate-900 to-slate-950',
  rara: 'from-sky-500/25 via-slate-900 to-slate-950',
  poco_comun: 'from-emerald-500/25 via-slate-900 to-slate-950',
  comun: 'from-slate-700/25 via-slate-900 to-slate-950',
};

const typePalettes = {
  weapon: 'from-orange-500/25 via-slate-900 to-slate-950',
  armor: 'from-blue-500/25 via-slate-900 to-slate-950',
  ability: 'from-purple-500/25 via-slate-900 to-slate-950',
};

const MAX_RESULTS = 18;

const normalizeKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const getItemPalette = (item) => {
  const normalizedRarity = normalizeKey(item?.rarity || '');
  if (normalizedRarity && rarityPalettes[normalizedRarity]) {
    return rarityPalettes[normalizedRarity];
  }
  if (item?.type && typePalettes[item.type]) {
    return typePalettes[item.type];
  }
  return 'from-amber-500/20 via-slate-900 to-slate-950';
};

const formatCostLabel = (item) => {
  if (item?.costLabel) return item.costLabel;
  if (typeof item?.cost === 'number' && Number.isFinite(item.cost)) {
    return item.cost.toLocaleString('es-ES');
  }
  return '0';
};

const buildPlaceholderItem = (id) => ({
  id,
  name: 'Objeto no disponible',
  type: 'unknown',
  typeLabel: 'Sin datos',
  cost: 0,
  costLabel: '—',
  tags: [],
  summary: [],
  description:
    'Este objeto ya no está en el catálogo. Elimínalo o selecciona una alternativa.',
  rarity: '',
  searchText: '',
});

const ShopMenu = ({
  gold,
  onGoldChange,
  readOnly = false,
  suggestedItemIds = [],
  onSuggestedItemsChange = () => {},
  availableItems = [],
}) => {
  const [search, setSearch] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);

  const catalogMap = useMemo(() => {
    const map = new Map();
    availableItems.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    return map;
  }, [availableItems]);

  const suggestionEntries = useMemo(
    () =>
      suggestedItemIds.map((id) => {
        const item = catalogMap.get(id);
        if (item) {
          return { id, item, missing: false };
        }
        return { id, item: buildPlaceholderItem(id), missing: true };
      }),
    [catalogMap, suggestedItemIds]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredSuggestions = useMemo(() => {
    if (!normalizedSearch) return suggestionEntries;
    return suggestionEntries.filter(({ item, missing }) => {
      if (missing) return false;
      return item.searchText?.includes(normalizedSearch);
    });
  }, [normalizedSearch, suggestionEntries]);

  const searchResults = useMemo(() => {
    if (readOnly) return [];
    if (suggestedItemIds.length >= 4 && !normalizedSearch) return [];
    const pool = normalizedSearch
      ? availableItems.filter((item) => item.searchText?.includes(normalizedSearch))
      : availableItems;

    const filtered = pool.filter((item) => !suggestedItemIds.includes(item.id));
    return filtered.slice(0, normalizedSearch ? MAX_RESULTS : Math.min(MAX_RESULTS, 8));
  }, [availableItems, normalizedSearch, readOnly, suggestedItemIds]);

  useEffect(() => {
    if (activeItemId && catalogMap.has(activeItemId)) return;
    if (filteredSuggestions.length > 0) {
      setActiveItemId(filteredSuggestions[0].id);
      return;
    }
    if (suggestionEntries.length > 0) {
      setActiveItemId(suggestionEntries[0].id);
      return;
    }
    if (searchResults.length > 0) {
      setActiveItemId(searchResults[0].id);
      return;
    }
    setActiveItemId(null);
  }, [activeItemId, catalogMap, filteredSuggestions, suggestionEntries, searchResults]);

  const activeItem = activeItemId ? catalogMap.get(activeItemId) : null;

  const handleSelectSuggestion = (id) => {
    setActiveItemId(id);
  };

  const handleRemoveSuggestion = (id, event) => {
    event?.stopPropagation();
    if (readOnly) return;
    const filtered = suggestedItemIds.filter((itemId) => itemId !== id);
    onSuggestedItemsChange(filtered);
    if (activeItemId === id) {
      const fallback = filteredSuggestions.find((entry) => entry.id !== id);
      if (fallback) {
        setActiveItemId(fallback.id);
      } else {
        setActiveItemId(null);
      }
    }
  };

  const handleAddSuggestion = (id) => {
    if (readOnly) return;
    if (suggestedItemIds.includes(id)) {
      setActiveItemId(id);
      return;
    }
    if (suggestedItemIds.length >= 4) return;
    onSuggestedItemsChange([...suggestedItemIds, id]);
    setActiveItemId(id);
    setSearch('');
  };

  const emptyStateText = readOnly
    ? 'El máster aún no ha configurado objetos sugeridos.'
    : 'Aún no has seleccionado objetos. Usa la búsqueda para añadir hasta 4 sugerencias.';

  return (
    <div className="w-[600px] text-white z-40">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center space-x-3 text-xs uppercase tracking-[0.25em] text-slate-300">
            {navigationTabs.map((tab) => (
              <span
                key={tab.id}
                className={`pb-1 transition-colors ${
                  tab.active
                    ? 'text-amber-300 border-b-2 border-amber-400'
                    : 'text-slate-500 border-b-2 border-transparent hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-amber-500/40 shadow-inner">
            <FaCoins className="text-amber-300" />
            <input
              type="number"
              min={0}
              max={9999}
              value={gold}
              readOnly={readOnly}
              onChange={(event) => onGoldChange && onGoldChange(event.target.value)}
              className={`bg-transparent w-20 text-right text-sm font-semibold focus:outline-none ${
                readOnly ? 'text-slate-300 cursor-default' : 'text-amber-200'
              }`}
            />
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="flex items-center gap-3 bg-slate-900/70 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-300">
            <FiSearch className="text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={readOnly ? 'Filtrar sugerencias' : 'Buscar objetos o palabras clave'}
              className="bg-transparent flex-1 text-sm placeholder:text-slate-500 focus:outline-none"
              readOnly={readOnly && suggestionEntries.length === 0}
            />
          </div>

          <div className="grid grid-cols-[1.7fr,1fr] gap-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Sugeridos</div>
                  {!readOnly && (
                    <div className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">
                      {suggestedItemIds.length}/4 seleccionados
                    </div>
                  )}
                </div>
                {filteredSuggestions.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
                    {emptyStateText}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {filteredSuggestions.map(({ id, item, missing }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectSuggestion(id)}
                        className={`relative rounded-xl border border-slate-800/70 bg-gradient-to-br ${getItemPalette(
                          item
                        )} p-3 shadow-lg transition-all duration-200 text-left ${
                          activeItemId === id ? 'ring-2 ring-amber-400/70 shadow-amber-500/30' : 'hover:shadow-amber-500/20'
                        } ${missing ? 'opacity-80' : ''}`}
                      >
                        <div className="flex items-start justify-between text-[0.65rem] uppercase tracking-[0.35em] text-slate-300">
                          <span>{item.typeLabel}</span>
                          <span className="text-amber-300">{formatCostLabel(item)}</span>
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-100 leading-tight line-clamp-2">
                          {item.name}
                        </div>
                        {item.tags?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-slate-300">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-700/70"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
                          <span>{missing ? 'Sin datos' : 'Ver detalles'}</span>
                          <FiChevronRight className="text-slate-500" />
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={(event) => handleRemoveSuggestion(id, event)}
                            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white"
                            aria-label="Eliminar sugerencia"
                          >
                            <FiX />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!readOnly && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Catálogo
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">
                      {searchResults.length}{' '}
                      {normalizedSearch ? 'resultados' : 'destacados'}
                    </div>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-4 text-sm text-slate-400">
                      {normalizedSearch
                        ? 'No encontramos objetos que coincidan con tu búsqueda.'
                        : 'Empieza a escribir para buscar en el catálogo completo.'}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddSuggestion(item.id)}
                          className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-left hover:border-amber-500/60 hover:text-amber-200 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-slate-100">{item.name}</div>
                            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
                              {item.typeLabel}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
                            {formatCostLabel(item)}
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200">
                              <FiPlus />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 shadow-inner min-h-[360px]">
              {activeItem ? (
                <>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {activeItem.typeLabel}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-100 leading-snug">
                    {activeItem.name}
                  </div>
                  {activeItem.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeItem.tags.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/80 text-[0.65rem] uppercase tracking-[0.25em] text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {activeItem.summary?.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                        Detalles
                      </div>
                      <ul className="space-y-1 text-sm text-slate-200">
                        {activeItem.summary.map((entry) => (
                          <li key={`${activeItem.id}-${entry.label}`} className="flex justify-between gap-2">
                            <span className="text-slate-400">{entry.label}</span>
                            <span className="text-slate-200">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-4 text-sm text-slate-300 leading-relaxed flex-1">
                    {activeItem.description || 'No hay descripción disponible para este objeto.'}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                      <span>Costo</span>
                      <span className="text-amber-300">{formatCostLabel(activeItem)}</span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full bg-amber-500/80 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
                    >
                      Comprar por {formatCostLabel(activeItem)}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-slate-400">
                  Selecciona un objeto para ver sus detalles.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ShopMenu.propTypes = {
  gold: PropTypes.number.isRequired,
  onGoldChange: PropTypes.func,
  readOnly: PropTypes.bool,
  suggestedItemIds: PropTypes.arrayOf(PropTypes.string),
  onSuggestedItemsChange: PropTypes.func,
  availableItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      typeLabel: PropTypes.string.isRequired,
      cost: PropTypes.number,
      costLabel: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      summary: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        })
      ),
      description: PropTypes.string,
      rarity: PropTypes.string,
      searchText: PropTypes.string,
    })
  ),
};

export default ShopMenu;
