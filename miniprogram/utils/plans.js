const adapt = require('./adapt-plans');

const OD_SAMPLES = [
  { key: 'xuzhou-lhasa', from: '徐州', to: '拉萨', label: '徐州 → 拉萨' },
  { key: 'shanghai-chengdu', from: '上海', to: '成都', label: '上海 → 成都' },
  { key: 'beijing-wuhan', from: '北京', to: '武汉', label: '北京 → 武汉' },
  { key: 'chengdu-chongqing', from: '成都', to: '重庆', label: '成都 → 重庆' }
];

module.exports = {
  OD_SAMPLES: OD_SAMPLES,
  TAG_TYPE: adapt.TAG_TYPE,
  loadAdaptedPlans: adapt.loadAdaptedPlans,
  findPlan: adapt.findPlan,
  adaptResponse: adapt.adaptResponse
};
