import psycopg2

conn = psycopg2.connect('postgresql://postgres.upznpmiatzymsdryahtz:n-Srvcs%40dbconn@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
sql = """
create or replace function public.check_if_email_exists(email_to_check text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from auth.users
    where email = email_to_check
  );
end;
$$;
"""
cur.execute(sql)
conn.commit()
print("RPC Function created successfully.")
