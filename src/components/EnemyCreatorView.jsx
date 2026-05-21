import React, { useState, useRef } from 'react';
import { ChevronLeft, Save, Upload, User, Shield, Zap, Activity, Brain, Ghost, Skull, RotateCcw, ZoomIn, ZoomOut, Move, Minus, Plus } from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DEFAULT_STATS = {
    postura: { current: 3, max: 4 },
    vida: { current: 4, max: 4 },
    ingenio: { current: 2, max: 3 },
    cordura: { current: 3, max: 3 },
    armadura: { current: 1, max: 2 },
};

const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const CROP_MIN_ZOOM = 0.5;
const CROP_MAX_ZOOM = 3;
const STAT_MIN = 1;
const STAT_MAX = 50;

const clampStatValue = (value) => {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) return STAT_MIN;
    return Math.min(STAT_MAX, Math.max(STAT_MIN, numeric));
};

export const EnemyCreatorView = ({ onBack, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        subtitle: '', // AKA Type for enemies usually
        description: '',
        attributes: {
            dexterity: 'd4',
            vigor: 'd4',
            intellect: 'd4',
            willpower: 'd4'
        },
        cr: '0',
        role: 'Daño',
        image: null,
        currentLevel: 1,
        stats: JSON.parse(JSON.stringify(DEFAULT_STATS))
    });

    // Cropper State
    const [isCropping, setIsCropping] = useState(false);
    const [cropperState, setCropperState] = useState({
        imageSrc: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        refWidth: 300,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);
    const cropContainerRef = useRef(null);
    const imageRef = useRef(null);

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
        const nextValue = clampStatValue(value);
        setFormData(prev => ({
            ...prev,
            stats: {
                ...prev.stats,
                [statName]: { ...prev.stats[statName], [field]: nextValue, current: nextValue }
            }
        }));
    };

    const handleImageUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropperState({
                    imageSrc: reader.result,
                    crop: { x: 0, y: 0 },
                    zoom: 1,
                    refWidth: cropContainerRef.current?.clientWidth || 300,
                });
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleCropPointerDown = (event) => {
        if (!cropperState.imageSrc) return;
        event.preventDefault();
        const point = 'touches' in event ? event.touches[0] : event;
        setIsDragging(true);
        setDragStart({
            x: point.clientX - cropperState.crop.x,
            y: point.clientY - cropperState.crop.y,
        });
    };

    const handleCropPointerMove = (event) => {
        if (!isDragging) return;
        event.preventDefault();
        const point = 'touches' in event ? event.touches[0] : event;
        const currentWidth = cropContainerRef.current?.clientWidth || 300;
        setCropperState((prev) => ({
            ...prev,
            crop: {
                x: point.clientX - dragStart.x,
                y: point.clientY - dragStart.y,
            },
            refWidth: currentWidth,
        }));
    };

    const handleCropPointerUp = () => {
        setIsDragging(false);
    };

    const updateCropZoom = (nextZoom) => {
        const zoom = Math.min(CROP_MAX_ZOOM, Math.max(CROP_MIN_ZOOM, nextZoom));
        setCropperState((prev) => ({ ...prev, zoom }));
    };

    const handleCropWheel = (event) => {
        if (!cropperState.imageSrc) return;
        event.preventDefault();
        updateCropZoom(cropperState.zoom + (event.deltaY > 0 ? -0.05 : 0.05));
    };

    const generatePortraitImage = async () => {
        if (!cropperState.imageSrc || !imageRef.current) return formData.image;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return formData.image;

        const width = 600;
        const height = 900;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, width, height);

        const img = imageRef.current;
        const visualToCanvasRatio = width / (cropperState.refWidth || 300);

        ctx.translate(width / 2, height / 2);
        ctx.translate(cropperState.crop.x * visualToCanvasRatio, cropperState.crop.y * visualToCanvasRatio);
        ctx.scale(cropperState.zoom, cropperState.zoom);

        const imgAspectRatio = img.naturalHeight / img.naturalWidth;
        const drawWidth = width;
        const drawHeight = width * imgAspectRatio;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setIsDragging(false);
        setCropperState({
            imageSrc: null,
            crop: { x: 0, y: 0 },
            zoom: 1,
            refWidth: 300,
        });
    };

    const handleCropSave = async () => {
        const croppedImage = await generatePortraitImage();
        setFormData(prev => ({ ...prev, image: croppedImage }));
        setIsCropping(false);
    };

    const handleSave = async () => {
        if (!formData.name) {
            alert("Por favor, introduce un nombre para el enemigo.");
            return;
        }

        setIsSaving(true);

        try {
            const enemyId = `enemy-${Date.now()}`;
            let imageUrl = isCropping && cropperState.imageSrc
                ? await generatePortraitImage()
                : formData.image;

            // If image is a Base64 string (from cropper), upload it to Storage
            if (imageUrl && imageUrl.startsWith('data:')) {
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const imageRef = ref(storage, `enemies/${enemyId}/portrait.png`);
                    await uploadBytes(imageRef, blob);
                    imageUrl = await getDownloadURL(imageRef);
                } catch (uploadError) {
                    console.error("Error uploading image:", uploadError);
                    alert("Error al subir la imagen, se guardará sin ella.");
                    imageUrl = null;
                }
            }

            const newEnemy = {
                id: enemyId,
                name: formData.name,
                type: formData.subtitle || 'Desconocido', // Mapping subtitle to type
                description: formData.description || 'Sin descripción',
                attributes: formData.attributes,
                cr: formData.cr,
                role: formData.role,
                image: imageUrl,
                hp: formData.stats.vida.max, // Simplify HP for preview card
                ac: 10 + (formData.stats.armadura.max || 0), // Calc AC approx
                stats: formData.stats,
                tags: [],
                abilities: [],
                isNew: true
            };

            await onSave(newEnemy);
        } catch (error) {
            console.error("Error preparing enemy data:", error);
            alert("Ocurrió un error inesperado al preparar los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="absolute inset-0 overflow-x-hidden overflow-y-auto bg-[#050b14] p-4 text-slate-200 custom-scrollbar sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 border-b border-red-900/30 pb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                            <button onClick={onBack} className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-900/50 text-red-900/70 transition-colors hover:border-red-500 hover:text-red-500 sm:mt-0">
                                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="font-['Cinzel'] text-[2rem] leading-[1.05] text-red-100 uppercase sm:text-3xl">Crear Nuevo Enemigo</h1>
                                <p className="text-red-500/60 text-xs font-bold uppercase tracking-widest">Añade una amenaza al bestiario</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-sm bg-red-800 px-4 py-3 font-['Cinzel'] text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-red-700 sm:w-auto sm:px-8 sm:text-base ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                            <span className="truncate">{isSaving ? 'Guardando...' : 'Guardar Enemigo'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Left Column: Visuals */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div
                                className={`relative aspect-[3/4.5] bg-[#0b1120] rounded-lg border-2 border-dashed border-red-900/30 overflow-hidden group transition-all ${isCropping ? 'border-red-500/50 cursor-grab' : 'cursor-pointer hover:border-red-500 hover:bg-red-900/10'}`}
                                onClick={() => {
                                    if (!isCropping) fileInputRef.current?.click();
                                }}
                            >
                                {isCropping && cropperState.imageSrc ? (
                                    <div
                                        ref={cropContainerRef}
                                        className={`relative h-full w-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                        onMouseDown={handleCropPointerDown}
                                        onMouseMove={handleCropPointerMove}
                                        onMouseUp={handleCropPointerUp}
                                        onMouseLeave={handleCropPointerUp}
                                        onTouchStart={handleCropPointerDown}
                                        onTouchMove={handleCropPointerMove}
                                        onTouchEnd={handleCropPointerUp}
                                        onWheel={handleCropWheel}
                                    >
                                        <img
                                            ref={imageRef}
                                            src={cropperState.imageSrc}
                                            alt="Preview"
                                            draggable={false}
                                            crossOrigin="anonymous"
                                            className="absolute max-w-none origin-center pointer-events-none select-none transition-transform duration-75 ease-out"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                width: '100%',
                                                height: 'auto',
                                                transform: `translate(-50%, -50%) translate(${cropperState.crop.x}px, ${cropperState.crop.y}px) scale(${cropperState.zoom})`,
                                            }}
                                        />
                                        <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 opacity-20">
                                            <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                            <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                                            <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                                        </div>
                                        <div className="pointer-events-none absolute inset-0 z-20 border-[4px] border-red-500/70"></div>
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex h-[35%] items-end justify-center bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent pb-6">
                                            <div className="rounded border border-red-400/20 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-red-200/30">Zona Texto</div>
                                        </div>
                                        <div className="absolute right-2 top-2 z-30 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    fileInputRef.current?.click();
                                                }}
                                                className="rounded-full border border-white/10 bg-black/60 p-1.5 text-slate-300 backdrop-blur hover:border-red-500 hover:text-white"
                                                aria-label="Cambiar imagen"
                                            >
                                                <Upload className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setCropperState((prev) => ({
                                                        ...prev,
                                                        crop: { x: 0, y: 0 },
                                                        zoom: 1,
                                                    }));
                                                }}
                                                className="rounded-full border border-white/10 bg-black/60 p-1.5 text-slate-300 backdrop-blur hover:border-red-500 hover:text-white"
                                                aria-label="Centrar imagen"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : formData.image ? (
                                    <img src={formData.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                                        <Upload className="w-12 h-12 text-red-700 group-hover:text-red-500 transition-colors mx-auto mb-4" />
                                        <p className="text-sm font-bold uppercase tracking-widest text-red-200 mb-2">Subir Imagen</p>
                                        <p className="text-xs text-red-500/60">Click para seleccionar</p>
                                    </div>
                                )}
                                {!isCropping && formData.image && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold uppercase tracking-wider text-sm bg-red-900/80 px-3 py-1 rounded backdrop-blur-sm">Cambiar Imagen</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            {isCropping && (
                                <div className="rounded border border-red-900/30 bg-[#0a101d]/90 p-4 shadow-xl">
                                    <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-red-400">
                                        <div className="flex items-center gap-2">
                                            <Move className="h-3 w-3" /> Zoom
                                        </div>
                                        <div>{(cropperState.zoom * 100).toFixed(0)}%</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateCropZoom(cropperState.zoom - 0.1)}
                                            className="text-slate-500 transition hover:text-red-400"
                                            aria-label="Reducir zoom"
                                        >
                                            <ZoomOut className="h-4 w-4" />
                                        </button>
                                        <input
                                            type="range"
                                            min={CROP_MIN_ZOOM}
                                            max={CROP_MAX_ZOOM}
                                            step="0.05"
                                            value={cropperState.zoom}
                                            onChange={(event) => updateCropZoom(Number(event.target.value))}
                                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-red-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateCropZoom(cropperState.zoom + 0.1)}
                                            className="text-slate-500 transition hover:text-red-400"
                                            aria-label="Aumentar zoom"
                                        >
                                            <ZoomIn className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex gap-2 border-t border-red-900/30 pt-3">
                                        <button
                                            type="button"
                                            onClick={handleCropCancel}
                                            className="flex-1 border border-slate-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCropSave}
                                            className="flex-1 bg-red-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-red-900/30 transition hover:bg-red-600"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle & Right: Form Data */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Basic Info */}
                        <div className="bg-[#0a101d] p-6 rounded border border-red-900/20">
                            <h3 className="text-red-500 font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Skull className="w-5 h-5" /> Información Básica
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">Nombre del Enemigo</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-[#050b14] border border-red-900/30 p-3 rounded text-red-50 font-['Cinzel'] text-lg focus:border-red-500 outline-none placeholder-red-900/30" placeholder="Ej: SEÑOR DE LOS MUERTOS" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">Tipo / Raza</label>
                                    <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} className="w-full bg-[#050b14] border border-red-900/30 p-3 rounded text-red-200 text-sm tracking-wider focus:border-red-500 outline-none placeholder-red-900/30" placeholder="Ej: No-Muerto" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">Descripción</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-[#050b14] border border-red-900/30 p-3 rounded text-red-200/80 text-sm h-24 focus:border-red-500 outline-none resize-none placeholder-red-900/30" placeholder="Breve descripción o lore..." />
                                </div>
                            </div>
                        </div>

                        {/* Combat Specs */}
                        <div className="bg-[#0a101d] p-6 rounded border border-red-900/20">
                            <h3 className="text-red-500 font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> Especificaciones de Combate
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">Rol</label>
                                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-[#050b14] border border-red-900/30 p-2.5 rounded text-red-200 text-sm focus:border-red-500 outline-none">
                                        <option value="Tanque">Tanque</option>
                                        <option value="Daño">Daño</option>
                                        <option value="Apoyo">Apoyo</option>
                                        <option value="Utilidad">Utilidad</option>
                                        <option value="Minion">Minion</option>
                                        <option value="Jefe">Jefe</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">CR (Desafío)</label>
                                    <input type="text" name="cr" value={formData.cr} onChange={handleInputChange} className="w-full bg-[#050b14] border border-red-900/30 p-2.5 rounded text-red-200 text-sm focus:border-red-500 outline-none" placeholder="Ej: 5" />
                                </div>
                                {/* Attributes Selection */}
                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                    {[
                                        { key: 'dexterity', label: 'DESTREZA' },
                                        { key: 'vigor', label: 'VIGOR' },
                                        { key: 'intellect', label: 'INTELECTO' },
                                        { key: 'willpower', label: 'VOLUNTAD' }
                                    ].map(({ key, label }) => (
                                        <div key={key}>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-red-400/60 mb-1">{label}</label>
                                            <select
                                                value={formData.attributes[key]}
                                                onChange={(e) => handleAttributeChange(key, e.target.value)}
                                                className="w-full bg-[#050b14] border border-red-900/30 p-2.5 rounded text-red-200 text-sm focus:border-red-500 outline-none"
                                            >
                                                {DICE_OPTIONS.map(dice => (
                                                    <option key={dice} value={dice}>{dice}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stats Config */}
                        <div className="bg-[#0a101d] p-6 rounded border border-red-900/20">
                            <h3 className="text-red-500 font-['Cinzel'] text-lg mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Configuración de Estadísticas
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                                {[
                                    { id: 'postura', label: 'Postura', icon: <Shield className="w-4 h-4 text-green-500" /> },
                                    { id: 'vida', label: 'Vida', icon: <Activity className="w-4 h-4 text-red-500" /> },
                                    { id: 'ingenio', label: 'Ingenio', icon: <Zap className="w-4 h-4 text-blue-500" /> },
                                    { id: 'cordura', label: 'Cordura', icon: <Brain className="w-4 h-4 text-purple-500" /> },
                                    { id: 'armadura', label: 'Armadura', icon: <Ghost className="w-4 h-4 text-slate-500" /> },
                                ].map((stat) => (
                                    <div key={stat.id} className="bg-[#050b14] p-4 sm:p-3 rounded border border-red-900/30 text-center group hover:border-red-500/50 transition-colors">
                                        <div className="flex justify-center mb-2">{stat.icon}</div>
                                        <label className="block text-[10px] font-bold uppercase text-red-400/60 mb-2">{stat.label}</label>
                                        <div className="mx-auto grid h-12 w-full max-w-[10rem] grid-cols-[2.75rem_minmax(3rem,1fr)_2.75rem] overflow-hidden rounded-xl border border-red-900/40 bg-[#080d17] shadow-[inset_0_0_18px_rgba(0,0,0,0.35)] focus-within:border-red-500/70 xl:max-w-[6.25rem] xl:grid-cols-[2rem_2.25rem_2rem]">
                                            <button
                                                type="button"
                                                onClick={() => handleStatChange(stat.id, 'max', formData.stats[stat.id].max - 1)}
                                                className="flex h-full items-center justify-center border-r border-red-900/35 text-red-300 transition hover:bg-red-950/50 hover:text-red-100 active:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-35"
                                                disabled={formData.stats[stat.id].max <= STAT_MIN}
                                                aria-label={`Reducir ${stat.label}`}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <input
                                                type="number"
                                                min={STAT_MIN}
                                                max={STAT_MAX}
                                                inputMode="numeric"
                                                value={formData.stats[stat.id].max}
                                                onChange={(e) => {
                                                    if (/^\d{0,2}$/.test(e.target.value)) {
                                                        handleStatChange(stat.id, 'max', e.target.value);
                                                    }
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                className="h-full w-full border-0 bg-[#0d1422] px-1 text-center font-mono text-xl font-black leading-none text-white opacity-100 outline-none [appearance:textfield] [-moz-appearance:textfield] placeholder:text-red-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                aria-label={`${stat.label} máximo`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleStatChange(stat.id, 'max', formData.stats[stat.id].max + 1)}
                                                className="flex h-full items-center justify-center border-l border-red-900/35 text-red-300 transition hover:bg-red-950/50 hover:text-red-100 active:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-35"
                                                disabled={formData.stats[stat.id].max >= STAT_MAX}
                                                aria-label={`Aumentar ${stat.label}`}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
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
