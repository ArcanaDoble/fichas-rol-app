import { HIDDEN_STATUS_EFFECT_ID } from '../../utils/statusEffects';
import {
    areTokensAllied,
    getCombatCellOccupancyIssue,
    getCombatTokenPositionForPrimaryCell,
    getTokenOccupiedCellsAtPosition,
    getTokenPrimaryGridCell,
    isCombatTokenItem,
    isCombatMoveBlockedByWall,
    normalizeCombatSideKey,
} from './legacyCombatRules';
import { canControlToken } from './tokenControlUtils';

export const HIDDEN_TOKEN_STATUS_ID = HIDDEN_STATUS_EFFECT_ID;

const getControllerIds = (token = {}) => {
    const controlledBy = Array.isArray(token.controlledBy)
        ? token.controlledBy
        : (typeof token.controlledBy === 'string' ? [token.controlledBy] : []);

    return controlledBy
        .map((controller) => normalizeCombatSideKey(controller))
        .filter(Boolean);
};

export const isSmokeArea = (item = {}) => (
    item?.type === 'geometry'
    && (
        item.geometryKind === 'smoke'
        || item.areaEffect?.type === 'smoke'
        || item.areaEffect?.id === 'smoke-concealment'
    )
);

const overlapsSmoke = (token, item) => {
    const left = Number(token.x) || 0;
    const top = Number(token.y) || 0;
    const areaLeft = Number(item.x) || 0;
    const areaTop = Number(item.y) || 0;
    return left < areaLeft + Math.max(1, Number(item.width) || 1)
        && left + Math.max(1, Number(token.width) || 1) > areaLeft
        && top < areaTop + Math.max(1, Number(item.height) || 1)
        && top + Math.max(1, Number(token.height) || 1) > areaTop;
};

// Scene arrays are immutable snapshots. Reuse membership and viewer calculations
// across token rendering, formation placement, targeting and fog masks.
const smokeSceneCache = new WeakMap();
const getSmokeScene = (items) => {
    if (!smokeSceneCache.has(items)) {
        const areas = items.filter(isSmokeArea);
        const groups = new Map();
        // Overlaps and shared edges form one continuous cloud. The two cells of
        // a legacy extended Niebla are also one zone, including diagonal adjacency.
        areas.forEach(area => {
            if (groups.has(area)) return;
            const group = new Set([area]);
            for (const current of group) {
                areas.forEach(other => {
                    const dx = Math.min(current.x + current.width, other.x + other.width) - Math.max(current.x, other.x);
                    const dy = Math.min(current.y + current.height, other.y + other.height) - Math.max(current.y, other.y);
                    const sameMist = current.areaEffect?.spellId === 'arcane-mist'
                        && other.areaEffect?.spellId === 'arcane-mist' && current.areaEffect.cloudId
                        && current.areaEffect.cloudId === other.areaEffect.cloudId && dx >= 0 && dy >= 0;
                    if ((dx > 0 && dy >= 0) || (dy > 0 && dx >= 0) || sameMist) group.add(other);
                });
            }
            group.forEach(member => groups.set(member, group));
        });
        smokeSceneCache.set(items, {
            areas, groups, memberships: new WeakMap(), footprints: new WeakMap(), viewers: new Map(), teams: new Map(),
        });
    }
    return smokeSceneCache.get(items);
};

export const getTokenSmokeAreas = (token = {}, items = []) => {
    if (!items.length || !isCombatTokenItem(token)) return [];
    const scene = getSmokeScene(items);
    if (!scene.memberships.has(token)) {
        scene.memberships.set(token, scene.areas.filter(area => overlapsSmoke(token, area)));
    }
    return scene.memberships.get(token);
};

export const isTokenInsideSmokeArea = (token = {}, items = []) => getTokenSmokeAreas(token, items).length > 0;

