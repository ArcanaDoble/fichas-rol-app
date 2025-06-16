import React, { useState, useEffect, useRef, useCallback } from 'react';
import Boton from './Boton';

const BarraReflejos = ({ playerName, onBack }) => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'result'
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [circlePosition, setCirclePosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [targetPosition, setTargetPosition] = useState(50);
  const [targetWidth, setTargetWidth] = useState(12);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  
  const animationRef = useRef();
  const gameAreaRef = useRef();

  // Configuración de dificultades
  const difficulties = {
    EASY: {
      initialWidth: 22,
      minWidth: 10,
      shrinkRate: 2,
      speed: 2.0,
      label: 'Fácil',
      color: 'bg-green-400',
      lightColor: 'bg-green-100 text-green-800'
    },
    MEDIUM: {
      initialWidth: 12,
      minWidth: 6,
      shrinkRate: 1.5,
      speed: 3.0,
      label: 'Medio',
      color: 'bg-yellow-400',
      lightColor: 'bg-yellow-100 text-yellow-800'
    },
    HARD: {
      initialWidth: 6,
      minWidth: 2,
      shrinkRate: 1,
      speed: 4.5,
      label: 'Difícil',
      color: 'bg-red-400',
      lightColor: 'bg-red-100 text-red-800'
    }
  };

  // Cargar historial del localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('reflexHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Guardar historial en localStorage
  const saveHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Máximo 50 entradas
    setHistory(updatedHistory);
    localStorage.setItem('reflexHistory', JSON.stringify(updatedHistory));
  };

  // Iniciar juego
  const startGame = () => {
    const config = difficulties[difficulty];
    setTargetPosition(Math.random() * 80 + 10); // Entre 10% y 90%
    setTargetWidth(config.initialWidth);
    setCirclePosition(0);
    setDirection(1);
    setGameStartTime(Date.now());
    setGameState('playing');
    setResult(null);
  };

  // Animación del círculo a 60fps
  const animate = useCallback(() => {
    if (gameState !== 'playing') return;

    const config = difficulties[difficulty];

    setCirclePosition(prev => {
      let newPos = prev + direction * config.speed; // Velocidad normal para 60fps fluidos

      // Rebote en los bordes
      if (newPos >= 100) {
        newPos = 100;
        setDirection(-1);
      } else if (newPos <= 0) {
        newPos = 0;
        setDirection(1);
      }

      return newPos;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [gameState, difficulty, direction, difficulties]);

  // Reducir tamaño de la diana cada segundo
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      const config = difficulties[difficulty];
      setTargetWidth(prev => {
        const newWidth = prev - config.shrinkRate;
        return Math.max(newWidth, config.minWidth);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, difficulty, difficulties]);

  // Iniciar animación
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, animate]);

  // Manejar click/tap
  const handleGameAreaClick = () => {
    if (gameState !== 'playing') return;

    const targetStart = targetPosition - targetWidth / 2;
    const targetEnd = targetPosition + targetWidth / 2;
    const isHit = circlePosition >= targetStart && circlePosition <= targetEnd;

    const gameResult = {
      player: playerName,
      difficulty: difficulties[difficulty].label,
      success: isHit,
      targetWidth: targetWidth.toFixed(1),
      circlePosition: circlePosition.toFixed(1),
      targetPosition: targetPosition.toFixed(1),
      timestamp: new Date().toLocaleString(),
      duration: ((Date.now() - gameStartTime) / 1000).toFixed(1)
    };

    setResult(gameResult);
    setGameState('result');
    saveHistory(gameResult);

    // Limpiar animación
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Volver al menú
  const backToMenu = () => {
    setGameState('menu');
    setResult(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Boton onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg">
            ← Volver
          </Boton>
          <h1 className="text-xl font-bold text-white text-center flex-1">
            🔒 Minijuego Cerrajería
          </h1>
          <div className="w-16"></div> {/* Spacer para centrar el título */}
        </div>
        
        <div className="text-center mb-6">
          <p className="text-gray-300 text-sm">Jugador: {playerName}</p>
        </div>

        {/* Menú principal */}
        {gameState === 'menu' && (
          <div className="space-y-6">
            {/* Selector de dificultad */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">Seleccionar Dificultad</h3>
              <div className="space-y-3">
                {Object.entries(difficulties).map(([key, config]) => (
                  <Boton
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`w-full py-3 text-lg ${
                      difficulty === key
                        ? `${config.color} text-white`
                        : `${config.lightColor} hover:${config.color} hover:text-white transition-colors`
                    }`}
                  >
                    {config.label} - Diana: {config.initialWidth}% → {config.minWidth}%
                  </Boton>
                ))}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">Cómo Jugar</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>• Toca la pantalla cuando el círculo esté en la zona diana</p>
                <p>• La diana se reduce cada segundo que pases</p>
                <p>• Cuanto más difícil, más pequeña la diana y más rápida la bola</p>
              </div>
            </div>

            {/* Botón iniciar */}
            <Boton 
              onClick={startGame}
              className="w-full py-4 text-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              🎯 Iniciar Juego
            </Boton>
          </div>
        )}

        {/* Área de juego */}
        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Info del juego */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <p className="text-white font-semibold">Dificultad: {difficulties[difficulty].label}</p>
              <p className="text-gray-300 text-sm">Diana: {targetWidth.toFixed(1)}%</p>
            </div>

            {/* Área de juego */}
            <div 
              ref={gameAreaRef}
              onClick={handleGameAreaClick}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 cursor-pointer select-none"
              style={{ minHeight: '200px' }}
            >
              <div className="text-center mb-4">
                <p className="text-white font-semibold">¡Toca cuando el círculo esté en la diana!</p>
              </div>

              {/* Barra de juego */}
              <div className="relative w-full h-2 bg-gray-600 rounded-full mb-8">
                {/* Diana */}
                <div
                  className="absolute h-full bg-yellow-400 rounded-full opacity-70"
                  style={{
                    left: `${targetPosition - targetWidth / 2}%`,
                    width: `${targetWidth}%`
                  }}
                />
                
                {/* Círculo */}
                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-y-0.5"
                  style={{
                    left: `${circlePosition}%`,
                    transform: 'translateX(-50%) translateY(-25%)',
                    transition: 'none' // Sin transición para animación más fluida
                  }}
                />
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">Toca en cualquier lugar para marcar</p>
              </div>
            </div>

            {/* Botón cancelar */}
            <Boton 
              onClick={backToMenu}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white"
            >
              Cancelar Juego
            </Boton>
          </div>
        )}

        {/* Resultado */}
        {gameState === 'result' && result && (
          <div className="space-y-6">
            <div className={`rounded-lg p-6 border ${
              result.success 
                ? 'bg-green-900/20 border-green-500/50' 
                : 'bg-red-900/20 border-red-500/50'
            }`}>
              <h3 className={`text-2xl font-bold text-center mb-4 ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.success ? '🎯 ¡ACIERTO!' : '❌ FALLO'}
              </h3>
              
              <div className="space-y-2 text-center">
                <p className="text-white">
                  <span className="font-medium">Dificultad:</span> {result.difficulty}
                </p>
                <p className="text-white">
                  <span className="font-medium">Duración:</span> {result.duration}s
                </p>
                <p className="text-white">
                  <span className="font-medium">Tamaño diana:</span> {result.targetWidth}%
                </p>
                <p className="text-gray-300 text-sm">
                  Círculo en {result.circlePosition}% | Diana en {result.targetPosition}%
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Boton 
                onClick={startGame}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white"
              >
                🔄 Jugar de Nuevo
              </Boton>
              <Boton 
                onClick={backToMenu}
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white"
              >
                📋 Menú
              </Boton>
            </div>
          </div>
        )}

        {/* Historial */}
        {history.length > 0 && gameState === 'menu' && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 text-center">📜 Historial</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.slice(0, 10).map((entry, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium">{entry.player}</p>
                      <p className="text-gray-300">
                        {entry.difficulty} - {entry.duration}s
                      </p>
                      <p className={`font-bold ${
                        entry.success ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.success ? '🎯 ACIERTO' : '❌ FALLO'}
                      </p>
                    </div>
                    <p className="text-gray-500 text-xs">{entry.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarraReflejos;
