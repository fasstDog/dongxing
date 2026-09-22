# Mock 数据字段约定（定稿）

> 状态：**已与「邪修·规则引擎」对齐（2026-09-22）**  
> 分工：数据内容提供 `Leg` / `PlayPoi` + source/as_of；引擎负责枢纽候选、MCT、枚举、打分、三主卡与「为什么」模板。  
> 原则：程序出计划；价格/时刻标「参考」；**模型不生成车次与票价**。MVP **火车优先**，航班第二。  
> Schema：`docs/schemas/leg.schema.json`、`docs/schemas/play-poi.schema.json`  
> 冒烟样例：`data/mock/xuzhou-lhasa.json`

---

## `Leg`（必填）

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `"train"` \| `"flight"` | |
| `from_city` / `to_city` | string | 城市名（枢纽匹配） |
| `from_station` / `to_station` | string | 站/机场显示名（同站 MCT） |
| `dep_at` / `arr_at` | string | ISO 8601 **带时区偏移** |
| `duration_min` | int | 分钟 |
| `price_ref_cny` | int | 打分用单一参考价（元） |
| `seat_hint` | string | 建议席别 |
| `service_ref` | string | 车次/航班参考；禁止引擎臆造 |
| `source` | string | 数据源标识 |
| `as_of` | string | 缓存/快照 ISO 时间 |

## `Leg`（选填）

| 字段 | 类型 | 说明 |
|------|------|------|
| `price_range` | `{ min, max }` | 仅展示 |
| `comfort` | enum | 屁股友好加权：`hardseat` \| `hard_sleeper` \| `soft_sleeper` \| `second_class` \| `first_class` \| `economy` \| `unknown` |
| `from_station_code` / `to_station_code` | string | 站码 / IATA |

废弃名：`train_or_flight_ref`、仅 HH:mm 的 `dep_time`。

## `PlayPoi`

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

引擎：仅当 `buffer_hours >= poi.min_buffer_hours` 才挂 POI。

## 头部枢纽（以拍板为准）

见 `docs/hubs-mvp.md` / `docs/技术与设计拍板.md`：北京、上海、广州、深圳、成都、重庆、武汉、杭州、郑州、西安、兰州、西宁（12 城；含杭州，不含昆明）。
