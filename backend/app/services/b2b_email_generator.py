"""
B2B Lead Processing & Email Generation
────────────────────────────────────────
Core logic for processing uploaded B2B leads, building personas,
and generating multi-step email sequences via Groq.
"""
import os
import re
import json
import logging
import csv
import io
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from groq import AsyncGroq
from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are a world-class B2B SDR and Copywriter.
Your goal is to write a multi-step email sequence for a specific buyer persona.

Rules:
1. Tone: Follow the requested tone strictly.
2. Context: Use the persona's job title and the sender's company profile.
3. Structure: 
   - Email 1: Value-based hook.
   - Email 2+: Follow-up touchpoints.
4. Formatting: Keep emails under 120 words.
Return ONLY a JSON object with a 'sequences' array of 'subject' and 'body'.
"""

def build_buyer_personas(leads: List[dict]) -> List[dict]:
    """
    Groups uploaded leads by job title and builds persona profiles.
    """
    title_groups = {}
    for lead in leads:
        # Check various title field names common in CSV exports
        title = (
            lead.get("title") or 
            lead.get("job_title") or 
            lead.get("Position") or 
            "Business Professional"
        ).strip()
        
        if title not in title_groups:
            title_groups[title] = []
        title_groups[title].append(lead)

    personas = []
    for title, group_leads in title_groups.items():
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["ceo", "owner", "founder", "president"]):
            role = "Executive"
        elif any(kw in title_lower for kw in ["cto", "vp eng", "tech", "engineering", "developer"]):
            role = "Technical"
        elif any(kw in title_lower for kw in ["marketing", "growth", "cmo", "demand gen"]):
            role = "Marketing"
        elif any(kw in title_lower for kw in ["sales", "revenue", "biz dev", "account executive"]):
            role = "Sales"
        else:
            role = "Operations"

        personas.append({
            "title": title,
            "role": role,
            "leads": group_leads,
            "count": len(group_leads),
            "primary_goal": f"Optimize {role} performance and drive business ROI",
            "pain_points": ["Scaling manual processes", "Identifying target audience", "Resource constraints"],
            "desired_outcomes": ["Automated growth", "Predictable revenue", "Strategic efficiency"]
        })
    return personas

async def generate_b2b_sequence(
    company_profile: Dict[str, Any],
    persona: Dict[str, Any],
    num_sequences: int = 3,
    tone: str = "professional",
    model: str = "llama-3.1-8b-instant"
) -> List[Dict[str, str]]:
    """
    Generates email sequences using AsyncGroq.
    """
    settings = get_settings()
    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in configuration.")

    client = AsyncGroq(api_key=api_key)
    
    prompt = f"""
    SENDER COMPANY PROFILE:
    Name: {company_profile.get('name')}
    What we sell: {company_profile.get('what_do_you_sell')}
    Key Benefits: {company_profile.get('what_are_the_benefits')}

    TARGET BUYER PERSONA:
    Job Title: {persona['title']}
    Role: {persona['role']}
    Primary Goal: {persona['primary_goal']}
    Pain Points: {', '.join(persona['pain_points'])}

    CAMPAIGN SETTINGS:
    Tone: {tone}
    Number of Steps: {num_sequences}

    Task: Write a {num_sequences}-step email sequence for this persona.
    Return ONLY a JSON object with a 'sequences' array of 'subject' and 'body'.
    """
    try:
        completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content).get("sequences", [])
    except Exception as e:
        logger.error(f"Groq B2B generation failed for {persona['title']}: {e}")
        return []

async def process_uploaded_leads(
    leads: List[dict], 
    profile: dict, 
    tone: str = "professional", 
    steps: int = 3
) -> str:
    """
    Takes a list of raw lead dictionaries (e.g. from an uploaded CSV),
    groups them by persona, generates sequences, and returns a results CSV string.
    """
    # 1. Build Personas from raw lead data
    personas = build_buyer_personas(leads)
    
    # 2. Generate Sequences in parallel for each persona
    tasks = [generate_b2b_sequence(profile, p, steps, tone) for p in personas]
    results = await asyncio.gather(*tasks)
    persona_map = {personas[i]["title"]: results[i] for i in range(len(personas))}

    # 3. Create the Results CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Define common fields to extract from input leads
    common_fields = ["first_name", "last_name", "email", "title", "company", "city", "country"]
    
    # Header: Lead Info + N sequence columns
    header = [f.replace("_", " ").title() for f in common_fields] + ["Persona Role"]
    for i in range(1, steps + 1):
        header.extend([f"Seq {i} Subject", f"Seq {i} Body"])
    writer.writerow(header)

    # Map each lead to its persona sequence
    for p in personas:
        seqs = persona_map.get(p["title"], [])
        for lead in p["leads"]:
            # Build lead info part of the row
            row = [lead.get(f, "") for f in common_fields]
            row.append(p["role"])
            
            # Add sequence steps
            for i in range(steps):
                if i < len(seqs):
                    row.extend([seqs[i]["subject"], seqs[i]["body"]])
                else:
                    row.extend(["", ""])
            writer.writerow(row)
    
    return output.getvalue()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="B2B Lead Outreach Generator")
    parser.add_argument("--file", required=True, help="Path to your uploaded leads CSV")
    parser.add_argument("--tone", default="professional", help="professional, casual, friendly")
    parser.add_argument("--steps", type=int, default=3, help="1-5")
    parser.add_argument("--output", default="b2b_outreach_results.csv", help="Output filename")
    
    args = parser.parse_args()

    # Load leads from local CSV file for testing
    if not os.path.exists(args.file):
        print(f"Error: File {args.file} not found.")
        exit(1)

    with open(args.file, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        test_leads = [row for row in reader]

    # Default company profile for testing
    test_profile = {
        "name": "Nexus Core",
        "what_do_you_sell": "Custom SaaS ERP & AI Solutions",
        "what_are_the_benefits": "Increases operational efficiency by 40% and reduces manual overhead."
    }
    
    print(f"--- Processing {len(test_leads)} leads from {args.file} ---")
    csv_data = asyncio.run(process_uploaded_leads(test_leads, test_profile, args.tone, args.steps))
    
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(csv_data)
    
    print(f"Success! Created {args.output} with personalized sequences.")
