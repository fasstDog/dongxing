const TAG_TYPE = {
  cheap: 'success',
  fast: 'danger',
  balanced: 'primary'
};

Page({
  data: {
    loading: true,
    plans: [],
    odLine: '',
    notice: '',
    fromCity: '',
    toCity: '',
    vias: []
  },

  onLoad(options) {
    const fromCity = decodeURIComponent(options.from || '徐州');
    const toCity = decodeURIComponent(options.to || '拉萨');
    const viasRaw = options.vias ? decodeURIComponent(options.vias) : '';
    const vias = viasRaw ? viasRaw.split(',').filter(Boolean) : [];
    const viaPart = vias.length ? `（途经 ${vias.join('、')}）` : '';
    this.setData({
      fromCity,
      toCity,
      vias,
      odLine: `${fromCity} → ${toCity}${viaPart}`,
      notice: vias.length
        ? `已记录途经：${vias.join('、')}（当前仍展示徐州→拉萨 mock 三主卡）`
        : '当前展示 mock：徐州→拉萨 三主卡壳'
    });
    this.loadMock();
  },

  loadMock() {
    this.setData({ loading: true });
    // 短 loading，贴近 Web 原型体验；数据来自本地 JSON（无 API）
    const apply = (payload) => {
      const main = (((payload || {}).response || {}).main) || [];
      const plans = main.map((p) => ({
        ...p,
        tagType: TAG_TYPE[p.type] || 'primary'
      }));
      this.setData({ plans, loading: false });
    };

    try {
      // 优先 require 本地 mock（构建进包）
      // eslint-disable-next-line global-require
      const data = require('../../data/plans-xuzhou-lhasa.json');
      setTimeout(() => apply(data), 400);
    } catch (err) {
      // 回退：wx.request 本地路径在真机不可用；DevTools 可用相对路径时再试
      wx.request({
        url: '/data/plans-xuzhou-lhasa.json',
        success: (res) => apply(res.data),
        fail: () => {
          this.setData({ loading: false, plans: [] });
          wx.showToast({ title: 'mock 加载失败', icon: 'none' });
        }
      });
    }
  },

  onTapDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: `详情 stub：${id || ''}`,
      icon: 'none'
    });
  }
});
