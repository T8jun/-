"""
競馬予測アプリ用サンプルデータ生成モジュール。
実際の運用ではCSVファイルや外部APIからデータを取得する想定。
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

JOCKEYS = ["武豊", "川田将雅", "福永祐一", "横山武史", "松山弘平",
           "戸崎圭太", "池添謙一", "岩田康誠", "田辺裕信", "ルメール"]

JOCKEY_SKILL = {j: s for j, s in zip(JOCKEYS, [0.9, 0.85, 0.8, 0.78, 0.75,
                                                  0.72, 0.68, 0.65, 0.62, 0.88])}

SURFACE_TYPES = ["芝", "ダート"]
WEATHER_CONDITIONS = ["晴", "曇", "雨"]
TRACK_CONDITIONS = ["良", "稍重", "重", "不良"]


def _track_condition_factor(condition: str) -> float:
    return {"良": 1.0, "稍重": 0.95, "重": 0.88, "不良": 0.80}[condition]


def generate_race_history(n_races: int = 500) -> pd.DataFrame:
    """過去レース結果のサンプルデータを生成する。"""
    rows = []
    for race_id in range(n_races):
        n_horses = RNG.integers(8, 19)
        surface = RNG.choice(SURFACE_TYPES)
        distance = int(RNG.choice([1200, 1400, 1600, 1800, 2000, 2200, 2400]))
        weather = RNG.choice(WEATHER_CONDITIONS)
        condition = RNG.choice(TRACK_CONDITIONS)
        cond_factor = _track_condition_factor(condition)

        # 各馬の潜在的な強さ（隠れ変数）
        true_strengths = RNG.normal(0, 1, n_horses)

        for i in range(n_horses):
            jockey = RNG.choice(JOCKEYS)
            age = int(RNG.integers(3, 8))
            weight = int(RNG.normal(480, 20))
            weight_change = int(RNG.normal(0, 4))
            past_win_rate = float(np.clip(RNG.normal(0.12, 0.08), 0, 1))
            past_place_rate = float(np.clip(past_win_rate + RNG.uniform(0.1, 0.25), 0, 1))

            strength = (
                true_strengths[i]
                + JOCKEY_SKILL[jockey]
                + past_win_rate * 2
                - abs(weight_change) * 0.05
                + (1 if age in [4, 5] else 0)
                + cond_factor * 0.3
                + RNG.normal(0, 0.5)  # レース当日のランダム要因
            )

            odds = float(np.clip(RNG.exponential(8), 1.1, 99.9))

            rows.append({
                "race_id": race_id,
                "horse_number": i + 1,
                "n_horses": n_horses,
                "surface": surface,
                "distance": distance,
                "weather": weather,
                "track_condition": condition,
                "jockey": jockey,
                "age": age,
                "weight": weight,
                "weight_change": weight_change,
                "past_win_rate": round(past_win_rate, 3),
                "past_place_rate": round(past_place_rate, 3),
                "odds": round(odds, 1),
                "_strength": strength,  # 学習には使わない隠れ変数
            })

    df = pd.DataFrame(rows)

    # 着順を strength の降順で決定
    df["finish_position"] = (
        df.groupby("race_id")["_strength"]
        .rank(ascending=False)
        .astype(int)
    )
    df = df.drop(columns=["_strength"])
    return df


def make_sample_race() -> list[dict]:
    """予測対象の1レース分サンプルデータを生成する。"""
    n_horses = 12
    surface = "芝"
    distance = 2000
    weather = "晴"
    condition = "良"

    horse_names = [
        "ディープインパクト2", "オルフェーヴル3", "ゴールドシップ4",
        "キタサンブラック5", "アーモンドアイ6", "コントレイル7",
        "エフフォーリア8", "タイトルホルダー9", "イクイノックス10",
        "ジャックドール11", "ステルヴィオ12", "レイデオロ13",
    ]

    entries = []
    for i in range(n_horses):
        jockey = RNG.choice(JOCKEYS)
        entries.append({
            "horse_number": i + 1,
            "horse_name": horse_names[i],
            "n_horses": n_horses,
            "surface": surface,
            "distance": distance,
            "weather": weather,
            "track_condition": condition,
            "jockey": jockey,
            "age": int(RNG.integers(3, 8)),
            "weight": int(RNG.normal(480, 15)),
            "weight_change": int(RNG.normal(0, 3)),
            "past_win_rate": round(float(np.clip(RNG.normal(0.12, 0.08), 0, 1)), 3),
            "past_place_rate": round(float(np.clip(RNG.normal(0.35, 0.1), 0, 1)), 3),
            "odds": round(float(np.clip(RNG.exponential(10), 1.1, 99.9)), 1),
        })
    return entries
