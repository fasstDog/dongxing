/**
 * 当前定位 → 本地最近城市（不调外部逆地理服务）。
 */
import Taro from '@tarojs/taro';
import { nearestCity, type Place } from './places';

export type LocateError = 'denied' | 'failed';

function isDenied(err: unknown) {
  const msg = String((err && (err as { errMsg?: string }).errMsg) || (err as Error)?.message || err || '').toLowerCase();
  return /auth|deny|denied|permission|privacy/.test(msg) || (err as { code?: number })?.code === 1;
}

export function locateCity(): Promise<Place> {
  return new Promise((resolve, reject) => {
    Taro.getLocation({
      type: 'wgs84',
      success: (res) => {
        const city = nearestCity(res.latitude, res.longitude);
        if (city) resolve(city);
        else reject('failed' as LocateError);
      },
      fail: (err) => reject((isDenied(err) ? 'denied' : 'failed') as LocateError)
    });
  });
}

/** 用户拒绝过授权时，引导去设置页重新打开（仅小程序有效，其它端直接返回） */
export function openLocationSetting(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.env.TARO_ENV !== 'weapp') {
      resolve(false);
      return;
    }
    Taro.openSetting({
      success: (res) => resolve(!!(res.authSetting && res.authSetting['scope.userLocation'])),
      fail: () => resolve(false)
    });
  });
}
