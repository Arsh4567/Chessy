-- ====================================================================
-- Chessy AI Bug Reporting & Jules Triage System - Supabase Schema Migration
-- ====================================================================

-- Create Custom Enum Types for Bug Reports
DO $$ BEGIN
    CREATE TYPE bug_category_enum AS ENUM (
        'bug',
        'UI issue',
        'performance issue',
        'backend/API issue',
        'authentication issue',
        'feature request',
        'security concern',
        'duplicate',
        'unclear'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_severity_enum AS ENUM (
        'critical',
        'high',
        'medium',
        'low'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_status_enum AS ENUM (
        'open',
        'triaged',
        'agent_investigating',
        'agent_pr_ready',
        'resolved',
        'closed',
        'wontfix'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_status_enum AS ENUM (
        'idle',
        'pending',
        'in_progress',
        'completed',
        'failed',
        'pr_created'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bug_reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_email TEXT,
    description TEXT NOT NULL,
    reproduction_steps JSONB DEFAULT '[]'::jsonb,
    screenshot_url TEXT,
    route TEXT NOT NULL,
    feature TEXT NOT NULL,
    browser TEXT NOT NULL,
    device TEXT NOT NULL,
    console_errors JSONB DEFAULT '[]'::jsonb,
    diagnostic_context JSONB DEFAULT '{}'::jsonb,
    status bug_status_enum NOT NULL DEFAULT 'open',
    severity bug_severity_enum NOT NULL DEFAULT 'medium',
    category bug_category_enum NOT NULL DEFAULT 'bug',
    ai_summary TEXT,
    ai_diagnosis TEXT,
    reproduction_plan TEXT,
    suspected_files JSONB DEFAULT '[]'::jsonb,
    eligible_for_agent BOOLEAN DEFAULT false,
    requires_human_review BOOLEAN DEFAULT false,
    confidence_level NUMERIC(3, 2),
    github_issue_url TEXT,
    github_pr_url TEXT,
    github_branch TEXT,
    deployment_url TEXT,
    resolution_message TEXT,
    
    -- Jules AI Coding Agent Integration Fields
    jules_session_id TEXT,
    jules_session_url TEXT,
    agent_status agent_status_enum DEFAULT 'idle',
    agent_started_at TIMESTAMPTZ,
    agent_completed_at TIMESTAMPTZ,
    agent_summary TEXT,
    agent_error TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_category ON public.bug_reports(category);
CREATE INDEX IF NOT EXISTS idx_bug_reports_agent_status ON public.bug_reports(agent_status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_jules_session ON public.bug_reports(jules_session_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can create their own bug reports
CREATE POLICY "Users can create their own bug reports" 
    ON public.bug_reports
    FOR INSERT 
    WITH CHECK (auth.uid() IS NULL OR auth.uid()::text = user_id);

-- RLS Policy: Users can view their own submitted bug reports
CREATE POLICY "Users can view their own bug reports" 
    ON public.bug_reports
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- RLS Policy: Authorized Admin / Developers can view all reports
CREATE POLICY "Admins can view all bug reports" 
    ON public.bug_reports
    FOR SELECT 
    USING (
        auth.jwt() ->> 'email' IN ('sewasingh13111944@gmail.com')
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- RLS Policy: Authorized Admin / Developers can update bug reports and dispatch to agents
CREATE POLICY "Admins can update bug reports" 
    ON public.bug_reports
    FOR UPDATE 
    USING (
        auth.jwt() ->> 'email' IN ('sewasingh13111944@gmail.com')
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER tr_bug_reports_updated_at
    BEFORE UPDATE ON public.bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bug_reports_updated_at();
