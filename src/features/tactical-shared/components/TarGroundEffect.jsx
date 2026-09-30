import React, { useEffect, useRef } from 'react';
import './TarGroundEffect.css';

const SIZE = 256;
const subscribers = new Map();
const portraitMasks = new Map();
let frame = 0;
let lastFrame = 0;
let texture;
let normals;
let pixels;
const smooth = t => t * t * (3 - 2 * t);
const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
const noise = (x, y) => {
    const ix = Math.floor(x); const iy = Math.floor(y);
    const fx = smooth(x - ix); const fy = smooth(y - iy);
    return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy)
        + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
};
const surface = (x, y) => {
    const warp = noise(x * 3, y * 3) * 2;
    return noise(x * 5 + warp, y * 5 + warp) * 0.65
        + noise(x * 13 - warp, y * 13 + warp) * 0.15 + noise(x * 36, y * 36) * 0.025;
};
const prepare = () => {
    texture = document.createElement('canvas'); texture.width = SIZE; texture.height = SIZE;
    const context = texture.getContext('2d');
    if (!context) return false;
    pixels = context.createImageData(SIZE, SIZE);
    normals = new Float32Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
        const u = x / SIZE; const v = y / SIZE; const i = (y * SIZE + x) * 4;
        const h = surface(u, v);
        normals[i] = (surface(u + 0.006, v) - h) * 15;
        normals[i + 1] = (surface(u, v + 0.006) - h) * 15;
        normals[i + 2] = h;
        const rim = Math.min(u, v, 1 - u, 1 - v);
        const edge = 0.017 + noise(u * 23, v * 23) * 0.055;
        normals[i + 3] = smooth(Math.max(0, Math.min(1, (rim - edge) / 0.014)));
    }
    return true;
};
const paint = time => {
    const lx = Math.sin(time * 0.00012) * 0.22 + 0.18;
    const ly = -0.32 + Math.cos(time * 0.00009) * 0.08;
    for (let i = 0; i < normals.length; i += 4) {
        const nx = normals[i]; const ny = normals[i + 1]; const h = normals[i + 2];
        const light = Math.max(0, 1 - Math.hypot(nx - lx, ny - ly) * 1.4);
        const specular = Math.pow(light, 16) * 135;
        const sheen = Math.pow(light, 5) * 13;
        pixels.data[i] = 10 + h * 9 + sheen + specular * 0.91;
        pixels.data[i + 1] = 10 + h * 7 + sheen + specular * 0.84;
        pixels.data[i + 2] = 12 + h * 5 + sheen + specular * 0.70;
        pixels.data[i + 3] = normals[i + 3] * 247;
    }
    texture.getContext('2d').putImageData(pixels, 0, 0);
    subscribers.forEach((mask, canvas) => {
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            // Portraits use only the opaque interior of the ground material.
            // Its square puddle edge must never cut across the circular portrait.
            if (mask) context.drawImage(texture, 24, 24, SIZE - 48, SIZE - 48, 0, 0, canvas.width, canvas.height);
            else context.drawImage(texture, 0, 0, canvas.width, canvas.height);
            if (mask) {
                context.globalCompositeOperation = 'destination-in';
                context.drawImage(mask, 0, 0, canvas.width, canvas.height);
                context.globalCompositeOperation = 'source-over';
            }
        }
    });
};
const tick = time => {
    if (!subscribers.size) { frame = 0; return; }
    if (!document.hidden && time - lastFrame > 80) { paint(time); lastFrame = time; }
    frame = requestAnimationFrame(tick);
};

// A detailed, feathered mask breaks up the oil without fixed vector silhouettes.
const getPortraitMask = circular => {
    if (portraitMasks.has(circular)) return portraitMasks.get(circular);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d');
    const data = context.createImageData(512, 512);
    const clamp = value => Math.max(0, Math.min(1, value));
    for (let y = 0; y < 512; y += 1) for (let x = 0; x < 512; x += 1) {
        const u = x / 512; const v = y / 512;
        const edge = smooth(clamp((Math.abs(u - 0.5) - 0.16) / 0.32));
        const bottom = smooth(clamp((v - 0.42) / 0.58));
        const grain = noise(u * 11 + noise(u * 4, v * 4), v * 13) * 0.48
            + noise(u * 43, v * 43) * 0.13 + noise(u * 117, v * 117) * 0.045;
        const face = Math.exp(-((u - 0.5) ** 2 / 0.045 + (v - 0.38) ** 2 / 0.07));
        const alpha = smooth(clamp((0.16 + edge * 0.39 + bottom * 0.43 + grain - 0.60) / 0.22));
        data.data[(y * 512 + x) * 4 + 3] = alpha * (1 - face * 0.8) * 242;
    }
    context.putImageData(data, 0, 0);
    portraitMasks.set(circular, canvas);
    return canvas;
};

// Ground and portraits share the same moving oil, without per-token GPU contexts.
export function useTarTexture(ref, { portrait = false, active = true, circular = true } = {}) {
    useEffect(() => {
        if (!active || (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))) return undefined;
        if (!normals && !prepare()) return undefined;
        const canvas = ref.current;
        subscribers.set(canvas, portrait ? getPortraitMask(circular) : null);
        paint(lastFrame);
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (!reduced && !frame) frame = requestAnimationFrame(tick);
        return () => { subscribers.delete(canvas); if (!subscribers.size) { cancelAnimationFrame(frame); frame = 0; } };
    }, [ref, portrait, active, circular]);
}

export default function TarGroundEffect() {
    const ref = useRef(null);
    useTarTexture(ref);
    return <div className="canvas-tar-zone" aria-label="Brea: terreno difícil e inflamable">
        <canvas ref={ref} width={SIZE} height={SIZE} aria-hidden="true" />
        <span className="canvas-tar-zone__grid" />
        <span className="canvas-tar-zone__label">Brea <span>· Movimiento ×2</span></span>
    </div>;
}
