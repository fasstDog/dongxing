/**
 * Pure scoring helpers for plan cards.
 * Lower score is better. No LLM; prices/times are reference only.
 */

'use strict';

/** Default balanced weights (normalize-ish units). */
const DEFAULT_BALANCED_WEIGHTS = Object.freeze({
  price: 1 / 650,
  duration: 1 / 2000,
  transfers: 0.35,
  maxLegSitMin: 1 / 3000,
});

function asNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Extract comparable features from a plan-like object. */
function planFeatures(plan) {
  if (!plan || typeof plan !== 'object') {
    return { price: Infinity, duration: Infinity, transfers: Infinity, maxLegSitMin: Infinity };
  }
  const summary = plan.summary || {};
  const legs = Array.isArray(plan.legs) ? plan.legs : [];

  const price = asNumber(
    plan.price_ref_cny != null ? plan.price_ref_cny : summary.price_ref_cny,
    Infinity
  );

  const duration = asNumber(
    summary.duration_min != null
      ? summary.duration_min
      : plan.duration_min != null
        ? plan.duration_min
        : legs.reduce((s, l) => s + asNumber(l.duration_min, 0), 0),
    Infinity
  );

  let transfers;
  if (typeof summary.transfers === 'number') {
    transfers = summary.transfers;
  } else if (Array.isArray(plan.transfers)) {
    transfers = plan.transfers.length;
  } else if (typeof plan.transfers === 'number') {
    transfers = plan.transfers;
  } else {
    transfers = Math.max(0, legs.length - 1);
  }

  const maxLegSitMin = legs.length
    ? Math.max(...legs.map((l) => asNumber(l.duration_min, 0)))
    : asNumber(duration, Infinity);

  return { price, duration, transfers, maxLegSitMin };
}

/** Cheapest: primarily reference price; duration as tie-break. */
function scoreCheapest(plan) {
  const f = planFeatures(plan);
  return f.price + f.duration / 1e6;
}

/** Fastest: primarily door-to-door duration; price as tie-break. */
function scoreFastest(plan) {
  const f = planFeatures(plan);
  return f.duration + f.price / 1e6;
}

/**
 * Balanced: weighted price + duration + transfer count + max single-leg sit.
 * @param {object} plan
 * @param {Partial<typeof DEFAULT_BALANCED_WEIGHTS>} [weights]
 */
function scoreBalanced(plan, weights) {
  const w = { ...DEFAULT_BALANCED_WEIGHTS, ...(weights || {}) };
  const f = planFeatures(plan);
  const legs = Array.isArray(plan && plan.legs) ? plan.legs : [];
  const flightPen = 2.0 * legs.filter((l) => l && l.mode === 'flight').length;
  const comfortMap = {
    hardseat: 0.15,
    economy: 0.45,
    second_class: 0.55,
    hard_sleeper: 0.7,
    first_class: 0.75,
    soft_sleeper: 0.85,
    unknown: 0.4,
  };
  let comfort = 0.4;
  if (legs.length) {
    comfort =
      legs.reduce(
        (s, l) => s + (comfortMap[l.comfort] != null ? comfortMap[l.comfort] : 0.4),
        0
      ) / legs.length;
  }
  const playable =
    (Array.isArray(plan.play) && plan.play.length > 0) ||
    (Array.isArray(plan.transfers) &&
      plan.transfers.some((x) => x && (x.transfer_play || (plan.play && plan.play.length))));
  // 空铁进最快；综合偏铁路卧铺 + 可玩窗口
  return (
    f.price * w.price +
    f.duration * w.duration +
    f.transfers * w.transfers +
    f.maxLegSitMin * w.maxLegSitMin +
    flightPen -
    comfort * 2.5 -
    (playable ? 1.6 : 0)
  );
}

function pickBest(plans, scoreFn) {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  let best = plans[0];
  let bestScore = scoreFn(best);
  for (let i = 1; i < plans.length; i++) {
    const s = scoreFn(plans[i]);
    if (s < bestScore) {
      best = plans[i];
      bestScore = s;
    }
  }
  return best;
}

/**
 * Pick three main cards from a list of candidate plans.
 * @returns {{ cheapest: object|null, fastest: object|null, balanced: object|null }}
 */
function pickMainCards(plans) {
  const list = Array.isArray(plans) ? plans : [];
  return {
    cheapest: pickBest(list, scoreCheapest),
    fastest: pickBest(list, scoreFastest),
    balanced: pickBest(list, scoreBalanced),
  };
}

module.exports = {
  DEFAULT_BALANCED_WEIGHTS,
  planFeatures,
  scoreCheapest,
  scoreFastest,
  scoreBalanced,
  pickMainCards,
};
