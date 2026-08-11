import React, { useState, useMemo } from 'react';
import { Tooltip } from 'react-tooltip';
import PropTypes from 'prop-types';
import { FiShield, FiX, FiCheck, FiAlertTriangle, FiStar, FiPlus, FiMinus, FiEdit2 } from 'react-icons/fi';
import { GiBelt } from 'react-icons/gi';
import { Sword, Shield, Zap, Gem, LockKeyhole } from 'lucide-react';
import HexIcon from './HexIcon';
import RogueliteTalentsPanel from './RogueliteTalentsPanel';
import RogueliteInventoryCard from './RogueliteInventoryCard';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useCustomEquipmentImages, getCustomImage } from '../hooks/useCustomEquipmentImages';

import { normalizeGlossaryWord, getGlossaryTooltipId } from '../utils/glossary';
import {
    normalizeEquippedHandSlots,
    resolveEquippedHandOccupancy,
    resolveEquipmentHandsRequired,
} from '../features/roguelite/equipmentPool';

const INVENTORY_CATEGORIES = [
    { id: 'weapons', label: 'Armas' },
    { id: 'armor', label: 'Armaduras' },
    { id: 'abilities', label: 'Habilidades' },
    { id: 'objects', label: 'Objetos' },
    { id: 'accessories', label: 'Accesorios' },
];

const normalizeInventorySearch = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const resolveActionCost = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    const actionMarks = rawValue.match(/🟡/g);
    if (actionMarks?.length) return Math.min(3, actionMarks.length);

    const numericMatch = rawValue.match(/\d+/);
    if (numericMatch) return Math.min(3, Math.max(0, Number(numericMatch[0])));

    return rawValue;
};

const resolveVisibleTraits = (item, handsRequired) => {
    const rawTraits = item.traits || item.rasgos || item.trait || '';
    const traits = rawTraits.toString().split(',').map((trait) => trait.trim()).filter(Boolean);
    if (handsRequired !== 2) return traits;

    return traits.filter((trait) => !/(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/i.test(trait));
};

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
    const competence = (item.competence || item.competencia || item.weaponCompetence || '').toString().toLowerCase();
    const source = `${competence} ${category} ${traits}`;

    if (source.includes('simple')) return 'simple';
    if (source.includes('marcial')) return 'martial';
    if (source.includes('especial') || source.includes('arcana') || source.includes('arcano')) return 'special';

    // Default to simple if no type found
    return null;
};

// Función para detectar el tipo de armadura desde los rasgos/categoría
const getArmorProficiencyType = (item) => {
    const traits = (item.traits || item.rasgos || item.trait || '').toString().toLowerCase();
    const category = (item.category || item.categoria || '').toString().toLowerCase();
    const competence = (item.competence || item.competencia || item.armorCompetence || '').toString().toLowerCase();
    const source = `${competence} ${category} ${traits}`;

    if (source.includes('ligera')) return 'light';
    if (source.includes('media')) return 'medium';
    if (source.includes('pesada')) return 'heavy';

    return null;
};

const normalizeRarityKey = (value) => (value || '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getRarityName = (itemOrRarity) => {
    if (typeof itemOrRarity === 'string') return itemOrRarity;
    return itemOrRarity?.rareza || itemOrRarity?.rarity || itemOrRarity?.Rareza || itemOrRarity?.Rarity || '';
};

