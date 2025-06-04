import React from 'react';

const RESOURCE_MAX = 20;

const ResourceBar = ({ color, penalizacion = 0, actual = 0, base = 0, buff = 0 }) => {
  const baseEfectiva = Math.max(0, base - penalizacion);
  const buffLimit = Math.min(buff, RESOURCE_MAX - baseEfectiva);

  const segments = [
    { value: penalizacion, bg: '#f87171aa' },
    { value: actual, bg: color },
    { value: Math.max(0, baseEfectiva - actual), bg: color + '55' },
    { value: buffLimit, bg: '#facc15' },
  ];

  let offset = 0;
  return (
    <div className="relative w-full h-4 rounded-lg overflow-hidden bg-gray-700">
      {segments.map((seg, i) => {
        const style = {
          left: `${(offset / RESOURCE_MAX) * 100}%`,
          width: `${(seg.value / RESOURCE_MAX) * 100}%`,
          background: seg.bg,
          transition: 'width 0.3s',
        };
        offset += seg.value;
        return <div key={i} className="absolute top-0 h-full" style={style} />;
      })}
    </div>
  );
};

export default ResourceBar;
