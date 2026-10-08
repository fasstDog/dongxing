import { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { loadQueryDraft, saveQueryDraft } from '../../services/store';
import { QUERY_SAMPLES, MAX_VIAS, type QuerySample } from '../../data/samples';
import { color } from '../../styles/tokens';
import './index.scss';

type FieldErrors = {
  from?: string;
  to?: string;
  date?: string;
  vias: Record<number, string>;
};

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const CITY_MAX_LEN = 12;
const PLACEHOLDER_STYLE = `color:${color.text4}`;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function dateLabel(dateStr: string, todayStr: string, tomorrowStr: string) {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const rel = dateStr === todayStr ? ' · 今天' : dateStr === tomorrowStr ? ' · 明天' : '';
  return `${Number(m[2])}月${Number(m[3])}日 ${WEEK[d.getDay()]}${rel}`;
}

const clean = (s: string) => String(s || '').trim();

function validate(
  from: string,
  to: string,
  vias: string[],
  dateFlexible: boolean,
  date: string,
  todayStr: string
): FieldErrors {
  const errs: FieldErrors = { vias: {} };
  const f = clean(from);
  const t = clean(to);
  if (!f) errs.from = '填一下出发城市';
  if (!t) errs.to = '填一下到达城市';
  if (f && t && f === t) errs.to = '到达和出发是同一个城市';
  vias.forEach((raw, i) => {
    const v = clean(raw);
    if (!v) {
      errs.vias[i] = `途经 ${i + 1} 还没填，填上或删掉`;
      return;
    }
    if (v === f || v === t) {
      errs.vias[i] = '途经别和出发 / 到达重复';
      return;
    }
    const dup = vias.findIndex((other, j) => j < i && clean(other) === v);
    if (dup >= 0) errs.vias[i] = `和途经 ${dup + 1} 重复了`;
  });
  if (!dateFlexible) {
    if (!date) errs.date = '选一下出发日期';
    else if (date < todayStr) errs.date = '这天已经过了，换一天';
  }
  return errs;
}

function errorList(e: FieldErrors) {
  const list: string[] = [];
  // 按页面从上到下的顺序汇总
  if (e.from) list.push(e.from);
  Object.keys(e.vias)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => list.push(e.vias[k]));
  if (e.to) list.push(e.to);
  if (e.date) list.push(e.date);
  return list;
}

