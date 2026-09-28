"""Typed runtime configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://clauseguard:clauseguard@localhost:5433/clauseguard"
    jwt_secret: str = "development-only-change-this-secret-before-use"
    jwt_expire_minutes: int = 60
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    bootstrap_super_admin_email: str = ""
    bootstrap_super_admin_password: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "clauseguard_chunks"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672//"
    redis_url: str = "redis://localhost:6379/4"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    object_store_backend: str = "filesystem"
    local_object_path: str = "deploy/object-data"
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "clauseguard"
    minio_secret_key: str = ""
    minio_bucket: str = "clauseguard-documents"
    openai_api_key: str = ""
    openai_generation_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    max_upload_bytes: int = 50 * 1024 * 1024
    max_agent_retrieval_rounds: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