// Dragged positions and unconfirmed combat movement are visual previews.
// Keep every vision calculation on the last committed footprint until the
// move is released (exploration) or the turn is confirmed (combat).
export const getCanvasCommittedVisionItems = (items = [], {
    draggedTokenId = null,
    tokenOriginalPos = {},
    pendingTurnState = null,
    isPlayerView = false,
} = {}) => {
    const pendingId = isPlayerView ? pendingTurnState?.tokenId : null;
    if (!draggedTokenId && !pendingId) return items;

    let changed = false;
    const committed = items.map((item) => {
        if (!isCombatTokenItem(item)) return item;
        const pendingOrigin = item.id === pendingId
            ? { x: pendingTurnState.startX, y: pendingTurnState.startY }
            : null;
        const dragOrigin = draggedTokenId && tokenOriginalPos[item.id];
        const origin = pendingOrigin || dragOrigin;
        if (!origin || !Number.isFinite(Number(origin.x)) || !Number.isFinite(Number(origin.y))) return item;
        const x = Number(origin.x);
        const y = Number(origin.y);
        if (item.x === x && item.y === y) return item;
        changed = true;
        return { ...item, x, y };
    });
    return changed ? committed : items;
};

const getOpenRect = (item = {}) => {
    const left = Number(item.x) || 0;
    const top = Number(item.y) || 0;
    return {
        left,
        top,
        right: left + Math.max(1, Number(item.width) || 1),
        bottom: top + Math.max(1, Number(item.height) || 1),
    };
};

const uniqueSorted = values => Array.from(new globalThis.Set(values.map(value => Number(value).toFixed(6))))
    .map(Number).sort((a, b) => a - b);

const pointInsideSmoke = (point, area) => {
    const rect = getOpenRect(area);
    return point.x > rect.left && point.x < rect.right
        && point.y > rect.top && point.y < rect.bottom;
};

// Split a token's footprint at every smoke edge that crosses it. The centre of
// each resulting region represents one mechanically distinct exposed/interior
// part of the base, without depending on the portrait drawn inside it.
const getTokenSmokeFootprint = (token = {}, items = []) => {
    const scene = getSmokeScene(items);
    if (scene.footprints.has(token)) return scene.footprints.get(token);

    const bounds = getOpenRect(token);
    const overlappingAreas = getTokenSmokeAreas(token, items);
    const xCuts = [bounds.left, bounds.right];
    const yCuts = [bounds.top, bounds.bottom];
    overlappingAreas.forEach((area) => {
        const rect = getOpenRect(area);
        if (rect.left > bounds.left && rect.left < bounds.right) xCuts.push(rect.left);
        if (rect.right > bounds.left && rect.right < bounds.right) xCuts.push(rect.right);
        if (rect.top > bounds.top && rect.top < bounds.bottom) yCuts.push(rect.top);
        if (rect.bottom > bounds.top && rect.bottom < bounds.bottom) yCuts.push(rect.bottom);
    });

    const xs = uniqueSorted(xCuts);
    const ys = uniqueSorted(yCuts);
    const anchors = [];
    for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
        for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
            const point = {
                x: (xs[xIndex] + xs[xIndex + 1]) / 2,
                y: (ys[yIndex] + ys[yIndex + 1]) / 2,
            };
            anchors.push({
                point,
                areas: overlappingAreas.filter(area => pointInsideSmoke(point, area)),
            });
        }
    }

    const hasInterior = anchors.some(anchor => anchor.areas.length > 0);
    const hasExterior = anchors.some(anchor => anchor.areas.length === 0);
    const footprint = { anchors, areas: overlappingAreas, hasInterior, hasExterior };
    scene.footprints.set(token, footprint);
    return footprint;
};

export const isTokenFullyInsideSmokeArea = (token = {}, items = []) => {
    const footprint = getTokenSmokeFootprint(token, items);
    return footprint.hasInterior && !footprint.hasExterior;
};

export const isTokenPartiallyInsideSmokeArea = (token = {}, items = []) => {
    const footprint = getTokenSmokeFootprint(token, items);
    return footprint.hasInterior && footprint.hasExterior;
};

