import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Input from '../Input';
import CustomItemForm from './CustomItemForm';

const DEFAULT_ITEMS = ['remedio', 'chatarra', 'comida', 'polvora'];

const ItemGenerator = ({ onGenerate, allowCustom = false }) => {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState('');
  const mirrorRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('customItems')) || [];
      setItems([...DEFAULT_ITEMS, ...stored.map((i) => i.type)]);
    } catch {
      setItems(DEFAULT_ITEMS);
    }
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggest('');
      return;
    }
      const match = items.find((i) => i.startsWith(query.toLowerCase()));
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
      if (items.includes(type)) {
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
        {allowCustom && (
          <>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Nuevo
            </button>
            {showForm && (
              <CustomItemForm
                onSave={(item) => {
                  const stored = JSON.parse(localStorage.getItem('customItems') || '[]');
                  localStorage.setItem('customItems', JSON.stringify([...stored, item]));
                  setItems((prev) => [...prev, item.type]);
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </>
        )}
      </div>
    );
  };

ItemGenerator.propTypes = {
  onGenerate: PropTypes.func.isRequired,
  allowCustom: PropTypes.bool,
};

export default ItemGenerator;
