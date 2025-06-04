import React from 'react';

const DEFAULT_MAX = 20;

const ResourceBar = ({
  color,
  penalizacion = 0,
  actual = 0,
  base = 0,
  buff = 0,
  max = DEFAULT_MAX,
}) => {
  const baseEfectiva = Math.max(0, base - penalizacion);
  const buffLimit = Math.min(buff, max - baseEfectiva);

  const circles = Array.from({ length: max }, (_, i) => {
    if (i < penalizacion) return '#f87171aa';
    if (i < penalizacion + actual) return color;
    if (i < penalizacion + baseEfectiva) return color + '55';
    if (i < penalizacion + baseEfectiva + buffLimit) return '#facc15';
    return 'transparent';
  });

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

export default ResourceBar;
