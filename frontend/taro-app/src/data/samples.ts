/**
 * 查询页「试试这些」样例。
 * 只列本地 mock（src/data/plans-*.json，引擎导出）里真实存在的 OD / 途经场景，
 * 不在客户端编造车次或票价。
 */
export type QuerySample = {
  key: string;
  fromCity: string;
  toCity: string;
  vias: string[];
  note: string;
};

export const QUERY_SAMPLES: QuerySample[] = [
  { key: 'xz-lxa', fromCity: '徐州', toCity: '拉萨', vias: [], note: '长线 · 系统选枢纽' },
  { key: 'xz-lxa-xn', fromCity: '徐州', toCity: '拉萨', vias: ['西宁'], note: '经西宁 · 长换乘可玩' },
  { key: 'cd-cq', fromCity: '成都', toCity: '重庆', vias: [], note: '短途 · 直达对比' },
  { key: 'cd-cq-sn', fromCity: '成都', toCity: '重庆', vias: ['遂宁'], note: '经遂宁 · 短换乘' }
];

export const MAX_VIAS = 3;
