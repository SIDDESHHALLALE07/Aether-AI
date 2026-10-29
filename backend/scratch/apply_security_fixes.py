import psycopg2

DATABASE_URL = "postgresql://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    print("=== Revoking execution on rls_auto_enable ===")
    try:
        cursor.execute("REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;")
        cursor.execute("REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;")
        cursor.execute("REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;")
        print("Success: Privileges revoked.")
    except Exception as e:
        print(f"Failed to revoke privileges: {e}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
