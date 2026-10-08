/**
 * 页面间共享的会话态（查询条件、最近一次方案）。
 * 注意：Taro 小程序构建会剥掉 app.ts 的具名导出，跨页共享状态必须放在独立模块里。
 */
import Taro from '@tarojs/taro';

/** 查询页草稿。不指定日期，搜索按「日期灵活」处理。 */
export type QueryDraft = {
  fromCity: string;
  toCity: string;
  vias: string[];
};

export interface DongxingGlobal {
  lastQuery: (QueryDraft & Record<string, unknown>) | null;
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

export function loadQueryDraft(): QueryDraft | null {
  if (state.lastQuery) return state.lastQuery;
  try {
    const q = Taro.getStorageSync(QUERY_STORAGE_KEY);
    if (q && typeof q === 'object' && typeof q.fromCity === 'string') {
      return {
        fromCity: q.fromCity || '',
        toCity: q.toCity || '',
        vias: Array.isArray(q.vias) ? q.vias.slice(0, 3) : []
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}
