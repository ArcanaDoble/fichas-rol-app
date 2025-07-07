import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import Boton from './Boton';
import Input from './Input';

const TokenSettings = ({ token, enemies = [], players = [], onClose, onUpdate, onOpenSheet }) => {
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

  const applyChanges = () => {
    const enemy = enemies.find((e) => e.id === enemyId);
    onUpdate({
      ...token,
      enemyId: enemyId || null,
      url: enemyId ? enemy?.portrait || token.url : token.url,
      name: enemyId ? enemy?.name : token.name,
      customName: showName ? name : '',
      showName,
      controlledBy,
    });
  };

  if (!token) return null;

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
        </div>
        <div className="p-3 space-y-3 text-sm">
          {tab === 'details' && (
            <>
              <div>
                <label className="block mb-1">Representa a un personaje</label>
                <select value={enemyId} onChange={(e) => setEnemyId(e.target.value)} className="w-full bg-gray-700 text-white">
                  <option value="">Ninguno / Ficha genérica</option>
                  {enemies.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="showName" type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} />
                <label htmlFor="showName">Nombre</label>
                <Input className="flex-1" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1">Controlado por</label>
                <select value={controlledBy} onChange={e => setControlledBy(e.target.value)} className="w-full bg-gray-700 text-white">
                  <option value="master">Máster</option>
                  {players.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
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
                    };
                    onUpdate(updated);
                    onOpenSheet(updated);
                  }}
                >
                  Abrir ficha de personaje
                </Boton>
              </div>
            </>
          )}
          {tab !== 'details' && (
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
};

export default TokenSettings;
