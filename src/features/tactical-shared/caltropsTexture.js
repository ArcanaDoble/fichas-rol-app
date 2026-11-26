const CALTROP_IMAGE = '/scenery/hazards/abrojos-1.webp';

export const CALTROPS_TEXTURE_SPAN = 6;
const TEXTURE_SIZE = CALTROPS_TEXTURE_SPAN * 256;
// The artwork, including its shadow, fits within a circle 62% as wide as the image.
const ART_RADIUS_RATIO = 0.31;
const EDGE_FILTER_PADDING = 2;
const MIN_SPACING = 40;
const MIN_SPACING_SQUARED = MIN_SPACING ** 2;
const BUCKETS_PER_SIDE = Math.ceil(TEXTURE_SIZE * Math.SQRT2 / MIN_SPACING);
const BUCKET_SIZE = TEXTURE_SIZE / BUCKETS_PER_SIDE;
const SAMPLES_PER_POINT = 24;

const loadSprite = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
});

const getWrapOffsets = (center, radius) => {
    if (center < radius) return [0, TEXTURE_SIZE];
    if (center > TEXTURE_SIZE - radius) return [0, -TEXTURE_SIZE];
    return [0];
};

const drawWrappedSprite = (context, image, x, y, size, angle) => {
    const radius = size * Math.SQRT1_2;
    for (const offsetX of getWrapOffsets(x, radius)) {
        for (const offsetY of getWrapOffsets(y, radius)) {
            context.save();
            context.translate(x + offsetX, y + offsetY);
            context.rotate(angle);
            context.drawImage(image, -size / 2, -size / 2, size, size);
            context.restore();
        }
    }
};

const wrappedDistance = (a, b) => {
    const distance = Math.abs(a - b);
    return Math.min(distance, TEXTURE_SIZE - distance);
};

export const createCaltropsLayout = () => {
    let seed = 17287;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };

    const buckets = new Array(BUCKETS_PER_SIDE ** 2);
    const points = [];
    const active = [];
    const addPoint = (x, y) => {
        const point = { x, y };
        buckets[Math.floor(y / BUCKET_SIZE) * BUCKETS_PER_SIDE + Math.floor(x / BUCKET_SIZE)] = point;
        points.push(point);
        active.push(point);
    };
    const hasNeighbor = (x, y) => {
        const column = Math.floor(x / BUCKET_SIZE);
        const row = Math.floor(y / BUCKET_SIZE);
        // Compare neighbors across opposite edges too so the spacing survives the repeat.
        for (let dy = -2; dy <= 2; dy++) {
            const neighborRow = (row + dy + BUCKETS_PER_SIDE) % BUCKETS_PER_SIDE;
            for (let dx = -2; dx <= 2; dx++) {
                const neighborColumn = (column + dx + BUCKETS_PER_SIDE) % BUCKETS_PER_SIDE;
                const point = buckets[neighborRow * BUCKETS_PER_SIDE + neighborColumn];
                if (point && wrappedDistance(x, point.x) ** 2 + wrappedDistance(y, point.y) ** 2 < MIN_SPACING_SQUARED) {
                    return true;
                }
            }
        }
        return false;
    };

    // Poisson-disc sampling keeps the pieces separated without imposing rows or columns.
    addPoint(random() * TEXTURE_SIZE, random() * TEXTURE_SIZE);
    while (active.length) {
        const index = Math.floor(random() * active.length);
        const center = active[index];
        let added = false;
        for (let sample = 0; sample < SAMPLES_PER_POINT; sample++) {
            const angle = random() * 2 * Math.PI;
            const radius = MIN_SPACING * Math.sqrt(1 + 3 * random());
            const x = (center.x + Math.cos(angle) * radius + TEXTURE_SIZE) % TEXTURE_SIZE;
            const y = (center.y + Math.sin(angle) * radius + TEXTURE_SIZE) % TEXTURE_SIZE;
            if (hasNeighbor(x, y)) continue;
            addPoint(x, y);
            added = true;
            break;
        }
        if (!added) {
            active[index] = active[active.length - 1];
            active.pop();
        }
    }

    return points.map(point => ({
        ...point,
        size: 49 + random() * 5,
        angle: random() * 2 * Math.PI,
    }));
};

