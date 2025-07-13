import React from 'react';
import PropTypes from 'prop-types';
import { FiMousePointer, FiEdit2, FiRuler, FiType } from 'react-icons/fi';

const tools = [
  { id: 'select', icon: FiMousePointer },
  { id: 'draw', icon: FiEdit2 },
  { id: 'measure', icon: FiRuler },
  { id: 'text', icon: FiType },
];

const Toolbar = ({ activeTool, onSelect }) => (
  <div className="fixed left-0 top-0 bottom-0 w-12 bg-gray-800 z-50 flex flex-col items-center py-2 space-y-2">
    {tools.map(({ id, icon: Icon }) => (
      <button
        key={id}
        onClick={() => onSelect(id)}
        className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
          activeTool === id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
        }`}
      >
        <Icon />
      </button>
    ))}
  </div>
);

Toolbar.propTypes = {
  activeTool: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default Toolbar;
