import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Target, RotateCcw, Menu, Zap, Clock, History, ChevronDown, Play } from 'lucide-react';

const BarraReflejos = ({ playerName, onBack }) => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'result'
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [circlePosition, setCirclePosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [targetPosition, setTargetPosition] = useState(50);
  const [targetWidth, setTargetWidth] = useState(12);

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const animationRef = useRef();
  const gameAreaRef = useRef();

  // Configuración de dificultades
  const difficulties = {
    EASY: {
      initialWidth: 22,
      minWidth: 11,
      shrinkRate: 1.5,
      speed: 2.0,
      label: 'Fácil',
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-emerald-600/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-400/50'
    },
    MEDIUM: {
      initialWidth: 12,
      minWidth: 6,
      shrinkRate: 1.5,
      speed: 2.0,
      label: 'Medio',
      color: 'amber',
      gradient: 'from-amber-500/20 to-amber-600/20',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-400/50'
    },
    HARD: {
      initialWidth: 6,
      minWidth: 3,
      shrinkRate: 1.5,
      speed: 2.0,
      label: 'Difícil',
      color: 'red',
      gradient: 'from-red-500/20 to-red-600/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      activeBg: 'bg-red-500/20',
      activeBorder: 'border-red-400/50'
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
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('reflexHistory', JSON.stringify(updatedHistory));
  };

  // Estados para el sistema de reducción
  const [gameStartTime, setGameStartTime] = useState(0);
  const [lastShrinkTime, setLastShrinkTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(2.0);

  // Iniciar juego
  const startGame = () => {
    const config = difficulties[difficulty];
    const baseSpeed = config.speed;
    const variationRange = 0.2;
    const randomVariation = 0.9 + (Math.random() * variationRange);
    const randomizedSpeed = baseSpeed * randomVariation;
    const initialPosition = Math.random() * 20;
    const initialDirection = Math.random() < 0.5 ? 1 : -1;

    setTargetPosition(Math.random() * 80 + 10);
    setTargetWidth(config.initialWidth);
    setCirclePosition(initialPosition);
    setDirection(initialDirection);
    setCurrentSpeed(randomizedSpeed);

    const now = Date.now();
    setGameStartTime(now);
    setLastShrinkTime(now);
    setGameState('playing');
    setResult(null);
  };

  // Animación del círculo
  const animate = useCallback(() => {
    if (gameState !== 'playing') return;

    const config = difficulties[difficulty];
    const now = Date.now();

    setCirclePosition(prev => {
      let newPos = prev + direction * currentSpeed;
      if (newPos >= 100) {
        newPos = 100;
        setDirection(-1);
      } else if (newPos <= 0) {
        newPos = 0;
        setDirection(1);
      }
      return newPos;
    });

    if (now - lastShrinkTime >= 2000) {
      setTargetWidth(prev => {
        const newWidth = prev - config.shrinkRate;
        return Math.max(newWidth, config.minWidth);
      });
      setLastShrinkTime(now);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [gameState, difficulty, direction, difficulties, lastShrinkTime, currentSpeed]);

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
      duration: ((Date.now() - gameStartTime) / 1000).toFixed(1),
      speed: currentSpeed.toFixed(2),
      speedVariation: ((currentSpeed / 2.0 - 1) * 100).toFixed(1)
    };

    setResult(gameResult);
    setGameState('result');
    saveHistory(gameResult);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const backToMenu = () => {
    setGameState('menu');
    setResult(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col px-4 py-6 relative overflow-hidden font-['Lato']">
      {/* Fondo de polvo/stardust */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-[#0b1120] to-[#0b1120]"></div>
      </div>

      <div className="max-w-2xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="flex flex-col mb-8">
          <div className="flex items-start justify-between w-full">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#c8aa6e]/30 bg-[#0b1120]/50 text-[#c8aa6e]/70 font-medium text-sm hover:bg-[#c8aa6e]/10 hover:text-[#c8aa6e] hover:border-[#c8aa6e]/60 active:scale-[0.98] transition-all duration-300 w-fit font-['Cinzel'] uppercase tracking-[0.15em]"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="flex flex-col gap-2 text-center flex-1">
              <div className="inline-flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                <span className="opacity-70">ARCANA VAULT</span>
                <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                <span>REFLEJOS</span>
              </div>
              <h1 className="font-['Cinzel'] text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)]">
                Cerrajería
              </h1>
              <p className="text-gray-400 text-sm flex items-center justify-center gap-2 mt-1">
                Jugador: <span className="text-[#c8aa6e] font-medium">{playerName}</span>
              </p>
            </div>
            <div className="w-[88px]"></div>
          </div>
        </div>

        {/* Menú principal */}
        {gameState === 'menu' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Selector de dificultad */}
            <div
              className="rounded-2xl border border-amber-500/20 p-6"
              style={{
                background: 'rgba(11, 17, 32, 0.88)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 50px rgba(251, 191, 36, 0.05)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

              <h3 className="text-lg font-semibold text-[#f0e6d2] font-['Cinzel'] mb-4 text-center flex items-center justify-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Seleccionar Dificultad
              </h3>

              <div className="space-y-3">
                {Object.entries(difficulties).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`w-full py-4 px-5 rounded-xl border transition-all duration-300 text-left ${difficulty === key
                      ? `${config.activeBg} ${config.activeBorder} ${config.text}`
                      : 'border-gray-700/50 bg-gray-800/30 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{config.label}</span>
                      <span className="text-sm opacity-70">Diana: {config.initialWidth}% → {config.minWidth}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instrucciones */}
            <div
              className="rounded-2xl border border-gray-700/30 p-6"
              style={{
                background: 'rgba(11, 17, 32, 0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h3 className="text-lg font-semibold text-[#f0e6d2] font-['Cinzel'] mb-3 text-center">Cómo Jugar</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p className="flex items-center gap-2"><span className="text-amber-400">•</span> Toca la pantalla cuando el círculo esté en la zona diana</p>
                <p className="flex items-center gap-2"><span className="text-amber-400">•</span> La diana se reduce gradualmente cada 2 segundos</p>
                <p className="flex items-center gap-2"><span className="text-amber-400">•</span> Cuanto más difícil, más pequeña la diana inicial</p>
              </div>
            </div>

            {/* Botón iniciar */}
            <button
              onClick={startGame}
              className="group relative w-full py-5 rounded-xl border border-amber-500/30 bg-amber-900/20 text-amber-100 font-semibold text-lg tracking-wide shadow-lg hover:bg-amber-800/30 hover:border-amber-400/50 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Iniciar Juego
              </div>
            </button>
          </div>
        )}

        {/* Área de juego */}
        {gameState === 'playing' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Info del juego */}
            <div
              className="rounded-2xl border border-amber-500/20 p-4"
              style={{
                background: 'rgba(11, 17, 32, 0.88)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dificultad</p>
                  <p className={`font-semibold ${difficulties[difficulty].text}`}>{difficulties[difficulty].label}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Diana</p>
                  <p className="text-[#f0e6d2] font-semibold">{targetWidth.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Velocidad</p>
                  <p className="text-amber-400 font-semibold">{currentSpeed.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Área de juego */}
            <div
              ref={gameAreaRef}
              onClick={handleGameAreaClick}
              className="rounded-2xl border border-amber-500/30 p-8 cursor-pointer select-none transition-all duration-200 hover:border-amber-400/50 active:scale-[0.99]"
              style={{
                minHeight: '220px',
                background: 'rgba(11, 17, 32, 0.9)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 60px rgba(251, 191, 36, 0.08)',
              }}
            >
              <div className="text-center mb-6">
                <p className="text-[#f0e6d2] font-semibold text-lg">¡Toca cuando el círculo esté en la diana!</p>
              </div>

              {/* Barra de juego */}
              <div className="relative w-full h-3 bg-gray-800 rounded-full mb-8 overflow-visible">
                {/* Diana */}
                <div
                  className="absolute h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    left: `${targetPosition - targetWidth / 2}%`,
                    width: `${targetWidth}%`,
                    background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.4), rgba(251, 191, 36, 0.7), rgba(251, 191, 36, 0.4))',
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.8)'
                  }}
                />

                {/* Círculo */}
                <div
                  className="absolute w-5 h-5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-lg"
                  style={{
                    left: `${circlePosition}%`,
                    top: '50%',
                    transform: 'translateX(-50%) translateY(-50%)',
                    boxShadow: '0 0 15px rgba(34, 211, 238, 0.8), 0 0 30px rgba(34, 211, 238, 0.4)',
                    transition: 'none'
                  }}
                />
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-sm">Toca en cualquier lugar para marcar</p>
              </div>
            </div>

            {/* Botón cancelar */}
            <button
              onClick={backToMenu}
              className="w-full py-3 rounded-xl border border-red-500/30 bg-red-900/20 text-red-300 font-medium text-sm tracking-wide hover:bg-red-800/30 hover:border-red-400/50 active:scale-[0.98] transition-all duration-300"
            >
              Cancelar Juego
            </button>
          </div>
        )}

        {/* Resultado */}
        {gameState === 'result' && result && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div
              className={`rounded-2xl p-8 border ${result.success
                ? 'border-emerald-500/40'
                : 'border-red-500/40'
                }`}
              style={{
                background: result.success
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: result.success
                  ? '0 0 60px rgba(16, 185, 129, 0.15)'
                  : '0 0 60px rgba(239, 68, 68, 0.15)',
              }}
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${result.success
                  ? 'bg-emerald-500/20 border-2 border-emerald-400/50'
                  : 'bg-red-500/20 border-2 border-red-400/50'
                  }`}>
                  <Target className={`w-10 h-10 ${result.success ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <h3 className={`text-3xl font-bold font-['Cinzel'] ${result.success ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                  {result.success ? '¡ACIERTO!' : 'FALLO'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-900/40 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dificultad</p>
                  <p className="text-[#f0e6d2] font-semibold">{result.difficulty}</p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duración</p>
                  <p className="text-[#f0e6d2] font-semibold">{result.duration}s</p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tamaño Diana</p>
                  <p className="text-amber-400 font-semibold">{result.targetWidth}%</p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Velocidad</p>
                  <p className="text-cyan-400 font-semibold">{result.speed}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startGame}
                className="py-4 rounded-xl border border-amber-500/30 bg-amber-900/20 text-amber-100 font-semibold tracking-wide hover:bg-amber-800/30 hover:border-amber-400/50 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Jugar de Nuevo
              </button>
              <button
                onClick={backToMenu}
                className="py-4 rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-300 font-semibold tracking-wide hover:bg-gray-700/50 hover:text-gray-200 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Menu className="w-4 h-4" />
                Menú
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        {history.length > 0 && gameState === 'menu' && (
          <div
            className="mt-6 rounded-2xl border border-gray-700/30 p-6"
            style={{
              background: 'rgba(11, 17, 32, 0.7)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <h3 className="text-lg font-semibold text-[#f0e6d2] font-['Cinzel'] mb-4 text-center flex items-center justify-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Historial
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {history.slice(0, 10).map((entry, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-4 border ${entry.success
                    ? 'border-emerald-500/20 bg-emerald-900/10'
                    : 'border-red-500/20 bg-red-900/10'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#f0e6d2] font-medium">{entry.player}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${entry.success
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                          }`}>
                          {entry.success ? 'ACIERTO' : 'FALLO'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {entry.difficulty} • {entry.duration}s
                        {entry.speed && (
                          <span className="text-cyan-400 ml-2">
                            Vel: {entry.speed}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-gray-600 text-xs">{entry.timestamp}</p>
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
