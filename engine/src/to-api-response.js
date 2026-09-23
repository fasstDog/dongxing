'use strict';

/**
 * pipeline.searchPlans 结果 → api-plans-contract PlansSearchResponse
 * cheapest|fastest|balanced → cheap|fast|balanced + timeline
 */

function moneyDelta(pd) {
  if (pd == null) return null;
  const n = Math.abs(pd);
  if (n < 40) return '参考价差不多';
  return pd < 0 ? '参考价大概省 ' + n + ' 块' : '参考价大概贵 ' + n + ' 块';
}

function timeDelta(dd) {
  if (dd == null) return null;
  const h = Math.abs(Math.round(dd / 60));
  if (h < 1) return '时长差不多';
  return dd < 0 ? '能少耗大约 ' + h + ' 小时' : '多花大约 ' + h + ' 小时';
}

function humanWhy(slot, plan, direct) {
  const hubs = (plan.transfers || []).map((t) => t.hub_city || t.city).filter(Boolean);
  const legs = plan.legs || [];
  const hasFlight = legs.some((l) => l.mode === 'flight');
  const play =
    (plan.play && plan.play[0]) ||
    (plan.transfers || []).map((t) => t.transfer_play).find(Boolean);
  const pd = direct ? plan.price_ref_cny - direct.price_ref_cny : null;
  const dd = direct ? plan.duration_min - direct.duration_min : null;
  const vsParts = [moneyDelta(pd), timeDelta(dd)].filter(Boolean);
  const vs = vsParts.length ? vsParts.join('，') : '和直达比，还得看当天票价';
  const from = legs.length ? legs[0].from_city : '';
  const dest = legs.length ? legs[legs.length - 1].to_city : '';
  let why;
  if (hubs.length === 0) {
    if (hasFlight) {
      why =
        from && dest
          ? from + '直飞' + dest + '，一趟飞机到，少折腾。参考价以航司/OTA为准。'
          : '直飞，一趟飞机到，少折腾。参考价以航司/OTA为准。';
    } else if (slot === 'cheap') {
      why =
        Number(plan.duration_min) >= 1200
          ? '直达硬座最便宜，但要坐很久。当「最省钱」对照看就行。'
          : '直达更便宜一档，适合预算优先、能接受慢一点的人。';
    } else {
      why = '直达走法，少换乘。';
    }
  } else if (hasFlight) {
    why =
      '先高铁到' +
      hubs.join('、') +
      '，再飞' +
      (dest || '目的地') +
      '。比全程火车贵，但通常能少耗大半天到一天。';
  } else if (play) {
    why = '经 ' + hubs.join('、') + ' 拆段。多一趟换乘，窗口够的话能顺路逛逛。';
  } else {
    why = '经 ' + hubs.join('、') + ' 拆段。综合看价格和时长。';
  }
  let detail = why + ' ' + vs + '。价格、时刻都是参考，以购票平台为准。';
  if (play) {
    detail +=
      ' ' +
      (play.hub_city || hubs[0] || '') +
      '空窗够长，下面写了怎么玩；不够长不会硬推景点。';
  }
  return { why: why, why_detail: detail, vs_direct: vs };
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
        : String(l.service_ref || '').indexOf('G') === 0 || String(l.seat_hint || '').indexOf('二等') >= 0
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
      duration_display: '约 ' + Math.round(l.duration_min / 60) + ' 小时',
      seat_hint: l.seat_hint,
      price_ref_cny: l.price_ref_cny,
      price_display: '约 ¥' + l.price_ref_cny,
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
        buffer_display: x.buffer_text || '约 ' + x.buffer_min + ' 分钟',
        tip: x.tip || '预留接驳时间',
      });
    }
  }
  return items;
}

