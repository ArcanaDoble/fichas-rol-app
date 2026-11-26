const API = '/api/canvas3d/rooms';
const storagePrefix = 'noma.canvas3d.room.';
const hands = new Map();
const revisions = new Map();
let hand;

function randomKey(bytes = 24) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, '0')).join('');
}

function remember(session) {
  try {
    sessionStorage.setItem(storagePrefix + session.roomId, JSON.stringify(session));
    sessionStorage.setItem(storagePrefix + 'last', session.roomId);
  } catch { /* Private browsing may disable storage. The live session still works. */ }
  revisions.set(session.token, session.revision);
  return session;
}

export function getSavedSession(roomId) {
  try {
    const id = roomId || sessionStorage.getItem(storagePrefix + 'last');
    if (!id) return null;
    const session = JSON.parse(sessionStorage.getItem(storagePrefix + id));
    return session?.roomId === id && session.token ? session : null;
  } catch { return null; }
}

export function forgetSession(roomId) {
  const session = getSavedSession(roomId);
  if (session) {
    revisions.delete(session.token);
    for (const held of hands.values()) {
      if (held.session.token === session.token) releasePiece(session, held.pieceId).catch(() => {});
    }
  }
  try {
    const id = roomId || session?.roomId;
    if (id) sessionStorage.removeItem(storagePrefix + id);
    if (sessionStorage.getItem(storagePrefix + 'last') === id) sessionStorage.removeItem(storagePrefix + 'last');
  } catch { /* No persisted session. */ }
}

async function request(url, session, body, { signal, blob = false } = {}) {
  if (!hand) hand = randomKey(12);
  const result = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(session && { Authorization: 'Bearer ' + session.token }), 'X-Canvas-Hand': hand,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }), signal, cache: 'no-store', credentials: 'same-origin',
  });
  if (!result.ok) {
    let errorText = 'No se ha podido contactar con la mesa.';
    try { errorText = (await result.json()).error || errorText; } catch { /* Hosting unavailable. */ }
    const error = new Error(errorText);
    error.status = result.status;
    throw error;
  }
  return blob ? result.blob() : result.json();
}

async function repeatable(requestOnce) {
  try { return await requestOnce(); }
  catch (error) {
    if (!(error instanceof TypeError) && ![502, 503, 504].includes(error.status)) throw error;
    return requestOnce();
  }
}

const endpoint = (session, action) => API + '/' + encodeURIComponent(session.roomId) + '/' + action;

export async function createRoom({ title, scene, masterKey, name }) {
  const body = { title, scene, masterKey, name, requestRoomId: randomKey(12), proof: randomKey() };
  return remember(await repeatable(() => request(API, null, body)));
}

export async function joinRoom({ roomId, invite, name }) {
  // Recover a redeemed invitation after a response is lost, including across
  // refresh. A different browser cannot redeem the same invite again.
  const key = storagePrefix + 'pending.' + roomId;
  let proof = randomKey();
  try {
    const pending = JSON.parse(sessionStorage.getItem(key));
    if (pending?.invite === invite) proof = pending.proof;
    else sessionStorage.setItem(key, JSON.stringify({ invite, proof }));
  } catch { /* Session-only recovery when storage is unavailable. */ }
  const body = { invite, name, proof };
  const session = remember(await repeatable(() => request(endpoint({ roomId }, 'join'), null, body)));
  try { sessionStorage.removeItem(key); } catch { /* No persisted invitation. */ }
  return session;
}

export const inviteSeat = (session, seatId) => request(endpoint(session, 'invites'), session, { seatId });

export function watchRoom(session, callback, { asSeat, onError } = {}) {
  const controller = new AbortController();
  let timer, cursor, previous;
  const poll = async () => {
    const params = new URLSearchParams();
    if (asSeat) params.set('asSeat', asSeat);
    if (cursor && previous) {
      params.set('after', cursor); params.set('wait', '1'); params.set('known', String(previous.revision));
    }
    try {
      const data = await request(endpoint(session, 'view') + '?' + params, session, null, { signal: controller.signal });
      if (controller.signal.aborted) return;
      previous = { ...data, game: data.game || previous?.game };
      cursor = data.cursor;
      revisions.set(session.token, Math.max(revisions.get(session.token) || 0, data.revision));
      callback(previous);
      timer = setTimeout(poll, 0);
    } catch (error) {
      if (controller.signal.aborted) return;
      onError?.(error);
      if (![401, 403].includes(error.status)) timer = setTimeout(poll, 1100);
    }
  };
  poll();
  return () => { controller.abort(); clearTimeout(timer); };
}

