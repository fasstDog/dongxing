# 规则引擎（mock）

流水线：取 `Leg` → 定枢纽/途经链 → 粗 MCT → **打分**（`score.py`）→ 导出方案。

```bash
cd <repo-root>
python3 engine/search.py
```

产出：

| 文件 | 用途 |
|------|------|
| `data/plans-xuzhou-lhasa.json` | 前端 `mock-plan-response.v1`（`plans` / `morePlans`） |
| `data/mock/plans-xuzhou-lhasa.json` | 引擎 API 形（`docs/api-plans-contract.md`） |

模块：

- `score.py` — cheap / fast / balanced 纯打分与主卡挑选
- `export_fe.py` — 导出前端 JSON
- `search.py` — 枚举 + MCT + 组装

`service_ref` / 价格时刻来自 mock；**不含实时余票**。

## 数据适配器

| 文件 | 作用 |
|------|------|
| `adapters/train.mock.js` | 火车 mock：`search({ from_city, to_city, date? }) → Leg[]`，单机内存 TTL |
| `adapters/README.md` | 命名约定 |

```bash
node engine/adapters/train.mock.js 徐州 西宁 2026-10-01
```

详见 [`docs/data-sources.md`](../docs/data-sources.md)。

## Node 流水线（CJS）

| 文件 | 作用 |
|------|------|
| `pipeline.js` | `searchPlans({from,to,date,vias})`：adapters 取腿 → MVP 枢纽 1 转 / 指定途经链 → MCT → `hub-pois` TransferPlay → `score.pickMainCards` |
| `search-pipeline-demo.js` | 徐州→拉萨、徐州→拉萨 via 西宁 冒烟 |

```bash
node engine/search-pipeline-demo.js
```

无新依赖；mock OD 不足时返回 `{ ok:false, reason, main, more:[] }`。不含 LLM / 实时余票。


## HTTP 服务壳（M1）

```bash
PORT=8787 node engine/server.js
```

- `GET /health`
- `POST /v1/plans/search` — 契约见 `docs/api-plans-contract.md`
- 仍走 mock adapters；无实时余票；程序算计划
