-- ============================================================
-- HenceFlow – Full Reset Schema
-- Drops all existing tables, policies, indexes, triggers, and
-- functions, then recreates everything from scratch.
-- Run this in the Supabase SQL editor.
-- ============================================================


-- ── 1. Drop triggers ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS tasks_set_updated_at    ON public.tasks;


-- ── 2. Drop functions ────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.handle_new_user()  CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()   CASCADE;


-- ── 3. Drop tables (reverse dependency order) ────────────────────────────────

DROP TABLE IF EXISTS public.automation_rules        CASCADE;
DROP TABLE IF EXISTS public.saved_filters           CASCADE;
DROP TABLE IF EXISTS public.task_watchers           CASCADE;
DROP TABLE IF EXISTS public.notifications           CASCADE;
DROP TABLE IF EXISTS public.custom_field_values     CASCADE;
DROP TABLE IF EXISTS public.custom_field_definitions CASCADE;
DROP TABLE IF EXISTS public.task_templates          CASCADE;
DROP TABLE IF EXISTS public.activity_logs           CASCADE;
DROP TABLE IF EXISTS public.time_entries            CASCADE;
DROP TABLE IF EXISTS public.task_dependencies       CASCADE;
DROP TABLE IF EXISTS public.comments                CASCADE;
DROP TABLE IF EXISTS public.tasks                   CASCADE;
DROP TABLE IF EXISTS public.milestones              CASCADE;
DROP TABLE IF EXISTS public.projects                CASCADE;
DROP TABLE IF EXISTS public.pods                    CASCADE;
DROP TABLE IF EXISTS public.companies               CASCADE;
DROP TABLE IF EXISTS public.users                   CASCADE;


-- ============================================================
-- 4. Recreate tables
-- ============================================================

-- ── users ────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid          TEXT        UNIQUE NOT NULL,
  email        TEXT        NOT NULL,
  display_name TEXT,
  photo_url    TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── companies ────────────────────────────────────────────────────────────────

