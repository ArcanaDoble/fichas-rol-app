'use strict';

const http = require('node:http');
const os = require('node:os');
const { RoomService } = require('./rooms.cjs');
const { configuredStore } = require('./store.cjs');
const { requireRoom, RoomError } = require('./errors.cjs');

const prefix = '/api/canvas3d';
const bodyLimit = 5 * 1024 * 1024;
function loopback(req) {
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host || '');
  return localHost && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
}

function localJoinOrigin(req, interfaces = os.networkInterfaces()) {
  if (process.env.K_SERVICE || process.env.NODE_ENV === 'production' || !loopback(req)) return undefined;
  const candidates = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (/virtual|docker|vethernet|wsl|vpn|vmware|tailscale|utun/i.test(name)) continue;
    for (const item of addresses || []) {
      if (item.internal || ![4, 'IPv4'].includes(item.family) ||
          !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)) continue;
      candidates.push({ ip: item.address, preferred: /wi-?fi|wireless|ethernet|^en|^eth|^wl/i.test(name) });
    }
  }
  const address = candidates.find(c => c.preferred)?.ip || candidates[0]?.ip;
  if (!address) return undefined;
  const port = new URL('http://' + req.headers.host).port;
  return (req.socket.encrypted ? 'https://' : 'http://') + address + (port ? ':' + port : '');
}
function readPayload(request) {
  requireRoom(request.headers['content-type']?.split(';')[0] === 'application/json', 415, 'Se esperaba JSON.');
  requireRoom(!(Number(request.headers['content-length']) > bodyLimit), 413, 'El escenario es demasiado grande.');
  if (request.body && typeof request.body === 'object') return Promise.resolve(request.body);
  return (async () => {
    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
      length += chunk.length;
      requireRoom(length <= bodyLimit, 413, 'El escenario es demasiado grande.');
      chunks.push(chunk);
    }
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}', (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('key');
        return value;
      });
      requireRoom(body && typeof body === 'object' && !Array.isArray(body), 400, 'Petición no válida.');
      return body;
    } catch { throw new RoomError(400, 'El contenido de la mesa no es válido.'); }
  })();
}

function createHandler(options = {}) {
  const api = new RoomService({
    store: options.store || configuredStore(),
    model: options.model || require('../../src/features/canvas/table3d/game.cjs'),
    pilotKey: options.pilotKey ?? process.env.CANVAS3D_MASTER_KEY,
    allowLoopback: options.allowLoopback ?? (!process.env.K_SERVICE && process.env.NODE_ENV !== 'production'),
    now: options.now,
  });
  return async function handle(req, res, next) {
    const url = new URL(req.originalUrl || req.url, 'http://localhost');
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + '/')) {
      if (next) next();
      else { res.writeHead(404); res.end(); }
      return;
    }
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Authorization');
    const json = (status, data) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    const aborted = new AbortController();
    res.on('close', () => aborted.abort());
    try {
      const [, , , entity, id, endpoint, extra] = url.pathname.split('/');
      if (req.method === 'GET' && entity === 'health' && !id) { json(200, { ok: true }); return; }
      requireRoom(entity === 'rooms' && !extra, 404, 'Acción de sala desconocida.');
      const secret = (req.headers.authorization || '').replace(/^Bearer /, '');
      const hand = req.headers['x-canvas-hand'] || 'direct';
      requireRoom(typeof hand === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(hand), 400, 'Mano no válida.');
      const asSeat = url.searchParams.get('asSeat');
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        // Hosting can forward the public origin to Cloud Run under a different
        // Host. JSON and bearer authentication require an explicit API request.
        if (origin && !process.env.K_SERVICE) requireRoom(new URL(origin).host === req.headers.host, 403, 'Origen no válido.');
        const body = await readPayload(req);
        if (!id) {
          json(201, await api.create(body, loopback(req))); return;
        }
        if (endpoint === 'join') { json(200, await api.join(id, body)); return; }
        if (endpoint === 'invites') {
          const invitation = await api.invite(id, secret, body.seatId);
          const origin = localJoinOrigin(req);
          json(201, origin ? { ...invitation, joinOrigin: origin } : invitation); return;
        }
        if (['grab', 'drag', 'release'].includes(endpoint)) {
          json(200, await api.handlePiece(id, secret, hand, endpoint, body)); return;
        }
        if (endpoint === 'commands' || endpoint === 'undo') {
          json(200, await api.command(id, secret, hand, body, endpoint === 'undo')); return;
        }
      } else if (req.method === 'GET' && id) {
        if (endpoint === 'art') {
          const source = await api.art(id, secret, asSeat, url.searchParams.get('pieceId'));
          const image = source && await require('./map-image.cjs').renderPieceImage(source);
          requireRoom(image, 404, 'La ilustración de la pieza no está disponible.');
          res.writeHead(200, { 'Content-Type': image.type }); res.end(image.body); return;
        }
        if (endpoint === 'map') {
          const data = await api.map(id, secret, asSeat);
          const render = options.renderMap || require('./map-image.cjs').renderMapImage;
          const img = await render(data);
          requireRoom(img && Buffer.isBuffer(img.body), 404, 'Este escenario no tiene fondo visible.');
          res.writeHead(200, { 'Content-Type': img.type }); res.end(img.body); return;
        }
        if (endpoint === 'view') {
          const wait = url.searchParams.get('wait') === '1' ? 20_000 : 0;
          const data = await api.snapshot(id, secret, asSeat, url.searchParams.get('after'), wait, aborted.signal);
          if (data && url.searchParams.get('known') === String(data.revision)) {
            const { game, ...motion } = data;
            json(200, motion);
          } else if (data) json(200, data);
          return;
        }
      }
      throw new RoomError(404, 'Acción de sala desconocida.');
    } catch (error) {
      if (aborted.signal.aborted) return;
      if (!(error instanceof RoomError)) console.error('canvas3d:', error.message);
      json(error instanceof RoomError ? error.status : 500,
        { error: error instanceof RoomError ? error.message : 'La sala no ha podido completar la jugada.' });
    }
  };
}

if (require.main === module) {
  const host = process.env.CANVAS3D_HOST || (process.env.K_SERVICE ? '0.0.0.0' : '127.0.0.1');
  const server = http.createServer(createHandler());
  server.listen(Number(process.env.PORT) || 4183, host, () => console.info('Canvas 3D en ' + host + ':' + server.address().port));
}

module.exports = { createHandler };
