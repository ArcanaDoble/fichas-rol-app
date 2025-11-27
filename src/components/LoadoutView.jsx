import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FiShield, FiX, FiCheck } from 'react-icons/fi';
import { Sword, Shield, Zap } from 'lucide-react';
import HexIcon from './HexIcon';

const RARITIES = [
    { id: 'comun', label: 'Común', color: 'bg-slate-600 border-slate-400 text-slate-200' },
    { id: 'poco-comun', label: 'Poco Común', color: 'bg-green-600 border-green-400 text-green-200' },
    { id: 'rara', label: 'Rara', color: 'bg-blue-600 border-blue-400 text-blue-200' },
    { id: 'epica', label: 'Épica', color: 'bg-purple-600 border-purple-400 text-purple-200' },
    { id: 'legendaria', label: 'Legendaria', color: 'bg-orange-600 border-orange-400 text-orange-200' }
];

const LoadoutView = ({ dndClass, equipmentCatalog, onAddEquipment, onRemoveEquipment, onUpdateTalent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('weapons');
    const [showRarityDropdown, setShowRarityDropdown] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);

    // Local editing state
    const [editingTitle, setEditingTitle] = useState('');
    const [editingDescription, setEditingDescription] = useState('');

    // Get talent values from dndClass or use defaults
    const talentTitle = dndClass.talents?.title || 'Centinela';
    const talentDescription = dndClass.talents?.description || 'Ataques de oportunidad reducen velocidad a 0.';
    const talentRarity = dndClass.talents?.rarity || 'rara';

    const rawEquipment = dndClass.equipment || {};
    const equipment = useMemo(() => {
        if (Array.isArray(rawEquipment)) return rawEquipment;

        const list = [];
        if (rawEquipment.weapons) list.push(...rawEquipment.weapons.map((item, idx) => ({ ...item, _category: 'weapons', _index: idx })));
        if (rawEquipment.armor) list.push(...rawEquipment.armor.map((item, idx) => ({ ...item, _category: 'armor', _index: idx })));
        if (rawEquipment.abilities) list.push(...rawEquipment.abilities.map((item, idx) => ({ ...item, _category: 'abilities', _index: idx })));
        return list;
    }, [rawEquipment]);

    // Filtrar catálogo según búsqueda
    const filteredCatalog = useMemo(() => {
        const catalog = equipmentCatalog?.[selectedCategory] || [];
        if (!searchTerm.trim()) return catalog.slice(0, 5);

        return catalog
            .filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .slice(0, 5);
    }, [equipmentCatalog, selectedCategory, searchTerm]);

    const selectedRarity = RARITIES.find(r => r.id === talentRarity) || RARITIES[2];

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#09090b]">
            <div className="p-8 lg:p-12 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8 border-b border-[#c8aa6e]/20 pb-4">
                    <h2 className="text-4xl font-['Cinzel'] text-[#f0e6d2]">MAZO INICIAL</h2>
                    <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span className="text-[#c8aa6e]">Equipables</span>
                        <span>Inventario</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">

                    {/* Left Column: Equipment List */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Buscador de Equipamiento */}
                        <div className="mb-6 p-4 bg-[#161f32]/60 border border-[#c8aa6e]/20 rounded-lg">
                            <h4 className="text-[#c8aa6e] font-['Cinzel'] text-sm tracking-widest mb-3">
                                AGREGAR EQUIPAMIENTO
                            </h4>

                            {/* Tabs de categoría */}
                            <div className="flex gap-2 mb-3">
                                {[
                                    { id: 'weapons', label: 'Armas' },
                                    { id: 'armor', label: 'Armaduras' },
                                    { id: 'abilities', label: 'Habilidades' }
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
                            <Sword className="w-5 h-5 text-[#c8aa6e]" />
                            <h3 className="text-[#c8aa6e] font-['Cinzel'] text-xl tracking-[0.3em] uppercase">
                                Cartas de Equipo
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
                                            <div className="w-24 bg-black/50 relative shrink-0 ml-2 flex flex-col z-10 backdrop-blur-sm">
                                                <div className="w-full h-full flex flex-col items-center justify-center border-r border-slate-700/50">
                                                    <div className="text-3xl mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                                        {getIcon()}
                                                    </div>
                                                    {/* Rarity Label - Only show if exists */}
                                                    {item.rareza ? (
                                                        <span className={`text-[0.6rem] uppercase font-bold ${rarityColors.text} text-center leading-tight px-1`}>
                                                            {item.rareza}
                                                        </span>
                                                    ) : (
                                                        <div className="w-8 h-[1px] bg-slate-700/50 mt-2"></div>
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
                                                            {(item.traits || item.rasgos || item.trait).toString().split(',').map((t, i) => (
                                                                <span key={i} className="text-[0.6rem] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                                                                    {t.trim()}
                                                                </span>
                                                            ))}
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
                                    No hay equipamiento inicial definido.
                                </div>
                            )}
                        </div>

                        {/* Empty slots visual filler */}
                        <div className="mt-8 pt-8 border-t border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-24 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 font-['Cinzel'] text-sm uppercase tracking-widest">
                                        Ranura Vacía
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Relic Slots (Vertical Stack) */}
                    <div className="bg-[#0b1120] border border-[#c8aa6e]/20 rounded-xl p-6 shadow-2xl h-fit">
                        <h3 className="text-[#c8aa6e] font-['Cinzel'] text-lg tracking-widest mb-8 text-center flex items-center justify-center gap-2">
                            <FiShield className="w-5 h-5" />
                            TALENTOS
                        </h3>

                        <div className="flex flex-col gap-8 items-center">
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
                                            onClick={() => setShowRarityDropdown(!showRarityDropdown)}
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
                            <div className="space-y-6 w-full">
                                {[4, 8, 12].map((level) => (
                                    <div key={level} className="flex items-center gap-4 group opacity-60 hover:opacity-100 transition-opacity">
                                        <HexIcon size="sm" locked />
                                        <div>
                                            <div className="text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-[#c8aa6e]">Ranura Bloqueada</div>
                                            <div className="text-[10px] text-slate-500">Requiere Nivel {level}</div>
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

LoadoutView.propTypes = {
    dndClass: PropTypes.shape({
        equipment: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            type: PropTypes.string,
            category: PropTypes.string,
            detail: PropTypes.string,
            description: PropTypes.string
        }))
    }).isRequired,
    equipmentCatalog: PropTypes.shape({
        weapons: PropTypes.array,
        armor: PropTypes.array,
        abilities: PropTypes.array
    }),
    onAddEquipment: PropTypes.func,
    onRemoveEquipment: PropTypes.func,
    onUpdateTalent: PropTypes.func
};

export default LoadoutView;
