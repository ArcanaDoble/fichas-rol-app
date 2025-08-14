import React, { useEffect, useState, useRef } from 'react';
import CustomItemForm from './CustomItemForm';
import Boton from '../Boton';
import Input from '../Input';

const CustomItemManager = () => {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState('');
  const mirrorRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem('customItems')) || []);
    } catch {
      setItems([]);
    }
  }, []);

  const saveItems = (updated) => {
    setItems(updated);
    localStorage.setItem('customItems', JSON.stringify(updated));
  };

  const handleSave = (item) => {
    if (editing !== null) {
      const updated = items.map((it, idx) => (idx === editing ? item : it));
      saveItems(updated);
    } else {
      saveItems([...items, item]);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (index) => {
    const updated = items.filter((_, idx) => idx !== index);
    saveItems(updated);
  };

  useEffect(() => {
    if (!query) {
      setSuggest('');
      return;
    }
    const q = query.toLowerCase();
    const names = items.map(i => i.name || i.type);
    const match = names.find(n => n && n.toLowerCase().startsWith(q));
    if (match && match.toLowerCase() !== q) {
      setSuggest(match.slice(query.length));
    } else {
      setSuggest('');
    }
  }, [query, items]);

  useEffect(() => {
    if (mirrorRef.current) {
      setOffset(mirrorRef.current.offsetWidth);
    }
  }, [query, suggest]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggest) {
      e.preventDefault();
      setQuery(query + suggest);
      setSuggest('');
    }
  };

  const filtered = items
    .map((it, idx) => ({ item: it, index: idx }))
    .filter(({ item }) => {
      const q = query.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            className="w-full relative z-10"
            placeholder="Buscar objeto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            size="sm"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-20"
                style={{ marginLeft: offset }}
              >
                {suggest}
              </span>
            </>
          )}
        </div>
        <Boton
          color="green"
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          Nuevo
        </Boton>
      </div>
      {showForm && (
        <CustomItemForm
          initial={editing !== null ? items[editing] : null}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
      <ul className="space-y-2">
        {filtered.map(({ item, index }) => (
          <li
            key={item.type}
            className="flex items-center gap-2 p-2 border border-gray-600 rounded"
          >
            {item.icon?.startsWith('data:') ? (
              <img src={item.icon} alt={item.name} className="w-6 h-6" />
            ) : (
              <span className="text-xl">{item.icon || '❔'}</span>
            )}
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-gray-400">{item.description}</div>
            </div>
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: item.color }}
            />
            <Boton
              color="blue"
              size="sm"
              onClick={() => {
                setEditing(index);
                setShowForm(true);
              }}
            >
              Editar
            </Boton>
            <Boton
              color="red"
              size="sm"
              onClick={() => handleDelete(index)}
            >
              Eliminar
            </Boton>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomItemManager;
