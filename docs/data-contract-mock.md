# Mock 数据字段约定（已定稿）

> 状态：**已定稿**（与「邪修·规则引擎」2026-09-22 对齐）  
> 分工：数据内容提供 `Leg` / `TransferPlay` + `source`/`as_of`；引擎负责枢纽候选、MCT、枚举、打分、三主卡与「为什么」模板。  
> 原则：程序出计划；价格/时刻标「参考」；**模型不生成车次与票价**。MVP **火车优先**，航班第二。  
> 密钥不进仓；无真源时 `source: "mock"` + 写入时的 `as_of`。  
> Schema：`docs/schemas/leg.schema.json`、`docs/schemas/transfer-play.schema.json`  
> 数据：`data/mock/legs-xuzhou-lhasa.json`、`data/hub-pois.json`（独立表）

---

## `Leg`（必填）

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `"train"` \| `"flight"` | |
| `from_city` / `to_city` | string | 城市名（枢纽匹配、途经链） |
| `from_station` / `to_station` | string | 站/机场**中文显示名**（MVP 暂不引入站码） |
| `dep_at` / `arr_at` | string | ISO 8601 **带时区偏移** |
| `duration_min` | int | 分钟 |
| `price_ref_cny` | int | **元整数**代表价，打分只用此字段 |
| `seat_hint` | string | 建议席别 |
| `service_ref` | string | 车次/航班参考；禁止引擎臆造 |
| `source` | string | 如 `mock` |
| `as_of` | string | 缓存/快照 ISO 时间 |

## `Leg`（选填）

| 字段 | 类型 | 说明 |
|------|------|------|
| `price_min_cny` / `price_max_cny` | int | 仅展示区间（元整数） |
| `comfort` | enum | `hardseat` \| `hard_sleeper` \| `soft_sleeper` \| `second_class` \| `first_class` \| `economy` \| `unknown` |
| `from_station_code` / `to_station_code` | string | 后续再加；MVP 可省略 |
| `id` | string | mock / 缓存键方便 |

废弃：`train_or_flight_ref`、仅 HH:mm 的 `dep_time`、嵌在腿里的玩法对象、`price_range` 对象（改用 min/max 两字段）。

## `TransferPlay`（独立表）

按 `hub_city`（+ 可选 `anchor_station`）查询；引擎挂到换乘节点，**不要嵌死在 Leg 里**。

| 字段 | 类型 | 说明 |
|------|------|------|
| `hub_city` | string | |
| `anchor_station` | string | 锚点站/机场 |
| `name` | string | |
| `dist_text` | string | MVP 必填 |
| `dist_km` | number \| null | 可选 |
| `suggest_hours` | number | 建议游玩小时 |
| `suggest_text` | string | 展示补充 |
| `min_buffer_hours` | number | ≥2 同站休息；≥3 同城景点；≥6 半日 |
| `back_ok_note` | string | 是否赶得回 |

引擎：仅当 `buffer_hours >= poi.min_buffer_hours` 才挂。

## 头部枢纽

以 `docs/hubs-mvp.md` / 拍板为准（12 城，**杭州进、昆明出**）：北京、上海、广州、深圳、成都、重庆、武汉、杭州、郑州、西安、兰州、西宁。每城目标 3～6 条 `TransferPlay`。
