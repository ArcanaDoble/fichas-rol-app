import React from 'react';
import EnemyCard, { EnemyCardProps } from './EnemyCard';

export interface EnemyGridProps {
  enemies: EnemyCardProps[];
  columnWidth?: number;
}

const EnemyGrid: React.FC<EnemyGridProps> = ({ enemies, columnWidth = 260 }) => {
  const template = {
    gridTemplateColumns: `repeat(auto-fit, minmax(${columnWidth}px, 1fr))`,
  } as React.CSSProperties;

  return (
    <div className="grid gap-4 animate-fade-in" style={template}>
      {enemies.map(e => (
        <EnemyCard key={e.id} {...e} />
      ))}
    </div>
  );
};

export default EnemyGrid;
