# 懂行 · Taro 生产 UI 源（`frontend/taro-app/`）

**负责人锁定**：一套 **Taro + React + TypeScript** 编译到：

| 目标 | 命令 | 说明 |
|------|------|------|
| 微信小程序 | `npm run dev:weapp` / `npm run build:weapp` | 正式交付 |
| React Native | `npm run dev:rn` / `npm run build:rn` | **仅 iOS + Android** |

决策见 [`docs/ADR-客户端-Taro一码多端.md`](../../docs/ADR-客户端-Taro一码多端.md)。  
**禁止 Alita**。共享契约：`@dongxing/shared`。计划来自引擎 `POST /v1/plans/search`（失败回落本地 mock）。**只荐不卖**。

## 页面

| 页 | 路径 | 内容 |
|----|------|------|
| 查询 | `pages/query` | 出发/到达、日期灵活、途经≤3、样例 OD、三态演示开关 |
| 结果 | `pages/results` | 最省钱 / 最快 / 最综合 三主卡 + 加载/空/失败 |
| 详情 | `pages/detail` | 怎么去 · 为什么 · 怎么玩 · 外链购票 CTA（无支付） |
| 关于 | `pages/about` | 产品说明 / 免责 / 数据说明 |

## 本地运行（微信）

```bash
# 1) 共享包（若尚未 build）
cd ../../packages/shared && npm i && npm run build

# 2) 本工程
cd ../../frontend/taro-app
npm install
npm run dev:weapp
```

微信开发者工具：**打开本目录下的 `dist/`**（或按 Taro 输出配置），勾选「不校验合法域名」。

接引擎：

```bash
cd ../../backend/engine && npm i && PORT=8787 npm run server
```

`src/services/config.ts`：`useRemoteApi: true`，`apiBase: 'http://127.0.0.1:8787'`。

## RN（iOS / Android）

```bash
npm run dev:rn
```

需本机已按 [Taro RN 文档](https://docs.taro.zone/docs/react-native) 配好环境。业务 UI **不**在 `frontend/app/` 双开。

## 与 `frontend/miniprogram/` 的关系

| 路径 | 角色 |
|------|------|
| **本目录** | 生产 UI 源（目标） |
| `../miniprogram/` | **过渡**：原生微信 + Vant，可立即演示；Taro weapp 验收通过前**不删除** |

## 环境说明

完整 `@tarojs/*` 依赖体积较大。若当前 CI/沙箱 `npm i` 失败，以本骨架 + 过渡小程序为准继续演示；在开发者机器上按上文安装即可出 weapp 包。

## 目录

```
frontend/taro-app/
  config/           # Taro 配置
  src/
    app.ts / app.config.ts / app.scss
    pages/{query,results,detail,about}/
    components/{PlanCard,Disclaimer}/
    services/{config,api,adapt}.ts
    data/plans-*.json
  package.json
  project.config.json
```
