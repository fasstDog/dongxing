const Toast = require('@vant/weapp/toast/toast');

Page({
  data: {
    fromCity: '徐州',
    toCity: '拉萨',
    dateFlexible: true,
    date: '2026-10-01',
    vias: [],
    demoEmpty: false,
    demoError: false,
    disclaimer: '只推荐路线，不卖票。价格与时刻为参考 mock。'
  },

  onFromChange(e) {
    this.setData({ fromCity: e.detail });
  },
  onToChange(e) {
    this.setData({ toCity: e.detail });
  },
  onDateChange(e) {
    this.setData({ date: e.detail });
  },
  onFlexibleChange(e) {
    this.setData({ dateFlexible: !!e.detail });
  },

  onViaChange(e) {
    const i = e.currentTarget.dataset.index;
    const vias = this.data.vias.slice();
    vias[i] = e.detail;
    this.setData({ vias: vias });
  },
  onAddVia() {
    if (this.data.vias.length >= 3) {
      Toast('途经最多 3 个');
      return;
    }
    const vias = this.data.vias.slice();
    vias.push(vias.length === 0 ? '西宁' : '');
    this.setData({ vias: vias });
  },
  onRemoveVia(e) {
    const i = e.currentTarget.dataset.index;
    const vias = this.data.vias.slice();
    vias.splice(i, 1);
    this.setData({ vias: vias });
  },

  onDemoEmpty(e) {
    const on = !!e.detail;
    this.setData({
      demoEmpty: on,
      demoError: on ? false : this.data.demoError
    });
  },
  onDemoError(e) {
    const on = !!e.detail;
    this.setData({
      demoError: on,
      demoEmpty: on ? false : this.data.demoEmpty
    });
  },

  onSample(e) {
    const od = e.currentTarget.dataset.od;
    if (od === 'sh') {
      this.setData({
        fromCity: '上海',
        toCity: '成都',
        vias: [],
        dateFlexible: true,
        demoEmpty: false,
        demoError: false
      });
    } else {
      this.setData({
        fromCity: '徐州',
        toCity: '拉萨',
        vias: [],
        dateFlexible: true,
        demoEmpty: false,
        demoError: false
      });
    }
  },

  cleanedVias() {
    return this.data.vias
      .map(function (v) {
        return String(v || '').trim();
      })
      .filter(Boolean);
  },

  onSearch() {
    const fromCity = String(this.data.fromCity || '').trim();
    const toCity = String(this.data.toCity || '').trim();
    if (!fromCity || !toCity) {
      Toast('先填出发地和目的地');
      return;
    }
    if (fromCity === toCity) {
      Toast('出发和到达不能是同一个地方');
      return;
    }
    const vias = this.cleanedVias();
    if (vias.length > 3) {
      Toast('途经最多 3 个');
      return;
    }
    for (let i = 0; i < vias.length; i++) {
      if (vias[i] === fromCity || vias[i] === toCity) {
        Toast('途经别和出发/到达重复');
        return;
      }
    }

    const query = {
      fromCity: fromCity,
      toCity: toCity,
      dateFlexible: this.data.dateFlexible,
      date: this.data.dateFlexible ? '' : this.data.date,
      vias: vias,
      demoEmpty: this.data.demoEmpty,
      demoError: this.data.demoError
    };
    getApp().globalData.lastQuery = query;

    const q = [
      'from=' + encodeURIComponent(fromCity),
      'to=' + encodeURIComponent(toCity),
      'demoEmpty=' + (query.demoEmpty ? '1' : '0'),
      'demoError=' + (query.demoError ? '1' : '0'),
      vias.length ? 'vias=' + encodeURIComponent(vias.join(',')) : ''
    ]
      .filter(Boolean)
      .join('&');
    wx.navigateTo({ url: '/pages/results/results?' + q });
  }
});
