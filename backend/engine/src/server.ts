/**
 * 懂行 · M1 服务壳（TypeScript）
 * POST /v1/plans/search → pipeline.searchPlans（仍 mock）
 *
 *   cd backend/engine && npm run server
 */
import http from 'http';
import { URL } from 'url';
import type { PlansSearchRequest, PlansSearchResponse } from '@dongxing/shared';
// allowJs CJS modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { searchPlans } = require('./pipeline.js') as {
  searchPlans: (q: {
    from: string;
    to: string;
    date?: string;
    vias?: string[];
    extraHubs?: string[];
  }) => Promise<{
    ok: boolean;
    reason?: string;
    main: Record<string, unknown>;
    more: unknown[];
  }>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toPlansSearchResponse } = require('./to-api-response.js') as {
  toPlansSearchResponse: (result: unknown, request: Record<string, unknown>) => Record<string, unknown>;
};

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

/** @deprecated use PlansSearchRequest; kept for body parse flexibility */
type SearchBody = PlansSearchRequest & {
  from?: string;
  to?: string;
};

function readJson(req: http.IncomingMessage): Promise<SearchBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
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
      if (!raw) return resolve({} as SearchBody);
      try {
        resolve(JSON.parse(raw) as SearchBody);
      } catch {
        reject(Object.assign(new Error('INVALID_JSON'), { code: 'INVALID_JSON' }));
      }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
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

function normalizeRequest(body: SearchBody) {
  const from_city = String(body?.from_city || body?.from || '').trim();
  const to_city = String(body?.to_city || body?.to || '').trim();
  const date =
    body?.date_flexible === true
      ? body.date || null
      : body?.date
        ? String(body.date).trim()
        : null;
  const vias = Array.isArray(body?.vias)
    ? body.vias.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const path_mode = body?.path_mode
    ? String(body.path_mode)
    : vias.length
      ? 'user'
      : 'auto';
  const extra_hubs = Array.isArray(body?.extra_hubs)
    ? body.extra_hubs.map((v) => String(v).trim()).filter(Boolean)
    : [];
  return {
    from_city,
    to_city,
    date_flexible: body?.date_flexible !== false,
    date,
    vias,
    path_mode,
    extra_hubs,
  };
}

async function handleSearch(body: SearchBody) {
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
    vias,
    extraHubs: req.extra_hubs,
  });

  const response = toPlansSearchResponse(result, req);
  return { status: 200, body: response };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true, service: 'dongxing-plans', version: 'v1', runtime: 'typescript' });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/v1/plans/search') {
    try {
      const body = await readJson(req);
      const out = await handleSearch(body);
      send(res, out.status, out.body);
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined;
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
      listen: `http://${HOST}:${PORT}`,
      routes: ['GET /health', 'POST /v1/plans/search'],
      runtime: 'typescript',
      note: 'mock adapters; no realtime inventory; python frozen',
    })
  );
});
