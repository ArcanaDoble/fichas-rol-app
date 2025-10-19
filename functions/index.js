const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { nanoid } = require('nanoid');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

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
