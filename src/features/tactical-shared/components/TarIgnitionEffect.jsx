import React, { useEffect, useRef, useState } from 'react';
import { TAR_IGNITION_DURATION, ignitionHasExpired } from '../tarIgnitionPresentation';

const SIZE = 192;
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const noise = (x, y) => {
    const ix = Math.floor(x); const iy = Math.floor(y);
    const fx = smooth(x - ix); const fy = smooth(y - iy);
    return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy)
        + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
};

// Absolute event time gives late subscribers the current flame/ember phase.
// Canvas2D avoids allocating another WebGL context on mobile.
export default function TarIgnitionEffect({ item }) {
    const ref = useRef(null);
    const [expired, setExpired] = useState(() => ignitionHasExpired(item));
    const { startedAt, origin, extent } = item.areaEffect;
    useEffect(() => {
        if (ignitionHasExpired(item)) { setExpired(true); return undefined; }
        setExpired(false);
        const timer = setTimeout(() => setExpired(true), Math.max(0, startedAt + TAR_IGNITION_DURATION - Date.now()));
        const canvas = ref.current;
        if (!canvas || /jsdom/i.test(navigator.userAgent)) return () => clearTimeout(timer);
        const context = canvas.getContext('2d');
        if (!context) return () => clearTimeout(timer);
        const data = context.createImageData(SIZE, SIZE);
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let frame; let last = -Infinity;
        const draw = tick => {
            const age = Date.now() - startedAt;
            if (age >= TAR_IGNITION_DURATION) return;
            if (!document.hidden && tick - last >= 65) {
                last = tick;
                const time = reduced ? 1.5 : age / 1000;
                const dying = smooth((age - 3300) / 1500);
                const fade = 1 - smooth((age - 4300) / 900);
                for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
                    const u = x / SIZE; const v = y / SIZE; const i = (y * SIZE + x) * 4;
                    const wx = item.x + u * item.width; const wy = item.y + v * item.height;
                    // A slow diagonal front, shared across connected puddles.
                    const arrival = (wx - origin.x + wy - origin.y) / extent * 2500;
                    const irregularEdge = (noise(u * 12, v * 12) - 0.5) * 130;
                    const lit = smooth((age - arrival - irregularEdge) / 230);
                    const edge = smooth((Math.min(u, v, 1 - u, 1 - v) - 0.02 - noise(u * 23, v * 23) * 0.035) / 0.05);
                    const warp = noise(u * 6, v * 5 - time * 0.8);
                    const fuel = noise(u * 9 + warp * 2, v * 9);
                    const flame = noise(u * 13 + warp * 2, v * 6 + time * 2.2) * 0.65
                        + noise(u * 29, v * 13 + time * 4) * 0.35;
                    const heat = smooth((flame + fuel * 0.52 - 0.53) / 0.40);
                    const ember = Math.pow(clamp((fuel - 0.40) * 2), 3);
                    const intensity = Math.pow(heat, 1.8) * 0.85 * (1 - dying) + ember * dying * 0.5;
                    data.data[i] = 12 + lit * (43 + Math.sqrt(intensity) * 200);
                    data.data[i + 1] = 11 + lit * (-3 + Math.pow(intensity, 2) * 245);
                    data.data[i + 2] = 13 + lit * (-10 + Math.pow(intensity, 5) * 154);
                    data.data[i + 3] = edge * fade * ((1 - lit) * 0.95 + lit * clamp(0.15 * (1 - dying) + intensity * 2)) * 235;
                }
                context.putImageData(data, 0, 0);
                if (!reduced) for (let n = 0; n < 16; n += 1) {
                    const cycle = (time * 0.6 + hash(n, 9)) % 1;
                    const sx = (0.1 + hash(n, 2) * 0.8) * SIZE + Math.sin(time * 2 + n) * 3;
                    const sy = (0.85 - cycle * 0.65) * SIZE;
                    const sparkArrival = (item.x + sx / SIZE * item.width - origin.x
                        + item.y + sy / SIZE * item.height - origin.y) / extent * 2500;
                    const sparkLit = smooth((age - sparkArrival) / 230);
                    context.fillStyle = `rgba(255, ${150 + n * 4}, 65, ${Math.sin(cycle * Math.PI) * (1 - dying) * sparkLit * 0.8})`;
                    context.beginPath(); context.ellipse(sx, sy, 0.6, 1.5, 0.2, 0, Math.PI * 2); context.fill();
                }
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
    }, [item, startedAt, origin, extent]);
    if (expired) return null;
    return <div aria-label="Brea prendiéndose: llamas y brasas" data-tar-ignition="true"
        style={{ position: 'absolute', left: item.x, top: item.y, width: item.width, height: item.height,
            pointerEvents: 'none', zIndex: 16 }}>
        <canvas ref={ref} width={SIZE} height={SIZE} aria-hidden="true"
            style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 9px #e76b2438)' }} />
    </div>;
}
