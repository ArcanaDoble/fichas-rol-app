import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Application, Container, Graphics, Point, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { nanoid } from 'nanoid';
import Boton from './Boton';
import Input from './Input';

const NODE_TYPES = [
  { id: 'start', label: 'Inicio', color: '#38bdf8', icon: '🚩' },
  { id: 'normal', label: 'Normal', color: '#64748b', icon: '⚔️' },
  { id: 'event', label: 'Evento', color: '#facc15', icon: '✨' },
  { id: 'shop', label: 'Tienda', color: '#f97316', icon: '🛒' },
  { id: 'elite', label: 'Elite', color: '#fb7185', icon: '👑' },
  { id: 'heal', label: 'Curación', color: '#34d399', icon: '➕' },
  { id: 'boss', label: 'Jefe', color: '#a855f7', icon: '🐉' },
];

const NODE_STATES = {
  locked: { label: 'Bloqueado', stroke: '#475569', fillAlpha: 0.3 },
  visible: { label: 'Visible', stroke: '#64748b', fillAlpha: 0.45 },
  unlocked: { label: 'Desbloqueado', stroke: '#f1f5f9', fillAlpha: 0.85 },
  completed: { label: 'Completado', stroke: '#22c55e', fillAlpha: 0.95 },
  current: { label: 'Actual', stroke: '#38bdf8', fillAlpha: 0.95 },
};

const TOOLBAR_ACTIONS = [
  { id: 'select', label: 'Seleccionar / Mover', icon: '🖱️' },
  { id: 'create', label: 'Crear Nodo', icon: '🪄' },
  { id: 'connect', label: 'Conectar', icon: '🔗' },
  { id: 'delete', label: 'Borrar', icon: '🗑️' },
  { id: 'toggleLock', label: 'Bloquear / Desbloquear', icon: '🔒' },
];

