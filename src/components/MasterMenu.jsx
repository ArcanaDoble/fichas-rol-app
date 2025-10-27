import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';

const MasterMenu = ({ onSelect, onBackToMain }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Animación de entrada
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSelect = async (option) => {
    setSelectedOption(option);
    setIsLoading(true);

    // Pequeña pausa para mostrar el feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));

    onSelect(option);
    setIsLoading(false);
  };

  const menuOptions = [
    {
      id: 'initiative',
      title: 'Sistema de Velocidad',
      description: 'Control total del combate con iniciativa y gestión de participantes',
      color: 'blue',
      features: ['Control Master', 'Enemigos', 'Velocidad', 'Tiempo Real'],
      isNew: false,
    },
    {
      id: 'enemies',
      title: 'Fichas de Enemigos',
      description: 'Crear y gestionar fichas de enemigos con retratos',
      color: 'red',
      features: ['Fichas NPCs', 'Retratos', 'Estadísticas', 'Gestión'],
      isNew: false,
    },
    {
      id: 'canvas',
      title: 'Mapa de Batalla',
      description: 'Tablero virtual sencillo con grid y tokens',
      color: 'indigo',
      features: ['Mapa', 'Tokens', 'Grid'],
      isNew: false,
    },
    {
      id: 'minimap',
      title: 'Minimapa',
      description: 'Constructor de minimapas con vista PC y Movil',
      color: 'green',
      features: ['Constructor', 'PC', 'Movil', 'Iconos'],
      isNew: true,
    },
    {
      id: 'routeMapLite',
      title: 'Mapa de Rutas (Lite)',
      description: 'Versión sin Pixi basada en SVG para ediciones rápidas y dispositivos modestos',
      color: 'cyan',
      features: ['Sin Pixi', 'SVG', 'Pan & Zoom', 'Sincronizado'],
      isNew: true,
    },
    {
      id: 'default',
      title: 'Herramientas Tradicionales',
      description: 'Gestión de catálogo, habilidades y glosario',
      color: 'purple',
      features: ['Catálogo', 'Habilidades', 'Glosario', 'Búsqueda'],
      isNew: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Partículas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-500/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className={`
        w-full max-w-2xl bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl
        border border-gray-700 p-8 space-y-8 relative
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        {/* Header minimalista */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">
            Modo Máster
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Selecciona las herramientas que necesitas para gestionar tu campaña
          </p>
          <div className="w-16 h-px bg-gray-600 mx-auto"></div>
        </div>

        {/* Opciones minimalistas */}
        <div className="grid gap-6">
          {menuOptions.map((option, index) => (
            <div
              key={option.id}
              className={`
                relative cursor-pointer
                transition-all duration-300 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Boton
                color={option.color}
                className={`
                  w-full h-auto p-6 text-left
                  hover:scale-[1.02] transition-all duration-300
                  ${selectedOption === option.id ? 'ring-2 ring-white/50' : ''}
                `}
                onClick={() => handleSelect(option.id)}
                loading={isLoading && selectedOption === option.id}
                disabled={isLoading}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-lg">{option.title}</div>
                      {option.isNew && (
                        <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded-full font-bold">
                          NUEVO
                        </span>
                      )}
                    </div>

                    <div className="text-sm opacity-90 leading-relaxed">
                      {option.description}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {option.features.map((feature, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-white/10 rounded-full border border-white/20"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-white/50 ml-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Boton>
            </div>
          ))}
        </div>

        {/* Footer con botón de volver */}
        <div className="text-center space-y-4 border-t border-gray-700 pt-6">
          <Boton
            color="gray"
            className="py-3 px-6 rounded-lg font-semibold text-base tracking-wide shadow hover:scale-105 transition-all duration-300"
            onClick={onBackToMain}
          >
            ← Volver al menú principal
          </Boton>
          <p className="text-sm font-medium text-gray-400">Fichas de Rol • Versión 2.1</p>
        </div>
      </div>
    </div>
  );
};

MasterMenu.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default MasterMenu;
