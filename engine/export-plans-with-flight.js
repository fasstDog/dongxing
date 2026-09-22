'use strict';
/**
 * Re-export mock plans for frontend OD switch, with flight in 「最快」.
 * Usage: node engine/export-plans-with-flight.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { configure, clearCache } = require('./adapters');
const train = require('./adapters/train.mock');
const { searchPlans } = require('./pipeline');

function moneyDelta(pd) {
  if (pd == null) return null;
  const n = Math.abs(pd);
  if (n < 40) return '参考价差不多';
  return pd < 0 ? `参考价大概省 ${n} 块` : `参考价大概贵 ${n} 块`;
}
function timeDelta(dd) {
  if (dd == null) return null;
  const h = Math.abs(Math.round(dd / 60));
  if (h < 1) return '时长差不多';
  return dd < 0 ? `能少耗大约 ${h} 小时` : `多花大约 ${h} 小时`;
}

function humanWhy(slot, plan, direct) {
  const hubs = (plan.transfers || []).map((t) => t.hub_city || t.city).filter(Boolean);
  const hasFlight = (plan.legs || []).some((l) => l.mode === 'flight');
  const play =
    (plan.play && plan.play[0]) ||
    (plan.transfers || []).map((t) => t.transfer_play).find(Boolean);
  const pd = direct ? plan.price_ref_cny - direct.price_ref_cny : null;
  const dd = direct ? plan.duration_min - direct.duration_min : null;
  const vsParts = [moneyDelta(pd), timeDelta(dd)].filter(Boolean);
  const vs = vsParts.length ? vsParts.join('，') : '和直达比，还得看当天票价';

  const dest = (plan.legs && plan.legs.length)
    ? plan.legs[plan.legs.length - 1].to_city
    : '';
  let why;
  if (hubs.length === 0) {
    if (hasFlight) {
      why = dest
        ? `直飞${dest}，一趟飞机到，少折腾。参考价以航司/OTA为准。`
        : '直飞，一趟飞机到，少折腾。参考价以航司/OTA为准。';
    } else if (slot === 'cheap') {
      why = '直达方案，票价通常好算，适合想少折腾的人。';
    } else {
      why = '直达走法，少换乘。';
    }
  } else if (hasFlight) {
    // 产品口径：点明「高铁到枢纽再飞」
    why = `先高铁到${hubs.join('、')}，再飞${dest || '目的地'}。比全程火车贵，但通常能少耗大半天到一天。`;
  } else if (slot === 'fast') {
    why = `经 ${hubs.join('、')} 的高铁组合，门到门更短。`;
  } else if (play) {
    why = `经 ${hubs.join('、')} 拆段。多一趟换乘，窗口够的话能顺路逛逛。`;
  } else {
    why = `经 ${hubs.join('、')} 拆段。综合看价格和时长。`;
  }

  let detail = why;
  if (!hasFlight || hubs.length) {
    // 直飞 why 已含参考价提示；其余补 vs + 免责
    if (!(hasFlight && hubs.length === 0)) {
      detail = `${why} ${vs}。价格、时刻都是参考，以购票平台为准。`;
    } else {
      detail = `${why} ${vs}。`;
    }
  } else {
    detail = `${why} ${vs}。`;
  }
  if (play) {
    detail += ` ${play.hub_city || hubs[0] || ''}空窗够长，下面写了怎么玩；不够长不会硬推景点。`;
  } else if (hubs.length && !hasFlight) {
    detail += ' 换乘以接驳为主，窗口不够长不会硬推景点。';
  }
  return { why, why_detail: detail, vs_direct: vs };
}

function toTimeline(plan) {
  const items = [];
  const legs = plan.legs || [];
  const xfers = plan.transfers || [];
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    const modeLabel =
      l.mode === 'flight'
        ? '飞机'
        : String(l.service_ref || '').startsWith('G') || (l.seat_hint || '').includes('二等')
          ? '高铁'
          : '火车';
    items.push({
      kind: 'leg',
      mode: l.mode,
      mode_label: modeLabel,
      from_station: l.from_station,
      to_station: l.to_station,
      dep_at: l.dep_at,
      arr_at: l.arr_at,
      duration_min: l.duration_min,
      duration_display: `约 ${Math.round(l.duration_min / 60)} 小时`,
      seat_hint: l.seat_hint,
      price_ref_cny: l.price_ref_cny,
      price_display: `约 ¥${l.price_ref_cny}`,
      service_ref: l.service_ref,
      leg_id: l.id || null,
      comfort: l.comfort || null,
    });
    if (i < xfers.length) {
      const x = xfers[i];
      const same = x.kind === 'same_station' || x.kind === '同站换乘';
      items.push({
        kind: 'xfer',
        city: x.hub_city || x.city,
        xfer_kind: same ? 'same_station' : 'same_city',
        xfer_kind_label: same ? '同站换乘' : '同城换乘',
        buffer_min: x.buffer_min,
        buffer_display: x.buffer_text || `约 ${x.buffer_min} 分钟`,
        tip: x.tip || '预留接驳时间',
      });
    }
  }
  return items;
}

function toCard(slot, plan, direct, idPrefix) {
  if (!plan) return null;
  const map = { cheap: ['cheap', '最省钱'], fast: ['fast', '最快'], balanced: ['balanced', '最综合'] };
  const [type, type_label] = map[slot];
  const w = humanWhy(slot, plan, direct);
  const legs = plan.legs || [];
  const play = plan.play;
  const pmin = legs.reduce((s, l) => s + (l.price_min_cny != null ? l.price_min_cny : l.price_ref_cny), 0);
  const pmax = legs.reduce((s, l) => s + (l.price_max_cny != null ? l.price_max_cny : l.price_ref_cny), 0);
  return {
    id: `${idPrefix}-${type}`,
    type,
    type_label,
    price_ref_cny: plan.price_ref_cny,
    price_display: pmin !== pmax ? `¥${pmin}–${pmax}` : `¥${plan.price_ref_cny}`,
    price_note: '参考价',
    duration_min: plan.duration_min,
    duration_display: `约 ${Math.round(plan.duration_min / 60)} 小时`,
    transfers: Math.max(0, legs.length - 1),
    route_one_line: (plan.summary && plan.summary.route_text) || plan.label,
    vs_direct: w.vs_direct,
    why: w.why,
    why_detail: w.why_detail,
    play_hint: plan.play_hint || null,
    path_note: plan.path_note || null,
    timeline: toTimeline(plan),
    play: play
      ? play.map((p) => ({
          hub_city: p.hub_city,
          name: p.name,
          dist_text: p.dist_text,
          suggest_text: p.suggest_text,
          ok: p.back_ok_note,
          min_buffer_hours: p.min_buffer_hours,
        }))
      : null,
    buy_legs: legs.map((l) => ({
      name: `${l.from_city} → ${l.to_city}`,
      sub: `跳转 ${l.mode === 'flight' ? '航司 / OTA' : '12306 / 铁路 OTA'} · 约 ¥${l.price_ref_cny}`,
      mode: l.mode,
      deep_link_hint: null,
    })),
  };
}

function pack(name, request, result, idPrefix) {
  const mainObj = result.main || {};
  const cheapP = mainObj.cheapest;
  const fastP = mainObj.fastest;
  const balP = mainObj.balanced;
  const direct = (result.more || []).find((p) => (p.legs || []).length === 1) || cheapP;
  const main = ['cheap', 'fast', 'balanced']
    .map((slot) => toCard(slot, slot === 'cheap' ? cheapP : slot === 'fast' ? fastP : balP, direct, idPrefix))
    .filter(Boolean);
  const used = new Set(main.map((m) => (m.timeline || []).filter((t) => t.kind === 'leg').map((t) => t.leg_id).join('|')));
  const more = (result.more || [])
    .filter((p) => !used.has((p.legs || []).map((l) => l.id).join('|')))
    .slice(0, 5)
    .map((p, i) => ({
      id: `${idPrefix}-more-${i + 1}`,
      type_label: '其它组合',
      title: (p.summary && p.summary.route_text) || p.label,
      sub: (p.path_note || '') + ` · 约 ¥${p.price_ref_cny}`,
      price_display: `¥${p.price_ref_cny}`,
      plan_id: p.id,
    }));
  return {
    request,
    response: {
      ok: !!result.ok,
      error: result.ok ? null : { code: 'NO_FEASIBLE', message: result.reason || '无方案' },
      meta: {
        request,
        path_mode: request.path_mode || 'auto',
        data_source: 'mock',
        as_of: (cheapP && cheapP.legs && cheapP.legs[0] && cheapP.legs[0].as_of) || null,
        disclaimer: '价格、时刻均为参考，以购票平台为准',
        generated_by: 'engine/export-plans-with-flight.js',
        no_realtime_inventory: true,
        adapters: 'train.mock+flight.mock',
      },
      direct_baseline: direct
        ? {
            price_ref_cny: direct.price_ref_cny,
            duration_min: direct.duration_min,
            summary: (direct.summary && direct.summary.route_text) || '直达',
            leg_id: (direct.legs && direct.legs[0] && direct.legs[0].id) || null,
          }
        : null,
      path: {
        cities: [request.from_city, request.to_city],
        hubs: (balP && balP.transfers ? balP.transfers.map((t) => t.hub_city || t.city) : []) || [],
        note: (balP && balP.path_note) || null,
      },
      main,
      more,
    },
  };
}

async function exportOd(cfg) {
  clearCache();
  train.configure({ legsPath: path.join(ROOT, cfg.legsFile) });
  // flight.mock already merges both OD files by default
  const auto = await searchPlans({
    from: cfg.from,
    to: cfg.to,
    date: cfg.date,
    vias: [],
  });
  const via = cfg.viaCity
    ? await searchPlans({ from: cfg.from, to: cfg.to, date: cfg.date, vias: [cfg.viaCity] })
    : null;

  const autoReq = {
    from_city: cfg.from,
    to_city: cfg.to,
    date_flexible: true,
    date: cfg.date,
    vias: [],
    path_mode: 'auto',
  };
  const autoSc = pack('auto', autoReq, auto, cfg.idPrefix);
  const scenarios = { auto: autoSc };
  if (via && cfg.viaKey) {
    scenarios[cfg.viaKey] = pack(
      cfg.viaKey,
      {
        from_city: cfg.from,
        to_city: cfg.to,
        date_flexible: true,
        date: cfg.date,
        vias: [cfg.viaCity],
        path_mode: 'user',
      },
      via,
      cfg.idPrefix + '-via'
    );
  }

  const out = {
    meta: {
      od: { from_city: cfg.from, to_city: cfg.to },
      note: 'pipeline + train/flight mock；最快含空铁/直飞；无实时余票',
      legs_source: path.basename(cfg.legsFile),
      pois_source: 'hub-pois.json',
    },
    scenarios,
    request: autoReq,
    response: autoSc.response,
  };

  const mockPath = path.join(ROOT, cfg.outMock);
  const rootPath = path.join(ROOT, cfg.outRoot);
  fs.writeFileSync(mockPath, JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(rootPath, JSON.stringify(out, null, 2) + '\n');

  const fast = out.response.main.find((p) => p.type === 'fast');
  const modes = (fast.timeline || []).filter((t) => t.kind === 'leg').map((t) => t.mode);
  console.log(cfg.name, {
    ok: out.response.ok,
    fast_route: fast.route_one_line,
    fast_modes: modes.join('+'),
    has_flight: modes.includes('flight'),
    cards: out.response.main.map((p) => p.type + ':' + p.route_one_line.slice(0, 24)),
  });
  if (!modes.includes('flight')) {
    console.error('FAIL: fastest missing flight for', cfg.name);
    process.exitCode = 1;
  }
}

(async () => {
  await exportOd({
    name: '徐州→拉萨',
    from: '徐州',
    to: '拉萨',
    date: '2026-10-01',
    viaCity: '西宁',
    viaKey: 'user_via_xining',
    legsFile: 'data/mock/legs-xuzhou-lhasa.json',
    outMock: 'data/mock/plans-xuzhou-lhasa.json',
    outRoot: 'data/plans-xuzhou-lhasa.json',
    idPrefix: 'xz-lxa',
  });
  await exportOd({
    name: '上海→成都',
    from: '上海',
    to: '成都',
    date: '2026-10-01',
    viaCity: '武汉',
    viaKey: 'user_via_wuhan',
    legsFile: 'data/mock/legs-shanghai-chengdu.json',
    outMock: 'data/mock/plans-shanghai-chengdu.json',
    outRoot: 'data/plans-shanghai-chengdu.json',
    idPrefix: 'sha-ctu',
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