export default function QueryPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);
  const tomorrowStr = toDateStr(addDays(today, 1));
  const endStr = toDateStr(addDays(today, 60));

  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
  const [dateFlexible, setDateFlexible] = useState(true);
  const [date, setDate] = useState(tomorrowStr);
  const [vias, setVias] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 预填：链接参数 > 上次查询 > 默认样例
  useEffect(() => {
    const p = router.params || {};
    if (p.from !== undefined || p.to !== undefined) {
      setFromCity(decodeURIComponent(p.from || ''));
      setToCity(decodeURIComponent(p.to || ''));
      const v = p.vias ? decodeURIComponent(p.vias).split(',') : [];
      setVias(v.slice(0, MAX_VIAS));
      if (p.date) {
        setDateFlexible(false);
        setDate(decodeURIComponent(p.date));
      }
      if (p.check === '1') setAttempted(true);
      return;
    }
    const draft = loadQueryDraft();
    if (draft) {
      setFromCity(draft.fromCity);
      setToCity(draft.toCity);
      setVias(draft.vias);
      setDateFlexible(draft.dateFlexible);
      if (draft.date && draft.date >= todayStr) setDate(draft.date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDidShow(() => setSubmitting(false));

  const errors = useMemo(
    () => validate(fromCity, toCity, vias, dateFlexible, date, todayStr),
    [fromCity, toCity, vias, dateFlexible, date, todayStr]
  );
  const shown: FieldErrors = attempted ? errors : { vias: {} };
  const problems = errorList(errors);
  const isBlank = !clean(fromCity) && !clean(toCity) && vias.length === 0;

  const toast = (title: string) => Taro.showToast({ title, icon: 'none' });

  const onSwap = () => {
    if (!clean(fromCity) && !clean(toCity)) return;
    setFromCity(toCity);
    setToCity(fromCity);
    if (vias.length > 1) {
      setVias(vias.slice().reverse());
      toast('起终点已交换，途经顺序也反过来了');
    }
  };

  const onAddVia = () => {
    if (vias.length >= MAX_VIAS) {
      toast(`途经最多 ${MAX_VIAS} 个`);
      return;
    }
    setVias([...vias, '']);
  };

  const onRemoveVia = (i: number) => {
    const next = vias.slice();
    next.splice(i, 1);
    setVias(next);
  };

  const onMoveViaUp = (i: number) => {
    if (i <= 0) return;
    const next = vias.slice();
    const tmp = next[i - 1];
    next[i - 1] = next[i];
    next[i] = tmp;
    setVias(next);
  };

  const onChangeVia = (i: number, value: string) => {
    const next = vias.slice();
    next[i] = value;
    setVias(next);
  };

  const onClear = () => {
    setFromCity('');
    setToCity('');
    setVias([]);
    setDateFlexible(true);
    setAttempted(false);
  };

  const onSample = (s: QuerySample) => {
    setFromCity(s.fromCity);
    setToCity(s.toCity);
    setVias(s.vias.slice());
    setDateFlexible(true);
    setAttempted(false);
  };

  const onSearch = () => {
    if (submitting) return;
    setAttempted(true);
    if (problems.length) return;
    const from = clean(fromCity);
    const to = clean(toCity);
    const viaList = vias.map(clean);
    saveQueryDraft({
      fromCity: from,
      toCity: to,
      dateFlexible,
      date: dateFlexible ? '' : date,
      vias: viaList
    });
    const q = [
      `from=${encodeURIComponent(from)}`,
      `to=${encodeURIComponent(to)}`,
      viaList.length ? `vias=${encodeURIComponent(viaList.join(','))}` : '',
      dateFlexible ? 'dateFlexible=1' : `date=${encodeURIComponent(date)}`
    ]
      .filter(Boolean)
      .join('&');
    setSubmitting(true);
    Taro.navigateTo({
      url: `/pages/results/index?${q}`,
      fail: () => {
        setSubmitting(false);
        toast('页面没打开，再点一次试试');
      }
    });
  };

  const renderError = (msg?: string) => (msg ? <View className='q-err'>{msg}</View> : null);

  return (
    <View className='q-page'>
      <View className='q-hero'>
        <View className='q-hero-top'>
          <Text className='q-brand'>懂行</Text>
          <View className='q-about' onClick={() => Taro.navigateTo({ url: '/pages/about/index' })}>
            <View className='q-about-text'>关于</View>
          </View>
        </View>
        <View className='q-hero-title'>直达之外，帮你找更聪明的走法</View>
        <View className='q-hero-sub'>最省钱 · 最快 · 最综合</View>
      </View>

      {/* 起终点 + 有序途经 */}
      <View className='q-card q-card-od'>
        <View className='q-rail'>
          <View className='q-row'>
            <View className='q-dot q-dot-from' />
            <Text className='q-label'>出发</Text>
            <Input
              className='q-input'
              placeholder='出发城市，如 徐州'
              placeholderClass='q-placeholder'
              placeholderStyle={PLACEHOLDER_STYLE}
              maxlength={CITY_MAX_LEN}
              value={fromCity}
              onInput={(e) => setFromCity(e.detail.value)}
            />
            <View className='q-swap' onClick={onSwap}>
              <Text className='q-swap-icon'>⇅</Text>
            </View>
          </View>
          {renderError(shown.from)}

          {vias.map((v, i) => (
            <View key={`via-${i}`}>
              <View className='q-row q-row-via'>
                <View className='q-dot q-dot-via'>
                  <Text className='q-dot-num'>{i + 1}</Text>
                </View>
                <Text className='q-label q-label-via'>途经</Text>
                <Input
                  className='q-input'
                  placeholder={`第 ${i + 1} 个途经城市`}
                  placeholderClass='q-placeholder'
              placeholderStyle={PLACEHOLDER_STYLE}
                  maxlength={CITY_MAX_LEN}
                  value={v}
                  onInput={(e) => onChangeVia(i, e.detail.value)}
                />
                {i > 0 ? (
                  <View className='q-icon-btn' onClick={() => onMoveViaUp(i)}>
                    <Text className='q-icon-text'>↑</Text>
                  </View>
                ) : null}
                <View className='q-icon-btn q-icon-btn-danger' onClick={() => onRemoveVia(i)}>
                  <Text className='q-icon-text q-icon-text-danger'>✕</Text>
                </View>
              </View>
              {renderError(shown.vias[i])}
            </View>
          ))}

          <View className='q-row q-row-last'>
            <View className='q-dot q-dot-to' />
            <Text className='q-label'>到达</Text>
            <Input
              className='q-input'
              placeholder='到达城市，如 拉萨'
              placeholderClass='q-placeholder'
              placeholderStyle={PLACEHOLDER_STYLE}
              maxlength={CITY_MAX_LEN}
              value={toCity}
              onInput={(e) => setToCity(e.detail.value)}
            />
          </View>
          {renderError(shown.to)}
        </View>

        <View className='q-toolbar'>
          <View
            className={`q-add ${vias.length >= MAX_VIAS ? 'q-add-disabled' : ''}`}
            onClick={onAddVia}
          >
            <Text className='q-add-text'>
              {vias.length >= MAX_VIAS ? `最多 ${MAX_VIAS} 个途经城市` : '+ 添加途经城市'}
            </Text>
          </View>
          {!isBlank ? (
            <View className='q-link' onClick={onClear}>
              <Text className='q-link-text'>清空</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 日期 */}
      <View className='q-card'>
        <View className='q-card-title'>出发日期</View>
        <View className='q-seg'>
          <View
            className={`q-seg-item ${dateFlexible ? 'q-seg-item-on' : ''}`}
            onClick={() => setDateFlexible(true)}
          >
            <Text className={`q-seg-text ${dateFlexible ? 'q-seg-text-on' : ''}`}>日期灵活</Text>
          </View>
          <View
            className={`q-seg-item ${!dateFlexible ? 'q-seg-item-on' : ''}`}
            onClick={() => setDateFlexible(false)}
          >
            <Text className={`q-seg-text ${!dateFlexible ? 'q-seg-text-on' : ''}`}>指定日期</Text>
          </View>
        </View>
        {dateFlexible ? null : (
          <Picker mode='date' value={date} start={todayStr} end={endStr} onChange={(e) => setDate(String(e.detail.value))}>
            <View className='q-date-row'>
              <Text className='q-date-text'>{dateLabel(date, todayStr, tomorrowStr)}</Text>
              <Text className='q-date-arrow'>更改 ›</Text>
            </View>
          </Picker>
        )}
        {renderError(shown.date)}
      </View>

      {/* 提交态 / 空态 / 错误态 */}
      {attempted && problems.length ? (
        <View className='q-banner q-banner-error'>
          <View className='q-banner-text-error'>
            {problems.length === 1 ? problems[0] : `还有 ${problems.length} 处要改：${problems[0]}`}
          </View>
        </View>
      ) : isBlank ? (
        <View className='q-banner q-banner-info'>
          <View className='q-banner-text-info'>填好出发和到达，或选一条下面的路线</View>
        </View>
      ) : null}

      <View
        className={`q-submit ${submitting ? 'q-submit-busy' : ''} ${attempted && problems.length ? 'q-submit-blocked' : ''}`}
        onClick={onSearch}
      >
        <Text className='q-submit-text'>{submitting ? '正在组合方案…' : '开始推荐'}</Text>
      </View>

      {/* 样例：仅列本地 mock 中存在的场景 */}
      <View className='q-section-title'>常用路线</View>
      <View className='q-samples'>
        {QUERY_SAMPLES.map((s) => (
          <View key={s.key} className='q-sample' onClick={() => onSample(s)}>
            <View className='q-sample-od'>
              {s.fromCity} → {s.vias.length ? `${s.vias.join(' → ')} → ` : ''}
              {s.toCity}
            </View>
          </View>
        ))}
      </View>

    </View>
  );
}
