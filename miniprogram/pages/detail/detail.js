const Toast = require('@vant/weapp/toast/toast');
const { findPlan } = require('../../utils/adapt-plans');

Page({
  data: {
    plan: null,
    fromCity: '',
    toCity: ''
  },

  onLoad(options) {
    const planId = decodeURIComponent(options.id || '');
    const fromCity = decodeURIComponent(options.from || '徐州');
    const toCity = decodeURIComponent(options.to || '拉萨');
    const cached = ((getApp().globalData || {}).lastPlans || []).find(function (p) {
      return p.id === planId;
    });
    const plan = cached || findPlan(fromCity, toCity, planId);
    if (!plan) {
      Toast('方案找不到了，先回结果看看');
      this.setData({ plan: null, fromCity: fromCity, toCity: toCity });
      setTimeout(function () {
        wx.navigateBack({
          fail: function () {
            wx.redirectTo({
              url:
                '/pages/results/results?from=' +
                encodeURIComponent(fromCity) +
                '&to=' +
                encodeURIComponent(toCity)
            });
          }
        });
      }, 500);
      return;
    }
    wx.setNavigationBarTitle({
      title: plan.typeLabel ? '详情 · ' + plan.typeLabel : '方案详情'
    });
    this.setData({ plan: plan, fromCity: fromCity, toCity: toCity });
  },

  onBuy() {
    Toast({
      message: '将跳转12306/OTA，不卖票',
      duration: 2500
    });
  },

  onBackResults() {
    const fromCity = this.data.fromCity || '徐州';
    const toCity = this.data.toCity || '拉萨';
    wx.navigateBack({
      fail: function () {
        wx.redirectTo({
          url:
            '/pages/results/results?from=' +
            encodeURIComponent(fromCity) +
            '&to=' +
            encodeURIComponent(toCity)
        });
      }
    });
  }
});
