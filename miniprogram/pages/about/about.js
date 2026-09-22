const Toast = require('@vant/weapp/toast/toast');

const DATA_NOTE =
  '数据说明：当前为静态 mock 方案（徐拉 / 沪蓉 / 京广等样例）。价格、时刻、席别均为参考，不保证有票；以 12306 / 航司 / OTA 为准。合规真源接入前禁止违规爬取。只推荐路线，不卖票。';

Page({
  data: {
    versionHint: 'v0.2.0-miniprogram · 原型演示 · 静态 mock · 无后端'
  },

  onCopyDataNote() {
    wx.setClipboardData({
      data: DATA_NOTE,
      success: () => Toast.success('已复制数据说明'),
      fail: () => Toast('复制失败，请长按文案自行复制')
    });
  }
});
