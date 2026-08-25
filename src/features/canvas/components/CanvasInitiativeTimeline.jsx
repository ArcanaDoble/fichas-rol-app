import React, { useMemo } from 'react';
import { Users } from 'lucide-react';

const CanvasInitiativeTimeline = ({ tokens = [], selectedId, onSelect }) => {
  const blocks = useMemo(() => {
    const grouped = new Map();
    [...tokens]
      .sort((left, right) => left.initiativeBlockIndex - right.initiativeBlockIndex)
      .forEach((token) => {
        const key = token.initiativeBlockId || token.id;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            initiative: token.initiative,
            side: token.initiativeSide,
            active: token.isInitiativeActive,
            tokens: [],
          });
        }
        grouped.get(key).tokens.push(token);
      });
    return Array.from(grouped.values());
  }, [tokens]);

  if (blocks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-20 right-20 top-8 z-[45] md:left-1/2 md:right-auto md:top-10 md:w-[min(76vw,620px)] md:-translate-x-1/2">
      <div
        className="pointer-events-auto flex max-w-full items-center gap-0 overflow-x-auto border-y border-[#c8aa6e]/20 bg-[#080d16]/90 px-1 py-1 shadow-[0_8px_22px_rgba(0,0,0,0.38)] scrollbar-hide md:gap-1 md:px-2 md:py-1.5"
        role="region"
        aria-label="Orden de iniciativa"
      >
        {blocks.map((block, blockIndex) => (
          <React.Fragment key={block.id}>
            {blockIndex > 0 && <span className="h-px w-2 shrink-0 bg-slate-700/50 md:w-3" />}
            <div
              className={`flex shrink-0 items-center gap-1 border px-1 py-1 transition-colors md:gap-1.5 md:px-1.5 ${block.active ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/10' : 'border-transparent'}`}
              aria-label={`Bloque de iniciativa ${block.initiative}`}
            >
              {block.tokens.length > 1 && <Users size={11} className={block.side === 'players' ? 'text-sky-300' : 'text-red-300'} />}
              <div className="flex -space-x-1">
                {block.tokens.map((token) => (
                  <button
                    type="button"
                    key={token.id}
                    onClick={() => onSelect(token.id)}
                    className={`relative h-6 w-6 overflow-hidden rounded-full border bg-[#111827] transition-transform hover:z-10 hover:scale-110 md:h-7 md:w-7 ${selectedId === token.id ? 'z-10 border-white' : block.active ? 'border-[#c8aa6e]' : 'border-slate-700'} ${token.hasActed ? 'grayscale opacity-45' : ''}`}
                    title={`${token.name} · iniciativa ${token.initiative}`}
                  >
                    {token.portrait || token.img
                      ? <img src={token.portrait || token.img} alt="" className="h-full w-full object-cover" />
                      : <span className="grid h-full w-full place-items-center font-['Cinzel'] text-[9px] text-slate-400">{String(token.name || '?').slice(0, 1)}</span>}
                  </button>
                ))}
              </div>
              <span className={`min-w-4 text-center font-mono text-[9px] font-bold md:min-w-5 md:text-[10px] ${block.active ? 'text-[#e4ca91]' : 'text-slate-500'}`}>
                {block.initiative}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CanvasInitiativeTimeline;
