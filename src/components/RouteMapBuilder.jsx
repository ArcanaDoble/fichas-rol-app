import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Application, Container, Graphics, Point, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { nanoid } from 'nanoid';
import Boton from './Boton';
import Input from './Input';

const NODE_TYPES = [
  { id: 'start', label: 'Inicio', color: '#38bdf8', icon: '⭑' },
  { id: 'normal', label: 'Normal', color: '#a855f7', icon: '⚔' },
  { id: 'event', label: 'Evento', color: '#fbbf24', icon: '☄' },
  { id: 'shop', label: 'Tienda', color: '#f97316', icon: '◆' },
  { id: 'elite', label: 'Elite', color: '#fb7185', icon: '✦' },
  { id: 'heal', label: 'Curación', color: '#34d399', icon: '✚' },
  { id: 'boss', label: 'Jefe', color: '#f59e0b', icon: '✹' },
];

const NODE_STATES = {
  locked: {
    label: 'Bloqueado',
    stroke: '#1f2937',
    fillAlpha: 0.45,
    aura: '#1f2937',
    badge: '🔒',
    badgeColor: '#f8fafc',
  },
  visible: {
    label: 'Visible',
    stroke: '#334155',
    fillAlpha: 0.55,
    aura: '#475569',
    badge: '🔒',
    badgeColor: '#fbbf24',
  },
  unlocked: {
    label: 'Desbloqueado',
    stroke: '#38bdf8',
    fillAlpha: 0.85,
    aura: '#0ea5e9',
  },
  completed: {
    label: 'Completado',
    stroke: '#facc15',
    fillAlpha: 0.95,
    aura: '#fbbf24',
    badge: '✔',
    badgeColor: '#facc15',
  },
  current: {
    label: 'Actual',
    stroke: '#22d3ee',
    fillAlpha: 0.95,
    aura: '#38bdf8',
  },
};

const TOOLBAR_ACTIONS = [
  { id: 'select', label: 'Seleccionar / Mover', icon: '🖱️' },
  { id: 'create', label: 'Crear Nodo', icon: '🪄' },
  { id: 'connect', label: 'Conectar', icon: '🔗' },
  { id: 'delete', label: 'Borrar', icon: '🗑️' },
  { id: 'toggleLock', label: 'Bloquear / Desbloquear', icon: '🔒' },
];

const GRID_SIZES = [20, 32, 40, 48, 64];

const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

const drawDottedQuadratic = (graphics, from, control, to, { color, size = 4, spacing = 18 }) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(12, Math.floor(distance / spacing) * 4);
  graphics.beginFill(color, 0.9);
  for (let i = 0; i <= steps; i += 1) {
    if (i % 2 !== 0) continue;
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x;
    const y = inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y;
    graphics.drawCircle(x, y, size);
  }
  graphics.endFill();
};

const cloneState = (nodes, edges) => ({
  nodes: nodes.map((node) => ({ ...node })),
  edges: edges.map((edge) => ({ ...edge })),
});

const DEFAULT_NODE = () => ({
  id: nanoid(),
  name: 'Inicio',
  type: 'start',
  x: 0,
  y: 0,
  state: 'current',
  unlockMode: 'or',
  loot: '',
  event: '',
  notes: '',
});

const initialState = () => {
  const starter = DEFAULT_NODE();
  const snapshot = cloneState([starter], []);
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    history: [snapshot],
    historyIndex: 0,
  };
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': {
      const { nodes, edges } = action;
      const snapshot = cloneState(nodes, edges);
      return {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        history: [snapshot],
        historyIndex: 0,
      };
    }
    case 'UPDATE': {
      const draftNodes = state.nodes.map((node) => ({ ...node }));
      const draftEdges = state.edges.map((edge) => ({ ...edge }));
      action.updater(draftNodes, draftEdges);
      if (action.skipHistory) {
        return {
          ...state,
          nodes: draftNodes,
          edges: draftEdges,
        };
      }
      const snapshot = cloneState(draftNodes, draftEdges);
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      trimmed.push(snapshot);
      const limited = trimmed.length > 10 ? trimmed.slice(trimmed.length - 10) : trimmed;
      return {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        history: limited,
        historyIndex: limited.length - 1,
      };
    }
    case 'PUSH_HISTORY': {
      const snapshot = cloneState(state.nodes, state.edges);
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      trimmed.push(snapshot);
      const limited = trimmed.length > 10 ? trimmed.slice(trimmed.length - 10) : trimmed;
      return {
        ...state,
        history: limited,
        historyIndex: limited.length - 1,
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) {
        return state;
      }
      const snapshot = state.history[state.historyIndex - 1];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: state.historyIndex - 1,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }
      const snapshot = state.history[state.historyIndex + 1];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: state.historyIndex + 1,
      };
    }
    default:
      return state;
  }
}

