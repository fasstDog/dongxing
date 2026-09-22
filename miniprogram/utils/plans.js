const TAG_TYPE = {
  cheap: 'success',
  fast: 'danger',
  balanced: 'primary'
};

const OD_SAMPLES = [
  {
    key: 'xuzhou-lhasa',
    from: '徐州',
    to: '拉萨',
    label: '徐州 → 拉萨',
    file: 'plans-xuzhou-lhasa.json'
  },
  {
    key: 'shanghai-chengdu',
    from: '上海',
    to: '成都',
    label: '上海 → 成都',
    file: 'plans-shanghai-chengdu.json'
  }
];

function matchSample(fromCity, toCity) {
  const from = (fromCity || '').trim();
  const to = (toCity || '').trim();
  return (
    OD_SAMPLES.find((s) => s.from === from && s.to === to) || OD_SAMPLES[0]
  );
}

function loadBundle(fromCity, toCity) {
  const sample = matchSample(fromCity, toCity);
  // eslint-disable-next-line global-require
  const map = {
    'plans-xuzhou-lhasa.json': require('../data/plans-xuzhou-lhasa.json'),
    'plans-shanghai-chengdu.json': require('../data/plans-shanghai-chengdu.json')
  };
  const data = map[sample.file] || map['plans-xuzhou-lhasa.json'];
  return { sample, data };
}

function formatClock(iso) {
  if (!iso || typeof iso !== 'string') return '';
  // 2026-10-01T07:30:00+08:00 → 10-01 07:30
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

function timelineToSteps(timeline) {
  const list = Array.isArray(timeline) ? timeline : [];
  return list.map((seg) => {
    if (seg.kind === 'xfer') {
      return {
        text: `${seg.city || ''} · ${seg.xfer_kind_label || '换乘'}`,
        desc: [
          seg.buffer_display ? `缓冲 ${seg.buffer_display}` : '',
          seg.tip || ''
        ]
          .filter(Boolean)
          .join('\n'),
        inactiveIcon: 'exchange'
      };
    }
    const mode = seg.mode_label || seg.mode || '';
    const from = seg.from_station || '';
    const to = seg.to_station || '';
    const timeRange = [formatClock(seg.dep_at), formatClock(seg.arr_at)]
      .filter(Boolean)
      .join(' → ');
    const line2 = [
      seg.service_ref || '',
      seg.duration_display || '',
      timeRange
    ]
      .filter(Boolean)
      .join(' · ');
    const line3 = [
      seg.seat_hint ? `席别参考：${seg.seat_hint}` : '',
      seg.price_display ? `价格参考 ${seg.price_display}` : ''
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      text: `${mode} ${from} → ${to}`.trim(),
      desc: [line2, line3].filter(Boolean).join('\n')
    };
  });
}

function findPlan(data, planId) {
  const main = (((data || {}).response || {}).main) || [];
  return main.find((p) => p.id === planId) || null;
}

function withTagType(plans) {
  return (plans || []).map((p) => ({
    ...p,
    tagType: TAG_TYPE[p.type] || 'primary'
  }));
}

module.exports = {
  TAG_TYPE,
  OD_SAMPLES,
  matchSample,
  loadBundle,
  formatClock,
  timelineToSteps,
  findPlan,
  withTagType
};
