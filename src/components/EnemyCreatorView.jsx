import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, Save, Upload, User, Shield, Zap, Activity, Brain, Ghost, Skull } from 'lucide-react';
import Cropper from 'react-easy-crop';
import Modal from './Modal';
import Boton from './Boton';
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
        croppedAreaPixels: null,
    });
    const [isSaving, setIsSaving] = useState(false);
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

    const handleSave = async () => {
        if (!formData.name) {
            alert("Por favor, introduce un nombre para el enemigo.");
            return;
        }

        setIsSaving(true);

        try {
            const enemyId = `enemy-${Date.now()}`;
            let imageUrl = formData.image;

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
        <div className="absolute inset-0 bg-[#050b14] text-slate-200 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b border-red-900/30 pb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full border border-red-900/50 hover:border-red-500 text-red-900/50 hover:text-red-500 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-['Cinzel'] text-red-100 uppercase">Crear Nuevo Enemigo</h1>
                            <p className="text-red-500/60 text-xs font-bold uppercase tracking-widest">Añade una amenaza al bestiario</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-bold font-['Cinzel'] uppercase tracking-wider rounded-sm shadow-lg transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Save className="w-5 h-5" /> {isSaving ? 'Guardando...' : 'Guardar Enemigo'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Left Column: Visuals */}
                    <div className="space-y-6">
                        <div
                            className="relative aspect-[3/4.5] bg-[#0b1120] rounded-lg border-2 border-dashed border-red-900/30 flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-red-500 hover:bg-red-900/10 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6">
                                    <Upload className="w-12 h-12 text-red-700 group-hover:text-red-500 transition-colors mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-red-200 mb-2">Subir Imagen</p>
                                    <p className="text-xs text-red-500/60">Click para seleccionar</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold uppercase tracking-wider text-sm bg-red-900/80 px-3 py-1 rounded backdrop-blur-sm">Cambiar Imagen</span>
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
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {[
                                    { id: 'postura', label: 'Postura', icon: <Shield className="w-4 h-4 text-green-500" /> },
                                    { id: 'vida', label: 'Vida', icon: <Activity className="w-4 h-4 text-red-500" /> },
                                    { id: 'ingenio', label: 'Ingenio', icon: <Zap className="w-4 h-4 text-blue-500" /> },
                                    { id: 'cordura', label: 'Cordura', icon: <Brain className="w-4 h-4 text-purple-500" /> },
                                    { id: 'armadura', label: 'Armadura', icon: <Ghost className="w-4 h-4 text-slate-500" /> },
                                ].map((stat) => (
                                    <div key={stat.id} className="bg-[#050b14] p-3 rounded border border-red-900/30 text-center group hover:border-red-500/50 transition-colors">
                                        <div className="flex justify-center mb-2">{stat.icon}</div>
                                        <label className="block text-[10px] font-bold uppercase text-red-400/60 mb-2">{stat.label}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={formData.stats[stat.id].max}
                                            onChange={(e) => handleStatChange(stat.id, 'max', parseInt(e.target.value))}
                                            className="w-16 mx-auto bg-[#0a101d] border border-red-900/30 rounded text-center text-red-100 font-bold focus:border-red-500 outline-none"
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
                        <Boton color="red" onClick={handleCropSave}>
                            Guardar recorte
                        </Boton>
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-red-900/30 bg-[#050b14]">
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
                            <div className="flex h-full items-center justify-center text-sm text-red-400">
                                Selecciona una imagen para comenzar.
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="zoom" className="text-xs uppercase tracking-[0.4em] text-red-500">
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
                            className="accent-red-500"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};
