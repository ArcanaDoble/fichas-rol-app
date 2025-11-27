import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RefreshCw, Zap, Shield, Heart, Crosshair, Check, Upload, Edit2, Lock, Save, ChevronLeft, ChevronRight, Plus, Eye, EyeOff, Trash2, Box, Search, Sparkles, Flame } from 'lucide-react';

// --- TYPES & DATA ---

const CATEGORIES = ['ARSENAL', 'ARMADURAS', 'OBJETOS', 'OFERTA'];

const INITIAL_STORE_ITEMS = [
    // Arsenal (Weapons/Combat)
    {
        id: 'dmg1',
        category: 'ARSENAL',
        name: 'Espada Carbonizada',
        price: 522,
        description: 'Espada quemada hasta quedar gris y agrietada, pero su filo sigue ardiendo en silencio.',
        icon: <Flame className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/dmg1/400/400',
        isSold: false,
        isVisible: true,
        damage: "1d6 Fuego",
        range: "Toque",
        rareza: "Épica",
        resourceCost: 2,
        resourceType: 'action',
        tags: ["CRÍTICO", "DESTREZA", "FUEGO"]
    },
    {
        id: 'crit1',
        category: 'ARSENAL',
        name: 'Cuchillo de Hueso',
        price: 391,
        description: 'Herramienta pesada de filo recto, aún manchada con restos que no son de animal.',
        icon: <Crosshair className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/crit1/400/400',
        isSold: false,
        isVisible: true,
        damage: "1d4 Físico",
        range: "20/60 pies",
        rareza: "Común",
        resourceCost: 1,
        resourceType: 'bonus',
        tags: ["ARROJADIZA", "SUTIL", "CRÍTICO"]
    },
    {
        id: 'cool1',
        category: 'ARSENAL',
        name: 'Maestría Táctica',
        price: 288,
        description: 'Ganas ventaja en tiradas de iniciativa.',
        icon: <Zap className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/cool1/400/400',
        isSold: false,
        isVisible: true,
        rareza: "Rara",
        tags: ["PASIVA", "COMBATE"]
    },

    // Armaduras (Defense)
    {
        id: 'hp1',
        category: 'ARMADURAS',
        name: 'Armadura Bandeada',
        price: 456,
        description: 'Placas de metal reforzadas con cuero endurecido. Pesada, pero impenetrable.',
        icon: <Shield className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/hp1/400/400',
        isSold: false,
        isVisible: true,
        defense: "17 CA",
        rareza: "Rara",
        tags: ["PESADA", "DESVENTAJA SIGILO"]
    },
    {
        id: 'res1',
        category: 'ARMADURAS',
        name: 'Reserva de Poder',
        price: 404,
        description: 'Un pequeño amuleto que vibra con energía residual.',
        icon: <Sparkles className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/res1/400/400',
        isSold: false,
        isVisible: true,
        rareza: "Común",
        resourceCost: 0,
        tags: ["RECUPERACIÓN", "MÁGICO"]
    },

    // Objetos (Utility/Misc)
    {
        id: 'speed1',
        category: 'OBJETOS',
        name: 'Olfato Agudo',
        price: 654,
        description: 'La rata posee una clave de olfato, en su defecto, tendrá ventaja en las pruebas de percepción.',
        icon: <RefreshCw className="w-5 h-5" />,
        image: 'https://picsum.photos/seed/speed1/400/400',
        isSold: false,
        isVisible: true,
        range: "Extremo",
        rareza: "Común",
        tags: ["RASGO", "SENTIDOS"]
    },
];

