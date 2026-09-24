# FROZEN: 只迁不新写；新功能只进 engine/src TypeScript
"""打分与主卡挑选（纯函数，无 I/O）。"""
from __future__ import annotations

from typing import Callable

# 粗 MCT（分钟）
MCT_SAME_STATION_MIN = 60
MCT_SAME_CITY_MIN = 180
CHEAP_MAX_DURATION_MIN = 60 * 55

COMFORT_SCORE = {
    "hardseat": 0.15,
    "economy": 0.45,
    "second_class": 0.55,
    "hard_sleeper": 0.7,
    "first_class": 0.75,
    "soft_sleeper": 0.85,
    "unknown": 0.4,
}


def comfort_avg(legs: list[dict]) -> float:
    if not legs:
        return 0.0
    return sum(COMFORT_SCORE.get(l.get("comfort") or "unknown", 0.4) for l in legs) / len(legs)


def score_cheap(legs: list[dict], duration_min: int) -> tuple:
    price = sum(l["price_ref_cny"] for l in legs)
    penalty = 0 if duration_min <= CHEAP_MAX_DURATION_MIN else 10_000
    return (price + penalty, duration_min)


def score_fast(legs: list[dict], duration_min: int) -> tuple:
    return (duration_min, sum(l["price_ref_cny"] for l in legs))


def score_balanced(
    legs: list[dict], duration_min: int, *, playable: bool = False
) -> tuple:
    """综合槽偏铁路卧铺 + 可玩窗口；空铁主要由 fastest 承接。"""
    price = sum(l["price_ref_cny"] for l in legs)
    xfers = max(0, len(legs) - 1)
    comfort = comfort_avg(legs)
    flight_pen = 2.0 * sum(1 for l in legs if l.get("mode") == "flight")
    return (
        price / 650.0
        + duration_min / 2000.0
        + xfers * 0.2
        + flight_pen
        - comfort * 2.5
        - (1.6 if playable else 0.0),
        price,
        duration_min,
    )


def pick_three(
    cands: list[tuple],
    *,
    duration_fn: Callable,
    playable_fn: Callable,
) -> dict:
    """cands: list of (legs, path_note, user_via). return cheap/fast/balanced tuples."""
    if not cands:
        return {}
    cheap = min(cands, key=lambda c: score_cheap(c[0], duration_fn(c[0])))
    fast = min(cands, key=lambda c: score_fast(c[0], duration_fn(c[0])))
    balanced = min(
        cands,
        key=lambda c: score_balanced(
            c[0], duration_fn(c[0]), playable=playable_fn(c[0])
        ),
    )
    return {"cheap": cheap, "fast": fast, "balanced": balanced}
