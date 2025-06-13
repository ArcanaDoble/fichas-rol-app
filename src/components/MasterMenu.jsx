import React, { useState, useEffect } from 'react';
import Boton from './Boton';

const MasterMenu = ({ onSelect }) => {
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
      id: 're4',
      icon: '🎒',
      title: 'Inventario RE4',
      description: 'Sistema avanzado con grid 10×8, drag & drop y rotación',
      color: 'green',
      features: ['Grid 10×8', 'Drag & Drop', 'Rotación', 'Persistencia'],
      isNew: true,
    },
    {
      id: 'default',
      icon: '📋',
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
        {/* Header mejorado */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="text-6xl mb-4 animate-bounce">🎮</div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
          </div>
          <h2 className="text-3xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Modo Máster
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Selecciona las herramientas que necesitas para gestionar tu campaña
          </p>
        </div>

        {/* Opciones mejoradas */}
        <div className="grid gap-6">
          {menuOptions.map((option, index) => (
            <div
              key={option.id}
              className={`
                relative group cursor-pointer
                transition-all duration-300 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={`
                absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20
                transition-opacity duration-300 rounded-xl blur-sm
                ${option.color === 'green' ? 'from-green-500 to-emerald-500' : 'from-purple-500 to-pink-500'}
              `} />

              <Boton
                color={option.color}
                className={`
                  relative w-full h-auto p-6 text-left
                  transform group-hover:scale-[1.02] transition-all duration-300
                  ${selectedOption === option.id ? 'ring-2 ring-white/50' : ''}
                `}
                onClick={() => handleSelect(option.id)}
                loading={isLoading && selectedOption === option.id}
                disabled={isLoading}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                    {option.icon}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-lg">{option.title}</div>
                      {option.isNew && (
                        <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded-full font-bold animate-pulse">
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

                  <div className="text-white/50 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Boton>
            </div>
          ))}
        </div>

        {/* Footer mejorado */}
        <div className="text-center space-y-2 border-t border-gray-700 pt-6">
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <span className="text-lg">⚔️</span>
            <p className="text-sm font-medium">Fichas de Rol • Versión 2.1</p>
            <span className="text-lg">🛡️</span>
          </div>
          <p className="text-xs text-gray-500">
            Sistema mejorado con inventario RE4 y herramientas avanzadas
          </p>

          {/* Indicador de estado */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Sistema operativo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterMenu;
