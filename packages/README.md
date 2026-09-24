# packages/

| 包 | 用途 |
|----|------|
| `@dongxing/shared` | Leg / TransferPlay / PlansSearch 契约类型（小程序 + App + 引擎） |

## 为何留在仓库根（不挪到 `frontend/shared`）

- 引擎（`backend/engine`）与两端客户端都依赖本包；放在根级 `packages/` 符合 npm / 未来 workspace 惯例。
- `file:../../packages/shared` 从 `frontend/*` 与 `backend/engine` 对称，避免「前端专属」误导。
- 详见 [`docs/ADR-仓库目录-四层结构.md`](../docs/ADR-仓库目录-四层结构.md)。
