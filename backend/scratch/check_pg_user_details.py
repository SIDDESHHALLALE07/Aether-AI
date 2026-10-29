from sqlalchemy import create_engine, text
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
engine = create_engine(pg_url)
with engine.connect() as conn:
    row = conn.execute(text("SELECT id, email, hashed_password, role, is_active FROM users WHERE email = 'hallalesiddesh@gmail.com';")).fetchone()
    print("Postgres user row:", row)
    projects = conn.execute(text("SELECT id, name FROM projects WHERE user_id = :uid;"), {"uid": row[0]}).fetchall()
    print("Postgres user projects:", projects)
    datasets = conn.execute(text("SELECT id, original_filename FROM datasets WHERE user_id = :uid;"), {"uid": row[0]}).fetchall()
    print("Postgres user datasets:", datasets)
