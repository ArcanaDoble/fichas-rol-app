import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';

export const CANVAS_MASTER_POINTER_COLOR = '#d8b968';
const PALETTE = [
    ['#60d5ef', 192], ['#f08287', 356], ['#bb96f5', 265], ['#6fd6aa', 153],
    ['#f3a56c', 26], ['#7daaf5', 217], ['#ee94c9', 324], ['#b8d96e', 78],
];
const hueOf = color => color === CANVAS_MASTER_POINTER_COLOR ? 43
    : PALETTE.find(([value]) => value === color)?.[1] ?? Number(/^hsl\(([\d.]+)/.exec(color)?.[1]);
const hueDistance = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Favor separated hues, then randomly choose among the strongest candidates.
// Gold is reserved for the first master, even when players enter beforehand.
export const chooseCanvasPointerColor = (colors = {}, isMaster = false, random = Math.random()) => {
    const occupied = new Set(Object.values(colors).filter(color => typeof color === 'string'));
    if (isMaster && !occupied.has(CANVAS_MASTER_POINTER_COLOR)) return CANVAS_MASTER_POINTER_COLOR;
    occupied.add(CANVAS_MASTER_POINTER_COLOR);
    const hues = [...occupied].map(hueOf).filter(Number.isFinite);
    const score = hue => Math.min(...hues.map(other => hueDistance(hue, other)));
    let candidates = PALETTE.filter(([color]) => !occupied.has(color));
    if (!candidates.length) {
        // Larger groups also receive unique colors instead of wrapping a palette.
        candidates = Array.from({ length: 72 }, (_, index) => {
            const hue = Number((((index + occupied.size) * 137.508 + random * 360) % 360).toFixed(3));
            return [`hsl(${hue} 72% 66%)`, hue];
        }).filter(([color]) => !occupied.has(color));
    }
    const best = Math.max(...candidates.map(([, hue]) => score(hue)));
    const separated = candidates.filter(([, hue]) => score(hue) >= best * .8);
    return separated[Math.min(separated.length - 1, Math.floor(Math.max(0, random) * separated.length))][0];
};

export const reserveCanvasPointerColor = ({ scenarioCollectionName, scenarioId, actorId, isMaster }) => {
    const reference = doc(db, scenarioCollectionName, scenarioId, 'sharedPointerPalette', 'assignments');
    const random = Math.random(); // Stable through Firestore transaction retries.
    return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        const colors = snapshot.exists() ? snapshot.data().colors || {} : {};
        if (typeof colors[actorId] === 'string') return colors[actorId];
        const color = chooseCanvasPointerColor(colors, isMaster, random);
        transaction.set(reference, { colors: { ...colors, [actorId]: color } }, { merge: true });
        return color;
    });
};
