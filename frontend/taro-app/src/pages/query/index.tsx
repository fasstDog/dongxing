import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { loadQueryDraft, saveQueryDraft } from '../../services/store';
import { TYPE_TITLE, placeFromName, takePendingPick, type PickField, type PlaceValue } from '../../services/places';
import { QUERY_SAMPLES, MAX_VIAS, type QuerySample } from '../../data/samples';
import { HERO_SCENE, ROUTE_THEMES } from '../../assets/decor';
import { PLACE_ICON } from '../../assets/place';
import './index.scss';

type FieldErrors = {
  from?: string;
  to?: string;
  vias: Record<number, string>;
};

type Slot = PlaceValue | null;

/** 按压反馈：hover-class 在小程序 / H5 / RN 均可用 */
const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;

function validate(from: Slot, to: Slot, vias: Slot[]): FieldErrors {
  const errs: FieldErrors = { vias: {} };
  if (!from) errs.from = '选一下出发地';
  if (!to) errs.to = '选一下目的地';
  if (from && to && from.city === to.city) errs.to = '出发和到达在同一个城市';
  vias.forEach((v, i) => {
    if (!v) {
      errs.vias[i] = `途经 ${i + 1} 还没选，选上或删掉`;
      return;
    }
    if ((from && v.city === from.city) || (to && v.city === to.city)) {
      errs.vias[i] = '途经别和出发 / 到达在同一个城市';
      return;
    }
    const dup = vias.findIndex((other, j) => j < i && !!other && other.city === v.city);
    if (dup >= 0) errs.vias[i] = `和途经 ${dup + 1} 在同一个城市`;
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
  const [from, setFrom] = useState<Slot>(() => placeFromName('徐州'));
  const [to, setTo] = useState<Slot>(() => placeFromName('拉萨'));
  const [vias, setVias] = useState<Slot[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 预填：链接参数 > 上次查询 > 默认样例
  useEffect(() => {
    const p = router.params || {};
    if (p.from !== undefined || p.to !== undefined) {
      setFrom(placeFromName(decodeURIComponent(p.from || '')));
      setTo(placeFromName(decodeURIComponent(p.to || '')));
      const v = p.vias ? decodeURIComponent(p.vias).split(',') : [];
      setVias(v.slice(0, MAX_VIAS).map(placeFromName));
      if (p.check === '1') setAttempted(true);
      return;
    }
    const draft = loadQueryDraft();
    if (draft) {
      setFrom(draft.from);
      setTo(draft.to);
      setVias(draft.vias);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 从地点搜索页回来：回填对应字段
  useDidShow(() => {
    setSubmitting(false);
    const pick = takePendingPick();
    if (!pick) return;
    if (pick.field === 'from') setFrom(pick.value);
    else if (pick.field === 'to') setTo(pick.value);
    else
      setVias((prev) => {
        const next = prev.slice();
        if (pick.index >= next.length) {
          if (next.length < MAX_VIAS) next.push(pick.value);
        } else next[pick.index] = pick.value;
        return next;
      });
  });

  const errors = useMemo(() => validate(from, to, vias), [from, to, vias]);
  const shown: FieldErrors = attempted ? errors : { vias: {} };
  const problems = errorList(errors);
  const isBlank = !from && !to && vias.length === 0;

  const toast = (title: string) => Taro.showToast({ title, icon: 'none' });

  const openPicker = (field: PickField, index = 0) => {
    Taro.navigateTo({ url: `/pages/place-picker/index?field=${field}&index=${index}` });
  };

  const onSwap = () => {
    if (!from && !to) return;
    setFrom(to);
    setTo(from);
    if (vias.length > 1) {
      setVias(vias.slice().reverse());
      toast('起终点已交换，途经顺序也反过来了');
    }
  };

  // 添加途经：直接进地点搜索，选中后才新增一行
  const onAddVia = () => {
    if (vias.length >= MAX_VIAS) {
      toast(`途经最多 ${MAX_VIAS} 个`);
      return;
    }
    openPicker('via', vias.length);
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

  const onClear = () => {
    setFrom(null);
    setTo(null);
    setVias([]);
    setAttempted(false);
  };

  const onSample = (s: QuerySample) => {
    setFrom(placeFromName(s.fromCity));
    setTo(placeFromName(s.toCity));
    setVias(s.vias.map(placeFromName));
    setAttempted(false);
  };

  const onSearch = () => {
    if (submitting) return;
    setAttempted(true);
    if (problems.length || !from || !to) return;
    const viaList = vias.filter(Boolean) as PlaceValue[];
    saveQueryDraft({ from, to, vias: viaList });
    // 引擎契约按城市查询：选了车站 / 机场时传其所属城市
    const q = [
      `from=${encodeURIComponent(from.city)}`,
      `to=${encodeURIComponent(to.city)}`,
      viaList.length ? `vias=${encodeURIComponent(viaList.map((v) => v.city).join(','))}` : ''
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

  /** 字段显示：左侧类型图标（浅色底圆角块），名称下方「类型 · 所属城市」；未选时灰色虚线占位 */
  const renderValue = (v: Slot, placeholder: string, via = false) => (
    <View className={`q-field ${via ? 'q-field-via' : ''}`}>
      {v ? (
        <View className={`q-ptile q-ptile-${v.type} ${via ? 'q-ptile-via' : ''}`}>
          <Image className={`q-ptile-icon ${via ? 'q-ptile-icon-via' : ''}`} src={PLACE_ICON[v.type]} mode='aspectFit' />
        </View>
      ) : (
        <View className={`q-ptile q-ptile-empty ${via ? 'q-ptile-via' : ''}`} />
      )}
      <View className='q-field-main'>
        {v ? (
          <Text className={`q-field-text ${via ? 'q-field-text-via' : ''}`}>{v.name}</Text>
        ) : (
          <Text className={`q-field-ph ${via ? 'q-field-ph-via' : ''}`}>{placeholder}</Text>
        )}
        {v ? (
          <Text className={`q-field-sub q-field-sub-${v.type}`}>
            {v.type === 'city' || !v.city ? TYPE_TITLE[v.type] : `${TYPE_TITLE[v.type]} · ${v.city}`}
          </Text>
        ) : null}
      </View>
    </View>
  );

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
            <View className='q-row-body q-row-body-from' hoverClass='q-row-body-press' {...PRESS} onClick={() => openPicker('from')}>
              <Text className='q-label'>出发</Text>
              {renderValue(from, '出发地')}
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
              <View className='q-row-body q-row-body-via' hoverClass='q-row-body-press' {...PRESS} onClick={() => openPicker('via', i)}>
                <Text className='q-label q-label-via'>途经</Text>
                {renderValue(v, `第 ${i + 1} 个途经地`, true)}
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
            <View className='q-row-body q-row-body-last' hoverClass='q-row-body-press' {...PRESS} onClick={() => openPicker('to')}>
              <Text className='q-label'>到达</Text>
              {renderValue(to, '目的地')}
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
