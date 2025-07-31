import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { ensureSheetDefaults, saveTokenSheet } from '../utils/token';

const TokenBarMenu = ({ token, onClose, onUpdate }) => {
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    const load = () => {
      if (!token?.tokenSheetId) return;
      const stored = localStorage.getItem('tokenSheets');
      const sheets = stored ? JSON.parse(stored) : {};
      const data = sheets[token.tokenSheetId] || { id: token.tokenSheetId, stats: {} };
      const normalized = ensureSheetDefaults({ ...data, id: token.tokenSheetId });
      setSheet(normalized);
    };
    load();
    const handler = (e) => {
      if (e.detail && e.detail.id === token.tokenSheetId) {
        const normalized = ensureSheetDefaults(e.detail);
        setSheet(normalized);
      }
    };
    window.addEventListener('tokenSheetSaved', handler);
    return () => window.removeEventListener('tokenSheetSaved', handler);
  }, [token]);

  const persist = (next) => {
    setSheet(next);
    saveTokenSheet(next);
    onUpdate(token);
  };

  const toggleShow = (key) => {
    if (!sheet) return;
    const stat = sheet.stats[key] || {};
    const updatedStat = { ...stat, showOnToken: !stat.showOnToken };
    const next = { ...sheet, stats: { ...sheet.stats, [key]: updatedStat } };
    persist(next);
  };

  const adjustStat = (key, delta) => {
    if (!sheet) return;
    const stat = sheet.stats[key] || {};
    const max = stat.total ?? stat.base ?? stat.actual ?? 0;
    const updatedStat = {
      ...stat,
      actual: Math.max(0, Math.min(max, (stat.actual || 0) + delta)),
    };
    const next = { ...sheet, stats: { ...sheet.stats, [key]: updatedStat } };
    persist(next);
  };

  if (!sheet) return null;

  const content = (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded shadow-xl p-4 max-w-md">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Barras</span>
          <button onClick={onClose} className="text-gray-400 hover:text-red-400">
            <FiX />
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(sheet.stats).map(([key, stat]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!stat.showOnToken}
                onChange={() => toggleShow(key)}
              />
              <span className="flex-1">{stat.label || key}</span>
              <button
                className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                onClick={() => adjustStat(key, -1)}
              >
                −
              </button>
              <span className="w-8 text-center">{stat.actual ?? 0}</span>
              <button
                className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                onClick={() => adjustStat(key, 1)}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

TokenBarMenu.propTypes = {
  token: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default TokenBarMenu;

