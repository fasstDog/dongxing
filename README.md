# 邪修交通 · 交互原型

静态微信小程序风格移动端 Web 原型（约 390px 宽，桌面居中）。**只推荐路线，不卖票**。无后端、无真实票务 API。

产品与技术拍板：[`docs/技术与设计拍板.md`](docs/技术与设计拍板.md)、[`docs/产品需求整理.md`](docs/产品需求整理.md)。

微信小程序（Vant Weapp：查询 + 三主卡 + 详情）：**[`miniprogram/README.md`](miniprogram/README.md)**。交互对照 [`docs/小程序-查询与三主卡交互要点.md`](docs/小程序-查询与三主卡交互要点.md)。

当前稳定 tag：**[`v0.2.0-miniprogram`](https://github.com/fasstDog/xiexiu-traffic-prototype/releases/tag/v0.2.0-miniprogram)**（三线 Web + 小程序详情壳）。

## UI 技术（开源优先）

- **Web 原型**：**Vant 4** + **Vue 3**（CDN，无构建步骤）。
- **小程序**：**Vant Weapp**（见 `miniprogram/`）。
- **禁止自研设计系统**；交互以 Vant 组件为准。
- `css/styles.css` 仅保留手机外框、布局，以及三主卡类型色轻量修饰。

```html
<link rel="stylesheet" href="https://fastly.jsdelivr.net/npm/vant@4/lib/index.css" />
<script src="https://fastly.jsdelivr.net/npm/vue@3"></script>
<script src="https://fastly.jsdelivr.net/npm/vant@4/lib/vant.min.js"></script>
```

## 如何打开（Web）

1. 浏览器直接打开 `index.html`（需能访问 CDN）。
2. 或在仓库根目录：
   ```bash
   python3 -m http.server 8765
   # http://127.0.0.1:8765/
   ```
3. 建议手机模式 / 窄窗。

样例 OD（已挂）：**徐州→拉萨** / **上海→成都** / **北京→武汉**。「最快」可含空铁或直飞。第四样例 **成都→重庆** 腿表已落，plans 导出中。空态见 [`docs/空态与文案规范.md`](docs/空态与文案规范.md)。

## 如何打开（小程序）

导入仓库下的 `miniprogram/` 到微信开发者工具，`npm install` 后 **工具 → 构建 npm**。步骤详见 [`miniprogram/README.md`](miniprogram/README.md)。

## 规则引擎（mock）

程序算方案：取腿 → MCT → 打分 → 导出。以 **`engine/pipeline.js`** 为准。`adapters/index` 合并 **train.mock + flight.mock**。**不含实时余票**。详见 [`engine/README.md`](engine/README.md)。

```bash
# 重导样例 plans（含空铁/直飞）
node engine/export-plans-with-flight.js
node engine/export-plans-with-flight.js bj-wh
node engine/export-plans-with-flight.js cd-cq   # 成渝，腿已有

# pipeline 冒烟 / 适配器单测
node engine/search-pipeline-demo.js
node engine/adapters/flight.mock.js 西安 拉萨 2026-10-01
node engine/adapters/train.mock.js 徐州 西宁 2026-10-01
```

| 产出 | 用途 |
|------|------|
| `data/plans-xuzhou-lhasa.json` | 前端 · 徐拉 |
| `data/plans-shanghai-chengdu.json` | 前端 · 沪蓉 |
| `data/plans-beijing-wuhan.json` | 前端 · 京广 |
| `data/mock/legs-chengdu-chongqing.json` | 成渝腿（plans 待导出） |
| `data/mock/plans-*.json` / `legs-*.json` | 引擎 API 形 / 腿 mock |
| `engine/adapters/flight.mock.js` | 航班腿（扫全部 `legs-*.json`） |
| `data/hub-pois.json` | 12 城「怎么玩」POI |

重跑导出前确认 `render_why` 口语模板。

## 屏幕地图（Web）

| 页面 | 说明 |
|------|------|
| **查询页** | 出发/到达、途经、三线样例 OD 切换。「开始邪修」。 |
| **结果页** | 三主卡 + 更多；空态 / 失败演示开关。 |
| **方案详情** | Steps（含 flight）、为什么、怎么玩、去购票 Toast。 |
| **关于** | 说明与免责声明。 |

## 协作与提交

- 每做完一个阶段立刻 **commit**；该 push 时由 **发布** 或 **负责人** 推（冲突先 `git pull --rebase`）。
- 日常小改各角色直接 commit；发布负责整合说明与版本 tag。
- 范围变更先找负责人；禁止卖票/支付/账号、违规爬取、密钥进仓。

## 说明

- 价格、时刻为 **参考** mock。无登录、支付；不调用真实票务 API。
