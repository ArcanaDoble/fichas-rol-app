import React, { useState } from 'react';
import CustomItemForm from './CustomItemForm';
import Boton from '../Boton';

const CustomItemManager = () => {
  const [showForm, setShowForm] = useState(false);

  const handleSave = (item) => {
    const stored = JSON.parse(localStorage.getItem('customItems') || '[]');
    localStorage.setItem('customItems', JSON.stringify([...stored, item]));
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      <Boton color="green" size="sm" onClick={() => setShowForm(true)}>
        Nuevo
      </Boton>
      {showForm && (
        <CustomItemForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
};

export default CustomItemManager;
