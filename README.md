# 菜单推荐助手

菜单推荐助手是一个面向中文菜谱问答与推荐的 Graph RAG 项目，结合了 Neo4j、Milvus、混合检索、图谱检索和 React 聊天界面。它可以根据食材、口味和约束条件推荐菜品，解释菜谱做法，并支持导出聊天记录为 PDF。

## 首页界面

![首页界面](./image.png)

## 功能特点

- 基于 Neo4j 菜谱知识图谱的 Graph RAG 检索与问答。
- 结合关键词检索、向量检索和图谱检索的混合召回能力。
- 支持传统混合检索、图谱检索、组合检索之间的智能路由。
- 前端使用 React 构建，支持会话历史、本地存储、流式输出和 PDF 导出。

## 环境要求

启动脚本会自动安装项目依赖，但不会自动安装系统级软件。首次使用前请先准备：

- Windows PowerShell。
- Docker Desktop，用于启动 Neo4j、Milvus、etcd 和 MinIO。
- Python 3.10 及以上，用于创建项目本地虚拟环境 `.venv`。
- Node.js 18 及以上，以及 npm，用于安装和构建前端。
- 大模型 API Key。项目配置同时保留了 Moonshot/OpenAI 兼容接口和 DeepSeek 配置，请按 `.env.example` 填写你实际使用的 Key。

## 快速开始

1. 克隆项目并进入目录。

```powershell
git clone <your-repo-url>
cd Menu-Recommendation-Assistant
```

2. 配置环境变量。

首次启动时脚本会自动把 `.env.example` 复制为 `.env`。你也可以手动创建：

```powershell
copy .env.example .env
```

然后编辑 `.env`，至少填入你使用的大模型 Key，例如：

```text
MOONSHOT_API_KEY=...
DEEPSEEK_API_KEY=...
```

3. 启动 Docker Desktop。

请先打开 Docker Desktop，并等待 Docker 运行正常。启动脚本会调用两套 Docker Compose：

- `docker-compose.yml`：启动 Milvus、etcd、MinIO。
- `data/docker-compose.yml`：启动 Neo4j。

4. 一键启动。

推荐普通用户直接双击：

```text
start.bat
```

如果你在 PowerShell 中启动，可以执行：

```powershell
.\start.ps1
```

首次运行时脚本会自动完成：

- 如果缺少 `.env`，则根据 `.env.example` 创建。
- 如果缺少 `.venv`，则执行 `python -m venv .venv` 创建项目本地 Python 虚拟环境。
- 使用 `.venv\Scripts\python.exe -m pip install -r requirements.txt` 安装 Python 依赖。
- 如果缺少 `frontend/node_modules`，则进入 `frontend/` 执行 `npm install`。
- 如果缺少 `frontend/dist`，会自动构建前端。
- 启动根目录 `docker-compose.yml` 中的 Milvus、etcd、MinIO。
- 启动 `data/docker-compose.yml` 中的 Neo4j。
- 启动后端服务 `http://127.0.0.1:8000`。
- 通过后端直接提供 `frontend/dist` 的构建产物。

后续日常启动仍然双击 `start.bat` 或执行：

```powershell
.\start.ps1
```

如果你想强制重新安装依赖，可以执行：

```powershell
.\start.ps1 -InstallDeps
```

停止本地后端进程：

```powershell
.\stop.ps1
```

## 手动启动

项目刻意把两套 Docker Compose 分开，便于分别管理：

- `docker-compose.yml`：启动 Milvus、etcd、MinIO。
- `data/docker-compose.yml`：启动 Neo4j，并导入 `data/cypher` 下的图数据。

启动 Milvus：

```powershell
docker compose -f docker-compose.yml up -d
```

启动 Neo4j：

```powershell
docker compose -f data/docker-compose.yml up -d
```

启动后端：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe web_server.py
```

如果你想单独调试前端开发服务器：

```powershell
cd frontend
npm install
npm run dev
```

开发模式访问：

```text
http://127.0.0.1:5173
```

## 静态前端构建

先构建前端：

```powershell
cd frontend
npm install
npm run build
```

然后回到项目根目录启动：

```powershell
.\.venv\Scripts\python.exe web_server.py
```

此时后端会直接提供 `frontend/dist`，访问：

```text
http://127.0.0.1:8000
```

## 配置说明

大部分配置来自 `.env`，常用变量包括：

- `DeepSeek_API_KEY`：调用大模型所必需。
- `DeepSeek_API_BASE_URL`：默认值为 `https://api.deepseek.com/v1`。
- `NEO4J_URI`、`NEO4J_USER`、`NEO4J_PASSWORD`、`NEO4J_DATABASE`。
- `MILVUS_HOST`、`MILVUS_PORT`、`MILVUS_COLLECTION_NAME`。
- `EMBEDDING_MODEL`、`LLM_MODEL`。
- `TOP_K`、`MAX_GRAPH_DEPTH`、`MAX_TOKENS`。

## 项目结构

- `rag_modules/`：数据准备、索引构建、检索、路由、生成等核心模块。
- `data/cypher/`：Neo4j 导入脚本与图谱 CSV 数据。
- `frontend/`：Vite + React 前端。
- `web_server.py`：轻量后端与前端静态资源服务。
- `start.bat`：Windows 双击启动入口，会绕过 PowerShell 脚本执行策略限制并调用 `start.ps1`。
- `start.ps1`：一键启动脚本，负责准备 `.venv`、安装依赖、启动 Docker 服务和后端。
- `stop.ps1`：停止本地前后端进程。
- `docs/`：架构与部署相关说明。

## 使用提醒

- 启动前请确保 Docker Desktop 已经运行。
- 首次运行可能较慢，因为需要下载 Python 包、前端依赖、嵌入模型，并初始化向量索引和知识库。
- 如果卡在 `Waiting for services`，请查看 `logs/backend.err.log` 和 `logs/backend.out.log`。
- 如果后台 RAG 初始化失败并出现 Hugging Face 网络错误，请检查网络、代理、防火墙或提前下载 `EMBEDDING_MODEL` 对应模型。
