import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { findPlan, type UiPlan, type UiPlay, type UiTimelineItem } from '../../services/adapt';
import { getDongxingGlobal } from '../../services/store';
import './index.scss';

type Clock = { hm: string; plus: number };

type LegView = {
  key: string;
  code: string;
  mode: string;
  seat: string;
  from: string;
  to: string;
  dep: Clock;
  arr: Clock;
  flight: boolean;
};

type XferView = {
  key: string;
  from: string;
  to: string;
  wait: string;
  minutes: number;
  how: string;
};

type PlayView = {
  name: string;
  dist: string;
  suggest: string;
};

const PLAY_MIN = 180;

const FALLBACK_PLAY: Record<string, PlayView[]> = {
  西安: [
    { name: '西安钟楼', dist: '市中心，离西安北站大约 12 公里', suggest: '逛 1 小时' },
    { name: '回民街', dist: '钟楼旁边', suggest: '逛 1 小时' }
  ]
};

function codeOf(ref: string) {
  return (ref || '').replace(/（参考）/g, '').replace(/类/g, '').trim();
}

function placeName(name: string) {
  let text = (name || '').trim();
  if (!text) return '';
  if (text.includes('机场')) {
    text = text.replace(/国际/g, '');
    const matched = text.match(/^([\u4e00-\u9fa5]{2})(.+机场)$/);
    if (matched && matched[2].length >= 3) return matched[2];
    return text;
  }
  return text.replace(/站$/, '');
}

function parseStamp(token: string) {
  const matched = (token || '').match(/^(\d{2})-(\d{2})\s+(\d{2}:\d{2})$/);
  if (!matched) return { key: '', hm: (token || '').trim() };
  return { key: `${matched[1]}-${matched[2]}`, hm: matched[3] };
}

