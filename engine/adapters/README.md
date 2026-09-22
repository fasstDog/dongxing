# 数据适配器（Leg providers）

约定见 [`docs/data-sources.md`](../../docs/data-sources.md) §8。

`index.js` re-exports the async engine contract:

```js
const { searchLegs } = require('./engine/adapters');
const legs = await searchLegs({ from, to, date });
```

| 文件 | 说明 |
|------|------|
| `train.mock.js` | 火车 mock：读 `data/mock/legs-*.json`，单机内存缓存 |
| `flight.mock.js` | 航班 mock：同契约，仅 `mode=flight`；默认合并徐拉+沪蓉腿表 |
| `train.<vendor>.js` | （后续）合规火车源；密钥只走环境变量 |
| `flight.<vendor>.js` | （后续）合规航班源 |

`train.mock.js` currently supports the 徐州→拉萨 snapshot. It returns `Leg[]`
with the shape in [`docs/data-contract-mock.md`](../../docs/data-contract-mock.md)
and labels each result `source: 'mock'`. The date is accepted by the contract;
the mock shifts its reference snapshot to the requested calendar date.

## Adding a vendor

Add a `train.<vendor>.js` CommonJS module exporting an async
`searchLegs({ from, to, date })` function, then register it in `index.js`
without changing the consumer contract. Credentials must come only from
process environment variables or an approved secrets manager. Never commit
keys, `.env` files, or private ticketing endpoints; do not add scraping.

Run the smoke demo with:

```bash
node engine/search-demo.js
```

The lower-level mock CLI remains available:

```bash
node engine/adapters/train.mock.js 徐州 西宁 2026-10-01
node engine/adapters/train.mock.js 西宁 拉萨 --after 2026-10-02T14:40:00+08:00
```

```bash
node engine/adapters/flight.mock.js 西安 拉萨
node engine/adapters/flight.mock.js 上海 成都 2026-10-08
```
