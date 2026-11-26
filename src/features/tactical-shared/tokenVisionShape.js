const SAMPLE_SIZE = 96;
const MAX_RINGS = 4;
const MAX_VERTICES = 64;
const imageKeys = new Map();

// Identify the art without storing a second copy of a URL or a data image.
const imageKey = (source = '') => {
    if (typeof source !== 'string') source = '';
    if (imageKeys.has(source)) return imageKeys.get(source);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
        hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
    }
    const key = `${source.length}:${(hash >>> 0).toString(36)}`;
    if (imageKeys.size >= 32) imageKeys.clear();
    imageKeys.set(source, key);
    return key;
};

const area = points => points.reduce((sum, a, index) => {
    const b = points[(index + 1) % points.length];
    return sum + a.x * b.y - b.x * a.y;
}, 0) / 2;

const simplify = (points, tolerance) => {
    if (points.length < 3) return points;
    const first = points[0], last = points[points.length - 1];
    const dx = last.x - first.x, dy = last.y - first.y;
    const length = Math.hypot(dx, dy);
    let distance = tolerance, split = 0;
    points.slice(1, -1).forEach((point, index) => {
        const next = length ? Math.abs(dx * (point.y - first.y) - dy * (point.x - first.x)) / length
            : Math.hypot(point.x - first.x, point.y - first.y);
        if (next > distance) { distance = next; split = index + 1; }
    });
    return split ? [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(split), tolerance)] : [first, last];
};

// Trace the exposed sides of opaque samples. Concave edges and separated
// pieces stay distinct, unlike a bounding box or a convex hull.
export const traceTokenVisionContours = (rgba, width, height) => {
    const solid = (x, y) => x >= 0 && y >= 0 && x < width && y < height
        && rgba[(y * width + x) * 4 + 3] >= 96;
    const corners = new Map(), edges = [];
    const key = (x, y) => y * (width + 1) + x;
    const add = (x, y, endX, endY, direction) => {
        const edge = { x, y, start: key(x, y), end: key(endX, endY), direction, used: false };
        if (!corners.has(edge.start)) corners.set(edge.start, []);
        corners.get(edge.start).push(edge);
        edges.push(edge);
    };
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        if (!solid(x, y)) continue;
        if (!solid(x, y - 1)) add(x, y, x + 1, y, 0);
        if (!solid(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
        if (!solid(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
        if (!solid(x - 1, y)) add(x, y + 1, x, y, 3);
    }
    const rings = [];
    for (const first of edges) {
        if (first.used) continue;
        const points = [];
        let edge = first;
        while (edge) {
            edge.used = true;
            points.push({ x: edge.x, y: edge.y });
            if (edge.end === first.start) break;
            const next = corners.get(edge.end) || [];
            // At a diagonal contact, follow the clockwise boundary of this piece.
            edge = [1, 0, 3, 2].map(turn => next.find(candidate => !candidate.used
                && candidate.direction === (edge.direction + turn) % 4)).find(Boolean);
        }
        const size = area(points);
        if (edge && size >= 3) rings.push({ points, size });
    }
    return rings.sort((a, b) => b.size - a.size).slice(0, MAX_RINGS).map(({ points }) => {
        const split = Math.floor(points.length / 2);
        let tolerance = 0.7, result;
        do {
            result = [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1),
                ...simplify([...points.slice(split), points[0]], tolerance).slice(0, -1)];
            tolerance *= 1.25;
        } while (result.length > MAX_VERTICES);
        return result.map(({ x, y }) => ({
            x: Number((x / width).toFixed(5)), y: Number((y / height).toFixed(5)),
        }));
    }).filter(points => points.length >= 3);
};

// Only the master preparing the switch reads pixels; the result is saved
// alongside the token so every client uses the same outline immediately.
export const readTokenVisionShape = source => new Promise(resolve => {
    if (!source || typeof Image === 'undefined') { resolve(null); return; }
    const image = new Image();
    const finish = value => {
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 4000);
    if (/^(https?:)?\/\//i.test(source)) image.crossOrigin = 'anonymous';
    image.onerror = () => finish(null);
    image.onload = () => {
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!(width && height)) { finish(null); return; }
        const shape = { imageKey: imageKey(source), width, height, rings: [] };
        try {
            const scale = Math.min(1, SAMPLE_SIZE / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            // A map between arrays keeps this representation valid in Firestore.
            shape.rings = traceTokenVisionContours(data, canvas.width, canvas.height).map(points => ({ points }));
        } catch { /* The token still has a usable rectangular footprint. */ }
        finish(shape);
    };
    image.src = source;
});

const rectangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

export const getTokenVisionLocalPolygons = (token) => {
    const width = Number(token.width), height = Number(token.height);
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return [];
    if (token.isCircular) return [Array.from({ length: 32 }, (_, index) => {
        const angle = index * 2 * Math.PI / 32;
        return { x: width / 2 * (1 + Math.cos(angle)), y: height / 2 * (1 + Math.sin(angle)) };
    })];
    const stored = token.visionBlockerShape;
    const shape = stored && stored.imageKey === imageKey(token.img) && stored.width > 0 && stored.height > 0
        && Number.isFinite(stored.width / stored.height)
        ? stored : null;
    const ratio = shape ? shape.width / shape.height : width / height;
    const fitWidth = Math.min(width, height * ratio), fitHeight = fitWidth / ratio;
    const x = (width - fitWidth) / 2, y = (height - fitHeight) / 2;
    const rings = (Array.isArray(shape?.rings) ? shape.rings : []).slice(0, MAX_RINGS).map(ring => ring?.points)
        .filter(points => Array.isArray(points) && points.length >= 3 && points.length <= MAX_VERTICES
            && points.every(point => point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1));
    return (rings.length ? rings : [rectangle]).map(points => points.map(point => ({
        x: x + point.x * fitWidth, y: y + point.y * fitHeight,
    })));
};

export const getTokenVisionWorldPolygons = (token, placement = token) => {
    const cx = Number(token.width) / 2, cy = Number(token.height) / 2;
    const angle = (Number(token.rotation) || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return getTokenVisionLocalPolygons(token).map(points => points.map(point => ({
        x: Number(placement.x) + cx + (point.x - cx) * cos - (point.y - cy) * sin,
        y: Number(placement.y) + cy + (point.x - cx) * sin + (point.y - cy) * cos,
    })));
};
