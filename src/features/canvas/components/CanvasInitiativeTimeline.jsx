import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

const CanvasInitiativeTimeline = ({ tokens = [], selectedId, onSelect }) => {
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollState, setScrollState] = useState({ overflow: false, left: false, right: false });
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

  const activeBlockId = blocks.find(block => block.active)?.id;
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const update = () => setScrollState({
      overflow: element.scrollWidth > element.clientWidth + 1,
      left: element.scrollLeft > 1,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
    const wheel = event => {
      if (element.scrollWidth <= element.clientWidth) return;
      event.preventDefault();
      event.stopPropagation();
      element.scrollLeft += (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY)
        * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      update();
    };
    update();
    element.addEventListener('scroll', update);
    element.addEventListener('wheel', wheel, { passive: false });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      element.removeEventListener('scroll', update);
      element.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', update);
    };
  }, [blocks]);

  const reveal = useCallback(element => {
    const viewport = scrollRef.current;
    if (!element || !viewport) return;
    const bounds = element.getBoundingClientRect();
    const visible = viewport.getBoundingClientRect();
    if (bounds.right > visible.right) viewport.scrollLeft += bounds.right - visible.right + 8;
    if (bounds.left < visible.left) viewport.scrollLeft -= visible.left - bounds.left + 8;
    viewport.dispatchEvent(new Event('scroll'));
  }, []);
  useEffect(() => {
    reveal(scrollRef.current?.querySelector('[data-active-block="true"]'));
  }, [activeBlockId, reveal]);
  useEffect(() => {
    reveal(Array.from(scrollRef.current?.querySelectorAll('[data-token-id]') || [])
      .find(element => element.dataset.tokenId === selectedId));
  }, [selectedId, reveal]);

  const scroll = direction => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollLeft += direction * Math.max(100, element.clientWidth * 0.8);
    element.dispatchEvent(new Event('scroll'));
  };

  const finishDrag = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const captureTarget = dragRef.current.captureTarget;
    dragRef.current = null;
    setIsDragging(false);
    if (captureTarget.hasPointerCapture?.(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (blocks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-20 right-20 top-10 z-[45] md:left-1/2 md:right-auto md:w-[min(76vw,620px)] md:-translate-x-1/2">
      <div className="pointer-events-auto flex max-w-full items-center border-y border-[#c8aa6e]/20 bg-[#080d16]/90 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">
      {scrollState.overflow && <button type="button" aria-label="Ver iniciativas anteriores" disabled={!scrollState.left}
        onClick={() => scroll(-1)} className="flex h-11 w-9 shrink-0 items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/10 disabled:opacity-25 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#c8aa6e]"><ChevronLeft size={18} /></button>}
      <div ref={scrollRef}
        className="flex min-w-0 max-w-full flex-1 items-center gap-0 overflow-x-auto overscroll-x-contain px-1 py-1 scrollbar-hide md:gap-1 md:px-2 md:py-1.5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#c8aa6e]"
        role="region"
        aria-label="Orden de iniciativa"
        tabIndex={0}
        style={{ touchAction: 'pan-x', userSelect: 'none', cursor: scrollState.overflow ? (isDragging ? 'grabbing' : 'grab') : undefined }}
        onPointerDown={event => {
          suppressClickRef.current = false;
          if (event.pointerType !== 'mouse' || event.button !== 0 || !scrollState.overflow) return;
          event.stopPropagation();
          const captureTarget = event.target.closest('button') || event.currentTarget;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false, captureTarget };
          captureTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (!(event.buttons & 1)) { finishDrag(event); return; }
          const delta = event.clientX - drag.x;
          // Small hand movements still count as a click on the portrait.
          if (!drag.moved && Math.abs(delta) < 5) return;
          if (!drag.moved) {
            drag.moved = true;
            suppressClickRef.current = true;
            setIsDragging(true);
          }
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.scrollLeft = drag.scrollLeft - delta;
          event.currentTarget.dispatchEvent(new Event('scroll'));
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onDragStart={event => event.preventDefault()}
        onClickCapture={event => {
          if (!suppressClickRef.current) return;
          suppressClickRef.current = false;
          if (event.detail === 0) return; // Keep keyboard activation available.
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const element = scrollRef.current;
          if (event.key === 'Home' || event.key === 'End') {
            element.scrollLeft = event.key === 'Home' ? 0 : element.scrollWidth;
            element.dispatchEvent(new Event('scroll'));
          } else scroll(event.key === 'ArrowLeft' ? -1 : 1);
        }}
      >
        {blocks.map((block, blockIndex) => (
          <React.Fragment key={block.id}>
            {blockIndex > 0 && <span className="h-px w-2 shrink-0 bg-slate-700/50 md:w-3" />}
            <div
              className={`flex shrink-0 items-center gap-1 border px-1 py-1 transition-colors md:gap-1.5 md:px-1.5 ${block.active ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/10' : 'border-transparent'}`}
              aria-label={`Bloque de iniciativa ${block.initiative}`}
              data-active-block={block.active ? 'true' : 'false'}
            >
              {block.tokens.length > 1 && <Users size={11} className={block.side === 'players' ? 'text-sky-300' : 'text-red-300'} />}
              <div className="flex -space-x-1">
                {block.tokens.map((token) => (
                  <button
                    type="button"
                    key={token.id}
                    data-token-id={token.id}
                    onClick={() => onSelect(token.id)}
                    style={{ cursor: scrollState.overflow ? 'inherit' : undefined }}
                    className={`relative h-6 w-6 overflow-hidden rounded-full border bg-[#111827] transition-transform hover:z-10 hover:scale-110 md:h-7 md:w-7 ${selectedId === token.id ? 'z-10 border-white' : block.active ? 'border-[#c8aa6e]' : 'border-slate-700'} ${token.hasActed ? 'grayscale opacity-45' : ''}`}
                    title={`${token.name} · iniciativa ${token.initiative}`}
                  >
                    {token.portrait || token.img
                      ? <img src={token.portrait || token.img} alt="" draggable={false} className="h-full w-full object-cover" />
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
      {scrollState.overflow && <button type="button" aria-label="Ver iniciativas siguientes" disabled={!scrollState.right}
        onClick={() => scroll(1)} className="flex h-11 w-9 shrink-0 items-center justify-center text-[#c8aa6e] hover:bg-[#c8aa6e]/10 disabled:opacity-25 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#c8aa6e]"><ChevronRight size={18} /></button>}
      </div>
    </div>
  );
};

export default CanvasInitiativeTimeline;
