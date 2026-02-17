
import React from 'react';
import { FiChevronDown, FiPlus, FiMinus } from 'react-icons/fi';

const ATTRIBUTES = [
    { id: 'destreza', label: 'Destreza', short: 'DES' },
    { id: 'vigor', label: 'Vigor', short: 'VIG' },
    { id: 'intelecto', label: 'Intelecto', short: 'INT' },
    { id: 'voluntad', label: 'Voluntad', short: 'VOL' },
];

const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12'];

const RESOURCES = [
    { id: 'postura', label: 'Postura', color: '#10b981', attr: 'destreza' },  // Verde
    { id: 'armadura', label: 'Armadura', color: '#94a3b8', attr: 'vigor' },   // Gris
    { id: 'vida', label: 'Vida', color: '#ef4444', attr: 'vigor' },           // Rojo
    { id: 'ingenio', label: 'Ingenio', color: '#3b82f6', attr: 'intelecto' }, // Azul
    { id: 'cordura', label: 'Cordura', color: '#a855f7', attr: 'voluntad' },  // Morado
];

/**
 * Componente para gestionar Recursos y Atributos de un Token
 * @param {Object} token - El objeto token actual
 * @param {Function} onUpdate - Función para actualizar el token (updates) => void
 */
const TokenResources = ({ token, onUpdate }) => {
    // Estado para controlar qué dropdown está abierto
    const [openDropdownId, setOpenDropdownId] = React.useState(null);
    const dropdownRef = React.useRef(null);

    // Cerrar dropdown al hacer click fuera
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper para actualizar stats. Estructura: token.stats = { postura: { current: 5, max: 10 }, ... }
    const updateStat = (resourceId, field, value) => {
        const currentStats = token.stats || {};
        const currentResource = currentStats[resourceId] || { current: 0, max: 5 };

        const newResource = { ...currentResource, [field]: value };

        // Validaciones básicas
        if (field === 'max') {
            // Si bajamos el max por debajo del current, ajustamos current
            if (newResource.current > value) newResource.current = value;
            // Límite de 10 bloques
            if (newResource.max > 10) newResource.max = 10;
            if (newResource.max < 0) newResource.max = 0;
        }
        if (field === 'current') {
            if (newResource.current > newResource.max) newResource.current = newResource.max;
            if (newResource.current < 0) newResource.current = 0;
        }

        onUpdate({
            stats: {
                ...currentStats,
                [resourceId]: newResource
            }
        });
    };

    // Helper para actualizar atributos. Estructura: token.attributes = { destreza: 'd8', ... }
    const updateAttribute = (attrId, value) => {
        const currentAttrs = token.attributes || {};
        onUpdate({
            attributes: {
                ...currentAttrs,
                [attrId]: value
            }
        });
    };

    const getAttributeDie = (attrId) => {
        return token.attributes?.[attrId] || '-';
    };

    return (
        <div className="space-y-6" ref={dropdownRef}>

            {/* SECCIÓN 1: ATRIBUTOS (CDs) */}
            <div className="space-y-2">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Atributos (CD)</h4>
                <div className="grid grid-cols-4 gap-2">
                    {ATTRIBUTES.map(attr => {
                        const currentDie = getAttributeDie(attr.id);
                        const isOpen = openDropdownId === attr.id;

                        return (
                            <div key={attr.id} className="relative bg-[#111827] border border-slate-800 rounded p-2 flex flex-col items-center gap-1 group hover:border-slate-700 transition-colors">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{attr.short}</span>

                                <button
                                    onClick={() => setOpenDropdownId(isOpen ? null : attr.id)}
                                    className="w-full bg-transparent text-center font-mono text-xs font-bold text-[#c8aa6e] outline-none cursor-pointer uppercase hover:text-white transition-colors flex items-center justify-center p-1"
                                >
                                    {currentDie === '-' ? '-' : currentDie.toUpperCase()}
                                </button>

                                {/* Custom Dropdown Menu */}
                                {isOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-[#0b1120] border border-slate-700 rounded shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={() => { updateAttribute(attr.id, '-'); setOpenDropdownId(null); }}
                                            className="px-2 py-1.5 text-[10px] font-mono font-bold text-slate-400 hover:bg-slate-800 hover:text-white text-center transition-colors border-b border-slate-800 block w-full"
                                        >
                                            -
                                        </button>
                                        {DICE_OPTIONS.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => { updateAttribute(attr.id, d); setOpenDropdownId(null); }}
                                                className={`px-2 py-1.5 text-[10px] font-mono font-bold text-center transition-colors uppercase block w-full ${currentDie === d ? 'bg-[#c8aa6e]/20 text-[#c8aa6e]' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECCIÓN 2: RECURSOS (BARRAS) */}
            <div className="space-y-4">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Recursos</h4>

                <div className="space-y-3">
                    {RESOURCES.map(res => {
                        const stat = token.stats?.[res.id] || { current: 0, max: 5 }; // Default 5 max
                        const linkedDie = getAttributeDie(res.attr);

                        return (
                            <div key={res.id} className="bg-[#0b1120] border border-slate-800/50 rounded-lg p-2.5 space-y-2">
                                {/* Header: Label + Die Icon + Controls */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ color: res.color, backgroundColor: res.color }}></div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{res.label}</span>
                                        {linkedDie !== '-' && (
                                            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-mono font-bold text-slate-400 border border-slate-700 uppercase">
                                                {linkedDie}
                                            </span>
                                        )}
                                    </div>

                                    {/* Config Max Blocks */}
                                    <div className="flex items-center gap-1 bg-black/40 rounded px-1 border border-slate-800/50">
                                        <button onClick={() => updateStat(res.id, 'max', stat.max - 1)} className="text-slate-500 hover:text-white p-1 outline-none"><FiMinus size={10} /></button>
                                        <span className="text-[9px] font-mono text-slate-400 w-3 text-center">{stat.max}</span>
                                        <button onClick={() => updateStat(res.id, 'max', stat.max + 1)} className="text-slate-500 hover:text-white p-1 outline-none"><FiPlus size={10} /></button>
                                    </div>
                                </div>

                                {/* BLOCKS RENDERER */}
                                <div className="flex gap-1 h-5 w-full">
                                    {Array.from({ length: stat.max }).map((_, idx) => {
                                        const isFilled = idx < stat.current;
                                        return (
                                            <button
                                                key={idx}
                                                // Click logic: If click on filled, set to this index (remove aboves). If click on empty, set to idx + 1.
                                                // Actually standard: Click idx -> sets value to idx + 1. 
                                                // If click on the last filled one, maybe toggle off? 
                                                // Better: Click on block N sets Value to N+1. 
                                                // To clear all? Click on 0 again? Or separate clear?
                                                // Let's allow clicking first block to toggle 0/1.
                                                onClick={() => {
                                                    const clickedValue = idx + 1;
                                                    // Si hago click en el que ya es el máximo actual, lo apago (resto 1)
                                                    // Ejemplo: current=3. Click en bloque 3. Nuevo current = 2.
                                                    if (clickedValue === stat.current) {
                                                        updateStat(res.id, 'current', clickedValue - 1);
                                                    } else {
                                                        // Si no, seteo el valor hasta donde hice click
                                                        updateStat(res.id, 'current', clickedValue);
                                                    }
                                                }}
                                                className={`
                                                    flex-1 rounded-sm border transition-all duration-200 outline-none
                                                    ${isFilled
                                                        ? `bg-opacity-80 border-opacity-50 hover:bg-opacity-100 shadow-[0_0_8px_-2px_currentColor]`
                                                        : 'bg-transparent border-slate-800 hover:bg-slate-800/50'
                                                    }
                                                `}
                                                style={{
                                                    backgroundColor: isFilled ? res.color : undefined,
                                                    borderColor: isFilled ? res.color : undefined,
                                                    color: res.color // for shadow usage
                                                }}
                                            />
                                        );
                                    })}
                                    {/* Relleno visual si max < 10 para mantener grid? No, user said visual blocks. Flex-1 fills width. */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECCIÓN 3: VELOCIDAD ACUMULADA */}
            <div className="space-y-3">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Velocidad</h4>
                <div className="bg-[#0b1120] border border-slate-800/50 rounded-lg p-2.5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#c8aa6e] shadow-[0_0_5px_#c8aa6e]"></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Acumulada</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 bg-black/40 rounded px-1 border border-slate-800/50">
                            <button onClick={() => onUpdate({ velocidad: Math.max(0, (token.velocidad || 0) - 1) })} className="text-slate-500 hover:text-white p-1 outline-none"><FiMinus size={10} /></button>
                            <span className="text-[9px] font-mono text-[#c8aa6e] w-4 text-center font-bold">{token.velocidad || 0}</span>
                            <button onClick={() => onUpdate({ velocidad: (token.velocidad || 0) + 1 })} className="text-slate-500 hover:text-white p-1 outline-none"><FiPlus size={10} /></button>
                        </div>
                    </div>

                    {/* Visual counter bar */}
                    <div className="flex gap-1 h-5 w-full">
                        {Array.from({ length: Math.max(10, (token.velocidad || 0)) }).map((_, idx) => {
                            const isFilled = idx < (token.velocidad || 0);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onUpdate({ velocidad: idx + 1 === (token.velocidad || 0) ? idx : idx + 1 })}
                                    className={`
                                        flex-1 rounded-sm border transition-all duration-200 outline-none
                                        ${isFilled
                                            ? 'bg-opacity-80 border-opacity-50 hover:bg-opacity-100 shadow-[0_0_8px_-2px_currentColor]'
                                            : 'bg-transparent border-slate-800 hover:bg-slate-800/50'
                                        }
                                    `}
                                    style={{
                                        backgroundColor: isFilled ? '#c8aa6e' : undefined,
                                        borderColor: isFilled ? '#c8aa6e' : undefined,
                                        color: '#c8aa6e'
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TokenResources;
