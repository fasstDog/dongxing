# 数据适配器（Leg providers）

约定见 [`docs/data-sources.md`](../../docs/data-sources.md) §8。

| 文件 | 说明 |
|------|------|
| `train.mock.js` | 火车 mock：读 `data/mock/legs-*.json`，单机内存缓存 |
| `train.<vendor>.js` | （后续）合规火车源；密钥只走环境变量 |
| `flight.*` | （更晚）航班第二优先 |

公共形状：`search({ from_city, to_city, date? }) → Leg[]`。不臆造车次与票价。

```bash
node engine/adapters/train.mock.js 徐州 西宁 2026-10-01
```
