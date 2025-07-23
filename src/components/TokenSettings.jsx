import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Boton from './Boton';
import Input from './Input';

const TokenSettings = ({
  token,
  enemies = [],
  players = [],
  onClose,
  onUpdate,
  onOpenSheet,
  onMoveFront,
  onMoveBack,
  isPlayerView = false,
  currentPlayerName = '',
}) => {
  const [tab, setTab] = useState('details');
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 140 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };
  const handleMouseUp = () => setDragging(false);
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const [enemyId, setEnemyId] = useState(token.enemyId || '');
  const [name, setName] = useState(token.customName || '');
  const [showName, setShowName] = useState(token.showName || false);
  const [controlledBy, setControlledBy] = useState(token.controlledBy || 'master');
  const [barsVisibility, setBarsVisibility] = useState(token.barsVisibility || 'all');
  const [auraRadius, setAuraRadius] = useState(token.auraRadius || 0);
  const [auraShape, setAuraShape] = useState(token.auraShape || 'circle');
  const [auraColor, setAuraColor] = useState(token.auraColor || '#ffff00');
  const [auraOpacity, setAuraOpacity] = useState(
    typeof token.auraOpacity === 'number' ? token.auraOpacity : 0.25
  );
  const [auraVisibility, setAuraVisibility] = useState(
    token.auraVisibility || 'all'
  );
  const [tokenOpacity, setTokenOpacity] = useState(
    typeof token.opacity === 'number' ? token.opacity : 1
  );
  const [tintColor, setTintColor] = useState(token.tintColor || '#ff0000');
  const [tintOpacity, setTintOpacity] = useState(
    typeof token.tintOpacity === 'number' ? token.tintOpacity : 0
  );
  const [syncWithPlayer, setSyncWithPlayer] = useState(
    token.syncWithPlayer !== false
  );
  
  // Estados para configuración de luz
  const [lightEnabled, setLightEnabled] = useState(token.light?.enabled || false);
  const [lightRadius, setLightRadius] = useState(token.light?.radius || 5);
  const [lightColor, setLightColor] = useState(token.light?.color || '#ffa500');
  const [lightOpacity, setLightOpacity] = useState(token.light?.opacity || 0.4);

  // Estados para configuración de visión
  const [visionEnabled, setVisionEnabled] = useState(token.vision?.enabled !== false); // Por defecto true
  const [visionRange, setVisionRange] = useState(token.vision?.range || 10); // Rango por defecto de 10 casillas

  // Ref para debouncing
  const debounceRef = useRef(null);

  const loadPlayerSheet = async (playerId) => {
    try {
      const snap = await getDoc(doc(db, 'players', playerId));
      if (snap.exists() && token.tokenSheetId) {
        const stored = localStorage.getItem('tokenSheets');
        const sheets = stored ? JSON.parse(stored) : {};
        const sheet = { id: token.tokenSheetId, ...snap.data() };
        sheets[token.tokenSheetId] = sheet;
        localStorage.setItem('tokenSheets', JSON.stringify(sheets));
        window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sheet }));
      }
    } catch (err) {
      console.error('Error loading player sheet', err);
    }
  };

  const handleControlledByChange = async (e) => {
    const value = e.target.value;
    setControlledBy(value);
    if (value !== 'master') {
      setEnemyId('');
      await loadPlayerSheet(value);
    }
  };
  
  // Función con debouncing para evitar múltiples actualizaciones a Firebase
  const debouncedApplyChanges = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      const enemy = enemies.find((e) => e.id === enemyId);
      onUpdate({
        ...token,
        enemyId: enemyId || null,
        url: enemyId ? enemy?.portrait || token.url : token.url,
        name: enemyId ? enemy?.name : token.name,
        customName: showName ? name : '',
        showName,
        controlledBy,
        barsVisibility,
        auraRadius,
        auraShape,
        auraColor,
        auraOpacity,
        auraVisibility,
        opacity: tokenOpacity,
        tintColor,
        tintOpacity,
        light: {
          enabled: lightEnabled,
          radius: lightRadius,
          color: lightColor,
          opacity: lightOpacity,
        },
        vision: {
          enabled: visionEnabled,
          range: visionRange,
        },
        syncWithPlayer,
      });
    }, 800); // Esperar 800ms antes de aplicar cambios (optimizado para evitar spam a Firebase)
  }, [
    token, enemyId, enemies, name, showName, controlledBy, barsVisibility,
    auraRadius, auraShape, auraColor, auraOpacity, auraVisibility,
    tokenOpacity, tintColor, tintOpacity, lightEnabled, lightRadius,
    lightColor, lightOpacity, visionEnabled, visionRange, syncWithPlayer,
    onUpdate
  ]);

  // Función inmediata para cambios que no requieren debouncing
  const applyChanges = async () => {
    const enemy = enemies.find((e) => e.id === enemyId);
    const updatedToken = {
      ...token,
      enemyId: controlledBy === 'master' ? enemyId || null : null,
      url: enemyId ? enemy?.portrait || token.url : token.url,
      name: enemyId ? enemy?.name || token.name : token.name,
      customName: showName ? name : '',
      showName,
      controlledBy,
      barsVisibility,
      auraRadius,
      auraShape,
      auraColor,
      auraOpacity,
      auraVisibility,
      opacity: tokenOpacity,
      tintColor,
      tintOpacity,
      light: {
        enabled: lightEnabled,
        radius: lightRadius,
        color: lightColor,
        opacity: lightOpacity,
      },
      vision: {
        enabled: visionEnabled,
        range: visionRange,
      },
      syncWithPlayer,
    };
    console.log('Updating token with vision:', visionEnabled, updatedToken);
    onUpdate(updatedToken);
  };

  // useEffect para cambios inmediatos (no relacionados con texto/luz)
  useEffect(() => {
    applyChanges();
  }, [
    enemyId,
    showName,
    controlledBy,
    barsVisibility,
    auraRadius,
    auraShape,
    auraColor,
    auraOpacity,
    auraVisibility,
    tokenOpacity,
    tintColor,
    tintOpacity,
    lightEnabled,
    lightRadius,
    visionEnabled // Cambio inmediato para visión
  ]);

  const firstSyncRef = useRef(true);
  useEffect(() => {
    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      return;
    }
    applyChanges();
  }, [syncWithPlayer]);

  // useEffect con debouncing para cambios de texto y luz (para evitar spam a Firebase)
  useEffect(() => {
    debouncedApplyChanges();
  }, [name, lightColor, lightOpacity, debouncedApplyChanges]);

  // Función para agregar el token al sistema de velocidad
  const addToInitiativeSystem = async () => {
    try {
      const initiativeRef = doc(db, 'initiative', 'current');
      const initiativeDoc = await getDoc(initiativeRef);

      let participants = [];
      if (initiativeDoc.exists()) {
        participants = initiativeDoc.data().participants || [];
      }

      // Verificar si ya existe un participante con el mismo nombre
      const tokenDisplayName = showName && name ? name : (token.name || 'Token sin nombre');
      const existingParticipant = participants.find(p => p.name === tokenDisplayName);

      if (existingParticipant) {
        alert(`Ya existe un participante llamado "${tokenDisplayName}" en el sistema de velocidad.`);
        return;
      }

      // Crear nuevo participante
      const newParticipant = {
        id: Date.now().toString(),
        name: tokenDisplayName,
        speed: 0,
        type: controlledBy === 'master' ? 'enemy' : 'player',
        addedBy: controlledBy === 'master' ? 'master' : controlledBy
      };

      // Agregar al sistema
      const updatedParticipants = [...participants, newParticipant];
      await updateDoc(initiativeRef, { participants: updatedParticipants });

      alert(`"${tokenDisplayName}" ha sido agregado al sistema de velocidad.`);
    } catch (error) {
      console.error('Error al agregar al sistema de velocidad:', error);
      alert('Error al agregar al sistema de velocidad. Inténtalo de nuevo.');
    }
  };

  // Verificar permisos para jugadores
  const canEditToken = !isPlayerView || token.controlledBy === currentPlayerName;

  if (!token) return null;

  // Si es vista de jugador y no puede editar este token, no mostrar nada
  if (isPlayerView && !canEditToken) {
    return null;
  }

  const content = (
    <div className="fixed select-none" style={{ top: pos.y, left: pos.x, zIndex: 1000 }}>
      <div className="bg-gray-800 border border-gray-700 rounded shadow-xl w-80">
        <div className="flex justify-between items-center bg-gray-700 px-2 py-1 cursor-move" onMouseDown={handleMouseDown}>
          <span className="font-bold">Ajustes de ficha</span>
          <button onClick={() => { applyChanges(); onClose(); }} className="text-gray-400 hover:text-red-400">
            <FiX />
          </button>
        </div>
        <div className="flex border-b border-gray-600 text-sm">
          <button onClick={() => setTab('details')} className={`flex-1 p-2 ${tab==='details' ? 'bg-gray-800' : 'bg-gray-700'}`}>Detalles</button>
          <button onClick={() => setTab('notes')} className={`flex-1 p-2 ${tab==='notes' ? 'bg-gray-800' : 'bg-gray-700'}`}>Notas</button>
          <button onClick={() => setTab('light')} className={`flex-1 p-2 ${tab==='light' ? 'bg-gray-800' : 'bg-gray-700'}`}>Iluminación</button>
          <button onClick={() => setTab('aura')} className={`flex-1 p-2 ${tab==='aura' ? 'bg-gray-800' : 'bg-gray-700'}`}>Aura</button>
        </div>
        <div className="p-3 space-y-3 text-sm">
          {tab === 'details' && (
            <>
              {/* Solo mostrar selector de enemigos para masters */}
              {!isPlayerView && (
                <div>
                  <label className="block mb-1">Representa a un personaje</label>
                  {controlledBy !== 'master' ? (
                    <div className="w-full bg-gray-600 text-gray-300 p-2 rounded border">
                      {controlledBy}
                    </div>
                  ) : (
                    <select value={enemyId} onChange={(e) => setEnemyId(e.target.value)} className="w-full bg-gray-700 text-white">
                      <option value="">Ninguno / Ficha genérica</option>
                      {enemies.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input id="showName" type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} />
                <label htmlFor="showName">Nombre</label>
                <Input className="flex-1" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1">
                  {isPlayerView ? "Ficha de Personaje" : "Controlado por"}
                </label>
                {isPlayerView ? (
                  <div className="w-full bg-gray-600 text-gray-300 p-2 rounded border">
                    {controlledBy === 'master' ? 'Enemigo (Master)' : controlledBy}
                  </div>
                ) : (
                  <select value={controlledBy} onChange={handleControlledByChange} className="w-full bg-gray-700 text-white">
                    <option value="master">Máster</option>
                    {players.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="syncWithPlayer"
                  type="checkbox"
                  checked={syncWithPlayer}
                  onChange={e => setSyncWithPlayer(e.target.checked)}
                />
                <label htmlFor="syncWithPlayer">Sincronizar con ficha de jugador</label>
                {controlledBy !== 'master' && (
                  <Boton size="sm" className="ml-auto" onClick={() => loadPlayerSheet(controlledBy)}>
                    Actualizar ficha
                  </Boton>
                )}
              </div>
              <div>
                <label className="block mb-1">Barras visibles para</label>
                <select value={barsVisibility} onChange={e => setBarsVisibility(e.target.value)} className="w-full bg-gray-700 text-white">
                  <option value="all">Todos</option>
                  <option value="controlled">Controlador</option>
                  <option value="none">Nadie</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  El Master siempre puede ver las barras independientemente de esta configuración
                </p>
              </div>
              <div>
                <label className="block mb-1">Opacidad del token</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tokenOpacity}
                  onChange={e => setTokenOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-right">{Math.round(tokenOpacity * 100)}%</div>
              </div>
              <div>
                <label className="block mb-1">Color de tinte</label>
                <input type="color" value={tintColor} onChange={e => setTintColor(e.target.value)} className="w-full h-8 p-0 border-0" />
              </div>
              <div>
                <label className="block mb-1">Opacidad del tinte</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tintOpacity}
                  onChange={e => setTintOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-right">{Math.round(tintOpacity * 100)}%</div>
              </div>
              <div className="text-center">
                <Boton
                  onClick={() => {
                    const enemy = enemies.find((e) => e.id === enemyId);
                    const updated = {
                      ...token,
                      enemyId: enemyId || null,
                      url: enemyId ? enemy?.portrait || token.url : token.url,
                      name: enemyId ? enemy?.name : token.name,
                      customName: showName ? name : '',
                      showName,
                      controlledBy,
                      barsVisibility,
                      auraRadius,
                      auraShape,
                      auraColor,
                      auraOpacity,
                      auraVisibility,
                      opacity: tokenOpacity,
                      tintColor,
                      tintOpacity,
                      syncWithPlayer,
                  };
                  onOpenSheet(updated);
                }}
              >
                Abrir ficha de personaje
              </Boton>
              <Boton
                onClick={addToInitiativeSystem}
                size="sm"
                color="green"
                className="mt-2"
              >
                ⚡ Añadir al Sistema de Velocidad
              </Boton>
              <div className="flex justify-center gap-2 mt-2">
                <Boton size="sm" onClick={() => onMoveBack?.()}>Bajar capa</Boton>
                <Boton size="sm" onClick={() => onMoveFront?.()}>Subir capa</Boton>
              </div>
              </div>
            </>
          )}
          {tab === 'aura' && (
            <>
              <div>
                <label className="block mb-1">Radio en casillas</label>
                <Input type="number" value={auraRadius} onChange={e => setAuraRadius(parseInt(e.target.value,10) || 0)} />
              </div>
              <div>
                <label className="block mb-1">Forma</label>
                <select value={auraShape} onChange={e => setAuraShape(e.target.value)} className="w-full bg-gray-700 text-white">
                  <option value="circle">Círculo</option>
                  <option value="square">Cuadrado</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Color</label>
                <input type="color" value={auraColor} onChange={e => setAuraColor(e.target.value)} className="w-full h-8 p-0 border-0" />
              </div>
              <div>
                <label className="block mb-1">Opacidad</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={auraOpacity}
                  onChange={e => setAuraOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-right">{Math.round(auraOpacity * 100)}%</div>
              </div>
              <div>
                <label className="block mb-1">Visible para</label>
                <select
                  value={auraVisibility}
                  onChange={e => setAuraVisibility(e.target.value)}
                  className="w-full bg-gray-700 text-white"
                >
                  <option value="all">Todos</option>
                  <option value="controlled">Controlador</option>
                  <option value="none">Nadie</option>
                </select>
              </div>
            </>
          )}
          {tab === 'light' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  id="lightEnabled"
                  type="checkbox"
                  checked={lightEnabled}
                  onChange={e => setLightEnabled(e.target.checked)}
                />
                <label htmlFor="lightEnabled">Emite luz</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="visionEnabled"
                  type="checkbox"
                  checked={visionEnabled}
                  onChange={e => {
                    console.log('Vision changed:', e.target.checked);
                    setVisionEnabled(e.target.checked);
                  }}
                />
                <label htmlFor="visionEnabled">Tiene visión</label>
              </div>

              {visionEnabled && (
                <div>
                  <label className="block mb-1">Rango de visión (casillas)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={visionRange}
                    onChange={e => setVisionRange(parseInt(e.target.value, 10) || 1)}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    👁️ Distancia máxima que puede ver este token. Los muros bloquearán la visión.
                  </div>
                </div>
              )}

              {lightEnabled && (
                <>
                  <div>
                    <label className="block mb-1">Radio de luz (casillas)</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="20" 
                      value={lightRadius} 
                      onChange={e => setLightRadius(parseInt(e.target.value, 10) || 1)} 
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Color de la luz</label>
                    <div className="flex gap-2 mb-2">
                      <button 
                        onClick={() => setLightColor('#ffa500')} 
                        className="w-8 h-8 rounded border-2 border-gray-400" 
                        style={{backgroundColor: '#ffa500'}} 
                        title="Antorcha (naranja cálido)"
                      />
                      <button 
                        onClick={() => setLightColor('#ffff88')} 
                        className="w-8 h-8 rounded border-2 border-gray-400" 
                        style={{backgroundColor: '#ffff88'}} 
                        title="Vela (amarillo suave)"
                      />
                      <button 
                        onClick={() => setLightColor('#87ceeb')} 
                        className="w-8 h-8 rounded border-2 border-gray-400" 
                        style={{backgroundColor: '#87ceeb'}} 
                        title="Luz mágica (azul)"
                      />
                      <button 
                        onClick={() => setLightColor('#ffffff')} 
                        className="w-8 h-8 rounded border-2 border-gray-400" 
                        style={{backgroundColor: '#ffffff'}} 
                        title="Luz brillante (blanco)"
                      />
                    </div>
                    <input 
                      type="color" 
                      value={lightColor} 
                      onChange={e => setLightColor(e.target.value)} 
                      className="w-full h-8 p-0 border-0" 
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Intensidad de la luz</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={lightOpacity}
                      onChange={e => setLightOpacity(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-right">{Math.round(lightOpacity * 100)}%</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    💡 La luz revelará áreas ocultas por muros y creará zonas iluminadas realistas
                  </div>
                </>
              )}
            </>
          )}
          {tab === 'notes' && (
            <div className="text-gray-400">(Funcionalidad de notas pendiente)</div>
          )}
          {tab !== 'details' && tab !== 'aura' && tab !== 'light' && tab !== 'notes' && (
            <div className="text-gray-400">(Sin contenido)</div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

TokenSettings.propTypes = {
  token: PropTypes.object,
  enemies: PropTypes.array,
  players: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onOpenSheet: PropTypes.func.isRequired,
  onMoveFront: PropTypes.func,
  onMoveBack: PropTypes.func,
  isPlayerView: PropTypes.bool,
  currentPlayerName: PropTypes.string,
};

export default TokenSettings;
