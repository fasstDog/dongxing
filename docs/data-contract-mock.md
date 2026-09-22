# Mock 数据字段约定（草稿）

> 状态：**待「邪修·规则引擎」确认字段名与类型**  
> 原则：程序出计划；价格/时刻标「参考」；模型不生成车次与票价。  
> MVP：**火车优先**，航班第二（空铁混搭的「最快」等）。  
> 密钥不进仓库；本文件不含任何凭据。

---

## 1. 分段腿 `Leg`

供枚举、换乘窗校验与打分。

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `"train"` \| `"flight"` | 交通方式 |
| `from_station` | string | 出发站/机场名（代码可后续加） |
| `to_station` | string | 到达站/机场名 |
| `dep_at` | string | 出发时刻，建议 ISO-8601（含日期） |
| `arr_at` | string | 到达时刻 |
| `duration_min` | int | 段时长（分钟） |
| `price_ref_cny` | int | 单一参考价（元，整数）；或与下行二选一 |
| `price_min_cny` / `price_max_cny` | int | 参考价区间（元） |
| `seat_hint` | string | 建议席别文案，如 `硬卧优先` |
| `service_ref` | string | 车次/航班参考文案（mock 可写「Z165 类」） |
| `source` | string | 数据来源标识，如 `mock` / 合规源名 |
| `as_of` | string | 缓存/快照时间 ISO-8601 |

展示层可将区间格式化为 `约 ¥280–420`；引擎侧优先用数值字段。

---

## 2. 换乘怎么玩 `TransferPlay`（POI）

仅当缓冲达到产品阈值时由引擎挂到方案上。

| 字段 | 类型 | 说明 |
|------|------|------|
| `hub_city` | string | 枢纽城市 |
| `anchor_station` | string | 距离基准站/机场 |
| `name` | string | POI 名称 |
| `dist_km` | number \| null | 距锚点公里（可选） |
| `dist_text` | string | 展示用距离文案 |
| `suggest_hours` | number \| null | 建议游玩小时数（可选） |
| `suggest_text` | string | 展示用「建议游玩 …」 |
| `min_buffer_hours` | number | 最低缓冲门槛（与规则对齐：2 / 3 / 6） |
| `back_ok_note` | string | 是否赶得回 / 接驳提示 |

与原型 `play[]` 的对应：`name`←name，`dist_text`←dist，`suggest_text`←suggest，`back_ok_note`←ok。

---

## 3. 最小 mock 示例（徐州 → 西宁 → 拉萨）

```json
{
  "od": { "from": "徐州", "to": "拉萨" },
  "legs": [
    {
      "mode": "train",
      "from_station": "徐州",
      "to_station": "西宁",
      "dep_at": "2026-10-01T18:00:00+08:00",
      "arr_at": "2026-10-02T14:30:00+08:00",
      "duration_min": 1230,
      "price_min_cny": 280,
      "price_max_cny": 420,
      "seat_hint": "硬卧 / 硬座",
      "service_ref": "Z165 类",
      "source": "mock",
      "as_of": "2026-09-22T12:00:00+08:00"
    },
    {
      "mode": "train",
      "from_station": "西宁",
      "to_station": "拉萨",
      "dep_at": "2026-10-02T21:00:00+08:00",
      "arr_at": "2026-10-03T17:30:00+08:00",
      "duration_min": 1230,
      "price_min_cny": 240,
      "price_max_cny": 360,
      "seat_hint": "硬卧优先",
      "service_ref": "西宁始发进藏 Z6801 类",
      "source": "mock",
      "as_of": "2026-09-22T12:00:00+08:00"
    }
  ],
  "transfer_plays": [
    {
      "hub_city": "西宁",
      "anchor_station": "西宁站",
      "name": "塔尔寺",
      "dist_km": 25,
      "dist_text": "距西宁城区约 25km",
      "suggest_hours": 2.5,
      "suggest_text": "建议游玩 2–3 小时",
      "min_buffer_hours": 6,
      "back_ok_note": "缓冲 ≥6 小时较从容；打车往返并提前回站"
    }
  ]
}
```

价格、时刻均为 **mock 参考**，以购票平台为准。

---

## 4. 待规则引擎确认

1. 字段命名是否采用上表，还是引擎内部已有命名需对齐？  
2. 金额用「元整数」还是「分」？  
3. MVP 是否立刻引入站码（如 `XUZ` / `XNN`），还是先中文站名？  
4. `TransferPlay` 是独立表按 `hub_city` 查，还是嵌在方案 JSON 里？  
5. 缓存键与降级：无真源时是否统一 `source: "mock"` + 固定 `as_of`？

确认后本文件改为「已定稿」，并补 `data/` 样例文件供引擎读取。
