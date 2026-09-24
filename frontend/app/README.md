# 懂行 · React Native 发布占位（iOS / Android）

**正式客户端之一**的 App 面：React Native，**仅 iOS + Android**。

- **生产 UI 源**在 [`../taro-app/`](../taro-app/)（Taro 一码多端），不在本目录另起业务页。
- 与微信小程序共享：`@dongxing/shared`、引擎 `POST /v1/plans/search`、同一 Taro 工程。
- **禁止 Alita**；Win / macOS / Web / tvOS / Linux / Proton Native **不进产品范围**。

本目录为发布/壳占位（`package.json` + README）。脚手架与业务实现以 `taro-app` 为准。

详见：

- [`docs/ADR-客户端-Taro一码多端.md`](../../docs/ADR-客户端-Taro一码多端.md)
- [`docs/ADR-客户端-ReactNative.md`](../../docs/ADR-客户端-ReactNative.md)
