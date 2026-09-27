from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_index_serves_static_html() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Studio" in response.text
    assert response.headers["content-type"].startswith("text/html")


def test_health_endpoint() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello_endpoint() -> None:
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello from the project management backend"}
