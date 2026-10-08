import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { HERO_SCENE } from '../../assets/decor';
import './index.scss';

const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;

type MineItem = { key: string; title: string; url: string };

const ITEMS: MineItem[] = [{ key: 'about', title: '关于懂行', url: '/pages/about/index' }];

export default function MinePage() {
  return (
    <View className='m-page'>
      <View className='m-hero'>
        <Image className='m-hero-scene' src={HERO_SCENE} mode='aspectFill' />
        <View className='m-profile'>
          <View className='m-avatar'>
            <View className='m-avatar-dot' />
          </View>
          <Text className='m-name'>懂行</Text>
        </View>
      </View>

      <View className='m-card'>
        {ITEMS.map((item, i) => (
          <View
            key={item.key}
            className={`m-item ${i === ITEMS.length - 1 ? 'm-item-last' : ''}`}
            hoverClass='m-item-press'
            {...PRESS}
            onClick={() => Taro.navigateTo({ url: item.url })}
          >
            <View className='m-item-icon'>
              <View className='m-item-icon-dot' />
            </View>
            <Text className='m-item-title'>{item.title}</Text>
            <Text className='m-item-arrow'>›</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
