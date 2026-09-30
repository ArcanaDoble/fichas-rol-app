import React, { useEffect, useRef, useState } from 'react';
import './TokenPoisonEffect.css';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';

const SIZE = 128;
const subscribers = new Set();
let frame = 0;
let last = 0;
let surface;
let silhouetteSurface;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy)
        + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
};
const paint = time => {
    if (!surface) { surface = document.createElement('canvas'); surface.width = SIZE; surface.height = SIZE; }
    if (!silhouetteSurface) { silhouetteSurface = document.createElement('canvas'); silhouetteSurface.width = SIZE; silhouetteSurface.height = SIZE; }
    const ctx = surface.getContext('2d');
    const silhouetteContext = silhouetteSurface.getContext('2d');
    if (!ctx || !silhouetteContext) return;
    const data = ctx.createImageData(SIZE, SIZE);
    const silhouetteData = [...subscribers].some(sub => !sub.circular) ? silhouetteContext.createImageData(SIZE, SIZE) : null;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const u = x / SIZE, v = y / SIZE, i = (y * SIZE + x) * 4;
        const radius = Math.hypot(u - .5, v - .5) * 2;
        const curl = noise(u * 6 + time * .00009, v * 7 - time * .00012);
        const wisps = noise(u * 13 + curl * 2, v * 12 - time * .0002);
        const veil = smooth((radius - .38) / .48) * smooth((curl + wisps * .4 - .40) / .48);
        data.data[i] = 90 + wisps * 60;
        data.data[i + 1] = 112 + wisps * 61;
        data.data[i + 2] = 40 + wisps * 25;
        data.data[i + 3] = veil * (125 + Math.sin(time * .0014) * 23);
        // A cutout has no circular rim: broad clouds drift across the entire
        // image, while a soft travelling wave changes which patches intensify.
        // The image alpha clips this field, including the gaps between limbs.
        if (silhouetteData) {
            const cloud = noise(u * 3.2 + Math.sin(time * .00022) * .6, v * 3.6 - time * .00018);
            const wave = .5 + .5 * Math.sin(v * 6 + u * 3 - time * .0009 + curl * 2);
            const bodyVeil = smooth((cloud * .65 + curl * .35 - .22) / .53) * (.3 + .7 * wave);
            silhouetteData.data[i] = data.data[i];
            silhouetteData.data[i + 1] = data.data[i + 1];
            silhouetteData.data[i + 2] = data.data[i + 2];
            silhouetteData.data[i + 3] = bodyVeil * (145 + wisps * 22);
        }
    }
    ctx.putImageData(data, 0, 0);
    if (silhouetteData) silhouetteContext.putImageData(silhouetteData, 0, 0);
    subscribers.forEach(({ canvas, circular }) => {
        const context = canvas.getContext('2d');
        if (context) { context.clearRect(0, 0, SIZE, SIZE); context.drawImage(circular ? surface : silhouetteSurface, 0, 0); }
    });
};
const tick = time => {
    if (!subscribers.size) { frame = 0; return; }
    if (!document.hidden && time - last >= 90) { paint(time); last = time; }
    frame = requestAnimationFrame(tick);
};
export default function TokenPoisonEffect({ circular = true, active = true, source }) {
    const ref = useRef(null);
    const [present, setPresent] = useState(active);
    useEffect(() => {
        if (active) { setPresent(true); return undefined; }
        const timer = setTimeout(() => setPresent(false), 1800);
        return () => clearTimeout(timer);
    }, [active]);
    useEffect(() => {
        if (!present || /jsdom/i.test(navigator.userAgent)) return undefined;
        const canvas = ref.current;
        const subscription = { canvas, circular };
        subscribers.add(subscription); paint(last);
        if (!frame && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) frame = requestAnimationFrame(tick);
        return () => { subscribers.delete(subscription); if (!subscribers.size) { cancelAnimationFrame(frame); frame = 0; } };
    }, [present, circular]);
    return <div className="canvas-token-poison" data-active={active} aria-hidden={!active} style={{ borderRadius: circular ? '50%' : 0,
        ...(!circular ? { inset: 0, transform: 'none', boxShadow: 'none', ...getTokenSilhouetteStyle(source, false) } : {}) }}
        role="img" aria-label={active ? 'Envenenado: no puede recuperar Vida' : undefined}>
        <canvas ref={ref} width={SIZE} height={SIZE} aria-hidden="true" />
    </div>;
}
