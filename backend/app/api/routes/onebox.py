"""
Onebox Routes (Custom IMAP Integration)
─────────────────────────────────────────────
Manage email threads, reply to leads, and sync messages
via custom IMAP server.
"""
import imaplib
import email
import logging
import json
import os
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

ACCOUNTS_FILE = os.path.join(os.path.dirname(__file__), "accounts.json")

def load_accounts():
    if os.path.exists(ACCOUNTS_FILE):
        with open(ACCOUNTS_FILE, "r") as f:
            return json.load(f)
    return []

# ── Routes ──

@router.get("/list")
async def list_onebox_emails(
    limit: int = 50,
    offset: int = 0,
    status: str = "All",
    inbox: str = "Inbox",
    q: str = ""
):
    """
    Retrieve a list of email threads from the IMAP Server.
    """
    accounts = load_accounts()
    if not accounts:
        return {"data": []}

    account = accounts[0] # Just use the first one for the global inbox view
    threads = []
    
    try:
        # We will wrap the IMAP blocking call
        loop = asyncio.get_event_loop()
        threads = await loop.run_in_executor(None, fetch_imap_emails, account, limit, offset, inbox)
        return {"data": threads}
    except Exception as e:
        logger.error(f"Failed to fetch from IMAP: {e}")
        return {"data": []}

def fetch_imap_emails(account, limit, offset, mailbox):
    if not account.get("imap_host"):
        return []
        
    try:
        mail = imaplib.IMAP4_SSL(account["imap_host"])
        mail.login(account["imap_user"], account["imap_pass"])
        mail.select(mailbox)
        
        status, response = mail.search(None, 'ALL')
        if status != 'OK':
            return []
            
        messages = response[0].split()
        if not messages:
            return []
            
        # Reverse to get newest first
        messages = messages[::-1]
        
        results = []
        # Support pagination manually
        start = offset
        end = min(offset + limit, len(messages))
        
        for i in range(start, end):
            try:
                msg_id = messages[i]
                typ, msg_data = mail.fetch(msg_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)] RFC822.SIZE)')
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        subject = decode_header_safe(msg["Subject"])
                        from_header = decode_header_safe(msg.get("From", ""))
                        date_str = msg.get("Date", "")
                        
                        results.append({
                            "id": msg_id.decode(),
                            "threadId": msg_id.decode(),
                            "subject": subject,
                            "fromEmail": from_header,
                            "fromName": from_header.split("<")[0].strip() if "<" in from_header else from_header,
                            "sentAt": date_str,
                            "isRead": True,
                            "body": "Click to view message", # Only loading headers for list
                        })
            except Exception as e:
                logger.error(f"Error parsing msg {msg_id}: {e}")
                
        mail.close()
        mail.logout()
        return results
    except Exception as e:
        logger.error(f"IMAP Error: {e}")
        return []

def decode_header_safe(header_val):
    if not header_val:
        return ""
    from email.header import decode_header
    decoded_list = decode_header(header_val)
    result = ""
    for decoded_string, charset in decoded_list:
        if isinstance(decoded_string, bytes):
            if charset:
                try:
                    result += decoded_string.decode(charset)
                except:
                    result += decoded_string.decode('utf-8', errors='ignore')
            else:
                result += decoded_string.decode('utf-8', errors='ignore')
        else:
             result += decoded_string
    return result

@router.get("/thread/{thread_id}")
async def get_onebox_thread(thread_id: str):
    """
    Retrieve specific thread details via IMAP.
    """
    accounts = load_accounts()
    if not accounts:
        return {"data": []}
    account = accounts[0]
    
    try:
        loop = asyncio.get_event_loop()
        messages = await loop.run_in_executor(None, fetch_imap_thread, account, thread_id)
        return {"data": messages}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

def fetch_imap_thread(account, thread_id):
    try:
        mail = imaplib.IMAP4_SSL(account["imap_host"])
        mail.login(account["imap_user"], account["imap_pass"])
        mail.select("Inbox")
        
        typ, msg_data = mail.fetch(thread_id.encode(), '(RFC822)')
        
        results = []
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                subject = decode_header_safe(msg["Subject"])
                from_header = decode_header_safe(msg.get("From", ""))
                to_header = decode_header_safe(msg.get("To", ""))
                date_str = msg.get("Date", "")
                
                body = get_body(msg)
                
                results.append({
                    "id": thread_id,
                    "messageId": thread_id,
                    "subject": subject,
                    "fromEmail": from_header,
                    "toEmail": to_header,
                    "sentAt": date_str,
                    "body": body,
                    "account": account["name"]
                })
                
        mail.close()
        mail.logout()
        return results
    except Exception as e:
        logger.error(f"IMAP Thread Error: {e}")
        return []

def get_body(msg):
    # Simplistic body extractor
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdispo = str(part.get('Content-Disposition'))
            if ctype == 'text/html' and 'attachment' not in cdispo:
                return part.get_payload(decode=True).decode('utf-8', errors='ignore')
            elif ctype == 'text/plain' and 'attachment' not in cdispo:
                return part.get_payload(decode=True).decode('utf-8', errors='ignore').replace('\n', '<br/>')
    else:
        content = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        if msg.get_content_type() == 'text/plain':
             content = content.replace('\n', '<br/>')
        return content
    return "No compatible content found"

@router.post("/reply/{thread_id}")
async def send_reply(
    thread_id: str,
    emaildata: str = Form(...),
    file: List[UploadFile] = File(None) 
):
    """
    Send a reply to a thread using SMTP.
    """
    try:
        data = json.loads(emaildata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in 'emaildata'")

    accounts = load_accounts()
    if not accounts:
        raise HTTPException(status_code=500, detail="No accounts configured")
    account = accounts[0]

    from email.message import EmailMessage
    import smtplib

    msg = EmailMessage()
    msg.set_content(data.get("body", ""))
    msg["Subject"] = data.get("subject", "")
    msg["From"] = f"{account['name']} <{account['smtp_user']}>"
    msg["To"] = data.get("to", [])[0] if data.get("to") else ""

    try:
        if account['smtp_port'] == 465:
            with smtplib.SMTP_SSL(account['smtp_host'], account['smtp_port']) as server:
                server.login(account['smtp_user'], account['smtp_pass'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(account['smtp_host'], account['smtp_port']) as server:
                server.starttls()
                server.login(account['smtp_user'], account['smtp_pass'])
                server.send_message(msg)
        return {"status": "success", "message": "Reply sent successfully"}
    except Exception as e:
        logger.error(f"Reply failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/{email}")
async def get_realtime_messages(
    email: str,
    path: str = "Inbox",
    page: int = 0,
    pageSize: int = 20
):
    return await list_onebox_emails(limit=pageSize, offset=page*pageSize, inbox=path)
