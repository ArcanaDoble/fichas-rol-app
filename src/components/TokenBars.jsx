import React, { useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Group, Rect } from 'react-konva';
import { getResourceColors } from './ResourceBar';

const CAPSULE_W = 18;
const BAR_HEIGHT = 8;
const GAP = 2;

const TokenBars = ({ tokenRef, stageRef, onStatClick, transformKey }) => {
  const [layout, setLayout] = useState({ x: 0, top: 0, bottom: 0 });
  const [stats, setStats] = useState({});

  const update = () => {
    if (!tokenRef?.node || !stageRef.current) return;
    const rect = tokenRef.node.getClientRect({ relativeTo: stageRef.current });
    setLayout({ x: rect.x + rect.width / 2, top: rect.y, bottom: rect.y + rect.height });
    if (tokenRef.getStats) setStats(tokenRef.getStats());
  };

  useLayoutEffect(update, [tokenRef, stageRef, transformKey]);

  const renderRow = ([key, v], rowIdx, anchor) => {
    const max = v.total ?? v.base ?? 0;
    const current = Math.min(v.actual ?? 0, max);
    const colors = getResourceColors({ color: v.color || '#ffffff', penalizacion: 0, actual: current, base: 0, buff: 0, max });
    const rowWidth = max * CAPSULE_W + (max - 1) * GAP;
    const baseOffset = 8 + rowIdx * (BAR_HEIGHT + 2);
    const yPos = anchor === 'top' ? layout.top - baseOffset : layout.bottom + baseOffset;
    return (
      <Group key={key} x={layout.x - rowWidth / 2} y={yPos} listening>
        {colors.map((c, i) => (
          <Rect
            key={i}
            x={i * (CAPSULE_W + GAP)}
            width={CAPSULE_W}
            height={BAR_HEIGHT}
            fill={c}
            stroke="#1f2937"
            strokeWidth={2}
            cornerRadius={BAR_HEIGHT / 2}
            onClick={(e) => onStatClick(key, e)}
          />
        ))}
      </Group>
    );
  };

  const entries = Object.entries(stats);
  const topStats = entries
    .filter(([, v]) => v && v.showOnToken && (v.tokenAnchor ?? 'top') === 'top')
    .sort((a, b) => (a[1].tokenRow ?? 0) - (b[1].tokenRow ?? 0));
  const bottomStats = entries
    .filter(([, v]) => v && v.showOnToken && (v.tokenAnchor ?? 'top') === 'bottom')
    .sort((a, b) => (a[1].tokenRow ?? 0) - (b[1].tokenRow ?? 0));

  return (
    <>
      {topStats.map((entry, i) => renderRow(entry, i, 'top'))}
      {bottomStats.map((entry, i) => renderRow(entry, i, 'bottom'))}
    </>
  );
};

TokenBars.propTypes = {
  tokenRef: PropTypes.shape({ node: PropTypes.object, getStats: PropTypes.func }),
  stageRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  onStatClick: PropTypes.func.isRequired,
  transformKey: PropTypes.string,
};

export default TokenBars;
