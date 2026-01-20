import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, Save, Upload, User, Shield, Zap, Activity, Brain, Ghost, LayoutTemplate, CircleUser, Move, ZoomIn, ZoomOut, RotateCcw, Eye, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const DEFAULT_STATS = {
    postura: { current: 3, max: 4 },
    vida: { current: 4, max: 4 },
    ingenio: { current: 2, max: 3 },
    cordura: { current: 3, max: 3 },
    armadura: { current: 1, max: 2 },
};

const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12'];

const DiceSelector = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-[50px] h-[50px] transition-transform hover:scale-110 focus:outline-none"
            >
                <img
                    src={`/dados/${value.toUpperCase()}.png`}
                    alt={value}
                    className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(200,170,110,0.5)]"
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#0f172a] border border-[#c8aa6e]/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 p-2 grid grid-cols-5 gap-x-1 gap-y-0 w-[210px] backdrop-blur-md"
                    >
                        {DICE_OPTIONS.map((dice) => {
                            const gridPos = {
                                'd4': 'col-start-1 row-start-1',
                                'd10': 'col-start-2 row-start-2',
                                'd6': 'col-start-3 row-start-1',
                                'd12': 'col-start-4 row-start-2',
                                'd8': 'col-start-5 row-start-1',
                            }[dice];

                            return (
                                <button
                                    key={dice}
                                    onClick={() => {
                                        onChange(dice);
                                        setIsOpen(false);
                                    }}
                                    className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-200 group ${gridPos} ${value === dice ? 'bg-[#c8aa6e]/20 border border-[#c8aa6e]/50' : 'hover:bg-[#c8aa6e]/10 border border-transparent'}`}
                                >
                                    <div className="w-8 h-8 mb-0.5 transition-transform group-hover:scale-110">
                                        <img src={`/dados/${dice.toUpperCase()}.png`} alt={dice} className="w-full h-full object-contain" />
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${value === dice ? 'text-[#c8aa6e]' : 'text-slate-400 group-hover:text-[#c8aa6e]'}`}>
                                        {dice.toUpperCase()}
                                    </span>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};



export const ClassCreatorView = ({ onBack, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        subtitle: '',
        description: '',
        attributes: {
            destreza: 'd4',
            vigor: 'd4',
            intelecto: 'd4',
            voluntad: 'd4'
        },
        primaryAbility: '',
        difficulty: 'Medio',
        role: 'Daño',
        image: null,
        starLevel: 1,
        currentLevel: 1,
        isUnlocked: true,
        stats: JSON.parse(JSON.stringify(DEFAULT_STATS))
    });

    // --- IMAGE CROPPER STATE ---
    const [rawImage, setRawImage] = useState(null);

    // Two separate crop states
    const [activeMode, setActiveMode] = useState('CARD'); // 'CARD' | 'AVATAR'

    const [cardCrop, setCardCrop] = useState({ x: 0, y: 0 });
    const [cardZoom, setCardZoom] = useState(1);

    const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
    const [avatarZoom, setAvatarZoom] = useState(1);

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showGuides, setShowGuides] = useState(true);

    const fileInputRef = useRef(null);
    const imageRef = useRef(null);
    const containerRef = useRef(null);

    // Derived state helpers
    const currentCrop = activeMode === 'CARD' ? cardCrop : avatarCrop;
    const currentZoom = activeMode === 'CARD' ? cardZoom : avatarZoom;
    const setCrop = activeMode === 'CARD' ? setCardCrop : setAvatarCrop;
    const setZoom = activeMode === 'CARD' ? setCardZoom : setAvatarZoom;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAttributeChange = (attr, value) => {
        setFormData(prev => ({
            ...prev,
            attributes: {
                ...prev.attributes,
                [attr]: value
            }
        }));
    };

    const handleStatChange = (statName, field, value) => {
        setFormData(prev => ({
            ...prev,
            stats: {
                ...prev.stats,
                [statName]: { ...prev.stats[statName], [field]: Number(value), current: Number(value) }
            }
        }));
    };

    // --- HANDLERS: IMAGE ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                setRawImage(reader.result);
                const initialWidth = containerRef.current?.clientWidth || 300;
                setCardCrop({ x: 0, y: 0, refWidth: initialWidth });
                setCardZoom(1);
                setAvatarCrop({ x: 0, y: 0, refWidth: initialWidth });
                setAvatarZoom(1);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleMouseDown = (e) => {
        if (!rawImage) return;
        e.preventDefault();
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - currentCrop.x, y: clientY - currentCrop.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const currentWidth = containerRef.current?.clientWidth || 300;
        setCrop({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y,
            refWidth: currentWidth
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Use effect for non-passive wheel listener to prevent scrolling
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            if (!rawImage) return;
            e.preventDefault();
            const zoomSpeed = 0.1;
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            setZoom(prev => Math.min(3, Math.max(0.5, prev + delta)));
        };

        container.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, [rawImage, setZoom]);

    // --- CANVAS GENERATION ---
    const generateImage = async (mode) => {
        if (!rawImage || !imageRef.current) return formData.image;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return formData.image;

        // Config depends on mode
        const width = mode === 'CARD' ? 600 : 256;
        const height = mode === 'CARD' ? 900 : 256;
        const cropState = mode === 'CARD' ? cardCrop : avatarCrop;
        const zoomState = mode === 'CARD' ? cardZoom : avatarZoom;

        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, width, height);

        const img = imageRef.current;

        // Calculate Scale Ratio (Visual vs Actual Canvas)
        const domWidth = cropState.refWidth || containerRef.current?.clientWidth || 300;
        const visualToCanvasRatio = width / domWidth;

        ctx.translate(width / 2, height / 2);
        ctx.translate(cropState.x * visualToCanvasRatio, cropState.y * visualToCanvasRatio);
        ctx.scale(zoomState, zoomState);

        // Draw Logic
        // Determine image aspect ratio
        const imgAspectRatio = img.naturalHeight / img.naturalWidth;
        const drawWidth = width;
        const drawHeight = width * imgAspectRatio; // Base scaling on width

        // If the image is extremely detailed or large, we might want to ensure quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const handleSave = async () => {
        if (!formData.name) return;

        let finalImage = formData.image;
        let finalAvatar = formData.image; // Fallback if no crop

        if (rawImage) {
            finalImage = await generateImage('CARD');
            finalAvatar = await generateImage('AVATAR');
        }

        const newClass = {
            id: `custom-${Date.now()}`,
            name: formData.name,
            subtitle: formData.subtitle || 'Campeón Personalizado',
            description: formData.description || 'Sin descripción',
            attributes: formData.attributes,
            primaryAbility: formData.primaryAbility,
            difficulty: formData.difficulty,
            role: formData.role,
            image: finalImage,
            avatar: finalAvatar,
            portraitSource: rawImage || formData.image,
            rating: Number(formData.starLevel),
            level: 1,
            status: 'unlocked',
            stats: formData.stats,
            equipment: { weapons: [], armor: [], abilities: [] },
            money: 0,
            inspiration: [],
            rules: [],
            summary: {
                highlights: []
            }
        };

        onSave(newClass);
    };

    return (
        <div className="w-full h-full bg-[#09090b] text-slate-200 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b border-[#c8aa6e]/30 pb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full border border-slate-700 hover:border-[#c8aa6e] text-slate-400 hover:text-[#c8aa6e] transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-['Cinzel'] text-[#f0e6d2]">CREAR NUEVA CLASE</h1>
                            <p className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest">Forja tu leyenda</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-8 py-3 bg-[#c8aa6e] hover:bg-[#d97706] text-[#0b1120] font-bold font-['Cinzel'] uppercase tracking-wider rounded-sm shadow-lg transition-all"
                    >
                        <Save className="w-5 h-5" /> Guardar Clase
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Left Column: ADVANCED IMAGE EDITOR */}
                    <div className="space-y-6">

                        {/* CROP MODE TABS */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveMode('CARD')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded border ${activeMode === 'CARD' ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-[#0b1120] text-slate-500 border-slate-800 hover:border-slate-600'}`}
                            >
                                <LayoutTemplate className="w-4 h-4" /> Portada (Carta)
                            </button>
                            <button
                                onClick={() => setActiveMode('AVATAR')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded border ${activeMode === 'AVATAR' ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-[#0b1120] text-slate-500 border-slate-800 hover:border-slate-600'}`}
                            >
                                <CircleUser className="w-4 h-4" /> Icono (Avatar)
                            </button>
                        </div>

                        {/* EDITOR CONTAINER */}
                        {/* Aspect Ratio Changes Dynamically */}
                        <div
                            className={`relative w-full bg-[#0b1120] rounded-sm border border-slate-800 overflow-hidden shadow-2xl group ring-1 ring-slate-700 transition-all duration-300 ${activeMode === 'CARD' ? 'aspect-[2/3]' : 'aspect-square max-w-[300px] mx-auto'}`}
                        >

                            {rawImage ? (
                                // INTERACTIVE CROP AREA
                                <div
                                    ref={containerRef}
                                    className={`w-full h-full relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onTouchStart={handleMouseDown}
                                    onTouchMove={handleMouseMove}
                                    onTouchEnd={handleMouseUp}

                                >
                                    <img
                                        ref={imageRef}
                                        src={rawImage}
                                        alt="Preview"
                                        draggable={false}
                                        className="absolute max-w-none origin-center pointer-events-none select-none transition-transform duration-75 ease-out"
                                        style={{
                                            left: '50%',
                                            top: '50%',
                                            width: '100%',
                                            height: 'auto',
                                            transform: `translate(-50%, -50%) translate(${currentCrop.x}px, ${currentCrop.y}px) scale(${currentZoom})`,
                                        }}
                                    />

                                    {/* --- OVERLAY GUIDES --- */}
                                    {showGuides && activeMode === 'CARD' && (
                                        <>
                                            <div className="absolute inset-0 border-[4px] border-[#c8aa6e] z-20 pointer-events-none opacity-80"></div>
                                            <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent z-20 pointer-events-none flex items-end justify-center pb-6">
                                                <div className="text-[#c8aa6e]/30 text-[10px] uppercase font-bold tracking-widest border border-[#c8aa6e]/20 px-2 py-1 rounded">Zona Texto</div>
                                            </div>
                                            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
                                                <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                                <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                                <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                                            </div>
                                        </>
                                    )}

                                    {showGuides && activeMode === 'AVATAR' && (
                                        <>
                                            {/* Circular Mask Overlay */}
                                            <div className="absolute inset-0 z-20 pointer-events-none border-[2px] border-[#c8aa6e]/50 rounded-full"></div>
                                            {/* Simple SVG mask is better for circle cutout */}
                                            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <defs>
                                                    <mask id="circleMask">
                                                        <rect width="100" height="100" fill="white" />
                                                        <circle cx="50" cy="50" r="48" fill="black" />
                                                    </mask>
                                                </defs>
                                                <rect width="100" height="100" fill="rgba(0,0,0,0.7)" mask="url(#circleMask)" />
                                            </svg>
                                        </>
                                    )}
                                </div>
                            ) : (
                                // UPLOAD PLACEHOLDER
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#c8aa6e]/5 transition-colors z-30"
                                >
                                    <div className="w-16 h-16 rounded-full bg-[#161f32] border border-[#c8aa6e]/50 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(200,170,110,0.2)]">
                                        <ImageIcon className="w-8 h-8 text-[#c8aa6e]" />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest text-[#f0e6d2]">Subir Imagen</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Click para explorar</p>
                                </div>
                            )}

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />

                            {/* Overlay Controls */}
                            {rawImage && (
                                <div className="absolute top-2 right-2 flex gap-2 z-30">
                                    <button
                                        onClick={() => setShowGuides(!showGuides)}
                                        className={`p-2 backdrop-blur rounded-full border transition-colors ${showGuides ? 'bg-[#c8aa6e]/20 border-[#c8aa6e] text-[#c8aa6e]' : 'bg-black/60 border-white/10 text-slate-400'}`}
                                        title="Alternar Guías"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 bg-black/60 backdrop-blur rounded-full text-slate-300 hover:text-white border border-white/10 hover:border-[#c8aa6e]"
                                        title="Cambiar Imagen"
                                    >
                                        <Upload className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}
                                        className="p-2 bg-black/60 backdrop-blur rounded-full text-slate-300 hover:text-white border border-white/10 hover:border-[#c8aa6e]"
                                        title="Resetear Posición"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ZOOM CONTROLS */}
                        {rawImage && (
                            <div className="bg-[#161f32]/50 p-4 rounded border border-slate-700 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-2"><Move className="w-3 h-3" /> Ajuste Visual ({activeMode === 'CARD' ? 'Carta' : 'Avatar'})</div>
                                    <div className="text-[#c8aa6e]">{(currentZoom * 100).toFixed(0)}%</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ZoomOut className="w-4 h-4 text-slate-500" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} cursor="pointer" />
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.05"
                                        value={currentZoom}
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                    />
                                    <ZoomIn className="w-4 h-4 text-slate-500" onClick={() => setZoom(z => Math.min(3, z + 0.1))} cursor="pointer" />
                                </div>
                                <p className="text-[10px] text-slate-500 text-center pt-2 italic">
                                    {activeMode === 'CARD' ? 'Ajusta para la carta principal.' : 'Ajusta para el círculo de perfil.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Middle & Right: Form Data */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Basic Info */}
                        <div className="bg-[#161f32]/50 p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" /> Información Básica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Nombre de la Clase</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-[#f0e6d2] font-['Cinzel'] text-lg focus:border-[#c8aa6e] outline-none" placeholder="Ej: CABALLERO OSCURO" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Subtítulo / Epíteto</label>
                                    <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-slate-300 text-sm tracking-wider focus:border-[#c8aa6e] outline-none" placeholder="Ej: EL ESCUDO INQUEBRANTABLE" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Descripción</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-slate-400 text-sm h-24 focus:border-[#c8aa6e] outline-none resize-none" placeholder="Breve historia o descripción..." />
                                </div>
                            </div>
                        </div>

                        {/* Combat Specs */}
                        <div className="bg-[#161f32]/50 p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> Especificaciones de Combate
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Rol</label>
                                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-2.5 rounded text-slate-200 text-sm focus:border-[#c8aa6e] outline-none">
                                        <option value="Tanque">Tanque</option>
                                        <option value="Daño">Daño</option>
                                        <option value="Apoyo">Apoyo</option>
                                        <option value="Utilidad">Utilidad</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Dificultad</label>
                                    <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-2.5 rounded text-slate-200 text-sm focus:border-[#c8aa6e] outline-none">
                                        <option value="Fácil">Fácil</option>
                                        <option value="Medio">Medio</option>
                                        <option value="Difícil">Difícil</option>
                                    </select>
                                </div>
                                {/* Attributes Selection */}
                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                    {['destreza', 'vigor', 'intelecto', 'voluntad'].map(attr => (
                                        <div key={attr} className="flex flex-col items-center">
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 capitalize">{attr}</label>
                                            <DiceSelector
                                                value={formData.attributes[attr]}
                                                onChange={(val) => handleAttributeChange(attr, val)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stats Config */}
                        <div className="bg-[#161f32]/50 p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Configuración de Estadísticas (Max Bloques)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {[
                                    { id: 'postura', label: 'Postura', icon: <Shield className="w-4 h-4 text-green-400" /> },
                                    { id: 'vida', label: 'Vida', icon: <Activity className="w-4 h-4 text-red-400" /> },
                                    { id: 'ingenio', label: 'Ingenio', icon: <Zap className="w-4 h-4 text-blue-400" /> },
                                    { id: 'cordura', label: 'Cordura', icon: <Brain className="w-4 h-4 text-purple-400" /> },
                                    { id: 'armadura', label: 'Armadura', icon: <Ghost className="w-4 h-4 text-slate-400" /> },
                                ].map((stat) => (
                                    <div key={stat.id} className="bg-[#0b1120] p-3 rounded border border-slate-800 text-center">
                                        <div className="flex justify-center mb-2">{stat.icon}</div>
                                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">{stat.label}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={formData.stats[stat.id].max}
                                            onChange={(e) => handleStatChange(stat.id, 'max', parseInt(e.target.value))}
                                            className="w-12 mx-auto bg-slate-800 border-none rounded text-center text-[#f0e6d2] font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );
};
