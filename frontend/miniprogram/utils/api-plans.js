const config = require('./config');

function searchPlansRemote(opts) {
  const fromCity = String((opts && opts.fromCity) || '').trim();
  const toCity = String((opts && opts.toCity) || '').trim();
  const vias = Array.isArray(opts && opts.vias)
    ? opts.vias.map(function (v) { return String(v || '').trim(); }).filter(Boolean)
    : [];
  const dateFlexible = opts && opts.dateFlexible !== false;
  const date = opts && opts.date ? String(opts.date).trim() : null;
  const base = String(config.apiBase || '').replace(/\/$/, '');

  return new Promise(function (resolve, reject) {
    if (!base) {
      reject(new Error('API_BASE_EMPTY'));
      return;
    }
    wx.request({
      url: base + '/v1/plans/search',
      method: 'POST',
      timeout: config.apiTimeoutMs || 8000,
      header: { 'content-type': 'application/json' },
      data: {
        from_city: fromCity,
        to_city: toCity,
        date_flexible: dateFlexible,
        date: dateFlexible ? null : date,
        vias: vias,
        path_mode: vias.length ? 'user' : 'auto'
      },
      success: function (res) {
        const status = res.statusCode || 0;
        const body = res.data;
        if (status >= 200 && status < 300 && body && typeof body === 'object') {
          resolve(body);
          return;
        }
        reject(new Error('API_HTTP_' + status));
      },
      fail: function (err) {
        reject(err || new Error('API_NETWORK'));
      }
    });
  });
}

module.exports = {
  searchPlansRemote: searchPlansRemote
};
