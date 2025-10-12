import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { KARMA_MIN, KARMA_MAX, clampKarma } from '../utils/karma';

const KarmaBar = ({ value, min = KARMA_MIN, max = KARMA_MAX, className = '' }) => {
  const { positiveWidth, negativeWidth } = useMemo(() => {
    const clamped = clampKarma(value);
    const safeMin = Math.min(min, 0);
    const safeMax = Math.max(max, 0);
    const positiveRatio = clamped > 0 && safeMax > 0 ? clamped / safeMax : 0;
    const negativeRatio = clamped < 0 && safeMin < 0 ? Math.abs(clamped / safeMin) : 0;

    return {
      positiveWidth: `${Math.max(0, Math.min(positiveRatio, 1)) * 50}%`,
      negativeWidth: `${Math.max(0, Math.min(negativeRatio, 1)) * 50}%`,
    };
  }, [value, min, max]);

  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-700/80 ${className}`}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-gray-500/60" />
      <div
        className="absolute inset-y-0 left-1/2 bg-white"
        style={{ width: positiveWidth, borderRadius: '0 9999px 9999px 0' }}
      />
      <div
        className="absolute inset-y-0 right-1/2 bg-black"
        style={{ width: negativeWidth, borderRadius: '9999px 0 0 9999px' }}
      />
      <div className="absolute inset-0">
        <div className="grid h-full w-full grid-cols-[repeat(20,_minmax(0,1fr))] opacity-40">
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className="border-r border-gray-600/40" />
          ))}
        </div>
      </div>
    </div>
  );
};

KarmaBar.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  className: PropTypes.string,
};

export default KarmaBar;
