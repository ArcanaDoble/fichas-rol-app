import React from 'react';
import PropTypes from 'prop-types';
import { FiUser, FiBarChart2, FiBriefcase, FiShield, FiBookOpen, FiSave } from 'react-icons/fi';
import { Coins } from 'lucide-react';

// Menú items compartidos entre desktop y mobile
const menuItems = [
    { id: 'overview', label: 'RESUMEN', sub: 'Stats & Lore', icon: <FiUser className="w-5 h-5" />, mobileLabel: 'Resumen' },
    { id: 'progression', label: 'CONSTELACIÓN', sub: 'Progresión', icon: <FiBarChart2 className="w-5 h-5" />, mobileLabel: 'Nivel' },
    { id: 'loadout', label: 'MAZO INICIAL', sub: 'Equipamiento', icon: <FiBriefcase className="w-5 h-5" />, mobileLabel: 'Equipo' },
    { id: 'feats', label: 'RELIQUIAS', sub: 'Talentos', icon: <FiShield className="w-5 h-5" />, mobileLabel: 'Reliq.' },
    { id: 'store', label: 'TIENDA', sub: 'Mejoras', icon: <Coins className="w-5 h-5" />, mobileLabel: 'Tienda' },
];

// Componente de navegación móvil (barra inferior)
export const MobileNav = ({
    activeTab,
    onTabChange,
    onSave,
    hasUnsavedChanges = false,
    saveButtonState = 'idle'
}) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b1120]/98 border-t border-[#c8aa6e]/30 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around px-1 py-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all min-w-[52px] relative ${activeTab === item.id
                                ? 'text-[#c8aa6e]'
                                : 'text-slate-500'
                            }`}
                    >
                        <span className={`transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>
                            {item.icon}
                        </span>
                        <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-tight ${activeTab === item.id ? 'text-[#c8aa6e]' : 'text-slate-600'
                            }`}>
                            {item.mobileLabel}
                        </span>
                        {activeTab === item.id && (
                            <div className="absolute -top-0.5 w-6 h-0.5 bg-[#c8aa6e] rounded-full"></div>
                        )}
                    </button>
                ))}

                {/* Save Button Mobile */}
                {onSave && (
                    <button
                        onClick={hasUnsavedChanges ? onSave : undefined}
                        disabled={!hasUnsavedChanges || saveButtonState === 'saving'}
                        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all min-w-[52px] relative ${hasUnsavedChanges
                                ? 'text-[#c8aa6e]'
                                : 'text-slate-600 opacity-50'
                            }`}
                    >
                        {saveButtonState === 'saving' ? (
                            <div className="w-5 h-5 border-2 border-[#c8aa6e] border-t-transparent rounded-full animate-spin"></div>
                        ) : saveButtonState === 'success' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <>
                                <FiSave className="w-5 h-5" />
                                {hasUnsavedChanges && (
                                    <div className="absolute top-0 right-2 w-2 h-2 rounded-full bg-[#c8aa6e] animate-pulse"></div>
                                )}
                            </>
                        )}
                        <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-tight ${hasUnsavedChanges ? 'text-[#c8aa6e]' : 'text-slate-600'
                            }`}>
                            Guardar
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};

MobileNav.propTypes = {
    activeTab: PropTypes.string.isRequired,
    onTabChange: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    hasUnsavedChanges: PropTypes.bool,
    saveButtonState: PropTypes.oneOf(['idle', 'saving', 'success', 'error'])
};

// Sidebar Desktop (oculto en móvil)
const Sidebar = ({
    activeTab,
    onTabChange,
    characterName,
    characterLevel,
    characterImage,
    onSave,
    hasUnsavedChanges = false,
    saveButtonState = 'idle'
}) => {

    return (
        <div className="hidden md:flex w-20 lg:w-72 xl:w-80 h-full flex-col bg-[#0b1120]/95 border-r border-[#c8aa6e]/20 relative z-30 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.4)] transition-all duration-300">

            {/* Character Header */}
            <div className="p-6 pb-8 flex flex-col items-center border-b border-[#c8aa6e]/10 relative overflow-hidden group">
                {/* Subtle glow behind head */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#c8aa6e] rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"></div>

                <div className="relative mb-4">
                    {/* Animated Level Progress Ring (Visual only) */}
                    <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-[#c8aa6e] to-[#785a28]">
                        <div className="w-full h-full rounded-full bg-[#0b1120] p-1 overflow-hidden">
                            {characterImage ? (
                                <img src={characterImage} alt={characterName} className="w-full h-full object-cover rounded-full opacity-90 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-full">
                                    <FiUser className="w-10 h-10 text-slate-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Level Badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0b1120] border border-[#c8aa6e] rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-10">
                        <span className="text-[#c8aa6e] font-bold text-sm">{characterLevel}</span>
                    </div>
                </div>

                <div className="text-center hidden lg:block">
                    <h2 className="text-xl font-['Cinzel'] font-bold text-[#f0e6d2] uppercase tracking-wider drop-shadow-md">{characterName}</h2>
                    <p className="text-[#c8aa6e] text-[10px] font-bold tracking-[0.2em] uppercase mt-1 opacity-70">Clase de Héroe</p>

                    <div className="flex justify-center gap-1 mt-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className="w-3 h-3 text-[#c8aa6e] fill-[#c8aa6e]" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 flex flex-col gap-1 py-6 px-2 lg:px-4 overflow-y-auto">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`
              relative w-full text-left py-3 px-3 lg:px-4 rounded border transition-all duration-200 group overflow-hidden
              flex items-center justify-center lg:justify-start gap-4
              ${activeTab === item.id
                                ? 'bg-gradient-to-r from-[#c8aa6e]/20 to-transparent border-[#c8aa6e]/40 shadow-[inset_0_0_12px_rgba(200,170,110,0.1)]'
                                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}
            `}
                    >
                        {activeTab === item.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c8aa6e] shadow-[0_0_8px_#c8aa6e]"></div>
                        )}

                        <span className={`transition-colors ${activeTab === item.id ? 'text-[#c8aa6e]' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            {item.icon}
                        </span>

                        <div className="hidden lg:flex flex-col">
                            <span className={`font-['Cinzel'] tracking-widest text-sm font-bold transition-colors ${activeTab === item.id ? 'text-[#f0e6d2]' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                {item.label}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider group-hover:text-slate-500">{item.sub}</span>
                        </div>
                    </button>
                ))}</nav>

            {/* Bottom Action */}
            <div className="p-6 border-t border-[#c8aa6e]/10 bg-[#080c17]">
                <div className="flex flex-col gap-4">
                    {/* Save Button */}
                    {onSave && (
                        <button
                            id="save-btn-sidebar"
                            onClick={hasUnsavedChanges ? onSave : undefined}
                            disabled={!hasUnsavedChanges || saveButtonState === 'saving'}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border rounded transition-all duration-300 font-bold uppercase tracking-wider text-xs mb-2 ${saveButtonState === 'success'
                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                : saveButtonState === 'error'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                    : hasUnsavedChanges
                                        ? 'bg-[#c8aa6e]/10 hover:bg-[#c8aa6e]/20 text-[#c8aa6e] border-[#c8aa6e]/50 hover:shadow-[0_0_15px_rgba(200,170,110,0.2)] cursor-pointer'
                                        : 'bg-slate-800/30 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
                                }`}
                        >
                            {saveButtonState === 'saving' ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-[#c8aa6e] border-t-transparent rounded-full animate-spin"></div>
                                    <span className="hidden lg:inline">Guardando...</span>
                                </>
                            ) : saveButtonState === 'success' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span className="hidden lg:inline">Guardado</span>
                                </>
                            ) : saveButtonState === 'error' ? (
                                <>
                                    <span>❌</span>
                                    <span className="hidden lg:inline">Error</span>
                                </>
                            ) : hasUnsavedChanges ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-[#c8aa6e] animate-pulse"></div>
                                    <span className="hidden lg:inline">Guardar Cambios</span>
                                    <span className="lg:hidden"><FiSave /></span>
                                </>
                            ) : (
                                <span className="hidden lg:inline">Sin cambios</span>
                            )}
                        </button>
                    )}

                    <div className="hidden lg:flex items-center justify-start gap-3 group cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center group-hover:border-[#c8aa6e] group-hover:text-[#c8aa6e] transition-colors">
                            <FiBookOpen className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-[#f0e6d2]">
                            Intercambiar<br />Campeones
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

Sidebar.propTypes = {
    activeTab: PropTypes.string.isRequired,
    onTabChange: PropTypes.func.isRequired,
    characterName: PropTypes.string,
    characterLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    characterImage: PropTypes.string,
    onSave: PropTypes.func,
    hasUnsavedChanges: PropTypes.bool,
    saveButtonState: PropTypes.oneOf(['idle', 'saving', 'success', 'error'])
};

export default Sidebar;
