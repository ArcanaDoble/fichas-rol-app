import { createCanvasCombatState, submitActionDice } from '../../../../src/features/canvas/combat/canvasCombatState';

const portrait = (letter, color) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#111827"/><circle cx="128" cy="128" r="115" fill="${color}"/><text x="128" y="158" text-anchor="middle" font-size="100" font-family="Georgia" fill="#eee1c4">${letter}</text></svg>`);
const weapon = { id: 'practice-weapon', instanceId: 'practice-weapon', type: 'weapon', canvasSlot: 'mainHand',
  name: 'Arma de prueba', nombre: 'Arma de prueba', dano: '1d6', alcance: 'Cercano', actionCost: 1,
  consumo: 1, rasgos: [], image: '/armas/espada_de_acero.webp', hands: 1 };
const actor = (id, name, x, y, profileType, teamId, life, rd, image) => ({ id, name, x, y, width: 50, height: 50,
  type: 'token', layer: 'TOKEN', rulesSystem: 'campaign', profileType, teamId, controlledBy: ['master'],
  isCircular: true, hasVision: true, visionRadius: 800, img: image, portrait: image, status: [],
  actionDice: id === 'yerma' ? ['d10', 'd4', 'd4'] : ['d6', 'd6', 'd6'],
  fixedInitiative: 4, offenseBase: 4, equippedItems: [{ ...weapon, id: `${id}-weapon`, instanceId: `${id}-weapon` }],
  stats: { vida: { current: life, max: life }, mente: { current: 8, max: 12 }, movimiento: { current: 2, max: 2 },
    armadura: { current: rd, max: rd }, iniciativa: { current: 4, max: 4 }, ofensiva: { current: 4, max: 4 } } });

const makeScene = () => {
  const items = [actor('yuuzu', 'Yuuzu', 5885, 5890, 'campaignCharacter', 'aliados', 28, 3, portrait('Y', '#483b30')),
    actor('bandido', 'Bandido', 5955, 5890, 'rogueliteEnemy', 'hostiles', 24, 2, portrait('B', '#542e2e')),
    actor('henry', 'Henry', 5885, 5960, 'rogueliteEnemy', 'aliados', 24, 2, portrait('H', '#33473b')),
    actor('yerma', 'Yerma', 5955, 5960, 'campaignCharacter', 'aliados', 53, 1, '/yerma/Yerma.webp')];
  let practice = createCanvasCombatState(items, { rulesSystem: 'campaign', now: 1 });
  practice = submitActionDice(practice, 'yuuzu', [6, 4, 2]);
  practice = submitActionDice(practice, 'yerma', [7, 3, 2]);
  return { id: 'campaign-attack-lab', name: 'Prueba de ataques · Campaña', rulesSystem: 'campaign',
    allowedPlayers: ['Ada'], lastModified: Date.now(), canvasPracticeCombat: practice,
    camera: { zoom: 1.6, offset: { x: 0, y: 0 } },
    config: { gameSystem: 'campaign', isInfinite: false, columns: 12, rows: 9, cellWidth: 70, cellHeight: 70,
      showGrid: true, snapToGrid: false, fogOfWar: false, ambientDarkness: 0,
      backgroundImage: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="840" height="630"><rect width="840" height="630" fill="#28312d"/><path d="M0 420Q260 240 840 400" stroke="#55513f" stroke-width="140" fill="none" opacity=".4"/></svg>') }, items };
};
const scenePath = 'canvas_scenarios/campaign-attack-lab';
export const data = { [scenePath]: makeScene(), 'gameSettings/canvasVisibility': { activeScenarioId: 'campaign-attack-lab' } };
const listeners = new Map();
const snapshot = path => ({ id: path.split('/').pop(), exists: () => !!data[path], data: () => data[path] });
const collectionSnapshot = path => ({ docs: Object.keys(data).filter(key => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1).map(snapshot), docChanges: () => [], forEach: () => {} });
const publish = path => listeners.get(path)?.forEach(fn => fn(snapshot(path)));
export const savePreviewScene = changes => { data[scenePath] = { ...data[scenePath], ...changes, lastModified: Date.now() }; publish(scenePath); return data[scenePath]; };
export const resetPreviewScene = () => savePreviewScene(makeScene());
export const readPreviewScene = () => data[scenePath];
export const getFirestore = () => ({});
export const enableIndexedDbPersistence = () => Promise.resolve();
export const collection = (...args) => ({ path: args.filter(x => typeof x === 'string').join('/') });
export const doc = collection;
export const query = ref => ref;
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const serverTimestamp = () => Date.now();
export const getDoc = ref => Promise.resolve(snapshot(ref.path));
export const getDocs = ref => Promise.resolve(collectionSnapshot(ref.path));
export const onSnapshot = (ref, fn) => { if (!listeners.has(ref.path)) listeners.set(ref.path, new Set()); listeners.get(ref.path).add(fn); fn(ref.path.split('/').length % 2 === 0 ? snapshot(ref.path) : collectionSnapshot(ref.path)); return () => listeners.get(ref.path)?.delete(fn); };
export const setDoc = async (ref, value, options) => { data[ref.path] = options?.merge ? { ...data[ref.path], ...value } : value; publish(ref.path); };
export const updateDoc = async (ref, value) => { data[ref.path] = { ...data[ref.path], ...value }; publish(ref.path); };
export const deleteDoc = async ref => { delete data[ref.path]; publish(ref.path); };
export const addDoc = async (ref, value) => { const id = crypto.randomUUID(); data[ref.path + '/' + id] = value; return { id }; };
export const runTransaction = async (_db, fn) => { const writes = []; const result = await fn({ get: getDoc,
  set: (ref, value, options) => writes.push([ref, options?.merge ? { ...data[ref.path], ...value } : value]),
  update: (ref, value) => writes.push([ref, { ...data[ref.path], ...value }]), delete: ref => writes.push([ref, null]) });
  const latency = Math.min(2000, Number(new URLSearchParams(location.search).get('latency')) || 0);
  if (latency > 0) await new Promise(resolve => setTimeout(resolve, latency));
  for (const [ref, value] of writes) { if (value) data[ref.path] = value; else delete data[ref.path]; } writes.forEach(([ref]) => publish(ref.path)); return result; };
export const writeBatch = () => ({ set: () => {}, update: () => {}, delete: () => {}, commit: () => Promise.resolve() });
export const increment = value => value;
export const deleteField = () => null;
export const arrayUnion = (...args) => args;
export const arrayRemove = () => [];
export const Timestamp = { now: () => ({ toMillis: () => Date.now() }) };
