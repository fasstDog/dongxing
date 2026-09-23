# 懂行 · 规则引擎

**TypeScript 主线**：`engine/src/`（负责人拍板：全栈 TS；Python / 旧 CJS **冻结**，只迁不新写）。

## 本地 API（M1）

```bash
cd engine
npm install
npm run server
# PORT=8787 HOST=0.0.0.0 npm run server
```

- `GET /health` — `service: dongxing-plans`
- `POST /v1/plans/search` — 见 `docs/api-plans-contract.md`

## 构建

```bash
npm run build      # → dist/
npm run typecheck
```

## 多端

小程序与手机 App **共享本 API 契约**；UI 分端实现。静态 HTML 原型冻结。

## 旧入口

根目录 `engine/*.js` / `*.py` 为冻结对照；请改 `src/`。
