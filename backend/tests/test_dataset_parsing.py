import os
import io
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient

# Ensure test DB and secret are configured
os.environ["DATABASE_URL"] = "sqlite:///./test_parsing.db"
os.environ["SECRET_KEY"] = "test_secret_for_dataset_parsing_tests"

from app.main import app
from app.models import Base
from app.core.database import engine
from app.data_processing.loader import load_dataframe

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if os.path.exists("./test_parsing.db"):
        try:
            os.remove("./test_parsing.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def auth_headers(client):
    # Register user
    res = client.post("/api/v1/auth/register", json={
        "email": "parser_test@example.com",
        "password": "Password123!",
        "full_name": "Parser Tester"
    })
    if res.status_code not in [200, 400, 409]:
        pytest.fail(f"Failed to register user: {res.text}")

    # Login
    res = client.post("/api/v1/auth/login", json={
        "email": "parser_test@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def project_id(client, auth_headers):
    res = client.post("/api/v1/projects/", json={
        "name": "Dataset Parsing Test Project",
        "description": "Project for validating file parsing and multi-format support"
    }, headers=auth_headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def test_upload_normal_csv(client, auth_headers, project_id):
    csv_content = "id,product_name,price,quantity\n1,Widget A,19.99,10\n2,Widget B,29.99,5\n3,Widget C,9.99,20\n"
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("products.csv", file_bytes, "text/csv")},
        headers=auth_headers
    )

    assert res.status_code == 200, res.text
    json_data = res.json()
    assert json_data["success"] is True
    assert json_data["error"] is None
    ds = json_data["data"]
    assert ds["file_type"] == "csv"
    assert ds["original_filename"] == "products.csv"

    # Verify profiling ran automatically
    profile_res = client.get(f"/api/v1/datasets/{ds['id']}/profile", headers=auth_headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["data"]["numeric_summary"] is not None

    quality_res = client.get(f"/api/v1/datasets/{ds['id']}/quality", headers=auth_headers)
    assert quality_res.status_code == 200
    assert quality_res.json()["data"]["overall_score"] is not None


def test_upload_semicolon_csv(client, auth_headers, project_id):
    # Test CSV with semicolon delimiter autodetection
    csv_content = "customer;country;spent\nAlice;France;120.50\nBob;Germany;240.00\nCharlie;Spain;85.20\n"
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("european_customers.csv", file_bytes, "text/csv")},
        headers=auth_headers
    )

    assert res.status_code == 200, res.text
    ds = res.json()["data"]

    # Verify preview parsed columns correctly with semicolon
    preview_res = client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=auth_headers)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()["data"]
    assert "customer" in preview_data["columns"]
    assert "country" in preview_data["columns"]
    assert "spent" in preview_data["columns"]
    assert len(preview_data["rows"]) == 3


def test_upload_normal_xlsx(client, auth_headers, project_id):
    df = pd.DataFrame({
        "employee_id": [101, 102, 103, 104],
        "department": ["Engineering", "Design", "Marketing", "Sales"],
        "salary": [95000, 85000, 75000, 70000]
    })
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine="openpyxl")
    buffer.seek(0)

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("employees.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=auth_headers
    )

    assert res.status_code == 200, res.text
    ds = res.json()["data"]
    assert ds["file_type"] == "xlsx"

    # Verify dataset preview
    preview_res = client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=auth_headers)
    assert preview_res.status_code == 200
    assert len(preview_res.json()["data"]["rows"]) == 4


def test_upload_unclean_xlsx(client, auth_headers, project_id):
    # Intentionally unclean dataset: contains NaNs, duplicate rows, extreme outliers, mixed types
    df = pd.DataFrame({
        "item_code": ["A100", "A100", "B200", None, "C300", "D400"],
        "units_sold": [10, 10, 5, 2, 999999, None],  # 999999 is an outlier, duplicate row 0 and 1, nulls
        "rating": ["5.0", "5.0", "invalid_str", "4.2", "1.0", None]
    })
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine="openpyxl")
    buffer.seek(0)

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("unclean_inventory.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=auth_headers
    )

    assert res.status_code == 200, res.text
    ds = res.json()["data"]

    # Check that quality engine detected the issues automatically
    quality_res = client.get(f"/api/v1/datasets/{ds['id']}/quality", headers=auth_headers)
    assert quality_res.status_code == 200
    quality = quality_res.json()["data"]
    assert quality["completeness_score"] < 100.0
    assert quality["detected_issues"]["null_cells_count"] > 0
    assert quality["detected_issues"]["duplicate_rows_count"] > 0


def test_upload_json_dataset(client, auth_headers, project_id):
    json_data = [
        {"sensor_id": "SN-01", "temperature": 22.4, "status": "OK"},
        {"sensor_id": "SN-02", "temperature": 28.1, "status": "WARN"},
        {"sensor_id": "SN-03", "temperature": 19.8, "status": "OK"}
    ]
    file_bytes = io.BytesIO(json.dumps(json_data).encode("utf-8"))

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("sensor_readings.json", file_bytes, "application/json")},
        headers=auth_headers
    )

    assert res.status_code == 200, res.text
    ds = res.json()["data"]
    assert ds["file_type"] == "json"

    preview_res = client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=auth_headers)
    assert preview_res.status_code == 200
    assert len(preview_res.json()["data"]["rows"]) == 3


def test_upload_empty_dataset_0_bytes(client, auth_headers, project_id):
    empty_bytes = io.BytesIO(b"")

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("empty.csv", empty_bytes, "text/csv")},
        headers=auth_headers
    )

    assert res.status_code == 400
    err = res.json()
    assert err["success"] is False
    assert "empty" in err["error"]["message"].lower()
    # Ensure no Python traceback is present in message
    assert "Traceback" not in err["error"]["message"]


def test_upload_unsupported_file_type(client, auth_headers, project_id):
    fake_pdf = io.BytesIO(b"%PDF-1.4 header content")

    res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("document.pdf", fake_pdf, "application/pdf")},
        headers=auth_headers
    )

    assert res.status_code == 400
    err = res.json()
    assert err["success"] is False
    assert "invalid file format" in err["error"]["message"].lower()
    assert "Traceback" not in err["error"]["message"]


def test_openpyxl_missing_dependency_clean_error(tmp_path, monkeypatch):
    import sys
    # Simulate openpyxl being unavailable to verify exact user error message
    xlsx_path = str(tmp_path / "dummy.xlsx")
    with open(xlsx_path, "wb") as f:
        f.write(b"PK\x03\x04fake_excel_bytes")

    monkeypatch.setitem(sys.modules, "openpyxl", None)
    with pytest.raises(Exception) as exc_info:
        load_dataframe(xlsx_path, "xlsx")
    
    assert hasattr(exc_info.value, "detail")
    assert "Excel parser dependency is unavailable. Please install openpyxl." in exc_info.value.detail
