# 懂行 · 规则引擎

**唯一实现目录**：`backend/engine/src/`（全栈 TypeScript；入口 `src/server.ts`）。

数据与引擎同属 `backend/`：`../data/`（hub-pois、mock legs/plans）。

## 本地 API

```bash
cd backend/engine
npm install
npm run server
# PORT=8787 HOST=0.0.0.0 npm run server
```

- `GET /health` — `service: dongxing-plans`
- `POST /v1/plans/search` — 见 `docs/api-plans-contract.md`

## 冒烟 demo

```bash
npm run demo   # src/search-pipeline-demo.ts → pipeline.searchPlans
```

## 构建

```bash
npm run build      # → dist/
npm run typecheck
```

## 多端

小程序与手机 App **共享本 API 契约**；UI 分端实现。静态 HTML 原型（`prototype/`）冻结为历史示意，非正式客户端。
