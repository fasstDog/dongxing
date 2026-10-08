# ADR · 客户端：Taro 一码多端（微信小程序 + React Native）

| 项 | 值 |
|----|-----|
| **状态** | Accepted（负责人锁定） |
| **日期** | 2026-09-24（Asia/Shanghai） |
| **产品** | 懂行（`fasstDog/dongxing`） |
| **关联** | [`ADR-技术栈-TS与多端.md`](./ADR-技术栈-TS与多端.md)；[`ADR-客户端-ReactNative.md`](./ADR-客户端-ReactNative.md)；[`架构-小程序前端.md`](./架构-小程序前端.md)；[`ADR-仓库目录-四层结构.md`](./ADR-仓库目录-四层结构.md) |
| **取代** | 先前「微信原生小程序 UI + 独立 RN UI 双套」作为**生产 UI 源**的表述；运行时边界与非交付范围仍有效 |

## 决策

1. **生产 UI 源 = 一套 Taro + React + TypeScript**  
   - 工程目录：`frontend/taro-app/`（本 ADR 落地起点）。  
   - **编译目标（仅此）**：  
     - 微信小程序（`weapp`）  
     - React Native → **仅 iOS + Android**  
   - 页面栈与产品语义对齐现有客户端：`query` → `results`（三主卡）→ `detail` → `about`。

2. **共享与边界（不变 + 收窄 UI）**  
   - **共享**：`@dongxing/shared` 契约、引擎 `POST /v1/plans/search`、可抽出业务/适配逻辑、本套 Taro UI 源。  
   - **仍分端**：打包产物、发布通道、平台差异（微信能力 vs App Store / Play）。  
   - **禁止**：Alita / 「RN→小程序」旁路；各端私造班次、票价或互斥 API；在端上卖票/支付/登录。

3. **过渡期工程**  
   - `frontend/miniprogram/`（微信原生 + Vant Weapp）**保留且可演示**，标注为 **transitional**：在 Taro weapp 路径可稳定 `npm i && npm run dev:weapp` 并验收前，继续作为即时可点的微信原型。  
   - **不得删除** `frontend/miniprogram/`，直到 Taro weapp 可运行并完成查询→三主卡→详情走查。  
   - `frontend/app/` 保留为「RN 发布/壳」占位说明；实现逐步收敛到 Taro 的 RN 目标，而非另起一套业务 UI。  
   - `prototype/` **冻结**（静态 HTML 示意，非正式客户端）。

4. **红线（与产品一致）**  
   - **只荐不卖**；计划仅来自引擎 / 契约响应（开发可 mock 回落，语义同真 API）。  
   - 禁止 LLM 编造车次票价；密钥不进仓；禁止违规爬取。  
   - 文档**不使用 MVP 措辞**；只写最终交付设计与工程过渡说明。  
   - Win / macOS / Web / tvOS / Linux / Proton Native / Alita **不进产品范围**。

## 产品交付平台（仅此）

| 平台 | 技术 | UI 源 |
|------|------|--------|
| **微信小程序** | Taro → weapp | `frontend/taro-app/` |
| **手机 App** | Taro → React Native → **iOS + Android** | **同一** `frontend/taro-app/` |

### 非交付 / 过渡

| 路径 | 角色 |
|------|------|
| `frontend/miniprogram/` | 过渡：原生微信壳，可演示；Taro weapp 就绪后退役 |
| `frontend/app/` | RN 发布占位 / 说明；业务 UI 不双开 |
| `prototype/` | 冻结示意 |

## 理由

- 两端信息架构、三主卡、免责与外链购票口径必须一致；双套 UI 易漂移。  
- Taro（React + TS）与全栈 TypeScript / monorepo 方向一致，且官方支持 weapp + RN。  
- 否决 Alita：与既有「RN 不是小程序旁路」一致，避免合规与交付混淆。  
- 保留原生小程序过渡，保证演示不断档。

## 后果

| 做 | 不做 |
|----|------|
| 文档与评审按「Taro 一码 → 小程序 + RN(iOS/Android)」验收 | 承诺 Web/桌面/tvOS/Alita 为交付 |
| 新页面与视觉优先落在 `frontend/taro-app/` | 在 `prototype/` 加功能 |
| 继续维护 `packages/shared` + 引擎契约 | 为某一端另起 plans 字段 |
| 过渡期可 polish `frontend/miniprogram/` | Taro 未跑通前删除原生小程序 |

## 否决方案

| 方案 | 否决原因 |
|------|----------|
| 永久双套 UI（原生 weapp + 独立 RN） | 维护成本高、口径易漂；负责人锁定一码 |
| Alita / RN 编译出小程序 | 非产品路径；与既有 ADR 否决一致 |
| 仅小程序、不做 App | 产品要求 iOS/Android App |
| 以 HTML `prototype/` 当生产 | 已冻结；非正式客户端 |
| Flutter / 其它跨端为主线 | 与 Taro + TS 锁定不符 |

## 落地检查清单（本 PR 起）

- [x] 本 ADR 入库；README / 客户端分册 / RN ADR 指向 Taro UI 源  
- [x] `frontend/taro-app/` 骨架（配置、四页 stub、shared/API 接线说明）  
- [x] `frontend/miniprogram/` 标注 transitional，并做可见 polish  
- [ ] 本机 `cd frontend/taro-app && npm i && npm run dev:weapp` 出可预览包（依赖环境；见该目录 README）  
- [ ] Taro weapp 验收通过后，再开 PR 退役原生 `miniprogram/`

---

*修订时同步根 README、`frontend/README.md`、[`ADR-客户端-ReactNative.md`](./ADR-客户端-ReactNative.md)、[`架构-小程序前端.md`](./架构-小程序前端.md)。*
