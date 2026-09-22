# 邪修交通 · 交互原型

静态微信小程序风格移动端 Web 原型（约 390px 宽，桌面居中）。**只推荐路线，不卖票**。无后端、无真实 API。

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
2. 或：`python3 -m http.server 8765` 后访问 `http://127.0.0.1:8765/`
3. 建议手机模式 / 窄窗；宽屏有手机外框。

## 屏幕地图

| 页面 | 说明 |
|------|------|
| **查询页** | 出发/目的地、日期灵活、有序途经最多 3。「开始邪修」。默认徐州 → 拉萨。 |
| **结果页** | 短 Loading → 三主卡 + 更多；途经时 NoticeBar + Tabs。Empty/Error 可演示（目的地「空」「错」）。 |
| **方案详情** | 怎么去（Steps）、为什么、怎么玩、分段去购票 → Toast。 |
| **关于** | 说明与免责声明。 |

## 说明

- 价格、时刻为 **参考** mock。无登录、支付；不调用真实票务 API。
