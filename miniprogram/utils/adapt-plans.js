/**
 * Thin mapper: snake_case API / scenarios JSON → UI camelCase (三主卡).
 * Mirrors js/app.js adaptPlan / adaptResponse (cards-only).
 */

const MOCK = {
  '徐州|拉萨': require('../data/plans-xuzhou-lhasa.json'),
  '上海|成都': require('../data/plans-shanghai-chengdu.json')
};
const MOCK_DEFAULT = MOCK['徐州|拉萨'];

const TYPE_ORDER = ['cheap', 'fast', 'balanced'];

const TAG_TYPE = {
  cheap: 'success',
  fast: 'danger',
  balanced: 'primary'
};

function plansKeyForOd(fromCity, toCity) {
  return String(fromCity || '').trim() + '|' + String(toCity || '').trim();
}

function getRawForOd(fromCity, toCity) {
  const key = plansKeyForOd(fromCity, toCity);
  return MOCK[key] || MOCK_DEFAULT;
}

function adaptPlan(plan) {
  if (!plan) return null;
  const type = plan.type || 'balanced';
  return {
    id: plan.id,
    type: type,
    typeLabel: plan.type_label || plan.typeLabel || '',
    tagType: TAG_TYPE[type] || 'primary',
    price: plan.price_display || plan.price || '',
    priceNote: plan.price_note || plan.priceNote || '参考价',
    duration: plan.duration_display || plan.duration || '',
    transfers: plan.transfers != null ? plan.transfers : 0,
    routeOneLine: plan.route_one_line || plan.routeOneLine || '',
    vsDirect: plan.vs_direct || plan.vsDirect || '',
    why: plan.why || '',
    playHint:
      plan.play_hint != null
        ? plan.play_hint
        : plan.playHint != null
          ? plan.playHint
          : null,
    pathNote:
      plan.path_note != null
        ? plan.path_note
        : plan.pathNote != null
          ? plan.pathNote
          : null
  };
}

function sortMain(main) {
  const list = Array.isArray(main) ? main.slice() : [];
  list.sort(function (a, b) {
    const ia = TYPE_ORDER.indexOf(a.type);
    const ib = TYPE_ORDER.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return list;
}

function adaptResponse(raw, scenarioKey) {
  if (!raw) {
    return { ok: false, main: [], error: 'empty' };
  }
  let response = raw;
  if (raw.scenarios) {
    const key = scenarioKey || 'auto';
    const sc = raw.scenarios[key] || raw.scenarios.auto;
    response = (sc && sc.response) || raw.response || {};
  } else if (raw.response) {
    response = raw.response;
  }
  const ok = response.ok !== false;
  const main = sortMain(
    (Array.isArray(response.main) ? response.main : [])
      .map(adaptPlan)
      .filter(Boolean)
  );
  return {
    ok: ok,
    main: main,
    error: response.error || null
  };
}

function loadAdaptedPlans(fromCity, toCity, scenarioKey) {
  const raw = getRawForOd(fromCity, toCity);
  return Promise.resolve(adaptResponse(raw, scenarioKey));
}

module.exports = {
  TAG_TYPE: TAG_TYPE,
  plansKeyForOd: plansKeyForOd,
  getRawForOd: getRawForOd,
  adaptPlan: adaptPlan,
  adaptResponse: adaptResponse,
  loadAdaptedPlans: loadAdaptedPlans
};
