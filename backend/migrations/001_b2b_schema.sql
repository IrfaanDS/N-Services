-- ============================================================
-- B2B MODULE SCHEMA — N-Services Platform
-- Migration 001: Initial B2B Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Create schemas
CREATE SCHEMA IF NOT EXISTS b2b;
CREATE SCHEMA IF NOT EXISTS outreach;

-- ============================================================
-- B2B SCHEMA TABLES
-- ============================================================

-- 2. Buyer Personas (created first — referenced by leads)
CREATE TABLE IF NOT EXISTS b2b.buyer_personas (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    role_category     TEXT,
    primary_goal      TEXT,
    pain_points       TEXT[],
    desired_outcomes  TEXT[],
    problems_we_solve TEXT[],
    responsibilities  TEXT[],
    lead_count        INTEGER DEFAULT 0,
    created_at        TIMESTAMP DEFAULT now()
);

-- 3. B2B Companies
CREATE TABLE IF NOT EXISTS b2b.companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES common.businesses(id) ON DELETE CASCADE,
    industry        TEXT,
    employee_count  TEXT,
    website_domain  TEXT,
    headquarters    TEXT,
    founded_year    INTEGER,
    revenue_range   TEXT,
    tech_stack      TEXT[],
    tags            TEXT[],
    notes           TEXT,
    csv_source_file TEXT,
    imported_at     TIMESTAMP DEFAULT now(),
    UNIQUE (business_id)
);

-- 4. B2B Leads (individual contacts)
CREATE TABLE IF NOT EXISTS b2b.leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES b2b.companies(id) ON DELETE CASCADE,
    business_id     UUID REFERENCES common.businesses(id) ON DELETE CASCADE,
    first_name      TEXT,
    last_name       TEXT,
    full_name       TEXT,
    title           TEXT,
    email           TEXT NOT NULL,
    phone           TEXT,
    linkedin_url    TEXT,
    twitter_url     TEXT,
    facebook_url    TEXT,
    instagram_url   TEXT,
    city            TEXT,
    state           TEXT,
    country         TEXT,
    seniority       TEXT,
    lead_score      INTEGER DEFAULT 0,
    priority        TEXT DEFAULT 'Medium',
    scoring_reason  TEXT,
    status          TEXT DEFAULT 'new',
    persona_id      UUID REFERENCES b2b.buyer_personas(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- 5. Email Sequences
CREATE TABLE IF NOT EXISTS b2b.email_sequences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id      UUID REFERENCES b2b.buyer_personas(id) ON DELETE CASCADE,
    step_number     INTEGER NOT NULL,
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    tone            TEXT DEFAULT 'professional',
    model_used      TEXT,
    generated_at    TIMESTAMP DEFAULT now(),
    UNIQUE (persona_id, step_number)
);

-- ============================================================
-- OUTREACH SCHEMA TABLES (B2B-specific)
-- ============================================================

-- 6. Sending Accounts (SMTP/IMAP)
CREATE TABLE IF NOT EXISTS outreach.b2b_sending_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    smtp_host   TEXT NOT NULL,
    smtp_port   INTEGER DEFAULT 587,
    smtp_user   TEXT NOT NULL,
    smtp_pass   TEXT NOT NULL,
    imap_host   TEXT NOT NULL,
    imap_port   INTEGER DEFAULT 993,
    imap_user   TEXT NOT NULL,
    imap_pass   TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    daily_limit INTEGER DEFAULT 50,
    sent_today  INTEGER DEFAULT 0,
    last_used   TIMESTAMP,
    created_at  TIMESTAMP DEFAULT now()
);

-- 7. B2B Campaigns
CREATE TABLE IF NOT EXISTS outreach.b2b_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    account_id      UUID REFERENCES outreach.b2b_sending_accounts(id) ON DELETE SET NULL,
    total_leads     INTEGER DEFAULT 0,
    sent_count      INTEGER DEFAULT 0,
    replied_count   INTEGER DEFAULT 0,
    bounced_count   INTEGER DEFAULT 0,
    send_rate       INTEGER DEFAULT 5,
    status          TEXT DEFAULT 'draft',
    scheduled_at    TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT now()
);

