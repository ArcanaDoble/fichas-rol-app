/** @jest-environment node */

const admin = require('firebase-admin');

jest.setTimeout(20000);

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!isEmulator) {
  // eslint-disable-next-line no-console
  console.warn(
    'Skipping ensureTokenSheetIds emulator tests because FIRESTORE_EMULATOR_HOST is not set.'
  );
}

const getProjectId = () =>
  process.env.GCLOUD_PROJECT ||
  (process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
    : undefined) ||
  'demo-test';

const initialize = () => {
  if (!admin.apps.length) {
    const projectId = getProjectId();
    try {
      admin.initializeApp({
        projectId,
        credential: admin.credential.applicationDefault(),
      });
    } catch (error) {
      admin.initializeApp({ projectId });
    }
  }
  return admin.firestore();
};

const waitFor = async (callback, { timeout = 10000, interval = 250 } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await callback();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timed out waiting for condition');
};

const describeIfEmulator = isEmulator ? describe : describe.skip;

describeIfEmulator('ensureTokenSheetIds Cloud Function', () => {
  let firestore;

  beforeAll(() => {
    firestore = initialize();
  });

  afterAll(async () => {
    await Promise.all(admin.apps.map((app) => app.delete()));
  });

  test('ensureTokenSheetIds attaches a tokenSheetId and creates the sheet', async () => {
    const pageId = `test-page-${Date.now()}`;
    const tokenId = `token-${Date.now()}`;

    const tokenRef = firestore.doc(`pages/${pageId}/tokens/${tokenId}`);

    await tokenRef.set({ name: 'Test Token' });

    const tokenData = await waitFor(async () => {
      const snap = await tokenRef.get();
      const data = snap.data();
      if (data?.tokenSheetId) {
        return data;
      }
      return null;
    });

    expect(tokenData.tokenSheetId).toBeTruthy();

    const sheetSnap = await firestore.doc(`tokenSheets/${tokenData.tokenSheetId}`).get();
    expect(sheetSnap.exists).toBe(true);
    expect(sheetSnap.data()).toMatchObject({ id: tokenData.tokenSheetId });
  });

  test('ensureTokenSheetIds clones the enemy sheet when enemyId is present', async () => {
    const enemyId = `enemy-${Date.now()}`;
    const enemySheet = {
      id: enemyId,
      name: 'Test Enemy',
      stats: {
        vida: { base: 10, total: 10 },
      },
      habilidades: ['Golpe sombrío'],
    };

    await firestore.doc(`enemies/${enemyId}`).set(enemySheet);

    const pageId = `test-page-${Date.now()}-enemy`;
    const tokenId = `token-${Date.now()}-enemy`;
    const tokenRef = firestore.doc(`pages/${pageId}/tokens/${tokenId}`);

    await tokenRef.set({ name: 'Token con enemigo', enemyId });

    const tokenData = await waitFor(async () => {
      const snap = await tokenRef.get();
      const data = snap.data();
      if (data?.tokenSheetId) {
        return data;
      }
      return null;
    });

    const sheetSnap = await firestore.doc(`tokenSheets/${tokenData.tokenSheetId}`).get();
    expect(sheetSnap.exists).toBe(true);

    const sheetData = sheetSnap.data();
    expect(sheetData).toMatchObject({
      id: tokenData.tokenSheetId,
      name: enemySheet.name,
      stats: enemySheet.stats,
    });
    expect(sheetData.habilidades).toEqual(enemySheet.habilidades);
  });
});
