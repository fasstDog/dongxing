# 邪修交通 · 交互原型

静态微信小程序风格移动端 Web 原型（约 390px 宽，桌面居中）。**只推荐路线，不卖票**。无后端、无真实票务 API。

产品与技术拍板：[`docs/技术与设计拍板.md`](docs/技术与设计拍板.md)、[`docs/产品需求整理.md`](docs/产品需求整理.md)。

## UI 技术（开源优先）

- **Vant 4** + **Vue 3**，均通过 **CDN** 引入（无构建步骤）。
- **禁止自研设计系统**；交互以 Vant 组件为准（NavBar、Field、Button、Tag、Cell、Steps、Toast、Empty、Loading、Tabs、NoticeBar 等）。
- `css/styles.css` 仅保留手机外框、布局，以及三主卡类型色（最省钱 / 最快 / 最综合）轻量修饰。
- 后续小程序可迁 **Vant Weapp**。详见 [`docs/技术与设计拍板.md`](docs/技术与设计拍板.md)。

```html
<link rel="stylesheet" href="https://fastly.jsdelivr.net/npm/vant@4/lib/index.css" />
<script src="https://fastly.jsdelivr.net/npm/vue@3"></script>
<script src="https://fastly.jsdelivr.net/npm/vant@4/lib/vant.min.js"></script>
```

## 如何打开

1. 浏览器直接打开 `index.html`（需能访问 CDN）。
2. 或在仓库根目录起静态服务后访问：
   ```bash
   python3 -m http.server 8765
   # 打开 http://127.0.0.1:8765/
   ```
3. 建议手机模式 / 窄窗；宽屏有手机外框。

结果页优先读 `data/plans-*.json`（由引擎生成）。空态 / 加载 / 失败文案见 [`docs/空态与文案规范.md`](docs/空态与文案规范.md)。

## 规则引擎（mock）

程序算方案：取腿 → MCT → 打分 → 导出前端 JSON。**不含实时余票**；模型禁止编车次/票价。详见 [`engine/README.md`](engine/README.md)。

```bash
# Python：枚举 + 打分，重写前端 / API 形 JSON
python3 engine/search.py

# Node：pipeline 冒烟（徐州→拉萨，含 via 西宁）
node engine/search-pipeline-demo.js

# 火车 mock 适配器单测
node engine/adapters/train.mock.js 徐州 西宁 2026-10-01
```

| 产出 | 用途 |
|------|------|
| `data/plans-xuzhou-lhasa.json` | 前端 `mock-plan-response.v1` |
| `data/mock/plans-xuzhou-lhasa.json` | 引擎 API 形（[`docs/api-plans-contract.md`](docs/api-plans-contract.md)） |
| `data/hub-pois.json` | 12 城「怎么玩」POI |

## 屏幕地图

| 页面 | 说明 |
|------|------|
| **查询页** | 出发/目的地、日期灵活、有序途经最多 3。「开始邪修」。默认徐州 → 拉萨。 |
| **结果页** | 短 Loading → 三主卡 + 更多；途经时 NoticeBar + Tabs。含无方案 / 失败态；查询页底可开演示开关。 |
| **方案详情** | 怎么去（Steps）、为什么、怎么玩、分段去购票 → Toast。 |
| **关于** | 说明与免责声明。 |

## 协作与提交

- 每做完一个阶段立刻 **commit**；该 push 时由 **发布** 或 **负责人** 推（冲突先 `git pull --rebase`）。
- 日常小改各角色直接 commit；发布负责整合说明与版本 tag（有 tag 需求时再打）。
- 范围变更先找负责人；禁止卖票/支付/账号、违规爬取、密钥进仓。

## 说明

- 价格、时刻为 **参考** mock。无登录、支付；不调用真实票务 API。
