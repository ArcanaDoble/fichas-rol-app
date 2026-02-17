
import React from 'react';

/**
 * Renderiza HUD de recursos con JERARQUÍA SIMPLIFICADA.
 * 
 * Reglas de Visibilidad:
 * 1. SIEMPRE VISIBLES: Vida (Rojo) y Postura (Verde).
 * 2. SOLO EN TOKENS GRANDES (>= 60px): Armadura (Gris).
 * 
 * Ingenio y Cordura NO se muestran en el token (solo en Inspector).
 */
const TokenHUD = ({ stats, velocidad = 0, width, height }) => {
    if (!stats) return null;

    // Umbrales de tamaño
    // Consideramos "grande" algo mayor que una celda estándar (50px)
    const showArmor = width >= 60;
    const isSmall = width < 60;

    // Configuración visual
    const dotSize = isSmall ? 3 : 4;
    const gap = isSmall ? 1 : 2;

    // Helper: Renderizado de PIPS
    const renderPips = (resourceKey, color, orientation = 'horizontal', justify = 'center') => {
        const resource = stats[resourceKey];
        if (!resource || !resource.max || resource.max <= 0) return null;

        const effectiveGap = gap;

        return (
            <div
                className={`flex ${orientation === 'vertical' ? 'flex-col' : ''} pointer-events-none z-10 p-[2px] bg-black/40 backdrop-blur-[1px] rounded transition-all`}
                style={{
                    gap: `${effectiveGap}px`,
                    justifyContent: justify,
                    width: orientation === 'horizontal' ? 'fit-content' : undefined,
                    boxSizing: 'border-box'
                }}
            >
                {Array.from({ length: resource.max }).map((_, i) => {
                    const isActive = i < resource.current;
                    return (
                        <div
                            key={i}
                            className="rounded-full flex-shrink-0"
                            style={{
                                width: `${dotSize}px`,
                                height: `${dotSize}px`,
                                minWidth: `${dotSize}px`,
                                minHeight: `${dotSize}px`,
                                backgroundColor: isActive ? color : 'rgba(30, 41, 59, 0.5)',
                                border: isActive ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.15)',
                                boxShadow: isActive ? `0 0 ${isSmall ? 2 : 3}px ${color}` : 'none',
                                opacity: isActive ? 1 : 0.7,
                                margin: 0,
                                transform: 'none'
                            }}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none rounded-sm">

            {/* --- ZONA SUPERIOR CENTRAL --- */}
            <div className="absolute top-1 left-0 w-full flex flex-col items-center gap-[2px] z-20 pointer-events-none">
                {/* 1. ARMADURA (Gray) - Solo si >= 60px */}
                {showArmor && renderPips('armadura', '#94a3b8', 'horizontal', 'center')}

                {/* 2. VIDA (Red) - SIEMPRE VISIBLE */}
                {renderPips('vida', '#ef4444', 'horizontal', 'center')}
            </div>


            {/* --- ZONA INFERIOR CENTRAL --- */}

            {/* POSTURA (Green) - SIEMPRE VISIBLE */}
            <div className="absolute bottom-1 left-0 w-full flex justify-center z-20 pointer-events-none">
                {renderPips('postura', '#10b981', 'horizontal', 'center')}
            </div>

        </div>
    );
};

export default TokenHUD;
