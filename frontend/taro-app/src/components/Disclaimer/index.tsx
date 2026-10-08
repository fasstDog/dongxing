import { View } from '@tarojs/components';

type Props = { text?: string };

export default function Disclaimer({ text }: Props) {
  return (
    <View className='disclaimer'>
      {text || '只推荐路线，不卖票。价格、时刻都是参考，不保证有票。'}
    </View>
  );
}
