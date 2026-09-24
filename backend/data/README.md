# Mock 数据

`plans-xuzhou-lhasa.json` 是徐州→拉萨的方案级 mock 响应：顶层 `plans` 为最省钱、最快、最综合三张主卡，`morePlans` 为更多方案。每条方案内含完整 `legs`、换乘节点、`why` 文案和（达到缓冲阈值时的）`transfer_play`。

## 前端如何加载

当前原型是静态页面。前端接入方案级数据时，在查询成功后通过相对路径加载：

```js
const response = await fetch("../backend/data/plans-xuzhou-lhasa.json")  // 自 prototype/ 页面;
const data = await response.json();
const mainPlans = data.plans;
const morePlans = data.morePlans;
```

直接双击 `index.html` 时浏览器可能拦截 `fetch`；请在仓库根目录启动静态服务后访问 `prototype/index.html`，例如：

```bash
python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

`backend/data/mock/legs-xuzhou-lhasa.json` 是可复用的 Leg 原始表，`backend/data/hub-pois.json` 是独立的 TransferPlay 表。方案 mock 中的价格和时刻都标为**参考**，`seat_hint` 仅表示建议席别；不提供实时余票、座位库存或出票承诺。
