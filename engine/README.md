# 规则引擎（mock）

TypeScript/Node 可后续替换；当前 MVP 用标准库 Python 跑通流水线。

```bash
python3 engine/search.py \
  --legs data/mock/legs-xuzhou-lhasa.json \
  --pois data/hub-pois.json \
  --out data/mock/plans-xuzhou-lhasa.json
```

流水线：取 Leg → 定枢纽/途经链 → 粗 MCT → 打分三主卡 → 模板 `why_facts`。  
`service_ref` / 价格时刻均来自 mock，**不编造实时余票**。约定见 `docs/api-plans-contract.md`。
