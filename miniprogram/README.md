# 邪修交通 · 微信小程序脚手架

基于 **Vant Weapp**（开源优先）的小程序壳：**查询页** + **结果页三主卡**。读本地 mock JSON，**无真实 API / 无登录 / 无支付**。

> **只推荐路线，不卖票。** 价格与时刻为参考 mock。

## 目录

```
miniprogram/
  app.js / app.json / app.wxss
  sitemap.json
  project.config.json      # 用微信开发者工具打开本目录
  package.json             # 依赖 @vant/weapp
  data/plans-xuzhou-lhasa.json   # 徐拉三主卡精简 mock
  data/plans-shanghai-chengdu.json # 沪蓉精简 mock（可选）
  pages/index/             # 查询：出发/到达/途经(≤3)/开始邪修
  pages/results/           # 结果：最省钱 / 最快 / 最综合
```

## 在微信开发者工具中打开

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. **导入项目** → 目录选仓库下的 `miniprogram/`（不要选仓库根）。
3. AppID 可用测试号 / `touristappid`（`project.config.json` 已写 touristappid）。
4. 详情 → 本地设置：勾选「将 JS 编译成 ES5」等按需；**启用 npm**。

## 安装并构建 npm（Vant Weapp）

官方流程（推荐）：

```bash
cd miniprogram
npm install
```

然后在微信开发者工具菜单：**工具 → 构建 npm**。  
成功后会出现 `miniprogram_npm/@vant/weapp/`，页面里的：

```json
"van-button": "@vant/weapp/button/index"
```

即可解析。`node_modules/` 与 `miniprogram_npm/` 已在仓库 `.gitignore` 中，请本地自建。

### 若本机 `npm install` 失败

1. 确认 Node.js ≥ 14，网络可访问 npm registry。
2. 仍失败时，可手动拷贝组件（CDN-less，无外网运行时依赖）：
   - 从已成功安装的机器，或从 [@vant/weapp](https://github.com/youzan/vant-weapp) 发行包，将 `lib/`（或 npm 包内 `lib`）拷到：
     ```
     miniprogram/miniprogram_npm/@vant/weapp/
     ```
   - 保持目录结构如 `miniprogram_npm/@vant/weapp/button/index.js` 等。
3. 页面 `usingComponents` 已按 `@vant/weapp/...` 声明；无 npm 构建时也可改为相对路径，例如：
   ```json
   "van-button": "/miniprogram_npm/@vant/weapp/button/index"
   ```
4. 即使组件资源暂缺，页面逻辑与 mock 导航仍可先跑通（组件会显示为未知标签，属预期 stub）。

## Mock 数据

- 来源：根目录 `data/plans-xuzhou-lhasa.json` 精简为三主卡字段。
- 结果页 `require('../../data/plans-xuzhou-lhasa.json')`，**不请求票务 API**。
- 查询页途经会带到结果页 NoticeBar，但当前仍固定展示徐拉 mock 三主卡。

## 页面说明

| 页面 | 行为 |
|------|------|
| `pages/index` | 出发 / 到达 / 途经最多 3 →「开始邪修」→ 跳转结果 |
| `pages/results` | Loading → 三主卡（最省钱 / 最快 / 最综合）；点卡 Toast 详情 stub |

## 免责声明

本项目**只推荐不卖票**，不提供购票、支付、账号登录。外链购票若后续接入，仅跳转第三方，本小程序不收票款。
