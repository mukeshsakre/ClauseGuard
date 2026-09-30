"""Validated configuration shared by API, workers, migrations and adapters.

Production refuses unsafe defaults before opening database or provider clients.
Secrets remain backend-only and validation messages never include input values.
"""

from functools import lru_cache
from pathlib import Path
import os
import re
from typing import Literal, Self
from urllib.parse import parse_qs, urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SOURCE_ROOT = Path(__file__).resolve().parents[2]


class ConfigurationError(ValueError):
    """An actionable configuration error containing field names, never values."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SOURCE_ROOT / ".env", env_file_encoding="utf-8", extra="ignore",
        hide_input_in_errors=True,
    )

    app_env: Literal["development", "test", "production"] = "development"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    database_url: str = Field(
        default="postgresql+psycopg://clauseguard:clauseguard@localhost:5433/clauseguard", repr=False,
    )
    jwt_secret: str = Field(default="development-only-change-this-secret-before-use", repr=False)
    jwt_expire_minutes: int = Field(default=60, ge=5, le=1440)
    jwt_issuer: str = "clauseguard"
    jwt_audience: str = "clauseguard-api"
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = Field(default="", repr=False)
    bootstrap_super_admin_email: str = ""
    bootstrap_super_admin_password: str = Field(default="", repr=False)
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = Field(default="", repr=False)
    qdrant_collection: str = "clauseguard_chunks"
    rabbitmq_url: str = Field(default="amqp://guest:guest@localhost:5672//", repr=False)
    redis_url: str = Field(default="redis://localhost:6379/4", repr=False)
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = Field(default="", repr=False)
    object_store_backend: Literal["s3", "filesystem"] = "s3"
    # Legacy development-only setting. Task 10 removes the filesystem adapter.
    local_object_path: str = "deploy/object-data"
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = Field(default="", repr=False)
    minio_secret_key: str = Field(default="", repr=False)
    minio_bucket: str = "clauseguard-documents"
    minio_sse: Literal["AES256", "aws:kms"] = "aws:kms"
    minio_kms_key_id: str = ""
    openai_api_key: str = Field(default="", repr=False)
    openai_generation_model: str = "gpt-4.1-mini"
    openai_embedding_model: Literal["text-embedding-3-small"] = "text-embedding-3-small"
    openai_embedding_dimensions: int = Field(default=1536, ge=1, le=1536)
    prompt_version: str = "clauseguard-v1"
    reranker_model: str = ""
    reranker_revision: str = ""
    model_cache_path: Path = SOURCE_ROOT / ".venv" / "model-cache"
    ocr_executable: str = "tesseract"
    ocr_languages: str = "eng"
    ocr_dpi: int = Field(default=300, ge=150, le=600)
    provider_timeout_seconds: float = Field(default=20, gt=0, le=120)
    provider_max_retries: int = Field(default=2, ge=0, le=3)
    dependency_timeout_seconds: float = Field(default=5, gt=0, le=30)
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, ge=1, le=100 * 1024 * 1024)
    max_agent_retrieval_rounds: int = Field(default=1, ge=0, le=1)
    max_retrieval_candidates: int = Field(default=40, ge=20, le=50)
    embedding_cache_ttl_seconds: int = Field(default=86400, ge=1, le=604800)
    answer_cache_ttl_seconds: int = Field(default=300, ge=1, le=3600)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    trusted_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])

    @model_validator(mode="after")
    def validate_runtime(self) -> Self:
        schemes = {
            "database_url": {"postgresql+psycopg", "postgresql"},
            "rabbitmq_url": {"amqp", "amqps"}, "redis_url": {"redis", "rediss"},
            "qdrant_url": {"http", "https"}, "minio_endpoint": {"http", "https"},
            "neo4j_uri": {"bolt", "neo4j", "bolt+s", "neo4j+s"},
        }
        parsed = {}
        for name, allowed in schemes.items():
            try:
                address = urlsplit(getattr(self, name))
                if address.scheme not in allowed or not address.hostname:
                    raise ValueError
                if address.port is not None and not 1 <= address.port <= 65535:
                    raise ValueError
                if name in {"qdrant_url", "minio_endpoint", "neo4j_uri"} and (address.username or address.password):
                    raise ValueError
                parsed[name] = address
            except ValueError:
                raise ConfigurationError(f"Invalid {name}; use its configured scheme, host and separate credentials") from None
        if not parsed["database_url"].path.strip("/"):
            raise ConfigurationError("database_url must identify a ClauseGuard database")
        if not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", self.minio_bucket):
            raise ConfigurationError("Invalid minio_bucket")
        if not self.qdrant_collection.strip() or not self.prompt_version.strip():
            raise ConfigurationError("qdrant_collection and prompt_version must be non-empty")
        for origin in self.cors_origins:
            value = urlsplit(origin)
            if value.scheme not in {"http", "https"} or not value.netloc or value.path not in {"", "/"} or value.query or value.fragment or value.username:
                raise ConfigurationError("cors_origins must contain explicit HTTP(S) origins")
        if self.app_env == "production":
            self._validate_production(parsed)
        return self

    def _validate_production(self, parsed: dict) -> None:
        missing = [name for name in (
            "openai_api_key", "minio_access_key", "minio_secret_key", "neo4j_user",
            "neo4j_password", "qdrant_api_key", "reranker_model", "reranker_revision",
        ) if not getattr(self, name).strip()]
        if missing:
            raise ConfigurationError("Production requires: " + ", ".join(missing))
        if len(self.jwt_secret) < 32 or any(token in self.jwt_secret.lower() for token in ("change-this", "change-me", "replace-with", "development-only")):
            raise ConfigurationError("Production requires a non-default JWT_SECRET of at least 32 characters")
        if self.debug or self.log_level == "DEBUG":
            raise ConfigurationError("Production debug mode/logging is forbidden")
        if self.object_store_backend != "s3":
            raise ConfigurationError("Production originals require MinIO (OBJECT_STORE_BACKEND=s3)")
        tls = {"rabbitmq_url": {"amqps"}, "redis_url": {"rediss"},
               "qdrant_url": {"https"}, "minio_endpoint": {"https"},
               "neo4j_uri": {"bolt+s", "neo4j+s"}}
        if any(parsed[name].scheme not in allowed for name, allowed in tls.items()):
            raise ConfigurationError("Production dependencies require authenticated TLS endpoints")
        if parse_qs(parsed["database_url"].query).get("sslmode") != ["verify-full"]:
            raise ConfigurationError("Production database_url requires sslmode=verify-full")
        if any(not parsed[name].password for name in ("database_url", "rabbitmq_url", "redis_url")):
            raise ConfigurationError("Production database/broker/cache credentials are required")
        if parsed["rabbitmq_url"].username == "guest":
            raise ConfigurationError("Production RabbitMQ cannot use guest credentials")
        if not re.search(r"-\d{4}-\d{2}-\d{2}$", self.openai_generation_model):
            raise ConfigurationError("Production OPENAI_GENERATION_MODEL must identify a dated OpenAI snapshot")
        if self.reranker_revision.lower() in {"main", "master", "latest"}:
            raise ConfigurationError("Production reranker_revision must be immutable")
        if self.max_agent_retrieval_rounds != 1:
            raise ConfigurationError("PRD FR-VER-10 requires one corrective retrieval round")
        if not self.cors_origins or any(urlsplit(value).scheme != "https" for value in self.cors_origins):
            raise ConfigurationError("Production requires explicit HTTPS cors_origins")
        if not self.trusted_hosts or any("*" in host for host in self.trusted_hosts):
            raise ConfigurationError("Production requires explicit trusted_hosts")

    def redacted_summary(self) -> dict[str, object]:
        """Safe diagnostics; never serialize the configuration object itself."""
        return {"environment": self.app_env, "object_store_backend": self.object_store_backend,
                "model_credentials_configured": bool(self.openai_api_key),
                "generation_model": self.openai_generation_model,
                "embedding_model": self.openai_embedding_model,
                "corrective_retrieval_rounds": self.max_agent_retrieval_rounds}


@lru_cache
def get_settings() -> Settings:
    # Unit tests must never inherit local customer credentials from the dotenv file.
    return Settings(_env_file=None) if os.environ.get("APP_ENV") == "test" else Settings()
