# ADR · 客户端：React Native 目标（iOS / Android）

| 项 | 值 |
|----|-----|
| **状态** | Accepted（2026-09-24 修订：UI 源收敛到 Taro） |
| **日期** | 2026-09-23；修订 2026-09-24（Asia/Shanghai） |
| **产品** | 懂行（`fasstDog/dongxing`） |
| **关联** | [`ADR-客户端-Taro一码多端.md`](./ADR-客户端-Taro一码多端.md)（**生产 UI 源**）；[`ADR-技术栈-TS与多端.md`](./ADR-技术栈-TS与多端.md)；[`架构-小程序前端.md`](./架构-小程序前端.md) |

## 决策

1. **手机 App 交付面 = React Native → 仅 iOS + Android**  
   - 正式交付面之一；不进 Win / macOS / Web / tvOS / Linux / Proton Native。

2. **生产 UI 源 = Taro（React + TypeScript）一码多端**  
   - App 与微信小程序共用 **`frontend/taro-app/`** 源码，由 Taro 分别编译到 weapp 与 RN。  
   - 详见 [`ADR-客户端-Taro一码多端.md`](./ADR-客户端-Taro一码多端.md)。  
   - `frontend/app/` 仅作 RN 发布/壳占位说明，**不另起一套业务 UI**。

3. **微信小程序不是「RN 旁路」产物**  
   - 小程序由 **同一 Taro 工程** 的 weapp 目标产出；**禁止** Alita 或其它「RN → 小程序」方案。  
   - 过渡期：`frontend/miniprogram/` 原生微信壳可演示，标注 transitional，直至 Taro weapp 可运行。

4. **共享边界（窄腰）**  
   - **共享**：TypeScript 契约（`PlansSearch*`）、引擎 `POST /v1/plans/search`、可抽出逻辑、**Taro UI 源**。  
   - **分端**：打包产物、商店/微信发布、平台 API。  
   - 禁止各端私造班次、票价或互斥 API。

5. **红线**  
   - 只荐不卖；程序算计划；禁止 LLM 编班次票价；`prototype/` 冻结。

## 产品交付平台（仅此）

| 平台 | 技术 | UI 源 |
|------|------|--------|
| **手机 App** | Taro → React Native → **iOS + Android** | `frontend/taro-app/` |
| **微信小程序** | Taro → weapp | `frontend/taro-app/`（同仓） |

### 非交付范围

Windows / macOS / Web / tvOS / Linux、Proton Native、Alita 等**不是**懂行产品承诺。根目录 Web 原型仅冻结示意。

## 理由

- 产品触达不限微信内；需要独立 App 商店分发（iOS/Android），与小程序并存且口径一致。  
- 一码多端降低双维护；与 TS monorepo / `@dongxing/shared` 一致。  
- 明确否决 Alita，避免把社区旁路误当成交付面。

## 后果

| 做 | 不做（本 ADR 范围） |
|----|---------------------|
| 按「Taro → 小程序 + RN(iOS/Android)」验收 | 承诺桌面 / Web / tvOS / Alita 为交付 |
| RN 目标消费同一 plans 契约 | 为 App 另起一套 plans 字段或打分 |
| 保留 `frontend/app/` 作发布占位说明 | 用 Alita / 独立第二套业务 UI |

## 否决方案

| 方案 | 否决原因 |
|------|----------|
| 仅微信小程序、不做 App | 产品要求正式 App |
| 原生双端（Swift + Kotlin）为主线 | 双栈成本高；与 TS 共享不符 |
| Flutter / 其它跨端为主线 | 与已拍板 Taro + TS 不符 |
| Alita 作为小程序交付 | 非产品路径 |
| 永久双套 UI（原生 weapp + 独立 RN 业务） | 已由 Taro ADR 取代 |

---

*修订时同步 README 与 [`ADR-客户端-Taro一码多端.md`](./ADR-客户端-Taro一码多端.md)。*
