import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import Input from './Input';
import Boton from './Boton';
import AtributoCard from './AtributoCard';
import KarmaBar from './KarmaBar';
import {
  ensureKarmaStat,
  isYuuzuName,
  KARMA_KEY,
  KARMA_MIN,
  KARMA_MAX,
  clampKarma,
  formatKarmaValue,
  getKarmaStatus,
} from '../utils/karma';

const atributos = ['destreza', 'vigor', 'intelecto', 'voluntad'];
const atributoColor = {
  destreza: '#34d399',
  vigor: '#f87171',
  intelecto: '#60a5fa',
  voluntad: '#a78bfa',
};
const dadoImgUrl = (d) => `/dados/${d}.png`;

const normalizeText = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const levenshteinDistance = (a = '', b = '') => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[a.length][b.length];
};

const getRankedMatches = (items = [], query = '') => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return items
    .filter((item) => item && item.nombre)
    .map((item) => {
      const normalizedName = normalizeText(item.nombre);
      const distance = levenshteinDistance(normalizedName, normalizedQuery);
      const maxLength = Math.max(normalizedName.length, normalizedQuery.length, 1);
      const similarity = 1 - distance / maxLength;
      const startsWithScore = normalizedName.startsWith(normalizedQuery) ? 0.35 : 0;
      const includesScore = normalizedName.includes(normalizedQuery) ? 0.25 : 0;
      const wordStartScore = normalizedName
        .split(/\s+|-/)
        .some((word) => word.startsWith(normalizedQuery))
        ? 0.25
        : 0;

      return {
        item,
        score: similarity + startsWithScore + includesScore + wordStartScore,
      };
    })
    .sort((a, b) => {
      if (b.score === a.score) {
        return normalizeText(a.item.nombre).localeCompare(normalizeText(b.item.nombre));
      }
      return b.score - a.score;
    });
};

