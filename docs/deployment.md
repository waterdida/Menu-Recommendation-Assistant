# Deployment Notes

## Local Development

Use the root startup script:

```powershell
.\start.ps1 -InstallDeps
```

This starts Docker services and local dev servers.

## Docker Services

Milvus is started from the project root:

```powershell
docker compose -f docker-compose.yml up -d
```

Neo4j is started from `data/docker-compose.yml`:

```powershell
docker compose -f data/docker-compose.yml up -d
```

Neo4j imports graph data from `data/cypher/nodes.csv`, `data/cypher/relationships.csv`, and `data/cypher/neo4j_import.cypher`.

## Frontend Build

```powershell
cd frontend
npm install
npm run build
```

After the build, `web_server.py` serves the generated `frontend/dist` files.

## Backend

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python web_server.py
```

The backend listens on `http://127.0.0.1:8000`.

## Environment

Copy `.env.example` to `.env` and set `MOONSHOT_API_KEY`. Do not commit `.env`.

For a remote deployment, update:

- `NEO4J_URI`
- `MILVUS_HOST`
- `MILVUS_PORT`
- `MOONSHOT_API_BASE_URL`

## Open Source Checklist

- `.env` is ignored.
- Docker volumes are ignored.
- `frontend/node_modules` and `frontend/dist` are ignored.
- Runtime logs are ignored.
- A license is present.
- Root README explains both Docker Compose files.
