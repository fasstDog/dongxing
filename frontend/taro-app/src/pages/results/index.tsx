import { useCallback, useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { loadAdaptedPlans, scenarioKeyForVias, type UiPlan } from '../../services/adapt';
import { getDongxingGlobal } from '../../services/store';
import './index.scss';

const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;

const dec = (s?: string) => {
  try {
    return decodeURIComponent(s || '');
  } catch (e) {
    return s || '';
  }
};

type Mode = 'path' | 'recommend';

type LegLine = { code: string; rest: string };

function shortStop(name: string): string {
  const s = (name || '').trim();
  if (!s) return '';
  if (s.includes('机场')) {
    const m = s.match(/^[\u4e00-\u9fa5]{2}/);
    return m ? m[0] : s.replace(/(国际)?机场/g, '');
  }
  return s.replace(/站$/, '');
}

function serviceCode(ref: string): string {
  return (ref || '')
    .replace(/（参考）/g, '')
    .replace(/类/g, '')
    .replace(/西宁始发进藏/g, '')
    .trim();
}

function legLines(plan: UiPlan): LegLine[] {
  const lines: LegLine[] = [];
  (plan.timeline || []).forEach((seg) => {
    if (!seg || seg.isXfer) return;
    const code = serviceCode(seg.serviceRef || '') || seg.modeLabel || '';
    const from = shortStop(seg.from || '');
    const to = shortStop(seg.to || '');
    const parts = (seg.timeRange || '').split('→').map((x) => x.trim());
    const parse = (token: string) => {
      const m = (token || '').match(/^(\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
      return m ? { day: m[1], hm: m[2] } : { day: '', hm: token || '' };
    };
    const dep = parse(parts[0] || '');
    const arr = parse(parts[1] || '');
    const cross = Boolean(dep.day && arr.day && dep.day !== arr.day);
    const depText = cross ? `${dep.day} ${dep.hm}` : dep.hm;
    const arrText = cross ? `${arr.day} ${arr.hm}` : arr.hm;
    const rest = [from, depText, '→', to, arrText].filter(Boolean).join(' ');
    if (code || rest) lines.push({ code, rest });
  });
  return lines;
}

export default function ResultsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [main, setMain] = useState<UiPlan[]>([]);
  const [more, setMore] = useState<UiPlan[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('path');
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
  const [vias, setVias] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>(['徐州', '拉萨']);

  const runLoad = useCallback((from: string, to: string, viaList: string[], followPath: boolean) => {
    setStatus('loading');
    setMain([]);
    setMore([]);
    setMoreOpen(false);
    loadAdaptedPlans(from, to, {
      vias: viaList,
      scenarioKey: scenarioKeyForVias(viaList, followPath)
    })
      .then((adapted: any) => {
        const list: UiPlan[] = (adapted && adapted.main) || [];
        const extra: UiPlan[] = (adapted && adapted.more) || [];
        const code = adapted && adapted.error && (adapted.error.code || adapted.error);
        if (adapted && adapted.ok === false && list.length === 0) {
          setStatus(!code || code === 'NO_FEASIBLE' || code === 'NO_LEGS' || code === 'empty' ? 'empty' : 'error');
          return;
        }
        if (!list.length) {
          setStatus('empty');
          return;
        }
        getDongxingGlobal().lastPlans = list.concat(extra);
        setMain(list);
        setMore(extra);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    const from = dec(router.params.from) || '徐州';
    const to = dec(router.params.to) || '拉萨';
    const viaList = dec(router.params.vias).split(',').filter(Boolean);
    const fromName = dec(router.params.fromName) || from;
    const toName = dec(router.params.toName) || to;
    const viaNames = dec(router.params.viaNames).split(',').filter(Boolean);
    const shownVias = viaList.map((city, i) => viaNames[i] || city);
    setFromCity(from);
    setToCity(to);
    setVias(viaList);
    setNames([fromName, ...shownVias, toName]);
    setMode('path');
    runLoad(from, to, viaList, viaList.length > 0);
  }, [router.params, runLoad]);

  const onMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    runLoad(fromCity, toCity, vias, next === 'path');
  };

  const onOpen = (id: string) => {
    const q = [`id=${encodeURIComponent(id)}`, `from=${encodeURIComponent(fromCity)}`, `to=${encodeURIComponent(toCity)}`].join('&');
    Taro.navigateTo({ url: `/pages/detail/index?${q}` });
  };

  const onBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/query/index' }) });
  };

  return (
    <View className='r-page'>
      <View className='r-sky'>
        <View className='r-route'>
          {names.map((n, i) => (
            <View key={`${n}-${i}`} className='r-route-item'>
              {i > 0 ? <Text className='r-arrow'>→</Text> : null}
              <Text className={i > 0 && i < names.length - 1 ? 'r-place r-place-via' : 'r-place'}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      {vias.length ? (
        <View className='r-seg'>
          <View
            className={mode === 'path' ? 'r-seg-btn r-seg-on' : 'r-seg-btn'}
            hoverClass='r-press'
            {...PRESS}
            onClick={() => onMode('path')}
          >
            <Text className={mode === 'path' ? 'r-seg-text r-seg-text-on' : 'r-seg-text'}>按你的路径</Text>
          </View>
          <View
            className={mode === 'recommend' ? 'r-seg-btn r-seg-on' : 'r-seg-btn'}
            hoverClass='r-press'
            {...PRESS}
            onClick={() => onMode('recommend')}
          >
            <Text className={mode === 'recommend' ? 'r-seg-text r-seg-text-on' : 'r-seg-text'}>系统推荐</Text>
          </View>
        </View>
      ) : null}

      {status === 'loading' ? (
        <View className='r-list'>
          <View className='r-bone' />
          <View className='r-bone' />
          <View className='r-bone r-bone-short' />
        </View>
      ) : null}

      {status === 'empty' ? (
        <View className='r-state'>
          <Text className='r-state-title'>这趟暂时没有合适的走法</Text>
          <Text className='r-state-sub'>换个城市，或去掉途经再试试</Text>
          <View className='r-state-btn' hoverClass='r-press' {...PRESS} onClick={onBack}>
            <Text className='r-state-btn-text'>改条件</Text>
          </View>
        </View>
      ) : null}

      {status === 'error' ? (
        <View className='r-state'>
          <Text className='r-state-title'>这趟没查到</Text>
          <Text className='r-state-sub'>过一会儿再试，或改个条件</Text>
          <View className='r-state-btn' hoverClass='r-press' {...PRESS} onClick={() => runLoad(fromCity, toCity, vias, mode === 'path')}>
            <Text className='r-state-btn-text'>再试一次</Text>
          </View>
          <View className='r-state-btn r-state-btn-ghost' hoverClass='r-press' {...PRESS} onClick={onBack}>
            <Text className='r-state-btn-text r-state-btn-text-ghost'>改条件</Text>
          </View>
        </View>
      ) : null}

      {status === 'ok' ? (
        <View className='r-list'>
          {main.map((p) => (
            <View key={p.id} className='r-card' hoverClass='r-press' {...PRESS} onClick={() => onOpen(p.id)}>
              <View className='r-card-top'>
                <Text className={`r-tag r-tag-${p.type}`}>{p.typeLabel || '方案'}</Text>
                <Text className='r-xfer'>{p.transfers ? `${p.transfers} 次换乘` : '不用换乘'}</Text>
              </View>
              <View className='r-metrics'>
                <View className='r-metric'>
                  <Text className={`r-num ${p.type === 'cheap' || p.type === 'balanced' ? `r-num-on r-num-${p.type}` : ''}`}>{p.price}</Text>
                  <Text className='r-metric-label'>参考价</Text>
                </View>
                <View className='r-metric r-metric-end'>
                  <Text className={`r-num r-num-dur ${p.type === 'fast' || p.type === 'balanced' ? `r-num-on r-num-${p.type}` : ''}`}>{p.duration}</Text>
                  <Text className='r-metric-label r-metric-label-end'>全程</Text>
                </View>
              </View>
              <View className='r-tear' />
              <View className='r-legs'>
                {legLines(p).length
                  ? legLines(p).map((leg, i) => (
                      <Text key={`${p.id}-${i}`} className='r-leg'>
                        {leg.code ? <Text className='r-leg-code'>{leg.code}</Text> : null}
                        {leg.code ? <Text className='r-leg-ref'>参考</Text> : null}
                        <Text className='r-leg-rest'>{leg.rest}</Text>
                      </Text>
                    ))
                  : <Text className='r-leg'><Text className='r-leg-rest'>{p.routeOneLine}</Text></Text>}
              </View>
              {p.why ? <Text className='r-why'>{p.why}</Text> : null}
            </View>
          ))}

          {more.length ? (
            <View className='r-more'>
              <View className='r-more-head' hoverClass='r-press' {...PRESS} onClick={() => setMoreOpen((v) => !v)}>
                <Text className='r-more-title'>{moreOpen ? '收起' : '更多方案'}</Text>
                <Text className='r-more-count'>{more.length}</Text>
              </View>
              {moreOpen
                ? more.map((p) => (
                    <View key={p.id} className='r-more-row' hoverClass='r-press' {...PRESS} onClick={() => onOpen(p.id)}>
                      <Text className={`r-tag r-tag-sm r-tag-${p.type}`}>{p.typeLabel || '方案'}</Text>
                      <View className='r-more-main'>
                        <Text className='r-more-line'>{p.routeOneLine || p.duration}</Text>
                        <Text className='r-more-meta'>
                          {p.duration} · {p.price}
                        </Text>
                      </View>
                    </View>
                  ))
                : null}
            </View>
          ) : null}

        </View>
      ) : null}
    </View>
  );
}
