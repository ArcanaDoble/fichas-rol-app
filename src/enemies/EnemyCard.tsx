import React from 'react';
import { useState } from 'react';
import { FaEllipsisV, FaEdit, FaCopy, FaTrash } from 'react-icons/fa';

export interface EnemyCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  challenge: number;
  hp: number;
  tags: string[];
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const EnemyCard: React.FC<EnemyCardProps> = ({
  id,
  name,
  description,
  imageUrl,
  challenge,
  hp,
  tags,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-[300px] h-[200px] rounded overflow-hidden shadow-lg transform transition-transform hover:scale-105">
      <img
        src={imageUrl}
        alt={name}
        className="absolute inset-0 object-cover w-full h-full"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span
        className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded"
        aria-label={`Challenge rating ${challenge}`}
      >
        CR {challenge}
      </span>
      <div className="absolute top-2 right-2 text-white">
        <button aria-label="actions" onClick={() => setOpen(!open)}>
          <FaEllipsisV />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-28 bg-gray-800 divide-y divide-gray-700 rounded shadow-lg z-10">
            <button
              onClick={() => {
                setOpen(false);
                onEdit?.(id);
              }}
              className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-700"
            >
              <FaEdit className="mr-2" /> Edit
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDuplicate?.(id);
              }}
              className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-700"
            >
              <FaCopy className="mr-2" /> Duplicate
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete?.(id);
              }}
              className="flex items-center w-full px-2 py-1 text-sm text-red-400 hover:bg-gray-700"
            >
              <FaTrash className="mr-2" /> Delete
            </button>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 p-2 text-white">
        <p className="text-lg font-bold" data-testid="enemy-name">
          {name}
        </p>
        <p className="text-sm" data-testid="enemy-hp">
          HP: {hp}
        </p>
      </div>
    </div>
  );
};

export default EnemyCard;
