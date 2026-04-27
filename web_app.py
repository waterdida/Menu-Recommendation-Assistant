import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

load_dotenv()

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"

rag_system: Any | None = None
rag_lock = asyncio.Lock()


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    explain_routing: bool = False


class AskResponse(BaseModel):
    answer: str
    elapsed_seconds: float
    route: dict[str, Any] | None = None


def _analysis_to_dict(analysis: Any) -> dict[str, Any] | None:
    if analysis is None:
        return None

    strategy = getattr(analysis, "recommended_strategy", None)
    strategy_value = getattr(strategy, "value", strategy)

    return {
        "strategy": strategy_value,
        "query_complexity": getattr(analysis, "query_complexity", None),
        "relationship_intensity": getattr(analysis, "relationship_intensity", None),
        "reasoning_required": getattr(analysis, "reasoning_required", None),
        "entity_count": getattr(analysis, "entity_count", None),
        "confidence": getattr(analysis, "confidence", None),
        "reasoning": getattr(analysis, "reasoning", None),
    }


def _initialize_rag() -> Any:
    from main import AdvancedGraphRAGSystem

    system = AdvancedGraphRAGSystem()
    system.initialize_system()
    system.build_knowledge_base()
    return system


async def get_rag_system() -> Any:
    global rag_system

    if rag_system and rag_system.system_ready:
        return rag_system

    async with rag_lock:
        if rag_system and rag_system.system_ready:
            return rag_system

        loop = asyncio.get_running_loop()
        rag_system = await loop.run_in_executor(None, _initialize_rag)
        return rag_system


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        if rag_system:
            rag_system._cleanup()


app = FastAPI(title="Menu Recommendation Assistant", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def index():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="frontend/dist/index.html not found")
    return FileResponse(index_file)


@app.get("/api/health")
async def health():
    return {"ready": bool(rag_system and rag_system.system_ready)}


@app.post("/api/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question cannot be empty")

    system = await get_rag_system()
    start = time.perf_counter()

    try:
        loop = asyncio.get_running_loop()
        answer, analysis = await loop.run_in_executor(
            None,
            lambda: system.ask_question_with_routing(
                question,
                stream=False,
                explain_routing=request.explain_routing,
            ),
        )
    except Exception as exc:
        logger.exception("Failed to answer question")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AskResponse(
        answer=answer,
        elapsed_seconds=round(time.perf_counter() - start, 2),
        route=_analysis_to_dict(analysis),
    )


@app.get("/{file_path:path}")
async def frontend_asset(file_path: str):
    if file_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    if not FRONTEND_DIST_DIR.exists():
        raise HTTPException(status_code=404, detail="frontend/dist not found")

    target = (FRONTEND_DIST_DIR / file_path).resolve()
    root = FRONTEND_DIST_DIR.resolve()
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=404, detail="Not found")

    if target.is_file():
        return FileResponse(target)

    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="frontend/dist/index.html not found")
