"""Tests for health check endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_returns_success():
    """Verify health endpoint returns 200 and expected status object."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "NayaSetu"
    assert "version" in data
    assert "ocr_available" in data
    assert isinstance(data["ocr_available"], bool)


def test_health_check_does_not_expose_secrets():
    """Verify that health endpoint does not leak secrets or system environment info."""
    response = client.get("/api/health")
    data = response.json()
    assert "secret" not in str(data).lower()
    assert "password" not in str(data).lower()
    assert "token" not in str(data).lower()
    assert "key" not in str(data).lower()