// Slab intersection against the open rectangle. A ray merely grazing an edge
// does not cross a smoke cell. No per-frame sampling or pixel readbacks required.
export const segmentCrossesSmoke = (from, to, area) => {
    let enter = 0;
    let leave = 1;
    for (const [axis, size] of [['x', 'width'], ['y', 'height']]) {
        const delta = to[axis] - from[axis];
        const min = Number(area[axis]);
        const max = min + Number(area[size]);
        if (Math.abs(delta) < 0.000001) {
            if (from[axis] <= min || from[axis] >= max) return false;
        } else {
            const a = (min - from[axis]) / delta;
            const b = (max - from[axis]) / delta;
            enter = Math.max(enter, Math.min(a, b));
            leave = Math.min(leave, Math.max(a, b));
        }
    }
    return leave - enter > 0.000001;
};

export const canTokenSeeThroughSmoke = (observer, target, items = []) => {
    if (!observer || !target) return false;
    const scene = getSmokeScene(items);
    const observerFootprint = getTokenSmokeFootprint(observer, items);
    const targetFootprint = getTokenSmokeFootprint(target, items);

    return observerFootprint.anchors.some(from => targetFootprint.anchors.some(to => {
        const sharesContinuousCloud = from.areas.some(area => to.areas.some(other => (
            scene.groups.get(area)?.has(other)
        )));
        if (sharesContinuousCloud) return true;
        if (from.areas.length > 0 || to.areas.length > 0) return false;
        return !scene.areas.some(area => segmentCrossesSmoke(from.point, to.point, area));
    }));
};

export const tokenHasHiddenStatus = (token = {}) => (
    Array.isArray(token.status)
    && token.status.some((status) => {
        const statusId = typeof status === 'string'
            ? status
            : (status?.id || status?.name || status?.label || '');
        return normalizeCombatSideKey(statusId) === HIDDEN_TOKEN_STATUS_ID;
    })
);

export const isMasterOwnedCanvasToken = (token = {}) => {
    const controllerIds = getControllerIds(token);
    const ownerIds = [token.linkedClassOwner, token.owner, token.ownerName]
        .map((owner) => normalizeCombatSideKey(owner || ''))
        .filter(Boolean);
    const explicitAccessIds = controllerIds.length > 0 ? controllerIds : ownerIds;
    if (explicitAccessIds.length === 0) return true;

    return explicitAccessIds.some((controllerId) => (
        controllerId === 'master'
        || controllerId === 'gm'
        || controllerId === 'director'
        || controllerId === 'all'
        || controllerId === 'everyone'
    ));
};

export const getPlayerCanvasTeamIds = (items = [], playerName = '') => {
    const scene = getSmokeScene(items);
    if (scene.teams.has(playerName)) return scene.teams.get(playerName);
    const teams = new globalThis.Set(items
        .filter(item => isCombatTokenItem(item) && canControlToken(item, true, playerName))
        .map(item => normalizeCombatSideKey(item.teamId || ''))
        .filter(Boolean));
    scene.teams.set(playerName, teams);
    return teams;
};

export const canPlayerAccessCanvasToken = (token, items = [], playerName = '') => {
    if (!isCombatTokenItem(token) || !playerName) return false;
    if (canControlToken(token, true, playerName)) return true;

    const tokenTeamId = normalizeCombatSideKey(token.teamId || '');
    return Boolean(tokenTeamId && getPlayerCanvasTeamIds(items, playerName).has(tokenTeamId));
};

export const getPlayerCanvasVisionTokens = (items = [], playerName = '') => (
    items.filter((item) => (
        item?.hasVision
        && canPlayerAccessCanvasToken(item, items, playerName)
    ))
);

