import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import Boton from './Boton';
import Input from './Input';

const EnemySheet = ({ enemy, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState(enemy || null);

  useEffect(() => {
    setData(enemy || null);
  }, [enemy]);

  if (!enemy || !data) return null;

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

  const handleSave = () => {
    onSave?.(data);
    setIsEditing(false);
  };

  const content = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded shadow-xl max-w-[80vw] max-h-[70vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">👹 Ficha de {data.name}</h2>
          <Boton onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded">✕</Boton>
        </div>
        <div className="space-y-4">
          {data.portrait && (
            <div className="text-center">
              <img src={data.portrait} alt={data.name} className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-gray-600" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nivel</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={data.nivel || 1}
                  onChange={e => setData({ ...data, nivel: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-gray-700 border-gray-600 text-white"
                  min="1"
                />
              ) : (
                <div className="text-white">{data.nivel || 'N/A'}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Experiencia</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={data.experiencia || 0}
                  onChange={e => setData({ ...data, experiencia: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-gray-700 border-gray-600 text-white"
                  min="0"
                />
              ) : (
                <div className="text-white">{data.experiencia || 0}</div>
              )}
            </div>
          </div>
          {data.description && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
              {isEditing ? (
                <textarea
                  value={data.description || ''}
                  onChange={e => setData({ ...data, description: e.target.value })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                  placeholder="Descripción del enemigo"
                />
              ) : (
                <div className="text-white bg-gray-700 p-3 rounded-lg">{data.description}</div>
              )}
            </div>
          )}
          {data.stats && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Estadísticas</label>
                {!isEditing && (
                  <Boton onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs">✏️ Editar</Boton>
                )}
              </div>
              <div className="space-y-3">
                {Object.entries(data.stats).map(([stat, value]) => {
                  const current = value.actual || 0;
                  const max = value.total || 0;
                  return (
                    <div key={stat} className="bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize text-gray-300">{stat}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={current}
                              onChange={e => updateStat(stat, 'actual', e.target.value)}
                              className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                              min="0"
                              max={max}
                            />
                            <span className="text-gray-400 text-xs">/</span>
                            <Input
                              type="number"
                              value={max}
                              onChange={e => updateStat(stat, 'total', e.target.value)}
                              className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                              min="0"
                            />
                          </div>
                        ) : (
                          <span className="text-white font-semibold text-sm">{current}/{max}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-600">
              <Boton onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white flex-1">💾 Guardar Cambios</Boton>
              <Boton onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-500 text-white flex-1">Cancelar</Boton>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

EnemySheet.propTypes = {
  enemy: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func,
};

export default EnemySheet;
