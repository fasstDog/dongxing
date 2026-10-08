/**
 * 地点（城市 / 火车站 / 机场）检索：本地静态数据 + 预生成拼音。
 * 支持中文、拼音全拼、拼音首字母；按城市 / 火车站 / 机场分组。
 */
import Taro from '@tarojs/taro';
import data from '../data/places.json';

export type PlaceType = 'city' | 'station' | 'airport';

export type Place = {
  id: string;
  type: PlaceType;
  name: string;
  city: string;
  py: string[];
  code?: string;
  alias?: string;
  aliasPy?: string[];
  stations?: number;
  airports?: number;
  lat?: number;
  lng?: number;
};

/** 查询页字段里存的值：显示 name，请求引擎时用 city */
export type PlaceValue = { id: string; type: PlaceType; name: string; city: string };

export type Segment = { text: string; hit: boolean };

export type SearchHit = { place: Place; segments: Segment[]; score: number };

export type SearchGroup = { type: PlaceType; title: string; items: SearchHit[] };

const PLACES: Place[] = (data as { places: Place[] }).places;
const CITIES: Place[] = PLACES.filter((p) => p.type === 'city');
export const HOT_CITIES: string[] = (data as { hot: string[] }).hot;

export const TYPE_TITLE: Record<PlaceType, string> = { city: '城市', station: '火车站', airport: '机场' };
export const TYPE_BADGE: Record<PlaceType, string> = { city: '城', station: '站', airport: '机' };

const BY_NAME: Record<string, Place> = {};
PLACES.forEach((p) => {
  BY_NAME[p.name] = p;
});

export function toValue(p: Place): PlaceValue {
  return { id: p.id, type: p.type, name: p.name, city: p.city };
}

/** 按名称找地点；找不到就当作城市名（兼容旧的文本草稿 / 链接参数） */
export function placeFromName(name: string): PlaceValue | null {
  const n = String(name || '').trim();
  if (!n) return null;
  const hit = BY_NAME[n];
  if (hit) return toValue(hit);
  return { id: `city:${n}`, type: 'city', name: n, city: n };
}

const normalize = (q: string) => String(q || '').trim().toLowerCase().replace(/\s+/g, '');
const isAscii = (q: string) => /^[a-z]+$/.test(q);

/**
 * 在逐字拼音里找匹配：首字母连续匹配，或全拼前缀匹配，只允许从 starts 里的字位开始
 * （名称开头，或城市前缀之后，如 上海|虹桥站），避免「西站」这类中段误命中。
 * 返回命中的字区间 [a, b)
 */
function matchPinyin(py: string[], q: string, starts: number[] = [0]): [number, number] | null {
  const initials = py.map((s) => s.charAt(0)).join('');
  for (const i of starts) {
    if (initials.startsWith(q, i)) return [i, i + q.length];
  }
  for (const i of starts) {
    if (i >= py.length) continue;
    const rest = py.slice(i).join('');
    if (!rest.startsWith(q)) continue;
    let len = 0;
    let j = i;
    while (j < py.length && len < q.length) len += py[j++].length;
    return [i, j];
  }
  return null;
}

function segmentsOf(name: string, range: [number, number] | null): Segment[] {
  if (!range || range[0] < 0 || range[1] <= range[0]) return [{ text: name, hit: false }];
  const [a, b] = range;
  const segs: Segment[] = [];
  if (a > 0) segs.push({ text: name.slice(0, a), hit: false });
  segs.push({ text: name.slice(a, b), hit: true });
  if (b < name.length) segs.push({ text: name.slice(b), hit: false });
  return segs;
}

/** 简称区间映射回全名（简称是全名去掉城市前缀与「国际」后的结果） */
function aliasRangeInName(p: Place, a: number, b: number): [number, number] | null {
  if (!p.alias) return null;
  const part = p.alias.slice(a, b).replace('机场', '');
  if (!part) return null;
  const at = p.name.indexOf(part);
  return at >= 0 ? [at, at + part.length] : null;
}

function cityPinyinHit(cityName: string, q: string) {
  const c = CITIES.find((x) => x.name === cityName);
  if (!c) return false;
  const r = matchPinyin(c.py, q);
  return !!r && r[0] === 0;
}

