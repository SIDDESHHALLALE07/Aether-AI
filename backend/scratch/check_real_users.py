import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

for name, db_file in [("ROOT", "aether_dev.db"), ("BACKEND", "backend/aether_dev.db")]:
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    cur.execute("SELECT id, email, full_name, role, created_at FROM users;")
    all_users = cur.fetchall()
    real_users = [u for u in all_users if not any(kw in u[1].lower() for kw in ['test', 'hacker', 'injection', 'sessionuser', 'chat_user', 'intent_'])]
    print(f"=== {name} Real Users ({len(real_users)} of {len(all_users)}) ===")
    for u in real_users:
        print(f"  {u[0]} | {u[1]} | {u[2]} | {u[3]} | {u[4]}")
    conn.close()
