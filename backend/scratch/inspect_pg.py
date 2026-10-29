from sqlalchemy import create_engine, text

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
engine = create_engine(pg_url)
with engine.connect() as conn:
    tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")).fetchall()
    print("Postgres tables:", [t[0] for t in tables])
    for t in tables:
        count = conn.execute(text(f"SELECT count(*) FROM \"{t[0]}\";")).fetchone()[0]
        print(f"  {t[0]}: {count} rows")
        if t[0] == 'users':
            users = conn.execute(text("SELECT id, email, full_name, created_at FROM users;")).fetchall()
            print("  Users:", users)
