import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import {
    FiSearch, FiArrowLeft, FiUpload, FiX, FiCheck, FiImage, FiTrash2
} from 'react-icons/fi';
import { Sword, Shield, Zap, Gem, Package } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import useGlossary from '../hooks/useGlossary';
import { normalizeGlossaryWord } from '../utils/glossary';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const normalizeKey = (name) =>
    (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

const CATEGORIES = [
    { id: 'weapons', label: 'Armas', icon: Sword, color: 'rose' },
    { id: 'armor', label: 'Armaduras', icon: Shield, color: 'sky' },
    { id: 'abilities', label: 'Habilidades', icon: Zap, color: 'violet' },
    { id: 'objects', label: 'Objetos', icon: Package, color: 'amber' },
    { id: 'accessories', label: 'Accesorios', icon: Gem, color: 'emerald' },
];

const RARITY_STYLES = {
    legendaria: { border: 'border-orange-500/40', text: 'text-orange-400', glow: 'from-orange-900/60', stripe: 'bg-orange-500' },
    épica: { border: 'border-purple-500/40', text: 'text-purple-400', glow: 'from-purple-900/60', stripe: 'bg-purple-500' },
    epica: { border: 'border-purple-500/40', text: 'text-purple-400', glow: 'from-purple-900/60', stripe: 'bg-purple-500' },
    rara: { border: 'border-blue-500/40', text: 'text-blue-400', glow: 'from-blue-900/60', stripe: 'bg-blue-500' },
    'poco común': { border: 'border-green-500/40', text: 'text-green-400', glow: 'from-green-900/60', stripe: 'bg-green-500' },
    'poco comun': { border: 'border-green-500/40', text: 'text-green-400', glow: 'from-green-900/60', stripe: 'bg-green-500' },
    común: { border: 'border-slate-700', text: 'text-slate-500', glow: 'from-slate-800', stripe: 'bg-slate-600' },
    comun: { border: 'border-slate-700', text: 'text-slate-500', glow: 'from-slate-800', stripe: 'bg-slate-600' },
};
const DEFAULT_RARITY = { border: 'border-slate-700', text: 'text-slate-500', glow: 'from-slate-800', stripe: 'bg-slate-600' };

const getRarity = (item) => {
    const r = (item.rareza || '').toLowerCase().trim();
    if (r.includes('legendari')) return RARITY_STYLES.legendaria;
    if (r.includes('épic') || r.includes('epic')) return RARITY_STYLES.épica;
    if (r.includes('rar')) return RARITY_STYLES.rara;
    if (r.includes('poco com')) return RARITY_STYLES['poco común'];
    return DEFAULT_RARITY;
};

// Hardcoded image resolver (mirrors LoadoutView / CanvasSection logic)
const getHardcodedImage = (item) => {
    const name = (item.nombre || item.name || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const target = `${name} ${type} ${category}`;

    // Weapons
    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.png';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.png';
    if (target.includes('antorcha')) return '/armas/antorcha.png';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.png';
    if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.png';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.png';
    if (name.includes('cuchillo')) return '/armas/cuchillo.png';
    if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.png';
    if (name.includes('revolver') || name.includes('revólver')) return '/armas/revolver.png';
    if (name.includes('pistola')) return '/armas/pistola.png';
    if (name.includes('rifle')) return '/armas/rifle.png';
    if (name.includes('escopeta')) return '/armas/escopeta.png';
    if (name.includes('granarco')) return '/armas/arco_largo.png';
    if (name.includes('arco')) return '/armas/arco_corto.png';
    if (name.includes('gran clava') || name.includes('granclava')) return '/armas/gran_clava.png';
    if (name.includes('clava')) return '/armas/clava.png';
    if (name.includes('jabalina')) return '/armas/jabalina.png';
    if (name.includes('lanza')) return '/armas/lanza.png';
    if (name.includes('daga')) return '/armas/daga.png';
    if (name.includes('hacha de mano')) return '/armas/hacha_de_mano.png';
    if (name.includes('honda')) return '/armas/honda.png';
    if (name.includes('tirachinas')) return '/armas/tirachinas.png';
    if (name.includes('estoque')) return '/armas/estoque.png';
    if (name.includes('ballesta pesada') || name.includes('granballesta')) return '/armas/ballesta_pesada.png';
    if (name.includes('ultraballesta')) return '/armas/ultraballesta.jpg';
    if (name.includes('ballesta de mano')) return '/armas/ballesta_de_mano.png';
    if (name.includes('ballesta')) return '/armas/ballesta_ligera.png';
    if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.png';
    if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.png';
    if (name.includes('gran martillo')) return '/armas/gran_martillo.png';
    if (name.includes('ultramartillo')) return '/armas/ultramartillo.png';
    if (name.includes('espada bastarda')) return '/armas/espada_bastarda.png';
    if (name.includes('espada larga')) return '/armas/espada_larga.png';
    if (name.includes('espada corta')) return '/armas/espada_corta.png';
    if (name.includes('mandoble')) return '/armas/mandoble.png';
    if (name.includes('cimitarra')) return '/armas/cimitarra.png';
    if (name.includes('espada')) return '/armas/espada_de_acero.png';
    if (name.includes('fauces')) return '/armas/fauces.png';
    if (name.includes('garras')) return '/armas/garras.png';
    // Objects
    if (target.includes('chatarra')) return '/objetos/chatarra.jpg';
    if (target.includes('comida')) return '/objetos/comida.png';
    if (target.includes('remedio') || target.includes('vendaje')) return '/objetos/vendaje.png';
    if (target.includes('dinero') || target.includes('moneda')) return '/objetos/dinero.png';
    if (target.includes('elixir') || target.includes('poción') || target.includes('pocion')) return '/objetos/elixir.png';
    if (target.includes('libro')) return '/objetos/libro.png';
    if (target.includes('llave')) return '/objetos/llave.png';
    if (target.includes('municion') || target.includes('munición')) return '/objetos/municion.png';
    if (target.includes('pergamino')) return '/objetos/pergamino.png';
    if (target.includes('polvora') || target.includes('pólvora')) return '/objetos/polvora.png';
    if (target.includes('coctel molotov') || target.includes('cóctel molotov')) return '/objetos/coctel_molotov.png';
    if (target.includes('herramientas') || target.includes('herramienta')) return '/objetos/herramientas.png';
    if (target.includes('recurso')) return '/objetos/recurso.jpg';
    if (target.includes('accesorio')) return '/objetos/accesorio.png';
    if (target.includes('arma') && !target.includes('armadura')) return '/objetos/arma.png';
    // Armor
    if (target.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.png';
    if (target.includes('armadura de placas')) return '/armaduras/armadura_de_placas.png';
    if (target.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.png';
    if (target.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.png';
    if (target.includes('armadura de acero')) return '/armaduras/armadura_de_acero.png';
    if (target.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.png';
    if (target.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.png';
    if (target.includes('armadura bandeada')) return '/armaduras/armadura bandeada.png';
    if (target.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.png';
    if (target.includes('armadura de piel') || target.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.png';
    if (target.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.png';
    if (target.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.png';
    if (target.includes('camisote de mallas')) return '/armaduras/cota_de_malla.png';
    if (target.includes('armadura')) return '/objetos/armadura.png';
    // Accessories
    if (name.includes('casco de minero')) return '/accesorios/casco_de_minero.png';
    if (name.includes('guante blanco')) return '/accesorios/guante_blanco.png';

    return null;
};

const getCategoryColor = (catId) => {
    const map = {
        weapons: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', activeBg: 'bg-rose-500/20', activeText: 'text-rose-300', activeBorder: 'border-rose-500/50' },
        armor: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', activeBg: 'bg-sky-500/20', activeText: 'text-sky-300', activeBorder: 'border-sky-500/50' },
        abilities: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', activeBg: 'bg-violet-500/20', activeText: 'text-violet-300', activeBorder: 'border-violet-500/50' },
        objects: { text: 'text-[#c8aa6e]', bg: 'bg-[#c8aa6e]/10', border: 'border-[#c8aa6e]/30', activeBg: 'bg-[#c8aa6e]/20', activeText: 'text-[#c8aa6e]', activeBorder: 'border-[#c8aa6e]/50' },
        accessories: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500/20', activeText: 'text-emerald-300', activeBorder: 'border-emerald-500/50' },
    };
    return map[catId] || map.weapons;
};


// Touch detection for mobile tooltip support
const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
const EquipmentImageManager = ({ armas = [], armaduras = [], habilidades = [], accesorios = [], onBack }) => {
    const { glossary } = useGlossary();
    const [activeCategory, setActiveCategory] = useState('weapons');
    const [searchTerm, setSearchTerm] = useState('');
    const [customImages, setCustomImages] = useState({});
    const [uploading, setUploading] = useState(null); // key of item being uploaded
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const fileInputRef = useRef(null);
    const pendingItemRef = useRef(null);

    // Listen to custom images from Firestore
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'equipment_images'), (snap) => {
            const data = {};
            snap.forEach(d => {
                data[d.id] = d.data();
            });
            setCustomImages(data);
            setIsInitialLoading(false);
        });
        return () => unsub();
    }, []);

    // Build unified items list per category
    const categoryItems = useMemo(() => {
        const normalize = (items, cat) => items.map(item => ({
            ...item,
            _key: normalizeKey(item.nombre || item.name),
            _displayName: item.nombre || item.name || 'Sin nombre',
            _category: cat,
        }));

        return {
            weapons: normalize(armas, 'weapons'),
            armor: normalize(armaduras, 'armor'),
            abilities: normalize(habilidades, 'abilities'),
            objects: [], // Objects come from customItems, we'll load them
            accessories: normalize(accesorios, 'accessories'),
        };
    }, [armas, armaduras, habilidades, accesorios]);

    // Fetch custom objects (from Firestore 'customItems' like LoadoutView does)
    const [customObjects, setCustomObjects] = useState([]);
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'customItems'), (snap) => {
            const items = snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: data.id || d.id,
                    nombre: data.name || data.nombre || 'Objeto',
                    _key: normalizeKey(data.name || data.nombre || d.id),
                    _displayName: data.name || data.nombre || 'Objeto',
                    _category: 'objects',
                };
            });
            setCustomObjects(items);
        });
        return () => unsub();
    }, []);

    const activeItems = useMemo(() => {
        let items = activeCategory === 'objects' ? customObjects : (categoryItems[activeCategory] || []);

        // Deduplicate by _key (normalized name) to avoid same item showing twice if it came from different sources
        const uniqueItems = [];
        const seenKeys = new Set();

        items.forEach(item => {
            if (!seenKeys.has(item._key)) {
                seenKeys.add(item._key);
                uniqueItems.push(item);
            }
        });

        let filtered = uniqueItems;

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                (item._displayName || '').toLowerCase().includes(q) ||
                (item.rareza || '').toLowerCase().includes(q)
            );

            // Rank by relevance: starts with query first, then contains
            filtered.sort((a, b) => {
                const aName = (a._displayName || '').toLowerCase();
                const bName = (b._displayName || '').toLowerCase();
                const aStarts = aName.startsWith(q);
                const bStarts = bName.startsWith(q);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
                return aName.localeCompare(bName);
            });
        } else {
            // No search: simple alphabetical
            filtered.sort((a, b) => (a._displayName || '').localeCompare(b._displayName || ''));
        }

        return filtered;
    }, [activeCategory, categoryItems, customObjects, searchTerm]);

    // Resolve current image for an item
    const resolveImage = (item) => {
        const key = item._key;
        // 1. Custom uploaded image from Firestore
        if (customImages[key]?.imageUrl) return { src: customImages[key].imageUrl, isCustom: true };
        // 2. Item's own icon field
        if (item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) return { src: item.icon, isCustom: false };
        // 3. Hardcoded fallback
        const hardcoded = getHardcodedImage(item);
        if (hardcoded) return { src: hardcoded, isCustom: false };

        return null;
    };

    // Upload handler
    const handleUploadClick = (item) => {
        pendingItemRef.current = item;
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        const item = pendingItemRef.current;
        if (!file || !item) return;

        const key = item._key;
        setUploading(key);
        setUploadSuccess(null);

        try {
            // Upload to Firebase Storage
            const ext = file.name.split('.').pop() || 'png';
            const storagePath = `equipment_images/${item._category}/${key}.${ext}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // Save URL to Firestore
            await setDoc(doc(db, 'equipment_images', key), {
                imageUrl: downloadUrl,
                itemName: item._displayName,
                category: item._category,
                storagePath,
                updatedAt: Date.now(),
            });

            setUploadSuccess(key);
            setTimeout(() => setUploadSuccess(null), 2000);
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Error al subir la imagen. Inténtalo de nuevo.');
        } finally {
            setUploading(null);
            pendingItemRef.current = null;
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Remove custom image
    const handleRemoveImage = async (item) => {
        const key = item._key;
        if (!window.confirm(`¿Eliminar la imagen personalizada de "${item._displayName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'equipment_images', key));
        } catch (err) {
            console.error('Error removing custom image:', err);
        }
    };

    const catColors = getCategoryColor(activeCategory);

    // Stats to show per category
    const renderStats = (item) => {
        const stats = [];
        if (item.dano || item.damage) stats.push({ label: 'Daño', value: item.dano || item.damage, color: 'text-red-300' });
        if (item.defensa || item.defense) stats.push({ label: 'Defensa', value: item.defensa || item.defense, color: 'text-sky-300' });
        if (item.poder) stats.push({ label: 'Poder', value: item.poder, color: 'text-purple-300' });
        if (item.alcance || item.range) stats.push({ label: 'Alcance', value: item.alcance || item.range, color: 'text-slate-300' });
        if (item.consumo || item.consumption) stats.push({ label: 'Coste', value: item.consumo || item.consumption, color: 'text-yellow-300' });
        if (item.cargaFisica || item.carga) stats.push({ label: 'Carga', value: item.cargaFisica || item.carga, color: 'text-slate-300' });

        if (stats.length === 0) return null;

        return (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                {stats.map((s, i) => (
                    <div key={i} className="flex justify-between">
                        <span className="text-slate-500 uppercase font-bold">{s.label}:</span>
                        <span className={`font-mono ${s.color}`}>{s.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    const catIcon = CATEGORIES.find(c => c.id === activeCategory)?.icon || Sword;
    const CatIcon = catIcon;
    const itemCount = activeItems.length;
    const withImage = activeItems.filter(i => resolveImage(i) !== null).length;

    return (
        <div className="min-h-screen bg-[#09090b] text-[#e2e8f0] font-['Lato'] p-4 md:p-8 selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2]">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
            />

            <div className="mx-auto max-w-7xl space-y-8">
                {/* ─── Header ─── */}
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#c8aa6e]/20 pb-8 text-center md:text-left">
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center md:justify-start gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e] w-full">
                            <span className="opacity-70">ARCANA VAULT</span>
                            <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                            <span>GESTOR DE EQUIPAMIENTO</span>
                        </div>
                        <h1 className="font-['Cinzel'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-5xl">
                            Imágenes del Catálogo
                        </h1>
                        <p className="max-w-2xl mx-auto md:mx-0 font-['Lato'] text-base sm:text-lg font-light leading-relaxed text-[#94a3b8]">
                            Gestiona las imágenes asociadas a armas, armaduras, objetos, habilidades y accesorios. Sube imágenes desde cualquier dispositivo.
                        </p>
                    </div>

                    <div className="flex justify-center md:justify-end gap-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-2 border border-[#c8aa6e]/30 text-[#c8aa6e] font-['Cinzel'] font-bold text-xs uppercase tracking-[0.2em] rounded-sm hover:bg-[#c8aa6e]/10 transition-all"
                        >
                            <FiArrowLeft /> Volver
                        </button>
                    </div>
                </div>

                {/* ─── Category Tabs ─── */}
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        const colors = getCategoryColor(cat.id);
                        const Icon = cat.icon;
                        const count = cat.id === 'objects' ? customObjects.length : (categoryItems[cat.id] || []).length;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                                className={`
                                    group flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all duration-300
                                    ${isActive
                                        ? `${colors.activeBg} ${colors.activeBorder} ${colors.activeText} shadow-lg`
                                        : `bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300`
                                    }
                                `}
                            >
                                <Icon size={16} className={isActive ? colors.activeText : 'text-slate-600 group-hover:text-slate-400'} />
                                <span className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.15em]">{cat.label}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/10' : 'bg-slate-800 text-slate-600'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ─── Search + Stats ─── */}
                <div className="flex flex-col gap-4 items-center md:items-start md:flex-row">
                    <div className="relative w-full max-w-lg">
                        <FiSearch className="absolute left-4 top-0 bottom-0 my-auto h-4 w-4 text-[#c8aa6e]/50" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o rareza..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#161f32]/50 border border-[#c8aa6e]/20 rounded-xl py-3 pl-12 pr-10 text-[#f0e6d2] focus:outline-none focus:border-[#c8aa6e]/50 transition-colors placeholder-slate-600"
                        />
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-0 bottom-0 my-auto h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors"
                                >
                                    <FiX size={16} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-slate-500">
                        <motion.div key={`count-${itemCount}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex items-center gap-1.5">
                            <CatIcon size={14} className={catColors.text} />
                            <span className="font-bold">{itemCount}</span>
                            <span>items</span>
                        </motion.div>
                        <div className="w-px h-4 bg-slate-800" />
                        <motion.div key={`img-${withImage}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="flex items-center gap-1.5">
                            <FiImage size={14} className="text-emerald-500" />
                            <span className="font-bold text-emerald-400">{withImage}</span>
                            <span>con imagen</span>
                        </motion.div>
                        <div className="w-px h-4 bg-slate-800" />
                        <motion.div key={`noimg-${itemCount - withImage}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="flex items-center gap-1.5">
                            <FiImage size={14} className="text-slate-600" />
                            <span className="font-bold text-slate-400">{itemCount - withImage}</span>
                            <span>sin imagen</span>
                        </motion.div>
                    </div>
                </div>

                {/* ─── Items Grid ─── */}
                <div className="relative min-h-[200px]">
                    {isInitialLoading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="flex flex-col items-center gap-5">
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 border-2 border-[#c8aa6e]/10 rounded-full" />
                                    <div className="absolute inset-0 border-2 border-transparent border-t-[#c8aa6e] rounded-full animate-spin" />
                                    <div className="absolute inset-2 border-2 border-transparent border-b-[#c8aa6e]/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                </div>
                                <span className="font-['Cinzel'] text-xs text-[#c8aa6e]/70 tracking-[0.3em] uppercase">Cargando Bóveda</span>
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            {/* Shimmer line divider on category/filter change */}
                            <motion.div
                                key={`shimmer-${activeCategory}-${searchTerm}`}
                                initial={{ scaleX: 0, opacity: 0.8 }}
                                animate={{ scaleX: 1, opacity: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="h-px bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent mb-5 origin-left"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                <AnimatePresence>
                                    {activeItems.map((item, idx) => {
                                        const rarity = getRarity(item);
                                        const image = resolveImage(item);
                                        const isUploading = uploading === item._key;
                                        const isSuccess = uploadSuccess === item._key;
                                        const hasCustom = customImages[item._key]?.imageUrl;
                                        const traits = item.rasgos
                                            ? (Array.isArray(item.rasgos) ? item.rasgos : item.rasgos.toString().split(','))
                                            : [];

                                        return (
                                            <motion.div
                                                key={item._key}
                                                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                                                transition={{
                                                    duration: 0.2,
                                                    delay: Math.min(idx, 12) * 0.015,
                                                    ease: [0.25, 0.1, 0.25, 1],
                                                }}
                                                className={`group relative rounded-2xl border overflow-hidden
                                                    ${rarity.border} bg-[#0f172a] hover:border-[#c8aa6e]/40
                                                    hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow] duration-300
                                                `}
                                            >
                                                {/* ── Rarity Stripe ── */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${rarity.stripe} z-10`} />

                                                {/* ── Image Area ── */}
                                                <div className="relative h-44 bg-black/60 overflow-hidden flex items-center justify-center">
                                                    {image ? (
                                                        <>
                                                            <img
                                                                src={image.src}
                                                                alt={item._displayName}
                                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                                                            {/* Custom badge */}
                                                            {hasCustom && (
                                                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                                                    <FiCheck size={10} /> Personalizada
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-50 transition-opacity">
                                                            <FiImage size={40} className="text-slate-500" />
                                                            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Sin imagen</span>
                                                        </div>
                                                    )}

                                                    {/* Upload/Change overlay */}
                                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 z-20">
                                                        {isUploading ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="w-8 h-8 border-2 border-[#c8aa6e] border-t-transparent rounded-full animate-spin" />
                                                                <span className="text-[10px] text-[#c8aa6e] uppercase tracking-widest font-bold">Subiendo...</span>
                                                            </div>
                                                        ) : isSuccess ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                                                                    <FiCheck size={20} className="text-emerald-400" />
                                                                </div>
                                                                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">¡Listo!</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUploadClick(item)}
                                                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#c8aa6e]/20 hover:bg-[#c8aa6e]/30 border border-[#c8aa6e]/50 text-[#c8aa6e] rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                                                                >
                                                                    <FiUpload size={14} />
                                                                    {image ? 'Cambiar' : 'Subir Imagen'}
                                                                </button>
                                                                {hasCustom && (
                                                                    <button
                                                                        onClick={() => handleRemoveImage(item)}
                                                                        className="flex items-center gap-1.5 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all text-xs font-bold"
                                                                        title="Eliminar imagen personalizada"
                                                                    >
                                                                        <FiTrash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ── Content ── */}
                                                <div className="p-4 pl-5 space-y-2.5">
                                                    {/* Name */}
                                                    <h3 className="font-['Cinzel'] text-sm font-bold uppercase tracking-wider text-[#f0e6d2] group-hover:text-[#c8aa6e] transition-colors truncate">
                                                        {item._displayName}
                                                    </h3>

                                                    {/* Rarity */}
                                                    {item.rareza && (
                                                        <span className={`inline-block text-[9px] uppercase font-bold tracking-widest ${rarity.text}`}>
                                                            {item.rareza}
                                                        </span>
                                                    )}

                                                    {/* Stats */}
                                                    {renderStats(item)}

                                                    {/* Traits */}
                                                    {traits.length > 0 && traits[0] && (
                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                            {traits.slice(0, 4).map((t, i) => {
                                                                const traitName = (typeof t === 'string' ? t : '').trim();
                                                                if (!traitName) return null;
                                                                const normalizedTrait = normalizeGlossaryWord(traitName);
                                                                const glossaryEntry = (glossary || []).find(g => normalizeGlossaryWord(g.word) === normalizedTrait);

                                                                if (glossaryEntry) {
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/90 text-[#f0e6d2] border border-slate-700 uppercase cursor-help hover:border-[#c8aa6e] transition-colors shadow-sm"
                                                                            data-tooltip-id="equip-trait-tooltip"
                                                                            data-tooltip-content={glossaryEntry.info}
                                                                            style={glossaryEntry.color ? { color: glossaryEntry.color } : {}}
                                                                        >
                                                                            {traitName}
                                                                        </span>
                                                                    );
                                                                }

                                                                return (
                                                                    <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 uppercase">
                                                                        {traitName}
                                                                    </span>
                                                                );
                                                            })}
                                                            {traits.length > 4 && (
                                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-600 border border-slate-700/50">
                                                                    +{traits.length - 4}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Description */}
                                                    {(item.descripcion || item.description) && (
                                                        <p className="text-[9px] text-emerald-100/40 italic leading-relaxed font-serif border-l-2 border-emerald-500/15 pl-2 line-clamp-2">
                                                            &ldquo;{item.descripcion || item.description}&rdquo;
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Hover glow sweep */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>

                {/* Empty state */}
                <AnimatePresence>
                    {!isInitialLoading && activeItems.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="flex flex-col items-center gap-5 py-20"
                        >
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border border-slate-800 flex items-center justify-center">
                                    <FiSearch size={32} className="text-slate-700" />
                                </div>
                                <div className="absolute inset-0 rounded-full border border-[#c8aa6e]/10 animate-ping" style={{ animationDuration: '2s' }} />
                            </div>
                            <p className="text-slate-500 font-['Cinzel'] text-sm uppercase tracking-[0.2em]">
                                {searchTerm ? 'Sin resultados' : 'Categoría vacía'}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-[#c8aa6e]/60 hover:text-[#c8aa6e] text-xs uppercase tracking-widest transition-colors"
                                >
                                    Limpiar búsqueda
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tooltip for glossary traits */}
            <Tooltip
                id="equip-trait-tooltip"
                place="top"
                openOnClick={isTouchDevice}
                className="max-w-[90vw] sm:max-w-xs whitespace-pre-line z-[9999]"
            />
        </div>
    );
};

EquipmentImageManager.propTypes = {
    armas: PropTypes.array,
    armaduras: PropTypes.array,
    habilidades: PropTypes.array,
    accesorios: PropTypes.array,
    onBack: PropTypes.func.isRequired,
};

export default EquipmentImageManager;