-- 8. Campaign <-> Lead bridge
CREATE TABLE IF NOT EXISTS outreach.b2b_campaign_leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID REFERENCES outreach.b2b_campaigns(id) ON DELETE CASCADE,
    lead_id         UUID REFERENCES b2b.leads(id) ON DELETE CASCADE,
    persona_id      UUID REFERENCES b2b.buyer_personas(id) ON DELETE SET NULL,
    target_email    TEXT NOT NULL,
    subject         TEXT,
    body            TEXT,
    current_step    INTEGER DEFAULT 1,
    status          TEXT DEFAULT 'draft',
    sent_at         TIMESTAMP,
    opened_at       TIMESTAMP,
    replied_at      TIMESTAMP,
    bounced_at      TIMESTAMP,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT now()
);

-- 9. Inbox Messages (IMAP replies + sent tracking)
CREATE TABLE IF NOT EXISTS outreach.b2b_inbox_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        UUID REFERENCES outreach.b2b_sending_accounts(id) ON DELETE CASCADE,
    campaign_lead_id  UUID REFERENCES outreach.b2b_campaign_leads(id) ON DELETE SET NULL,
    from_email        TEXT,
    from_name         TEXT,
    to_email          TEXT,
    subject           TEXT,
    body              TEXT,
    message_id        TEXT,
    in_reply_to       TEXT,
    direction         TEXT DEFAULT 'inbound',
    is_read           BOOLEAN DEFAULT FALSE,
    fetched_at        TIMESTAMP DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_b2b_companies_business_id ON b2b.companies(business_id);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_company_id ON b2b.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_email ON b2b.leads(email);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_persona_id ON b2b.leads(persona_id);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_status ON b2b.leads(status);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_priority ON b2b.leads(priority);
CREATE INDEX IF NOT EXISTS idx_b2b_sequences_persona ON b2b.email_sequences(persona_id);
CREATE INDEX IF NOT EXISTS idx_outreach_cl_campaign ON outreach.b2b_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_cl_lead ON outreach.b2b_campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_cl_status ON outreach.b2b_campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_inbox_account ON outreach.b2b_inbox_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_outreach_inbox_cl ON outreach.b2b_inbox_messages(campaign_lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_inbox_direction ON outreach.b2b_inbox_messages(direction);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach.b2b_campaigns(status);

-- ============================================================
-- PUBLIC VIEWS (backward-compat, READ ONLY)
-- ============================================================

CREATE OR REPLACE VIEW public.b2b_companies AS
SELECT * FROM b2b.companies;

CREATE OR REPLACE VIEW public.b2b_leads AS
SELECT * FROM b2b.leads;

CREATE OR REPLACE VIEW public.b2b_buyer_personas AS
SELECT * FROM b2b.buyer_personas;

CREATE OR REPLACE VIEW public.b2b_campaigns AS
SELECT * FROM outreach.b2b_campaigns;

-- ============================================================
-- DASHBOARD VIEW
-- ============================================================

CREATE OR REPLACE VIEW b2b.lead_dashboard AS
SELECT
    l.id              AS lead_id,
    l.full_name,
    l.email,
    l.title,
    l.phone,
    l.linkedin_url,
    l.seniority,
    l.lead_score,
    l.priority,
    l.status          AS lead_status,
    c.id              AS company_id,
    b.name            AS company_name,
    b.website_url,
    c.industry,
    c.employee_count,
    c.headquarters,
    bp.title          AS persona_title,
    bp.role_category  AS persona_role,
    cl.status         AS outreach_status,
    cl.sent_at,
    cl.opened_at,
    cl.replied_at,
    camp.name         AS campaign_name,
    camp.status       AS campaign_status,
    l.created_at
FROM b2b.leads l
JOIN b2b.companies c              ON c.id = l.company_id
JOIN common.businesses b          ON b.id = c.business_id
LEFT JOIN b2b.buyer_personas bp   ON bp.id = l.persona_id
LEFT JOIN outreach.b2b_campaign_leads cl ON cl.lead_id = l.id
LEFT JOIN outreach.b2b_campaigns camp    ON camp.id = cl.campaign_id;

-- ============================================================
-- RLS (Row Level Security) — permissive for now
-- ============================================================

ALTER TABLE b2b.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b.buyer_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.b2b_sending_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.b2b_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.b2b_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.b2b_inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all b2b.companies" ON b2b.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b.leads" ON b2b.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b.buyer_personas" ON b2b.buyer_personas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b.email_sequences" ON b2b.email_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b_sending_accounts" ON outreach.b2b_sending_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b_campaigns" ON outreach.b2b_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b_campaign_leads" ON outreach.b2b_campaign_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all b2b_inbox_messages" ON outreach.b2b_inbox_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE!
-- ============================================================
