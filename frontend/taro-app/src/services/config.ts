/**
 * Taro 运行配置（与过渡小程序对齐）
 * - useRemoteApi=true：优先 POST {apiBase}/v1/plans/search
 * - 失败或关闭时回落 src/data/plans-*.json
 */
export const config = {
  useRemoteApi: true,
  apiBase: 'http://127.0.0.1:8787',
  apiTimeoutMs: 8000
};
