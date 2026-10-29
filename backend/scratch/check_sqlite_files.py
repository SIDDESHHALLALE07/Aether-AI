import sqlite3
import os, sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

conn = sqlite3.connect("backend/aether_dev.db")
cur = conn.cursor()
cur.execute("SELECT d.id, d.original_filename, v.storage_path FROM datasets d JOIN dataset_versions v ON v.dataset_id = d.id;")
rows = cur.fetchall()
print(f"Total dataset versions in backend/aether_dev.db: {len(rows)}")
found = 0
workspace = r"c:\Users\SIDDESH\OneDrive\เอกสาร\Aether-Copilot-AI"
for r in rows:
    storage_path = r[2]
    candidates = [
        os.path.join(workspace, storage_path),
        os.path.join(workspace, "backend", storage_path),
        storage_path
    ]
    exists = any(os.path.exists(c) for c in candidates)
    if exists:
        found += 1
print(f"Dataset files existing on disk: {found} of {len(rows)}")
conn.close()
