import React from 'react';
import PropTypes from 'prop-types';

export const DEFAULT_MAX = 20;

export function getResourceColors({ color, penalizacion = 0, actual = 0, base = 0, buff = 0, max = DEFAULT_MAX }) {
  const baseEfectiva = Math.max(0, base - penalizacion);
  const buffLimit = Math.min(buff, max - baseEfectiva);

  return Array.from({ length: max }, (_, i) => {
    if (i < penalizacion) return '#f87171aa';
    if (i < penalizacion + actual) return color;
    if (i < penalizacion + baseEfectiva) return color + '55';
    if (i < penalizacion + baseEfectiva + buffLimit) return '#facc15';
    return 'transparent';
  });
}

const ResourceBar = ({
  color,
  penalizacion = 0,
  actual = 0,
  base = 0,
  buff = 0,
  max = DEFAULT_MAX,
}) => {
  const circles = getResourceColors({ color, penalizacion, actual, base, buff, max });

  return (
    <div
      className="w-full h-5 bg-gray-700/60 rounded-lg grid gap-[2px] p-[2px]"
      style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
    >
      {circles.map((bg, i) => (
        <div
          key={i}
          className="rounded-full border border-gray-800 transition-all duration-300"
          style={{ background: bg }}
        />
      ))}
    </div>
  );
};

ResourceBar.propTypes = {
  color: PropTypes.string.isRequired,
  penalizacion: PropTypes.number,
  actual: PropTypes.number,
  base: PropTypes.number,
  buff: PropTypes.number,
  max: PropTypes.number,
};

export default ResourceBar;
