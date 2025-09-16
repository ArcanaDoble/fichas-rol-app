import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function HexColorInput({ value, onChange }) {
  const [color, setColor] = useState(value || '#ffffff');

  useEffect(() => {
    setColor(value || '#ffffff');
  }, [value]);

  const handleColorChange = (e) => {
    const v = e.target.value;
    setColor(v);
    onChange(v);
  };

  const handleHexChange = (e) => {
    const v = e.target.value;
    setColor(v);
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
      onChange(v);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="relative">
        <span
          className="block h-8 w-8 rounded-md border border-gray-600 shadow-inner"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seleccionar color"
        />
      </label>
      <input
        type="text"
        value={color.toUpperCase()}
        onChange={handleHexChange}
        maxLength={7}
        spellCheck={false}
        className="w-[72px] rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-xs uppercase tracking-wide text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
    </div>
  );
}

HexColorInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HexColorInput;

