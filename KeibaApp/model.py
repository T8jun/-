"""
競馬予測 ML モジュール。
ランダムフォレストで各馬の「勝率スコア」を回帰予測し、
相対スコアから予測勝率を導く。
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer

from sample_data import generate_race_history

CATEGORICAL_FEATURES = ["surface", "track_condition", "jockey"]
NUMERIC_FEATURES = [
    "horse_number", "n_horses", "distance", "age",
    "weight", "weight_change", "past_win_rate", "past_place_rate", "odds",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def _build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
         CATEGORICAL_FEATURES),
    ])
    return Pipeline([
        ("prep", preprocessor),
        ("model", GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )),
    ])


def _target_from_position(df: pd.DataFrame) -> pd.Series:
    """着順をスコアに変換（1着=1, 2着=0.5, 3着=0.25, それ以下=0）。"""
    score = pd.Series(0.0, index=df.index)
    score[df["finish_position"] == 1] = 1.0
    score[df["finish_position"] == 2] = 0.5
    score[df["finish_position"] == 3] = 0.25
    return score


class KeibaPredictor:
    def __init__(self) -> None:
        self._pipeline: Pipeline | None = None
        self._is_trained = False

    def train(self) -> dict:
        """サンプルデータで学習して精度指標を返す。"""
        df = generate_race_history(n_races=600)
        X = df[ALL_FEATURES]
        y = _target_from_position(df)

        # 時系列を考慮して後半20%をバリデーションに使う
        split = int(len(df) * 0.8)
        X_train, X_val = X.iloc[:split], X.iloc[split:]
        y_train, y_val = y.iloc[:split], y.iloc[split:]

        self._pipeline = _build_pipeline()
        self._pipeline.fit(X_train, y_train)
        self._is_trained = True

        # バリデーション：1着予測の的中率
        val_df = df.iloc[split:].copy()
        val_df["pred_score"] = self._pipeline.predict(X_val)
        val_df["pred_rank"] = val_df.groupby("race_id")["pred_score"].rank(ascending=False)
        hit_rate = (
            ((val_df["pred_rank"] == 1) & (val_df["finish_position"] == 1)).sum()
            / val_df.groupby("race_id").ngroups
        )
        return {"win_accuracy": round(float(hit_rate), 3)}

    def predict(self, entries: list[dict]) -> list[dict]:
        """レースエントリーリストに予測スコア・勝率・推奨印を付けて返す。"""
        if not self._is_trained or self._pipeline is None:
            raise RuntimeError("モデルが未学習です。先に /api/train を呼んでください。")

        df = pd.DataFrame(entries)
        scores = self._pipeline.predict(df[ALL_FEATURES])

        # softmax 的に勝率へ変換
        exp_scores = np.exp(scores - scores.max())
        win_prob = exp_scores / exp_scores.sum()

        results = []
        for i, entry in enumerate(entries):
            results.append({
                **entry,
                "score": round(float(scores[i]), 4),
                "win_prob": round(float(win_prob[i]) * 100, 1),
            })

        results.sort(key=lambda x: x["score"], reverse=True)

        marks = ["◎", "○", "▲", "△", "△"]
        for i, r in enumerate(results):
            r["mark"] = marks[i] if i < len(marks) else ""

        return results

    @property
    def is_trained(self) -> bool:
        return self._is_trained
