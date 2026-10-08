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
};

export const QUERY_SAMPLES: QuerySample[] = [
  { key: 'xz-lxa', fromCity: '徐州', toCity: '拉萨', vias: [] },
  { key: 'xz-lxa-xn', fromCity: '徐州', toCity: '拉萨', vias: ['西宁'] },
  { key: 'cd-cq', fromCity: '成都', toCity: '重庆', vias: [] },
  { key: 'cd-cq-sn', fromCity: '成都', toCity: '重庆', vias: ['遂宁'] }
];

export const MAX_VIAS = 3;
