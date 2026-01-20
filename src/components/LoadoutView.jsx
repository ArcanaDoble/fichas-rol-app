import React, { useState, useMemo } from 'react';
import { Tooltip } from 'react-tooltip';
import PropTypes from 'prop-types';
import { FiShield, FiX, FiCheck, FiAlertTriangle, FiStar, FiPlus, FiMinus, FiEdit2 } from 'react-icons/fi';
import { GiBelt } from 'react-icons/gi';
import { Sword, Shield, Zap } from 'lucide-react';
import HexIcon from './HexIcon';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

import { normalizeGlossaryWord, getGlossaryTooltipId } from '../utils/glossary';

const RARITIES = [
    { id: 'comun', label: 'Común', color: 'bg-slate-600 border-slate-400 text-slate-200' },
    { id: 'poco-comun', label: 'Poco Común', color: 'bg-green-600 border-green-400 text-green-200' },
    { id: 'rara', label: 'Rara', color: 'bg-blue-600 border-blue-400 text-blue-200' },
    { id: 'epica', label: 'Épica', color: 'bg-purple-600 border-purple-400 text-purple-200' },
    { id: 'legendaria', label: 'Legendaria', color: 'bg-orange-600 border-orange-400 text-orange-200' }
];

// Función para detectar el tipo de arma desde los rasgos
const getWeaponProficiencyType = (item) => {
    const traits = (item.traits || item.rasgos || item.trait || '').toString().toLowerCase();
    const category = (item.category || item.categoria || '').toString().toLowerCase();

    if (traits.includes('simple') || category.includes('simple')) return 'simple';
    if (traits.includes('marcial') || category.includes('marcial')) return 'martial';
    if (traits.includes('especial') || category.includes('especial')) return 'special';

    // Default to simple if no type found
    return null;
};

// Función para detectar el tipo de armadura desde los rasgos/categoría
const getArmorProficiencyType = (item) => {
    const traits = (item.traits || item.rasgos || item.trait || '').toString().toLowerCase();
    const category = (item.category || item.categoria || '').toString().toLowerCase();

    if (traits.includes('ligera') || category.includes('ligera')) return 'light';
    if (traits.includes('media') || category.includes('media')) return 'medium';
    if (traits.includes('pesada') || category.includes('pesada')) return 'heavy';

    return null;
};

// Función para obtener los colores de rareza
const getRarityColors = (item) => {
    const rareza = (item?.rareza || '').toLowerCase();
    if (rareza.includes('legendari')) return { border: 'border-orange-500', bg: 'bg-orange-900/30', text: 'text-orange-400', glow: 'from-orange-900/80', stripe: 'bg-orange-500', gradient: 'from-orange-900/50' };
    if (rareza.includes('épic') || rareza.includes('epic')) return { border: 'border-purple-500', bg: 'bg-purple-900/30', text: 'text-purple-400', glow: 'from-purple-900/80', stripe: 'bg-purple-500', gradient: 'from-purple-900/50' };
    if (rareza.includes('rar')) return { border: 'border-blue-500', bg: 'bg-blue-900/30', text: 'text-blue-400', glow: 'from-blue-900/80', stripe: 'bg-blue-500', gradient: 'from-blue-900/50' };
    if (rareza.includes('poco com')) return { border: 'border-green-500', bg: 'bg-green-900/30', text: 'text-green-400', glow: 'from-green-900/80', stripe: 'bg-green-500', gradient: 'from-green-900/50' };
    return { border: 'border-slate-600', bg: 'bg-slate-800/30', text: 'text-slate-400', glow: 'from-slate-800', stripe: 'bg-slate-600', gradient: 'from-slate-800/50' };
};

