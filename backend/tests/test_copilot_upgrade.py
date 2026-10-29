import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_copilot_upgrade.db"
os.environ["SECRET_KEY"] = "test_secret_for_copilot_upgrade_testing"

from app.main import app
from app.models import Base
from app.core.database import engine

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if os.path.exists("./test_copilot_upgrade.db"):
        try:
            os.remove("./test_copilot_upgrade.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def user1(client):
    client.post("/api/v1/auth/register", json={
        "email": "analyst1@aether.ai",
        "password": "Password123!",
        "full_name": "Analyst One"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "analyst1@aether.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    user_id = res.json()["data"]["user"]["id"]
    return {"headers": headers, "user_id": user_id}

@pytest.fixture(scope="module")
def user2(client):
    client.post("/api/v1/auth/register", json={
        "email": "analyst2@aether.ai",
        "password": "Password123!",
        "full_name": "Analyst Two"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "analyst2@aether.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    user_id = res.json()["data"]["user"]["id"]
    return {"headers": headers, "user_id": user_id}

@pytest.fixture(scope="module")
def sample_dataset(client, user1):
    # Create project
    p_res = client.post("/api/v1/projects/", json={"name": "Hospital QA Project"}, headers=user1["headers"])
    assert p_res.status_code == 200
    project_id = p_res.json()["data"]["id"]

    # Create synthetic dataset with known missing value and numbers
    csv_data = (
        "patient_id,age,blood_pressure,cholesterol,department\n"
        "P1,45,120,200,Cardiology\n"
        "P2,55,,240,Cardiology\n"
        "P3,30,110,180,Neurology\n"
        "P4,65,140,260,Cardiology\n"
        "P5,70,150,290,Orthopedics\n"
    )
    file_bytes = io.BytesIO(csv_data.encode("utf-8"))
    upload_res = client.post(
        "/api/v1/datasets/upload",
        data={"project_id": project_id},
        files={"file": ("patients.csv", file_bytes, "text/csv")},
        headers=user1["headers"]
    )
    assert upload_res.status_code == 200
    return upload_res.json()["data"]



def test_general_ai_conversation_without_dataset(client, user1):
    # Should work without active dataset
    res = client.post("/api/v1/copilot/chat", json={
        "message": "Hello"
    }, headers=user1["headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert "Aether Copilot" in data["content"] or "help" in data["content"].lower()
    assert data["sender"] == "bot"
    assert data["evidence"]["requires_data"] is False

    # Ask coding question
    res2 = client.post("/api/v1/copilot/chat", json={
        "message": "Explain recursion with Python code"
    }, headers=user1["headers"])
    assert res2.status_code == 200
    content2 = res2.json()["data"]["content"]
    assert "recursion" in content2.lower()
    assert "def " in content2 or "base case" in content2.lower()


def test_dataset_grounded_conversational_flow(client, user1, sample_dataset):
    ds_id = sample_dataset["id"]

    # 1. Analyze my dataset
    r1 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "message": "Analyze my dataset."
    }, headers=user1["headers"])
    assert r1.status_code == 200
    c1 = r1.json()["data"]["content"]
    assert "patients.csv" in c1
    assert "5" in c1 # 5 rows
    conv_id = r1.json()["data"]["conversation_id"]

    # 2. What is the biggest data-quality issue?
    r2 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "What is the biggest data-quality issue?"
    }, headers=user1["headers"])
    assert r2.status_code == 200
    c2 = r2.json()["data"]["content"]
    assert "blood_pressure" in c2 or "missing" in c2.lower() or "quality" in c2.lower()

    # 3. Show me. (Chart generation)
    r3 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "Show me."
    }, headers=user1["headers"])
    assert r3.status_code == 200
    ev3 = r3.json()["data"]["evidence"]
    assert "chart" in ev3
    assert ev3["chart"]["chart_type"] in ["bar_vertical", "histogram", "bar_horizontal"]

    # 4. Explain that chart.
    r4 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "Explain that chart."
    }, headers=user1["headers"])
    assert r4.status_code == 200
    c4 = r4.json()["data"]["content"]
    assert "chart" in c4.lower() or "distribution" in c4.lower() or "relationship" in c4.lower()

    # 5. Create a detailed report.
    r5 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "Create a detailed report."
    }, headers=user1["headers"])
    assert r5.status_code == 200
    assert "report" in r5.json()["data"]["evidence"]

    # 6. Generate PDF.
    r6 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "Generate PDF."
    }, headers=user1["headers"])
    assert r6.status_code == 200
    assert "pdf" in r6.json()["data"]["evidence"]

    # 7. Download it.
    r7 = client.post("/api/v1/copilot/chat", json={
        "dataset_id": ds_id,
        "conversation_id": conv_id,
        "message": "Download it."
    }, headers=user1["headers"])
    assert r7.status_code == 200
    assert "download_url" in r7.json()["data"]["evidence"]


def test_conversation_management_and_isolation(client, user1, user2, sample_dataset):
    ds_id = sample_dataset["id"]

    # User 1 lists conversations
    res = client.get("/api/v1/copilot/conversations", headers=user1["headers"])
    assert res.status_code == 200
    convs = res.json()["data"]
    assert len(convs) >= 1
    conv_id = convs[0]["id"]

    # User 1 renames conversation
    patch_res = client.patch(f"/api/v1/copilot/conversations/{conv_id}", json={
        "title": "Renamed Patient Analysis"
    }, headers=user1["headers"])
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["title"] == "Renamed Patient Analysis"

    # User 2 CANNOT access or see User 1's conversation
    u2_get = client.get(f"/api/v1/copilot/conversations/{conv_id}", headers=user2["headers"])
    assert u2_get.status_code == 404

    # User 2 conversation list is isolated
    u2_list = client.get("/api/v1/copilot/conversations", headers=user2["headers"])
    assert u2_list.status_code == 200
    assert len(u2_list.json()["data"]) == 0
