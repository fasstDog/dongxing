Page({
  data: {
    fromCity: '徐州',
    toCity: '拉萨',
    vias: [],
    disclaimer: '只推荐不卖票 · 无登录/支付 · mock 数据'
  },

  onFromChange(e) {
    this.setData({ fromCity: e.detail });
  },

  onToChange(e) {
    this.setData({ toCity: e.detail });
  },

  onAddVia() {
    const vias = this.data.vias.slice();
    if (vias.length >= 3) {
      wx.showToast({ title: '途经最多 3 个', icon: 'none' });
      return;
    }
    vias.push('');
    this.setData({ vias });
  },

  onViaChange(e) {
    const index = e.currentTarget.dataset.index;
    const vias = this.data.vias.slice();
    vias[index] = e.detail;
    this.setData({ vias });
  },

  onRemoveVia(e) {
    const index = e.currentTarget.dataset.index;
    const vias = this.data.vias.slice();
    vias.splice(index, 1);
    this.setData({ vias });
  },

  onStart() {
    const fromCity = (this.data.fromCity || '').trim();
    const toCity = (this.data.toCity || '').trim();
    if (!fromCity || !toCity) {
      wx.showToast({ title: '请填写出发与到达', icon: 'none' });
      return;
    }
    const vias = this.data.vias.map((v) => (v || '').trim()).filter(Boolean);
    const query = [
      `from=${encodeURIComponent(fromCity)}`,
      `to=${encodeURIComponent(toCity)}`,
      vias.length ? `vias=${encodeURIComponent(vias.join(','))}` : ''
    ]
      .filter(Boolean)
      .join('&');
    wx.navigateTo({ url: `/pages/results/results?${query}` });
  }
});