const pointerToWorld = (viewport, event) => {
  if (!viewport) return { x: 0, y: 0 };
  const global = event.data?.global ?? event.global;
  if (!global) return { x: 0, y: 0 };
  const point = viewport.toWorld(global.x, global.y);
  return point instanceof Point ? { x: point.x, y: point.y } : point;
};

const RouteMapBuilder = ({ onBack }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const viewportRef = useRef(null);
  const nodesContainerRef = useRef(null);
  const edgesContainerRef = useRef(null);
  const selectionGraphicsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const shouldResumeDragRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [activeTool, setActiveTool] = useState('select');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState('normal');
  const [connectOriginId, setConnectOriginId] = useState(null);
  const [nodeEditor, setNodeEditor] = useState(null);
  const [edgeEditor, setEdgeEditor] = useState(null);
  const selectionStartRef = useRef(null);
  const dragStateRef = useRef(null);
  const copyBufferRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState('');
  const nodesMap = useMemo(() => {
    const map = new Map();
    state.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [state.nodes]);
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  const addNodeAtRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const hasSkippedInitialSaveRef = useRef(false);

  const ensureVisibleMessage = useCallback((text) => {
    setStatusMessage(text);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setTimeout(() => setStatusMessage(''), 2200);
    });
  }, []);

  const pauseViewportDrag = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport?.plugins) return;
    viewport.plugins.pause('drag');
  }, []);

  const resumeViewportDrag = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport?.plugins) return;
    viewport.plugins.resume('drag');
  }, []);

  const saveToLocalStorage = useCallback((nodes, edges) => {
    try {
      const payload = JSON.stringify({ nodes, edges });
      window.localStorage.setItem('routeMapDraft', payload);
    } catch (error) {
      console.error('No se pudo guardar el mapa en localStorage', error);
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const payload = window.localStorage.getItem('routeMapDraft');
      if (!payload) return;
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        dispatch({ type: 'LOAD', nodes: parsed.nodes, edges: parsed.edges });
        ensureVisibleMessage('Mapa cargado desde el navegador');
      }
    } catch (error) {
      console.error('No se pudo cargar el mapa en localStorage', error);
    }
  }, [ensureVisibleMessage]);

  const exportToFile = useCallback(() => {
    const data = JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `route-map-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    ensureVisibleMessage('Mapa exportado como JSON');
  }, [state.nodes, state.edges, ensureVisibleMessage]);

  const importFromFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          dispatch({ type: 'LOAD', nodes: parsed.nodes, edges: parsed.edges });
          ensureVisibleMessage('Mapa importado correctamente');
        }
      } catch (error) {
        console.error('Archivo inválido', error);
      }
    };
    reader.readAsText(file);
  }, [ensureVisibleMessage]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const addNodeAt = useCallback((point) => {
    const typeDef = NODE_TYPES.find((item) => item.id === nodeTypeToCreate) || NODE_TYPES[1];
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        const snappedX = snapToGrid ? Math.round(point.x / gridSize) * gridSize : point.x;
        const snappedY = snapToGrid ? Math.round(point.y / gridSize) * gridSize : point.y;
        nodes.push({
          id: nanoid(),
          name: `${typeDef.label} ${nodes.length + 1}`,
          type: typeDef.id,
          x: snappedX,
          y: snappedY,
          state: typeDef.id === 'start' ? 'current' : 'locked',
          unlockMode: 'or',
          loot: '',
          event: '',
          notes: '',
        });
      },
    });
  }, [gridSize, nodeTypeToCreate, snapToGrid]);
  useEffect(() => {
    addNodeAtRef.current = addNodeAt;
  }, [addNodeAt]);

  const applyDragDelta = useCallback(
    (dragState, delta, snap) => {
      if (!dragState || !delta) return;
      const { startPositions } = dragState;
      dispatch({
        type: 'UPDATE',
        skipHistory: true,
        updater: (nodes) => {
          nodes.forEach((node) => {
            const start = startPositions.get(node.id);
            if (!start) return;
            let nextX = start.x + delta.x;
            let nextY = start.y + delta.y;
            if (snap && snapToGrid) {
              nextX = Math.round(nextX / gridSize) * gridSize;
              nextY = Math.round(nextY / gridSize) * gridSize;
            }
            node.x = nextX;
            node.y = nextY;
          });
        },
      });
    },
    [gridSize, snapToGrid],
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
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
      },
    });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectedNodeIds, selectedEdgeIds]);

  const toggleNodeLock = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        nodes.forEach((node) => {
          if (selectedNodeIds.includes(node.id)) {
            node.state = node.state === 'locked' ? 'unlocked' : 'locked';
          }
        });
      },
    });
  }, [selectedNodeIds]);

  const applyAutoLayout = useCallback(() => {
    const edgesByTarget = new Map();
    state.edges.forEach((edge) => {
      if (!nodesMap.has(edge.from) || !nodesMap.has(edge.to)) return;
      const list = edgesByTarget.get(edge.to) || [];
      list.push(edge);
      edgesByTarget.set(edge.to, list);
    });
    const levelMap = new Map();
    const computeLevel = (nodeId, stack = new Set()) => {
      if (levelMap.has(nodeId)) return levelMap.get(nodeId);
      if (stack.has(nodeId)) return 0;
      stack.add(nodeId);
      const incoming = edgesByTarget.get(nodeId) || [];
      if (incoming.length === 0) {
        levelMap.set(nodeId, 0);
        stack.delete(nodeId);
        return 0;
      }
      const parentLevels = incoming.map((edge) => computeLevel(edge.from, stack));
      const maxLevel = parentLevels.length ? Math.max(...parentLevels) : 0;
      const level = maxLevel + 1;
      levelMap.set(nodeId, level);
      stack.delete(nodeId);
      return level;
    };
    state.nodes.forEach((node) => {
      computeLevel(node.id);
    });
    const columns = new Map();
    levelMap.forEach((level, nodeId) => {
      const bucket = columns.get(level) || [];
      bucket.push(nodesMap.get(nodeId));
      columns.set(level, bucket);
    });
    const sorted = Array.from(columns.keys()).sort((a, b) => a - b);
    const targets = new Map();
    sorted.forEach((level) => {
      const bucket = columns.get(level) || [];
      bucket.forEach((node, index) => {
        if (!node) return;
        targets.set(node.id, {
          x: level * 220,
          y: index * 160,
        });
      });
    });
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        nodes.forEach((node) => {
          const target = targets.get(node.id);
          if (target) {
            node.x = target.x;
            node.y = target.y;
          }
        });
      },
    });
    ensureVisibleMessage('Auto-layout aplicado');
  }, [state.nodes, state.edges, nodesMap, ensureVisibleMessage]);

  const duplicateSelection = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
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
            x: original.x + 40,
            y: original.y + 40,
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
      },
    });
  }, [selectedNodeIds, state.edges]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete') {
        deleteSelection();
      }
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleUndo();
      }
      if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleRedo();
      }
      if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        copyBufferRef.current = {
          nodes: state.nodes.filter((node) => selectedNodeIds.includes(node.id)).map((node) => ({ ...node })),
          edges: state.edges.filter((edge) => selectedEdgeIds.includes(edge.id)).map((edge) => ({ ...edge })),
        };
        ensureVisibleMessage('Copiado');
      }
      if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const buffer = copyBufferRef.current;
        if (!buffer) return;
        dispatch({
          type: 'UPDATE',
          updater: (nodes, edges) => {
            const idMap = new Map();
            buffer.nodes.forEach((node) => {
              const newId = nanoid();
              idMap.set(node.id, newId);
              nodes.push({
                ...node,
                id: newId,
                name: `${node.name} (copia)`,
                x: node.x + 32,
                y: node.y + 32,
              });
            });
            buffer.edges.forEach((edge) => {
              const from = idMap.get(edge.from);
              const to = idMap.get(edge.to);
              if (from && to) {
                edges.push({ ...edge, id: nanoid(), from, to });
              }
            });
          },
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, handleRedo, handleUndo, ensureVisibleMessage, selectedNodeIds, selectedEdgeIds, state.nodes, state.edges]);

  useEffect(() => {
    if (!hasSkippedInitialSaveRef.current) {
      hasSkippedInitialSaveRef.current = true;
      return;
    }
    saveToLocalStorage(state.nodes, state.edges);
  }, [state.nodes, state.edges, saveToLocalStorage]);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const initPixi = async () => {
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: containerRef.current,
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      containerRef.current.appendChild(app.canvas);
      const viewport = new Viewport({
        ticker: app.ticker,
        events: app.renderer.events,
        passiveWheel: false,
      });
      viewport.drag({ pressDrag: true });
      viewport.wheel({ smooth: 3 });
      viewport.pinch();
      viewport.clampZoom({ minScale: 0.2, maxScale: 3 });
      app.stage.addChild(viewport);
      const edgesLayer = new Container();
      const nodesLayer = new Container();
      viewport.addChild(edgesLayer);
      viewport.addChild(nodesLayer);
      const selectionGraphics = new Graphics();
      viewport.addChild(selectionGraphics);
      viewportRef.current = viewport;
      appRef.current = app;
      nodesContainerRef.current = nodesLayer;
      edgesContainerRef.current = edgesLayer;
      selectionGraphicsRef.current = selectionGraphics;
      viewport.eventMode = 'static';
      viewport.on('pointerdown', (event) => {
        const tool = activeToolRef.current;
        if (event.target?.nodeId || event.target?.edgeId) return;
        const button = event.data?.originalEvent?.button;
        const isLeftButton = button === undefined || button === 0;
        if (!isLeftButton) {
          shouldResumeDragRef.current = false;
          return;
        }
        shouldResumeDragRef.current = true;
        pauseViewportDrag();
        if (tool === 'create') {
          const point = pointerToWorld(viewport, event);
          addNodeAtRef.current?.(point);
          return;
        }
        if (tool === 'select') {
          const start = pointerToWorld(viewport, event);
          selectionStartRef.current = start;
          if (selectionGraphicsRef.current) {
            const g = selectionGraphicsRef.current;
            g.clear();
            g.lineStyle(2, 0x38bdf8, 0.8);
            g.beginFill(0x38bdf8, 0.1);
            g.drawRect(start.x, start.y, 1, 1);
            g.endFill();
          }
        }
      });
      viewport.on('pointermove', (event) => {
        if (!selectionStartRef.current) return;
        const current = pointerToWorld(viewport, event);
        const rect = {
          x: Math.min(selectionStartRef.current.x, current.x),
          y: Math.min(selectionStartRef.current.y, current.y),
          width: Math.abs(current.x - selectionStartRef.current.x),
          height: Math.abs(current.y - selectionStartRef.current.y),
        };
        if (selectionGraphicsRef.current) {
          const g = selectionGraphicsRef.current;
          g.clear();
          g.lineStyle(2, 0x38bdf8, 0.8);
          g.beginFill(0x38bdf8, 0.1);
          g.drawRect(rect.x, rect.y, rect.width, rect.height);
          g.endFill();
        }
      });
      const finishSelection = (event) => {
        if (shouldResumeDragRef.current) {
          shouldResumeDragRef.current = false;
          resumeViewportDrag();
        }
        if (!selectionStartRef.current) return;
        const current = pointerToWorld(viewport, event);
        const rect = {
          x: Math.min(selectionStartRef.current.x, current.x),
          y: Math.min(selectionStartRef.current.y, current.y),
          width: Math.abs(current.x - selectionStartRef.current.x),
          height: Math.abs(current.y - selectionStartRef.current.y),
        };
        selectionStartRef.current = null;
        if (selectionGraphicsRef.current) {
          selectionGraphicsRef.current.clear();
        }
        const currentState = stateRef.current;
        const selected = currentState.nodes
          .filter(
            (node) =>
              node.x >= rect.x &&
              node.x <= rect.x + rect.width &&
              node.y >= rect.y &&
              node.y <= rect.y + rect.height,
          )
          .map((node) => node.id);
        setSelectedNodeIds(selected);
        setSelectedEdgeIds([]);
      };
      viewport.on('pointerup', finishSelection);
      viewport.on('pointerupoutside', finishSelection);
    };
    initPixi();
    return () => {
      destroyed = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (viewportRef.current) {
        viewportRef.current.removeAllListeners();
      }
      if (appRef.current) {
        appRef.current.destroy(true, true);
      }
      viewportRef.current = null;
      appRef.current = null;
      nodesContainerRef.current = null;
      edgesContainerRef.current = null;
      selectionGraphicsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current || !nodesContainerRef.current || !edgesContainerRef.current) return;
    const viewport = viewportRef.current;
    const edgesLayer = edgesContainerRef.current;
    const nodesLayer = nodesContainerRef.current;
    edgesLayer.removeChildren();
    nodesLayer.removeChildren();

    const commitDrag = () => {
      if (!dragStateRef.current) return;
      if (dragStateRef.current.moved && !dragStateRef.current.committed) {
        applyDragDelta(dragStateRef.current, dragStateRef.current.lastDelta, true);
        dispatch({ type: 'PUSH_HISTORY' });
        dragStateRef.current.committed = true;
      }
    };

    const endDrag = () => {
      commitDrag();
      dragStateRef.current = null;
      if (shouldResumeDragRef.current) {
        shouldResumeDragRef.current = false;
        resumeViewportDrag();
      }
    };

    const handleViewportDragMove = (event) => {
      if (!dragStateRef.current || activeTool !== 'select') return;
      const buttons = event.data?.originalEvent?.buttons ?? 0;
      if (buttons === 0) {
        endDrag();
        return;
      }
      const world = pointerToWorld(viewport, event);
      if (!world) return;
      const delta = {
        x: world.x - dragStateRef.current.startPointer.x,
        y: world.y - dragStateRef.current.startPointer.y,
      };
      dragStateRef.current.lastDelta = delta;
      applyDragDelta(dragStateRef.current, delta, true);
      dragStateRef.current.moved = true;
    };

    const handleViewportDragEnd = () => {
      if (!dragStateRef.current) return;
      endDrag();
    };

    viewport.on('pointermove', handleViewportDragMove);
    viewport.on('pointerup', handleViewportDragEnd);
    viewport.on('pointerupoutside', handleViewportDragEnd);

    if (showGrid) {
      const grid = new Graphics();
      grid.lineStyle(1, 0x1e293b, 0.4);
      const size = gridSize;
      const extent = 4000;
      for (let x = -extent; x <= extent; x += size) {
        grid.moveTo(x, -extent);
        grid.lineTo(x, extent);
      }
      for (let y = -extent; y <= extent; y += size) {
        grid.moveTo(-extent, y);
        grid.lineTo(extent, y);
      }
      edgesLayer.addChild(grid);
    }

    state.edges.forEach((edge) => {
      const from = nodesMap.get(edge.from);
      const to = nodesMap.get(edge.to);
      if (!from || !to) return;
      const control = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - Math.abs(from.x - to.x) * 0.2,
      };
      const selected = selectedEdgeIds.includes(edge.id);
      const color = selected ? 0xfbbf24 : 0x5f6b8d;
      const path = new Graphics();
      drawDottedQuadratic(path, from, control, to, {
        color,
        size: selected ? 5 : 4,
        spacing: 18,
      });
      path.edgeId = edge.id;
      path.eventMode = 'static';
      path.cursor = 'pointer';
      path.hitArea = {
        contains: (x, y) => {
          const minX = Math.min(from.x, to.x, control.x) - 24;
          const maxX = Math.max(from.x, to.x, control.x) + 24;
          const minY = Math.min(from.y, to.y, control.y) - 24;
          const maxY = Math.max(from.y, to.y, control.y) + 24;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        },
      };
      path.on('pointertap', (event) => {
        event.stopPropagation();
        if (event.detail >= 2) {
          setEdgeEditor(edge);
          return;
        }
        setSelectedEdgeIds([edge.id]);
        setSelectedNodeIds([]);
        if (activeTool === 'delete') {
          dispatch({
            type: 'UPDATE',
            updater: (nodes, edgesDraft) => {
              const index = edgesDraft.findIndex((item) => item.id === edge.id);
              if (index >= 0) {
                edgesDraft.splice(index, 1);
              }
            },
          });
        }
      });
      edgesLayer.addChild(path);

      const arrow = new Graphics();
      const arrowSize = selected ? 18 : 16;
      const dx = to.x - control.x;
      const dy = to.y - control.y;
      const angle = Math.atan2(dy, dx);
      arrow.beginFill(color, 0.9);
      arrow.moveTo(0, 0);
      arrow.lineTo(-arrowSize, arrowSize / 2);
      arrow.lineTo(-arrowSize, -arrowSize / 2);
      arrow.lineTo(0, 0);
      arrow.endFill();
      arrow.position.set(to.x, to.y);
      arrow.rotation = angle;
      edgesLayer.addChild(arrow);

      if (edge.label) {
        const labelText = new Text({
          text: edge.label,
          style: {
            fill: selected ? '#fbbf24' : '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            letterSpacing: 1,
          },
        });
        labelText.anchor.set(0.5);
        const labelContainer = new Container();
        const paddingX = 12;
        const paddingY = 6;
        const background = new Graphics();
        const width = labelText.width + paddingX * 2;
        const height = labelText.height + paddingY * 2;
        background.beginFill(0x0b1220, 0.85);
        background.lineStyle(1, color, 0.6);
        background.drawRoundedRect(-width / 2, -height / 2, width, height, height / 2);
        background.endFill();
        labelContainer.addChild(background);
        labelContainer.addChild(labelText);
        labelText.position.set(0, 0);
        labelContainer.position.set((from.x + to.x) / 2, (from.y + to.y) / 2 - 20);
        labelContainer.eventMode = 'static';
        labelContainer.cursor = 'text';
        labelContainer.on('pointertap', (event) => {
          event.stopPropagation();
          if (event.detail >= 2) {
            setEdgeEditor(edge);
          } else {
            setSelectedEdgeIds([edge.id]);
            setSelectedNodeIds([]);
          }
        });
        edgesLayer.addChild(labelContainer);
      }
    });

    state.nodes.forEach((node) => {
      const nodeContainer = new Container();
      const typeDef = NODE_TYPES.find((item) => item.id === node.type) || NODE_TYPES[1];
      const stateDef = NODE_STATES[node.state] || NODE_STATES.locked;
      const selected = selectedNodeIds.includes(node.id);
      const accentColor = hexToInt(typeDef.color);
      const strokeColor = hexToInt(stateDef.stroke);
      const auraColor = stateDef.aura ? hexToInt(stateDef.aura) : null;
      const radius = 36;

      if (auraColor) {
        const aura = new Graphics();
        aura.beginFill(auraColor, selected ? 0.25 : 0.18);
        aura.drawCircle(0, 0, radius + 16);
        aura.endFill();
        nodeContainer.addChild(aura);
      }

      if (selected) {
        const selectionAura = new Graphics();
        selectionAura.beginFill(accentColor, 0.12);
        selectionAura.drawCircle(0, 0, radius + 22);
        selectionAura.endFill();
        nodeContainer.addChild(selectionAura);
      }

      const base = new Graphics();
      base.beginFill(0x070d1a, 0.96);
      base.drawCircle(0, 0, radius);
      base.endFill();
      nodeContainer.addChild(base);

      const innerGlow = new Graphics();
      innerGlow.lineStyle(2, accentColor, 0.4);
      innerGlow.drawCircle(0, 0, radius - 6);
      innerGlow.endFill();
      nodeContainer.addChild(innerGlow);

      const innerFill = new Graphics();
      innerFill.beginFill(accentColor, 0.18);
      innerFill.drawCircle(0, 0, radius - 10);
      innerFill.endFill();
      nodeContainer.addChild(innerFill);

      const innerCore = new Graphics();
      innerCore.beginFill(0x0f172a, stateDef.fillAlpha ?? 0.85);
      innerCore.drawCircle(0, 0, radius - 16);
      innerCore.endFill();
      nodeContainer.addChild(innerCore);

      const outerRing = new Graphics();
      outerRing.lineStyle(selected ? 6 : 4, strokeColor, selected ? 1 : 0.9);
      outerRing.drawCircle(0, 0, radius + (selected ? 1 : 0));
      outerRing.endFill();
      nodeContainer.addChild(outerRing);

      const accentRing = new Graphics();
      accentRing.lineStyle(3, accentColor, 0.8);
      accentRing.drawCircle(0, 0, radius - 12);
      accentRing.endFill();
      nodeContainer.addChild(accentRing);

      if (node.state === 'current') {
        const halo = new Graphics();
        halo.lineStyle(4, accentColor, 0.55);
        halo.drawCircle(0, 0, radius + 12);
        halo.endFill();
        nodeContainer.addChild(halo);
      }

      const showStateBadge = stateDef.badge && (node.state === 'locked' || node.state === 'visible');
      const mainSymbol = showStateBadge ? stateDef.badge : typeDef.icon;
      const symbolColor = showStateBadge ? stateDef.badgeColor || '#f8fafc' : '#f8fafc';
      const iconText = new Text({
        text: mainSymbol,
        style: {
          fill: symbolColor,
          fontFamily: 'Inter, sans-serif',
          fontSize: showStateBadge ? 26 : 24,
          fontWeight: 600,
          dropShadow: true,
          dropShadowColor: '#020617',
          dropShadowAlpha: 0.6,
          dropShadowBlur: 6,
          dropShadowDistance: 0,
        },
      });
      iconText.anchor.set(0.5);
      nodeContainer.addChild(iconText);

      if (node.state === 'completed') {
        const badgeContainer = new Container();
        const badgeBg = new Graphics();
        badgeBg.beginFill(0x0f172a, 0.95);
        badgeBg.lineStyle(2, hexToInt('#facc15'), 0.9);
        badgeBg.drawCircle(0, 0, 12);
        badgeBg.endFill();
        badgeContainer.addChild(badgeBg);
        const badgeText = new Text({
          text: '✔',
          style: { fontSize: 14, fill: '#facc15', fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        });
        badgeText.anchor.set(0.5);
        badgeContainer.addChild(badgeText);
        badgeContainer.position.set(radius - 8, -radius + 8);
        nodeContainer.addChild(badgeContainer);
      }

      nodeContainer.position.set(node.x, node.y);
      nodeContainer.nodeId = node.id;
      nodeContainer.eventMode = 'static';
      nodeContainer.cursor = activeTool === 'connect' ? 'crosshair' : 'pointer';
      nodeContainer.on('pointerdown', (event) => {
        event.stopPropagation();
        const button = event.data?.originalEvent?.button;
        const isLeftButton = button === undefined || button === 0;
        if (!isLeftButton) {
          shouldResumeDragRef.current = false;
          return;
        }
        shouldResumeDragRef.current = true;
        pauseViewportDrag();
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
            dispatch({
              type: 'UPDATE',
              updater: (nodes, edges) => {
                edges.push({
                  id: nanoid(),
                  from: connectOriginId,
                  to: node.id,
                  label: '',
                  requirement: 'OR',
                });
              },
            });
            setConnectOriginId(null);
            setSelectedNodeIds([node.id]);
          }
          return;
        }
        if (activeTool !== 'select') {
          return;
        }
        const shift = event.data?.originalEvent?.shiftKey;
        const alreadySelected = selectedNodeIds.includes(node.id);
        let nextSelection = selectedNodeIds;
        if (shift) {
          if (!alreadySelected) {
            nextSelection = [...selectedNodeIds, node.id];
          }
        } else if (!alreadySelected) {
          nextSelection = [node.id];
        }
        if (nextSelection !== selectedNodeIds) {
          setSelectedNodeIds(nextSelection);
        }
        setSelectedEdgeIds([]);
        const dragIds = nextSelection.includes(node.id) ? [...new Set(nextSelection)] : [node.id];
        const pointerStart = pointerToWorld(viewport, event);
        const startPositions = new Map();
        dragIds.forEach((id) => {
          const target = nodesMap.get(id);
          if (target) {
            startPositions.set(id, { x: target.x, y: target.y });
          }
        });
        if (startPositions.size === 0) {
          dragStateRef.current = null;
          if (shouldResumeDragRef.current) {
            shouldResumeDragRef.current = false;
            resumeViewportDrag();
          }
          return;
        }
        dragStateRef.current = {
          nodeIds: [...startPositions.keys()],
          startPointer: pointerStart,
          startPositions,
          lastDelta: { x: 0, y: 0 },
          moved: false,
          committed: false,
        };
      });
      nodeContainer.on('pointerup', (event) => {
        event.stopPropagation();
        handleViewportDragEnd();
      });
      nodeContainer.on('pointerupoutside', () => {
        handleViewportDragEnd();
      });
      nodeContainer.on('pointertap', (event) => {
        if (event.detail >= 2) {
          setNodeEditor(node);
        }
      });
      nodesLayer.addChild(nodeContainer);

      const labelText = new Text({
        text: node.name,
        style: {
          fill: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          letterSpacing: 0.6,
        },
      });
      labelText.anchor.set(0.5);
      const labelContainer = new Container();
      const paddingX = 14;
      const paddingY = 6;
      const labelBackground = new Graphics();
      const labelWidth = labelText.width + paddingX * 2;
      const labelHeight = labelText.height + paddingY * 2;
      labelBackground.beginFill(0x0b1220, 0.9);
      labelBackground.lineStyle(1, strokeColor, 0.6);
      labelBackground.drawRoundedRect(-labelWidth / 2, -labelHeight / 2, labelWidth, labelHeight, labelHeight / 2);
      labelBackground.endFill();
      labelContainer.addChild(labelBackground);
      labelContainer.addChild(labelText);
      labelText.position.set(0, 0);
      labelContainer.position.set(node.x, node.y + radius + 28);
      labelContainer.eventMode = 'static';
      labelContainer.cursor = 'text';
      labelContainer.on('pointertap', (event) => {
        event.stopPropagation();
        if (event.detail >= 2) {
          setNodeEditor(node);
        } else {
          setSelectedNodeIds([node.id]);
        }
      });
      nodesLayer.addChild(labelContainer);
    });
    return () => {
      viewport.off('pointermove', handleViewportDragMove);
      viewport.off('pointerup', handleViewportDragEnd);
      viewport.off('pointerupoutside', handleViewportDragEnd);
    };
  }, [state.nodes, state.edges, nodesMap, selectedNodeIds, selectedEdgeIds, showGrid, gridSize, connectOriginId, activeTool, deleteSelection, toggleNodeLock, applyDragDelta, pauseViewportDrag, resumeViewportDrag]);

  const handleBackgroundInput = useCallback((event) => {
    setBackgroundImage(event.target.value);
  }, []);

  const handleNodeEditorSave = useCallback(() => {
    if (!nodeEditor) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        const target = nodes.find((item) => item.id === nodeEditor.id);
        if (target) {
          Object.assign(target, nodeEditor);
        }
      },
    });
    setNodeEditor(null);
  }, [nodeEditor]);

  const handleEdgeEditorSave = useCallback(() => {
    if (!edgeEditor) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
        const target = edges.find((item) => item.id === edgeEditor.id);
        if (target) {
          Object.assign(target, edgeEditor);
        }
      },
    });
    setEdgeEditor(null);
  }, [edgeEditor]);

  const currentToolLabel = useMemo(() => {
    const tool = TOOLBAR_ACTIONS.find((item) => item.id === activeTool);
    return tool ? `${tool.icon} ${tool.label}` : '';
  }, [activeTool]);

  return (
    <div className="w-full h-screen flex bg-[#050b18] text-slate-100">
      <div className="w-80 border-r border-slate-900/70 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl flex flex-col shadow-[inset_-1px_0_0_rgba(56,189,248,0.25)]">
        <div className="p-6 border-b border-slate-900/60 bg-slate-950/60">
          <h2 className="text-xl font-semibold tracking-wide text-sky-200">Mapa de rutas</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Diseña recorridos roguelike enlazando nodos, tiendas y jefes con el pulido de un tablero arcano.
          </p>
          <Boton
            className="mt-4 w-full border border-sky-500/40 bg-none bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:bg-slate-900"
            onClick={onBack}
          >
            ← Volver al menú
          </Boton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Herramientas</h3>
            <div className="mt-3 space-y-2">
              {TOOLBAR_ACTIONS.map((action) => (
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
                  <span className="text-lg opacity-90">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>
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
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Acciones rápidas</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Boton onClick={handleUndo} className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70">
                ↩️ Deshacer
              </Boton>
              <Boton onClick={handleRedo} className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70">
                ↪️ Rehacer
              </Boton>
              <Boton onClick={duplicateSelection} className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70">
                ⎘ Duplicar
              </Boton>
              <Boton onClick={deleteSelection} className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70">
                Supr
              </Boton>
              <Boton
                onClick={toggleNodeLock}
                className="col-span-2 bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
              >
                🔒 Bloquear / Desbloquear
              </Boton>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
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
            <Boton
              onClick={applyAutoLayout}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
            >
              🧭 Auto-layout
            </Boton>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Guardar</h3>
            <Boton
              onClick={() => saveToLocalStorage(state.nodes, state.edges)}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
            >
              💾 Guardar en navegador
            </Boton>
            <Boton
              onClick={exportToFile}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
            >
              📁 Exportar JSON
            </Boton>
            <label className="block w-full text-xs text-slate-400">
              Importar JSON
              <input
                type="file"
                accept="application/json"
                onChange={importFromFile}
                className="mt-1 w-full text-xs"
              />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
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
              <Input
                value={backgroundImage}
                onChange={handleBackgroundInput}
                placeholder="https://..."
                className="bg-slate-900/80"
              />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-2 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Estados</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(NODE_STATES).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: value.stroke }}
                  />
                  <span className="capitalize text-slate-300">{value.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div
        className="flex-1 relative"
        style={{
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute left-6 top-6 z-10 flex items-center gap-3 rounded-full border border-sky-500/40 bg-slate-900/80 px-6 py-2.5 text-sm shadow-lg shadow-sky-900/40 backdrop-blur">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Herramienta</span>
          <span className="font-medium text-sky-200">{currentToolLabel}</span>
          {connectOriginId && activeTool === 'connect' && (
            <span className="text-xs text-amber-300">Selecciona nodo destino…</span>
          )}
        </div>
        {statusMessage && (
          <div className="absolute right-6 top-6 z-10 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-900/30 backdrop-blur">
            {statusMessage}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {(nodeEditor || edgeEditor) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            {nodeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar nodo</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Nombre</span>
                  <Input
                    value={nodeEditor.name}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, name: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Tipo</span>
                  <select
                    value={nodeEditor.type}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, type: event.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    {NODE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm">
                    <span>X</span>
                    <Input
                      type="number"
                      value={Math.round(nodeEditor.x)}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, x: Number(event.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Y</span>
                    <Input
                      type="number"
                      value={Math.round(nodeEditor.y)}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, y: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Estado</span>
                  <select
                    value={nodeEditor.state}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, state: event.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    {Object.entries(NODE_STATES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Regla de desbloqueo</span>
                  <select
                    value={nodeEditor.unlockMode}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, unlockMode: event.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    <option value="or">Cualquiera (OR)</option>
                    <option value="and">Todos (AND)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Loot / Recompensa</span>
                  <textarea
                    value={nodeEditor.loot}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, loot: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Evento asociado</span>
                  <textarea
                    value={nodeEditor.event}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, event: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Notas</span>
                  <textarea
                    value={nodeEditor.notes}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, notes: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Boton className="bg-slate-800 hover:bg-slate-700" onClick={() => setNodeEditor(null)}>
                    Cancelar
                  </Boton>
                  <Boton className="bg-sky-600 hover:bg-sky-500" onClick={handleNodeEditorSave}>
                    Guardar
                  </Boton>
                </div>
              </div>
            )}
            {edgeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar conexión</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Etiqueta / Regla</span>
                  <Input
                    value={edgeEditor.label || ''}
                    onChange={(event) => setEdgeEditor({ ...edgeEditor, label: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Requisito</span>
                  <textarea
                    value={edgeEditor.requirement || ''}
                    onChange={(event) => setEdgeEditor({ ...edgeEditor, requirement: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Boton className="bg-slate-800 hover:bg-slate-700" onClick={() => setEdgeEditor(null)}>
                    Cancelar
                  </Boton>
                  <Boton className="bg-sky-600 hover:bg-sky-500" onClick={handleEdgeEditorSave}>
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

RouteMapBuilder.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default RouteMapBuilder;

