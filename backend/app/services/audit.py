"""
SEO Audit Service
─────────────────
Crawls a given URL and extracts expert SEO metrics.
Returns a dictionary of technical findings for the RAG agent.
"""
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


def perform_audit(url: str) -> dict:
    """
    Crawls a given URL and extracts Expert SEO Metrics.
    Returns a dictionary of technical findings.
    """
    print(f"DEBUG: Internal tool is crawling {url}...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; SEO-Auditor-Agent/1.0)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return {"error": f"Failed to fetch URL: {str(e)}"}

    soup = BeautifulSoup(response.content, 'html.parser')
    parsed_url = urlparse(url)
    base_domain = parsed_url.netloc

    # 1. Metadata
    title_tag = soup.find('title')
    title_text = title_tag.text.strip() if title_tag else ""
    title_length = len(title_text)

    meta_desc_tag = soup.find('meta', attrs={'name': 'description'})
    meta_desc = meta_desc_tag['content'].strip() if meta_desc_tag and meta_desc_tag.has_attr('content') else None

    canonical_tag = soup.find('link', rel='canonical')
    canonical_url = canonical_tag['href'] if canonical_tag and canonical_tag.has_attr('href') else None

    # 2. Hierarchy
    h1_tags = [h.text.strip() for h in soup.find_all('h1')]
    h2_tags = [h.text.strip() for h in soup.find_all('h2')]
    h3_tags = [h.text.strip() for h in soup.find_all('h3')]

    # 3. Asset Audit
    images = soup.find_all('img')
    total_images = len(images)
    missing_alt_images = 0
    missing_alt_sources = []
    for img in images:
        if not img.has_attr('alt') or not img['alt'].strip():
            missing_alt_images += 1
            src = img.get('src', 'unknown_source')
            if src not in missing_alt_sources:
                missing_alt_sources.append(src)

    # 4. Link Profile
    links = soup.find_all('a')
    internal_links = 0
    external_links = 0
    for link in links:
        href = link.get('href')
        if not href or href.startswith(('javascript:', 'mailto:', 'tel:', '#')):
            continue
        link_domain = urlparse(href).netloc
        if not link_domain or link_domain == base_domain:
            internal_links += 1
        else:
            external_links += 1

    # 5. Technical Markers (JSON-LD)
    json_ld_scripts = soup.find_all('script', type='application/ld+json')
    has_structured_data = len(json_ld_scripts) > 0

    return {
        "url": url,
        "metadata": {
            "title": title_text,
            "title_length": title_length,
            "has_meta_description": bool(meta_desc),
            "canonical_url": canonical_url
        },
        "hierarchy": {
            "h1_count": len(h1_tags),
            "h1_content": h1_tags,
            "h2_count": len(h2_tags),
            "h3_count": len(h3_tags)
        },
        "assets": {
            "total_images": total_images,
            "images_missing_alt": missing_alt_images,
            "missing_alt_sources": missing_alt_sources[:5]
        },
        "links": {
            "internal_links": internal_links,
            "external_links": external_links
        },
        "technical_markers": {
            "has_json_ld_structured_data": has_structured_data,
            "json_ld_count": len(json_ld_scripts)
        }
    }
