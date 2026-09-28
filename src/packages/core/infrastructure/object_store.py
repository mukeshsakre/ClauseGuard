"""Tenant-prefixed document storage with local and S3-compatible backends."""

from pathlib import Path, PurePosixPath

import boto3

from clauseguard_core.config import get_settings


class ObjectStore:
    """Store originals below tenant/document prefixes and verify the prefix on every read."""

    def __init__(self) -> None:
        settings = get_settings()
        self._backend = settings.object_store_backend.casefold()
        self._bucket = settings.minio_bucket
        self._root = self._local_root(settings.local_object_path)
        self._client = None
        if self._backend == "s3":
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.minio_endpoint,
                aws_access_key_id=settings.minio_access_key,
                aws_secret_access_key=settings.minio_secret_key,
                region_name="us-east-1",
            )
        elif self._backend != "filesystem":
            raise ValueError("OBJECT_STORE_BACKEND must be filesystem or s3")

    @staticmethod
    def _local_root(configured_path: str) -> Path:
        path = Path(configured_path)
        if path.is_absolute():
            return path.resolve()
        project_root = Path(__file__).resolve().parents[5]
        return (project_root / path).resolve()

    def _tenant_path(self, tenant_id: str, key: str) -> Path:
        parts = PurePosixPath(key).parts
        if (
            not tenant_id
            or "/" in tenant_id
            or "\\" in tenant_id
            or not parts
            or parts[0] != tenant_id
            or any(part in {"", ".", ".."} for part in parts)
        ):
            raise PermissionError("Object is outside the authenticated tenant scope")
        path = (self._root.joinpath(*parts)).resolve()
        if not path.is_relative_to(self._root):
            raise PermissionError("Object path escaped the configured storage root")
        return path

    def ensure_bucket(self) -> None:
        if self._backend == "filesystem":
            self._root.mkdir(parents=True, exist_ok=True)
            return
        assert self._client is not None
        existing = {item["Name"] for item in self._client.list_buckets().get("Buckets", [])}
        if self._bucket not in existing:
            self._client.create_bucket(Bucket=self._bucket)

    def put(self, tenant_id: str, document_id: str, data: bytes) -> str:
        key = f"{tenant_id}/{document_id}/original"
        path = self._tenant_path(tenant_id, key)
        if self._backend == "filesystem":
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary_path = path.with_name(f".{path.name}.tmp")
            temporary_path.write_bytes(data)
            temporary_path.replace(path)
        else:
            assert self._client is not None
            self._client.put_object(Bucket=self._bucket, Key=key, Body=data)
        return key

    def get(self, tenant_id: str, key: str) -> bytes:
        path = self._tenant_path(tenant_id, key)
        if self._backend == "filesystem":
            return path.read_bytes()
        assert self._client is not None
        return self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()
