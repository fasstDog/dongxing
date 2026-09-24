import { useCallback, useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import PlanCard from '../../components/PlanCard';
import Disclaimer from '../../components/Disclaimer';
import { loadAdaptedPlans, type UiPlan } from '../../services/adapt';
import { getDongxingGlobal } from '../../app';
import './index.scss';

const LOADING_MS = 700;
const SAMPLE_OD: Record<string, { fromCity: string; toCity: string }> = {
  xz: { fromCity: '徐州', toCity: '拉萨' },
  sh: { fromCity: '上海', toCity: '成都' },
  bj: { fromCity: '北京', toCity: '武汉' },
  cd: { fromCity: '成都', toCity: '重庆' }
};

export default function ResultsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [plans, setPlans] = useState<UiPlan[]>([]);
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
  const [vias, setVias] = useState<string[]>([]);
  const [demoEmpty, setDemoEmpty] = useState(false);
  const [demoError, setDemoError] = useState(false);
  const [odLine, setOdLine] = useState('');
  const [notice, setNotice] = useState('');

  const applyOd = (from: string, to: string, viaList: string[], empty: boolean, error: boolean) => {
    setFromCity(from);
    setToCity(to);
    setVias(viaList);
    setDemoEmpty(empty);
    setDemoError(error);
    setOdLine(`${from} → ${to}${viaList.length ? `（途经 ${viaList.join('、')}）` : ''}`);
    setNotice(
      viaList.length
        ? `已记录途经：${viaList.join('、')}（样例仍按出发/到达出方案）`
        : '只推荐路线，不卖票。价格、时刻都是参考。'
    );
  };

  const runLoad = useCallback(
    (from: string, to: string, viaList: string[], empty: boolean, error: boolean) => {
      setStatus('loading');
      setPlans([]);
      setTimeout(() => {
        if (error) {
          setStatus('error');
          return;
        }
        if (empty) {
          setStatus('empty');
          return;
        }
        loadAdaptedPlans(from, to, { vias: viaList })
          .then((adapted: any) => {
            const main: UiPlan[] = (adapted && adapted.main) || [];
            const code = adapted && adapted.error && (adapted.error.code || adapted.error);
            if (adapted && adapted.ok === false && main.length === 0) {
              if (code === 'NO_FEASIBLE' || code === 'NO_LEGS' || !code) {
                setStatus('empty');
                return;
              }
              setStatus('error');
              return;
            }
            if (!main.length) {
              setStatus('empty');
              return;
            }
            getDongxingGlobal().lastPlans = main;
            setPlans(main);
            setStatus('ok');
          })
          .catch(() => setStatus('error'));
      }, LOADING_MS);
    },
    []
  );

  useEffect(() => {
    const from = decodeURIComponent(router.params.from || '徐州');
    const to = decodeURIComponent(router.params.to || '拉萨');
    const viasRaw = router.params.vias ? decodeURIComponent(router.params.vias) : '';
    const viaList = viasRaw ? viasRaw.split(',').filter(Boolean) : [];
    const empty = router.params.demoEmpty === '1';
    const error = router.params.demoError === '1';
    applyOd(from, to, viaList, empty, error);
    runLoad(from, to, viaList, empty, error);
  }, [router.params, runLoad]);

  const onBackQuery = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/query/index' }) });
  };

  const onEmptySample = (key: string) => {
    const s = SAMPLE_OD[key] || SAMPLE_OD.xz;
    applyOd(s.fromCity, s.toCity, [], false, false);
    runLoad(s.fromCity, s.toCity, [], false, false);
  };

  const onOpenDetail = (id: string) => {
    const q = [
      `id=${encodeURIComponent(id)}`,
      `from=${encodeURIComponent(fromCity)}`,
      `to=${encodeURIComponent(toCity)}`
    ].join('&');
    Taro.navigateTo({ url: `/pages/detail/index?${q}` });
  };

  return (
    <View className='page results-page'>
      {notice ? <View className='notice'>{notice}</View> : null}
      {odLine ? <View className='od-line'>{odLine}</View> : null}

      {status === 'loading' ? (
        <View className='state-wrap'>
          <Text className='loading-text'>正在组合方案…</Text>
          <Text className='state-sub'>最省钱 / 最快 / 最综合 · 只荐不卖</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View className='state-wrap'>
          <Text className='state-title'>这趟没查到，多半是数据暂不可用</Text>
          <Text className='state-sub'>价格、时刻都是参考，不保证有票。也可以改条件再查。</Text>
          <View
            className='btn-primary btn-block'
            onClick={() => runLoad(fromCity, toCity, vias, demoEmpty, demoError)}
          >
            再试一次
          </View>
          <View className='btn-ghost btn-block' onClick={onBackQuery}>
            改条件
          </View>
        </View>
      ) : null}

      {status === 'empty' ? (
        <View className='state-wrap'>
          <Text className='state-title'>这趟暂时拼不出方案</Text>
          <Text className='state-sub'>
            可能是城市名不好认、日期太偏，或这条线我们还没覆盖好。价格时刻都是参考，不保证有票。
          </Text>
          <View className='btn-ghost btn-block' onClick={onBackQuery}>
            改查询条件
          </View>
          {Object.entries(SAMPLE_OD).map(([k, s]) => (
            <View key={k} className='btn-ghost btn-block sample-btn' onClick={() => onEmptySample(k)}>
              看看示例：{s.fromCity}→{s.toCity}
            </View>
          ))}
        </View>
      ) : null}

      {status === 'ok' ? (
        <View>
          <View className='legend'>
            <Text className='lg cheap'>最省钱</Text>
            <Text className='lg fast'>最快</Text>
            <Text className='lg balanced'>最综合</Text>
          </View>
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} onOpen={onOpenDetail} />
          ))}
        </View>
      ) : null}

      <Disclaimer />
    </View>
  );
}
