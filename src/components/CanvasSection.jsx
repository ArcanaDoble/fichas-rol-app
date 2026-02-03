import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiMinus, FiPlus, FiMove, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { BsDice6 } from 'react-icons/bs';
import { LayoutGrid, Maximize, Ruler, Palette, Settings, Image, Upload, Trash2, Home, Plus, Save, FolderOpen } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const PRESET_COLORS = [
    '#334155', '#94a3b8', // Slates
    '#c8aa6e', '#785a28', // Golds
    '#ef4444', '#22c55e', // Red, Green
    '#3b82f6', '#a855f7'  // Blue, Purple
];

const GRID_SIZE = 50; // Tamaño de la celda en px
const WORLD_SIZE = 8000; // Tamaño del mundo canvas en px

const CanvasSection = ({ onBack, currentUserId = 'user-dm' }) => {
    // Estado de la cámara (separado en zoom y offset como en MinimapV2)
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Estado para la Biblioteca de Escenarios
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState(null);
    const [viewMode, setViewMode] = useState('LIBRARY'); // 'LIBRARY' | 'EDIT'

    // Refs para gestión de eventos directos (performance)
    const containerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    // No longer needed: const transformRef = useRef(transform);

    // No longer needed: Sincronizar ref con estado para callbacks
    // No longer needed: useEffect(() => {
    // No longer needed:     transformRef.current = transform;
    // No longer needed: }, [transform]);

    // --- Manejo del Zoom (Rueda del Mouse - Igual que MinimapV2) ---
    // Listener no pasivo para prevenir el scroll por defecto correctamente
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

    // Handlers de Touch para Zoom (Pinch) y Pan (Igual que MinimapV2)
    const lastPinchDist = useRef(null);
    const lastTouchPos = useRef({ x: 0, y: 0 });

    const getTouchDistance = (touches) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Start Pinch
            setIsDragging(false);
            lastPinchDist.current = getTouchDistance(e.touches);
        } else if (e.touches.length === 1) {
            // Start Pan
            const touch = e.touches[0];
            setIsDragging(true);
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            // Pinch Zoom
            const newDist = getTouchDistance(e.touches);
            const delta = newDist - lastPinchDist.current;

            // Sensibilidad del pinch
            const zoomDelta = delta * 0.005;

            setZoom(prev => Math.min(Math.max(0.1, prev + zoomDelta), 4));

            lastPinchDist.current = newDist;
        } else if (e.touches.length === 1 && isDragging) {
            // Pan
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchPos.current.x;
            const deltaY = touch.clientY - lastTouchPos.current.y;

            setOffset(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));

            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
            // No longer needed: dragStartRef.current = { x: touch.clientX, y: touch.clientY }; // Sync for consistency
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastPinchDist.current = null;
    };

    // --- Manejo del Paneo (Clic Rueda Central) ---
    const handleMouseDown = (e) => {
        // Permitir arrastre con botón central (Rueda) o si se mantiene pulsada una tecla específica
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            document.body.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        setOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
    };

    // Efecto para listeners globales de mouse up/move para evitar que se pierda el drag al salir del div
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                document.body.style.cursor = 'default';
            }
        };

        const handleGlobalMouseMove = (e) => {
            if (isDragging) {
                handleMouseMove(e);
            }
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousemove', handleGlobalMouseMove);
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isDragging]);

    // Estado de configuración del Grid
    const [gridConfig, setGridConfig] = useState({
        cellWidth: 50,
        cellHeight: 50,
        color: '#334155',
        opacity: 0.3,
        lineWidth: 1,
        lineType: 'solid', // 'solid', 'dashed', 'dotted'
        isInfinite: true,
        columns: 20,
        rows: 15,
        backgroundImage: null,
        imageWidth: null,
        imageHeight: null,
    });

    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const cols = Math.ceil(img.width / gridConfig.cellWidth);
                const rows = Math.ceil(img.height / gridConfig.cellHeight);

                setGridConfig(prev => ({
                    ...prev,
                    backgroundImage: event.target.result,
                    imageWidth: img.width,
                    imageHeight: img.height,
                    isInfinite: false,
                    columns: cols,
                    rows: rows
                }));
            };
        };
        reader.readAsDataURL(file);
    };

    const clearBackgroundImage = () => {
        setGridConfig(prev => ({ ...prev, backgroundImage: null, imageWidth: null, imageHeight: null }));
    };

    // --- LOGICA DE BIBLIOTECA (Firebase) ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'canvas_scenarios'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setScenarios(loaded.sort((a, b) => b.lastModified - a.lastModified));
        });
        return () => unsub();
    }, []);

    const createNewScenario = async () => {
        const newScenario = {
            name: 'Nuevo Encuentro',
            lastModified: Date.now(),
            ownerId: currentUserId,
            preview: null, // Future: capture screenshot
            config: { ...gridConfig }, // Default config
            camera: { zoom: 1, offset: { x: 0, y: 0 } }
        };

        try {
            const docRef = await addDoc(collection(db, 'canvas_scenarios'), newScenario);
            loadScenario({ id: docRef.id, ...newScenario });
        } catch (error) {
            console.error("Error creating scenario:", error);
        }
    };

    const loadScenario = (scenario) => {
        setActiveScenario(scenario);
        if (scenario.config) setGridConfig(scenario.config);
        if (scenario.camera) {
            setZoom(scenario.camera.zoom);
            setOffset(scenario.camera.offset);
        }
        setViewMode('EDIT');
    };

    const saveCurrentScenario = async () => {
        if (!activeScenario) return;

        try {
            await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                config: gridConfig,
                camera: { zoom, offset },
                lastModified: Date.now()
            });
            // Show toast or feedback?
            console.log("Scenario Saved");
        } catch (error) {
            console.error("Error saving scenario:", error);
        }
    };

    const deleteScenario = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("¿Seguro que quieres eliminar este encuentro?")) {
            try {
                await deleteDoc(doc(db, 'canvas_scenarios', id));
                if (activeScenario?.id === id) {
                    setActiveScenario(null);
                    setViewMode('LIBRARY');
                }
            } catch (error) {
                console.error("Error deleting scenario:", error);
            }
        }
    };


    // Calcular dimensiones totales si es finito
    const finiteGridWidth = gridConfig.columns * gridConfig.cellWidth;
    const finiteGridHeight = gridConfig.rows * gridConfig.cellHeight;

    // Estado para mostrar/ocultar panel de configuración
    const [showSettings, setShowSettings] = useState(false);

    // Helpers para inputs con lógica de sincronización si hay imagen
    const handleConfigChange = (key, value) => {
        setGridConfig(prev => {
            const newConfig = { ...prev, [key]: value };

            // Si hay imagen de fondo, sincronizar dimensiones para mantener el tamaño del mapa
            if (prev.backgroundImage && prev.imageWidth && prev.imageHeight) {
                if (key === 'columns') {
                    // Si cambio columnas, ajusto ancho de celda para que quepan en la imagen
                    newConfig.cellWidth = prev.imageWidth / value;
                } else if (key === 'rows') {
                    // Si cambio filas, ajusto alto de celda
                    newConfig.cellHeight = prev.imageHeight / value;
                } else if (key === 'cellWidth') {
                    // Si cambio ancho celda, ajusto número de columnas
                    newConfig.columns = prev.imageWidth / value;
                } else if (key === 'cellHeight') {
                    // Si cambio alto celda, ajusto número de filas
                    newConfig.rows = prev.imageHeight / value;
                }
            }

            return newConfig;
        });
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#09090b] relative font-['Lato'] select-none">

            {/* --- UI Overlay (Header & Controles) --- */}

            {/* Gradient Background Header (Restored) */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0b1120] via-[#0b1120]/60 to-transparent z-30 pointer-events-none"></div>

            {/* 1. Botón Salir (Flotante Arriba Izquierda) */}
            <button
                onClick={onBack}
                className="absolute top-6 left-6 z-50 w-12 h-12 rounded-full bg-[#1a1b26] border border-[#c8aa6e]/40 text-[#c8aa6e] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 hover:border-[#c8aa6e] hover:text-[#f0e6d2] hover:shadow-[0_0_20px_rgba(200,170,110,0.3)] transition-all duration-300 group pointer-events-auto"
                title="Salir"
            >
                <FiArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform font-bold" />
            </button>

            {/* 2. Título (Flotante Arriba Centro - Minimalista) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center opacity-80 width-full">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.3em] text-[#c8aa6e] whitespace-nowrap">
                    <span className="h-px w-4 md:w-8 bg-gradient-to-r from-transparent to-[#c8aa6e]"></span>
                    <span>Canvas Beta</span>
                    <span className="h-px w-4 md:w-8 bg-gradient-to-l from-transparent to-[#c8aa6e]"></span>
                </div>
            </div>

            {/* --- Botón Flotante Dados (Toggle Sidebar) --- */}
            <button
                onClick={() => setShowSettings(true)}
                className="absolute top-6 right-6 z-40 w-12 h-12 rounded-full bg-[#1a1b26] border border-[#c8aa6e]/40 text-[#c8aa6e] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 hover:border-[#c8aa6e] hover:text-[#f0e6d2] hover:shadow-[0_0_20px_rgba(200,170,110,0.3)] transition-all duration-300 group pointer-events-auto"
            >
                <BsDice6 size={24} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>

            {/* --- Sidebar de Configuración --- */}
            {/* Overlay para cerrar al hacer click fuera */}
            {showSettings && (
                <div
                    className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setShowSettings(false)}
                />
            )}

            {/* Panel Sidebar */}
            <div className={`
                absolute top-0 right-0 h-full w-80 z-50 
                bg-[#0b1120] border-l border-[#c8aa6e]/30 shadow-2xl 
                transform transition-transform duration-300 ease-out 
                flex flex-col
                ${showSettings ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-[#c8aa6e]/20 bg-[#161f32] flex items-center justify-between shadow-xl z-10">
                    <div className="flex items-center gap-3">
                        {viewMode === 'EDIT' && (
                            <button
                                onClick={() => setViewMode('LIBRARY')}
                                className="text-slate-400 hover:text-[#c8aa6e] transition-all hover:scale-110"
                                title="Volver a la Biblioteca"
                            >
                                <Home size={20} />
                            </button>
                        )}
                        <h2 className="text-[#f0e6d2] font-fantasy text-lg tracking-widest flex items-center gap-3 uppercase">
                            <Settings className="w-5 h-5 text-[#c8aa6e]" />
                            {viewMode === 'LIBRARY' ? 'Configuración' : (activeScenario?.name || 'Configuración')}
                        </h2>
                    </div>
                    <button
                        onClick={() => setShowSettings(false)}
                        className="text-slate-400 hover:text-[#c8aa6e] transition-colors p-1"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Sidebar Content Wrapper */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">

                    {/* 1. Modo de Mapa */}
                    <div className="space-y-3">
                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                            <LayoutGrid className="w-3 h-3" />
                            Modo de Mapa
                        </h4>
                        <div className="bg-[#111827] p-1 rounded border border-slate-800 flex text-[10px] font-bold font-fantasy shadow-inner">
                            <button
                                onClick={() => handleConfigChange('isInfinite', true)}
                                className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                Infinito
                            </button>
                            <button
                                onClick={() => handleConfigChange('isInfinite', false)}
                                className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${!gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                Finito
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-800/50"></div>

                    {/* 2. Fondo de Mapa */}
                    <div className="space-y-3">
                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                            <Image className="w-3 h-3" />
                            Imagen de Fondo
                        </h4>

                        {!gridConfig.backgroundImage ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 transition-all group"
                            >
                                <Upload className="w-8 h-8 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Mapa</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative w-full h-32 bg-[#0b1120] rounded-lg overflow-hidden border border-slate-700/50 group shadow-lg">
                                    <img src={gridConfig.backgroundImage} alt="Background Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                                        <span className="text-[10px] font-bold text-[#f0e6d2] uppercase tracking-[0.2em]">Vista Previa</span>
                                    </div>
                                </div>
                                <button
                                    onClick={clearBackgroundImage}
                                    className="w-full py-2.5 bg-red-900/10 border border-red-900/30 text-red-500 rounded text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-900/20 transition-all font-sans"
                                >
                                    <Trash2 className="w-3 h-3" /> Eliminar Fondo
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-px bg-slate-800/50"></div>

                    {/* 3. Dimensiones (Solo Finito) */}
                    {!gridConfig.isInfinite && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                <Maximize className="w-3 h-3" />
                                Dimensiones (Celdas)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Columnas</span>
                                    <div className="flex items-center justify-between">
                                        <input
                                            type="number"
                                            value={gridConfig.columns}
                                            onChange={(e) => handleConfigChange('columns', Number(e.target.value))}
                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            min="1" max="100"
                                        />
                                        <div className="flex flex-col gap-0.5 ml-2">
                                            <button onClick={() => handleConfigChange('columns', Math.min(100, gridConfig.columns + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                            <button onClick={() => handleConfigChange('columns', Math.max(1, gridConfig.columns - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Filas</span>
                                    <div className="flex items-center justify-between">
                                        <input
                                            type="number"
                                            value={gridConfig.rows}
                                            onChange={(e) => handleConfigChange('rows', Number(e.target.value))}
                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            min="1" max="100"
                                        />
                                        <div className="flex flex-col gap-0.5 ml-2">
                                            <button onClick={() => handleConfigChange('rows', Math.min(100, gridConfig.rows + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                            <button onClick={() => handleConfigChange('rows', Math.max(1, gridConfig.rows - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[9px] text-slate-600 text-right font-mono flex items-center justify-end gap-2 uppercase">
                                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                TOTAL: {finiteGridWidth}x{finiteGridHeight}PX
                            </div>

                            <div className="w-full h-px bg-slate-800/50"></div>
                        </div>
                    )}

                    {/* 4. Tamaño de Celda */}
                    <div className="space-y-4">
                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Escala de Rejilla
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Ancho (PX)</span>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        value={gridConfig.cellWidth}
                                        onChange={(e) => handleConfigChange('cellWidth', Number(e.target.value))}
                                        className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="10" max="500"
                                    />
                                    <div className="flex flex-col gap-0.5 ml-2">
                                        <button onClick={() => handleConfigChange('cellWidth', Math.min(500, gridConfig.cellWidth + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                        <button onClick={() => handleConfigChange('cellWidth', Math.max(10, gridConfig.cellWidth - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Alto (PX)</span>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        value={gridConfig.cellHeight}
                                        onChange={(e) => handleConfigChange('cellHeight', Number(e.target.value))}
                                        className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="10" max="500"
                                    />
                                    <div className="flex flex-col gap-0.5 ml-2">
                                        <button onClick={() => handleConfigChange('cellHeight', Math.min(500, gridConfig.cellHeight + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                        <button onClick={() => handleConfigChange('cellHeight', Math.max(10, gridConfig.cellHeight - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-800/50"></div>

                    {/* 5. Estilo Visual */}
                    <div className="space-y-6">
                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                            <Palette className="w-3 h-3" />
                            Apariencia Visual
                        </h4>

                        <div className="space-y-6">
                            {/* Color y Grosor */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-[#111827]/50 p-4 rounded border border-slate-800 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Color de Línea</span>
                                        <span className="text-[10px] font-mono text-[#c8aa6e] uppercase tracking-widest">{gridConfig.color}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {/* Custom Picker */}
                                        <div className="h-10 w-10 relative rounded overflow-hidden border border-slate-700/50 shrink-0 cursor-pointer hover:border-[#c8aa6e]/50 transition-all shadow-inner">
                                            <input
                                                type="color"
                                                value={gridConfig.color}
                                                onChange={(e) => handleConfigChange('color', e.target.value)}
                                                className="absolute -top-2 -left-2 w-14 h-14 border-none cursor-pointer p-0 opacity-0"
                                            />
                                            <div className="w-full h-full" style={{ backgroundColor: gridConfig.color }}></div>
                                        </div>
                                        {/* Presets */}
                                        <div className="flex-1 grid grid-cols-4 gap-2">
                                            {PRESET_COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleConfigChange('color', c)}
                                                    className={`h-full w-full rounded-sm transition-all ${gridConfig.color === c ? 'ring-2 ring-offset-2 ring-offset-[#0b1120] ring-[#c8aa6e] scale-105' : 'hover:opacity-80 hover:scale-105'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0b1120] p-4 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Grosor (PX)</span>
                                        <span className="text-[10px] font-mono text-[#c8aa6e]">{gridConfig.lineWidth}PX</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5" max="10" step="0.5"
                                        value={gridConfig.lineWidth}
                                        onChange={(e) => handleConfigChange('lineWidth', Number(e.target.value))}
                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                    />
                                </div>
                            </div>

                            {/* Opacidad */}
                            <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                    <span>Opacidad de Rejilla</span>
                                    <span className="font-mono text-[#c8aa6e]">{Math.round(gridConfig.opacity * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={gridConfig.opacity}
                                    onChange={(e) => handleConfigChange('opacity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                />
                            </div>

                            {/* Tipo de Línea */}
                            <div className="space-y-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] block pl-1">Estilo de Trazo</span>
                                <div className="bg-[#111827] p-1 rounded border border-slate-800 flex text-[9px] font-bold font-fantasy shadow-inner">
                                    {['solid', 'dashed', 'dotted'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => handleConfigChange('lineType', type)}
                                            className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${gridConfig.lineType === type ? 'bg-[#c8aa6e] text-[#0b1120] shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                        >
                                            {type === 'solid' ? 'Sólido' : type === 'dashed' ? 'Guiones' : 'Puntos'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Sidebar Footer */}
                <div className="p-6 bg-[#09090b] border-t border-[#c8aa6e]/20 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
                    <button
                        onClick={() => { }}
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

            {/* --- Controles de Zoom Flotantes --- */}
            <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2 pointer-events-auto">
                <div className="bg-[#1a1b26] border border-slate-700 rounded-lg p-1 shadow-2xl flex flex-col items-center">
                    <button
                        onClick={() => setZoom(prev => Math.min(prev + 0.1, 5))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom In"
                    >
                        <FiPlus size={20} />
                    </button>
                    <div className="w-4 h-px bg-slate-700 my-1"></div>
                    <button
                        onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom Out"
                    >
                        <FiMinus size={20} />
                    </button>
                </div>
                <div className="bg-[#1a1b26]/90 border border-[#c8aa6e]/20 rounded px-3 py-1 text-[10px] text-[#c8aa6e] text-center font-mono">
                    {Math.round(zoom * 100)}%
                </div>
            </div>

            {/* --- Instrucciones Rápidas --- */}
            <div className="absolute bottom-8 left-8 z-50 pointer-events-none opacity-50">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <FiMove />
                    <span>Click Central + Arrastrar para Mover</span>
                </div>
            </div>

            {/* --- VIEWPORT (Área visible) --- */}
            <div
                ref={containerRef}
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* --- WORLD (Contenedor Transformado) --- */}
                <div
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        width: `${WORLD_SIZE}px`,
                        height: `${WORLD_SIZE}px`,
                        transformOrigin: 'center center',
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        marginLeft: `${-WORLD_SIZE / 2}px`,
                        marginTop: `${-WORLD_SIZE / 2}px`
                    }}
                >

                    {/* --- GRID LAYER (SVG) --- */}
                    {/* Contenedor del SVG: Si es finito, lo centramos en el mundo */}
                    <div className={`absolute ${gridConfig.isInfinite ? 'inset-0' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
                        style={!gridConfig.isInfinite ? { width: finiteGridWidth, height: finiteGridHeight } : {}}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            xmlns="http://www.w3.org/2000/svg"
                            className="overflow-visible pointer-events-none transition-all duration-300 relative"
                        >
                            {/* IMAGEN DE FONDO (Solo si es finito y existe) */}
                            {!gridConfig.isInfinite && gridConfig.backgroundImage && (
                                <foreignObject width="100%" height="100%" x="0" y="0">
                                    <img
                                        src={gridConfig.backgroundImage}
                                        alt="Map Background"
                                        className="w-full h-full object-cover"
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                    />
                                </foreignObject>
                            )}

                            <defs>
                                {/* Patrón de Rejilla Pequeña (La celda base) */}
                                <pattern
                                    id="grid-pattern"
                                    width={gridConfig.cellWidth}
                                    height={gridConfig.cellHeight}
                                    patternUnits="userSpaceOnUse"
                                >
                                    {/* Líneas de la rejilla */}
                                    <path
                                        d={`M ${gridConfig.cellWidth} 0 L 0 0 0 ${gridConfig.cellHeight}`}
                                        fill="none"
                                        stroke={gridConfig.color}
                                        strokeWidth={gridConfig.lineWidth}
                                        strokeOpacity={gridConfig.opacity}
                                        strokeDasharray={
                                            gridConfig.lineType === 'dashed' ? '5,5' :
                                                gridConfig.lineType === 'dotted' ? '1,3' :
                                                    'none'
                                        }
                                    />
                                </pattern>
                            </defs>

                            {/* Rectángulo que rellena con el patrón */}
                            <rect width="100%" height="100%" fill="url(#grid-pattern)" />

                            {/* Borde del Grid (Visible especialmente si es Finito) */}
                            <rect
                                width="100%"
                                height="100%"
                                fill="none"
                                stroke="#c8aa6e"
                                strokeWidth="2"
                                strokeOpacity={gridConfig.isInfinite ? "0.1" : "0.5"}
                            />
                        </svg>
                    </div>

                    {/* --- CONTENIDO DEL CANVAS (Tokens, Dibujos, etc.) --- */}
                    {/* (Aquí irán los tokens en el futuro) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-[#c8aa6e]/10 font-['Cinzel'] text-9xl font-bold uppercase tracking-widest select-none">
                            Arcana
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

CanvasSection.propTypes = {
    onBack: PropTypes.func.isRequired,
};

export default CanvasSection;
