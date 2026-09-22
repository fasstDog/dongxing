/**
 * 邪修交通 · 交互原型（Vue 3 + Vant 4 CDN）
 * 静态 mock，无后端 / 无真实购票
 */
(function () {
  "use strict";

  const DIRECT = {
    price: "硬座约 ¥397 · 硬卧约 ¥760+",
    duration: "约 40–45 小时",
    note: "Z 字头过路车，硬座久坐、硬卧过路票难抢",
  };

  const PLANS_AUTO = {
    main: [
      {
        id: "auto-balanced",
        type: "balanced",
        typeLabel: "最综合",
        price: "¥520–680",
        priceNote: "参考价",
        duration: "约 32–36 小时",
        transfers: 1,
        routeOneLine: "徐州 → 西宁（火车）→ 拉萨（始发）",
        vsDirect: "比直达硬座略贵，比硬卧更省；后半段始发票更好抢、更舒服",
        why: "经西宁拆两段：前半段普通列车到西宁，后半段坐西宁始发进藏车，票和「屁股」往往都更好。换乘窗口够长还可顺路逛塔尔寺。",
        playHint: "西宁可玩 · 塔尔寺等",
        pathNote: "系统选枢纽：西宁",
        timeline: [
          {
            mode: "火车",
            modeClass: "",
            from: "徐州",
            to: "西宁",
            train: "参考车次如 Z165 / 类似",
            time: "约 20–22 小时",
            seat: "硬卧 / 硬座",
            price: "约 ¥280–420",
          },
          {
            xfer: true,
            city: "西宁",
            kind: "同城换乘",
            buffer: "约 5–8 小时（视班次）",
            tip: "建议同城接驳：火车站 → 市区 / 塔尔寺方向，预留回站安检时间",
          },
          {
            mode: "火车",
            modeClass: "",
            from: "西宁",
            to: "拉萨",
            train: "西宁始发进藏车（如 Z6801 类）",
            time: "约 20–21 小时",
            seat: "硬卧优先",
            price: "约 ¥240–360",
          },
        ],
        whyDetail:
          "直达过路车硬座便宜但久坐极累，硬卧贵且难抢。拆成「到西宁 + 西宁始发进藏」后，后半段多为始发，席别与出票体验通常更好；总价介于直达硬座与硬卧之间，综合舒适度与可执行性更高。因系统自动选西宁为进藏枢纽。",
        play: [
          {
            name: "塔尔寺",
            dist: "距西宁城区约 25km",
            suggest: "建议游玩 2–3 小时",
            ok: "缓冲 ≥6 小时时较从容，建议打车往返并提前回站",
          },
          {
            name: "东关清真大寺 / 摩崖公园一带",
            dist: "城区内",
            suggest: "1–2 小时轻逛",
            ok: "缓冲 3–5 小时更适合，少折腾",
          },
        ],
        buyLegs: [
          { name: "徐州 → 西宁", sub: "跳转 12306 / 铁路 OTA · 参考价约 ¥280–420" },
          { name: "西宁 → 拉萨", sub: "跳转 12306 · 始发进藏 · 参考价约 ¥240–360" },
        ],
      },
      {
        id: "auto-cheap",
        type: "cheap",
        typeLabel: "最省钱",
        price: "¥360–450",
        priceNote: "参考价",
        duration: "约 40–48 小时",
        transfers: 0,
        routeOneLine: "徐州 → 拉萨（直达过路 · 硬座为主）",
        vsDirect: "接近直达硬座价位，时长很长，「屁股」不友好",
        why: "总价最低档：尽量硬座直达或极廉价组合。适合预算极紧、能忍久坐的人；不推荐带老人小孩。",
        playHint: null,
        pathNote: "接近直达对照",
        timeline: [
          {
            mode: "火车 · 硬座",
            modeClass: "hardseat",
            from: "徐州",
            to: "拉萨",
            train: "Z 字头过路车（参考）",
            time: "约 40–45 小时",
            seat: "硬座（硬卧另计且难抢）",
            price: "硬座约 ¥397",
          },
        ],
        whyDetail:
          "公开参考量级下，直达硬座是总价地板。但连续坐 40+ 小时体验差，过路硬卧票难抢。若只看「最省钱」可选此方案；若稍有预算，强烈建议看「最综合」经西宁拆段。价格、时刻均为参考，以 12306 为准。",
        play: null,
        buyLegs: [
          { name: "徐州 → 拉萨（直达）", sub: "跳转 12306 · 硬座参考约 ¥397" },
        ],
      },
      {
        id: "auto-fast",
        type: "fast",
        typeLabel: "最快",
        price: "¥980–1380",
        priceNote: "参考价",
        duration: "约 12–16 小时",
        transfers: 1,
        routeOneLine: "徐州 → 西安（高铁）→ 拉萨（飞机）",
        vsDirect: "比直达省约 1–1.5 天，但总价明显更高",
        why: "高铁接西安再飞拉萨（或经成都空铁），门到门最短。适合时间紧、能接受机票价的人。",
        playHint: "西安缓冲够可玩兵马俑",
        pathNote: "系统选枢纽：西安",
        timeline: [
          {
            mode: "高铁",
            modeClass: "",
            from: "徐州东",
            to: "西安北",
            train: "G 字头（参考）",
            time: "约 4–5 小时",
            seat: "二等座",
            price: "约 ¥450–520",
          },
          {
            xfer: true,
            city: "西安",
            kind: "同城换乘（高铁站 → 咸阳机场）",
            buffer: "建议 ≥3.5 小时",
            tip: "地铁 / 机场大巴接驳，预留安检与值机",
          },
          {
            mode: "飞机",
            modeClass: "flight",
            from: "西安咸阳",
            to: "拉萨贡嘎",
            train: "航司直飞（参考）",
            time: "约 3.5 小时 + 进出港",
            seat: "经济舱",
            price: "约 ¥500–850（浮动大）",
          },
        ],
        whyDetail:
          "门到门最短路径之一：高铁快速到西安枢纽，再飞拉萨，避开 40 小时硬座。代价是总价与直达硬座差一截，机票随季节波动大。若西安停留 ≥6 小时，可考虑兵马俑半日；否则专心接驳即可。",
        play: [
          {
            name: "兵马俑 / 华清宫",
            dist: "临潼，距市区约 40km",
            suggest: "半日 4–5 小时",
            ok: "仅当缓冲 ≥6 小时且早到西安时考虑；否则别硬排",
          },
        ],
        buyLegs: [
          { name: "徐州东 → 西安北", sub: "跳转 12306 · 高铁参考约 ¥450–520" },
          { name: "西安 → 拉萨", sub: "跳转航司 / OTA · 机票参考约 ¥500–850" },
        ],
      },
    ],
    more: [
      {
        id: "auto-more-1",
        typeLabel: "少折腾",
        title: "经成都空铁",
        sub: "高铁/火车 → 成都 → 飞拉萨 · 约 14–20h",
        price: "¥900+",
        planRef: "auto-fast",
      },
      {
        id: "auto-more-2",
        typeLabel: "屁股友好",
        title: "经西宁 · 两段硬卧",
        sub: "强调卧铺占比 · 时长约 34h",
        price: "¥620+",
        planRef: "auto-balanced",
      },
      {
        id: "auto-more-3",
        typeLabel: "直达对照",
        title: "直达硬卧（若抢到）",
        sub: DIRECT.duration + " · " + DIRECT.note,
        price: "¥760+",
        planRef: "auto-cheap",
      },
    ],
  };

  const PLANS_VIA_XINING = {
    main: [
      {
        id: "via-balanced",
        type: "balanced",
        typeLabel: "最综合",
        price: "¥500–650",
        priceNote: "参考价",
        duration: "约 33–37 小时",
        transfers: 1,
        routeOneLine: "徐州 → 西宁 → 拉萨（按你的路径）",
        vsDirect: "因你指定经西宁：后半段可拼始发，综合体验优于过路直达",
        why: "同一路径下的舒适向组合：尽量硬卧 + 合理缓冲，方便中转玩塔尔寺。",
        playHint: "西宁可玩 · 塔尔寺等",
        pathNote: "因你指定经西宁",
        timeline: [
          {
            mode: "火车",
            modeClass: "",
            from: "徐州",
            to: "西宁",
            train: "参考车次",
            time: "约 21 小时",
            seat: "硬卧",
            price: "约 ¥320–400",
          },
          {
            xfer: true,
            city: "西宁",
            kind: "同城换乘",
            buffer: "约 6–9 小时",
            tip: "按你指定路径在西宁换乘；缓冲充足可出站游玩",
          },
          {
            mode: "火车",
            modeClass: "",
            from: "西宁",
            to: "拉萨",
            train: "始发进藏",
            time: "约 20–21 小时",
            seat: "硬卧",
            price: "约 ¥240–320",
          },
        ],
        whyDetail:
          "你指定了途经西宁，三主卡都在「徐州→西宁→拉萨」这条链上比班次与席别，而不是换别的城市。本方案兼顾价格与卧铺占比，并留出可玩缓冲。",
        play: [
          {
            name: "塔尔寺",
            dist: "距西宁城区约 25km",
            suggest: "建议游玩 2–3 小时",
            ok: "缓冲充足，赶得回（请提前 2 小时回站）",
          },
        ],
        buyLegs: [
          { name: "徐州 → 西宁", sub: "跳转 12306 · 参考价约 ¥320–400" },
          { name: "西宁 → 拉萨", sub: "跳转 12306 · 参考价约 ¥240–320" },
        ],
      },
      {
        id: "via-cheap",
        type: "cheap",
        typeLabel: "最省钱",
        price: "¥420–520",
        priceNote: "参考价",
        duration: "约 36–42 小时",
        transfers: 1,
        routeOneLine: "徐州 → 西宁（硬座）→ 拉萨（硬座/硬卧）",
        vsDirect: "仍经西宁，总价压到接近直达硬座",
        why: "同一路径下压价：前段硬座、后段尽量低价席别；时长更长。",
        playHint: null,
        pathNote: "因你指定经西宁",
        timeline: [
          {
            mode: "火车 · 硬座",
            modeClass: "hardseat",
            from: "徐州",
            to: "西宁",
            train: "参考",
            time: "约 21–23 小时",
            seat: "硬座",
            price: "约 ¥200–260",
          },
          {
            xfer: true,
            city: "西宁",
            kind: "同城换乘",
            buffer: "约 3–5 小时",
            tip: "缓冲偏紧，建议站内或近处休息，不硬推景点",
          },
          {
            mode: "火车",
            modeClass: "",
            from: "西宁",
            to: "拉萨",
            train: "参考",
            time: "约 20–21 小时",
            seat: "硬座 / 硬卧",
            price: "约 ¥220–280",
          },
        ],
        whyDetail:
          "在你指定的西宁路径上，通过硬座占比换更低总价。换乘缓冲可能不够玩景点，只提示休息与接驳。",
        play: null,
        buyLegs: [
          { name: "徐州 → 西宁", sub: "跳转 12306 · 硬座参考" },
          { name: "西宁 → 拉萨", sub: "跳转 12306 · 参考价" },
        ],
      },
      {
        id: "via-fast",
        type: "fast",
        typeLabel: "最快",
        price: "¥780–1100",
        priceNote: "参考价",
        duration: "约 22–28 小时",
        transfers: 1,
        routeOneLine: "徐州 → 西宁（较快车）→ 拉萨",
        vsDirect: "同路径下选衔接更紧、总时长更短的班次组合",
        why: "仍按西宁路径，压缩换乘与选较快车次；不一定飞。",
        playHint: "缓冲短则不推玩",
        pathNote: "因你指定经西宁",
        timeline: [
          {
            mode: "火车",
            modeClass: "",
            from: "徐州",
            to: "西宁",
            train: "衔接较紧的参考班次",
            time: "约 19–21 小时",
            seat: "硬卧",
            price: "约 ¥350–450",
          },
          {
            xfer: true,
            city: "西宁",
            kind: "同城换乘",
            buffer: "约 2–3 小时",
            tip: "偏紧：同站或近站休息，不建议出远门",
          },
          {
            mode: "火车",
            modeClass: "",
            from: "西宁",
            to: "拉萨",
            train: "紧接始发/较优班次",
            time: "约 20 小时",
            seat: "硬卧",
            price: "约 ¥280–380",
          },
        ],
        whyDetail:
          "指定路径模式下「最快」= 同一西宁链上总时长最短的班次组合，而不是改走西安飞。缓冲较短时不推景点。",
        play: null,
        buyLegs: [
          { name: "徐州 → 西宁", sub: "跳转 12306" },
          { name: "西宁 → 拉萨", sub: "跳转 12306" },
        ],
      },
    ],
    more: [
      {
        id: "via-more-1",
        typeLabel: "窗口游",
        title: "西宁过夜 · 半日塔尔寺",
        sub: "缓冲 ≥10h 或过夜 · 可预留短住",
        price: "¥560+",
        planRef: "via-balanced",
      },
      {
        id: "via-more-2",
        typeLabel: "少换乘",
        title: "同路径 · 仅 1 次中转",
        sub: "已是路径下限",
        price: "—",
        planRef: "via-balanced",
      },
    ],
  };

  const PLANS_AUTO_ALT = {
    main: [
      {
        ...PLANS_AUTO.main[2],
        id: "alt-fast",
        why: "系统未锁定你的途经：改推西安高铁 + 飞机，门到门更快。",
      },
      {
        ...PLANS_AUTO.main[0],
        id: "alt-balanced",
        why: "系统仍可能选西宁——和你的路径巧合一致，但班次组合按全局打分。",
      },
      {
        ...PLANS_AUTO.main[1],
        id: "alt-cheap",
      },
    ],
    more: PLANS_AUTO.more.map((m, i) => ({ ...m, id: "alt-more-" + i })),
  };

  const TAG_COLORS = {
    cheap: "#0d9f6e",
    fast: "#e85d04",
    balanced: "#5b4cdb",
  };

  const { createApp, computed, ref, nextTick } = Vue;

  createApp({
    setup() {
      const page = ref("query");
      const from = ref("徐州");
      const to = ref("拉萨");
      const dateFlexible = ref(true);
      const date = ref("");
      const vias = ref([]);
      const resultMode = ref("auto");
      const currentPlanId = ref(null);
      const resultsStatus = ref("idle"); // idle | loading | ok | empty | error
      const errorMsg = ref("这趟没查到，多半是数据暂不可用");
      const demoEmpty = ref(false);
      const demoError = ref(false);
      const statusTime = ref("--:--");

      try {
        const now = new Date();
        statusTime.value =
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0");
      } catch (_) {}

      function go(id) {
        page.value = id;
        nextTick(() => {
          const body = document.querySelector(".page:not([style*='display: none']) .page-body");
          // scroll active page body
          document.querySelectorAll(".page-body").forEach((el) => {
            if (el.offsetParent !== null) el.scrollTop = 0;
          });
        });
      }

      function swapOd() {
        const a = from.value;
        from.value = to.value;
        to.value = a;
      }

      function toggleFlexible() {
        dateFlexible.value = !dateFlexible.value;
        if (dateFlexible.value) date.value = "";
      }

      function addVia() {
        if (vias.value.length >= 3) {
          vant.showToast("途经最多 3 个");
          return;
        }
        vias.value.push(vias.value.length === 0 ? "西宁" : "");
      }

      function onDemoEmpty() {
        if (demoEmpty.value) demoError.value = false;
      }

      function onDemoError() {
        if (demoError.value) demoEmpty.value = false;
      }

      function loadExample() {
        from.value = "徐州";
        to.value = "拉萨";
        dateFlexible.value = true;
        date.value = "";
        vias.value = [];
        demoEmpty.value = false;
        demoError.value = false;
        runSearch({ forceOk: true });
      }

      function removeVia(i) {
        vias.value.splice(i, 1);
      }

      function cleanedVias() {
        return vias.value.map((v) => (v || "").trim()).filter(Boolean);
      }

      function getPlanBundles() {
        const hasVia = cleanedVias().length > 0;
        if (!hasVia) {
          return { plans: PLANS_AUTO, showToggle: false, mode: "auto" };
        }
        if (resultMode.value === "user") {
          return { plans: PLANS_VIA_XINING, showToggle: true, mode: "user" };
        }
        return { plans: PLANS_AUTO_ALT, showToggle: true, mode: "auto" };
      }

      function findPlan(id) {
        const bundles = [PLANS_AUTO, PLANS_VIA_XINING, PLANS_AUTO_ALT];
        for (const b of bundles) {
          const p = b.main.find((x) => x.id === id);
          if (p) return p;
          for (const m of b.more) {
            if (m.id === id) {
              return b.main.find((x) => x.id === m.planRef) || b.main[0];
            }
          }
        }
        return PLANS_AUTO.main[0];
      }

      const resultsTitle = computed(() => {
        return (from.value || "出发地") + " → " + (to.value || "目的地");
      });

      const pathBanner = computed(() => {
        const list = cleanedVias();
        if (!list.length || resultsStatus.value === "loading") return "";
        return "路径：" + [from.value].concat(list).concat([to.value]).join(" → ");
      });

      const showModeToggle = computed(() => {
        return (
          cleanedVias().length > 0 &&
          (resultsStatus.value === "ok" || resultsStatus.value === "empty")
        );
      });

      const resultsMeta = computed(() => {
        const dateLine = dateFlexible.value
          ? "日期灵活"
          : date.value
            ? "出发 " + date.value
            : "日期未定";
        return (
          "参考价 · " +
          dateLine +
          " · 只推荐不卖票 · 对照直达：" +
          DIRECT.duration
        );
      });

      const sortedMain = computed(() => {
        if (resultsStatus.value !== "ok") return [];
        const { plans } = getPlanBundles();
        const order = ["cheap", "fast", "balanced"];
        return order
          .map((t) => plans.main.find((p) => p.type === t))
          .filter(Boolean);
      });

      const morePlans = computed(() => {
        if (resultsStatus.value !== "ok") return [];
        return getPlanBundles().plans.more;
      });

      const currentPlan = computed(() => {
        if (!currentPlanId.value) return null;
        return findPlan(currentPlanId.value);
      });

      const timelineActive = computed(() => {
        const p = currentPlan.value;
        if (!p || !p.timeline) return 0;
        return Math.max(0, p.timeline.length - 1);
      });

      function tagType(type) {
        if (type === "cheap") return "success";
        if (type === "fast") return "warning";
        return "primary";
      }

      function tagColor(type) {
        return TAG_COLORS[type] || TAG_COLORS.balanced;
      }

      function onModeChange() {
        // resultMode already updated by v-model
        if (resultsStatus.value === "ok") {
          // force recompute — computed already depends on resultMode
        }
      }

      function openDetail(planId) {
        const p = findPlan(planId);
        if (!p) {
          vant.showToast("方案找不到了，先回结果看看");
          if (resultsStatus.value === "ok") go("results");
          else go("query");
          return;
        }
        currentPlanId.value = planId;
        go("detail");
      }

      function onBuy() {
        vant.showToast({
          message:
            "原型演示：此处将跳转 12306 / 航司 / OTA 购票。\n邪修交通只推荐路线，不卖票、不收款。",
          duration: 2800,
        });
      }

      function runSearch(opts) {
        opts = opts || {};
        const f = (from.value || "").trim();
        const t = (to.value || "").trim();

        if (!opts.forceOk) {
          if (!f || !t) {
            vant.showToast("先填出发地和目的地");
            return;
          }
          if (f === t) {
            vant.showToast("出发和到达不能是同一个地方");
            return;
          }
          const vs = cleanedVias();
          for (const v of vs) {
            if (v === f || v === t) {
              vant.showToast("途经别和出发/到达重复");
              return;
            }
          }
        }

        from.value = f || "徐州";
        to.value = t || "拉萨";
        vias.value = cleanedVias();

        resultsStatus.value = "loading";
        go("results");

        const mode = opts.forceOk
          ? null
          : demoEmpty.value
            ? "empty"
            : demoError.value
              ? "error"
              : null;

        setTimeout(() => {
          if (mode === "empty") {
            resultsStatus.value = "empty";
            return;
          }
          if (mode === "error") {
            resultsStatus.value = "error";
            errorMsg.value = "这趟没查到，多半是数据暂不可用";
            return;
          }

          resultMode.value = vias.value.length ? "user" : "auto";
          const { plans } = getPlanBundles();
          if (!plans.main || !plans.main.length) {
            resultsStatus.value = "empty";
            return;
          }
          resultsStatus.value = "ok";
        }, 700);
      }

      function onSearch() {
        runSearch();
      }

      function retrySearch() {
        runSearch();
      }

      return {
        page,
        from,
        to,
        dateFlexible,
        date,
        vias,
        resultMode,
        resultsStatus,
        errorMsg,
        statusTime,
        resultsTitle,
        pathBanner,
        showModeToggle,
        resultsMeta,
        sortedMain,
        morePlans,
        currentPlan,
        timelineActive,
        go,
        swapOd,
        toggleFlexible,
        addVia,
        removeVia,
        tagType,
        tagColor,
        onModeChange,
        openDetail,
        onBuy,
        onSearch,
        retrySearch,
        demoEmpty,
        demoError,
        onDemoEmpty,
        onDemoError,
        loadExample,
      };
    },
  })
    .use(vant)
    .mount("#app");
})();
