import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Input from '../Input';
import Boton from '../Boton';

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const CustomItemForm = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#a3a3a3');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') setIcon(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    const type = toSlug(name);
    onSave({ type, icon, description, color });
    setName('');
    setDescription('');
    setIcon('');
    setColor('#a3a3a3');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-4 border border-gray-600 rounded-lg bg-gray-800"
    >
      <Input
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="sm"
      />
      <Input
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        size="sm"
      />
      <div className="flex gap-2 items-center">
        <Input
          className="flex-1"
          placeholder="Icono (emoji)"
          value={icon.startsWith('data:') ? '' : icon}
          onChange={(e) => setIcon(e.target.value)}
          size="sm"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="text-sm text-gray-300"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Color:</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-6 rounded border-0 p-0"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Boton type="button" onClick={onCancel} color="gray" size="sm">
          Cancelar
        </Boton>
        <Boton type="submit" color="green" size="sm">
          Guardar
        </Boton>
      </div>
    </form>
  );
};

CustomItemForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CustomItemForm;
