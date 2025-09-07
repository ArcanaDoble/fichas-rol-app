import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';
import { ESTADOS } from './EstadoSelector';
import { getOrUploadFile } from '../utils/storage';
import * as LucideIcons from 'lucide-react';

const L = {
  arrow: '\u2190', back: 'Men\u00FA M\u00E1ster', new: 'NUEVO', pc: 'PC', mobile: 'M\u00F3vil',
  autoFit: 'Auto-ajustar', readable: 'Modo legible', shapeEdit: 'Editar forma',
  quadrant: 'Cuadrante', rows: 'Filas', cols: 'Columnas', cellSize: 'Tama\u00F1o de celda',
  selectedCell: 'Celda seleccionada', color: 'Color', border: 'Borde', width: 'Ancho',
  style: 'Estilo', solid: 'S\u00F3lido', dashed: 'Discontinuo', dotted: 'Punteado', none: 'Ninguno',
  icon: 'Icono', iconAdd: 'A\u00F1adir icono personalizado',
  addRowTop: 'A\u00F1adir fila desde arriba', addRowBottom: 'A\u00F1adir fila desde abajo',
  addColLeft: 'A\u00F1adir columna izquierda', addColRight: 'A\u00F1adir columna derecha',
  addCell: 'A\u00F1adir celda', delCell: 'Eliminar celda',
};

function IconThumb({ src, selected, onClick, label }) {
  return (
    <button type="button" title={label || ''} onClick={onClick}
      className={`relative w-14 h-14 rounded-lg overflow-hidden border transition ${selected ? 'border-green-400 ring-2 ring-green-400' : 'border-gray-600 hover:border-gray-400'}`}>
      <img src={src} alt={label || 'icon'} className="w-full h-full object-contain bg-gray-800" />
    </button>
  );
}
IconThumb.propTypes = { src: PropTypes.string.isRequired, selected: PropTypes.bool, onClick: PropTypes.func, label: PropTypes.string };

const defaultCell = () => ({ fill: '#111827', borderColor: '#374151', borderWidth: 1, borderStyle: 'solid', icon: null, active: true });
const buildGrid = (rows, cols, prev = []) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (prev[r] && prev[r][c]) ? { ...prev[r][c] } : defaultCell()));