const GRID_SIZES = [20, 32, 40, 48, 64];

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
      const path = new Graphics();
      const selected = selectedEdgeIds.includes(edge.id);
      const color = selected ? 0xf97316 : 0x94a3b8;
      path.lineStyle(4, color, 0.9);
      const control = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - Math.abs(from.x - to.x) * 0.2,
      };
      path.moveTo(from.x, from.y);
      path.quadraticCurveTo(control.x, control.y, to.x, to.y);
      path.edgeId = edge.id;
      path.eventMode = 'static';
      path.cursor = 'pointer';
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
      const arrowSize = 16;
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
        const text = new Text({
          text: edge.label,
          style: {
            fill: selected ? '#f97316' : '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
          },
        });
        text.anchor.set(0.5);
        text.position.set((from.x + to.x) / 2, (from.y + to.y) / 2);
        text.eventMode = 'static';
        text.cursor = 'text';
        text.on('pointertap', (event) => {
          event.stopPropagation();
          if (event.detail >= 2) {
            setEdgeEditor(edge);
          } else {
            setSelectedEdgeIds([edge.id]);
            setSelectedNodeIds([]);
          }
        });
        edgesLayer.addChild(text);
      }
    });

    state.nodes.forEach((node) => {
      const nodeGraphic = new Graphics();
      const typeDef = NODE_TYPES.find((item) => item.id === node.type) || NODE_TYPES[1];
      const stateDef = NODE_STATES[node.state] || NODE_STATES.locked;
      const selected = selectedNodeIds.includes(node.id);
      const baseColor = parseInt(typeDef.color.replace('#', ''), 16);
      const strokeColor = parseInt(stateDef.stroke.replace('#', ''), 16);
      const radius = 34;
      nodeGraphic.beginFill(baseColor, stateDef.fillAlpha);
      nodeGraphic.lineStyle(selected ? 6 : 4, strokeColor, 1);
      nodeGraphic.drawCircle(0, 0, radius);
      nodeGraphic.endFill();
      if (node.state === 'current') {
        const halo = new Graphics();
        halo.lineStyle(3, 0x38bdf8, 0.8);
        halo.drawCircle(0, 0, radius + 8);
        halo.endFill();
        nodeGraphic.addChild(halo);
      }
      nodeGraphic.position.set(node.x, node.y);
      nodeGraphic.nodeId = node.id;
      nodeGraphic.eventMode = 'static';
      nodeGraphic.cursor = activeTool === 'connect' ? 'crosshair' : 'pointer';
      nodeGraphic.on('pointerdown', (event) => {
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
      nodeGraphic.on('pointerup', (event) => {
        event.stopPropagation();
        handleViewportDragEnd();
      });
      nodeGraphic.on('pointerupoutside', () => {
        handleViewportDragEnd();
      });
      nodeGraphic.on('pointertap', (event) => {
        if (event.detail >= 2) {
          setNodeEditor(node);
        }
      });
      const iconText = new Text({
        text: typeDef.icon,
        style: {
          fontSize: 26,
        },
      });
      iconText.anchor.set(0.5);
      nodeGraphic.addChild(iconText);
      if (node.state === 'completed') {
        const check = new Text({
          text: '✔',
          style: { fontSize: 16, fill: '#22c55e' },
        });
        check.anchor.set(1, 1);
        check.position.set(radius, radius);
        nodeGraphic.addChild(check);
      }
      nodesLayer.addChild(nodeGraphic);

      const label = new Text({
        text: node.name,
        style: {
          fill: '#e2e8f0',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
      });
      label.anchor.set(0.5, -0.3);
      label.position.set(node.x, node.y);
      label.eventMode = 'static';
      label.cursor = 'text';
      label.on('pointertap', (event) => {
        event.stopPropagation();
        if (event.detail >= 2) {
          setNodeEditor(node);
        } else {
          setSelectedNodeIds([node.id]);
        }
      });
      nodesLayer.addChild(label);
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
    <div className="w-full h-screen flex bg-slate-950 text-slate-100">
      <div className="w-72 border-r border-slate-800 bg-slate-900/80 backdrop-blur flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold mb-2">Mapa de Rutas</h2>
          <p className="text-xs text-slate-400">
            Diseña encuentros roguelike conectando nodos y controlando el flujo de tu campaña.
          </p>
          <Boton className="mt-4 w-full" onClick={onBack}>
            ← Volver al menú
          </Boton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Herramientas</h3>
            <div className="space-y-2">
              {TOOLBAR_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(action.id);
                    setConnectOriginId(null);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    activeTool === action.id
                      ? 'border-sky-400/60 bg-sky-500/10 text-sky-200'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                  }`}
                >
                  <span className="text-base">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Creación</h3>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-400">Tipo de nodo</span>
              <select
                value={nodeTypeToCreate}
                onChange={(event) => setNodeTypeToCreate(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
              >
                {NODE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="grid grid-cols-2 gap-2 text-sm">
            <Boton onClick={handleUndo} className="bg-slate-800 hover:bg-slate-700">
              ↩️ Deshacer
            </Boton>
            <Boton onClick={handleRedo} className="bg-slate-800 hover:bg-slate-700">
              ↪️ Rehacer
            </Boton>
            <Boton onClick={duplicateSelection} className="bg-slate-800 hover:bg-slate-700">
              ⎘ Duplicar
            </Boton>
            <Boton onClick={deleteSelection} className="bg-slate-800 hover:bg-slate-700">
              Supr
            </Boton>
            <Boton onClick={toggleNodeLock} className="bg-slate-800 hover:bg-slate-700 col-span-2">
              🔒 Bloquear / Desbloquear
            </Boton>
          </section>
          <section className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.target.checked)}
                />
                <span>Snap a grid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.target.checked)}
                />
                <span>Mostrar grid</span>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Tamaño de grid</span>
              <select
                value={gridSize}
                onChange={(event) => setGridSize(Number(event.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
              >
                {GRID_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </label>
            <Boton onClick={applyAutoLayout} className="bg-slate-800 hover:bg-slate-700 w-full">
              🧭 Auto-layout
            </Boton>
          </section>
          <section className="space-y-2 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Guardar</h3>
            <Boton onClick={() => saveToLocalStorage(state.nodes, state.edges)} className="bg-slate-800 hover:bg-slate-700 w-full">
              💾 Guardar en navegador
            </Boton>
            <Boton onClick={exportToFile} className="bg-slate-800 hover:bg-slate-700 w-full">
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
          <section className="space-y-2 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Fondo</h3>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Color</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-10 w-full rounded"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Imagen (URL)</span>
              <Input value={backgroundImage} onChange={handleBackgroundInput} placeholder="https://..." />
            </label>
          </section>
          <section className="space-y-2 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Estados</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(NODE_STATES).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: value.stroke }}
                  />
                  <span className="capitalize">{value.label}</span>
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
        <div className="absolute left-6 top-4 z-10 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm backdrop-blur">
          <span className="text-slate-400">Herramienta:</span>
          <span className="font-medium text-sky-200">{currentToolLabel}</span>
          {connectOriginId && activeTool === 'connect' && (
            <span className="text-xs text-amber-300">Selecciona nodo destino…</span>
          )}
        </div>
        {statusMessage && (
          <div className="absolute right-6 top-4 z-10 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 backdrop-blur">
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

