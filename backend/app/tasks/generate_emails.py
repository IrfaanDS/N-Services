from app.core.celery_app import celery_app
from app.services.seo_emails import process_batch_seo_emails


@celery_app.task(bind=True, name="generate_emails")
def generate_emails_task(self, business_ids: list[str]):
    """
    1. Fetch businesses + seo_audits for given IDs
    2. Run email generation script
    3. Store generated subjects + bodies (logic handled in service or here)
    4. Return summary
    """
    generated = process_batch_seo_emails(business_ids)
    
    # In a real app, we might save these to a database table like 'generated_emails'
    # For now, we return the results which Celery can store in its backend.
    
    return {
        "generated_count": len(generated),
        "data": generated,
        "status": "completed"
    }