const TokenSheetEditor = ({
  sheet,
  onClose,
  onSave,
  armas = [],
  armaduras = [],
  habilidades = [],
}) => {
  const [data, setData] = useState(sheet || null);
  const [newWeapon, setNewWeapon] = useState('');
  const [newArmor, setNewArmor] = useState('');
  const [newPower, setNewPower] = useState('');
  const [weaponError, setWeaponError] = useState('');
  const [armorError, setArmorError] = useState('');
  const [powerError, setPowerError] = useState('');

  useEffect(() => {
    if (!sheet) {
      setData(null);
      return;
    }
    const normalized = {
      ...sheet,
      stats: ensureKarmaStat(sheet.stats, sheet.name),
    };
    setData(normalized);
  }, [sheet]);

  if (!sheet || !data) return null;

  const isYuuzu = isYuuzuName(data?.name || sheet?.name);

  const updateStat = (stat, field, value) => {
    setData(prev => {
      const updated = { ...prev.stats[stat] };
      if (isYuuzu && stat === KARMA_KEY) {
        if (field === 'actual') {
          updated.actual = clampKarma(value);
        }
        return {
          ...prev,
          stats: ensureKarmaStat({
            ...prev.stats,
            [stat]: updated,
          }, prev.name || sheet?.name),
        };
      }
      if (field === 'showOnToken') {
        updated.showOnToken = value;
      } else if (field === 'color') {
        updated.color = value;
      } else if (field === 'label') {
        updated.label = value;
      } else if (field === 'tokenRow') {
        updated.tokenRow = parseInt(value, 10) || 0;
      } else if (field === 'tokenAnchor') {
        updated.tokenAnchor = value;
      } else {
        const num = parseInt(value, 10) || 0;
        updated[field] = num;
        if (field === 'base' && updated.buff == null) {
          updated.total = num;
        }
      }
      return {
        ...prev,
        stats: ensureKarmaStat({
          ...prev.stats,
          [stat]: updated,
        }, prev.name || sheet?.name),
      };
    });
  };

  const removeStat = stat => {
    setData(prev => {
      if (isYuuzu && stat === KARMA_KEY) {
        return prev;
      }
      const copy = { ...prev.stats };
      delete copy[stat];
      let list = prev.resourcesList;
      if (Array.isArray(list)) {
        list = list.filter(r => r.id !== stat);
      }
      return {
        ...prev,
        stats: ensureKarmaStat(copy, prev.name || sheet?.name),
        resourcesList: list,
      };
    });
  };

  const adjustKarma = (delta) => {
    if (!isYuuzu) return;
    setData((prev) => {
      const current = clampKarma(prev.stats?.[KARMA_KEY]?.actual ?? 0);
      const next = clampKarma(current + delta);
      if (next === current) return prev;
      const stats = ensureKarmaStat(
        {
          ...prev.stats,
          [KARMA_KEY]: {
            ...(prev.stats?.[KARMA_KEY] || {}),
            actual: next,
          },
        },
        prev.name || sheet?.name,
      );
      return { ...prev, stats };
    });
  };

  const setKarmaValue = (value) => {
    if (!isYuuzu) return;
    setData((prev) => {
      const next = clampKarma(value);
      const current = clampKarma(prev.stats?.[KARMA_KEY]?.actual ?? 0);
      if (next === current) return prev;
      const stats = ensureKarmaStat(
        {
          ...prev.stats,
          [KARMA_KEY]: {
            ...(prev.stats?.[KARMA_KEY] || {}),
            actual: next,
          },
        },
        prev.name || sheet?.name,
      );
      return { ...prev, stats };
    });
  };

  const updateAtributo = (attr, value) => {
    setData((prev) => ({
      ...prev,
      atributos: {
        ...prev.atributos,
        [attr]: value,
      },
    }));
  };

  const addItem = (type, selectedItem) => {
    const value =
      type === 'weapon'
        ? newWeapon.trim()
        : type === 'armor'
        ? newArmor.trim()
        : newPower.trim();
    if (!value && !selectedItem) return;
    const list =
      type === 'weapon' ? armas : type === 'armor' ? armaduras : habilidades;

    const matches = selectedItem ? [{ item: selectedItem }] : getRankedMatches(list, value);
    const found = matches[0]?.item;
    if (!found) {
      if (type === 'weapon') setWeaponError('No se encontró un arma similar');
      if (type === 'armor') setArmorError('No se encontró una armadura similar');
      if (type === 'power') setPowerError('No se encontró un poder similar');
      return;
    }
    const collectionKey =
      type === 'weapon' ? 'weapons' : type === 'armor' ? 'armaduras' : 'poderes';

    setData((prev) => {
      const current = prev[collectionKey] || [];
      const alreadyEquipped = current.some(
        (item) => normalizeText(item?.nombre) === normalizeText(found.nombre)
      );

      if (alreadyEquipped) {
        return prev;
      }

      return {
        ...prev,
        [collectionKey]: [...current, found],
      };
    });
    if (type === 'weapon') {
      setNewWeapon('');
      setWeaponError('');
    }
    if (type === 'armor') {
      setNewArmor('');
      setArmorError('');
    }
    if (type === 'power') {
      setNewPower('');
      setPowerError('');
    }
  };

  const removeItem = (type, index) => {
    setData(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter((_, i) => i !== index),
    }));
  };

  const weaponSuggestions = useMemo(
    () => getRankedMatches(armas, newWeapon).slice(0, 5),
    [armas, newWeapon]
  );
  const armorSuggestions = useMemo(
    () => getRankedMatches(armaduras, newArmor).slice(0, 5),
    [armaduras, newArmor]
  );
  const powerSuggestions = useMemo(
    () => getRankedMatches(habilidades, newPower).slice(0, 5),
    [habilidades, newPower]
  );

  const renderEquipSection = ({
    title,
    type,
    placeholder,
    selectedItems,
    newValue,
    setNewValue,
    suggestions,
    error,
    removeKey,
  }) => (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="relative mb-3">
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem(type);
              }
            }}
            className="flex-1 text-sm"
          />
          <Boton size="sm" onClick={() => addItem(type)}>Agregar</Boton>
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto z-10">
            {suggestions.map(({ item }) => (
              <li
                key={item.nombre}
                className="px-4 py-1 cursor-pointer hover:bg-gray-700 text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addItem(type, item)}
              >
                {item.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2 mb-2 max-h-56 overflow-y-auto pr-1">
        {selectedItems.map((elemento, index) => (
          <div key={`${elemento?.nombre || 'item'}-${index}`} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
            <span className="flex-1 text-sm">{elemento?.nombre || 'Elemento sin nombre'}</span>
            <Boton size="sm" color="red" onClick={() => removeItem(removeKey, index)}>✕</Boton>
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );

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
          {data.atributos && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Atributos</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {atributos.map((attr) => (
                  <AtributoCard
                    key={attr}
                    name={attr}
                    value={data.atributos[attr] || 'D4'}
                    color={atributoColor[attr]}
                    dadoImgUrl={dadoImgUrl}
                    onChange={(v) => updateAtributo(attr, v)}
                  />
                ))}
              </div>
            </div>
          )}
          {data.stats && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Estadísticas</label>
              <div className="space-y-3">
                {Object.entries(data.stats).map(([stat, value]) => {
                  const isKarma = isYuuzu && (stat === KARMA_KEY || value?.type === 'karma');
                  if (isKarma) {
                    const karmaValue = clampKarma(value?.actual ?? 0);
                    return (
                      <div key={stat} className="bg-gray-800 p-4 rounded-lg space-y-3 border border-gray-600/60">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold tracking-wide">Karma</span>
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded-full ${
                              karmaValue === 0
                                ? 'border border-gray-500 text-gray-300'
                                : karmaValue > 0
                                  ? 'bg-white text-gray-900'
                                  : 'bg-black text-gray-100'
                            }`}
                          >
                            {getKarmaStatus(karmaValue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Boton
                            color="gray"
                            className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                            onClick={() => adjustKarma(-1)}
                            disabled={karmaValue <= KARMA_MIN}
                          >
                            –
                          </Boton>
                          <div className="flex-1">
                            <KarmaBar value={karmaValue} />
                          </div>
                          <Boton
                            color="green"
                            className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                            onClick={() => adjustKarma(1)}
                            disabled={karmaValue >= KARMA_MAX}
                          >
                            +
                          </Boton>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-200">
                          <span className="text-2xl font-black tracking-tight">
                            {formatKarmaValue(karmaValue)}
                          </span>
                          <Input
                            type="number"
                            min={KARMA_MIN}
                            max={KARMA_MAX}
                            value={karmaValue}
                            onChange={(e) => setKarmaValue(e.target.value)}
                            className="w-16 text-center bg-gray-700 border-gray-600 text-white text-sm"
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          Ajusta el karma de Yuuzu entre {KARMA_MIN} y {KARMA_MAX}.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div key={stat} className="bg-gray-700 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          type="text"
                          value={value.label || stat}
                          onChange={e => updateStat(stat, 'label', e.target.value)}
                        className="flex-1 text-sm bg-gray-600 border-gray-500 text-white"
                      />
                      <Boton size="sm" color="red" onClick={() => removeStat(stat)}>✕</Boton>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={value.base ?? value.total ?? 0}
                          onChange={e => updateStat(stat, 'base', e.target.value)}
                          className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                          min="0"
                        />
                        <span className="text-gray-400 text-xs">/</span>
                        <Input
                          type="number"
                          value={value.actual || 0}
                          onChange={e => updateStat(stat, 'actual', e.target.value)}
                          className="w-16 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                          min="0"
                        />
                      </div>
                      <Input
                        type="number"
                        className="w-12 h-6 text-center bg-gray-600 border-gray-500 text-white text-xs"
                        value={value.tokenRow ?? 0}
                        onChange={e => updateStat(stat, 'tokenRow', e.target.value)}
                        title="Fila"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={value.showOnToken ?? true}
                          onChange={e => updateStat(stat, 'showOnToken', e.target.checked)}
                        />
                        Mostrar en token
                      </label>
                      <select
                        value={value.tokenAnchor || 'top'}
                        onChange={e => updateStat(stat, 'tokenAnchor', e.target.value)}
                        className="bg-gray-600 text-white text-xs border-gray-500 h-5 px-1 rounded"
                      >
                        <option value="top">Arriba</option>
                        <option value="bottom">Abajo</option>
                      </select>
                      <input
                        type="color"
                        value={value.color || '#ffffff'}
                        onChange={e => updateStat(stat, 'color', e.target.value)}
                        className="w-8 h-5 p-0 border-none bg-transparent"
                      />
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Weapons */}
          {renderEquipSection({
            title: 'Armas Equipadas',
            type: 'weapon',
            placeholder: 'Nombre del arma',
            selectedItems: data.weapons || [],
            newValue: newWeapon,
            setNewValue: setNewWeapon,
            suggestions: weaponSuggestions,
            error: weaponError,
            removeKey: 'weapons',
          })}
          {/* Armors */}
          {renderEquipSection({
            title: 'Armaduras Equipadas',
            type: 'armor',
            placeholder: 'Nombre de la armadura',
            selectedItems: data.armaduras || [],
            newValue: newArmor,
            setNewValue: setNewArmor,
            suggestions: armorSuggestions,
            error: armorError,
            removeKey: 'armaduras',
          })}
          {/* Powers */}
          {renderEquipSection({
            title: 'Poderes Equipados',
            type: 'power',
            placeholder: 'Nombre del poder',
            selectedItems: data.poderes || [],
            newValue: newPower,
            setNewValue: setNewPower,
            suggestions: powerSuggestions,
            error: powerError,
            removeKey: 'poderes',
          })}
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
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
};

export default TokenSheetEditor;
