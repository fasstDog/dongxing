# backend/

| 路径 | 角色 |
|------|------|
| [`engine/`](engine/) | 规则引擎（TS 主线；旧 CJS / `*.py` 冻结） |
| [`data/`](data/) | mock 腿与 plans、枢纽 POI |

`engine` 解析数据根为**本目录**（`engine` 与 `data` 兄弟）。共享契约：根级 `@dongxing/shared`。
