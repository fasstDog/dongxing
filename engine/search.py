#!/usr/bin/env python3
"""邪修交通 · mock 规则引擎：取腿 → 定链 → MCT → 打分 → 三主卡。不臆造车次/票价。"""
from __future__ import annotations

import argparse
import json
import math
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from export_fe import export_fe
from score import (
    MCT_SAME_CITY_MIN,
    MCT_SAME_STATION_MIN,
    pick_three,
    comfort_avg as comfort_score,
)

ROOT = Path(__file__).resolve().parents[1]


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def hours(mins: int) -> float:
    return mins / 60.0


def fmt_duration(mins: int) -> str:
    h = mins / 60.0
    if h < 24:
        lo, hi = max(1, int(h) - 1), int(h) + 1
        return f"约 {lo}–{hi} 小时" if lo != hi else f"约 {int(h)} 小时"
    d0, d1 = h / 24.0, h / 24.0
    return f"约 {max(1, int(d0))}–{math.ceil(d1)} 天" if False else f"约 {int(h)}–{int(h) + 4} 小时"


def fmt_price_leg(leg: dict) -> str:
    mn, mx = leg.get("price_min_cny"), leg.get("price_max_cny")
    if mn is not None and mx is not None and mn != mx:
        return f"约 ¥{mn}–{mx}"
    return f"约 ¥{leg['price_ref_cny']}"


def fmt_price_plan(legs: list[dict]) -> str:
    mins = [l.get("price_min_cny", l["price_ref_cny"]) for l in legs]
    maxs = [l.get("price_max_cny", l["price_ref_cny"]) for l in legs]
    return f"¥{sum(mins)}–{sum(maxs)}"


def mode_label(leg: dict) -> str:
    if leg["mode"] == "flight":
        return "飞机"
    ref = leg.get("service_ref") or ""
    if ref.startswith("G") or "高铁" in (leg.get("seat_hint") or ""):
        return "高铁"
    if (leg.get("comfort") == "hardseat") or (
        "硬座" in (leg.get("seat_hint") or "") and "硬卧" not in (leg.get("seat_hint") or "")
    ):
        return "火车 · 硬座"
    return "火车"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def xfer_kind(a: dict, b: dict) -> tuple[str, str, int]:
    """return xfer_kind, label, mct_required_min"""
    if a["to_station"] == b["from_station"]:
        return "same_station", "同站换乘", MCT_SAME_STATION_MIN
    if a["to_city"] == b["from_city"]:
        return "same_city", "同城换乘", MCT_SAME_CITY_MIN
    raise ValueError("cities/stations do not connect")


