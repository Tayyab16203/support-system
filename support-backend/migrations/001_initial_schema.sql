-- ============================================================
-- SUPPORT SYSTEM - INITIAL DATABASE MIGRATION
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub text UNIQUE NOT NULL,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user')),
    saved_filters jsonb DEFAULT '[]'::jsonb,
    email_notifications boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. PROJECTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text,
    jira_project_key text,
    discord_webhook_url text,
    is_public boolean DEFAULT false,
    email_enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES users(id),
    assigned_to uuid REFERENCES users(id),
    title text NOT NULL CHECK (length(title) >= 5),
    description text NOT NULL,
    type text NOT NULL
        CHECK (type IN ('technical_error', 'bug', 'feature', 'remove')),
    priority text NOT NULL
        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'paused', 'in_review', 'completed')),
    jira_key text,
    search_vector tsvector,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. ATTACHMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES users(id),
    file_name text NOT NULL,
    s3_key text UNIQUE NOT NULL,
    content_type text NOT NULL,
    file_size bigint NOT NULL,
    uploaded_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. ACTIVITIES TABLE (Timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES users(id),
    action_type text NOT NULL
        CHECK (action_type IN ('created', 'status_changed', 'updated', 'commented', 'file_uploaded', 'file_deleted', 'assigned')),
    old_value jsonb,
    new_value jsonb,
    comment text,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES users(id),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    project_id uuid REFERENCES projects(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_status ON tickets(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_search_vector ON tickets USING GIN(search_vector);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_ticket_id ON activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activities_ticket_created ON activities(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Full-text search vector auto-update
CREATE OR REPLACE FUNCTION tickets_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_search_vector_trigger ON tickets;
CREATE TRIGGER tickets_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, description ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION tickets_search_vector_update();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- NOTE: We use the service_role key in FastAPI, which bypasses RLS.
-- Authorization is handled at the application layer (dependencies.py).
-- Enable RLS on tables for future use with anon/authenticated keys.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (allows our backend full access)
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON projects;
CREATE POLICY "Service role full access" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON tickets;
CREATE POLICY "Service role full access" ON tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON attachments;
CREATE POLICY "Service role full access" ON attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON activities;
CREATE POLICY "Service role full access" ON activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON audit_logs;
CREATE POLICY "Service role full access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
