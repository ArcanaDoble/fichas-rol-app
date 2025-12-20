import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Plus, MousePointer2, ZoomIn, ZoomOut, Maximize, Trash2, Palette, Shield, Sword, Heart, Skull, Zap, Droplets, Ghost, Sparkles, Upload, Box, Image as ImageIcon, Check, Settings, X, Search, Coins, Activity, Flame, Users, Lock, Unlock, Share2, Copy, Save, LayoutGrid, Brush, Move, Snowflake, BrickWall } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getOrUploadFile } from '../utils/storage';
import { ESTADOS } from './EstadoSelector';
import * as LucideIcons from 'lucide-react';

/* --- CONSTANTS --- */

const CURATED_RPG_ICONS = [
    'Sword', 'Shield', 'Axe', 'Hammer', 'Star', 'Skull', 'Ghost', 'Flame', 'Zap',
    'Heart', 'Droplets', 'Wind', 'Cloud', 'Moon', 'Sun', 'Mountain', 'Trees',
    'Map', 'Compass', 'Scroll', 'Book', 'Key', 'Lock', 'Unlock',
    'Coins', 'Crown', 'Trophy', 'Flag', 'Anchor', 'Ship', 'Tent',
    'Castle', 'DoorOpen', 'Footprints', 'Target', 'Eye',
    'Ear', 'Hand', 'Backpack', 'Gem'
];

const COLORS = [
    'transparent', '#0b1120', '#1e293b', '#334155',
    '#991b1b', '#166534', '#1e40af', '#854d0e',
    '#4c1d1d', '#1a2e05', '#2a0a0a', '#083344'
];

