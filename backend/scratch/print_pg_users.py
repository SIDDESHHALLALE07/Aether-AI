from sqlalchemy import create_engine, text
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
engine = create_engine(pg_url)
with engine.connect() as conn:
    users = conn.execute(text("SELECT id, email, full_name, role, is_active FROM users;")).fetchall()
    print(f"Total Postgres users: {len(users)}")
    for u in users:
        if "siddesh" in u[1].lower() or "dev@" in u[1].lower() or "testuser" in u[1].lower() or "@aether.ai" in u[1].lower():
            print(" ", u)
