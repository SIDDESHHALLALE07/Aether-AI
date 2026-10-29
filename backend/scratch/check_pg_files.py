from sqlalchemy import create_engine, text
import os, sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
engine = create_engine(pg_url)
with engine.connect() as conn:
    rows = conn.execute(text("SELECT d.id, d.original_filename, v.storage_path FROM datasets d JOIN dataset_versions v ON v.dataset_id = d.id;")).fetchall()
    print(f"Total dataset versions in PostgreSQL: {len(rows)}")
    found_count = 0
    workspace = r"c:\Users\SIDDESH\OneDrive\เอกสาร\Aether-Copilot-AI"
    for r in rows[:10]:
        filename = r[1]
        storage_path = r[2]
        # check if file exists anywhere
        candidates = [
            os.path.join(workspace, storage_path),
            os.path.join(workspace, "backend", storage_path),
            storage_path
        ]
        exists = any(os.path.exists(c) for c in candidates)
        if exists:
            found_count += 1
        print(f"  {filename} -> {storage_path} (exists: {exists})")
    print(f"Sample checked: {found_count} of 10 exist on disk")
