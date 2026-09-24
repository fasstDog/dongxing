/** FROZEN CJS — 新改动请进 engine/src/*.ts；运行: cd engine && npm run server */
#!/usr/bin/env node
/**
 * M1 服务壳：POST /v1/plans/search → pipeline.searchPlans（仍 mock）
 * 零依赖：Node http
 *
 *   PORT=8787 node backend/engine/server.js
 *   curl -s localhost:8787/health
 *   curl -s -X POST localhost:8787/v1/plans/search -H 'content-type: application/json' \
 *     -d '{"from_city":"徐州","to_city":"拉萨","date":"2026-10-01"}'
 */
'use strict';

const http = require('http');
const { URL } = require('url');
const { searchPlans } = require('./pipeline');
const { toPlansSearchResponse } = require('./to-api-response');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(Object.assign(new Error('BODY_TOO_LARGE'), { code: 'BODY_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(Object.assign(new Error('INVALID_JSON'), { code: 'INVALID_JSON' }));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(json);
}

function normalizeRequest(body) {
  const from_city = String((body && (body.from_city || body.from)) || '').trim();
  const to_city = String((body && (body.to_city || body.to)) || '').trim();
  const date =
    body && body.date_flexible === true
      ? body.date || null
      : body && body.date
        ? String(body.date).trim()
        : null;
  const vias = Array.isArray(body && body.vias)
    ? body.vias.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const path_mode =
    body && body.path_mode
      ? String(body.path_mode)
      : vias.length
        ? 'user'
        : 'auto';
  const extra_hubs = Array.isArray(body && body.extra_hubs)
    ? body.extra_hubs.map((v) => String(v).trim()).filter(Boolean)
    : [];
  return {
    from_city,
    to_city,
    date_flexible: body && body.date_flexible !== false,
    date,
    vias,
    path_mode,
    extra_hubs,
  };
}

async function handleSearch(body) {
  const req = normalizeRequest(body || {});
  if (!req.from_city || !req.to_city) {
    return {
      status: 400,
      body: {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'from_city and to_city required' },
        main: [],
        more: [],
      },
    };
  }
  if (req.vias.length > 3) {
    return {
      status: 400,
      body: {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'vias max 3' },
        main: [],
        more: [],
      },
    };
  }

  const vias = req.path_mode === 'auto' ? [] : req.vias;
  const result = await searchPlans({
    from: req.from_city,
    to: req.to_city,
    date: req.date || undefined,
    vias: vias,
    extraHubs: req.extra_hubs,
  });

  const response = toPlansSearchResponse(result, req);
  return { status: response.ok ? 200 : 200, body: response };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://' + HOST + ':' + PORT);
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true, service: 'dongxing-plans', version: 'v1' });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/v1/plans/search') {
    try {
      const body = await readJson(req);
      const out = await handleSearch(body);
      send(res, out.status, out.body);
    } catch (e) {
      const code = e && e.code;
      if (code === 'INVALID_JSON') {
        send(res, 400, {
          ok: false,
          error: { code: 'INVALID_REQUEST', message: 'invalid JSON body' },
          main: [],
          more: [],
        });
        return;
      }
      console.error(e);
      send(res, 500, {
        ok: false,
        error: { code: 'INTERNAL', message: 'internal error' },
        main: [],
        more: [],
      });
    }
    return;
  }
  send(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'not found' } });
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify({
      ok: true,
      listen: 'http://' + HOST + ':' + PORT,
      routes: ['GET /health', 'POST /v1/plans/search'],
      note: 'mock adapters; no realtime inventory',
    })
  );
});
