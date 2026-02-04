import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiMinus, FiPlus, FiMove, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { BsDice6 } from 'react-icons/bs';
import { LayoutGrid, Maximize, Ruler, Palette, Settings, Image, Upload, Trash2, Home, Plus, Save, FolderOpen, ChevronLeft, Check, X, Sparkles, Activity, RotateCw, Edit2 } from 'lucide-react';
import EstadoSelector from './EstadoSelector';
import { DEFAULT_STATUS_EFFECTS, ICON_MAP } from '../utils/statusEffects';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getOrUploadFile, releaseFile } from '../utils/storage'; // Importamos releaseFile para limpiar
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_COLORS = [
    '#334155', '#94a3b8', // Slates
    '#c8aa6e', '#785a28', // Golds
    '#ef4444', '#22c55e', // Red, Green
    '#3b82f6', '#a855f7'  // Blue, Purple
];

const GRID_SIZE = 50; // Tamaño de la celda en px
const WORLD_SIZE = 12000; // Tamaño del mundo canvas en px (Aumentado para mapas 4k)

const CanvasThumbnail = ({ scenario }) => {
    const config = scenario.config || {};
    return (
        <div className="w-32 h-32 bg-[#050810] rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
            {config.backgroundImage ? (
                <img src={config.backgroundImage} className="w-full h-full object-cover opacity-60" alt="Preview" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <LayoutGrid size={40} className="text-[#c8aa6e]" />
                    <span className="text-[8px] font-bold uppercase mt-1 text-[#c8aa6e]">
                        {config.isInfinite ? 'INFINITO' : `${config.columns}x${config.rows}`}
                    </span>
                </div>
            )}
        </div>
    );
};

