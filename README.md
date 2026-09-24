# 懂行（dongxing）

> **Agent 开发入口：** [`AGENTS.md`](AGENTS.md)（本项目默认由 Agent 协作开发，改代码前先读）。

> 产品曾用名「邪修交通」；仓库原名 `xiexiu-traffic-prototype`，现为 `fasstDog/dongxing`。

**只推荐路线，不卖票。** 出计划由程序算（规则引擎），模型不编车次/票价。  
**语言：全栈 TypeScript only**（禁止新增 Python）。  
**正式客户端仅两端：微信小程序 + React Native App（仅 iOS + Android）**；**生产 UI 源 = Taro + React + TypeScript**（`frontend/taro-app/`）一码编译到 weapp 与 RN。共享 `@dongxing/shared` 契约 / 引擎 API。**禁止 Alita**。Win / macOS / Web / tvOS / Linux / Proton Native **不进产品范围**。  
`frontend/miniprogram/`（原生微信 + Vant Weapp）为 **transitional**，Taro weapp 可运行前保留可演示。`prototype/` **冻结**。

## 系统架构（当前优先）

先读总架构，再读分册：

| 文档 | 内容 |
|------|------|
| [`docs/邪修交通-系统架构设计_v1.0.md`](docs/邪修交通-系统架构设计_v1.0.md) | **总架构 v1.0**（懂行；原则/红线、核心链路、分阶段） |
| [`docs/ADR-客户端-Taro一码多端.md`](docs/ADR-客户端-Taro一码多端.md) | **锁定**：生产 UI 源 = Taro → weapp + RN(iOS/Android) |
| [`docs/ADR-技术栈-TS与多端.md`](docs/ADR-技术栈-TS与多端.md) | **锁定**：TS only；正式端=小程序 + RN（仅 iOS/Android） |
| [`docs/ADR-客户端-ReactNative.md`](docs/ADR-客户端-ReactNative.md) | App 目标：RN iOS/Android；UI 源归 Taro；禁 Alita |
| [`docs/ADR-仓库目录-四层结构.md`](docs/ADR-仓库目录-四层结构.md) | **仓布局**：docs / frontend / backend / prototype + `packages/shared` |
| [`docs/架构-产品与体验.md`](docs/架构-产品与体验.md) | 产品边界、信息架构、三态 |
| [`docs/架构-规则引擎.md`](docs/架构-规则引擎.md) | 取腿→定链→MCT→打分、API（TS） |
| [`docs/架构-数据与内容.md`](docs/架构-数据与内容.md) | 适配器、资产、mock→真源 |
| [`docs/架构-小程序前端.md`](docs/架构-小程序前端.md) | **客户端**：Taro 一码 + 过渡小程序；共享 plans API |

下一刀方向（见总架构第 8 章）：**API 契约稳定 → 引擎服务化（TS）→ 客户端接真 API**；目标 **TS monorepo**。  
`POST /v1/plans/search` 约定见 [`docs/api-plans-contract.md`](docs/api-plans-contract.md)。

## 仓库怎么用（四层）

| 路径 | 角色 |
|------|------|
| `docs/` | 架构、ADR、契约、走查（含 [`docs/DEMO.md`](docs/DEMO.md)） |
| `frontend/taro-app/` | **生产 UI 源**：Taro → 微信小程序 + RN（iOS/Android）。说明：[`frontend/taro-app/README.md`](frontend/taro-app/README.md) |
| `frontend/miniprogram/` | **过渡**：原生微信小程序（Vant Weapp），可立即演示。说明：[`frontend/miniprogram/README.md`](frontend/miniprogram/README.md) |
| `frontend/app/` | RN 发布/壳占位（业务 UI 不双开） |
| `backend/engine/` | 规则引擎（唯一实现：`src/` + `npm run server` / `npm run demo`） |
| `backend/data/` | mock 腿与 plans、枢纽 POI |
| `packages/shared` | **`@dongxing/shared`**：Leg / TransferPlay / PlansSearch*（客户端 + 引擎共用）。**留在仓库根** |
| `prototype/` | **静态 Web 示意原型 — 已冻结**（`index.html` + `css/` + `js/`） |

文档口径：**只写最终交付设计**；工程分步另述。  
枢纽：[`docs/hubs.md`](docs/hubs.md)。交互对照：[`docs/小程序-查询与三主卡交互要点.md`](docs/小程序-查询与三主卡交互要点.md)。空态：[`docs/空态与文案规范.md`](docs/空态与文案规范.md)。

## 版本

| Tag | 说明 |
|-----|------|
| [`v0.2.0-miniprogram`](https://github.com/fasstDog/dongxing/releases/tag/v0.2.0-miniprogram) | 三线样例 + 小程序查询/三主卡/详情壳 |
| `v0.1.1` | Web 空铁「最快」演示闭环 |
| `v0.1.0-prototype` | 首个可点击原型 |

`v0.2.1`（成渝第四样例等）等架构落地阶段再议，不与「可用系统」路线抢优先级。

## 引擎演示（mock，开发用）

M1 本地服务壳（**TypeScript**；小程序 / RN / Taro 共用 `POST /v1/plans/search`，失败可回落本地 JSON）：

```bash
cd backend/engine && npm install && PORT=8787 npm run server
# 入口：src/server.ts · POST /v1/plans/search · GET /health（dongxing-plans）
```

微信开发者工具需勾选「不校验合法域名」。引擎实现只在 `backend/engine/src/`。

冒烟：

```bash
cd backend/engine && npm run demo
```

详见 [`backend/engine/README.md`](backend/engine/README.md)、[`docs/ADR-技术栈-TS与多端.md`](docs/ADR-技术栈-TS与多端.md)。**不含实时余票**；密钥与违规爬取禁止。

## 协作

- 架构定稿前：以 `docs/` 架构文档为准，按分册拆实现；**勿改静态原型功能**（`prototype/` 冻结）。
- 阶段完成即 commit；该 push 时由发布或负责人推（冲突先 `git pull --rebase`）。
- 范围变更先找负责人。