let caltropsLayout;
const getCaltropsLayout = () => (caltropsLayout ??= createCaltropsLayout());

const renderTexture = (image) => {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo dibujar la textura de abrojos.');

    for (const { x, y, size, angle } of getCaltropsLayout()) {
        drawWrappedSprite(context, image, x, y, size, angle);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('No se pudo guardar la textura de abrojos.'));
        }, 'image/webp', 0.9);
    });
};

let texturePromise;

export const loadCaltropsTexture = () => {
    if (!texturePromise) {
        texturePromise = loadSprite(CALTROP_IMAGE)
            .then(renderTexture)
            .then(blob => URL.createObjectURL(blob))
            .catch(error => {
                texturePromise = undefined;
                throw error;
            });
    }
    return texturePromise;
};

export const getCaltropsOffset = (itemId, span) => {
    let hash = 2166136261;
    for (const char of String(itemId)) {
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    }
    return {
        x: -((hash & 0xffff) / 65536) * span,
        y: -((hash >>> 16) / 65536) * span,
    };
};

const collectEdgeCrossings = (origin, otherOrigin, edge, otherLength, span, radius, addCrossing) => {
    const center = origin + Math.round((edge - origin) / span) * span;
    if (Math.abs(center - edge) >= radius) return;

    const first = Math.ceil((-radius - otherOrigin) / span);
    const last = Math.floor((otherLength + radius - otherOrigin) / span);
    for (let repeat = first; repeat <= last; repeat++) {
        addCrossing(center, otherOrigin + repeat * span, radius);
    }
};

export const getIncompleteCaltrops = ({ width, height, span, offset }) => {
    if (![width, height, span].every(value => Number.isFinite(value) && value > 0)) return [];

    const scale = span / TEXTURE_SIZE;
    const exclusions = new Map();
    const addExclusion = (x, y, radius) => exclusions.set(`${x},${y}`, { x, y, radius });
    const addHorizontalExclusion = (y, x, radius) => addExclusion(x, y, radius);

    // Only inspect the copies along the four edges. The shared texture still paints the interior.
    for (const point of getCaltropsLayout()) {
        const x = offset.x + point.x * scale;
        const y = offset.y + point.y * scale;
        const radius = (point.size * ART_RADIUS_RATIO + EDGE_FILTER_PADDING) * scale;
        collectEdgeCrossings(x, y, 0, height, span, radius, addExclusion);
        collectEdgeCrossings(x, y, width, height, span, radius, addExclusion);
        collectEdgeCrossings(y, x, 0, width, span, radius, addHorizontalExclusion);
        collectEdgeCrossings(y, x, height, width, span, radius, addHorizontalExclusion);
    }
    return [...exclusions.values()];
};

export const getCaltropsClipPath = ({ width, height, span, offset }) => {
    const exclusions = getIncompleteCaltrops({ width, height, span, offset });
    if (!exclusions.length) return undefined;

    // Each circle covers one incomplete sprite. The minimum spacing keeps the circles disjoint.
    const holes = exclusions.map(({ x, y, radius }) => {
        const left = (x - radius).toFixed(3);
        const centerY = y.toFixed(3);
        const r = radius.toFixed(3);
        const diameter = (2 * radius).toFixed(3);
        return `M ${left} ${centerY} a ${r} ${r} 0 1 0 ${diameter} 0 a ${r} ${r} 0 1 0 -${diameter} 0 Z`;
    });
    // Enclose the holes outside the element too, so antialiasing cannot leave a sliver at the edge.
    const margin = MIN_SPACING * span / TEXTURE_SIZE;
    return `path(evenodd, "M ${-margin} ${-margin} H ${width + margin} V ${height + margin} H ${-margin} Z ${holes.join(' ')}")`;
};
