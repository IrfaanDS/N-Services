"""
Onboarding Service — core logic for scraping and saving stores.
Used by both the CLI and the API.
"""

import json
import os
import re
import secrets
import bcrypt
import certifi
import time
from collections import Counter
from typing import Optional

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient

# Fallback Activity Map
DEFAULT_ACTIVITY_MAP = {
    "Legging": ["Yoga", "Gym", "Running", "Everyday"],
    "Jogger": ["Lounge", "Travel", "Casual", "Gym"],
    "Short": ["Running", "Gym", "Training", "Summer"],
    "Tank": ["Gym", "Yoga", "Running", "Layering"],
    "Bra": ["Gym", "Yoga", "Running", "Training"],
    "Hoodie": ["Layering", "Cold Weather", "Lounge", "Casual"],
    "Jacket": ["Outdoor", "Layering", "Running", "Cold Weather"],
    "Dress": ["Tennis", "Everyday", "Active", "Errands"],
    "Tee": ["Everyday", "Gym", "Casual", "Layering"],
    "T-Shirt": ["Everyday", "Gym", "Casual", "Layering"],
    "Fleece": ["Layering", "Cold Weather", "Hiking", "Cozy"],
    "Pant": ["Everyday", "Casual", "Travel", "Lounge"],
    "Crop": ["Gym", "Yoga", "Training", "Summer"],
    "Sweatshirt": ["Lounge", "Casual", "Cold Weather", "Layering"],
    "Sock": ["Running", "Training", "Everyday", "Gym"],
    "Hat": ["Outdoor", "Running", "Sun Protection", "Casual"],
    "Cap": ["Outdoor", "Running", "Sun Protection", "Casual"],
    "Shoe": ["Running", "Walking", "Training", "Everyday"],
    "Sneaker": ["Running", "Walking", "Training", "Everyday"],
    "Swimsuit": ["Swimming", "Beach", "Water Sports"],
    "Bikini": ["Swimming", "Beach", "Water Sports"],
    "Polo": ["Golf", "Casual", "Everyday"],
    "Vest": ["Layering", "Outdoor", "Cold Weather"],
    "Skirt": ["Tennis", "Everyday", "Active"],
    "Sweater": ["Layering", "Casual", "Cold Weather", "Lounge"],
}

