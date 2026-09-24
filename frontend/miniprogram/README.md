# 懂行 · 微信小程序（过渡）

基于 **Vant Weapp**（`@vant/weapp`）的原生小程序壳：**查询 → 三主卡结果 → 方案详情 → 关于**。  
读本地 mock JSON，可选接 `POST /v1/plans/search`。**无登录 / 无支付**。

> **只推荐路线，不卖票。**「去购票」仅 Toast 示意跳转 12306/OTA。

## 状态：transitional（过渡）

| 项 | 说明 |
|----|------|
| **角色** | Taro weapp 可稳定运行前的**可立即演示**微信客户端 |
| **生产 UI 源** | [`../taro-app/`](../taro-app/)（Taro + React + TS → 小程序 + RN iOS/Android） |
| **删除条件** | Taro `npm run dev:weapp` 可预览，且查询→三主卡→详情验收通过后，再开 PR 退役本目录 |
| **禁止** | Alita；把本目录当作长期生产 UI 双开 |

决策：[`docs/ADR-客户端-Taro一码多端.md`](../../docs/ADR-客户端-Taro一码多端.md)。

## 打开方式

`project.config.json` 在 **`frontend/miniprogram/`**。用微信开发者工具 **打开本目录**（不要打开仓库根）。

```bash
cd frontend/miniprogram
npm install
# 开发者工具：工具 → 构建 npm
```

## 页面

| 页面 | 行为 |
|------|------|
| `pages/query` | 出发/到达、日期灵活、途经≤3、样例 OD、演示空/失败、「开始推荐」、入口「关于」 |
| `pages/results` | ~700ms「正在组合方案…」→ 三主卡；途经展示；空态示例；失败再试/改条件 |
| `pages/detail` | 怎么去（timeline）、为什么、怎么玩、去购票（Toast stub） |
| `pages/about` | 只推荐不卖票、免责声明、复制数据说明 |

文案对齐 `../../docs/空态与文案规范.md`。

## Mock 与 OD

- 精简自 `backend/data/mock/plans-*.json`，含 timeline / why_detail / play / buy_legs。
- 样例：徐州→拉萨 / 上海→成都 / 北京→武汉 / 成都→重庆。

## 接引擎 API（M1）

1. `cd backend/engine && PORT=8787 npm run server`
2. `utils/config.js`：`useRemoteApi: true`，`apiBase: 'http://127.0.0.1:8787'`
3. 微信开发者工具勾选「不校验合法域名、web-view…」
4. 失败回落 `data/plans-*.json`

共享契约：`@dongxing/shared`（根级 `packages/shared`）。