CREATE TABLE public.companies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  owner_id    UUID        NOT NULL,
  admin_ids   UUID[]      NOT NULL DEFAULT '{}',
  member_ids  UUID[]      NOT NULL DEFAULT '{}',
  viewer_ids  UUID[]      NOT NULL DEFAULT '{}',
  location    TEXT,
  website     TEXT,
  industry    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── pods ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.pods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  owner_id    UUID        NOT NULL,
  members     UUID[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── projects ─────────────────────────────────────────────────────────────────

CREATE TABLE public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pod_id      UUID        REFERENCES public.pods(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  owner_id    UUID        NOT NULL,
  members     UUID[]      NOT NULL DEFAULT '{}',
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  stages      JSONB       DEFAULT '[]',
  is_archived BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── milestones ───────────────────────────────────────────────────────────────

CREATE TABLE public.milestones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  description          TEXT,
  status               TEXT        NOT NULL DEFAULT 'todo',
  priority             TEXT        NOT NULL DEFAULT 'medium',
  assignee_id          UUID,
  creator_id           UUID        NOT NULL,
  due_date             DATE,
  tags                 TEXT[]      DEFAULT '{}',
  subtasks             JSONB       DEFAULT '[]',
  recurrence_rule      TEXT        CHECK (recurrence_rule IN ('daily','weekly','monthly')),
  recurrence_parent_id UUID        REFERENCES public.tasks(id) ON DELETE SET NULL,
  milestone_id         UUID        REFERENCES public.milestones(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── comments ─────────────────────────────────────────────────────────────────

CREATE TABLE public.comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  content     TEXT        NOT NULL,
  attachments TEXT[]      DEFAULT '{}',
  likes       UUID[]      DEFAULT '{}',
  dislikes    UUID[]      DEFAULT '{}',
  is_edited   BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── task_dependencies ────────────────────────────────────────────────────────

CREATE TABLE public.task_dependencies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_id UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, depends_on_id)
);

-- ── time_entries ─────────────────────────────────────────────────────────────

CREATE TABLE public.time_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  minutes     INTEGER     NOT NULL CHECK (minutes > 0),
  note        TEXT,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── activity_logs ────────────────────────────────────────────────────────────
-- task_id is nullable so logs are preserved when a task is deleted

CREATE TABLE public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id  UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  action      TEXT        NOT NULL,
  field       TEXT,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── custom_field_definitions ─────────────────────────────────────────────────

CREATE TABLE public.custom_field_definitions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  field_type  TEXT        NOT NULL DEFAULT 'text'
              CHECK (field_type IN ('text','number','url','select')),
  options     JSONB       DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── custom_field_values ──────────────────────────────────────────────────────

CREATE TABLE public.custom_field_values (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value    TEXT,
  UNIQUE (task_id, field_id)
);

-- ── task_templates ───────────────────────────────────────────────────────────

CREATE TABLE public.task_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  template    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── notifications ────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  task_id     UUID        REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID        REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── task_watchers ────────────────────────────────────────────────────────────

CREATE TABLE public.task_watchers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

-- ── saved_filters ────────────────────────────────────────────────────────────

CREATE TABLE public.saved_filters (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  name        TEXT        NOT NULL,
  filters     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── automation_rules ─────────────────────────────────────────────────────────

CREATE TABLE public.automation_rules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  trigger_type  TEXT        NOT NULL,
  trigger_value TEXT,
  action_type   TEXT        NOT NULL,
  action_value  TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 5. Indexes
-- ============================================================

CREATE INDEX idx_companies_owner       ON public.companies (owner_id);
CREATE INDEX idx_companies_member_ids  ON public.companies USING GIN (member_ids);
CREATE INDEX idx_companies_admin_ids   ON public.companies USING GIN (admin_ids);

CREATE INDEX idx_pods_company          ON public.pods (company_id);
CREATE INDEX idx_pods_members          ON public.pods USING GIN (members);

CREATE INDEX idx_projects_company      ON public.projects (company_id);
CREATE INDEX idx_projects_pod          ON public.projects (pod_id);
CREATE INDEX idx_projects_members      ON public.projects USING GIN (members);

CREATE INDEX idx_milestones_project    ON public.milestones (project_id);

CREATE INDEX idx_tasks_project         ON public.tasks (project_id);
CREATE INDEX idx_tasks_assignee        ON public.tasks (assignee_id);
CREATE INDEX idx_tasks_creator         ON public.tasks (creator_id);
CREATE INDEX idx_tasks_milestone       ON public.tasks (milestone_id);
CREATE INDEX idx_tasks_status          ON public.tasks (status);
CREATE INDEX idx_tasks_due_date        ON public.tasks (due_date);

CREATE INDEX idx_comments_task         ON public.comments (task_id);
CREATE INDEX idx_comments_project      ON public.comments (project_id);

CREATE INDEX idx_task_deps_task        ON public.task_dependencies (task_id);
CREATE INDEX idx_task_deps_depends_on  ON public.task_dependencies (depends_on_id);

CREATE INDEX idx_time_entries_task     ON public.time_entries (task_id);
CREATE INDEX idx_time_entries_project  ON public.time_entries (project_id);
CREATE INDEX idx_time_entries_user     ON public.time_entries (user_id);

CREATE INDEX idx_activity_logs_task    ON public.activity_logs (task_id);
CREATE INDEX idx_activity_logs_project ON public.activity_logs (project_id);

CREATE INDEX idx_cfd_project           ON public.custom_field_definitions (project_id);
CREATE INDEX idx_cfv_task              ON public.custom_field_values (task_id);
CREATE INDEX idx_cfv_field             ON public.custom_field_values (field_id);

CREATE INDEX idx_templates_project     ON public.task_templates (project_id);

CREATE INDEX idx_notifications_user    ON public.notifications (user_id);
CREATE INDEX idx_notifications_read    ON public.notifications (user_id, is_read);

CREATE INDEX idx_watchers_task         ON public.task_watchers (task_id);
CREATE INDEX idx_watchers_user         ON public.task_watchers (user_id);

CREATE INDEX idx_saved_filters_project ON public.saved_filters (project_id);
CREATE INDEX idx_saved_filters_user    ON public.saved_filters (user_id);

CREATE INDEX idx_automations_project   ON public.automation_rules (project_id);


-- ============================================================
-- 6. Enable Row Level Security
-- ============================================================

ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules       ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. RLS Policies
-- ============================================================

-- ── users ────────────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users can view all profiles"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ── companies ────────────────────────────────────────────────────────────────
-- Owner is always allowed to SELECT and UPDATE their own company.

CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = ANY(member_ids));

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = ANY(admin_ids));

