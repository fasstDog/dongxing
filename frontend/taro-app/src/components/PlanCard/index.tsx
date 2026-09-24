import { View, Text } from '@tarojs/components';
import type { UiPlan } from '../../services/adapt';
import './index.scss';

type Props = {
  plan: UiPlan;
  onOpen?: (id: string) => void;
};

const ACCENT: Record<string, string> = {
  cheap: '最省钱',
  fast: '最快',
  balanced: '最综合'
};

export default function PlanCard({ plan, onOpen }: Props) {
  return (
    <View className={`plan-card card-${plan.type}`} onClick={() => onOpen && onOpen(plan.id)}>
      <View className='plan-head'>
        <View className='tags'>
          <Text className={`type-pill type-${plan.type}`}>
            {plan.typeLabel || ACCENT[plan.type] || plan.type}
          </Text>
          {plan.hasTransfer ? <Text className='chip'>换乘</Text> : null}
          {plan.hasFlight ? <Text className='chip chip-warn'>飞机</Text> : null}
        </View>
        <View className='price-wrap'>
          <Text className='price'>{plan.price}</Text>
          <Text className='price-note'>{plan.priceNote || '参考价'}</Text>
        </View>
      </View>
      <View className='route'>{plan.routeOneLine}</View>
      <View className='meta'>
        <Text>{plan.duration}</Text>
        <Text className='dot'>·</Text>
        <Text>{plan.transfers} 次换乘</Text>
      </View>
      {plan.vsDirect ? <View className='vs'>vs直达：{plan.vsDirect}</View> : null}
      {plan.why ? <View className='why'>{plan.why}</View> : null}
      {plan.playHint ? <View className='hint'>怎么玩：{plan.playHint}</View> : null}
      <View className='card-foot'>点按看详情 · 只荐不卖</View>
    </View>
  );
}
