import psycopg2

DATABASE_URL = "postgresql://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=== STEP 7: Check RLS ===")
    cursor.execute("""
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
    ORDER BY relname;
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Table: {r[0]}, RLS Enabled: {r[1]}, Force RLS: {r[2]}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
