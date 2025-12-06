import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Sword,
    Skull,
    Shield,
    HelpCircle,
    ShoppingBag,
    Trophy,
    Lock,
    MapPin,
    Check,
    ChevronLeft,
    Move,
    Link as LinkIcon,
    Trash2,
    Plus,
    Settings,
    Save,
    X,
    Archive,
    Coins,
    Scroll,
    FlaskConical
} from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// --- CONSTANTS & TYPES ---

const NODE_TYPES = {
    START: 'START',
    COMBAT: 'COMBAT',
    ELITE: 'ELITE',
    EVENT: 'EVENT',
    SHOP: 'SHOP',
    BOSS: 'BOSS',
    CLASS_REWARD: 'CLASS_REWARD',
    TROPHY: 'TROPHY',
    TREASURE: 'TREASURE'
};

const NODE_STATUS = {
    LOCKED: 'LOCKED',
    AVAILABLE: 'AVAILABLE',
    COMPLETED: 'COMPLETED',
    CURRENT: 'CURRENT'
};

const INITIAL_NODES = [
    { id: 'start', x: 10, y: 50, type: 'START', status: 'AVAILABLE', label: 'Inicio', connections: ['c1'] },
    { id: 'c1', x: 25, y: 50, type: 'COMBAT', status: 'LOCKED', connections: [] },
];

