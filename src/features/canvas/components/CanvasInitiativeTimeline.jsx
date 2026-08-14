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
    <div className="pointer-events-none absolute left-1/2 top-10 z-[45] w-[min(76vw,620px)] -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 overflow-x-auto border-y border-[#c8aa6e]/20 bg-[#080d16]/90 px-2 py-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.38)] scrollbar-hide">
        {blocks.map((block, blockIndex) => (
          <React.Fragment key={block.id}>
            {blockIndex > 0 && <span className="h-px w-3 shrink-0 bg-slate-700/50" />}
            <div
              className={`flex shrink-0 items-center gap-1.5 border px-1.5 py-1 transition-colors ${block.active ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/10' : 'border-transparent'}`}
              aria-label={`Bloque de iniciativa ${block.initiative}`}
            >
              {block.tokens.length > 1 && <Users size={11} className={block.side === 'players' ? 'text-sky-300' : 'text-red-300'} />}
              <div className="flex -space-x-1">
                {block.tokens.map((token) => (
                  <button
                    type="button"
                    key={token.id}
                    onClick={() => onSelect(token.id)}
                    className={`relative h-7 w-7 overflow-hidden rounded-full border bg-[#111827] transition-transform hover:z-10 hover:scale-110 ${selectedId === token.id ? 'z-10 border-white' : block.active ? 'border-[#c8aa6e]' : 'border-slate-700'} ${token.hasActed ? 'grayscale opacity-45' : ''}`}
                    title={`${token.name} · iniciativa ${token.initiative}`}
                  >
                    {token.portrait || token.img
                      ? <img src={token.portrait || token.img} alt="" className="h-full w-full object-cover" />
                      : <span className="grid h-full w-full place-items-center font-['Cinzel'] text-[9px] text-slate-400">{String(token.name || '?').slice(0, 1)}</span>}
                  </button>
                ))}
              </div>
              <span className={`min-w-5 text-center font-mono text-[10px] font-bold ${block.active ? 'text-[#e4ca91]' : 'text-slate-500'}`}>
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

