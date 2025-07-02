import React from 'react';
import { Menu } from '@headlessui/react';
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
      <Menu as="div" className="absolute top-2 right-2 text-white">
        <Menu.Button aria-label="actions">
          <FaEllipsisV />
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-28 origin-top-right bg-gray-800 divide-y divide-gray-700 rounded shadow-lg focus:outline-none z-10">
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onEdit?.(id)}
                  className={`${
                    active ? 'bg-gray-700' : ''
                  } group flex rounded-md items-center w-full px-2 py-1 text-sm`}
                >
                  <FaEdit className="mr-2" /> Edit
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onDuplicate?.(id)}
                  className={`${
                    active ? 'bg-gray-700' : ''
                  } group flex rounded-md items-center w-full px-2 py-1 text-sm`}
                >
                  <FaCopy className="mr-2" /> Duplicate
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onDelete?.(id)}
                  className={`${
                    active ? 'bg-gray-700' : ''
                  } group flex rounded-md items-center w-full px-2 py-1 text-sm text-red-400`}
                >
                  <FaTrash className="mr-2" /> Delete
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
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
