"""Probe output must not disclose the exception text from credential-bearing clients."""

from scripts.probe_infrastructure import probe_result


def test_dependency_failure_redacts_client_exception() -> None:
    def fail():
        raise ConnectionError("postgresql://user:SECRET_SENTINEL@host/customer")

    result = probe_result("PostgreSQL", fail)
    assert result["status"] == "BLOCKED"
    assert result["error_type"] == "ConnectionError"
    assert "SECRET_SENTINEL" not in str(result)
    assert "customer" not in str(result)


def test_probe_success_does_not_claim_integration_verification() -> None:
    result = probe_result("Redis", lambda: "PING")
    assert result["status"] == "REACHABLE"
