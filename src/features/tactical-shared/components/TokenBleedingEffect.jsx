import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';
import './TokenBleedingEffect.css';

const SIZE = 256;
const subscribers = new Set();
let surface;
let frame = 0;
let last = 0;
const seeds = Array.from({ length: 11 }, (_, i) => ({
    x: .13 + ((i * .27183) % .74), y: .1 + ((i * .1937) % .59),
    phase: (i * .618) % 1, length: .12 + (i % 4) * .026,
}));

// One shared moving texture: the portrait/cutout supplies the final alpha mask.
const paint = time => {
    surface ||= document.createElement('canvas');
    if (surface.width !== SIZE) surface.width = surface.height = SIZE;
    const ctx = surface.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    seeds.forEach((seed, index) => {
        const phase = (time / 6700 + seed.phase) % 1;
        const strength = Math.sin(Math.PI * phase) ** 2;
        const x = (seed.x + Math.sin(time / 11000 + index) * .027) * SIZE;
        const y = seed.y * SIZE;
        const length = seed.length * SIZE * Math.min(1, phase * 2.4);
        const drift = Math.sin(index * 2.3) * 5;
        const stain = ctx.createRadialGradient(x, y + 3, 0, x, y + 3, 16);
        stain.addColorStop(0, `rgba(119, 12, 30, ${strength * .48})`);
        stain.addColorStop(1, 'rgba(80, 7, 21, 0)');
        ctx.fillStyle = stain;
        ctx.fillRect(x - 16, y - 13, 32, 32);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + drift, y + length * .34, x - drift * .4, y + length * .7, x + drift * .3, y + length);
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.5 + (index % 3) * .55;
        ctx.strokeStyle = `rgba(118, 12, 30, ${strength * .84})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + drift * .3, y + length, 1.7, 2.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(177, 30, 49, ${strength * .85})`;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + drift * .3 - .45, y + length - .7, .45, 1, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 133, 133, ${strength * .48})`;
        ctx.fill();
    });
    subscribers.forEach(sub => {
        if (sub.reduced && sub.painted) return;
        const context = sub.canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, SIZE, SIZE);
        context.drawImage(surface, 0, 0);
        sub.painted = true;
    });
};
const tick = time => {
    frame = 0;
    if (!subscribers.size) return;
    if (!document.hidden && time - last > 1000 / 24) { paint(time); last = time; }
    if ([...subscribers].some(sub => !sub.reduced)) frame = requestAnimationFrame(tick);
};

export default function TokenBleedingEffect({ active, circular = true, source, remedyEffect }) {
    const canvas = useRef(null);
    const reduced = useReducedMotion();
    const [visible, setVisible] = useState(active);
    const [present, setPresent] = useState(active);
    const remedyStart = remedyEffect?.effect === 'remove-bleeding'
        ? Number(remedyEffect.presentationStartedAt || remedyEffect.startedAt) : 0;
    useEffect(() => {
        if (!active && !present) return undefined;
        if (active) { setPresent(true); setVisible(true); return undefined; }
        // The dressing reaches the wound at the same beat as its field and caption.
        const delay = !reduced && remedyStart ? Math.max(0, remedyStart + 1050 - Date.now()) : 0;
        const fade = setTimeout(() => setVisible(false), delay);
        const finish = setTimeout(() => setPresent(false), delay + (reduced ? 200 : 1700));
        return () => { clearTimeout(fade); clearTimeout(finish); };
    }, [active, present, remedyStart, reduced]);
    useEffect(() => {
        if (!present || !canvas.current || /jsdom/i.test(navigator.userAgent)) return undefined;
        const sub = { canvas: canvas.current, reduced };
        subscribers.add(sub);
        paint(last || 1900);
        if (!frame && !reduced) frame = requestAnimationFrame(tick);
        return () => {
            subscribers.delete(sub);
            if (!subscribers.size) { cancelAnimationFrame(frame); frame = 0; }
        };
    }, [present, reduced]);
    if (!present) return null;
    return <div className="canvas-token-bleeding" data-active={visible} role="img" aria-label="Sangrado" aria-hidden={!active}
        style={{ borderRadius: circular ? '50%' : 0, ...(!circular ? getTokenSilhouetteStyle(source, false) : {}) }}>
        <canvas ref={canvas} width={SIZE} height={SIZE} aria-hidden="true" />
    </div>;
}
