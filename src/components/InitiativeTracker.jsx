import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Boton from './Boton';
import Input from './Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

// Detectar dispositivo táctil
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Colores base para identificar jugadores (más suaves)
const baseColors = [
  '#3B82F6', // Azul
  '#EF4444', // Rojo
  '#10B981', // Verde
  '#F59E0B', // Amarillo
  '#8B5CF6', // Púrpura
  '#F97316', // Naranja
  '#06B6D4', // Cian
  '#EC4899', // Rosa
];

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
  const tooltipCounterRef = useRef(0);

  // Debug: Verificar que el glosario se recibe correctamente
  useEffect(() => {
    // El glosario se recibe correctamente desde App.js
  }, [glossary]);

  // Referencia al documento de velocidad en Firestore
  const initiativeRef = doc(db, 'initiative', 'current');

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
    glossary.forEach(term => {
      const regex = new RegExp(`(${term.word})`, 'gi');
      parts = parts.flatMap(part => {
        if (typeof part !== 'string') return [part];
        return part.split(regex).map((p, i) => {
          if (p.toLowerCase() === term.word.toLowerCase()) {
            const id = `gloss-${term.word}-${tooltipCounterRef.current++}`;
            return (
              <React.Fragment key={id}>
                <span
                  style={{ color: term.color }}
                  className="font-bold cursor-help underline decoration-dotted"
                  data-tooltip-id={id}
                  data-tooltip-content={term.info}
                >
                  {p}
                </span>
                <Tooltip
                  id={id}
                  place="top"
                  className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
                  openOnClick={isTouchDevice}
                  delayShow={0}
                  delayHide={0}
                />
              </React.Fragment>
            );
          }
          return p;
        });
      });
    });
    return parts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando velocidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex w-full items-center justify-between max-w-2xl mx-auto">
            <Boton onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
              ← Volver
            </Boton>
            <h1 className="text-lg sm:text-xl font-bold text-white text-center flex-1 px-2">Sistema de Velocidad</h1>
            <div className="w-16"></div>
          </div>
          <div className="text-center mt-2">
            <p className="text-gray-300 text-sm">{isMaster ? '🎭 Master' : '👤 Jugador'}: {playerName}</p>
          </div>
        </div>

        {/* Agregar personaje del jugador actual */}
        <div className="flex items-center justify-center gap-3 bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-6 max-w-md mx-auto">
          <Input
            placeholder="Nombre"
            value={currentCharacterName}
            onChange={(e) => setCurrentCharacterName(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white flex-1 min-w-0"
          />
          <Input
            type="number"
            value={currentPlayerSpeed}
            onChange={(e) => setCurrentPlayerSpeed(e.target.value)}
            className="w-16 text-center bg-gray-700 border-gray-600 text-white"
            min="0"
            max="999"
            placeholder="0"
          />
          <Boton
            onClick={addCurrentPlayerCharacter}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            ➕
          </Boton>
        </div>

        {/* Próximo en actuar */}
        {nextToAct && (
          <div className={`rounded-lg p-4 mb-6 border-2 max-w-2xl mx-auto ${
            simultaneousActors.length > 1 
              ? 'simul' 
              : 'bg-gradient-to-r from-slate-700 to-slate-600 border-amber-300'
          }`}>
            <h2 className="text-lg font-bold text-center mb-2 text-white">
              {simultaneousActors.length > 1 ? 'Actúan Simultáneamente' : 'Próximo en Actuar'}
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {simultaneousActors.map(actor => (
                <div key={actor.id} className="flex items-center justify-center gap-3 bg-white/10 rounded-lg px-4 py-2 text-center border border-white/20 mx-auto max-w-xs w-full">
                  <span
                    className="w-5 h-5 rounded-full inline-block border-2"
                    style={{ background: getPlayerColor(actor.addedBy), borderColor: getPlayerColor(actor.addedBy) }}
                  ></span>
                  <div className="font-bold text-white flex-1 text-left truncate">{actor.name}</div>
                  <div className="text-sm text-amber-200 flex-shrink-0 font-semibold">Velocidad: {actor.speed}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Línea de sucesos */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold mb-4 text-center">Línea de sucesos</h3>
          
          {participants.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">⚡</div>
              <p>No hay participantes en el combate</p>
              <p className="text-sm">Únete o agrega participantes para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {sortedParticipants.map((participant, index) => {
                  const playerColor = getPlayerColor(participant.addedBy);
                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border-2 transition-all gap-3 ${
                        participant.speed === nextToAct?.speed 
                          ? 'border-yellow-400 bg-yellow-400/10' 
                          : 'border-gray-600 bg-gray-700'
                      }`}
                      style={{
                        borderLeftColor: playerColor,
                        borderLeftWidth: '4px'
                      }}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            participant.speed === nextToAct?.speed 
                              ? 'bg-yellow-400 text-gray-900' 
                              : 'bg-gray-600 text-white'
                          }`}
                          style={{
                            border: `2px solid ${playerColor}`,
                            boxShadow: `0 0 8px ${playerColor}40`
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{participant.name}</div>
                          <div 
                            className="text-sm font-medium truncate"
                            style={{ color: playerColor }}
                          >
                            {participant.type === 'enemy' ? 'Enemigo' : participant.addedBy}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0 justify-center">
                        {/* Mostrar controles si es el propietario o master */}
                        {(isMaster || participant.addedBy === playerName) ? (
                          <>
                            {/* Botón - */}
                            <Boton
                              onClick={() => {
                                if (participant.speed > 0) updateSpeed(participant.id, participant.speed - 1);
                              }}
                              className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 p-0 flex items-center justify-center text-sm font-bold"
                            >
                              -
                            </Boton>
                            {/* Input editable */}
                            <Input
                              type="number"
                              value={participant.speed}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateSpeed(participant.id, val);
                              }}
                              className="w-16 text-center bg-gray-600 border-gray-500 text-white"
                              min="0"
                            />
                            {/* Botón + */}
                            <Boton
                              onClick={() => {
                                updateSpeed(participant.id, participant.speed + 1);
                              }}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white w-8 h-8 p-0 flex items-center justify-center text-sm font-bold"
                            >
                              +
                            </Boton>
                            {/* Botón eliminar - master puede eliminar cualquier participante, jugadores solo sus propios */}
                            {(isMaster || participant.addedBy === playerName) && (
                              <Boton
                                onClick={() => removeParticipant(participant.id)}
                                color="red"
                                size="sm"
                              >
                                🗑️
                              </Boton>
                            )}
                          </>
                        ) : (
                          /* Mostrar solo la velocidad si no es el propietario ni master */
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400">{participant.speed}</div>
                            <div className="text-xs text-gray-400">Velocidad</div>
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
        {isMaster && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4 text-center">🎭 Controles del Master</h3>
            
            {/* Agregar participante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              <Input
                placeholder="Nombre"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Input
                type="number"
                placeholder="Velocidad inicial"
                value={newParticipant.speed}
                onChange={(e) => setNewParticipant({...newParticipant, speed: parseInt(e.target.value) || 0})}
                className="bg-gray-700 border-gray-600 text-white"
                min="0"
              />
              <select
                value={newParticipant.type}
                onChange={(e) => setNewParticipant({...newParticipant, type: e.target.value})}
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
              >
                <option value="player">👤 Jugador</option>
                <option value="enemy">👹 Enemigo</option>
              </select>
              <Boton
                onClick={addParticipant}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ➕ Agregar
              </Boton>
            </div>
            
            {/* Botones de control rápidos */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <Boton
                onClick={resetAllSpeeds}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                🔄 Resetear Velocidades
              </Boton>
              <Boton
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
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                👹 Añadir Enemigo Rápido
              </Boton>
              {Object.keys(enemyModifications).length > 0 && (
                <Boton
                  onClick={() => {
                    if (window.confirm('¿Limpiar todas las modificaciones de enemigos?')) {
                      setEnemyModifications({});
                      localStorage.removeItem('enemyModifications');
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  🗑️ Limpiar Modificaciones
                </Boton>
              )}
            </div>

            {/* Píldoras de enemigos existentes */}
            {enemies.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 text-center">👹 Enemigos Disponibles</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {enemies.map((enemy) => {
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
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1 text-sm relative"
                          title={`${modifiedEnemy.name}${modifiedEnemy.description ? ` - ${modifiedEnemy.description}` : ''} (PC: Click derecho para ver ficha | Móvil: Botón ℹ️ para ver ficha)`}
                        >
                          {modifiedEnemy.name}
                          {/* Indicador de modificaciones */}
                          {enemyModifications[enemy.id] && (
                            <span className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full border border-gray-800"></span>
                          )}
                          {/* Botón de información para móviles */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewEnemy(modifiedEnemy);
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 md:hidden"
                            title="Ver ficha"
                          >
                            ℹ️
                          </button>
                          {/* Tooltip con información del enemigo */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(enemy.id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs p-1"
                              title="Ver información"
                            >
                              ℹ️
                            </button>
                            {activeTooltip === enemy.id && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-50 px-2 py-1 text-xs bg-black text-white rounded shadow-lg max-w-xs">
                                <div className="font-semibold text-red-300 mb-1">{modifiedEnemy.name}</div>
                                {modifiedEnemy.description && (
                                  <div className="text-gray-300 mb-1 max-w-xs truncate">
                                    {highlightText(modifiedEnemy.description)}
                                  </div>
                                )}
                                {modifiedEnemy.nivel && (
                                  <div className="text-gray-400">Nivel: {modifiedEnemy.nivel}</div>
                                )}
                                {modifiedEnemy.weapons && modifiedEnemy.weapons.length > 0 && (
                                  <div className="text-gray-400">Armas: {modifiedEnemy.weapons.length}</div>
                                )}
                                {enemyModifications[enemy.id] && (
                                  <div className="text-yellow-400 text-xs">✏️ Modificado</div>
                                )}
                                <div className="text-gray-400">
                                  <div>PC: Click: añadir | Click derecho: ver ficha</div>
                                  <div>Móvil: Click: añadir | Botón ℹ️: ver ficha</div>
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black rotate-45"></div>
                              </div>
                            )}
                          </div>
                        </Boton>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Información para el master */}
            <div className="text-sm text-gray-300 text-center border-t border-gray-600 pt-3">
              <p>💡 Como Master puedes editar cualquier velocidad y eliminar participantes</p>
              <p>🎯 Los jugadores solo pueden editar sus propios personajes</p>
              {Object.keys(enemyModifications).length > 0 && (
                <p className="text-yellow-400 mt-2">
                  💾 {Object.keys(enemyModifications).length} enemigo(s) con modificaciones guardadas
                </p>
              )}
            </div>
          </div>
        )}

        {/* Información del sistema */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 max-w-2xl mx-auto mb-8">
          <h3 className="text-lg font-bold mb-3 text-center">Cómo funciona</h3>
          <div className="text-sm text-gray-300 space-y-2 text-center">
            <p>• Todos empiezan con velocidad 0</p>
            <p>• Las acciones consumen velocidad (ej: daga = +1 velocidad)</p>
            <p>• Actúa siempre quien tiene <strong>menos velocidad</strong></p>
            <p>• Si hay empate, actúan simultáneamente</p>
            <p>• 🟡 = Consumo de velocidad del arma/poder</p>
            <p>• Los colores identifican qué jugador controla cada personaje</p>
          </div>
        </div>

        {/* Píldoras de Equipamiento del Jugador */}
        {playerEquipment && (
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
        )}

        {/* Modal de previsualización de enemigo */}
        {previewEnemy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">👹 Ficha de {previewEnemy.name}</h2>
                <Boton
                  onClick={() => setPreviewEnemy(null)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
                >
                  ✕
                </Boton>
              </div>

              <div className="space-y-4">
                {/* Imagen del enemigo */}
                {previewEnemy.portrait && (
                  <div className="text-center">
                    <img
                      src={previewEnemy.portrait}
                      alt={previewEnemy.name}
                      className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-gray-600"
                    />
                  </div>
                )}

                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nivel</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editingEnemy.nivel || 1}
                        onChange={(e) => setEditingEnemy({...editingEnemy, nivel: parseInt(e.target.value) || 1})}
                        className="w-full bg-gray-700 border-gray-600 text-white"
                        min="1"
                      />
                    ) : (
                      <div className="text-white">{previewEnemy.nivel || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Experiencia</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editingEnemy.experiencia || 0}
                        onChange={(e) => setEditingEnemy({...editingEnemy, experiencia: parseInt(e.target.value) || 0})}
                        className="w-full bg-gray-700 border-gray-600 text-white"
                        min="0"
                      />
                    ) : (
                      <div className="text-white">{previewEnemy.experiencia || '0'}</div>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                {previewEnemy.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                    {isEditing ? (
                      <textarea
                        value={editingEnemy.description || ''}
                        onChange={(e) => setEditingEnemy({...editingEnemy, description: e.target.value})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                        placeholder="Descripción del enemigo"
                      />
                    ) : (
                      <div className="text-white bg-gray-700 p-3 rounded-lg">{highlightText(previewEnemy.description)}</div>
                    )}
                  </div>
                )}

                {/* Atributos */}
                {previewEnemy.atributos && Object.keys(previewEnemy.atributos).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Atributos</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(previewEnemy.atributos).map(([attr, value]) => (
                        <div key={attr} className="bg-gray-700 p-2 rounded flex justify-between">
                          <span 
                            className="text-gray-300 capitalize"
                            style={{ 
                              color: attr === 'destreza' ? '#34d399' : 
                                     attr === 'vigor' ? '#f87171' : 
                                     attr === 'intelecto' ? '#60a5fa' : 
                                     attr === 'voluntad' ? '#a78bfa' : '#9ca3af'
                            }}
                          >
                            {attr}
                          </span>
                          <span className="text-white font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estadísticas */}
                {previewEnemy.stats && Object.keys(previewEnemy.stats).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Estadísticas</label>
                      {!isEditing && (
                        <Boton
                          onClick={startEditing}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs"
                        >
                          ✏️ Editar
                        </Boton>
                      )}
                    </div>
                    <div className="space-y-3">
                      {Object.entries(isEditing ? editingEnemy.stats : previewEnemy.stats).map(([stat, value]) => {
                        const currentValue = value.actual || 0;
                        const maxValue = value.total || 0;
                        const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;
                        
                        return (
                          <div key={stat} className="bg-gray-700 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span 
                                className="text-sm font-medium capitalize"
                                style={{ 
                                  color: stat === 'postura' ? '#34d399' : 
                                         stat === 'vida' ? '#f87171' : 
                                         stat === 'ingenio' ? '#60a5fa' : 
                                         stat === 'cordura' ? '#a78bfa' : 
                                         stat === 'armadura' ? '#9ca3af' : '#9ca3af'
                                }}
                              >
                                {stat}
                              </span>
                              {isEditing && (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={currentValue}
                                    onChange={(e) => updateStat(stat, 'actual', e.target.value)}
                                    className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                                    min="0"
                                    max={maxValue}
                                  />
                                  <span className="text-gray-400 text-xs">/</span>
                                  <Input
                                    type="number"
                                    value={maxValue}
                                    onChange={(e) => updateStat(stat, 'total', e.target.value)}
                                    className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                                    min="0"
                                  />
                                </div>
                              )}
                              {!isEditing && (
                                <span className="text-white font-semibold text-sm">
                                  {currentValue}/{maxValue}
                                </span>
                              )}
                            </div>
                            
                            {/* Barra de progreso */}
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: stat === 'postura' ? '#34d399' : 
                                                 stat === 'vida' ? '#f87171' : 
                                                 stat === 'ingenio' ? '#60a5fa' : 
                                                 stat === 'cordura' ? '#a78bfa' : 
                                                 stat === 'armadura' ? '#9ca3af' : '#9ca3af'
                                }}
                              />
                            </div>
                            
                            {/* Indicadores visuales */}
                            {percentage <= 25 && currentValue > 0 && (
                              <div className="text-red-400 text-xs mt-1">⚠️ Crítico</div>
                            )}
                            {percentage <= 50 && percentage > 25 && (
                              <div className="text-yellow-400 text-xs mt-1">⚠️ Herido</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Armas */}
                {previewEnemy.weapons && previewEnemy.weapons.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">⚔️ Armas ({previewEnemy.weapons.length})</label>
                    <div className="space-y-2">
                      {previewEnemy.weapons.map((weapon, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded-lg">
                          <div className="font-semibold text-white mb-2">{weapon.nombre}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                            <div><span className="font-medium">Daño:</span> {weapon.dano}</div>
                            <div><span className="font-medium">Alcance:</span> {weapon.alcance}</div>
                            <div><span className="font-medium">Consumo:</span> {weapon.consumo}</div>
                            <div><span className="font-medium">Cuerpo:</span> {weapon.cuerpo}</div>
                            <div><span className="font-medium">Mente:</span> {weapon.mente}</div>
                            <div><span className="font-medium">Carga:</span> {weapon.carga}</div>
                            {weapon.tipoDano && (
                              <div><span className="font-medium">Tipo:</span> {weapon.tipoDano}</div>
                            )}
                            {weapon.valor && (
                              <div><span className="font-medium">Valor:</span> {weapon.valor}</div>
                            )}
                            {weapon.tecnologia && (
                              <div><span className="font-medium">Tecnología:</span> {weapon.tecnologia}</div>
                            )}
                          </div>
                          {weapon.rasgos && weapon.rasgos.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-300">Rasgos:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {weapon.rasgos.map((rasgo, i) => (
                                  <div
                                    key={i}
                                    className="px-2 py-1 text-xs rounded-full border cursor-pointer"
                                    style={{
                                      backgroundColor: rasgo.toLowerCase().includes('crítico') ? '#ef4444' :
                                                     rasgo.toLowerCase().includes('vigor') ? '#f87171' :
                                                     rasgo.toLowerCase().includes('precisión') ? '#34d399' :
                                                     rasgo.toLowerCase().includes('mágico') ? '#a78bfa' :
                                                     rasgo.toLowerCase().includes('técnico') ? '#60a5fa' :
                                                     '#6b7280',
                                      borderColor: rasgo.toLowerCase().includes('crítico') ? '#dc2626' :
                                                  rasgo.toLowerCase().includes('vigor') ? '#dc2626' :
                                                  rasgo.toLowerCase().includes('precisión') ? '#059669' :
                                                  rasgo.toLowerCase().includes('mágico') ? '#7c3aed' :
                                                  rasgo.toLowerCase().includes('técnico') ? '#2563eb' :
                                                  '#4b5563',
                                      color: '#ffffff'
                                    }}
                                    onClick={() => setActiveTooltip(`weapon-${index}-${i}`)}
                                    onMouseEnter={() => setActiveTooltip(`weapon-${index}-${i}`)}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    {rasgo}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {weapon.descripcion && (
                            <div className="mt-2 text-gray-300 italic text-sm">
                              <span className="font-medium">Descripción:</span> {highlightText(weapon.descripcion)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Armaduras */}
                {previewEnemy.armaduras && previewEnemy.armaduras.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">🛡️ Armaduras ({previewEnemy.armaduras.length})</label>
                    <div className="space-y-2">
                      {previewEnemy.armaduras.map((armor, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded-lg">
                          <div className="font-semibold text-white mb-2">{armor.nombre}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                            <div><span className="font-medium">Defensa:</span> {armor.defensa}</div>
                            <div><span className="font-medium">Cuerpo:</span> {armor.cuerpo}</div>
                            <div><span className="font-medium">Mente:</span> {armor.mente}</div>
                            <div><span className="font-medium">Carga:</span> {armor.carga}</div>
                            {armor.valor && (
                              <div><span className="font-medium">Valor:</span> {armor.valor}</div>
                            )}
                            {armor.tecnologia && (
                              <div><span className="font-medium">Tecnología:</span> {armor.tecnologia}</div>
                            )}
                          </div>
                          {armor.rasgos && armor.rasgos.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-300">Rasgos:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {armor.rasgos.map((rasgo, i) => (
                                  <div
                                    key={i}
                                    className="px-2 py-1 text-xs rounded-full border cursor-pointer"
                                    style={{
                                      backgroundColor: rasgo.toLowerCase().includes('crítico') ? '#ef4444' :
                                                     rasgo.toLowerCase().includes('vigor') ? '#f87171' :
                                                     rasgo.toLowerCase().includes('precisión') ? '#34d399' :
                                                     rasgo.toLowerCase().includes('mágico') ? '#a78bfa' :
                                                     rasgo.toLowerCase().includes('técnico') ? '#60a5fa' :
                                                     '#6b7280',
                                      borderColor: rasgo.toLowerCase().includes('crítico') ? '#dc2626' :
                                                  rasgo.toLowerCase().includes('vigor') ? '#dc2626' :
                                                  rasgo.toLowerCase().includes('precisión') ? '#059669' :
                                                  rasgo.toLowerCase().includes('mágico') ? '#7c3aed' :
                                                  rasgo.toLowerCase().includes('técnico') ? '#2563eb' :
                                                  '#4b5563',
                                      color: '#ffffff'
                                    }}
                                    onClick={() => setActiveTooltip(`armor-${index}-${i}`)}
                                    onMouseEnter={() => setActiveTooltip(`armor-${index}-${i}`)}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    {rasgo}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {armor.descripcion && (
                            <div className="mt-2 text-gray-300 italic text-sm">
                              <span className="font-medium">Descripción:</span> {highlightText(armor.descripcion)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Poderes */}
                {previewEnemy.poderes && previewEnemy.poderes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">✨ Poderes ({previewEnemy.poderes.length})</label>
                    <div className="space-y-2">
                      {previewEnemy.poderes.map((power, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded-lg">
                          <div className="font-semibold text-white mb-2">{power.nombre}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                            <div><span className="font-medium">Alcance:</span> {power.alcance}</div>
                            <div><span className="font-medium">Consumo:</span> {power.consumo}</div>
                            <div><span className="font-medium">Cuerpo:</span> {power.cuerpo}</div>
                            <div><span className="font-medium">Mente:</span> {power.mente}</div>
                            <div><span className="font-medium">Poder:</span> {power.poder}</div>
                          </div>
                          {power.descripcion && (
                            <div className="mt-2 text-gray-300 italic text-sm">
                              <span className="font-medium">Descripción:</span> {highlightText(power.descripcion)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {previewEnemy.notas && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
                    {isEditing ? (
                      <textarea
                        value={editingEnemy.notas || ''}
                        onChange={(e) => setEditingEnemy({...editingEnemy, notas: e.target.value})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                        placeholder="Notas adicionales sobre el enemigo"
                      />
                    ) : (
                      <div className="text-white bg-gray-700 p-3 rounded-lg text-sm">{highlightText(previewEnemy.notas)}</div>
                    )}
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 border-t border-gray-600">
                  {isEditing ? (
                    <>
                      <Boton
                        onClick={saveChanges}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      >
                        💾 Guardar Cambios
                      </Boton>
                      <Boton
                        onClick={cancelEditing}
                        className="bg-gray-600 hover:bg-gray-500 text-white flex-1"
                      >
                        ❌ Cancelar
                      </Boton>
                    </>
                  ) : (
                    <>
                      <Boton
                        onClick={() => {
                          setNewParticipant({
                            name: previewEnemy.name,
                            speed: 0,
                            type: 'enemy'
                          });
                          setPreviewEnemy(null);
                          setTimeout(() => addParticipant(), 100);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      >
                        ➕ Añadir al Combate
                      </Boton>
                      <Boton
                        onClick={() => setPreviewEnemy(null)}
                        className="bg-gray-600 hover:bg-gray-500 text-white flex-1"
                      >
                        Cerrar
                      </Boton>
                    </>
                  )}
                </div>

                {/* Nota informativa */}
                {!isEditing && (
                  <div className="text-xs text-gray-400 text-center mt-3 pt-3 border-t border-gray-600">
                    <div>💡 Los cambios en esta ficha son temporales y no afectan la ficha original del enemigo</div>
                    {enemyModifications[previewEnemy?.id] && (
                      <div className="mt-2">
                        <Boton
                          onClick={() => {
                            const updatedModifications = { ...enemyModifications };
                            delete updatedModifications[previewEnemy.id];
                            setEnemyModifications(updatedModifications);
                            localStorage.setItem('enemyModifications', JSON.stringify(updatedModifications));
                            setPreviewEnemy(getModifiedEnemy(enemies.find(e => e.id === previewEnemy.id)));
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                        >
                          🗑️ Limpiar Modificaciones
                        </Boton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitiativeTracker; 