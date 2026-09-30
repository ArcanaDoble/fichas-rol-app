import { isTarZone } from './tarTerrain';

export const TAR_IGNITION_DURATION = 5200;
export const isTarIgnition = item => item?.type === 'geometry' && item?.areaEffect?.type === 'tar-ignition';
export const ignitionHasExpired = (item, now = Date.now()) => isTarIgnition(item)
    && now >= item.areaEffect.startedAt + TAR_IGNITION_DURATION;

// Keep only the presentation of consumed terrain. It no longer affects movement,
// coverage or subsequent fire attacks. Every observer receives the same clock.
export const presentTarIgnition = (items, zoneIds, now = Date.now()) => {
    const zones = items.filter(item => zoneIds.includes(item.id) && isTarZone(item));
    if (!zones.length) return items;
    const origin = { x: Math.min(...zones.map(zone => Number(zone.x) || 0)),
        y: Math.min(...zones.map(zone => Number(zone.y) || 0)) };
    const extent = Math.max(1, ...zones.map(zone => (
        zone.x + zone.width - origin.x + zone.y + zone.height - origin.y)));
    return items.filter(item => !ignitionHasExpired(item, now)).map(item => zones.includes(item) ? {
        ...item, geometryKind: 'tar-ignition', name: 'Brea ardiendo',
        areaEffect: { type: 'tar-ignition', startedAt: now, origin, extent },
    } : item);
};
