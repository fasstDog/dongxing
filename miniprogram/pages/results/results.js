const { loadAdaptedPlans } = require('../../utils/adapt-plans');

const LOADING_MS = 700;
const SAMPLE_OD = {
  xz: { fromCity: '徐州', toCity: '拉萨' },
  sh: { fromCity: '上海', toCity: '成都' },
  bj: { fromCity: '北京', toCity: '武汉' },
  cd: { fromCity: '成都', toCity: '重庆' }
};

Page({
  data: {
    status: 'loading',
    plans: [],
    odLine: '',
    notice: '',
    fromCity: '',
    toCity: '',
    vias: [],
    demoEmpty: false,
    demoError: false
  },

  onLoad(options) {
    const fromCity = decodeURIComponent(options.from || '徐州');
    const toCity = decodeURIComponent(options.to || '拉萨');
    const viasRaw = options.vias ? decodeURIComponent(options.vias) : '';
    const vias = viasRaw ? viasRaw.split(',').filter(Boolean) : [];
    this.setData({
      fromCity: fromCity,
      toCity: toCity,
      vias: vias,
      demoEmpty: options.demoEmpty === '1',
      demoError: options.demoError === '1',
      odLine: fromCity + ' → ' + toCity + (vias.length ? '（途经 ' + vias.join('、') + '）' : ''),
      notice: vias.length
        ? '已记录途经：' + vias.join('、') + '（样例仍按出发/到达出方案）'
        : '只推荐路线，不卖票。价格、时刻都是参考。'
    });
    this.runLoad();
  },

  runLoad() {
    const fromCity = this.data.fromCity;
    const toCity = this.data.toCity;
    this.setData({ status: 'loading', plans: [] });
    setTimeout(() => {
      if (this.data.demoError) {
        this.setData({ status: 'error', plans: [] });
        return;
      }
      if (this.data.demoEmpty) {
        this.setData({ status: 'empty', plans: [] });
        return;
      }
      loadAdaptedPlans(fromCity, toCity)
        .then((adapted) => {
          if (!adapted.ok) {
            this.setData({ status: 'error', plans: [] });
            return;
          }
          if (!adapted.main || !adapted.main.length) {
            this.setData({ status: 'empty', plans: [] });
            return;
          }
          getApp().globalData.lastPlans = adapted.main;
          this.setData({ status: 'ok', plans: adapted.main });
        })
        .catch(() => this.setData({ status: 'error', plans: [] }));
    }, LOADING_MS);
  },

  onRetry() { this.runLoad(); },

  onBackQuery() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/query/query' })
    });
  },

  onEmptySample(e) {
    const s = SAMPLE_OD[e.currentTarget.dataset.od] || SAMPLE_OD.xz;
    this.setData({
      fromCity: s.fromCity,
      toCity: s.toCity,
      vias: [],
      demoEmpty: false,
      demoError: false,
      odLine: s.fromCity + ' → ' + s.toCity,
      notice: '示例路线 · 只推荐不卖票'
    });
    this.runLoad();
  },

  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const q = [
      'id=' + encodeURIComponent(id),
      'from=' + encodeURIComponent(this.data.fromCity),
      'to=' + encodeURIComponent(this.data.toCity)
    ].join('&');
    wx.navigateTo({ url: '/pages/detail/detail?' + q });
  }
});
