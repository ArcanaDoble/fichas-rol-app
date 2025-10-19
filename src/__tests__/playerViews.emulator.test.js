/** @jest-environment node */

const admin = require('firebase-admin');

jest.setTimeout(40000);

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!isEmulator) {
  // eslint-disable-next-line no-console
  console.warn(
    'Skipping playerViews emulator tests because FIRESTORE_EMULATOR_HOST is not set.'
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

const waitFor = async (callback, { timeout = 15000, interval = 250 } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await callback();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timed out waiting for condition');
};

const describeIfEmulator = isEmulator ? describe : describe.skip;

describeIfEmulator('playerViews aggregation', () => {
  let firestore;

  beforeAll(() => {
    firestore = initialize();
  });

  afterAll(async () => {
    await Promise.all(admin.apps.map((app) => app.delete()));
  });

  test('aggregated player view updates with tokens and visibility changes', async () => {
    const sessionId = `session-${Date.now()}`;
    const pageA = `page-a-${Date.now()}`;
    const pageB = `page-b-${Date.now()}`;

    const viewRef = firestore.doc(`playerViews/${sessionId}`);
    const sessionRef = firestore.doc(`playerSessions/${sessionId}`);

    await firestore.doc(`pages/${pageA}`).set({
      name: 'Bosque',
      lines: [{ id: 'line-1', points: [0, 0, 10, 10] }],
      tiles: [{ id: 'tile-1', x: 5, y: 5 }],
      walls: [],
      texts: [],
      ambientLights: [{ id: 'light-1', intensity: 0.5 }],
      gridColor: '#FF00FF',
      gridOpacity: 0.4,
      darknessOpacity: 0.6,
      enableDarkness: false,
      showGrid: false,
    });

    await firestore.doc(`pages/${pageA}/tokens/token-1`).set({
      name: 'Goblin',
      initiative: 12,
    });

    await firestore.doc('gameSettings/playerVisibility').set({
      playerVisiblePageId: pageA,
    });

    await sessionRef.set({
      sessionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const initialView = await waitFor(async () => {
      const snap = await viewRef.get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (!data?.pageId || data.tokens?.length !== 1) return null;
      return data;
    });

    expect(initialView.pageId).toBe(pageA);
    expect(initialView.tokens).toHaveLength(1);
    expect(initialView.page).toBeDefined();
    expect(initialView.page.lines).toHaveLength(1);
    expect(initialView.page.tiles).toHaveLength(1);
    expect(initialView.page.showGrid).toBe(false);

    await firestore.doc(`pages/${pageA}/tokens/token-2`).set({
      name: 'Orco',
    });

    const viewWithTwoTokens = await waitFor(async () => {
      const snap = await viewRef.get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (!data?.tokens || data.tokens.length !== 2) return null;
      return data;
    });

    const tokenIds = viewWithTwoTokens.tokens.map((token) => token.id).sort();
    expect(tokenIds).toEqual(['token-1', 'token-2']);

    await firestore.doc(`pages/${pageB}`).set({
      name: 'Cueva',
      walls: [{ id: 'wall-1', points: [1, 2, 3, 4] }],
      texts: [{ id: 'text-1', value: '¡Cuidado!' }],
      tiles: [],
      lines: [],
      ambientLights: [],
      enableDarkness: true,
      showGrid: true,
      gridOpacity: 0.7,
    });

    await firestore.doc(`pages/${pageB}/tokens/token-3`).set({
      name: 'Dragón',
    });

    await firestore.doc('gameSettings/playerVisibility').set({
      playerVisiblePageId: pageB,
    });

    const switchedView = await waitFor(async () => {
      const snap = await viewRef.get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (data.pageId !== pageB) return null;
      if (!data.tokens || data.tokens.length !== 1) return null;
      return data;
    });

    expect(switchedView.pageId).toBe(pageB);
    expect(switchedView.tokens[0].id).toBe('token-3');
    expect(switchedView.page.walls).toHaveLength(1);
    expect(switchedView.page.texts[0].value).toBe('¡Cuidado!');

    await sessionRef.delete();

    await waitFor(async () => {
      const snap = await viewRef.get();
      return snap.exists ? null : true;
    });
  });
});