const CampaignMapView = ({ onSelectClass, onBack }) => {
    // --- STATE ---
    const scrollRef = useRef(null);
    const containerRef = useRef(null);

    const [nodes, setNodes] = useState(INITIAL_NODES);
    const [classes, setClasses] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [activeTool, setActiveTool] = useState('SELECT'); // 'SELECT' | 'CONNECT' | 'DELETE'
    const [connectionSource, setConnectionSource] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // --- DATA FETCHING ---

    // Fetch Classes for Reward Icons
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'classes'));
                const loadedClasses = [];
                querySnapshot.forEach((doc) => {
                    loadedClasses.push({ id: doc.id, ...doc.data() });
                });
                setClasses(loadedClasses);
            } catch (error) {
                console.error("Error fetching classes:", error);
            }
        };
        fetchClasses();
    }, []);

    // Subscribe to Map Data
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'campaignMap', 'main'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.nodes) {
                    setNodes(data.nodes);
                }
            } else {
                // Initialize if not exists
                saveMap(INITIAL_NODES);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- PERSISTENCE ---

    const saveMap = async (newNodes) => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'campaignMap', 'main'), {
                nodes: newNodes,
                updatedAt: new Date().toISOString()
            });
            setLastSaved(new Date());
        } catch (error) {
            console.error("Error saving map:", error);
        } finally {
            setSaving(false);
        }
    };

    // Auto-save removed as per user request. Saving is now manual only.
    /*
    // Debounced save
    useEffect(() => {
        if (loading) return;
        const timer = setTimeout(() => {
            saveMap(nodes);
        }, 2000); // Increased debounce to 2s to avoid too many writes
        return () => clearTimeout(timer);
    }, [nodes, loading]);
    */

    const handleManualSave = () => {
        saveMap(nodes);
    };


    // --- TOOLS & ACTIONS ---

    const handleAddNode = (type) => {
        // Añade un nodo en el centro de la vista actual (aprox)
        const viewportCenter = scrollRef.current ? (scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2) / scrollRef.current.scrollWidth * 100 : 50;

        const newNode = {
            id: `node-${Date.now()}`,
            x: viewportCenter,
            y: 50, // Center vertical
            type,
            subtype: type === 'TREASURE' ? 'GENERAL' : undefined,
            status: 'LOCKED',
            connections: [],
            label: type === 'BOSS' ? 'Jefe' : type === 'SHOP' ? 'Tienda' : type === 'TREASURE' ? 'Tesoro' : 'Encuentro'
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
        setActiveTool('SELECT');
    };

    const handleDelete = (id) => {
        setNodes(prev => prev
            .filter(n => n.id !== id) // Remove node
            .map(n => ({ ...n, connections: n.connections.filter(c => c !== id) })) // Remove connections to it
        );
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const handleNodeClick = (e, id) => {
        e.stopPropagation();

        if (activeTool === 'DELETE') {
            handleDelete(id);
            return;
        }

        if (activeTool === 'CONNECT') {
            if (connectionSource === null) {
                setConnectionSource(id);
            } else {
                if (connectionSource !== id) {
                    // Create connection
                    setNodes(prev => prev.map(n => {
                        if (n.id === connectionSource && !n.connections.includes(id)) {
                            return { ...n, connections: [...n.connections, id] };
                        }
                        return n;
                    }));
                }
                setConnectionSource(null);
            }
            return;
        }

        // Default: SELECT logic
        setSelectedNodeId(id);
    };

    const handleCanvasClick = (e) => {
        // Deselect if clicking empty space
        if (!isDragging) {
            setSelectedNodeId(null);
            setConnectionSource(null);
        }
    };

    // --- DRAG LOGIC ---
    const handleMouseDown = (e, id) => {
        if (activeTool === 'SELECT') {
            setSelectedNodeId(id);
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setMousePos({ x, y });

            if (isDragging && selectedNodeId && activeTool === 'SELECT') {
                setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, x, y } : n));
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // --- RENDER HELPERS ---
    const getNodeIcon = (node) => {
        if (node.type === 'CLASS_REWARD' && node.classId) {
            const dndClass = classes.find(c => c.id === node.classId);
            if (dndClass && dndClass.image) return <img src={dndClass.image} className="w-full h-full object-cover rounded-full" alt="Class" />;
        }

        // Helper to render subtype icon for treasure
        const getSubtypeIcon = () => {
            const iconClass = "w-4 h-4"; // Same size as chest
            switch (node.subtype) {
                case 'GOLD': return <Coins className={iconClass} />;
                case 'WEAPON': return <Sword className={iconClass} />;
                case 'ARMOR': return <Shield className={iconClass} />;
                case 'SCROLL': return <Scroll className={iconClass} />;
                case 'POTION': return <FlaskConical className={iconClass} />;
                default: return null;
            }
        };

        switch (node.type) {
            case 'START': return <MapPin className="w-5 h-5" />;
            case 'COMBAT': return <Sword className="w-5 h-5" />;
            case 'ELITE': return <Skull className="w-6 h-6 text-red-400" />;
            case 'TREASURE':
                const SubIcon = getSubtypeIcon();
                if (SubIcon) {
                    return (
                        <div className="flex items-center gap-0.5 text-[#c8aa6e]">
                            <Archive className="w-4 h-4" />
                            {SubIcon}
                        </div>
                    );
                }
                return <Archive className="w-5 h-5 text-[#c8aa6e]" />;
            case 'BOSS': return <Skull className="w-8 h-8 text-red-500 fill-red-900/50" />;
            case 'EVENT': return <HelpCircle className="w-5 h-5 text-blue-400" />;
            case 'SHOP': return <ShoppingBag className="w-5 h-5 text-yellow-400" />;
            case 'CLASS_REWARD': return <Shield className="w-6 h-6" />;
            case 'TROPHY': return <Trophy className="w-6 h-6 text-yellow-500" />;
            default: return <div className="w-2 h-2 rounded-full bg-white" />;
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="w-full h-full relative bg-[#09090b] overflow-hidden flex flex-col">

            {/* --- TOP BAR --- */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0b1120] to-transparent z-40 px-6 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0b1120]/90 border border-[#c8aa6e]/50 rounded text-[#c8aa6e] hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-colors font-bold uppercase tracking-wider text-sm shadow-lg"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Salir
                    </button>

                    <button
                        onClick={handleManualSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#c8aa6e]/10 border border-[#c8aa6e] rounded text-[#c8aa6e] hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-colors font-bold uppercase tracking-wider text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Guardando...' : 'Guardar Mapa'}
                    </button>

                    {lastSaved && !saving && (
                        <span className="text-xs text-slate-500 font-mono">
                            <Check className="w-3 h-3 inline mr-1 text-green-500" />
                            Guardado {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <div className="pointer-events-auto bg-[#0b1120]/80 backdrop-blur border border-[#c8aa6e]/30 px-4 py-1 rounded-full">
                    <span className="text-[#c8aa6e] font-fantasy text-sm tracking-widest">MODO CONSTRUCTOR DE MUNDOS</span>
                </div>
            </div>

            {/* --- MAIN EDITOR CANVAS --- */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-auto custom-scrollbar relative cursor-crosshair"
            >
                <div
                    ref={containerRef}
                    className="min-w-[150vw] min-h-[100vh] relative bg-[#12151d]"
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
                            backgroundSize: '40px 40px'
                        }}
                    ></div>

                    {/* Connections Layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                            </marker>
                        </defs>
                        {nodes.map(node =>
                            node.connections.map(targetId => {
                                const target = nodes.find(n => n.id === targetId);
                                if (!target) return null;
                                return (
                                    <line
                                        key={`${node.id}-${target.id}`}
                                        x1={`${node.x}%`} y1={`${node.y}%`}
                                        x2={`${target.x}%`} y2={`${target.y}%`}
                                        stroke="#475569"
                                        strokeWidth="2"
                                        strokeDasharray="5 5"
                                        markerEnd="url(#arrowhead)"
                                    />
                                );
                            })
                        )}
                        {/* Active Connection Line (Ghost) */}
                        {connectionSource && activeTool === 'CONNECT' && (() => {
                            const sourceNode = nodes.find(n => n.id === connectionSource);
                            if (!sourceNode) return null;
                            return (
                                <line
                                    x1={`${sourceNode.x}%`} y1={`${sourceNode.y}%`}
                                    x2={`${mousePos.x}%`} y2={`${mousePos.y}%`}
                                    stroke="#c8aa6e"
                                    strokeWidth="2"
                                    strokeDasharray="5 5"
                                    className="animate-pulse"
                                />
                            );
                        })()}
                    </svg>

                    {/* Nodes Layer */}
                    {nodes.map(node => {
                        const isSelected = selectedNodeId === node.id;
                        const isSource = connectionSource === node.id;

                        let sizeClass = "w-12 h-12";
                        if (node.type === 'BOSS') sizeClass = "w-20 h-20";
                        if (node.type === 'TROPHY') sizeClass = "w-24 h-24";
                        // Slightly wider for treasure if it has subtype to accommodate 2 icons
                        if (node.type === 'TREASURE' && node.subtype && node.subtype !== 'GENERAL') sizeClass = "w-16 h-12";

                        return (
                            <div
                                key={node.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                onMouseDown={(e) => handleMouseDown(e, node.id)}
                                onClick={(e) => handleNodeClick(e, node.id)}
                            >
                                <div className={`
                                ${sizeClass} rounded-full flex items-center justify-center relative transition-all duration-200
                                ${isSelected ? 'ring-4 ring-[#c8aa6e] shadow-[0_0_20px_#c8aa6e]' : 'ring-2 ring-slate-700 hover:ring-slate-500'}
                                ${isSource ? 'ring-4 ring-blue-500 shadow-[0_0_20px_blue]' : ''}
                                bg-[#0b1120]
                            `}>
                                    <div className={`text-slate-400 ${isSelected ? 'text-[#c8aa6e]' : ''}`}>
                                        {getNodeIcon(node)}
                                    </div>
                                </div>

                                {/* Label */}
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-black/50 rounded text-[10px] font-bold uppercase text-slate-400 tracking-wider pointer-events-none">
                                    {node.label || node.type}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- BOTTOM TOOLBAR --- */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0b1120] border-2 border-[#c8aa6e] rounded-xl px-6 py-3 shadow-2xl z-50 flex items-center gap-6">

                {/* Main Tools */}
                <div className="flex items-center gap-2 pr-6 border-r border-[#c8aa6e]/30">
                    <button
                        onClick={() => { setActiveTool('SELECT'); setConnectionSource(null); }}
                        className={`p-3 rounded-lg transition-all ${activeTool === 'SELECT' ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        title="Mover y Seleccionar"
                    >
                        <Move className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setActiveTool('CONNECT'); setSelectedNodeId(null); }}
                        className={`p-3 rounded-lg transition-all ${activeTool === 'CONNECT' ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        title="Conectar Nodos"
                    >
                        <LinkIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setActiveTool('DELETE'); setSelectedNodeId(null); setConnectionSource(null); }}
                        className={`p-3 rounded-lg transition-all ${activeTool === 'DELETE' ? 'bg-red-600 text-white shadow-lg scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        title="Borrar Elementos"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Add Nodes Palette */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest mr-2">Añadir:</span>

                    {/* TREASURE (Clean icon) */}
                    <button onClick={() => handleAddNode('TREASURE')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 hover:border-yellow-200 hover:text-yellow-200 flex items-center justify-center transition-colors" title="Tesoro / Cofre">
                        <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleAddNode('ELITE')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 hover:border-red-500 hover:text-red-500 flex items-center justify-center transition-colors" title="Elite">
                        <Skull className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleAddNode('EVENT')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center transition-colors" title="Evento">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleAddNode('SHOP')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 hover:border-yellow-500 hover:text-yellow-500 flex items-center justify-center transition-colors" title="Tienda">
                        <ShoppingBag className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
                    <button onClick={() => handleAddNode('BOSS')} className="w-12 h-12 rounded-full bg-[#0b1120] border-2 border-red-900 text-red-500 hover:scale-110 flex items-center justify-center transition-transform shadow-lg" title="Jefe">
                        <Skull className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* --- PROPERTIES SIDEBAR --- */}
            {selectedNode && activeTool === 'SELECT' && (
                <div className="absolute top-20 right-8 w-72 bg-[#0b1120] border-2 border-[#c8aa6e] rounded-lg shadow-2xl p-5 z-50 animate-in slide-in-from-right">
                    <div className="flex items-center justify-between mb-4 border-b border-[#c8aa6e]/30 pb-2">
                        <h3 className="text-[#f0e6d2] font-fantasy tracking-widest flex items-center gap-2">
                            <Settings className="w-4 h-4 text-[#c8aa6e]" />
                            PROPIEDADES
                        </h3>
                        <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">ID</label>
                            <div className="text-slate-500 font-mono text-xs bg-black/30 p-2 rounded">{selectedNode.id}</div>
                        </div>

                        <div>
                            <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">Nombre / Etiqueta</label>
                            <input
                                type="text"
                                value={selectedNode.label || ''}
                                onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n))}
                                className="w-full bg-[#161f32] border border-slate-700 text-slate-200 text-xs p-2 rounded focus:border-[#c8aa6e] outline-none font-fantasy tracking-wide"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">Tipo</label>
                            <select
                                value={selectedNode.type}
                                onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, type: e.target.value } : n))}
                                className="w-full bg-[#161f32] border border-slate-700 text-slate-200 text-xs p-2 rounded focus:border-[#c8aa6e] outline-none"
                            >
                                <option value="START">Inicio</option>
                                <option value="COMBAT">Combate</option>
                                <option value="TREASURE">Tesoro</option>
                                <option value="ELITE">Elite</option>
                                <option value="EVENT">Evento</option>
                                <option value="SHOP">Tienda</option>
                                <option value="BOSS">Jefe</option>
                                <option value="CLASS_REWARD">Recompensa (Clase)</option>
                                <option value="TROPHY">Final</option>
                            </select>
                        </div>

                        {/* TREASURE SUBTYPE SELECTOR */}
                        {selectedNode.type === 'TREASURE' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">Contenido del Cofre</label>
                                <select
                                    value={selectedNode.subtype || 'GENERAL'}
                                    onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, subtype: e.target.value } : n))}
                                    className="w-full bg-[#161f32] border border-slate-700 text-slate-200 text-xs p-2 rounded focus:border-[#c8aa6e] outline-none"
                                >
                                    <option value="GENERAL">Cofre General (Sin especificar)</option>
                                    <option value="GOLD">Oro / Tesoro</option>
                                    <option value="WEAPON">Arma</option>
                                    <option value="ARMOR">Armadura</option>
                                    <option value="SCROLL">Pergamino</option>
                                    <option value="POTION">Consumible / Poción</option>
                                </select>
                            </div>
                        )}

                        {selectedNode.type === 'CLASS_REWARD' && (
                            <div>
                                <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">Clase Recompensa</label>
                                <select
                                    value={selectedNode.classId || ''}
                                    onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, classId: e.target.value } : n))}
                                    className="w-full bg-[#161f32] border border-slate-700 text-slate-200 text-xs p-2 rounded focus:border-[#c8aa6e] outline-none"
                                >
                                    <option value="">Seleccionar Clase...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider block mb-1">Estado</label>
                            <select
                                value={selectedNode.status}
                                onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, status: e.target.value } : n))}
                                className="w-full bg-[#161f32] border border-slate-700 text-slate-200 text-xs p-2 rounded focus:border-[#c8aa6e] outline-none"
                            >
                                <option value="LOCKED">Bloqueado</option>
                                <option value="AVAILABLE">Disponible</option>
                                <option value="COMPLETED">Completado</option>
                            </select>
                        </div>

                        <button
                            onClick={() => handleDelete(selectedNode.id)}
                            className="w-full py-2 bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 text-xs font-bold uppercase tracking-wider rounded mt-4 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-3 h-3" /> Eliminar Nodo
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CampaignMapView;
