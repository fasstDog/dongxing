# ADR · 客户端：React Native App（iOS / Android）

| 项 | 值 |
|----|-----|
| **状态** | Accepted |
| **日期** | 2026-09-23（Asia/Shanghai） |
| **产品** | 懂行（`fasstDog/dongxing`） |
| **关联** | [`ADR-技术栈-TS与多端.md`](./ADR-技术栈-TS与多端.md)；[`架构-小程序前端.md`](./架构-小程序前端.md)；[`架构-产品与体验.md`](./架构-产品与体验.md) |

## 决策

1. **手机 App = 官方 React Native（仅 iOS + Android）**  
   - 正式交付面之一：一套 **官方 React Native** + TypeScript 工程覆盖 **iOS + Android**。  
   - UI 选用成熟开源组件库，**禁止自研设计系统**。

2. **微信小程序是独立运行时（非 RN 交付路径）**  
   - 小程序：微信原生运行时 + Vant Weapp（`@vant/weapp`）。  
   - **不得**将 React Native、Alita 或其它「RN → 小程序」方案宣称为懂行小程序交付路径。  
   - 两端工程与发布通道分离；共享契约 / API / 可抽出逻辑，而非同一 UI 运行时。

3. **共享边界（窄腰）**  
   - **共享**：TypeScript 契约（`PlansSearch*` / Schema）、引擎 `POST /v1/plans/search`、可抽出的业务逻辑与文案口径。  
   - **不共享**：UI 组件、导航栈、各端打包产物。  
   - 禁止各端私造班次、票价或互斥 API。

4. **红线**  
   - 只荐不卖；程序算计划；禁止 LLM 编班次票价；根目录 HTML/Vue 原型冻结。

## 产品交付平台（仅此）

| 平台 | 技术 | 说明 |
|------|------|------|
| **手机 App** | 官方 React Native → **iOS + Android** | 正式交付 |
| **微信小程序** | 微信原生运行时 + Vant Weapp | 正式交付；与 RN **分运行时** |

### 非交付范围

Windows / macOS / Web / tvOS / Linux、Proton Native、Alita 等社区扩展或旁路运行时**不是**懂行产品承诺。根目录 Web 原型仅冻结示意，不算正式客户端。

## 理由

- 产品触达不限微信内；需要独立 App 商店分发（iOS/Android），与小程序并存。  
- 官方 RN 一码双端降低双维护成本，且与 TS monorepo 目标一致。  
- 小程序与 RN 运行时不可互通；用 RN/Alita「出」小程序会混淆合规与交付边界，故明确否决。

## 后果

| 做 | 不做（本 ADR 范围） |
|----|---------------------|
| 文档与评审按「小程序 + 官方 RN App（iOS/Android）」验收 | 承诺桌面 / Web / tvOS / Proton Native / Alita 等为产品交付 |
| monorepo 预留 `packages/app`（RN） | 用 RN / Alita / Taro 等一码出小程序 |
| App 与小程序同契约升级 | 为 App 另起一套 plans 字段或打分 |

## 否决方案

| 方案 | 否决原因 |
|------|----------|
| 仅微信小程序、不做 App | 产品要求正式 App |
| 原生双端（Swift + Kotlin）为主线 | 双栈成本高；与 TS 共享逻辑目标不符 |
| Flutter / 其它跨端为主线 | 与已拍板 RN + TS monorepo 不一致 |
| RN/Alita 作为小程序交付 | 运行时不同；非产品路径 |

---

*修订时同步 README 一句话摘要与客户端分册 §0。*
