import { useEffect, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { CRAFT_ICON } from '../../assets/place';
import Taro, { useRouter } from '@tarojs/taro';
import { loadAdaptedPlans } from '../../services/adapt';
import './index.scss';

const MIN_MS = 1200;
const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;

const dec = (s?: string) => {
  try {
    return decodeURIComponent(s || '');
  } catch (e) {
    return s || '';
  }
};

/** 与结果页一致：没有方案（拼不出 / 没有数据）不算失败，进结果页展示；其余错误留在本页重试 */
function isHardError(adapted: any): boolean {
  const main = (adapted && adapted.main) || [];
  if (main.length) return false;
  if (!adapted || adapted.ok !== false) return !adapted;
  const code = adapted.error && (adapted.error.code || adapted.error);
  if (!code || code === 'NO_FEASIBLE' || code === 'NO_LEGS' || code === 'empty') return false;
  return true;
}

export default function LoadingPage() {
  const router = useRouter();
  const fromCity = dec(router.params.from) || '徐州';
  const toCity = dec(router.params.to) || '拉萨';
  const fromName = dec(router.params.fromName) || fromCity;
  const toName = dec(router.params.toName) || toCity;
  const viaCities = dec(router.params.vias).split(',').filter(Boolean);
  const viaNames = dec(router.params.viaNames).split(',').filter(Boolean);
  const viaTypes = dec(router.params.viaTypes).split(',').filter(Boolean);
  const toType = dec(router.params.toType) || 'city';
  const stops = viaCities.map((city, i) => viaNames[i] || city);
  // 每一段的载具看「下一点」的类型：机场=飞机，码头=轮船，火车站/城市=火车
  const legDest = stops.map((_, i) => viaTypes[i] || 'city').concat(toType).slice(0, 4);
  const crafts = legDest.map((t) => (t === 'airport' || t === 'port' ? t : 'station'));
  const legs = Math.max(1, Math.min(4, crafts.length));

  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    const started = Date.now();
    const resultUrl = [
      `/pages/results/index?from=${encodeURIComponent(fromCity)}`,
      `to=${encodeURIComponent(toCity)}`,
      `fromName=${encodeURIComponent(fromName)}`,
      `toName=${encodeURIComponent(toName)}`,
      viaCities.length ? `vias=${encodeURIComponent(viaCities.join(','))}` : '',
      stops.length ? `viaNames=${encodeURIComponent(stops.join(','))}` : ''
    ]
      .filter(Boolean)
      .join('&');

    loadAdaptedPlans(fromCity, toCity, { vias: viaCities })
      .then((adapted) => ({ adapted, err: false }))
      .catch(() => ({ adapted: null, err: true }))
      .then((res) => {
        if (!alive) return;
        const wait = Math.max(0, MIN_MS - (Date.now() - started));
        setTimeout(() => {
          if (!alive) return;
          if (res.err || isHardError(res.adapted)) {
            setFailed(true);
            return;
          }
          Taro.redirectTo({ url: resultUrl });
        }, wait);
      });

    return () => {
      alive = false;
    };
    // 参数在进入页面时即固定；重试只靠 nonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <View className='ld-page'>
      <View className='ld-sky'>
        <View className='ld-sun' />
        <View className='ld-brand-wrap'>
          <View className='ld-brand-mark'>
            <View className='ld-brand-mark-dot' />
          </View>
          <Text className='ld-brand'>懂行</Text>
        </View>
      </View>

      <View className='ld-card'>
        <View className='ld-route'>
          <View className='ld-rail' />
          <View className={`ld-rail-fill ld-fill-${legs}`} />
          {crafts.map((kind, i) => (
            <View key={`craft-${i}`} className={`ld-craft ${i > 0 ? 'ld-craft-wait' : ''} ld-k-${legs}-${i}`}>
              <Image className='ld-craft-icon' src={CRAFT_ICON[kind]} mode='aspectFit' />
            </View>
          ))}

          <View className='ld-stop'>
            <View className='ld-dot ld-dot-from' />
            <Text className='ld-name'>{fromName}</Text>
          </View>
          {stops.map((name, i) => (
            <View className='ld-stop' key={`via-${i}`}>
              <View className={`ld-dot ld-dot-via ld-via-d${i + 1}`} />
              <Text className='ld-name ld-name-via'>{name}</Text>
            </View>
          ))}
          <View className='ld-stop'>
            <View className='ld-dot ld-dot-to' />
            <Text className='ld-name'>{toName}</Text>
          </View>
        </View>
      </View>

      {failed ? (
        <View className='ld-fail'>
          <Text className='ld-caption ld-caption-still'>这趟没组合出来</Text>
          <View className='ld-retry' hoverClass='ld-retry-press' {...PRESS} onClick={() => setNonce((n) => n + 1)}>
            <Text className='ld-retry-text'>再试一次</Text>
          </View>
        </View>
      ) : (
        <Text className='ld-caption'>正在为你组合走法…</Text>
      )}
    </View>
  );
}
