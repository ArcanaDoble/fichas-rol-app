import React, { useState } from 'react';

const ITEMS = ['remedio', 'chatarra', 'comida'];

const ItemGenerator = ({ onGenerate }) => {
  const [query, setQuery] = useState('');

  const handleGenerate = () => {
    const type = query.toLowerCase();
    if (ITEMS.includes(type)) {
      onGenerate(type);
      setQuery('');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <input
        className="border rounded px-2 py-1 flex-1"
        placeholder="Buscar objeto"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        onClick={handleGenerate}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Generar
      </button>
    </div>
  );
};

export default ItemGenerator;