const SaveToast = ({ show, exiting, type = 'success' }) => {
    console.log("🍞 Rendering SaveToast - show:", show, "exiting:", exiting, "type:", type);
    if (!show) return null;

    // Configuración según el tipo (éxito o error)
    const isSuccess = type === 'success';
    const mainText = isSuccess ? "PROGRESO\nGUARDADO" : "ERROR AL\nGUARDAR";
    const subText = isSuccess ? "Encuentro Sincronizado" : "Error de Conexión";

    // Clases dinámicas
    const borderColor = isSuccess ? "border-[#c8aa6e]" : "border-red-500";
    const titleColor = isSuccess ? "text-[#f0e6d2]" : "text-red-500";
    const subtextColor = isSuccess ? "text-[#c8aa6e]" : "text-red-400";
    const iconContainer = isSuccess ? "border-[#c8aa6e] bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.2)]" : "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
    const barColor = isSuccess ? "bg-[#c8aa6e]/50" : "bg-red-500/50";

    return (
        <div className={`fixed top-12 left-1/2 z-[999] origin-top -translate-x-1/2 ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}>
            <div className={`relative bg-[#0b1120] border ${borderColor} px-8 py-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-w-[380px] flex items-center gap-5 rounded-lg`}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${iconContainer}`}>
                    {isSuccess ? <Check className="w-5 h-5 text-[#c8aa6e]" /> : <X className="w-5 h-5 text-red-500" />}
                </div>

                {/* Text */}
                <div className="flex flex-col">
                    <h3 className={`${titleColor} font-fantasy text-xl leading-none tracking-widest text-left mb-1 whitespace-pre-line`}>
                        {mainText}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className={`h-[1px] w-6 ${barColor}`}></div>
                        <span className={`${subtextColor} text-[9px] font-bold uppercase tracking-[0.2em]`}>{subText}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CanvasSection = ({ onBack, currentUserId = 'user-dm' }) => {
    // Estado de la cámara (separado en zoom y offset como en MinimapV2)
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Estado para la Biblioteca de Escenarios
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState(null);
    const [viewMode, setViewMode] = useState('LIBRARY'); // 'LIBRARY' | 'EDIT'
    const [showToast, setShowToast] = useState(false);
    const [toastExiting, setToastExiting] = useState(false);
    const [toastType, setToastType] = useState('success');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pendingImageFile, setPendingImageFile] = useState(null); // Archivo real para subir a Storage
    const [isSaving, setIsSaving] = useState(false); // Estado de guardado en progreso

    // Tabs del Sidebar
    const [activeTab, setActiveTab] = useState('CONFIG'); // 'CONFIG' | 'TOKENS'
    const [tokens, setTokens] = useState([]);
    const [uploadingToken, setUploadingToken] = useState(false);

    // Estado para Drag & Drop de Tokens en el Canvas
    const [draggedTokenId, setDraggedTokenId] = useState(null); // ID del token principal being dragged (para referencia visual inmediata)
    const [tokenDragStart, setTokenDragStart] = useState({ x: 0, y: 0 }); // Posición inicial del mouse
    const [tokenOriginalPos, setTokenOriginalPos] = useState({}); // Mapa de posiciones originales { [id]: {x, y} }
    const [selectedTokenIds, setSelectedTokenIds] = useState([]); // Array de IDs seleccionados
    const [rotatingTokenId, setRotatingTokenId] = useState(null);
    const [resizingTokenId, setResizingTokenId] = useState(null); // Nuevo estado para resize
    const resizeStartRef = useRef(null); // { x, y, width, height }

    // Estado para Cuadro de Selección
    const [selectionBox, setSelectionBox] = useState(null); // { start: {x,y}, current: {x,y} } (Screen Coords)

    // Configuración de movimiento

    // Refs para gestión de eventos directos (performance)
    const containerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    // No longer needed: const transformRef = useRef(transform);

    // --- Gestión de Notificaciones (Auto-hide) ---
    useEffect(() => {
        if (showToast) {
            const duration = toastType === 'success' ? 3000 : 4000;
            const timer1 = setTimeout(() => setToastExiting(true), duration);
            const timer2 = setTimeout(() => setShowToast(false), duration + 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showToast, toastType]);

    const lastSelectedIdRef = useRef(null);

    // Auto-open Inspector on Selection
    useEffect(() => {
        // No hacer nada si estamos rotando
        if (rotatingTokenId) return;

        if (selectedTokenIds.length === 1) {
            // Auto-open deshabilitado a petición del usuario. Solo doble clic abre inspector.
            const currentId = selectedTokenIds[0];
            lastSelectedIdRef.current = currentId;
        } else {
            // Si no hay selección o hay múltiple, reseteamos la referencia
            lastSelectedIdRef.current = null;
            if (selectedTokenIds.length === 0 && activeTab === 'INSPECTOR') {
                setActiveTab('CONFIG');
            }
        }
    }, [selectedTokenIds, rotatingTokenId, activeTab]);

    // Listener para Sincronización en Tiempo Real (Multi-navegador)
    useEffect(() => {
        if (!activeScenario?.id) return;

        // Suscribirse a cambios en el documento del escenario activo
        const unsub = onSnapshot(doc(db, 'canvas_scenarios', activeScenario.id), (docSnap) => {
            if (docSnap.exists()) {
                const remoteData = docSnap.data();

                setActiveScenario(current => {
                    // Si no hay escenario actual o cambiamos de mapa entre medias, no hacer nada
                    if (!current || current.id !== docSnap.id) return current;

                    // Verificar si los items remotos son diferentes a los locales
                    // Esto permite que si otro usuario (o tú en otro navegador) guarda cambios,
                    // aparezcan aquí mágicamente sin recargar.
                    // Comprobación simple para evitar re-renders si no hay cambios reales
                    if (JSON.stringify(remoteData.items) !== JSON.stringify(current.items)) {
                        console.log("🔄 Sincronizando tablero con datos remotos...");
                        return { ...current, items: remoteData.items || [] };
                    }
                    return current;
                });
            }
        });

        return () => unsub();
    }, [activeScenario?.id]); // Solo se reinicia si cambiamos de escenario base (ID)
    // --- Manejo del Zoom (Rueda del Mouse - Igual que MinimapV2) ---
    // Listener no pasivo para prevenir el scroll por defecto correctamente
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [activeScenario]); // Re-vincular cuando cambia el escenario activo y se monta el viewport

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

    // --- Helper: Screen to World Coords ---
    const divToWorld = (screenX, screenY) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return { x: 0, y: 0 };

        // 1. Convert to simple offset relative to container center
        const startX = screenX - containerRect.left - (containerRect.width / 2);
        const startY = screenY - containerRect.top - (containerRect.height / 2);

        // 2. Adjust for Pan Offset and Zoom
        // Screen = Offset + (World - Center) * Zoom
        // (Screen - Offset) / Zoom = World - Center
        // World = ((Screen - Offset) / Zoom) + Center

        const worldX = ((startX - offset.x) / zoom) + (WORLD_SIZE / 2);
        const worldY = ((startY - offset.y) / zoom) + (WORLD_SIZE / 2);

        return { x: worldX, y: worldY };
    }

    const handleMouseMove = (e) => {
        // --- SELECTION BOX ---
        if (selectionBox) {
            setSelectionBox(prev => ({ ...prev, current: { x: e.clientX, y: e.clientY } }));
            return;
        }

        // --- ROTACIÓN LIBRE ---
        if (rotatingTokenId && activeScenario) {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            // Encontrar el token
            const token = activeScenario.items.find(t => t.id === rotatingTokenId);
            if (!token) return;

            // Calcular el Centro del Token en Coordenadas de Pantalla
            // ScreenX = (WorldCenterX + TokenWorldX + TokenWidth/2 - WorldSize/2) * zoom + offset.x
            // Simplificado: CenterScreen = WorldDivCenterScreen + (TokenLocalPosFromCenter * zoom)

            // 1. Centro del WorldDiv en Pantalla
            const worldDivCenterX = containerRect.width / 2 + offset.x;
            const worldDivCenterY = containerRect.height / 2 + offset.y;

            // 2. Posición del Token respecto al centro del mundo (0,0 del mundo es su centro geométrico en CSS layout, pero item.x/y son coords desde top-left 0,0?)
            // Revisando `spawnX` logic: item.x/y son coordenadas dentro del div de tamaño WORLD_SIZE.
            // 0,0 es top-left del WORLD_SIZE.
            // Centro del token relativo al top-left del mundo:
            const tokenCenterX_World = token.x + token.width / 2;
            const tokenCenterY_World = token.y + token.height / 2;

            // Distancia desde el centro del mundo (WORLD_SIZE/2, WORLD_SIZE/2)
            const distFromCenterWorldX = tokenCenterX_World - (WORLD_SIZE / 2);
            const distFromCenterWorldY = tokenCenterY_World - (WORLD_SIZE / 2);

            // 3. Posición final en pantalla
            const tokenScreenX = worldDivCenterX + (distFromCenterWorldX * zoom);
            const tokenScreenY = worldDivCenterY + (distFromCenterWorldY * zoom);

            // 4. Calcular Ángulo
            const deltaX = e.clientX - tokenScreenX;
            const deltaY = e.clientY - tokenScreenY;

            // atan2(y, x) da el ángulo en radianes desde el eje X positivo.
            // Queremos que "Arriba" (-Y) sea 0 grados (o la orientación base).
            // Normal atan2: Right=0, Down=90, Left=180, Up=-90.
            // Queremos Up=0. 
            // -90 + 90 = 0.
            let angleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;

            setLoadingRotation(angleDeg); // Update Rotation

            const newItems = activeScenario.items.map(i => {
                if (i.id === rotatingTokenId) {
                    return { ...i, rotation: angleDeg };
                }
                return i;
            });
            setActiveScenario(prev => ({ ...prev, items: newItems }));
            return;
        }

        if (draggedTokenId && activeScenario) {
            // Lógica de arrastre de TOKENS (Multiples)
            const deltaX = (e.clientX - tokenDragStart.x) / zoom;
            const deltaY = (e.clientY - tokenDragStart.y) / zoom;

            const newItems = activeScenario.items.map(item => {
                if (selectedTokenIds.includes(item.id)) {
                    const original = tokenOriginalPos[item.id] || { x: item.x, y: item.y };
                    let newX = original.x + deltaX;
                    let newY = original.y + deltaY;

                    if (gridConfig.snapToGrid) {
                        const cellW = gridConfig.cellWidth;
                        const cellH = gridConfig.cellHeight;
                        newX = Math.round(newX / cellW) * cellW;
                        newY = Math.round(newY / cellH) * cellH;
                    }

                    return { ...item, x: newX, y: newY };
                }
                return item;
            });

            setActiveScenario(prev => ({ ...prev, items: newItems }));
            return;
        }

        // --- Lógica de REDIMENSIÓN ---
        if (resizingTokenId && activeScenario && resizeStartRef.current) {
            const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
            const deltaX = (e.clientX - startX) / zoom;
            const deltaY = (e.clientY - startY) / zoom; // Asumiendo aspect ratio libre o control

            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;

            if (gridConfig.snapToGrid) {
                const cellW = gridConfig.cellWidth;
                const cellH = gridConfig.cellHeight;
                // Snap a cuartos de celda (0.25, 0.5, 0.75, 1, 1.25...)
                // Permitimos un tamaño mínimo de 0.25 (un cuarto de casilla)
                const snapUnitW = cellW * 0.25;
                const snapUnitH = cellH * 0.25;

                newWidth = Math.max(snapUnitW, Math.round(newWidth / snapUnitW) * snapUnitW);
                newHeight = Math.max(snapUnitH, Math.round(newHeight / snapUnitH) * snapUnitH);
            } else {
                // Mínimo 10px si no hay snap
                newWidth = Math.max(10, newWidth);
                newHeight = Math.max(10, newHeight);
            }

            setActiveScenario(prev => ({
                ...prev,
                items: prev.items.map(item =>
                    item.id === resizingTokenId
                        ? { ...item, width: newWidth, height: newHeight }
                        : item
                )
            }));
            return;
        }


        if (!isDragging) return;

        // Lógica de paneo de CÁMARA
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        setOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e) => {
        // --- FINALIZAR SELECCIÓN BOX ---
        if (selectionBox && activeScenario) {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                // Calcular rectangulo de selección en coordenadas relativas al div contenedor (para simplificar)
                const sbLeft = Math.min(selectionBox.start.x, selectionBox.current.x);
                const sbTop = Math.min(selectionBox.start.y, selectionBox.current.y);
                const sbRight = Math.max(selectionBox.start.x, selectionBox.current.x);
                const sbBottom = Math.max(selectionBox.start.y, selectionBox.current.y);

                // Convertir las 4 esquinas a Mundo para un AABB check aproximado (si no rotamos cámara)
                const tl = divToWorld(sbLeft, sbTop);
                const br = divToWorld(sbRight, sbBottom);

                // Definir caja de selección en Mundo
                const selX = tl.x;
                const selY = tl.y;
                const selW = br.x - tl.x;
                const selH = br.y - tl.y;

                // Seleccionar items que intersecten
                const newSelected = activeScenario.items.filter(item => {
                    // Simple AABB intersection
                    return (
                        item.x < selX + selW &&
                        item.x + item.width > selX &&
                        item.y < selY + selH &&
                        item.y + item.height > selY
                    );
                }).map(i => i.id);

                // Add to existing if Shift used? For now simpler: Replace selection or Add if Shift
                if (e && e.shiftKey) {
                    setSelectedTokenIds(prev => [...new Set([...prev, ...newSelected])]);
                } else {
                    setSelectedTokenIds(newSelected);
                }
            }
            setSelectionBox(null);
            return;
        }

        setIsDragging(false);
        setDraggedTokenId(null); // Soltar token
        setRotatingTokenId(null); // Soltar rotación
        setResizingTokenId(null); // Soltar resize
        setTokenOriginalPos({});
        document.body.style.cursor = 'default';
    };

    // Efecto para listeners globales de mouse up/move para evitar que se pierda el drag al salir del div
    useEffect(() => {
        const handleGlobalMouseUp = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || resizingTokenId) {
                handleMouseUp(e);
            }
        };

        const handleGlobalMouseMove = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox) {
                handleMouseMove(e);
            }
        };

        if (isDragging || draggedTokenId || rotatingTokenId || selectionBox) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousemove', handleGlobalMouseMove);
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isDragging, draggedTokenId, rotatingTokenId, selectionBox]);

    // Dummy state just to make linter happy if needed or unused var
    const [, setLoadingRotation] = useState(0);

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
        snapToGrid: false,
    });

    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Guardamos el archivo para subirlo luego
        setPendingImageFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const cols = Math.ceil(img.width / gridConfig.cellWidth);
                const rows = Math.ceil(img.height / gridConfig.cellHeight);

                setGridConfig(prev => ({
                    ...prev,
                    backgroundImage: event.target.result, // Local preview
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

    // --- SUSCRIPCIÓN A TOKENS (Firebase) ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'canvas_tokens'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTokens(loaded.sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => unsub();
    }, []);

    const createNewScenario = async () => {
        const newScenario = {
            name: 'Nuevo Encuentro',
            lastModified: Date.now(),
            ownerId: currentUserId,
            preview: null,
            config: {
                cellWidth: 50,
                cellHeight: 50,
                color: '#334155',
                opacity: 0.3,
                lineWidth: 1,
                lineType: 'solid',
                isInfinite: true,
                columns: 20,
                rows: 15,
                backgroundImage: null,
                backgroundImageHash: null, // Guardamos el hash para gestión de Storage
                snapToGrid: false,
            },
            items: [], // Inicializamos array de tokens
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
        if (!activeScenario) {
            console.warn("⚠️ Intento de guardado sin escenario activo");
            return;
        }

        setIsSaving(true);
        console.log("💾 Iniciando guardado de escenario:", activeScenario.name);

        // Feedback visual inmediato
        setToastType('success');
        setShowToast(true);
        setToastExiting(false);

        try {
            let finalBackgroundImage = gridConfig.backgroundImage;
            let finalImageHash = gridConfig.backgroundImageHash;

            // Si hay un archivo pendiente, lo subimos a Storage primero
            if (pendingImageFile) {
                console.log("📤 Subiendo imagen pesada a Firebase Storage...");
                const { url, hash } = await getOrUploadFile(pendingImageFile, 'CanvasMaps');

                // Si ya había una imagen diferente antes, liberamos la referencia anterior
                if (gridConfig.backgroundImageHash && gridConfig.backgroundImageHash !== hash) {
                    console.log("♻️ Liberando imagen anterior de Storage...");
                    await releaseFile(gridConfig.backgroundImageHash);
                }

                finalBackgroundImage = url;
                finalImageHash = hash;

                // Actualizamos el estado local
                setGridConfig(prev => ({
                    ...prev,
                    backgroundImage: url,
                    backgroundImageHash: hash
                }));
                setPendingImageFile(null);
            }

            const updatedConfig = {
                ...gridConfig,
                backgroundImage: finalBackgroundImage,
                backgroundImageHash: finalImageHash
            };

            await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                name: activeScenario.name,
                config: updatedConfig,
                items: activeScenario.items || [], // Guardamos items
                camera: { zoom, offset },
                lastModified: Date.now()
            });

            console.log("✅ Escenario guardado correctamente con imagen persistente");
        } catch (error) {
            console.error("❌ Error al guardar escenario:", error);
            setToastType('error');
            setShowToast(false);
            setTimeout(() => {
                setShowToast(true);
                setToastExiting(false);
            }, 50);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteScenario = async () => {
        if (!itemToDelete) return;
        const idToDelete = itemToDelete.id;

        // Cerramos el modal inmediatamente para feedback visual instantáneo
        setItemToDelete(null);

        try {
            // Si el escenario tenía una imagen en Storage, liberamos la referencia
            if (itemToDelete.config?.backgroundImageHash) {
                console.log("♻️ Eliminando imagen asociada de Storage...");
                await releaseFile(itemToDelete.config.backgroundImageHash);
            }

            await deleteDoc(doc(db, 'canvas_scenarios', idToDelete));

            console.log("🗑️ Encuentro y archivos asociados eliminados correctamente");

            // Si el escenario borrado era el que estábamos editando, volvemos a la biblioteca
            if (activeScenario?.id === idToDelete) {
                setActiveScenario(null);
                setViewMode('LIBRARY');
            }

            // Opcional: Podríamos mostrar un toast específico de "Escenario Eliminado"
            // Pero como la lista se actualiza sola por el onSnapshot, el feedback es el cambio en la lista.
        } catch (error) {
            console.error("Error deleting scenario:", error);
            // Si falla, podríamos informar al usuario
        }
    };

    const handleTokenUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingToken(true);
        try {
            const { url, hash } = await getOrUploadFile(file, 'CanvasTokens');
            await addDoc(collection(db, 'canvas_tokens'), {
                url,
                hash,
                name: file.name,
                createdAt: Date.now(),
                uploadedBy: currentUserId
            });
            console.log("Token uploaded successfully");
        } catch (error) {
            console.error("Error uploading token:", error);
        } finally {
            setUploadingToken(false);
        }
    };

    const deleteToken = async (token) => {
        if (!confirm("¿Eliminar este token?")) return;
        try {
            if (token.hash) await releaseFile(token.hash);
            await deleteDoc(doc(db, 'canvas_tokens', token.id));
        } catch (error) {
            console.error("Error deleting token:", error);
        }
    };

    const addTokenToCanvas = (tokenUrl) => {
        if (!activeScenario) return;

        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // P_mundo = CentroMundo - (Offset / Zoom)
        // El centro del div WORLD está en (WORLD_SIZE/2, WORLD_SIZE/2)

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);

        // Centrar el token en ese punto (restando la mitad de su tamaño)
        const w = gridConfig.cellWidth;
        const h = gridConfig.cellHeight;

        const spawnX = centerX - (w / 2);
        const spawnY = centerY - (h / 2);

        const newToken = {
            id: `token-${Date.now()}`,
            x: spawnX,
            y: spawnY,
            width: gridConfig.cellWidth, // Tamaño por defecto: 1 celda
            height: gridConfig.cellHeight,
            img: tokenUrl,
            rotation: 0,
            layer: 'TOKEN',
            name: 'Token', // Nombre por defecto
            status: [] // Array de IDs de estados
        };

        setActiveScenario(prev => ({
            ...prev,
            items: [...(prev.items || []), newToken]
        }));
    };

    const handleTokenMouseDown = (e, token) => {
        e.stopPropagation(); // Evitar que el canvas inicie pan

        // Si click izquierdo, seleccionamos y preparamos arrastre
        if (e.button === 0) {
            // Si estamos redimensionando, no iniciar arrastre
            if (resizingTokenId) return;

            let newSelection = [...selectedTokenIds];

            // Si el token NO está ya seleccionado, lo añadimos o reemplazamos
            if (!selectedTokenIds.includes(token.id)) {
                if (e.shiftKey) {
                    newSelection.push(token.id);
                } else {
                    newSelection = [token.id];
                }
                setSelectedTokenIds(newSelection);
            }
            // Si YA está seleccionado, si pulsamos Shift podríamos deseleccionarlo?
            // Por simplicidad de arrastre, si ya está seleccionado y NO Shift, no hacemos nada (mantenemos grupo)
            // Si Shift y ya está, podríamos quitarlo.
            else if (e.shiftKey) {
                newSelection = newSelection.filter(id => id !== token.id);
                setSelectedTokenIds(newSelection);
                return; // No iniciamos drag si estamos deseleccionando
            }

            setDraggedTokenId(token.id);
            setTokenDragStart({ x: e.clientX, y: e.clientY });

            // Guardar posiciones originales de TODOS los seleccionados (incluyendo el nuevo si acabamos de seleccionarlo)
            // Nota: Usamos 'newSelection' para asegurar que tenemos la lista actualizada
            const originals = {};
            activeScenario.items.forEach(i => {
                if (newSelection.includes(i.id)) {
                    originals[i.id] = { x: i.x, y: i.y };
                }
            });
            setTokenOriginalPos(originals);
        }
    };

    const handleRotationMouseDown = (e, token) => {
        e.stopPropagation();
        if (e.button === 0) {
            setRotatingTokenId(token.id);
            // Para rotación, forzamos selección única del token rotado para evitar confusiones visuales
            setSelectedTokenIds([token.id]);
        }
    };

    const deleteItem = (itemId) => {
        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== itemId)
        }));
        setSelectedTokenIds(prev => prev.filter(id => id !== itemId));
    };

    const rotateItem = (itemId, angle) => {
        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.map(i => {
                if (i.id === itemId) {
                    return { ...i, rotation: (i.rotation || 0) + angle };
                }
                return i;
            })
        }));
    };

    const updateItem = (itemId, updates) => {
        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
        }));
    };

    const handleResizeMouseDown = (e, item) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingTokenId(item.id);
        resizeStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: item.width,
            startHeight: item.height
        };
    };

    // Handler para click en el fondo del canvas (Deseleccionar y Selection Box)
    const handleCanvasBackgroundMouseDown = (e) => {
        // Solo si click izquierdo directo en el fondo
        if (e.button === 0 && !e.altKey && e.target === containerRef.current) {
            if (!e.shiftKey) setSelectedTokenIds([]); // Limpiar selección si no es Shift

            // Verificación de dispositivo móvil (Touch o pantalla pequeña)
            const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
            if (isMobile) return;

            // Iniciar Selection Box
            setSelectionBox({
                start: { x: e.clientX, y: e.clientY },
                current: { x: e.clientX, y: e.clientY }
            });
        } else {
            handleMouseDown(e); // Mantener lógica de pan (Alt+Click o Middle Click)
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
            {/* --- BIBLIOTECA DE ENCUENTROS --- */}
            {viewMode === 'LIBRARY' && !activeScenario && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[60] bg-[#09090b] flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar"
                >
                    <div className="max-w-6xl mx-auto w-full">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                            <div>
                                <button onClick={onBack} className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-widest text-xs mb-4 hover:translate-x-[-4px] transition-all">
                                    <FiArrowLeft className="w-4 h-4" /> <b>VOLVER</b>
                                </button>
                                <h1 className="text-4xl md:text-5xl font-fantasy text-[#f0e6d2] tracking-tighter">BIBLIOTECA DE ENCUENTROS</h1>
                                <p className="text-slate-500 uppercase text-xs tracking-[0.3em] font-bold mt-2"><b>Gestión de escenarios para el Canvas Beta</b></p>
                            </div>
                            <button onClick={createNewScenario} className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(200,170,110,0.3)] hover:scale-105 transition-all">
                                <Plus className="w-6 h-6" /> Nuevo Encuentro
                            </button>
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                            {scenarios.map(s => (
                                <motion.div
                                    layout
                                    key={s.id}
                                    onClick={() => loadScenario(s)}
                                    className="group relative bg-[#0b1120] border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#161f32] transition-all overflow-hidden"
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setItemToDelete(s); }}
                                        className="absolute top-4 right-4 p-2 bg-[#0b1120]/80 border border-slate-700/50 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-900/20 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg backdrop-blur-sm"
                                        title="Eliminar Encuentro"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex gap-6 items-start">
                                        <CanvasThumbnail scenario={s} />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[#f0e6d2] font-fantasy text-xl mb-1 truncate">{s.name}</h3>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">
                                                {s.config?.isInfinite ? 'Mapa Infinito' : `${Math.round(s.config?.columns)}x${Math.round(s.config?.rows)} Celdas`}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                                                    <LayoutGrid size={10} className="text-[#c8aa6e]" />
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Escenario</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center justify-between border-t border-slate-800/50 pt-4">
                                        <span className="text-[9px] text-slate-600 font-mono">ID: {s.id.slice(-8)}</span>
                                        <div className="flex gap-2">
                                            <FiArrowLeft className="w-4 h-4 text-slate-500 rotate-180" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {scenarios.length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="font-fantasy tracking-widest text-lg">SIN ENCUENTROS CREADOS</p>
                                    <p className="text-xs uppercase mt-2 text-center px-4">Utiliza el botón superior para crear tu primer escenario táctico</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DELETE CONFIRMATION MODAL */}
                    <AnimatePresence>
                        {itemToDelete && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="w-full max-w-md bg-[#0b1120] border border-red-900/50 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)] p-6 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
                                    <h3 className="text-xl font-fantasy text-red-500 mb-2 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" /> ELIMINAR ENCUENTRO
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        ¿Estás seguro de que deseas eliminar <span className="text-[#f0e6d2] font-bold">"{itemToDelete.name}"</span>?
                                        <br /><span className="text-xs text-red-400/70 mt-1 block">Esta acción eliminará permanentemente la configuración del escenario.</span>
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button onClick={() => setItemToDelete(null)} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#f0e6d2] transition-colors">Cancelar</button>
                                        <button onClick={deleteScenario} className="px-6 py-2 bg-red-900/20 border border-red-900/50 rounded text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-900/40 transition-all shadow-[0_0_20px_rgba(220,38,38,0.1)]">Eliminar</button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* --- EDITOR DE ESCENARIOS --- */}
            {activeScenario && (
                <>
                    {/* --- UI Overlay (Header & Controles) --- */}

                    {/* Gradient Background Header (Restored) */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0b1120] via-[#0b1120]/60 to-transparent z-30 pointer-events-none"></div>

                    {/* 1. Botón Salir (Flotante Arriba Izquierda) */}
                    <button
                        onClick={() => {
                            setViewMode('LIBRARY');
                            setActiveScenario(null);
                        }}
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
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-[#c8aa6e]" />
                                    <input
                                        type="text"
                                        value={activeScenario?.name || ''}
                                        onChange={(e) => setActiveScenario(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-transparent border-none outline-none font-fantasy text-[#f0e6d2] text-lg tracking-widest uppercase w-48 focus:bg-white/5 rounded px-1"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-slate-400 hover:text-[#c8aa6e] transition-colors p-1"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Sidebar Tabs */}
                        <div className="flex bg-[#0b1120] border-b border-slate-800 shrink-0 z-10">
                            <button
                                onClick={() => setActiveTab('CONFIG')}
                                className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'CONFIG' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Settings className="w-4 h-4" />
                                <span className="text-[8px] font-bold uppercase">Configuración</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('TOKENS')}
                                className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'TOKENS' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="text-[8px] font-bold uppercase">Tokens</span>
                            </button>
                            {selectedTokenIds.length === 1 && (
                                <button
                                    onClick={() => setActiveTab('INSPECTOR')}
                                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'INSPECTOR' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-[8px] font-bold uppercase">Inspector</span>
                                </button>
                            )}
                        </div>

                        {/* Sidebar Content Wrapper */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">

                            {/* --- TAB: CONFIGURACIÓN --- */}
                            {activeTab === 'CONFIG' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
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

                                    {/* Control de Snap */}
                                    <div className="flex items-center justify-between bg-[#111827] p-3 rounded border border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <LayoutGrid className="w-4 h-4 text-[#c8aa6e]" />
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Ajustar a Rejilla (Snap)</span>
                                        </div>
                                        <button
                                            onClick={() => handleConfigChange('snapToGrid', !gridConfig.snapToGrid)}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${gridConfig.snapToGrid ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${gridConfig.snapToGrid ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
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
                                </div>
                            )}

                            {/* --- TAB: TOKENS --- */}
                            {activeTab === 'TOKENS' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                        <Sparkles className="w-3 h-3" />
                                        Biblioteca de Tokens
                                    </h4>

                                    {/* Upload Button */}
                                    <label className={`
                                        flex flex-col items-center justify-center w-full h-32 
                                        border-2 border-dashed border-slate-700/50 rounded-xl 
                                        cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 
                                        transition-all group relative overflow-hidden
                                        ${uploadingToken ? 'pointer-events-none opacity-50' : ''}
                                    `}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleTokenUpload} disabled={uploadingToken} />
                                        {uploadingToken ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <RotateCw className="w-6 h-6 text-[#c8aa6e] animate-spin" />
                                                <span className="text-[10px] uppercase font-bold text-[#c8aa6e]">Subiendo...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                                <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Nuevo Token</span>
                                            </>
                                        )}
                                    </label>

                                    {/* Tokens Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {tokens.map(token => (
                                            <div
                                                key={token.id}
                                                className="aspect-square bg-[#0b1120] rounded-lg border border-slate-800 relative group overflow-hidden hover:border-[#c8aa6e]/50 transition-colors cursor-pointer"
                                                onClick={() => addTokenToCanvas(token.url)} // Click to Add
                                                title="Click para añadir al mapa"
                                            >
                                                <img src={token.url} alt={token.name} className="w-full h-full object-contain p-2" />

                                                {/* Delete Button Overlay */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteToken(token); }}
                                                        className="p-1.5 bg-red-900/50 text-red-400 rounded hover:bg-red-900 hover:text-red-200 transition-colors"
                                                        title="Eliminar Token de Biblioteca"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {tokens.length === 0 && !uploadingToken && (
                                            <div className="col-span-3 py-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest border border-dashed border-slate-800 rounded-lg">
                                                Sin tokens
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}



                            <div className="w-full h-px bg-slate-800/50"></div>

                            {/* 5. Estilo Visual */}
                            {activeTab === 'CONFIG' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                            )}

                            {/* --- TAB: INSPECTOR --- */}
                            {activeTab === 'INSPECTOR' && selectedTokenIds.length === 1 && (() => {
                                const token = activeScenario.items.find(i => i.id === selectedTokenIds[0]);
                                if (!token) return null;

                                return (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* Header Inspector */}
                                        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                                            <div className="w-16 h-16 bg-[#0b1120] rounded border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                                <img src={token.img} className="w-full h-full object-contain p-1" />
                                            </div>
                                            <div>
                                                <h4 className="text-[#f0e6d2] font-fantasy text-lg tracking-wide truncate max-w-[150px]">{token.name}</h4>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{token.layer} LAYER</span>
                                            </div>
                                        </div>

                                        {/* Properties Form */}
                                        <div className="space-y-4">

                                            {/* Name Input */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={token.name}
                                                    onChange={(e) => updateItem(token.id, { name: e.target.value })}
                                                    className="w-full bg-[#111827] border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-[#c8aa6e] outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Rotation & Size */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rotación (°)</label>
                                                    <div className="flex items-center bg-[#111827] border border-slate-800 rounded h-9">
                                                        <input
                                                            type="number"
                                                            value={Math.round(token.rotation || 0)}
                                                            onChange={(e) => updateItem(token.id, { rotation: Number(e.target.value) })}
                                                            className="w-full h-full bg-transparent border-none px-3 text-sm text-slate-200 outline-none"
                                                        />
                                                        <span className="pr-3 text-slate-600 text-xs">°</span>
                                                    </div>
                                                </div>
                                                {/* Placeholder for Size/Scale - podría ser complejo por ahora simplemente mostramos */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tamaño</label>
                                                    <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded overflow-hidden h-9">
                                                        <button
                                                            onClick={() => {
                                                                // Lógica inteligente de decremento
                                                                // Si > 1 celda, baja de 1 en 1. Si <= 1, baja de 0.25 en 0.25. Mínimo 0.25.
                                                                if (gridConfig.snapToGrid) {
                                                                    const cellW = gridConfig.cellWidth;
                                                                    const cellH = gridConfig.cellHeight;
                                                                    const currentCellsW = token.width / cellW;

                                                                    // Calcular nuevo tamaño en celdas
                                                                    let newCellsW = currentCellsW > 1 ? Math.floor(currentCellsW - 1) : currentCellsW - 0.25;
                                                                    // Corregir si bajó demasiado al redondear o si ya estaba en 1.5 (floor(0.5)=>0 bad)
                                                                    if (currentCellsW > 1 && newCellsW < 1) newCellsW = 1;
                                                                    // Simplicidad: Restar 1 si >= 2, restar 0.25 si < 2.
                                                                    newCellsW = (token.width / cellW) <= 1 ? (token.width / cellW) - 0.25 : (token.width / cellW) - 1;

                                                                    // Asegurar mínimo 0.25
                                                                    if (newCellsW < 0.25) newCellsW = 0.25;

                                                                    updateItem(token.id, {
                                                                        width: newCellsW * cellW,
                                                                        height: newCellsW * cellH // Mantener ratio cuadrado por simplicidad en botón, o usar lógica separada
                                                                    });
                                                                } else {
                                                                    const step = 20;
                                                                    const newW = Math.max(10, token.width - step);
                                                                    const newH = Math.max(10, token.height - step);
                                                                    updateItem(token.id, { width: newW, height: newH });
                                                                }
                                                            }}
                                                            className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-r border-slate-800 flex items-center justify-center"
                                                            title="Reducir"
                                                        >
                                                            <FiMinus size={14} />
                                                        </button>
                                                        <span className="flex-1 text-center font-mono text-xs text-[#c8aa6e] flex items-center justify-center h-full">
                                                            {gridConfig.snapToGrid
                                                                ? `${parseFloat((token.width / gridConfig.cellWidth).toFixed(2))}x${parseFloat((token.height / gridConfig.cellHeight).toFixed(2))}`
                                                                : `${Math.round(token.width)}px`
                                                            }
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                if (gridConfig.snapToGrid) {
                                                                    const cellW = gridConfig.cellWidth;
                                                                    const cellH = gridConfig.cellHeight;
                                                                    // Incrementar: 0.25 si < 1, 1 si >= 1
                                                                    let newCellsW = (token.width / cellW) < 1 ? (token.width / cellW) + 0.25 : (token.width / cellW) + 1;

                                                                    updateItem(token.id, {
                                                                        width: newCellsW * cellW,
                                                                        height: newCellsW * cellH
                                                                    });
                                                                } else {
                                                                    const step = 20;
                                                                    updateItem(token.id, { width: token.width + step, height: token.height + step });
                                                                }
                                                            }}
                                                            className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-l border-slate-800 flex items-center justify-center"
                                                            title="Aumentar"
                                                        >
                                                            <FiPlus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Future Links */}
                                            <div className="pt-4 border-t border-slate-800/50">
                                                <button className="w-full py-3 bg-slate-800 text-slate-400 font-bold uppercase text-xs tracking-widest rounded border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all flex items-center justify-center gap-2">
                                                    <Activity size={14} />
                                                    Ver Ficha de Personaje
                                                </button>
                                                <p className="text-center text-[10px] text-slate-600 mt-2">Próximamente: Vinculación con sistema de fichas</p>
                                            </div>

                                            {/* Estados Alterados */}
                                            <div className="pt-4 border-t border-slate-800/50 space-y-3">
                                                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estados Alterados</h4>
                                                <EstadoSelector
                                                    selected={token.status || []}
                                                    onToggle={(statusId) => {
                                                        const currentStatus = token.status || [];
                                                        const newStatus = currentStatus.includes(statusId)
                                                            ? currentStatus.filter(s => s !== statusId)
                                                            : [...currentStatus, statusId];
                                                        updateItem(token.id, { status: newStatus });
                                                    }}
                                                />
                                            </div>

                                        </div>
                                    </div>
                                );
                            })()}
                        </div>


                        <div className="p-6 bg-[#09090b] border-t border-[#c8aa6e]/20 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
                            <button
                                onClick={saveCurrentScenario}
                                disabled={isSaving}
                                className={`group relative w-full py-5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl hover:shadow-[0_0_25px_rgba(200,170,110,0.5)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {/* EFECTO DE BRILLO (Shine effect) - Solo si no está guardando */}
                                {!isSaving && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}

                                <span className="relative z-10 drop-shadow-md flex items-center justify-center gap-3">
                                    {isSaving ? (
                                        <>
                                            <RotateCw className="w-5 h-5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Confirmar Cambios'
                                    )}
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
                        onMouseDown={handleCanvasBackgroundMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        {/* --- SELECTION BOX RENDER (Screen Space Overlay) --- */}
                        {selectionBox && (
                            <div
                                className="absolute border border-[#c8aa6e] bg-[#c8aa6e]/10 pointer-events-none z-50"
                                style={{
                                    left: Math.min(selectionBox.start.x, selectionBox.current.x) - (containerRef.current?.getBoundingClientRect().left || 0),
                                    top: Math.min(selectionBox.start.y, selectionBox.current.y) - (containerRef.current?.getBoundingClientRect().top || 0),
                                    width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                                    height: Math.abs(selectionBox.current.y - selectionBox.start.y)
                                }}
                            />
                        )}

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
                                marginTop: `${-WORLD_SIZE / 2}px`,
                                pointerEvents: 'none' // Evita interferir con los eventos del viewport
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
                            {/* --- ITEMS / TOKENS LAYER --- */}

                            {/* --- ITEMS / TOKENS LAYER --- */}
                            {activeScenario?.items?.map(item => {
                                const original = tokenOriginalPos[item.id];
                                return (
                                    <React.Fragment key={item.id}>
                                        {/* GHOST TOKEN & LINE (Visual Aid when moving) */}
                                        {original && (
                                            <>
                                                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
                                                    <line
                                                        x1={original.x + item.width / 2}
                                                        y1={original.y + item.height / 2}
                                                        x2={item.x + item.width / 2}
                                                        y2={item.y + item.height / 2}
                                                        stroke="#c8aa6e"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="6 4"
                                                        opacity="0.6"
                                                    />
                                                    <circle cx={original.x + item.width / 2} cy={original.y + item.height / 2} r="3" fill="#c8aa6e" opacity="0.5" />
                                                </svg>
                                                <div
                                                    className="absolute top-0 left-0 z-10 pointer-events-none grayscale opacity-40 border-2 border-dashed border-[#c8aa6e]/50 rounded-sm overflow-hidden"
                                                    style={{
                                                        transform: `translate(${original.x}px, ${original.y}px) rotate(${item.rotation}deg)`,
                                                        width: `${item.width}px`,
                                                        height: `${item.height}px`,
                                                    }}
                                                >
                                                    <img src={item.img} className="w-full h-full object-contain" draggable={false} />
                                                </div>
                                            </>
                                        )}

                                        <div
                                            onMouseDown={(e) => handleTokenMouseDown(e, item)}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTab('INSPECTOR');
                                                setShowSettings(true);
                                            }}
                                            style={{
                                                transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
                                                width: `${item.width}px`,
                                                height: `${item.height}px`,
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                pointerEvents: 'auto', // Reactivar eventos para el token
                                                cursor: 'grab'
                                            }}
                                            className="group"
                                        >

                                            {/* Visual Selection Ring & Drag State */}
                                            <div className={`w-full h-full relative ${draggedTokenId === item.id ? 'scale-105 shadow-2xl' : ''} transition-transform`}>
                                                <div className={`absolute -inset-1 border-2 border-[#c8aa6e] rounded-sm transition-opacity ${selectedTokenIds.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                                                    {/* (Línea conectora y controles ahora unificados abajo) */}
                                                    {selectedTokenIds.includes(item.id) && (
                                                        <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-[#c8aa6e] -z-10 origin-bottom"></div>
                                                    )}
                                                </div>

                                                <img
                                                    src={item.img}
                                                    className="w-full h-full object-contain drop-shadow-lg"
                                                    draggable={false}
                                                />

                                                {/* STATUS EFFECTS ONSCREEN */}
                                                {item.status && item.status.length > 0 && (
                                                    <div className="absolute top-0 -left-3 flex flex-col items-center gap-1 pointer-events-none z-40 transform scale-75 origin-top-right">
                                                        {item.status.slice(0, 4).map(statusId => {
                                                            const effect = DEFAULT_STATUS_EFFECTS[statusId];
                                                            if (!effect) return null;
                                                            const Icon = ICON_MAP[effect.iconName] || ICON_MAP.AlertCircle;

                                                            return (
                                                                <div
                                                                    key={statusId}
                                                                    className="w-5 h-5 bg-[#0b1120] rounded-full border flex items-center justify-center shadow-sm"
                                                                    style={{
                                                                        borderColor: effect.hex || '#c8aa6e',
                                                                        color: effect.hex || '#c8aa6e'
                                                                    }}
                                                                >
                                                                    <Icon size={12} />
                                                                </div>
                                                            );
                                                        })}
                                                        {item.status.length > 4 && (
                                                            <div className="w-5 h-5 bg-[#0b1120] rounded-full border border-slate-600 flex items-center justify-center shadow-sm text-[8px] text-slate-400 font-bold">
                                                                +{item.status.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* MOVEMENT DISTANCE INDICATOR (Solo al arrastrar) */}
                                                {tokenOriginalPos[item.id] && (
                                                    (() => {
                                                        const original = tokenOriginalPos[item.id];
                                                        const dx = Math.abs(item.x - original.x);
                                                        const dy = Math.abs(item.y - original.y);
                                                        const cellW = gridConfig.cellWidth || 50;
                                                        const cellH = gridConfig.cellHeight || 50;

                                                        // Distancia en casillas (Regla Chebyshev: Diagonal = 1)
                                                        const moveX = Math.round(dx / cellW);
                                                        const moveY = Math.round(dy / cellH);
                                                        const distance = Math.max(moveX, moveY);

                                                        if (distance === 0) return null;

                                                        return (
                                                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
                                                                <div className="bg-black/80 backdrop-blur-md border border-yellow-500/50 rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                                                    {distance <= 5 ? (
                                                                        <span className="text-xs leading-none flex gap-0.5">
                                                                            {Array(distance).fill('🟡').map((_, i) => (
                                                                                <span key={i} className="drop-shadow-md">🟡</span>
                                                                            ))}
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-xs leading-none drop-shadow-md">🟡</span>
                                                                            <span className="text-yellow-400 font-bold text-xs font-mono leading-none">x{distance}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                )}

                                                {/* NOMBRE DEL TOKEN (Visible al seleccionar o hover) */}
                                                <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 transition-opacity ${selectedTokenIds.includes(item.id) || 'group-hover:opacity-100 opacity-0'}`}>
                                                    <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full border border-slate-600 block shadow-sm backdrop-blur-sm">
                                                        {item.name}
                                                    </span>
                                                </div>

                                                {/* Controles de Token (Superiores) */}
                                                <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 rounded-full px-2 py-1 transition-opacity z-50 shadow-xl border border-[#c8aa6e]/30 ${selectedTokenIds.includes(item.id) || 'group-hover:opacity-100 opacity-0'}`}>


                                                    <button
                                                        onMouseDown={(e) => { e.stopPropagation(); rotateItem(item.id, 45); }}
                                                        className="text-[#c8aa6e] hover:text-[#f0e6d2] p-1 hover:bg-[#c8aa6e]/10 rounded-full transition-colors"
                                                        title="Rotar 45°"
                                                    >
                                                        <RotateCw size={12} />
                                                    </button>

                                                    {/* Handle de Rotación Libre (Central) */}
                                                    <div
                                                        className="w-3 h-3 bg-[#c8aa6e] rounded-full mx-1 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform border border-[#0b1120]"
                                                        onMouseDown={(e) => handleRotationMouseDown(e, item)}
                                                        title="Arrastrar para rotar libremente"
                                                    />

                                                    <button
                                                        onMouseDown={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                                        className="text-red-400 hover:text-red-200 p-1 hover:bg-red-900/30 rounded-full transition-colors"
                                                        title="Eliminar del mapa"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>

                                                {/* RESIZE HANDLE (Bottom-Right) */}
                                                {selectedTokenIds.includes(item.id) && !rotatingTokenId && (
                                                    <div
                                                        onMouseDown={(e) => handleResizeMouseDown(e, item)}
                                                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c8aa6e] border border-white rounded-sm cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform"
                                                        title="Redimensionar (Click + Arrastrar)"
                                                    ></div>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}

                        </div>
                    </div>
                </>
            )
            }

            {/* Mensaje de Guardado (Toast) - Al final para estar siempre en el z-index superior */}
            <SaveToast show={showToast} exiting={toastExiting} type={toastType} />
        </div >
    );
};

CanvasSection.propTypes = {
    onBack: PropTypes.func.isRequired,
};

export default CanvasSection;
