/**
 * End-to-end programmatic search pipeline (Node CJS).
 * Legs from adapters → hub/via chains → MCT → TransferPlay → score cards.
 * No LLM; no fake inventory; mock-only OD pairs degrade to empty.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { searchLegs } = require('./adapters');
const { checkConnection, bufferMinutes } = require('./mct');
const { pickMainCards } = require('./score');

const ROOT = path.resolve(__dirname, '..');
const HUB_POIS_PATH = path.join(ROOT, 'data', 'hub-pois.json');

/** MVP hubs from docs/hubs-mvp.md (12 cities, 西宁 required). */
const HUBS_MVP = Object.freeze([
  '北京',
  '上海',
  '广州',
  '深圳',
  '成都',
  '重庆',
  '武汉',
  '杭州',
  '郑州',
  '西安',
  '兰州',
  '西宁',
]);

let poisCache = null;

function loadPois() {
  if (poisCache) return poisCache;
  try {
    const raw = JSON.parse(fs.readFileSync(HUB_POIS_PATH, 'utf8'));
    poisCache = Array.isArray(raw.pois) ? raw.pois : [];
  } catch (_e) {
    poisCache = [];
  }
  return poisCache;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD of an ISO datetime in +08 wall clock (slice is fine for our mock). */
function ymdOf(iso) {
  if (!iso) return null;
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  const shifted = new Date(t + 8 * 3600 * 1000);
  return (
    shifted.getUTCFullYear() +
    '-' +
    pad(shifted.getUTCMonth() + 1) +
    '-' +
    pad(shifted.getUTCDate())
  );
}

function sumPrice(legs) {
  return legs.reduce((s, l) => s + (Number(l.price_ref_cny) || 0), 0);
}

function doorToDoorMin(legs) {
  if (!legs.length) return 0;
  if (legs.length === 1) return Number(legs[0].duration_min) || 0;
  let total = legs.reduce((s, l) => s + (Number(l.duration_min) || 0), 0);
  for (let i = 0; i < legs.length - 1; i++) {
    const buf = bufferMinutes(legs[i], legs[i + 1]);
    if (buf != null && buf > 0) total += buf;
  }
  return total;
}

function routeCities(legs) {
  if (!legs.length) return [];
  return [legs[0].from_city].concat(legs.map((l) => l.to_city));
}

function routeLabel(legs) {
  return routeCities(legs).join(' → ');
}

/**
 * TransferPlay rows whose min_buffer_hours is met by buffer hours at hub.
 * @returns {object[]}
 */
function pickPlays(hubCity, bufferMin, pois, limit) {
  const lim = limit == null ? 3 : limit;
  if (bufferMin == null || !hubCity) return [];
  const hours = bufferMin / 60;
  const cands = pois.filter(
    (p) => p.hub_city === hubCity && hours >= Number(p.min_buffer_hours)
  );
  cands.sort(
    (a, b) =>
      Number(b.min_buffer_hours) - Number(a.min_buffer_hours) ||
      String(a.name).localeCompare(String(b.name), 'zh')
  );
  return cands.slice(0, lim).map((p) => ({
    hub_city: p.hub_city,
    anchor_station: p.anchor_station,
    name: p.name,
    dist_text: p.dist_text,
    dist_km: p.dist_km,
    suggest_hours: p.suggest_hours,
    suggest_text: p.suggest_text,
    min_buffer_hours: p.min_buffer_hours,
    back_ok_note: p.back_ok_note,
  }));
}

function attachPlays(legs, pois) {
  const plays = [];
  const xfers = [];
  for (let i = 0; i < legs.length - 1; i++) {
    const a = legs[i];
    const b = legs[i + 1];
    const mct = checkConnection(a, b);
    const buf = mct.buffer_min;
    xfers.push({
      city: a.to_city,
      kind: mct.kind,
      buffer_min: buf,
      required_min: mct.required_min,
      ok: mct.ok,
    });
    for (const p of pickPlays(a.to_city, buf, pois)) {
      plays.push(p);
    }
  }
  return { plays, xfers };
}

function buildPlan(legs, pathNote) {
  const price = sumPrice(legs);
  const duration = doorToDoorMin(legs);
  const transfersCount = Math.max(0, legs.length - 1);
  const label = routeLabel(legs);
  const { plays, xfers } = attachPlays(legs, loadPois());
  const id =
    'plan-' +
    legs
      .map((l) => l.id || `${l.from_city}-${l.to_city}`)
      .join('_')
      .slice(0, 64);

  return {
    id,
    label,
    kind: transfersCount === 0 ? 'direct' : 'transfer',
    path_note: pathNote || null,
    price_ref_cny: price,
    duration_min: duration,
    summary: {
      route_text: label,
      duration_min: duration,
      transfers: transfersCount,
      price_ref_cny: price,
      price_text: '参考价约 ¥' + price,
    },
    transfers: xfers,
    legs: legs.map((l) => Object.assign({}, l)),
    play: plays.length ? plays : null,
    play_hint: plays.length
      ? plays[0].hub_city + '可玩 · ' + plays[0].name
      : null,
  };
}

function chainPassesMct(legs) {
  for (let i = 0; i < legs.length - 1; i++) {
    const r = checkConnection(legs[i], legs[i + 1]);
    if (!r.ok) return false;
  }
  return true;
}

/**
 * Safe searchLegs wrapper — empty array on missing OD / errors (no throw).
 */
async function safeSearchLegs(from, to, date) {
  try {
    const legs = await searchLegs({ from, to, date: date || undefined });
    return Array.isArray(legs) ? legs : [];
  } catch (_e) {
    return [];
  }
}

/**
 * Product of hop option lists; keep chains that pass pairwise MCT.
 * Caps combinations for MVP.
 */
function combineHops(hopOptions, maxPlans) {
  const cap = maxPlans == null ? 32 : maxPlans;
  const out = [];
  if (!hopOptions.length || hopOptions.some((h) => !h.length)) return out;

  function rec(idx, acc) {
    if (out.length >= cap) return;
    if (idx === hopOptions.length) {
      if (chainPassesMct(acc)) out.push(acc.slice());
      return;
    }
    for (const leg of hopOptions[idx]) {
      if (out.length >= cap) return;
      const next = acc.concat([leg]);
      if (acc.length && !checkConnection(acc[acc.length - 1], leg).ok) continue;
      rec(idx + 1, next);
    }
  }
  rec(0, []);
  return out;
}

/**
 * Chain along cities [c0,c1,...,cn] with date shifted by prior arrival day.
 */
async function searchChainCities(cities, date) {
  if (cities.length < 2) return [];
  const hopOptions = [];
  let hopDate = date || undefined;
  for (let i = 0; i < cities.length - 1; i++) {
    const legs = await safeSearchLegs(cities[i], cities[i + 1], hopDate);
    if (!legs.length) return [];
    hopOptions.push(legs);
    // next hop: use earliest arrival day among options as search date seed
    const arrDays = legs.map((l) => ymdOf(l.arr_at)).filter(Boolean).sort();
    hopDate = arrDays[0] || hopDate;
  }
  return combineHops(hopOptions);
}

/**
 * @param {{ from: string, to: string, date?: string|null, vias?: string[] }} q
 * @returns {Promise<{ ok: boolean, reason?: string, main: object, more: object[], meta?: object }>}
 */
async function searchPlans({ from, to, date, vias } = {}) {
  const fromCity = from != null ? String(from).trim() : '';
  const toCity = to != null ? String(to).trim() : '';
  const viaList = (Array.isArray(vias) ? vias : [])
    .map((v) => String(v).trim())
    .filter(Boolean);
  const dateStr = date ? String(date).trim() : '';

  const emptyMain = pickMainCards([]);

  if (!fromCity || !toCity) {
    return {
      ok: false,
      reason: 'INVALID_QUERY: from and to required',
      main: emptyMain,
      more: [],
    };
  }
  if (viaList.length > 3) {
    return {
      ok: false,
      reason: 'INVALID_REQUEST: vias max 3',
      main: emptyMain,
      more: [],
    };
  }

  const plans = [];
  const seen = new Set();

  function pushChain(legs, pathNote) {
    if (!legs || !legs.length) return;
    if (!chainPassesMct(legs)) return;
    const key = legs.map((l) => l.id || `${l.dep_at}|${l.service_ref}`).join('>');
    if (seen.has(key)) return;
    seen.add(key);
    plans.push(buildPlan(legs, pathNote));
  }

  if (viaList.length) {
    const cities = [fromCity].concat(viaList, [toCity]);
    const chains = await searchChainCities(cities, dateStr || undefined);
    for (const chain of chains) {
      pushChain(chain, '因你指定经 ' + viaList.join('、'));
    }
  } else {
    // Direct legs from → to
    const directs = await safeSearchLegs(fromCity, toCity, dateStr || undefined);
    for (const leg of directs) {
      pushChain([leg], '直达');
    }

    // 1-transfer via MVP hubs
    for (const hub of HUBS_MVP) {
      if (hub === fromCity || hub === toCity) continue;
      const left = await safeSearchLegs(fromCity, hub, dateStr || undefined);
      if (!left.length) continue;
      // Group by arrival day so second-leg date is coherent
      const byArrDay = new Map();
      for (const a of left) {
        const day = ymdOf(a.arr_at) || dateStr || '';
        if (!byArrDay.has(day)) byArrDay.set(day, []);
        byArrDay.get(day).push(a);
      }
      for (const [arrDay, leftLegs] of byArrDay) {
        const right = await safeSearchLegs(hub, toCity, arrDay || dateStr || undefined);
        if (!right.length) continue;
        for (const a of leftLegs) {
          for (const b of right) {
            pushChain([a, b], '系统选枢纽：' + hub);
          }
        }
      }
    }
  }

  if (!plans.length) {
    return {
      ok: false,
      reason: 'NO_FEASIBLE: mock has no connectable OD combo',
      main: emptyMain,
      more: [],
      meta: {
        from: fromCity,
        to: toCity,
        date: dateStr || null,
        vias: viaList,
        hubs_mvp: HUBS_MVP,
      },
    };
  }

  return {
    ok: true,
    main: pickMainCards(plans),
    more: plans,
    meta: {
      from: fromCity,
      to: toCity,
      date: dateStr || null,
      vias: viaList,
      plan_count: plans.length,
      disclaimer: '价格、时刻均为参考，以购票平台为准；无实时余票',
    },
  };
}

module.exports = {
  searchPlans,
  HUBS_MVP,
  buildPlan,
  pickPlays,
};
