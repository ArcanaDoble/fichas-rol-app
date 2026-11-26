import React, { useEffect, useState } from 'react';
import { getActiveCanvasPings } from '../sharedPointerModel';
import './CanvasSharedPointers.css';

const PING_WAVE_DELAYS = [0, 280, 560];

const PingSignal = ({ ping, color, name, now, inverseZoom }) => {
    const [age] = useState(() => Math.max(0, now - Number(ping.createdAt)));
    return <div data-canvas-ping={ping.id} className="canvas-signal-ping"
        style={{ left: ping.x, top: ping.y, transform: `scale(${inverseZoom})`, '--signal-color': color,
            '--signal-age': `${-age}ms` }}>
        {PING_WAVE_DELAYS.map((delay, index) => <span key={index} data-canvas-ping-wave={index + 1}
            className="canvas-signal-ping__wave" style={{ animationDelay: `${delay - age}ms` }} />)}
        <span className="canvas-signal-ping__flash" />
        <svg className="canvas-signal-ping__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 12L14 14L12 20 M44 12L50 14L52 20 M52 44L50 50L44 52 M20 52L14 50L12 44" />
            <path className="canvas-signal-ping__center" d="M32 26L38 32L32 38L26 32Z" />
        </svg>
        <span className="canvas-signal-ping__name">{name || 'Jugador'}</span>
    </div>;
};

const CanvasSharedPointers = ({ pointers = [], now = Date.now(), zoom = 1 }) => {
    const inverseZoom = 1 / Math.max(0.1, Number(zoom) || 1);
    useEffect(() => {
        // Warm the shared lettering on entering the Canvas, before Ctrl is used.
        document.fonts?.load('700 12px "Noma Pointer Cinzel"')?.catch(() => {});
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 z-[65]" aria-hidden="true">
            {pointers.map((pointer) => {
                const activePings = getActiveCanvasPings(pointer, now);
                return (
                    <React.Fragment key={pointer.id || pointer.actorId}>
                        {activePings.map(ping => <PingSignal key={ping.id} ping={ping} color={ping.color || pointer.color}
                            name={ping.name || pointer.name} now={now} inverseZoom={inverseZoom} />)}
                        {pointer.visible !== false && (
                            <div
                                data-canvas-shared-pointer
                                className="canvas-signal-pointer"
                                style={{
                                    transform: `translate(${pointer.x}px, ${pointer.y}px)`,
                                    transition: pointer.isLocal ? 'none' : 'transform 100ms linear',
                                    '--signal-color': pointer.color,
                                }}
                            >
                                <div className="canvas-signal-pointer__scale" style={{ transform: `scale(${inverseZoom})` }}>
                                    <span data-canvas-pointer-label className="canvas-signal-pointer__name">
                                        {pointer.name || 'Jugador'}
                                    </span>
                                    <svg className="canvas-signal-pointer__gem" viewBox="0 0 24 24" aria-hidden="true">
                                        <path className="canvas-signal-pointer__outline" d="M12 1L23 12L12 23L1 12Z" />
                                        <path className="canvas-signal-pointer__facet" d="M12 1L12 12L1 12Z" />
                                        <path className="canvas-signal-pointer__shade" d="M12 12L23 12L12 23Z" />
                                        <path className="canvas-signal-pointer__shine" d="M12 5L5 12M12 9L15 12L12 15L9 12Z" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default CanvasSharedPointers;