def buffer_min(a: dict, b: dict) -> int:
    return int((parse_dt(b["dep_at"]) - parse_dt(a["arr_at"])).total_seconds() // 60)


def connectable(a: dict, b: dict) -> bool:
    if a["to_city"] != b["from_city"]:
        return False
    try:
        _, _, need = xfer_kind(a, b)
    except ValueError:
        return False
    buf = buffer_min(a, b)
    return buf >= need



def pick_pois(hub_city: str, buffer_h: float, pois: list[dict], limit: int = 2) -> list[dict]:
    cands = [
        p
        for p in pois
        if p["hub_city"] == hub_city and buffer_h >= float(p["min_buffer_hours"])
    ]
    # prefer higher threshold first (more interesting), then name
    cands.sort(key=lambda p: (-float(p["min_buffer_hours"]), p["name"]))
    return cands[:limit]


def build_timeline(legs: list[dict], pois: list[dict]) -> tuple[list[dict], list[dict] | None, int]:
    timeline: list[dict] = []
    plays: list[dict] = []
    total_buffer = 0
    for i, leg in enumerate(legs):
        timeline.append(
            {
                "kind": "leg",
                "mode": leg["mode"],
                "mode_label": mode_label(leg),
                "from_station": leg["from_station"],
                "to_station": leg["to_station"],
                "dep_at": leg["dep_at"],
                "arr_at": leg["arr_at"],
                "duration_min": leg["duration_min"],
                "duration_display": fmt_duration(leg["duration_min"]),
                "seat_hint": leg["seat_hint"],
                "price_ref_cny": leg["price_ref_cny"],
                "price_display": fmt_price_leg(leg),
                "service_ref": leg["service_ref"],
                "leg_id": leg.get("id"),
                "comfort": leg.get("comfort"),
            }
        )
        if i + 1 < len(legs):
            nxt = legs[i + 1]
            kind, label, _ = xfer_kind(leg, nxt)
            buf = buffer_min(leg, nxt)
            total_buffer += buf
            tip = "预留安检与接驳时间"
            if kind == "same_city":
                tip = "同城接驳：预留交通与安检/值机时间"
            timeline.append(
                {
                    "kind": "xfer",
                    "city": leg["to_city"],
                    "xfer_kind": kind,
                    "xfer_kind_label": label,
                    "buffer_min": buf,
                    "buffer_display": f"约 {buf // 60} 小时" if buf >= 120 else f"约 {buf} 分钟",
                    "tip": tip,
                }
            )
            for p in pick_pois(leg["to_city"], hours(buf), pois):
                plays.append(
                    {
                        "hub_city": p["hub_city"],
                        "name": p["name"],
                        "dist_text": p["dist_text"],
                        "suggest_text": p["suggest_text"],
                        "ok": p["back_ok_note"],
                        "min_buffer_hours": p["min_buffer_hours"],
                    }
                )
    return timeline, (plays or None), total_buffer


def door_to_door_min(legs: list[dict]) -> int:
    if len(legs) == 1:
        return legs[0]["duration_min"]
    total = sum(l["duration_min"] for l in legs)
    for i in range(len(legs) - 1):
        total += max(0, buffer_min(legs[i], legs[i + 1]))
    return total


def why_facts(legs: list[dict], hubs: list[str], user_via: bool, direct: dict | None, playable: bool) -> dict:
    price = sum(l["price_ref_cny"] for l in legs)
    dur = door_to_door_min(legs)
    dp = direct["price_ref_cny"] if direct else None
    dd = direct["duration_min"] if direct else None
    notes = []
    if any("始发" in (l.get("service_ref") or "") for l in legs):
        notes.append("始发进藏")
    if any(l["mode"] == "flight" for l in legs):
        notes.append("空铁混搭")
    if user_via:
        notes.append("用户指定途经")
    return {
        "hubs": hubs,
        "user_via": user_via,
        "price_ref_cny": price,
        "direct_price_ref_cny": dp,
        "price_delta_cny": (price - dp) if dp is not None else None,
        "duration_min": dur,
        "direct_duration_min": dd,
        "duration_delta_min": (dur - dd) if dd is not None else None,
        "transfers": max(0, len(legs) - 1),
        "comfort_score": round(comfort_score(legs), 3),
        "playable": playable,
        "notes": notes,
    }


def render_why(facts: dict, route: str) -> tuple[str, str, str]:
    """return why, why_detail, vs_direct — 口语，避免工程腔。"""
    hubs = "、".join(facts["hubs"]) if facts["hubs"] else ""
    pd, dd = facts.get("price_delta_cny"), facts.get("duration_delta_min")

    def money(n):
        n = abs(int(n))
        if n >= 100:
            return f"大概{n} 块"
        return f"大约 {n} 元"

    def time_words(mins):
        mins = abs(int(mins))
        h = mins // 60
        if h <= 0:
            return "一会儿"
        if h >= 20:
            return f"将近 {h // 24 * 24 or h} 小时" if h >= 24 else f"大约 {h} 小时"
        return f"大约 {h} 小时"

    vs = "和直达比，还得看当天票价和时刻"
    if pd is not None and dd is not None:
        if abs(pd) < 40 and abs(dd) < 90:
            vs = "参考价和时长跟直达差不多"
        else:
            price_part = (
                f"参考价大概省 {money(pd).replace('大概','').replace('大约 ','')}"
                if pd < 0
                else (f"参考价大概贵 {money(pd).replace('大概','').replace('大约 ','')}" if abs(pd) >= 40 else "参考价差不多")
            )
            # simplify
            if pd < -30:
                price_part = f"参考价大概省 {abs(pd)} 块"
            elif pd > 30:
                price_part = f"参考价大概贵 {abs(pd)} 块"
            else:
                price_part = "参考价差不多"
            if dd < -60:
                time_part = f"能少耗 {time_words(dd)}"
            elif dd > 60:
                time_part = f"多花 {time_words(dd)}"
            else:
                time_part = "时长差不多"
            vs = f"{price_part}，{time_part}"

    notes = set(facts.get("notes") or [])
    if not facts["hubs"]:
        why = "直达最省事。当「对照」看就行，久坐的话舒适度一般。"
        if "hardseat" in str(facts.get("comfort_score")):
            pass
        why = "直达方案，总价往往好看，但要接受长时间在车上。"
    elif facts["user_via"]:
        why = f"按你指定经 {hubs} 走。分段比价，不编造余票。"
    elif "空铁混搭" in notes:
        why = f"经 {hubs} 空铁混搭。比纯火车直达贵一些，但往往能少耗不少时间。"
    elif "始发进藏" in notes:
        why = f"经 {hubs} 拆两段火车。比直达硬座贵一点，但换乘够长能顺路逛逛。"
    else:
        why = f"经 {hubs} 拆一段。综合看价格、时长和坐着舒不舒服。"

    detail = why + " " + vs + "。价格、时刻都是参考，以购票平台为准。"
    if facts.get("playable"):
        hub0 = facts["hubs"][0] if facts["hubs"] else "中转城"
        detail += f" {hub0}空窗够长，下面写了怎么玩；不够长不会硬推景点。"
    elif facts["hubs"]:
        detail += " 换乘以接驳为主，窗口不够长不会硬推景点。"
    return why, detail, vs



def plan_from_legs(
    plan_id: str,
    ptype: str,
    legs: list[dict],
    pois: list[dict],
    user_via: bool,
    path_note: str | None,
    direct: dict | None,
) -> dict:
    hubs = [legs[i]["to_city"] for i in range(len(legs) - 1)]
    timeline, play, _ = build_timeline(legs, pois)
    price = sum(l["price_ref_cny"] for l in legs)
    dur = door_to_door_min(legs)
    labels = {"cheap": "最省钱", "fast": "最快", "balanced": "最综合"}
    route = " → ".join(
        [legs[0]["from_city"]] + [l["to_city"] for l in legs]
    )
    # richer one-liner
    bits = []
    for l in legs:
        bits.append(f"{l['from_city']}→{l['to_city']}（{mode_label(l)}）")
    route_one = "；".join(bits) if len(legs) > 1 else f"{legs[0]['from_city']} → {legs[0]['to_city']}（{mode_label(legs[0])}）"
    facts = why_facts(legs, hubs, user_via, direct, bool(play))
    why, why_detail, vs = render_why(facts, route_one)
    play_hint = None
    if play:
        play_hint = f"{play[0]['hub_city']}可玩 · {play[0]['name']}等"
    buy = []
    for l in legs:
        buy.append(
            {
                "name": f"{l['from_city']} → {l['to_city']}",
                "sub": f"跳转 {'航司 / OTA' if l['mode']=='flight' else '12306 / 铁路 OTA'} · {fmt_price_leg(l)}",
                "mode": l["mode"],
                "deep_link_hint": None,
            }
        )
    return {
        "id": plan_id,
        "type": ptype,
        "type_label": labels[ptype],
        "price_ref_cny": price,
        "price_display": fmt_price_plan(legs),
        "price_note": "参考价",
        "duration_min": dur,
        "duration_display": fmt_duration(dur),
        "transfers": max(0, len(legs) - 1),
        "route_one_line": route_one,
        "vs_direct": vs,
        "why": why,
        "why_detail": why_detail,
        "why_facts": facts,
        "play_hint": play_hint,
        "path_note": path_note,
        "timeline": timeline,
        "play": play,
        "buy_legs": buy,
    }


def enumerate_candidates(
    from_city: str,
    to_city: str,
    vias: list[str],
    path_mode: str,
    legs: list[dict],
    hub_cities: list[str],
) -> list[tuple[list[dict], str | None, bool]]:
    """return list of (leg_chain, path_note, user_via)"""
    out: list[tuple[list[dict], str | None, bool]] = []
    by_od: dict[tuple[str, str], list[dict]] = {}
    for l in legs:
        by_od.setdefault((l["from_city"], l["to_city"]), []).append(l)

    def directs():
        for l in by_od.get((from_city, to_city), []):
            out.append(([l], "直达对照", False))

    if path_mode == "user" and vias:
        chain_cities = [from_city] + vias + [to_city]
        # product one leg per hop: pick first/best ref per OD pair
        segs: list[dict] = []
        ok = True
        for a, b in zip(chain_cities, chain_cities[1:]):
            opts = by_od.get((a, b), [])
            if not opts:
                ok = False
                break
            # pick lowest price_ref as default segment representative for MVP mock
            segs.append(min(opts, key=lambda x: x["price_ref_cny"]))
        if ok and len(segs) == 1:
            out.append((segs, f"因你指定路径：{' → '.join(chain_cities)}", True))
        elif ok:
            # validate MCT pairwise
            good = True
            for i in range(len(segs) - 1):
                if not connectable(segs[i], segs[i + 1]):
                    good = False
                    break
            if good:
                out.append((segs, f"因你指定经 {'、'.join(vias)}", True))
        return out

    # auto: direct + 1-transfer via hubs (and any via implied by available legs)
    directs()
    hubs = set(hub_cities)
    # also allow hubs that appear in data even if not in table (demo)
    for l in legs:
        if l["from_city"] == from_city and l["to_city"] != to_city:
            hubs.add(l["to_city"])
        if l["to_city"] == to_city and l["from_city"] != from_city:
            hubs.add(l["from_city"])
    for h in sorted(hubs):
        if h in (from_city, to_city):
            continue
        left = by_od.get((from_city, h), [])
        right = by_od.get((h, to_city), [])
        for a in left:
            for b in right:
                if connectable(a, b):
                    out.append(([a, b], f"系统选枢纽：{h}", False))
    return out


def score_cheap(legs: list[dict]) -> tuple:
    dur = door_to_door_min(legs)
    price = sum(l["price_ref_cny"] for l in legs)
    penalty = 0 if dur <= CHEAP_MAX_DURATION_MIN else 10_000
    return (price + penalty, dur)


def score_fast(legs: list[dict]) -> tuple:
    return (door_to_door_min(legs), sum(l["price_ref_cny"] for l in legs))


def score_balanced(legs: list[dict], playable: bool = False) -> tuple:
    price = sum(l["price_ref_cny"] for l in legs)
    dur = door_to_door_min(legs)
    xfers = max(0, len(legs) - 1)
    comfort = comfort_score(legs)
    # 综合：价、时长、换乘、屁股分、能否玩；偏舒适与可玩，避免「最快」空铁霸占综合槽
    # lower is better
    flight_pen = 2.0 * sum(1 for l in legs if l.get("mode") == "flight")
    # 空铁进「最快」；「最综合」偏铁路卧铺 + 可玩窗口（徐州→拉萨样例：西宁）
    return (
        price / 650.0
        + dur / 2000.0
        + xfers * 0.2
        + flight_pen
        - comfort * 2.5
        - (1.6 if playable else 0.0),
        price,
        dur,
    )


def chain_playable(legs: list[dict], pois: list[dict]) -> bool:
    for i in range(len(legs) - 1):
        buf_h = hours(buffer_min(legs[i], legs[i + 1]))
        if pick_pois(legs[i]["to_city"], buf_h, pois, limit=1):
            return True
    return False


def search(
    req: dict,
    legs: list[dict],
    pois: list[dict],
    hub_cities: list[str],
) -> dict:
    from_city = req["from_city"].strip()
    to_city = req["to_city"].strip()
    vias = [v.strip() for v in (req.get("vias") or []) if v and str(v).strip()]
    if len(vias) > 3:
        return {
            "ok": False,
            "error": {"code": "INVALID_REQUEST", "message": "途经城市最多 3 个"},
            "meta": None,
            "direct_baseline": None,
            "path": None,
            "main": [],
            "more": [],
        }
    path_mode = req.get("path_mode") or ("user" if vias else "auto")
    if not vias:
        path_mode = "auto"

    cands = enumerate_candidates(from_city, to_city, vias, path_mode, legs, hub_cities)
    if not cands:
        return {
            "ok": False,
            "error": {"code": "NO_FEASIBLE", "message": "当前 mock 下无可行组合"},
            "meta": {
                "request": req,
                "path_mode": path_mode,
                "data_source": "mock",
                "as_of": legs[0]["as_of"] if legs else None,
                "disclaimer": "价格、时刻均为参考，以购票平台为准",
            },
            "direct_baseline": None,
            "path": {"cities": [from_city] + vias + [to_city], "hubs": vias, "note": None},
            "main": [],
            "more": [],
        }

    direct_legs = [c for c in cands if len(c[0]) == 1]
    direct = None
    if direct_legs:
        d = min(direct_legs, key=lambda c: c[0][0]["price_ref_cny"])[0][0]
        direct = {
            "price_ref_cny": d["price_ref_cny"],
            "duration_min": d["duration_min"],
            "summary": d.get("seat_hint") or d.get("service_ref") or "直达",
            "leg_id": d.get("id"),
        }

    picked = pick_three(
        cands,
        duration_fn=door_to_door_min,
        playable_fn=lambda legs: chain_playable(legs, pois),
    )
    main = []
    used_ids = set()
    for ptype, (chain, note, user_via) in picked.items():
        pid = f"{path_mode}-{ptype}-{'-'.join(l.get('id','x') for l in chain)}"
        # shorten id
        pid = f"{path_mode}-{ptype}"
        plan = plan_from_legs(pid, ptype, chain, pois, user_via, note, direct)
        main.append(plan)
        used_ids.add(tuple(l.get("id") for l in chain))

    # more: other candidates not selected as primary chain
    more = []
    for chain, note, user_via in cands:
        key = tuple(l.get("id") for l in chain)
        if key in used_ids:
            continue
        if len(chain) == 1 and picked.get("cheap") and tuple(l.get("id") for l in picked["cheap"][0]) == key:
            continue
        hubs = [chain[i]["to_city"] for i in range(len(chain) - 1)]
        title = " → ".join([chain[0]["from_city"]] + [l["to_city"] for l in chain])
        mid = "more-" + "-".join(filter(None, [l.get("id") for l in chain]))[:48]
        more.append(
            {
                "id": mid,
                "type_label": "其它组合",
                "title": title,
                "sub": (note or "") + f" · {fmt_duration(door_to_door_min(chain))}",
                "price_display": fmt_price_plan(chain),
                "plan_id": mid,
            }
        )
        if len(more) >= 5:
            break

    # path cities from balanced or first main
    focus = picked.get("balanced") or next(iter(picked.values()))
    fchain = focus[0]
    cities = [fchain[0]["from_city"]] + [l["to_city"] for l in fchain]
    hubs = cities[1:-1]

    as_of = max((l["as_of"] for l in legs), default=None)
    return {
        "ok": True,
        "error": None,
        "meta": {
            "request": {
                "from_city": from_city,
                "to_city": to_city,
                "date_flexible": req.get("date_flexible", True),
                "date": req.get("date"),
                "vias": vias,
                "path_mode": path_mode,
            },
            "path_mode": path_mode,
            "data_source": "mock",
            "as_of": as_of,
            "disclaimer": "价格、时刻均为参考，以购票平台为准",
            "generated_by": "engine/search.py",
            "no_realtime_inventory": True,
        },
        "direct_baseline": direct,
        "path": {
            "cities": cities,
            "hubs": hubs,
            "note": focus[1],
        },
        "main": main,
        # keep stable order cheap, fast, balanced
        "more": more,
    }


def order_main(resp: dict) -> dict:
    order = ["cheap", "fast", "balanced"]
    by = {p["type"]: p for p in resp.get("main") or []}
    resp["main"] = [by[t] for t in order if t in by]
    return resp


HUBS_MVP = [
    "北京",
    "上海",
    "广州",
    "深圳",
    "成都",
    "重庆",
    "武汉",
    "杭州",
    "郑州",
    "西安",
    "兰州",
    "西宁",
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--legs", type=Path, default=ROOT / "data/mock/legs-xuzhou-lhasa.json")
    ap.add_argument("--pois", type=Path, default=ROOT / "data/hub-pois.json")
    ap.add_argument("--out", type=Path, default=ROOT / "data/mock/plans-xuzhou-lhasa.json")
    args = ap.parse_args()

    legs_doc = load_json(args.legs)
    pois_doc = load_json(args.pois)
    legs = legs_doc["legs"]
    pois = pois_doc["pois"]

    scenarios = [
        {
            "name": "auto",
            "request": {
                "from_city": "徐州",
                "to_city": "拉萨",
                "date_flexible": True,
                "date": None,
                "vias": [],
                "path_mode": "auto",
            },
        },
        {
            "name": "user_via_xining",
            "request": {
                "from_city": "徐州",
                "to_city": "拉萨",
                "date_flexible": True,
                "date": None,
                "vias": ["西宁"],
                "path_mode": "user",
            },
        },
    ]

    out = {
        "meta": {
            "od": {"from_city": "徐州", "to_city": "拉萨"},
            "note": "由 engine/search.py 程序生成；无实时余票；价格时刻为参考",
            "legs_source": str(args.legs.name),
            "pois_source": str(args.pois.name),
            "api": "docs/api-plans-contract.md",
        },
        "scenarios": {},
    }
    for sc in scenarios:
        resp = order_main(search(sc["request"], legs, pois, HUBS_MVP))
        out["scenarios"][sc["name"]] = {"request": sc["request"], "response": resp}

    # convenience: top-level default = auto response (frontend can read response directly)
    out["request"] = scenarios[0]["request"]
    out["response"] = out["scenarios"]["auto"]["response"]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 同步前端路径 data/plans-xuzhou-lhasa.json
    auto_req = scenarios[0]["request"]
    cands = enumerate_candidates(
        auto_req["from_city"],
        auto_req["to_city"],
        [],
        "auto",
        legs,
        HUBS_MVP,
    )
    picked = pick_three(
        cands,
        duration_fn=door_to_door_min,
        playable_fn=lambda lg: chain_playable(lg, pois),
    )
    fe = export_fe(
        request=auto_req,
        picked=picked,
        all_cands=cands,
        pois=pois,
        legs_source=args.legs.name,
        pois_source=args.pois.name,
        as_of=max((l["as_of"] for l in legs), default=None),
    )
    fe_out = ROOT / "data/plans-xuzhou-lhasa.json"
    fe_out.parent.mkdir(parents=True, exist_ok=True)
    fe_out.write_text(json.dumps(fe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {fe_out}")

    print(f"wrote {args.out}")
    for name, sc in out["scenarios"].items():
        r = sc["response"]
        print(name, "ok=", r["ok"], "main=", [(p["type"], p["price_ref_cny"], p["duration_min"], p["route_one_line"][:40]) for p in r["main"]])


if __name__ == "__main__":
    main()
