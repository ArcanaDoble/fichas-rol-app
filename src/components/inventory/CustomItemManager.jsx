import React, { useState } from 'react';
import CustomItemForm from './CustomItemForm';

const CustomItemManager = () => {
  const [showForm, setShowForm] = useState(false);

  const handleSave = (item) => {
    const stored = JSON.parse(localStorage.getItem('customItems') || '[]');
    localStorage.setItem('customItems', JSON.stringify([...stored, item]));
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowForm(true)}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        Nuevo
      </button>
      {showForm && (
        <CustomItemForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
};

export default CustomItemManager;
