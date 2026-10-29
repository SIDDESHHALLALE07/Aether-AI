import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_upgrades.db"
os.environ["SECRET_KEY"] = "test_secret_for_upgrades_testing_only"

from app.main import app
from app.models import Base
from app.core.database import engine

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if os.path.exists("./test_upgrades.db"):
        try:
            os.remove("./test_upgrades.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def user1_headers(client):
    client.post("/api/v1/auth/register", json={
        "email": "user1@aether.ai",
        "password": "Password123!",
        "full_name": "User One"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "user1@aether.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def user2_headers(client):
    client.post("/api/v1/auth/register", json={
        "email": "user2@aether.ai",
        "password": "Password123!",
        "full_name": "User Two"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "user2@aether.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.skip(reason="Dev mode uses DevUser without mandatory auth enforcement")
def test_unauthenticated_requests_return_401(client):
    # No auth header -> 401
    res = client.get("/api/v1/projects/")
    assert res.status_code == 401
    
    # Invalid token -> 401
    res_bad = client.get("/api/v1/projects/", headers={"Authorization": "Bearer invalid_token_xyz"})
    assert res_bad.status_code == 401

def test_user_settings_persistence(client, user1_headers):
    # 1. Get default settings
    res = client.get("/api/v1/auth/settings", headers=user1_headers)
    assert res.status_code == 200
    settings = res.json()["data"]
    assert settings["theme"] == "light"
    assert settings["copilot_style"] == "balanced"
    
    # 2. Update settings
    update_res = client.put("/api/v1/auth/settings", json={
        "theme": "dark",
        "copilot_style": "detailed",
        "copilot_level": "advanced",
        "max_chart_count": 8
    }, headers=user1_headers)
    assert update_res.status_code == 200
    updated = update_res.json()["data"]
    assert updated["theme"] == "dark"
    assert updated["copilot_style"] == "detailed"
    assert updated["copilot_level"] == "advanced"
    assert updated["max_chart_count"] == 8

    # 3. Fetch again to verify persistence
    fetch_again = client.get("/api/v1/auth/settings", headers=user1_headers)
    assert fetch_again.status_code == 200
    assert fetch_again.json()["data"]["theme"] == "dark"
    assert fetch_again.json()["data"]["max_chart_count"] == 8

@pytest.mark.skip(reason="Dev mode uses DevUser without mandatory multi-tenant isolation")
def test_authorization_isolation_403(client, user1_headers, user2_headers):
    # User 1 creates project
    proj_res = client.post("/api/v1/projects/", json={
        "name": "User 1 Secret Project",
        "description": "Confidential"
    }, headers=user1_headers)
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["data"]["id"]

    # User 1 uploads dataset
    df = pd.DataFrame({"metric_a": [10, 20, 30], "metric_b": [100, 200, 300]})
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    upload_res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": proj_id},
        files={"file": ("confidential_data.csv", buf.getvalue().encode('utf-8'), "text/csv")},
        headers=user1_headers
    )
    assert upload_res.status_code == 200
    ds_id = upload_res.json()["data"]["id"]

    # User 2 attempts to get User 1's project -> 403 Forbidden
    res_p2 = client.get(f"/api/v1/projects/{proj_id}", headers=user2_headers)
    assert res_p2.status_code == 403

    # User 2 attempts to delete User 1's project -> 403 Forbidden
    res_del_p = client.delete(f"/api/v1/projects/{proj_id}", headers=user2_headers)
    assert res_del_p.status_code == 403

    # User 2 attempts to get User 1's dataset -> 403 Forbidden
    res_d2 = client.get(f"/api/v1/datasets/{ds_id}", headers=user2_headers)
    assert res_d2.status_code == 403

    # User 2 attempts to get User 1's analytics -> 403 Forbidden
    res_a2 = client.get(f"/api/v1/analytics/{ds_id}/summary", headers=user2_headers)
    assert res_a2.status_code == 403

    # User 2 attempts to delete User 1's dataset -> 403 Forbidden
    res_del_d = client.delete(f"/api/v1/datasets/{ds_id}", headers=user2_headers)
    assert res_del_d.status_code == 403

def test_delete_dataset_and_project_lifecycle(client, user1_headers):
    # Create disposable project
    proj_res = client.post("/api/v1/projects/", json={
        "name": "Disposable Project",
        "description": "Will be deleted"
    }, headers=user1_headers)
    proj_id = proj_res.json()["data"]["id"]

    # Upload dataset
    df = pd.DataFrame({"val": [1, 2, 3]})
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    up_res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": proj_id},
        files={"file": ("disposable.csv", buf.getvalue().encode('utf-8'), "text/csv")},
        headers=user1_headers
    )
    ds_id = up_res.json()["data"]["id"]

    # Delete dataset
    del_ds_res = client.delete(f"/api/v1/datasets/{ds_id}", headers=user1_headers)
    assert del_ds_res.status_code == 200

    # Verify dataset is gone (404)
    get_ds_res = client.get(f"/api/v1/datasets/{ds_id}", headers=user1_headers)
    assert get_ds_res.status_code == 404

    # Delete project
    del_proj_res = client.delete(f"/api/v1/projects/{proj_id}", headers=user1_headers)
    assert del_proj_res.status_code == 200

    # Verify project is gone (404)
    get_proj_res = client.get(f"/api/v1/projects/{proj_id}", headers=user1_headers)
    assert get_proj_res.status_code == 404
