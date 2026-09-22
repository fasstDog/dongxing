const { loadAdaptedPlans } = require('../../utils/adapt-plans');

const LOADING_MS = 700;

Page({
  data: {
    status: 'loading', // loading | ok | empty | error
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
    const demoEmpty = options.demoEmpty === '1';
    const demoError = options.demoError === '1';
    const viaPart = vias.length ? '（途经 ' + vias.join('、') + '）' : '';
    this.setData({
      fromCity: fromCity,
      toCity: toCity,
      vias: vias,
      demoEmpty: demoEmpty,
      demoError: demoError,
      odLine: fromCity + ' → ' + toCity + viaPart,
      notice: vias.length
        ? '已记录途经：' + vias.join('、') + '（本脚手架仍按 OD 读 mock 三主卡）'
        : '只推荐不卖票 · mock 三主卡'
    });
    this.runLoad();
  },

  runLoad() {
    const fromCity = this.data.fromCity;
    const toCity = this.data.toCity;
    this.setData({ status: 'loading', plans: [] });

    const finish = (status, plans) => {
      this.setData({
        status: status,
        plans: plans || []
      });
    };

    setTimeout(() => {
      if (this.data.demoError) {
        finish('error', []);
        return;
      }
      if (this.data.demoEmpty) {
        finish('empty', []);
        return;
      }
      loadAdaptedPlans(fromCity, toCity)
        .then((adapted) => {
          if (!adapted.ok) {
            finish('error', []);
            return;
          }
          if (!adapted.main || !adapted.main.length) {
            finish('empty', []);
            return;
          }
          finish('ok', adapted.main);
        })
        .catch(() => {
          finish('error', []);
        });
    }, LOADING_MS);
  },

  onRetry() {
    this.runLoad();
  },

  onBackQuery() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({ url: '/pages/query/query' });
      }
    });
  },

  onEmptySample(e) {
    const od = e.currentTarget.dataset.od;
    let fromCity = '徐州';
    let toCity = '拉萨';
    if (od === 'sh') {
      fromCity = '上海';
      toCity = '成都';
    }
    this.setData({
      fromCity: fromCity,
      toCity: toCity,
      vias: [],
      demoEmpty: false,
      demoError: false,
      odLine: fromCity + ' → ' + toCity,
      notice: '示例 OD · mock 三主卡'
    });
    getApp().globalData.lastQuery = {
      fromCity: fromCity,
      toCity: toCity,
      vias: [],
      demoEmpty: false,
      demoError: false
    };
    this.runLoad();
  }
});
