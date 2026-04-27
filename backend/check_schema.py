import asyncio
from app.api.deps import get_supabase

async def check():
    supabase = get_supabase()
    res = supabase.table("businesses").select("*").limit(1).execute()
    print("PUBLIC businesses:", res.data[0].keys() if res.data else "Empty")
    
    try:
        res2 = supabase.schema("common").table("businesses").select("*").limit(1).execute()
        print("COMMON businesses:", res2.data[0].keys() if res2.data else "Empty")
    except Exception as e:
        print("COMMON businesses error:", e)

if __name__ == "__main__":
    asyncio.run(check())
