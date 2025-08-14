import React, { useEffect, useState } from 'react';
import CustomItemForm from './CustomItemForm';
import Boton from '../Boton';
import Input from '../Input';

const CustomItemManager = () => {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

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

  const filtered = items
    .map((it, idx) => ({ item: it, index: idx }))
    .filter(({ item }) =>
      item.name?.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Buscar objeto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="sm"
        />
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
