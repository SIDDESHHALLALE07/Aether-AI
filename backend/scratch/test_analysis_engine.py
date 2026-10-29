import sys, io, os
sys.path.insert(0, os.path.abspath('.'))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.dataset import Dataset, DatasetVersion
from app.models.project import Project
from app.data_processing.loader import load_dataframe
from app.reports.analysis_engine import analyze_dataset_for_report

db = SessionLocal()
ds = db.query(Dataset).filter(Dataset.id == '407ace07-ea64-4d66-98dd-910a3c57dbbf').first()
assert ds is not None
ver = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == ds.id).first()
assert ver is not None
project = db.query(Project).filter(Project.id == ds.project_id).first()
project_name = project.name if project else "Project"

df = load_dataframe(ver.storage_path, ds.file_type)
print(f"Loaded {len(df)} rows, {len(df.columns)} cols.")

res = analyze_dataset_for_report(
    df=df,
    dataset_name=ds.original_filename,
    project_name=project_name,
    version_num=ver.version_number
)

print("Report Title:", res["report_title"])
print("Data Quality Score:", res["data_quality"]["overall_score"])
print("Key Findings Count:", len(res["key_findings"]))
for f in res["key_findings"]:
    print(" - Finding:", f)
print("Insights Count:", len(res["insights"]))
for i in res["insights"]:
    print(f" - [{i['severity']}] {i['title']}: {i['what']}")
print("Recommendations Count:", len(res["recommendations"]))
for r in res["recommendations"]:
    print(f" - [{r['category']}] {r['action']}")
print("Recommended Viz Count:", len(res["recommended_visualizations"]))
for v in res["recommended_visualizations"]:
    print(f" - [{v['chart_type']}] {v['title']}")
print("Trend Available:", res["trend_analysis"]["available"])
if res["trend_analysis"]["available"]:
    print("Trend Direction:", res["trend_analysis"]["trend_direction"], "Span:", res["trend_analysis"]["span_days"])
print("Correlation Available:", res["correlation_analysis"]["available"])
if res["correlation_analysis"]["available"]:
    print("Relationships Count:", len(res["correlation_analysis"]["relationships"]))
db.close()
print("ANALYSIS ENGINE VALIDATION SUCCESSFUL!")
