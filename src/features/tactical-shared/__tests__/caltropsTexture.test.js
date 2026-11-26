import { CALTROPS_TEXTURE_SPAN, createCaltropsLayout, getCaltropsOffset, getIncompleteCaltrops } from '../caltropsTexture';

test('individual caltrops stay separated across the edges of the repeating texture', () => {
    const period = CALTROPS_TEXTURE_SPAN * 256;
    const points = createCaltropsLayout();
    const wrappedDistance = (a, b) => Math.min(Math.abs(a - b), period - Math.abs(a - b));
    let nearestVisibleGap = Infinity;

    points.forEach((point, index) => {
        for (let neighbor = 0; neighbor < index; neighbor++) {
            const other = points[neighbor];
            const distance = Math.hypot(wrappedDistance(point.x, other.x), wrappedDistance(point.y, other.y));
            // The alpha bounds of the source WebP fit within 31% of its size from the center.
            const combinedRadii = 0.31 * (point.size + other.size);
            nearestVisibleGap = Math.min(nearestVisibleGap, distance - combinedRadii);
        }
    });

    expect(points.length).toBeGreaterThanOrEqual(CALTROPS_TEXTURE_SPAN ** 2 * 20);
    expect(nearestVisibleGap).toBeGreaterThanOrEqual(6);
    expect(points).toEqual(createCaltropsLayout());
});

test.each([
    [384, 288],
    [215.5, 144],
    [24, 24],
    [1224, 734],
])('only masks sprites that cross the edge of a %s by %s zone', (width, height) => {
    const span = 96 * CALTROPS_TEXTURE_SPAN;
    const scale = 96 / 256;
    const offset = getCaltropsOffset('demo-caltrops', span);
    const key = ({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`;
    const crossings = new Set();

    // Check all neighboring texture copies independently of the perimeter scan.
    for (const point of createCaltropsLayout()) {
        const radius = (point.size * 0.31 + 2) * scale;
        for (let row = -1; row <= Math.ceil(height / span) + 1; row++) {
            for (let column = -1; column <= Math.ceil(width / span) + 1; column++) {
                const x = offset.x + point.x * scale + column * span;
                const y = offset.y + point.y * scale + row * span;
                const overlapsZone = x + radius > 0 && x - radius < width && y + radius > 0 && y - radius < height;
                const fitsInside = x - radius >= 0 && x + radius <= width && y - radius >= 0 && y + radius <= height;
                if (overlapsZone && !fitsInside) crossings.add(key({ x, y }));
            }
        }
    }

    const incomplete = getIncompleteCaltrops({ width, height, span, offset }).map(key);
    expect(incomplete.sort()).toEqual([...crossings].sort());
});
