# ADR：仓库目录 · 四层结构

| 项 | 内容 |
|----|------|
| 状态 | Accepted |
| 日期 | 2026-09-24 |
| 决策 | 仓根按 **docs / frontend / backend / prototype** 四层组织；共享契约保留 **`packages/shared`（根级）** |

## 背景

原仓将小程序、引擎、mock 数据、静态 Web 原型平铺在根目录，与「正式两端客户端 + 引擎服务 + 冻结原型」的交付边界不易一眼对齐，也不利于后续 TS monorepo 收敛。

## 决策

```text
dongxing/
├── docs/                 # 架构、ADR、契约、走查（含 DEMO.md）
├── frontend/
│   ├── miniprogram/      # 微信小程序（正式客户端之一）
│   └── app/              # 官方 RN 占位（仅 iOS + Android）
├── backend/
│   ├── engine/           # 规则引擎（唯一实现：src/）
│   └── data/             # mock 腿 / plans、枢纽 POI
├── prototype/            # 静态 Web 示意（FROZEN）
├── packages/
│   └── shared/           # @dongxing/shared（根级保留）
├── README.md
└── .gitignore
```

### `packages/shared` 留在根级（不迁入 `frontend/shared`）

- 消费者含 **backend/engine** 与 **frontend/**\*，非前端专属。
- 根级 `packages/` 便于 npm workspace / 对称 `file:` 路径。
- 与目标 TS monorepo（contracts + engine + mini + app）方向一致。

### 约束（不变）

- TypeScript only；禁止新增 Python。
- 正式客户端 = 微信小程序 + 官方 RN（**仅 iOS + Android**）；RN 不是小程序交付路径。
- **只荐不卖**；`prototype/` **冻结**（禁加功能/改交互）。
- 文档只写最终交付设计。

## 迁移对照表

| 原路径 | 新路径 |
|--------|--------|
| `DEMO.md` | `docs/DEMO.md` |
| `miniprogram/` | `frontend/miniprogram/` |
| （无） | `frontend/app/`（RN 占位新增） |
| `engine/` | `backend/engine/` |
| `data/` | `backend/data/` |
| `index.html`、`css/`、`js/` | `prototype/` |
| `packages/shared` | **不变**（仍根级） |

相对路径同步：`package.json` 的 `file:`、`backend/engine/src/pipeline.js` 的 `ROOT`（指向 `backend/`）、`prototype/js/app.js` 的 mock URL、README / 分册文档中的目录说明。

## 后果

- 开发者工具打开小程序目录改为 `frontend/miniprogram/`。
- 引擎命令改为 `cd backend/engine && …`；导出脚本仍以 `backend/` 为数据根（`data/` 与 `engine/` 兄弟）。
- 静态原型预览建议在**仓库根**起 HTTP 服务，以便 `../backend/data/...` 可解析。

## 参考

- [`docs/邪修交通-系统架构设计_v1.0.md`](邪修交通-系统架构设计_v1.0.md) §10.3
- [`docs/ADR-技术栈-TS与多端.md`](ADR-技术栈-TS与多端.md)
