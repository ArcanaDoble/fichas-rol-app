import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
    FiZap,
    FiUsers,
    FiTarget,
    FiCompass,
    FiMap,
    FiTool,
    FiChevronRight,
    FiArrowLeft,
    FiStar,
    FiUser,
    FiLayout
} from 'react-icons/fi';
import { FaSkull } from 'react-icons/fa';

const MasterMenu = ({ onSelect, onBackToMain }) => {
    const [hoveredOption, setHoveredOption] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);

    const handleSelect = async (optionId) => {
        setSelectedOption(optionId);
        await new Promise(resolve => setTimeout(resolve, 300));
        onSelect(optionId);
    };

    const menuOptions = [
        {
            id: 'initiative',
            title: 'Sistema de Velocidad',
            description: 'Control total del combate con iniciativa y gestión de participantes.',
            color: 'cyan',
            icon: FiZap,
            features: ['Control Master', 'Tiempo Real', 'Turnos'],
            isNew: false,
        },
        {
            id: 'enemies',
            title: 'Fichas de Enemigos',
            description: 'Crear y gestionar fichas de enemigos, estadísticas y retratos.',
            color: 'rose',
            icon: FaSkull,
            features: ['Bestiario', 'Retratos', 'Stats'],
            isNew: false,
        },
        {
            id: 'users',
            title: 'Usuarios',
            description: 'Lista de fichas de jugadores creadas en la campaña.',
            color: 'sky',
            icon: FiUser,
            features: ['Jugadores', 'Fichas', 'Stats'],
            isNew: true,
        },
        {
            id: 'classes',
            title: 'Lista de Clases',
            description: 'Colección de clases con estética premium, filtros y gestión.',
            color: 'amber',
            icon: FiUsers,
            features: ['Catálogo', 'Filtros', 'DnD'],
            isNew: true,
        },
        {
            id: 'canvas',
            title: 'Mapa de Batalla',
            description: 'Tablero virtual táctico con grid, tokens y herramientas de dibujo.',
            color: 'indigo',
            icon: FiTarget,
            features: ['Grid', 'Tokens', 'Táctico'],
            isNew: false,
        },
        {
            id: 'canvas_beta',
            title: 'Canvas (BETA)',
            description: 'Nueva arquitectura del Canvas. Entorno de pruebas aislado.',
            color: 'rose',
            icon: FiLayout,
            features: ['Beta', 'Dev', 'Test'],
            isNew: true,
        },
        {
            id: 'minimap',
            title: 'Minimapa',
            description: 'Constructor rápido de entornos y referencias visuales.',
            color: 'emerald',
            icon: FiCompass,
            features: ['Rápido', 'Visual', 'Iconos'],
            isNew: true,
        },
        {
            id: 'routeMapLite',
            title: 'Mapa de Campaña',
            description: 'Gestión de rutas, nodos y progreso de la aventura a gran escala.',
            color: 'violet',
            icon: FiMap,
            features: ['Mundo', 'Nodos', 'Progreso'],
            isNew: true,
        },
        {
            id: 'status_effects',
            title: 'Estados Alterados',
            description: 'Configura iconos, descripciones y colores globales de los estados.',
            color: 'emerald',
            icon: FiZap,
            features: ['Global', 'Iconos', 'Colores'],
            isNew: true,
        },
        {
            id: 'default',
            title: 'Herramientas',
            description: 'Utilidades generales, glosario y configuraciones adicionales.',
            color: 'slate',
            icon: FiTool,
            features: ['Glosario', 'Ajustes', 'Dados'],
            isNew: false,
        },
    ];

    // Mapa de colores para estilos dinámicos
    const colorStyles = {
        cyan: {
            text: 'text-cyan-400',
            groupHoverText: 'group-hover:text-cyan-400',
            border: 'border-cyan-800',
            groupHoverBorder: 'group-hover:border-cyan-400',
            bg: 'from-cyan-500/10',
            badge: 'bg-cyan-200 text-cyan-950',
            iconColor: 'text-cyan-700 group-hover:text-cyan-400',
            footerText: 'text-cyan-700 group-hover:text-cyan-400/80',
            radialGradient: 'from-cyan-500/10'
        },
        rose: {
            text: 'text-rose-400',
            groupHoverText: 'group-hover:text-rose-400',
            border: 'border-rose-900',
            groupHoverBorder: 'group-hover:border-rose-500',
            bg: 'from-rose-500/10',
            badge: 'bg-rose-200 text-rose-950',
            iconColor: 'text-rose-800 group-hover:text-rose-500',
            footerText: 'text-rose-800 group-hover:text-rose-500/80',
            radialGradient: 'from-rose-600/10'
        },
        amber: {
            text: 'text-[#c8aa6e]',
            groupHoverText: 'group-hover:text-[#c8aa6e]',
            border: 'border-[#785a28]',
            groupHoverBorder: 'group-hover:border-[#c8aa6e]',
            bg: 'from-[#c8aa6e]/10',
            badge: 'bg-[#c8aa6e] text-[#09090b]',
            iconColor: 'text-[#785a28] group-hover:text-[#c8aa6e]',
            footerText: 'text-[#785a28] group-hover:text-[#c8aa6e]/80',
            radialGradient: 'from-[#c8aa6e]/10'
        },
        indigo: {
            text: 'text-indigo-400',
            groupHoverText: 'group-hover:text-indigo-400',
            border: 'border-indigo-800',
            groupHoverBorder: 'group-hover:border-indigo-400',
            bg: 'from-indigo-500/10',
            badge: 'bg-indigo-200 text-indigo-950',
            iconColor: 'text-indigo-700 group-hover:text-indigo-400',
            footerText: 'text-indigo-700 group-hover:text-indigo-400/80',
            radialGradient: 'from-indigo-500/10'
        },
        emerald: {
            text: 'text-emerald-400',
            groupHoverText: 'group-hover:text-emerald-400',
            border: 'border-emerald-800',
            groupHoverBorder: 'group-hover:border-emerald-400',
            bg: 'from-emerald-500/10',
            badge: 'bg-emerald-200 text-emerald-950',
            iconColor: 'text-emerald-700 group-hover:text-emerald-400',
            footerText: 'text-emerald-700 group-hover:text-emerald-400/80',
            radialGradient: 'from-emerald-500/10'
        },
        violet: {
            text: 'text-violet-400',
            groupHoverText: 'group-hover:text-violet-400',
            border: 'border-violet-800',
            groupHoverBorder: 'group-hover:border-violet-400',
            bg: 'from-violet-500/10',
            badge: 'bg-violet-200 text-violet-950',
            iconColor: 'text-violet-700 group-hover:text-violet-400',
            footerText: 'text-violet-700 group-hover:text-violet-400/80',
            radialGradient: 'from-violet-500/10'
        },
        slate: {
            text: 'text-slate-400',
            groupHoverText: 'group-hover:text-slate-300',
            border: 'border-slate-700',
            groupHoverBorder: 'group-hover:border-slate-400',
            bg: 'from-slate-500/10',
            badge: 'bg-slate-200 text-slate-950',
            iconColor: 'text-slate-600 group-hover:text-slate-400',
            footerText: 'text-slate-600 group-hover:text-slate-400/80',
            radialGradient: 'from-slate-500/10'
        },
        sky: {
            text: 'text-sky-400',
            groupHoverText: 'group-hover:text-sky-400',
            border: 'border-sky-800',
            groupHoverBorder: 'group-hover:border-sky-400',
            bg: 'from-sky-500/10',
            badge: 'bg-sky-200 text-sky-950',
            iconColor: 'text-sky-700 group-hover:text-sky-400',
            footerText: 'text-sky-700 group-hover:text-sky-400/80',
            radialGradient: 'from-sky-500/10'
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-[#e2e8f0] font-['Lato'] p-4 md:p-8 selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2] overflow-y-auto custom-scrollbar relative">
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
        `}
            </style>

            {/* Partículas de polvo / Estrellas de fondo */}
            {/* Fondo con Gradiente Radial para profundidad */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1b26] via-[#09090b] to-[#09090b] opacity-80" />

            {/* Partículas de polvo / Estrellas de fondo */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {[...Array(50)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white/20 rounded-full blur-[0.5px]"
                        style={{
                            width: Math.random() * 3 + 1 + 'px',
                            height: Math.random() * 3 + 1 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                        }}
                        animate={{
                            y: [0, -30, 0],
                            x: [0, Math.random() * 20 - 10, 0],
                            opacity: [0.1, 0.5, 0.1],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </div>

            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 relative z-10">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#c8aa6e]/20 pb-8"
                >
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                            <span className="opacity-70">ARCANA VAULT</span>
                            <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                            <span>MASTER TOOLS</span>
                        </div>
                        <h1 className="font-['Cinzel'] text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-5xl">
                            Herramientas del Máster
                        </h1>
                        <p className="max-w-2xl font-['Lato'] text-lg font-light leading-relaxed text-[#94a3b8]">
                            Centro de comando para la gestión de campaña, combate y narrativa.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 md:items-end">
                        <button
                            onClick={onBackToMain}
                            className="
                            group flex items-center gap-2 
                            px-5 py-2.5 
                            bg-transparent
                            border border-[#c8aa6e]/30 hover:border-[#c8aa6e]/60 
                            hover:bg-[#c8aa6e]/10 hover:text-[#c8aa6e]
                            text-slate-400
                            transition-all duration-300
                            uppercase tracking-[0.25em] font-['Cinzel'] text-xs font-bold
                            "
                        >
                            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span>VOLVER AL MENÚ</span>
                        </button>
                    </div>
                </motion.div>

                {/* Grid de Opciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                    {menuOptions.map((option, index) => {
                        const isSelected = selectedOption === option.id;
                        const styles = colorStyles[option.color] || colorStyles.slate;

                        return (
                            <motion.div
                                key={option.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                onClick={() => !isSelected && handleSelect(option.id)}
                                onMouseEnter={() => setHoveredOption(option.id)}
                                onMouseLeave={() => setHoveredOption(null)}
                                className={`
                                    group relative aspect-[3/4.2] cursor-pointer rounded-sm 
                                    transition-all duration-500 ease-out 
                                    hover:-translate-y-2 hover:shadow-xl
                                    ${isSelected ? 'scale-95 opacity-80' : ''}
                                `}
                            >
                                {/* Main Frame Content */}
                                <div className={`absolute inset-0 overflow-hidden bg-[#1a1b26] border-[1px] ${styles.border} ${styles.groupHoverBorder} transition-colors duration-300`}>

                                    {/* Icon Container (replaces Image) */}
                                    <div className="flex shrink-0 h-[55%] w-full items-center justify-center bg-[#0b1120] relative overflow-hidden group-hover:bg-[#131b2e] transition-colors">
                                        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${styles.radialGradient} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity`} />

                                        <option.icon
                                            size={64}
                                            strokeWidth={1}
                                            className={`relative z-10 ${styles.iconColor} group-hover:scale-110 transition-all duration-500 drop-shadow-2xl`}
                                        />

                                        {/* New Badge within Image Area */}
                                        {option.isNew && (
                                            <div className={`absolute top-4 right-4 z-20 flex items-center gap-1 ${styles.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-lg`}>
                                                <FiStar className="w-3 h-3 fill-current" />
                                                <span>Nuevo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex h-[45%] flex-col justify-between p-6 bg-gradient-to-b from-[#1a1b26] to-[#0f1219]">
                                        <div className="space-y-3">
                                            <h3 className={`font-['Cinzel'] text-xl font-bold uppercase tracking-wide text-slate-200 ${styles.groupHoverText} transition-colors`}>
                                                {option.title}
                                            </h3>
                                            <p className="font-['Lato'] text-sm leading-relaxed text-[#94a3b8] group-hover:text-slate-300 line-clamp-3">
                                                {option.description}
                                            </p>
                                        </div>

                                        {/* Features Footer */}
                                        <div className={`pt-4 border-t border-slate-800 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider ${styles.footerText}`}>
                                            {option.features.slice(0, 3).join(' • ')}
                                        </div>
                                    </div>

                                    {/* Inner Border Highlight effect */}
                                    <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

MasterMenu.propTypes = {
    onSelect: PropTypes.func.isRequired,
    onBackToMain: PropTypes.func.isRequired,
};

export default MasterMenu;