export const getCanvasSmokePerspective = (items = [], {
    isPlayerView = false, playerName = '', selectedTokenIds = [], showHiddenTokens = false,
} = {}) => {
    const scene = getSmokeScene(items);
    const key = JSON.stringify([isPlayerView, playerName, selectedTokenIds, showHiddenTokens]);
    if (scene.viewers.has(key)) return scene.viewers.get(key);
    const controlled = items.filter(item => isCombatTokenItem(item) && (
        isPlayerView ? canPlayerAccessCanvasToken(item, items, playerName) : isMasterOwnedCanvasToken(item)
    ));
    const selected = items.filter(item => isCombatTokenItem(item) && selectedTokenIds.includes(item.id)
        && (!isPlayerView || controlled.includes(item)));
    const focused = selected.length > 0;
    const observers = focused ? selected : controlled.filter(item => item.hasVision !== false);
    const visibleAreas = new Set(observers.flatMap(item => getTokenSmokeAreas(item, items).flatMap(area => [...scene.groups.get(area)])));
    const perspective = {
        areas: scene.areas, visibleAreas, observers, focused,
        bypass: !isPlayerView && showHiddenTokens,
        outsideVisible: observers.length === 0 || observers.some(item => !isTokenFullyInsideSmokeArea(item, items)),
    };
    if (scene.viewers.size >= 32) scene.viewers.clear();
    scene.viewers.set(key, perspective);
    return perspective;
};

export const canViewerSeeCanvasToken = (
    token,
    items = [],
    viewer = {},
) => {
    if (!isCombatTokenItem(token)) return true;
    const { isPlayerView = false, playerName = '' } = viewer;
    const perspective = getCanvasSmokePerspective(items, viewer);
    if (perspective.bypass) return true;
    const tokenAreas = getTokenSmokeAreas(token, items);
    const sharedAccess = isPlayerView
        ? canPlayerAccessCanvasToken(token, items, playerName)
        : isMasterOwnedCanvasToken(token);
    // Shared ownership applies in the overview; focus always simulates the token.
    const smokeVisible = perspective.observers.length > 0
        ? perspective.observers.some(observer => canTokenSeeThroughSmoke(observer, token, items))
        : tokenAreas.length === 0;
    if (!smokeVisible && (perspective.focused || !sharedAccess)) return false;
    if (!tokenHasHiddenStatus(token)) return true;

    return sharedAccess;
};

export const isCanvasTokenHiddenFromViewer = (token, items = [], viewer = {}) => (
    !canViewerSeeCanvasToken(token, items, viewer)
);

export const getCanvasTokenFogDensity = (token, items = [], viewer = {}) => {
    if (tokenHasHiddenStatus(token)) return 0.65;
    const areas = getTokenSmokeAreas(token, items);
    if (!areas.length) return 0;
    // The area itself already paints the covered portion. A second, token-wide
    // layer would incorrectly make a partially exposed large creature look as
    // though its whole footprint were inside the cloud.
    if (!isTokenFullyInsideSmokeArea(token, items)) return 0;
    const perspective = getCanvasSmokePerspective(items, viewer);
    return perspective.focused && !perspective.outsideVisible
        && areas.some(area => perspective.visibleAreas.has(area)) ? 0.2 : 0.65;
};

export const getCanvasRenderItemsForViewer = (
    items = [],
    viewer = {},
) => (
    (items || []).filter((item) => (
        !isCombatTokenItem(item)
        || canViewerSeeCanvasToken(item, items, viewer)
    ))
);

export const removeHiddenStatusFromToken = (token = {}) => {
    if (!tokenHasHiddenStatus(token)) return token;

    return {
        ...token,
        status: token.status.filter((status) => {
            const statusId = typeof status === 'string'
                ? status
                : (status?.id || status?.name || status?.label || '');
            return normalizeCombatSideKey(statusId) !== HIDDEN_TOKEN_STATUS_ID;
        }),
    };
};

export const actionRevealsHidden = (action = {}) => (
    action?.type === 'attack'
    || action?.actionType === 'attack'
    || action?.actionId === 'attack'
    || action?.actionId === 'sweep'
    || action?.revelaOculto === true
);

export const getHiddenSafeMovementPreviewItems = (movingToken, items = []) => (
    (items || []).filter((item) => (
        item?.id === movingToken?.id
        || !isCombatTokenItem(item)
        || (canTokenSeeThroughSmoke(movingToken, item, items)
            && (!tokenHasHiddenStatus(item) || areTokensAllied(movingToken, item)))
    ))
);

