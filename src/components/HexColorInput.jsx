import { useState } from 'react';
import PropTypes from 'prop-types';

function HexColorInput({ value, onChange }) {
  const [color, setColor] = useState(value || '#ffffff');

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
    <div className="flex items-center gap-1">
      <input type="color" value={color} onChange={handleColorChange} />
      <input
        type="text"
        value={color}
        onChange={handleHexChange}
        className="w-20 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
      />
    </div>
  );
}

HexColorInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HexColorInput;

