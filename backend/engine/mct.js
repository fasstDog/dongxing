/**
 * Minimum connection time (MCT) rules — programmatic defaults only.
 * No LLM; no realtime inventory.
 */

'use strict';

const DEFAULTS = Object.freeze({
  same_station: 60, // minutes
  same_city: 180,
});

/** @returns {'same_station'|'same_city'|null} */
function classifyTransfer(fromLeg, toLeg) {
  if (!fromLeg || !toLeg) return null;
  if (fromLeg.to_station && toLeg.from_station && fromLeg.to_station === toLeg.from_station) {
    return 'same_station';
  }
  if (fromLeg.to_city && toLeg.from_city && fromLeg.to_city === toLeg.from_city) {
    return 'same_city';
  }
  return null;
}

function requiredMctMinutes(kind, overrides) {
  const cfg = { ...DEFAULTS, ...(overrides || {}) };
  if (kind === 'same_station') return cfg.same_station;
  if (kind === 'same_city') return cfg.same_city;
  return null;
}

function parseIso(s) {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** Buffer between arrival of A and departure of B, in minutes. */
function bufferMinutes(fromLeg, toLeg) {
  const arr = parseIso(fromLeg && fromLeg.arr_at);
  const dep = parseIso(toLeg && toLeg.dep_at);
  if (arr == null || dep == null) return null;
  return Math.floor((dep - arr) / 60000);
}

/**
 * @returns {{ ok: boolean, kind: string|null, buffer_min: number|null, required_min: number|null }}
 */
function checkConnection(fromLeg, toLeg, overrides) {
  const kind = classifyTransfer(fromLeg, toLeg);
  if (!kind) {
    return { ok: false, kind: null, buffer_min: null, required_min: null };
  }
  const required = requiredMctMinutes(kind, overrides);
  const buffer = bufferMinutes(fromLeg, toLeg);
  const ok = buffer != null && required != null && buffer >= required;
  return { ok, kind, buffer_min: buffer, required_min: required };
}

module.exports = {
  DEFAULTS,
  MCT_SAME_STATION_MIN: DEFAULTS.same_station,
  MCT_SAME_CITY_MIN: DEFAULTS.same_city,
  classifyTransfer,
  requiredMctMinutes,
  bufferMinutes,
  checkConnection,
};