const holdKey = (session, pieceId) => session.token + '/' + pieceId;
const stopHold = hold => {
  clearInterval(hold.renew);
  clearTimeout(hold.dragTimer);
  if (hands.get(hold.key) === hold) hands.delete(hold.key);
};

export async function grabPiece(session, pieceId) {
  const key = holdKey(session, pieceId);
  const old = hands.get(key);
  if (old) return old.ready;
  const hold = { key, session, pieceId, latest: null, renew: null, dragTimer: null, sending: false };
  hands.set(key, hold);
  hold.ready = (async () => {
    try {
      const row = await request(endpoint(session, 'grab'), session, { pieceId });
      if (!row.granted) { stopHold(hold); return false; }
      hold.leaseId = row.leaseId;
      hold.renew = setInterval(async () => {
        try {
          const response = await request(endpoint(session, 'grab'), session, { pieceId, leaseId: hold.leaseId });
          if (!response.granted) stopHold(hold);
        } catch { /* A network interruption lets the server's lease expire. */ }
      }, 2600);
      return true;
    } catch (error) { stopHold(hold); throw error; }
  })();
  return hold.ready;
}

export async function releasePiece(session, pieceId) {
  const hold = hands.get(holdKey(session, pieceId));
  if (!hold) return;
  if (!(await hold.ready)) return;
  if (hold.committing) await hold.committing.catch(() => {});
  stopHold(hold);
  await request(endpoint(session, 'release'), session, { pieceId, leaseId: hold.leaseId });
}

export async function dragPiece(session, pieceId, x, z, pose) {
  const hold = hands.get(holdKey(session, pieceId));
  if (!hold?.leaseId || hold.committing) return;
  hold.latest = { x, z, ...(pose && { pose }) };
  if (hold.dragTimer || hold.sending) return;
  const flush = async () => {
    hold.dragTimer = null;
    if (!hands.has(hold.key) || hold.committing || !hold.latest) return;
    const latest = hold.latest;
    hold.latest = null; hold.sending = true;
    try {
      await request(endpoint(session, 'drag'), session, { pieceId, ...latest, leaseId: hold.leaseId });
    } catch { /* The release command confirms whether this hand still owns the piece. */ }
    finally {
      hold.sending = false;
      if (hold.latest && hands.has(hold.key) && !hold.committing) hold.dragTimer = setTimeout(flush, 110);
    }
  };
  hold.dragTimer = setTimeout(flush, 80);
}

function commit(session, command, leaseId, action) {
  const body = { operationId: randomKey(), baseRevision: revisions.get(session.token) ?? session.revision ?? 0,
    ...(command && { command }), ...(leaseId && { leaseId }) };
  return repeatable(() => request(endpoint(session, action), session, body)).then(receipt => {
    revisions.set(session.token, Math.max(revisions.get(session.token) || 0, receipt.revision));
    return receipt;
  });
}

export async function sendCommand(session, command) {
  const needsHand = ['roll', 'drop', 'bag'].includes(command.type);
  if (!needsHand) return commit(session, command, null, 'commands');
  const key = holdKey(session, command.pieceId);
  const holdBefore = hands.get(key);
  if (!(holdBefore?.leaseId || await grabPiece(session, command.pieceId))) throw new Error('Otra mano tiene esta pieza.');
  const hold = hands.get(key);
  if (!hold) throw new Error('Vuelve a coger la pieza.');
  hold.committing = commit(session, command, hold.leaseId, 'commands');
  try { return await hold.committing; }
  finally {
    stopHold(hold);
    // A validation error leaves the lease in place until this release.
    request(endpoint(session, 'release'), session, { pieceId: command.pieceId, leaseId: hold.leaseId }).catch(() => {});
  }
}

export const undoRoom = session => commit(session, null, null, 'undo');
export const fetchRoomMap = (session, asSeat, signal) => request(endpoint(session, 'map')
  + (asSeat ? '?asSeat=' + encodeURIComponent(asSeat) : ''), session, null, { blob: true, signal });

export function fetchPieceArt(session, pieceId, asSeat, signal) {
  const params = new URLSearchParams({ pieceId });
  if (asSeat) params.set('asSeat', asSeat);
  return request(endpoint(session, 'art') + '?' + params, session, null, { blob: true, signal });
}
