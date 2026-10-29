import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

# Must be set before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test_aether.db"
os.environ["SECRET_KEY"] = "test_secret_for_integration_testing_only"

from app.main import app
from app.models import Base
from app.core.database import engine

@pytest.fixture(scope="module")
def client():
    # Setup test DB
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    # Teardown test DB cleanly with engine disposal
    engine.dispose()
    if os.path.exists("./test_aether.db"):
        try:
            os.remove("./test_aether.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def auth_headers(client):
    # Register
    res = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User"
    })
    if res.status_code not in [200, 400, 409]:
        pytest.fail(f"Failed to register: {res.text}")
    
    # Login
    res = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def project_id(client, auth_headers):
    res = client.post("/api/v1/projects/", json={
        "name": "E2E Isolation Project Alpha",
        "description": "Integration test project"
    }, headers=auth_headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]

@pytest.fixture(scope="module")
def dataset_id(client, auth_headers, project_id):
    df = pd.DataFrame({
        "customer_id": range(1, 21),
        "tenure_months": [1, 12, 24, 36, 48, 60, 2, 14, 26, 38, 50, 62, 3, 15, 27, 39, 51, 63, 4, 16],
        "monthly_charges": [29.99, 49.99, 79.99, 89.99, 99.99, 109.99, 31.50, 52.00, 81.00, 92.50, 101.00, 112.00, 30.00, 50.00, 80.00, 90.00, 100.00, 110.00, 32.00, 53.00],
        "contract_type": ["Month-to-month", "One year", "Two year", "Two year", "Two year", "Two year", "Month-to-month", "One year", "Two year", "Two year", "Two year", "Two year", "Month-to-month", "One year", "Two year", "Two year", "Two year", "Two year", "Month-to-month", "One year"]
    })
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    csv_bytes = csv_buf.getvalue().encode('utf-8')

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("customer_metrics.csv", csv_bytes, "text/csv")},
        headers=auth_headers
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "healthy"

def test_project_list(client, auth_headers, project_id):
    res = client.get("/api/v1/projects/", headers=auth_headers)
    assert res.status_code == 200
    projects = res.json()["data"]
    assert any(p["id"] == project_id for p in projects)

def test_dataset_preview(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/datasets/{dataset_id}/preview", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["total_rows"] == 20
    assert len(data["columns"]) == 4

def test_analytics_summary(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/analytics/{dataset_id}/summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "summary_statistics" in data
    assert "monthly_charges" in data["summary_statistics"]
    assert data["summary_statistics"]["monthly_charges"]["count"] == 20

def test_analytics_correlation(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/analytics/{dataset_id}/correlation?method=pearson", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "matrix" in data
    assert len(data["columns"]) >= 2

def test_visualizations_recommend(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/visualizations/{dataset_id}/recommendations", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert isinstance(data, list)
    assert len(data) > 0

def test_patterns_discover(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/patterns/{dataset_id}", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert isinstance(data, list)

def test_copilot_chat(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/copilot/chat", json={
        "dataset_id": dataset_id,
        "message": "What is the average monthly charge?"
    }, headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "content" in data
    assert len(data["content"]) > 0

def test_cleaning_operation_and_versioning(client, auth_headers, dataset_id):
    # Apply deduplication operation
    res = client.post(f"/api/v1/cleaning/{dataset_id}/apply", json={
        "operation_type": "remove_duplicates",
        "parameters": {}
    }, headers=auth_headers)
    assert res.status_code == 200, res.text
    op = res.json()["data"]
    assert op["operation_type"] == "remove_duplicates"

    # Verify dataset version incremented
    detail_res = client.get(f"/api/v1/datasets/{dataset_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()["data"]
    assert detail["dataset"]["current_version_num"] >= 2

def test_pdf_report_generation_and_download(client, auth_headers, dataset_id):
    # Generate PDF report
    gen_res = client.post(f"/api/v1/reports/{dataset_id}/generate_pdf", headers=auth_headers)
    assert gen_res.status_code == 200, gen_res.text
    report = gen_res.json()["data"]
    assert report["file_format"] == "pdf"

    # Download PDF report binary
    dl_res = client.get(f"/api/v1/reports/{dataset_id}/download_pdf", headers=auth_headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")
