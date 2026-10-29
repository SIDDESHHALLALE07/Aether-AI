import psycopg2
import os

DATABASE_URL = "postgresql://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=== STEP 1: rls_auto_enable definition ===")
    cursor.execute("""
    SELECT
        n.nspname AS schema_name,
        p.proname AS function_name,
        pg_get_function_identity_arguments(p.oid) AS arguments,
        pg_get_function_result(p.oid) AS return_type,
        p.prosecdef AS security_definer,
        pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable';
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Schema: {r[0]}")
        print(f"Function: {r[1]}")
        print(f"Args: {r[2]}")
        print(f"Returns: {r[3]}")
        print(f"Security Definer: {r[4]}")
        print(f"Definition:\n{r[5]}")

    print("\n=== STEP 2: rls_auto_enable privileges ===")
    cursor.execute("""
    SELECT grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'rls_auto_enable';
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Grantee: {r[0]}, Privilege: {r[1]}")

    print("\n=== STEP 5: pgvector extension ===")
    cursor.execute("""
    SELECT extname, extversion, extnamespace::regnamespace AS installed_schema
    FROM pg_extension
    WHERE extname = 'vector';
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"Extension: {r[0]}, Version: {r[1]}, Schema: {r[2]}")

    print("\n=== STEP 6: pgvector column ===")
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

    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
