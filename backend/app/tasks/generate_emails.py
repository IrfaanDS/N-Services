"""
Celery Task: Generate Emails
─────────────────────────────
Background task that generates personalized SEO outreach emails.
Uses seo_audits data to craft relevant, personalized content.
"""
from app.core.celery_app import celery_app


@celery_app.task(bind=True, name="generate_emails")
def generate_emails_task(self, business_ids: list[str]):
    """
    1. Fetch businesses + seo_audits for given IDs
    2. Run email generation script (TBD)
    3. Store generated subjects + bodies
    4. Return summary
    """
    # TODO: Implement when email generation script is provided
    return {"generated": 0, "status": "placeholder"}
