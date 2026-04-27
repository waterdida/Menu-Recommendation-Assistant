"""
Configuration for the menu recommendation Graph RAG system.
"""

import os
from dataclasses import dataclass
from typing import Any, Dict


def _get_int(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def _get_float(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


@dataclass
class GraphRAGConfig:
    """Runtime configuration loaded from environment variables."""

    # Neo4j
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "all-in-rag")
    neo4j_database: str = os.getenv("NEO4J_DATABASE", "neo4j")

    # Milvus
    milvus_host: str = os.getenv("MILVUS_HOST", "localhost")
    milvus_port: int = _get_int("MILVUS_PORT", 19530)
    milvus_collection_name: str = os.getenv("MILVUS_COLLECTION_NAME", "cooking_knowledge")
    milvus_dimension: int = _get_int("MILVUS_DIMENSION", 512)

    # Models
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
    llm_model: str = os.getenv("LLM_MODEL", "deepseek-chat")

    # DeepSeek
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

    # Retrieval
    top_k: int = _get_int("TOP_K", 5)
    max_graph_depth: int = _get_int("MAX_GRAPH_DEPTH", 2)

    # Generation
    temperature: float = _get_float("TEMPERATURE", 0.2)
    max_tokens: int = _get_int("MAX_TOKENS", 1024)

    # Chunking
    chunk_size: int = _get_int("CHUNK_SIZE", 500)
    chunk_overlap: int = _get_int("CHUNK_OVERLAP", 50)

    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "GraphRAGConfig":
        return cls(**config_dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "neo4j_uri": self.neo4j_uri,
            "neo4j_user": self.neo4j_user,
            "neo4j_password": self.neo4j_password,
            "neo4j_database": self.neo4j_database,
            "milvus_host": self.milvus_host,
            "milvus_port": self.milvus_port,
            "milvus_collection_name": self.milvus_collection_name,
            "milvus_dimension": self.milvus_dimension,
            "embedding_model": self.embedding_model,
            "llm_model": self.llm_model,
            "deepseek_api_key": self.deepseek_api_key,
            "deepseek_base_url": self.deepseek_base_url,
            "top_k": self.top_k,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "max_graph_depth": self.max_graph_depth,
        }


DEFAULT_CONFIG = GraphRAGConfig()
