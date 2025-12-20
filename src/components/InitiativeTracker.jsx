import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Boton from './Boton';
import Input from './Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { getGlossaryTooltipId, escapeGlossaryWord } from '../utils/glossary';
import { ArrowLeft, Plus, Minus, Trash2, RotateCcw, Users, Swords, Search, Info, Zap, Crown, User } from 'lucide-react';
import { EnemyDetailView } from './EnemyDetailView';

// Detectar dispositivo táctil
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const baseColors = [
  '#3B82F6', // Azul
  // '#EF4444', // Rojo (RESERVADO PARA ENEMIGOS)
  '#10B981', // Verde
  '#F59E0B', // Amarillo
  '#8B5CF6', // Púrpura
  '#F97316', // Naranja
  '#06B6D4', // Cian
  '#EC4899', // Rosa
];

const ENEMY_COLOR = '#EF4444'; // Color rojo reservado para enemigos

// Función para generar colores aleatorios que no sean similares
const generateRandomColor = (existingColors) => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
  const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%

  const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Verificar que no sea demasiado similar a colores existentes
  const isTooSimilar = existingColors.some(existingColor => {
    const distance = getColorDistance(newColor, existingColor);
    return distance < 30; // Umbral de similitud
  });

  if (isTooSimilar) {
    return generateRandomColor(existingColors); // Recursión para generar otro color
  }

  return newColor;
};

// Función para calcular distancia entre colores
const getColorDistance = (color1, color2) => {
  // Convertir a RGB para comparación
  const rgb1 = hexToRgb(color1.startsWith('#') ? color1 : hslToHex(color1));
  const rgb2 = hexToRgb(color2.startsWith('#') ? color2 : hslToHex(color2));

  if (!rgb1 || !rgb2) return 0;

  const r1 = rgb1.r, g1 = rgb1.g, b1 = rgb1.b;
  const r2 = rgb2.r, g2 = rgb2.g, b2 = rgb2.b;

  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
};

