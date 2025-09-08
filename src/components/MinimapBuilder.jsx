import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';
import { ESTADOS } from './EstadoSelector';
import HexColorInput from './HexColorInput';
import { getOrUploadFile } from '../utils/storage';
import * as LucideIcons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const L = {
  arrow: '\u2190',
  back: 'Men\u00FA M\u00E1ster',
  new: 'NUEVO',
  pc: 'PC',
  mobile: 'M\u00F3vil',
  autoFit: 'Auto-ajustar',
  readable: 'Modo legible',
  shapeEdit: 'Editar forma',
  quadrant: 'Cuadrante',
  rows: 'Filas',
  cols: 'Columnas',
  cellSize: 'Tama\u00F1o de celda',
  selectedCell: 'Celda seleccionada',
  color: 'Color',
  border: 'Borde',
  width: 'Ancho',
  style: 'Estilo',
  solid: 'S\u00F3lido',
  dashed: 'Discontinuo',
  dotted: 'Punteado',
  none: 'Ninguno',
  icon: 'Icono',
  iconAdd: 'A\u00F1adir icono personalizado',
  annotations: 'Anotaciones',
  effect: 'Efecto',
  effectColor: 'Color del efecto',
  glow: 'Brillo',
  pulse: 'Pulso',
  saveQuadrant: 'Guardar cuadrante',
  savedQuadrants: 'Cuadrantes guardados',
  title: 'T\u00EDtulo',
  addRowTop: 'A\u00F1adir fila desde arriba',
  addRowBottom: 'A\u00F1adir fila desde abajo',
  addColLeft: 'A\u00F1adir columna izquierda',
  addColRight: 'A\u00F1adir columna derecha',
  addCell: 'A\u00F1adir celda',
  delCell: 'Eliminar celda',
  reset: 'Restablecer',
};

function IconThumb({ src, selected, onClick, label }) {
  return (
    <button
      type="button"
      title={label || ''}
      onClick={onClick}
      className={`relative w-14 h-14 rounded-lg overflow-hidden border transition ${selected ? 'border-green-400 ring-2 ring-green-400' : 'border-gray-600 hover:border-gray-400'}`}
    >
      <img
        loading="lazy"
        src={src}
        alt={label || 'icon'}
        className="w-full h-full object-contain bg-gray-800"
      />
    </button>
  );
}
IconThumb.propTypes = {
  src: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  label: PropTypes.string,
};

