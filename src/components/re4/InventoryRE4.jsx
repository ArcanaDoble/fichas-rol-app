import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDrop } from 'react-dnd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import InventoryItem, { ItemTypes } from './InventoryItem';
import GridCell from './GridCell';
import { itemTemplates } from './itemTemplates';

const GRID_COLS = 10;
const GRID_ROWS = 8;
const BASE_CELL_SIZE = 40;

const InventoryRE4 = ({ playerName }) => {
  const [items, setItems] = useState([]);
  const [cellSize, setCellSize] = useState(BASE_CELL_SIZE);

  const docRef = playerName ? doc(db, 'inventory_prototype', playerName) : null;

  // Detectar dispositivo móvil y ajustar tamaño de celda
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setCellSize(mobile ? 32 : BASE_CELL_SIZE);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar datos del inventario
  useEffect(() => {
    if (!docRef) return;
    (async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItems(snap.data().items || []);
      }
    })();
  }, [docRef]);

  // Guardar datos del inventario
  useEffect(() => {
    if (docRef) {
      setDoc(docRef, { items });
    }
  }, [items, docRef]);

  // Función para detectar colisiones
  const findCollision = useCallback((x, y, width, height, excludeId = null) => {
    if (x < 0 || y < 0 || x + width > GRID_COLS || y + height > GRID_ROWS) return true;
    return items.some(item => {
      if (item.id === excludeId) return false;
      const itemRotation = item.rotation || 0;
      const itemWidth = itemRotation % 180 === 0 ? item.width : item.height;
      const itemHeight = itemRotation % 180 === 0 ? item.height : item.width;
      return (
        x < item.x + itemWidth && x + width > item.x &&
        y < item.y + itemHeight && y + height > item.y
      );
    });
  }, [items]);

  // Drop handler
  const [, drop] = useDrop(() => ({
    accept: ItemTypes.ITEM,
    drop: (dragged, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      const nx = Math.round(dragged.x + delta.x / cellSize);
      const ny = Math.round(dragged.y + delta.y / cellSize);
      if (!findCollision(nx, ny, dragged.width, dragged.height, dragged.id)) {
        setItems(items => items.map(item => 
          item.id === dragged.id ? { ...item, x: nx, y: ny } : item
        ));
      }
    },
  }), [findCollision, cellSize]);

  // Función para añadir items
  const addItem = useCallback((templateId) => {
    const template = itemTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Buscar posición libre
    let x = 0, y = 0;
    let found = false;
    for (let row = 0; row < GRID_ROWS && !found; row++) {
      for (let col = 0; col < GRID_COLS && !found; col++) {
        if (!findCollision(col, row, template.width, template.height)) {
          x = col;
          y = row;
          found = true;
        }
      }
    }
    
    if (!found) {
      alert('No hay espacio suficiente en el inventario');
      return;
    }

    const newItem = {
      ...template,
      id: Date.now() + Math.random(),
      x,
      y,
      rotation: 0
    };

    setItems(items => [...items, newItem]);
  }, [findCollision]);

  // Función para rotar items
  const rotateItem = useCallback((itemId) => {
    setItems(items => items.map(item => {
      if (item.id !== itemId || !item.rotatable) return item;
      
      const newRotation = ((item.rotation || 0) + 90) % 360;
      const newWidth = newRotation % 180 === 0 ? item.width : item.height;
      const newHeight = newRotation % 180 === 0 ? item.height : item.width;
      
      if (findCollision(item.x, item.y, newWidth, newHeight, item.id)) {
        return item; // No rotar si hay colisión
      }
      
      return { ...item, rotation: newRotation };
    }));
  }, [findCollision]);

  // Función para eliminar items
  const deleteItem = useCallback((itemId) => {
    setItems(items => items.filter(item => item.id !== itemId));
  }, []);

  // Función para limpiar inventario
  const clearInventory = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres limpiar todo el inventario?')) {
      setItems([]);
    }
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Controles del inventario */}
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">🎒 Inventario RE4</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              Objetos: {items.length}/{GRID_COLS * GRID_ROWS}
            </span>
          </div>
        </div>

        {/* Items disponibles */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Objetos disponibles
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
            {itemTemplates.map(item => (
              <button
                key={item.id}
                onClick={() => addItem(item.id)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors group"
                title={`${item.name} - ${item.description}`}
              >
                <div className="text-lg mb-1">{item.iconEmoji || item.icon}</div>
                <div className="text-gray-300 group-hover:text-white truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500">
                  {item.width}×{item.height}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Controles adicionales */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearInventory}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            🗑️ Limpiar Todo
          </button>
        </div>
      </div>

      {/* Grid del inventario */}
      <div className="flex justify-center">
        <div className="relative bg-gray-900 p-4 rounded-lg shadow-2xl border-2 border-gray-700">
          <div
            ref={drop}
            className="relative"
            style={{ 
              width: GRID_COLS * cellSize, 
              height: GRID_ROWS * cellSize
            }}
          >
            {/* Celdas del grid */}
            {[...Array(GRID_ROWS)].map((_, y) => (
              <div key={y} className="flex">
                {[...Array(GRID_COLS)].map((_, x) => (
                  <GridCell key={x} size={cellSize} x={x} y={y} />
                ))}
              </div>
            ))}

            {/* Items del inventario */}
            {items.map(item => (
              <InventoryItem 
                key={item.id} 
                item={item} 
                cellSize={cellSize}
                onRotate={rotateItem}
                onDelete={deleteItem}
              />
            ))}
          </div>

          {/* Información del grid */}
          <div className="mt-2 text-center text-xs text-gray-400">
            Grid: {GRID_COLS}×{GRID_ROWS} | Tamaño de celda: {cellSize}px
          </div>
        </div>
      </div>

      {/* Estadísticas del inventario */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-bold text-white mb-2">📊 Estadísticas</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{items.length}</div>
            <div className="text-gray-400">Objetos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {Math.round((items.length / (GRID_COLS * GRID_ROWS)) * 100)}%
            </div>
            <div className="text-gray-400">Ocupación</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {items.reduce((sum, item) => sum + (item.width * item.height), 0)}
            </div>
            <div className="text-gray-400">Celdas usadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {items.reduce((sum, item) => sum + (item.value || 0), 0)}
            </div>
            <div className="text-gray-400">Valor total</div>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-bold text-white mb-2">🎮 Controles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
          <div>• <strong>Arrastrar:</strong> Mover objetos</div>
          <div>• <strong>Click derecho:</strong> Rotar objetos</div>
          <div>• <strong>Doble click:</strong> Eliminar objeto</div>
          <div>• <strong>Hover:</strong> Ver información</div>
        </div>
      </div>
    </div>
  );
};

InventoryRE4.propTypes = {
  playerName: PropTypes.string,
};

export default InventoryRE4;