export const StoreView = ({ equipmentCatalog = { weapons: [], armor: [], abilities: [] }, storeItems, onUpdateStoreItems }) => {
    // --- NAVIGATION STATE ---
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const currentCategory = CATEGORIES[currentCategoryIndex];
    const [slideDirection, setSlideDirection] = useState('right');

    // Data State
    const [items, setItems] = useState(storeItems || INITIAL_STORE_ITEMS);

    // Persistence: Sync from parent (initial load or external update)
    useEffect(() => {
        if (storeItems && JSON.stringify(storeItems) !== JSON.stringify(items)) {
            setItems(storeItems);
        }
    }, [storeItems]);

    // Persistence: Sync to parent (save changes)
    useEffect(() => {
        if (onUpdateStoreItems) {
            const timer = setTimeout(() => {
                if (JSON.stringify(items) !== JSON.stringify(storeItems)) {
                    onUpdateStoreItems(items);
                }
            }, 1000); // Debounce save
            return () => clearTimeout(timer);
        }
    }, [items, onUpdateStoreItems, storeItems]);
    const [selectedItemId, setSelectedItemId] = useState(null);

    // Money State
    const [actualMoney, setActualMoney] = useState(4697);
    const [displayMoney, setDisplayMoney] = useState(4697);
    const [isEditingMoney, setIsEditingMoney] = useState(false);

    // DM Form State
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState(0);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemType, setNewItemType] = useState('ARSENAL');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSearchCategory, setSelectedSearchCategory] = useState('weapons');

    // Refs
    const fileInputRef = useRef(null);
    const moneyInputRef = useRef(null);

    // --- BÚSQUEDA EN CATÁLOGO (como LoadoutView) ---
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const catalog = equipmentCatalog?.[selectedSearchCategory] || [];

        return catalog
            .filter(item =>
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 10); // Limitar a 10 resultados
    }, [equipmentCatalog, selectedSearchCategory, searchQuery]);

    // --- LOGICA DE FILTRADO DE CATEGORÍAS ---
    const filteredItems = items.filter(item => {
        if (currentCategory === 'OFERTA') return true;
        return item.category === currentCategory && item.isVisible;
    });

    // Efecto para resetear o mantener la selección cuando se cambia de categoría
    useEffect(() => {
        if (filteredItems.length > 0) {
            if (!selectedItemId || !filteredItems.find(i => i.id === selectedItemId)) {
                setSelectedItemId(filteredItems[0].id);
            }
        } else {
            setSelectedItemId(null);
        }
    }, [currentCategoryIndex, items, selectedItemId, filteredItems]);

    const selectedItem = items.find(i => i.id === selectedItemId);

    // Agregar item desde búsqueda
    const handleAddFromSearch = (catalogItem) => {
        // Determinar categoría según el tipo de catálogo
        let category = 'OBJETOS';
        let icon = <Box className="w-5 h-5" />;

        if (selectedSearchCategory === 'weapons') {
            category = 'ARSENAL';
            icon = <Zap className="w-5 h-5" />;
        } else if (selectedSearchCategory === 'armor') {
            category = 'ARMADURAS';
            icon = <Shield className="w-5 h-5" />;
        } else if (selectedSearchCategory === 'abilities') {
            category = 'OBJETOS';
            icon = <Heart className="w-5 h-5" />;
        }

        // Extract data source (payload or direct)
        const source = catalogItem.payload || catalogItem;

        // Map traits to tags
        const traits = source.traits || source.rasgos || '';
        const traitTags = traits.split(',').map(t => t.trim()).filter(Boolean);
        const existingTags = source.tags || [];
        const mergedTags = [...new Set([...existingTags, ...traitTags])];

        const newItem = {
            id: `${selectedSearchCategory}-${catalogItem.name}-${Date.now()}`,
            name: catalogItem.name,
            description: source.description || source.detail || source.descripcion || catalogItem.preview || 'Sin descripción',
            price: catalogItem.price || 100,
            category: category,
            icon: icon,
            image: catalogItem.image || `https://picsum.photos/seed/${catalogItem.name}/400/400`,
            isVisible: true,
            isSold: false,
            // Copiar datos de RPG si existen
            damage: source.damage || source.dano,
            defense: source.defense || source.defensa,
            range: source.range || source.alcance,
            consumption: source.consumption || source.consumo,
            rareza: source.rareza || source.rarity,
            resourceCost: source.resourceCost,
            resourceType: source.resourceType,
            tags: mergedTags
        };

        // Verificar si ya existe un item con el mismo nombre
        const exists = items.find(item => item.name === catalogItem.name);
        if (!exists) {
            setItems(prev => [...prev, newItem]);
        }

        setSearchQuery('');
    };

    // --- EFECTOS VISUALES (Money Rolling) ---
    useEffect(() => {
        if (displayMoney === actualMoney) return;
        const diff = actualMoney - displayMoney;
        const step = Math.ceil(Math.abs(diff) / 8);
        const direction = diff > 0 ? 1 : -1;
        const timer = setTimeout(() => {
            if (Math.abs(diff) <= step) setDisplayMoney(actualMoney);
            else setDisplayMoney(prev => prev + (step * direction));
        }, 20);
        return () => clearTimeout(timer);
    }, [actualMoney, displayMoney]);

    // --- HANDLERS ---

    const handleCategoryChange = (direction) => {
        setSlideDirection(direction === 'next' ? 'right' : 'left');
        setCurrentCategoryIndex(prev => {
            if (direction === 'next') return (prev + 1) % CATEGORIES.length;
            return (prev - 1 + CATEGORIES.length) % CATEGORIES.length;
        });
    };

    const handlePurchase = () => {
        if (selectedItem && actualMoney >= selectedItem.price && !selectedItem.isSold) {
            setActualMoney(prev => prev - selectedItem.price);
            setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, isSold: true } : item));
        }
    };

    const handleImageUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file && selectedItemId) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setItems(prev => prev.map(item => item.id === selectedItemId ? { ...item, image: e.target.result } : item));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleMoneyEdit = () => {
        if (isEditingMoney) setIsEditingMoney(false);
        else {
            setIsEditingMoney(true);
            setTimeout(() => moneyInputRef.current?.focus(), 100);
        }
    };

    const handleMoneyChange = (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            setActualMoney(val);
            setDisplayMoney(val);
        }
    };

    // --- FUNCIONES DE MASTER (OFERTA) ---

    const toggleItemVisibility = (e, id) => {
        e.stopPropagation();
        setItems(prev => prev.map(item => item.id === id ? { ...item, isVisible: !item.isVisible } : item));
    };

    const handleDeleteItem = (e, id) => {
        e.stopPropagation();
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedItemId === id) setSelectedItemId(null);
    };

    const handleCreateItem = () => {
        if (!newItemName || newItemPrice <= 0) return;

        const newItem = {
            id: `custom-${Date.now()}`,
            name: newItemName,
            price: newItemPrice,
            description: newItemDesc || 'Sin descripción',
            category: newItemType,
            isVisible: true,
            isSold: false,
            image: `https://picsum.photos/seed/${Date.now()}/400/400`,
            icon: newItemType === 'ARSENAL' ? <Zap className="w-5 h-5" /> : newItemType === 'ARMADURAS' ? <Shield className="w-5 h-5" /> : <Box className="w-5 h-5" />,
            rareza: 'Común'
        };

        setItems(prev => [...prev, newItem]);
        setNewItemName('');
        setNewItemPrice(0);
        setNewItemDesc('');
    };

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'ARSENAL': return <Zap className="w-6 h-6" />;
            case 'ARMADURAS': return <Shield className="w-6 h-6" />;
            case 'OBJETOS': return <Box className="w-6 h-6" />;
            default: return <Zap className="w-6 h-6" />;
        }
    };

    // Helper para degradado de rareza (esquina inferior derecha)
    const getRarityBackground = (rarity) => {
        const rarityLower = (rarity || '').toLowerCase();
        if (rarityLower.includes('legendari')) {
            return 'bg-gradient-to-tl from-orange-900/40 via-[#0b1120] to-[#0b1120]';
        }
        if (rarityLower.includes('épic') || rarityLower.includes('epic')) {
            return 'bg-gradient-to-tl from-purple-900/40 via-[#0b1120] to-[#0b1120]';
        }
        if (rarityLower.includes('rar')) {
            return 'bg-gradient-to-tl from-blue-900/40 via-[#0b1120] to-[#0b1120]';
        }
        return '';
    };

    // Helper para color de texto de rareza
    const getRarityTextColor = (rarity) => {
        const rarityLower = (rarity || '').toLowerCase();
        if (rarityLower.includes('legendari')) return 'text-orange-400';
        if (rarityLower.includes('épic') || rarityLower.includes('epic')) return 'text-purple-400';
        if (rarityLower.includes('rar')) return 'text-blue-400';
        return 'text-slate-500';
    };

    const animationClass = slideDirection === 'right' ? 'slide-in-from-right' : 'slide-in-from-left';

    return (
        <div className="w-full h-full flex items-center justify-center bg-[#09090b] overflow-hidden p-4 lg:p-8">

            {/* Main Machine Container */}
            <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#0b1120] rounded-[30px] border-[4px] border-[#1e293b] shadow-2xl shadow-[0_0_100px_rgba(200,170,110,0.15)] flex flex-col overflow-hidden z-10">

                {/* Decorative Corners */}
                <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-slate-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)] z-30"></div>
                <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)] z-30"></div>

                {/* --- HEADER (Navegación de Categorías) --- */}
                <div className="h-20 border-b border-[#c8aa6e] relative flex items-center justify-between px-12 shrink-0 bg-[#0b1120] z-20">

                    {/* Left Decoration */}
                    <div className="flex gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-[#c8aa6e] rotate-45"></div>)}
                    </div>

                    {/* Center Label Badge with Navigation Arrows */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] flex items-center justify-center">

                        {/* Flecha Izquierda */}
                        <button
                            onClick={() => handleCategoryChange('prev')}
                            className="absolute left-0 top-6 w-10 h-10 rounded-full border-2 border-[#c8aa6e] bg-[#0b1120] text-[#c8aa6e] flex items-center justify-center hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-colors z-30 shadow-lg group"
                        >
                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        <div className="relative mx-4">
                            <div className="h-14 w-64 bg-[#0b1120] border-b-2 border-x-2 border-[#c8aa6e] rounded-b-3xl flex items-center justify-center shadow-lg overflow-hidden">
                                <div key={currentCategory} className={`animate-in ${animationClass} fade-in duration-300 w-full text-center`}>
                                    <span className="text-[#c8aa6e] font-fantasy font-bold text-xl tracking-[0.25em] pt-2 block">
                                        {currentCategory}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -top-1 left-0 right-0 h-2 bg-[#0b1120]"></div>
                        </div>

                        {/* Flecha Derecha */}
                        <button
                            onClick={() => handleCategoryChange('next')}
                            className="absolute right-0 top-6 w-10 h-10 rounded-full border-2 border-[#c8aa6e] bg-[#0b1120] text-[#c8aa6e] flex items-center justify-center hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-colors z-30 shadow-lg group"
                        >
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    {/* Right Decoration */}
                    <div className="flex gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-[#c8aa6e] rotate-45"></div>)}
                    </div>
                </div>

                {/* --- CONTENT AREA SWITCHER --- */}

                {currentCategory === 'OFERTA' ? (
                    /* --- VISTA DE MASTER (OFERTA) --- */
                    <div className={`flex-1 flex overflow-hidden animate-in ${animationClass} fade-in duration-500`}>

                        {/* Left: Inventory List (Management) */}
                        <div className="w-1/2 border-r border-[#c8aa6e]/30 flex flex-col bg-[#0f1219]">
                            {/* Header con buscador */}
                            <div className="p-4 border-b border-[#c8aa6e]/10 bg-[#0b1120] space-y-3">
                                <h3 className="text-[#c8aa6e] font-fantasy tracking-widest text-sm flex items-center gap-2">
                                    <Edit2 className="w-4 h-4" /> GESTIÓN DE INVENTARIO
                                </h3>

                                {/* Tabs de categoría de búsqueda */}
                                <div className="flex gap-2">
                                    {[
                                        { id: 'weapons', label: 'Armas' },
                                        { id: 'armor', label: 'Armaduras' },
                                        { id: 'abilities', label: 'Habilidades' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedSearchCategory(cat.id)}
                                            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${selectedSearchCategory === cat.id
                                                ? 'bg-[#c8aa6e] text-[#0b1120]'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Buscador */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar en catálogo..."
                                        className="w-full bg-[#161f32] border border-[#c8aa6e]/30 text-[#f0e6d2] pl-10 pr-4 py-2 rounded focus:border-[#c8aa6e] focus:outline-none text-sm"
                                    />

                                    {/* Resultados de búsqueda */}
                                    {searchQuery.trim() && searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-[#c8aa6e]/30 rounded shadow-lg max-h-64 overflow-y-auto z-50">
                                            {searchResults.map((result, idx) => (
                                                <div
                                                    key={`${result.name}-${idx}`}
                                                    onClick={() => handleAddFromSearch(result)}
                                                    className="p-3 hover:bg-[#c8aa6e]/10 cursor-pointer border-b border-slate-700 last:border-b-0 flex items-center justify-between group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm text-slate-200 truncate">{result.name}</div>
                                                        <div className="text-[10px] text-slate-500 truncate">{result.category || selectedSearchCategory}</div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-[#c8aa6e] opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchQuery.trim() && searchResults.length === 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-[#c8aa6e]/30 rounded shadow-lg p-4 text-center text-slate-500 text-sm z-50">
                                            No se encontraron resultados
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lista de inventario */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                                {items.length === 0 && <div className="text-slate-500 text-center italic">Inventario vacío.</div>}
                                {items.map((item) => (
                                    <div key={item.id} className="bg-[#1e293b] border border-slate-700 p-3 rounded flex items-center justify-between group hover:border-[#c8aa6e]/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded bg-[#0b1120] ${item.isVisible ? 'text-[#c8aa6e]' : 'text-slate-600'}`}>
                                                {getCategoryIcon(item.category)}
                                            </div>
                                            <div>
                                                <div className={`font-bold font-fantasy text-sm ${item.isVisible ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{item.name}</div>
                                                <div className="text-[10px] text-slate-500 tracking-wider">{item.category} • ${item.price}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => toggleItemVisibility(e, item.id)}
                                                className={`p-2 rounded hover:bg-[#0b1120] transition-colors ${item.isVisible ? 'text-green-500' : 'text-slate-600'}`}
                                                title={item.isVisible ? "Visible en tienda" : "Oculto"}
                                            >
                                                {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteItem(e, item.id)}
                                                className="p-2 rounded hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Forge (Create Item Form) */}
                        <div className="w-1/2 bg-[#0b1120] p-8 flex flex-col items-center justify-center">
                            <div className="w-full max-w-md space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-fantasy text-[#f0e6d2] uppercase tracking-widest mb-2">La Forja</h2>
                                    <div className="h-1 w-24 bg-[#c8aa6e] mx-auto"></div>
                                    <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">Crear nuevo objeto para la tienda</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-1 block">Nombre del Objeto</label>
                                        <input
                                            type="text"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            className="w-full bg-[#161f32] border border-[#c8aa6e]/30 text-[#f0e6d2] px-4 py-3 rounded focus:border-[#c8aa6e] focus:outline-none font-fantasy tracking-wide"
                                            placeholder="Ej: Espada Vorpal"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-1/2">
                                            <label className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-1 block">Precio</label>
                                            <input
                                                type="number"
                                                value={newItemPrice}
                                                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                                                className="w-full bg-[#161f32] border border-[#c8aa6e]/30 text-[#c8aa6e] px-4 py-3 rounded focus:border-[#c8aa6e] focus:outline-none font-mono font-bold"
                                            />
                                        </div>
                                        <div className="w-1/2">
                                            <label className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-1 block">Categoría</label>
                                            <select
                                                value={newItemType}
                                                onChange={(e) => setNewItemType(e.target.value)}
                                                className="w-full bg-[#161f32] border border-[#c8aa6e]/30 text-[#f0e6d2] px-4 py-3 rounded focus:border-[#c8aa6e] focus:outline-none font-fantasy text-sm"
                                            >
                                                <option value="ARSENAL">ARSENAL</option>
                                                <option value="ARMADURAS">ARMADURAS</option>
                                                <option value="OBJETOS">OBJETOS</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-1 block">Descripción</label>
                                        <textarea
                                            value={newItemDesc}
                                            onChange={(e) => setNewItemDesc(e.target.value)}
                                            className="w-full bg-[#161f32] border border-[#c8aa6e]/30 text-slate-300 px-4 py-3 rounded focus:border-[#c8aa6e] focus:outline-none text-sm h-24 resize-none"
                                            placeholder="Efectos y detalles..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleCreateItem}
                                        className="w-full py-4 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(200,170,110,0.4)] transition-all rounded-sm mt-4 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" /> Forjar Objeto
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- VISTA DE JUGADOR (TIENDA NORMAL) --- */
                    <div key={currentCategory} className={`flex-1 flex overflow-hidden animate-in ${animationClass} fade-in duration-300`}>

                        {/* Left Column: Lista de Objetos filtrada */}
                        <div className="w-5/12 border-r border-[#c8aa6e]/30 flex flex-col bg-[#0f1219]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {filteredItems.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                        <Lock className="w-12 h-12 mb-2" />
                                        <span className="font-fantasy tracking-widest">SIN EXISTENCIAS</span>
                                    </div>
                                )}
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={`
                                    group relative h-16 w-full flex items-center justify-between px-4 cursor-pointer transition-all duration-200 border rounded-sm overflow-hidden
                                    ${selectedItemId === item.id
                                                ? 'bg-gradient-to-r from-[#c8aa6e] via-[#a1824a] to-[#785a28] border-[#f0e6d2] shadow-[0_0_20px_rgba(200,170,110,0.3)]'
                                                : 'bg-transparent border-[#334155] hover:border-[#c8aa6e]/50 hover:bg-[#1e293b]'
                                            }
                                    ${item.isSold && selectedItemId !== item.id ? 'opacity-50' : ''}
                                `}
                                    >
                                        <div className={`w-2 h-2 rounded-full mr-3 shrink-0 ${selectedItemId === item.id ? 'bg-[#0b1120]' : 'bg-slate-600'}`}></div>

                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`shrink-0 ${selectedItemId === item.id ? 'text-[#0b1120]' : 'text-slate-400'}`}>
                                                {item.isSold ? <Lock className="w-5 h-5" /> : item.icon}
                                            </div>
                                            <span className={`
                                        font-fantasy font-bold uppercase tracking-wider text-sm truncate
                                        ${selectedItemId === item.id ? 'text-[#0b1120]' : 'text-[#e2e8f0]'}
                                        ${item.isSold && selectedItemId !== item.id ? 'line-through decoration-slate-500' : ''}
                                    `}>
                                                {item.name}
                                            </span>
                                        </div>

                                        <span className={`
                                    font-mono font-bold ml-2
                                    ${selectedItemId === item.id ? 'text-[#0b1120]' : 'text-[#c8aa6e]'}
                                `}>
                                            ${item.price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: RICH DETAIL VIEW */}
                        <div className="w-7/12 relative flex flex-col items-center justify-start p-8 bg-[#0b1120] overflow-y-auto custom-scrollbar">

                            {/* Background Rarity Gradient (Bottom-Right) */}
                            {selectedItem && selectedItem.rareza && (
                                <div className={`absolute inset-0 pointer-events-none transition-all duration-700 z-0 ${getRarityBackground(selectedItem.rareza)}`}></div>
                            )}

                            {selectedItem ? (
                                <div className="relative z-10 w-full flex flex-col items-center">
                                    {/* Circle Image (Top Centered) */}
                                    <div className="relative w-64 h-64 shrink-0 mb-6 group">
                                        <div
                                            className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-700 animate-spin ${selectedItem.isSold ? 'border-red-900' : 'border-[#c8aa6e]/40'}`}
                                            style={{ animationDuration: '60s' }}
                                        ></div>

                                        <div className="absolute inset-3 rounded-full overflow-hidden bg-black border-[6px] border-[#1e293b] shadow-2xl">
                                            <img src={selectedItem.image} alt={selectedItem.name} className={`w-full h-full object-cover transition-all duration-500 ${selectedItem.isSold ? 'grayscale opacity-30 contrast-125' : 'opacity-80'}`} />

                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-transparent opacity-80"></div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />

                                            {selectedItem.isSold && (
                                                <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in duration-300">
                                                    <div className="border-[3px] border-red-600/80 rounded px-4 py-2 transform -rotate-12 bg-red-950/80 backdrop-blur-sm shadow-xl">
                                                        <span className="text-red-500 font-fantasy font-bold text-2xl tracking-[0.2em] uppercase">VENDIDO</span>
                                                    </div>
                                                </div>
                                            )}

                                            {!selectedItem.isSold && (
                                                <button
                                                    onClick={handleImageUploadClick}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
                                                >
                                                    <Upload className="w-8 h-8 text-[#c8aa6e]" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#0b1120] border-2 border-[#c8aa6e] rotate-45 flex items-center justify-center z-10 shadow-lg">
                                            <div className="w-6 h-6 border border-[#c8aa6e] flex items-center justify-center">
                                                <div className="w-3 h-3 bg-[#c8aa6e]"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ITEM DETAILS CONTAINER */}
                                    <div className="w-full max-w-lg animate-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">

                                        {/* Header */}
                                        <div className="text-center">
                                            <h2 className={`text-3xl font-fantasy font-bold uppercase tracking-[0.15em] drop-shadow-md ${selectedItem.isSold ? 'text-slate-600' : 'text-[#f0e6d2]'}`}>
                                                {selectedItem.name}
                                            </h2>
                                            {selectedItem.rareza && (
                                                <span className={`text-xs font-bold uppercase tracking-[0.3em] ${getRarityTextColor(selectedItem.rareza)}`}>
                                                    {selectedItem.rareza}
                                                </span>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent"></div>

                                        {/* RPG Stats Grid */}
                                        {(selectedItem.damage || selectedItem.defense || selectedItem.range || selectedItem.resourceCost !== undefined) && (
                                            <div className="grid grid-cols-2 gap-4 p-4 rounded border transition-all duration-500 bg-[#161f32]/50 border-[#c8aa6e]/10">
                                                {/* Column 1: Damage / Defense */}
                                                <div className="space-y-3 border-r border-[#c8aa6e]/10 pr-4">
                                                    {selectedItem.damage && (
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">DAÑO</div>
                                                            <div className="text-[#f0e6d2] font-fantasy font-bold text-lg">{selectedItem.damage}</div>
                                                        </div>
                                                    )}
                                                    {selectedItem.defense && (
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">DEFENSA</div>
                                                            {(() => {
                                                                const text = selectedItem.defense.toString();
                                                                const squareCount = (text.match(/[⬛🟦🔲]/g) || []).length;

                                                                if (squareCount === 0) {
                                                                    return <div className="text-[#f0e6d2] font-fantasy font-bold text-lg">{text}</div>;
                                                                }

                                                                return (
                                                                    <div className="flex gap-1.5 mt-1">
                                                                        {Array.from({ length: 5 }).map((_, i) => {
                                                                            const isActive = i < squareCount;
                                                                            const activeClass = "bg-blue-500 border-blue-400 shadow-[0_0_5px_blue]";

                                                                            return (
                                                                                <div
                                                                                    key={i}
                                                                                    className={`w-3 h-3 border border-slate-700 rounded-sm ${isActive ? activeClass : 'bg-slate-900'}`}
                                                                                ></div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                    {!selectedItem.damage && !selectedItem.defense && (
                                                        <div className="text-slate-600 text-xs italic">Sin estadísticas de combate.</div>
                                                    )}
                                                </div>

                                                {/* Column 2: Range / Cost */}
                                                <div className="space-y-3 pl-2">
                                                    {selectedItem.range && (
                                                        <div className="flex flex-col">
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                                                                ALC: <span className="text-slate-300">{selectedItem.range}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col">
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">COSTE:</div>
                                                        <div className="flex gap-1.5">
                                                            {selectedItem.consumption ? (
                                                                (() => {
                                                                    const text = selectedItem.consumption;
                                                                    const yellows = (text.match(/🟡/g) || []).length;
                                                                    const blues = (text.match(/🔵/g) || []).length;
                                                                    const squares = (text.match(/🟦/g) || []).length;

                                                                    if (yellows + blues + squares === 0) {
                                                                        return <span className="text-sm">{text}</span>;
                                                                    }

                                                                    return Array.from({ length: 5 }).map((_, i) => {
                                                                        const isSquare = squares > 0;
                                                                        const shapeClass = isSquare ? "rounded-sm" : "rounded-full";
                                                                        let activeClass = "";
                                                                        let isActive = false;

                                                                        if (isSquare) {
                                                                            if (i < squares) {
                                                                                isActive = true;
                                                                                activeClass = "bg-blue-500 border-blue-400 shadow-[0_0_5px_blue]";
                                                                            }
                                                                        } else {
                                                                            if (i < yellows) {
                                                                                isActive = true;
                                                                                activeClass = "bg-[#c8aa6e] border-[#f0e6d2] shadow-[0_0_5px_#c8aa6e]";
                                                                            } else if (i < yellows + blues) {
                                                                                isActive = true;
                                                                                activeClass = "bg-blue-500 border-blue-400 shadow-[0_0_5px_blue]";
                                                                            }
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={i}
                                                                                className={`w-3 h-3 border border-slate-700 ${shapeClass} ${isActive ? activeClass : 'bg-slate-900'}`}
                                                                            ></div>
                                                                        );
                                                                    });
                                                                })()
                                                            ) : selectedItem.resourceCost !== undefined && selectedItem.resourceCost > 0 ? (
                                                                Array.from({ length: 5 }).map((_, i) => (
                                                                    <div key={i} className={`w-3 h-3 rounded-full border border-slate-700 ${i < selectedItem.resourceCost
                                                                        ? (selectedItem.resourceType === 'bonus' ? 'bg-orange-500 border-orange-400 shadow-[0_0_5px_orange]' :
                                                                            selectedItem.resourceType === 'spell' ? 'bg-blue-500 border-blue-400 shadow-[0_0_5px_blue]' :
                                                                                'bg-[#c8aa6e] border-[#f0e6d2] shadow-[0_0_5px_#c8aa6e]')
                                                                        : 'bg-slate-900'
                                                                        }`}></div>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-600 text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags Row */}
                                        {selectedItem.tags && selectedItem.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {selectedItem.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 border border-slate-600 text-[10px] text-slate-400 uppercase font-bold tracking-wider rounded-sm">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Flavor Text Description */}
                                        <div className="mt-2 text-center">
                                            <p className="text-[#c8aa6e] font-serif italic text-sm opacity-80 leading-relaxed border-t border-[#c8aa6e]/20 pt-4">
                                                "{selectedItem.description}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center opacity-40">
                                    <Box className="w-24 h-24 mx-auto mb-4 text-[#c8aa6e]" />
                                    <p className="font-fantasy tracking-widest text-[#f0e6d2]">SELECCIONA UN OBJETO</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- FOOTER --- */}
                <div className="h-24 bg-[#0b1120] border-t-2 border-[#c8aa6e] relative shrink-0 flex items-start justify-between px-8 lg:px-12 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-30">

                    {/* Money Display Group */}
                    <div className="relative self-start -mt-[2px] z-40 group/money">

                        <div className="absolute bottom-[calc(100%-2px)] left-0 bg-[#0b1120] border-2 border-b-0 border-[#c8aa6e] px-4 py-1.5 rounded-t-lg z-20 flex items-center justify-center min-w-[90px]">
                            <span className="text-[11px] text-[#c8aa6e] font-bold uppercase tracking-[0.15em] pt-0.5">SALDO</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-[#0b1120] border-2 border-[#c8aa6e] rounded-b-lg rounded-tr-lg rounded-tl-none px-6 py-3 shadow-[inset_0_0_20px_rgba(200,170,110,0.1)] min-w-[200px] flex items-center justify-end gap-3 relative z-10">

                                <div className="shrink-0 drop-shadow-md">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                                        <circle cx="12" cy="12" r="10" fill="url(#coinGradient)" stroke="#b45309" strokeWidth="1.5" />
                                        <circle cx="12" cy="12" r="7" stroke="#b45309" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                                        <path d="M12 7V17M9 9.5H12.5C14.5 9.5 14.5 12.5 12.5 12.5H11.5C9.5 12.5 9.5 15.5 11.5 15.5H15" stroke="#78350f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <defs>
                                            <linearGradient id="coinGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                                                <stop stopColor="#fbbf24" />
                                                <stop offset="1" stopColor="#d97706" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>

                                {isEditingMoney ? (
                                    <input
                                        ref={moneyInputRef}
                                        type="number"
                                        value={actualMoney}
                                        onChange={handleMoneyChange}
                                        onBlur={() => setIsEditingMoney(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingMoney(false)}
                                        className="bg-transparent border-none outline-none text-[#c8aa6e] font-fantasy text-3xl font-bold tracking-widest w-full text-right"
                                    />
                                ) : (
                                    <span className={`text-[#c8aa6e] font-fantasy text-3xl font-bold tracking-widest drop-shadow-[0_0_8px_rgba(200,170,110,0.5)] transition-colors duration-100 ${displayMoney < actualMoney ? 'text-green-400' : displayMoney > actualMoney ? 'text-red-400' : ''}`}>
                                        {displayMoney}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={toggleMoneyEdit}
                                className="text-slate-600 hover:text-[#c8aa6e] transition-colors opacity-0 group-hover/money:opacity-100"
                            >
                                {isEditingMoney ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {currentCategory !== 'OFERTA' && (
                        <div className="flex items-center gap-8 self-center animate-in fade-in duration-300">
                            <button
                                onClick={handlePurchase}
                                disabled={!selectedItem || actualMoney < selectedItem.price || selectedItem.isSold}
                                className={`
                            flex items-center justify-center px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300
                            ${!selectedItem || selectedItem.isSold
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : actualMoney >= selectedItem.price
                                            ? 'bg-[#c8aa6e] text-[#0b1120] hover:bg-[#d97706] hover:shadow-[0_0_20px_rgba(200,170,110,0.5)] transform hover:-translate-y-1'
                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    }
                        `}
                            >
                                <span className="flex items-center gap-2">
                                    {selectedItem?.isSold ? <Lock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                    {selectedItem?.isSold ? 'AGOTADO' : 'COMPRAR'}
                                </span>
                            </button>

                            <div className="flex items-center gap-2 text-[#991b1b] hover:text-red-500 cursor-pointer transition-colors">
                                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold font-serif pt-0.5">B</div>
                                <span className="font-bold font-fantasy tracking-wider">VOLVER</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
