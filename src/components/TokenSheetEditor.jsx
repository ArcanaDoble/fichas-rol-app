import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import Input from './Input';
import Boton from './Boton';

const TokenSheetEditor = ({ sheet, onClose, onSave }) => {
  const [data, setData] = useState(sheet || null);
  const [newWeapon, setNewWeapon] = useState('');
  const [newArmor, setNewArmor] = useState('');
  const [newPower, setNewPower] = useState('');

  useEffect(() => {
    setData(sheet || null);
  }, [sheet]);

  if (!sheet || !data) return null;

  const updateStat = (stat, field, value) => {
    setData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: {
          ...prev.stats[stat],
          [field]: parseInt(value, 10) || 0,
        },
      },
    }));
  };

  const addItem = (type) => {
    const value = type === 'weapon' ? newWeapon.trim() : type === 'armor' ? newArmor.trim() : newPower.trim();
    if (!value) return;
    const item = { nombre: value };
    setData(prev => ({
      ...prev,
      [type === 'weapon' ? 'weapons' : type === 'armor' ? 'armaduras' : 'poderes']: [
        ...(prev[type === 'weapon' ? 'weapons' : type === 'armor' ? 'armaduras' : 'poderes'] || []),
        item,
      ],
    }));
    if (type === 'weapon') setNewWeapon('');
    if (type === 'armor') setNewArmor('');
    if (type === 'power') setNewPower('');
  };

  const removeItem = (type, index) => {
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    onSave?.(data);
  };

  const content = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded shadow-xl max-w-[80vw] max-h-[70vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Editar Ficha de {data.name}</h2>
          <Boton onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded">✕</Boton>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nivel</label>
              <Input
                type="number"
                value={data.nivel || 1}
                onChange={e => setData({ ...data, nivel: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-gray-700 border-gray-600 text-white"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Experiencia</label>
              <Input
                type="number"
                value={data.experiencia || 0}
                onChange={e => setData({ ...data, experiencia: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-gray-700 border-gray-600 text-white"
                min="0"
              />
            </div>
          </div>
          {data.description != null && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
              <textarea
                value={data.description || ''}
                onChange={e => setData({ ...data, description: e.target.value })}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                placeholder="Descripción del personaje"
              />
            </div>
          )}
          {data.stats && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Estadísticas</label>
              <div className="space-y-3">
                {Object.entries(data.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize text-gray-300">{stat}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={value.actual || 0}
                          onChange={e => updateStat(stat, 'actual', e.target.value)}
                          className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                          min="0"
                        />
                        <span className="text-gray-400 text-xs">/</span>
                        <Input
                          type="number"
                          value={value.total || 0}
                          onChange={e => updateStat(stat, 'total', e.target.value)}
                          className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Weapons */}
          <div>
            <h3 className="font-semibold mb-2">Armas Equipadas</h3>
            <div className="space-y-2 mb-2">
              {(data.weapons || []).map((w, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                  <span className="flex-1 text-sm">{w.nombre}</span>
                  <Boton size="sm" color="red" onClick={() => removeItem('weapons', i)}>✕</Boton>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del arma"
                value={newWeapon}
                onChange={e => setNewWeapon(e.target.value)}
                className="flex-1 text-sm"
              />
              <Boton size="sm" onClick={() => addItem('weapon')}>Agregar</Boton>
            </div>
          </div>
          {/* Armors */}
          <div>
            <h3 className="font-semibold mb-2">Armaduras Equipadas</h3>
            <div className="space-y-2 mb-2">
              {(data.armaduras || []).map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                  <span className="flex-1 text-sm">{a.nombre}</span>
                  <Boton size="sm" color="red" onClick={() => removeItem('armaduras', i)}>✕</Boton>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre de la armadura"
                value={newArmor}
                onChange={e => setNewArmor(e.target.value)}
                className="flex-1 text-sm"
              />
              <Boton size="sm" onClick={() => addItem('armor')}>Agregar</Boton>
            </div>
          </div>
          {/* Powers */}
          <div>
            <h3 className="font-semibold mb-2">Poderes Equipados</h3>
            <div className="space-y-2 mb-2">
              {(data.poderes || []).map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                  <span className="flex-1 text-sm">{p.nombre}</span>
                  <Boton size="sm" color="red" onClick={() => removeItem('poderes', i)}>✕</Boton>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del poder"
                value={newPower}
                onChange={e => setNewPower(e.target.value)}
                className="flex-1 text-sm"
              />
              <Boton size="sm" onClick={() => addItem('power')}>Agregar</Boton>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-600">
            <Boton onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white flex-1">Guardar</Boton>
            <Boton onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white flex-1">Cancelar</Boton>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

TokenSheetEditor.propTypes = {
  sheet: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default TokenSheetEditor;
