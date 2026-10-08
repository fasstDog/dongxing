import Taro from '@tarojs/taro';
import { config } from './config';

export function searchPlansRemote(opts: {
  fromCity: string;
  toCity: string;
  vias?: string[];
  dateFlexible?: boolean;
  date?: string | null;
}) {
  const fromCity = String(opts.fromCity || '').trim();
  const toCity = String(opts.toCity || '').trim();
  const vias = Array.isArray(opts.vias) ? opts.vias.filter(Boolean) : [];
  const dateFlexible = opts.dateFlexible !== false;
  const date = !dateFlexible && opts.date ? String(opts.date).trim() : null;
  const base = String(config.apiBase || '').replace(/\/$/, '');

  if (!base) {
    return Promise.reject(new Error('API_BASE_EMPTY'));
  }

  return Taro.request({
    url: `${base}/v1/plans/search`,
    method: 'POST',
    timeout: config.apiTimeoutMs || 8000,
    header: { 'content-type': 'application/json' },
    data: {
      from_city: fromCity,
      to_city: toCity,
      date_flexible: dateFlexible,
      date: dateFlexible ? null : date,
      vias,
      path_mode: vias.length ? 'user' : 'auto'
    }
  }).then((res) => {
    const status = res.statusCode || 0;
    const body = res.data;
    if (status >= 200 && status < 300 && body && typeof body === 'object') {
      return body;
    }
    throw new Error(`API_HTTP_${status}`);
  });
}
