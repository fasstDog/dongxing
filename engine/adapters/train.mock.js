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
/** MVP 单机内存 TTL（毫秒）；mock 数据不变时可略长 */
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

/**
 * Shift dep_at / arr_at to the given calendar date (local +08:00 assumed in mock ISO).
 * Keeps duration; does not invent new services.
 */
function shiftToDate(leg, dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { ...leg };
  const dep = new Date(leg.dep_at);
  const arr = new Date(leg.arr_at);
  if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) return { ...leg };
  const durMs = arr.getTime() - dep.getTime();
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextDep = new Date(dep);
  nextDep.setFullYear(y, m - 1, d);
  const nextArr = new Date(nextDep.getTime() + durMs);
  return {
    ...leg,
    dep_at: nextDep.toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/Z$/, '+08:00'),
    arr_at: nextArr.toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/Z$/, '+08:00'),
    // Prefer keeping original offset strings if parse round-trip is messy — use slice replace:
    // Re-build from components for stable +08:00 mock:
    ...rebuildIsoPair(dep, arr, dateStr),
    source: leg.source || 'mock',
    as_of: leg.as_of || new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function rebuildIsoPair(dep, arr, dateStr) {
  const durMs = arr.getTime() - dep.getTime();
  const [y, m, d] = dateStr.split('-').map(Number);
  const depLocal = new Date(y, m - 1, d, dep.getHours(), dep.getMinutes(), dep.getSeconds());
  // Use UTC getters carefully — mock strings are +08:00; parse ISO keeps absolute instant.
  // Simpler: string-replace date prefix on dep_at / arr_at and fix arr calendar if overnight.
  return null;
}

/** Stable date shift: replace YYYY-MM-DD prefix; bump arr date by overnight delta. */
function applyDate(leg, dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Object.assign({}, leg, { source: leg.source || 'mock' });
  }
  const depDay = leg.dep_at.slice(0, 10);
  const arrDay = leg.arr_at.slice(0, 10);
  const daySpan = Math.round(
    (Date.parse(arrDay + 'T00:00:00+08:00') - Date.parse(depDay + 'T00:00:00+08:00')) / 86400000
  );
  const depAt = dateStr + leg.dep_at.slice(10);
  const base = Date.parse(dateStr + 'T00:00:00+08:00') + daySpan * 86400000;
  const arrDate = new Date(base);
  const arrDayStr =
    arrDate.getFullYear() +
    '-' +
    pad(arrDate.getMonth() + 1) +
    '-' +
    pad(arrDate.getDate());
  const arrAt = arrDayStr + leg.arr_at.slice(10);
  return Object.assign({}, leg, {
    dep_at: depAt,
    arr_at: arrAt,
    source: leg.source || 'mock',
  });
}

/**
 * @param {{ from_city: string, to_city: string, date?: string, bypassCache?: boolean }} query
 * @returns {object[]} Leg[]
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

  const all = loadAllLegs();
  const matched = all
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
