"""
Store Manager — async MongoDB implementation.

This module provides a MongoDBStoreManager singleton that serves store
data directly from a MongoDB Atlas cluster, and performs API key validation.
"""

import logging
import time
import re
from dataclasses import dataclass, field
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

from .config import DEFAULT_ACTIVITY_MAP, MONGODB_URI, MAX_PRODUCT_MATCHES

# ── Cache TTL ─────────────────────────────────────────────────────────────────
# How long (seconds) to keep a fully-loaded StoreData in memory before
# re-fetching from MongoDB.  5 minutes avoids repeated full-catalog queries
# while still picking up changes reasonably fast.
STORE_DATA_CACHE_TTL = 300  # 5 minutes

logger = logging.getLogger(__name__)



@dataclass
class StoreData:
    """All data for a single store, loaded from DB."""
    store_id: str
    products: list[dict] = field(default_factory=list)
    store_map: dict = field(default_factory=dict)
    store_config: dict = field(default_factory=dict)

    @property
    def brand_name(self) -> str:
        return self.store_config.get("brand_name", self.store_id.title())

    @property
    def domain(self) -> str:
        return self.store_config.get("domain", f"{self.store_id}.com")

    @property
    def tagline(self) -> str:
        return self.store_config.get("tagline", "")

    @property
    def sign_off(self) -> str:
        return self.store_config.get("sign_off", "Happy shopping!")

    @property
    def specialist_title(self) -> str:
        return self.store_config.get("specialist_title", "Shopping Assistant")

    @property
    def avatar_text(self) -> str:
        return self.store_config.get("avatar_text", self.store_id[:2].upper())

    @property
    def activity_map(self) -> dict:
        custom = self.store_config.get("activity_map", {})
        merged = {**DEFAULT_ACTIVITY_MAP, **custom}
        return merged


def _get_default_store_map() -> dict:
    """Fallback store map with generic defaults."""
    return {
        "fabric_guide": {},
        "product_details": {},
        "policies": {
            "Returns": "Please check the store's website for their return policy.",
            "Shipping": "Please check the store's website for shipping information.",
            "Sizing": "Please check individual product pages for details.",
        },
        "brand_info": {
            "mission": "Quality products you'll love.",
            "tagline": "",
            "values": "",
        },
    }


def _enrich_products(products: list[dict], activity_map: dict) -> list[dict]:
    """
    Enrich products with recommended activities based on the activity map.
    """
    if not products:
        return products
        
    # Check if already enriched
    if "activities" in products[0]:
        return products

    for item in products:
        activities = []
        for key, values in activity_map.items():
            if (key.lower() in item.get("product_name", "").lower()
                    or key.lower() in item.get("full_context", "").lower()):
                activities.extend(values)

        if activities:
            unique_activities = list(set(activities))
            activity_str = f" Recommended Activities: {', '.join(unique_activities)}."
            item["full_context"] += activity_str
            item["activities"] = unique_activities

    return products