function toCard(slot, plan, direct) {
  if (!plan) return null;
  const labels = { cheap: '最省钱', fast: '最快', balanced: '最综合' };
  const w = humanWhy(slot, plan, direct);
  const legs = plan.legs || [];
  const pmin = legs.reduce(
    (s, l) => s + (l.price_min_cny != null ? l.price_min_cny : l.price_ref_cny),
    0
  );
  const pmax = legs.reduce(
    (s, l) => s + (l.price_max_cny != null ? l.price_max_cny : l.price_ref_cny),
    0
  );
  return {
    id: plan.id || 'plan-' + slot,
    type: slot,
    type_label: labels[slot],
    price_ref_cny: plan.price_ref_cny,
    price_display: pmin !== pmax ? '¥' + pmin + '–' + pmax : '¥' + plan.price_ref_cny,
    price_note: '参考价',
    duration_min: plan.duration_min,
    duration_display: '约 ' + Math.round(plan.duration_min / 60) + ' 小时',
    transfers: Math.max(0, legs.length - 1),
    route_one_line: (plan.summary && plan.summary.route_text) || plan.label,
    vs_direct: w.vs_direct,
    why: w.why,
    why_detail: w.why_detail,
    play_hint: plan.play_hint || null,
    path_note: plan.path_note || null,
    timeline: toTimeline(plan),
    play: plan.play
      ? plan.play.map((p) => ({
          hub_city: p.hub_city,
          name: p.name,
          dist_text: p.dist_text,
          suggest_text: p.suggest_text,
          ok: p.back_ok_note,
          min_buffer_hours: p.min_buffer_hours,
        }))
      : null,
    buy_legs: legs.map((l) => ({
      name: l.from_city + ' → ' + l.to_city,
      sub:
        '跳转 ' +
        (l.mode === 'flight' ? '航司 / OTA' : '12306 / 铁路 OTA') +
        ' · 约 ¥' +
        l.price_ref_cny,
      mode: l.mode,
      deep_link_hint: null,
    })),
  };
}

/**
 * @param {object} pipelineResult searchPlans() 返回值
 * @param {object} request 规范化请求
 */
function toPlansSearchResponse(pipelineResult, request) {
  const mainObj = (pipelineResult && pipelineResult.main) || {};
  const cheapP = mainObj.cheapest;
  const fastP = mainObj.fastest;
  const balP = mainObj.balanced;
  const moreRaw = (pipelineResult && pipelineResult.more) || [];
  const direct = moreRaw.find((p) => (p.legs || []).length === 1) || cheapP;
  const main = ['cheap', 'fast', 'balanced']
    .map((slot) =>
      toCard(slot, slot === 'cheap' ? cheapP : slot === 'fast' ? fastP : balP, direct)
    )
    .filter(Boolean);

  const used = new Set(
    main.map((m) =>
      (m.timeline || [])
        .filter((t) => t.kind === 'leg')
        .map((t) => t.leg_id)
        .join('|')
    )
  );
  const more = moreRaw
    .filter((p) => !used.has((p.legs || []).map((l) => l.id).join('|')))
    .slice(0, 8)
    .map((p, i) => ({
      id: 'more-' + (i + 1),
      type_label: '其它组合',
      title: (p.summary && p.summary.route_text) || p.label,
      sub: (p.path_note || '') + ' · 约 ¥' + p.price_ref_cny,
      price_display: '¥' + p.price_ref_cny,
      plan_id: p.id,
    }));

  const ok = !!(pipelineResult && pipelineResult.ok);
  return {
    ok: ok,
    error: ok
      ? null
      : {
          code: 'NO_FEASIBLE',
          message: (pipelineResult && pipelineResult.reason) || '无可行方案',
        },
    meta: {
      request: request,
      path_mode: request.path_mode || (request.vias && request.vias.length ? 'user' : 'auto'),
      data_source: 'mock',
      as_of: cheapP && cheapP.legs && cheapP.legs[0] ? cheapP.legs[0].as_of : null,
      disclaimer: '价格、时刻均为参考，以购票平台为准',
      no_realtime_inventory: true,
      generated_by: 'engine/server.js → pipeline.searchPlans',
    },
    direct_baseline: direct
      ? {
          price_ref_cny: direct.price_ref_cny,
          duration_min: direct.duration_min,
          summary: (direct.summary && direct.summary.route_text) || '直达',
          leg_id: direct.legs && direct.legs[0] ? direct.legs[0].id : null,
        }
      : null,
    path: {
      cities: [request.from_city, request.to_city].filter(Boolean),
      hubs: balP && balP.transfers ? balP.transfers.map((t) => t.hub_city || t.city).filter(Boolean) : [],
      note: balP ? balP.path_note : null,
    },
    main: main,
    more: more,
  };
}

module.exports = { toPlansSearchResponse };
