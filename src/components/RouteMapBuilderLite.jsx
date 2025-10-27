import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Compass, Copy, FileDown, Link2, LockKeyhole, MousePointer2, Redo2, Save, Trash2, Undo2, Wand2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Boton from './Boton';
import Input from './Input';
import { db } from '../firebase';
import { getOrUploadFile } from '../utils/storage';
import {
  NODE_TYPES,
  NODE_STATES,
  TOOLBAR_ACTIONS,
  GRID_SIZES,
  sanitizeCustomIcons,
  readLocalCustomIcons,
  readMinimapLocalCustomIcons,
  normalizeHex,
  mixHex,
  getTypeDefaults,
  applyAppearanceDefaults,
  routeMapReducer,
  initialState,
  saveDraft,
  loadDraft,
  exportRouteMap,
  parseRouteMapFile,
  DEFAULT_GLOW_INTENSITY,
  normalizeGlowIntensity,
} from './routeMap/shared';

const TOOLBAR_ICON_COMPONENTS = {
  select: MousePointer2,
  create: Wand2,
  connect: Link2,
  delete: Trash2,
  toggleLock: LockKeyhole,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lightenHex = (hex, amount) => mixHex(hex, '#ffffff', amount);
const darkenHex = (hex, amount) => mixHex(hex, '#000000', amount);
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.12;
const EDGE_DASH_LENGTH = 26;
const EDGE_DASH_GAP = 18;
const LOCK_ICON_INDEX = 14;

const IconThumb = ({ src, selected, onClick, label, onDelete }) => (
  <div className="relative inline-block">
    <button
      type="button"
      title={label || ''}
      onClick={onClick}
      className={`relative h-14 w-14 overflow-hidden rounded-lg border bg-slate-900/80 transition ${
        selected ? 'border-sky-400 ring-2 ring-sky-400' : 'border-slate-700/80 hover:border-slate-500/80'
      }`}
    >
      <img loading="lazy" src={src} alt={label || 'icon'} className="h-full w-full object-contain" />
    </button>
    {onDelete && (
      <button
        type="button"
        aria-label="Eliminar icono"
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-1 ring-black/40 transition hover:bg-red-500"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" aria-hidden />
      </button>
    )}
  </div>
);

IconThumb.propTypes = {
  src: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  label: PropTypes.string,
  onDelete: PropTypes.func,
};

const RouteMapBuilderLite = ({ onBack }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const panStateRef = useRef(null);
  const dragStateRef = useRef(null);
  const hasAutoCenteredRef = useRef(false);
  const [state, dispatch] = useReducer(routeMapReducer, undefined, initialState);
  const initialCustomIcons = useMemo(() => {
    const routeMapIcons = readLocalCustomIcons();
    const minimapIcons = readMinimapLocalCustomIcons();
    return sanitizeCustomIcons([...(routeMapIcons || []), ...(minimapIcons || [])]);
  }, []);
  const [customIcons, setCustomIcons] = useState(initialCustomIcons);
  const [customIconsReady, setCustomIconsReady] = useState(false);
  const minimapCustomizationDocRef = useMemo(
    () => doc(db, 'minimapSettings', 'customization'),
    [db],
  );
  const routeMapCustomizationDocRef = useMemo(
    () => doc(db, 'routeMapSettings', 'customization'),
    [db],
  );
  const customizationSnapshotRef = useRef({
    minimap: null,
    routeMap: null,
  });
  const customIconSourcesRef = useRef({
    fallback: initialCustomIcons,
    minimap: null,
    routeMap: null,
  });
  const [activeTool, setActiveTool] = useState('select');
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState('normal');
  const [connectOriginId, setConnectOriginId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [statusMessage, setStatusMessage] = useState('');
  const [nodeEditor, setNodeEditor] = useState(null);
  const [edgeEditor, setEdgeEditor] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const centerViewportOnNodes = useCallback(
    (nodes, options = {}) => {
      const container = containerRef.current;
      if (!container || !Array.isArray(nodes) || nodes.length === 0) {
        return;
      }
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      let minX = nodes[0].x;
      let maxX = nodes[0].x;
      let minY = nodes[0].y;
      let maxY = nodes[0].y;
      nodes.forEach((node) => {
        if (node.x < minX) minX = node.x;
        if (node.x > maxX) maxX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.y > maxY) maxY = node.y;
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const desiredScale =
        typeof options.scale === 'number' ? clamp(options.scale, MIN_ZOOM, MAX_ZOOM) : null;
      setViewport((prev) => {
        const nextScale = desiredScale ?? prev.scale;
        return {
          scale: nextScale,
          x: rect.width / 2 - centerX * nextScale,
          y: rect.height / 2 - centerY * nextScale,
        };
      });
    },
    [setViewport],
  );

  const nodesMap = useMemo(() => {
    const map = new Map();
    state.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [state.nodes]);

  const toolbarActions = useMemo(
    () =>
      TOOLBAR_ACTIONS.map((action) => ({
        ...action,
        icon: TOOLBAR_ICON_COMPONENTS[action.id] || MousePointer2,
      })),
    [],
  );

  const currentTool = useMemo(
    () => toolbarActions.find((item) => item.id === activeTool),
    [activeTool, toolbarActions],
  );

  const sanitizedCustomIcons = useMemo(
    () => sanitizeCustomIcons(customIcons),
    [customIcons],
  );
  const lockIconUrl = useMemo(
    () => (sanitizedCustomIcons.length > LOCK_ICON_INDEX ? sanitizedCustomIcons[LOCK_ICON_INDEX] : null),
    [sanitizedCustomIcons],
  );

  const selectedNodes = useMemo(
    () => selectedNodeIds.map((id) => nodesMap.get(id)).filter(Boolean),
    [nodesMap, selectedNodeIds],
  );

  const appearanceValues = useMemo(() => {
    if (selectedNodes.length === 0) {
      const defaults = getTypeDefaults('start');
      return {
        accentColor: defaults.accent,
        fillColor: defaults.fill,
        borderColor: defaults.border,
        iconColor: defaults.icon,
        glowIntensity: DEFAULT_GLOW_INTENSITY,
      };
    }
    const reference = selectedNodes[0];
    const defaults = getTypeDefaults(reference.type);
    return {
      accentColor: normalizeHex(reference.accentColor) || defaults.accent,
      fillColor: normalizeHex(reference.fillColor) || defaults.fill,
      borderColor: normalizeHex(reference.borderColor) || defaults.border,
      iconColor: normalizeHex(reference.iconColor) || defaults.icon,
      glowIntensity: normalizeGlowIntensity(reference.glowIntensity),
    };
  }, [selectedNodes]);

  const mixedAppearance = useMemo(() => {
    if (selectedNodes.length <= 1) {
      return {
        accentColor: false,
        fillColor: false,
        borderColor: false,
        iconColor: false,
        glowIntensity: false,
      };
    }
    const reference = selectedNodes[0];
    const compare = (key) => selectedNodes.some((node) => normalizeHex(node[key]) !== normalizeHex(reference[key]));
    return {
      accentColor: compare('accentColor'),
      fillColor: compare('fillColor'),
      borderColor: compare('borderColor'),
      iconColor: compare('iconColor'),
      glowIntensity: selectedNodes.some(
        (node) => normalizeGlowIntensity(node.glowIntensity) !== normalizeGlowIntensity(reference.glowIntensity),
      ),
    };
  }, [selectedNodes]);

  const customIconSelection = useMemo(() => {
    if (selectedNodes.length === 0) {
      return { url: null, hasAny: false, mixed: false };
    }
    const values = selectedNodes.map((node) => {
      const value = typeof node.iconUrl === 'string' ? node.iconUrl.trim() : '';
      return value || null;
    });
    const hasAny = values.some((value) => value !== null);
    const uniqueValues = Array.from(new Set(values));
    const singleValue = uniqueValues.length === 1 ? uniqueValues[0] : null;
    return {
      url: typeof singleValue === 'string' ? singleValue : null,
      hasAny,
      mixed: hasAny && uniqueValues.length > 1,
    };
  }, [selectedNodes]);

  const ensureVisibleMessage = useCallback((text) => {
    setStatusMessage(text);
    setTimeout(() => setStatusMessage(''), 2200);
  }, []);

  const applyNodeUpdates = useCallback((updater, options = {}) => {
    dispatch({ type: 'UPDATE', updater, skipHistory: options.skipHistory });
  }, []);

  const addNodeAt = useCallback(
    (point) => {
      const typeDef = NODE_TYPES.find((item) => item.id === nodeTypeToCreate) || NODE_TYPES[1];
      const palette = getTypeDefaults(typeDef.id);
      applyNodeUpdates((nodes) => {
        const snappedX = snapToGrid ? Math.round(point.x / gridSize) * gridSize : point.x;
        const snappedY = snapToGrid ? Math.round(point.y / gridSize) * gridSize : point.y;
        nodes.push(
          applyAppearanceDefaults({
            id: nanoid(),
            name: `${typeDef.label} ${nodes.length + 1}`,
            type: typeDef.id,
            x: snappedX,
            y: snappedY,
            state: 'locked',
            unlockMode: 'or',
            loot: '',
            event: '',
            notes: '',
            accentColor: palette.accent,
            fillColor: palette.fill,
            borderColor: palette.border,
            iconColor: palette.icon,
            iconUrl: null,
            glowIntensity: DEFAULT_GLOW_INTENSITY,
          }),
        );
      });
    },
    [applyNodeUpdates, gridSize, nodeTypeToCreate, snapToGrid],
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    applyNodeUpdates((nodes, edges) => {
      const nodeSet = new Set(selectedNodeIds);
      const edgeSet = new Set(selectedEdgeIds);
      for (let i = edges.length - 1; i >= 0; i -= 1) {
        if (edgeSet.has(edges[i].id) || nodeSet.has(edges[i].from) || nodeSet.has(edges[i].to)) {
          edges.splice(i, 1);
        }
      }
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        if (nodeSet.has(nodes[i].id)) {
          nodes.splice(i, 1);
        }
      }
    });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [applyNodeUpdates, selectedEdgeIds, selectedNodeIds]);

  const toggleNodeLock = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    applyNodeUpdates((nodes) => {
      nodes.forEach((node) => {
        if (selectedNodeIds.includes(node.id)) {
          node.state = node.state === 'locked' ? 'unlocked' : 'locked';
        }
      });
    });
  }, [applyNodeUpdates, selectedNodeIds]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const duplicateSelection = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    applyNodeUpdates((nodes, edges) => {
      const nodeIdMap = new Map();
      selectedNodeIds.forEach((id) => {
        const original = nodes.find((node) => node.id === id);
        if (!original) return;
        const cloneId = nanoid();
        nodeIdMap.set(id, cloneId);
        nodes.push({
          ...original,
          id: cloneId,
          name: `${original.name} (copia)`,
          x: original.x + gridSize,
          y: original.y + gridSize,
        });
      });
      state.edges.forEach((edge) => {
        if (nodeIdMap.has(edge.from) && nodeIdMap.has(edge.to)) {
          edges.push({
            ...edge,
            id: nanoid(),
            from: nodeIdMap.get(edge.from),
            to: nodeIdMap.get(edge.to),
          });
        }
      });
    });
  }, [applyNodeUpdates, gridSize, selectedNodeIds, state.edges]);

  const handleAppearanceChange = useCallback(
    (key, value) => {
      if (selectedNodeIds.length === 0) return;
      const normalized = normalizeHex(value);
      if (!normalized) return;
      applyNodeUpdates((nodes) => {
        nodes.forEach((node) => {
          if (selectedNodeIds.includes(node.id)) {
            node[key] = normalized;
          }
        });
      });
    },
    [applyNodeUpdates, selectedNodeIds],
  );

  const handleGlowIntensityChange = useCallback(
    (rawValue) => {
      if (selectedNodeIds.length === 0) return;
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) return;
      const normalized = normalizeGlowIntensity(numeric / 100);
      applyNodeUpdates((nodes) => {
        nodes.forEach((node) => {
          if (selectedNodeIds.includes(node.id)) {
            node.glowIntensity = normalized;
          }
        });
      });
    },
    [applyNodeUpdates, selectedNodeIds],
  );

  const handleResetAppearance = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    applyNodeUpdates((nodes) => {
      nodes.forEach((node) => {
        if (!selectedNodeIds.includes(node.id)) return;
        const defaults = getTypeDefaults(node.type);
        node.accentColor = defaults.accent;
        node.fillColor = defaults.fill;
        node.borderColor = defaults.border;
        node.iconColor = defaults.icon;
        node.glowIntensity = DEFAULT_GLOW_INTENSITY;
      });
    });
  }, [applyNodeUpdates, selectedNodeIds]);

  const applyCustomIconToSelection = useCallback(
    (iconUrl) => {
      if (selectedNodeIds.length === 0) return;
      const normalized = typeof iconUrl === 'string' ? iconUrl.trim() : '';
      applyNodeUpdates((nodes) => {
        nodes.forEach((node) => {
          if (!selectedNodeIds.includes(node.id)) return;
          node.iconUrl = normalized || null;
        });
      }, { skipHistory: false });
    },
    [applyNodeUpdates, selectedNodeIds],
  );

  const handleCustomIconUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      const { url } = await getOrUploadFile(file, 'RouteMapIcons');
      if (url) {
        setCustomIcons((prev) => sanitizeCustomIcons([...(prev || []), url]));
      }
    } catch (error) {
      console.warn('[RouteMapBuilderLite] Error subiendo icono personalizado, usando fallback', error);
      const reader = new FileReader();
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(reader.error);
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        if (typeof dataUrl === 'string' && dataUrl) {
          setCustomIcons((prev) => sanitizeCustomIcons([...(prev || []), dataUrl]));
        }
      } catch (readerError) {
        console.error('[RouteMapBuilderLite] No se pudo leer el icono personalizado', readerError);
      }
    }
  }, []);

  const handleRemoveCustomIcon = useCallback(
    (index) => {
      let removed = null;
      setCustomIcons((prev) => {
        if (!Array.isArray(prev) || index < 0 || index >= prev.length) {
          return prev;
        }
        removed = typeof prev[index] === 'string' ? prev[index].trim() : null;
        const next = prev.filter((_, i) => i !== index);
        return sanitizeCustomIcons(next);
      });
      if (removed) {
        applyNodeUpdates(
          (nodes) => {
            nodes.forEach((node) => {
              if (typeof node.iconUrl === 'string' && node.iconUrl.trim() === removed) {
                node.iconUrl = null;
              }
            });
          },
          { skipHistory: true },
        );
      }
    },
    [applyNodeUpdates],
  );

  useEffect(() => {
    let isUnmounted = false;
    customIconSourcesRef.current.fallback = sanitizeCustomIcons(initialCustomIcons);

    const ensureCombinedIcons = () => {
      const { fallback, minimap, routeMap } = customIconSourcesRef.current;
      const combined = sanitizeCustomIcons([
        ...(Array.isArray(fallback) ? fallback : []),
        ...(Array.isArray(routeMap) ? routeMap : []),
        ...(Array.isArray(minimap) ? minimap : []),
      ]);
      if (isUnmounted) {
        return combined;
      }
      setCustomIcons((prev) => {
        const prevStr = JSON.stringify(sanitizeCustomIcons(prev));
        const combinedStr = JSON.stringify(combined);
        if (prevStr === combinedStr) {
          return prev;
        }
        return combined;
      });
      setCustomIconsReady(true);
      return combined;
    };

    const unsubscribes = [];

    try {
      const unsubscribeMinimap = onSnapshot(
        minimapCustomizationDocRef,
        (snapshot) => {
          if (isUnmounted) return;
          let icons = [];
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            icons = sanitizeCustomIcons(data.customIcons);
          }
          customIconSourcesRef.current.minimap = icons;
          customizationSnapshotRef.current = {
            ...(customizationSnapshotRef.current || {}),
            minimap: JSON.stringify(icons),
          };
          const combined = ensureCombinedIcons();
          if (!snapshot.exists() && combined.length > 0) {
            setDoc(
              minimapCustomizationDocRef,
              {
                customIcons: combined,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            ).catch((error) => {
              console.error('[RouteMapBuilderLite] No se pudo inicializar iconos del minimapa', error);
            });
          }
        },
        (error) => {
          if (!isUnmounted) {
            console.error('[RouteMapBuilderLite] Error al obtener iconos del minimapa', error);
            setCustomIconsReady(true);
          }
        },
      );
      unsubscribes.push(unsubscribeMinimap);
    } catch (error) {
      console.error('[RouteMapBuilderLite] Error al suscribirse al minimapa', error);
      setCustomIconsReady(true);
    }

    try {
      const unsubscribeRouteMap = onSnapshot(
        routeMapCustomizationDocRef,
        (snapshot) => {
          if (isUnmounted) return;
          let icons = [];
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            icons = sanitizeCustomIcons(data.customIcons);
          }
          customIconSourcesRef.current.routeMap = icons;
          customizationSnapshotRef.current = {
            ...(customizationSnapshotRef.current || {}),
            routeMap: JSON.stringify(icons),
          };
          ensureCombinedIcons();
        },
        (error) => {
          if (!isUnmounted) {
            console.error('[RouteMapBuilderLite] Error al obtener iconos de rutas', error);
            setCustomIconsReady(true);
          }
        },
      );
      unsubscribes.push(unsubscribeRouteMap);
    } catch (error) {
      console.error('[RouteMapBuilderLite] Error al suscribirse al mapa de rutas', error);
      setCustomIconsReady(true);
    }

    return () => {
      isUnmounted = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [initialCustomIcons, minimapCustomizationDocRef, routeMapCustomizationDocRef]);

  useEffect(() => {
    if (!customIconsReady) return;
    try {
      window.localStorage.setItem('routeMapCustomIcons', JSON.stringify(sanitizedCustomIcons));
    } catch (error) {
      console.error('[RouteMapBuilderLite] No se pudieron guardar los iconos personalizados', error);
    }
  }, [customIconsReady, sanitizedCustomIcons]);

  useEffect(() => {
    if (!customIconsReady) return;
    const sanitized = sanitizeCustomIcons(customIcons);
    const iconsStr = JSON.stringify(sanitized);
    const lastSnapshots = customizationSnapshotRef.current || {};
    const writes = [];
    if (iconsStr !== lastSnapshots.minimap) {
      writes.push(
        setDoc(
          minimapCustomizationDocRef,
          {
            customIcons: sanitized,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch((error) => {
          console.error('[RouteMapBuilderLite] No se pudieron guardar los iconos del minimapa', error);
        }),
      );
      customizationSnapshotRef.current = {
        ...(customizationSnapshotRef.current || {}),
        minimap: iconsStr,
      };
    }
    if (iconsStr !== lastSnapshots.routeMap) {
      writes.push(
        setDoc(
          routeMapCustomizationDocRef,
          {
            customIcons: sanitized,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch((error) => {
          console.error('[RouteMapBuilderLite] No se pudieron guardar los iconos del mapa de rutas', error);
        }),
      );
      customizationSnapshotRef.current = {
        ...(customizationSnapshotRef.current || {}),
        routeMap: iconsStr,
      };
    }
    if (writes.length > 0) {
      Promise.all(writes).catch(() => {});
    }
  }, [
    customIcons,
    customIconsReady,
    minimapCustomizationDocRef,
    routeMapCustomizationDocRef,
  ]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      hasAutoCenteredRef.current = false;
      dispatch({ type: 'LOAD', nodes: draft.nodes, edges: draft.edges });
    } else {
      hasAutoCenteredRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!state.nodes.length) return;
    if (hasAutoCenteredRef.current) return;
    centerViewportOnNodes(state.nodes, { scale: 1 });
    hasAutoCenteredRef.current = true;
  }, [centerViewportOnNodes, state.nodes]);

  useEffect(() => {
    saveDraft(state.nodes, state.edges);
  }, [state.nodes, state.edges]);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const { clientX, clientY, deltaY } = event;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoomDirection = deltaY > 0 ? -1 : 1;
    const nextScale = clamp(viewport.scale + ZOOM_STEP * zoomDirection, MIN_ZOOM, MAX_ZOOM);
    const scaleRatio = nextScale / viewport.scale;
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    setViewport((prev) => ({
      scale: nextScale,
      x: offsetX - scaleRatio * (offsetX - prev.x),
      y: offsetY - scaleRatio * (offsetY - prev.y),
    }));
  }, [viewport.scale, viewport.x, viewport.y]);

  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (clientX - rect.left - viewport.x) / viewport.scale;
      const y = (clientY - rect.top - viewport.y) / viewport.scale;
      return { x, y };
    },
    [viewport],
  );

  const handleBackgroundPointerDown = useCallback(
    (event) => {
      event.preventDefault();
      if (containerRef.current?.setPointerCapture) {
        try {
          containerRef.current.setPointerCapture(event.pointerId);
        } catch (error) {
          // ignore failures in non-pointer browsers
        }
      }
      if (activeTool === 'create') {
        const world = screenToWorld(event.clientX, event.clientY);
        addNodeAt(world);
        return;
      }
      if (activeTool === 'connect' && connectOriginId) {
        setConnectOriginId(null);
        setSelectedNodeIds([]);
      }
      if (activeTool === 'select') {
        setIsPanning(true);
        panStateRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: viewport.x,
          originY: viewport.y,
        };
        setSelectedNodeIds([]);
        setSelectedEdgeIds([]);
      }
    },
    [activeTool, addNodeAt, connectOriginId, screenToWorld, viewport.x, viewport.y],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (isPanning && panStateRef.current) {
        const { startX, startY, originX, originY } = panStateRef.current;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        setViewport((prev) => ({ ...prev, x: originX + dx, y: originY + dy }));
        return;
      }
      if (dragStateRef.current) {
        const { selectedIds, startPositions } = dragStateRef.current;
        const world = screenToWorld(event.clientX, event.clientY);
        const dx = world.x - dragStateRef.current.origin.x;
        const dy = world.y - dragStateRef.current.origin.y;
        applyNodeUpdates(
          (nodes) => {
            nodes.forEach((node) => {
              if (!selectedIds.has(node.id)) return;
              const start = startPositions.get(node.id);
              let nextX = start.x + dx;
              let nextY = start.y + dy;
              if (snapToGrid) {
                nextX = Math.round(nextX / gridSize) * gridSize;
                nextY = Math.round(nextY / gridSize) * gridSize;
              }
              node.x = nextX;
              node.y = nextY;
            });
          },
          { skipHistory: true },
        );
      }
    },
    [applyNodeUpdates, gridSize, screenToWorld, snapToGrid, isPanning],
  );

  const handlePointerUp = useCallback((event) => {
    if (containerRef.current?.releasePointerCapture && event?.pointerId != null) {
      try {
        containerRef.current.releasePointerCapture(event.pointerId);
      } catch (error) {
        // ignore
      }
    }
    if (isPanning) {
      setIsPanning(false);
      panStateRef.current = null;
    }
    if (dragStateRef.current) {
      dragStateRef.current = null;
      dispatch({ type: 'PUSH_HISTORY' });
    }
  }, [isPanning]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleNodePointerDown = useCallback(
    (event, node) => {
      event.stopPropagation();
      event.preventDefault();
      if (containerRef.current?.setPointerCapture) {
        try {
          containerRef.current.setPointerCapture(event.pointerId);
        } catch (error) {
          // ignore
        }
      }
      if (activeTool === 'delete') {
        setSelectedNodeIds([node.id]);
        deleteSelection();
        return;
      }
      if (activeTool === 'toggleLock') {
        setSelectedNodeIds([node.id]);
        toggleNodeLock();
        return;
      }
      if (activeTool === 'connect') {
        if (!connectOriginId) {
          setConnectOriginId(node.id);
          setSelectedNodeIds([node.id]);
        } else if (connectOriginId !== node.id) {
          applyNodeUpdates((nodes, edges) => {
            const exists = edges.some((edge) => edge.from === connectOriginId && edge.to === node.id);
            if (!exists) {
              edges.push({
                id: nanoid(),
                from: connectOriginId,
                to: node.id,
                type: 'normal',
                controlOffset: { x: 0, y: 0 },
              });
            }
          });
          setConnectOriginId(null);
        }
        return;
      }
      const multi = event.shiftKey;
      let nextSelection = [];
      if (multi) {
        const next = new Set(selectedNodeIds);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        nextSelection = Array.from(next);
      } else {
        nextSelection = [node.id];
      }
      setSelectedNodeIds(nextSelection);
      setSelectedEdgeIds([]);
      if (!nextSelection.includes(node.id)) {
        return;
      }
      const world = screenToWorld(event.clientX, event.clientY);
      dragStateRef.current = {
        origin: world,
        selectedIds: new Set(nextSelection),
        startPositions: new Map(
          nextSelection.map((id) => {
            const target = nodesMap.get(id);
            return [id, { x: target?.x || 0, y: target?.y || 0 }];
          }),
        ),
      };
    },
    [
      activeTool,
      applyNodeUpdates,
      connectOriginId,
      deleteSelection,
      nodesMap,
      screenToWorld,
      selectedNodeIds,
      toggleNodeLock,
    ],
  );

  const handleNodeDoubleClick = useCallback(
    (event, node) => {
      event.stopPropagation();
      setNodeEditor({ ...node });
    },
    [],
  );

  const handleEdgeClick = useCallback(
    (edge, event) => {
      event.stopPropagation();
      if (activeTool === 'delete') {
        setSelectedEdgeIds([edge.id]);
        deleteSelection();
        return;
      }
      setSelectedEdgeIds([edge.id]);
      setSelectedNodeIds([]);
      setEdgeEditor({ ...edge });
    },
    [activeTool, deleteSelection],
  );

  const handleNodeEditorSave = useCallback(() => {
    if (!nodeEditor) return;
    applyNodeUpdates((nodes) => {
      const target = nodes.find((node) => node.id === nodeEditor.id);
      if (!target) return;
      Object.assign(target, applyAppearanceDefaults(nodeEditor));
    });
    setNodeEditor(null);
  }, [applyNodeUpdates, nodeEditor]);

  const handleEdgeEditorSave = useCallback(() => {
    if (!edgeEditor) return;
    applyNodeUpdates((nodes, edges) => {
      const target = edges.find((edge) => edge.id === edgeEditor.id);
      if (target) {
        Object.assign(target, edgeEditor);
      }
    });
    setEdgeEditor(null);
  }, [applyNodeUpdates, edgeEditor]);

  const handleBackgroundInput = useCallback((event) => {
    setBackgroundImage(event.target.value);
  }, []);

  const handleExport = useCallback(() => {
    exportRouteMap(state.nodes, state.edges);
    ensureVisibleMessage('Mapa exportado como JSON');
  }, [ensureVisibleMessage, state.edges, state.nodes]);

  const handleImport = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = await parseRouteMapFile(file);
        hasAutoCenteredRef.current = false;
        dispatch({ type: 'LOAD', nodes: parsed.nodes, edges: parsed.edges });
        ensureVisibleMessage('Mapa importado correctamente');
      } catch (error) {
        console.error('Archivo inválido', error);
      }
      event.target.value = '';
    },
    [ensureVisibleMessage],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeIds.length || selectedEdgeIds.length) {
          event.preventDefault();
          deleteSelection();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        dispatch({ type: 'REDO' });
      }
    },
    [deleteSelection, selectedEdgeIds.length, selectedNodeIds.length],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const autoLayout = useCallback(() => {
    const totalNodes = state.nodes.length;
    if (totalNodes === 0) return;
    const radius = Math.max(220, totalNodes * 28);
    applyNodeUpdates((nodes) => {
      nodes.forEach((node, index) => {
        const angle = (index / totalNodes) * Math.PI * 2;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
      });
    });
    ensureVisibleMessage('Auto-layout aplicado');
  }, [applyNodeUpdates, ensureVisibleMessage, state.nodes.length]);

  const renderEdges = () => {
    return state.edges.map((edge) => {
      const from = nodesMap.get(edge.from);
      const to = nodesMap.get(edge.to);
      if (!from || !to) return null;
      const isSelected = selectedEdgeIds.includes(edge.id);
      return (
        <g key={edge.id} onPointerDown={(event) => handleEdgeClick(edge, event)} className="cursor-pointer">
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={isSelected ? '#38bdf8' : '#94a3b8'}
            strokeWidth={isSelected ? 6 : 4}
            strokeDasharray={`${EDGE_DASH_LENGTH} ${EDGE_DASH_GAP}`}
            strokeLinecap="round"
            opacity={edge.state === 'hidden' ? 0.5 : 1}
          />
        </g>
      );
    });
  };

  const renderNodes = () =>
    state.nodes.map((node) => {
      const isSelected = selectedNodeIds.includes(node.id);
      const palette = getTypeDefaults(node.type);
      const glowIntensity = normalizeGlowIntensity(node.glowIntensity);
      const isHovered = hoveredNodeId === node.id;
      const effectiveGlow = clamp(glowIntensity + (isHovered ? 0.18 : 0), 0, 1);
      const glowBlur = 4 + effectiveGlow * 12;
      const glowColorBase = node.state === 'locked' ? '#1f2937' : node.accentColor || palette.accent;
      const glowHighlight = mixHex(glowColorBase, '#f8fafc', 0.65);
      const glowShadow = mixHex(glowColorBase, '#020617', 0.6);
      const circleStyle = {
        transition: 'filter 200ms ease, opacity 200ms ease',
      };
      const filterParts = [];
      if (effectiveGlow > 0.01) {
        filterParts.push(
          `drop-shadow(0 0 ${Math.max(2, glowBlur * 0.3)}px ${glowHighlight})`,
          `drop-shadow(0 ${Math.max(1, glowBlur * 0.25)}px ${glowBlur * 0.75}px ${glowShadow})`,
          `drop-shadow(0 0 ${Math.max(1.5, glowBlur * 0.2)}px ${glowHighlight})`,
        );
      }
      const displayIconUrl =
        node.state === 'locked' && lockIconUrl ? lockIconUrl : typeof node.iconUrl === 'string' ? node.iconUrl : null;
      const iconFallback = node.state === 'locked' ? '🔒' : node.name?.slice(0, 2) || node.type.slice(0, 2).toUpperCase();
      const iconFill = node.state === 'locked'
        ? '#e2e8f0'
        : node.iconColor || palette.icon;
      const baseFill = node.fillColor || palette.fill;
      const baseBorder = node.borderColor || palette.border;
      if (isSelected) {
        const selectionHalo = mixHex(baseBorder, '#f8fafc', 0.6);
        filterParts.push(`drop-shadow(0 0 ${Math.max(3, glowBlur * 0.4)}px ${selectionHalo})`);
      }
      if (filterParts.length > 0) {
        circleStyle.filter = filterParts.join(' ');
      }
      const gradientId = `node-fill-${node.id}`;
      const strokeGradientId = `node-stroke-${node.id}`;
      const noiseId = `node-noise-${node.id}`;
      const carveGradientId = `node-carve-${node.id}`;
      const selectionStrokeId = `node-selection-${node.id}`;
      const fillLight = lightenHex(baseFill, 0.22);
      const fillDark = darkenHex(baseFill, 0.24);
      const strokeLight = lightenHex(baseBorder, 0.32);
      const strokeDark = darkenHex(baseBorder, 0.36);
      const innerTransform = isHovered ? 'scale(1.05)' : 'scale(1)';
      const panelWidth = 90;
      const panelHeight = 96;
      const panelRadius = 18;
      const ornamentStroke = node.state === 'locked' ? '#1f2937' : lightenHex(baseBorder, 0.55);
      const selectedOrnamentStroke = mixHex(baseBorder, '#f8fafc', 0.4);
      return (
        <g
          key={node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-pointer"
          onPointerDown={(event) => handleNodePointerDown(event, node)}
          onDoubleClick={(event) => handleNodeDoubleClick(event, node)}
          onPointerEnter={() => setHoveredNodeId(node.id)}
          onPointerLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
        >
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor={fillLight} stopOpacity="0.95" />
              <stop offset="60%" stopColor={baseFill} stopOpacity="0.95" />
              <stop offset="100%" stopColor={fillDark} stopOpacity="0.98" />
            </radialGradient>
            <linearGradient id={strokeGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={strokeLight} />
              <stop offset="100%" stopColor={strokeDark} />
            </linearGradient>
            <linearGradient id={selectionStrokeId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={lightenHex(baseBorder, 0.5)} stopOpacity="0.85" />
              <stop offset="100%" stopColor={darkenHex(baseBorder, 0.35)} stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id={carveGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor={lightenHex(baseFill, 0.35)} stopOpacity="0.6" />
              <stop offset="50%" stopColor="transparent" stopOpacity="0" />
              <stop offset="100%" stopColor={darkenHex(baseFill, 0.35)} stopOpacity="0.55" />
            </linearGradient>
            <filter id={noiseId} x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
              <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed={node.id.length} result="noise" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.18 0" />
              <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
            </filter>
          </defs>
          <g transform={innerTransform} style={{ transition: 'transform 180ms ease' }}>
            <rect
              x={-panelWidth / 2}
              y={-panelHeight / 2}
              width={panelWidth}
              height={panelHeight}
              rx={panelRadius}
              ry={panelRadius}
              fill={`url(#${gradientId})`}
              stroke={`url(#${strokeGradientId})`}
              strokeWidth={4}
              opacity={node.state === 'locked' ? 0.75 : 1}
              style={circleStyle}
              filter={`url(#${noiseId})`}
            />
            <rect
              x={-panelWidth / 2 + 4}
              y={-panelHeight / 2 + 4}
              width={panelWidth - 8}
              height={panelHeight - 8}
              rx={panelRadius - 6}
              ry={panelRadius - 6}
              fill="none"
              stroke={isSelected ? selectedOrnamentStroke : ornamentStroke}
              strokeWidth={1.6}
              strokeDasharray="6 8"
              opacity={node.state === 'locked' ? 0.55 : 0.8}
            />
            <path
              d={`M ${-panelWidth / 2 + 10} ${panelHeight / 2 - 18} L ${panelWidth / 2 - 10} ${panelHeight / 2 - 22}`}
              stroke={`url(#${carveGradientId})`}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={node.state === 'locked' ? 0.25 : 0.45}
            />
            <path
              d={`M ${-panelWidth / 2 + 12} ${-panelHeight / 2 + 14} L ${panelWidth / 2 - 12} ${-panelHeight / 2 + 10}`}
              stroke={lightenHex(baseFill, 0.45)}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={node.state === 'locked' ? 0.2 : 0.55}
            />
            {isSelected && (
              <rect
                x={-panelWidth / 2 - 3.5}
                y={-panelHeight / 2 - 3.5}
                width={panelWidth + 7}
                height={panelHeight + 7}
                rx={panelRadius + 2}
                ry={panelRadius + 2}
                fill="none"
                stroke={`url(#${selectionStrokeId})`}
                strokeWidth={2}
                strokeDasharray="18 12"
                opacity={0.75}
                pointerEvents="none"
                style={{ transition: 'opacity 200ms ease' }}
              />
            )}
            {displayIconUrl ? (
              <image
                href={displayIconUrl}
                x={-26}
                y={-30}
                width={52}
                height={56}
                preserveAspectRatio="xMidYMid meet"
                opacity={node.state === 'locked' && lockIconUrl ? 0.95 : 1}
              />
            ) : (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={iconFill}
                fontSize={26}
                fontWeight="700"
                letterSpacing="0.08em"
              >
                {iconFallback}
              </text>
            )}
          </g>
          <text
            y={panelHeight / 2 + 18}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={12}
            fontWeight="700"
            letterSpacing="0.06em"
          >
            {node.name}
          </text>
        </g>
      );
    });

  return (
    <div className="w-full h-screen flex bg-[#050b18] text-slate-100">
      <div className="w-80 border-r border-slate-900/70 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl flex flex-col shadow-[inset_-1px_0_0_rgba(56,189,248,0.25)]">
        <div className="p-6 border-b border-slate-900/60 bg-slate-950/60">
          <h2 className="text-xl font-semibold tracking-wide text-sky-200">Mapa de rutas (lite)</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Constructor basado en SVG sin Pixi. Ideal para ediciones rápidas o dispositivos con recursos limitados.
          </p>
          <Boton
            className="mt-4 w-full border border-sky-500/40 bg-none bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:bg-slate-900"
            onClick={onBack}
            icon={<ArrowLeft className="h-4 w-4" aria-hidden />}
          >
            Volver al menú
          </Boton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Herramientas</h3>
            <div className="mt-3 space-y-2">
              {toolbarActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(action.id);
                    setConnectOriginId(null);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    activeTool === action.id
                      ? 'border-sky-400/80 bg-sky-500/15 text-sky-200 shadow-[0_0_22px_rgba(56,189,248,0.35)]'
                      : 'border-slate-800/80 bg-slate-900/80 hover:border-slate-600/70 hover:bg-slate-800/70'
                  }`}
                >
                  <action.icon className="h-4 w-4" aria-hidden />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>
          {selectedNodes.length > 0 && (
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Apariencia</h3>
                <span className="text-[11px] text-slate-500">
                  {selectedNodes.length > 1 ? `${selectedNodes.length} nodos` : 'Nodo seleccionado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ajusta colores e iconos de la selección actual.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Fondo</span>
                  <input
                    type="color"
                    value={appearanceValues.fillColor}
                    onChange={(event) => handleAppearanceChange('fillColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.fillColor && <span className="text-[10px] text-amber-300">Valores mixtos</span>}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Destello</span>
                  <input
                    type="color"
                    value={appearanceValues.accentColor}
                    onChange={(event) => handleAppearanceChange('accentColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.accentColor && <span className="text-[10px] text-amber-300">Valores mixtos</span>}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Borde</span>
                  <input
                    type="color"
                    value={appearanceValues.borderColor}
                    onChange={(event) => handleAppearanceChange('borderColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.borderColor && <span className="text-[10px] text-amber-300">Valores mixtos</span>}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Icono</span>
                  <input
                    type="color"
                    value={appearanceValues.iconColor}
                    onChange={(event) => handleAppearanceChange('iconColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.iconColor && <span className="text-[10px] text-amber-300">Valores mixtos</span>}
                </label>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Intensidad destello</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(appearanceValues.glowIntensity * 100)}
                      onChange={(event) => handleGlowIntensityChange(event.target.value)}
                      className="h-2 w-full cursor-pointer accent-sky-500"
                    />
                    <span className="w-12 text-right text-[11px] text-slate-400">
                      {`${Math.round(appearanceValues.glowIntensity * 100)}%`}
                    </span>
                  </div>
                  {mixedAppearance.glowIntensity && (
                    <span className="text-[10px] text-amber-300">Valores mixtos</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-800/60 bg-slate-900/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Iconos personalizados</h4>
                  <div className="flex items-center gap-2">
                    {customIconSelection.hasAny && (
                      <button
                        type="button"
                        onClick={() => applyCustomIconToSelection(null)}
                        className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-300 hover:text-sky-200"
                      >
                        Icono por defecto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetAppearance}
                      className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 hover:text-slate-200"
                    >
                      Resetear colores
                    </button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Selecciona o sube iconos para los nodos. Se sincronizan con el minimapa y otros clientes.
                </p>
                {customIconSelection.mixed && <p className="text-[10px] text-amber-300">Selección con iconos distintos.</p>}
                <div className="flex flex-wrap gap-2">
                  {sanitizedCustomIcons.length > 0 ? (
                    sanitizedCustomIcons.map((url, index) => (
                      <IconThumb
                        key={`route-custom-icon-${index}`}
                        src={url}
                        label={`Icono personalizado ${index + 1}`}
                        selected={customIconSelection.url === url}
                        onClick={() => applyCustomIconToSelection(url)}
                        onDelete={() => handleRemoveCustomIcon(index)}
                      />
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">Aún no hay iconos personalizados.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Subir icono</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!customIconsReady}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleCustomIconUpload(file);
                        event.target.value = '';
                      }
                    }}
                    className="block w-full cursor-pointer rounded border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200 transition file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:text-slate-100 hover:file:bg-slate-700"
                  />
                </div>
              </div>
            </section>
          )}
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Creación</h3>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-400">Tipo de nodo</span>
              <select
                value={nodeTypeToCreate}
                onChange={(event) => setNodeTypeToCreate(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
              >
                {NODE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <Boton
              onClick={autoLayout}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<Compass className="h-4 w-4" aria-hidden />}
            >
              Auto-layout
            </Boton>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Acciones rápidas</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Boton
                onClick={handleUndo}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Undo2 className="h-4 w-4" aria-hidden />}
              >
                Deshacer
              </Boton>
              <Boton
                onClick={handleRedo}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Redo2 className="h-4 w-4" aria-hidden />}
              >
                Rehacer
              </Boton>
              <Boton
                onClick={duplicateSelection}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Copy className="h-4 w-4" aria-hidden />}
                disabled={selectedNodeIds.length === 0}
              >
                Duplicar
              </Boton>
              <Boton
                onClick={deleteSelection}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Trash2 className="h-4 w-4" aria-hidden />}
                disabled={selectedNodeIds.length === 0 && selectedEdgeIds.length === 0}
              >
                Suprimir
              </Boton>
              <Boton
                onClick={toggleNodeLock}
                className="col-span-2 bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<LockKeyhole className="h-4 w-4" aria-hidden />}
                disabled={selectedNodeIds.length === 0}
              >
                Bloquear / Desbloquear
              </Boton>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Grid & Layout</h3>
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.target.checked)}
                  className="accent-sky-500"
                />
                <span>Snap a grid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.target.checked)}
                  className="accent-sky-500"
                />
                <span>Mostrar grid</span>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Tamaño de grid</span>
              <select
                value={gridSize}
                onChange={(event) => setGridSize(Number(event.target.value))}
                className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
              >
                {GRID_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Guardar</h3>
            <Boton
              onClick={() => {
                saveDraft(state.nodes, state.edges);
                ensureVisibleMessage('Mapa guardado en navegador');
              }}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<Save className="h-4 w-4" aria-hidden />}
            >
              Guardar en navegador
            </Boton>
            <Boton
              onClick={handleExport}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<FileDown className="h-4 w-4" aria-hidden />}
            >
              Exportar JSON
            </Boton>
            <label className="block w-full text-xs text-slate-400">
              Importar JSON
              <input type="file" accept="application/json" onChange={handleImport} className="mt-1 w-full text-xs" />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Fondo</h3>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Color</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Imagen (URL)</span>
              <Input value={backgroundImage} onChange={handleBackgroundInput} placeholder="https://..." className="bg-slate-900/80" />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Estados</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(NODE_STATES).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: value.stroke }} />
                  <span className="capitalize text-slate-300">{value.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor,
          backgroundImage: [
            'radial-gradient(circle at top, rgba(56, 189, 248, 0.18), rgba(8, 47, 73, 0) 60%)',
            'radial-gradient(circle at bottom, rgba(14, 165, 233, 0.14), rgba(15, 23, 42, 0) 55%)',
            backgroundImage ? `url(${backgroundImage})` : null,
          ]
            .filter(Boolean)
            .join(', '),
          backgroundSize: backgroundImage
            ? '120% 120%, 140% 140%, cover'
            : '120% 120%, 140% 140%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderLeft: '1px solid transparent',
          borderImage: 'linear-gradient(180deg, rgba(56,189,248,0.45), rgba(15,118,110,0.25), rgba(8,47,73,0.4)) 1',
          borderImageSlice: 1,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: showGrid
              ? `linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)`
              : undefined,
            backgroundSize: showGrid ? `${gridSize * viewport.scale}px ${gridSize * viewport.scale}px` : undefined,
            transform: `translate(${viewport.x}px, ${viewport.y}px)`,
          }}
        />
        <div className="absolute left-6 top-6 z-20 flex items-center gap-3 rounded-full border border-sky-500/40 bg-slate-900/80 px-6 py-2.5 text-sm shadow-lg shadow-sky-900/40 backdrop-blur">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Herramienta</span>
          <span className="font-medium text-sky-200 flex items-center gap-2">
            {currentTool ? (
              <>
                <currentTool.icon className="h-4 w-4" aria-hidden />
                {currentTool.label}
              </>
            ) : (
              'Selecciona una herramienta'
            )}
          </span>
          {connectOriginId && activeTool === 'connect' && <span className="text-xs text-amber-300">Selecciona nodo destino…</span>}
        </div>
        {statusMessage && (
          <div className="absolute right-6 top-6 z-20 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-900/30 backdrop-blur">
            {statusMessage}
          </div>
        )}
        <div
          ref={containerRef}
          className={`relative z-10 h-full w-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          data-testid="route-map-lite-canvas"
        >
          <svg
            ref={svgRef}
            className="absolute inset-0"
            style={{
              overflow: 'visible',
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {renderEdges()}
            {renderNodes()}
          </svg>
        </div>
      </div>
      {(nodeEditor || edgeEditor) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            {nodeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar nodo</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Nombre</span>
                  <Input value={nodeEditor.name} onChange={(event) => setNodeEditor({ ...nodeEditor, name: event.target.value })} />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Tipo</span>
                  <select
                    value={nodeEditor.type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      const defaults = getTypeDefaults(nextType);
                      setNodeEditor({
                        ...nodeEditor,
                        type: nextType,
                        accentColor: defaults.accent,
                        fillColor: defaults.fill,
                        borderColor: defaults.border,
                        iconColor: defaults.icon,
                        glowIntensity: DEFAULT_GLOW_INTENSITY,
                      });
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  >
                    {NODE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Estado</span>
                  <select
                    value={nodeEditor.state}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, state: event.target.value })}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  >
                    {Object.keys(NODE_STATES).map((stateKey) => (
                      <option key={stateKey} value={stateKey}>
                        {NODE_STATES[stateKey].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Notas</span>
                  <textarea
                    value={nodeEditor.notes}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, notes: event.target.value })}
                    rows={3}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <div className="flex flex-col gap-2 text-sm">
                  <span>Intensidad del destello</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(normalizeGlowIntensity(nodeEditor.glowIntensity) * 100)}
                      onChange={(event) =>
                        setNodeEditor({
                          ...nodeEditor,
                          glowIntensity: Number(event.target.value) / 100,
                        })
                      }
                      className="h-2 w-full cursor-pointer accent-sky-500"
                    />
                    <span className="w-12 text-right text-xs text-slate-300">
                      {`${Math.round(normalizeGlowIntensity(nodeEditor.glowIntensity) * 100)}%`}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Boton onClick={() => setNodeEditor(null)} className="border border-slate-700 bg-slate-900/80">
                    Cancelar
                  </Boton>
                  <Boton onClick={handleNodeEditorSave} className="border border-sky-500 bg-sky-500/20">
                    Guardar
                  </Boton>
                </div>
              </div>
            )}
            {edgeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar conexión</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Tipo</span>
                  <select
                    value={edgeEditor.type || 'normal'}
                    onChange={(event) => setEdgeEditor({ ...edgeEditor, type: event.target.value })}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="conditional">Condicional</option>
                  </select>
                </label>
                <div className="flex justify-end gap-3">
                  <Boton onClick={() => setEdgeEditor(null)} className="border border-slate-700 bg-slate-900/80">
                    Cancelar
                  </Boton>
                  <Boton onClick={handleEdgeEditorSave} className="border border-sky-500 bg-sky-500/20">
                    Guardar
                  </Boton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

RouteMapBuilderLite.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default RouteMapBuilderLite;
