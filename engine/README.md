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
