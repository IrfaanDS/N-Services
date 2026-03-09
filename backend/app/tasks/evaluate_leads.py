"""
Celery Task: Evaluate Leads
────────────────────────────
Background task that batch-scores leads using the evaluation model.
Reads seo_audits from Supabase → runs scoring → inserts into lead_scores.
"""
from app.core.celery_app import celery_app


@celery_app.task(bind=True, name="evaluate_leads")
def evaluate_leads_task(self, business_ids: list[str]):
    """
    1. Fetch seo_audits for given business_ids
    2. Run evaluation model (scoring logic TBD)
    3. Insert scores + reasoning into lead_scores table
    4. Return summary
    """
    # TODO: Implement when evaluation model is provided
    return {"evaluated": 0, "status": "placeholder"}
