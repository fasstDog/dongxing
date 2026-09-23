# ADR · 技术栈：全栈 TypeScript + 多端客户端

| 项 | 值 |
|----|-----|
| **状态** | Accepted |
| **日期** | 2026-09-23（Asia/Shanghai） |
| **产品** | 懂行（`fasstDog/dongxing`） |
| **关联** | 总架构 §2 / §8 / §9（ADR-01、05、25–28）；[`架构-规则引擎.md`](./架构-规则引擎.md)；[`架构-小程序前端.md`](./架构-小程序前端.md)；[`ADR-客户端-ReactNative.md`](./ADR-客户端-ReactNative.md) |

## 决策

1. **全栈 TypeScript only**  
   - 新代码（引擎、契约、客户端、工具）一律 TypeScript。  
   - **禁止新增 Python** 模块或脚本作为产品路径。  
   - 现有 `engine/search.py`、`score.py`、`export_fe.py`：**冻结**（可对照，不扩展）；择期迁移到 TS 后归档/删除。  
   - 现仓 `engine/*.js` 为过渡实现；主链服务化时迁 TS（**本次仅文档锁定，不改写引擎**）。

2. **正式客户端 = 两端（仅此）**  
   - **微信小程序**：微信原生运行时 + Vant Weapp（`@vant/weapp`）。  
   - **手机 App**：**官方 React Native** → **iOS + Android**（详见 [`ADR-客户端-ReactNative.md`](./ADR-客户端-ReactNative.md)）。  
   - 两端**共享** TypeScript 契约、`POST /v1/plans/search`、可抽出的业务逻辑；**UI / 运行时分端**。  
   - **RN 不是小程序交付路径**（含 Alita 等「RN→小程序」方案）；禁止各端私造班次、票价或互斥 API。  
   - 根目录 Web 原型继续**冻结**（非正式客户端）。

3. **非交付范围（一笔）**  
   Windows / macOS / Web / tvOS / Linux、Proton Native、Alita 等社区扩展存在，但**不是**懂行产品承诺与验收目标。

4. **仓库目标形态**  
   - 收敛为 **TS monorepo**（示意：`packages/contracts`、`packages/engine`、`packages/mini`、`packages/app`；`app`=官方 RN）。  
   - 工程落地顺序（同一最终设计）：P0 锁定方向 → P1 契约包 + 引擎迁 TS → P2 App（RN）正式与 monorepo 稳定。

## 理由

- 拍板已写「规则引擎 TypeScript/Node」；双语言（Python + JS）增加 CI、类型与边界成本。  
- 产品触达不限微信内；iOS/Android App 与小程序并存，必须同一契约，否则三主卡与免责口径易漂移。  
- Schema → TS 类型可贯通引擎与客户端适配层，降低 `service_ref` 被改写的风险。  
- 官方 RN 与微信原生运行时分离，避免把社区旁路（Alita / 桌面扩展等）误当成交付面。

## 后果

| 做 | 不做（本 ADR 范围） |
|----|---------------------|
| 文档与评审按 TS + 小程序 + 官方 RN(iOS/Android) 验收 | 立即把 `engine/*.py` / `*.js` 改写成 TS |
| 新适配器/服务用 TS | 新增 Python 导出/打分入口 |
| 小程序与 RN App 同契约升级 | 为 App 另起一套 plans 字段；承诺桌面/Web/tvOS/Alita 为产品端 |
| 分端 UI 工程 | 用 RN/Alita 一码出小程序 |

## 否决方案

| 方案 | 否决原因 |
|------|----------|
| Python 继续作为引擎主链 | 与 Node/小程序生态割裂；拍板不符 |
| 仅微信小程序、不做 App | 产品要求正式 RN App（iOS/Android） |
| 各端各自 API | 双维护、易违反「程序算计划」 |
| RN/Alita 作为小程序交付 | 运行时不同；非产品路径 |
| 桌面 / Web / tvOS 等当正式端 | 超出产品交付平台 |

---

*修订时同步总架构 §9 ADR-25–28、[`ADR-客户端-ReactNative.md`](./ADR-客户端-ReactNative.md) 与 README 一句话摘要。*
