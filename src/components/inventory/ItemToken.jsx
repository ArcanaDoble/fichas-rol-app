import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { Tooltip } from 'react-tooltip';
import * as LucideIcons from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export const ItemTypes = {
  TOKEN: 'token'
};

const defaultIcons = {
  remedio: '💊',
  chatarra: '⚙️',
  comida: '🍖',
  polvora: '💥',
};

const defaultColors = {
  remedio: 'bg-blue-300',
  chatarra: 'bg-yellow-300',
  comida: 'bg-green-300',
  polvora: 'bg-gray-400',
};

const defaultGradients = {
  remedio: 'from-blue-200 via-blue-400 to-blue-200',
  chatarra: 'from-yellow-200 via-yellow-400 to-yellow-200',
  comida: 'from-green-200 via-green-400 to-green-200',
  polvora: 'from-gray-300 via-gray-500 to-gray-300',
};

const defaultBorders = {
  remedio: 'border-blue-400',
  chatarra: 'border-yellow-400',
  comida: 'border-green-400',
  polvora: 'border-gray-500',
};

const defaultDescriptions = {
  remedio: 'Un remedio curativo',
  chatarra: 'Partes de recambio variadas',
  comida: 'Provisiones comestibles',
  polvora: 'Material explosivo en polvo',
};

const lighten = (hex, amt) => {
  let num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
};

const hexToRgba = (hex, alpha) => {
  const num = parseInt(hex.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ItemToken = ({ id, type = 'remedio', count = 1, fromSlot = null }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.TOKEN,
      item: { id, type, count, fromSlot },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }), [id, type, count, fromSlot]);
  const [customMap, setCustomMap] = useState({});

  useEffect(() => {
    const fetchCustom = async () => {
      try {
        const snap = await getDocs(collection(db, 'customItems'));
        const map = snap.docs.reduce((acc, d) => {
          const data = d.data();
          acc[data.type || d.id] = data;
          return acc;
        }, {});
        setCustomMap(map);
      } catch {
        setCustomMap({});
      }
    };
    fetchCustom();
  }, []);

  const custom = customMap[type];
  const opacity = isDragging ? 0.5 : 1;
  const dragStyle = isDragging ? 'scale-110 rotate-6' : 'hover:scale-105';

  if (custom) {
    const light = lighten(custom.color, 40);
    const glow = hexToRgba(custom.color, 0.3);
    const glowStrong = hexToRgba(custom.color, 0.6);
    return (
      <div
        ref={drag}
        className={`w-16 p-2 border-2 rounded shadow text-center select-none transition-transform ${dragStyle} bg-[length:200%_200%] animate-gradient animate-glow`}
        style={{
          opacity,
          borderColor: custom.color,
          backgroundImage: `linear-gradient(90deg, ${light}, ${custom.color}, ${light})`,
          '--glow-from': glow,
          '--glow-to': glowStrong,
        }}
        data-tooltip-id={`item-${id}`}
        data-tooltip-content={custom.description}
      >
        {custom.icon?.startsWith('data:') ? (
          <img
            src={custom.icon}
            alt={type}
            className="w-8 h-8 mx-auto"
            draggable={false}
          />
        ) : custom.icon?.startsWith('lucide:') ? (
          (() => {
            const Icon = LucideIcons[custom.icon.slice(7)];
            return Icon ? <Icon className="w-8 h-8 mx-auto" /> : <div className="text-black text-2xl">❔</div>;
          })()
        ) : (
          <div className="text-black text-2xl">{custom.icon || '❔'}</div>
        )}
        <div className="mt-1 text-sm bg-white text-black rounded-full px-2 inline-block">{count}</div>
        <Tooltip id={`item-${id}`} place="top" className="max-w-[90vw] sm:max-w-xs" />
      </div>
    );
  }

  const bg = defaultColors[type] || 'bg-gray-300';
  const gradient = defaultGradients[type] || 'from-gray-300 via-gray-400 to-gray-300';
  const border = defaultBorders[type] || 'border-gray-300';

  return (
    <div
      ref={drag}
      className={`w-16 p-2 ${bg} ${border} border-2 rounded shadow text-center select-none transition-transform ${dragStyle} bg-gradient-to-r ${gradient} bg-[length:200%_200%] animate-gradient animate-glow`}
      style={{ opacity }}
      data-tooltip-id={`item-${id}`}
      data-tooltip-content={defaultDescriptions[type]}
    >
      <div className="text-black text-2xl">{defaultIcons[type] || '❔'}</div>
      <div className="mt-1 text-sm bg-white text-black rounded-full px-2 inline-block">{count}</div>
      <Tooltip id={`item-${id}`} place="top" className="max-w-[90vw] sm:max-w-xs" />
    </div>
  );
};

ItemToken.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.string,
  count: PropTypes.number,
  fromSlot: PropTypes.number,
};

export default ItemToken;
