import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, Save, Upload, User, Shield, Zap, Activity, Brain, Ghost, Plus } from 'lucide-react';
import Cropper from 'react-easy-crop';
import Modal from './Modal';
import Boton from './Boton';

const DEFAULT_STATS = {
    postura: { current: 3, max: 4 },
    vida: { current: 4, max: 4 },
    ingenio: { current: 2, max: 3 },
    cordura: { current: 3, max: 3 },
    armadura: { current: 1, max: 2 },
};

const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImage = async (imageSrc, crop) => {
    if (!imageSrc || !crop) return null;
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    return canvas.toDataURL('image/png');
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
        primaryAbility: '', // Keeping this as it might be used for something else or legacy
        difficulty: 'Medio',
        role: 'Daño',
        image: null,
        starLevel: 1,
        currentLevel: 1,
        isUnlocked: true,
        stats: JSON.parse(JSON.stringify(DEFAULT_STATS))
    });

    // Cropper State
    const [isCropping, setIsCropping] = useState(false);
    const [cropperState, setCropperState] = useState({
        imageSrc: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
    });
    const fileInputRef = useRef(null);

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

    const handleImageUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropperState(prev => ({ ...prev, imageSrc: reader.result }));
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCropperState((prev) => ({ ...prev, croppedAreaPixels }));
    }, []);

    const handleCropSave = async () => {
        try {
            const croppedImage = await getCroppedImage(
                cropperState.imageSrc,
                cropperState.croppedAreaPixels
            );
            setFormData(prev => ({ ...prev, image: croppedImage }));
            setIsCropping(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = () => {
        if (!formData.name) return;

        const newClass = {
            id: `custom-${Date.now()}`,
            name: formData.name,
            subtitle: formData.subtitle || 'Campeón Personalizado',
            description: formData.description || 'Sin descripción',
            attributes: formData.attributes,
            primaryAbility: formData.primaryAbility, // Optional
            difficulty: formData.difficulty,
            role: formData.role,
            image: formData.image, // Base64 or URL
            rating: Number(formData.starLevel), // Using 'rating' to match ClassList.jsx
            level: 1, // Using 'level' to match ClassList.jsx
            status: 'unlocked', // Using 'status' to match ClassList.jsx
            stats: formData.stats,
            equipment: { weapons: [], armor: [], abilities: [] }, // Initialize empty equipment
            money: 0, // Individual money
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

                    {/* Left Column: Visuals */}
                    <div className="space-y-6">
                        <div
                            className="relative aspect-[3/4.5] bg-[#0b1120] rounded-lg border-2 border-dashed border-[#c8aa6e]/40 flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-[#c8aa6e]"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6">
                                    <Upload className="w-12 h-12 text-[#c8aa6e] mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-[#f0e6d2] mb-2">Subir Imagen</p>
                                    <p className="text-xs text-slate-500">Click para seleccionar</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold uppercase tracking-wider text-sm bg-black/50 px-3 py-1 rounded">Cambiar Imagen</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
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
                                        <div key={attr}>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 capitalize">{attr}</label>
                                            <select
                                                value={formData.attributes[attr]}
                                                onChange={(e) => handleAttributeChange(attr, e.target.value)}
                                                className="w-full bg-[#0b1120] border border-slate-700 p-2.5 rounded text-slate-200 text-sm focus:border-[#c8aa6e] outline-none"
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
                                            min="1"
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

            {/* Crop Modal */}
            <Modal
                isOpen={isCropping}
                onClose={() => setIsCropping(false)}
                title="Ajustar retrato"
                size="xl"
                footer={
                    <>
                        <Boton color="gray" onClick={() => setIsCropping(false)}>
                            Cancelar
                        </Boton>
                        <Boton color="blue" onClick={handleCropSave}>
                            Guardar recorte
                        </Boton>
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900">
                        {cropperState.imageSrc ? (
                            <Cropper
                                image={cropperState.imageSrc}
                                crop={cropperState.crop}
                                zoom={cropperState.zoom}
                                aspect={3 / 4.5}
                                minZoom={0.3}
                                maxZoom={6}
                                onCropChange={(crop) => setCropperState((prev) => ({ ...prev, crop }))}
                                onZoomChange={(zoom) => setCropperState((prev) => ({ ...prev, zoom }))}
                                onCropComplete={handleCropComplete}
                                restrictPosition
                                objectFit="cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                Selecciona una imagen para comenzar.
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="zoom" className="text-xs uppercase tracking-[0.4em] text-slate-500">
                            Zoom
                        </label>
                        <input
                            id="zoom"
                            type="range"
                            min={0.3}
                            max={6}
                            step={0.05}
                            value={cropperState.zoom}
                            onChange={(event) =>
                                setCropperState((prev) => ({ ...prev, zoom: Number(event.target.value) }))
                            }
                            className="accent-sky-400"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};
