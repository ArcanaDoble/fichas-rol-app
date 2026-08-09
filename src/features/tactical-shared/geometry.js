export const normalizeGeometryKind = (item = {}) => {
    const raw = [
        item.geometryKind,
        item.geometryType,
        item.markerType,
        item.shapeType,
        item.name,
        item.label,
    ].filter(Boolean).join(' ').toLowerCase();

    if (raw.includes('pelig') || raw.includes('hazard') || raw.includes('danger')) return 'hazard';
    if (raw.includes('escaler') || raw.includes('stair') || raw.includes('desnivel')) return 'stairs';
    if (raw.includes('circle') || raw.includes('circular')) return 'circle';
    return 'rect';
};
