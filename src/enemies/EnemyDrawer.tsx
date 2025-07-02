import React from 'react';
import { Dialog } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';
import EnemyCard, { EnemyCardProps } from './EnemyCard';

export interface EnemyDrawerProps {
  enemy: EnemyCardProps | null;
  onClose: () => void;
}

const EnemyDrawer: React.FC<EnemyDrawerProps> = ({ enemy, onClose }) => {
  return (
    <Dialog open={!!enemy} onClose={onClose} className="fixed inset-0 z-50 flex">
      {/* ⇓  ESTA LÍNEA CAMBIA  ⇓ */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      {/* ⇑  ──────────────────── */}
      <div className="ml-auto w-full max-w-md bg-gray-900 text-white p-4 overflow-y-auto">
        <button
          aria-label="close"
          onClick={onClose}
          className="mb-2 text-right text-xl"
        >
          <FaTimes />
        </button>

        {enemy && (
          <>
            <EnemyCard {...enemy} />
            <p className="mt-4 text-sm whitespace-pre-line">
              {enemy.description}
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
};

export default EnemyDrawer;
