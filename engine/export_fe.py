"""导出前端 mock-plan-response.v1 → data/plans-*.json。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from score import MCT_SAME_CITY_MIN, MCT_SAME_STATION_MIN

KIND_MAP = {
    "cheap": ("cheapest", "最省钱", 1),
    "fast": ("fastest", "最快", 2),
    "balanced": ("balanced", "最综合", 3),
}


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def buffer_min(a: dict, b: dict) -> int:
    return int((parse_dt(b["dep_at"]) - parse_dt(a["arr_at"])).total_seconds() // 60)


def xfer_label(a: dict, b: dict) -> str:
    if a["to_station"] == b["from_station"]:
        return "同站换乘"
    return "同城换乘"


def fmt_buffer(mins: int) -> str:
    h, m = divmod(mins, 60)
    if h and m:
        return f"约 {h} 小时 {m} 分"
    if h:
        return f"约 {h} 小时"
    return f"约 {m} 分"


def fmt_duration(mins: int, has_xfer: bool) -> str:
    h, m = divmod(mins, 60)
    base = f"约 {h} 小时" if m == 0 else f"约 {h} 小时 {m} 分"
    return base + ("（含换乘）" if has_xfer else "")


def door_to_door(legs: list[dict]) -> int:
    total = sum(l["duration_min"] for l in legs)
    for i in range(len(legs) - 1):
        total += max(0, buffer_min(legs[i], legs[i + 1]))
    return total


def strip_leg(leg: dict) -> dict:
    keys = [
        "id", "mode", "from_city", "to_city", "from_station", "to_station",
        "dep_at", "arr_at", "duration_min", "price_ref_cny", "price_min_cny",
        "price_max_cny", "seat_hint", "service_ref", "comfort", "source", "as_of",
    ]
    return {k: leg[k] for k in keys if k in leg}


def pick_play(hub: str, buf_h: float, pois: list[dict]) -> dict | None:
    cands = [p for p in pois if p["hub_city"] == hub and buf_h >= float(p["min_buffer_hours"])]
    if not cands:
        return None
    cands.sort(key=lambda p: (-float(p["min_buffer_hours"]), p["name"]))
    return dict(cands[0])


def route_text(legs: list[dict]) -> str:
    cities = [legs[0]["from_city"]] + [l["to_city"] for l in legs]
    base = " → ".join(cities)
    if len(legs) == 1:
        ref = legs[0].get("service_ref") or ""
        return f"{base}（直达过路车）" if "过路" in ref else f"{base}（直达）"
    if any("始发" in (l.get("service_ref") or "") for l in legs):
        return f"{base}（西宁始发进藏）" if "西宁" in cities else f"{base}（含始发段）"
    if any(l["mode"] == "flight" for l in legs):
        return f"{base}（空铁）"
    return base


def build_transfers(legs: list[dict], pois: list[dict]) -> list[dict]:
    out = []
    for i in range(len(legs) - 1):
        a, b = legs[i], legs[i + 1]
        buf = buffer_min(a, b)
        play = pick_play(a["to_city"], buf / 60.0, pois)
        tip = "预留安检与接驳时间"
        if play:
            tip = f"窗口达到玩法阈值；去{play['name']}后请提前回站"
        elif xfer_label(a, b) == "同城换乘":
            tip = "同城接驳：预留交通与安检/值机"
        item: dict[str, Any] = {
            "hub_city": a["to_city"],
            "from_leg_id": a.get("id"),
            "to_leg_id": b.get("id"),
            "buffer_min": buf,
            "buffer_text": fmt_buffer(buf),
            "kind": xfer_label(a, b),
            "tip": tip,
        }
        if play:
            item["transfer_play"] = play
        out.append(item)
    return out


def why_text(ptype: str, legs: list[dict], transfers: list[dict]) -> str:
    if ptype == "cheap":
        return (
            "参考总价最低，适合预算优先且能接受长时间久坐的人；"
            "硬座体验差，硬卧价格更高且过路票不确定。价格、时刻均为参考，不代表有票。"
        )
    if ptype == "fast":
        return (
            "门到门参考时长最短的空铁组合；总价更高，机票随季节波动。"
            "价格、时刻均为参考，不代表有票。"
        )
    play = next((t.get("transfer_play") for t in transfers if t.get("transfer_play")), None)
    hub = transfers[0]["hub_city"] if transfers else ""
    extra = f"换乘窗口够长，还可顺路玩{play['name']}。" if play else "换乘以接驳为主，不硬推景点。"
    return (
        f"经{hub}拆两段：后半段参考始发/更优席别；参考总价介于直达硬座与硬卧之间。"
        + extra
        + "价格、时刻均为参考，不代表有票。"
    )


def plan_fe(ptype: str, legs: list[dict], pois: list[dict]) -> dict:
    kind, label, rank = KIND_MAP[ptype]
    transfers = build_transfers(legs, pois)
    dur = door_to_door(legs)
    pref = sum(l["price_ref_cny"] for l in legs)
    pmin = sum(l.get("price_min_cny", l["price_ref_cny"]) for l in legs)
    pmax = sum(l.get("price_max_cny", l["price_ref_cny"]) for l in legs)
    return {
        "id": f"plan-{kind}",
        "kind": kind,
        "label": label,
        "rank": rank,
        "summary": {
            "route_text": route_text(legs),
            "duration_min": dur,
            "duration_text": fmt_duration(dur, bool(transfers)),
            "transfers": len(transfers),
            "price_ref_cny": pref,
            "price_text": f"参考价约 ¥{pref}",
        },
        "price_ref_cny": pref,
        "price_min_cny": pmin,
        "price_max_cny": pmax,
        "price_label": f"参考价约 ¥{pmin}–{pmax}" if pmin != pmax else f"参考价约 ¥{pref}",
        "transfers": transfers,
        "legs": [strip_leg(l) for l in legs],
        "why": why_text(ptype, legs, transfers),
        "purchase": {
            "mode": "external",
            "note": "按段前往 12306 或航司/OTA 查询；本产品只推荐路线，不卖票",
        },
    }


def export_fe(
    *,
    request: dict,
    picked: dict,
    all_cands: list,
    pois: list[dict],
    legs_source: str,
    pois_source: str,
    as_of: str | None,
) -> dict:
    plans = []
    used = set()
    for ptype in ("cheap", "fast", "balanced"):
        if ptype not in picked:
            continue
        chain, note, _uv = picked[ptype]
        plans.append(plan_fe(ptype, chain, pois))
        used.add(tuple(l.get("id") for l in chain))

    more = []
    idx = 1
    for chain, note, _uv in all_cands:
        key = tuple(l.get("id") for l in chain)
        if key in used:
            continue
        pref = sum(l["price_ref_cny"] for l in chain)
        pmin = sum(l.get("price_min_cny", l["price_ref_cny"]) for l in chain)
        pmax = sum(l.get("price_max_cny", l["price_ref_cny"]) for l in chain)
        cities = [chain[0]["from_city"]] + [l["to_city"] for l in chain]
        more.append(
            {
                "id": f"more-{idx}",
                "kind": "more",
                "label": "其它组合",
                "plan_ref": None,
                "summary": {
                    "route_text": " → ".join(cities),
                    "duration_min": door_to_door(chain),
                    "duration_text": fmt_duration(door_to_door(chain), len(chain) > 1),
                    "transfers": max(0, len(chain) - 1),
                    "price_ref_cny": pref,
                    "price_text": f"参考价约 ¥{pref}",
                },
                "price_ref_cny": pref,
                "price_min_cny": pmin,
                "price_max_cny": pmax,
                "price_label": f"参考价约 ¥{pref}",
                "transfers": build_transfers(chain, pois),
                "legs": [strip_leg(l) for l in chain],
                "why": (note or "其它可执行组合") + "。价格、时刻均为参考，不代表有票。",
            }
        )
        idx += 1
        if idx > 5:
            break

    req = {
        "from_city": request["from_city"],
        "to_city": request["to_city"],
        "date": request.get("date"),
        "date_policy": "flexible" if request.get("date_flexible", True) else "fixed",
    }
    return {
        "schema_version": "mock-plan-response.v1",
        "request": req,
        "meta": {
            "od": {"from_city": request["from_city"], "to_city": request["to_city"]},
            "source": "mock",
            "as_of": as_of,
            "price_note": "价格、时刻均为参考，以购票平台为准",
            "availability_note": "不含实时余票；不代表可售",
            "legs_source": legs_source,
            "transfer_plays_source": pois_source,
            "generated_by": "engine/search.py + engine/score.py",
        },
        "plans": plans,
        "morePlans": more,
    }
