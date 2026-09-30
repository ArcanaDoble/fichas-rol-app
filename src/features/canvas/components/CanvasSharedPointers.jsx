import React from 'react';
import { motion } from 'framer-motion';
import { getActiveCanvasPings } from '../sharedPointerModel';

const PING_WAVE_DELAYS = [0, 0.3, 0.6];

const CanvasSharedPointers = ({ pointers = [], now = Date.now(), zoom = 1 }) => {
    const inverseZoom = 1 / Math.max(0.1, Number(zoom) || 1);

    return (
        <div className="pointer-events-none absolute inset-0 z-[65]" aria-hidden="true">
            {pointers.map((pointer) => {
                const activePings = getActiveCanvasPings(pointer, now);
                return (
                    <React.Fragment key={pointer.id || pointer.actorId}>
                        {activePings.flatMap((ping) => PING_WAVE_DELAYS.map((delay, waveIndex) => (
                            <motion.div
                                key={`${ping.id}-wave-${waveIndex}`}
                                data-canvas-ping-wave={waveIndex + 1}
                                className="absolute h-12 w-12 rounded-full border-2"
                                initial={{ opacity: 0, scale: 0.2 }}
                                animate={{ opacity: [0, 0.95, 0], scale: [0.2, 0.35, 2.4] }}
                                transition={{
                                    duration: 1.55,
                                    delay,
                                    times: [0, 0.08, 1],
                                    ease: 'easeOut',
                                }}
                                style={{
                                    left: ping.x,
                                    top: ping.y,
                                    borderColor: pointer.color,
                                    boxShadow: `0 0 18px ${pointer.color}`,
                                    transformOrigin: 'center',
                                    marginLeft: -24,
                                    marginTop: -24,
                                }}
                            />
                        )))}
                        {pointer.visible !== false && (
                            <div
                                data-canvas-shared-pointer
                                className="absolute"
                                style={{
                                    left: pointer.x,
                                    top: pointer.y,
                                    transform: `translate(-9px, -9px) scale(${inverseZoom})`,
                                    transformOrigin: '9px 9px',
                                }}
                            >
                                <span
                                    data-canvas-pointer-label
                                    className="absolute left-[9px] top-[-3px] z-0 flex h-6 min-w-[72px] items-center whitespace-nowrap border border-white/15 bg-black/90 pb-px pl-4 pr-3 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-lg"
                                    style={{ borderColor: `${pointer.color}80` }}
                                >
                                    {pointer.name || 'Jugador'}
                                </span>
                                <span
                                    className="relative z-10 block h-[18px] w-[18px] rotate-45 border border-black/80 shadow-[0_0_12px_rgba(0,0,0,0.7)]"
                                    style={{ backgroundColor: pointer.color }}
                                />
                                <span
                                    className="absolute left-[3px] top-[3px] z-20 h-[5px] w-[5px] rotate-45 border-l border-t border-white/50"
                                    aria-hidden="true"
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default CanvasSharedPointers;
