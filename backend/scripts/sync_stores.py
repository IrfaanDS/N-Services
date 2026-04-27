import asyncio
import os
import certifi
from pymongo import MongoClient
from sqlalchemy import create_engine, text

from app.services.shopify.config import POSTGRES_URL, MONGODB_URI

def get_pg_engine():
    return create_engine(POSTGRES_URL)

def get_mongo_db():
    client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
    return client.get_database("shopify_rag")

def sync_stores():
    print("Connecting to MongoDB...")
    mongo_db = get_mongo_db()
    stores = list(mongo_db["stores"].find({}))
    print(f"Found {len(stores)} stores in MongoDB.")

    print("Connecting to Postgres...")
    pg_engine = get_pg_engine()

    updates = 0
    with pg_engine.begin() as conn:
        for store in stores:
            store_id = store["_id"]
            domain = store.get("store_config", {}).get("domain", "")
            
            if not domain:
                continue
                
            # domain in mongodb often strips https://
            # find matching business in postgres
            query = text("""
                SELECT b.id, s.assistant_created 
                FROM common.businesses b
                LEFT JOIN shopify.stores s ON b.id = s.business_id
                WHERE b.website_url ILIKE :domain_like
            """)
            
            domain_like = f"%{domain}%"
            matches = conn.execute(query, {"domain_like": domain_like}).mappings().all()
            
            for match in matches:
                business_id = match["id"]
                already_created = match["assistant_created"]
                
                if not already_created:
                    update_sql = text("""
                        UPDATE shopify.stores
                        SET assistant_created = TRUE,
                            assistant_created_at = now(),
                            mongo_store_id = :store_id
                        WHERE business_id = :business_id
                    """)
                    conn.execute(update_sql, {"store_id": store_id, "business_id": business_id})
                    updates += 1
                    print(f"Updated Postgres flag for store {store_id} (Business ID: {business_id})")

    print(f"Sync complete. Updated {updates} records in Postgres.")

if __name__ == "__main__":
    sync_stores()
