"""
Celery Task: Send Emails
─────────────────────────
Background task that sends email sequences via ReachInbox API.
Updates outreach_history and campaign_leads status.
"""
from app.core.celery_app import celery_app


@celery_app.task(bind=True, name="send_emails")
def send_emails_task(self, campaign_id: str):
    """
    1. Fetch campaign + campaign_leads + generated emails
    2. Create sending sequence in ReachInbox
    3. Dispatch emails via ReachInbox API
    4. Update outreach_history (email_sent = true)
    5. Update campaign_leads status
    """
    # TODO: Implement when ReachInbox API docs are provided
    return {"sent": 0, "campaign_id": campaign_id, "status": "placeholder"}