function dayGap(fromKey: string, toKey: string) {
  if (!fromKey || !toKey || fromKey === toKey) return 0;
  const [fm, fd] = fromKey.split('-').map(Number);
  const [tm, td] = toKey.split('-').map(Number);
  const from = Date.UTC(2026, fm - 1, fd);
  const to = Date.UTC(2026, tm - 1, td);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function clocks(timeRange: string) {
  const parts = (timeRange || '').split('→').map((part) => part.trim());
  const dep = parseStamp(parts[0] || '');
  const arr = parseStamp(parts[1] || '');
  return {
    dep: { hm: dep.hm, plus: 0 },
    arr: { hm: arr.hm, plus: dayGap(dep.key, arr.key) },
    depKey: dep.key
  };
}

function waitMinutes(buffer: string) {
  const minutes = (buffer || '').match(/(\d+)\s*分钟/);
  if (minutes) return Number(minutes[1]);
  const hours = (buffer || '').match(/(\d+(?:\.\d+)?)\s*小时/);
  if (hours) return Math.round(Number(hours[1]) * 60);
  return 0;
}

function waitText(minutes: number) {
  if (minutes <= 0) return '';
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hour = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `约 ${hour} 小时`;
  if (rest === 30) return `约 ${hour}.5 小时`;
  return `约 ${hour} 小时 ${rest} 分`;
}

function buildTrip(timeline: UiTimelineItem[]) {
  const legs: LegView[] = [];
  const xfers: XferView[] = [];
  let originKey = '';
  timeline.forEach((item, index) => {
    if (item.isXfer) return;
    const clock = clocks(item.timeRange || '');
    if (!originKey) originKey = clock.depKey;
    const plusBase = dayGap(originKey, clock.depKey);
    legs.push({
      key: `leg-${index}`,
      code: codeOf(item.serviceRef || ''),
      mode: item.modeLabel || (item.isFlight ? '飞机' : '火车'),
      seat: item.seatHint || '',
      from: placeName(item.from || ''),
      to: placeName(item.to || ''),
      dep: { hm: clock.dep.hm, plus: plusBase },
      arr: { hm: clock.arr.hm, plus: plusBase + clock.arr.plus },
      flight: !!item.isFlight
    });
  });
  for (let i = 0; i < timeline.length; i += 1) {
    const item = timeline[i];
    if (!item.isXfer) continue;
    const prev = [...timeline.slice(0, i)].reverse().find((seg) => !seg.isXfer);
    const next = timeline.slice(i + 1).find((seg) => !seg.isXfer);
    if (!prev || !next) continue;
    const minutes = waitMinutes(item.buffer || '');
    xfers.push({
      key: `xfer-${i}`,
      from: placeName(prev.to || ''),
      to: placeName(next.from || ''),
      wait: waitText(minutes),
      minutes,
      how: item.xferLabel || '换乘'
    });
  }
  const rows: Array<{ kind: 'leg'; leg: LegView } | { kind: 'xfer'; xfer: XferView }> = [];
  let xferAt = 0;
  legs.forEach((leg, index) => {
    if (index > 0 && xfers[xferAt]) {
      rows.push({ kind: 'xfer', xfer: xfers[xferAt] });
      xferAt += 1;
    }
    rows.push({ kind: 'leg', leg });
  });
  return { rows, longEnough: xfers.some((item) => item.minutes >= PLAY_MIN) };
}

function playSpots(plan: UiPlan, city: string): PlayView[] {
  const fromData = (plan.play || [])
    .filter((item: UiPlay) => item.name)
    .slice(0, 2)
    .map((item) => ({
      name: item.name,
      dist: item.distText || '',
      suggest: item.suggestText || ''
    }));
  if (fromData.length) return fromData;
  return (FALLBACK_PLAY[city] || []).slice(0, 2);
}

function hubCity(plan: UiPlan) {
  const xfer = plan.timeline.find((item) => item.isXfer && item.city);
  return xfer?.city || '';
}

function Plus({ n }: { n: number }) {
  if (!n) return null;
  return <Text className='d-plus'>+{n}</Text>;
}

export default function DetailPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<UiPlan | null>(null);
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');

  useEffect(() => {
    const planId = decodeURIComponent(router.params.id || '');
    const from = decodeURIComponent(router.params.from || '徐州');
    const to = decodeURIComponent(router.params.to || '拉萨');
    setFromCity(from);
    setToCity(to);
    const cached = ((getDongxingGlobal().lastPlans || []) as UiPlan[]).find((item) => item.id === planId);
    const found = cached || findPlan(from, to, planId);
    if (!found) {
      Taro.showToast({ title: '方案找不到了，先回结果看看', icon: 'none' });
      setPlan(null);
      setTimeout(() => {
        Taro.navigateBack({
          fail: () =>
            Taro.redirectTo({
              url: `/pages/results/index?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
            })
        });
      }, 500);
      return;
    }
    setPlan(found);
  }, [router.params]);

  const onBuy = () => {
    Taro.showToast({ title: '去 12306 或航司看看', icon: 'none', duration: 2000 });
  };

  const onBack = () => {
    Taro.navigateBack({
      fail: () =>
        Taro.redirectTo({
          url: `/pages/results/index?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`
        })
    });
  };

  if (!plan) {
    return (
      <View className='d-page'>
        <View className='d-empty'>
          <Text className='d-empty-text'>方案找不到了，先回结果看看</Text>
          <View className='d-buy-btn' onClick={onBack}>
            <Text className='d-buy-label'>回结果</Text>
          </View>
        </View>
      </View>
    );
  }

  const trip = buildTrip(plan.timeline);
  const city = hubCity(plan);
  const spots = trip.longEnough ? playSpots(plan, city) : [];
  const transferText = plan.transfers > 0 ? `${plan.transfers} 次` : '不用换';

  return (
    <View className='d-page'>
      <View className='d-sky'>
        <View className='d-head'>
          <View className='d-back' onClick={onBack}>
            <Text className='d-back-arrow'>‹</Text>
          </View>
          <Text className='d-title'>{plan.typeLabel} · 攻略</Text>
        </View>
      </View>

      <View className='d-body'>
        <View className={plan.hasFlight ? 'd-sum d-sum-flight' : 'd-sum d-sum-train'}>
          <View className='d-metrics'>
            <View className='d-metric'>
              <Text className='d-num'>{plan.price}</Text>
              <Text className='d-lab'>总价</Text>
            </View>
            <View className='d-metric'>
              <Text className='d-num'>{plan.duration}</Text>
              <Text className='d-lab'>总时长</Text>
            </View>
            <View className='d-metric'>
              <Text className='d-num'>{transferText}</Text>
              <Text className='d-lab'>换乘</Text>
            </View>
          </View>
        </View>

        <Text className='d-section'>行程</Text>
        {trip.rows.map((row) =>
          row.kind === 'xfer' ? (
            <View className='d-xfer' key={row.xfer.key}>
              <Text className='d-xfer-route'>
                {row.xfer.from} → {row.xfer.to}
              </Text>
              <Text className='d-xfer-meta'>
                {[row.xfer.wait, row.xfer.how].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : (
            <View className='d-leg' key={row.leg.key}>
              <View className='d-leg-top'>
                <Text className='d-code'>{row.leg.code || row.leg.mode}</Text>
                {row.leg.seat ? <Text className='d-seat'>{row.leg.seat}</Text> : null}
              </View>
              <View className='d-leg-line'>
                <View className='d-stop'>
                  <Text className='d-stop-name'>{row.leg.from}</Text>
                  <View className='d-clock'>
                    <Text className='d-hm'>{row.leg.dep.hm}</Text>
                    <Plus n={row.leg.dep.plus} />
                  </View>
                </View>
                <Text className='d-to'>→</Text>
                <View className='d-stop d-stop-end'>
                  <Text className='d-stop-name d-stop-name-end'>{row.leg.to}</Text>
                  <View className='d-clock d-clock-end'>
                    <Text className='d-hm'>{row.leg.arr.hm}</Text>
                    <Plus n={row.leg.arr.plus} />
                  </View>
                </View>
              </View>
            </View>
          )
        )}

        {spots.length ? (
          <View>
            <Text className='d-section'>怎么玩</Text>
            <View className='d-play'>
              {spots.map((spot) => (
                <View className='d-spot' key={spot.name}>
                  <Text className='d-spot-name'>{spot.name}</Text>
                  <Text className='d-spot-sub'>{[spot.dist, spot.suggest].filter(Boolean).join(' · ')}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View className='d-bar'>
        <View className='d-buy-btn' onClick={onBuy}>
          <Text className='d-buy-label'>去购票</Text>
        </View>
      </View>
    </View>
  );
}
