'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);
const trainMock = require('./adapters/train.mock.js');
const { searchPlans } = require('./pipeline.js');

trainMock.configure({
  legsPath: path.join(ROOT, 'data/mock/legs-shanghai-chengdu.json'),
});
trainMock.clearCache();

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
  const play = (plan.play && plan.play[0]) || (plan.transfers || []).map((t) => t.transfer_play).find(Boolean);
  const pd = direct ? plan.price_ref_cny - direct.price_ref_cny : null;
  const dd = direct ? plan.duration_min - direct.duration_min : null;
  const vsParts = [moneyDelta(pd), timeDelta(dd)].filter(Boolean);
  const vs = vsParts.length ? vsParts.join('，') : '和直达比，还得看当天票价';

  let why;
  if (hubs.length === 0) {
    why = slot === 'cheap'
      ? '直达高铁，票价通常好算，适合想少折腾的人。'
      : '直达走法，少换乘。';
  } else if (slot === 'fast' && hasFlight) {
    why = hubs.length
      ? `经 ${hubs.join('、')} 接飞机。比全程火车贵，但往往能少耗不少时间。`
      : '飞机直达，门到门通常最快，票价浮动大。';
  } else if (slot === 'fast') {
    why = hubs.length
      ? `经 ${hubs.join('、')} 的高铁组合，门到门更短。`
      : '耗时更短的高铁走法。';
  } else if (hubs.length) {
    why = play
      ? `经 ${hubs.join('、')} 拆段。多一趟换乘，窗口够的话能顺路逛逛。`
      : `经 ${hubs.join('、')} 拆段。综合看价格和时长。`;
  } else {
    why = `经 ${hubs.join('、')} 拆段。综合看价格和时长。`;
  }

  let detail = `${why}${vs ? ' ' + vs + '。' : ' '}价格、时刻都是参考，以购票平台为准。`;
  if (play) {
    detail += ` ${play.hub_city || hubs[0] || ''}空窗够长，下面写了怎么玩；不够长不会硬推景点。`;
  } else if (hubs.length) {
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
      items.push({
        kind: 'xfer',
        city: x.hub_city || x.city,
        xfer_kind: x.kind === 'same_station' || x.kind === '同站换乘' ? 'same_station' : 'same_city',
        xfer_kind_label: x.kind === 'same_station' ? '同站换乘' : (x.kind === 'same_city' ? '同城换乘' : (x.kind || '同城换乘')),
        buffer_min: x.buffer_min,
        buffer_display: x.buffer_text || `约 ${x.buffer_min} 分钟`,
        tip: x.tip || '预留接驳时间',
      });
    }
  }
  return items;
}

