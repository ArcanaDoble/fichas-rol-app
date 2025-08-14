import React, { useState } from 'react';
import PropTypes from 'prop-types';
import * as icons from 'lucide-react';

const iconList = Object.keys(icons).filter((name) => /^[A-Z]/.test(name));

const LucideIconPicker = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const filtered = iconList.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="bg-gray-800 border border-gray-600 rounded p-2">
      <input
        type="text"
        placeholder="Buscar icono"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-2 p-1 rounded bg-gray-700 text-sm text-white"
      />
      <div className="max-h-48 overflow-y-auto grid grid-cols-6 gap-2">
        {filtered.map((name) => {
          const Icon = icons[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

LucideIconPicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default LucideIconPicker;

