const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const clamp = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const normalizeGridColor = (value) => {
  if (!value || typeof value !== 'string') return '#ffffff';
  return value.toLowerCase();
};

const buildPlayerPagePayload = (pageId, data = {}) => {
  if (!data) return null;
  return {
    id: pageId,
    name: data.name || '',
    background: data.background || null,
    backgroundHash: data.backgroundHash || null,
    enableDarkness:
      data.enableDarkness === undefined ? true : Boolean(data.enableDarkness),
    darknessOpacity:
      data.darknessOpacity === undefined
        ? 0.7
        : clamp(data.darknessOpacity, 0, 1),
    showGrid: data.showGrid === undefined ? true : Boolean(data.showGrid),
    gridColor: normalizeGridColor(data.gridColor),
    gridOpacity:
      data.gridOpacity === undefined ? 0.2 : clamp(data.gridOpacity, 0, 1),
    gridSize: typeof data.gridSize === 'number' ? data.gridSize : 1,
    gridCells: typeof data.gridCells === 'number' ? data.gridCells : 1,
    gridOffsetX: typeof data.gridOffsetX === 'number' ? data.gridOffsetX : 0,
    gridOffsetY: typeof data.gridOffsetY === 'number' ? data.gridOffsetY : 0,
    lines: Array.isArray(data.lines) ? data.lines : [],
    walls: Array.isArray(data.walls) ? data.walls : [],
    texts: Array.isArray(data.texts) ? data.texts : [],
    tiles: Array.isArray(data.tiles) ? data.tiles : [],
    ambientLights: Array.isArray(data.ambientLights) ? data.ambientLights : [],
    shopConfig: data.shopConfig || null,
  };
};

const chunkArray = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const getActivePlayerSessionIds = async () => {
  const snapshot = await db.collection('playerSessions').get();
  return snapshot.docs.map((doc) => doc.id);
};

const writePlayerViews = async (sessionIds, payload) => {
  if (!sessionIds.length) {
    return;
  }
  const batches = chunkArray(sessionIds, 400);
  await Promise.all(
    batches.map(async (chunk) => {
      const batch = db.batch();
      chunk.forEach((sessionId) => {
        const ref = db.doc(`playerViews/${sessionId}`);
        batch.set(ref, payload);
      });
      await batch.commit();
    })
  );
};

const rebuildPlayerViews = async ({ sessionIds, triggeredPageId } = {}) => {
  const visibilitySnap = await db.doc('gameSettings/playerVisibility').get();
  const visiblePageId = visibilitySnap.exists
    ? visibilitySnap.get('playerVisiblePageId')
    : null;

  if (triggeredPageId && visiblePageId && triggeredPageId !== visiblePageId) {
    return null;
  }

  const targetSessionIds = sessionIds || (await getActivePlayerSessionIds());

  if (!targetSessionIds.length) {
    return null;
  }

  let payload = {
    pageId: null,
    page: null,
    tokens: [],
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (visiblePageId) {
    const pageSnap = await db.doc(`pages/${visiblePageId}`).get();
    if (!pageSnap.exists) {
      functions.logger.warn('Player visible page does not exist', {
        visiblePageId,
      });
    } else {
      const pageData = buildPlayerPagePayload(visiblePageId, pageSnap.data());
      const tokensSnap = await db
        .collection(`pages/${visiblePageId}/tokens`)
        .get();
      const tokens = tokensSnap.docs.map((doc) => ({
        id: String(doc.id),
        ...(doc.data() || {}),
      }));
      payload = {
        pageId: visiblePageId,
        page: pageData,
        tokens,
        updatedAt: FieldValue.serverTimestamp(),
      };
    }
  }

  await writePlayerViews(targetSessionIds, payload);
  return null;
};

exports.onTokenCreate = functions.firestore
  .document('pages/{pageId}/tokens/{tokenId}')
  .onCreate(async (snap) => {
    const tokenData = snap.data() || {};

    if (tokenData.tokenSheetId) {
      return null;
    }

    const tokenSheetId = nanoid();
    let sheetData = { stats: {} };

    const enemyId = tokenData.enemyId;
    if (enemyId) {
      try {
        const enemySnap = await db.doc(`enemies/${enemyId}`).get();
        if (enemySnap.exists) {
          sheetData = enemySnap.data() || {};
        }
      } catch (error) {
        functions.logger.error('Failed to clone enemy sheet', error, { enemyId });
      }
    }

    sheetData = {
      ...sheetData,
      id: tokenSheetId,
    };

    if (!sheetData.stats || typeof sheetData.stats !== 'object') {
      sheetData.stats = {};
    }

    const sheetRef = db.doc(`tokenSheets/${tokenSheetId}`);
    const pageId = snap.ref.parent?.parent?.id;

    await db.runTransaction(async (transaction) => {
      const currentSnap = await transaction.get(snap.ref);

      if (!currentSnap.exists) {
        functions.logger.info('Token deleted before assigning sheet; skipping.', {
          tokenId: snap.id,
          pageId,
        });
        return;
      }

      if (currentSnap.get('tokenSheetId')) {
        return;
      }

      transaction.set(sheetRef, sheetData);
      transaction.update(snap.ref, { tokenSheetId });
    });

    return null;
  });

exports.onPlayerPageWrite = functions.firestore
  .document('pages/{pageId}')
  .onWrite(async (change, context) => {
    try {
      await rebuildPlayerViews({ triggeredPageId: context.params.pageId });
    } catch (error) {
      functions.logger.error('Failed to rebuild player views on page write', {
        pageId: context.params.pageId,
        error,
      });
    }
    return null;
  });

exports.onPlayerTokensWrite = functions.firestore
  .document('pages/{pageId}/tokens/{tokenId}')
  .onWrite(async (change, context) => {
    try {
      await rebuildPlayerViews({ triggeredPageId: context.params.pageId });
    } catch (error) {
      functions.logger.error('Failed to rebuild player views on token write', {
        pageId: context.params.pageId,
        tokenId: context.params.tokenId,
        error,
      });
    }
    return null;
  });

exports.onPlayerVisibilityWrite = functions.firestore
  .document('gameSettings/playerVisibility')
  .onWrite(async () => {
    try {
      await rebuildPlayerViews();
    } catch (error) {
      functions.logger.error(
        'Failed to rebuild player views on visibility change',
        error
      );
    }
    return null;
  });

exports.onPlayerSessionWrite = functions.firestore
  .document('playerSessions/{sessionId}')
  .onWrite(async (change, context) => {
    const sessionId = context.params.sessionId;
    if (!change.after.exists) {
      try {
        await db.doc(`playerViews/${sessionId}`).delete();
      } catch (error) {
        if (error.code !== 5) {
          functions.logger.error('Failed to delete player view on session delete', {
            sessionId,
            error,
          });
        }
      }
      return null;
    }
    try {
      await rebuildPlayerViews({ sessionIds: [sessionId] });
    } catch (error) {
      functions.logger.error('Failed to rebuild player view for session', {
        sessionId,
        error,
      });
    }
    return null;
  });
