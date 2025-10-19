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

    await db.doc(`tokenSheets/${tokenSheetId}`).set(sheetData);
    await snap.ref.update({ tokenSheetId });

    return null;
  });
