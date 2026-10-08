import { View, Text } from '@tarojs/components';
import { DISCLAIMER } from '@dongxing/shared';
import Disclaimer from '../../components/Disclaimer';
import './index.scss';

export default function AboutPage() {
  return (
    <View className='page about-page'>
      <View className='panel'>
        <View className='panel-title'>懂行是什么？</View>
        <View className='p'>
          填出发地和目的地（途经城市可选），帮你拼比直达更划算或更好受的走法：高铁 / 动车 / 飞机怎么搭。说清楚怎么去、为什么这样推；换乘空得够长，再告诉你怎么玩。
        </View>
        <View className='p'>
          <Text className='strong'>只推荐路线，不卖票。</Text>
          分段「去购票」跳去 12306 / 航司 / OTA；票价、时刻、有没有票，都以那边为准。
        </View>
      </View>

      <View className='panel'>
        <View className='panel-title'>免责声明</View>
        <View className='li'>这里展示的价格、时刻、席别都是参考，不承诺能买到。</View>
        <View className='li'>我们不卖票、不收款、不帮抢票、也不管退改签。</View>
        <View className='li'>换乘空窗和景点建议仅供参考；接驳和安检时间自己多留点，以现场为准。</View>
        <View className='li'>高原线请自己掂量身体，并核对进藏政策。</View>
      </View>

      <Disclaimer text={`只推荐路线，不卖票。${DISCLAIMER}`} />
    </View>
  );
}
