# 方案生成 API 约定（mock / v1）

> 状态：**定稿草案（规则引擎，2026-09-22）**  
> 消费：`docs/data-contract-mock.md` 的 `Leg` / `TransferPlay`（数据文件：`data/mock/legs-*.json`、`data/hub-pois.json`）  
> 产出：前端三主卡 + 详情（怎么去 · 为什么 · 怎么玩 · 购票段）  
> 原则：**程序算计划**；价格/时刻为参考；**模型禁止生成车次与票价**。

---

## 0. 数据文件布局（与数据内容约定）

| 文件 | 内容 |
|------|------|
| `data/mock/legs-xuzhou-lhasa.json` | `{ meta, legs: Leg[] }`，冒烟 OD |
| `data/hub-pois.json` | `{ meta, pois: TransferPlay[] }`，按 `hub_city` 查 |
| `docs/schemas/leg.schema.json` | Leg |
| `docs/schemas/transfer-play.schema.json` | TransferPlay |

展示价区间用 Leg 的 `price_min_cny` / `price_max_cny`（勿再用 `price_range` 对象）。

---


## 1. 端点（MVP）

| 项 | 值 |
|----|-----|
| Method | `POST` |
| Path | `/v1/plans/search` |
| Content-Type | `application/json` |

本地 mock 也可：`node engine/cli.js search --json <request.json>`（实现后另见 README）。

---

## 2. 请求 `PlansSearchRequest`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from_city` | string | 是 | 出发城市 |
| `to_city` | string | 是 | 到达城市 |
| `date_flexible` | boolean | 否 | 默认 `true`；为 true 时忽略具体日期或仅作宽松约束 |
| `date` | string \| null | 否 | `YYYY-MM-DD`（本地日历日）；`date_flexible=true` 时可 null |
| `vias` | string[] | 否 | **有序**途经城市，MVP 最多 3；空 = 自动选枢纽 |
| `path_mode` | `"auto"` \| `"user"` | 否 | 有途经时：前端「系统自动邪修 / 按你的路径」。无途经时忽略，视为 `auto` |

```json
{
  "from_city": "徐州",
  "to_city": "拉萨",
  "date_flexible": true,
  "date": null,
  "vias": [],
  "path_mode": "auto"
}
```

指定途经示例：`"vias": ["西宁"]`, `"path_mode": "user"`。

---

## 3. 响应 `PlansSearchResponse`

| 字段 | 类型 | 说明 |
|------|------|------|
| `ok` | boolean | 业务是否成功出方案 |
| `error` | object \| null | 失败时：`{ "code", "message" }`（见 §6） |
| `meta` | object | 查询回显与数据新鲜度 |
| `direct_baseline` | object \| null | 直达对照（「为什么」模板用） |
| `path` | object | 实际比价路径 |
| `main` | Plan[] | **恰好 0～3**；有方案时按类型含 `cheap` / `fast` / `balanced`（缺类可不返回该槽，前端按有则展示） |
| `more` | MoreItem[] | 更多方案摘要 |

### 3.1 `meta`

| 字段 | 类型 | 说明 |
|------|------|------|
| `request` | object | 回显规范化后的请求（城市 trim、vias 去空） |
| `path_mode` | `"auto"` \| `"user"` | 本次实际模式 |
| `data_source` | string | 如 `mock` |
| `as_of` | string | ISO 8601，腿数据快照时间 |
| `disclaimer` | string | 固定：「价格、时刻均为参考，以购票平台为准」 |

### 3.2 `direct_baseline`

| 字段 | 类型 | 说明 |
|------|------|------|
| `price_ref_cny` | int \| null | 直达参考价 |
| `duration_min` | int \| null | 直达时长 |
| `summary` | string | 短文案，如「Z 字头过路 · 硬座久坐」 |
| `leg_id` | string \| null | 对应 mock leg id（若有） |

### 3.3 `path`

| 字段 | 类型 | 说明 |
|------|------|------|
| `cities` | string[] | 含起终点，如 `["徐州","西宁","拉萨"]` |
| `hubs` | string[] | 中转城（不含起终） |
| `note` | string \| null | 如「系统选枢纽：西宁」/「因你指定经西宁」 |

---

## 4. `Plan`（主卡 / 详情同源）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 方案 id，前端进详情用 |
| `type` | `"cheap"` \| `"fast"` \| `"balanced"` | 三主卡槽位 |
| `type_label` | string | `最省钱` / `最快` / `最综合` |
| `price_ref_cny` | int | 各段 `price_ref_cny` 之和（打分同源） |
| `price_display` | string | 展示串，如 `¥520–680`（可由各段 `price_min_cny`/`price_max_cny` 合成） |
| `price_note` | string | 默认 `参考价` |
| `duration_min` | int | 门到门：各段时长 + 换乘缓冲 |
| `duration_display` | string | 如 `约 32–36 小时` |
| `transfers` | int | 换乘次数（直达 0） |
| `route_one_line` | string | 一行摘要 |
| `vs_direct` | string | 相对直达一句人话 |
| `why` | string | 卡片短「为什么」 |
| `why_detail` | string | 详情长「为什么」 |
| `why_facts` | object | **模板结构化字段**（见 §5）；前端可忽略，润色可选用 |
| `play_hint` | string \| null | 卡片角标，如 `西宁可玩 · 塔尔寺等` |
| `path_note` | string \| null | 路径说明 |
| `timeline` | TimelineItem[] | 怎么去 |
| `play` | PlayCard[] \| null | 怎么玩；无则 null |
| `buy_legs` | BuyLeg[] | 分段购票外链示意 |

### 4.1 `TimelineItem`

二选一形状（用字段区分，勿混）：

