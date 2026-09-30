"""Unit tests use the installed package and never load customer dotenv credentials."""

import pytest

from clauseguard_core.config import get_settings


@pytest.fixture(autouse=True)
def isolate_unit_configuration(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("OBJECT_STORE_BACKEND", "filesystem")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
