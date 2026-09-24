import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import Disclaimer from '../../components/Disclaimer';
import { findPlan, type UiPlan } from '../../services/adapt';
import { getDongxingGlobal } from '../../app';
import './index.scss';

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
    const cached = ((getDongxingGlobal().lastPlans || []) as UiPlan[]).find((p) => p.id === planId);
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
    Taro.setNavigationBarTitle({
      title: found.typeLabel ? `详情 · ${found.typeLabel}` : '方案详情'
    });
    setPlan(found);
  }, [router.params]);

  const onBuy = () => {
    Taro.showToast({
      title: '我们不卖票。去 12306 / 航司 / OTA 自己买',
      icon: 'none',
      duration: 2500
    });
  };

  const onBackResults = () => {
    Taro.navigateBack({
      fail: () =>
        Taro.redirectTo({
          url: `/pages/results/index?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`
        })
    });
  };

  if (!plan) {
    return (
      <View className='page detail-page'>
        <View className='state-wrap'>
          <Text>方案找不到了，先回结果看看</Text>
          <View className='btn-primary' onClick={onBackResults}>
            回结果
          </View>
        </View>
        <Disclaimer />
      </View>
    );
  }

  return (
    <View className='page detail-page'>
      <View className={`header card-${plan.type}`}>
        <View className='tags'>
          <Text className={`type-pill type-${plan.type}`}>{plan.typeLabel}</Text>
          {plan.hasTransfer ? <Text className='chip'>换乘</Text> : null}
          {plan.hasFlight ? <Text className='chip chip-warn'>飞机</Text> : null}
        </View>
        <View className='price'>
          {plan.price}
          <Text className='price-note'>{plan.priceNote || '参考价'}</Text>
        </View>
        <View className='meta'>
          <Text>{plan.duration}</Text>
          <Text className='dot'>·</Text>
          <Text>换乘 {plan.transfers} 次</Text>
        </View>
        <View className='route'>{plan.routeOneLine}</View>
        {plan.vsDirect ? <View className='vs'>vs直达：{plan.vsDirect}</View> : null}
      </View>

      <View className='block-title'>怎么去</View>
      <View className='block timeline'>
        {plan.timeline.length ? (
          plan.timeline.map((item, index) =>
            item.isXfer ? (
              <View className='tl-item' key={`x-${index}`}>
                <View className='tl-badge xfer'>换</View>
                <View className='tl-body'>
                  <View className='tl-title'>
                    {item.city} · {item.xferLabel}
                  </View>
                  {item.buffer ? <View className='tl-desc'>空窗 {item.buffer}</View> : null}
                  <View className='tl-desc'>{item.tip}</View>
                </View>
              </View>
            ) : (
              <View className='tl-item' key={`l-${index}`}>
                <View className={`tl-badge ${item.isFlight ? 'flight' : 'train'}`}>{item.modeLabel}</View>
                <View className='tl-body'>
                  <View className='tl-title'>
                    {item.from} → {item.to}
                  </View>
                  <View className='tl-desc'>
                    {[item.serviceRef, item.duration, item.timeRange].filter(Boolean).join(' · ')}
                  </View>
                  {(item.seatHint || item.price) && (
                    <View className='tl-desc'>
                      {item.seatHint ? `席别参考：${item.seatHint}` : ''}
                      {item.price ? ` · 价格参考 ${item.price}` : ''}
                    </View>
                  )}
                </View>
              </View>
            )
          )
        ) : (
          <View className='muted pad'>暂时没有行程明细</View>
        )}
      </View>

      <View className='block-title'>为什么</View>
      <View className='block why'>{plan.whyDetail || plan.why}</View>

      {plan.play.length ? (
        <>
          <View className='block-title'>怎么玩</View>
          <View className='block'>
            {plan.play.map((item, i) => (
              <View className='play-item' key={`p-${i}`}>
                <Text className='play-name'>{item.name}</Text>
                <Text className='play-sub'>
                  {[item.distText, item.suggestText, item.ok].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : plan.playHint ? (
        <>
          <View className='block-title'>怎么玩</View>
          <View className='block muted'>{plan.playHint}</View>
        </>
      ) : null}

      <View className='block-title'>去购票</View>
      <View className='block'>
        <View className='buy-note'>我们不卖票。去 12306 / 航司 / OTA 自己买。价格、时刻都是参考，不保证有票。</View>
        {plan.buyLegs.map((item, i) => (
          <View className='buy-row' key={`b-${i}`}>
            <View className='buy-info'>
              <Text className='buy-title'>
                第 {i + 1} 段 · {item.name}
              </Text>
              <Text className='buy-sub'>{item.sub}</Text>
            </View>
            <View className='buy-cta' onClick={onBuy}>
              去购票
            </View>
          </View>
        ))}
      </View>

      <Disclaimer />
    </View>
  );
}
