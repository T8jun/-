from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from model import KeibaPredictor
from sample_data import make_sample_race

predictor = KeibaPredictor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時に自動学習
    predictor.train()
    yield


app = FastAPI(title="競馬予測アプリ", lifespan=lifespan)

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ── スキーマ ────────────────────────────────────────────

class HorseEntry(BaseModel):
    horse_number: int
    horse_name: str = ""
    n_horses: int
    surface: str
    distance: int
    weather: str
    track_condition: str
    jockey: str
    age: int
    weight: int
    weight_change: int
    past_win_rate: float = Field(ge=0, le=1)
    past_place_rate: float = Field(ge=0, le=1)
    odds: float = Field(ge=1.0)


class PredictRequest(BaseModel):
    entries: list[HorseEntry]


# ── エンドポイント ──────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    html_file = STATIC_DIR / "index.html"
    return html_file.read_text(encoding="utf-8")


@app.post("/api/train")
async def train():
    """モデルを再学習する。"""
    metrics = predictor.train()
    return {"status": "ok", "metrics": metrics}


@app.get("/api/sample-race")
async def sample_race():
    """サンプルレースのエントリー一覧を返す。"""
    return {"entries": make_sample_race()}


@app.post("/api/predict")
async def predict(req: PredictRequest):
    """レースエントリーを受け取り予測結果を返す。"""
    if not predictor.is_trained:
        raise HTTPException(status_code=503, detail="モデルが未学習です")
    try:
        results = predictor.predict([e.model_dump() for e in req.entries])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"results": results}


@app.get("/api/status")
async def status():
    return {"trained": predictor.is_trained}
