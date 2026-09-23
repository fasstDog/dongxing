/**
 * 小程序运行配置（M1）
 * - useRemoteApi=true：优先 POST {apiBase}/v1/plans/search
 * - 失败或关闭时回落本地 data/plans-*.json
 *
 * 微信开发者工具：详情 → 本地设置 → 勾选「不校验合法域名…」
 * 真机调试需把 apiBase 换成可访问的局域网 IP / 已备案 HTTPS。
 */
module.exports = {
  useRemoteApi: true,
  apiBase: 'http://127.0.0.1:8787',
  apiTimeoutMs: 8000
};
