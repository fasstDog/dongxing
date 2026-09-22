'use strict';

/**
 * 合并取腿：火车 + 航班 mock（同契约）。
 * pipeline 只依赖 searchLegs({ from, to, date?, after_at? }) → Leg[]
 */
const train = require('./train.mock');
const flight = require('./flight.mock');

/**
 * @param {{ from: string, to: string, date?: string|null, after_at?: string|null }} query
 * @returns {Promise<object[]>}
 */
async function searchLegs(query) {
  const q = query || {};
  const [trains, flights] = await Promise.all([
    train.searchLegs(q).catch((e) => {
      if (e && e.code === 'LEGS_NOT_FOUND') return [];
      throw e;
    }),
    flight.searchLegs(q).catch((e) => {
      if (e && e.code === 'LEGS_NOT_FOUND') return [];
      throw e;
    }),
  ]);
  const a = Array.isArray(trains) ? trains : [];
  const b = Array.isArray(flights) ? flights : [];
  return a.concat(b);
}

function configure(opts) {
  if (train.configure) train.configure(opts);
  if (flight.configure) flight.configure(opts);
}

function clearCache() {
  if (train.clearCache) train.clearCache();
  if (flight.clearCache) flight.clearCache();
}

module.exports = {
  searchLegs,
  configure,
  clearCache,
  train,
  flight,
};
