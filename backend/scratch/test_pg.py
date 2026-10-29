from sqlalchemy import create_engine, text

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
try:
    engine = create_engine(pg_url, connect_args={"connect_timeout": 5})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT current_database();"))
        print("Connected to PostgreSQL successfully! DB:", res.fetchone())
except Exception as e:
    print("Failed to connect to PostgreSQL:", e)
