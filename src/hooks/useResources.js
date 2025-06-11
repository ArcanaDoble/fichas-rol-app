import { useState } from 'react';

export default function useResources(initialList, savePlayer, playerData) {
  const [resourcesList, setResourcesList] = useState(initialList);
  const [showAddResForm, setShowAddResForm] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );
  const [newResName, setNewResName] = useState('');
  const [newResColor, setNewResColor] = useState('#ffffff');
  const [newResError, setNewResError] = useState('');

  const agregarRecurso = () => {
    if (resourcesList.length >= 6) return;
    const nombre = newResName.trim();
    if (!nombre) {
      setNewResError('Nombre requerido');
      return;
    }
    if (resourcesList.some(r => r.name.toLowerCase() === nombre.toLowerCase())) {
      setNewResError('Ese nombre ya existe');
      return;
    }

    setNewResError('');
    const lower = nombre.toLowerCase();
    const nuevoId = ['postura', 'cordura'].includes(lower) ? lower : `recurso${Date.now()}`;
    const color = newResColor;
    const nuevaLista = [...resourcesList, { id: nuevoId, name: newResName || nuevoId, color, info: '' }];
    const nuevaStats = {
      ...playerData.stats,
      [nuevoId]: { base: 0, total: 0, actual: 0, buff: 0 },
    };
    setResourcesList(nuevaLista);
    savePlayer({ ...playerData, stats: nuevaStats }, nuevaLista);
    setNewResName('');
    setNewResColor('#ffffff');
  };

  const eliminarRecurso = id => {
    const newStats = { ...playerData.stats };
    delete newStats[id];
    const newList = resourcesList.filter(r => r.id !== id);
    setResourcesList(newList);
    savePlayer({ ...playerData, stats: newStats }, newList);
  };

  return {
    resourcesList,
    setResourcesList,
    showAddResForm,
    setShowAddResForm,
    newResName,
    setNewResName,
    newResColor,
    setNewResColor,
    newResError,
    agregarRecurso,
    eliminarRecurso,
  };
}
