# 懂行（dongxing）

> 产品曾用名「邪修交通」；仓库原名 `xiexiu-traffic-prototype`，现为 `fasstDog/dongxing`。

**只推荐路线，不卖票。** 出计划由程序算（规则引擎），模型不编车次/票价。  
**语言：全栈 TypeScript only**（禁止新增 Python；`engine/*.py` 冻结待迁）。  
**正式客户端：微信小程序（Vant Weapp）+ 手机 App**（不止小程序；共享同一 API/契约）。

## 系统架构（当前优先）

先读总架构，再读分册：

| 文档 | 内容 |
|------|------|
| [`docs/邪修交通-系统架构设计_v1.0.md`](docs/邪修交通-系统架构设计_v1.0.md) | **总架构 v1.0**（懂行；原则/红线、核心链路、分阶段） |
| [`docs/ADR-技术栈-TS与多端.md`](docs/ADR-技术栈-TS与多端.md) | **锁定**：TS only + 小程序/App 多端 |
| [`docs/架构-产品与体验.md`](docs/架构-产品与体验.md) | 产品边界、信息架构、三态 |
| [`docs/架构-规则引擎.md`](docs/架构-规则引擎.md) | 取腿→定链→MCT→打分、API（TS 方向） |
| [`docs/架构-数据与内容.md`](docs/架构-数据与内容.md) | 适配器、资产、mock→真源 |
| [`docs/架构-小程序前端.md`](docs/架构-小程序前端.md) | **客户端**：小程序 + App、共享 plans API |

下一刀方向（见总架构第 8 章）：**API 契约稳定 → 引擎服务化（TS）→ 客户端接真 API**；目标 **TS monorepo**。  
`POST /v1/plans/search` 约定见 [`docs/api-plans-contract.md`](docs/api-plans-contract.md)。

## 仓库怎么用

| 路径 | 角色 |
|------|------|
| `miniprogram/` | **正式客户端之一**：微信小程序脚手架（Vant Weapp）。打开说明：[`miniprogram/README.md`](miniprogram/README.md) |
| `packages/shared` | **`@dongxing/shared`**：Leg / TransferPlay / PlansSearch*，小程序与 App 共用 |
| `engine/` | 规则引擎（TS：`src/` + `npm run server`；`*.py` / 旧 CJS **冻结**） |
| `data/` | mock 腿与 plans、枢纽 POI |
| `index.html` + `css/` + `js/` | **静态 Web 示意原型 — 已冻结，禁止再加功能/改交互** |

文档口径：**只写最终交付设计**；工程分步另述，不用「MVP 不做××」当产品范围。  
枢纽：[`docs/hubs.md`](docs/hubs.md)。交互对照：[`docs/小程序-查询与三主卡交互要点.md`](docs/小程序-查询与三主卡交互要点.md)。空态：[`docs/空态与文案规范.md`](docs/空态与文案规范.md)。

## 版本

| Tag | 说明 |
|-----|------|
| [`v0.2.0-miniprogram`](https://github.com/fasstDog/dongxing/releases/tag/v0.2.0-miniprogram) | 三线样例 + 小程序查询/三主卡/详情壳 |
| `v0.1.1` | Web 空铁「最快」演示闭环 |
| `v0.1.0-prototype` | 首个可点击原型 |

`v0.2.1`（成渝第四样例等）等架构落地阶段再议，不与「可用系统」路线抢优先级。

## 引擎演示（mock，开发用）

M1 本地服务壳（**TypeScript**；小程序/App 共用 `POST /v1/plans/search`，失败可回落本地 JSON）：

```bash
cd engine && npm install && PORT=8787 npm run server
# 入口：src/server.ts · POST /v1/plans/search · GET /health（dongxing-plans）
```

微信开发者工具需勾选「不校验合法域名」。`engine/*.py` 与根目录旧 CJS **冻结**，新功能只进 `engine/src/`（TS）。

导出 / 冒烟（过渡期仍可用）：

```bash
node engine/export-plans-with-flight.js          # 重导样例 plans
node engine/export-plans-with-flight.js bj-wh    # 京广
node engine/export-plans-with-flight.js cd-cq    # 成渝
cd engine && npm run demo
```

详见 [`engine/README.md`](engine/README.md)、[`docs/ADR-技术栈-TS与多端.md`](docs/ADR-技术栈-TS与多端.md)。**不含实时余票**；密钥与违规爬取禁止。

## 协作

- 架构定稿前：以 `docs/` 架构文档为准，按分册拆实现；**勿改静态原型功能**。
- 阶段完成即 commit；该 push 时由发布或负责人推（冲突先 `git pull --rebase`）。
- 范围变更先找负责人。
