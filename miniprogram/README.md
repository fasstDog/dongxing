# 邪修交通 · 微信小程序脚手架

基于 **Vant Weapp**（锁定 `@vant/weapp`，开源优先）的小程序壳：**查询页** + **结果页三主卡**。读本地 mock JSON，**无真实 API / 无登录 / 无支付**。

> **只推荐路线，不卖票。** 价格与时刻为参考 mock。

## 布局说明

`project.config.json` 放在 **`miniprogram/` 目录内**。用微信开发者工具 **直接打开 `miniprogram/`**（不要打开仓库根）。仓库根无 `miniprogramRoot` 配置。

```
miniprogram/
  app.js / app.json / app.wxss
  sitemap.json
  project.config.json
  package.json                 # @vant/weapp@^1.11.7
  utils/adapt-plans.js         # snake_case → UI 字段
  data/plans-xuzhou-lhasa.json
  data/plans-shanghai-chengdu.json
  pages/query/                 # 查询
  pages/results/               # 三主卡 + loading/empty/error
```

## 在微信开发者工具中打开

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. **导入项目** → 目录选仓库下的 **`miniprogram/`**。
3. AppID 可用测试号 / `touristappid`（已写在 `project.config.json`）。
4. 详情 → 本地设置：按需勾选；需 **启用 npm**。

## 安装并构建 npm（Vant Weapp）

```bash
cd miniprogram
npm install
```

然后在开发者工具：**工具 → 构建 npm**。  
成功后出现 `miniprogram_npm/@vant/weapp/`。`node_modules/` 与 `miniprogram_npm/` 已在仓库根 `.gitignore`，请勿提交。

页面 `usingComponents` 使用：

```json
"van-button": "@vant/weapp/button/index"
```

## Mock 与 OD 切换

- 精简自仓库 `data/mock/plans-*.json` 的三主卡字段（含 `scenarios.auto`）。
- 查询页样例按钮：**徐州→拉萨** / **上海→成都**；结果页按 OD `require` 对应 JSON。
- `utils/adapt-plans.js` 映射 `type_label` → `typeLabel`、`price_display` → `price`、`vs_direct`、`why`、`play_hint` 等。
- 空态 / 加载 / 失败文案对齐 `docs/空态与文案规范.md`。

## 页面

| 页面 | 行为 |
|------|------|
| `pages/query` | 出发/到达、日期灵活、有序途经≤3、样例、演示开关、「开始邪修」 |
| `pages/results` | ~700ms loading → 三主卡；empty/error 双按钮 |

## 免责声明

本项目**只推荐不卖票**，不提供购票、支付、账号登录。
