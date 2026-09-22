/**
 * 邪修交通 · 交互原型（Vue 3 + Vant 4 CDN）
 * 静态 mock，无后端 / 无真实购票
 * 方案数据：data/mock/plans-xuzhou-lhasa.json（snake_case → UI camelCase）
 */
(function () {
  "use strict";

  const PLANS_MOCK_URL = "data/mock/plans-xuzhou-lhasa.json";

  /** 直达对照默认值；有 response.direct_baseline 时覆盖 */
  let directBaseline = {
    price: "硬座约 ¥397 · 硬卧约 ¥760+",
    duration: "约 40–45 小时",
    note: "Z 字头过路车：硬座久坐，硬卧过路票不好抢",
  };

  /** @type {null | { auto?: object, user_via_xining?: object, auto_alt?: object }} */
  let loadedBundles = null;
  /** @type {Promise<object> | null} */
  let plansFetchPromise = null;

  const TAG_COLORS = {
    cheap: "#0d9f6e",
    fast: "#e85d04",
    balanced: "#5b4cdb",
  };

  function formatDurationMin(min) {
    if (min == null || !Number.isFinite(min)) return "—";
    const h = Math.round(min / 60);
    return "约 " + h + " 小时";
  }

  function applyDirectBaseline(baseline) {
    if (!baseline) return;
    const next = { ...directBaseline };
    if (baseline.price_ref_cny != null) {
      next.price = "硬座约 ¥" + baseline.price_ref_cny;
    }
    if (baseline.duration_min != null) {
      next.duration = formatDurationMin(baseline.duration_min);
    }
    if (baseline.summary) {
      next.note = baseline.summary;
    }
    directBaseline = next;
  }

  function modeClassFromLeg(item) {
    if (item.mode === "flight" || item.comfort === "economy") return "flight";
    if (item.comfort === "hardseat") return "hardseat";
    return "";
  }

  function adaptTimelineItem(item) {
    if (!item) return null;
    if (item.kind === "xfer" || item.xfer === true) {
      return {
        xfer: true,
        city: item.city || "",
        kind: item.xfer_kind_label || item.kind || "同城换乘",
        buffer: item.buffer_display || item.buffer || "",
        tip: item.tip || "",
      };
    }
    // kind === "leg" or legacy shape
    return {
      mode: item.mode_label || item.mode || "火车",
      modeClass: modeClassFromLeg(item),
      from: item.from_station || item.from || "",
      to: item.to_station || item.to || "",
      train: item.service_ref != null ? item.service_ref : item.train || "",
      time: item.duration_display || item.time || "",
      seat: item.seat_hint || item.seat || "",
      price: item.price_display || item.price || "",
    };
  }

  function adaptPlay(play) {
    if (play == null) return null;
    if (!Array.isArray(play)) return null;
    return play.map(function (card) {
      return {
        name: card.name || "",
        dist: card.dist_text || card.dist || "",
        suggest: card.suggest_text || card.suggest || "",
        ok: card.ok || card.back_ok_note || "",
      };
    });
  }

  function adaptBuyLegs(legs) {
    if (!Array.isArray(legs)) return [];
    return legs.map(function (leg) {
      return {
        name: leg.name || "",
        sub: leg.sub || "",
      };
    });
  }

  function adaptPlan(plan) {
    if (!plan) return null;
    return {
      id: plan.id,
      type: plan.type,
      typeLabel: plan.type_label || plan.typeLabel || "",
      price: plan.price_display || plan.price || "",
      priceNote: plan.price_note || plan.priceNote || "参考价",
      duration: plan.duration_display || plan.duration || "",
      transfers: plan.transfers != null ? plan.transfers : 0,
      routeOneLine: plan.route_one_line || plan.routeOneLine || "",
      vsDirect: plan.vs_direct || plan.vsDirect || "",
      why: plan.why || "",
      whyDetail: plan.why_detail || plan.whyDetail || plan.why || "",
      playHint: plan.play_hint != null ? plan.play_hint : plan.playHint != null ? plan.playHint : null,
      pathNote: plan.path_note != null ? plan.path_note : plan.pathNote != null ? plan.pathNote : null,
      timeline: Array.isArray(plan.timeline)
        ? plan.timeline.map(adaptTimelineItem).filter(Boolean)
        : [],
      play: adaptPlay(plan.play),
      buyLegs: adaptBuyLegs(plan.buy_legs || plan.buyLegs),
    };
  }

  function adaptMoreItem(item) {
    if (!item) return null;
    return {
      id: item.id,
      type: item.type,
      typeLabel: item.type_label || item.typeLabel || "",
      title: item.title || "",
      sub: item.sub || "",
      price: item.price_display || item.price || "",
      planRef: item.plan_id || item.planRef || item.id,
    };
  }

  function adaptResponse(response) {
    if (!response) {
      return { main: [], more: [], path: null, direct_baseline: null };
    }
    return {
      main: Array.isArray(response.main)
        ? response.main.map(adaptPlan).filter(Boolean)
        : [],
      more: Array.isArray(response.more)
        ? response.more.map(adaptMoreItem).filter(Boolean)
        : [],
      path: response.path || null,
      direct_baseline: response.direct_baseline || null,
      ok: response.ok !== false,
    };
  }

  function fetchPlansRaw() {
    if (!plansFetchPromise) {
      plansFetchPromise = fetch(PLANS_MOCK_URL)
        .then(function (res) {
          if (!res.ok) {
            throw new Error("plans mock HTTP " + res.status);
          }
          return res.json();
        })
        .catch(function (err) {
          plansFetchPromise = null;
          throw err;
        });
    }
    return plansFetchPromise;
  }

  async function ensurePlansLoaded() {
    if (loadedBundles) return loadedBundles;
    const raw = await fetchPlansRaw();
    const scenarios = (raw && raw.scenarios) || {};
    const bundles = {};
    Object.keys(scenarios).forEach(function (key) {
      const sc = scenarios[key];
      bundles[key] = adaptResponse(sc && sc.response);
    });
    loadedBundles = bundles;
    return loadedBundles;
  }

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
      /** bump when mock / baseline updates so computeds refresh */
      const plansEpoch = ref(0);

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

      function emptyBundle() {
        return { main: [], more: [] };
      }

      /**
       * 选场景：无途经 → auto；
       * 有途经 + user → user_via_xining；
       * 有途经 + auto → auto_alt（若有）否则 auto。
       */
      function pickScenarioKey(mode) {
        const hasVia = cleanedVias().length > 0;
        const bundles = loadedBundles || {};
        if (!hasVia) return "auto";
        if (mode === "user") {
          return bundles.user_via_xining ? "user_via_xining" : "auto";
        }
        if (bundles.auto_alt) return "auto_alt";
        return "auto";
      }

      function getPlanBundles() {
        plansEpoch.value; // dependency
        const hasVia = cleanedVias().length > 0;
        const mode = hasVia ? resultMode.value : "auto";
        const key = pickScenarioKey(mode);
        const plans =
          (loadedBundles && loadedBundles[key]) || emptyBundle();
        return {
          plans: plans,
          showToggle: hasVia,
          mode: mode,
          scenarioKey: key,
        };
      }

      function findPlan(id) {
        plansEpoch.value; // dependency
        const bundles = loadedBundles
          ? Object.keys(loadedBundles).map(function (k) {
              return loadedBundles[k];
            })
          : [];
        for (const b of bundles) {
          if (!b || !b.main) continue;
          const p = b.main.find((x) => x.id === id);
          if (p) return p;
          for (const m of b.more || []) {
            if (m.id === id) {
              return b.main.find((x) => x.id === m.planRef) || b.main[0];
            }
          }
        }
        const fallback = getPlanBundles().plans;
        return (fallback.main && fallback.main[0]) || null;
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
        plansEpoch.value;
        const dateLine = dateFlexible.value
          ? "日期灵活"
          : date.value
            ? "出发 " + date.value
            : "日期未定";
        return (
          "参考价 · " +
          dateLine +
          " · 只推荐不卖票 · 对照直达：" +
          directBaseline.duration
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
        return getPlanBundles().plans.more || [];
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
        // resultMode already updated by v-model; computeds depend on it
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
            "演示：这里会跳去 12306 / 航司 / OTA。\n邪修交通只推荐路线，不卖票、不收款。",
          duration: 2800,
        });
      }

      function setDataUnavailableError() {
        resultsStatus.value = "error";
        errorMsg.value = "这趟没查到，多半是数据暂不可用";
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

        setTimeout(function () {
          if (mode === "empty") {
            resultsStatus.value = "empty";
            return;
          }
          if (mode === "error") {
            setDataUnavailableError();
            return;
          }

          ensurePlansLoaded()
            .then(function (bundles) {
              resultMode.value = vias.value.length ? "user" : "auto";
              const key = pickScenarioKey(resultMode.value);
              const bundle = bundles[key] || emptyBundle();

              if (bundle.direct_baseline) {
                applyDirectBaseline(bundle.direct_baseline);
              } else if (bundles.auto && bundles.auto.direct_baseline) {
                applyDirectBaseline(bundles.auto.direct_baseline);
              }

              plansEpoch.value += 1;

              if (!bundle.main || !bundle.main.length) {
                resultsStatus.value = "empty";
                return;
              }
              resultsStatus.value = "ok";
            })
            .catch(function () {
              setDataUnavailableError();
            });
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