function MinimapBuilder({ onBack }) {
  const [device, setDevice] = useState('pc');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [cellSize, setCellSize] = useState(48);
  const [grid, setGrid] = useState(() => buildGrid(8, 12));
  const [selectedCell, setSelectedCell] = useState(null);
  const [shapeEdit, setShapeEdit] = useState(false);
  const [readableMode, setReadableMode] = useState(false);
  const [iconSource, setIconSource] = useState('estados'); // estados | personalizados | emojis | lucide
  const [emojiSearch, setEmojiSearch] = useState('');
  const [lucideSearch, setLucideSearch] = useState('');
  const [customIcons, setCustomIcons] = useState(() => { try { const raw = localStorage.getItem('minimapCustomIcons'); return raw ? JSON.parse(raw) : []; } catch { return []; } });
  const [emojiGroups, setEmojiGroups] = useState(null);
  const [lucideNames, setLucideNames] = useState(null);
  const [iconsLoading, setIconsLoading] = useState(false);

  const containerRef = useRef(null);
  const skipRebuildRef = useRef(false);
  const longPressTimersRef = useRef(new Map());
  const lastLongPressRef = useRef({ key: null, t: 0 });

  useEffect(() => { setGrid((prev) => buildGrid(rows, cols, prev)); }, [rows, cols]);
  useEffect(() => { if (device === 'mobile' && !readableMode) setReadableMode(true); }, [device]);
  useEffect(() => { try { localStorage.setItem('minimapCustomIcons', JSON.stringify(customIcons)); } catch {} }, [customIcons]);

  const emojiDataUrl = (ch) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='52'>${ch}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // CatÃ¡logo bÃ¡sico (Estados/Personalizados). Emojis/Lucide se aÃ±aden por entrada.
  const allIcons = useMemo(() => {
    const estadoIcons = ESTADOS.map((e) => ({ url: e.img, name: e.name }));
    const custom = customIcons.map((u) => ({ url: u, name: 'Personalizado' }));
    return { estados: estadoIcons, personalizados: custom, emojis: [], lucide: [] };
  }, [customIcons]);

  // Cargar todos los emojis (agrupados) cuando se selecciona la pestaÃ±a
  useEffect(() => {
    const loadEmojis = async () => {
      if (emojiGroups || iconSource !== 'emojis') return;
      setIconsLoading(true);
      try {
        const res = await fetch('https://unpkg.com/emoji.json/emoji.json', { mode: 'cors' });
        const list = await res.json();
        const groups = {};
        list.forEach((e) => {
          const ch = e.char || e.emoji || '';
          if (!ch) return;
          const g = e.group || e.category || 'Otros';
          if (!groups[g]) groups[g] = [];
          groups[g].push(ch);
        });
        setEmojiGroups(groups);
      } catch {
        // Fallback mÃ­nimo si no hay red
        setEmojiGroups({ Smileys: ['ðŸ˜€','ðŸ˜„','ðŸ˜','ðŸ˜†','ðŸ˜‰','ðŸ˜Š','ðŸ˜','ðŸ˜˜','ðŸ˜œ','ðŸ¤ª','ðŸ¤—','ðŸ¤”','ðŸ¤¨','ðŸ˜','ðŸ˜´','ðŸ¤’','ðŸ¤•'] });
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

    const gridWidth = cols * cellSize; const gridHeight = rows * cellSize;
  const adderSize = Math.max(24, Math.min(36, Math.round(cellSize * 0.75))); const adderBtn = Math.max(22, Math.min(adderSize - 6, Math.round(cellSize * 0.75)));
  const perimGap = Math.max(10, Math.min(24, Math.round(cellSize * 0.35))); const perimMargin = perimGap + adderBtn;

  const [autoFit, setAutoFit] = useState(true); const [zoom, setZoom] = useState(1); const [fitScale, setFitScale] = useState(1);
  const recomputeFit = useCallback(() => { const el = containerRef.current; if (!el) return; const cw = el.clientWidth - 16; const ch = el.clientHeight - 16; const neededW = gridWidth + perimMargin * 2; const neededH = gridHeight + perimMargin * 2; const minScale = device === 'mobile' ? 0.8 : 0.4; setFitScale(Math.min(1, Math.max(minScale, Math.min(cw / neededW, ch / neededH)))) }, [gridWidth, gridHeight, perimMargin, device]);
  useEffect(() => { recomputeFit(); }, [recomputeFit, rows, cols, cellSize, device]);
  useEffect(() => { const onResize = () => recomputeFit(); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, [recomputeFit]);

  const handleCellClick = (r, c) => setSelectedCell({ r, c });
  const updateCell = (r, c, updater) => setGrid((prev) => { const next = prev.map((row) => row.slice()); next[r] = next[r].slice(); next[r][c] = { ...next[r][c], ...updater }; return next; });
  const setActive = (r, c, active) => updateCell(r, c, { active });
  const clearIcon = (r, c) => updateCell(r, c, { icon: null });
  const handleFileUpload = async (file) => { if (!file) return; try { const { url } = await getOrUploadFile(file, 'MinimapaIcons'); setCustomIcons((p) => [...p, url]); } catch { const fr = new FileReader(); await new Promise((res, rej) => { fr.onerror = rej; fr.onload = () => res(); fr.readAsDataURL(file); }); if (typeof fr.result === 'string') setCustomIcons((p) => [...p, fr.result]); } };

  const effectiveReadable = readableMode || device === 'mobile';

  // Adders periferia
  const addRowTopAt = (cIndex) => { setGrid((prev) => { const newRow = Array.from({ length: cols }, () => ({ ...defaultCell(), active: false })); if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true; return [newRow, ...prev.map((row) => row.slice())]; }); skipRebuildRef.current = true; setRows((r) => r + 1); };
  const addRowBottomAt = (cIndex) => { setGrid((prev) => { const newRow = Array.from({ length: cols }, () => ({ ...defaultCell(), active: false })); if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true; return [...prev.map((row) => row.slice()), newRow]; }); skipRebuildRef.current = true; setRows((r) => r + 1); };
  const addColLeftAt = (rIndex) => { setGrid((prev) => prev.map((row, r) => [{ ...defaultCell(), active: r === rIndex }, ...row])); skipRebuildRef.current = true; setCols((c) => c + 1); };
  const addColRightAt = (rIndex) => { setGrid((prev) => prev.map((row, r) => [...row, { ...defaultCell(), active: r === rIndex }])); skipRebuildRef.current = true; setCols((c) => c + 1); };
  const hasActiveNeighbor = (r, c) => (r > 0 && grid[r - 1][c]?.active) || (r < rows - 1 && grid[r + 1][c]?.active) || (c > 0 && grid[r][c - 1]?.active) || (c < cols - 1 && grid[r][c + 1]?.active);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Boton size="sm" className="bg-gray-700 hover:bg-gray-600" onClick={onBack}>{L.arrow} {L.back}</Boton>
          <h1 className="text-xl font-bold">Minimapa</h1>
          <span className="px-2 py-0.5 text-xs bg-yellow-500 text-yellow-900 rounded-full font-bold">{L.new}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><input type="checkbox" checked={shapeEdit} onChange={(e) => setShapeEdit(e.target.checked)} /><span>{L.shapeEdit}</span></label>
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><input type="checkbox" checked={effectiveReadable} onChange={(e) => setReadableMode(e.target.checked)} /><span>{L.readable}</span></label>
          <label className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><span>{L.autoFit}</span><input type="checkbox" checked={autoFit} onChange={(e) => setAutoFit(e.target.checked)} /></label>
          {!autoFit && (<div className="hidden md:flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><span>Zoom</span><input type="range" min={35} max={200} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} /><span className="w-10 text-right">{Math.round(zoom * 100)}%</span></div>)}
          <Boton size="sm" color={device === 'pc' ? 'blue' : 'gray'} onClick={() => setDevice('pc')}>{L.pc}</Boton>
          <Boton size="sm" color={device === 'mobile' ? 'blue' : 'gray'} onClick={() => { setDevice('mobile'); setAutoFit(true); }}>{L.mobile}</Boton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 space-y-3 lg:col-span-1">
          <h2 className="font-semibold">{L.quadrant}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1"><span className="text-gray-300">{L.rows}</span><input type="number" min={1} max={200} value={rows} onChange={(e) => setRows(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="bg-gray-700 border border-gray-600 rounded px-2 py-1" /></label>
            <label className="flex flex-col gap-1"><span className="text-gray-300">{L.cols}</span><input type="number" min={1} max={200} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="bg-gray-700 border border-gray-600 rounded px-2 py-1" /></label>
            <label className="flex flex-col gap-1 col-span-2"><span className="text-gray-300">{L.cellSize}: {cellSize}px</span><input type="range" min={24} max={96} step={4} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} /></label>
          </div>
          <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!selectedCell} readOnly /><span>{L.selectedCell}</span></label>{selectedCell && (<Boton size="sm" color="red" onClick={() => setActive(selectedCell.r, selectedCell.c, false)}>{L.delCell}</Boton>)}</div>

          {selectedCell && (() => { const selected = grid[selectedCell.r][selectedCell.c]; return (
            <div className="mt-2 border-t border-gray-700 pt-3 space-y-3">
              <h3 className="font-semibold">Celda ({selectedCell.r + 1}{'\u00D7'}{selectedCell.c + 1})</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2"><span>{L.color}</span><input type="color" value={selected.fill} onChange={(e) => updateCell(selectedCell.r, selectedCell.c, { fill: e.target.value })} /></label>
                <label className="flex items-center gap-2"><span>{L.border}</span><input type="color" value={selected.borderColor} onChange={(e) => updateCell(selectedCell.r, selectedCell.c, { borderColor: e.target.value })} /></label>
                <label className="flex items-center gap-2"><span>{L.width}</span><input type="number" min={0} max={6} value={selected.borderWidth} onChange={(e) => updateCell(selectedCell.r, selectedCell.c, { borderWidth: Number(e.target.value) || 0 })} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-16" /></label>
                <label className="flex items-center gap-2"><span>{L.style}</span><select value={selected.borderStyle} onChange={(e) => updateCell(selectedCell.r, selectedCell.c, { borderStyle: e.target.value })} className="bg-gray-700 border border-gray-600 rounded px-2 py-1"><option value="solid">{L.solid}</option><option value="dashed">{L.dashed}</option><option value="dotted">{L.dotted}</option><option value="none">{L.none}</option></select></label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="font-medium">{L.icon}</h4>{selected.icon && (<button className="text-sm text-red-300 hover:text-red-200 underline" onClick={() => clearIcon(selectedCell.r, selectedCell.c)}>Quitar</button>)}</div>
                <div className="flex flex-wrap gap-2 mb-2">{[{ id: 'estados', label: 'Estados' }, { id: 'personalizados', label: 'Personalizados' }, { id: 'emojis', label: 'Emojis' }, { id: 'lucide', label: 'Lucide' }].map((b) => (<button key={b.id} onClick={() => setIconSource(b.id)} className={`px-2 py-1 rounded border text-xs ${iconSource === b.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>{b.label}</button>))}</div>
                {iconSource === 'emojis' && emojiGroups && (
                  <div className="max-h-52 overflow-auto space-y-2 p-1 bg-gray-900 rounded">
                    <input type="text" value={emojiSearch} onChange={(e) => setEmojiSearch(e.target.value)} placeholder="Buscar" className="w-full mb-2 p-1 rounded bg-gray-800 text-xs text-white" />
                    {Object.entries(emojiGroups).map(([group, chars]) => {
                      const filteredChars = chars.filter((ch) => ch.includes(emojiSearch));
                      if (!filteredChars.length) return null;
                      return (
                        <div key={group}>
                          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{group}</div>
                          <div className="flex flex-wrap gap-2">
                            {filteredChars.map((ch, i) => (
                              <IconThumb key={`${group}-${i}`} src={emojiDataUrl(ch)} label={ch} selected={selected.icon === emojiDataUrl(ch)} onClick={() => updateCell(selectedCell.r, selectedCell.c, { icon: emojiDataUrl(ch) })} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {iconSource === 'lucide' && lucideNames && (
                  <div className="max-h-52 overflow-auto space-y-2 p-1 bg-gray-900 rounded">
                    <input type="text" value={lucideSearch} onChange={(e) => setLucideSearch(e.target.value)} placeholder="Buscar" className="w-full mb-2 p-1 rounded bg-gray-800 text-xs text-white" />
                    {Object.entries(lucideNames.filter((n) => n.includes(lucideSearch.toLowerCase())).reduce((acc, name) => { const k = name[0].toUpperCase(); (acc[k] ||= []).push(name); return acc; }, {})).map(([letter, names]) => (
                      <div key={letter}>
                        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{letter}</div>
                        <div className="flex flex-wrap gap-2">
                          {names.map((n) => {
                            const url = `https://unpkg.com/lucide-static@latest/icons/${n}.svg`;
                            return <IconThumb key={n} src={url} label={n} selected={selected.icon === url} onClick={() => updateCell(selectedCell.r, selectedCell.c, { icon: url })} />;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(iconSource === 'estados' || iconSource === 'personalizados') && (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-1 bg-gray-900 rounded">{(allIcons[iconSource] || []).map((ico, i) => (<IconThumb key={`${iconSource}-${i}`} src={ico.url} label={ico.name} selected={selected.icon === ico.url} onClick={() => updateCell(selectedCell.r, selectedCell.c, { icon: ico.url })} />))}</div>
                )}
                {iconsLoading && <div className="text-xs text-gray-400">Cargandoâ€¦</div>}
                <label className="block text-xs text-gray-300">{L.iconAdd}</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])} className="block w-full text-sm text-gray-300 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-white hover:file:bg-gray-600" />
              </div>
            </div>
          ); })()}
        </div>

        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 lg:col-span-3 min-h-[50vh]">
          <div className="h-full w-full overflow-auto" ref={containerRef}>
            <div className={device === 'mobile' ? 'mx-auto w-full max-w-[420px]' : ''}>
              <div className="relative mx-auto" style={{ width: `${gridWidth + perimMargin * 2}px`, height: `${gridHeight + perimMargin * 2}px` }}>
                <div className="absolute top-0 left-0" style={{ transformOrigin: 'top left', transform: `scale(${autoFit ? fitScale : zoom})`, width: `${gridWidth + perimMargin * 2}px`, height: `${gridHeight + perimMargin * 2}px` }}>
                  {Array.from({ length: cols }).map((_, c) => (
                    <button key={`top-${c}`} className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition" style={{ width: adderBtn, height: adderBtn, top: (perimMargin - adderBtn) / 2, left: perimMargin + c * cellSize + (cellSize - adderBtn) / 2 }} title={L.addRowTop} onClick={() => addRowTopAt(c)}>+</button>))}
                  {Array.from({ length: cols }).map((_, c) => (
                    <button key={`bottom-${c}`} className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition" style={{ width: adderBtn, height: adderBtn, top: perimMargin + gridHeight + (perimMargin - adderBtn) / 2, left: perimMargin + c * cellSize + (cellSize - adderBtn) / 2 }} title={L.addRowBottom} onClick={() => addRowBottomAt(c)}>+</button>))}
                  {Array.from({ length: rows }).map((_, r) => (
                    <button key={`left-${r}`} className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition" style={{ width: adderBtn, height: adderBtn, left: (perimMargin - adderBtn) / 2, top: perimMargin + r * cellSize + (cellSize - adderBtn) / 2 }} title={L.addColLeft} onClick={() => addColLeftAt(r)}>+</button>))}
                  {Array.from({ length: rows }).map((_, r) => (
                    <button key={`right-${r}`} className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition" style={{ width: adderBtn, height: adderBtn, left: perimMargin + gridWidth + (perimMargin - adderBtn) / 2, top: perimMargin + r * cellSize + (cellSize - adderBtn) / 2 }} title={L.addColRight} onClick={() => addColRightAt(r)}>+</button>))}

                  <div className="absolute" style={{ left: perimMargin, top: perimMargin }}>
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gridTemplateRows: `repeat(${rows}, ${cellSize}px)` }}>
                      {grid.map((row, r) => row.map((cell, c) => {
                        const key = `${r}-${c}`; const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                        if (!cell.active) { const showAdder = hasActiveNeighbor(r, c); return (<div key={key} className="relative" style={{ width: `${cellSize}px`, height: `${cellSize}px` }}>{showAdder && (<button className="absolute inset-0 m-auto w-7 h-7 rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-xs shadow transition" onClick={() => setActive(r, c, true)} title={L.addCell}>+</button>)}</div>); }
                        return (
                          <div key={key} role="button" tabIndex={0}
                            onClick={(e) => { const keyId = `${r}-${c}`; if (lastLongPressRef.current.key === keyId && Date.now() - lastLongPressRef.current.t < 700) { e.preventDefault(); return; } handleCellClick(r, c); }}
                            onTouchStart={() => { const keyId = `${r}-${c}`; const timer = setTimeout(() => { setActive(r, c, false); setSelectedCell(null); lastLongPressRef.current = { key: keyId, t: Date.now() }; longPressTimersRef.current.delete(keyId); }, 550); longPressTimersRef.current.set(keyId, { id: timer }); }}
                            onTouchEnd={() => { const keyId = `${r}-${c}`; const st = longPressTimersRef.current.get(keyId); if (st) { clearTimeout(st.id); longPressTimersRef.current.delete(keyId); } }}
                            onTouchMove={() => { const keyId = `${r}-${c}`; const st = longPressTimersRef.current.get(keyId); if (st) { clearTimeout(st.id); longPressTimersRef.current.delete(keyId); } }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellClick(r, c)}
                            className={`group relative z-0 select-none transition-transform duration-150 ease-out ${isSelected ? 'z-10 scale-[1.06] ring-2 ring-blue-400 outline outline-2 outline-white/10' : 'hover:z-10 hover:scale-[1.06] hover:outline hover:outline-2 hover:outline-white/10'}`}
                            style={{ background: cell.fill, borderColor: cell.borderColor, borderWidth: `${(readableMode || device === 'mobile') ? Math.max(cell.borderWidth, 2) : cell.borderWidth}px`, borderStyle: cell.borderStyle, width: `${cellSize}px`, height: `${cellSize}px`, zIndex: isSelected ? 20 : undefined }}>
                            {cell.icon && (<img src={cell.icon} alt="icon" className="absolute inset-0 m-auto w-2/3 h-2/3 object-contain pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]" />)}
                            <button type="button" className={`absolute top-0 right-0 m-0.5 z-30 w-4 h-4 rounded text-rose-600 flex items-center justify-center transition-opacity duration-75 ${shapeEdit || isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} title="Eliminar celda" onClick={(e) => { e.stopPropagation(); setActive(r, c, false); }}>
                              <svg width='10' height='10' viewBox='0 0 24 24' aria-hidden='true' focusable='false'><path d='M5 5L19 19M19 5L5 19' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>
                            </button>
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden mt-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><input type="checkbox" checked={shapeEdit} onChange={(e) => setShapeEdit(e.target.checked)} /><span>{L.shapeEdit}</span></label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><input type="checkbox" checked={true} disabled /><span>{L.readable}</span></label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><span>{L.autoFit}</span><input type="checkbox" checked={autoFit} onChange={(e) => setAutoFit(e.target.checked)} /></label>
            {!autoFit && (<div className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1"><span>Zoom</span><input type="range" min={35} max={200} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

MinimapBuilder.propTypes = { onBack: PropTypes.func.isRequired };
export default MinimapBuilder;