function toCard(slot, plan, direct) {
  if (!plan) return null;
  const map = { cheap: ['cheap', '最省钱'], fast: ['fast', '最快'], balanced: ['balanced', '最综合'] };
  const [type, type_label] = map[slot];
  const w = humanWhy(slot, plan, direct);
  const legs = plan.legs || [];
  const play = plan.play;
  const pmin = legs.reduce((s, l) => s + (l.price_min_cny != null ? l.price_min_cny : l.price_ref_cny), 0);
  const pmax = legs.reduce((s, l) => s + (l.price_max_cny != null ? l.price_max_cny : l.price_ref_cny), 0);
  return {
    id: `sha-ctu-${type}`,
    type,
    type_label,
    price_ref_cny: plan.price_ref_cny,
    price_display: pmin !== pmax ? `¥${pmin}–${pmax}` : `¥${plan.price_ref_cny}`,
    price_note: '参考价',
    duration_min: plan.duration_min,
    duration_display: plan.summary && plan.summary.duration_text
      ? plan.summary.duration_text
      : `约 ${Math.round(plan.duration_min / 60)} 小时`,
    transfers: Math.max(0, legs.length - 1),
    route_one_line: (plan.summary && plan.summary.route_text) || plan.label,
    vs_direct: w.vs_direct,
    why: w.why,
    why_detail: w.why_detail,
    why_facts: {
      hubs: (plan.transfers || []).map((t) => t.hub_city || t.city).filter(Boolean),
      user_via: false,
      price_ref_cny: plan.price_ref_cny,
      direct_price_ref_cny: direct ? direct.price_ref_cny : null,
      price_delta_cny: direct ? plan.price_ref_cny - direct.price_ref_cny : null,
      duration_min: plan.duration_min,
      direct_duration_min: direct ? direct.duration_min : null,
      duration_delta_min: direct ? plan.duration_min - direct.duration_min : null,
      transfers: Math.max(0, legs.length - 1),
      comfort_score: null,
      playable: !!(play && play.length),
      notes: legs.some((l) => l.mode === 'flight') ? ['空铁混搭'] : [],
    },
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

function packScenario(name, request, result) {
  const mainObj = result.main || {};
  // pickMainCards returns cheapest/fastest/balanced
  const cheapP = mainObj.cheapest || mainObj.cheap;
  const fastP = mainObj.fastest || mainObj.fast;
  const balP = mainObj.balanced;
  const direct =
    (result.more || []).find((p) => (p.legs || []).length === 1) ||
    cheapP;
  const main = ['cheap', 'fast', 'balanced']
    .map((slot) => {
      const src = slot === 'cheap' ? cheapP : slot === 'fast' ? fastP : balP;
      return toCard(slot, src, direct);
    })
    .filter(Boolean);
  const more = (result.more || [])
    .filter((p) => {
      const ids = new Set(main.map((m) => (m.timeline || []).filter((t) => t.kind === 'leg').map((t) => t.leg_id).join('|')));
      const key = (p.legs || []).map((l) => l.id).join('|');
      return !ids.has(key);
    })
    .slice(0, 5)
    .map((p, i) => ({
      id: `sha-ctu-more-${i + 1}`,
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
        generated_by: 'engine/pipeline.js + human why templates',
        no_realtime_inventory: true,
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
        cities: ['上海', '成都'],
        hubs: (balP && balP.transfers ? balP.transfers.map((t) => t.hub_city) : []) || [],
        note: (balP && balP.path_note) || null,
      },
      main,
      more,
    },
  };
}

(async () => {
  const autoReq = {
    from_city: '上海',
    to_city: '成都',
    date_flexible: true,
    date: '2026-10-01',
    vias: [],
    path_mode: 'auto',
  };
  const viaReq = {
    from_city: '上海',
    to_city: '成都',
    date_flexible: true,
    date: '2026-10-01',
    vias: ['武汉'],
    path_mode: 'user',
  };
  const auto = await searchPlans({ from: '上海', to: '成都', date: '2026-10-01', vias: [] });
  const via = await searchPlans({ from: '上海', to: '成都', date: '2026-10-01', vias: ['武汉'] });
  console.log('auto ok', auto.ok, 'more', (auto.more || []).length, 'main', Object.keys(auto.main || {}));
  console.log(
    'auto cards',
    ['cheapest', 'fastest', 'balanced'].map((k) => {
      const p = auto.main[k];
      return p && {
        k,
        price: p.price_ref_cny,
        dur: p.duration_min,
        route: p.summary && p.summary.route_text,
        play: p.play_hint,
      };
    })
  );
  console.log('via ok', via.ok, 'more', (via.more || []).length);

  const autoSc = packScenario('auto', autoReq, auto);
  const viaSc = packScenario('user_via_wuhan', viaReq, via);
  const out = {
    meta: {
      od: { from_city: '上海', to_city: '成都' },
      note: '由 pipeline 程序生成；无实时余票；为什么文案为口语模板',
      legs_source: 'legs-shanghai-chengdu.json',
      pois_source: 'hub-pois.json',
      api: 'docs/api-plans-contract.md',
    },
    scenarios: {
      auto: autoSc,
      user_via_wuhan: viaSc,
    },
    request: autoReq,
    response: autoSc.response,
  };
  const dest = path.join(ROOT, 'data/mock/plans-shanghai-chengdu.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  // also FE root copy in mock-plan-response style optional — frontend asked for plans-shanghai-chengdu.json
  const feDest = path.join(ROOT, 'data/plans-shanghai-chengdu.json');
  // minimal FE: reuse auto response.main mapped? Front said they'll switch OD file — same mock shape as xuzhou
  fs.writeFileSync(feDest, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', dest, feDest);
  console.log(
    'whys',
    out.response.main.map((p) => p.type + ': ' + p.why)
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
