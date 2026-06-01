-- 008_differentiator_features.sql
-- Sprints / Cycles

CREATE TABLE IF NOT EXISTS sprints (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  goal        TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT        NOT NULL DEFAULT 'planning',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

-- Goals / OKRs

CREATE TABLE IF NOT EXISTS goals (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id     UUID        REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  target_value   NUMERIC,
  current_value  NUMERIC     NOT NULL DEFAULT 0,
  unit           TEXT        NOT NULL DEFAULT '%',
  due_date       DATE,
  status         TEXT        NOT NULL DEFAULT 'active',
  created_by     TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intake Forms

CREATE TABLE IF NOT EXISTS intake_forms (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pod_id           UUID        REFERENCES pods(id) ON DELETE SET NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  fields           JSONB       NOT NULL DEFAULT '[]',
  is_public        BOOLEAN     NOT NULL DEFAULT true,
  default_priority TEXT        NOT NULL DEFAULT 'medium',
  default_status   TEXT        NOT NULL DEFAULT 'todo',
  token            TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_submissions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id          UUID        NOT NULL REFERENCES intake_forms(id) ON DELETE CASCADE,
  task_id          UUID        REFERENCES tasks(id) ON DELETE SET NULL,
  submitter_name   TEXT,
  submitter_email  TEXT,
  data             JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task Approvals

CREATE TABLE IF NOT EXISTS task_approvals (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by TEXT        NOT NULL,
  approver_id  TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend task dependencies with relation type
ALTER TABLE task_dependencies ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'blocks';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE sprints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_approvals   ENABLE ROW LEVEL SECURITY;

-- Sprints: company members can do everything
CREATE POLICY "sprints_all" ON sprints FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = sprints.project_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids)
      OR auth.uid()::text = ANY(c.member_ids))
  )
);

-- Goals: company members
CREATE POLICY "goals_all" ON goals FOR ALL USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = goals.company_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids)
      OR auth.uid()::text = ANY(c.member_ids))
  )
);

-- Intake forms: members can manage, public can read public ones
CREATE POLICY "intake_forms_select" ON intake_forms FOR SELECT USING (
  is_public = true
  OR EXISTS (
    SELECT 1 FROM projects p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = intake_forms.project_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids)
      OR auth.uid()::text = ANY(c.member_ids))
  )
);

CREATE POLICY "intake_forms_write" ON intake_forms FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = intake_forms.project_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids)
      OR auth.uid()::text = ANY(c.member_ids))
  )
);

-- Intake submissions: public insert, members can read
CREATE POLICY "intake_submissions_insert" ON intake_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "intake_submissions_select" ON intake_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM intake_forms f
    JOIN projects p ON p.id = f.project_id
    JOIN companies c ON c.id = p.company_id
    WHERE f.id = intake_submissions.form_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids)
      OR auth.uid()::text = ANY(c.member_ids))
  )
);

-- Task approvals
CREATE POLICY "task_approvals_all" ON task_approvals FOR ALL USING (
  requested_by = auth.uid()::text
  OR approver_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM projects p
    JOIN companies c ON c.id = p.company_id
    WHERE p.id = task_approvals.project_id
    AND (c.owner_id = auth.uid()::text
      OR auth.uid()::text = ANY(c.admin_ids))
  )
);
