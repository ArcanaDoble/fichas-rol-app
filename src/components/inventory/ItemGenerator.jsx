import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Input from '../Input';

const ITEMS = ['remedio', 'chatarra', 'comida', 'polvora'];

const ItemGenerator = ({ onGenerate }) => {
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState('');
  const mirrorRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!query) {
      setSuggest('');
      return;
    }
    const match = ITEMS.find((i) => i.startsWith(query.toLowerCase()));
    if (match && match !== query.toLowerCase()) {
      setSuggest(match.slice(query.length));
    } else {
      setSuggest('');
    }
  }, [query]);

  useEffect(() => {
    if (mirrorRef.current) {
      setOffset(mirrorRef.current.offsetWidth);
    }
  }, [query, suggest]);

  const handleGenerate = () => {
    const type = query.toLowerCase();
    if (ITEMS.includes(type)) {
      onGenerate(type);
      setQuery('');
      setSuggest('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggest) {
      e.preventDefault();
      setQuery(query + suggest);
      setSuggest('');
    } else if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex-1">
        <Input
          className="w-full text-black bg-transparent relative z-10"
          placeholder="Buscar objeto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {suggest && (
          <>
            <span
              ref={mirrorRef}
              className="absolute left-4 top-1/2 -translate-y-1/2 invisible whitespace-pre"
            >
              {query}
            </span>
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              style={{ marginLeft: offset }}
            >
              {suggest}
            </span>
          </>
        )}
      </div>
      <button
        onClick={handleGenerate}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Generar
      </button>
    </div>
  );
};

ItemGenerator.propTypes = {
  onGenerate: PropTypes.func.isRequired,
};

export default ItemGenerator;