CREATE POLICY "Owners can delete companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = owner_id);

-- ── pods ─────────────────────────────────────────────────────────────────────

CREATE POLICY "Pod members can view pods"
  ON public.pods FOR SELECT
  USING (auth.uid() = ANY(members));

CREATE POLICY "Company members can create pods"
  ON public.pods FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = company_id
        AND (auth.uid() = owner_id OR auth.uid() = ANY(member_ids))
    )
  );

CREATE POLICY "Pod owners can update pods"
  ON public.pods FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Pod owners can delete pods"
  ON public.pods FOR DELETE
  USING (auth.uid() = owner_id);

-- ── projects ─────────────────────────────────────────────────────────────────

CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = ANY(members));

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- ── milestones ───────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view milestones"
  ON public.milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project owners can update milestones"
  ON public.milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can delete milestones"
  ON public.milestones FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = owner_id
  ));

-- ── tasks ────────────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view tasks"
  ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can update tasks"
  ON public.tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Creators and project owners can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = owner_id
    )
  );

-- ── comments ─────────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view comments"
  ON public.comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Authors can update comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors and project owners can delete comments"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = owner_id
    )
  );

-- ── task_dependencies ────────────────────────────────────────────────────────

CREATE POLICY "Project members can view task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can create task dependencies"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can delete task dependencies"
  ON public.task_dependencies FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

-- ── time_entries ─────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view time entries"
  ON public.time_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Users can create own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ── activity_logs ────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

-- ── custom_field_definitions ─────────────────────────────────────────────────

CREATE POLICY "Project members can view custom field definitions"
  ON public.custom_field_definitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project owners can create custom field definitions"
  ON public.custom_field_definitions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can update custom field definitions"
  ON public.custom_field_definitions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can delete custom field definitions"
  ON public.custom_field_definitions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = owner_id
  ));

-- ── custom_field_values ──────────────────────────────────────────────────────

CREATE POLICY "Project members can view custom field values"
  ON public.custom_field_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can insert custom field values"
  ON public.custom_field_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can update custom field values"
  ON public.custom_field_values FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can delete custom field values"
  ON public.custom_field_values FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

-- ── task_templates ───────────────────────────────────────────────────────────

CREATE POLICY "Project members can view templates"
  ON public.task_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create templates"
  ON public.task_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can delete templates"
  ON public.task_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

-- ── notifications ────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── task_watchers ────────────────────────────────────────────────────────────

CREATE POLICY "Project members can view task watchers"
  ON public.task_watchers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can watch tasks"
  ON public.task_watchers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Users can unwatch tasks"
  ON public.task_watchers FOR DELETE
  USING (auth.uid() = user_id);

-- ── saved_filters ────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create saved filters"
  ON public.saved_filters FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Users can delete own saved filters"
  ON public.saved_filters FOR DELETE
  USING (auth.uid() = user_id);

-- ── automation_rules ─────────────────────────────────────────────────────────

CREATE POLICY "Project members can view automation rules"
  ON public.automation_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create automation rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can update automation rules"
  ON public.automation_rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can delete automation rules"
  ON public.automation_rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND auth.uid() = ANY(members)
  ));


-- ============================================================
-- 8. Functions and Triggers
-- ============================================================

-- Auto-populate user profile on auth sign-up / update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, uid, email, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    photo_url    = COALESCE(EXCLUDED.photo_url,    public.users.photo_url),
    updated_at   = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update tasks.updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 9. Realtime publications
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'companies', 'pods', 'projects', 'milestones',
    'tasks', 'comments', 'task_dependencies', 'time_entries',
    'activity_logs', 'custom_field_definitions', 'custom_field_values',
    'task_templates', 'notifications', 'task_watchers',
    'saved_filters', 'automation_rules'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END$$;
