# Architecture

This project has four main layers:

1. Data services

Neo4j stores the recipe knowledge graph. Milvus stores vector embeddings. The two services are started separately because they have independent Docker Compose files.

2. RAG backend

`web_server.py` exposes chat APIs and serves the built frontend. `main.py` wires together the graph data loader, Milvus indexing, hybrid retrieval, graph retrieval, query router, and answer generation modules.

3. Retrieval pipeline

The query router chooses one of three strategies:

- `hybrid_traditional`: dual-level graph keyword retrieval plus vector retrieval.
- `graph_rag`: graph traversal, subgraph extraction, and graph reasoning.
- `combined`: merges graph retrieval and traditional hybrid retrieval.

4. Frontend

The frontend is a Vite + React chat app. It supports conversation history, local persistence, message virtualization, right-click export/delete, and PDF export through the browser print dialog.

## Data Flow

1. The user submits a question in the frontend.
2. The frontend calls `/api/ask-stream`.
3. The backend routes the query to a retrieval strategy.
4. Retrieved documents are passed to the generation module.
5. The answer streams back to the frontend through server-sent events.
6. The frontend updates the current AI message token by token.
