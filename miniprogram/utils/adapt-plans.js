/**
 * snake_case API / scenarios JSON → UI camelCase（三主卡 + 详情）
 */
const MOCK = {
  '徐州|拉萨': require('../data/plans-xuzhou-lhasa.json'),
  '上海|成都': require('../data/plans-shanghai-chengdu.json'),
  '北京|武汉': require('../data/plans-beijing-wuhan.json'),
  '成都|重庆': require('../data/plans-chengdu-chongqing.json')
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
  if (MOCK[key]) return MOCK[key];
  // 未覆盖 OD：返回 null，结果页走空态（不误用默认徐拉）
  if (fromCity && toCity) return null;
  return MOCK_DEFAULT;
}

function formatClock(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5];
}

function adaptTimelineItem(seg) {
  if (!seg) return null;
  const kind = seg.kind || 'leg';
  if (kind === 'xfer' || kind === 'transfer' || seg.xfer_kind || seg.xfer) {
    return {
      kind: 'xfer',
      isXfer: true,
      city: seg.city || '',
      xferLabel: seg.xfer_kind_label || seg.xferKindLabel || '换乘',
      buffer: seg.buffer_display || seg.bufferDisplay || '',
      tip: seg.tip || '留足接驳时间，就在站里歇会儿'
    };
  }
  const mode = seg.mode || 'train';
  return {
    kind: 'leg',
    isXfer: false,
    mode: mode,
    modeLabel: seg.mode_label || seg.modeLabel || (mode === 'flight' ? '飞机' : '火车'),
    isFlight: mode === 'flight',
    from: seg.from_station || seg.from || '',
    to: seg.to_station || seg.to || '',
    serviceRef: seg.service_ref || seg.serviceRef || '',
    duration: seg.duration_display || seg.durationDisplay || '',
    timeRange: [formatClock(seg.dep_at || seg.depAt), formatClock(seg.arr_at || seg.arrAt)]
      .filter(Boolean)
      .join(' → '),
    seatHint: seg.seat_hint || seg.seatHint || '',
    price: seg.price_display || seg.priceDisplay || ''
  };
}

function adaptPlay(play) {
  if (!Array.isArray(play)) return [];
  return play.map(function (p) {
    return {
      hubCity: p.hub_city || p.hubCity || '',
      name: p.name || '',
      distText: p.dist_text || p.distText || p.dist || '',
      suggestText: p.suggest_text || p.suggestText || p.suggest || '',
      ok: p.ok || p.back_ok_note || ''
    };
  });
}

function adaptBuyLegs(legs) {
  if (!Array.isArray(legs)) return [];
  return legs.map(function (leg) {
    return {
      name: leg.name || '',
      sub: leg.sub || '',
      mode: leg.mode || 'train'
    };
  });
}

function hasFlight(timeline) {
  return (timeline || []).some(function (s) {
    return s && !s.isXfer && (s.isFlight || s.mode === 'flight');
  });
}

function adaptPlan(plan) {
  if (!plan) return null;
  const type = plan.type || 'balanced';
  const timeline = Array.isArray(plan.timeline)
    ? plan.timeline.map(adaptTimelineItem).filter(Boolean)
    : [];
  const transfers = plan.transfers != null ? plan.transfers : 0;
  return {
    id: plan.id,
    type: type,
    typeLabel: plan.type_label || plan.typeLabel || '',
    tagType: TAG_TYPE[type] || 'primary',
    price: plan.price_display || plan.price || '',
    priceNote: plan.price_note || plan.priceNote || '参考价',
    duration: plan.duration_display || plan.duration || '',
    transfers: transfers,
    routeOneLine: plan.route_one_line || plan.routeOneLine || '',
    vsDirect: plan.vs_direct || plan.vsDirect || '',
    why: plan.why || '',
    whyDetail: plan.why_detail || plan.whyDetail || plan.why || '',
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
          : null,
    timeline: timeline,
    play: adaptPlay(plan.play),
    buyLegs: adaptBuyLegs(plan.buy_legs || plan.buyLegs),
    hasTransfer: transfers > 0,
    hasFlight: hasFlight(timeline)
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
  if (!raw) return { ok: false, main: [], error: 'empty' };
  let response = raw;
  if (raw.scenarios) {
    const key = scenarioKey || 'auto';
    const sc = raw.scenarios[key] || raw.scenarios.auto;
    response = (sc && sc.response) || raw.response || {};
  } else if (raw.response) {
    response = raw.response;
  }
  const main = sortMain(
    (Array.isArray(response.main) ? response.main : [])
      .map(adaptPlan)
      .filter(Boolean)
  );
  return {
    ok: response.ok !== false,
    main: main,
    error: response.error || null
  };
}

function loadAdaptedPlans(fromCity, toCity, scenarioKey) {
  const raw = getRawForOd(fromCity, toCity);
  if (!raw) {
    return Promise.resolve({ ok: true, main: [], error: null });
  }
  return Promise.resolve(adaptResponse(raw, scenarioKey));
}

function findPlan(fromCity, toCity, planId) {
  const raw = getRawForOd(fromCity, toCity);
  if (!raw) return null;
  const adapted = adaptResponse(raw);
  const list = adapted.main || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === planId) return list[i];
  }
  return null;
}

function findAdaptedPlan(fromCity, toCity, planId) {
  return Promise.resolve(findPlan(fromCity, toCity, planId));
}

module.exports = {
  TAG_TYPE: TAG_TYPE,
  MOCK_KEYS: Object.keys(MOCK),
  plansKeyForOd: plansKeyForOd,
  getRawForOd: getRawForOd,
  adaptPlan: adaptPlan,
  adaptResponse: adaptResponse,
  loadAdaptedPlans: loadAdaptedPlans,
  findPlan: findPlan,
  findAdaptedPlan: findAdaptedPlan
};
