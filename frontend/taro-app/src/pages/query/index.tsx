import { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { loadQueryDraft, saveQueryDraft } from '../../services/store';
import { QUERY_SAMPLES, MAX_VIAS, type QuerySample } from '../../data/samples';
import { travel } from '../../styles/tokens';
import { HERO_SCENE, ROUTE_THEMES } from '../../assets/decor';
import './index.scss';

type FieldErrors = {
  from?: string;
  to?: string;
  vias: Record<number, string>;
};

const CITY_MAX_LEN = 12;
const PLACEHOLDER_STYLE = `color:${travel.ink4};font-weight:400`;
/** 按压反馈：hover-class 在小程序 / H5 / RN 均可用 */
const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;

const clean = (s: string) => String(s || '').trim();

function validate(from: string, to: string, vias: string[]): FieldErrors {
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
  return list;
}

export default function QueryPage() {
  const router = useRouter();
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
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
      if (p.check === '1') setAttempted(true);
      return;
    }
    const draft = loadQueryDraft();
    if (draft) {
      setFromCity(draft.fromCity);
      setToCity(draft.toCity);
      setVias(draft.vias);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDidShow(() => setSubmitting(false));

  const errors = useMemo(() => validate(fromCity, toCity, vias), [fromCity, toCity, vias]);
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
    setAttempted(false);
  };

  const onSample = (s: QuerySample) => {
    setFromCity(s.fromCity);
    setToCity(s.toCity);
    setVias(s.vias.slice());
    setAttempted(false);
  };

  const onSearch = () => {
    if (submitting) return;
    setAttempted(true);
    if (problems.length) return;
    const from = clean(fromCity);
    const to = clean(toCity);
    const viaList = vias.map(clean);
    saveQueryDraft({ fromCity: from, toCity: to, vias: viaList });
    const q = [
      `from=${encodeURIComponent(from)}`,
      `to=${encodeURIComponent(to)}`,
      viaList.length ? `vias=${encodeURIComponent(viaList.join(','))}` : ''
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
  const viaFull = vias.length >= MAX_VIAS;

  return (
    <View className='q-page'>
      {/* 头部：天空渐变 + 远山 / 航迹 / 铁轨 */}
      <View className='q-hero'>
        <Image className='q-hero-scene' src={HERO_SCENE} mode='aspectFill' />
        <View className='q-hero-top'>
          <View className='q-brand-wrap'>
            <View className='q-brand-mark'>
              <View className='q-brand-mark-dot' />
            </View>
            <Text className='q-brand'>懂行</Text>
          </View>
        </View>
        <View className='q-hero-title-1'>直达之外，</View>
        <View className='q-hero-title-2'>
          <Text className='q-hero-title-2a'>帮你找</Text>
          <Text className='q-hero-title-2b'>更聪明的走法</Text>
        </View>
      </View>

      {/* 路线车票 */}
      <View className='q-ticket'>
        <View className='q-ticket-main'>
          <View className='q-row'>
            <View className='q-node-col'>
              <View className='q-track q-track-hidden' />
              <View className='q-node q-node-from'>
                <View className='q-node-core' />
              </View>
              <View className='q-track' />
            </View>
            <View className='q-row-body q-row-body-from'>
              <Text className='q-label'>出发</Text>
              <Input
                className='q-input'
                placeholder='出发城市'
                placeholderClass='q-placeholder'
                placeholderStyle={PLACEHOLDER_STYLE}
                maxlength={CITY_MAX_LEN}
                value={fromCity}
                onInput={(e) => setFromCity(e.detail.value)}
              />
              {renderError(shown.from)}
            </View>
            <View className='q-swap' hoverClass='q-swap-press' {...PRESS} onClick={onSwap}>
              <Text className='q-swap-icon'>⇅</Text>
            </View>
          </View>

          {vias.map((v, i) => (
            <View className='q-row q-row-enter' key={`via-${i}`}>
              <View className='q-node-col'>
                <View className='q-track' />
                <View className='q-node q-node-via'>
                  <Text className='q-node-num'>{i + 1}</Text>
                </View>
                <View className='q-track' />
              </View>
              <View className='q-row-body q-row-body-via'>
                <Text className='q-label q-label-via'>途经</Text>
                <Input
                  className='q-input q-input-via'
                  placeholder={`第 ${i + 1} 个途经城市`}
                  placeholderClass='q-placeholder'
                  placeholderStyle={PLACEHOLDER_STYLE}
                  maxlength={CITY_MAX_LEN}
                  value={v}
                  onInput={(e) => onChangeVia(i, e.detail.value)}
                />
                {renderError(shown.vias[i])}
              </View>
              <View className='q-row-actions'>
                {i > 0 ? (
                  <View className='q-mini' hoverClass='q-mini-press' {...PRESS} onClick={() => onMoveViaUp(i)}>
                    <Text className='q-mini-text'>↑</Text>
                  </View>
                ) : null}
                <View
                  className='q-mini q-mini-danger'
                  hoverClass='q-mini-press'
                  {...PRESS}
                  onClick={() => onRemoveVia(i)}
                >
                  <Text className='q-mini-text q-mini-text-danger'>✕</Text>
                </View>
              </View>
            </View>
          ))}

          <View className='q-row'>
            <View className='q-node-col'>
              <View className='q-track' />
              <View className='q-node q-node-to'>
                <View className='q-node-core q-node-core-to' />
              </View>
              <View className='q-track q-track-hidden' />
            </View>
            <View className='q-row-body q-row-body-last'>
              <Text className='q-label'>到达</Text>
              <Input
                className='q-input'
                placeholder='到达城市'
                placeholderClass='q-placeholder'
                placeholderStyle={PLACEHOLDER_STYLE}
                maxlength={CITY_MAX_LEN}
                value={toCity}
                onInput={(e) => setToCity(e.detail.value)}
              />
              {renderError(shown.to)}
            </View>
          </View>
        </View>

        {/* 撕口：两侧半圆缺口 + 虚线 */}
        <View className='q-perf'>
          <View className='q-notch q-notch-left' />
          <View className='q-perf-line' />
          <View className='q-notch q-notch-right' />
        </View>

        <View className='q-ticket-stub'>
          <View
            className={`q-add ${viaFull ? 'q-add-disabled' : ''}`}
            hoverClass={viaFull ? 'none' : 'q-add-press'}
            {...PRESS}
            onClick={onAddVia}
          >
            {viaFull ? null : (
              <View className='q-add-plus'>
                <Text className='q-add-plus-text'>+</Text>
              </View>
            )}
            <Text className='q-add-text'>{viaFull ? `最多 ${MAX_VIAS} 个途经城市` : '添加途经城市'}</Text>
          </View>
          {!isBlank ? (
            <View className='q-clear' hoverClass='q-clear-press' {...PRESS} onClick={onClear}>
              <Text className='q-clear-text'>清空</Text>
            </View>
          ) : null}
        </View>
      </View>

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
        className={`q-cta ${submitting ? 'q-cta-busy' : ''} ${attempted && problems.length ? 'q-cta-blocked' : ''}`}
        hoverClass='q-cta-press'
        {...PRESS}
        onClick={onSearch}
      >
        <Text className='q-cta-text'>{submitting ? '正在组合方案…' : '开始推荐'}</Text>
        {submitting ? null : (
          <View className='q-cta-arrow'>
            <Text className='q-cta-arrow-text'>→</Text>
          </View>
        )}
      </View>

      {/* 常用路线：票根 */}
      <View className='q-section'>
        <View className='q-section-bar' />
        <Text className='q-section-title'>常用路线</Text>
      </View>
      <View className='q-stubs'>
        {QUERY_SAMPLES.map((s) => {
          const theme = ROUTE_THEMES[s.key] || ROUTE_THEMES['xz-lxa'];
          return (
            <View
              key={s.key}
              className='q-stub'
              hoverClass='q-stub-press'
              {...PRESS}
              onClick={() => onSample(s)}
            >
              <View className={`q-stub-side q-tone-${theme.tone}`}>
                <Image className='q-stub-icon' src={theme.icon} mode='aspectFit' />
              </View>
              <View className='q-stub-cut'>
                <View className='q-stub-hole q-stub-hole-top' />
                <View className='q-stub-hole q-stub-hole-bottom' />
              </View>
              <View className='q-stub-body'>
                <View className='q-stub-od'>
                  <Text className='q-stub-city'>{s.fromCity}</Text>
                  <Text className='q-stub-arrow'>→</Text>
                  <Text className='q-stub-city'>{s.toCity}</Text>
                </View>
                {s.vias.length ? (
                  <View className='q-stub-vias'>
                    {s.vias.map((v) => (
                      <View key={v} className={`q-stub-via q-tone-soft-${theme.tone}`}>
                        <View className={`q-stub-via-dot q-tone-${theme.tone}`} />
                        <Text className={`q-stub-via-text q-tone-text-${theme.tone}`}>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className='q-stub-line'>
                    <View className={`q-stub-line-bar q-tone-${theme.tone}`} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
