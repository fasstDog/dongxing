# @dongxing/shared

懂行共享契约（TypeScript **类型 only**）。

- `Leg` / `TransferPlay` — 数据适配器与引擎输入
- `PlansSearchRequest` / `PlansSearchResponse` / `Plan` — `POST /v1/plans/search`

**小程序与 App 共用本包做 adapt，勿各写一套。** 引擎侧 `engine/` 后续 `npm` 依赖本包。

```bash
cd packages/shared && npm install && npm run build
```

字段以 `docs/api-plans-contract.md` 与 `docs/schemas/` 为准；改契约先改文档再改类型。
