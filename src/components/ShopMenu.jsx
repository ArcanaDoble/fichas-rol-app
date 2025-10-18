import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FaCoins } from 'react-icons/fa';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiX,
} from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { clampShopGold, normalizeShopConfig, SHOP_GOLD_BOUNDS } from '../utils/shop';

const navigationTabs = [
  { id: 'recommended', label: 'Recomendados', active: true },
  { id: 'all', label: 'Todos los objetos' },
  { id: 'sets', label: 'Sets de objetos' },
];

const MAX_RESULTS = 18;
const DEFAULT_RARITY_COLOR = '#94a3b8';

const normalizeKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const parseHexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const sanitized = hex.trim().replace('#', '');
  if (![3, 6].includes(sanitized.length)) return null;
  const expanded =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => char + char)
          .join('')
      : sanitized;
  const numeric = Number.parseInt(expanded, 16);
  if (Number.isNaN(numeric)) return null;
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const buildRgba = (rgb, alpha) =>
  `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;

const resolveRarityColor = (rarity, palette = {}) => {
  if (!rarity) return null;
  if (palette[rarity]) return palette[rarity];
  const normalized = normalizeKey(rarity);
  const match = Object.entries(palette).find(
    ([key]) => normalizeKey(key) === normalized
  );
  return match ? match[1] : null;
};

const buildItemVisuals = (item, rarityColorMap) => {
  const resolvedColor = resolveRarityColor(item?.rarity, rarityColorMap) || DEFAULT_RARITY_COLOR;
  const rgb = parseHexToRgb(resolvedColor);
  if (!rgb) {
    return {
      accentColor: resolvedColor,
      cardStyle: {},
      activeStyle: {},
      previewStyle: {},
      badgeStyle: {},
    };
  }
  const accentColor = buildRgba(rgb, 0.65);
  return {
    accentColor,
    cardStyle: {
      backgroundImage: `linear-gradient(135deg, ${buildRgba(rgb, 0.3)} 0%, rgba(15,23,42,0.94) 55%, rgba(9,13,23,0.95) 100%)`,
      borderColor: buildRgba(rgb, 0.45),
    },
    activeStyle: {
      boxShadow: `0 0 0 2px ${buildRgba(rgb, 0.7)}, 0 22px 45px -30px ${buildRgba(rgb, 0.85)}`,
    },
    previewStyle: {
      borderColor: buildRgba(rgb, 0.45),
      boxShadow: `0 28px 55px -36px ${buildRgba(rgb, 0.85)}`,
      background: `linear-gradient(150deg, ${buildRgba(rgb, 0.18)} 0%, rgba(15,23,42,0.9) 58%, rgba(9,13,23,0.94) 100%)`,
    },
    badgeStyle: {
      backgroundColor: buildRgba(rgb, 0.18),
      borderColor: buildRgba(rgb, 0.35),
      color: resolvedColor,
    },
  };
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
  config = {},
  onConfigChange,
  onApply,
  readOnly = false,
  activePlayers = [],
  availableItems = [],
  currentPlayerName = '',
  onPurchase,
  rarityColorMap = {},
  hasPendingChanges = false,
}) => {
  const [search, setSearch] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(null);
  const highlightTimeoutRef = useRef(null);
  const lastPurchaseRef = useRef(null);
  const [masterPurchaseNotice, setMasterPurchaseNotice] = useState(null);
  const normalizedConfig = useMemo(() => normalizeShopConfig(config), [config]);

  const {
    gold: baseGold,
    suggestedItemIds = [],
    playerWallets = {},
    lastPurchase,
  } = normalizedConfig;

  const previousSuggestionsRef = useRef([...(suggestedItemIds || [])]);

  const normalizedSearch = search.trim().toLowerCase();

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

  const clearHighlightTimeout = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, []);

  const triggerHighlight = useCallback(
    (id, reason = 'added') => {
      if (!id) return;
      setHighlightPulse({ id, reason, key: `${id}-${Date.now()}-${reason}` });
      clearHighlightTimeout();
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightPulse((current) => (current?.id === id ? null : current));
        highlightTimeoutRef.current = null;
      }, 1400);
    },
    [clearHighlightTimeout]
  );

  useEffect(() => () => clearHighlightTimeout(), [clearHighlightTimeout]);

  useEffect(() => {
    const previous = previousSuggestionsRef.current || [];
    const added = suggestedItemIds.find((id) => id && !previous.includes(id));
    if (added) {
      triggerHighlight(added, 'added');
    }
    previousSuggestionsRef.current = [...suggestedItemIds];
  }, [suggestedItemIds, triggerHighlight]);

  useEffect(() => {
    if (!lastPurchase || !lastPurchase.itemId) return;
    const previous = lastPurchaseRef.current;
    const hasChanged =
      !previous ||
      previous.itemId !== lastPurchase.itemId ||
      previous.timestamp !== lastPurchase.timestamp;
    if (hasChanged) {
      triggerHighlight(lastPurchase.itemId, 'purchase');
      if (!readOnly) {
        const noticeKey = `${lastPurchase.itemId}-${lastPurchase.timestamp || Date.now()}`;
        setMasterPurchaseNotice({ ...lastPurchase, key: noticeKey });
      }
    }
    lastPurchaseRef.current = lastPurchase;
  }, [lastPurchase, readOnly, triggerHighlight]);

  useEffect(() => {
    if (readOnly) {
      setMasterPurchaseNotice(null);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!masterPurchaseNotice) return undefined;
    const timeout = setTimeout(() => {
      setMasterPurchaseNotice(null);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [masterPurchaseNotice]);

  useEffect(() => {
    if (
      activeItemId &&
      (catalogMap.has(activeItemId) || suggestionEntries.some((entry) => entry.id === activeItemId))
    ) {
      return;
    }
    if (filteredSuggestions.length > 0) {
      setActiveItemId(filteredSuggestions[0].id);
      return;
    }
    if (suggestionEntries.length > 0) {
      setActiveItemId(suggestionEntries[0].id);
      return;
    }
    if (!readOnly && searchResults.length > 0) {
      setActiveItemId(searchResults[0].id);
      return;
    }
    setActiveItemId(null);
  }, [
    activeItemId,
    catalogMap,
    filteredSuggestions,
    suggestionEntries,
    searchResults,
    readOnly,
  ]);

  useEffect(() => {
    if (!purchaseStatus) return undefined;
    const timeout = setTimeout(() => setPurchaseStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [purchaseStatus]);

  const isEditable = !readOnly && typeof onConfigChange === 'function';
  const canApply = isEditable && typeof onApply === 'function';

  const knownPlayers = useMemo(() => {
    const combined = new Set(
      activePlayers.map((name) => (name || '').trim()).filter(Boolean)
    );
    Object.keys(playerWallets).forEach((name) => {
      const trimmed = (name || '').trim();
      if (trimmed) combined.add(trimmed);
    });
    return Array.from(combined).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [activePlayers, playerWallets]);

  const activePlayerSet = useMemo(
    () => new Set(activePlayers.map((name) => (name || '').trim()).filter(Boolean)),
    [activePlayers]
  );

  const getPlayerGold = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return baseGold;
    const stored = playerWallets[trimmed];
    return typeof stored === 'number' ? stored : baseGold;
  };

  const currentPlayerGold = useMemo(
    () => getPlayerGold(currentPlayerName),
    [currentPlayerName, baseGold, playerWallets]
  );

  const [displayGold, setDisplayGold] = useState(() =>
    Number.isFinite(currentPlayerGold) ? currentPlayerGold : 0
  );
  const [goldTrend, setGoldTrend] = useState(null);
  const [goldDelta, setGoldDelta] = useState(0);
  const [goldPulseKey, setGoldPulseKey] = useState(0);
  const previousGoldRef = useRef(
    Number.isFinite(currentPlayerGold) ? currentPlayerGold : 0
  );
  const goldAnimationFrameRef = useRef(null);
  const goldTrendTimeoutRef = useRef(null);

  useEffect(() => {
    const numericCurrentGold = Number.isFinite(currentPlayerGold)
      ? currentPlayerGold
      : 0;
    if (typeof window === 'undefined') {
      setDisplayGold(numericCurrentGold);
      previousGoldRef.current = numericCurrentGold;
      return undefined;
    }

    const cancelOngoingAnimation = () => {
      if (goldAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(goldAnimationFrameRef.current);
        goldAnimationFrameRef.current = null;
      }
      if (goldTrendTimeoutRef.current) {
        clearTimeout(goldTrendTimeoutRef.current);
        goldTrendTimeoutRef.current = null;
      }
    };

    if (isEditable) {
      cancelOngoingAnimation();
      setDisplayGold(numericCurrentGold);
      setGoldTrend(null);
      setGoldDelta(0);
      previousGoldRef.current = numericCurrentGold;
      return undefined;
    }

    const previousGold =
      typeof previousGoldRef.current === 'number'
        ? previousGoldRef.current
        : numericCurrentGold;

    if (previousGold === numericCurrentGold) {
      setDisplayGold(numericCurrentGold);
      previousGoldRef.current = numericCurrentGold;
      return undefined;
    }

    cancelOngoingAnimation();

    const delta = numericCurrentGold - previousGold;
    const duration = Math.min(1600, Math.max(600, Math.abs(delta) * 35));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    setGoldDelta(delta);
    setGoldTrend(delta > 0 ? 'up' : 'down');
    setGoldPulseKey((key) => key + 1);

    let startTime = null;

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const nextValue = Math.round(previousGold + delta * eased);
      setDisplayGold(nextValue);

      if (progress < 1) {
        goldAnimationFrameRef.current = window.requestAnimationFrame(step);
      } else {
        setDisplayGold(numericCurrentGold);
        goldAnimationFrameRef.current = null;
      }
    };

    goldAnimationFrameRef.current = window.requestAnimationFrame(step);

    goldTrendTimeoutRef.current = setTimeout(() => {
      setGoldTrend(null);
      setGoldDelta(0);
      goldTrendTimeoutRef.current = null;
    }, duration + 500);

    previousGoldRef.current = numericCurrentGold;

    return () => {
      cancelOngoingAnimation();
    };
  }, [currentPlayerGold, isEditable]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && goldAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(goldAnimationFrameRef.current);
    }
    if (goldTrendTimeoutRef.current) {
      clearTimeout(goldTrendTimeoutRef.current);
    }
  }, []);

  const activeEntry = suggestionEntries.find((entry) => entry.id === activeItemId);
  const activeItem =
    activeEntry?.item || (activeItemId ? catalogMap.get(activeItemId) : null);
  const activeVisuals = activeItem ? buildItemVisuals(activeItem, rarityColorMap) : null;
  const activeItemSold = lastPurchase?.itemId === activeItemId;

  const handleBaseGoldChange = (event) => {
    if (!isEditable || !onConfigChange) return;
    onConfigChange((prev) => ({
      ...prev,
      gold: clampShopGold(event.target.value),
    }));
  };

  const handlePlayerGoldChange = (player, value) => {
    if (!isEditable || !onConfigChange) return;
    const trimmed = (player || '').trim();
    if (!trimmed) return;
    const numeric = value === '' ? null : clampShopGold(value);
    onConfigChange((prev) => {
      const nextWallets = { ...(prev.playerWallets || {}) };
      if (numeric === null) {
        delete nextWallets[trimmed];
      } else {
        nextWallets[trimmed] = numeric;
      }
      return {
        ...prev,
        playerWallets: nextWallets,
      };
    });
  };

  const handleResetPlayerGold = (player) => {
    if (!isEditable || !onConfigChange) return;
    const trimmed = (player || '').trim();
    if (!trimmed) return;
    onConfigChange((prev) => {
      if (!prev.playerWallets) return prev;
      const nextWallets = { ...prev.playerWallets };
      delete nextWallets[trimmed];
      return {
        ...prev,
        playerWallets: nextWallets,
      };
    });
  };

  const handleSelectSuggestion = (id) => {
    setActiveItemId(id);
  };

  const handleRemoveSuggestion = (id, event) => {
    event?.stopPropagation();
    if (!isEditable || !onConfigChange) return;
    onConfigChange((prev) => {
      const nextSuggestions = (prev.suggestedItemIds || []).filter((itemId) => itemId !== id);
      const nextConfig = {
        ...prev,
        suggestedItemIds: nextSuggestions,
      };
      if (prev?.lastPurchase?.itemId === id) {
        nextConfig.lastPurchase = null;
      }
      return nextConfig;
    });
    if (activeItemId === id) {
      const fallback = filteredSuggestions.find((entry) => entry.id !== id);
      setActiveItemId(fallback ? fallback.id : null);
    }
  };

  const handleAddSuggestion = (id) => {
    if (!isEditable || !onConfigChange) return;
    if (suggestedItemIds.includes(id)) {
      setActiveItemId(id);
      return;
    }
    if (suggestedItemIds.length >= 4) return;
    onConfigChange((prev) => ({
      ...prev,
      suggestedItemIds: [...(prev.suggestedItemIds || []), id],
    }));
    setActiveItemId(id);
    setSearch('');
  };

  const handleApply = () => {
    if (!canApply) return;
    onApply();
  };

  const canPurchase =
    !isEditable &&
    typeof onPurchase === 'function' &&
    activeItem &&
    !activeEntry?.missing &&
    typeof activeItem.cost === 'number' &&
    activeItem.cost <= currentPlayerGold &&
    !activeItemSold &&
    !isPurchasing;

  const insufficientGold =
    !isEditable &&
    activeItem &&
    typeof activeItem.cost === 'number' &&
    activeItem.cost > currentPlayerGold &&
    !activeItemSold;

  const masterNoticeCostLabel =
    masterPurchaseNotice && typeof masterPurchaseNotice.cost === 'number'
      ? masterPurchaseNotice.cost.toLocaleString('es-ES')
      : null;

  const masterNoticeDetails = useMemo(() => {
    if (!masterPurchaseNotice) return [];
    const details = [];
    if (masterPurchaseNotice.typeLabel) {
      details.push(masterPurchaseNotice.typeLabel);
    }
    if (masterNoticeCostLabel) {
      details.push(`Costo: ${masterNoticeCostLabel} de oro`);
    }
    return details;
  }, [masterNoticeCostLabel, masterPurchaseNotice]);

  const handlePurchase = async () => {
    if (!canPurchase || !onPurchase || !activeItem) return;
    setIsPurchasing(true);
    try {
      const result = await Promise.resolve(onPurchase(activeItem));
      if (result && result.success) {
        const remaining = typeof result.remaining === 'number' ? result.remaining : null;
        const baseMessage = `¡Has comprado ${activeItem.name}!`;
        const inventoryMessage = ' El objeto se ha guardado en tu inventario.';
        setPurchaseStatus({
          type: 'success',
          message:
            remaining !== null
              ? `${baseMessage} Oro restante: ${remaining}.${inventoryMessage}`
              : `${baseMessage}${inventoryMessage}`,
        });
        triggerHighlight(activeEntry?.id || activeItem.id, 'purchase');
      } else {
        let message = result?.message;
        if (!message) {
          message =
            result?.reason === 'insufficient-gold'
              ? 'No tienes suficiente oro para comprar este objeto.'
              : result?.reason === 'item-sold'
                ? 'Este objeto ya fue vendido.'
              : 'No se pudo completar la compra.';
        }
        setPurchaseStatus({ type: 'error', message });
      }
    } catch (error) {
      console.error('Error procesando compra:', error);
      setPurchaseStatus({
        type: 'error',
        message: 'No se pudo completar la compra.',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const emptyStateText = readOnly
    ? 'El máster aún no ha configurado objetos sugeridos.'
    : 'Aún no has seleccionado objetos. Usa la búsqueda para añadir hasta 4 sugerencias.';

  const headerGoldLabel = isEditable ? 'Oro base' : 'Tu oro';
  const currentGoldNumeric = Number.isFinite(currentPlayerGold)
    ? currentPlayerGold
    : 0;
  const safeDisplayGold = Number.isFinite(displayGold)
    ? Math.round(displayGold)
    : Math.round(currentGoldNumeric);
  const formattedDisplayGold = safeDisplayGold.toLocaleString('es-ES');
  const roundedDelta = Math.round(Math.abs(goldDelta));
  const formattedGoldDelta =
    goldTrend && roundedDelta > 0
      ? `${goldDelta > 0 ? '+' : '−'}${roundedDelta.toLocaleString('es-ES')}`
      : '';
  const goldContainerTrendClass =
    !isEditable && goldTrend === 'up'
      ? 'gold-flash-up'
      : !isEditable && goldTrend === 'down'
        ? 'gold-flash-down'
        : '';
  const goldTextTrendClass = !isEditable
    ? goldTrend === 'up'
      ? 'text-emerald-200'
      : goldTrend === 'down'
        ? 'text-rose-200'
        : 'text-amber-200'
    : 'text-amber-200';
  const goldIconTrendClass = !isEditable
    ? goldTrend === 'up'
      ? 'text-emerald-300'
      : goldTrend === 'down'
        ? 'text-rose-300'
        : 'text-amber-200'
    : 'text-amber-300';
  return (
    <div className="w-[640px] text-white z-40">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-slate-300">
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
          <div className="flex flex-col items-end gap-2">
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
              {headerGoldLabel}
            </span>
            <div
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                isEditable
                  ? 'border-amber-500/40 bg-slate-900/80 shadow-inner'
                  : `border-slate-700/60 bg-slate-900/60 ${goldContainerTrendClass}`
              }`}
            >
              <FaCoins className={`transition-colors ${goldIconTrendClass}`} />
              {isEditable ? (
                <input
                  type="number"
                  min={SHOP_GOLD_BOUNDS.min}
                  max={SHOP_GOLD_BOUNDS.max}
                  value={baseGold}
                  onChange={handleBaseGoldChange}
                  className="bg-transparent w-20 text-right text-sm font-semibold focus:outline-none text-amber-200"
                />
              ) : (
                <div className="relative">
                  <span
                    className={`text-sm font-semibold tabular-nums transition-colors duration-300 ${goldTextTrendClass}`}
                  >
                    {formattedDisplayGold}
                  </span>
                  {formattedGoldDelta && (
                    <span
                      key={goldPulseKey}
                      className={`pointer-events-none absolute right-0 -top-4 text-[0.65rem] font-semibold tabular-nums tracking-[0.25em] ${
                        goldTrend === 'up'
                          ? 'text-emerald-300 gold-delta-up'
                          : 'text-rose-300 gold-delta-down'
                      }`}
                    >
                      {formattedGoldDelta}
                    </span>
                  )}
                </div>
              )}
            </div>
            {canApply && (
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasPendingChanges}
                className={`inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.3em] px-3 py-1.5 rounded-full border transition ${
                  hasPendingChanges
                    ? 'border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/10'
                    : 'border-slate-700 text-slate-500 cursor-not-allowed opacity-70'
                }`}
              >
                <FiRefreshCw className="text-sm" />
                Actualizar tienda
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4 space-y-5">
          <AnimatePresence>
            {!readOnly && masterPurchaseNotice ? (
              <motion.div
                key={masterPurchaseNotice.key}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-lg"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/20 text-lg">
                  <FiShoppingBag />
                </span>
                <div className="flex-1">
                  <div className="font-semibold leading-tight">
                    {masterPurchaseNotice.buyer}{' '}
                    <span className="font-normal text-amber-200/90">compró</span>{' '}
                    <span className="font-semibold text-amber-100">
                      {masterPurchaseNotice.itemName || 'un objeto'}
                    </span>
                  </div>
                  {masterNoticeDetails.length > 0 && (
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-200/80">
                      {masterNoticeDetails.join(' • ')}
                    </div>
                  )}
                  <div className="mt-2 text-[0.7rem] text-amber-200/70">
                    La tienda se sincronizó con esta compra.
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {isEditable && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-4 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Oro por jugador
                </div>
                {hasPendingChanges ? (
                  <span className="text-[0.65rem] uppercase tracking-[0.3em] text-amber-300">
                    Cambios sin sincronizar
                  </span>
                ) : (
                  <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                    Sin cambios pendientes
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                {knownPlayers.length === 0 ? (
                  <div className="text-sm text-slate-400 bg-slate-950/60 border border-dashed border-slate-700 rounded-lg px-3 py-4">
                    Todavía no hay jugadores con fichas activas en el mapa.
                  </div>
                ) : (
                  knownPlayers.map((player) => {
                    const displayValue = getPlayerGold(player);
                    const hasCustomValue = Object.prototype.hasOwnProperty.call(
                      playerWallets,
                      player
                    );
                    const inactive = !activePlayerSet.has(player);
                    return (
                      <div
                        key={player}
                        className="flex items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/70 rounded-lg px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{player}</div>
                          {inactive && (
                            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                              Sin token activo
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-full px-3 py-1.5">
                            <FaCoins className="text-amber-300" />
                            <input
                              type="number"
                              min={SHOP_GOLD_BOUNDS.min}
                              max={SHOP_GOLD_BOUNDS.max}
                              value={displayValue}
                              onChange={(event) =>
                                handlePlayerGoldChange(player, event.target.value)
                              }
                              className="bg-transparent w-20 text-right text-sm font-semibold text-amber-200 focus:outline-none"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleResetPlayerGold(player)}
                            disabled={!hasCustomValue}
                            className={`p-2 rounded-full border transition ${
                              hasCustomValue
                                ? 'border-slate-700 text-slate-300 hover:text-white hover:border-amber-400/70'
                                : 'border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                            title="Restablecer al valor base"
                          >
                            <FiRefreshCw />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Sugeridos
                  </div>
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
                    <AnimatePresence initial={false}>
                      {filteredSuggestions.map(({ id, item, missing }) => {
                        const visuals = buildItemVisuals(item, rarityColorMap);
                        const buttonStyle =
                          activeItemId === id
                            ? { ...visuals.cardStyle, ...visuals.activeStyle }
                            : visuals.cardStyle;
                        const isHighlighted = highlightPulse?.id === id;
                        const highlightTone =
                          highlightPulse?.reason === 'purchase' ? 'purchase' : 'added';
                        const wasLastPurchase = lastPurchase?.itemId === id;
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -12 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            onClick={() => handleSelectSuggestion(id)}
                          className={`relative overflow-hidden rounded-xl border bg-slate-900/70 p-3 shadow-lg transition-all duration-200 text-left ${
                              activeItemId === id
                                ? 'ring-2 ring-amber-400/0'
                                : 'hover:shadow-amber-500/20'
                            } ${missing ? 'opacity-80' : ''}`}
                            style={buttonStyle}
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ translateY: -2 }}
                          >
                            {isHighlighted && (
                              <motion.span
                                key={highlightPulse.key}
                                className={`pointer-events-none absolute -inset-[3px] rounded-[18px] border ${
                                  highlightTone === 'purchase'
                                    ? 'border-amber-400/70'
                                    : 'border-emerald-400/60'
                                }`}
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{
                                  opacity: [0.15, 0.7, 0.6, 0],
                                  scale: [1, 1.04, 1.08, 1.12],
                                }}
                                transition={{
                                  duration: 1.25,
                                  ease: 'easeInOut',
                                  times: [0, 0.35, 0.75, 1],
                                }}
                                style={{ willChange: 'transform, opacity', zIndex: 30 }}
                              />
                            )}
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
                                    className="px-2 py-1 rounded-full border bg-slate-900/70"
                                    style={visuals.badgeStyle}
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
                            {isHighlighted && (
                              <motion.div
                                key={`${highlightPulse.key}-glow`}
                                className={`pointer-events-none absolute inset-0 rounded-[18px] ${
                                  highlightTone === 'purchase'
                                    ? 'bg-amber-400/10'
                                    : 'bg-emerald-400/10'
                                }`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.35, 0.25, 0.15, 0] }}
                                transition={{
                                  duration: 1.3,
                                  ease: 'easeInOut',
                                  times: [0, 0.45, 0.75, 1],
                                }}
                                style={{ willChange: 'opacity', zIndex: 20 }}
                              />
                            )}
                            {wasLastPurchase && (
                              <div
                                className="pointer-events-none absolute inset-0 rounded-[18px] border-2 border-amber-400/70 bg-amber-500/5"
                                style={{ zIndex: 15 }}
                              />
                            )}
                            {wasLastPurchase && (
                              <div
                                className="pointer-events-none absolute -inset-[2px] flex items-center justify-center"
                                style={{ zIndex: 25 }}
                              >
                                <span className="flex items-center gap-2 px-6 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-amber-100 bg-amber-500/25 border border-amber-400/60 shadow-lg -rotate-45 w-[200%] justify-center">
                                  <FiShoppingBag className="text-sm" /> Vendido
                                </span>
                              </div>
                            )}
                            {isEditable && (
                              <button
                                type="button"
                                onClick={(event) => handleRemoveSuggestion(id, event)}
                                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white"
                                aria-label="Eliminar sugerencia"
                              >
                                <FiX />
                              </button>
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
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
            <div
              className="relative flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 shadow-inner min-h-[360px] overflow-hidden"
              style={activeVisuals?.previewStyle}
            >
              {activeItem ? (
                <>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {activeItem.typeLabel}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-100 leading-snug">
                    {activeItem.name}
                  </div>
                  {activeItemSold && (
                    <div
                      className="pointer-events-none absolute -inset-[2px] flex items-center justify-center"
                      style={{ zIndex: 35 }}
                    >
                      <span className="flex items-center gap-2 px-8 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-amber-100 bg-amber-500/25 border border-amber-400/60 shadow-lg -rotate-45 w-[220%] justify-center">
                        <FiShoppingBag className="text-base" /> Vendido
                      </span>
                    </div>
                  )}
                  {activeItem.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeItem.tags.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full border text-[0.65rem] uppercase tracking-[0.25em]"
                          style={activeVisuals?.badgeStyle}
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
                          <li
                            key={`${activeItem.id}-${entry.label}`}
                            className="flex justify-between gap-2"
                          >
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
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                      <span>Costo</span>
                      <span className="text-amber-300">{formatCostLabel(activeItem)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={!canPurchase}
                      className={`w-full bg-amber-500/80 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors ${
                        canPurchase ? '' : 'cursor-not-allowed opacity-60 hover:bg-amber-500/80'
                      }`}
                    >
                      {isPurchasing
                        ? 'Procesando...'
                        : activeItemSold
                          ? 'Vendido'
                          : `Comprar por ${formatCostLabel(activeItem)}`}
                    </button>
                    {insufficientGold && (
                      <div className="flex items-center gap-2 text-xs text-rose-300">
                        <FiAlertTriangle />
                        <span>No tienes suficiente oro para este objeto.</span>
                      </div>
                    )}
                    {purchaseStatus && (
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          purchaseStatus.type === 'success'
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {purchaseStatus.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                        <span>{purchaseStatus.message}</span>
                      </div>
                    )}
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
  config: PropTypes.shape({
    gold: PropTypes.number,
    suggestedItemIds: PropTypes.arrayOf(PropTypes.string),
    playerWallets: PropTypes.objectOf(PropTypes.number),
    lastPurchase: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      itemName: PropTypes.string,
      buyer: PropTypes.string.isRequired,
      typeLabel: PropTypes.string,
      cost: PropTypes.number,
      timestamp: PropTypes.number,
    }),
  }),
  onConfigChange: PropTypes.func,
  onApply: PropTypes.func,
  readOnly: PropTypes.bool,
  activePlayers: PropTypes.arrayOf(PropTypes.string),
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
  currentPlayerName: PropTypes.string,
  onPurchase: PropTypes.func,
  rarityColorMap: PropTypes.objectOf(PropTypes.string),
  hasPendingChanges: PropTypes.bool,
};

export default ShopMenu;