class MongoDBStoreManager:
    """
    Manages all store data fetching from MongoDB Atlas.
    Provides async methods to fetch store config, authenticate, and
    perform fast DB-level product search.
    """

    def __init__(self):
        if not MONGODB_URI or "://" not in MONGODB_URI:
            logger.warning("⚠️ MONGODB_URI not set or invalid. MongoDB features will be disabled.")
            self.client = None
            self.db = None
            self.stores_collection = None
            self.products_collection = None
        else:
            self.client = AsyncIOMotorClient(MONGODB_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
            self.db = self.client.get_database("shopify_rag")
            self.stores_collection = self.db["stores"]
            self.products_collection = self.db["products"]
        
        # Simple cache to prevent continuous DB queries for config
        # Key: store_id, Value: store_doc
        self._config_cache = {}

        # ── Full StoreData cache  ─────────────────────────────────────────
        # Prevents re-fetching the full product list on every message.
        # Key: store_id → {"data": StoreData, "ts": float}
        self._store_data_cache: dict[str, dict] = {}

        # Flag so we only create indexes once per process lifetime
        self._indexes_ensured = False

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Securely verify the plaintext API key against the bcrypt hash."""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    async def verify_store(self, store_id: str, api_key: str) -> bool:
        """Verify a store's API key. Caches the config doc on success."""
        if not self.stores_collection:
            return False
        store_doc = await self.stores_collection.find_one({"_id": store_id})
        if not store_doc:
            store_doc = await self.stores_collection.find_one({"username": store_id})
            if not store_doc:
                return False
                
        actual_store_id = store_doc["_id"]
        
        if not self._verify_password(api_key, store_doc["api_key_hash"]):
            return False
            
        self._config_cache[actual_store_id] = store_doc
        return True

    # ── Index Initialization ────────────────────────────────────────────────────

    async def ensure_indexes(self):
        """
        Create MongoDB text index on the products collection.
        Weights product_name higher than full_context for relevance.
        Idempotent — MongoDB ignores if already exists.
        """
        if self._indexes_ensured or not self.products_collection:
            return
        try:
            await self.products_collection.create_index(
                [
                    ("product_name", "text"),
                    ("full_context", "text"),
                ],
                weights={"product_name": 10, "full_context": 1},
                name="product_text_search",
                default_language="english",
            )
            # Also ensure a standard index on store_id for fast filtering
            await self.products_collection.create_index("store_id")
            self._indexes_ensured = True
            logger.info("✅ MongoDB text index ensured on products collection.")
        except Exception as e:
            logger.warning(f"⚠️ Could not create text index (may already exist): {e}")
            self._indexes_ensured = True  # don't retry every request

    # ── DB-Level Product Search ────────────────────────────────────────────────

    async def search_products(
        self, store_id: str, query: str, limit: int = None
    ) -> list[dict]:
        """
        Search products for a store using MongoDB $text search.
        Returns up to `limit` products sorted by text relevance score.
        Falls back to a regex scan if $text returns nothing (handles
        partial / single-word queries that text indexes sometimes miss).
        """
        limit = limit or MAX_PRODUCT_MATCHES
        await self.ensure_indexes()
        if not self.products_collection:
            return []

        # ── Primary: $text search (fast, uses the Lucene-style index) ─────
        try:
            cursor = self.products_collection.find(
                {"store_id": store_id, "$text": {"$search": query}},
                {"score": {"$meta": "textScore"}},
            ).sort([("score", {"$meta": "textScore"})]).limit(limit * 3)  # over-fetch for dedup

            raw = await cursor.to_list(length=limit * 3)
        except Exception as e:
            logger.warning(f"Text search failed, falling back to regex: {e}")
            raw = []

        # ── Fallback: regex-based scan (catches partial words, typos) ─────
        if not raw:
            words = query.split()
            if words:
                # Build an $or regex pattern for each significant word
                regex_clauses = []
                for w in words:
                    if len(w) >= 3:  # skip tiny words like "a", "to"
                        pattern = {"$regex": re.escape(w), "$options": "i"}
                        regex_clauses.append({"product_name": pattern})
                        regex_clauses.append({"full_context": pattern})
                if regex_clauses:
                    cursor = self.products_collection.find(
                        {"store_id": store_id, "$or": regex_clauses}
                    ).limit(limit * 3)
                    raw = await cursor.to_list(length=limit * 3)

        # ── De-duplicate by product_name ──────────────────────────────────
        seen_names: set[str] = set()
        unique: list[dict] = []
        for p in raw:
            p_name = p.get("product_name", "")
            if p_name not in seen_names:
                seen_names.add(p_name)
                unique.append(p)
            if len(unique) >= limit:
                break

        return unique

    # ── Full Store Loader (cached) ────────────────────────────────────────────

    async def get_store(self, store_id: str) -> StoreData | None:
        """
        Get a loaded store by ID.
        Uses an in-memory TTL cache to avoid repeated full DB loads.
        NOTE: Product search now goes through search_products();
        this method still loads the store config + metadata.
        """
        # 1. Validation
        if store_id not in self._config_cache:
            if not self.stores_collection:
                return None
            store_doc = await self.stores_collection.find_one({"_id": store_id})
            if not store_doc:
                return None
            self._config_cache[store_id] = store_doc

        store_doc = self._config_cache[store_id]
        actual_store_id = store_doc["_id"]

        # 2. Check the store data cache
        cached = self._store_data_cache.get(actual_store_id)
        if cached and (time.time() - cached["ts"]) < STORE_DATA_CACHE_TTL:
            return cached["data"]

        # 3. Cache miss — build StoreData (products loaded lazily via search_products)
        store_config = store_doc.get("store_config", {})
        store_map = store_doc.get("store_map", _get_default_store_map())

        store_data = StoreData(
            store_id=actual_store_id,
            products=[],  # products are now fetched via search_products(), not bulk-loaded
            store_map=store_map,
            store_config=store_config,
        )

        # Cache it
        self._store_data_cache[actual_store_id] = {
            "data": store_data,
            "ts": time.time(),
        }
        return store_data

    async def get_store_config_only(self, store_id: str) -> dict | None:
        """Faster path for just getting the UI config."""
        if store_id not in self._config_cache:
            store_doc = await self.stores_collection.find_one({"_id": store_id})
            if not store_doc:
                return None
            self._config_cache[store_id] = store_doc
                
        store_doc = self._config_cache[store_id]
        
        config = store_doc.get("store_config", {}).copy()
        config.setdefault("store_id", store_doc["_id"])
        config.setdefault("brand_name", store_doc.get("username"))
        config.setdefault("domain", config.get("domain", f"{store_id}.com"))
        config.setdefault("tagline", config.get("tagline", ""))
        config.setdefault("primary_color", "#1a1a1a")
        config.setdefault("accent_color", "#e85d3a")
        config.setdefault("avatar_text", store_doc.get("username", store_id)[:2].upper())
        config.setdefault("suggestions", [
            {"label": "🛍️ Browse products", "query": "What products do you have?"},
            {"label": "📦 Return policy", "query": "What is your return policy?"},
            {"label": "🚚 Shipping info", "query": "How does shipping work?"},
        ])
        
        return config

    # ── Admin Methods ─────────────────────────────────────────────────────────────
    
    async def list_stores(self, skip: int = 0, limit: int = 20) -> tuple[list[dict], int]:
        """List stores with pagination for admin dashboard."""
        cursor = self.stores_collection.find({}, {"api_key_hash": 0}).skip(skip).limit(limit)
        stores = await cursor.to_list(length=limit)
        total = await self.stores_collection.count_documents({})
        return stores, total

    async def list_stores_with_keys(self, skip: int = 0, limit: int = 20) -> tuple[list[dict], int]:
        """List stores with their plaintext API keys for admin dashboard."""
        # 1. Get stores
        stores, total = await self.list_stores(skip, limit)
        
        # 2. Get plaintext keys
        admin_keys_col = self.db["admin_keys"]
        store_ids = [s["_id"] for s in stores]
        keys_cursor = admin_keys_col.find({"_id": {"$in": store_ids}})
        keys_list = await keys_cursor.to_list(length=len(store_ids))
        
        keys_map = {k["_id"]: k["api_key"] for k in keys_list}
        
        # 3. Merge
        for s in stores:
            s["api_key"] = keys_map.get(s["_id"], "N/A (Generate new)")
            
        return stores, total


    async def delete_store(self, store_id: str) -> bool:
        """Completely remove a store and its products."""
        # 1. Delete products
        await self.products_collection.delete_many({"store_id": store_id})
        # 2. Delete store config
        res = await self.stores_collection.delete_one({"_id": store_id})
        # 3. Clear caches
        if store_id in self._config_cache:
            del self._config_cache[store_id]
        if store_id in self._store_data_cache:
            del self._store_data_cache[store_id]
        return res.deleted_count > 0

    def get_store_count(self) -> int:
        return len(self._config_cache)

