import sqlite3
import sys, os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

conn = sqlite3.connect("backend/aether_dev.db")
cur = conn.cursor()
cur.execute("""
SELECT d.id, d.original_filename, v.version_number, v.storage_path 
FROM datasets d
JOIN dataset_versions v ON v.dataset_id = d.id
JOIN users u ON u.id = d.user_id
WHERE u.email = 'hallalesiddesh@gmail.com';
""")
for r in cur.fetchall():
    print("Dataset:", r[0], r[1], "V" + str(r[2]), "Path:", r[3])
    # check where it exists on disk
    for candidate in [
        r[3],
        os.path.join("backend", r[3]),
        os.path.join(r"c:\Users\SIDDESH\OneDrive\เอกสาร\Aether-Copilot-AI", r[3]),
        os.path.join(r"c:\Users\SIDDESH\OneDrive\เอกสาร\Aether-Copilot-AI", "backend", r[3])
    ]:
        if os.path.exists(candidate):
            print("  Found file at:", candidate, f"({os.path.getsize(candidate)} bytes)")
conn.close()
