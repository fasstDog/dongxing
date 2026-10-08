import { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { findPlan, type UiPlan, type UiPlay, type UiTimelineItem } from '../../services/adapt';
import { getDongxingGlobal } from '../../services/store';
import './index.scss';

type LegView = {
  code: string;
  mode: string;
  seat: string;
  from: string;
  to: string;
  depHm: string;
  arrHm: string;
  plus: number;
  flight: boolean;
  duration: string;
};

type XferView = {
  city: string;
  from: string;
  to: string;
  minutes: number;
  how: string;
};

type Spot = { name: string; dist: string; suggest: string };

type Section = {
  key: string;
  title: string;
  paragraphs: string[];
  photo?: 'train' | 'plane';
};

const PLAY_MIN = 180;
const SAVE_KEY = 'dx-guide-saved';
const LIKE_KEY = 'dx-guide-liked';
const LIKE_BASE = 128;

function readIds(key: string) {
  try {
    const raw = Taro.getStorageSync(key);
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [];
  } catch (err) {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    Taro.setStorageSync(key, ids);
  } catch (err) {
    /* 本地写不进就只留在这一页 */
  }
}

const HOUR = ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二', '二十三'];
const DIG = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

const FALLBACK_PLAY: Record<string, Spot[]> = {
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
  return { dep, arr, plus: dayGap(dep.key, arr.key) };
}

function waitMinutes(buffer: string) {
  const minutes = (buffer || '').match(/(\d+)\s*分钟/);
  if (minutes) return Number(minutes[1]);
  const hours = (buffer || '').match(/(\d+(?:\.\d+)?)\s*小时/);
  if (hours) return Math.round(Number(hours[1]) * 60);
  return 0;
}

function dayPart(hm: string) {
  const hour = Number((hm || '0').split(':')[0]);
  if (hour < 5) return '夜里';
  if (hour < 9) return '早上';
  if (hour < 12) return '上午';
  if (hour < 14) return '中午';
  if (hour < 18) return '下午';
  if (hour < 22) return '晚上';
  return '夜里';
}

function minuteName(m: number) {
  if (m === 0) return '';
  if (m < 10) return `零${DIG[m]}`;
  if (m === 10) return '十';
  if (m < 20) return `十${DIG[m - 10]}`;
  const ten = Math.floor(m / 10);
  const one = m % 10;
  return `${DIG[ten]}十${one ? DIG[one] : ''}`;
}

function spoken(hm: string) {
  let h = Number((hm || '').split(':')[0]);
  const m = Number((hm || '').split(':')[1]);
  if (Number.isNaN(h)) return hm || '';
  if (h >= 13) h -= 12;
  const hour = HOUR[h] || String(h);
  if (!m) return `${hour}点`;
  if (m === 30) return `${hour}点半`;
  return `${hour}点${minuteName(m)}分`;
}

function hourSpan(minutes: number) {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} 分钟`;
  const hour = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const words = ['', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (rest === 0 && hour <= 10) return `${words[hour]}个小时`;
  if (rest === 30 && hour <= 10) return `${words[hour]}个半小时`;
  if (rest === 0) return `${hour} 个小时`;
  return `${hour} 小时 ${rest} 分`;
}

function durationPhrase(text: string) {
  const raw = (text || '').replace(/^约\s*/, '').trim();
  return raw ? `大约 ${raw}` : '';
}

function seatPhrase(seat: string) {
  const text = (seat || '').split(/[；;]/)[0].trim();
  if (!text) return '';
  return text.split('/')[0].replace(/便宜|优先|难抢/g, '').trim();
}

function rideSentence(leg: LegView) {
  const seat = seatPhrase(leg.seat);
  const ride = leg.code ? (seat ? `${leg.code} 的${seat}` : leg.code) : seat || leg.mode;
  const verb = leg.flight ? '搭' : '坐';
  const dur = durationPhrase(leg.duration);
  const day = leg.plus <= 0 ? '' : leg.plus === 1 ? '第二天' : leg.plus === 2 ? '第三天' : `第 ${leg.plus + 1} 天`;
  const arrive = `${day}${dayPart(leg.arrHm)}${spoken(leg.arrHm)}`;
  const bits = [`${spoken(leg.depHm)}从${leg.from}${verb} ${ride}`];
  if (dur) bits.push(dur);
  return `${bits.join('，')}，${arrive}到${leg.to}。`;
}

function audience(type: string) {
  if (type === 'cheap') return '适合想少花钱、不赶时间的人。';
  if (type === 'balanced') return '适合不急着到、也想在路上歇一歇的人。';
  return '适合想少在路上耗时间、也愿意多花一点的人。';
}

function transferPhrase(n: number) {
  if (!n) return '不用换乘';
  if (n === 1) return '中途换一次';
  if (n === 2) return '中途换两次';
  return `中途换 ${n} 次`;
}

function citiesOf(plan: UiPlan) {
  return (plan.routeOneLine || '')
    .split(/→|->/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function leadOf(plan: UiPlan, legs: LegView[]) {
  const cities = citiesOf(plan);
  const dur = (plan.duration || '').replace(/^约\s*/, '大约 ');
  const tail = `${dur ? `全程${dur}，` : ''}${transferPhrase(plan.transfers)}${plan.price ? `，总价 ${plan.price}。` : '。'}${audience(plan.type)}`;
  if (legs.length >= 2) {
    const mid = cities[1] || legs[0].to;
    const end = cities[cities.length - 1] || legs[legs.length - 1].to;
    const next = legs[1];
    const start = `${dayPart(legs[0].depHm)}坐${legs[0].mode}到${mid}`;
    const sameDay = next.plus === 0;
    const follow = next.flight ? `${dayPart(next.depHm)}再飞${end}` : `${dayPart(next.depHm)}再坐到${end}`;
    return `${start}，${follow}${sameDay ? '，当天就能到。' : '。'}${tail}`;
  }
  if (legs.length === 1) {
    const from = cities[0] || legs[0].from;
    const end = cities[cities.length - 1] || legs[0].to;
    const how = legs[0].flight ? `从${from}直飞${end}。` : `从${from}坐${legs[0].mode}直达${end}，不用换车。`;
    return `${how}${tail}`;
  }
  return tail;
}

function spotsFor(plan: UiPlan, city: string): Spot[] {
  const fromData = (plan.play || [])
    .filter((item: UiPlay) => item.name)
    .slice(0, 2)
    .map((item) => ({ name: item.name, dist: item.distText || '', suggest: item.suggestText || '' }));
  if (fromData.length) return fromData;
  return (FALLBACK_PLAY[city] || []).slice(0, 2);
}

function spotSentence(spot: Spot, first: boolean) {
  const head = first ? `可以去${spot.name}` : `也可以去${spot.name}`;
  const rest = [spot.dist, spot.suggest].filter(Boolean).join('，');
  return rest ? `${head}，${rest}。` : `${head}。`;
}

function readTimeline(timeline: UiTimelineItem[]) {
  const legs: LegView[] = [];
  const xfers: XferView[] = [];
  let originKey = '';
  timeline.forEach((item) => {
    if (item.isXfer) return;
    const clock = clocks(item.timeRange || '');
    if (!originKey) originKey = clock.dep.key;
    const plusBase = dayGap(originKey, clock.dep.key);
    legs.push({
      code: codeOf(item.serviceRef || ''),
      mode: item.modeLabel || (item.isFlight ? '飞机' : '火车'),
      seat: item.seatHint || '',
      from: placeName(item.from || ''),
      to: placeName(item.to || ''),
      depHm: clock.dep.hm,
      arrHm: clock.arr.hm,
      plus: plusBase + clock.plus,
      flight: !!item.isFlight,
      duration: item.duration || ''
    });
  });
  for (let i = 0; i < timeline.length; i += 1) {
    const item = timeline[i];
    if (!item.isXfer) continue;
    const prev = [...timeline.slice(0, i)].reverse().find((seg) => !seg.isXfer);
    const next = timeline.slice(i + 1).find((seg) => !seg.isXfer);
    if (!prev || !next) continue;
    xfers.push({
      city: item.city || '',
      from: placeName(prev.to || ''),
      to: placeName(next.from || ''),
      minutes: waitMinutes(item.buffer || ''),
      how: item.xferLabel || '换乘'
    });
  }
  return { legs, xfers };
}

function buildGuide(plan: UiPlan) {
  const { legs, xfers } = readTimeline(plan.timeline);
  const cities = citiesOf(plan);
  const endCity = cities[cities.length - 1] || '';
  const sections: Section[] = [];
  legs.forEach((leg, index) => {
    const part = dayPart(leg.depHm);
    let title = `${part}从${leg.from}出发`;
    if (index === 0 && leg.flight) title = `${part}从${leg.from}起飞`;
    if (index > 0 && leg.flight) title = `${part}飞${endCity || leg.to}`;
    if (index > 0 && !leg.flight) title = `${part}从${leg.from}继续走`;
    const section: Section = {
      key: `leg-${index}`,
      title,
      paragraphs: [rideSentence(leg)],
      photo: index === 0 ? (leg.flight ? 'plane' : 'train') : undefined
    };
    if (index === legs.length - 1 && leg.flight && index > 0) section.photo = 'plane';
    sections.push(section);

    const xfer = xfers[index];
    if (!xfer || index === legs.length - 1) return;
    const city = xfer.city || leg.to;
    const span = hourSpan(xfer.minutes);
    const link = xfer.from && xfer.to ? `从${xfer.from}到${xfer.to}` : `在${city}`;
    const how = xfer.how || '换乘';
    if (xfer.minutes >= PLAY_MIN) {
      const spots = spotsFor(plan, city);
      const paragraphs = [`${link}是${how}，中间大约有${span}。这段时间够在附近走走。`];
      if (spots[0]) paragraphs.push(spotSentence(spots[0], true));
      if (spots[1]) paragraphs.push(spotSentence(spots[1], false));
      sections.push({ key: `stay-${index}`, title: `到了${city}，先去转转`, paragraphs });
    } else {
      sections.push({
        key: `stay-${index}`,
        title: `到了${city}，接着走`,
        paragraphs: [`${link}是${how}，中间大约只有${span || '一小会儿'}，来不及绕路，接着走就好。`]
      });
    }
  });
  return { lead: leadOf(plan, legs), sections };
}

export default function DetailPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<UiPlan | null>(null);
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

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
    const id = found.id;
    setSaved(readIds(SAVE_KEY).indexOf(id) >= 0);
    setLiked(readIds(LIKE_KEY).indexOf(id) >= 0);
    setFeedbackOpen(false);
    setFeedback('');
  }, [router.params]);

  const toggleSaved = () => {
    if (!plan) return;
    const ids = readIds(SAVE_KEY).filter((id) => id !== plan.id);
    const next = !saved;
    if (next) ids.push(plan.id);
    writeIds(SAVE_KEY, ids);
    setSaved(next);
    Taro.showToast({ title: next ? '已收藏这条路线' : '已取消收藏', icon: 'none' });
  };

  const toggleLiked = () => {
    if (!plan) return;
    const ids = readIds(LIKE_KEY).filter((id) => id !== plan.id);
    const next = !liked;
    if (next) ids.push(plan.id);
    writeIds(LIKE_KEY, ids);
    setLiked(next);
  };

  const submitFeedback = () => {
    const text = feedback.trim();
    if (!text) {
      Taro.showToast({ title: '写一点再发', icon: 'none' });
      return;
    }
    setFeedback('');
    setFeedbackOpen(false);
    Taro.showToast({ title: '收到了，谢谢', icon: 'none' });
  };

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
      <View className='g-page'>
        <View className='g-empty'>
          <Text className='g-empty-text'>方案找不到了，先回结果看看</Text>
          <View className='g-buy' onClick={onBack}>
            <Text className='g-buy-label'>回结果</Text>
          </View>
        </View>
      </View>
    );
  }

  const guide = buildGuide(plan);

  return (
    <View className='g-page'>
      <View className='g-sky'>
        <View className='g-head'>
          <View className='g-back' onClick={onBack}>
            <Text className='g-back-arrow'>‹</Text>
          </View>
          <Text className='g-title'>{plan.typeLabel} · 攻略</Text>
        </View>
      </View>

      <View className='g-body'>
        <Text className='g-lead'>{guide.lead}</Text>
        {guide.sections.map((section) => (
          <View className='g-sec' key={section.key}>
            <Text className='g-h'>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text className='g-p' key={paragraph}>
                {paragraph}
              </Text>
            ))}
            {section.photo === 'train' ? <View className='g-photo g-photo-train' /> : null}
            {section.photo === 'plane' ? <View className='g-photo g-photo-plane' /> : null}
          </View>
        ))}
      </View>

      <View className='g-dock'>
        <View className='g-acts'>
          <View className='g-act' onClick={onBuy}>
            <Text className='g-act-icon'>▣</Text>
            <Text className='g-act-label'>去购票</Text>
          </View>
          <View className='g-act' onClick={toggleSaved}>
            <Text className={saved ? 'g-act-icon g-act-icon-on' : 'g-act-icon'}>{saved ? '★' : '☆'}</Text>
            <Text className={saved ? 'g-act-label g-act-label-on' : 'g-act-label'}>{saved ? '已收藏' : '收藏路线'}</Text>
          </View>
          <View className='g-act' onClick={toggleLiked}>
            <Text className={liked ? 'g-act-icon g-heart-on' : 'g-act-icon'}>{liked ? '♥' : '♡'}</Text>
            <Text className={liked ? 'g-act-label g-act-label-on' : 'g-act-label'}>{`点赞 ${LIKE_BASE + (liked ? 1 : 0)}`}</Text>
          </View>
          <View className='g-act' onClick={() => setFeedbackOpen(true)}>
            <Text className='g-act-icon'>✎</Text>
            <Text className='g-act-label'>反馈</Text>
          </View>
        </View>
      </View>

      {feedbackOpen ? (
        <View className='g-mask'>
          <View className='g-sheet'>
            <Text className='g-sheet-title'>反馈</Text>
            <Input
              className='g-input'
              placeholder='这条路线哪里不对'
              value={feedback}
              onInput={(event) => setFeedback(event.detail.value)}
            />
            <View className='g-sheet-row'>
              <View className='g-sheet-cancel' onClick={() => setFeedbackOpen(false)}>
                <Text className='g-sheet-cancel-text'>取消</Text>
              </View>
              <View className='g-sheet-ok' onClick={submitFeedback}>
                <Text className='g-sheet-ok-text'>提交</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
