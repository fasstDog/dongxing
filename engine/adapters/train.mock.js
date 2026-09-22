/**
 * TrainLegProvider · mock 适配器（MVP）
 *
 * - 读 data/mock/legs-*.json，只返回 mode === "train" 的 Leg
 * - 单机内存缓存 + TTL（拍板：MVP 不上 Redis）
 * - 不臆造车次/票价；密钥无关；禁止爬取
 *
 * Usage:
 *   const { search, clearCache } = require('./train.mock');
 *   const legs = search({ from_city: '徐州', to_city: '西宁', date: '2026-10-01' });
 *   node engine/adapters/train.mock.js 徐州 西宁
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_LEGS_PATH = path.join(ROOT, 'data', 'mock', 'legs-xuzhou-lhasa.json');
/** MVP 单机内存 TTL（毫秒） */
const DEFAULT_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { expires: number, legs: object[] }>} */
const cache = new Map();

let legsPath = DEFAULT_LEGS_PATH;
let ttlMs = DEFAULT_TTL_MS;

function configure(opts) {
  if (!opts || typeof opts !== 'object') return;
  if (opts.legsPath) legsPath = path.resolve(opts.legsPath);
  if (typeof opts.ttlMs === 'number' && opts.ttlMs >= 0) ttlMs = opts.ttlMs;
}

function clearCache() {
  cache.clear();
}

function cacheKey(fromCity, toCity, date) {
  return [fromCity, toCity, date || '*'].join('|');
}

function loadAllLegs() {
  if (!fs.existsSync(legsPath)) {
    const err = new Error('LEGS_NOT_FOUND: ' + legsPath);
    err.code = 'LEGS_NOT_FOUND';
    throw err;
  }
  const raw = JSON.parse(fs.readFileSync(legsPath, 'utf8'));
  const list = Array.isArray(raw.legs) ? raw.legs : Array.isArray(raw) ? raw : [];
  return list.filter((l) => l && l.mode === 'train');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Calendar day + n days as YYYY-MM-DD (UTC+8 wall date arithmetic). */
function addDaysYmd(ymd, days) {
  const ms = Date.parse(ymd + 'T12:00:00+08:00') + days * 86400000;
  const d = new Date(ms);
  // format in +08
  const shifted = new Date(ms + 8 * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return y + '-' + pad(m) + '-' + pad(day);
}

function daySpanYmd(fromYmd, toYmd) {
  const a = Date.parse(fromYmd + 'T12:00:00+08:00');
  const b = Date.parse(toYmd + 'T12:00:00+08:00');
  return Math.round((b - a) / 86400000);
}

/**
 * Keep clock + offset suffix; move calendar to dateStr; preserve overnight span.
 */
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

/**
 * @param {{ from_city: string, to_city: string, date?: string, bypassCache?: boolean }} query
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
  const key = cacheKey(fromCity, toCity, date);
  const now = Date.now();

  if (!query.bypassCache && ttlMs > 0) {
    const hit = cache.get(key);
    if (hit && hit.expires > now) {
      return hit.legs.map((l) => Object.assign({}, l));
    }
  }

  const matched = loadAllLegs()
    .filter((l) => l.from_city === fromCity && l.to_city === toCity)
    .map((l) => applyDate(l, date));

  if (ttlMs > 0) {
    cache.set(key, { expires: now + ttlMs, legs: matched });
  }
  return matched.map((l) => Object.assign({}, l));
}

function mainCli() {
  const fromCity = process.argv[2];
  const toCity = process.argv[3];
  const date = process.argv[4] || '';
  if (!fromCity || !toCity) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'USAGE',
        hint: 'node engine/adapters/train.mock.js <from_city> <to_city> [YYYY-MM-DD]',
      })
    );
    process.exit(1);
  }
  try {
    const legs = search({ from_city: fromCity, to_city: toCity, date: date || undefined });
    console.log(
      JSON.stringify(
        {
          ok: true,
          provider: 'train.mock',
          query: { from_city: fromCity, to_city: toCity, date: date || null },
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

module.exports = {
  search,
  clearCache,
  configure,
  DEFAULT_LEGS_PATH,
  DEFAULT_TTL_MS,
};

if (require.main === module) {
  mainCli();
}
