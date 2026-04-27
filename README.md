# Menu Recommendation Assistant

Menu Recommendation Assistant is a Chinese recipe question-answering app built with Graph RAG, hybrid retrieval, Neo4j, Milvus, and a React chat UI. It can answer recipe questions, recommend dishes by ingredients or constraints, explain ingredient pairings, and export chat history as PDF.

## Features

- Graph RAG over a recipe knowledge graph stored in Neo4j.
- Hybrid retrieval with graph keywords, BM25-style retrieval, and Milvus vector search.
- Intelligent routing between traditional hybrid retrieval, graph retrieval, and combined retrieval.
- React chat UI with conversation history, virtualized message list, PDF export, and local conversation storage.
- One-click Windows startup scripts for local development.

## Requirements

- Docker Desktop. Neo4j and Milvus are both started with Docker Compose.
- Python 3.10+.
- Node.js 18+ and npm.
- A Moonshot-compatible API key for LLM calls.

## Quick Start

1. Clone the repository and enter the project directory.

```powershell
git clone <your-repo-url>
cd Menu-Recommendation-Assistant
```

2. Create your local environment file.

```powershell
copy .env.example .env
```

Edit `.env` and set `MOONSHOT_API_KEY`.

3. Start everything with the one-click script.

```powershell
.\start.ps1 -InstallDeps
```

The script will:

- Create `.env` from `.env.example` if needed.
- Start Milvus with the root `docker-compose.yml`.
- Start Neo4j with `data/docker-compose.yml`.
- Install Python and frontend dependencies when `-InstallDeps` is passed.
- Start the backend at `http://127.0.0.1:8000`.
- Start the frontend dev server at `http://127.0.0.1:5173`.

Use this after the first setup:

```powershell
.\start.ps1
```

Stop backend and frontend processes:

```powershell
.\stop.ps1
```

## Manual Startup

This project intentionally keeps the two Docker Compose files separate:

- `docker-compose.yml` starts Milvus, etcd, and MinIO.
- `data/docker-compose.yml` starts Neo4j and imports the CSV graph data from `data/cypher`.

Start Milvus:

```powershell
docker compose -f docker-compose.yml up -d
```

Start Neo4j:

```powershell
docker compose -f data/docker-compose.yml up -d
```

Install and start the backend:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python web_server.py
```

Install and start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Production Build

Build the frontend:

```powershell
cd frontend
npm install
npm run build
```

Then start the backend from the project root:

```powershell
python web_server.py
```

`web_server.py` serves `frontend/dist` when it exists. Visit `http://127.0.0.1:8000`.

## Configuration

Most settings are read from `.env`. Important variables:

- `MOONSHOT_API_KEY`: required for LLM calls.
- `MOONSHOT_API_BASE_URL`: defaults to `https://api.moonshot.cn/v1`.
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`.
- `MILVUS_HOST`, `MILVUS_PORT`, `MILVUS_COLLECTION_NAME`.
- `EMBEDDING_MODEL`, `LLM_MODEL`.
- `TOP_K`, `MAX_GRAPH_DEPTH`, `MAX_TOKENS`.

## Project Layout

- `rag_modules/`: data loading, indexing, retrieval, routing, and generation modules.
- `data/cypher/`: Neo4j import script and CSV graph data.
- `frontend/`: Vite + React frontend.
- `web_server.py`: lightweight backend and frontend static server.
- `start.ps1`, `start.bat`: one-click local startup.
- `stop.ps1`, `stop.bat`: stop local frontend/backend processes.
- `docs/`: architecture and deployment notes.

## Notes for Open Source Use

- Do not commit `.env`.
- Docker Desktop must be running before starting the database services.
- The first run may take time because Python packages, frontend packages, embedding models, and vector indexes need to be prepared.
- The local `volumes/` directory contains Docker runtime data and should not be committed.
