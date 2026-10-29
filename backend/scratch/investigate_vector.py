import psycopg2
import os

DATABASE_URL = "postgresql://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    print("=== Moving vector to extensions schema ===")
    try:
        cursor.execute("CREATE SCHEMA IF NOT EXISTS extensions;")
        cursor.execute("ALTER EXTENSION vector SET SCHEMA extensions;")
        print("Success")
    except Exception as e:
        print(f"Failed: {e}")

    print("\n=== Re-checking pgvector column ===")
    cursor.execute("""
    SELECT column_name, data_type, udt_schema, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'embeddings'
      AND column_name = 'embedding_data';
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Column: {r[0]}, Type: {r[1]}, UDT Schema: {r[2]}, UDT Name: {r[3]}")
    
    print("\n=== Re-checking extension ===")
    cursor.execute("""
    SELECT extname, extversion, extnamespace::regnamespace AS installed_schema
    FROM pg_extension
    WHERE extname = 'vector';
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Extension: {r[0]}, Version: {r[1]}, Schema: {r[2]}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
