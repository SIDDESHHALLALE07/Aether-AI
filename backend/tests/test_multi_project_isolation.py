import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

# Test DB configuration
os.environ["DATABASE_URL"] = "sqlite:///./test_isolation.db"
os.environ["SECRET_KEY"] = "test_secret_for_isolation_testing_only"

from app.main import app
from app.models import Base
from app.core.database import engine

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if os.path.exists("./test_isolation.db"):
        try:
            os.remove("./test_isolation.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def auth_headers(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "analyst@isolation.com",
        "password": "IsolationPassword123!",
        "full_name": "Multi-Tenant Analyst"
    })
    if res.status_code not in [200, 400, 409]:
        pytest.fail(f"Failed to register: {res.text}")
    
    login_res = client.post("/api/v1/auth/login", json={
        "email": "analyst@isolation.com",
        "password": "IsolationPassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_multi_project_dataset_isolation_and_flow(client, auth_headers):
    # 1. Create Project A (Sales Intelligence)
    res_a = client.post("/api/v1/projects/", json={
        "name": "Project A - Retail Sales",
        "description": "Retail stores transactional data"
    }, headers=auth_headers)
    assert res_a.status_code == 200
    proj_a_id = res_a.json()["data"]["id"]

    # 2. Create Project B (Clinical Trials)
    res_b = client.post("/api/v1/projects/", json={
        "name": "Project B - Clinical Pharma",
        "description": "Biomedical trial efficacy"
    }, headers=auth_headers)
    assert res_b.status_code == 200
    proj_b_id = res_b.json()["data"]["id"]

    # 3. Upload Dataset Alpha to Project A (Retail)
    df_alpha = pd.DataFrame({
        "store_id": range(101, 121),
        "weekly_sales": [12000.5, 14500.0, 18200.0, 11000.0, 19500.0, 22000.0, 13400.0, 15600.0, 17800.0, 19000.0,
                         12500.0, 14800.0, 18900.0, 11200.0, 19800.0, 22500.0, 13800.0, 15900.0, 18100.0, 19300.0],
        "customer_footfall": [450, 520, 680, 410, 710, 850, 490, 560, 640, 700,
                              460, 530, 690, 420, 720, 860, 500, 570, 650, 710]
    })
    buf_a = io.StringIO()
    df_alpha.to_csv(buf_a, index=False)
    
    upload_a = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": proj_a_id},
        files={"file": ("retail_store_sales.csv", buf_a.getvalue().encode('utf-8'), "text/csv")},
        headers=auth_headers
    )
    assert upload_a.status_code == 200
    ds_alpha_id = upload_a.json()["data"]["id"]

    # 4. Upload Dataset Beta to Project B (Clinical)
    df_beta = pd.DataFrame({
        "patient_id": range(5001, 5016),
        "dosage_mg": [10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30],
        "biomarker_response": [4.2, 7.8, 11.5, 4.0, 8.1, 12.0, 4.5, 7.6, 11.8, 4.1, 7.9, 11.4, 4.3, 8.0, 11.9]
    })
    buf_b = io.StringIO()
    df_beta.to_csv(buf_b, index=False)

    upload_b = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": proj_b_id},
        files={"file": ("pharma_clinical_trials.csv", buf_b.getvalue().encode('utf-8'), "text/csv")},
        headers=auth_headers
    )
    assert upload_b.status_code == 200
    ds_beta_id = upload_b.json()["data"]["id"]

    # 5. Verify Dataset Isolation by Project ID
    list_a = client.get(f"/api/v1/datasets/?project_id={proj_a_id}", headers=auth_headers)
    assert list_a.status_code == 200
    items_a = list_a.json()["data"]
    assert len(items_a) == 1
    assert items_a[0]["original_filename"] == "retail_store_sales.csv"

    list_b = client.get(f"/api/v1/datasets/?project_id={proj_b_id}", headers=auth_headers)
    assert list_b.status_code == 200
    items_b = list_b.json()["data"]
    assert len(items_b) == 1
    assert items_b[0]["original_filename"] == "pharma_clinical_trials.csv"

    # 6. Verify Analytical Isolation: Alpha contains weekly_sales, Beta contains dosage_mg
    stats_a = client.get(f"/api/v1/analytics/{ds_alpha_id}/summary", headers=auth_headers).json()["data"]
    assert "weekly_sales" in stats_a["summary_statistics"]
    assert "dosage_mg" not in stats_a["summary_statistics"]

    stats_b = client.get(f"/api/v1/analytics/{ds_beta_id}/summary", headers=auth_headers).json()["data"]
    assert "dosage_mg" in stats_b["summary_statistics"]
    assert "weekly_sales" not in stats_b["summary_statistics"]

    # 7. Apply Cleaning Operation to Beta ONLY
    clean_b = client.post(f"/api/v1/cleaning/{ds_beta_id}/apply", json={
        "operation_type": "remove_duplicates",
        "parameters": {}
    }, headers=auth_headers)
    assert clean_b.status_code == 200

    # Verify Beta is now V2
    detail_b = client.get(f"/api/v1/datasets/{ds_beta_id}", headers=auth_headers).json()["data"]
    assert detail_b["dataset"]["current_version_num"] == 2

    # Verify Alpha remains V1 (zero leakage)
    detail_a = client.get(f"/api/v1/datasets/{ds_alpha_id}", headers=auth_headers).json()["data"]
    assert detail_a["dataset"]["current_version_num"] == 1

    # 8. Generate and Download PDF Report for Alpha and Beta
    pdf_gen_a = client.post(f"/api/v1/reports/{ds_alpha_id}/generate_pdf", headers=auth_headers)
    assert pdf_gen_a.status_code == 200

    pdf_dl_a = client.get(f"/api/v1/reports/{ds_alpha_id}/download_pdf", headers=auth_headers)
    assert pdf_dl_a.status_code == 200
    assert pdf_dl_a.content.startswith(b"%PDF")

    pdf_gen_b = client.post(f"/api/v1/reports/{ds_beta_id}/generate_pdf", headers=auth_headers)
    assert pdf_gen_b.status_code == 200

    pdf_dl_b = client.get(f"/api/v1/reports/{ds_beta_id}/download_pdf", headers=auth_headers)
    assert pdf_dl_b.status_code == 200
    assert pdf_dl_b.content.startswith(b"%PDF")
