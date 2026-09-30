import { isImageUrlLoaded, markImageUrlLoaded } from '../../utils/imageLoadCache';
import { isTokenInsideSmokeArea } from './tokenVisibilityAccess';

const pending = new Set();
const failedUntil = new Map();
const queue = [];
let active = 0;

const drain = () => {
    while (active < 4 && queue.length) {
        const source = queue.shift();
        active += 1;
        const image = new Image();
        image.decoding = 'async';
        let settled = false;
        const finish = (loaded) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            image.onload = null;
            image.onerror = null;
            if (loaded) markImageUrlLoaded(source);
            else {
                if (failedUntil.size >= 64) failedUntil.clear();
                failedUntil.set(source, Date.now() + 30000);
            }
            pending.delete(source);
            active -= 1;
            drain();
        };
        const timeout = setTimeout(() => finish(false), 15000);
        image.onload = () => {
            if (typeof image.decode === 'function') image.decode().then(() => finish(true), () => finish(true));
            else finish(true);
        };
        image.onerror = () => finish(false);
        image.src = source;
    }
};

// Hidden residents would otherwise start loading only when the viewer crosses
// the boundary. Warm just their portraits, with bounded parallel requests.
export const warmSmokePortraits = (items = []) => {
    items.forEach(item => {
        const source = item?.img;
        if (!source || pending.size >= 64 || pending.has(source) || isImageUrlLoaded(source)
            || (failedUntil.get(source) || 0) > Date.now() || !isTokenInsideSmokeArea(item, items)) return;
        pending.add(source);
        queue.push(source);
    });
    drain();
};