**行驶段**（有 `leg`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | `"leg"` | |
| `mode` | `"train"` \| `"flight"` | |
| `mode_label` | string | 如 `火车` / `高铁` / `飞机` |
| `from_station` / `to_station` | string | |
| `dep_at` / `arr_at` | string | ISO |
| `duration_min` | int | |
| `duration_display` | string | |
| `seat_hint` | string | |
| `price_ref_cny` | int | |
| `price_display` | string | |
| `service_ref` | string | **原样来自 Leg，引擎不改写车次** |
| `leg_id` | string \| null | |
| `comfort` | string \| null | |

**换乘节点**（有 `xfer`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | `"xfer"` | |
| `city` | string | |
| `xfer_kind` | `"same_station"` \| `"same_city"` | 同站 / 同城 |
| `xfer_kind_label` | string | `同站换乘` / `同城换乘` |
| `buffer_min` | int | |
| `buffer_display` | string | |
| `tip` | string | 接驳提示（无 POI 时也要有） |

### 4.2 `PlayCard`（挂在方案级；由缓冲达标的 POI 生成）

| 字段 | 类型 | 说明 |
|------|------|------|
| `hub_city` | string | |
| `name` | string | |
| `dist_text` | string | |
| `suggest_text` | string | |
| `ok` | string | ← `back_ok_note` |
| `min_buffer_hours` | number | |

### 4.3 `BuyLeg`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 如 `徐州 → 西宁` |
| `sub` | string | 跳转说明 + 参考价 |
| `mode` | `"train"` \| `"flight"` | 前端选 12306 vs 航司/OTA 文案 |
| `deep_link_hint` | string \| null | MVP 可 null；仅示意不卖票 |

### 4.4 `MoreItem`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | |
| `type_label` | string | 如 `少折腾` / `屁股友好` |
| `title` | string | |
| `sub` | string | |
| `price_display` | string | |
| `plan_id` | string | 点进详情时对应完整 `Plan.id`（可与某主卡相同或独立） |

---

## 5. `why_facts`（为什么 · 模板字段）

引擎填数，文案层套模板；**不含臆造车次**。

| 字段 | 类型 | 说明 |
|------|------|------|
| `hubs` | string[] | 中转城 |
| `user_via` | boolean | 是否因用户指定途经 |
| `price_ref_cny` | int | |
| `direct_price_ref_cny` | int \| null | |
| `price_delta_cny` | int \| null | 本方案 − 直达（负为更省） |
| `duration_min` | int | |
| `direct_duration_min` | int \| null | |
| `duration_delta_min` | int \| null | |
| `transfers` | int | |
| `comfort_score` | number \| null | 0～1，由 legs.comfort 汇总 |
| `playable` | boolean | 是否挂了 POI |
| `notes` | string[] | 短标签，如 `始发进藏`、`空铁混搭` |

---

## 6. 错误码 `error.code`

| code | 含义 |
|------|------|
| `INVALID_REQUEST` | 缺 OD、途经超限等 |
| `NO_LEGS` | mock/源无可用腿 |
| `NO_FEASIBLE` | 有腿但 MCT/约束下无可行组合 |
| `INTERNAL` | 其它 |

空态由前端根据 `ok=false` 或 `main.length===0` 展示；文案归产品体验。

---

## 7. 引擎流水线（实现约束）

1. 取 `Leg`（mock JSON / 后续真源）；直达作 `direct_baseline`。  
2. 定链：`path_mode=user` → `from + vias + to`；`auto` → 死枢纽表候选（见 `docs/hubs-mvp.md`）插 1 个中转（MVP）。  
3. 枚举分段组合；粗 MCT：同站 / 同城最小缓冲（配置常数，默认同站 60min、同城 180min，可调）。  
4. 丢弃不达标组合；缓冲 ≥ TransferPlay.`min_buffer_hours` 才挂 `play`。  
5. 打分：`cheap` = 最低 `price_ref` 和（可加 `duration_min` 上限）；`fast` = 最短总时长；`balanced` = 价 + 时 + 换乘 + comfort 加权。  
6. 填充 `Plan` 展示字段与 `why_facts`；`service_ref` **原样透传**。

MVP：默认最多 **1 次中转**进三主卡；途经个数 ≤ 3。

---

## 8. 与前端原型字段映射

| 原型 `js/app.js` | 本 API |
|------------------|--------|
| `type` / `typeLabel` | `type` / `type_label` |
| `price` / `priceNote` | `price_display` / `price_note` |
| `duration` | `duration_display`（另给 `duration_min`） |
| `routeOneLine` | `route_one_line` |
| `vsDirect` / `why` / `whyDetail` | `vs_direct` / `why` / `why_detail` |
| `playHint` / `pathNote` | `play_hint` / `path_note` |
| `timeline[]` | `timeline[]`（结构化 `kind`） |
| `play[]` | `play[]`（`ok` ← `back_ok_note`） |
| `buyLegs[]` | `buy_legs[]` |

前端可继续用 camelCase 适配层；**引擎与文档以 snake_case 为准**。

---

## 9. 样例（徐州 → 拉萨 · 自动）

请求见 §2。成功时 `main` 应能覆盖：

- `cheap`：偏直达硬座腿  
- `fast`：徐州→西安（G）+ 西安飞拉萨  
- `balanced`：徐州→西宁 + 西宁→拉萨，且西宁缓冲够时可挂塔尔寺等 POI  

具体数值以 `data/mock/legs-xuzhou-lhasa.json` + `data/hub-pois.json` 枚举结果为准，**不以本文写死票价**。

---

*与 `docs/data-contract-mock.md`、`docs/技术与设计拍板.md` 冲突时：数据字段以后者为数据源约定、产品原则以拍板与 PRD 为准；本文件管引擎出入参。*
