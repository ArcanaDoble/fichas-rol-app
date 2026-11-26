import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Save, Upload, User, Shield, Brain, Heart, Footprints, Dices, LayoutTemplate, CircleUser, Move, ZoomIn, ZoomOut, RotateCcw, Eye, Image as ImageIcon } from 'lucide-react';
import DiceSelector from './ActionDiceSelector';
import { CAMPAIGN_SYSTEM_ID, createEmptyCampaignSheet } from '../features/campaign/characterSheet';
import './CampaignStats.css';

export const CharacterCreatorView = ({ onBack, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        subtitle: '',
        description: '',
        image: null,
    });

    const [campaignSheet, setCampaignSheet] = useState(() => createEmptyCampaignSheet({}));
    const [saveError, setSaveError] = useState('');

    // --- IMAGE CROPPER STATE ---
    const [rawImage, setRawImage] = useState(null);
    const [activeMode, setActiveMode] = useState('CARD');
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

    const handleInitialStatChange = (key, rawValue) => {
        if (!/^\d*$/.test(rawValue)) return;
        const value = rawValue === '' ? null : Number(rawValue);
        if (value !== null && !Number.isSafeInteger(value)) return;
        setCampaignSheet(previous => ({
            ...previous,
            [key]: ['vida', 'mente'].includes(key) ? { current: value, max: value } : value,
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

        const width = mode === 'CARD' ? 600 : 256;
        const height = mode === 'CARD' ? 900 : 256;
        const cropState = mode === 'CARD' ? cardCrop : avatarCrop;
        const zoomState = mode === 'CARD' ? cardZoom : avatarZoom;

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, width, height);

        const img = imageRef.current;
        const domWidth = cropState.refWidth || containerRef.current?.clientWidth || 300;
        const visualToCanvasRatio = width / domWidth;

        ctx.translate(width / 2, height / 2);
        ctx.translate(cropState.x * visualToCanvasRatio, cropState.y * visualToCanvasRatio);
        ctx.scale(zoomState, zoomState);

        const imgAspectRatio = img.naturalHeight / img.naturalWidth;
        const drawWidth = width;
        const drawHeight = width * imgAspectRatio;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setSaveError('Introduce el nombre del personaje.');
            return;
        }

        setSaveError('');
        setIsSaving(true);
        try {
            let finalImage = formData.image;
            let finalAvatar = formData.image;

            if (rawImage) {
                finalImage = await generateImage('CARD');
                finalAvatar = await generateImage('AVATAR');
            }

            const newCharacter = {
                id: `char-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: formData.name.trim(),
                systemId: CAMPAIGN_SYSTEM_ID,
                subtitle: formData.subtitle || 'Aventurero',
                description: formData.description || 'Sin descripción',
                image: finalImage,
                avatar: finalAvatar,
                portraitSource: rawImage || formData.image,
                level: 1,
                equipment: { weapons: [], armor: [], abilities: [], objects: [], accessories: [] },
                talents: { title: '', description: '', slots: [null, null, null] },
                skills: { slots: [null, null, null] },
                features: [],
                actionData: { movement: [], action: [], bonus: [], reaction: [] },
                money: 0,
                inspiration: [],
                rules: [],
                summary: {
                    highlights: []
                }
            };

            await onSave(newCharacter, campaignSheet);
        } catch (error) {
            console.error("Error al crear personaje:", error);
            setSaveError('No se pudo guardar el personaje. Tus cambios siguen aquí; vuelve a intentarlo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#09090b] text-slate-200 overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#c8aa6e]/30 pb-6">
                    <div className="flex items-center gap-4">
                        <button aria-label="Volver a personajes" onClick={onBack} className="p-2 rounded-full border border-slate-700 hover:border-[#c8aa6e] text-slate-400 hover:text-[#c8aa6e] transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-3xl font-['Cinzel'] text-[#f0e6d2]">CREAR NUEVO PERSONAJE</h1>
                            <p className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest">Ficha de personaje · Campaña</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-5 md:px-8 py-3 font-bold font-['Cinzel'] uppercase tracking-wider rounded-sm shadow-lg transition-all ${isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-[#c8aa6e] hover:bg-[#d97706] text-[#0b1120]'}`}
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                Guardando...
                            </div>
                        ) : (
                            <><Save className="w-5 h-5" /> Guardar Personaje</>
                        )}
                    </button>
                </div>

                {saveError && <p role="alert" className="mb-6 border-l-2 border-red-400 px-3 py-2 text-sm text-red-200">{saveError}</p>}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
                    {/* Left Column: ADVANCED IMAGE EDITOR */}
                    <div className="space-y-6">
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

                        <div className={`relative w-full bg-[#0b1120] rounded-sm border border-slate-800 overflow-hidden shadow-2xl group ring-1 ring-slate-700 transition-all duration-300 ${activeMode === 'CARD' ? 'aspect-[2/3]' : 'aspect-square max-w-[300px] mx-auto'}`}>
                            {rawImage ? (
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
                                    {showGuides && activeMode === 'CARD' && (
                                        <>
                                            <div className="absolute inset-0 border-[4px] border-[#c8aa6e] z-20 pointer-events-none opacity-80"></div>
                                            <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent z-20 pointer-events-none flex items-end justify-center pb-6">
                                                <div className="text-[#c8aa6e]/30 text-[10px] uppercase font-bold tracking-widest border border-[#c8aa6e]/20 px-2 py-1 rounded">Zona Texto</div>
                                            </div>
                                        </>
                                    )}
                                    {showGuides && activeMode === 'AVATAR' && (
                                        <>
                                            <div className="absolute inset-0 z-20 pointer-events-none border-[2px] border-[#c8aa6e]/50 rounded-full"></div>
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

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />

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
                            </div>
                        )}
                    </div>

                    {/* Middle & Right: Form Data */}
                    <div className="lg:col-span-2 space-y-8">

                        <div className="bg-[#161f32]/50 p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" /> Información Básica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="character-create-name" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Nombre del Personaje</label>
                                    <input type="text" id="character-create-name" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-[#f0e6d2] font-['Cinzel'] text-lg focus:border-[#c8aa6e] outline-none" placeholder="Ej: CUATRO TORRES" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="character-create-subtitle" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Concepto / Título</label>
                                    <input type="text" id="character-create-subtitle" name="subtitle" value={formData.subtitle} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-slate-300 text-sm tracking-wider focus:border-[#c8aa6e] outline-none" placeholder="Ej: EL CABALLERO DE LAS TRES ESPADAS" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="character-create-description" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Descripción</label>
                                    <textarea id="character-create-description" name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-[#0b1120] border border-slate-700 p-3 rounded text-slate-400 text-sm h-24 focus:border-[#c8aa6e] outline-none resize-none" placeholder="Breve historia o descripción visual..." />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#161f32]/50 p-4 md:p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Dices className="w-5 h-5" /> Dados de acción
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {campaignSheet.actionDice.map((die, index) => (
                                    <div key={index} className="flex flex-col items-center gap-2 py-3 bg-[#0b1120] border border-slate-800 rounded">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Dado {index + 1}</span>
                                        <DiceSelector value={die} allowUnset ariaLabel={`Dado de acción ${index + 1}`}
                                            menuAlign={index === 0 ? 'start' : index === 2 ? 'end' : 'center'}
                                            onChange={(value) => setCampaignSheet(previous => ({
                                                ...previous,
                                                actionDice: previous.actionDice.map((entry, dieIndex) => dieIndex === index ? value : entry),
                                            }))} />
                                        <span className="text-xs font-bold uppercase text-[#c8aa6e]">{die || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#161f32]/50 p-4 md:p-6 rounded border border-slate-700">
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg mb-2">Estadísticas iniciales</h3>
                            <p className="text-sm text-slate-400 mb-4">Vida y Mente empiezan al máximo indicado. Puedes dejar valores sin definir y editarlos después en tu ficha.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { id: 'vida', label: 'Vida', Icon: Heart, color: '#e7a5ad' },
                                    { id: 'mente', label: 'Mente', Icon: Brain, color: '#bfa5df' },
                                    { id: 'movilidad', label: 'Movilidad', Icon: Footprints, color: '#89c4e4' },
                                    { id: 'armaduraRd', label: 'Armadura · RD', Icon: Shield, color: '#b9b5ad' },
                                ].map(({ id, label, Icon, color }) => (
                                    <label key={id} className="flex flex-col items-center gap-2 border-b border-[#c8aa6e]/20 pb-2">
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <Icon className="w-4 h-4" style={{ color }} />{label}
                                        </span>
                                        <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off"
                                            aria-label={label} placeholder="—" className="campaign-stat-number"
                                            value={(['vida', 'mente'].includes(id) ? campaignSheet[id].max : campaignSheet[id]) ?? ''}
                                            onChange={(event) => handleInitialStatChange(id, event.target.value)} />
                                    </label>
                                ))}
                            </div>
                            <p className="text-sm text-slate-400 mt-5">Al guardar se abrirá tu ficha para añadir equipo, claves y talentos.</p>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );
};
