import React from 'react';
import { FaPlus } from 'react-icons/fa';

interface FABProps {
  onClick: () => void;
}

const FloatingActionButton: React.FC<FABProps> = ({ onClick }) => (
  <button
    aria-label="add enemy"
    onClick={onClick}
    className="fixed bottom-4 right-4 z-50 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-transform"
  >
    <FaPlus />
  </button>
);

export default FloatingActionButton;
