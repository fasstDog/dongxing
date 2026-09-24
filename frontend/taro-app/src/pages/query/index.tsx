import { useState } from 'react';
import { View, Text, Input, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Disclaimer from '../../components/Disclaimer';
import { getDongxingGlobal } from '../../app';
import './index.scss';

const SAMPLES: Record<string, { fromCity: string; toCity: string }> = {
  xz: { fromCity: '徐州', toCity: '拉萨' },
  sh: { fromCity: '上海', toCity: '成都' },
  bj: { fromCity: '北京', toCity: '武汉' },
  cd: { fromCity: '成都', toCity: '重庆' }
};

export default function QueryPage() {
  const [fromCity, setFromCity] = useState('徐州');
  const [toCity, setToCity] = useState('拉萨');
  const [dateFlexible, setDateFlexible] = useState(true);
  const [date, setDate] = useState('2026-10-01');
  const [vias, setVias] = useState<string[]>([]);
  const [demoEmpty, setDemoEmpty] = useState(false);
  const [demoError, setDemoError] = useState(false);

  const toast = (msg: string) => Taro.showToast({ title: msg, icon: 'none' });

  const onAddVia = () => {
    if (vias.length >= 3) {
      toast('途经最多 3 个');
      return;
    }
    setVias([...vias, vias.length === 0 ? '西宁' : '']);
  };

  const onRemoveVia = (i: number) => {
    const next = vias.slice();
    next.splice(i, 1);
    setVias(next);
  };

  const cleanedVias = () => vias.map((v) => String(v || '').trim()).filter(Boolean);

  const onSearch = () => {
    const from = String(fromCity || '').trim();
    const to = String(toCity || '').trim();
    if (!from || !to) {
      toast('先填出发地和目的地');
      return;
    }
    if (from === to) {
      toast('出发和到达不能是同一个地方');
      return;
    }
    const viaList = cleanedVias();
    if (viaList.length > 3) {
      toast('途经最多 3 个');
      return;
    }
    for (const v of viaList) {
      if (v === from || v === to) {
        toast('途经别和出发/到达重复');
        return;
      }
    }
    const query = {
      fromCity: from,
      toCity: to,
      dateFlexible,
      date: dateFlexible ? '' : date,
      vias: viaList,
      demoEmpty,
      demoError
    };
    getDongxingGlobal().lastQuery = query;
    const q = [
      `from=${encodeURIComponent(from)}`,
      `to=${encodeURIComponent(to)}`,
      `demoEmpty=${demoEmpty ? '1' : '0'}`,
      `demoError=${demoError ? '1' : '0'}`,
      viaList.length ? `vias=${encodeURIComponent(viaList.join(','))}` : ''
    ]
      .filter(Boolean)
      .join('&');
    Taro.navigateTo({ url: `/pages/results/index?${q}` });
  };

  const onSample = (key: string) => {
    const s = SAMPLES[key] || SAMPLES.xz;
    setFromCity(s.fromCity);
    setToCity(s.toCity);
    setVias([]);
    setDateFlexible(true);
    setDemoEmpty(false);
    setDemoError(false);
  };

  return (
    <View className='page query-page'>
      <View className='notice'>只推荐路线，不卖票。价格、时刻都是参考，不保证有票。</View>

      <View className='hero-row'>
        <View className='hero-block'>
          <Text className='hero-title'>帮你找到直达之外那条更聪明的路</Text>
          <Text className='hero-sub'>三主卡：最省钱 · 最快 · 最综合 · 计划来自引擎</Text>
        </View>
        <View className='about-link' onClick={() => Taro.navigateTo({ url: '/pages/about/index' })}>
          关于
        </View>
      </View>

      <View className='section-title'>去哪儿</View>
      <View className='panel'>
        <View className='field-row'>
          <Text className='label'>出发</Text>
          <Input
            className='input'
            placeholder='如 徐州'
            value={fromCity}
            onInput={(e) => setFromCity(e.detail.value)}
          />
        </View>
        <View className='field-row'>
          <Text className='label'>到达</Text>
          <Input
            className='input'
            placeholder='如 拉萨'
            value={toCity}
            onInput={(e) => setToCity(e.detail.value)}
          />
        </View>
      </View>

      <View className='section-title'>日期</View>
      <View className='panel'>
        <View className='field-row between'>
          <Text className='label'>日期灵活</Text>
          <Switch checked={dateFlexible} onChange={(e) => setDateFlexible(!!e.detail.value)} color='#1989fa' />
        </View>
        {dateFlexible ? (
          <View className='field-hint'>灵活，不锁死某一天</View>
        ) : (
          <View className='field-row'>
            <Text className='label'>出发日</Text>
            <Input className='input' placeholder='YYYY-MM-DD' value={date} onInput={(e) => setDate(e.detail.value)} />
          </View>
        )}
      </View>

      <View className='section-title'>途经（有序，最多 3）</View>
      <View className='panel'>
        {vias.map((v, i) => (
          <View className='field-row via-row' key={`via-${i}`}>
            <Text className='label'>途经{i + 1}</Text>
            <Input
              className='input'
              placeholder='途经城市'
              value={v}
              onInput={(e) => {
                const next = vias.slice();
                next[i] = e.detail.value;
                setVias(next);
              }}
            />
            <Text className='remove' onClick={() => onRemoveVia(i)}>
              删除
            </Text>
          </View>
        ))}
        <View
          className={`btn-ghost ${vias.length >= 3 ? 'disabled' : ''}`}
          onClick={vias.length >= 3 ? undefined : onAddVia}
        >
          + 添加途经城市
        </View>
        <View className='tiny-hint'>不填则系统自动选枢纽；最多 3 个。</View>
      </View>

      <View className='search-wrap'>
        <View className='btn-primary btn-block' onClick={onSearch}>
          开始推荐
        </View>
      </View>

      <View className='samples'>
        <Text className='samples-label'>样例</Text>
        {Object.entries(SAMPLES).map(([k, s]) => (
          <View key={k} className='sample-chip' onClick={() => onSample(k)}>
            {s.fromCity}→{s.toCity}
          </View>
        ))}
      </View>

      <View className='demo-switches'>
        <View className='demo-row'>
          <Text>演示：无方案</Text>
          <Switch
            checked={demoEmpty}
            color='#1989fa'
            onChange={(e) => {
              const on = !!e.detail.value;
              setDemoEmpty(on);
              if (on) setDemoError(false);
            }}
          />
        </View>
        <View className='demo-row'>
          <Text>演示：加载失败</Text>
          <Switch
            checked={demoError}
            color='#1989fa'
            onChange={(e) => {
              const on = !!e.detail.value;
              setDemoError(on);
              if (on) setDemoEmpty(false);
            }}
          />
        </View>
        <View className='tiny-hint'>仅原型用，默认关闭。</View>
      </View>

      <Disclaimer />
    </View>
  );
}
