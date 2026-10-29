import urllib.request
import urllib.parse
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    print("=== STARTING END-TO-END NO-AUTH VERIFICATION ===")
    
    # 1. Projects
    req = urllib.request.Request(f"{BASE_URL}/projects/")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())
        print(f"[OK] GET /projects/: {len(data['data'])} projects found.")
        project_id = data['data'][0]['id'] if data['data'] else None

    if not project_id:
        create_data = json.dumps({"name": "Test Project", "description": "Auto verification"}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/projects/", data=create_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode())
            project_id = data['data']['id']
            print(f"[OK] POST /projects/: created project {project_id}")

    # 2. Upload Dataset
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    csv_content = "date,revenue,cost,users\n2025-01-01,1000,400,50\n2025-01-02,1200,450,55\n2025-01-03,1150,420,53\n2025-01-04,1400,500,65\n2025-01-05,1600,550,75\n"
    
    body = []
    body.append(f"--{boundary}".encode())
    body.append(b'Content-Disposition: form-data; name="project_id"')
    body.append(b'')
    body.append(project_id.encode())
    
    body.append(f"--{boundary}".encode())
    body.append(b'Content-Disposition: form-data; name="file"; filename="sales_metrics.csv"')
    body.append(b'Content-Type: text/csv')
    body.append(b'')
    body.append(csv_content.encode())
    body.append(f"--{boundary}--".encode())
    body.append(b'')
    
    payload = b"\r\n".join(body)
    req = urllib.request.Request(
        f"{BASE_URL}/datasets/upload",
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        dataset = res['data']
        dataset_id = dataset['id']
        print(f"[OK] POST /datasets/upload: Uploaded dataset {dataset_id}. Keys: {list(dataset.keys())}")

    # 3. Dataset Preview
    with urllib.request.urlopen(f"{BASE_URL}/datasets/{dataset_id}/preview") as resp:
        assert resp.status == 200
        preview = json.loads(resp.read().decode())['data']
        print(f"[OK] GET /datasets/{dataset_id}/preview: {len(preview['rows'])} sample rows retrieved")

    # 4. Analytics Summary
    with urllib.request.urlopen(f"{BASE_URL}/analytics/{dataset_id}/summary") as resp:
        assert resp.status == 200
        summary = json.loads(resp.read().decode())['data']
        print(f"[OK] GET /analytics/{dataset_id}/summary: Summary calculated for columns: {list(summary.get('descriptive_statistics', {}).keys())}")

    # 5. Visualizations Recommendations
    with urllib.request.urlopen(f"{BASE_URL}/visualizations/{dataset_id}/recommendations") as resp:
        assert resp.status == 200
        recs = json.loads(resp.read().decode())['data']
        print(f"[OK] GET /visualizations/{dataset_id}/recommendations: {len(recs)} charts recommended")

    # 6. Copilot Chat
    chat_body = json.dumps({
        "message": "What is the average revenue in this dataset?",
        "dataset_id": dataset_id,
        "project_id": project_id
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/copilot/chat", data=chat_body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        chat_resp = json.loads(resp.read().decode())['data']
        msg_text = chat_resp.get('content') or str(chat_resp)
        print(f"[OK] POST /copilot/chat: Copilot replied successfully: '{msg_text[:60]}...'")

    # 7. Generate PDF Report
    req = urllib.request.Request(f"{BASE_URL}/reports/{dataset_id}/generate_pdf", data=json.dumps({}).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        rep_resp = json.loads(resp.read().decode())['data']
        print(f"[OK] POST /reports/{dataset_id}/generate_pdf: Report generated successfully. Keys: {list(rep_resp.keys())}")

    # 8. Download PDF Report
    req = urllib.request.Request(f"{BASE_URL}/reports/{dataset_id}/download_pdf")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        content_type = resp.headers.get("Content-Type")
        pdf_bytes = resp.read()
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        assert pdf_bytes.startswith(b"%PDF-"), "Expected PDF binary header"
        print(f"[OK] GET /reports/{dataset_id}/download_pdf: Content-Type is {content_type}, PDF size: {len(pdf_bytes)} bytes. Real PDF verified!")

    # 9. Settings
    with urllib.request.urlopen(f"{BASE_URL}/settings") as resp:
        assert resp.status == 200
        settings = json.loads(resp.read().decode())['data']
        print(f"[OK] GET /settings: Theme is '{settings.get('theme')}', AI enabled: {settings.get('ai_processing_enabled')}")

    print("\n=== ALL BACKEND ENDPOINTS PASSED WITH ZERO AUTHENTICATION REQUIRED! ===")

if __name__ == "__main__":
    test_api()
