/**
 * FlightLegProvider · mock 适配器（MVP）
 *
 * 与 train.mock 同契约：search({ from_city, to_city, date?, after_at? }) → Leg[]
 * 仅返回 mode === "flight"；单机内存 TTL；不臆造航班号/票价。
 *
 * 默认合并读取 data/mock/legs-*.json（含徐拉 / 沪蓉 / 京汉 等）
 *
 *   node engine/adapters/flight.mock.js 西安 拉萨
 *   node engine/adapters/flight.mock.js 上海 成都 2026-10-08
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_LEGS_DIR = path.join(ROOT, 'data', 'mock');
const DEFAULT_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { expires: number, legs: object[] }>} */
const cache = new Map();

/** Single-file override; null = merge all data/mock/legs-*.json */
let legsPath = null;
let legsDir = DEFAULT_LEGS_DIR;
let ttlMs = DEFAULT_TTL_MS;

function configure(opts) {
  if (!opts || typeof opts !== 'object') return;
  if (opts.legsPath) {
    legsPath = path.resolve(opts.legsPath);
  }
  if (Array.isArray(opts.legsPaths) && opts.legsPaths.length) {
    legsPath = null;
    legsDir = path.dirname(path.resolve(opts.legsPaths[0]));
    // keep explicit list via temporary marker files — prefer legsDir scan
  }
  if (opts.legsDir) legsDir = path.resolve(opts.legsDir);
  if (typeof opts.ttlMs === 'number' && opts.ttlMs >= 0) ttlMs = opts.ttlMs;
}

function resolveLegsFiles() {
  if (legsPath) return [legsPath];
  if (!fs.existsSync(legsDir)) return [];
  return fs
    .readdirSync(legsDir)
    .filter((n) => /^legs-.*\.json$/.test(n))
    .map((n) => path.join(legsDir, n))
    .sort();
}

function clearCache() {
  cache.clear();
}

function cacheKey(fromCity, toCity, date, afterAt) {
  return ['flight', fromCity, toCity, date || '*', afterAt || '*'].join('|');
}

