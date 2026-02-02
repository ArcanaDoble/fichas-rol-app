import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

const CanvasSection = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#09090b] text-[#e2e8f0] font-['Lato'] p-4 md:p-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1b26] via-[#09090b] to-[#09090b] opacity-80" />

            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#c8aa6e]/20 pb-6 mb-12">
                    <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                            <span className="opacity-70">ARCANA VAULT</span>
                            <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                            <span>BETA FEATURE</span>
                        </div>
                        <h1 className="font-['Cinzel'] text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)]">
                            Canvas (BETA)
                        </h1>
                    </div>

                    <button
                        onClick={onBack}
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

                {/* Content - Work in Progress */}
                <div className="flex-1 flex flex-col items-center justify-center p-12 border border-[#c8aa6e]/10 bg-[#0b1120]/50 rounded-sm backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center text-center space-y-6 max-w-2xl"
                    >
                        <div className="p-6 rounded-full bg-[#c8aa6e]/10 border border-[#c8aa6e]/20 shadow-[0_0_30px_rgba(200,170,110,0.1)]">
                            <FiAlertTriangle className="w-16 h-16 text-[#c8aa6e]" />
                        </div>

                        <h2 className="font-['Cinzel'] text-3xl font-bold text-[#f0e6d2]">
                            Sección en Desarrollo
                        </h2>

                        <p className="text-lg text-[#94a3b8] leading-relaxed">
                            Esta sección es un entorno de pruebas aislado para la nueva arquitectura del Canvas.
                            Las funcionalidades se irán implementando progresivamente sin afectar al Mapa de Batalla principal.
                        </p>

                        <div className="px-4 py-2 bg-[#c8aa6e]/5 border border-[#c8aa6e]/20 rounded text-[#c8aa6e] text-sm font-bold tracking-wider uppercase">
                            Próximamente: Implementación del Grid
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

CanvasSection.propTypes = {
    onBack: PropTypes.func.isRequired,
};

export default CanvasSection;
