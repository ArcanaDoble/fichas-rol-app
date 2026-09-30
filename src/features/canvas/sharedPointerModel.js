export const CANVAS_POINTER_STALE_MS = 2500;
export const CANVAS_PING_LIFETIME_MS = 2200;

export const getActiveCanvasPings = (pointer = {}, now = Date.now()) => {
    const safePointer = pointer || {};
    const pings = Array.isArray(safePointer.pings)
        ? safePointer.pings
        : (safePointer.ping ? [safePointer.ping] : []);

    return pings.filter((ping) => (
        ping?.id
        && Number.isFinite(ping.x)
        && Number.isFinite(ping.y)
        && now - (Number(ping.createdAt) || 0) < CANVAS_PING_LIFETIME_MS
    ));
};

export const getCanvasPointerColor = (actorId = '', isMaster = false) => {
    if (isMaster) return '#d8b968';

    const hash = Array.from(String(actorId)).reduce(
        (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
        0,
    );
    return `hsl(${hash % 360} 72% 64%)`;
};

export const getCanvasPointerActorId = ({ currentUserId, isPlayerView, playerName } = {}) => {
    const role = isPlayerView ? 'player' : 'master';
    const identity = isPlayerView ? (playerName || currentUserId || 'unknown') : (currentUserId || 'master');
    return encodeURIComponent(`${role}:${identity}`);
};

export const normalizeCanvasPointers = (documents = [], options = {}) => {
    const now = Number(options.now) || Date.now();
    const localActorId = options.localActorId || null;

    return documents
        .map((entry) => ({ id: entry.id, ...entry.data }))
        .filter((pointer) => pointer.id !== localActorId)
        .filter((pointer) => (
            Number.isFinite(pointer.x)
            && Number.isFinite(pointer.y)
            && now - (Number(pointer.updatedAt) || 0) < CANVAS_POINTER_STALE_MS
        ));
};