function loadAllLegs() {
  const files = resolveLegsFiles();
  const out = [];
  for (const p of files) {
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const list = Array.isArray(raw.legs) ? raw.legs : Array.isArray(raw) ? raw : [];
    for (const l of list) {
      if (l && l.mode === 'flight') out.push(l);
    }
  }
  if (!files.length) {
    const err = new Error('LEGS_NOT_FOUND: ' + legsDir);
    err.code = 'LEGS_NOT_FOUND';
    throw err;
  }
  return out;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function addDaysYmd(ymd, days) {
  const ms = Date.parse(ymd + 'T12:00:00+08:00') + days * 86400000;
  const shifted = new Date(ms + 8 * 3600 * 1000);
  return (
    shifted.getUTCFullYear() +
    '-' +
    pad(shifted.getUTCMonth() + 1) +
    '-' +
    pad(shifted.getUTCDate())
  );
}

function daySpanYmd(fromYmd, toYmd) {
  const a = Date.parse(fromYmd + 'T12:00:00+08:00');
  const b = Date.parse(toYmd + 'T12:00:00+08:00');
  return Math.round((b - a) / 86400000);
}

function applyDate(leg, dateStr) {
  const out = Object.assign({}, leg, { source: leg.source || 'mock' });
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return out;
  const depDay = String(leg.dep_at).slice(0, 10);
  const arrDay = String(leg.arr_at).slice(0, 10);
  const span = daySpanYmd(depDay, arrDay);
  out.dep_at = dateStr + String(leg.dep_at).slice(10);
  out.arr_at = addDaysYmd(dateStr, span) + String(leg.arr_at).slice(10);
  return out;
}

function applyAfter(leg, afterAt) {
  const afterMs = Date.parse(afterAt);
  if (Number.isNaN(afterMs)) return Object.assign({}, leg, { source: leg.source || 'mock' });

  const depDay = String(leg.dep_at).slice(0, 10);
  const arrDay = String(leg.arr_at).slice(0, 10);
  const span = daySpanYmd(depDay, arrDay);
  const timeSuffix = String(leg.dep_at).slice(10);
  const arrSuffix = String(leg.arr_at).slice(10);

  const afterShifted = new Date(afterMs + 8 * 3600 * 1000);
  let ymd =
    afterShifted.getUTCFullYear() +
    '-' +
    pad(afterShifted.getUTCMonth() + 1) +
    '-' +
    pad(afterShifted.getUTCDate());

  for (let i = 0; i < 14; i++) {
    const depAt = ymd + timeSuffix;
    const depMs = Date.parse(depAt);
    if (!Number.isNaN(depMs) && depMs >= afterMs) {
      return Object.assign({}, leg, {
        dep_at: depAt,
        arr_at: addDaysYmd(ymd, span) + arrSuffix,
        source: leg.source || 'mock',
      });
    }
    ymd = addDaysYmd(ymd, 1);
  }
  return Object.assign({}, leg, { source: leg.source || 'mock' });
}

/**
 * @param {{ from_city: string, to_city: string, date?: string, after_at?: string, bypassCache?: boolean }} query
 * @returns {object[]}
 */
function search(query) {
  if (!query || !query.from_city || !query.to_city) {
    const err = new Error('INVALID_QUERY: from_city and to_city required');
    err.code = 'INVALID_QUERY';
    throw err;
  }
  const fromCity = String(query.from_city).trim();
  const toCity = String(query.to_city).trim();
  const date = query.date ? String(query.date).trim() : '';
  const afterAt = query.after_at ? String(query.after_at).trim() : '';
  const key = cacheKey(fromCity, toCity, date, afterAt);
  const now = Date.now();

  if (!query.bypassCache && ttlMs > 0) {
    const hit = cache.get(key);
    if (hit && hit.expires > now) {
      return hit.legs.map((l) => Object.assign({}, l));
    }
  }

  let matched = loadAllLegs().filter((l) => l.from_city === fromCity && l.to_city === toCity);

  if (afterAt) {
    matched = matched.map((l) => applyAfter(l, afterAt));
  } else if (date) {
    matched = matched.map((l) => applyDate(l, date));
  } else {
    matched = matched.map((l) => Object.assign({}, l, { source: l.source || 'mock' }));
  }

  if (ttlMs > 0) {
    cache.set(key, { expires: now + ttlMs, legs: matched });
  }
  return matched.map((l) => Object.assign({}, l));
}

function mainCli() {
  const args = process.argv.slice(2);
  let afterAt = '';
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--after' && args[i + 1]) {
      afterAt = args[++i];
    } else {
      positional.push(args[i]);
    }
  }
  const fromCity = positional[0];
  const toCity = positional[1];
  const date = positional[2] || '';
  if (!fromCity || !toCity) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'USAGE',
        hint:
          'node engine/adapters/flight.mock.js <from_city> <to_city> [YYYY-MM-DD] [--after ISO]',
      })
    );
    process.exit(1);
  }
  try {
    const legs = search({
      from_city: fromCity,
      to_city: toCity,
      date: date || undefined,
      after_at: afterAt || undefined,
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          provider: 'flight.mock',
          query: {
            from_city: fromCity,
            to_city: toCity,
            date: date || null,
            after_at: afterAt || null,
          },
          count: legs.length,
          legs: legs,
        },
        null,
        2
      )
    );
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.code || 'ERROR', message: e.message }));
    process.exit(1);
  }
}

/**
 * Adapter-facing async contract (same as train.mock).
 * @param {{ from: string, to: string, date?: string|null, after_at?: string|null }} query
 * @returns {Promise<object[]>}
 */
async function searchLegs({ from, to, date, after_at } = {}) {
  return search({
    from_city: from,
    to_city: to,
    date: date || undefined,
    after_at: after_at || undefined,
  });
}

module.exports = {
  searchLegs,
  search,
  clearCache,
  configure,
  DEFAULT_LEGS_PATHS,
  DEFAULT_TTL_MS,
};

if (require.main === module) {
  mainCli();
}
