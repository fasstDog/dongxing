# frontend/

| 路径 | 角色 |
|------|------|
| [`taro-app/`](taro-app/) | **生产 UI 源**：Taro + React + TS → 微信小程序 + React Native（**仅 iOS + Android**） |
| [`miniprogram/`](miniprogram/) | **过渡**：原生微信小程序（Vant Weapp），可立即在微信开发者工具打开；Taro weapp 就绪前保留 |
| [`app/`](app/) | RN 发布/壳占位（业务 UI 收敛到 `taro-app/`，不双开） |

共享契约：根级 [`packages/shared`](../packages/shared)（`@dongxing/shared`）。引擎 API：[`backend/engine`](../backend/engine)。

决策：[`docs/ADR-客户端-Taro一码多端.md`](../docs/ADR-客户端-Taro一码多端.md)。  
`prototype/`（仓根）为冻结 HTML 示意，**不是**本目录正式客户端。
