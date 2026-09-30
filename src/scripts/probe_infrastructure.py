"""Read-only dependency probes. Never print credentials, URLs, or exception text."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
from time import perf_counter
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]


def load_configuration():
    # Audit the configuration even before the editable package is repaired.
    spec = importlib.util.spec_from_file_location("clauseguard_probe_config", ROOT / "packages/core/config.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("Configuration module unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Settings(_env_file=ROOT / ".env")


def probe_result(name: str, operation: Callable[[], str]) -> dict[str, object]:
    started = perf_counter()
    try:
        detail = operation()
        result = {"dependency": name, "status": "REACHABLE", "check": detail}
    except Exception as exc:
        result = {"dependency": name, "status": "BLOCKED", "error_type": type(exc).__name__}
    return {**result, "elapsed_ms": round((perf_counter() - started) * 1000)}


def probe_all(settings) -> list[dict[str, object]]:
    def postgres() -> str:
        from sqlalchemy import create_engine, text
        engine = create_engine(settings.database_url, connect_args={"connect_timeout": 3})
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1")).scalar_one()
            return "Authenticated SELECT 1; no product data read or changed"
        finally:
            engine.dispose()

    def minio() -> str:
        import boto3
        from botocore.config import Config
        if not settings.minio_access_key or not settings.minio_secret_key:
            raise RuntimeError("Missing credentials")
        client = boto3.client("s3", endpoint_url=settings.minio_endpoint,
                              aws_access_key_id=settings.minio_access_key,
                              aws_secret_access_key=settings.minio_secret_key,
                              config=Config(connect_timeout=3, read_timeout=3, retries={"max_attempts": 0}))
        try:
            client.head_bucket(Bucket=settings.minio_bucket)
            return "Authenticated HEAD configured bucket; no objects read or changed"
        finally:
            client.close()

    def rabbitmq() -> str:
        from kombu import Connection
        with Connection(settings.rabbitmq_url, connect_timeout=3) as connection:
            connection.connect()
        return "Authenticated AMQP connection; no tasks published"

    def celery() -> str:
        from celery import Celery
        with Celery("clauseguard-audit", broker=settings.rabbitmq_url) as application:
            application.conf.broker_connection_timeout = 3
            application.conf.broker_connection_retry = False
            application.conf.broker_transport_options = {"max_retries": 0}
            replies = application.control.inspect(timeout=3).registered() or {}
            required = {"clauseguard.process_ingestion", "clauseguard.process_sweep"}
            if not any(required.issubset(set(tasks)) for tasks in replies.values()):
                raise RuntimeError("No ClauseGuard worker registered")
        return "Worker advertises ClauseGuard tasks; actual job execution NOT verified"

    def qdrant() -> str:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None, timeout=3)
        try:
            client.get_collections()
        finally:
            client.close()
        return "Collections API reachable; retrieval and isolation NOT verified"

    def neo4j() -> str:
        from neo4j import GraphDatabase
        with GraphDatabase.driver(settings.neo4j_uri,
                                   auth=(settings.neo4j_user, settings.neo4j_password),
                                   connection_timeout=3, connection_acquisition_timeout=3,
                                   max_transaction_retry_time=0) as driver:
            driver.verify_connectivity()
        return "Authenticated driver connectivity; graph traversal NOT verified"

    def redis() -> str:
        from redis import Redis
        with Redis.from_url(settings.redis_url, socket_timeout=3, socket_connect_timeout=3) as client:
            if not client.ping():
                raise RuntimeError("Ping unsuccessful")
        return "Authenticated PING; cache isolation NOT verified"

    operations = {"PostgreSQL": postgres, "MinIO": minio, "RabbitMQ": rabbitmq,
                  "Celery": celery, "Qdrant": qdrant, "Neo4j": neo4j, "Redis": redis}
    # Kombu/Celery transport initialization is lazy and shares Python import
    # locks. Probe sequentially to avoid auditing our own import race as an outage.
    return [probe_result(name, fn) for name, fn in operations.items()]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "docs/evidence/infrastructure-probes.json")
    arguments = parser.parse_args()
    try:
        settings = load_configuration()
        results = probe_all(settings)
    except Exception as exc:
        results = [{"dependency": "configuration", "status": "BLOCKED", "error_type": type(exc).__name__}]
    report = {"at": datetime.now(timezone.utc).isoformat(), "kind": "read-only connectivity audit",
              "integration_verified": False, "results": results}
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return int(any(row["status"] != "REACHABLE" for row in results))


if __name__ == "__main__":
    raise SystemExit(main())
