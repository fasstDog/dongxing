# 邪修交通 · 微信小程序脚手架

基于 **Vant Weapp**（`@vant/weapp`）的小程序壳：**查询** → **三主卡结果** → **方案详情** → **关于**。读本地 mock JSON，**无真实 API / 无登录 / 无支付**。

> **只推荐路线，不卖票。** 「去购票」仅 Toast：`将跳转12306/OTA，不卖票`。

## 打开方式

`project.config.json` 在 **`miniprogram/`** 内。用微信开发者工具 **打开本目录**（不要打开仓库根）。

```bash
cd miniprogram
npm install
# 开发者工具：工具 → 构建 npm
```

## 目录

```
miniprogram/
  app.js / app.json / app.wxss
  project.config.json
  package.json                 # @vant/weapp
  utils/adapt-plans.js         # snake_case → UI（含详情字段）
  data/plans-xuzhou-lhasa.json
  data/plans-shanghai-chengdu.json
  data/plans-beijing-wuhan.json
  pages/query/                 # 查询（样例 OD + 空/失败演示开关）
  pages/results/               # 三主卡 + 加载/空/失败三态
  pages/detail/                # 怎么去 / 为什么 / 怎么玩 / 去购票 stub
  pages/about/                 # 产品说明 / 免责 / 数据说明
```

## Mock 与 OD

- 精简/拷贝自仓库 `data/mock/plans-*.json`，含 `timeline` / `why_detail` / `play` / `buy_legs`。
- 查询页样例：**徐州→拉萨** / **上海→成都** / **北京→武汉**。
- 结果页按 OD `require` 对应 JSON；详情按 `plan id` 查找（可走 `globalData.lastPlans` 缓存）。

## 页面

| 页面 | 行为 |
|------|------|
| `pages/query` | 出发/到达、日期灵活、途经≤3、样例切换、演示空/失败开关、「开始邪修」、入口「关于」 |
| `pages/results` | ~700ms「正在邪修组合…」→ 三主卡；空态示例三线；失败再试/改条件 |
| `pages/detail` | 怎么去（timeline）、为什么、怎么玩、去购票（Toast stub） |
| `pages/about` | 只推荐不卖票、免责声明、复制数据说明、版本提示 |

文案对齐仓库 `docs/空态与文案规范.md`。

## 免责声明

本项目**只推荐不卖票**，不提供购票、支付、账号登录。价格、时刻均为参考，不保证有票。
