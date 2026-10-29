import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_viz_endpoints.db"
os.environ["SECRET_KEY"] = "test_secret_for_viz_endpoints_testing"

from app.main import app
from app.models import Base
from app.core.database import engine

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if os.path.exists("./test_viz_endpoints.db"):
        try:
            os.remove("./test_viz_endpoints.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def auth_headers(client):
    client.post("/api/v1/auth/register", json={
        "email": "viz_test@aether.ai",
        "password": "Password123!",
        "full_name": "Viz Tester"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "viz_test@aether.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def dataset_id(client, auth_headers):
    # 1. Create project
    p_res = client.post("/api/v1/projects/", json={"name": "Viz Test Project"}, headers=auth_headers)
    assert p_res.status_code == 200
    proj_id = p_res.json()["data"]["id"]

    # 2. Upload dataset with mixed types
    df = pd.DataFrame({
        "segment": ["Enterprise", "SMB", "Consumer", "Enterprise", "SMB", "Consumer", "SMB", "Enterprise"],
        "region": ["East", "West", "North", "South", "East", "West", "North", "South"],
        "revenue": [5000.0, 1200.5, 450.0, 6200.0, 1500.0, 320.0, 1800.0, 7100.0],
        "costs": [3200.0, 900.0, 300.0, 4100.0, 1100.0, 250.0, 1250.0, 4800.0],
        "active_users": [120, 45, 12, 160, 52, 9, 65, 190],
        "quarter": ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2", "Q3", "Q3"]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    upload_res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": proj_id},
        files={"file": ("financial_metrics.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=auth_headers
    )
    assert upload_res.status_code == 200
    return upload_res.json()["data"]["id"]

def test_recommendations_endpoint(client, auth_headers, dataset_id):
    res = client.get(f"/api/v1/visualizations/{dataset_id}/recommendations", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert isinstance(data, list)
    assert len(data) > 0

def test_bar_vertical_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "bar_vertical",
        "x_column": "segment",
        "y_column": "revenue",
        "aggregation": "mean"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "bar_vertical"
    assert len(data["categories"]) > 0

def test_bar_horizontal_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "bar_horizontal",
        "x_column": "region",
        "y_column": "revenue",
        "aggregation": "sum"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "bar_horizontal"

def test_line_and_area_chart(client, auth_headers, dataset_id):
    for c_type in ["line", "area"]:
        res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
            "chart_type": c_type,
            "x_column": "quarter",
            "y_column": "revenue",
            "aggregation": "sum"
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["chart_type"] == c_type

def test_scatter_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "scatter",
        "x_column": "costs",
        "y_column": "revenue",
        "group_by": "segment"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "scatter"
    assert len(data["points"]) > 0

def test_histogram_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "histogram",
        "x_column": "revenue",
        "bins": 10
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "histogram"
    assert len(data["bins"]) == 10

def test_box_plot_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "box",
        "x_column": "revenue",
        "group_by": "segment"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "box"
    assert len(data["raw_data"]) > 0

def test_heatmap_chart(client, auth_headers, dataset_id):
    res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
        "chart_type": "heatmap",
        "selected_columns": ["revenue", "costs", "active_users"]
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["chart_type"] == "heatmap"
    assert len(data["z_matrix"]) == 3

def test_pie_and_donut_chart(client, auth_headers, dataset_id):
    for c_type in ["pie", "donut"]:
        res = client.post(f"/api/v1/visualizations/{dataset_id}/chart", json={
            "chart_type": c_type,
            "x_column": "segment",
            "y_column": "revenue",
            "aggregation": "sum"
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["chart_type"] == c_type
        assert len(data["labels"]) > 0