const BORDER_COLORS = ['#374151', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#c8aa6e'];

const STATUS_ICONS = ESTADOS;

const CELL_SIZE = 64;
const GRID_GAP = 12;

// Mocked Data
const MOCK_USERS = [
    { id: 'user-dm', name: 'Dungeon Master', role: 'DM', avatar: 'https://ui-avatars.com/api/?name=DM&background=c8aa6e&color=000' },
    { id: 'user-1', name: 'Player One', role: 'PLAYER', avatar: 'https://ui-avatars.com/api/?name=P1&background=random' },
    { id: 'user-2', name: 'Player Two', role: 'PLAYER', avatar: 'https://ui-avatars.com/api/?name=P2&background=random' }
];

const DynamicIcon = ({ name, className }) => {
    const Icon = LucideIcons[name];
    return Icon ? <Icon className={className} /> : null;
};

const getEffectClasses = (effect) => {
    switch (effect) {
        case 'BURN': return 'effect-fire';
        case 'FROZEN': return 'effect-ice';
        case 'GLOW': return 'effect-arcane';
        case 'SHAKE': return 'effect-shake';
        case 'PULSE': return 'effect-toxic';
        default: return '';
    }
};

const EFFECT_META = [
    { id: 'NONE', label: 'Limpio', icon: <X className="w-3 h-3" /> },
    { id: 'BURN', label: 'Fuego Infernal', icon: <Flame className="w-3 h-3" /> },
    { id: 'FROZEN', label: 'Glaciar', icon: <Snowflake className="w-3 h-3" /> },
    { id: 'GLOW', label: 'Arcano', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'PULSE', label: 'Tóxico', icon: <Droplets className="w-3 h-3" /> },
    { id: 'SHAKE', label: 'Temblor', icon: <Activity className="w-3 h-3" /> }
];

const ScenarioThumbnail = ({ scenario }) => {
    const gridWidth = scenario.cols * CELL_SIZE + (scenario.cols + 1) * GRID_GAP;
    const gridHeight = scenario.rows * CELL_SIZE + (scenario.rows + 1) * GRID_GAP;
    const scale = 128 / Math.max(gridWidth, gridHeight);

    return (
        <div className="w-32 h-32 bg-[#050810] rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
            <div
                className="grid"
                style={{
                    gridTemplateColumns: `repeat(${scenario.cols}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${scenario.rows}, ${CELL_SIZE}px)`,
                    width: gridWidth,
                    height: gridHeight,
                    transform: `scale(${scale * 0.9})`,
                    transformOrigin: 'center center',
                    gap: GRID_GAP,
                    padding: GRID_GAP
                }}
            >
                {Array.from({ length: scenario.rows }).map((_, r) => (
                    Array.from({ length: scenario.cols }).map((_, c) => {
                        const id = `${r}-${c}`;
                        const data = scenario.grid[id];
                        const getBorderStyle = (active) => {
                            if (!active || data?.borderStyle === 'none') return undefined;
                            return `3px ${data?.borderStyle || 'solid'} ${data?.borderColor || '#c8aa6e'}`;
                        };
                        return (
                            <div
                                key={id}
                                className={`w-16 h-16 border-[0.5px] border-slate-700/20 relative flex items-center justify-center ${data?.effect ? getEffectClasses(data.effect) : ''}`}
                                style={{
                                    backgroundColor: data?.color || 'transparent',
                                    borderTop: getBorderStyle(!!data?.borders?.top),
                                    borderRight: getBorderStyle(!!data?.borders?.right),
                                    borderBottom: getBorderStyle(!!data?.borders?.bottom),
                                    borderLeft: getBorderStyle(!!data?.borders?.left),
                                }}
                            >
                                {data?.isActive && (
                                    <div className="w-8 h-8 opacity-40">
                                        {data.customImg ? (
                                            <img src={data.customImg} className="w-full h-full object-contain grayscale" />
                                        ) : data.icon ? (
                                            <div className="w-full h-full text-white/50 flex items-center justify-center">
                                                {/* Simple preview for thumbnail */}
                                                <div className="w-4 h-4 bg-white/20 rounded-full"></div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
};

const SaveToast = ({ show, exiting }) => {
    if (!show) return null;
    return (
        <div className={`fixed top-12 left-1/2 z-[100] origin-top -translate-x-1/2 ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}>
            <div className="relative bg-[#0b1120] border border-[#c8aa6e] px-8 py-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-w-[380px] flex items-center gap-5 rounded-lg">

                {/* Icon */}
                <div className="w-10 h-10 rounded-full border border-[#c8aa6e] flex items-center justify-center bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.2)] shrink-0">
                    <Check className="w-5 h-5 text-[#c8aa6e]" />
                </div>

                {/* Text */}
                <div className="flex flex-col">
                    <h3 className="text-[#f0e6d2] font-fantasy text-xl leading-none tracking-widest text-left mb-1">
                        PROGRESO<br />GUARDADO
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="h-[1px] w-6 bg-[#c8aa6e]/50"></div>
                        <span className="text-[#c8aa6e] text-[9px] font-bold uppercase tracking-[0.2em]">Cuadrante Sincronizado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MinimapView = ({ onBack, currentUserId = 'user-dm', userRole = 'DM' }) => {
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState(null);
    const [savedStyles, setSavedStyles] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastExiting, setToastExiting] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null); // ID of scenario to delete

    // Grid State (Controlled by activeScenario)
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [activeMode, setActiveMode] = useState('EDIT');
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [activeTab, setActiveTab] = useState('STATUS'); // Represents the Sidebar Main Tab
    const [itemSubTab, setItemSubTab] = useState('STATUS'); // Represents Inner Asset Tab (Status, Lucide, etc.)
    const [searchTerm, setSearchTerm] = useState('');

    // Data State (Asset fetching)
    const [resources, setResources] = useState([]);
    const [customIcons, setCustomIcons] = useState([]);
    const [players, setPlayers] = useState([]); // Real players from DB
    const [uploading, setUploading] = useState(false);

    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- DATA FETCHING ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'customItems'), (snap) => {
            setResources(snap.docs.map(d => d.data()));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'custom_icons'), (snap) => {
            setCustomIcons(snap.docs.map(d => d.data()));
        });
        return () => unsub();
    }, []);

    // NEW: Persistencia de Escenarios
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'minimap_scenarios'), (snap) => {
            const loaded = snap.docs.map(d => d.data());
            setScenarios(loaded.sort((a, b) => b.lastModified - a.lastModified));
        });
        return () => unsub();
    }, []);

    // NEW: Persistencia de Estilos
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'minimap_styles'), (snap) => {
            setSavedStyles(snap.docs.map(d => d.data()));
        });
        return () => unsub();
    }, []);

    // NEW: Fetch Players for Permissions
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'players'), (snap) => {
            const loaded = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                role: 'JUGADOR', // Default role for fetched players
                avatar: `https://ui-avatars.com/api/?name=${d.data().name || d.id}&background=random`
            }));
            setPlayers(loaded);
        });
        return () => unsub();
    }, []);

    const createNewScenario = async () => {
        const newScenario = {
            id: `scenario-${Date.now()}`,
            name: 'Nuevo Cuadrante',
            ownerId: currentUserId,
            sharedWith: [],
            rows: 10,
            cols: 10,
            grid: {},
            lastModified: Date.now()
        };
        await setDoc(doc(db, 'minimap_scenarios', newScenario.id), newScenario);
        setActiveScenario(newScenario);
        setSelectedCells(new Set());
        setOffset({ x: 0, y: 0 });
        setZoom(1);
    };

    const saveCurrentScenario = async () => {
        if (!activeScenario) return;
        const updated = { ...activeScenario, lastModified: Date.now() };
        const sanitized = JSON.parse(JSON.stringify(updated));
        await setDoc(doc(db, 'minimap_scenarios', activeScenario.id), sanitized);

        setShowToast(true);
        setToastExiting(false);
        setTimeout(() => setToastExiting(true), 3000); // Trigger exit animation
        setTimeout(() => setShowToast(false), 3300); // Unmount after animation
    };

    const updateActiveScenario = (updates) => {
        if (!activeScenario) return;
        setActiveScenario({ ...activeScenario, ...updates });
    };

    const toggleShareWithUser = (userId) => {
        if (!activeScenario) return;
        const shared = activeScenario.sharedWith?.includes(userId);
        const newList = shared
            ? activeScenario.sharedWith.filter(id => id !== userId)
            : [...(activeScenario.sharedWith || []), userId];
        updateActiveScenario({ sharedWith: newList });
    };

    const deleteScenario = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'minimap_scenarios', itemToDelete.id));
            setItemToDelete(null);
        } catch (error) {
            console.error("Error deleting scenario:", error);
            alert("Error al eliminar el cuadrante");
        }
    };

    const expandGrid = (side) => {
        if (!activeScenario) return;
        const { rows, cols, grid } = activeScenario;
        const newGrid = {};

        let newRows = rows;
        let newCols = cols;

        if (side === 'TOP') {
            newRows++;
            Object.keys(grid).forEach((key) => {
                const [r, c] = key.split('-').map(Number);
                newGrid[`${r + 1}-${c}`] = grid[key];
            });
        } else if (side === 'BOTTOM') {
            newRows++;
            Object.keys(grid).forEach((key) => { newGrid[key] = grid[key]; });
        } else if (side === 'LEFT') {
            newCols++;
            Object.keys(grid).forEach((key) => {
                const [r, c] = key.split('-').map(Number);
                newGrid[`${r}-${c + 1}`] = grid[key];
            });
        } else if (side === 'RIGHT') {
            newCols++;
            Object.keys(grid).forEach((key) => { newGrid[key] = grid[key]; });
        }

        setActiveScenario({ ...activeScenario, rows: newRows, cols: newCols, grid: newGrid });
        setSelectedCells(new Set());
    };

    const getCellId = (r, c) => `${r}-${c}`;

    const toggleCellSelection = (id, multi) => {
        if (activeMode === 'PAN') return;
        setSelectedCells(prev => {
            const next = new Set(multi ? prev : []);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const updateSelectedCells = (updates) => {
        if (!activeScenario) return;
        const newGrid = { ...activeScenario.grid };
        selectedCells.forEach(id => {
            const existing = newGrid[id] || {
                id,
                isActive: true,
                color: 'transparent',
                borders: { top: false, right: false, bottom: false, left: false },
                borderColor: '#c8aa6e',
                borderStyle: 'solid',
                effect: 'NONE'
            };
            newGrid[id] = { ...existing, ...updates };
        });
        updateActiveScenario({ grid: newGrid });
    };

    const applyStyle = (style) => {
        updateSelectedCells(style.config);
    };

    const saveCurrentAsStyle = async () => {
        if (selectedCells.size === 0 || !activeScenario) return;
        const firstId = Array.from(selectedCells)[0];
        const data = activeScenario.grid[firstId];
        if (!data) return;

        const newStyle = {
            id: `style-${Date.now()}`,
            name: `Estilo ${savedStyles.length + 1}`,
            config: { ...data }
        };
        // Sanitize to remove undefined values (Firestore overrides)
        const sanitized = JSON.parse(JSON.stringify(newStyle));
        await setDoc(doc(db, 'minimap_styles', newStyle.id), sanitized);
        setActiveTab('STYLES');
    };

    // Navigation handlers
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(0.1, prev + delta), 4));
    };

    // Non-passive listener to properly prevent default scroll behavior
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 4));
        };
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    // --- CAMERA NAVIGATION LOGIC (DRAG) ---
    const handleStartDrag = (clientX, clientY, isMiddleButton = false) => {
        // Iniciar arrastre si está en modo PAN, o si se usa Alt o botón central
        if (activeMode === 'PAN' || isMiddleButton) {
            setIsDragging(true);
            lastMousePos.current = { x: clientX, y: clientY };
        }
    };

    const handleMoveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = clientX - lastMousePos.current.x;
        const dy = clientY - lastMousePos.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: clientX, y: clientY };
    };

    const handleEndDrag = () => {
        setIsDragging(false);
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { url } = await getOrUploadFile(file, 'custom_icons');
            await addDoc(collection(db, 'custom_icons'), {
                url,
                createdAt: serverTimestamp(),
                name: file.name
            });
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };


    const visibleScenarios = scenarios.filter(s =>
        userRole === 'DM' || s.ownerId === currentUserId || s.sharedWith.includes(currentUserId)
    );

    const firstSelectedId = selectedCells.size > 0 ? Array.from(selectedCells)[0] : null;
    const firstSelected = activeScenario && firstSelectedId ? activeScenario.grid[firstSelectedId] : null;

    const currentBorders = firstSelected?.borders || { top: false, right: false, bottom: false, left: false };
    const currentBorderColor = firstSelected?.borderColor || '#c8aa6e';
    const currentColor = firstSelected?.color || 'transparent';
    const currentIcon = firstSelected?.icon;

    if (!activeScenario) {
        return (
            <div className="fixed inset-0 z-50 w-screen h-screen bg-[#09090b] flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full">
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <button onClick={onBack} className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-widest text-xs mb-4 hover:translate-x-[-4px] transition-transform">
                                <ChevronLeft className="w-4 h-4" /> Volver
                            </button>
                            <h1 className="text-4xl md:text-5xl font-fantasy text-[#f0e6d2] tracking-tighter">BIBLIOTECA DE CUADRANTES</h1>
                            <p className="text-slate-500 uppercase text-xs tracking-[0.3em] font-bold mt-2">Gestión de escenarios tácticos</p>
                        </div>
                        <button onClick={createNewScenario} className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(200,170,110,0.3)] hover:scale-105 transition-all">
                            <Plus className="w-6 h-6" /> Nuevo Cuadrante
                        </button>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {visibleScenarios.map(s => (
                            <div key={s.id} onClick={() => setActiveScenario(s)} className="group relative bg-[#0b1120] border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#161f32] transition-all overflow-hidden">
                                {(userRole === 'DM' || s.ownerId === currentUserId) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setItemToDelete(s); }}
                                        className="absolute top-4 right-4 p-2 bg-[#0b1120]/80 border border-slate-700/50 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-900/20 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg backdrop-blur-sm"
                                        title="Eliminar Cuadrante"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="flex gap-6 items-start">
                                    <ScenarioThumbnail scenario={s} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[#f0e6d2] font-fantasy text-xl mb-1 truncate">{s.name}</h3>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">{s.rows}x{s.cols} Celdas</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center"><Users className="w-3 h-3 text-slate-400" /></div>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{s.ownerId === currentUserId ? 'Tuyo' : 'Compartido'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between border-t border-slate-800/50 pt-4">
                                    <span className="text-[9px] text-slate-600 font-mono">ID: {s.id.slice(-8)}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {s.ownerId === currentUserId && <Share2 className="w-4 h-4 text-[#c8aa6e]" />}
                                        <ChevronLeft className="w-4 h-4 text-slate-500 rotate-180" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {visibleScenarios.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                                <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-fantasy tracking-widest text-lg">SIN CUADRANTES DISPONIBLES</p>
                                <p className="text-xs uppercase mt-2">Crea uno nuevo para comenzar la aventura</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* DELETE CONFIRMATION MODAL */}
                {itemToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-[#0b1120] border border-red-900/50 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)] p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>

                            <h3 className="text-xl font-fantasy text-red-500 mb-2 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> ELIMINAR CUADRANTE
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                ¿Estás seguro de que deseas eliminar <span className="text-[#f0e6d2] font-bold">"{itemToDelete.name}"</span>?
                                <br /><span className="text-xs text-red-400/70 mt-1 block">Esta acción es irreversible y se perderán todos los datos del mapa.</span>
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#f0e6d2] hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={deleteScenario}
                                    className="px-6 py-2 bg-red-900/20 border border-red-900/50 rounded text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-900/40 hover:text-red-400 hover:border-red-500/50 transition-all shadow-[0_0_20px_rgba(220,38,38,0.1)]"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col md:flex-row bg-[#09090b] overflow-hidden text-slate-200 font-sans select-none" style={{ touchAction: 'none' }}>
            <SaveToast show={showToast} exiting={toastExiting} />

            {/* CONTENEDOR PRINCIPAL CON EVENTOS DE CÁMARA */}
            <div
                ref={containerRef}
                className={`flex-1 relative overflow-hidden bg-[#0b1120] ${activeMode === 'PAN' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                onWheel={handleWheel}
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY, e.button === 1 || e.altKey)}
                onMouseMove={(e) => handleMoveDrag(e.clientX, e.clientY)}
                onMouseUp={handleEndDrag}
                onMouseLeave={handleEndDrag}
                onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEndDrag}
            >
                {/* CAPA DE TRANSFORMACIÓN (ZOOM Y OFFSET) */}
                <div
                    className="absolute transition-transform duration-75 ease-out"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        width: activeScenario.cols * CELL_SIZE + (activeScenario.cols + 1) * GRID_GAP,
                        height: activeScenario.rows * CELL_SIZE + (activeScenario.rows + 1) * GRID_GAP,
                        left: '50%', top: '50%',
                        marginLeft: -(activeScenario.cols * CELL_SIZE + (activeScenario.cols + 1) * GRID_GAP) / 2,
                        marginTop: -(activeScenario.rows * CELL_SIZE + (activeScenario.rows + 1) * GRID_GAP) / 2
                    }}
                >
                    <div className="relative">
                        {/* BOTONES DE EXPANSIÓN (Solo en modo edición) */}
                        {activeMode === 'EDIT' && (
                            <>
                                <button onClick={() => expandGrid('TOP')} className="absolute -top-14 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border border-[#c8aa6e] bg-[#0b1120]/50 flex items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:scale-110 active:scale-95 transition-all z-30 shadow-[0_0_15px_rgba(0,0,0,0.5)]" title="Fila Superior"><Plus className="w-6 h-6 stroke-[1.5px]" /></button>
                                <button onClick={() => expandGrid('BOTTOM')} className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border border-[#c8aa6e] bg-[#0b1120]/50 flex items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:scale-110 active:scale-95 transition-all z-30 shadow-[0_0_15px_rgba(0,0,0,0.5)]" title="Fila Inferior"><Plus className="w-6 h-6 stroke-[1.5px]" /></button>
                                <button onClick={() => expandGrid('LEFT')} className="absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-[#c8aa6e] bg-[#0b1120]/50 flex items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:scale-110 active:scale-95 transition-all z-30 shadow-[0_0_15px_rgba(0,0,0,0.5)]" title="Columna Izquierda"><Plus className="w-6 h-6 stroke-[1.5px]" /></button>
                                <button onClick={() => expandGrid('RIGHT')} className="absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-[#c8aa6e] bg-[#0b1120]/50 flex items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:scale-110 active:scale-95 transition-all z-30 shadow-[0_0_15px_rgba(0,0,0,0.5)]" title="Columna Derecha"><Plus className="w-6 h-6 stroke-[1.5px]" /></button>
                            </>
                        )}

                        {/* DISEÑO DE LA GRID CSS */}
                        <div
                            className="grid shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-slate-900/10 border border-slate-700/30"
                            style={{
                                gridTemplateColumns: `repeat(${activeScenario.cols}, ${CELL_SIZE}px)`,
                                gridTemplateRows: `repeat(${activeScenario.rows}, ${CELL_SIZE}px)`,
                                gap: GRID_GAP,
                                padding: GRID_GAP
                            }}
                        >
                            {Array.from({ length: activeScenario.rows }).map((_, r) => (
                                Array.from({ length: activeScenario.cols }).map((_, c) => {
                                    const id = getCellId(r, c);
                                    const data = activeScenario.grid[id];
                                    const isSelected = selectedCells.has(id);

                                    const getBorderStyle = (active) => {
                                        if (!active || data?.borderStyle === 'none') return undefined;
                                        return `3px ${data?.borderStyle || 'solid'} ${data?.borderColor || '#c8aa6e'}`;
                                    };

                                    return (
                                        <div
                                            key={id}
                                            onClick={(e) => toggleCellSelection(id, e.shiftKey || e.ctrlKey)}
                                            className={`w-16 h-16 border border-slate-700/20 relative flex items-center justify-center transition-all duration-300 ${isSelected
                                                ? 'ring-2 ring-[#c8aa6e] ring-inset z-20 bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.2)]'
                                                : 'hover:bg-white/5'
                                                } ${data?.isActive && data.effect === 'SHAKE' ? 'effect-shake' : ''} overflow-hidden`}
                                            style={{
                                                backgroundColor: data?.color || 'transparent',
                                                borderTop: getBorderStyle(!!data?.borders?.top),
                                                borderRight: getBorderStyle(!!data?.borders?.right),
                                                borderBottom: getBorderStyle(!!data?.borders?.bottom),
                                                borderLeft: getBorderStyle(!!data?.borders?.left),
                                            }}
                                        >
                                            {/* 1. CAPA DE EFECTOS (PULSO, FUEGO, HIELO) */}
                                            {data?.isActive && data.effect && data.effect !== 'NONE' && data.effect !== 'SHAKE' && (
                                                <div className={`absolute inset-0 z-10 pointer-events-none w-full h-full ${getEffectClasses(data.effect)}`}></div>
                                            )}

                                            {/* 2. CAPA DE ICONO O ASSET */}
                                            {data?.isActive && (data.icon || data.customImg) && (
                                                <div className="w-10 h-10 flex items-center justify-center relative z-20" style={{ transform: `rotate(${data.rotation || 0}deg)`, color: data.iconColor }}>
                                                    {data.customImg ? (
                                                        <img src={data.customImg} className="w-full h-full object-contain" />
                                                    ) : data.iconType === 'STATUS' ? (
                                                        (() => {
                                                            const st = STATUS_ICONS.find(i => i.id === data.icon);
                                                            return st ? <img src={st.img} className="w-full h-full object-contain" /> : null;
                                                        })()
                                                    ) : data.iconType === 'LUCIDE' ? (
                                                        <DynamicIcon name={data.icon} className="w-full h-full" />
                                                    ) : data.iconType === 'RESOURCES' ? (
                                                        (() => {
                                                            const res = resources.find(i => i.type === data.icon);
                                                            if (!res) return null;
                                                            if (res.icon?.startsWith('lucide:')) {
                                                                return <DynamicIcon name={res.icon.split(':')[1]} className="w-full h-full" />;
                                                            }
                                                            return <img src={res.icon || res.image} className="w-full h-full object-contain" />;
                                                        })()
                                                    ) : null}
                                                </div>
                                            )}


                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute top-6 left-6 flex flex-col gap-3 z-40">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveScenario(null)} className="flex items-center gap-2 px-4 py-2 bg-[#0b1120]/90 border border-[#c8aa6e]/50 rounded text-[#c8aa6e] hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-all font-bold uppercase tracking-wider text-xs shadow-xl"><ChevronLeft className="w-4 h-4" /> Biblioteca</button>
                        <div className="flex bg-[#0b1120]/90 border border-slate-700 rounded-lg p-1">
                            <input type="text" value={activeScenario.name} onChange={(e) => updateActiveScenario({ name: e.target.value })} className="bg-transparent border-none outline-none px-3 font-fantasy text-[#f0e6d2] w-48 text-sm" />
                        </div>
                    </div>
                    <div className="flex bg-[#0b1120]/90 border border-[#c8aa6e]/30 rounded-lg p-1 shadow-2xl">
                        <button onClick={() => setActiveMode('EDIT')} className={`p-2 rounded ${activeMode === 'EDIT' ? 'bg-[#c8aa6e] text-[#0b1120]' : 'text-slate-500'}`} title="Modo Edición"><MousePointer2 className="w-5 h-5" /></button>
                        <button onClick={() => setActiveMode('PAN')} className={`p-2 rounded ${activeMode === 'PAN' ? 'bg-[#c8aa6e] text-[#0b1120]' : 'text-slate-500'}`} title="Modo Cámara (Arrastrar)"><Move className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 bg-[#0b1120]/90 border border-[#c8aa6e]/30 px-4 py-2 rounded-full z-40 shadow-2xl flex items-center gap-4">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#c8aa6e] rounded-full"></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{activeScenario.rows}x{activeScenario.cols} Celdas</span></div>
                    <div className="w-[1px] h-3 bg-slate-700"></div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#c8aa6e] flex items-center gap-2"><Settings className="w-3 h-3" /><span className="text-[8px] font-bold uppercase tracking-widest">Propiedades</span></button>
                </div>
            </div>

            <div className={`fixed md:relative inset-y-0 right-0 w-full md:w-80 h-full bg-[#0b1120] border-l border-[#c8aa6e]/30 flex flex-col z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-[#c8aa6e]/20 bg-[#161f32] flex items-center justify-between">
                    <h2 className="text-[#f0e6d2] font-fantasy text-lg tracking-widest flex items-center gap-3"><LayoutGrid className="w-5 h-5 text-[#c8aa6e]" /> EDITOR</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-2"><X className="w-8 h-8" /></button>
                </div>

                <div className="flex bg-[#0b1120] border-b border-slate-800">
                    {[{ id: 'STATUS', icon: <Box className="w-4 h-4" />, label: 'Items' }, { id: 'STYLES', icon: <Brush className="w-4 h-4" />, label: 'Estilos' }, { id: 'SHARE', icon: <Users className="w-4 h-4" />, label: 'Permisos' }].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === t.id ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}>
                            {t.icon}<span className="text-[8px] font-bold uppercase">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-32">
                    {activeTab === 'STYLES' && (
                        <div className="space-y-4">
                            <button onClick={saveCurrentAsStyle} disabled={selectedCells.size === 0} className="w-full py-3 bg-[#161f32] border border-dashed border-[#c8aa6e]/50 text-[#c8aa6e] rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#c8aa6e]/10 disabled:opacity-30 flex items-center justify-center gap-2">
                                <Save className="w-3 h-3" /> Guardar Estilo Actual
                            </button>
                            {/* CONTENEDOR DE LA BIBLIOTECA DE ESTILOS */}
                            <div className="grid grid-cols-2 gap-3">
                                {savedStyles.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => applyStyle(s)}
                                        className="p-3 bg-[#0b1120] border border-slate-800 rounded hover:border-[#c8aa6e] transition-all relative group flex flex-col items-center"
                                    >
                                        {/* PREVISUALIZACIÓN DE CELDA (CUADRADA) */}
                                        <div
                                            className={`w-full aspect-square rounded mb-2 relative flex items-center justify-center overflow-hidden border border-slate-700/50 shadow-inner ${s.config.effect === 'SHAKE' ? 'effect-shake' : ''}`}
                                            style={{ backgroundColor: s.config.color || 'transparent' }}
                                        >
                                            {/* 1. Capa de Efecto Especial (si tiene) */}
                                            {s.config.effect && s.config.effect !== 'NONE' && s.config.effect !== 'SHAKE' && (
                                                <div className={`absolute inset-0 z-10 pointer-events-none opacity-60 ${getEffectClasses(s.config.effect)}`}></div>
                                            )}

                                            {/* 2. Capa de Icono o Imagen Personalizada */}
                                            {s.config.icon && (
                                                <div className="w-1/2 h-1/2 flex items-center justify-center relative z-20 opacity-90 drop-shadow-md">
                                                    {s.config.customImg ? (
                                                        <img src={s.config.customImg} className="w-full h-full object-contain" />
                                                    ) : s.config.iconType === 'STATUS' ? (
                                                        (() => {
                                                            const st = STATUS_ICONS.find(i => i.id === s.config.icon);
                                                            return st ? <img src={st.img} className="w-full h-full object-contain" /> : null;
                                                        })()
                                                    ) : s.config.iconType === 'RESOURCES' ? (
                                                        (() => {
                                                            const res = resources.find(i => i.type === s.config.icon);
                                                            if (!res) return null;
                                                            if (res.icon?.startsWith('lucide:')) {
                                                                return <DynamicIcon name={res.icon.split(':')[1]} className="w-full h-full" />;
                                                            }
                                                            return <img src={res.icon || res.image} className="w-full h-full object-contain" />;
                                                        })()
                                                    ) : (
                                                        <DynamicIcon name={s.config.icon} className="w-full h-full" />
                                                    )}
                                                </div>
                                            )}

                                            {/* 3. Indicadores de Muros/Bordes */}
                                            <div
                                                className="absolute inset-0 pointer-events-none z-30"
                                                style={{
                                                    borderTop: s.config.borders?.top ? `2px solid ${s.config.borderColor || '#c8aa6e'}` : undefined,
                                                    borderRight: s.config.borders?.right ? `2px solid ${s.config.borderColor || '#c8aa6e'}` : undefined,
                                                    borderBottom: s.config.borders?.bottom ? `2px solid ${s.config.borderColor || '#c8aa6e'}` : undefined,
                                                    borderLeft: s.config.borders?.left ? `2px solid ${s.config.borderColor || '#c8aa6e'}` : undefined,
                                                }}
                                            />
                                        </div>

                                        {/* Texto del Estilo */}
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center group-hover:text-[#c8aa6e]">
                                            {s.name}
                                        </div>

                                        {/* Botón de Borrar Estilo (se muestra en hover) */}
                                        <div
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await deleteDoc(doc(db, 'minimap_styles', s.id));
                                            }}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:scale-110 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'SHARE' && (
                        <div className="space-y-4">
                            <h3 className="text-[#c8aa6e] font-fantasy text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Lock className="w-3 h-3" /> Permisos de Acceso</h3>
                            {players.length === 0 && <p className="text-xs text-slate-500 italic">No hay otros jugadores disponibles.</p>}
                            {players.filter(u => u.id !== currentUserId).map(u => {
                                const isShared = activeScenario.sharedWith?.includes(u.id);
                                return (
                                    <div key={u.id} className="flex items-center justify-between p-3 bg-[#161f32] rounded border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full border border-slate-700" alt={u.name} />
                                            <div><div className="text-xs font-bold text-white capitalize">{u.name || u.id}</div><div className="text-[9px] text-slate-500 uppercase">{u.role}</div></div>
                                        </div>
                                        <button onClick={() => toggleShareWithUser(u.id)} className={`p-2 rounded transition-all ${isShared ? 'bg-green-900/30 text-green-500 border border-green-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500'}`}>
                                            {isShared ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'STATUS' && (selectedCells.size > 0 ? (
                        <div className="space-y-8">
                            {/* Color Picker */}
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2"><Palette className="w-3 h-3" /> Color Terreno</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => updateSelectedCells({ color: c })} className={`w-full aspect-square rounded border-2 transition-transform hover:scale-110 ${currentColor === c ? 'border-white ring-1 ring-[#c8aa6e]' : 'border-slate-800'}`} style={{ backgroundColor: c }}></button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 bg-[#0b1120] border border-slate-700 rounded p-2">
                                    <div className="w-5 h-5 rounded" style={{ backgroundColor: currentColor !== 'transparent' ? currentColor : '#334155' }}></div>
                                    <input type="text" value={currentColor} onChange={(e) => updateSelectedCells({ color: e.target.value })} className="bg-transparent border-none text-slate-200 text-[10px] font-mono outline-none w-full" placeholder="#HEX" />
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-800/50"></div>

                            {/* Borders */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2"><BrickWall className="w-3 h-3" /> Bordes / Muros</h4>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['solid', 'dashed', 'dotted', 'none']).map(style => (
                                        <button key={style} onClick={() => updateSelectedCells({ borderStyle: style })} className={`py-2 rounded border text-[9px] font-bold uppercase tracking-wider transition-all ${firstSelected?.borderStyle === style ? 'bg-[#1e293b] border-[#c8aa6e] text-[#c8aa6e]' : 'bg-[#161f32] border-slate-800 text-slate-400 hover:border-slate-600'}`}>{style}</button>
                                    ))}
                                </div>

                                <div className="w-40 h-40 bg-[#0b1120] border border-slate-700/50 rounded-2xl p-4 mx-auto grid grid-cols-3 grid-rows-3 items-center justify-items-center relative shadow-inner">
                                    <div className="col-start-2 row-start-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest pointer-events-none select-none">WALL</div>

                                    <button
                                        onClick={() => updateSelectedCells({ borders: { ...currentBorders, top: !currentBorders.top } })}
                                        className={`col-start-2 row-start-1 w-12 h-4 rounded-full transition-all duration-300 ${currentBorders.top ? 'bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.5)]' : 'bg-slate-800/80 hover:bg-slate-700'}`}
                                    ></button>

                                    <button
                                        onClick={() => updateSelectedCells({ borders: { ...currentBorders, left: !currentBorders.left } })}
                                        className={`col-start-1 row-start-2 w-4 h-12 rounded-full transition-all duration-300 ${currentBorders.left ? 'bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.5)]' : 'bg-slate-800/80 hover:bg-slate-700'}`}
                                    ></button>

                                    <button
                                        onClick={() => updateSelectedCells({ borders: { ...currentBorders, right: !currentBorders.right } })}
                                        className={`col-start-3 row-start-2 w-4 h-12 rounded-full transition-all duration-300 ${currentBorders.right ? 'bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.5)]' : 'bg-slate-800/80 hover:bg-slate-700'}`}
                                    ></button>

                                    <button
                                        onClick={() => updateSelectedCells({ borders: { ...currentBorders, bottom: !currentBorders.bottom } })}
                                        className={`col-start-2 row-start-3 w-12 h-4 rounded-full transition-all duration-300 ${currentBorders.bottom ? 'bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.5)]' : 'bg-slate-800/80 hover:bg-slate-700'}`}
                                    ></button>
                                </div>

                                <div className="space-y-2 flex flex-col items-center">
                                    <label className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Color de Borde</label>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {BORDER_COLORS.map(c => (<button key={c} onClick={() => updateSelectedCells({ borderColor: c })} className={`w-6 h-6 rounded-sm border ${currentBorderColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>))}
                                    </div>
                                    <div className="flex items-center gap-2 bg-[#0b1120] border border-slate-700 rounded p-1 w-24">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: currentBorderColor !== 'transparent' ? currentBorderColor : '#334155' }}></div>
                                        <input type="text" value={currentBorderColor} onChange={(e) => updateSelectedCells({ borderColor: e.target.value })} className="bg-transparent border-none text-slate-200 text-[9px] font-mono outline-none w-full" placeholder="#HEX" />
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-800/50"></div>

                            {/* Effects */}
                            {/* Effects */}
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" /> Efectos Especiales
                                </label>
                                <div className="grid grid-cols-2 gap-1">
                                    {EFFECT_META.map(eff => (
                                        <button
                                            key={eff.id}
                                            onClick={() => updateSelectedCells({ effect: eff.id })}
                                            className={`w-full py-2 px-2 rounded border text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${firstSelected?.effect === eff.id ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-[#161f32] border-slate-800 text-slate-400 hover:border-[#c8aa6e]/50'}`}
                                        >
                                            {eff.icon}
                                            <span className="truncate w-full text-center">{eff.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ASSETS SECTION (INTEGRATED) */}
                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Activos Visuales</label>

                                <div className="flex bg-[#0b1120] border border-slate-700 p-1 rounded-lg gap-1">
                                    {[
                                        { id: 'STATUS', icon: <Skull className="w-4 h-4" /> },
                                        { id: 'LUCIDE', icon: <ImageIcon className="w-4 h-4" /> },
                                        { id: 'RESOURCES', icon: <Box className="w-4 h-4" /> },
                                        { id: 'CUSTOM', icon: <Upload className="w-4 h-4" /> }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setItemSubTab(tab.id)}
                                            className={`flex-1 py-3 flex items-center justify-center rounded transition-all ${itemSubTab === tab.id ? 'bg-[#c8aa6e] text-[#0b1120]' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            {tab.icon}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-64 border border-slate-800 bg-black/30 rounded-lg p-3 overflow-y-auto custom-scrollbar">
                                    {itemSubTab === 'STATUS' && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {STATUS_ICONS.map(i => (
                                                <button
                                                    key={i.id}
                                                    onClick={() => updateSelectedCells({ icon: i.id, iconType: 'STATUS', customImg: undefined })}
                                                    className={`aspect-square rounded border border-slate-700 flex items-center justify-center p-2 hover:border-[#c8aa6e] transition-colors ${currentIcon === i.id ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]' : 'text-slate-400'}`}
                                                    title={i.name}
                                                >
                                                    <img src={i.img} className="w-full h-full object-contain" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {itemSubTab === 'LUCIDE' && (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Buscar icono..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm outline-none focus:border-[#c8aa6e]"
                                            />
                                            <div className="grid grid-cols-4 gap-2">
                                                {CURATED_RPG_ICONS.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase())).map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => updateSelectedCells({ icon: n, iconType: 'LUCIDE', customImg: undefined })}
                                                        className={`aspect-square rounded border border-slate-700 flex items-center justify-center p-3 hover:border-[#c8aa6e] transition-colors ${currentIcon === n ? 'bg-[#c8aa6e]/20 border-[#c8aa6e] text-[#c8aa6e]' : 'text-slate-400'}`}
                                                    >
                                                        <DynamicIcon name={n} className="w-full h-full" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {itemSubTab === 'RESOURCES' && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {resources.map(item => (
                                                <button
                                                    key={item.type}
                                                    onClick={() => updateSelectedCells({ icon: item.type, iconType: 'RESOURCES', customImg: undefined })}
                                                    className={`aspect-square rounded border border-slate-700 overflow-hidden p-2 hover:border-[#c8aa6e] transition-colors ${currentIcon === item.type ? 'border-[#c8aa6e] ring-2 ring-[#c8aa6e]/50' : 'opacity-60'}`}
                                                    title={item.name}
                                                >
                                                    {item.icon?.startsWith('lucide:') ?
                                                        <DynamicIcon name={item.icon.split(':')[1]} className="w-full h-full text-slate-300" /> :
                                                        <img src={item.icon || item.image} className="w-full h-full object-contain" />
                                                    }
                                                </button>
                                            ))}
                                            {resources.length === 0 && <p className="col-span-4 text-xs text-slate-500 text-center py-4">No hay recursos personalizados.</p>}
                                        </div>
                                    )}

                                    {itemSubTab === 'CUSTOM' && (
                                        <div className="space-y-4">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className={`w-full py-6 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-[#c8aa6e] hover:border-[#c8aa6e] transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {uploading ? <Activity className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                                <span className="text-xs font-bold uppercase">{uploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                                                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                                            </button>
                                            <div className="grid grid-cols-4 gap-2">
                                                {customIcons.map((item, i) => (
                                                    <button
                                                        key={item.url || i}
                                                        onClick={() => updateSelectedCells({ customImg: item.url, icon: undefined })}
                                                        className={`aspect-square rounded border border-slate-700 overflow-hidden p-2 hover:border-[#c8aa6e] transition-colors ${firstSelected?.customImg === item.url ? 'border-[#c8aa6e] ring-2 ring-[#c8aa6e]/50' : 'opacity-60'}`}
                                                    >
                                                        <img src={item.url} className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                                {customIcons.length === 0 && <p className="col-span-4 text-xs text-slate-500 text-center py-2">Sube tus propias imágenes.</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* END ASSETS SECTION */}

                            {/* ROTATION SLIDER */}
                            {(firstSelected?.icon || firstSelected?.customImg) && (
                                <div className="space-y-1 mt-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                            <LucideIcons.RotateCw className="w-3 h-3 text-[#c8aa6e]" /> Rotación
                                        </label>

                                        <div className="flex items-center gap-3">
                                            {/* Tint Controls (Lucide Only) - Integrated in Header */}
                                            {firstSelected?.iconType === 'LUCIDE' && (
                                                <div className="flex items-center gap-1.5 mr-2 pl-2 border-l border-slate-800">
                                                    {/* Reset */}
                                                    <button
                                                        onClick={() => updateSelectedCells({ iconColor: undefined })}
                                                        className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${!firstSelected.iconColor ? 'border-[#c8aa6e] bg-[#c8aa6e]/20' : 'border-slate-700 hover:border-slate-500'}`}
                                                        title="Color Original"
                                                    >
                                                        <X className="w-2 h-2 text-slate-400" />
                                                    </button>
                                                    {/* Presets */}
                                                    {['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateSelectedCells({ iconColor: color })}
                                                            className={`w-3 h-3 rounded-full border transition-all ${firstSelected.iconColor === color ? 'border-[#c8aa6e] scale-125 shadow-[0_0_5px_rgba(200,170,110,0.5)]' : 'border-transparent hover:scale-110'}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}

                                                    {/* Tiny Hex Input */}
                                                    <div className="relative group w-3 h-3 ml-0.5">
                                                        <div className="w-full h-full rounded-full border border-slate-600 bg-gradient-to-tr from-slate-700 to-slate-500 overflow-hidden cursor-pointer hover:border-[#c8aa6e]">
                                                            {/* Color Indicator if custom */}
                                                            {firstSelected.iconColor && !['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].includes(firstSelected.iconColor) && (
                                                                <div className="w-full h-full" style={{ backgroundColor: firstSelected.iconColor }}></div>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="color"
                                                            value={firstSelected.iconColor || '#ffffff'}
                                                            onChange={(e) => updateSelectedCells({ iconColor: e.target.value })}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            title="Color Personalizado"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <span className="text-[10px] font-mono text-[#c8aa6e]">{firstSelected?.rotation || 0}°</span>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            step="5"
                                            value={firstSelected?.rotation || 0}
                                            onChange={(e) => updateSelectedCells({ rotation: parseInt(e.target.value) })}
                                            className="dnd-slider w-full"
                                        />
                                    </div>
                                </div>
                            )}





                            <button onClick={() => updateSelectedCells({ isActive: true, color: 'transparent', borders: { top: false, right: false, bottom: false, left: false }, icon: undefined, effect: 'NONE', rotation: 0 })} className="w-full py-4 bg-red-900/20 border border-red-900/50 text-red-500 rounded font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-900/40"><Trash2 className="w-4 h-4" /> Limpiar Selección</button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-4">
                            <Box className="w-16 h-16 text-slate-700 mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Selecciona celdas para editar</p>
                            <p className="text-[10px] mt-2 text-slate-600">Cambia al modo puntero <MousePointer2 className="inline w-3 h-3" /> para elegir celdas.</p>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-[#09090b] border-t border-[#c8aa6e]/20 shrink-0">
                    <button
                        onClick={saveCurrentScenario}
                        className="group relative w-full py-5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl hover:shadow-[0_0_25px_rgba(200,170,110,0.5)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden"
                    >
                        {/* EFECTO DE BRILLO (Shine effect) */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>

                        <span className="relative z-10 drop-shadow-md">
                            Confirmar Cambios
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MinimapView;
