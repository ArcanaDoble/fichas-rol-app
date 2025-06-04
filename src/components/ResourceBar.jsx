import React from 'react';

const RESOURCE_MAX = 20;

const ResourceBar = ({ color, penalizacion = 0, actual = 0, base = 0, buff = 0 }) => {
  const baseEfectiva = Math.max(0, base - penalizacion);
  const buffLimit = Math.min(buff, RESOURCE_MAX - baseEfectiva);

  const circles = Array.from({ length: RESOURCE_MAX }, (_, i) => {
    if (i < penalizacion) return '#f87171aa';
    if (i < penalizacion + actual) return color;
    if (i < penalizacion + baseEfectiva) return color + '55';
    if (i < penalizacion + baseEfectiva + buffLimit) return '#facc15';
    return 'transparent';
  });

  return (
    <div
      className="w-full h-4 bg-gray-700 rounded-lg grid gap-[2px] p-[2px]"
      style={{ gridTemplateColumns: `repeat(${RESOURCE_MAX}, minmax(0, 1fr))` }}
    >
      {circles.map((bg, i) => (
        <div
          key={i}
          className="rounded-full transition-colors duration-300"
          style={{ background: bg }}
        />
      ))}
    </div>
  );
};

export default ResourceBar;