// Función para obtener imagen de objetos genéricos (public/objetos)
const getObjectImage = (item) => {
    // 1. Priorizar imágenes personalizadas (Base64 o URLs externas)
    if (item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) {
        return item.icon;
    }

    const name = (item.name || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const target = `${name} ${type} ${category}`;

    // Specific Item/Weapon Overrides (Higher Priority)
    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.png';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.png';
    if (target.includes('antorcha')) return '/armas/antorcha.png';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.png';
    if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.png';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.png';
    if (name.includes('cuchillo')) return '/armas/cuchillo.png';
    if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.png';

    // Standard Weapons
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

    // Hammers
    if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.png';
    if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.png';
    if (name.includes('gran martillo')) return '/armas/gran_martillo.png';
    if (name.includes('ultramartillo')) return '/armas/ultramartillo.png';

    // Swords (Check longer/specific names first)
    if (name.includes('espada corta')) return '/armas/espada_de_hierro.png';
    if (name.includes('espada')) return '/armas/espada_de_acero.png';

    // Generic Object Checks
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

    // Specific Armor Checks (Prioritize over generic 'armadura')
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

    // Generic Armor Fallback
    if (target.includes('armadura')) return '/objetos/armadura.png';

    return null;
};

// Helper to format item names with proper accents
const formatItemName = (name) => {
    if (!name) return '';
    let formatted = name;
    // Case-insensitive replacements
    formatted = formatted.replace(/municion/gi, 'Munición');
    formatted = formatted.replace(/pocion/gi, 'Poción');
    formatted = formatted.replace(/polvora/gi, 'Pólvora');
    formatted = formatted.replace(/balsamo/gi, 'Bálsamo');
    formatted = formatted.replace(/elixir/gi, 'Elixir'); // Usually ok, but just in case
    return formatted;
};

const LoadoutView = ({ dndClass, equipmentCatalog, glossary = [], onAddEquipment, onRemoveEquipment, onUpdateTalent, onUpdateProficiency, onUpdateEquipped }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('weapons');
    const [showRarityDropdown, setShowRarityDropdown] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [customItems, setCustomItems] = useState([]);
    const [editingBeltNote, setEditingBeltNote] = useState(null);
    const [tempBeltNote, setTempBeltNote] = useState('');

    const renderTrait = (t, i) => {
        const traitName = t.trim();
        if (!traitName) return null;

        const normalizedTrait = normalizeGlossaryWord(traitName);
        const glossaryEntry = (glossary || []).find(g => normalizeGlossaryWord(g.word) === normalizedTrait);

        if (glossaryEntry) {
            return (
                <span
                    key={i}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/90 text-[#f0e6d2] border border-slate-700 uppercase cursor-help hover:border-[#c8aa6e] transition-colors shadow-sm"
                    data-tooltip-id="trait-tooltip"
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
    };

    // Fetch custom items
    React.useEffect(() => {
        const fetchCustomItems = async () => {
            try {
                const snap = await getDocs(collection(db, 'customItems'));
                const fetched = snap.docs.map(d => d.data());
                setCustomItems(fetched);
            } catch (error) {
                console.error("Error fetching custom items:", error);
            }
        };
        fetchCustomItems();
    }, []);

    // Local editing state
    const [editingTitle, setEditingTitle] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [activeTab, setActiveTab] = useState('loadout');

    // Equipment slot selection state
    const [activeSlotSelector, setActiveSlotSelector] = useState(null); // 'mainHand', 'offHand', 'body', or null
    const [activeTalentSlotSelector, setActiveTalentSlotSelector] = useState(null); // 0, 1, 2 or null

    // Global click listener to close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            if (activeSlotSelector) setActiveSlotSelector(null);
            if (activeTalentSlotSelector !== null) setActiveTalentSlotSelector(null);
            if (showRarityDropdown) setShowRarityDropdown(false);
        };

        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeSlotSelector, activeTalentSlotSelector, showRarityDropdown]);

    // Get equipped items from dndClass (Moved up for initialization)
    const equippedItems = dndClass.equippedItems || { mainHand: null, offHand: null, body: null };

    // Calculate initial belt count based on equipped items as fallback
    const initialBeltCount = useMemo(() => {
        const indices = Object.entries(equippedItems)
            .filter(([k, v]) => k.startsWith('belt_') && v)
            .map(([k]) => parseInt(k.split('_')[1], 10));
        const maxIndex = Math.max(-1, ...indices);
        return Math.max(3, maxIndex + 1);
    }, [equippedItems]);

    // Use persisted belt slot count if available, otherwise fallback to calculated initial count
    const beltSlotCount = useMemo(() => {
        return dndClass.equippedItems?.beltSlotCount || initialBeltCount;
    }, [dndClass.equippedItems?.beltSlotCount, initialBeltCount]);

    // Get talent slots (restored)
    const talentSlots = useMemo(() => {
        const slots = dndClass.talents?.slots;
        return Array.isArray(slots) && slots.length >= 3 ? slots.slice(0, 3) : [null, null, null];
    }, [dndClass.talents]);

    // Get available talents options
    // Combining Action Data (isActive) and Class Features (isActiveAction)
    // Get available talents options
    // ONLY fetching active talents from the "reaction" pool as requested
    const availableTalentOptions = useMemo(() => {
        const data = dndClass.actionData || {};

        // Specifically 'reaction' array contains the "TALENTOS"
        // We only want those marked with isActive
        return (data.reaction || []).filter(f => f.isActive);
    }, [dndClass.actionData]);

    const handleEquipTalentSlot = (index, talent) => {
        if (onUpdateTalent) {
            const newSlots = [...talentSlots];
            newSlots[index] = talent;
            onUpdateTalent('slots', newSlots);
            setActiveTalentSlotSelector(null);
        }
    };

    // Get talent values from dndClass or use defaults
    const talentTitle = dndClass.talents?.title || 'Centinela';
    const talentDescription = dndClass.talents?.description || 'Ataques de oportunidad reducen velocidad a 0.';
    const talentRarity = dndClass.talents?.rarity || 'rara';
    const summary = dndClass.summary || {};

    // Get equipped items from dndClass
    // const equippedItems = dndClass.equippedItems || { mainHand: null, offHand: null, body: null }; // MOVED UP

    // Proficiencies
    const proficiencies = summary.proficiencies || { weapons: {}, armor: {} };

    const rawEquipment = dndClass.equipment || {};
    const equipment = useMemo(() => {
        if (Array.isArray(rawEquipment)) return rawEquipment;

        const list = [];
        if (rawEquipment.weapons) list.push(...rawEquipment.weapons.map((item, idx) => ({ ...item, _category: 'weapons', _index: idx })));
        if (rawEquipment.armor) list.push(...rawEquipment.armor.map((item, idx) => ({ ...item, _category: 'armor', _index: idx })));
        if (rawEquipment.abilities) list.push(...rawEquipment.abilities.map((item, idx) => ({ ...item, _category: 'abilities', _index: idx })));
        if (rawEquipment.objects) list.push(...rawEquipment.objects.map((item, idx) => ({ ...item, _category: 'objects', _index: idx })));
        return list;
    }, [rawEquipment]);

    // Get available weapons and armor from inventory
    const inventoryWeapons = useMemo(() => {
        return equipment.filter(item => item._category === 'weapons');
    }, [equipment]);

    const inventoryArmor = useMemo(() => {
        return equipment.filter(item => item._category === 'armor');
    }, [equipment]);

    // Filtrar catálogo según búsqueda
    const filteredCatalog = useMemo(() => {
        let catalog = [];

        if (selectedCategory === 'objects') {
            catalog = customItems.map(item => ({
                name: item.name,
                category: 'Objeto',
                description: item.description,
                payload: {
                    ...item,
                    category: 'objects',
                    itemType: 'object',
                    icon: item.icon,
                    color: item.color,
                    description: item.description
                }
            }));
        } else {
            catalog = equipmentCatalog?.[selectedCategory] || [];
        }

        if (!searchTerm.trim()) return catalog.slice(0, 5);

        return catalog
            .filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .slice(0, 5);
    }, [equipmentCatalog, selectedCategory, searchTerm, dndClass.storeItems, customItems]);

    // Check if character has proficiency with a weapon
    const hasWeaponProficiency = (item) => {
        const weaponType = getWeaponProficiencyType(item);
        if (!weaponType) return true; // If no type detected, assume proficient
        return proficiencies.weapons?.[weaponType] === true;
    };

    // Check if character has proficiency with armor
    const hasArmorProficiency = (item) => {
        const armorType = getArmorProficiencyType(item);
        if (!armorType) return true; // If no type detected, assume proficient
        return proficiencies.armor?.[armorType] === true;
    };

    // Get proficiency warning message for weapons
    const getWeaponProficiencyWarning = (item) => {
        const weaponType = getWeaponProficiencyType(item);
        if (!weaponType) return null;
        if (hasWeaponProficiency(item)) return null;

        const typeLabels = { simple: 'Simples', martial: 'Marciales', special: 'Especiales' };
        return `Sin competencia en armas ${typeLabels[weaponType]}`;
    };

    // Get proficiency warning message for armor
    const getArmorProficiencyWarning = (item) => {
        const armorType = getArmorProficiencyType(item);
        if (!armorType) return null;
        if (hasArmorProficiency(item)) return null;

        const typeLabels = { light: 'Ligera', medium: 'Media', heavy: 'Pesada' };
        return `Sin competencia en armadura ${typeLabels[armorType]}`;
    };

    // Handle equipping an item
    const handleEquipItem = (slot, item) => {
        if (onUpdateEquipped) {
            // Initialize quantity for belt items if not present
            const newItem = slot.startsWith('belt_')
                ? { ...item, quantity: item.quantity || 1 }
                : item;
            onUpdateEquipped(slot, newItem);
        }
        setActiveSlotSelector(null);
    };

    // Handle unequipping an item
    const handleUnequipItem = (slot) => {
        if (onUpdateEquipped) {
            onUpdateEquipped(slot, null);
        }
    };

    // Handle updating quantity for belt items
    const handleUpdateQuantity = (slot, delta) => {
        const currentItem = equippedItems[slot];
        if (!currentItem || !onUpdateEquipped) return;

        const currentQty = currentItem.quantity || 1;
        const newQty = Math.min(10, Math.max(1, currentQty + delta));

        if (newQty !== currentQty) {
            onUpdateEquipped(slot, { ...currentItem, quantity: newQty });
        }
    };

    const selectedRarity = RARITIES.find(r => r.id === talentRarity) || RARITIES[2];

    return (
        <div className="w-full h-full min-h-screen overflow-y-auto custom-scrollbar bg-[#09090b] pb-20 md:pb-0">
            <div className="p-4 pt-12 md:p-8 lg:p-12 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 border-b border-[#c8aa6e]/20 pb-4 gap-3">
                    <h2 className="text-2xl md:text-4xl font-['Cinzel'] text-[#f0e6d2]">MAZO INICIAL</h2>
                    <div className="flex gap-3 md:gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <button
                            onClick={() => setActiveTab('loadout')}
                            className={`${activeTab === 'loadout' ? 'text-[#c8aa6e] underline underline-offset-4' : 'hover:text-slate-300'}`}
                        >
                            Equipables
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`${activeTab === 'inventory' ? 'text-[#c8aa6e] underline underline-offset-4' : 'hover:text-slate-300'}`}
                        >
                            Inventario
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-12 items-start">

                    {/* Left Column: Equipment/Inventory Content */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* --- INVENTORY VIEW --- */}
                        {activeTab === 'inventory' && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                {/* Buscador de Equipamiento */}
                                <div className="mb-6 p-4 bg-[#161f32]/60 border border-[#c8aa6e]/20 rounded-lg">
                                    <h4 className="text-[#c8aa6e] font-['Cinzel'] text-sm tracking-widest mb-3">
                                        AGREGAR AL INVENTARIO
                                    </h4>

                                    {/* Tabs de categoría */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {[
                                            { id: 'weapons', label: 'Armas' },
                                            { id: 'armor', label: 'Armaduras' },
                                            { id: 'abilities', label: 'Habilidades' },
                                            { id: 'objects', label: 'Objetos' }
                                        ].map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${selectedCategory === cat.id
                                                    ? 'bg-[#c8aa6e] text-[#0b1120]'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Input de búsqueda */}
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar en catálogo..."
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-[#c8aa6e]/30 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#c8aa6e]"
                                    />

                                    {/* Resultados de búsqueda */}
                                    <div className="mt-3 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                        {filteredCatalog.length > 0 ? (
                                            filteredCatalog.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2 bg-slate-900/30 rounded hover:bg-slate-900/50 transition-colors"
                                                >
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-[#f0e6d2]">{item.name}</div>
                                                        <div className="text-xs text-slate-500">{item.category}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => onAddEquipment && onAddEquipment(item.payload, selectedCategory)}
                                                        className="px-3 py-1 bg-[#c8aa6e]/20 hover:bg-[#c8aa6e]/40 text-[#c8aa6e] text-xs font-bold rounded transition-colors"
                                                    >
                                                        Agregar
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-slate-500 text-sm py-4">
                                                {searchTerm ? 'No se encontraron resultados' : 'Escribe para buscar...'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mb-6">
                                    <Shield className="w-5 h-5 text-[#c8aa6e]" />
                                    <h3 className="text-[#c8aa6e] font-['Cinzel'] text-xl tracking-[0.3em] uppercase">
                                        Inventario (Mochila)
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                                    {equipment.length > 0 ? (
                                        equipment.map((item, index) => {
                                            // Determinar icono basado en itemType
                                            const getIcon = () => {
                                                // Primero intentar usar itemType si existe
                                                if (item.itemType === 'armor') return <Shield className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'weapon') return <Sword className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'ability') return <Zap className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'object') return <HexIcon size="md"><span className="text-xs">📦</span></HexIcon>;

                                                // Fallback: usar category si itemType no existe
                                                const cat = (item.category || item.type || '').toLowerCase();
                                                if (cat.includes('armadura') || cat.includes('armor')) return <Shield className="w-10 h-10 text-slate-400" />;
                                                if (cat.includes('arma') || cat.includes('weapon')) return <Sword className="w-10 h-10 text-slate-400" />;
                                                if (cat.includes('habilidad') || cat.includes('ability') || cat.includes('spell')) return <Zap className="w-10 h-10 text-slate-400" />;

                                                // Default: Shield
                                                return <Shield className="w-10 h-10 text-slate-400" />;
                                            };

                                            // Determinar colores basados en rareza
                                            const getRarityColors = () => {
                                                const rareza = (item.rareza || '').toLowerCase();
                                                if (rareza.includes('legendari')) return { border: 'bg-orange-500', text: 'text-orange-500', glow: 'from-orange-900/80' };
                                                if (rareza.includes('épic') || rareza.includes('epic')) return { border: 'bg-purple-500', text: 'text-purple-500', glow: 'from-purple-900/80' };
                                                if (rareza.includes('rar')) return { border: 'bg-blue-500', text: 'text-blue-500', glow: 'from-blue-900/80' };
                                                if (rareza.includes('poco com')) return { border: 'bg-green-500', text: 'text-green-500', glow: 'from-green-900/80' };
                                                return { border: 'bg-slate-600', text: 'text-slate-500', glow: 'from-slate-800' };
                                            };

                                            const rarityColors = getRarityColors();
                                            const objectImage = getObjectImage(item);

                                            return (
                                                <div key={index} className="group bg-[#161f32] border border-slate-700 hover:border-[#c8aa6e] p-1 rounded-lg transition-all duration-500 cursor-pointer hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex overflow-hidden relative h-full">

                                                    {/* Dynamic Background Gradient & Particles (Hover Effect) */}
                                                    <div className={`absolute inset-0 bg-gradient-to-r ${rarityColors.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>

                                                    {/* Stardust/Noise Texture Overlay */}
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700 z-0 pointer-events-none"
                                                        style={{
                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                                                            backgroundSize: '100px 100px'
                                                        }}
                                                    ></div>

                                                    {/* Rarity Stripe */}
                                                    <div className={`w-1 absolute left-0 top-0 bottom-0 z-20 ${rarityColors.border}`}></div>

                                                    {/* Image/Icon Section */}
                                                    <div className="w-24 bg-black/50 relative shrink-0 ml-2 flex flex-col z-10 backdrop-blur-sm overflow-hidden rounded-l">
                                                        {objectImage && (
                                                            <>
                                                                <img
                                                                    src={objectImage}
                                                                    alt={item.name}
                                                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                                            </>
                                                        )}
                                                        <div className="w-full h-full flex flex-col items-center justify-center border-r border-slate-700/50 relative z-20">
                                                            {!objectImage && (
                                                                <div className="text-3xl mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                                                    {getIcon()}
                                                                </div>
                                                            )}
                                                            {/* Rarity Label - Only show if exists */}
                                                            {item.rareza ? (
                                                                <span className={`text-[0.6rem] uppercase font-bold ${rarityColors.text} text-center leading-tight px-1 drop-shadow-md`}>
                                                                    {item.rareza}
                                                                </span>
                                                            ) : (
                                                                !objectImage && <div className="w-8 h-[1px] bg-slate-700/50 mt-2"></div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 p-3 flex flex-col relative z-0 min-w-0">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-[#f0e6d2] font-bold text-sm font-['Cinzel'] tracking-wide group-hover:text-[#c8aa6e] transition-colors uppercase truncate pr-6">
                                                                {item.name}
                                                            </h4>
                                                        </div>

                                                        {/* Stats Grid */}
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-3 border-b border-slate-700/50 pb-2">
                                                            {/* Weapon/Ability Stats */}
                                                            {(item.damage || item.dano) && (
                                                                <div className="col-span-2 flex justify-between">
                                                                    <span className="text-slate-500 uppercase font-bold">Daño:</span>
                                                                    <span className="text-red-300 font-mono">{item.damage || item.dano}</span>
                                                                </div>
                                                            )}
                                                            {(item.defense || item.defensa) && (
                                                                <div className="col-span-2 flex justify-between">
                                                                    <span className="text-slate-500 uppercase font-bold">Defensa:</span>
                                                                    <span className="text-blue-300 font-mono">{item.defense || item.defensa}</span>
                                                                </div>
                                                            )}
                                                            {(item.range || item.alcance) && (
                                                                <div className="col-span-1">
                                                                    <span className="text-slate-500 uppercase font-bold mr-1">Alc:</span>
                                                                    <span className="text-slate-300">{item.range || item.alcance}</span>
                                                                </div>
                                                            )}
                                                            {(item.consumption || item.consumo) && (
                                                                <div className="col-span-1 text-right">
                                                                    <span className="text-slate-500 uppercase font-bold mr-1">Coste:</span>
                                                                    <span className="">{item.consumption || item.consumo}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Traits */}
                                                        {(item.traits || item.rasgos || item.trait) && (
                                                            <div className="mb-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {(item.traits || item.rasgos || item.trait).toString().split(',').map((t, i) => renderTrait(t, i))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Description */}
                                                        <div className="mt-auto pt-1">
                                                            <p className="text-[10px] text-emerald-100/60 italic leading-relaxed font-serif border-l-2 border-emerald-500/20 pl-2">
                                                                "{item.detail || item.description || 'Sin descripción.'}"
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Botón eliminar */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveEquipment && onRemoveEquipment(item._index, item._category);
                                                        }}
                                                        className="absolute top-2 right-2 p-1 bg-red-500/10 hover:bg-red-500/30 text-red-400/70 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all z-20"
                                                        title="Eliminar"
                                                    >
                                                        <FiX className="w-3 h-3" />
                                                    </button>

                                                    {/* Hover Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-2 text-center py-8 text-slate-500 italic">
                                            No hay objetos en el inventario.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- LOADOUT / EQUIPABLES VIEW --- */}
                        {activeTab === 'loadout' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-8">

                                    {/* 1. MANOS (Hands) */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sword className="w-5 h-5 text-[#c8aa6e]" />
                                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-md tracking-[0.2em] uppercase">
                                                Manos
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            {[
                                                { key: 'mainHand', label: 'Mano Hábil', badge: 'HÁBIL', badgeClass: 'bg-green-900/40 text-green-400' },
                                                { key: 'offHand', label: 'Mano Torpe', badge: 'TORPE', badgeClass: 'bg-red-900/40 text-red-400' }
                                            ].map(({ key, label, badge, badgeClass }) => {
                                                const equippedItem = equippedItems[key];
                                                const proficiencyWarning = equippedItem ? getWeaponProficiencyWarning(equippedItem) : null;
                                                const isSlotActive = activeSlotSelector === key;
                                                const rarityColors = equippedItem ? getRarityColors(equippedItem) : null;

                                                const weaponImage = equippedItem ? getObjectImage(equippedItem) : null;

                                                return (
                                                    <div key={key} className="relative group">
                                                        {/* Slot Card */}
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveSlotSelector(isSlotActive ? null : key);
                                                            }}
                                                            className={`h-52 border-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden p-3
                                                                ${equippedItem
                                                                    ? proficiencyWarning
                                                                        ? 'border-orange-500/50'
                                                                        : `${rarityColors?.border || 'border-[#c8aa6e]/50'}`
                                                                    : 'border-dashed border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5'
                                                                }
                                                                ${isSlotActive ? 'ring-2 ring-[#c8aa6e]' : ''}
                                                            `}
                                                        >
                                                            {equippedItem ? (
                                                                <>
                                                                    {/* Weapon Image Background */}
                                                                    {weaponImage && (
                                                                        <>
                                                                            <img
                                                                                src={weaponImage}
                                                                                alt={equippedItem.name}
                                                                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 z-0"
                                                                            />
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-0"></div>
                                                                        </>
                                                                    )}

                                                                    {/* Rarity Gradient Background (bottom-right corner) */}
                                                                    {!weaponImage && (
                                                                        <div className={`absolute inset-0 bg-gradient-to-tl ${rarityColors?.gradient || 'from-slate-800/30'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
                                                                    )}

                                                                    {/* Noise Texture Overlay (hover) */}
                                                                    <div
                                                                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700 z-0 pointer-events-none"
                                                                        style={{
                                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                                                                            backgroundSize: '100px 100px'
                                                                        }}
                                                                    ></div>

                                                                    {/* Icon - Hide if image exists */}
                                                                    {!weaponImage && (
                                                                        <Sword className={`w-8 h-8 ${rarityColors?.text || 'text-[#c8aa6e]'} mb-1 relative z-10`} />
                                                                    )}

                                                                    {/* Rarity Badge */}
                                                                    {equippedItem.rareza && (
                                                                        <span className={`text-[9px] uppercase font-bold ${rarityColors?.text || 'text-slate-400'} relative z-10`}>
                                                                            {equippedItem.rareza}
                                                                        </span>
                                                                    )}

                                                                    {/* Name */}
                                                                    <span className="text-[#f0e6d2] font-['Cinzel'] text-sm uppercase tracking-wider text-center px-2 font-bold mt-1 relative z-10">
                                                                        {equippedItem.name}
                                                                    </span>

                                                                    {/* Stats */}
                                                                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-2 text-[10px] relative z-10">
                                                                        {(equippedItem.damage || equippedItem.dano) && (
                                                                            <span className="text-red-300">
                                                                                <span className="text-slate-500">Daño:</span> {equippedItem.damage || equippedItem.dano}
                                                                            </span>
                                                                        )}
                                                                        {(equippedItem.range || equippedItem.alcance) && (
                                                                            <span className="text-slate-300">
                                                                                <span className="text-slate-500">Alc:</span> {equippedItem.range || equippedItem.alcance}
                                                                            </span>
                                                                        )}
                                                                        {(equippedItem.consumption || equippedItem.consumo) && (
                                                                            <span className="text-yellow-300">
                                                                                <span className="text-slate-500">Coste:</span> {equippedItem.consumption || equippedItem.consumo}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Traits */}
                                                                    {(equippedItem.traits || equippedItem.rasgos || equippedItem.trait) && (
                                                                        <div className="flex flex-wrap justify-center gap-1 mt-2 relative z-10">
                                                                            {(equippedItem.traits || equippedItem.rasgos || equippedItem.trait).toString().split(',').slice(0, 3).map((t, i) => renderTrait(t, i))}
                                                                        </div>
                                                                    )}

                                                                    {/* Proficiency Warning */}
                                                                    {proficiencyWarning && (
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-orange-600/90 text-white text-[10px] py-1 px-2 flex items-center justify-center gap-1 z-20">
                                                                            <FiAlertTriangle className="w-3 h-3" />
                                                                            {proficiencyWarning}
                                                                        </div>
                                                                    )}

                                                                    {/* Unequip Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUnequipItem(key);
                                                                        }}
                                                                        className="absolute top-2 left-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                                    >
                                                                        <FiX className="w-3 h-3" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sword className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                                                                    <span className="text-slate-600 font-['Cinzel'] text-sm uppercase tracking-widest">{label}</span>
                                                                    <span className="text-[10px] text-slate-700 mt-1">Clic para equipar</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Hand Badge */}
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${badgeClass}`}>
                                                                {badge}
                                                            </span>
                                                        </div>

                                                        {/* Equipment Selector Dropdown */}
                                                        {isSlotActive && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0b1120] border border-[#c8aa6e]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                            >
                                                                <div className="p-2 border-b border-slate-700">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                        Seleccionar arma del inventario
                                                                    </span>
                                                                </div>
                                                                {inventoryWeapons.length > 0 ? (
                                                                    inventoryWeapons.map((weapon, idx) => {
                                                                        const isAlreadyEquipped =
                                                                            (equippedItems.mainHand && equippedItems.mainHand._index === weapon._index) ||
                                                                            (equippedItems.offHand && equippedItems.offHand._index === weapon._index);
                                                                        const warning = getWeaponProficiencyWarning(weapon);

                                                                        return (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => handleEquipItem(key, weapon)}
                                                                                disabled={isAlreadyEquipped}
                                                                                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0
                                                                                    ${isAlreadyEquipped ? 'opacity-40 cursor-not-allowed' : ''}
                                                                                    ${warning ? 'bg-orange-900/10' : ''}
                                                                                `}
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {getObjectImage(weapon) ? (
                                                                                        <img src={getObjectImage(weapon)} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <Sword className="w-5 h-5" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-[#f0e6d2] font-medium truncate">{weapon.name}</div>
                                                                                    <div className="flex gap-2 text-[10px]">
                                                                                        {weapon.damage && <span className="text-red-300">Daño: {weapon.damage}</span>}
                                                                                        {weapon.category && <span className="text-slate-500">{weapon.category}</span>}
                                                                                    </div>
                                                                                    {warning && (
                                                                                        <div className="flex items-center gap-1 text-[10px] text-orange-400 mt-1">
                                                                                            <FiAlertTriangle className="w-3 h-3" />
                                                                                            {warning}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {isAlreadyEquipped && (
                                                                                    <span className="text-[10px] text-slate-500 uppercase">Equipado</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="p-4 text-center text-slate-500 text-sm">
                                                                        No hay armas en el inventario.
                                                                        <br />
                                                                        <span className="text-[10px]">Añade armas desde la pestaña Inventario</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. ARMADURA (Armor) */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Shield className="w-5 h-5 text-[#c8aa6e]" />
                                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-md tracking-[0.2em] uppercase">
                                                Cuerpo
                                            </h3>
                                        </div>
                                        <div className="relative group">
                                            {(() => {
                                                const equippedArmor = equippedItems.body;
                                                const proficiencyWarning = equippedArmor ? getArmorProficiencyWarning(equippedArmor) : null;
                                                const isSlotActive = activeSlotSelector === 'body';
                                                const rarityColors = equippedArmor ? getRarityColors(equippedArmor) : null;

                                                // Helper to get armor image
                                                const getArmorImage = (armorName) => {
                                                    if (!armorName) return null;
                                                    const name = armorName.toLowerCase();
                                                    // Check specific/longer names first to avoid partial matches
                                                    if (name.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.png';
                                                    if (name.includes('armadura de placas')) return '/armaduras/armadura_de_placas.png';
                                                    if (name.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.png';
                                                    if (name.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.png';
                                                    if (name.includes('armadura de acero')) return '/armaduras/armadura_de_acero.png';
                                                    if (name.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.png';
                                                    if (name.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.png';
                                                    if (name.includes('armadura bandeada')) return '/armaduras/armadura bandeada.png';
                                                    if (name.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.png';
                                                    if (name.includes('armadura de piel') || name.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.png';
                                                    if (name.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.png';
                                                    if (name.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.png';
                                                    if (name.includes('camisote de mallas')) return '/armaduras/cota_de_malla.png';
                                                    return null;
                                                };

                                                const armorImage = equippedArmor ? (getObjectImage(equippedArmor) || getArmorImage(equippedArmor.name)) : null;

                                                return (
                                                    <>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveSlotSelector(isSlotActive ? null : 'body');
                                                            }}
                                                            className={`h-32 border-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden p-3
                                                                ${equippedArmor
                                                                    ? proficiencyWarning
                                                                        ? 'border-orange-500/50'
                                                                        : `${rarityColors?.border || 'border-[#c8aa6e]/50'}`
                                                                    : 'border-dashed border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5'
                                                                }
                                                                ${isSlotActive ? 'ring-2 ring-[#c8aa6e]' : ''}
                                                            `}
                                                        >
                                                            {equippedArmor ? (
                                                                <>
                                                                    {/* Armor Image Background */}
                                                                    {armorImage && (
                                                                        <>
                                                                            <img
                                                                                src={armorImage}
                                                                                alt={equippedArmor.name}
                                                                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 z-0"
                                                                            />
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-0"></div>
                                                                        </>
                                                                    )}

                                                                    {/* Rarity Gradient Background (bottom-right corner) */}
                                                                    {!armorImage && (
                                                                        <div className={`absolute inset-0 bg-gradient-to-tl ${rarityColors?.gradient || 'from-slate-800/30'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
                                                                    )}

                                                                    {/* Noise Texture Overlay (hover) */}
                                                                    <div
                                                                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700 z-0 pointer-events-none"
                                                                        style={{
                                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                                                                            backgroundSize: '100px 100px'
                                                                        }}
                                                                    ></div>

                                                                    {/* Icon - Hide if image exists unless you want it as an overlay? Let's keep it but maybe smaller or subtle? 
                                                                        User said "intentar introducir de forma muy estética estas imágenes". 
                                                                        Usually if there is card art, we don't need the generic icon. 
                                                                        But let's keep it consistent for now or conditionally hide it.
                                                                        I'll hide the generic shield icon if there is an image, to show off the art. 
                                                                    */}
                                                                    {!armorImage && (
                                                                        <Shield className={`w-6 h-6 ${rarityColors?.text || 'text-[#c8aa6e]'} mb-1 relative z-10`} />
                                                                    )}

                                                                    {/* Rarity Badge */}
                                                                    {equippedArmor.rareza && (
                                                                        <span className={`text-[9px] uppercase font-bold ${rarityColors?.text || 'text-slate-400'} relative z-10 drop-shadow-md`}>
                                                                            {equippedArmor.rareza}
                                                                        </span>
                                                                    )}

                                                                    {/* Name */}
                                                                    <span className="text-[#f0e6d2] font-['Cinzel'] text-sm uppercase tracking-wider text-center px-2 font-bold relative z-10">
                                                                        {equippedArmor.name}
                                                                    </span>

                                                                    {/* Stats */}
                                                                    {(equippedArmor.defense || equippedArmor.defensa) && (
                                                                        <span className="text-[10px] text-blue-300 mt-1 relative z-10">
                                                                            <span className="text-slate-500">Defensa:</span> {equippedArmor.defense || equippedArmor.defensa}
                                                                        </span>
                                                                    )}

                                                                    {/* Traits */}
                                                                    {(equippedArmor.traits || equippedArmor.rasgos || equippedArmor.trait) && (
                                                                        <div className="flex flex-wrap justify-center gap-1 mt-1 relative z-10">
                                                                            {(equippedArmor.traits || equippedArmor.rasgos || equippedArmor.trait).toString().split(',').slice(0, 3).map((t, i) => renderTrait(t, i))}
                                                                        </div>
                                                                    )}

                                                                    {/* Unequip Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUnequipItem('body');
                                                                        }}
                                                                        className="absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                                    >
                                                                        <FiX className="w-3 h-3" />
                                                                    </button>

                                                                    {/* Proficiency Warning */}
                                                                    {proficiencyWarning && (
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-orange-600/90 text-white text-[10px] py-1 px-2 flex items-center justify-center gap-1 z-20">
                                                                            <FiAlertTriangle className="w-3 h-3" />
                                                                            {proficiencyWarning}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Shield className="w-6 h-6 text-slate-600 mb-2 opacity-50" />
                                                                    <span className="text-slate-600 font-['Cinzel'] text-sm uppercase tracking-widest">Armadura</span>
                                                                    <span className="text-[10px] text-slate-700">Clic para equipar</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {isSlotActive && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0b1120] border border-[#c8aa6e]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                            >
                                                                <div className="p-2 border-b border-slate-700">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                        Seleccionar armadura del inventario
                                                                    </span>
                                                                </div>
                                                                {inventoryArmor.length > 0 ? (
                                                                    inventoryArmor.map((armor, idx) => {
                                                                        const isAlreadyEquipped = equippedItems.body && equippedItems.body._index === armor._index;
                                                                        const warning = getArmorProficiencyWarning(armor);

                                                                        return (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => handleEquipItem('body', armor)}
                                                                                disabled={isAlreadyEquipped}
                                                                                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0
                                                                                    ${isAlreadyEquipped ? 'opacity-40 cursor-not-allowed' : ''}
                                                                                    ${warning ? 'bg-orange-900/10' : ''}
                                                                                `}
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {getObjectImage(armor) ? (
                                                                                        <img src={getObjectImage(armor)} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <Shield className="w-5 h-5" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-[#f0e6d2] font-medium truncate">{armor.name}</div>
                                                                                    <div className="flex gap-2 text-[10px]">
                                                                                        {armor.defense && <span className="text-blue-300">Defensa: {armor.defense}</span>}
                                                                                        {armor.category && <span className="text-slate-500">{armor.category}</span>}
                                                                                    </div>
                                                                                    {warning && (
                                                                                        <div className="flex items-center gap-1 text-[10px] text-orange-400 mt-1">
                                                                                            <FiAlertTriangle className="w-3 h-3" />
                                                                                            {warning}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {isAlreadyEquipped && (
                                                                                    <span className="text-[10px] text-slate-500 uppercase">Equipado</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="p-4 text-center text-slate-500 text-sm">
                                                                        No hay armaduras en el inventario.
                                                                        <br />
                                                                        <span className="text-[10px]">Añade armaduras desde la pestaña Inventario</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* 3. CINTURON (Belt - Consumables) */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <GiBelt className="w-5 h-5 text-[#c8aa6e]" />
                                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-md tracking-[0.2em] uppercase">
                                                Cinturón (Consumibles)
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {Array.from({ length: beltSlotCount }).map((_, idx) => {
                                                const slotId = `belt_${idx}`;
                                                const equippedItem = equippedItems[slotId];
                                                const isSlotActive = activeSlotSelector === slotId;
                                                // Filter available objects for belt slots
                                                const availableObjects = equipment.filter(item => item.itemType === 'object');
                                                const objectImage = equippedItem ? getObjectImage(equippedItem) : null;
                                                const itemRarityColors = equippedItem ? getRarityColors(equippedItem.rareza) : null;

                                                return (
                                                    <div key={idx} className="relative">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveSlotSelector(isSlotActive ? null : slotId);
                                                            }}
                                                            className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative group overflow-hidden
                                                                ${equippedItem
                                                                    ? `${itemRarityColors?.border || 'border-slate-600'} bg-slate-800/20`
                                                                    : isSlotActive
                                                                        ? 'border-dashed border-[#c8aa6e] bg-[#c8aa6e]/5 ring-1 ring-[#c8aa6e]'
                                                                        : 'border-dashed border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5'
                                                                }`}
                                                        >
                                                            {equippedItem ? (
                                                                <>
                                                                    {objectImage ? (
                                                                        <>
                                                                            <img
                                                                                src={objectImage}
                                                                                alt={equippedItem.name}
                                                                                className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-2xl mb-1 drop-shadow-md relative z-10">📦</div>
                                                                    )}

                                                                    {/* Edit Note Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingBeltNote(slotId);
                                                                            setTempBeltNote(equippedItem.note || '');
                                                                            setActiveSlotSelector(null);
                                                                        }}
                                                                        className={`absolute top-2 left-2 p-1 rounded z-40 transition-all ${equippedItem.note
                                                                            ? 'bg-[#c8aa6e]/20 text-[#c8aa6e] opacity-100'
                                                                            : 'bg-slate-600/50 text-slate-200 opacity-0 group-hover:opacity-100'
                                                                            } hover:bg-[#c8aa6e]/40 hover:text-[#f0e6d2]`}
                                                                        title={equippedItem.note ? "Editar nota" : "Añadir nota"}
                                                                    >
                                                                        <FiEdit2 className="w-3 h-3" />
                                                                    </button>

                                                                    <span className="text-white font-['Cinzel'] text-[10px] uppercase font-bold text-center px-1 line-clamp-2 leading-tight relative z-10 drop-shadow-md">
                                                                        {formatItemName(equippedItem.name)}
                                                                    </span>

                                                                    {/* Aesthetic Bottom Controls Bar */}
                                                                    <div
                                                                        className="absolute bottom-0 inset-x-0 h-10 flex items-end justify-between px-1 pb-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-30 opacity-100 transition-opacity"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors active:scale-90"
                                                                            onClick={() => handleUpdateQuantity(slotId, -1)}
                                                                        >
                                                                            <FiMinus className="w-3.5 h-3.5" />
                                                                        </button>

                                                                        <span className="text-xs font-bold text-[#c8aa6e] font-['Cinzel'] mb-2 drop-shadow-lg">
                                                                            x{equippedItem.quantity || 1}
                                                                        </span>

                                                                        <button
                                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors active:scale-90"
                                                                            onClick={() => handleUpdateQuantity(slotId, 1)}
                                                                        >
                                                                            <FiPlus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>

                                                                    {/* Unequip Button (Original Style) */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUnequipItem(slotId);
                                                                        }}
                                                                        className="absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                                        title="Desequipar"
                                                                    >
                                                                        <FiX className="w-3 h-3" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-slate-600 font-['Cinzel'] text-xs uppercase tracking-widest mb-1">Slot {idx + 1}</span>
                                                                    <span className="text-[10px] text-slate-700 group-hover:text-slate-500 transition-colors">Vacío</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Note Editor Components - Responsive Handling */}
                                                        {editingBeltNote === slotId && (
                                                            <>
                                                                {/* Mobile Version: Fixed Modal */}
                                                                <div
                                                                    className="md:hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingBeltNote(null);
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="w-full max-w-[300px] bg-[#0b1120] border border-[#c8aa6e] rounded-xl p-4 flex flex-col shadow-[0_0_50px_rgba(200,170,110,0.2)] scale-100 animate-in zoom-in-95 duration-200"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <h4 className="text-[#c8aa6e] font-bold uppercase mb-3 font-['Cinzel'] text-center tracking-widest text-sm">
                                                                            Nota
                                                                        </h4>
                                                                        <textarea
                                                                            value={tempBeltNote}
                                                                            onChange={(e) => setTempBeltNote(e.target.value)}
                                                                            className="w-full h-32 bg-slate-900/50 text-sm text-slate-200 resize-none border border-slate-700/50 rounded-lg p-3 mb-4 focus:outline-none focus:border-[#c8aa6e]/50 focus:bg-slate-900 overflow-y-auto custom-scrollbar shadow-inner"
                                                                            placeholder="Escribe una nota..."
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-between gap-3">
                                                                            <button
                                                                                onClick={() => setEditingBeltNote(null)}
                                                                                className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                                                            >
                                                                                <FiX className="w-4 h-4" />
                                                                                <span className="text-xs uppercase font-bold tracking-wider">Cancelar</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (onUpdateEquipped && equippedItem) {
                                                                                        onUpdateEquipped(slotId, { ...equippedItem, note: tempBeltNote });
                                                                                    }
                                                                                    setEditingBeltNote(null);
                                                                                }}
                                                                                className="flex-1 py-2 rounded-lg bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 text-[#c8aa6e] hover:bg-[#c8aa6e]/20 hover:text-[#f0e6d2] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(200,170,110,0.1)]"
                                                                            >
                                                                                <FiCheck className="w-4 h-4" />
                                                                                <span className="text-xs uppercase font-bold tracking-wider">Guardar</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Desktop Version: In-Slot Overlay (Restored) */}
                                                                <div
                                                                    className="hidden md:flex absolute inset-0 z-[60] bg-[#0b1120] border border-[#c8aa6e] rounded-lg p-2 flex-col shadow-2xl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <span className="text-[10px] text-[#c8aa6e] font-bold uppercase mb-1 font-['Cinzel'] text-center">Nota</span>
                                                                    <textarea
                                                                        value={tempBeltNote}
                                                                        onChange={(e) => setTempBeltNote(e.target.value)}
                                                                        className="flex-1 w-full bg-slate-900/50 text-xs text-slate-200 resize-none border border-slate-700/50 rounded p-1 mb-2 focus:outline-none focus:border-[#c8aa6e]/50"
                                                                        placeholder="..."
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex justify-between gap-2">
                                                                        <button
                                                                            onClick={() => setEditingBeltNote(null)}
                                                                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded flex-1 flex justify-center"
                                                                            title="Cancelar"
                                                                        >
                                                                            <FiX className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (onUpdateEquipped && equippedItem) {
                                                                                    onUpdateEquipped(slotId, { ...equippedItem, note: tempBeltNote });
                                                                                }
                                                                                setEditingBeltNote(null);
                                                                            }}
                                                                            className="p-1 text-[#c8aa6e] hover:text-[#f0e6d2] hover:bg-[#c8aa6e]/10 rounded flex-1 flex justify-center"
                                                                            title="Guardar"
                                                                        >
                                                                            <FiCheck className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Selection Dropdown */}
                                                        {isSlotActive && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0b1120] border border-[#c8aa6e]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto w-full z-[100]"
                                                            >
                                                                <div className="p-2 border-b border-slate-700">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                        Seleccionar Objeto
                                                                    </span>
                                                                </div>
                                                                {availableObjects.length > 0 ? (
                                                                    availableObjects.map((item, i) => {
                                                                        const itemImg = getObjectImage(item);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => handleEquipItem(slotId, item)}
                                                                                className="w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0"
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {itemImg ? (
                                                                                        <img src={itemImg} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <span className="text-lg leading-none">📦</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-[#f0e6d2] font-medium truncate">{formatItemName(item.name)}</div>
                                                                                    {(item.description || item.detail) && (
                                                                                        <div className="flex gap-2 text-[10px]">
                                                                                            <span className="text-slate-500 truncate">{item.description || item.detail}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="p-4 text-center text-slate-500 text-sm">
                                                                        No hay objetos en el inventario.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {/* Expand/Reduce Buttons */}
                                            {beltSlotCount < 9 && (
                                                <button
                                                    onClick={() => {
                                                        const newCount = Math.min(beltSlotCount + 1, 9);
                                                        if (onUpdateEquipped) {
                                                            onUpdateEquipped('beltSlotCount', newCount);
                                                        }
                                                    }}
                                                    className="aspect-square border-2 border-dashed border-[#c8aa6e]/30 rounded-lg flex flex-col items-center justify-center hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 transition-all cursor-pointer group"
                                                >
                                                    <FiPlus className="w-8 h-8 text-[#c8aa6e]/50 group-hover:text-[#c8aa6e] transition-colors" />
                                                    <span className="text-[10px] text-[#c8aa6e]/50 group-hover:text-[#c8aa6e] mt-1 font-['Cinzel'] uppercase tracking-wider">Ampliar</span>
                                                </button>
                                            )}
                                            {beltSlotCount > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const indices = Object.entries(equippedItems)
                                                            .filter(([k, v]) => k.startsWith('belt_') && v)
                                                            .map(([k]) => parseInt(k.split('_')[1], 10));
                                                        const maxIndex = Math.max(-1, ...indices);
                                                        // Prevent reducing below the last equipped slot
                                                        const newCount = Math.max(beltSlotCount - 1, 1, maxIndex + 1);
                                                        if (onUpdateEquipped) {
                                                            onUpdateEquipped('beltSlotCount', newCount);
                                                        }
                                                    }}
                                                    className="aspect-square border-2 border-dashed border-red-500/30 rounded-lg flex flex-col items-center justify-center hover:border-red-500 hover:bg-red-500/10 transition-all cursor-pointer group"
                                                >
                                                    <FiMinus className="w-8 h-8 text-red-500/50 group-hover:text-red-500 transition-colors" />
                                                    <span className="text-[10px] text-red-500/50 group-hover:text-red-500 mt-1 font-['Cinzel'] uppercase tracking-wider">Reducir</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4. ACCESORIOS (Accessories) */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Zap className="w-5 h-5 text-[#c8aa6e]" />
                                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-md tracking-[0.2em] uppercase">
                                                Accesorios
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[1, 2].map(slot => (
                                                <div key={slot} className="h-16 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center gap-2 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 transition-all cursor-pointer">
                                                    <Zap className="w-4 h-4 text-slate-600 opacity-50" />
                                                    <span className="text-slate-600 font-['Cinzel'] text-xs uppercase tracking-widest">Accesorio {slot}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Relic Slots (Vertical Stack) */}
                    <div className="bg-[#0b1120] border border-[#c8aa6e]/20 rounded-xl p-6 shadow-2xl flex flex-col h-fit max-h-[850px] overflow-y-auto sticky top-8 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg tracking-widest mb-8 text-center flex items-center justify-center gap-2">
                            <FiShield className="w-5 h-5" />
                            TALENTOS
                        </h3>

                        <div className="flex flex-col gap-8 items-center justify-between">
                            {/* Active Relic */}
                            <div className="relative group w-full flex flex-col items-center">
                                <div className="relative z-10">
                                    <HexIcon size="lg" active>
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                            <FiShield className="w-10 h-10 text-[#c8aa6e]" />
                                        </div>
                                    </HexIcon>
                                    {/* Rarity Badge - Now clickable */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowRarityDropdown(!showRarityDropdown); }}
                                            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${selectedRarity.color} text-[10px] font-bold px-2 py-0.5 rounded shadow hover:opacity-80 transition-opacity whitespace-nowrap`}
                                        >
                                            {selectedRarity.label.toUpperCase()}
                                        </button>
                                        {/* Rarity Dropdown */}
                                        {showRarityDropdown && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                                                {RARITIES.map((rarity) => (
                                                    <button
                                                        key={rarity.id}
                                                        onClick={() => {
                                                            if (onUpdateTalent) {
                                                                onUpdateTalent('rarity', rarity.id);
                                                            }
                                                            setShowRarityDropdown(false);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-bold hover:bg-slate-800 transition-colors ${rarity.color} ${talentRarity === rarity.id ? 'bg-slate-800' : ''
                                                            }`}
                                                    >
                                                        {rarity.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 text-center w-full">
                                    {/* Editable Title */}
                                    {isEditingTitle ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onBlur={() => {
                                                    if (onUpdateTalent && editingTitle.trim()) {
                                                        onUpdateTalent('title', editingTitle);
                                                    }
                                                    setIsEditingTitle(false);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (onUpdateTalent && editingTitle.trim()) {
                                                            onUpdateTalent('title', editingTitle);
                                                        }
                                                        setIsEditingTitle(false);
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setIsEditingTitle(false);
                                                    }
                                                }}
                                                autoFocus
                                                className="bg-slate-900 border border-[#c8aa6e] rounded px-2 py-1 text-[#c8aa6e] font-bold text-sm font-['Cinzel'] uppercase tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-[#c8aa6e]/50"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (onUpdateTalent && editingTitle.trim()) {
                                                        onUpdateTalent('title', editingTitle);
                                                    }
                                                    setIsEditingTitle(false);
                                                }}
                                                className="p-1 text-green-400 hover:text-green-300"
                                            >
                                                <FiCheck className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setEditingTitle(talentTitle);
                                                setIsEditingTitle(true);
                                            }}
                                            className="w-full hover:text-[#c8aa6e] transition-colors"
                                        >
                                            <h5 className="text-[#c8aa6e] font-bold text-sm font-['Cinzel'] uppercase tracking-wider text-center">
                                                {talentTitle}
                                            </h5>
                                        </button>
                                    )}

                                    {/* Editable Description */}
                                    {isEditingDescription ? (
                                        <div className="mt-2">
                                            <textarea
                                                value={editingDescription}
                                                onChange={(e) => setEditingDescription(e.target.value)}
                                                onBlur={() => {
                                                    if (onUpdateTalent && editingDescription.trim()) {
                                                        onUpdateTalent('description', editingDescription);
                                                    }
                                                    setIsEditingDescription(false);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setIsEditingDescription(false);
                                                    }
                                                }}
                                                autoFocus
                                                rows={3}
                                                className="w-full max-w-[200px] bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 leading-snug focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (onUpdateTalent && editingDescription.trim()) {
                                                        onUpdateTalent('description', editingDescription);
                                                    }
                                                    setIsEditingDescription(false);
                                                }}
                                                className="mt-1 p-1 text-green-400 hover:text-green-300"
                                            >
                                                <FiCheck className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setEditingDescription(talentDescription);
                                                setIsEditingDescription(true);
                                            }}
                                            className="mt-1 w-full max-w-[200px] mx-auto hover:bg-slate-900/30 rounded px-2 py-1 transition-colors"
                                        >
                                            <p className="text-xs text-slate-400 leading-snug text-center">
                                                {talentDescription}
                                            </p>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="w-full h-[1px] bg-slate-800"></div>

                            {/* Locked slots */}
                            {/* Talent Slots (Formerly Locked) */}
                            <div className="space-y-3 w-full">
                                {[0, 1, 2].map((index) => {
                                    const equippedTalent = talentSlots[index];
                                    const isSlotActive = activeTalentSlotSelector === index;

                                    return (
                                        <div key={index} className="relative">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveTalentSlotSelector(isSlotActive ? null : index);
                                                }}
                                                className={`flex items-center gap-4 group transition-all cursor-pointer rounded-lg p-2 border border-transparent
                                                    ${isSlotActive ? 'bg-slate-800 border-[#c8aa6e] ring-1 ring-[#c8aa6e]' : 'hover:bg-slate-800/50 hover:border-slate-700'}
                                                `}
                                            >
                                                <HexIcon size="sm" active={!!equippedTalent}>
                                                    {equippedTalent ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                            <FiStar className="w-4 h-4 text-[#c8aa6e]" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                            <FiStar className="w-4 h-4 text-slate-700" />
                                                        </div>
                                                    )}
                                                </HexIcon>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-xs uppercase tracking-wider truncate transition-colors
                                                        ${equippedTalent ? 'text-[#c8aa6e]' : 'text-slate-500 group-hover:text-slate-400'}
                                                    `}>
                                                        {equippedTalent ? equippedTalent.name : 'Ranura Vacía'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 line-clamp-1">
                                                        {equippedTalent ? (equippedTalent.description || equippedTalent.desc || equippedTalent.preview || 'Sin descripción') : 'Clic para seleccionar...'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dropdown for Talent Selection */}
                                            {isSlotActive && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0b1120] border border-[#c8aa6e]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                                                >
                                                    <div className="p-2 border-b border-slate-700 bg-slate-900/90 sticky top-0 backdrop-blur-sm z-10">
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block text-center font-bold">
                                                            Talentos Disponibles
                                                        </span>
                                                    </div>
                                                    {availableTalentOptions.length > 0 ? (
                                                        availableTalentOptions.map((opt, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleEquipTalentSlot(index, opt)}
                                                                className="w-full p-2 text-left hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0 flex flex-col gap-0.5"
                                                            >
                                                                <span className="text-xs font-bold text-[#f0e6d2]">{opt.name}</span>
                                                                <span className="text-[10px] text-slate-500 line-clamp-2">{opt.description || opt.desc}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-slate-500 text-[10px]">
                                                            No hay talentos activos.<br />
                                                            <span className="opacity-70">Actívalos en la sección "Reliquias".</span>
                                                        </div>
                                                    )}
                                                    {/* Option to clear slot */}
                                                    {equippedTalent && (
                                                        <button
                                                            onClick={() => handleEquipTalentSlot(index, null)}
                                                            className="w-full p-2 text-left bg-red-900/10 hover:bg-red-900/30 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t border-slate-800"
                                                        >
                                                            <FiX className="w-3 h-3" /> Desequipar
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* SEPARATOR */}
                            <div className="w-full h-[1px] bg-slate-800 my-1"></div>

                            {/* PROFICIENCIES BLOCK */}
                            <div className="w-full space-y-3">
                                <h4 className="text-[#c8aa6e] font-['Cinzel'] text-xs uppercase tracking-widest text-center">Competencias</h4>

                                {/* Weapons */}
                                <div>
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider text-center">Armas</div>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['Simples', 'Marciales', 'Especiales'].map(type => {
                                            const key = type === 'Simples' ? 'simple' : type === 'Marciales' ? 'martial' : 'special';
                                            const isActive = summary.proficiencies?.weapons?.[key];
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => onUpdateProficiency && onUpdateProficiency('weapons', key)}
                                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-all ${isActive
                                                        ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0b1120] shadow-[0_0_15px_rgba(200,170,110,0.4)]'
                                                        : 'bg-transparent border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Armor */}
                                <div>
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider text-center">Armaduras</div>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['Ligera', 'Media', 'Pesada'].map(type => {
                                            const key = type === 'Ligera' ? 'light' : type === 'Media' ? 'medium' : 'heavy';
                                            const isActive = summary.proficiencies?.armor?.[key];
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => onUpdateProficiency && onUpdateProficiency('armor', key)}
                                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-all ${isActive
                                                        ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0b1120] shadow-[0_0_15px_rgba(200,170,110,0.4)]'
                                                        : 'bg-transparent border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip dedicado para rasgos en esta vista */}
            <Tooltip
                id="trait-tooltip"
                place="top"
                className="max-w-[90vw] sm:max-w-xs whitespace-pre-line z-[9999]"
            />
        </div>
    );
};

LoadoutView.propTypes = {
    dndClass: PropTypes.shape({
        equipment: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string,
                type: PropTypes.string,
                category: PropTypes.string,
                detail: PropTypes.string,
                description: PropTypes.string
            })),
            PropTypes.object
        ]),
        equippedItems: PropTypes.shape({
            mainHand: PropTypes.object,
            offHand: PropTypes.object,
            body: PropTypes.object
        }),
        summary: PropTypes.shape({
            proficiencies: PropTypes.shape({
                weapons: PropTypes.object,
                armor: PropTypes.object
            })
        }),
        talents: PropTypes.object
    }).isRequired,
    equipmentCatalog: PropTypes.shape({
        weapons: PropTypes.array,
        armor: PropTypes.array,
        abilities: PropTypes.array
    }),
    onAddEquipment: PropTypes.func,
    onRemoveEquipment: PropTypes.func,
    onUpdateTalent: PropTypes.func,
    onUpdateProficiency: PropTypes.func,
    onUpdateEquipped: PropTypes.func
};

export default LoadoutView;
