# ADR · 技术栈：全栈 TypeScript + 多端客户端

| 项 | 值 |
|----|-----|
| **状态** | Accepted |
| **日期** | 2026-09-23（Asia/Shanghai） |
| **产品** | 懂行（`fasstDog/dongxing`） |
| **关联** | 总架构 §2 / §8 / §9（ADR-01、05、25–27）；[`架构-规则引擎.md`](./架构-规则引擎.md)；[`架构-小程序前端.md`](./架构-小程序前端.md) |

## 决策

1. **全栈 TypeScript only**  
   - 新代码（引擎、契约、客户端、工具）一律 TypeScript。  
   - **禁止新增 Python** 模块或脚本作为产品路径。  
   - 现有 `engine/search.py`、`score.py`、`export_fe.py`：**冻结**（可对照，不扩展）；择期迁移到 TS 后归档/删除。  
   - 现仓 `engine/*.js` 为过渡实现；主链服务化时迁 TS（**本次仅文档锁定，不改写引擎**）。

2. **正式客户端不止小程序**  
   - **微信小程序**（Vant Weapp）+ **手机 App** 均为正式交付面。  
   - 两端（及未来更多端）**共享** `POST /v1/plans/search` 与 [`api-plans-contract.md`](./api-plans-contract.md) / Schema。  
   - 禁止各端私造班次、票价或互斥 API。  
   - 根目录 Web 原型继续**冻结**。

3. **仓库目标形态**  
   - 收敛为 **TS monorepo**（示意：`packages/contracts`、`packages/engine`、`packages/mini`、`packages/app`）。  
   - 工程落地顺序（同一最终设计）：P0 锁定方向 → P1 契约包 + 引擎迁 TS → P2 App 正式与 monorepo 稳定。

## 理由

- 拍板已写「规则引擎 TypeScript/Node」；双语言（Python + JS）增加 CI、类型与边界成本。  
- 产品触达不限微信内；多端必须同一契约，否则三主卡与免责口径易漂移。  
- Schema → TS 类型可贯通引擎与客户端适配层，降低 `service_ref` 被改写的风险。

## 后果

| 做 | 不做（本 ADR 范围） |
|----|---------------------|
| 文档与评审按 TS + 多端验收 | 立即把 `engine/*.py` / `*.js` 改写成 TS |
| 新适配器/服务用 TS | 新增 Python 导出/打分入口 |
| 小程序与 App 同契约升级 | 为 App 另起一套 plans 字段 |

## 否决方案

| 方案 | 否决原因 |
|------|----------|
| Python 继续作为引擎主链 | 与 Node/小程序生态割裂；拍板不符 |
| 仅微信小程序、不做 App | 产品要求不止小程序 |
| 各端各自 API | 双维护、易违反「程序算计划」 |

---

*修订时同步总架构 §9 ADR-25–27 与 README 一句话摘要。*
