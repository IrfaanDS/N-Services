"""
Common Agent Tools
──────────────────
Tools shared across all domain agents: inbox reading and email critique.
"""
import json
import logging
from typing import Optional
from langchain_core.tools import tool

from app.api.deps import get_supabase

logger = logging.getLogger(__name__)


@tool
def read_inbox(limit: int = 20, account_id: Optional[str] = None) -> str:
    """Read the latest email threads from the Onebox unified inbox.
    Returns a summary of recent email threads with subject, sender, and date.
    Use this when the user asks about replies, inbox status, or email engagement.

    Args:
        limit: Maximum number of threads to return (default 20).
        account_id: Optional specific sending account ID to filter by.
    """
    try:
        from app.api.routes.onebox import fetch_imap_emails
        supabase = get_supabase()

        query = supabase.schema("outreach").table("b2b_sending_accounts").select("*")
        if account_id:
            query = query.eq("id", account_id)
        res = query.execute()
        accounts = res.data or []

        if not accounts:
            return json.dumps({"threads": [], "message": "No email accounts configured."})

        all_threads = []
        for acc in accounts:
            try:
                threads = fetch_imap_emails(acc, limit, 0, "Inbox")
                all_threads.extend(threads)
            except Exception as e:
                logger.warning(f"Failed to fetch from account {acc.get('name')}: {e}")

        # Return a concise summary
        summary = []
        for t in all_threads[:limit]:
            summary.append({
                "id": t.get("id"),
                "subject": t.get("subject", "(no subject)"),
                "from": t.get("fromName", t.get("fromEmail", "")),
                "date": t.get("sentAt", ""),
            })

        return json.dumps({"threads": summary, "total": len(all_threads)})
    except Exception as e:
        logger.error(f"read_inbox tool error: {e}")
        return json.dumps({"error": str(e)})


@tool
def read_email_thread(thread_id: str) -> str:
    """Get the full body/content of a specific email thread.
    Use this when the user wants to read a specific email conversation.

    Args:
        thread_id: The thread ID in format "account_id:mailbox:msg_uid".
    """
    try:
        import asyncio
        from app.api.routes.onebox import fetch_imap_thread
        supabase = get_supabase()

        parts = thread_id.split(":")
        if len(parts) < 2:
            return json.dumps({"error": "Invalid thread ID format"})

        acc_id = parts[0]
        if len(parts) == 3:
            mailbox = parts[1]
            msg_uid = parts[2]
        else:
            mailbox = "INBOX"
            msg_uid = parts[1]

        res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").eq("id", acc_id).execute()
        if not res.data:
            return json.dumps({"error": "Account not found"})

        account = res.data[0]
        messages = fetch_imap_thread(account, mailbox, msg_uid)

        if not messages:
            return json.dumps({"error": "Thread not found or empty"})

        # Return a cleaned version
        result = []
        for msg in messages:
            result.append({
                "from": msg.get("fromEmail", ""),
                "to": msg.get("toEmail", ""),
                "subject": msg.get("subject", ""),
                "date": msg.get("sentAt", ""),
                "body": msg.get("body", "")[:2000],  # Truncate very long emails
            })

        return json.dumps({"messages": result})
    except Exception as e:
        logger.error(f"read_email_thread tool error: {e}")
        return json.dumps({"error": str(e)})


@tool
def critique_email(subject: str, body: str, context: str = "") -> str:
    """Evaluate an email draft for quality: tone, personalization, length, CTA clarity, and spam risk.
    Returns a structured critique with improvement suggestions.
    Use this when the user asks you to review, critique, or improve an email draft.

    Args:
        subject: The email subject line.
        body: The email body text.
        context: Optional context about the recipient or campaign.
    """
    from app.agents.prompts import EMAIL_CRITIQUE_PROMPT
    from groq import Groq
    from app.core.config import get_settings

    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    prompt = EMAIL_CRITIQUE_PROMPT.format(
        subject=subject,
        body=body,
        context=context or "General B2B/SEO outreach email"
    )

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1000,
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"critique_email tool error: {e}")
        return f"Error critiquing email: {str(e)}"