function matchPlace(p: Place, q: string): SearchHit | null {
  const idx = p.name.indexOf(q);
  if (idx >= 0) return { place: p, segments: segmentsOf(p.name, [idx, idx + q.length]), score: idx === 0 ? 0 : 2 };
  if (p.alias) {
    const ai = p.alias.indexOf(q);
    if (ai >= 0) return { place: p, segments: segmentsOf(p.name, aliasRangeInName(p, ai, ai + q.length)), score: 3 };
  }
  if (p.city.indexOf(q) === 0) return { place: p, segments: segmentsOf(p.name, null), score: 4 };
  if (!isAscii(q)) return null;

  const starts = p.type !== 'city' && p.name.indexOf(p.city) === 0 ? [0, p.city.length] : [0];
  const r = matchPinyin(p.py, q, starts);
  if (r) return { place: p, segments: segmentsOf(p.name, r), score: r[0] === 0 ? 1 : 3 };
  if (p.aliasPy && p.alias) {
    const ra = matchPinyin(p.aliasPy, q);
    if (ra) return { place: p, segments: segmentsOf(p.name, aliasRangeInName(p, ra[0], ra[1])), score: 3 };
  }
  if (cityPinyinHit(p.city, q)) return { place: p, segments: segmentsOf(p.name, null), score: 4 };
  return null;
}

export function searchPlaces(raw: string): SearchGroup[] {
  const q = normalize(raw);
  if (!q) return [];
  let hits = PLACES.map((p) => matchPlace(p, q)).filter(Boolean) as SearchHit[];
  // 关键字已命中某城市（如 xz → 徐州）时，只保留该城市的站点/机场和开头命中的结果，压掉「北京西站」这类中段巧合
  const cities = hits.filter((h) => h.place.type === 'city' && h.score <= 1).map((h) => h.place.name);
  if (cities.length) hits = hits.filter((h) => h.score <= 1 || cities.indexOf(h.place.city) >= 0);
  const order: PlaceType[] = ['city', 'station', 'airport'];
  return order
    .map((type) => ({
      type,
      title: TYPE_TITLE[type],
      items: hits.filter((h) => h.place.type === type).sort((a, b) => a.score - b.score)
    }))
    .filter((g) => g.items.length > 0);
}

export function getCity(name: string): Place | undefined {
  return CITIES.find((c) => c.name === name);
}

/** 按坐标取本地数据里最近的城市（球面距离），不调外部逆地理 */
export function nearestCity(lat: number, lng: number): Place | null {
  const rad = (d: number) => (d * Math.PI) / 180;
  let best: Place | null = null;
  let bestD = Infinity;
  CITIES.forEach((c) => {
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
    const dLat = rad(c.lat - lat);
    const dLng = rad(c.lng - lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(c.lat)) * Math.sin(dLng / 2) ** 2;
    const d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  });
  return best;
}

// ---------------- 最近选择（本机存储，最多 8 条） ----------------
const RECENT_KEY = 'dongxing:recentPlaces';
const RECENT_MAX = 8;

export function loadRecent(): PlaceValue[] {
  try {
    const list = Taro.getStorageSync(RECENT_KEY);
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch (e) {
    return [];
  }
}

export function pushRecent(v: PlaceValue): PlaceValue[] {
  const next = [v, ...loadRecent().filter((x) => x.id !== v.id)].slice(0, RECENT_MAX);
  try {
    Taro.setStorageSync(RECENT_KEY, next);
  } catch (e) {
    // 存储不可用时忽略
  }
  return next;
}

export function clearRecent() {
  try {
    Taro.removeStorageSync(RECENT_KEY);
  } catch (e) {
    // ignore
  }
}

// ---------------- 选点回传（picker → 查询页） ----------------
export type PickField = 'from' | 'to' | 'via';
export type PendingPick = { field: PickField; index: number; value: PlaceValue };

let pending: PendingPick | null = null;

export function setPendingPick(p: PendingPick) {
  pending = p;
}

/** 取出并清空待回填的选择 */
export function takePendingPick(): PendingPick | null {
  const p = pending;
  pending = null;
  return p;
}
