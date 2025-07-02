import React, { useEffect, useState, useCallback } from 'react';
import EnemyGrid from './EnemyGrid';
import EnemyDrawer from './EnemyDrawer';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import { EnemyCardProps } from './EnemyCard';
import { getEnemies } from './api';

async function fetchEnemies(): Promise<EnemyCardProps[]> {
  return getEnemies();
}

const EnemyModule: React.FC = () => {
  const [enemies, setEnemies] = useState<EnemyCardProps[]>([]);
  const [filtered, setFiltered] = useState<EnemyCardProps[]>([]);
  const [drawer, setDrawer] = useState<EnemyCardProps | null>(null);

  useEffect(() => {
    fetchEnemies().then(data => {
      setEnemies(data);
      setFiltered(data);
    });
  }, []);

  const handleSearch = useCallback(
    (term: string) => {
      setFiltered(
        enemies.filter(e => e.name.toLowerCase().includes(term.toLowerCase()))
      );
    },
    [enemies]
  );

  const handleFilter = useCallback(
    (tags: string[]) => {
      if (tags.length === 0) {
        setFiltered(enemies);
      } else {
        setFiltered(
          enemies.filter(e => tags.every(t => e.tags.includes(t)))
        );
      }
    },
    [enemies]
  );

  return (
    <div className="p-4">
      <TopBar
        tags={[...new Set(enemies.flatMap(e => e.tags))]}
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
      <EnemyGrid enemies={filtered} />
      <FloatingActionButton
        onClick={() =>
          setDrawer({
            id: '',
            name: 'Nuevo',
            description: '',
            imageUrl: '',
            challenge: 0,
            hp: 0,
            tags: [],
          })
        }
      />
      <EnemyDrawer enemy={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
};

export default EnemyModule;