const QuadrantPreview = ({ q }) => {
  const size = 36;
  const cell = size / Math.max(q.rows, q.cols);
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${q.cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${q.rows}, ${cell}px)`,
      }}
    >
      {q.grid.map((row, r) =>
        row.map((cellData, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cell,
              height: cell,
              background: cellData.active ? cellData.fill : 'transparent',
              border: `1px solid ${
                cellData.active ? cellData.borderColor : 'rgba(255,255,255,0.1)'
              }`,
            }}
          />
        ))
      )}
    </div>
  );
};
QuadrantPreview.propTypes = { q: PropTypes.object.isRequired };

const defaultCell = () => ({
  fill: '#111827',
  borderColor: '#374151',
  borderWidth: 1,
  borderStyle: 'solid',
  icon: null,
  effect: { type: 'none', color: '#ffff00' },
  active: true,
});
const buildGrid = (rows, cols, prev = []) =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      prev[r] && prev[r][c] ? { ...prev[r][c] } : defaultCell()
    )
  );

function MinimapBuilder({ onBack }) {
  const [device, setDevice] = useState('pc');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [cellSize, setCellSize] = useState(48);
  const [grid, setGrid] = useState(() => buildGrid(8, 12));
  const [selectedCells, setSelectedCells] = useState([]);
  const selectedCell = selectedCells[0];
  const [hoveredCell, setHoveredCell] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [shapeEdit, setShapeEdit] = useState(false);
  const [readableMode, setReadableMode] = useState(false);
  const [iconSource, setIconSource] = useState('estados'); // estados | personalizados | emojis | lucide
  const [emojiSearch, setEmojiSearch] = useState('');
  const [lucideSearch, setLucideSearch] = useState('');
  const [customIcons, setCustomIcons] = useState(() => {
    try {
      const raw = localStorage.getItem('minimapCustomIcons');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cellStylePresets, setCellStylePresets] = useState(() => {
    try {
      const raw = localStorage.getItem('minimapCellStylePresets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [quadrantTitle, setQuadrantTitle] = useState('');
  const [quadrants, setQuadrants] = useState(() => {
    try {
      const raw = localStorage.getItem('minimapQuadrants');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [emojiGroups, setEmojiGroups] = useState(null);
  const [lucideNames, setLucideNames] = useState(null);
  const [iconsLoading, setIconsLoading] = useState(false);
  const setAnnotation = (r, c, data) => {
    const key = `${r}-${c}`;
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.key !== key);
      if (data.text || data.icon) next.push({ key, r, c, ...data });
      return next;
    });
    const ref = doc(db, 'minimapAnnotations', key);
    if (data.text || data.icon) {
      setDoc(ref, { r, c, ...data }).catch(() => {});
    } else {
      deleteDoc(ref).catch(() => {});
    }
  };

  const containerRef = useRef(null);
  const skipRebuildRef = useRef(false);
  const longPressTimersRef = useRef(new Map());
  const lastLongPressRef = useRef({ key: null, t: 0 });

  useEffect(() => {
    setGrid((prev) => buildGrid(rows, cols, prev));
  }, [rows, cols]);
  useEffect(() => {
    if (device === 'mobile' && !readableMode) setReadableMode(true);
  }, [device]);
  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const snap = await getDocs(collection(db, 'minimapAnnotations'));
        const list = snap.docs.map((d) => {
          const data = d.data();
          return { key: `${data.r}-${data.c}`, ...data };
        });
        setAnnotations(list);
      } catch {}
    };
    fetchAnnotations();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('minimapCustomIcons', JSON.stringify(customIcons));
    } catch {}
  }, [customIcons]);
  useEffect(() => {
    try {
      localStorage.setItem(
        'minimapCellStylePresets',
        JSON.stringify(cellStylePresets)
      );
    } catch {}
  }, [cellStylePresets]);
  useEffect(() => {
    try {
      localStorage.setItem('minimapQuadrants', JSON.stringify(quadrants));
    } catch {}
  }, [quadrants]);
  useEffect(() => {
    if (shapeEdit) {
      const all = [];
      grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.active) all.push({ r, c });
        })
      );
      setSelectedCells(all);
    } else {
      setSelectedCells([]);
    }
  }, [shapeEdit, grid]);

  const emojiDataUrl = (ch) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='52'>${ch}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const lucideCache = useRef(new Map());
  const lucideDataUrl = (name) => {
    const cache = lucideCache.current;
    if (cache.has(name)) return cache.get(name);
    const pascal = name
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
    const Icon = LucideIcons[pascal];
    if (!Icon) return '';
    const svg = renderToStaticMarkup(<Icon size={64} />);
    const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    cache.set(name, url);
    return url;
  };

  // CatÃ¡logo bÃ¡sico (Estados/Personalizados). Emojis/Lucide se aÃ±aden por entrada.
  const allIcons = useMemo(() => {
    const estadoIcons = ESTADOS.map((e) => ({ url: e.img, name: e.name }));
    const custom = customIcons.map((u) => ({ url: u, name: 'Personalizado' }));
    return {
      estados: estadoIcons,
      personalizados: custom,
      emojis: [],
      lucide: [],
    };
  }, [customIcons]);

  // Cargar todos los emojis (agrupados) cuando se selecciona la pestaña
  useEffect(() => {
    const loadEmojis = async () => {
      if (emojiGroups || iconSource !== 'emojis') return;
      setIconsLoading(true);
      try {
        // Obtener lista base de emojis (incluye nombres en inglés y grupo)
        const res = await fetch('https://unpkg.com/emoji.json/emoji.json', {
          mode: 'cors',
        });
        const list = await res.json();

        // Obtener nombres de emojis en español
        let esList = [];
        try {
          const resEs = await fetch(
            'https://cdn.jsdelivr.net/npm/emojibase-data@latest/es/data.json',
            { mode: 'cors' }
          );
          esList = await resEs.json();
        } catch {
          esList = [];
        }
        const esMap = new Map(esList.map((e) => [e.emoji, e.label]));

        const groups = {};
        list.forEach((e) => {
          const ch = e.char || e.emoji || '';
          if (!ch) return;
          const g = e.group || e.category || 'Otros';
          if (!groups[g]) groups[g] = [];
          groups[g].push({
            ch,
            name: e.name || '',
            nameEs: esMap.get(ch) || '',
          });
        });
        setEmojiGroups(groups);
      } catch {
        // Fallback mínimo si no hay red
        setEmojiGroups({
          Smileys: [
            { ch: '😀', name: '', nameEs: '' },
            { ch: '😄', name: '', nameEs: '' },
            { ch: '😁', name: '', nameEs: '' },
            { ch: '😂', name: '', nameEs: '' },
            { ch: '😉', name: '', nameEs: '' },
            { ch: '😊', name: '', nameEs: '' },
            { ch: '😇', name: '', nameEs: '' },
            { ch: '😈', name: '', nameEs: '' },
            { ch: '😌', name: '', nameEs: '' },
            { ch: '🤪', name: '', nameEs: '' },
            { ch: '🤗', name: '', nameEs: '' },
            { ch: '🤔', name: '', nameEs: '' },
            { ch: '🤨', name: '', nameEs: '' },
            { ch: '😃', name: '', nameEs: '' },
            { ch: '😴', name: '', nameEs: '' },
            { ch: '🤝', name: '', nameEs: '' },
            { ch: '🤕', name: '', nameEs: '' },
          ],
        });
      } finally {
        setIconsLoading(false);
      }
    };
    loadEmojis();
  }, [iconSource, emojiGroups]);

  // Cargar todos los nombres de Lucide localmente del paquete
  useEffect(() => {
    if (lucideNames || iconSource !== 'lucide') return;
    setIconsLoading(true);
    try {
      const names = Object.keys(LucideIcons)
        .filter((n) => /^[A-Z]/.test(n) && n !== 'Icon')
        .map((n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
        .sort();
      setLucideNames(names);
    } finally {
      setIconsLoading(false);
    }
  }, [iconSource, lucideNames]);

  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const adderSize = Math.max(24, Math.min(36, Math.round(cellSize * 0.75)));
  const adderBtn = Math.max(
    22,
    Math.min(adderSize - 6, Math.round(cellSize * 0.75))
  );
  const perimGap = Math.max(10, Math.min(24, Math.round(cellSize * 0.35)));
  const perimMargin = perimGap + adderBtn;

  const [autoFit, setAutoFit] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef(new Map());
  const pinchDistRef = useRef(0);
  const recomputeFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth - 16;
    const ch = el.clientHeight - 16;
    const neededW = gridWidth + perimMargin * 2;
    const neededH = gridHeight + perimMargin * 2;
    const minScale = device === 'mobile' ? 0.8 : 0.4;
    setFitScale(
      Math.min(1, Math.max(minScale, Math.min(cw / neededW, ch / neededH)))
    );
  }, [gridWidth, gridHeight, perimMargin, device]);
  useEffect(() => {
    recomputeFit();
  }, [recomputeFit, rows, cols, cellSize, device]);
  useEffect(() => {
    const onResize = () => recomputeFit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeFit]);

  useEffect(() => {
    if (autoFit) setOffset({ x: 0, y: 0 });
  }, [autoFit]);

  const handleWheel = useCallback(
    (e) => {
      if (autoFit) return;
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((z) => {
        const newZoom = Math.min(2, Math.max(0.35, z - e.deltaY * 0.001));
        const scale = newZoom / z;
        setOffset((prev) => ({
          x: prev.x - (mx - prev.x) * (scale - 1),
          y: prev.y - (my - prev.y) * (scale - 1),
        }));
        return newZoom;
      });
    },
    [autoFit]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (autoFit) return;
      e.preventDefault();
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 1) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        pinchDistRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      }
    },
    [autoFit]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (autoFit) return;
      e.preventDefault();
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const midX = (p1.x + p2.x) / 2 - rect.left;
        const midY = (p1.y + p2.y) / 2 - rect.top;
        setZoom((z) => {
          const newZoom = Math.min(
            2,
            Math.max(0.35, (z * dist) / (pinchDistRef.current || dist))
          );
          const scale = newZoom / z;
          setOffset((prev) => ({
            x: prev.x - (midX - prev.x) * (scale - 1),
            y: prev.y - (midY - prev.y) * (scale - 1),
          }));
          return newZoom;
        });
        pinchDistRef.current = dist;
      } else if (isPanningRef.current) {
        const pos = pointersRef.current.get(e.pointerId);
        const dx = pos.x - lastPosRef.current.x;
        const dy = pos.y - lastPosRef.current.y;
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPosRef.current = pos;
      }
    },
    [autoFit]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (autoFit) return;
      e.preventDefault();
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) {
        pinchDistRef.current = 0;
      }
      if (pointersRef.current.size === 0) {
        isPanningRef.current = false;
      } else if (pointersRef.current.size === 1) {
        const pos = Array.from(pointersRef.current.values())[0];
        lastPosRef.current = pos;
      }
    },
    [autoFit]
  );

  const handleCellClick = (r, c) =>
    setSelectedCells((prev) => {
      const exists = prev.some((cell) => cell.r === r && cell.c === c);
      if (exists) return prev.filter((cell) => cell.r !== r || cell.c !== c);
      return [...prev, { r, c }];
    });
  const updateCell = (cells, updater) =>
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], ...updater };
      });
      return next;
    });
  const trimGrid = (g) => {
    let next = g;
    let newRows = next.length;
    let newCols = next[0]?.length || 0;
    const rowEmpty = (row) => row.every((cell) => !cell.active);
    const colEmpty = (idx) => next.every((row) => !row[idx].active);
    while (newRows > 1 && rowEmpty(next[0])) {
      next = next.slice(1);
      newRows--;
    }
    while (newRows > 1 && rowEmpty(next[newRows - 1])) {
      next = next.slice(0, -1);
      newRows--;
    }
    while (newCols > 1 && colEmpty(0)) {
      next = next.map((row) => row.slice(1));
      newCols--;
    }
    while (newCols > 1 && colEmpty(newCols - 1)) {
      next = next.map((row) => row.slice(0, -1));
      newCols--;
    }
    if (newRows !== rows) setRows(newRows);
    if (newCols !== cols) setCols(newCols);
    setSelectedCells((prev) =>
      prev.filter(({ r, c }) => r < newRows && c < newCols && next[r][c].active)
    );
    return next;
  };
  const setActive = (cells, active) =>
    setGrid((prev) => {
      let next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], active };
      });
      return trimGrid(next);
    });
  const clearIcon = (cells) => updateCell(cells, { icon: null });
  const resetCellStyle = (cells) =>
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        const active = next[r][c].active;
        next[r][c] = { ...defaultCell(), active };
      });
      return next;
    });
  const saveCellPreset = () => {
    if (!selectedCell) return;
    const cell = grid[selectedCell.r][selectedCell.c];
    const preset = {
      fill: cell.fill,
      borderColor: cell.borderColor,
      borderWidth: cell.borderWidth,
      borderStyle: cell.borderStyle,
      icon: cell.icon,
      effect: cell.effect,
    };
    setCellStylePresets((p) => [...p, preset]);
  };
  const applyCellPreset = (preset) => {
    if (selectedCells.length === 0) return;
    updateCell(selectedCells, preset);
  };
  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const { url } = await getOrUploadFile(file, 'MinimapaIcons');
      setCustomIcons((p) => [...p, url]);
    } catch {
      const fr = new FileReader();
      await new Promise((res, rej) => {
        fr.onerror = rej;
        fr.onload = () => res();
        fr.readAsDataURL(file);
      });
      if (typeof fr.result === 'string')
        setCustomIcons((p) => [...p, fr.result]);
    }
  };

  const saveQuadrant = () => {
    const title = quadrantTitle.trim() || `Cuadrante ${quadrants.length + 1}`;
    const data = {
      title,
      rows,
      cols,
      cellSize,
      grid,
    };
    setQuadrants((p) => [...p, data]);
    setQuadrantTitle('');
  };
  const loadQuadrant = (q) => {
    setRows(q.rows);
    setCols(q.cols);
    setCellSize(q.cellSize);
    setGrid(() => buildGrid(q.rows, q.cols, q.grid));
    setSelectedCells([]);
  };

  const effectiveReadable = readableMode || device === 'mobile';

  // Adders periferia
  const addRowTopAt = (cIndex) => {
    setGrid((prev) => {
      const newRow = Array.from({ length: cols }, () => ({
        ...defaultCell(),
        active: false,
      }));
      if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true;
      return [newRow, ...prev.map((row) => row.slice())];
    });
    skipRebuildRef.current = true;
    setRows((r) => r + 1);
  };
  const addRowBottomAt = (cIndex) => {
    setGrid((prev) => {
      const newRow = Array.from({ length: cols }, () => ({
        ...defaultCell(),
        active: false,
      }));
      if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true;
      return [...prev.map((row) => row.slice()), newRow];
    });
    skipRebuildRef.current = true;
    setRows((r) => r + 1);
  };
  const addColLeftAt = (rIndex) => {
    setGrid((prev) =>
      prev.map((row, r) => [{ ...defaultCell(), active: r === rIndex }, ...row])
    );
    skipRebuildRef.current = true;
    setCols((c) => c + 1);
  };
  const addColRightAt = (rIndex) => {
    setGrid((prev) =>
      prev.map((row, r) => [...row, { ...defaultCell(), active: r === rIndex }])
    );
    skipRebuildRef.current = true;
    setCols((c) => c + 1);
  };
  const hasActiveNeighbor = (r, c) =>
    (r > 0 && grid[r - 1][c]?.active) ||
    (r < rows - 1 && grid[r + 1][c]?.active) ||
    (c > 0 && grid[r][c - 1]?.active) ||
    (c < cols - 1 && grid[r][c + 1]?.active);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Boton
            size="sm"
            className="bg-gray-700 hover:bg-gray-600"
            onClick={onBack}
          >
            {L.arrow} {L.back}
          </Boton>
          <h1 className="text-xl font-bold">Minimapa</h1>
          <span className="px-2 py-0.5 text-xs bg-yellow-500 text-yellow-900 rounded-full font-bold">
            {L.new}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
            <input
              type="checkbox"
              checked={shapeEdit}
              onChange={(e) => setShapeEdit(e.target.checked)}
            />
            <span>{L.shapeEdit}</span>
          </label>
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
            <input
              type="checkbox"
              checked={effectiveReadable}
              onChange={(e) => setReadableMode(e.target.checked)}
            />
            <span>{L.readable}</span>
          </label>
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
            <span>{L.autoFit}</span>
            <input
              type="checkbox"
              checked={autoFit}
              onChange={(e) => setAutoFit(e.target.checked)}
            />
          </label>
          {!autoFit && (
            <div className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <span>Zoom</span>
              <input
                type="range"
                min={35}
                max={200}
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
              />
              <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>
          )}
          <Boton
            size="sm"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            {L.reset}
          </Boton>
          <Boton
            size="sm"
            color={device === 'pc' ? 'blue' : 'gray'}
            onClick={() => setDevice('pc')}
          >
            {L.pc}
          </Boton>
          <Boton
            size="sm"
            color={device === 'mobile' ? 'blue' : 'gray'}
            onClick={() => {
              setDevice('mobile');
              setAutoFit(true);
            }}
          >
            {L.mobile}
          </Boton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 space-y-3 lg:col-span-1">
          <h2 className="font-semibold">{L.quadrant}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-gray-300">{L.rows}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={rows}
                onChange={(e) =>
                  setRows(
                    Math.max(1, Math.min(200, Number(e.target.value) || 1))
                  )
                }
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-300">{L.cols}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={cols}
                onChange={(e) =>
                  setCols(
                    Math.max(1, Math.min(200, Number(e.target.value) || 1))
                  )
                }
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-gray-300">
                {L.cellSize}: {cellSize}px
              </span>
              <input
                type="range"
                min={24}
                max={96}
                step={4}
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedCells.length > 0}
                readOnly
              />
              <span>{L.selectedCell}</span>
            </label>
            {selectedCells.length > 0 && (
              <Boton
                size="sm"
                color="red"
                onClick={() => {
                  setActive(selectedCells, false);
                  setSelectedCells([]);
                }}
              >
                {L.delCell}
              </Boton>
            )}
          </div>

          {selectedCells.length > 0 &&
            (() => {
              const selected = grid[selectedCells[0].r][selectedCells[0].c];
              return (
                <div className="mt-2 border-t border-gray-700 pt-3 space-y-3">
                  <h3 className="font-semibold">
                    Celda ({selectedCell.r + 1}
                    {'\u00D7'}
                    {selectedCell.c + 1})
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Estilos</h4>
                      <div className="flex gap-2">
                        <Boton
                          size="sm"
                          onClick={() => resetCellStyle(selectedCells)}
                        >
                          {L.reset}
                        </Boton>
                        <Boton size="sm" onClick={saveCellPreset}>
                          Guardar estilo
                        </Boton>
                      </div>
                    </div>
                    {cellStylePresets.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cellStylePresets.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => applyCellPreset(p)}
                            className="w-8 h-8 rounded overflow-hidden border border-gray-600 hover:border-gray-400"
                            title="Aplicar preset"
                          >
                            <div
                              className="w-full h-full"
                              style={{
                                backgroundColor: p.fill,
                                borderColor: p.borderColor,
                                borderWidth: p.borderWidth,
                                borderStyle: p.borderStyle,
                                boxShadow:
                                  p.effect?.type === 'glow' || p.effect?.type === 'pulse'
                                    ? `0 0 10px 2px ${p.effect.color}`
                                    : undefined,
                                animation:
                                  p.effect?.type === 'pulse'
                                    ? 'pulse 1.5s infinite'
                                    : undefined,
                              }}
                            >
                              {p.icon && (
                                <img
                                  src={p.icon}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <span>{L.color}</span>
                      <HexColorInput
                        value={selected.fill}
                        onChange={(v) =>
                          updateCell(selectedCells, {
                            fill: v,
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span>{L.border}</span>
                      <HexColorInput
                        value={selected.borderColor}
                        onChange={(v) =>
                          updateCell(selectedCells, {
                            borderColor: v,
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span>{L.width}</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={selected.borderWidth}
                        onChange={(e) =>
                          updateCell(selectedCells, {
                            borderWidth: Number(e.target.value) || 0,
                          })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-16"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span>{L.style}</span>
                      <select
                        value={selected.borderStyle}
                        onChange={(e) =>
                          updateCell(selectedCells, {
                            borderStyle: e.target.value,
                          })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                      >
                        <option value="solid">{L.solid}</option>
                        <option value="dashed">{L.dashed}</option>
                        <option value="dotted">{L.dotted}</option>
                        <option value="none">{L.none}</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 col-span-2">
                      <span>{L.effect}</span>
                      <select
                        value={selected.effect?.type || 'none'}
                        onChange={(e) =>
                          updateCell(selectedCells, {
                            effect: {
                              ...selected.effect,
                              type: e.target.value,
                            },
                          })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                      >
                        <option value="none">{L.none}</option>
                        <option value="glow">{L.glow}</option>
                        <option value="pulse">{L.pulse}</option>
                      </select>
                    </label>
                    {selected.effect?.type !== 'none' && (
                      <label className="flex items-center gap-2 col-span-2">
                        <span>{L.effectColor}</span>
                        <HexColorInput
                          value={selected.effect?.color || '#ffff00'}
                          onChange={(v) =>
                            updateCell(selectedCells, {
                              effect: {
                                ...selected.effect,
                                color: v,
                              },
                            })
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{L.icon}</h4>
                      {selected.icon && (
                        <button
                          className="text-sm text-red-300 hover:text-red-200 underline"
                          onClick={() => clearIcon(selectedCells)}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { id: 'estados', label: 'Estados' },
                        { id: 'personalizados', label: 'Personalizados' },
                        { id: 'emojis', label: 'Emojis' },
                        { id: 'lucide', label: 'Lucide' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setIconSource(b.id)}
                          className={`px-2 py-1 rounded border text-xs ${iconSource === b.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    {iconSource === 'emojis' && emojiGroups && (
                      <div className="max-h-52 overflow-auto space-y-2 p-1 bg-gray-900 rounded">
                        <input
                          type="text"
                          value={emojiSearch}
                          onChange={(e) => setEmojiSearch(e.target.value)}
                          placeholder="Buscar"
                          className="w-full mb-2 p-1 rounded bg-gray-800 text-xs text-white"
                        />
                        {Object.entries(emojiGroups).map(([group, items]) => {
                          const term = emojiSearch
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/\p{Diacritic}/gu, '');
                          const filtered = items.filter(
                            ({ ch, name, nameEs }) => {
                              const hay = [ch, name, nameEs].map((s) =>
                                (s || '')
                                  .toLowerCase()
                                  .normalize('NFD')
                                  .replace(/\p{Diacritic}/gu, '')
                              );
                              return hay.some((h) => h.includes(term));
                            }
                          );
                          if (!filtered.length) return null;
                          return (
                            <div key={group}>
                              <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                                {group}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {filtered.map((item, i) => (
                                  <IconThumb
                                    key={`${group}-${i}`}
                                    src={emojiDataUrl(item.ch)}
                                    label={item.ch}
                                    selected={
                                      selected.icon === emojiDataUrl(item.ch)
                                    }
                                    onClick={() =>
                                      updateCell(selectedCells, {
                                        icon: emojiDataUrl(item.ch),
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {iconSource === 'lucide' && lucideNames && (
                      <div className="max-h-52 overflow-auto space-y-2 p-1 bg-gray-900 rounded">
                        <input
                          type="text"
                          value={lucideSearch}
                          onChange={(e) => setLucideSearch(e.target.value)}
                          placeholder="Buscar"
                          className="w-full mb-2 p-1 rounded bg-gray-800 text-xs text-white"
                        />
                        {Object.entries(
                          lucideNames
                            .filter((n) =>
                              n.includes(lucideSearch.toLowerCase())
                            )
                            .reduce((acc, name) => {
                              const k = name[0].toUpperCase();
                              (acc[k] ||= []).push(name);
                              return acc;
                            }, {})
                        ).map(([letter, names]) => (
                          <div key={letter}>
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                              {letter}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {names.map((n) => {
                                const url = lucideDataUrl(n);
                                return (
                                  <IconThumb
                                    key={n}
                                    src={url}
                                    label={n}
                                    selected={selected.icon === url}
                                    onClick={() =>
                                      updateCell(selectedCells, { icon: url })
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(iconSource === 'estados' ||
                      iconSource === 'personalizados') && (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-1 bg-gray-900 rounded">
                        {(allIcons[iconSource] || []).map((ico, i) => (
                          <IconThumb
                            key={`${iconSource}-${i}`}
                            src={ico.url}
                            label={ico.name}
                            selected={selected.icon === ico.url}
                            onClick={() =>
                              updateCell(selectedCells, { icon: ico.url })
                            }
                          />
                        ))}
                      </div>
                    )}
                    {iconsLoading && (
                      <div className="text-xs text-gray-400">Cargando…</div>
                    )}
                    <label className="block text-xs text-gray-300">
                      {L.iconAdd}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files &&
                        e.target.files[0] &&
                        handleFileUpload(e.target.files[0])
                      }
                      className="block w-full text-sm text-gray-300 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                    />
                    <div className="mt-2 border-t border-gray-700 pt-2">
                      <h4 className="font-medium mb-1">{L.annotations}</h4>
                      {(() => {
                        const ann = annotations.find(
                          (a) =>
                            a.r === selectedCell.r && a.c === selectedCell.c
                        );
                        return (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={ann?.text || ''}
                              onChange={(e) =>
                                setAnnotation(selectedCell.r, selectedCell.c, {
                                  text: e.target.value,
                                  icon: ann?.icon || '',
                                })
                              }
                              placeholder="Texto"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                            />
                            <input
                              type="text"
                              value={ann?.icon || ''}
                              onChange={(e) =>
                                setAnnotation(selectedCell.r, selectedCell.c, {
                                  text: ann?.text || '',
                                  icon: e.target.value,
                                })
                              }
                              placeholder="URL icono"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={quadrantTitle}
                onChange={(e) => setQuadrantTitle(e.target.value)}
                placeholder={L.title}
                className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-sm"
              />
              <Boton size="sm" onClick={saveQuadrant}>
                {L.saveQuadrant}
              </Boton>
            </div>
            {quadrants.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-gray-300">{L.savedQuadrants}:</div>
                <div className="flex flex-wrap gap-2">
                  {quadrants.map((q, i) => (
                    <button
                      key={`quad-${i}`}
                      onClick={() => loadQuadrant(q)}
                      className="flex flex-col items-center p-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600"
                    >
                      <QuadrantPreview q={q} />
                      <span className="mt-1">{q.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 lg:col-span-3 min-h-[50vh]">
          <div
            className="h-full w-full overflow-hidden touch-none"
            ref={containerRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              className={
                device === 'mobile' ? 'mx-auto w-full max-w-[420px]' : ''
              }
            >
              <div
                className="relative mx-auto"
                style={{
                  width: `${gridWidth + perimMargin * 2}px`,
                  height: `${gridHeight + perimMargin * 2}px`,
                }}
              >
                <div
                  className="absolute top-0 left-0"
                  style={{
                    transformOrigin: 'top left',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${
                      autoFit ? fitScale : zoom
                    })`,
                    width: `${gridWidth + perimMargin * 2}px`,
                    height: `${gridHeight + perimMargin * 2}px`,
                  }}
                >
                  {Array.from({ length: cols }).map((_, c) => (
                    <button
                      key={`top-${c}`}
                      className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                      style={{
                        width: adderBtn,
                        height: adderBtn,
                        top: (perimMargin - adderBtn) / 2,
                        left:
                          perimMargin +
                          c * cellSize +
                          (cellSize - adderBtn) / 2,
                      }}
                      title={L.addRowTop}
                      onClick={() => addRowTopAt(c)}
                    >
                      <LucideIcons.Plus size={adderBtn * 0.6} />
                    </button>
                  ))}
                  {Array.from({ length: cols }).map((_, c) => (
                    <button
                      key={`bottom-${c}`}
                      className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                      style={{
                        width: adderBtn,
                        height: adderBtn,
                        top:
                          perimMargin +
                          gridHeight +
                          (perimMargin - adderBtn) / 2,
                        left:
                          perimMargin +
                          c * cellSize +
                          (cellSize - adderBtn) / 2,
                      }}
                      title={L.addRowBottom}
                      onClick={() => addRowBottomAt(c)}
                    >
                      <LucideIcons.Plus size={adderBtn * 0.6} />
                    </button>
                  ))}
                  {Array.from({ length: rows }).map((_, r) => (
                    <button
                      key={`left-${r}`}
                      className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                      style={{
                        width: adderBtn,
                        height: adderBtn,
                        left: (perimMargin - adderBtn) / 2,
                        top:
                          perimMargin +
                          r * cellSize +
                          (cellSize - adderBtn) / 2,
                      }}
                      title={L.addColLeft}
                      onClick={() => addColLeftAt(r)}
                    >
                      <LucideIcons.Plus size={adderBtn * 0.6} />
                    </button>
                  ))}
                  {Array.from({ length: rows }).map((_, r) => (
                    <button
                      key={`right-${r}`}
                      className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                      style={{
                        width: adderBtn,
                        height: adderBtn,
                        left:
                          perimMargin +
                          gridWidth +
                          (perimMargin - adderBtn) / 2,
                        top:
                          perimMargin +
                          r * cellSize +
                          (cellSize - adderBtn) / 2,
                      }}
                      title={L.addColRight}
                      onClick={() => addColRightAt(r)}
                    >
                      <LucideIcons.Plus size={adderBtn * 0.6} />
                    </button>
                  ))}

                  <div
                    className="absolute"
                  style={{
                    left: perimMargin,
                    top: perimMargin,
                    width: gridWidth,
                    height: gridHeight,
                  }}
                >
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                        {grid.map((row, r) =>
                          row.map((cell, c) => {
                            const key = `${r}-${c}`;
                            const isSelected = selectedCells.some(
                              (cell) => cell.r === r && cell.c === c
                            );
                            if (!cell.active) {
                              const showAdder = hasActiveNeighbor(r, c);
                              return (
                                <div
                                  key={key}
                                  className="relative"
                                  style={{
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                  }}
                                >
                                  {showAdder && (
                                    <button
                                      className="absolute inset-0 m-auto w-7 h-7 rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-xs shadow transition"
                                      onClick={() => setActive({ r, c }, true)}
                                      title={L.addCell}
                                    >
                                      <LucideIcons.Plus size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div
                                key={key}
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  const keyId = `${r}-${c}`;
                                  if (
                                    lastLongPressRef.current.key === keyId &&
                                    Date.now() - lastLongPressRef.current.t <
                                      700
                                  ) {
                                    e.preventDefault();
                                    return;
                                  }
                                  handleCellClick(r, c);
                                }}
                                onTouchStart={() => {
                                  const keyId = `${r}-${c}`;
                                  const timer = setTimeout(() => {
                                    setActive({ r, c }, false);
                                    setSelectedCells((prev) =>
                                      prev.filter(
                                        (cell) => cell.r !== r || cell.c !== c
                                      )
                                    );
                                    lastLongPressRef.current = {
                                      key: keyId,
                                      t: Date.now(),
                                    };
                                    longPressTimersRef.current.delete(keyId);
                                  }, 550);
                                  longPressTimersRef.current.set(keyId, {
                                    id: timer,
                                  });
                                }}
                                onTouchEnd={() => {
                                  const keyId = `${r}-${c}`;
                                  const st =
                                    longPressTimersRef.current.get(keyId);
                                  if (st) {
                                    clearTimeout(st.id);
                                    longPressTimersRef.current.delete(keyId);
                                  }
                                }}
                                onTouchMove={() => {
                                  const keyId = `${r}-${c}`;
                                  const st =
                                    longPressTimersRef.current.get(keyId);
                                  if (st) {
                                    clearTimeout(st.id);
                                    longPressTimersRef.current.delete(keyId);
                                  }
                                }}
                                onMouseEnter={() => setHoveredCell({ r, c })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && handleCellClick(r, c)
                                }
                                className={`group relative z-0 select-none transition-transform duration-150 ease-out ${isSelected ? 'z-10 scale-[1.06] ring-2 ring-blue-400 outline outline-2 outline-white/10' : 'hover:z-10 hover:scale-[1.06] hover:outline hover:outline-2 hover:outline-white/10'}`}
                                style={{
                                  background: cell.fill,
                                  borderColor: cell.borderColor,
                                  borderWidth: `${readableMode || device === 'mobile' ? Math.max(cell.borderWidth, 2) : cell.borderWidth}px`,
                                  borderStyle: cell.borderStyle,
                                  width: `${cellSize}px`,
                                  height: `${cellSize}px`,
                                  boxShadow:
                                    cell.effect?.type === 'glow' || cell.effect?.type === 'pulse'
                                      ? `0 0 10px 2px ${cell.effect.color}`
                                      : undefined,
                                  animation:
                                    cell.effect?.type === 'pulse'
                                      ? 'pulse 1.5s infinite'
                                      : undefined,
                                  zIndex: isSelected ? 20 : undefined,
                                }}
                              >
                                {cell.icon && (
                                  <img
                                    src={cell.icon}
                                    alt="icon"
                                    className="absolute inset-0 m-auto w-2/3 h-2/3 object-contain pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
                                  />
                                )}
                                <button
                                  type="button"
                                  className={`absolute top-0 right-0 m-0.5 z-30 w-4 h-4 rounded text-rose-600 flex items-center justify-center transition-opacity duration-75 ${shapeEdit || isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                                  title="Eliminar celda"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActive({ r, c }, false);
                                    setSelectedCells((prev) =>
                                      prev.filter(
                                        (cell) => cell.r !== r || cell.c !== c
                                      )
                                    );
                                  }}
                                >
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    focusable="false"
                                  >
                                    <path
                                      d="M5 5L19 19M19 5L5 19"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 2 }}
                    >
                      {annotations.map((a) => {
                          const showTooltip =
                            (hoveredCell &&
                              hoveredCell.r === a.r &&
                              hoveredCell.c === a.c) ||
                            selectedCells.some(
                              (cell) => cell.r === a.r && cell.c === a.c
                            );
                          return (
                            <div
                              key={a.key}
                              className="absolute"
                              style={{
                                left: a.c * cellSize,
                                top: a.r * cellSize,
                                width: cellSize,
                                height: cellSize,
                              }}
                            >
                              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full" />
                              {showTooltip && (
                                <div className="absolute z-40 left-1/2 -translate-x-1/2 -translate-y-full mb-2 pointer-events-none">
                                  <div className="relative px-2 py-1 bg-gray-900/90 text-white text-xs rounded-md shadow-lg whitespace-pre-line">
                                    {a.text}
                                    <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900/90" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden mt-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={shapeEdit}
                onChange={(e) => setShapeEdit(e.target.checked)}
              />
              <span>{L.shapeEdit}</span>
            </label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <input type="checkbox" checked={true} disabled />
              <span>{L.readable}</span>
            </label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <span>{L.autoFit}</span>
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e) => setAutoFit(e.target.checked)}
              />
            </label>
            {!autoFit && (
              <div className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
                <span>Zoom</span>
                <input
                  type="range"
                  min={35}
                  max={200}
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(Number(e.target.value) / 100)}
                />
              </div>
            )}
            <Boton
              size="sm"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
            >
              {L.reset}
            </Boton>
          </div>
        </div>
      </div>
    </div>
  );
}

MinimapBuilder.propTypes = { onBack: PropTypes.func.isRequired };
export default MinimapBuilder;