const buildDirectGridPath = (fromCell, toCell) => {
    const steps = [];
    let x = fromCell.x;
    let y = fromCell.y;

    while (x !== toCell.x || y !== toCell.y) {
        x += Math.sign(toCell.x - x);
        y += Math.sign(toCell.y - y);
        steps.push({ x, y });
    }

    return steps;
};

const doCellSetsOverlap = (firstCells = [], secondCells = []) => {
    const secondKeys = new globalThis.Set(secondCells.map((cell) => `${cell.x}:${cell.y}`));
    return firstCells.some((cell) => secondKeys.has(`${cell.x}:${cell.y}`));
};

export const resolveHiddenDetectionAlongMovement = ({
    movingToken,
    from,
    to,
    items = [],
    config = {},
} = {}) => {
    const unchanged = {
        detected: false,
        blocked: false,
        stopped: false,
        spentCost: 0,
        finalPosition: to,
        revealedTokenIds: [],
        items,
    };
    if (!isCombatTokenItem(movingToken) || !from || !to) return unchanged;
    // An invalid route cannot discover a token through a wall before the drag
    // is rejected by the movement controller.
    if (isCombatMoveBlockedByWall({ ...movingToken, ...from }, to, items, config)) return unchanged;

    const startToken = { ...movingToken, x: from.x, y: from.y };
    const targetToken = { ...movingToken, x: to.x, y: to.y };
    const startCell = getTokenPrimaryGridCell(startToken, config);
    const targetCell = getTokenPrimaryGridCell(targetToken, config);
    const path = buildDirectGridPath(startCell, targetCell);
    if (path.length === 0) return unchanged;

    let workingItems = items;
    let lastValidPosition = { x: from.x, y: from.y };

    for (let index = 0; index < path.length; index += 1) {
        const cell = path[index];
        const stepPosition = getCombatTokenPositionForPrimaryCell(movingToken, cell, config);
        const liveMovingToken = workingItems.find((item) => item.id === movingToken.id) || movingToken;
        const steppedToken = { ...liveMovingToken, x: stepPosition.x, y: stepPosition.y };
        const movingCells = getTokenOccupiedCellsAtPosition(steppedToken, stepPosition, config);
        const touchingEnemies = workingItems.filter((item) => (
            item.id !== movingToken.id
            && isCombatTokenItem(item)
            && !areTokensAllied(steppedToken, item)
            && doCellSetsOverlap(
                movingCells,
                getTokenOccupiedCellsAtPosition(item, { x: item.x, y: item.y }, config),
            )
        ));
        const revealedIds = new globalThis.Set();
        if (touchingEnemies.length > 0 && tokenHasHiddenStatus(steppedToken)) {
            revealedIds.add(steppedToken.id);
        }
        touchingEnemies.forEach((enemy) => {
            if (tokenHasHiddenStatus(enemy)) revealedIds.add(enemy.id);
        });

        if (revealedIds.size === 0) {
            lastValidPosition = stepPosition;
            continue;
        }

        workingItems = workingItems.map((item) => (
            revealedIds.has(item.id) ? removeHiddenStatusFromToken(item) : item
        ));
        const revealedMovingToken = removeHiddenStatusFromToken(steppedToken);
        const occupancyIssue = getCombatCellOccupancyIssue({
            movingToken: revealedMovingToken,
            nextX: stepPosition.x,
            nextY: stepPosition.y,
            items: workingItems,
            config,
            excludeIds: [movingToken.id],
        });

        return {
            detected: true,
            blocked: Boolean(occupancyIssue),
            stopped: true,
            spentCost: occupancyIssue ? index : index + 1,
            finalPosition: occupancyIssue ? lastValidPosition : stepPosition,
            revealedTokenIds: Array.from(revealedIds),
            items: workingItems.map((item) => (
                item.id === movingToken.id
                    ? { ...item, x: occupancyIssue ? lastValidPosition.x : stepPosition.x, y: occupancyIssue ? lastValidPosition.y : stepPosition.y }
                    : item
            )),
            occupancyIssue,
        };
    }

    return {
        ...unchanged,
        spentCost: path.length,
        finalPosition: to,
    };
};
