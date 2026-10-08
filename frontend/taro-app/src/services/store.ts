/**
 * 页面间共享的会话态（查询条件、最近一次方案）。
 * 注意：Taro 小程序构建会剥掉 app.ts 的具名导出，跨页共享状态必须放在独立模块里。
 */
import Taro from '@tarojs/taro';
import { placeFromName, type PlaceValue } from './places';

/** 查询页草稿：出发 / 到达 / 有序途经（城市、火车站或机场）。不指定日期，搜索按「日期灵活」处理。 */
export type QueryDraft = {
  from: PlaceValue | null;
  to: PlaceValue | null;
  vias: PlaceValue[];
};

export interface DongxingGlobal {
  lastQuery: QueryDraft | null;
  lastPlans: unknown[] | null;
  disclaimer: string;
}

const DISCLAIMER_TEXT = '只推荐路线，不卖票。价格、时刻都是参考，不保证有票。';
const QUERY_STORAGE_KEY = 'dongxing:lastQuery';

const state: DongxingGlobal = {
  lastQuery: null,
  lastPlans: null,
  disclaimer: DISCLAIMER_TEXT
};

export function getDongxingGlobal(): DongxingGlobal {
  return state;
}

/** 记住上次查询，下次打开查询页回填（仅本机存储，无登录）。 */
export function saveQueryDraft(q: QueryDraft) {
  state.lastQuery = q;
  try {
    Taro.setStorageSync(QUERY_STORAGE_KEY, q);
  } catch (e) {
    // 存储不可用时静默忽略，不影响查询
  }
}

const isPlace = (v: unknown): v is PlaceValue =>
  !!v && typeof v === 'object' && typeof (v as PlaceValue).name === 'string' && typeof (v as PlaceValue).city === 'string';

export function loadQueryDraft(): QueryDraft | null {
  if (state.lastQuery) return state.lastQuery;
  try {
    const q = Taro.getStorageSync(QUERY_STORAGE_KEY);
    if (!q || typeof q !== 'object') return null;
    // 旧版草稿（纯文本城市）兼容
    if (typeof q.fromCity === 'string') {
      return {
        from: placeFromName(q.fromCity),
        to: placeFromName(q.toCity || ''),
        vias: (Array.isArray(q.vias) ? q.vias : []).map(placeFromName).filter(isPlace).slice(0, 3)
      };
    }
    return {
      from: isPlace(q.from) ? q.from : null,
      to: isPlace(q.to) ? q.to : null,
      vias: (Array.isArray(q.vias) ? q.vias : []).filter(isPlace).slice(0, 3)
    };
  } catch (e) {
    return null;
  }
}
