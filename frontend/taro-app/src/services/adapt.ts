import { PLAN_TYPE_LABELS, DISCLAIMER } from '@dongxing/shared';
import { config } from './config';
import { searchPlansRemote } from './api';

import xz from '../data/plans-xuzhou-lhasa.json';
import sh from '../data/plans-shanghai-chengdu.json';
import bj from '../data/plans-beijing-wuhan.json';
import cd from '../data/plans-chengdu-chongqing.json';

const MOCK: Record<string, unknown> = {
  '徐州|拉萨': xz,
  '上海|成都': sh,
  '北京|武汉': bj,
  '成都|重庆': cd
};

const TYPE_ORDER = ['cheap', 'fast', 'balanced'] as const;
export const TAG_TYPE: Record<string, string> = {
  cheap: 'success',
  fast: 'danger',
  balanced: 'primary'
};

export type UiPlan = {
  id: string;
  type: string;
  typeLabel: string;
  tagType: string;
  price: string;
  priceNote: string;
  duration: string;
  transfers: number;
  routeOneLine: string;
  vsDirect: string;
  why: string;
  whyDetail: string;
  playHint: string | null;
  pathNote: string | null;
  timeline: UiTimelineItem[];
  play: UiPlay[];
  buyLegs: UiBuyLeg[];
  hasTransfer: boolean;
  hasFlight: boolean;
};

export type UiTimelineItem = {
  kind: string;
  isXfer: boolean;
  city?: string;
  xferLabel?: string;
  buffer?: string;
  tip?: string;
  mode?: string;
  modeLabel?: string;
  isFlight?: boolean;
  from?: string;
  to?: string;
  serviceRef?: string;
  duration?: string;
  timeRange?: string;
  seatHint?: string;
  price?: string;
};

export type UiPlay = {
  hubCity: string;
  name: string;
  distText: string;
  suggestText: string;
  ok: string;
};

export type UiBuyLeg = {
  name: string;
  sub: string;
  mode: string;
};

function plansKeyForOd(fromCity: string, toCity: string) {
  return `${String(fromCity || '').trim()}|${String(toCity || '').trim()}`;
}

function getRawForOd(fromCity: string, toCity: string) {
  const key = plansKeyForOd(fromCity, toCity);
  if (MOCK[key]) return MOCK[key];
  if (fromCity && toCity) return null;
  return MOCK['徐州|拉萨'];
}

function formatClock(iso?: string) {
  if (!iso || typeof iso !== 'string') return '';
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

function adaptTimelineItem(seg: any): UiTimelineItem | null {
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
    mode,
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

function adaptPlay(play: any): UiPlay[] {
  if (!Array.isArray(play)) return [];
  return play.map((p) => ({
    hubCity: p.hub_city || p.hubCity || '',
    name: p.name || '',
    distText: p.dist_text || p.distText || p.dist || '',
    suggestText: p.suggest_text || p.suggestText || p.suggest || '',
    ok: p.ok || p.back_ok_note || ''
  }));
}

function adaptBuyLegs(legs: any): UiBuyLeg[] {
  if (!Array.isArray(legs)) return [];
  return legs.map((leg) => ({
    name: leg.name || '',
    sub: leg.sub || '',
    mode: leg.mode || 'train'
  }));
}

function hasFlight(timeline: UiTimelineItem[]) {
  return (timeline || []).some((s) => s && !s.isXfer && (s.isFlight || s.mode === 'flight'));
}

export function adaptPlan(plan: any): UiPlan | null {
  if (!plan) return null;
  const type = plan.type || 'balanced';
  const timeline = Array.isArray(plan.timeline)
    ? plan.timeline.map(adaptTimelineItem).filter(Boolean)
    : [];
  const transfers = plan.transfers != null ? plan.transfers : 0;
  return {
    id: plan.id,
    type,
    typeLabel: plan.type_label || plan.typeLabel || PLAN_TYPE_LABELS[type as keyof typeof PLAN_TYPE_LABELS] || '',
    tagType: TAG_TYPE[type] || 'primary',
    price: plan.price_display || plan.price || '',
    priceNote: plan.price_note || plan.priceNote || '参考价',
    duration: plan.duration_display || plan.duration || '',
    transfers,
    routeOneLine: plan.route_one_line || plan.routeOneLine || '',
    vsDirect: plan.vs_direct || plan.vsDirect || '',
    why: plan.why || '',
    whyDetail: plan.why_detail || plan.whyDetail || plan.why || '',
    playHint: plan.play_hint != null ? plan.play_hint : plan.playHint != null ? plan.playHint : null,
    pathNote: plan.path_note != null ? plan.path_note : plan.pathNote != null ? plan.pathNote : null,
    timeline: timeline as UiTimelineItem[],
    play: adaptPlay(plan.play),
    buyLegs: adaptBuyLegs(plan.buy_legs || plan.buyLegs),
    hasTransfer: transfers > 0,
    hasFlight: hasFlight(timeline as UiTimelineItem[])
  };
}

function sortMain(main: UiPlan[]) {
  const list = main.slice();
  list.sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a.type as any);
    const ib = TYPE_ORDER.indexOf(b.type as any);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return list;
}

export function adaptResponse(raw: any, scenarioKey?: string) {
  if (!raw) return { ok: false, main: [] as UiPlan[], error: 'empty' };
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
      .filter(Boolean) as UiPlan[]
  );
  return {
    ok: response.ok !== false,
    main,
    error: response.error || null
  };
}

function loadLocalAdaptedPlans(fromCity: string, toCity: string, scenarioKey?: string) {
  const raw = getRawForOd(fromCity, toCity);
  if (!raw) {
    return Promise.resolve({ ok: true, main: [] as UiPlan[], error: null, source: 'empty' });
  }
  const adapted: any = adaptResponse(raw, scenarioKey);
  adapted.source = 'local';
  return Promise.resolve(adapted);
}

export function loadAdaptedPlans(
  fromCity: string,
  toCity: string,
  opts: {
    vias?: string[];
    dateFlexible?: boolean;
    date?: string;
    scenarioKey?: string;
    preferLocal?: boolean;
  } = {}
) {
  const scenarioKey = opts.scenarioKey;
  const vias = Array.isArray(opts.vias) ? opts.vias : [];

  if (opts.preferLocal || !config.useRemoteApi) {
    return loadLocalAdaptedPlans(fromCity, toCity, scenarioKey);
  }

  return searchPlansRemote({
    fromCity,
    toCity,
    vias,
    dateFlexible: opts.dateFlexible,
    date: opts.date
  })
    .then((body) => {
      const adapted: any = adaptResponse(body, scenarioKey);
      adapted.source = 'api';
      return adapted;
    })
    .catch(() =>
      loadLocalAdaptedPlans(fromCity, toCity, scenarioKey).then((adapted: any) => {
        adapted.source = adapted.source || 'local';
        adapted.fallback = true;
        return adapted;
      })
    );
}

export function findPlan(fromCity: string, toCity: string, planId: string) {
  const raw = getRawForOd(fromCity, toCity);
  if (!raw) return null;
  const adapted = adaptResponse(raw);
  return (adapted.main || []).find((p) => p.id === planId) || null;
}

export { DISCLAIMER, PLAN_TYPE_LABELS };
