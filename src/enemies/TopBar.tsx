import React, { useState, useEffect } from 'react';
import { Popover } from '@headlessui/react';
import { FaFilter } from 'react-icons/fa';

export interface TopBarProps {
  tags: string[];
  onSearch: (term: string) => void;
  onFilter: (tags: string[]) => void;
}

const TopBar: React.FC<TopBarProps> = ({ tags, onSearch, onFilter }) => {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      onSearch(term);
    }, 300);
    return () => clearTimeout(handle);
  }, [term, onSearch]);

  const toggle = (t: string) => {
    setSelected(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      onFilter(next);
      return next;
    });
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <input
        aria-label="search"
        type="search"
        value={term}
        onChange={e => setTerm(e.target.value)}
        className="flex-1 bg-gray-800 text-white px-3 py-1 rounded"
        placeholder="Buscar"
      />
      <Popover className="relative">
        <Popover.Button aria-label="filter" className="p-2 bg-gray-800 rounded">
          <FaFilter />
        </Popover.Button>
        <Popover.Panel className="absolute right-0 mt-2 bg-gray-800 text-white p-2 rounded shadow-lg z-10">
          {tags.map(t => (
            <label key={t} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(t)}
                onChange={() => toggle(t)}
              />
              {t}
            </label>
          ))}
        </Popover.Panel>
      </Popover>
    </div>
  );
};

export default TopBar;
