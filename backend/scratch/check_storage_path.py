import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

conn = sqlite3.connect("backend/aether_dev.db")
cur = conn.cursor()
cur.execute("SELECT id, dataset_id, version_number, storage_path FROM dataset_versions LIMIT 5;")
for r in cur.fetchall():
    print(r)
conn.close()
