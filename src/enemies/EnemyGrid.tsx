import React, { useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import EnemyCard, { EnemyCardProps } from './EnemyCard';

export interface EnemyGridProps {
  enemies: EnemyCardProps[];
  columnWidth?: number;
  rowHeight?: number;
}

const EnemyGrid: React.FC<EnemyGridProps> = ({ enemies, columnWidth = 260, rowHeight = 220 }) => {
  const columnCount = useMemo(() => Math.floor(window.innerWidth / columnWidth) || 1, [columnWidth]);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= enemies.length) return null;
    const enemy = enemies[index];
    return (
      <div style={{ ...style, padding: '0.5rem' }}>
        <EnemyCard {...enemy} />
      </div>
    );
  };

  const rowCount = Math.ceil(enemies.length / columnCount);

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={600}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={window.innerWidth}
    >
      {Cell}
    </Grid>
  );
};

export default EnemyGrid;
