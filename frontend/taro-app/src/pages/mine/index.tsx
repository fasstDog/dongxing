import { View, Text, Image } from '@tarojs/components';
import { HERO_SCENE } from '../../assets/decor';
import './index.scss';

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
    </View>
  );
}
