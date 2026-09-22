# 规则引擎（mock）

程序化生成 / 打分路线方案：**不用 LLM 编时刻表或车次**。价格、时刻均为参考；**不编造实时余票 / 库存**。

约定见 [`docs/api-plans-contract.md`](../docs/api-plans-contract.md)。

## 流水线（概念）

1. 取 `Leg`（mock JSON）→ 定枢纽 / 途经链  
2. 粗 **MCT**（同站 / 同城最小换乘缓冲）过滤不可行组合  
3. **打分**选出三主卡：最省钱 / 最快 / 最综合  
4. 填充展示字段与「为什么」模板事实（`why_facts`）

`service_ref`、票价区间原样来自 mock 腿数据，引擎不改写车次。

## Node 打分模块（本目录）

| 文件 | 作用 |
|------|------|
| `mct.js` | 最小换乘时间：`same_station` **60** min、`same_city` **180** min（可覆盖） |
| `score.js` | 纯函数：`scoreCheapest` / `scoreFastest` / `scoreBalanced`；`pickMainCards(plans)` → `{ cheapest, fastest, balanced }` |
| `run-mock.js` | 读 `data/plans-xuzhou-lhasa.json`（或同类），跑打分，向 stdout 打 JSON 摘要 |

```bash
node engine/run-mock.js
# 或指定文件：
node engine/run-mock.js data/plans-xuzhou-lhasa.json
```

模块为 **CommonJS**（仓库无 `package.json` / `"type":"module"`），无额外依赖。

### 综合分权重（默认，越低越好）

- `price`：参考总价  
- `duration`：门到门分钟  
- `transfers`：换乘次数  
- `maxLegSitMin`：单段最长坐时长（屁股友好）

可用 `scoreBalanced(plan, weights)` 覆盖权重。

## Python 生成流水线（可选）

完整枚举仍可用标准库 Python：

```bash
python3 engine/search.py \
  --legs data/mock/legs-xuzhou-lhasa.json \
  --pois data/hub-pois.json \
  --out data/mock/plans-xuzhou-lhasa.json
```
