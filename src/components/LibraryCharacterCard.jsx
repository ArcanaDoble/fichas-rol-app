import React from 'react';
import PropTypes from 'prop-types';
import { FiImage, FiLock, FiTrash2 } from 'react-icons/fi';

export const LibraryCharacterCard = ({
  item,
  onOpen,
  onPortraitEdit,
  onDelete,
  starCount = 5,
  starValue = 0,
  levelPrefix = 'Nvl',
  ariaLabel,
}) => {
  const isLocked = item.status === 'locked';
  const filledStars = Math.max(0, Math.min(starCount, Number(starValue) || 0));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group relative aspect-[3/4.5] cursor-pointer rounded-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_15px_40px_-10px_rgba(200,170,110,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8aa6e]"
      aria-label={ariaLabel || `Abrir ${item.name}`}
    >
      <div className={`absolute inset-0 overflow-hidden border bg-[#1a1b26] ${isLocked ? 'border-slate-700' : 'border-[#785a28]'}`}>
        <div className="absolute inset-0 overflow-hidden">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${isLocked ? 'grayscale opacity-40' : 'opacity-90'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1a1b26] text-slate-700">
              <FiImage className="h-12 w-12 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-transparent opacity-90" />
        </div>

        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-500 bg-[#0b1120]/80">
              <FiLock className="h-8 w-8 text-slate-400" />
            </div>
            <span className="font-['Cinzel'] text-sm font-bold tracking-[0.2em] text-slate-400 shadow-black drop-shadow-md">BLOQUEADO</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center p-5 text-center">
          <h3 className={`mb-1 font-['Cinzel'] text-xl font-bold uppercase tracking-wider drop-shadow-lg transition-colors duration-300 ${isLocked ? 'text-slate-500' : 'text-[#f0e6d2] group-hover:text-white'}`}>
            {item.name}
          </h3>
          <div className="mb-3 flex items-center justify-center gap-0.5" data-testid="library-card-stars">
            {Array.from({ length: starCount }).map((_, index) => (
              <svg
                key={index}
                className={`h-3 w-3 drop-shadow-md ${index < filledStars ? (isLocked ? 'fill-slate-600 text-slate-600' : 'fill-[#c8aa6e] text-[#c8aa6e]') : 'fill-slate-800 text-slate-800'}`}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          {!isLocked && (
            <div className="flex w-full items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c8aa6e]/50" />
              <div className="rounded border border-[#c8aa6e]/40 bg-[#1c1917]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#c8aa6e]">
                {levelPrefix} {item.level || 1}
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c8aa6e]/50" />
            </div>
          )}
        </div>
      </div>

      <div className={`pointer-events-none absolute inset-0 z-30 border-2 shadow-[inset_0_0_20px_rgba(200,170,110,0.2)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${isLocked ? 'border-slate-600' : 'border-[#c8aa6e]'}`}>
        <div className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-white" />
        <div className="absolute right-0 top-0 h-2 w-2 border-r-2 border-t-2 border-white" />
        <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-white" />
        <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-white" />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 border opacity-100 transition-opacity group-hover:opacity-0 ${isLocked ? 'border-slate-700' : 'border-[#785a28]'}`} />

      {onPortraitEdit && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPortraitEdit();
          }}
          className="absolute left-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/30 bg-[#0b1120]/80 text-slate-300 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-slate-800 hover:text-white group-hover:opacity-100"
          title="Cambiar retrato"
        >
          <FiImage className="h-3.5 w-3.5" />
        </button>
      )}

      {onDelete && !isLocked && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-[#0b1120]/80 text-red-400 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-red-900/50 hover:text-red-200 group-hover:opacity-100"
          title="Eliminar clase"
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

LibraryCharacterCard.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    image: PropTypes.string,
    level: PropTypes.number,
    status: PropTypes.string,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onPortraitEdit: PropTypes.func,
  onDelete: PropTypes.func,
  starCount: PropTypes.number,
  starValue: PropTypes.number,
  levelPrefix: PropTypes.string,
  ariaLabel: PropTypes.string,
};
