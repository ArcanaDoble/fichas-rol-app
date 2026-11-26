export const CALTROPS_HAZARD_ART = {
    id: 'caltrops',
    image: '/scenery/hazards/abrojos.webp',
};

export const normalizeGeometryKind = (item = {}) => {
    if (item.geometryKind === 'tree') return 'tree';
    const raw = [
        item.geometryKind,
        item.geometryType,
        item.markerType,
        item.shapeType,
        item.areaEffect?.type,
        item.areaEffect?.id,
        item.name,
        item.label,
    ].filter(Boolean).join(' ').toLowerCase();

    if (raw.includes('brea') || /\btar\b/.test(raw)) return 'tar';
    if (raw.includes('humo') || raw.includes('smoke')) return 'smoke';
    if (raw.includes('pelig') || raw.includes('hazard') || raw.includes('danger')) return 'hazard';
    if (raw.includes('escaler') || raw.includes('stair') || raw.includes('desnivel')) return 'stairs';
    if (raw.includes('circle') || raw.includes('circular')) return 'circle';
    return 'rect';
};