const hexToRgba = (color, alpha) => {
    if (typeof color !== 'string') return `rgba(200, 170, 110, ${alpha})`;
    const hex = color.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return color;

    const fullHex = hex.length === 3
        ? hex.split('').map((char) => `${char}${char}`).join('')
        : hex;
    const intValue = parseInt(fullHex, 16);
    const r = (intValue >> 16) & 255;
    const g = (intValue >> 8) & 255;
    const b = intValue & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveRarityColor = (rarity, rarityColorMap = {}) => {
    if (!rarity || !rarityColorMap || typeof rarityColorMap !== 'object') return null;
    const rawKey = rarity.toString().trim();
    const normalizedKey = normalizeRarityKey(rawKey);

    for (const [key, value] of Object.entries(rarityColorMap)) {
        if (!value) continue;
        const currentKey = (key || '').toString().trim();
        if (
            currentKey === rawKey ||
            currentKey.toLowerCase() === rawKey.toLowerCase() ||
            normalizeRarityKey(currentKey) === normalizedKey
        ) {
            return value;
        }
    }

    return null;
};

// Función para obtener los colores de rareza
const getRarityColors = (itemOrRarity, rarityColorMap = {}) => {
    const rarityName = getRarityName(itemOrRarity);
    const rareza = normalizeRarityKey(rarityName);
    let fallback = { border: 'border-slate-600', bg: 'bg-slate-800/30', text: 'text-slate-400', glow: 'from-slate-800', stripe: 'bg-slate-600', gradient: 'from-slate-800/50' };

    if (rareza.includes('legendari')) fallback = { border: 'border-orange-500', bg: 'bg-orange-900/30', text: 'text-orange-400', glow: 'from-orange-900/80', stripe: 'bg-orange-500', gradient: 'from-orange-900/50' };
    else if (rareza.includes('epic')) fallback = { border: 'border-purple-500', bg: 'bg-purple-900/30', text: 'text-purple-400', glow: 'from-purple-900/80', stripe: 'bg-purple-500', gradient: 'from-purple-900/50' };
    else if (rareza.includes('rar')) fallback = { border: 'border-blue-500', bg: 'bg-blue-900/30', text: 'text-blue-400', glow: 'from-blue-900/80', stripe: 'bg-blue-500', gradient: 'from-blue-900/50' };
    else if (rareza.includes('poco com')) fallback = { border: 'border-green-500', bg: 'bg-green-900/30', text: 'text-green-400', glow: 'from-green-900/80', stripe: 'bg-green-500', gradient: 'from-green-900/50' };

    const customColor = resolveRarityColor(rarityName, rarityColorMap);
    if (!customColor) return fallback;

    return {
        ...fallback,
        borderStyle: { borderColor: hexToRgba(customColor, 0.72) },
        textStyle: { color: customColor },
        stripeStyle: { backgroundColor: customColor },
        glowStyle: { background: `linear-gradient(90deg, ${hexToRgba(customColor, 0.5)}, transparent 72%)` },
        gradientStyle: { background: `linear-gradient(135deg, ${hexToRgba(customColor, 0.35)}, transparent 70%)` }
    };
};

const getRarityAccent = (itemOrRarity, rarityColorMap = {}) => {
    const rarityName = getRarityName(itemOrRarity);
    const customColor = resolveRarityColor(rarityName, rarityColorMap);
    if (customColor) return customColor;

    const rarity = normalizeRarityKey(rarityName);
    if (rarity.includes('legendari')) return '#e0a45b';
    if (rarity.includes('epic')) return '#b96bd6';
    if (rarity.includes('rar')) return '#54a8dc';
    if (rarity.includes('poco com')) return '#55b978';
    return '#8d9aab';
};

// Función para obtener imagen de objetos genéricos (public/objetos)
const getObjectImage = (item, customImages) => {
    // 1. Priorizar imágenes personalizadas (Base64 o URLs externas)
    if (item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) {
        return item.icon;
    }

    // 1.5. Priorizar imágenes personalizadas subidas desde el Gestor de Equipamiento
    if (customImages) {
        const custom = getCustomImage(item, customImages);
        if (custom) return custom;
    }

    const name = (item.name || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const target = `${name} ${type} ${category}`;

    // Specific Item/Weapon Overrides (Higher Priority)
    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.webp';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.webp';
    if (target.includes('antorcha')) return '/armas/antorcha.webp';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.webp';
    if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.webp';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.webp';
    if (name.includes('cuchillo')) return '/armas/cuchillo.webp';
    if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.webp';

    // Standard Weapons
    if (name.includes('revolver') || name.includes('revólver')) return '/armas/revolver.webp';
    if (name.includes('pistola')) return '/armas/pistola.webp';
    if (name.includes('rifle')) return '/armas/rifle.webp';
    if (name.includes('escopeta')) return '/armas/escopeta.webp';
    if (name.includes('granarco')) return '/armas/arco_largo.webp';
    if (name.includes('arco')) return '/armas/arco_corto.webp';
    if (name.includes('gran clava') || name.includes('granclava')) return '/armas/gran_clava.webp';
    if (name.includes('clava')) return '/armas/clava.webp';
    if (name.includes('jabalina')) return '/armas/jabalina.webp';
    if (name.includes('lanza')) return '/armas/lanza.webp';
    if (name.includes('daga')) return '/armas/daga.webp';
    if (name.includes('hacha de mano')) return '/armas/hacha_de_mano.webp';
    if (name.includes('honda')) return '/armas/honda.webp';
    if (name.includes('tirachinas')) return '/armas/tirachinas.webp';
    if (name.includes('estoque')) return '/armas/estoque.webp';
    if (name.includes('ballesta pesada') || name.includes('granballesta')) return '/armas/ballesta_pesada.webp';
    if (name.includes('ultraballesta')) return '/armas/ultraballesta.webp';
    if (name.includes('ballesta de mano')) return '/armas/ballesta_de_mano.webp';
    if (name.includes('ballesta')) return '/armas/ballesta_ligera.webp';

    // Hammers
    if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.webp';
    if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.webp';
    if (name.includes('gran martillo')) return '/armas/gran_martillo.webp';
    if (name.includes('ultramartillo')) return '/armas/ultramartillo.webp';

    // Swords (Check longer/specific names first)
    if (name.includes('espada bastarda')) return '/armas/espada_bastarda.webp';
    if (name.includes('espada larga')) return '/armas/espada_larga.webp';
    if (name.includes('espada corta')) return '/armas/espada_corta.webp';
    if (name.includes('mandoble')) return '/armas/mandoble.webp';
    if (name.includes('cimitarra')) return '/armas/cimitarra.webp';
    if (name.includes('espada')) return '/armas/espada_de_acero.webp';

    // Natural Weapons
    if (name.includes('fauces')) return '/armas/fauces.webp';
    if (name.includes('garras')) return '/armas/garras.webp';

    // Generic Object Checks
    if (target.includes('chatarra')) return '/objetos/chatarra.webp';
    if (target.includes('comida')) return '/objetos/comida.webp';
    if (target.includes('remedio') || target.includes('vendaje')) return '/objetos/vendaje.webp';
    if (target.includes('dinero') || target.includes('moneda')) return '/objetos/dinero.webp';
    if (target.includes('elixir') || target.includes('poción') || target.includes('pocion')) return '/objetos/elixir.webp';
    if (target.includes('libro')) return '/objetos/libro.webp';
    if (target.includes('llave')) return '/objetos/llave.webp';
    if (target.includes('municion') || target.includes('munición')) return '/objetos/municion.webp';
    if (target.includes('pergamino')) return '/objetos/pergamino.webp';
    if (target.includes('polvora') || target.includes('pólvora')) return '/objetos/polvora.webp';
    if (target.includes('coctel molotov') || target.includes('cóctel molotov')) return '/objetos/coctel_molotov.webp';
    if (target.includes('herramientas') || target.includes('herramienta')) return '/objetos/herramientas.webp';
    if (target.includes('recurso')) return '/objetos/recurso.webp';
    if (target.includes('accesorio')) return '/objetos/accesorio.webp';
    if (target.includes('arma') && !target.includes('armadura')) return '/objetos/arma.webp';

    // Specific Armor Checks (Prioritize over generic 'armadura')
    if (target.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.webp';
    if (target.includes('armadura de placas')) return '/armaduras/armadura_de_placas.webp';
    if (target.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.webp';
    if (target.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.webp';
    if (target.includes('armadura de acero')) return '/armaduras/armadura_de_acero.webp';
    if (target.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.webp';
    if (target.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.webp';
    if (target.includes('armadura bandeada')) return '/armaduras/armadura bandeada.webp';
    if (target.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.webp';
    if (target.includes('armadura de piel') || target.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.webp';
    if (target.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.webp';
    if (target.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.webp';
    if (target.includes('camisote de mallas')) return '/armaduras/cota_de_malla.webp';

    // Generic Armor Fallback
    if (target.includes('armadura')) return '/objetos/armadura.webp';

    // Accessories
    if (name.includes('casco de minero')) return '/accesorios/casco_de_minero.webp';
    if (name.includes('guante blanco')) return '/accesorios/guante_blanco.webp';

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

const LoadoutView = ({
    dndClass,
    isCharacter = false,
    rogueliteRole = 'legacy',
    equipmentCatalog,
    glossary = [],
    rarityColorMap = {},
    onAddEquipment,
    onRemoveEquipment,
    onUpdateTalent,
    onUpdateProficiency,
    onUpdateEquipped,
    onUpdateResource,
    onUpdateTalentCatalog,
    onUpdateEquippedTalentIds,
}) => {
    const customEquipmentImages = useCustomEquipmentImages();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(
        rogueliteRole === 'player' ? 'all' : 'weapons',
    );
    const [showRarityDropdown, setShowRarityDropdown] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [customItems, setCustomItems] = useState([]);
    const [accessories, setAccessories] = useState([]); // Add state for accessories
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

    // Fetch custom items and accessories
    React.useEffect(() => {
        if (rogueliteRole === 'player') {
            setCustomItems([]);
            setAccessories([]);
            return undefined;
        }

        const fetchCustomItems = async () => {
            try {
                const snap = await getDocs(collection(db, 'customItems'));
                const fetched = snap.docs.map(d => d.data());
                setCustomItems(fetched);
            } catch (error) {
                console.error("Error fetching custom items:", error);
            }
        };

        const fetchAccessories = async () => { // Add fetch function
            try {
                const snap = await getDocs(collection(db, 'accessories'));
                const fetched = snap.docs.map(d => {
                    const data = d.data();
                    return { ...data, id: data.id || d.id };
                });
                setAccessories(fetched);
            } catch (error) {
                console.error("Error fetching accessories:", error);
            }
        };

        fetchCustomItems();
        fetchAccessories(); // Call fetch function
        return undefined;
    }, [rogueliteRole]);

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
    const equippedItems = useMemo(
        () => normalizeEquippedHandSlots(
            dndClass.equippedItems || { mainHand: null, offHand: null, body: null },
        ),
        [dndClass.equippedItems],
    );
    const handOccupancy = useMemo(
        () => resolveEquippedHandOccupancy(equippedItems),
        [equippedItems],
    );

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

    // Calculate total physical load
    const totalPhysicalLoad = useMemo(() => {
        let total = 0;
        Object.entries(equippedItems || {}).forEach(([key, item]) => {
            if (item) {
                // Determine load from various possible properties, checking both top-level and nested payload
                const p = item.payload || {};
                const val = item.physicalLoad || item.cargaFisica || item.carga_fisica || item.carga || item.peso || item.weight ||
                    p.physicalLoad || p.cargaFisica || p.carga_fisica || p.carga || p.peso || p.weight || '';
                const loadValue = val.toString().trim();

                if (!loadValue) return;

                // 1. Try direct parseInt (for numeric values)
                let load = parseInt(loadValue, 10);

                // 2. If parseInt failed or if there are icons, try counting icons
                if (isNaN(load) || loadValue.includes('🔲')) {
                    // Count occurrences of 🔲
                    const match = loadValue.match(/🔲/g);
                    if (match) {
                        load = match.length;
                    } else {
                        // 3. Fallback: Try to extract first number found in string if no icons
                        const digitMatch = loadValue.match(/\d+/);
                        if (digitMatch) {
                            load = parseInt(digitMatch[0], 10);
                        } else {
                            load = 0;
                        }
                    }
                }

                if (!isNaN(load) && load > 0) {
                    const quantity = item.quantity || 1;
                    total += (load * quantity);
                }
            }
        });
        return total;
    }, [equippedItems]);

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

    const renderProficiencyOption = (group, key, label) => {
        const isActive = summary.proficiencies?.[group]?.[key] === true;
        const className = `flex min-h-9 items-center justify-center rounded border px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider transition-all ${isActive
            ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0b1120] shadow-[0_0_15px_rgba(200,170,110,0.4)]'
            : `bg-transparent border-slate-700 text-slate-600 ${rogueliteRole === 'player' ? '' : 'hover:border-slate-500 hover:text-slate-400'}`
            }`;

        if (rogueliteRole === 'player') {
            return <span key={key} className={className}>{label}</span>;
        }

        return (
            <button
                key={key}
                type="button"
                onClick={() => onUpdateProficiency && onUpdateProficiency(group, key)}
                className={className}
            >
                {label}
            </button>
        );
    };

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
        if (rawEquipment.accessories) list.push(...rawEquipment.accessories.map((item, idx) => ({ ...item, _category: 'accessories', _index: idx })));
        return list;
    }, [rawEquipment]);

    // Get available weapons and armor from inventory
    const inventoryWeapons = useMemo(() => {
        return equipment.filter(item => item._category === 'weapons');
    }, [equipment]);

    const inventoryArmor = useMemo(() => {
        return equipment.filter(item => item._category === 'armor');
    }, [equipment]);

    // Get available accessories from inventory
    const inventoryAccessories = useMemo(() => {
        return equipment.filter(item => item._category === 'accessories');
    }, [equipment]);

    const filteredInventory = useMemo(() => {
        if (rogueliteRole !== 'player') return equipment;

        const normalizedSearch = normalizeInventorySearch(searchTerm.trim());

        return equipment.filter((item) => {
            if (selectedCategory !== 'all' && item._category !== selectedCategory) return false;
            if (!normalizedSearch) return true;

            const searchableText = normalizeInventorySearch([
                item.name,
                item.category,
                item.itemType,
                item.traits,
                item.rasgos,
                item.trait,
                item.description,
                item.damage,
                item.dano,
                item.range,
                item.alcance,
                item.rareza,
            ].filter(Boolean).join(' '));

            return searchableText.includes(normalizedSearch);
        });
    }, [equipment, searchTerm, selectedCategory, rogueliteRole]);

    // Filtrar catálogo según búsqueda
    const filteredCatalog = useMemo(() => {
        if (rogueliteRole === 'player') return [];

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
        } else if (selectedCategory === 'accessories') {
            catalog = accessories.map(item => ({
                name: item.nombre || item.name, // Support both naming keys
                category: 'Accesorio',
                description: item.descripcion || item.description,
                payload: {
                    ...item,
                    name: item.nombre || item.name,
                    category: 'accessories',
                    itemType: 'accessory',
                    description: item.descripcion || item.description
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
    }, [equipmentCatalog, selectedCategory, searchTerm, customItems, accessories, rogueliteRole]);

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
        if (rogueliteRole === 'legacy') return null;
        const weaponType = getWeaponProficiencyType(item);
        if (!weaponType) return null;
        if (hasWeaponProficiency(item)) return null;

        const typeLabels = { simple: 'Simples', martial: 'Marciales', special: 'Especiales' };
        return `Sin competencia en armas ${typeLabels[weaponType]}`;
    };

    // Get proficiency warning message for armor
    const getArmorProficiencyWarning = (item) => {
        if (rogueliteRole === 'legacy') return null;
        const armorType = getArmorProficiencyType(item);
        if (!armorType) return null;
        if (hasArmorProficiency(item)) return null;

        const typeLabels = { light: 'Ligera', medium: 'Media', heavy: 'Pesada' };
        return `Sin competencia en armadura ${typeLabels[armorType]}`;
    };

    // Handle equipping an item
    const handleEquipItem = (slot, item) => {
        const proficiencyWarning = slot === 'body'
            ? getArmorProficiencyWarning(item)
            : slot === 'mainHand' || slot === 'offHand'
                ? getWeaponProficiencyWarning(item)
                : null;

        if (proficiencyWarning) return;

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
                                {/* Catálogo del máster / filtros locales del jugador */}
                                <div className="mb-6 p-4 bg-[#161f32]/60 border border-[#c8aa6e]/20 rounded-lg">
                                    <h4 className="text-[#c8aa6e] font-['Cinzel'] text-sm tracking-widest mb-3">
                                        {rogueliteRole === 'player' ? 'FILTRAR INVENTARIO' : 'AGREGAR AL INVENTARIO'}
                                    </h4>

                                    {/* Tabs de categoría */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {[
                                            ...(rogueliteRole === 'player' ? [{ id: 'all', label: 'Todo' }] : []),
                                            ...INVENTORY_CATEGORIES,
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
                                        placeholder={rogueliteRole === 'player' ? 'Buscar en tu inventario...' : 'Buscar en catálogo...'}
                                        aria-label={rogueliteRole === 'player' ? 'Buscar en tu inventario' : 'Buscar en catálogo'}
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-[#c8aa6e]/30 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#c8aa6e]"
                                    />

                                    {/* Resultados de búsqueda */}
                                    {rogueliteRole !== 'player' && (
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
                                    )}
                                </div>

                                <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-800/80 pb-3">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-[#c8aa6e]" />
                                        <h3 className="text-[#c8aa6e] font-['Cinzel'] text-xl tracking-[0.3em] uppercase">
                                            Inventario (Mochila)
                                        </h3>
                                    </div>
                                    <span className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-slate-600">
                                        {filteredInventory.length} / {equipment.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map((item, index) => {
                                            // Determinar icono basado en itemType
                                            const getIcon = () => {
                                                // Primero intentar usar itemType si existe
                                                if (item.itemType === 'armor') return <Shield className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'weapon') return <Sword className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'ability') return <Zap className="w-10 h-10 text-slate-400" />;
                                                if (item.itemType === 'object') return <HexIcon size="md"><span className="text-xs">📦</span></HexIcon>;
                                                if (item.itemType === 'accessory') return <Gem className="w-10 h-10 text-slate-400" />;

                                                // Fallback: usar category o _category
                                                const cat = (item.category || item.type || item._category || '').toLowerCase();
                                                if (cat.includes('armadura') || cat.includes('armor')) return <Shield className="w-10 h-10 text-slate-400" />;
                                                if (cat.includes('arma') || cat.includes('weapon')) return <Sword className="w-10 h-10 text-slate-400" />;
                                                if (cat.includes('habilidad') || cat.includes('ability') || cat.includes('spell')) return <Zap className="w-10 h-10 text-slate-400" />;
                                                if (cat.includes('accesorio') || cat.includes('accessory')) return <Gem className="w-10 h-10 text-slate-400" />;

                                                // Default: Shield
                                                return <Shield className="w-10 h-10 text-slate-400" />;
                                            };

                                            const objectImage = getObjectImage(item, customEquipmentImages);
                                            const isWeapon = item._category === 'weapons' || item.itemType === 'weapon';
                                            const handsRequired = isWeapon ? resolveEquipmentHandsRequired(item) : null;
                                            const supportsActionCost = item._category === 'weapons' || item._category === 'abilities';
                                            const actionCost = supportsActionCost
                                                ? resolveActionCost(item.actionCost ?? item.consumption ?? item.consumo)
                                                : null;
                                            const visibleTraits = resolveVisibleTraits(item, handsRequired);
                                            const proficiencyWarning = item._category === 'weapons'
                                                ? getWeaponProficiencyWarning(item)
                                                : item._category === 'armor'
                                                    ? getArmorProficiencyWarning(item)
                                                    : null;
                                            const rarityAccent = getRarityAccent(item, rarityColorMap);
                                            const categoryLabel = item.category
                                                || INVENTORY_CATEGORIES.find((category) => category.id === item._category)?.label
                                                || 'Objeto';

                                            return (
                                                <RogueliteInventoryCard
                                                    key={item.templateId || `${item._category}-${item._index}-${index}`}
                                                    item={item}
                                                    image={objectImage}
                                                    fallbackIcon={getIcon()}
                                                    categoryLabel={categoryLabel}
                                                    rarityAccent={rarityAccent}
                                                    raritySoft={hexToRgba(rarityAccent, 0.34)}
                                                    rarityFaint={hexToRgba(rarityAccent, 0.12)}
                                                    actionCost={actionCost}
                                                    handsRequired={handsRequired}
                                                    visibleTraits={visibleTraits}
                                                    glossary={glossary}
                                                    proficiencyWarning={rogueliteRole !== 'legacy' ? proficiencyWarning : null}
                                                    canRemove={rogueliteRole !== 'player'}
                                                    onRemove={() => onRemoveEquipment && onRemoveEquipment(item._index, item._category)}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-2 text-center py-8 text-slate-500 italic">
                                            {equipment.length > 0
                                                ? 'No hay objetos que coincidan con estos filtros.'
                                                : 'No hay objetos en el inventario.'}
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
                                                const isOccupiedByTwoHanded = handOccupancy?.blockedSlot === key;
                                                const occupyingItem = isOccupiedByTwoHanded ? handOccupancy.item : null;
                                                const equippedItem = isOccupiedByTwoHanded ? null : equippedItems[key];
                                                const proficiencyWarning = equippedItem ? getWeaponProficiencyWarning(equippedItem) : null;
                                                const isSlotActive = !isOccupiedByTwoHanded && activeSlotSelector === key;
                                                const rarityColors = equippedItem ? getRarityColors(equippedItem, rarityColorMap) : null;

                                                const weaponImage = equippedItem ? getObjectImage(equippedItem, customEquipmentImages) : null;
                                                const occupyingWeaponImage = occupyingItem
                                                    ? getObjectImage(occupyingItem, customEquipmentImages)
                                                    : null;

                                                return (
                                                    <div key={key} className="relative group">
                                                        {/* Slot Card */}
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isOccupiedByTwoHanded) return;
                                                                setActiveSlotSelector(isSlotActive ? null : key);
                                                            }}
                                                            role={isOccupiedByTwoHanded ? 'status' : undefined}
                                                            aria-disabled={isOccupiedByTwoHanded || undefined}
                                                            aria-label={isOccupiedByTwoHanded
                                                                ? `${label} ocupada por ${occupyingItem?.name || 'arma a dos manos'}`
                                                                : undefined}
                                                            className={`h-52 border-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden p-3
                                                                ${isOccupiedByTwoHanded
                                                                    ? 'cursor-not-allowed border-[#c8aa6e]/30 bg-[#0b1120]'
                                                                    : equippedItem
                                                                    ? proficiencyWarning
                                                                        ? 'border-orange-500/50'
                                                                        : `${rarityColors?.border || 'border-[#c8aa6e]/50'}`
                                                                    : 'border-dashed border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5'
                                                                }
                                                                ${isSlotActive ? 'ring-2 ring-[#c8aa6e]' : ''}
                                                            `}
                                                            style={equippedItem && !proficiencyWarning ? rarityColors?.borderStyle || undefined : undefined}
                                                        >
                                                            {isOccupiedByTwoHanded ? (
                                                                <>
                                                                    {occupyingWeaponImage && (
                                                                        <img
                                                                            src={occupyingWeaponImage}
                                                                            alt=""
                                                                            aria-hidden="true"
                                                                            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 grayscale"
                                                                        />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(11,17,32,0.7),rgba(11,17,32,0.94))]"></div>
                                                                    <LockKeyhole className="relative z-10 mb-3 h-7 w-7 text-[#c8aa6e]/80" />
                                                                    <span className="relative z-10 text-center font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.18em] text-[#d8c18d]">
                                                                        Arma a dos manos
                                                                    </span>
                                                                    <span className="relative z-10 mt-2 max-w-full truncate px-3 text-center text-[10px] uppercase tracking-[0.12em] text-slate-500">
                                                                        Ocupada por {occupyingItem?.name}
                                                                    </span>
                                                                </>
                                                            ) : equippedItem ? (
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
                                                                        <div
                                                                            className={`absolute inset-0 bg-gradient-to-tl ${rarityColors?.gradient || 'from-slate-800/30'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0`}
                                                                            style={rarityColors?.gradientStyle || undefined}
                                                                        ></div>
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
                                                                        <Sword
                                                                            className={`w-8 h-8 ${rarityColors?.text || 'text-[#c8aa6e]'} mb-1 relative z-10`}
                                                                            style={rarityColors?.textStyle || undefined}
                                                                        />
                                                                    )}

                                                                    {/* Rarity Badge - Hide if common */}
                                                                    {equippedItem.rareza && equippedItem.rareza.toLowerCase() !== 'común' && (
                                                                        <span
                                                                            className={`text-[9px] uppercase font-bold ${rarityColors?.text || 'text-slate-400'} relative z-10`}
                                                                            style={rarityColors?.textStyle || undefined}
                                                                        >
                                                                            {equippedItem.rareza}
                                                                        </span>
                                                                    )}

                                                                    {resolveEquipmentHandsRequired(equippedItem) === 2 && (
                                                                        <span className="relative z-10 border border-[#c8aa6e]/45 bg-[#0b1120]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#d8c18d]">
                                                                            2 manos
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

                                                        {isOccupiedByTwoHanded && (
                                                            <div
                                                                aria-hidden="true"
                                                                className={`pointer-events-none absolute top-1/2 z-20 h-px w-6 -translate-y-1/2 bg-gradient-to-r from-[#c8aa6e]/20 via-[#c8aa6e] to-[#c8aa6e]/20 ${key === 'offHand' ? '-left-6' : '-right-6'}`}
                                                            >
                                                                <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-[#c8aa6e] bg-[#0b1120] ${key === 'offHand' ? '-left-1' : '-right-1'}`}></span>
                                                            </div>
                                                        )}

                                                        {/* Hand Badge */}
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isOccupiedByTwoHanded ? 'bg-[#c8aa6e]/10 text-[#c8aa6e]/70' : badgeClass}`}>
                                                                {isOccupiedByTwoHanded ? 'OCUPADA' : badge}
                                                            </span>
                                                        </div>

                                                        {/* Equipment Selector Dropdown */}
                                                        {isSlotActive && !isOccupiedByTwoHanded && (
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
                                                                                key={weapon.id || weapon.name || idx}
                                                                                onClick={() => handleEquipItem(key, weapon)}
                                                                                disabled={isAlreadyEquipped || Boolean(warning)}
                                                                                title={warning || undefined}
                                                                                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0
                                                                                    ${isAlreadyEquipped ? 'opacity-40 cursor-not-allowed' : ''}
                                                                                    ${warning ? 'cursor-not-allowed bg-orange-950/20 opacity-60 hover:bg-orange-950/20' : ''}
                                                                                `}
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {getObjectImage(weapon, customEquipmentImages) ? (
                                                                                        <img src={getObjectImage(weapon, customEquipmentImages)} alt="" className="w-full h-full object-cover" />
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
                                                                                {warning ? (
                                                                                    <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-orange-400">
                                                                                        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                                                                                        No equipable
                                                                                    </span>
                                                                                ) : isAlreadyEquipped && (
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
                                                const rarityColors = equippedArmor ? getRarityColors(equippedArmor, rarityColorMap) : null;

                                                // Helper to get armor image
                                                const getArmorImage = (armorName) => {
                                                    if (!armorName) return null;
                                                    const name = armorName.toLowerCase();
                                                    // Check specific/longer names first to avoid partial matches
                                                    if (name.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.webp';
                                                    if (name.includes('armadura de placas')) return '/armaduras/armadura_de_placas.webp';
                                                    if (name.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.webp';
                                                    if (name.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.webp';
                                                    if (name.includes('armadura de acero')) return '/armaduras/armadura_de_acero.webp';
                                                    if (name.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.webp';
                                                    if (name.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.webp';
                                                    if (name.includes('armadura bandeada')) return '/armaduras/armadura bandeada.webp';
                                                    if (name.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.webp';
                                                    if (name.includes('armadura de piel') || name.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.webp';
                                                    if (name.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.webp';
                                                    if (name.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.webp';
                                                    if (name.includes('camisote de mallas')) return '/armaduras/cota_de_malla.webp';
                                                    return null;
                                                };

                                                const armorImage = equippedArmor ? (getObjectImage(equippedArmor, customEquipmentImages) || getArmorImage(equippedArmor.name)) : null;

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
                                                            style={equippedArmor && !proficiencyWarning ? rarityColors?.borderStyle || undefined : undefined}
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
                                                                        <div
                                                                            className={`absolute inset-0 bg-gradient-to-tl ${rarityColors?.gradient || 'from-slate-800/30'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0`}
                                                                            style={rarityColors?.gradientStyle || undefined}
                                                                        ></div>
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
                                                                        <Shield
                                                                            className={`w-6 h-6 ${rarityColors?.text || 'text-[#c8aa6e]'} mb-1 relative z-10`}
                                                                            style={rarityColors?.textStyle || undefined}
                                                                        />
                                                                    )}

                                                                    {/* Rarity Badge - Hide if common */}
                                                                    {equippedArmor.rareza && equippedArmor.rareza.toLowerCase() !== 'común' && (
                                                                        <span
                                                                            className={`text-[9px] uppercase font-bold ${rarityColors?.text || 'text-slate-400'} relative z-10 drop-shadow-md`}
                                                                            style={rarityColors?.textStyle || undefined}
                                                                        >
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
                                                                                key={armor.id || armor.name || idx}
                                                                                onClick={() => handleEquipItem('body', armor)}
                                                                                disabled={isAlreadyEquipped || Boolean(warning)}
                                                                                title={warning || undefined}
                                                                                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0
                                                                                    ${isAlreadyEquipped ? 'opacity-40 cursor-not-allowed' : ''}
                                                                                    ${warning ? 'cursor-not-allowed bg-orange-950/20 opacity-60 hover:bg-orange-950/20' : ''}
                                                                                `}
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {getObjectImage(armor, customEquipmentImages) ? (
                                                                                        <img src={getObjectImage(armor, customEquipmentImages)} alt="" className="w-full h-full object-cover" />
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
                                                                                {warning ? (
                                                                                    <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-orange-400">
                                                                                        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                                                                                        No equipable
                                                                                    </span>
                                                                                ) : isAlreadyEquipped && (
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
                                                const objectImage = equippedItem ? getObjectImage(equippedItem, customEquipmentImages) : null;
                                                const itemRarityColors = equippedItem ? getRarityColors(equippedItem, rarityColorMap) : null;

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
                                                            style={equippedItem ? itemRarityColors?.borderStyle || undefined : undefined}
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
                                                                        const itemImg = getObjectImage(item, customEquipmentImages);
                                                                        return (
                                                                            <button
                                                                                key={item.id || item.name || i}
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
                                            <Gem className="w-5 h-5 text-[#c8aa6e]" />
                                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-md tracking-[0.2em] uppercase">
                                                Accesorios
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[1, 2].map(slotNum => {
                                                const slotKey = `accessory_${slotNum}`;
                                                const equippedAccessory = equippedItems[slotKey];
                                                const isSlotActive = activeSlotSelector === slotKey;
                                                const rarityColors = equippedAccessory ? getRarityColors(equippedAccessory, rarityColorMap) : null;
                                                const accessoryImage = equippedAccessory ? getObjectImage(equippedAccessory, customEquipmentImages) : null;

                                                return (
                                                    <div key={slotNum} className="relative group">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveSlotSelector(isSlotActive ? null : slotKey);
                                                            }}
                                                            className={`h-32 border-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden p-3
                                                                ${equippedAccessory
                                                                    ? `${rarityColors?.border || 'border-[#c8aa6e]/50'}`
                                                                    : 'border-dashed border-slate-700 hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5'
                                                                }
                                                                ${isSlotActive ? 'ring-2 ring-[#c8aa6e]' : ''}
                                                            `}
                                                            style={equippedAccessory ? rarityColors?.borderStyle || undefined : undefined}
                                                        >
                                                            {equippedAccessory ? (
                                                                <>
                                                                    {/* Accessory Image Background */}
                                                                    {accessoryImage && (
                                                                        <>
                                                                            <img
                                                                                src={accessoryImage}
                                                                                alt={equippedAccessory.name || equippedAccessory.nombre}
                                                                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 z-0"
                                                                            />
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-0"></div>
                                                                        </>
                                                                    )}

                                                                    {/* Rarity Gradient Background */}
                                                                    {!accessoryImage && (
                                                                        <div
                                                                            className={`absolute inset-0 bg-gradient-to-tl ${rarityColors?.gradient || 'from-slate-800/30'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0`}
                                                                            style={rarityColors?.gradientStyle || undefined}
                                                                        ></div>
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
                                                                    {!accessoryImage && (
                                                                        <Gem
                                                                            className={`w-6 h-6 ${rarityColors?.text || 'text-[#c8aa6e]'} mb-1 relative z-10`}
                                                                            style={rarityColors?.textStyle || undefined}
                                                                        />
                                                                    )}

                                                                    {/* Name */}
                                                                    <span className="text-[#f0e6d2] font-['Cinzel'] text-xs uppercase tracking-wider text-center px-2 font-bold relative z-10">
                                                                        {equippedAccessory.name || equippedAccessory.nombre}
                                                                    </span>

                                                                    {/* Defense Stats */}
                                                                    {(equippedAccessory.defense || equippedAccessory.defensa) && (
                                                                        <span className="text-[10px] text-blue-300 mt-1 relative z-10">
                                                                            <span className="text-slate-500">Defensa:</span> {equippedAccessory.defense || equippedAccessory.defensa}
                                                                        </span>
                                                                    )}

                                                                    {/* Traits */}
                                                                    {(equippedAccessory.traits || equippedAccessory.rasgos || equippedAccessory.trait) && (
                                                                        <div className="flex flex-wrap justify-center gap-1 mt-1 relative z-10">
                                                                            {(equippedAccessory.traits || equippedAccessory.rasgos || equippedAccessory.trait).toString().split(',').slice(0, 3).map((t, i) => renderTrait(t, i))}
                                                                        </div>
                                                                    )}

                                                                    {/* Unequip Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUnequipItem(slotKey);
                                                                        }}
                                                                        className="absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                                    >
                                                                        <FiX className="w-3 h-3" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Gem className="w-6 h-6 text-slate-600 mb-2 opacity-50" />
                                                                    <span className="text-slate-600 font-['Cinzel'] text-xs uppercase tracking-widest">Accesorio {slotNum}</span>
                                                                    <span className="text-[10px] text-slate-700">Clic para equipar</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Equipment Selector Dropdown */}
                                                        {isSlotActive && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0b1120] border border-[#c8aa6e]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                            >
                                                                <div className="p-2 border-b border-slate-700">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                        Seleccionar accesorio del inventario
                                                                    </span>
                                                                </div>
                                                                {inventoryAccessories.length > 0 ? (
                                                                    inventoryAccessories.map((accessory, idx) => {
                                                                        const isAlreadyEquipped =
                                                                            (equippedItems.accessory_1 && equippedItems.accessory_1._index === accessory._index) ||
                                                                            (equippedItems.accessory_2 && equippedItems.accessory_2._index === accessory._index);
                                                                        const accessoryRarityColors = getRarityColors(accessory, rarityColorMap);

                                                                        return (
                                                                            <button
                                                                                key={accessory.id || accessory.name || idx}
                                                                                onClick={() => handleEquipItem(slotKey, accessory)}
                                                                                disabled={isAlreadyEquipped}
                                                                                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-[#c8aa6e]/10 transition-colors border-b border-slate-800 last:border-b-0
                                                                                    ${isAlreadyEquipped ? 'opacity-40 cursor-not-allowed' : ''}
                                                                                `}
                                                                            >
                                                                                <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#c8aa6e] bg-slate-900/50 rounded overflow-hidden border border-slate-700/50">
                                                                                    {getObjectImage(accessory, customEquipmentImages) ? (
                                                                                        <img src={getObjectImage(accessory, customEquipmentImages)} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <Gem className="w-5 h-5" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-[#f0e6d2] font-medium truncate">{accessory.name || accessory.nombre}</div>
                                                                                    <div className="flex gap-2 text-[10px]">
                                                                                        {(accessory.defense || accessory.defensa) && <span className="text-blue-300">Defensa: {accessory.defense || accessory.defensa}</span>}
                                                                                        {accessory.rareza && accessory.rareza.toLowerCase() !== 'común' && (
                                                                                            <span
                                                                                                className={accessoryRarityColors.text || 'text-slate-500'}
                                                                                                style={accessoryRarityColors.textStyle || undefined}
                                                                                            >
                                                                                                {accessory.rareza}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {isAlreadyEquipped && (
                                                                                    <span className="text-[10px] text-slate-500 uppercase">Equipado</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="p-4 text-center text-slate-500 text-sm">
                                                                        No hay accesorios en el inventario.
                                                                        <br />
                                                                        <span className="text-[10px]">Añade accesorios desde la pestaña Inventario</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Relic Slots (Vertical Stack) */}
                    <div
                        data-testid="talents-sidebar"
                        className={`bg-[#0b1120] border border-[#c8aa6e]/20 rounded-xl p-6 shadow-2xl flex flex-col h-fit sticky top-8 ${rogueliteRole === 'player'
                            ? 'max-h-none overflow-visible'
                            : 'max-h-[850px] overflow-y-auto [&::-webkit-scrollbar]:hidden'
                            }`}
                        style={rogueliteRole === 'player' ? undefined : { scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg tracking-widest mb-8 text-center flex items-center justify-center gap-2">
                            <FiShield className="w-5 h-5" />
                            TALENTOS
                        </h3>

                        <div className="flex flex-col gap-8 items-center justify-between">
                            {rogueliteRole !== 'legacy' ? (
                                <RogueliteTalentsPanel
                                    role={rogueliteRole}
                                    classId={dndClass.id}
                                    resource={dndClass.resource || {}}
                                    talentCatalog={dndClass.talentCatalog || []}
                                    equippedTalentIds={dndClass.equippedTalentIds || []}
                                    rarity={dndClass.talents?.rarity || 'rara'}
                                    onResourceChange={onUpdateResource}
                                    onCatalogChange={onUpdateTalentCatalog}
                                    onEquippedTalentIdsChange={onUpdateEquippedTalentIds}
                                    onRarityChange={(value) => onUpdateTalent && onUpdateTalent('rarity', value)}
                                />
                            ) : (
                                <>
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
                                </>
                            )}

                            {/* LOAD AND LIFE COUNTERS BLOCK */}
                            {isCharacter && rogueliteRole === 'legacy' ? (
                                (() => {
                                    const maxVida = dndClass.stats?.vida?.max ?? dndClass.vida ?? 0;
                                    const isOverloaded = totalPhysicalLoad > maxVida;
                                    const excess = isOverloaded ? totalPhysicalLoad - maxVida : 0;

                                    return (
                                        <div className="w-full space-y-6 pt-4">
                                            {/* Vida Counter (Resistance) */}
                                            <div className="text-center">
                                                <h4 className="text-[#e09f9f] font-['Cinzel'] text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80">Resistencia Máxima (Vida)</h4>
                                                <div className="flex items-center justify-center gap-1.5 mt-2">
                                                    <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                                                        {Array.from({ length: Math.max(1, maxVida) }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`w-3.5 h-3.5 rounded-sm border transition-all duration-500 animate-in fade-in zoom-in ${i < maxVida
                                                                    ? 'bg-[#e09f9f] border-[#e09f9f] shadow-[0_0_8px_rgba(224,159,159,0.4)] scale-110'
                                                                    : 'bg-transparent border-slate-700 scale-100 opacity-50'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="ml-2 font-mono text-xs font-bold text-[#e09f9f]">
                                                        {maxVida}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Physical Load Counter */}
                                            <div className="text-center">
                                                <h4 className="text-[#c8aa6e] font-['Cinzel'] text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80">Carga del Equipamiento</h4>
                                                <div className="flex items-center justify-center gap-1.5 mt-2">
                                                    <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                                                        {Array.from({ length: Math.max(maxVida, totalPhysicalLoad, 1) }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`w-3.5 h-3.5 rounded-sm border transition-all duration-500 animate-in fade-in zoom-in ${i < totalPhysicalLoad
                                                                    ? i >= maxVida
                                                                        ? 'bg-red-500 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] scale-110'
                                                                        : 'bg-[#c8aa6e] border-[#c8aa6e] shadow-[0_0_8px_rgba(200,170,110,0.5)] scale-110'
                                                                    : 'bg-transparent border-slate-700 scale-100 opacity-50'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className={`ml-2 font-mono text-xs font-bold ${isOverloaded ? 'text-red-400 animate-pulse' : totalPhysicalLoad > 0 ? 'text-[#c8aa6e]' : 'text-slate-600'}`}>
                                                        {totalPhysicalLoad}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="-mt-4 w-full space-y-4">
                                    <h4 className="text-[#c8aa6e] font-['Cinzel'] text-xs uppercase tracking-widest text-center">Competencias</h4>

                                    {/* Weapons */}
                                    <div className="space-y-2">
                                        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Armas</div>
                                        <div className="mx-auto grid w-full max-w-[390px] grid-cols-3 gap-2">
                                            {renderProficiencyOption('weapons', 'simple', 'Simples')}
                                            {renderProficiencyOption('weapons', 'martial', 'Marciales')}
                                            {renderProficiencyOption('weapons', 'special', 'Especiales')}
                                        </div>
                                    </div>

                                    {/* Armor */}
                                    <div className="space-y-2">
                                        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Armaduras</div>
                                        <div className="mx-auto grid w-full max-w-[390px] grid-cols-3 gap-2">
                                            {renderProficiencyOption('armor', 'light', 'Ligera')}
                                            {renderProficiencyOption('armor', 'medium', 'Media')}
                                            {renderProficiencyOption('armor', 'heavy', 'Pesada')}
                                        </div>
                                    </div>
                                </div>
                            )}
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
    rogueliteRole: PropTypes.oneOf(['legacy', 'master', 'player']),
    equipmentCatalog: PropTypes.shape({
        weapons: PropTypes.array,
        armor: PropTypes.array,
        abilities: PropTypes.array
    }),
    rarityColorMap: PropTypes.objectOf(PropTypes.string),
    onAddEquipment: PropTypes.func,
    onRemoveEquipment: PropTypes.func,
    onUpdateTalent: PropTypes.func,
    onUpdateProficiency: PropTypes.func,
    onUpdateEquipped: PropTypes.func,
    onUpdateResource: PropTypes.func,
    onUpdateTalentCatalog: PropTypes.func,
    onUpdateEquippedTalentIds: PropTypes.func,
};

export default LoadoutView;
