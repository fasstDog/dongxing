# AGENTS.md — 懂行（dongxing）

本仓库面向 **Agent 开发**。人类与 Agent 改代码前先读本文 + `README.md` + `docs/` 架构文档。

## 产品是什么

- 名称：**懂行**（曾用名邪修交通）。仓库：`fasstDog/dongxing`。
- **只推荐路线，不卖票。** 购票只跳转 12306 / OTA 外链，不做支付、登录、订单、抢票。
- 查询：出发 / 到达，可选日期、有序途经城。
- 结果：默认 **最省钱 / 最快 / 最综合** 三主卡 + 更多方案；每卡含怎么去、为什么、换乘够长则怎么玩、外链购票。
- **出计划必须由程序规则引擎计算。** 模型（LLM）只可润色文案；**禁止编造车次、时刻、票价。**

## 仓库布局（勿打乱）

```
docs/           架构、ADR、契约、走查
frontend/       正式客户端（生产 UI 源见下）
backend/        规则引擎 + 数据
prototype/      静态 HTML 示意 — **冻结，禁止加功能**
packages/shared @dongxing/shared 契约（根上保留）
AGENTS.md       本文（Agent 协作入口）
README.md       人读总览
```

- 生产 UI 源：`frontend/taro-app/`（**Taro + React + TypeScript** → 微信小程序 + React Native iOS/Android）。
- `frontend/miniprogram/`：过渡演示，Taro weapp 稳定前可保留；勿再当作长期唯一前端。
- `frontend/app/`：RN 发布/壳占位，业务 UI 不在此双开。
- 引擎唯一实现：`backend/engine/src/`（`npm run server` / `npm run demo`）。
- 数据：`backend/data/`（mock / POI）。

## 技术红线

| 可做 | 不可做 |
|------|--------|
| 全栈 **TypeScript** | 新增 **Python** |
| Taro 一码 → 小程序 + RN（仅 iOS/Android） | Alita；Win/macOS/Web/tvOS/Linux 当正式交付 |
| 接 `POST /v1/plans/search`（见 `docs/api-plans-contract.md`） | LLM 生成班次/票价；自营售票 |
| 改 `docs/` / `frontend/` / `backend/` / `packages/` | 改 `prototype/` 功能与交互 |
| 开源组件优先，少造轮子 | 把密钥、违规爬虫写进仓库 |

文档只写 **最终交付设计**，不要用「MVP 不做××」当产品范围。工程落地顺序可写，但产品能力以终态为准。

## Agent 怎么干活

1. **先读再改**：`AGENTS.md` → `README.md` → 相关 `docs/ADR-*.md` 与分册 → 再动代码。
2. **范围**：一次任务只动相关目录；跨前后端先对齐契约（`packages/shared`、`docs/api-plans-contract.md`）。
3. **计划数据**：时刻/票价来自适配器或 mock JSON，经 MCT 与打分；不要在客户端写死假车次冒充引擎结果（演示回落 JSON 除外，且须标明回落）。
4. **提交**：阶段完成即 commit；需要推远程时 `git pull --rebase` 后再 push；大改走 PR，说明动机与验证方式。
5. **验证**：引擎改动至少 `cd backend/engine && npm run typecheck`（及必要的 `npm run demo` / server 冒烟）；前端按对应 README 的 weapp/RN 脚本。
6. **禁止**：静默扩大成卖票产品；删除红线文档；在未批准时把 `prototype/` 解冻当生产前端。
7. **协作**：范围或红线争议找项目负责人 Agent；实现细节可在「邪修交通 项目组」对齐。

## 关键入口（给 Agent）

| 场景 | 从哪开始 |
|------|----------|
| 改推荐逻辑 / API | `backend/engine/src/`、`docs/架构-规则引擎.md` |
| 改 UI / 小程序 / App | `frontend/taro-app/`、`docs/ADR-客户端-Taro一码多端.md` |
| 改类型契约 | `packages/shared/src/` |
| 改数据 / POI / mock | `backend/data/`、`docs/架构-数据与内容.md` |
| 改产品边界文案 | `docs/架构-产品与体验.md`（仍须遵守只荐不卖） |

## 本地常用命令

```bash
# 引擎 API
cd backend/engine && npm install && npm run server

# 共享契约
cd packages/shared && npm install && npm run build

# Taro（以 frontend/taro-app/README.md 为准）
cd frontend/taro-app && npm install && npm run dev:weapp
```

更新本文时：保持短、可执行、与 ADR 一致；冲突以负责人拍板与最新 ADR 为准。