CATEGORY_EMOJI = {
    "Legging": "🧘", "Jogger": "🏃", "Short": "🩳", "Tank": "💪",
    "Bra": "🏋️", "Hoodie": "🧥", "Jacket": "🧥", "Dress": "👗",
    "Tee": "👕", "T-Shirt": "👕", "Fleece": "🧣", "Pant": "👖",
    "Shoe": "👟", "Sneaker": "👟", "Swimsuit": "🩱", "Sweater": "🧶",
    "Hat": "🧢", "Cap": "🧢", "Skirt": "💃", "Sock": "🧦",
    "Polo": "⛳", "Vest": "🦺", "Crop": "✂️", "Sweatshirt": "😊",
    "Bikini": "👙",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Standard Shopify policy slugs
POLICY_PAGE_SLUGS = [
    ("policies/refund-policy", "Returns"),
    ("policies/shipping-policy", "Shipping"),
    ("policies/privacy-policy", "Privacy"),
    ("policies/terms-of-service", "Terms"),
    ("pages/return-policy", "Returns"),
    ("pages/returns", "Returns"),
    ("pages/shipping", "Shipping"),
    ("pages/shipping-policy", "Shipping"),
    ("pages/sizing", "Sizing"),
    ("pages/size-guide", "Sizing"),
    ("pages/faq", "FAQ"),
    ("pages/about", "About"),
    ("pages/about-us", "About"),
]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def sanitize_store_id(domain: str) -> str:
    name = domain.lower().replace("www.", "").replace("https://", "").replace("http://", "").split(".")[0]
    name = re.sub(r"[^a-z0-9]", "_", name)
    return name.strip("_")

def generate_avatar_text(brand_name: str) -> str:
    """Generate 2-letter avatar text from brand name."""
    words = brand_name.strip().split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    elif len(words) == 1 and len(words[0]) >= 2:
        return words[0][:2].upper()
    return "AI"

def scrape_products(domain: str) -> list[dict]:
    """Scrape all products from a Shopify store's /products.json endpoint."""
    all_products = []
    page = 1
    base_url = f"https://{domain}"

    while True:
        url = f"{base_url}/products.json?page={page}&limit=250"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
        except requests.exceptions.RequestException:
            raise Exception("DOMAIN_UNREACHABLE")

        if resp.status_code == 404:
            raise Exception("NOT_A_SHOPIFY_STORE")
        if resp.status_code == 401: return []
        if resp.status_code in (429, 430):
            time.sleep(5)
            continue
        if resp.status_code != 200: break
        
        try:
            data = resp.json()
        except ValueError:
            raise Exception("NOT_A_SHOPIFY_STORE")
            
        products = data.get("products", [])
        if not products: break
        
        all_products.extend(products)
        page += 1
        time.sleep(1.0) # Be nice
    return all_products

def scrape_policies(domain: str) -> dict:
    """Best-effort scrape of store policies from common Shopify page URLs."""
    policies = {}
    base_url = f"https://{domain}"
    for slug, policy_name in POLICY_PAGE_SLUGS:
        if policy_name in policies: continue
        url = f"{base_url}/{slug}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 200: continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            content = None
            for selector in ["main", ".shopify-policy__body", ".rte", "article", ".page-content", "#MainContent"]:
                content = soup.select_one(selector)
                if content: break
            if not content: content = soup.body
            if content:
                text = content.get_text(separator=" ", strip=True)
                text = re.sub(r'\s+', ' ', text).strip()
                if len(text) > 50:
                    policies[policy_name] = text[:800]
        except: continue
        time.sleep(0.5)
    return policies

def scrape_about_page(domain: str) -> dict:
    """Try to scrape brand mission from common about page slugs."""
    brand_info = {}
    base_url = f"https://{domain}"
    for slug in ["pages/about", "pages/about-us", "pages/our-story"]:
        url = f"{base_url}/{slug}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 200: continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            content = soup.select_one("main") or soup.select_one("article") or soup.select_one(".rte")
            if content:
                text = content.get_text(separator=" ", strip=True)
                text = re.sub(r'\s+', ' ', text).strip()
                if len(text) > 50:
                    brand_info["mission"] = text[:500]
                    break
        except: continue
    return brand_info

def format_products(raw_products: list[dict], domain: str) -> list[dict]:
    """Transform raw Shopify JSON into flat variant list for RAG."""
    structured = []
    base_url = f"https://{domain}"
    for p in raw_products:
        # Strip HTML from description
        body_html = p.get("body_html", "") or ""
        soup = BeautifulSoup(body_html, "html.parser")
        desc = soup.get_text(separator=" ", strip=True)
        
        # Build context string
        ctx = (
            f"Product: {p.get('title', 'Unknown')}. "
            f"Category: {p.get('product_type', 'General')}. "
            f"Tags: {', '.join(p.get('tags', []))}. "
            f"Description: {desc[:300]}..."
        )
        
        for v in p.get("variants", []):
            structured.append({
                "id": str(v["id"]),
                "product_name": p["title"],
                "full_context": f"{ctx} Variant: {v['title']}. Price: ${v.get('price', '0.00')}.",
                "url": f"{base_url}/products/{p['handle']}?variant={v['id']}",
                "image": p["images"][0]["src"] if p.get("images") else "",
                "activities": [] # To be populated by enricher
            })
    return structured

def enrich_products(products: list[dict]):
    for p in products:
        acts = []
        for k, v in DEFAULT_ACTIVITY_MAP.items():
            if k.lower() in p["product_name"].lower() or k.lower() in p["full_context"].lower():
                acts.extend(v)
        if acts:
            p["activities"] = list(set(acts))
            p["full_context"] += f" Recommended Activities: {', '.join(p['activities'])}."

def generate_suggestions(products: list[dict], brand_name: str) -> list[dict]:
    """
    Auto-generate smart suggestion chips based on product categories.
    Picks the top categories from the catalog and creates relevant queries.
    """
    # Count product types
    type_counter = Counter()
    for p in products:
        ctx = p.get("full_context", "")
        cat_match = re.search(r"Category:\s*([^.]+)\.", ctx)
        if cat_match:
            ptype = cat_match.group(1).strip()
            if ptype: type_counter[ptype] += 1

    suggestions = []
    # Top categories -> suggestion chips
    for category, count in type_counter.most_common(3):
        if count >= 2:
            emoji = "🛍️"
            cat_lower = category.lower()
            for key, e in CATEGORY_EMOJI.items():
                if key.lower() in cat_lower:
                    emoji = e
                    break
            suggestions.append({
                "label": f"{emoji} {category}",
                "query": f"Show me your {category.lower()}"
            })

    # Always add basic ones if space remains
    if len(suggestions) < 5:
        suggestions.append({"label": "📦 Return policy", "query": "What is your return policy?"})
    if len(suggestions) < 5:
        suggestions.append({"label": "🚚 Shipping info", "query": "How does shipping work?"})
        
    return suggestions[:5]

async def onboard_new_store(domain: str, brand_name: Optional[str] = None):
    """Business logic for onboarding a store with robust scraping."""
    domain = domain.replace("https://", "").replace("http://", "").rstrip("/")
    store_id = sanitize_store_id(domain)
    brand_name = brand_name or store_id.replace("_", " ").title()
    
    # 0. Duplicate Check
    from .config import MONGODB_URI
    try:
        client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
        db = client.get_database("shopify_rag")
        existing_store = db["stores"].find_one({"_id": store_id})
        if existing_store:
            return {"store_id": store_id, "brand_name": existing_store.get("username", brand_name)}, "STORE_ALREADY_EXISTS"
    except Exception as e:
        return None, f"Database error: {str(e)}"

    # 1. Scrape Products
    try:
        raw = scrape_products(domain)
        if not raw:
            return None, "NO_PRODUCTS_FOUND"
    except Exception as e:
        err_str = str(e)
        if err_str in ["DOMAIN_UNREACHABLE", "NOT_A_SHOPIFY_STORE"]:
            return None, err_str
        return None, "NO_PRODUCTS_FOUND"
    
    # 2. Scrape Store Info (Policies & About)
    scraped_policies = scrape_policies(domain)
    scraped_about = scrape_about_page(domain)
    
    # 3. Process Products
    formatted = format_products(raw, domain)
    enrich_products(formatted)
    
    # 4. Generate Suggestions & UI Config
    suggestions = generate_suggestions(formatted, brand_name)
    avatar_text = generate_avatar_text(brand_name)
    
    # 5. Prepare DB Data
    api_key = secrets.token_urlsafe(32)
    api_key_hash = hash_password(api_key)
    
    store_config = {
        "store_id": store_id,
        "brand_name": brand_name,
        "domain": domain,
        "tagline": "",
        "primary_color": "#1a1a1a",
        "accent_color": "#e85d3a",
        "avatar_text": avatar_text,
        "suggestions": suggestions
    }
    
    # Construct robust store_map
    store_map = {
        "policies": {
            "Returns": scraped_policies.get("Returns", "Please check the store's website for their return policy."),
            "Shipping": scraped_policies.get("Shipping", "Please check the store's website for shipping information."),
            "Sizing": scraped_policies.get("Sizing", "Please check individual product pages for sizing details."),
        },
        "brand_info": {
            "mission": scraped_about.get("mission", f"{brand_name} is a quality Shopify store."),
            "tagline": "",
            "values": "",
        },
        "fabric_guide": {} # Placeholder for custom expansion
    }
    
    # Add any other scraped policies
    for p_name, p_text in scraped_policies.items():
        if p_name not in store_map["policies"]:
            store_map["policies"][p_name] = p_text

    # 6. Save to MongoDB
    from .config import MONGODB_URI
    try:
        client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
        db = client.get_database("shopify_rag")
        
        # Save store doc
        db["stores"].replace_one({"_id": store_id}, {
            "_id": store_id,
            "username": brand_name,
            "api_key_hash": api_key_hash,
            "store_config": store_config,
            "store_map": store_map
        }, upsert=True)
        
        # Store plaintext key for admin visibility
        db["admin_keys"].replace_one({"_id": store_id}, {
            "_id": store_id,
            "api_key": api_key,
            "username": brand_name
        }, upsert=True)
        
        # Save products (clear existing first)
        db["products"].delete_many({"store_id": store_id})
        if formatted:
            for p in formatted: p["store_id"] = store_id
            # Batch insert for performance
            batch_size = 1000
            for i in range(0, len(formatted), batch_size):
                db["products"].insert_many(formatted[i:i+batch_size])
                
        return {"store_id": store_id, "api_key": api_key, "brand_name": brand_name}, None
    except Exception as e:
        return None, f"Database error: {str(e)}"
