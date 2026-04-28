import json
import mimetypes
import threading
import time
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"

rag_system: Any | None = None
rag_init_error: str | None = None
rag_init_lock = threading.Lock()
rag_request_lock = threading.Lock()
response_cache: dict[tuple[str, str], dict[str, Any]] = {}
response_cache_lock = threading.Lock()
MAX_RESPONSE_CACHE_SIZE = 100
CACHE_VERSION = "stream-v3"


def get_rag_system() -> Any:
    global rag_init_error, rag_system

    if rag_system and rag_system.system_ready:
        return rag_system

    with rag_init_lock:
        if rag_system and rag_system.system_ready:
            return rag_system

        from main import AdvancedGraphRAGSystem

        print("正在初始化 RAG 系统...", flush=True)
        start = time.perf_counter()
        system = AdvancedGraphRAGSystem()
        system.initialize_system()
        system.build_knowledge_base()
        rag_system = system
        rag_init_error = None
        print(f"RAG 系统初始化完成，耗时 {time.perf_counter() - start:.2f}s", flush=True)
        return rag_system


def warm_up_rag_system():
    global rag_init_error

    try:
        get_rag_system()
    except Exception as exc:
        rag_init_error = str(exc)
        print(f"RAG 系统后台初始化失败: {exc}", flush=True)


def analysis_to_dict(analysis: Any) -> dict[str, Any] | None:
    if analysis is None:
        return None

    strategy = getattr(analysis, "recommended_strategy", None)
    return {
        "strategy": getattr(strategy, "value", strategy),
        "query_complexity": getattr(analysis, "query_complexity", None),
        "relationship_intensity": getattr(analysis, "relationship_intensity", None),
        "reasoning_required": getattr(analysis, "reasoning_required", None),
        "entity_count": getattr(analysis, "entity_count", None),
        "confidence": getattr(analysis, "confidence", None),
        "reasoning": getattr(analysis, "reasoning", None),
    }


def normalize_question(question: str) -> str:
    return " ".join(question.strip().lower().split())


def get_cached_response(session_id: str, question: str) -> dict[str, Any] | None:
    key = (CACHE_VERSION, session_id, normalize_question(question))
    with response_cache_lock:
        return response_cache.get(key)


def set_cached_response(session_id: str, question: str, data: dict[str, Any]):
    key = (CACHE_VERSION, session_id, normalize_question(question))
    with response_cache_lock:
        if len(response_cache) >= MAX_RESPONSE_CACHE_SIZE:
            oldest_key = next(iter(response_cache))
            response_cache.pop(oldest_key, None)
        response_cache[key] = data


class RAGWebHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json(
                {
                    "ready": bool(rag_system and rag_system.system_ready),
                    "initializing": not bool(rag_system and rag_system.system_ready) and rag_init_error is None,
                    "error": rag_init_error,
                }
            )
            return

        self.serve_frontend(path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/ask-stream":
            self.handle_ask_stream()
            return

        if path == "/api/ask":
            self.handle_ask_json()
            return

        self.send_error(404, "Not found")

    def handle_ask_json(self):
        try:
            payload = self.read_json_body()
            question = str(payload.get("question", "")).strip()
            session_id = str(payload.get("session_id", "default")).strip() or "default"
            if not question:
                self.send_json({"detail": "question cannot be empty"}, status=400)
                return

            cached = get_cached_response(session_id, question)
            if cached:
                self.send_json(
                    {
                        "answer": cached["answer"],
                        "elapsed_seconds": 0,
                        "route": cached.get("route"),
                        "from_cache": True,
                    }
                )
                return

            with rag_request_lock:
                system = get_rag_system()
                start = time.perf_counter()
                answer, analysis = system.ask_question_with_routing(
                    question,
                    stream=False,
                    explain_routing=bool(payload.get("explain_routing", False)),
                )

            route = analysis_to_dict(analysis)
            set_cached_response(session_id, question, {"answer": answer, "route": route})

            self.send_json(
                {
                    "answer": answer,
                    "elapsed_seconds": round(time.perf_counter() - start, 2),
                    "route": route,
                    "from_cache": False,
                }
            )
        except Exception as exc:
            self.send_json({"detail": str(exc)}, status=500)

    def handle_ask_stream(self):
        stream_started = False
        try:
            payload = self.read_json_body()
            question = str(payload.get("question", "")).strip()
            session_id = str(payload.get("session_id", "default")).strip() or "default"
            if not question:
                self.send_json({"detail": "question cannot be empty"}, status=400)
                return

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "close")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            stream_started = True

            start = time.perf_counter()
            cached = get_cached_response(session_id, question)
            if cached:
                self.send_event("status", {"message": "命中会话缓存，正在返回结果..."})
                self.send_event("route", cached.get("route"))
                answer = cached["answer"]
                for i in range(0, len(answer), 8):
                    self.send_event("token", {"text": answer[i:i + 8]})
                    time.sleep(0.01)
                self.send_event(
                    "done",
                    {"elapsed_seconds": round(time.perf_counter() - start, 2), "from_cache": True},
                )
                return

            self.send_event("status", {"message": "正在等待 RAG 空闲..."})

            with rag_request_lock:
                system = get_rag_system()

                self.send_event("status", {"message": "正在检索相关菜谱..."})
                documents, analysis = system.query_router.route_query(question, system.config.top_k)
                self.send_event("route", analysis_to_dict(analysis))

                if not documents:
                    self.send_event("token", {"text": "抱歉，没有找到相关的烹饪信息。请尝试其他问题。"})
                    self.send_event("done", {"elapsed_seconds": round(time.perf_counter() - start, 2)})
                    return

                self.send_event("status", {"message": "正在生成回答..."})
                full_response = ""
                for chunk in system.generation_module.generate_adaptive_answer_stream(question, documents):
                    if chunk:
                        full_response += chunk
                        self.send_event("token", {"text": chunk})

                set_cached_response(
                    session_id,
                    question,
                    {"answer": full_response, "route": analysis_to_dict(analysis)},
                )

            self.send_event(
                "done",
                {"elapsed_seconds": round(time.perf_counter() - start, 2), "from_cache": False},
            )
        except (BrokenPipeError, ConnectionResetError):
            print("客户端断开了流式连接")
        except Exception as exc:
            if stream_started:
                try:
                    self.send_event("error", {"detail": str(exc)})
                except (BrokenPipeError, ConnectionResetError):
                    print("客户端断开了流式连接")
            else:
                self.send_json({"detail": str(exc)}, status=500)
        finally:
            self.close_connection = True

    def read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_event(self, event: str, data: Any):
        payload = json.dumps(data, ensure_ascii=False)
        message = f"event: {event}\ndata: {payload}\n\n".encode("utf-8")
        self.wfile.write(message)
        self.wfile.flush()

    def serve_frontend(self, request_path: str):
        root = FRONTEND_DIST_DIR
        if not root.exists():
            self.send_error(503, "frontend/dist not found. Run `cd frontend && npm run build` first.")
            return

        relative_path = request_path.lstrip("/") or "index.html"

        target = root / relative_path
        if not target.exists() or target.is_dir():
            target = root / "index.html"

        self.send_file(target, root)

    def send_file(self, path: Path, root: Path | None = None):
        try:
            root = root or FRONTEND_DIST_DIR
            resolved = path.resolve()
            if not str(resolved).startswith(str(root.resolve())) or not resolved.is_file():
                self.send_error(404, "Not found")
                return

            content_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
            data = resolved.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except OSError as exc:
            self.send_error(500, str(exc))

    def send_json(self, data: dict[str, Any], status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    host = "127.0.0.1"
    port = 8000

    server = ThreadingHTTPServer((host, port), RAGWebHandler)
    print(f"网页服务已启动：http://{host}:{port}", flush=True)
    threading.Thread(target=warm_up_rag_system, name="rag-warmup").start()
    print("按 Ctrl+C 停止服务。", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    except Exception:
        traceback.print_exc()
        raise
    finally:
        if rag_system:
            rag_system._cleanup()
        server.server_close()


if __name__ == "__main__":
    main()