// Función auxiliar para convertir HSL a HEX
const hslToHex = (hsl) => {
  const [h, s, l] = hsl.match(/\d+/g).map(Number);
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lDecimal - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

// Función auxiliar para convertir HEX a RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const InitiativeTracker = ({ playerName, isMaster, enemies = [], glossary = [], playerEquipment = null, armas = [], armaduras = [], habilidades = [], onBack }) => {
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({ name: '', speed: 0, type: 'player' });
  const [loading, setLoading] = useState(true);
  const [currentPlayerSpeed, setCurrentPlayerSpeed] = useState(0);
  const [currentCharacterName, setCurrentCharacterName] = useState('');
  const [playerColorMap, setPlayerColorMap] = useState({});
  const [previewEnemy, setPreviewEnemy] = useState(null);
  const [editingEnemy, setEditingEnemy] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [enemyModifications, setEnemyModifications] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [enemySearchTerm, setEnemySearchTerm] = useState('');

  // Debug: Verificar que el glosario se recibe correctamente
  useEffect(() => {
    // El glosario se recibe correctamente desde App.js
  }, [glossary]);

  // Referencia al documento de velocidad en Firestore
  const initiativeRef = React.useMemo(() => doc(db, 'initiative', 'current'), []);

  // Cargar modificaciones guardadas al iniciar
  useEffect(() => {
    const savedModifications = localStorage.getItem('enemyModifications');
    if (savedModifications) {
      try {
        setEnemyModifications(JSON.parse(savedModifications));
      } catch (error) {
        // Error al cargar modificaciones: error
      }
    }
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(initiativeRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setParticipants(data.participants || []);
      } else {
        // Si no existe, crear el documento inicial
        setDoc(initiativeRef, { participants: [] });
      }
      setLoading(false);
    }, (error) => {
      // Error al cargar velocidad: error
      setLoading(false);
    });

    return () => unsubscribe();
  }, [initiativeRef]);

  // Actualizar mapa de colores cuando cambian los participantes
  useEffect(() => {
    const playerNames = [...new Set(participants.map(p => p.addedBy))];
    const newColorMap = {};

    playerNames.forEach((playerName, index) => {
      if (index < baseColors.length) {
        newColorMap[playerName] = baseColors[index];
      } else {
        // Generar color aleatorio para jugadores adicionales
        const existingColors = Object.values(newColorMap);
        newColorMap[playerName] = generateRandomColor(existingColors);
      }
    });

    setPlayerColorMap(newColorMap);
  }, [participants]);

  // Obtener color para un jugador
  const getPlayerColor = (playerName) => {
    return playerColorMap[playerName] || '#6B7280';
  };

  // Función para iniciar edición
  const startEditing = () => {
    setEditingEnemy({ ...previewEnemy });
    setIsEditing(true);
  };

  // Función para cancelar edición
  const cancelEditing = () => {
    setEditingEnemy(null);
    setIsEditing(false);
  };

  // Función para guardar cambios
  const saveChanges = () => {
    if (editingEnemy && previewEnemy) {
      // Guardar modificaciones en localStorage
      const modifications = {
        nivel: editingEnemy.nivel,
        experiencia: editingEnemy.experiencia,
        description: editingEnemy.description,
        notas: editingEnemy.notas,
        stats: editingEnemy.stats
      };
      saveModifications(previewEnemy.id, modifications);

      setPreviewEnemy(editingEnemy);
    }
    setIsEditing(false);
    setEditingEnemy(null);
  };

  // Función para actualizar estadísticas
  const updateStat = (statName, field, value) => {
    if (!editingEnemy) return;

    const newValue = parseInt(value) || 0;
    const updatedEnemy = { ...editingEnemy };

    if (!updatedEnemy.stats) updatedEnemy.stats = {};
    if (!updatedEnemy.stats[statName]) updatedEnemy.stats[statName] = { base: 0, total: 0, actual: 0, buff: 0 };

    if (field === 'actual') {
      updatedEnemy.stats[statName].actual = Math.max(0, Math.min(newValue, updatedEnemy.stats[statName].total));
    } else if (field === 'total') {
      updatedEnemy.stats[statName].total = Math.max(0, newValue);
      if (updatedEnemy.stats[statName].actual > newValue) {
        updatedEnemy.stats[statName].actual = newValue;
      }
    }

    setEditingEnemy(updatedEnemy);

    // Guardar modificaciones inmediatamente en localStorage
    if (previewEnemy) {
      const modifications = {
        nivel: updatedEnemy.nivel,
        experiencia: updatedEnemy.experiencia,
        description: updatedEnemy.description,
        notas: updatedEnemy.notas,
        stats: updatedEnemy.stats
      };
      saveModifications(previewEnemy.id, modifications);
    }
  };

  // Agregar personaje del jugador actual
  const addCurrentPlayerCharacter = async () => {
    if (!currentCharacterName.trim()) return;

    const participant = {
      id: Date.now().toString(),
      name: currentCharacterName.trim(),
      speed: parseInt(currentPlayerSpeed) || 0,
      type: 'player',
      addedBy: playerName
    };

    const updatedParticipants = [...participants, participant];
    await updateDoc(initiativeRef, { participants: updatedParticipants });

    setCurrentCharacterName('');
    setCurrentPlayerSpeed(0);
  };

  // Agregar nuevo participante (solo master)
  const addParticipant = async () => {
    if (!newParticipant.name.trim()) return;

    const participant = {
      id: Date.now().toString(),
      name: newParticipant.name.trim(),
      speed: parseInt(newParticipant.speed) || 0,
      type: newParticipant.type,
      addedBy: playerName
    };

    const updatedParticipants = [...participants, participant];
    await updateDoc(initiativeRef, { participants: updatedParticipants });

    setNewParticipant({ name: '', speed: 0, type: 'player' });
  };

  // Actualizar velocidad de un participante
  const updateSpeed = async (id, newSpeed) => {
    const updatedParticipants = participants.map(p =>
      p.id === id ? { ...p, speed: Math.max(0, parseInt(newSpeed) || 0) } : p
    );
    await updateDoc(initiativeRef, { participants: updatedParticipants });
  };

  // Eliminar participante
  const removeParticipant = async (id) => {
    const updatedParticipants = participants.filter(p => p.id !== id);
    await updateDoc(initiativeRef, { participants: updatedParticipants });
  };

  // Resetear todas las velocidades a 0
  const resetAllSpeeds = async () => {
    const updatedParticipants = participants.map(p => ({ ...p, speed: 0 }));
    await updateDoc(initiativeRef, { participants: updatedParticipants });
  };

  // Ordenar participantes por velocidad (menor primero)
  const sortedParticipants = [...participants].sort((a, b) => a.speed - b.speed);

  // Obtener el siguiente en actuar
  const nextToAct = sortedParticipants[0];

  // Obtener participantes que actúan simultáneamente
  const simultaneousActors = sortedParticipants.filter(p => p.speed === nextToAct?.speed);

  // Función para guardar modificaciones en localStorage
  const saveModifications = (enemyId, modifications) => {
    const updatedModifications = {
      ...enemyModifications,
      [enemyId]: {
        ...enemyModifications[enemyId],
        ...modifications,
        lastModified: new Date().toISOString()
      }
    };
    setEnemyModifications(updatedModifications);
    localStorage.setItem('enemyModifications', JSON.stringify(updatedModifications));
  };

  // Función para obtener enemigo con modificaciones aplicadas
  const getModifiedEnemy = (enemy) => {
    const modifications = enemyModifications[enemy.id];
    if (!modifications) return enemy;

    return {
      ...enemy,
      ...modifications,
      stats: {
        ...enemy.stats,
        ...(modifications.stats || {})
      }
    };
  };

  // Función para usar equipamiento y aumentar velocidad
  const handleUseEquipment = async (equipmentName, equipmentType, speedIncrease) => {
    // Buscar el participante del jugador actual
    const playerParticipant = participants.find(p => p.addedBy === playerName);
    if (!playerParticipant) {
      // Alerta: Primero debes agregar tu personaje a la línea de sucesos
      return;
    }

    // Aumentar la velocidad del participante
    const newSpeed = playerParticipant.speed + speedIncrease;
    await updateSpeed(playerParticipant.id, newSpeed);
  };

  // Función para obtener el consumo de velocidad de un equipamiento
  const getSpeedConsumption = (equipment, equipmentType) => {
    if (equipmentType === 'weapon' || equipmentType === 'power') {
      const consumo = equipment.consumo || '';
      // Contar los emojis 🟡 en el campo consumo
      const yellowDotCount = (consumo.match(/🟡/g) || []).length;
      return yellowDotCount;
    }
    return 0; // Las armaduras no consumen velocidad
  };

  // Función para destacar palabras del glosario
  const highlightText = (text) => {
    if (!text || !glossary || glossary.length === 0) return text;

    let parts = [text];

    glossary.forEach((term) => {
      if (!term?.word) return;

      const tooltipId = getGlossaryTooltipId(term.word);
      const escapedWord = escapeGlossaryWord(term.word);

      if (!escapedWord) return;

      const regex = new RegExp(`(${escapedWord})`, 'gi');
      let matchIndex = 0;

      parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];

        return part.split(regex).map((segment) => {
          if (
            segment &&
            segment.toLowerCase() === term.word.toLowerCase()
          ) {
            const key = `${tooltipId}-${matchIndex++}`;

            return (
              <span
                key={key}
                style={{ color: term.color }}
                className="font-bold cursor-help underline decoration-dotted"
                data-tooltip-id={tooltipId}
                data-tooltip-content={term.info}
              >
                {segment}
              </span>
            );
          }

          return segment;
        });
      });
    });

    return parts;
  };

  const renderGlossaryTooltips = () => {
    const seen = new Set();

    return glossary
      .map((term) => {
        if (!term?.word) return null;

        const tooltipId = getGlossaryTooltipId(term.word);
        if (seen.has(tooltipId)) return null;
        seen.add(tooltipId);

        return (
          <Tooltip
            key={tooltipId}
            id={tooltipId}
            place="top"
            className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
            openOnClick={isTouchDevice}
            delayShow={0}
            delayHide={0}
          />
        );
      })
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-gray-100 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-[#0b1120] to-[#0b1120]"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-amber-500/30 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg shadow-amber-900/20">
            <Zap className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-[#f0e6d2] font-['Cinzel']">Cargando velocidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-100 px-3 py-6 relative overflow-hidden font-['Lato']">
      {/* Fondo de polvo/stardust */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-[#0b1120] to-[#0b1120]"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        {/* Header */}
        {/* Header */}
        <div className="grid grid-cols-[1.5rem_1fr_1.5rem] sm:grid-cols-[8rem_1fr_8rem] items-center mb-6 sm:mb-8 w-full max-w-4xl mx-auto px-1 sm:px-4">
          {/* Col 1: Botón Volver Minimalista */}
          <div className="flex justify-start z-20">
            <button
              onClick={onBack}
              className="group flex items-center justify-center sm:justify-start gap-2 w-6 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl sm:border sm:border-[#c8aa6e]/30 sm:bg-[#0b1120]/50 text-[#c8aa6e]/70 font-medium text-sm hover:text-[#c8aa6e] sm:hover:bg-[#c8aa6e]/10 sm:hover:border-[#c8aa6e]/60 active:scale-[0.98] transition-all duration-300 font-['Cinzel'] uppercase tracking-[0.15em]"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          </div>

          {/* Col 2: Título Maximizado */}
          <div className="flex flex-col items-center justify-center min-w-0 z-10 px-0">
            <h1 className="font-['Cinzel'] text-xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight sm:tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] whitespace-nowrap overflow-visible w-full text-center">
              Sistema de Velocidad
            </h1>
            <p className="text-gray-400 text-[10px] sm:text-sm flex items-center justify-center gap-2 mt-0.5 sm:mt-2">
              {isMaster ? <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" /> : <User className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />}
              <span>{isMaster ? 'Master' : 'Jugador'}:</span>
              <span className="text-[#c8aa6e] font-medium">{playerName}</span>
            </p>
          </div>

          {/* Col 3: Espaciador Simétrico */}
          <div className="w-full"></div>
        </div>

        {/* Agregar personaje del jugador actual */}
        <div
          className="flex items-center justify-center gap-3 rounded-2xl p-4 mb-6 max-w-md mx-auto border border-amber-500/20"
          style={{
            background: 'rgba(11, 17, 32, 0.88)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 40px rgba(251, 191, 36, 0.05)',
          }}
        >
          <input
            placeholder="Nombre"
            value={currentCharacterName}
            onChange={(e) => setCurrentCharacterName(e.target.value)}
            className="flex-1 min-w-0 bg-gray-900/60 border-2 border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all duration-300"
          />
          <input
            type="number"
            value={currentPlayerSpeed}
            onChange={(e) => setCurrentPlayerSpeed(e.target.value)}
            className="w-20 text-center bg-gray-900/60 border-2 border-gray-700 rounded-xl px-3 py-3 text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all duration-300"
            min="0"
            max="999"
            placeholder="0"
          />
          <button
            onClick={addCurrentPlayerCharacter}
            className="w-12 h-12 rounded-xl border border-emerald-500/30 bg-emerald-900/30 text-emerald-400 font-bold text-xl hover:bg-emerald-800/40 hover:border-emerald-400/50 active:scale-[0.95] transition-all duration-300 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Próximo en actuar */}
        {
          nextToAct && (
            <div
              className={`rounded-2xl p-5 mb-6 border max-w-2xl mx-auto ${simultaneousActors.length > 1
                ? 'border-amber-400/40'
                : 'border-amber-500/30'
                }`}
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(11, 17, 32, 0.9))',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 50px rgba(251, 191, 36, 0.1)',
              }}
            >
              <h2 className="text-lg font-bold text-center mb-3 text-amber-300 font-['Cinzel']">
                {simultaneousActors.length > 1 ? 'Actúan Simultáneamente' : 'Próximo en Actuar'}
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {simultaneousActors.map(actor => (
                  <div key={actor.id} className="flex items-center justify-center gap-3 bg-gray-900/60 rounded-xl px-4 py-3 text-center border border-gray-700/50 mx-auto max-w-xs w-full">
                    <span
                      className="w-4 h-4 rounded-full inline-block flex-shrink-0"
                      style={{
                        background: actor.type === 'enemy' ? ENEMY_COLOR : getPlayerColor(actor.addedBy),
                        boxShadow: `0 0 8px ${actor.type === 'enemy' ? ENEMY_COLOR : getPlayerColor(actor.addedBy)}80`
                      }}
                    ></span>
                    <div className="font-semibold text-[#f0e6d2] flex-1 text-left truncate">{actor.name}</div>
                    <div className="text-sm text-amber-400 flex-shrink-0 font-medium">Velocidad: {actor.speed}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* Línea de sucesos */}
        <div
          className="rounded-2xl p-5 mb-6 border border-amber-500/20 max-w-2xl mx-auto"
          style={{
            background: 'rgba(11, 17, 32, 0.88)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <h3 className="text-lg font-bold mb-4 text-center text-[#f0e6d2] font-['Cinzel']">Línea de sucesos</h3>

          {participants.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-gray-700 flex items-center justify-center bg-gray-900/50">
                <Zap className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400">No hay participantes en el combate</p>
              <p className="text-sm text-gray-600">Únete o agrega participantes para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {sortedParticipants.map((participant, index) => {
                  const playerColor = participant.type === 'enemy' ? ENEMY_COLOR : getPlayerColor(participant.addedBy);
                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${participant.speed === nextToAct?.speed
                        ? 'border-amber-400/50 bg-amber-900/20'
                        : 'border-gray-700/50 bg-gray-900/40'
                        }`}
                      style={{
                        borderLeftColor: playerColor,
                        borderLeftWidth: '4px'
                      }}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${participant.speed === nextToAct?.speed
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-gray-800 text-gray-300'
                            }`}
                          style={{
                            border: `2px solid ${playerColor}`,
                            boxShadow: `0 0 12px ${playerColor}40`
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#f0e6d2] truncate">{participant.name}</div>
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: playerColor }}
                          >
                            {participant.type === 'enemy' ? 'Enemigo' : participant.addedBy}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 justify-center">
                        {/* Mostrar controles si es el propietario o master */}
                        {(isMaster || participant.addedBy === playerName) ? (
                          <>
                            {/* Botón - */}
                            <button
                              onClick={() => {
                                if (participant.speed > 0) updateSpeed(participant.id, participant.speed - 1);
                              }}
                              className="w-9 h-9 rounded-lg border border-gray-600 bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-white hover:border-gray-500 flex items-center justify-center transition-all duration-200 active:scale-95"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            {/* Input editable */}
                            <input
                              type="number"
                              value={participant.speed}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateSpeed(participant.id, val);
                              }}
                              className="w-16 text-center bg-gray-900/60 border-2 border-gray-700 rounded-lg px-2 py-2 text-white font-medium focus:border-amber-500/50 focus:outline-none transition-all"
                              min="0"
                            />
                            {/* Botón + */}
                            <button
                              onClick={() => {
                                updateSpeed(participant.id, participant.speed + 1);
                              }}
                              className="w-9 h-9 rounded-lg border border-emerald-500/30 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40 hover:border-emerald-400/50 flex items-center justify-center transition-all duration-200 active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            {/* Botón eliminar */}
                            {(isMaster || participant.addedBy === playerName) && (
                              <button
                                onClick={() => removeParticipant(participant.id)}
                                className="w-9 h-9 rounded-lg border border-red-500/30 bg-red-900/20 text-red-400 hover:bg-red-800/30 hover:border-red-400/50 flex items-center justify-center transition-all duration-200 active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          /* Mostrar solo la velocidad si no es el propietario ni master */
                          <div className="text-center px-3">
                            <div className="text-xl font-bold text-amber-400">{participant.speed}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Velocidad</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Controles del Master */}
        {
          isMaster && (
            <div
              className="rounded-2xl p-5 mb-6 border border-purple-500/20 max-w-2xl mx-auto"
              style={{
                background: 'rgba(11, 17, 32, 0.88)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <h3 className="text-lg font-bold mb-4 text-center text-[#f0e6d2] font-['Cinzel'] flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                Controles del Master
              </h3>

              {/* Agregar participante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <input
                  placeholder="Nombre"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  className="bg-gray-900/60 border-2 border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-all"
                />
                <input
                  type="number"
                  placeholder="Vel. inicial"
                  value={newParticipant.speed}
                  onChange={(e) => setNewParticipant({ ...newParticipant, speed: parseInt(e.target.value) || 0 })}
                  className="bg-gray-900/60 border-2 border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-all"
                  min="0"
                />
                <select
                  value={newParticipant.type}
                  onChange={(e) => setNewParticipant({ ...newParticipant, type: e.target.value })}
                  className="bg-gray-900/60 border-2 border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 focus:outline-none transition-all"
                >
                  <option value="player">Jugador</option>
                  <option value="enemy">Enemigo</option>
                </select>
                <button
                  onClick={addParticipant}
                  className="py-3 rounded-xl border border-emerald-500/30 bg-emerald-900/30 text-emerald-300 font-semibold hover:bg-emerald-800/40 hover:border-emerald-400/50 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {/* Botones de control rápidos */}
              <div className="flex flex-wrap gap-3 justify-center mb-4">
                <button
                  onClick={resetAllSpeeds}
                  className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-900/20 text-cyan-300 font-medium text-sm hover:bg-cyan-800/30 hover:border-cyan-400/50 active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetear Velocidades
                </button>
                <button
                  onClick={() => {
                    const enemyName = prompt("Nombre:");
                    if (enemyName && enemyName.trim()) {
                      setNewParticipant({
                        name: enemyName.trim(),
                        speed: 0,
                        type: 'enemy'
                      });
                      setTimeout(() => addParticipant(), 100);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-900/20 text-red-300 font-medium text-sm hover:bg-red-800/30 hover:border-red-400/50 active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  Añadir Enemigo Rápido
                </button>
                {Object.keys(enemyModifications).length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('¿Limpiar todas las modificaciones de enemigos?')) {
                        setEnemyModifications({});
                        localStorage.removeItem('enemyModifications');
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-900/20 text-amber-300 font-medium text-sm hover:bg-amber-800/30 hover:border-amber-400/50 active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpiar Modificaciones
                  </button>
                )}
              </div>

              {/* Píldoras de enemigos existentes */}
              {enemies.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-300/80 mb-3 text-center flex items-center justify-center gap-2">
                    <Swords className="w-4 h-4" />
                    Enemigos Disponibles
                  </h4>

                  {/* Buscador de enemigos */}
                  <div className="mb-3 flex justify-center">
                    <div className="relative w-full max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        className="bg-gray-900/60 border-2 border-gray-700 text-white text-sm rounded-xl block w-full pl-10 p-3 placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-all"
                        placeholder="Buscar enemigo..."
                        value={enemySearchTerm}
                        onChange={(e) => setEnemySearchTerm(e.target.value)}
                      />
                      {enemySearchTerm && (
                        <button
                          onClick={() => setEnemySearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {enemies
                        .filter(enemy =>
                          enemy.name.toLowerCase().includes(enemySearchTerm.toLowerCase()) ||
                          (enemy.type && enemy.type.toLowerCase().includes(enemySearchTerm.toLowerCase()))
                        )
                        .map((enemy) => {
                          const modifiedEnemy = getModifiedEnemy(enemy);
                          return (
                            <div key={enemy.id} className="relative group">
                              <Boton
                                onClick={() => {
                                  setNewParticipant({
                                    name: modifiedEnemy.name,
                                    speed: 0,
                                    type: 'enemy'
                                  });
                                  setTimeout(() => addParticipant(), 100);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setPreviewEnemy(modifiedEnemy);
                                }}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1 text-sm relative pr-8 min-w-[120px] text-left"
                                title={`${modifiedEnemy.name}${modifiedEnemy.description ? ` - ${modifiedEnemy.description}` : ''} (PC: Click derecho para ver ficha | Móvil: Botón ℹ️ para ver ficha)`}
                              >
                                <span className="truncate block max-w-[150px]">{modifiedEnemy.name}</span>
                                {/* Indicador de modificaciones */}
                                {enemyModifications[enemy.id] && (
                                  <span className="absolute top-0 right-7 w-2 h-2 bg-yellow-400 rounded-full"></span>
                                )}
                                {/* Botón de información mejorado */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewEnemy(modifiedEnemy);
                                  }}
                                  className="absolute inset-y-0 right-0 w-7 flex items-center justify-center bg-red-900/50 hover:bg-red-700 text-white border-l border-red-500/30 transition-colors"
                                  title="Ver ficha completa"
                                >
                                  <span className="text-xs font-serif font-bold italic">i</span>
                                </button>
                              </Boton>
                            </div>
                          );
                        })}
                      {enemies.filter(enemy =>
                        enemy.name.toLowerCase().includes(enemySearchTerm.toLowerCase()) ||
                        (enemy.type && enemy.type.toLowerCase().includes(enemySearchTerm.toLowerCase()))
                      ).length === 0 && (
                          <div className="text-gray-500 text-sm py-4 italic">No se encontraron enemigos</div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Información para el master */}
              <div className="text-sm text-gray-400 text-center border-t border-gray-700/50 pt-4 space-y-1">
                <p className="flex items-center justify-center gap-2">
                  <span className="text-purple-400">•</span>
                  Como Master puedes editar cualquier velocidad y eliminar participantes
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="text-emerald-400">•</span>
                  Los jugadores solo pueden editar sus propios personajes
                </p>
                {Object.keys(enemyModifications).length > 0 && (
                  <p className="text-amber-400 mt-2">
                    {Object.keys(enemyModifications).length} enemigo(s) con modificaciones guardadas
                  </p>
                )}
              </div>
            </div>
          )
        }

        {/* Información del sistema */}
        <div
          className="rounded-2xl p-5 border border-gray-700/30 max-w-2xl mx-auto mb-8"
          style={{
            background: 'rgba(11, 17, 32, 0.7)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h3 className="text-lg font-bold mb-3 text-center text-[#f0e6d2] font-['Cinzel']">Cómo funciona</h3>
          <div className="text-sm text-gray-400 space-y-2 text-center">
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> Todos empiezan con velocidad 0</p>
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> Las acciones consumen velocidad (ej: daga = +1 velocidad)</p>
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> Actúa siempre quien tiene <strong className="text-amber-300">menos velocidad</strong></p>
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> Si hay empate, actúan simultáneamente</p>
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> = Consumo de velocidad del arma/poder</p>
            <p className="flex items-center justify-center gap-2"><span className="text-amber-400">•</span> Los colores identifican qué jugador controla cada personaje</p>
          </div>
        </div>

        {/* Píldoras de Equipamiento del Jugador */}
        {
          playerEquipment && (
            <div className="mb-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-bold mb-4 text-center">Píldoras de Equipamiento</h3>

              {/* Armas */}
              {playerEquipment.weapons && playerEquipment.weapons.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {playerEquipment.weapons.map((weaponName) => {
                      const weapon = armas.find(w => w.nombre === weaponName);
                      if (!weapon) return null;
                      const speedIncrease = getSpeedConsumption(weapon, 'weapon');
                      return (
                        <Boton
                          key={weaponName}
                          onClick={() => handleUseEquipment(weaponName, 'weapon', speedIncrease)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-3 py-1 text-sm"
                          title={`${weapon.nombre} - Consumo: 🟡${speedIncrease} velocidad`}
                        >
                          {weapon.nombre} 🟡{speedIncrease}
                        </Boton>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Poderes */}
              {playerEquipment.poderes && playerEquipment.poderes.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {playerEquipment.poderes.map((powerName) => {
                      const power = habilidades.find(p => p.nombre === powerName);
                      if (!power) return null;
                      const speedIncrease = getSpeedConsumption(power, 'power');
                      return (
                        <Boton
                          key={powerName}
                          onClick={() => handleUseEquipment(powerName, 'power', speedIncrease)}
                          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-3 py-1 text-sm"
                          title={`${power.nombre} - Consumo: 🟡${speedIncrease} velocidad`}
                        >
                          {power.nombre} 🟡{speedIncrease}
                        </Boton>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay equipamiento */}
              {(!playerEquipment.weapons || playerEquipment.weapons.length === 0) &&
                (!playerEquipment.poderes || playerEquipment.poderes.length === 0) && (
                  <div className="text-center text-gray-400 py-4">
                    <p>No tienes equipamiento equipado</p>
                    <p className="text-sm">Equipa armas y poderes en tu ficha para usarlos aquí</p>
                  </div>
                )}
            </div>
          )
        }

        {/* Modal de previsualización de enemigo */}
        <AnimatePresence>
          {previewEnemy && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
              <EnemyDetailView
                enemy={previewEnemy}
                onClose={() => setPreviewEnemy(null)}
                onPlay={() => {
                  setNewParticipant({
                    name: previewEnemy.name,
                    speed: 0,
                    type: 'enemy'
                  });
                  setPreviewEnemy(null);
                  setTimeout(() => addParticipant(), 100);
                }}
                onUpdate={(updatedEnemy) => {
                  // Cuando se actualiza desde EnemyDetailView, guardamos las modificaciones
                  // Comparamos con el original para ver qué cambió, pero por simplicidad
                  // guardamos todo lo relevante como modificación
                  const modifications = {
                    nivel: updatedEnemy.nivel,
                    experiencia: updatedEnemy.experiencia,
                    description: updatedEnemy.description,
                    notas: updatedEnemy.notas,
                    stats: updatedEnemy.stats,
                    attributes: updatedEnemy.attributes,
                    abilities: updatedEnemy.abilities,
                    tags: updatedEnemy.tags,
                    name: updatedEnemy.name, // Permitir cambiar nombre
                    image: updatedEnemy.image // Permitir cambiar imagen
                  };
                  saveModifications(updatedEnemy.id, modifications);

                  // Actualizar la vista previa localmente
                  setPreviewEnemy(updatedEnemy);
                }}
                onDelete={() => {
                  // Opción para resetear cambios del enemigo
                  if (window.confirm("¿Restaurar valores originales de este enemigo?")) {
                    const updatedModifications = { ...enemyModifications };
                    delete updatedModifications[previewEnemy.id];
                    setEnemyModifications(updatedModifications);
                    localStorage.setItem('enemyModifications', JSON.stringify(updatedModifications));
                    setPreviewEnemy(null); // Cerrar para refrescar
                  }
                }}
              />
            </div>
          )}
        </AnimatePresence>
      </div >
      {renderGlossaryTooltips()}
    </div >
  );
};

export default InitiativeTracker; 