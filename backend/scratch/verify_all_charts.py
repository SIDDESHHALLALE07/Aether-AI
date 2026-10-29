import requests
from app.core.database import SessionLocal
from app.models.dataset import Dataset
from app.core.security import create_access_token

db = SessionLocal()
ds = db.query(Dataset).filter(Dataset.original_filename == 'customer_churn.csv').first()
if not ds:
    ds = db.query(Dataset).first()

token = create_access_token(subject=str(ds.user_id))
headers = {"Authorization": f"Bearer {token}"}
BASE_URL = "http://127.0.0.1:8000/api/v1"
dataset_id = ds.id

print(f"Testing with Dataset: {ds.original_filename} ({dataset_id}) for User: {ds.user_id}")

# 1. Test recommendations
rec_res = requests.get(f"{BASE_URL}/visualizations/{dataset_id}/recommendations", headers=headers)
assert rec_res.status_code == 200, f"Recs failed: {rec_res.text}"
recs = rec_res.json()["data"]
print(f"Recommendations count: {len(recs)}")
for r in recs:
    print(f"  - [{r['chart_type']}] {r['title']}")

# 2. Get dataset columns
det_res = requests.get(f"{BASE_URL}/datasets/{dataset_id}", headers=headers)
meta = det_res.json()["data"]["latest_version"]["columns_meta"]
col_keys = list(meta.keys())

num_cols = [c for c in col_keys if any(t in str(meta[c].get("dtype", "")).lower() for t in ["int", "float", "number"])]
cat_cols = [c for c in col_keys if c not in num_cols]
print(f"Numeric columns: {num_cols}")
print(f"Categorical columns: {cat_cols}")

cat = cat_cols[0] if cat_cols else col_keys[0]
num1 = num_cols[0] if num_cols else col_keys[0]
num2 = num_cols[1] if len(num_cols) > 1 else num1

# 3. Test all 10 chart types
test_cases = [
    ("bar_vertical", {"chart_type": "bar_vertical", "x_column": cat, "y_column": num1, "aggregation": "mean"}),
    ("bar_horizontal", {"chart_type": "bar_horizontal", "x_column": cat, "y_column": num1, "aggregation": "sum"}),
    ("line", {"chart_type": "line", "x_column": num1, "y_column": num2, "aggregation": "mean"}),
    ("area", {"chart_type": "area", "x_column": num1, "y_column": num2, "aggregation": "mean"}),
    ("scatter", {"chart_type": "scatter", "x_column": num1, "y_column": num2}),
    ("histogram", {"chart_type": "histogram", "x_column": num1, "bins": 12}),
    ("box", {"chart_type": "box", "x_column": num1, "group_by": cat if cat != num1 else None}),
    ("heatmap", {"chart_type": "heatmap", "selected_columns": num_cols[:4] if len(num_cols) >= 2 else num_cols}),
    ("pie", {"chart_type": "pie", "x_column": cat, "y_column": num1, "aggregation": "sum"}),
    ("donut", {"chart_type": "donut", "x_column": cat, "y_column": num1, "aggregation": "sum"}),
]

print("\n--- Testing All 10 Chart Endpoints ---")
for chart_type, payload in test_cases:
    res = requests.post(f"{BASE_URL}/visualizations/{dataset_id}/chart", json=payload, headers=headers)
    assert res.status_code == 200, f"Failed for {chart_type}: {res.status_code} - {res.text}"
    data = res.json()["data"]
    assert data["chart_type"] == chart_type, f"Expected {chart_type} but got {data['chart_type']}"
    print(f"[OK] {chart_type:15} -> Status 200 OK | Returned chart_type: {data['chart_type']}")

# 4. Test PDF Report with custom chart configuration
print("\n--- Testing PDF Report with custom chart ---")
pdf_res = requests.post(
    f"{BASE_URL}/reports/{dataset_id}/generate_pdf",
    json={"chart_config": {"chart_type": "bar_vertical", "x_column": cat, "y_column": num1, "aggregation": "mean"}},
    headers=headers
)
assert pdf_res.status_code == 200, f"PDF generation failed: {pdf_res.text}"
report_data = pdf_res.json()["data"]
print(f"[OK] PDF Report Generated: {report_data['title']}")
print(f"  Storage path: {report_data['storage_path']}")

print("\nALL 10 CHART TYPES AND PDF REPORT INTEGRATION VERIFIED SUCCESSFULLY!")
